
import * as THREE from 'three';

export interface InputState {
    move: {
        forward: boolean;
        backward: boolean;
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        rollLeft: boolean;
        rollRight: boolean;
        boost: boolean;
    };
    look: {
        x: number;
        y: number;
    };
    joystickMove: {
        x: number;
        y: number;
    };
    joystickLook: {
        x: number;
        y: number;
    };
    mouse: {
        isDragging: boolean;
        deltaX: number;
        deltaY: number;
        ndcX: number;
        ndcY: number;
    };
    scrollDelta: number;
}

export class InputManager {
    public state: InputState = {
        move: {
            forward: false, backward: false, left: false, right: false,
            up: false, down: false, rollLeft: false, rollRight: false, boost: false
        },
        look: { x: 0, y: 0 },
        joystickMove: { x: 0, y: 0 },
        joystickLook: { x: 0, y: 0 },
        mouse: { isDragging: false, deltaX: 0, deltaY: 0, ndcX: 0, ndcY: 0 },
        scrollDelta: 0
    };

    private domElement: HTMLElement | null = null;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private lastActivityTime: number = 0;

    constructor() {
        // Bind methods
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onJoyMove = this.onJoyMove.bind(this);
        this.onJoyLook = this.onJoyLook.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    public connect(element: HTMLElement) {
        if (this.domElement) this.disconnect();
        this.domElement = element;

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
        
        // Custom events from MobileControls
        window.addEventListener('joyMove', this.onJoyMove as EventListener);
        window.addEventListener('joyLook', this.onJoyLook as EventListener);
        
        element.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        element.addEventListener('wheel', this.onWheel, { passive: true });
        
        this.lastActivityTime = performance.now();
    }

    public disconnect() {
        if (!this.domElement) return;
        
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        
        window.removeEventListener('joyMove', this.onJoyMove as EventListener);
        window.removeEventListener('joyLook', this.onJoyLook as EventListener);
        
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.domElement.removeEventListener('wheel', this.onWheel);
        
        this.domElement = null;
    }

    public resetFrameDeltas() {
        this.state.scrollDelta = 0;
        // Keep mouse delta active during drag, but maybe decay? 
        // For standard "look" logic, delta usually resets every frame or accumulates.
        // We will calc delta live in update if needed, or rely on absolute drag diffs.
    }

    public isActive(): boolean {
        // Check if any key is pressed or mouse dragging
        const m = this.state.move;
        const keysActive = m.forward || m.backward || m.left || m.right || m.up || m.down || m.rollLeft || m.rollRight;
        const joyActive = Math.abs(this.state.joystickMove.x) > 0.01 || Math.abs(this.state.joystickMove.y) > 0.01;
        const lookActive = Math.abs(this.state.joystickLook.x) > 0.01 || Math.abs(this.state.joystickLook.y) > 0.01;
        
        // Check recent activity (within 200ms) for one-off events like scroll
        const recent = (performance.now() - this.lastActivityTime) < 200;
        
        return keysActive || joyActive || lookActive || this.state.mouse.isDragging || recent;
    }

    private markActivity() {
        this.lastActivityTime = performance.now();
    }

    private onKeyDown(e: KeyboardEvent) {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.code === 'KeyW')) return;
        if (e.key === 'Alt') e.preventDefault();

        switch(e.code) {
            case 'KeyW': this.state.move.forward = true; break;
            case 'KeyS': this.state.move.backward = true; break;
            case 'KeyA': this.state.move.left = true; break;
            case 'KeyD': this.state.move.right = true; break;
            case 'KeyQ': this.state.move.rollLeft = true; break;
            case 'KeyE': this.state.move.rollRight = true; break;
            case 'Space': this.state.move.up = true; break;
            case 'KeyC': this.state.move.down = true; break;
            case 'ShiftLeft': 
            case 'ShiftRight':
                this.state.move.boost = true; break;
        }
        this.markActivity();
    }

    private onKeyUp(e: KeyboardEvent) {
        switch(e.code) {
            case 'KeyW': this.state.move.forward = false; break;
            case 'KeyS': this.state.move.backward = false; break;
            case 'KeyA': this.state.move.left = false; break;
            case 'KeyD': this.state.move.right = false; break;
            case 'KeyQ': this.state.move.rollLeft = false; break;
            case 'KeyE': this.state.move.rollRight = false; break;
            case 'Space': this.state.move.up = false; break;
            case 'KeyC': this.state.move.down = false; break;
            case 'ShiftLeft': 
            case 'ShiftRight':
                this.state.move.boost = false; break;
        }
    }

    private onBlur() {
        // Reset all keys
        this.state.move = {
            forward: false, backward: false, left: false, right: false,
            up: false, down: false, rollLeft: false, rollRight: false, boost: false
        };
    }

    private onJoyMove(e: CustomEvent) {
        this.state.joystickMove = e.detail;
        this.markActivity();
    }

    private onJoyLook(e: CustomEvent) {
        this.state.joystickLook = e.detail;
        this.markActivity();
    }

    private onWheel(e: WheelEvent) {
        // Simple normalization
        this.state.scrollDelta = e.deltaY > 0 ? 1 : -1;
        this.markActivity();
    }

    private onMouseDown(e: MouseEvent) {
        if (!this.domElement) return;
        // Ignore if clicking UI overlays
        if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
        
        if (e.button === 0) {
            this.state.mouse.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.updateMouse(e);
            this.markActivity();
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (this.state.mouse.isDragging) {
            this.updateMouse(e);
            this.state.mouse.deltaX = e.clientX - this.dragStartX;
            this.state.mouse.deltaY = e.clientY - this.dragStartY;
            this.markActivity();
        }
    }

    private onMouseUp() {
        this.state.mouse.isDragging = false;
        this.state.mouse.deltaX = 0;
        this.state.mouse.deltaY = 0;
    }

    private updateMouse(e: MouseEvent) {
        if (!this.domElement) return;
        const rect = this.domElement.getBoundingClientRect();
        this.state.mouse.ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.state.mouse.ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
}
