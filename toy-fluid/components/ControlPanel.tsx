import React from 'react';
import { ScalarInput } from '../../components/inputs/ScalarInput';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import type { GradientConfig, GradientStop } from '../../types';
import {
  FluidParams, ForceMode, ShowMode, FractalKind,
  ColorMapping, COLOR_MAPPINGS,
  DyeBlend, DYE_BLENDS,
  DyeDecayMode, DYE_DECAY_MODES,
  ToneMapping, TONE_MAPPINGS,
  FluidStyle, FLUID_STYLES,
  BrushMode, BRUSH_MODES,
  BrushColorMode, BRUSH_COLOR_MODES,
} from '../fluid/FluidEngine';
import { MandelbrotPicker } from './MandelbrotPicker';
import { PRESETS, Preset } from '../presets';

interface Props {
  params: FluidParams;
  setParams: (p: Partial<FluidParams>) => void;
  onReset: () => void;
  orbit: { enabled: boolean; radius: number; speed: number };
  setOrbit: (o: Partial<{ enabled: boolean; radius: number; speed: number }>) => void;
  gradient: GradientConfig;
  setGradient: (g: GradientConfig) => void;
  gradientLut: Uint8Array | null;
  collisionGradient: GradientConfig;
  setCollisionGradient: (g: GradientConfig) => void;
  onPresetApply: (preset: Preset) => void;
  onSaveJson: () => void;
  onSavePng: () => void;
  onLoadFile: (file: File) => void;
  /** If true, suppress all hint captions and section intros. Toggled by the H key. */
  hideHints: boolean;
}

/** Context to propagate hideHints to the <Hint> helper without prop-drilling. */
const HideHintsContext = React.createContext<boolean>(false);

const FORCE_MODES: { id: ForceMode; label: string; hint: string }[] = [
  { id: 'gradient', label: 'Gradient',  hint: '∇(escape iter) — force points AWAY from the set interior. Fractal acts as a source.' },
  { id: 'curl',     label: 'Curl',      hint: 'Perp of ∇(escape iter) — divergence-free swirl along level sets. Fluid surfs the contours.' },
  { id: 'iterate',  label: 'Iterate',   hint: 'Final z iterate direction (Böttcher). Fluid flows along the fractal\'s own orbit grain.' },
  { id: 'c-track',  label: 'C-Track',   hint: 'Δ(julia)/Δt as you move c. Fluid follows the deformation of the fractal in real time.' },
  { id: 'hue',      label: 'Hue',       hint: 'Rendered hue → angle, value → magnitude. The picture itself is the velocity field.' },
];

const SHOW_MODES: { id: ShowMode; label: string; hint: string }[] = [
  { id: 'composite', label: 'Mixed',    hint: 'Fractal + dye + optional velocity overlay' },
  { id: 'julia',     label: 'Fractal',  hint: 'Pure fractal, fluid hidden' },
  { id: 'dye',       label: 'Dye',      hint: 'Fluid dye only — shows what the fractal wrote' },
  { id: 'velocity',  label: 'Velocity', hint: 'Per-pixel velocity as a hue wheel' },
];

const KINDS: { id: FractalKind; label: string }[] = [
  { id: 'julia',      label: 'Julia' },
  { id: 'mandelbrot', label: 'Mandelbrot' },
];

const TABS = ['Fractal', 'Coupling', 'Fluid', 'Brush', 'Palette', 'Post-FX', 'Collision', 'Composite', 'Presets'] as const;
type TabId = (typeof TABS)[number];

function rgbToHex(rgb: [number, number, number]): string {
  const hx = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0');
  return '#' + hx(rgb[0]) + hx(rgb[1]) + hx(rgb[2]);
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

const Chip: React.FC<{ active: boolean; onClick: () => void; title?: string; children: React.ReactNode; className?: string }> = ({ active, onClick, title, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={
      'px-2 py-1 text-[10px] rounded border transition-colors ' +
      (active
        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
        : 'bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]') +
      ' ' + className
    }
  >{children}</button>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (React.useContext(HideHintsContext)) return null;
  return <div className="text-[9px] text-gray-500 leading-snug pl-1 pt-0.5">{children}</div>;
};

const Row: React.FC<{ hint?: React.ReactNode; children: React.ReactNode }> = ({ hint, children }) => (
  <div className="flex flex-col gap-0.5">
    {children}
    {hint && <Hint>{hint}</Hint>}
  </div>
);

/** Subtle heading used inside a tab to group a handful of controls. */
const GroupHeader: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between pt-1">
    <div className="text-[10px] uppercase text-gray-400 tracking-wide">{children}</div>
    {right}
  </div>
);

export const ControlPanel: React.FC<Props> = ({
  params, setParams, onReset, orbit, setOrbit, gradient, setGradient, gradientLut,
  collisionGradient, setCollisionGradient,
  onPresetApply, onSaveJson, onSavePng, onLoadFile, hideHints,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState<TabId>('Presets');

  const applyPreset = (id: string) => {
    const p = PRESETS.find(p => p.id === id);
    if (p) onPresetApply(p);
  };
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onLoadFile(f);
    e.target.value = '';
  };

  /** Applies a FluidStyle — sets sensible defaults for the post-process knobs.
   *  Does NOT force tone mapping: we leave it as-is so users keep their vivid
   *  "None" mode if they've chosen it; tone-map flattening a well-designed
   *  gradient is never what you want for an electric look. */
  const applyStyle = (id: FluidStyle) => {
    if (id === 'plain') {
      setParams({ fluidStyle: 'plain', bloomAmount: 0, aberration: 0, refraction: 0, caustics: 0 });
    } else if (id === 'electric') {
      setParams({ fluidStyle: 'electric', bloomAmount: 0.6, bloomThreshold: 1.0, aberration: 1.0, refraction: 0, caustics: 0, vibrance: 0.3 });
    } else {
      setParams({ fluidStyle: 'liquid', bloomAmount: 0.25, bloomThreshold: 1.1, aberration: 0, refraction: 0.08, caustics: 8, vibrance: 0.3 });
    }
  };

  // Container gap collapses to a hairline when hints are off so sliders stack flush.
  const tabGap = hideHints ? 'gap-0.5' : 'gap-3';

  return (
    <HideHintsContext.Provider value={hideHints}>
      <div className="flex flex-col h-full text-gray-200 text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div>
            <div className="text-sm font-semibold">Julia Fluid Toy</div>
            <div className="text-[10px] text-gray-500">fractal ↔ fluid coupling lab</div>
          </div>
          <a href="./index.html" className="text-[10px] text-cyan-300 hover:underline">← back to GMT</a>
        </div>

        {/* Tabs — split roughly in half so neither row gets too cramped.
            Only the last row draws the bottom divider. */}
        <div className="bg-black/40 border-b border-white/10">
          {[TABS.slice(0, 5), TABS.slice(5)].map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`flex ${rowIdx === 0 ? 'border-b border-white/5' : ''}`}
            >
              {row.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 px-0 text-[10px] font-bold tracking-wide whitespace-nowrap transition-all relative ${
                    activeTab === tab
                      ? 'text-cyan-400 bg-white/5'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Tab content (scrollable) */}
        <div className={`flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col ${tabGap}`}>
          {activeTab === 'Fractal' && (
            <>
              <Hint>The fractal is the force generator. Every fluid frame reads this texture.</Hint>
              <div className="flex gap-1">
                {KINDS.map(k => (
                  <Chip key={k.id} active={params.kind === k.id} onClick={() => setParams({ kind: k.id })}>
                    {k.label}
                  </Chip>
                ))}
              </div>
              <MandelbrotPicker
                cx={params.juliaC[0]}
                cy={params.juliaC[1]}
                onChange={(x, y) => setParams({ juliaC: [x, y] })}
                gradientLut={gradientLut ?? undefined}
                gradientRepeat={params.gradientRepeat}
                gradientPhase={params.gradientPhase}
                colorMapping={params.colorMapping}
                interiorColor={params.interiorColor}
                power={params.power}
              />
              <Row hint="Julia constant. Move me to reshape the entire fractal — and the forces it emits.">
                <div className="grid grid-cols-2 gap-2">
                  <ScalarInput label="c.x" value={params.juliaC[0]} onChange={(v) => setParams({ juliaC: [v, params.juliaC[1]] })} min={-2} max={2} step={0.001} variant="full" />
                  <ScalarInput label="c.y" value={params.juliaC[1]} onChange={(v) => setParams({ juliaC: [params.juliaC[0], v] })} min={-2} max={2} step={0.001} variant="full" />
                </div>
              </Row>
              <Row hint="Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).">
                <ScalarInput label="Zoom" value={params.zoom} onChange={(v) => setParams({ zoom: v })} min={0.00001} max={8} step={0.0001} hardMin={0.00001} variant="full" />
              </Row>
              <Row hint="Pan the fractal window.">
                <div className="grid grid-cols-2 gap-2">
                  <ScalarInput label="Center.x" value={params.center[0]} onChange={(v) => setParams({ center: [v, params.center[1]] })} min={-2} max={2} step={0.01} variant="full" />
                  <ScalarInput label="Center.y" value={params.center[1]} onChange={(v) => setParams({ center: [params.center[0], v] })} min={-2} max={2} step={0.01} variant="full" />
                </div>
              </Row>
              <Row hint="More iterations → sharper escape gradients → finer force detail.">
                <div className="grid grid-cols-2 gap-2">
                  <ScalarInput label="Iter" value={params.maxIter} onChange={(v) => setParams({ maxIter: Math.round(v) })} min={16} max={512} step={1} variant="full" />
                  <ScalarInput label="Power" value={params.power} onChange={(v) => setParams({ power: v })} min={2} max={8} step={1} variant="full" />
                </div>
              </Row>
            </>
          )}

          {activeTab === 'Coupling' && (
            <>
              <Hint>The coupling law. Chooses <em>how</em> fractal pixels become velocity at each cell.</Hint>
              <div className="grid grid-cols-3 gap-1">
                {FORCE_MODES.map(m => (
                  <Chip key={m.id} active={params.forceMode === m.id} onClick={() => setParams({ forceMode: m.id })} title={m.hint}>
                    {m.label}
                  </Chip>
                ))}
              </div>
              {!hideHints && (
                <div className="text-[10px] text-cyan-200/80 leading-snug bg-cyan-900/20 border border-cyan-500/20 rounded px-2 py-1">
                  {FORCE_MODES.find(m => m.id === params.forceMode)?.hint}
                </div>
              )}
              <Row hint="Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction.">
                <ScalarInput label="Force gain" value={params.forceGain} onChange={(v) => setParams({ forceGain: v })} min={-2000} max={2000} step={0.1} variant="full" />
              </Row>
              <Row hint="How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.">
                <ScalarInput label="Interior damp" value={params.interiorDamp} onChange={(v) => setParams({ interiorDamp: v })} min={0} max={1} step={0.01} variant="full" />
              </Row>
              <Row hint="Per-pixel cap on the fractal force magnitude.">
                <ScalarInput label="Force cap" value={params.forceCap} onChange={(v) => setParams({ forceCap: v })} min={1} max={40} step={0.5} variant="full" />
              </Row>
              <Row hint="Fades force/dye injection near the canvas edges. Fixes 'gushing from the borders' under fast c-changes.">
                <ScalarInput label="Edge margin" value={params.edgeMargin} onChange={(v) => setParams({ edgeMargin: v })} min={0} max={0.25} step={0.005} variant="full" />
              </Row>

              <GroupHeader right={<Chip active={orbit.enabled} onClick={() => setOrbit({ enabled: !orbit.enabled })}>{orbit.enabled ? 'on' : 'off'}</Chip>}>Auto-orbit c</GroupHeader>
              <Hint>Circles c automatically around its current value. Pair with <b>C-Track</b> to watch the fluid breathe with the fractal's deformation.</Hint>
              {orbit.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <ScalarInput label="Radius" value={orbit.radius} onChange={(v) => setOrbit({ radius: v })} min={0} max={0.5} step={0.001} variant="full" />
                  <ScalarInput label="Speed" value={orbit.speed} onChange={(v) => setOrbit({ speed: v })} min={0} max={3} step={0.01} variant="full" />
                </div>
              )}
            </>
          )}

          {activeTab === 'Fluid' && (
            <>
              <Hint>How the fluid carries and forgets what the fractal pushed into it.</Hint>
              <Row hint="Amplifies existing curl — keeps fractal-induced swirls from smearing away.">
                <ScalarInput label="Vorticity" value={params.vorticity} onChange={(v) => setParams({ vorticity: v })} min={0} max={50} step={0.1} variant="full" />
              </Row>
              {params.vorticity > 0 && (
                <Row hint="Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices.">
                  <ScalarInput label="Vorticity scale" value={params.vorticityScale} onChange={(v) => setParams({ vorticityScale: v })} min={0.5} max={8} step={0.1} variant="full" />
                </Row>
              )}
              <Row hint="How fast velocity decays. High = fluid forgets the fractal quickly.">
                <ScalarInput label="Velocity dissipation /s" value={params.dissipation} onChange={(v) => setParams({ dissipation: v })} min={0} max={5} step={0.01} variant="full" />
              </Row>
              <Row hint="How much of the fractal's color bleeds into the fluid each frame.">
                <ScalarInput label="Dye inject" value={params.dyeInject} onChange={(v) => setParams({ dyeInject: v })} min={0} max={3} step={0.01} variant="full" />
              </Row>
              <Row hint="Jacobi iterations for incompressibility. More = stricter but slower.">
                <ScalarInput label="Pressure iters" value={params.pressureIters} onChange={(v) => setParams({ pressureIters: Math.round(v) })} min={4} max={60} step={1} variant="full" />
              </Row>

              <GroupHeader>Dye decay</GroupHeader>
              <Hint>How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid).</Hint>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-400">Colour space</div>
                <div className="grid grid-cols-3 gap-1">
                  {DYE_DECAY_MODES.map(m => (
                    <Chip key={m.id} active={params.dyeDecayMode === m.id} onClick={() => setParams({ dyeDecayMode: m.id })} title={m.hint}>
                      {m.label}
                    </Chip>
                  ))}
                </div>
                <Hint>{DYE_DECAY_MODES.find(m => m.id === params.dyeDecayMode)?.hint}</Hint>
              </div>
              <Row hint={params.dyeDecayMode === 'linear' ? 'How fast dye fades (RGB multiply).' : 'Per-second luminance fade (OKLab L). Chroma fades on its own schedule below.'}>
                <ScalarInput label="Dye dissipation /s" value={params.dyeDissipation} onChange={(v) => setParams({ dyeDissipation: v })} min={0} max={5} step={0.01} variant="full" />
              </Row>
              {params.dyeDecayMode !== 'linear' && (
                <>
                  <Row hint="Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright.">
                    <ScalarInput label="Chroma decay /s" value={params.dyeChromaDecayHz} onChange={(v) => setParams({ dyeChromaDecayHz: v })} min={0} max={5} step={0.01} variant="full" />
                  </Row>
                  <Row hint="Per-frame chroma gain, log-scaled 0.5 → 1.1 so you can dial the near-neutral zone precisely. 1 = neutral, &lt;1 washes out, &gt;1 pushes toward max saturation. Gamut-mapped in OKLab, so it pegs at the saturation ceiling rather than hue-shifting to white.">
                    <ScalarInput label="Saturation boost" value={params.dyeSaturationBoost} onChange={(v) => setParams({ dyeSaturationBoost: v })} min={0.5} max={1.1} step={0.001} mapping={createLogMapping(0.5, 1.1)} variant="full" />
                  </Row>
                </>
              )}

              <GroupHeader right={<Chip active={params.autoQuality} onClick={() => setParams({ autoQuality: !params.autoQuality })}>{params.autoQuality ? 'on' : 'off'}</Chip>}>Quality</GroupHeader>
              <Hint>The slider is your target. Auto-quality may drop below it if FPS is low, then snaps back in one jump when it recovers (no stair-step flashing).</Hint>
              <Row hint="Target fluid grid height in cells. More = finer detail, slower.">
                <ScalarInput label="Sim resolution" value={params.simResolution} onChange={(v) => setParams({ simResolution: Math.round(v) })} min={128} max={1536} step={32} variant="full" />
              </Row>
            </>
          )}

          {activeTab === 'Brush' && (
            <>
              <Hint>
                The brush is what your pointer paints into the fluid. Hold <b>B</b> and drag horizontally on the canvas
                to scale it live. Solid-click drops a single splat; dragging emits a stroke.
              </Hint>

              <GroupHeader>Mode</GroupHeader>
              <div className="grid grid-cols-4 gap-1">
                {BRUSH_MODES.map(m => (
                  <Chip key={m.id} active={params.brushMode === m.id} onClick={() => setParams({ brushMode: m.id })} title={m.hint}>
                    {m.label}
                  </Chip>
                ))}
              </div>
              <Hint>{BRUSH_MODES.find(m => m.id === params.brushMode)?.hint}</Hint>

              <GroupHeader>Shape</GroupHeader>
              <ScalarInput label="Size (UV)"   value={params.brushSize}     onChange={(v) => setParams({ brushSize: v })}     min={0.003} max={0.4}  step={0.001} variant="full" />
              <Hint>Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live.</Hint>
              <ScalarInput label="Hardness"    value={params.brushHardness} onChange={(v) => setParams({ brushHardness: v })} min={0}     max={1}    step={0.01}  variant="full" />
              <Hint>0 = soft gaussian edge (airbrush). 1 = hard disc (stamp).</Hint>

              {/* Strength controls dye amount. Smudge injects no dye, so hide it there. */}
              {params.brushMode !== 'smudge' && (<>
                <ScalarInput label={params.brushMode === 'erase' ? 'Erase strength' : 'Strength'}
                  value={params.brushStrength} onChange={(v) => setParams({ brushStrength: v })} min={0} max={3} step={0.01} variant="full" />
                <Hint>{params.brushMode === 'erase'
                  ? 'How much dye each splat removes. 0 = nothing, 3 = total wipe.'
                  : 'Dye amount per splat. 0 = dry brush, 3 = saturated.'}</Hint>
              </>)}

              {/* Flow drives the force injection. Stamp/erase suppress force, so hide there. */}
              {(params.brushMode === 'paint' || params.brushMode === 'smudge') && (<>
                <ScalarInput label="Flow" value={params.brushFlow} onChange={(v) => setParams({ brushFlow: v })} min={0} max={200} step={0.5} variant="full" />
                <Hint>How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip.</Hint>
              </>)}

              {/* Spacing governs stroke sampling. When the emitter is on the particles
                  handle all emission (spawn rate is time-based, not travel-based). */}
              {!params.particleEmitter && (<>
                <ScalarInput label="Spacing (UV)" value={params.brushSpacing} onChange={(v) => setParams({ brushSpacing: v })} min={0} max={0.1} step={0.001} variant="full" />
                <Hint>Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail.</Hint>
              </>)}

              {/* Colour section only applies when we're actually depositing dye. */}
              {params.brushMode !== 'smudge' && params.brushMode !== 'erase' && (<>
                <GroupHeader>Colour</GroupHeader>
                <div className="grid grid-cols-4 gap-1">
                  {BRUSH_COLOR_MODES.map(m => (
                    <Chip key={m.id} active={params.brushColorMode === m.id} onClick={() => setParams({ brushColorMode: m.id })} title={m.hint}>
                      {m.label}
                    </Chip>
                  ))}
                </div>
                <Hint>{BRUSH_COLOR_MODES.find(m => m.id === params.brushColorMode)?.hint}</Hint>

                {params.brushColorMode === 'solid' && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-[10px] text-gray-400 w-20">Solid color</div>
                    <input
                      type="color"
                      aria-label="Brush solid colour"
                      title="Brush solid colour"
                      value={rgbToHex(params.brushColor)}
                      onChange={(e) => setParams({ brushColor: hexToRgb(e.target.value) })}
                      className="w-10 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                    />
                  </div>
                )}

                {params.brushColorMode !== 'rainbow' && (<>
                  <ScalarInput label="Hue jitter" value={params.brushJitter} onChange={(v) => setParams({ brushJitter: v })} min={0} max={1} step={0.01} variant="full" />
                  <Hint>Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes.</Hint>
                </>)}
              </>)}

              <GroupHeader right={<Chip active={params.particleEmitter} onClick={() => setParams({ particleEmitter: !params.particleEmitter })}>{params.particleEmitter ? 'on' : 'off'}</Chip>}>Particle emitter</GroupHeader>
              <Hint>When on, dragging spawns independent particles on their own layer. Each live particle flies with its own velocity/lifespan and acts as a mini brush — painting into the fluid with whichever mode is selected above, at its own position.</Hint>

              {params.particleEmitter && (<>
                <ScalarInput label="Rate /s"   value={params.particleRate}      onChange={(v) => setParams({ particleRate: v })}      min={1}    max={600} step={1}    variant="full" />
                <Hint>Particles emitted per second while dragging. Hard-capped at 300 live at once.</Hint>
                <ScalarInput label="Velocity"  value={params.particleVelocity}  onChange={(v) => setParams({ particleVelocity: v })}  min={0}    max={3}   step={0.01} variant="full" />
                <Hint>Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun.</Hint>
                <ScalarInput label="Spread"    value={params.particleSpread}    onChange={(v) => setParams({ particleSpread: v })}    min={0}    max={1}   step={0.01} variant="full" />
                <Hint>Angular spread around the drag direction. 0 = beam, 1 = full 360° burst.</Hint>
                <ScalarInput label="Gravity"   value={params.particleGravity}   onChange={(v) => setParams({ particleGravity: v })}   min={-3}   max={3}   step={0.01} variant="full" />
                <Hint>UV/sec² acceleration. Negative = falls down the canvas, positive = rises.</Hint>
                <ScalarInput label="Drag /s"   value={params.particleDrag}      onChange={(v) => setParams({ particleDrag: v })}      min={0}    max={4}   step={0.01} variant="full" />
                <Hint>Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop.</Hint>
                <ScalarInput label="Lifetime"  value={params.particleLifetime}  onChange={(v) => setParams({ particleLifetime: v })}  min={0.1}  max={6}   step={0.05} variant="full" />
                <Hint>Seconds before each particle is culled. Longer = more persistent streaks.</Hint>
                <ScalarInput label="Size ×"    value={params.particleSizeScale} onChange={(v) => setParams({ particleSizeScale: v })} min={0.05} max={1.5} step={0.01} variant="full" />
                <Hint>Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush.</Hint>
              </>)}
            </>
          )}

          {activeTab === 'Palette' && (
            <>
              <Hint>Colors both the fractal AND the dye that gets injected into the fluid. In Hue-mode, it <em>is</em> the vector field.</Hint>
              <AdvancedGradientEditor
                value={gradient}
                onChange={(val) => {
                  if (Array.isArray(val)) {
                    setGradient({ stops: val as GradientStop[], colorSpace: gradient.colorSpace, blendSpace: gradient.blendSpace });
                  } else {
                    setGradient(val as GradientConfig);
                  }
                }}
              />
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-400">Color mapping</div>
                <div className="grid grid-cols-3 gap-1">
                  {COLOR_MAPPINGS.map(m => (
                    <Chip key={m.id} active={params.colorMapping === m.id} onClick={() => setParams({ colorMapping: m.id })} title={m.hint}>
                      {m.label}
                    </Chip>
                  ))}
                </div>
                <Hint>{COLOR_MAPPINGS.find(m => m.id === params.colorMapping)?.hint}</Hint>
              </div>
              <Row hint="Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.">
                <ScalarInput label="Repetition" value={params.gradientRepeat} onChange={(v) => setParams({ gradientRepeat: v })} min={0.1} max={8} step={0.01} variant="full" />
              </Row>
              <Row hint="Phase shift — rotates the colors without changing their layout.">
                <ScalarInput label="Phase" value={params.gradientPhase} onChange={(v) => setParams({ gradientPhase: v })} min={0} max={1} step={0.005} variant="full" />
              </Row>
              <Row hint="Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter. Reduce for fresher colours.">
                <ScalarInput label="Color iter" value={params.colorIter} onChange={(v) => setParams({ colorIter: Math.round(v) })} min={1} max={Math.max(4, params.maxIter)} step={1} variant="full" />
              </Row>

              {/* Orbit-trap parameters — only relevant for trap-shape mappings. */}
              {(params.colorMapping === 'orbit-point' || params.colorMapping === 'orbit-circle' ||
                params.colorMapping === 'orbit-cross' || params.colorMapping === 'trap-iter') && (
                <Row hint="Trap centre (complex coord). Move to pick which point in the orbit to trap against.">
                  <div className="grid grid-cols-2 gap-2">
                    <ScalarInput label="Trap.x" value={params.trapCenter[0]} onChange={(v) => setParams({ trapCenter: [v, params.trapCenter[1]] })} min={-2} max={2} step={0.01} variant="full" />
                    <ScalarInput label="Trap.y" value={params.trapCenter[1]} onChange={(v) => setParams({ trapCenter: [params.trapCenter[0], v] })} min={-2} max={2} step={0.01} variant="full" />
                  </div>
                </Row>
              )}
              {params.colorMapping === 'orbit-circle' && (
                <Row hint="Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.">
                  <ScalarInput label="Trap radius" value={params.trapRadius} onChange={(v) => setParams({ trapRadius: v })} min={0.01} max={4} step={0.01} variant="full" />
                </Row>
              )}
              {params.colorMapping === 'orbit-line' && (
                <Row hint="Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.">
                  <div className="grid grid-cols-3 gap-2">
                    <ScalarInput label="n.x" value={params.trapNormal[0]} onChange={(v) => setParams({ trapNormal: [v, params.trapNormal[1]] })} min={-1} max={1} step={0.01} variant="full" />
                    <ScalarInput label="n.y" value={params.trapNormal[1]} onChange={(v) => setParams({ trapNormal: [params.trapNormal[0], v] })} min={-1} max={1} step={0.01} variant="full" />
                    <ScalarInput label="offset" value={params.trapOffset} onChange={(v) => setParams({ trapOffset: v })} min={-2} max={2} step={0.01} variant="full" />
                  </div>
                </Row>
              )}
              {params.colorMapping === 'stripe' && (
                <Row hint="Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.">
                  <ScalarInput label="Stripe freq" value={params.stripeFreq} onChange={(v) => setParams({ stripeFreq: v })} min={1} max={16} step={0.1} variant="full" />
                </Row>
              )}

              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-400">Interior color (bounded points)</div>
                <input
                  type="color"
                  title="Interior color (points that never escape)"
                  aria-label="Interior color"
                  value={rgbToHex(params.interiorColor)}
                  onChange={(e) => setParams({ interiorColor: hexToRgb(e.target.value) })}
                  className="w-full h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                />
              </div>

              <GroupHeader>Dye</GroupHeader>
              <Hint>How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask.</Hint>
              <div className="grid grid-cols-4 gap-1">
                {DYE_BLENDS.map(b => (
                  <Chip key={b.id} active={params.dyeBlend === b.id} onClick={() => setParams({ dyeBlend: b.id })} title={b.hint}>
                    {b.label}
                  </Chip>
                ))}
              </div>
              <Hint>{DYE_BLENDS.find(b => b.id === params.dyeBlend)?.hint}</Hint>

            </>
          )}

          {activeTab === 'Post-FX' && (
            <>
              <Hint>Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below.</Hint>
              <div className="grid grid-cols-3 gap-1">
                {FLUID_STYLES.map(s => (
                  <Chip key={s.id} active={params.fluidStyle === s.id} onClick={() => applyStyle(s.id)} title={s.hint}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              <Row hint="Bloom strength — wide soft glow on bright pixels. Core of the electric look.">
                <ScalarInput label="Bloom" value={params.bloomAmount} onChange={(v) => setParams({ bloomAmount: v })} min={0} max={3} step={0.01} variant="full" />
              </Row>
              {params.bloomAmount > 0 && (
                <Row hint="Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows.">
                  <ScalarInput label="Bloom threshold" value={params.bloomThreshold} onChange={(v) => setParams({ bloomThreshold: v })} min={0} max={3} step={0.01} variant="full" />
                </Row>
              )}
              <Row hint="Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.">
                <ScalarInput label="Aberration" value={params.aberration} onChange={(v) => setParams({ aberration: v })} min={0} max={3} step={0.01} variant="full" />
              </Row>
              <Row hint="Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass.">
                <ScalarInput label="Refraction" value={params.refraction} onChange={(v) => setParams({ refraction: v })} min={0} max={0.3} step={0.001} variant="full" />
              </Row>
              {params.refraction > 0 && (
                <Row hint="Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.">
                  <ScalarInput label="Refract smooth" value={params.refractSmooth} onChange={(v) => setParams({ refractSmooth: v })} min={1} max={12} step={0.1} variant="full" />
                </Row>
              )}
              <Row hint="Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.">
                <ScalarInput label="Caustics" value={params.caustics} onChange={(v) => setParams({ caustics: v })} min={0} max={25} step={0.1} variant="full" />
              </Row>

              <GroupHeader>Tone mapping</GroupHeader>
              <Hint>
                How final colour gets compressed. <b>None</b> = maximally vivid (may clip).
                <b> AgX</b> = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights.
              </Hint>
              <div className="grid grid-cols-4 gap-1">
                {TONE_MAPPINGS.map(t => (
                  <Chip key={t.id} active={params.toneMapping === t.id} onClick={() => setParams({ toneMapping: t.id })} title={t.hint}>
                    {t.label}
                  </Chip>
                ))}
              </div>
              <Row hint="Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.">
                <ScalarInput label="Exposure" value={params.exposure} onChange={(v) => setParams({ exposure: v })} min={0.1} max={5} step={0.01} variant="full" />
              </Row>
              <Row hint="Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.">
                <ScalarInput label="Vibrance" value={params.vibrance} onChange={(v) => setParams({ vibrance: v })} min={0} max={1} step={0.01} variant="full" />
              </Row>
            </>
          )}

          {activeTab === 'Collision' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-gray-200 font-medium">Collision walls</div>
                <Chip active={params.collisionEnabled} onClick={() => setParams({ collisionEnabled: !params.collisionEnabled })}>
                  {params.collisionEnabled ? 'on' : 'off'}
                </Chip>
              </div>
              <Hint>
                Paints solid walls the fluid bounces off, sculpted by the gradient below.
                Same mapping (iterations / angle / orbit trap / etc.) as the main gradient — edit
                stops to black = <b>fluid</b>, white = <b>wall</b>. Gradient shape is up to you.
              </Hint>
              {params.collisionEnabled && (
                <>
                  <AdvancedGradientEditor
                    value={collisionGradient}
                    onChange={(val) => {
                      if (Array.isArray(val)) {
                        setCollisionGradient({
                          stops: val as GradientStop[],
                          colorSpace: collisionGradient.colorSpace,
                          blendSpace: collisionGradient.blendSpace,
                        });
                      } else {
                        setCollisionGradient(val as GradientConfig);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Preview walls on canvas</span>
                    <Chip active={params.collisionPreview} onClick={() => setParams({ collisionPreview: !params.collisionPreview })}>
                      {params.collisionPreview ? 'on' : 'off'}
                    </Chip>
                  </div>
                  <Hint>Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient.</Hint>
                </>
              )}
            </>
          )}

          {activeTab === 'Composite' && (
            <>
              <Hint>What you see. The simulation runs the same either way.</Hint>
              <div className="grid grid-cols-4 gap-1">
                {SHOW_MODES.map(m => (
                  <Chip key={m.id} active={params.show === m.id} onClick={() => setParams({ show: m.id })} title={m.hint}>
                    {m.label}
                  </Chip>
                ))}
              </div>
              <Hint>{SHOW_MODES.find(m => m.id === params.show)?.hint}</Hint>
              {params.show === 'composite' && (
                <>
                  <Row hint="How much fractal color shows through in Mixed view.">
                    <ScalarInput label="Julia mix" value={params.juliaMix} onChange={(v) => setParams({ juliaMix: v })} min={0} max={2} step={0.01} variant="full" />
                  </Row>
                  <Row hint="How much fluid dye shows through in Mixed view.">
                    <ScalarInput label="Dye mix" value={params.dyeMix} onChange={(v) => setParams({ dyeMix: v })} min={0} max={2} step={0.01} variant="full" />
                  </Row>
                  <Row hint="Overlay velocity-hue on top of the composite. Diagnostic.">
                    <ScalarInput label="Velocity viz" value={params.velocityViz} onChange={(v) => setParams({ velocityViz: v })} min={0} max={2} step={0.01} variant="full" />
                  </Row>
                </>
              )}
            </>
          )}

          {activeTab === 'Presets' && (
            <>
              <Hint>Each preset is a curated fractal→fluid coupling. Applying one resets the grid and restores known params.</Hint>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.map(p => (
                  <Chip key={p.id} active={false} onClick={() => applyPreset(p.id)} title={p.desc}>
                    {p.name}
                  </Chip>
                ))}
              </div>
              <Hint>Save / Screenshot / Load moved to the top bar icons above.</Hint>
              {/* JSON export still exposed for users who want a text-only export. */}
              <div className="grid grid-cols-1 gap-1">
                <Chip active={false} onClick={onSaveJson} title="Export the full state as a .json file.">Save JSON</Chip>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.json,image/png,application/json,text/plain"
                onChange={onFileChosen}
                className="hidden"
                aria-label="Load saved state"
              />
            </>
          )}
        </div>

        {/* Footer action buttons — visible from every tab */}
        <div className="flex gap-2 p-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => setParams({ paused: !params.paused })}
            className="flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
          >{params.paused ? 'Resume' : 'Pause'}</button>
          <button
            type="button"
            onClick={onReset}
            className="flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10"
          >Clear fluid</button>
        </div>
      </div>
    </HideHintsContext.Provider>
  );
};
