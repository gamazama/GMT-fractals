
import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CameraMode } from '../types';
import { useFractalStore, selectMovementLock } from '../store/fractalStore';

export const useInputController = (
    mode: CameraMode, 
    speed: number, 
    setSpeed: (v: number) => void,
    hudRefs?: any // Optional 4th argument to handle UI exclusions
) => {
    const { gl } = useThree();
    const invertY = useFractalStore(s => s.invertY);
    const debugMobileLayout = useFractalStore(s => s.debugMobileLayout);
    
    // Input State
    const moveState = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false, rollLeft: false, rollRight: false, boost: false });
    const isDraggingRef = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mousePos = useRef({ x: 0, y: 0 });
    const lastActivityTime = useRef(0);
    
    // Smooth Roll Logic
    const rollVelocity = useRef(0);
    
    // Mobile Joysticks
    const joystickMove = useRef({ x: 0, y: 0 });
    const joystickLook = useRef({ x: 0, y: 0 });
    
    const speedRef = useRef(speed);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const markActivity = () => {
        lastActivityTime.current = performance.now();
    };

    useEffect(() => {
        joystickMove.current = { x: 0, y: 0 };
        joystickLook.current = { x: 0, y: 0 };
        rollVelocity.current = 0;
        markActivity();
    }, [mode]);

    // Update roll momentum
    useFrame((_, delta) => {
        const targetRoll = moveState.current.rollLeft ? 1 : (moveState.current.rollRight ? -1 : 0);
        const accelRate = targetRoll !== 0 ? 1.0 : 3.0;
        const f = 1.0 - Math.exp(-accelRate * delta);
        rollVelocity.current += (targetRoll - rollVelocity.current) * f;
        
        if (targetRoll === 0 && Math.abs(rollVelocity.current) < 0.001) {
            rollVelocity.current = 0;
        }
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.code === 'KeyW')) e.preventDefault();
            
            // Prevent Spacebar scrolling
            if (e.code === 'Space') e.preventDefault();

            // Prevent Alt menu
            if (e.key === 'Alt') e.preventDefault();

            const isTimelineHovered = useFractalStore.getState().isTimelineHovered;
            if (isTimelineHovered) return;

            let handled = true;
            switch(e.code) {
                case 'KeyW': moveState.current.forward = true; break;
                case 'KeyS': moveState.current.backward = true; break;
                case 'KeyA': moveState.current.left = true; break;
                case 'KeyD': moveState.current.right = true; break;
                case 'KeyQ': moveState.current.rollLeft = true; break;
                case 'KeyE': moveState.current.rollRight = true; break;
                case 'Space': moveState.current.up = true; break;
                case 'KeyC': moveState.current.down = true; break;
                case 'ShiftLeft': 
                case 'ShiftRight':
                    moveState.current.boost = true; break;
                default:
                    handled = false;
            }
            if (handled) markActivity();
        };
        
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') e.preventDefault();
            
            switch(e.code) {
                case 'KeyW': moveState.current.forward = false; break;
                case 'KeyS': moveState.current.backward = false; break;
                case 'KeyA': moveState.current.left = false; break;
                case 'KeyD': moveState.current.right = false; break;
                case 'KeyQ': moveState.current.rollLeft = false; break;
                case 'KeyE': moveState.current.rollRight = false; break;
                case 'Space': moveState.current.up = false; break;
                case 'KeyC': moveState.current.down = false; break;
                case 'ShiftLeft': 
                case 'ShiftRight':
                    moveState.current.boost = false; break;
            }
        };
        
        const handleWheel = (e: WheelEvent) => {
            const state = useFractalStore.getState();
            const movementLocked = selectMovementLock(state);
            if (movementLocked) return;

            const isOrtho = state.optics && Math.abs(state.optics.camType - 1.0) < 0.1;

            // ORTHO ZOOM: If in orthographic mode, scrolling MUST adjust orthoScale directly
            if (isOrtho) {
                const dir = e.deltaY > 0 ? 1 : -1;
                const current = state.optics.orthoScale;
                const next = current * (1 + dir * 0.1); // 10% step for consistent zoom feel
                state.setOptics({ orthoScale: Math.max(1e-10, Math.min(1000, next)) });
                markActivity();
                return;
            }

            // FLY SPEED: Standard perspective flight speed adjustment
            if (mode === 'Fly') {
                const dir = e.deltaY > 0 ? -1 : 1;
                let current = speedRef.current;
                let step = 0.01;
                if (current < 0.05) step = 0.005;
                if (current > 0.1) step = 0.02;
                let next = Math.max(0.001, Math.min(1.0, current + (dir * step)));
                speedRef.current = next;
                setSpeed(next); 
                markActivity();
            }
            // ORBIT ZOOM: Just wake UI
            else if (mode === 'Orbit') {
                markActivity();
            }
        };

        const handleBlur = () => {
            moveState.current = { 
                forward: false, backward: false, left: false, right: false, 
                up: false, down: false, rollLeft: false, rollRight: false, boost: false 
            };
        };

        const handleJoyMove = (e: any) => { joystickMove.current = e.detail; markActivity(); };
        const handleJoyLook = (e: any) => { joystickLook.current = e.detail; markActivity(); };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('joyMove', handleJoyMove);
        window.addEventListener('joyLook', handleJoyLook);
        gl.domElement.addEventListener('wheel', handleWheel, { passive: true });
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('joyMove', handleJoyMove);
            window.removeEventListener('joyLook', handleJoyLook);
            gl.domElement.removeEventListener('wheel', handleWheel);
        };
    }, [mode, gl, setSpeed]);

    useEffect(() => {
        const domElement = gl.domElement;
        
        const getNDC = (clientX: number, clientY: number) => {
            const rect = domElement.getBoundingClientRect();
            return {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1
            };
        };

        const onMouseDown = (e: MouseEvent) => {
            const state = useFractalStore.getState();
            if (selectMovementLock(state)) return;
            
            // Check Exclusion (HUD elements)
            if (hudRefs) {
                // If any HUD ref contains the target, ignore
                const isHudClick = Object.values(hudRefs).some((ref: any) => ref.current && ref.current.contains(e.target as Node));
                if (isHudClick) return;
            } else {
                // Fallback: Check for class
                if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
            }
            
            const isMobile = debugMobileLayout || window.innerWidth < 768 || (e as any).pointerType === 'touch';
            if (isMobile && mode === 'Fly') return;

            markActivity();

            if (e.button === 0 && mode === 'Fly') {
                isDraggingRef.current = true;
                const { x, y } = getNDC(e.clientX, e.clientY);
                dragStart.current = { x, y };
                mousePos.current = { x, y };
            }
        };
        
        const onMouseMove = (e: MouseEvent) => {
            if (isDraggingRef.current) {
                // Fly Mode Drag
                const { x, y } = getNDC(e.clientX, e.clientY);
                mousePos.current = { x, y };
                markActivity();
            } else if (mode === 'Orbit' && e.buttons > 0) {
                // Orbit Mode Drag (Left/Right/Middle)
                markActivity();
            }
        };
        
        const onMouseUp = () => isDraggingRef.current = false;

        domElement.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            domElement.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [mode, gl, debugMobileLayout, hudRefs]); 

    const isInteracting = () => {
        const ms = moveState.current;
        const hasKeys = ms.forward || ms.backward || ms.left || ms.right || ms.up || ms.down || ms.rollLeft || ms.rollRight;
        const hasJoy = Math.abs(joystickMove.current.x) > 0.01 || Math.abs(joystickMove.current.y) > 0.01 || Math.abs(joystickLook.current.x) > 0.01 || Math.abs(joystickLook.current.y) > 0.01;
        const recentActivity = (performance.now() - lastActivityTime.current) < 200; // 200ms buffer for discrete events (Scroll, Key tap)
        return isDraggingRef.current || hasKeys || hasJoy || recentActivity;
    };

    return { moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity, isInteracting };
};
