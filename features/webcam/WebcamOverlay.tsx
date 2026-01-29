
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

const BOTTOM_LABELS = [
    'TAB', 'CTRL', 'ALT', 'SHIFT', 'SPACE', 
    'LMB', 'MMB', 'RMB', 'SCROLL UP', 'SCROLL DOWN',
    'Z', 'Y', 'H', 'T', '1', '2', '3', '4', '5', '6'
];

const WASD_CONFIG = {
    'Q': { x: 0, y: 0, label: 'Q ↶' },
    'W': { x: 1, y: 0, label: 'W ▲' },
    'E': { x: 2, y: 0, label: 'E ↷' },
    'A': { x: 0, y: 1, label: 'A ◀' },
    'S': { x: 1, y: 1, label: 'S ▼' },
    'D': { x: 2, y: 1, label: 'D ▶' },
    'C': { x: 1, y: 2, label: 'C ⬇' }
};

const KEY_MAP: Record<string, string> = {
    'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
    'KeyQ': 'Q', 'KeyE': 'E', 'KeyC': 'C',
    'Space': 'SPACE',
    'ShiftLeft': 'SHIFT', 'ShiftRight': 'SHIFT',
    'ControlLeft': 'CTRL', 'ControlRight': 'CTRL',
    'AltLeft': 'ALT', 'AltRight': 'ALT',
    'Tab': 'TAB',
    'KeyZ': 'Z', 'KeyY': 'Y', 'KeyH': 'H', 'KeyT': 'T',
    'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 
    'Digit4': '4', 'Digit5': '5', 'Digit6': '6'
};

const MOUSE_MAP: Record<number, string> = { 0: 'LMB', 1: 'MMB', 2: 'RMB' };
const GearIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

const BLEND_MODES = ['normal', 'screen', 'overlay', 'lighten', 'difference'] as const;

export const WebcamOverlay: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const TARGET_FPS = 15;
    const FRAME_TIME = 1000 / TARGET_FPS;
    const FADE_DURATION = 0.7; 
    
    const { isEnabled, opacity, posX, posY, width, height, cropL, cropR, cropT, cropB, blendMode: blendIdx, crtMode, tilt, fontSize } = sliceState;
    const setWebcam = actions.setWebcam;

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const lastUpdateRef = useRef(0);
    const requestRef = useRef<number | null>(null);
    const heldInputs = useRef<Set<string>>(new Set());
    const inputOpacities = useRef<Map<string, number>>(new Map());

    const dragRef = useRef<{ 
        type: 'move' | 'crop-l' | 'crop-r' | 'crop-t' | 'crop-b' | 'scale', 
        startX: number, 
        startY: number,
        startPos: { x: number, y: number },
        startSize: { w: number, h: number },
        startCrop: { l: number, r: number, t: number, b: number }
    } | null>(null);

    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!isEnabled) {
            // Cleanup streams
            if (videoRef.current && videoRef.current.srcObject) {
                 const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                 tracks.forEach(track => track.stop());
            }
            return;
        }

        setErrorMsg(null);
        
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        videoRef.current = video;

        const startCam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: { ideal: 24 } } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => {
                        console.error("Webcam play error", e);
                        setErrorMsg("Video blocked. Check browser privacy settings.");
                    });
                }
            } catch (err: any) {
                console.error("Webcam access denied:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setErrorMsg("Camera Blocked: Check browser permissions or HTTPS.");
                } else if (err.name === 'NotFoundError') {
                    setErrorMsg("No camera found.");
                } else {
                    setErrorMsg("Camera Error: " + err.message);
                }
            }
        };

        startCam();

        const onKey = (e: KeyboardEvent) => {
            const label = KEY_MAP[e.code];
            if (!label) return;
            if(e.type === 'keydown') heldInputs.current.add(label);
            else heldInputs.current.delete(label);
        };
        const onMouse = (e: MouseEvent) => {
            const label = MOUSE_MAP[e.button];
            if (!label) return;
            if(e.type === 'mousedown') heldInputs.current.add(label);
            else heldInputs.current.delete(label);
        };
        const onWheel = (e: WheelEvent) => {
            const label = e.deltaY < 0 ? 'SCROLL UP' : 'SCROLL DOWN';
            inputOpacities.current.set(label, 1.0);
        };

        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        window.addEventListener('mousedown', onMouse);
        window.addEventListener('mouseup', onMouse);
        window.addEventListener('wheel', onWheel, { passive: true });

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            window.removeEventListener('mousedown', onMouse);
            window.removeEventListener('mouseup', onMouse);
            window.removeEventListener('wheel', onWheel);
        };
    }, [isEnabled]);

    const loop = useCallback((time: number) => {
        const dt = (time - (lastUpdateRef.current || time)) / 1000;
        [...BOTTOM_LABELS, ...Object.keys(WASD_CONFIG)].forEach(label => {
            let op = inputOpacities.current.get(label) || 0.0;
            if (heldInputs.current.has(label)) op = 1.0; 
            else op -= dt / FADE_DURATION;
            op = Math.max(0, Math.min(1, op));
            inputOpacities.current.set(label, op);
        });

        if (time - lastUpdateRef.current > FRAME_TIME) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d', { alpha: false });
                if (ctx) {
                    lastUpdateRef.current = time;
                    if (canvas.width !== width || canvas.height !== height) {
                        canvas.width = width; canvas.height = height;
                    }
                    
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, width, height);

                    if (!errorMsg && video && video.readyState === video.HAVE_ENOUGH_DATA) {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const sx = vw * cropL;
                        const sy = vh * cropT;
                        const sw = vw * (1 - cropL - cropR);
                        const sh = vh * (1 - cropT - cropB);
                        if (sw > 0 && sh > 0) {
                            ctx.save();
                            ctx.translate(width, 0);
                            ctx.scale(-1, 1);
                            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
                            ctx.restore();
                        }
                    } else if (errorMsg) {
                        // Draw Error State
                        ctx.fillStyle = '#330000';
                        ctx.fillRect(0, 0, width, height);
                        ctx.fillStyle = '#ff5555';
                        ctx.font = `bold ${Math.max(10, fontSize)}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Word wrap simple
                        const words = errorMsg.split(' ');
                        let line = '';
                        let y = height / 2;
                        const lineHeight = fontSize * 1.5;
                        
                        ctx.fillText(errorMsg, width/2, height/2);
                    }
                    
                    drawBottomInputs(ctx, width, height);
                    drawWASD(ctx);
                }
            }
        }
        requestRef.current = requestAnimationFrame(loop);
    }, [cropL, cropR, cropT, cropB, width, height, fontSize, isEnabled, errorMsg]);

    useEffect(() => {
        if (!isEnabled) return;
        requestRef.current = requestAnimationFrame(loop);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [loop, isEnabled]);

    const drawBottomInputs = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        let textX = 10;
        const baseY = h - 10;
        const boxH = fontSize * 1.6 + 4;
        BOTTOM_LABELS.forEach(label => {
            const opacityVal = inputOpacities.current.get(label) || 0;
            if (opacityVal <= 0.01) return;
            const measure = ctx.measureText(label);
            const padding = fontSize;
            const tw = measure.width + padding;
            if (textX + tw > w) return; 
            ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * opacityVal})`;
            ctx.fillRect(textX, baseY - boxH, tw, boxH);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacityVal})`;
            ctx.fillText(label, textX + (padding/2), baseY - (boxH * 0.25));
            textX += tw + 4;
        });
    };
    
    const drawWASD = (ctx: CanvasRenderingContext2D) => {
        const cellSize = fontSize * 2.8;
        const gap = 3;
        const startX = 10;
        const startY = 10;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        Object.entries(WASD_CONFIG).forEach(([key, config]) => {
            const opacityVal = inputOpacities.current.get(key) || 0;
            if (opacityVal <= 0.01) return;
            const x = startX + config.x * (cellSize + gap);
            const y = startY + config.y * (cellSize + gap);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * opacityVal})`;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacityVal})`;
            ctx.fillText(config.label, x + cellSize/2, y + cellSize/2 + 1); 
        });
    };

    const handleDown = (e: React.MouseEvent, type: any) => {
        e.preventDefault(); e.stopPropagation();
        dragRef.current = {
            type, startX: e.clientX, startY: e.clientY,
            startPos: { x: posX, y: posY },
            startSize: { w: width, h: height },
            startCrop: { l: cropL, r: cropR, t: cropT, b: cropB }
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    const handleMove = useCallback((e: MouseEvent) => {
        if (!dragRef.current) return;
        const { type, startX, startY, startPos, startSize, startCrop } = dragRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const videoW = videoRef.current?.videoWidth || 640;
        const videoH = videoRef.current?.videoHeight || 480;
        const sourceW = videoW * (1 - startCrop.l - startCrop.r);
        const sourceH = videoH * (1 - startCrop.t - startCrop.b);
        const scaleX = startSize.w / Math.max(1, sourceW);
        const scaleY = startSize.h / Math.max(1, sourceH);

        if (type === 'move') {
            setWebcam({ posX: startPos.x + dx, posY: startPos.y + dy });
        } else if (type === 'scale') {
            const aspect = startSize.w / startSize.h;
            const newW = Math.max(100, startSize.w + dx);
            setWebcam({ width: newW, height: newW / aspect });
        } else if (type === 'crop-l') {
            const newW = Math.max(50, startSize.w - dx);
            const newX = startPos.x + (startSize.w - newW);
            const deltaPct = ((startSize.w - newW) / scaleX) / videoW;
            setWebcam({ posX: newX, width: newW, cropR: Math.min(0.9, Math.max(0, startCrop.r + deltaPct)) });
        } else if (type === 'crop-r') {
            const newW = Math.max(50, startSize.w + dx);
            const deltaPct = ((startSize.w - newW) / scaleX) / videoW;
            setWebcam({ width: newW, cropL: Math.min(0.9, Math.max(0, startCrop.l + deltaPct)) });
        } else if (type === 'crop-t') {
            const newH = Math.max(50, startSize.h - dy);
            const newY = startPos.y + (startSize.h - newH);
            const deltaPct = ((startSize.h - newH) / scaleY) / videoH;
            setWebcam({ posY: newY, height: newH, cropT: Math.min(0.9, Math.max(0, startCrop.t + deltaPct)) });
        } else if (type === 'crop-b') {
            const newH = Math.max(50, startSize.h + dy);
            const deltaPct = ((startSize.h - newH) / scaleY) / videoH;
            setWebcam({ height: newH, cropB: Math.min(0.9, Math.max(0, startCrop.b + deltaPct)) });
        }
    }, [setWebcam]);

    const handleUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
    };

    if (!isEnabled) return null;

    const currentBlendMode = BLEND_MODES[Math.floor(blendIdx)] || 'normal';

    return (
        <div 
            className="absolute select-none"
            style={{ 
                left: posX, top: posY, width: width, height: height,
                cursor: 'move', pointerEvents: 'auto'
            }}
            onMouseDown={(e) => { if (!(e.target as HTMLElement).closest('.settings-panel')) handleDown(e, 'move'); }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowSettings(false); }}
        >
            {/* LAYER 1: BLENDING CONTAINER (Visuals Only) */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                    mixBlendMode: currentBlendMode as any,
                    perspective: '1000px' // Applied to parent to enable 3D transform on child
                }}
            >
                 <div 
                    className="w-full h-full"
                    style={{ 
                        opacity: Math.min(1, opacity),
                        filter: opacity > 1 ? `brightness(${opacity})` : 'none',
                        transform: `rotateY(${tilt}deg)`, 
                        transformStyle: 'preserve-3d'
                    }}
                >
                    <canvas ref={canvasRef} className="w-full h-full block" />
                    {crtMode && (
                        <div 
                            className="absolute inset-0 opacity-40 mix-blend-overlay"
                            style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 6px 100%' }} 
                        />
                    )}
                </div>
            </div>

            {/* LAYER 2: UI CONTAINER (Settings, Handles - No Blending, No Tilt) */}
            <div className="absolute inset-0 w-full h-full">
                <div className={`absolute top-2 right-2 transition-opacity duration-200 z-50 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="p-1.5 rounded bg-black/60 text-gray-400 hover:text-white hover:bg-black/80 border border-white/10 shadow-lg backdrop-blur-sm"><GearIcon /></button>
                </div>
                
                {showSettings && (
                    <div className="settings-panel absolute top-10 right-2 w-48 bg-[#151515] border border-white/20 rounded p-2 shadow-2xl z-50 animate-fade-in" onMouseDown={(e) => e.stopPropagation()}>
                         <div className="space-y-2 text-[10px]">
                            <div>
                                <label className="text-gray-500 font-bold uppercase block mb-1">Blend Mode</label>
                                <select value={Math.floor(blendIdx)} onChange={(e) => setWebcam({ blendMode: Number(e.target.value) })} className="w-full bg-black border border-gray-700 rounded px-1 py-1 text-white outline-none cursor-pointer">
                                    <option value={0}>Normal</option>
                                    <option value={1}>Screen</option>
                                    <option value={2}>Overlay</option>
                                    <option value={3}>Lighten</option>
                                    <option value={4}>Difference</option>
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between text-gray-500 font-bold uppercase mb-1"><span>Opacity</span><span>{Math.round(opacity*100)}%</span></div>
                                <input type="range" min="0" max="3" step="0.05" value={opacity} onChange={(e) => setWebcam({ opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                                <div className="flex justify-between text-gray-500 font-bold uppercase mb-1"><span>3D Tilt</span><span>{tilt}°</span></div>
                                <input type="range" min="-45" max="45" step="1" value={tilt} onChange={(e) => setWebcam({ tilt: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                                <div className="flex justify-between text-gray-500 font-bold uppercase mb-1"><span>Font Size</span><span>{fontSize}px</span></div>
                                <input type="range" min="8" max="32" step="1" value={fontSize} onChange={(e) => setWebcam({ fontSize: parseInt(e.target.value) })} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-1 pt-1 border-t border-white/10">
                                <input type="checkbox" checked={crtMode} onChange={(e) => setWebcam({ crtMode: e.target.checked })} className="cursor-pointer" />
                                <span className="text-gray-400 font-bold uppercase">CRT Scanlines</span>
                            </label>
                         </div>
                    </div>
                )}

                <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute bottom-[-6px] right-[-6px] w-6 h-6 bg-cyan-500/50 cursor-nwse-resize hover:bg-cyan-400 z-20 rounded-full border-2 border-black" onMouseDown={(e) => handleDown(e, 'scale')} />
                    <div className="absolute top-4 bottom-4 left-[-4px] w-3 cursor-e-resize group/l z-10 flex items-center justify-center" onMouseDown={(e) => handleDown(e, 'crop-l')}><div className="w-1 h-8 bg-red-500/50 group-hover/l:bg-red-400 rounded-full" /></div>
                    <div className="absolute top-4 bottom-4 right-[-4px] w-3 cursor-w-resize group/r z-10 flex items-center justify-center" onMouseDown={(e) => handleDown(e, 'crop-r')}><div className="w-1 h-8 bg-red-500/50 group-hover/r:bg-red-400 rounded-full" /></div>
                    <div className="absolute left-4 right-4 top-[-4px] h-3 cursor-s-resize group/t z-10 flex items-center justify-center" onMouseDown={(e) => handleDown(e, 'crop-t')}><div className="h-1 w-8 bg-red-500/50 group-hover/t:bg-red-400 rounded-full" /></div>
                    <div className="absolute left-4 right-4 bottom-[-4px] h-3 cursor-n-resize group/b z-10 flex items-center justify-center" onMouseDown={(e) => handleDown(e, 'crop-b')}><div className="h-1 w-8 bg-red-500/50 group-hover/b:bg-red-400 rounded-full" /></div>
                </div>
            </div>
        </div>
    );
};
