/**
 * deep-zoom-prototype/ui/HelpPanel.tsx — the Help side panel: Keys, Depth, Video, From other tools.
 *
 * PURPOSE
 *   Plain reference text for the deep-zoom tool. No bridge calls at all: everything here is static
 *   except 'Show the intro again' (clears the first-run flag in the store) and the Copy buttons.
 *
 * INTEGRATION SEAMS
 *   - `openHelp(tab)` opens the panel on a named tab from anywhere (Onboarding uses it for
 *     'From other tools'). The current tab lives in a module-level store so it survives the panel
 *     being closed and reopened.
 *   - The shell mounts <HelpPanel /> when `panel === 'help'`.
 *
 * PITFALLS
 *   - The key table documents the shell shortcuts the DESIGN names (B, J, H, 1 2 3, /, Home,
 *     Backspace, arrows). If the shell does not bind one of them, remove its row here.
 */
import React from 'react';
import { create } from 'zustand';
import { useDeepZoom } from '../store';
import { Button, Kbd, PanelFrame, Seg } from './kit';

export type HelpTab = 'keys' | 'depth' | 'video' | 'tools';

const useHelpTab = create<{ tab: HelpTab; setTab(t: HelpTab): void }>((set) => ({
    tab: 'keys',
    setTab: (tab) => set({ tab }),
}));

/** Open the Help panel on a named tab. */
export function openHelp(tab: HelpTab = 'keys'): void {
    useHelpTab.getState().setTab(tab);
    useDeepZoom.getState().setPanel('help');
}

const TABS: Array<[string, HelpTab]> = [
    ['Keys', 'keys'],
    ['Depth', 'depth'],
    ['Video', 'video'],
    ['From other tools', 'tools'],
];

const H264 = 'ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 zoom.mp4';
const PRORES = 'ffmpeg -framerate 30 -i frame_%05d.png -c:v prores_ks -profile:v 3 zoom.mov';

function Title({ children }: { children: React.ReactNode }) {
    return <h3 className="m-0 mt-3 first:mt-0 mb-1 text-[11px] uppercase tracking-widest text-fg-tertiary font-bold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="m-0 mb-2 text-[11px] leading-relaxed text-fg-secondary">{children}</p>;
}

function Num({ children }: { children: React.ReactNode }) {
    return <span className="font-mono tabular-nums text-fg">{children}</span>;
}

type KeyRow = [keys: string[], what: string];

function KeyTable({ rows }: { rows: KeyRow[] }) {
    return (
        <table className="w-full border-collapse mb-1">
            <tbody>
                {rows.map(([keys, what]) => (
                    <tr key={what} className="border-b border-line/5 last:border-b-0">
                        <td className="py-1 pr-2 align-top whitespace-nowrap w-[118px]">
                            {keys.map((k) => (k.length > 5
                                ? <span key={k} className="text-[10px] text-fg-tertiary">{k}</span>
                                : <Kbd key={k}>{k}</Kbd>))}
                        </td>
                        <td className="py-1 align-top text-[11px] text-fg-secondary">{what}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function CopyLine({ label, text }: { label: string; text: string }) {
    const copy = () => {
        const say = useDeepZoom.getState().say;
        try {
            navigator.clipboard.writeText(text).then(
                () => say(label + ' line copied'),
                () => say('Copy failed: select the line and copy it by hand.'),
            );
        } catch {
            say('Copy failed: select the line and copy it by hand.');
        }
    };
    return (
        <div className="mb-2">
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wide text-fg-dim">{label}</span>
                <Button onClick={copy} title={'Copy the ' + label + ' ffmpeg line'}>Copy</Button>
            </div>
            <code className="block select-text text-[10px] leading-snug font-mono text-fg bg-black/40 border border-line/10 rounded-sm px-2 py-1.5 break-all">{text}</code>
        </div>
    );
}

function KeysTab() {
    const again = () => {
        const s = useDeepZoom.getState();
        s.setOnboarded(false);
        s.setPanel('none');
        s.bridge?.focus();
    };
    return (
        <>
            <Title>Flying</Title>
            <KeyTable rows={[
                [['Click the picture'], 'take the mouse'],
                [['Esc'], 'release the mouse, stop a dive or preview, cancel a render'],
                [['W', 'A', 'S', 'D'], 'move'],
                [['Q', 'E'], 'down / up'],
                [['Shift'], 'faster'],
                [['mouse'], 'look'],
            ]} />
            <P>Speed follows your distance to the surface.</P>

            <Title>Picture</Title>
            <KeyTable rows={[
                [['F', 'G'], 'detail'],
                [['C'], 'colour mode'],
                [['9', '0'], 'palette frequency'],
                [['L'], 'lighting'],
                [['[', ']'], 'iterations'],
                [['I'], 'automatic iterations'],
                [['-', '='], 'power n'],
                [['X'], 'export a still'],
            ]} />

            <Title>Tool</Title>
            <KeyTable rows={[
                [['M'], 'record / stop'],
                [['B'], 'save this view'],
                [['J'], 'dive to a depth'],
                [['1', '2', '3'], 'Locations, Record, Look'],
                [['/'], 'Help'],
                [['H'], 'hide overlays (all, depth only, none)'],
                [['Home'], 'home view'],
                [['Bksp'], 'back to the previous view'],
                [['←', '→'], 'step the timeline one frame (Shift: one second)'],
            ]} />

            <div className="mt-3 pt-3 border-t border-line/10">
                <Button onClick={again} title="Clears the first-run flag and restarts the strip at the bottom of the picture">Show the intro again</Button>
            </div>
        </>
    );
}

const YARDSTICK: Array<[string, string]> = [
    ['1e-6', 'Milky Way'],
    ['1e-14', "Neptune's orbit"],
    ['1e-20', 'Earth'],
    ['1e-30', 'grain of sand (1 mm)'],
    ['1e-37', 'atom'],
    ['1e-42', 'proton'],
    ['1e-62', 'Planck length'],
    ['1e-77', 'floor'],
];

function DepthTab() {
    return (
        <>
            <P>Depth is the camera's distance to the surface, in units where the bulb is about 2 across. It is not a zoom factor. Magnification = 1 / distance.</P>
            <P>Reading it: <Num>6.40e-53</Num> means 52 zeros after the point. Each step of 1 in the exponent is 10x closer.</P>
            <P>Range: f32 above about <Num>1e-4</Num>. Below it, perturbation: one 256-bit reference orbit on the CPU, per-pixel deltas on the GPU.</P>
            <P>Certified against an independent referee to <Num>1e-50</Num>. Deeper is flyable to about <Num>1e-77</Num>, where the 256-bit reference runs out. That is the floor.</P>
            <P>Flying = 1 sample at the live frame size. Still = 64 jittered samples when you stop, about a second.</P>
            <P>Detail: fine relief. 32 costs about 3.3x the time of 1.</P>
            <P>Reach: how many steps a ray may take: 256 / 512 / 1024.</P>

            <Title>If the bulb were the observable universe (8.8e26 m across)</Title>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-fg-dim">
                        <th className="py-1 pr-2 font-normal w-[72px]">Depth</th>
                        <th className="py-1 font-normal">You are this far from the surface</th>
                    </tr>
                </thead>
                <tbody>
                    {YARDSTICK.map(([d, what]) => (
                        <tr key={d} className="border-t border-line/5">
                            <td className={'py-1 pr-2 font-mono tabular-nums ' + (d === '1e-77' ? 'text-amber-400' : 'text-fg')}>{d}</td>
                            <td className="py-1 text-fg-secondary">{what}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

const VIDEO_STEPS: string[] = [
    "Record a flight (M), or 'Record a dive' in the Record panel.",
    'Smooth it.',
    'Set the length in seconds and the fps; frames are derived.',
    'Preview in real time.',
    'Render small first: 1280 px, 4 samples.',
    'Render final.',
    'Unzip and run ffmpeg.',
];

function VideoTab() {
    return (
        <>
            <ol className="m-0 mb-3 pl-0 list-none">
                {VIDEO_STEPS.map((s, i) => (
                    <li key={s} className="flex gap-2 py-0.5 text-[11px] text-fg-secondary">
                        <span className="font-mono tabular-nums text-fg-dim w-3 shrink-0">{i + 1}</span>
                        <span>{s}</span>
                    </li>
                ))}
            </ol>
            <P>Samples per frame: <Num>4</Num> for a first look, <Num>8</Num> for motion, <Num>16</Num> for a final.</P>
            <P>A path stores the camera and the formula. Lighting, detail, reach and the gradient come from the Look panel when you render, so one flight can be rendered with several looks.</P>
            <P>Cancelling a render keeps the finished frames as a partial ZIP.</P>

            <Title>ffmpeg</Title>
            <CopyLine label="H.264" text={H264} />
            <CopyLine label="ProRes" text={PRORES} />
            <P>Change <Num>-framerate 30</Num> to the fps you rendered at.</P>
            <P>Uploading: sites re-encode fine detail hard. Upload at 3840 px if you can.</P>
        </>
    );
}

const OTHER_TOOLS: Array<[string, string]> = [
    ['Zoom 1e50', 'surface distance 1e-50'],
    ['Re / Im / Zoom text', 'Copy location: JSON with position and look direction'],
    ['Zoom-out keyframe sequence', 'record a flight, smooth, render frames'],
    ['Max iterations', 'iter in the top bar, automatic with depth; [ ] and I'],
    ['Glitch correction', 'not exposed; the reference is rebuilt as you fly'],
    ['f64 depth limit, about 1e-13', 'f32 to 1e-4, perturbation to 1e-77'],
];

const NOT_YET: string[] = [
    'Newton zoom to a nucleus',
    'palette cycling and offset',
    'exponential-map export for zoomasm',
    'video encoding in the page (use ffmpeg on the ZIP)',
    'editing single keys',
    'a speed multiplier',
    'deeper than 1e-77',
];

function ToolsTab() {
    return (
        <>
            <table className="w-full border-collapse mb-2">
                <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-fg-dim">
                        <th className="py-1 pr-2 font-normal w-[45%]">You know</th>
                        <th className="py-1 font-normal">Here</th>
                    </tr>
                </thead>
                <tbody>
                    {OTHER_TOOLS.map(([a, b]) => (
                        <tr key={a} className="border-t border-line/5">
                            <td className="py-1.5 pr-2 align-top text-fg-tertiary">{a}</td>
                            <td className="py-1.5 align-top text-fg">{b}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Title>Not here yet</Title>
            <ul className="m-0 pl-0 list-none">
                {NOT_YET.map((s) => (
                    <li key={s} className="py-0.5 text-[11px] text-fg-tertiary">· {s}</li>
                ))}
            </ul>
        </>
    );
}

export function HelpPanel() {
    const tab = useHelpTab((s) => s.tab);
    const setTab = useHelpTab((s) => s.setTab);
    const close = () => {
        const s = useDeepZoom.getState();
        s.setPanel('none');
        s.bridge?.focus();
    };
    return (
        <PanelFrame title="Help" onClose={close} width={340}>
            <div className="px-3 pt-2">
                <Seg<HelpTab> value={tab} options={TABS} onChange={setTab} />
            </div>
            <div className="px-3 pt-2 pb-3">
                {tab === 'keys' ? <KeysTab /> : null}
                {tab === 'depth' ? <DepthTab /> : null}
                {tab === 'video' ? <VideoTab /> : null}
                {tab === 'tools' ? <ToolsTab /> : null}
            </div>
        </PanelFrame>
    );
}
