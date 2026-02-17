
export interface FHBTLineData {
    total: number;
    filled: number;
}

export interface FHBTFrame {
    D: number; // Calculated Dimension
    r1: number;
    r2: number;
    r3: number;
}

export interface SonificationState {
    isEnabled: boolean;
    baseFrequency: number;
    masterGain: number;
    harmonics: boolean;
    active: boolean; // Runtime switch
    scanArea: number; // 0.1 (Center) to 1.0 (Full Screen)
    lastDimension: number; // Feedback for UI
}
