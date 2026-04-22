
export interface GraphViewTransform {
    panX: number; // Frame offset
    panY: number; // Value offset
    scaleX: number; // Pixels per Frame
    scaleY: number; // Pixels per Value Unit
    width: number;
    height: number;
}

export const THEME = {
    gridColor: '#333',
    subGridColor: '#222',
    zeroLineColor: '#666',
    keyColor: '#fbbf24', // Amber-400
    keySelectedColor: '#fff',
    handleColor: '#a855f7', // Purple-500
    handleLineColor: '#6b21a8', // Purple-800
    curveColor: '#22d3ee', // Cyan-400
    backgroundColor: '#050505'
};

// Transform Data (Frame, Value) -> Screen (X, Y)
export const valToPx = (val: number, pan: number, scale: number, origin: number, invert: boolean = false) => {
    // scale is pixels per unit
    // origin is usually center height for Y, or 0 for X
    const offset = (val - pan) * scale;
    return invert ? origin - offset : origin + offset;
};

// Transform Screen (X, Y) -> Data (Frame, Value)
export const pxToVal = (px: number, pan: number, scale: number, origin: number, invert: boolean = false) => {
    const offset = invert ? origin - px : px - origin;
    return pan + offset / scale;
};

export const frameToPixel = (frame: number, transform: GraphViewTransform) => {
    return (frame - transform.panX) * transform.scaleX;
};

export const pixelToFrame = (px: number, transform: GraphViewTransform) => {
    return (px / transform.scaleX) + transform.panX;
};

export const valueToPixel = (value: number, transform: GraphViewTransform) => {
    // Y origin is usually height/2 to put 0 in middle
    const centerY = transform.height / 2;
    // Invert Y so up is positive
    return centerY - ((value - transform.panY) * transform.scaleY);
};

export const pixelToValue = (py: number, transform: GraphViewTransform) => {
    const centerY = transform.height / 2;
    return transform.panY + (centerY - py) / transform.scaleY;
};

// Helper to determine nice grid steps for Values (Float)
export const getGridStep = (scale: number, minPixelGap: number = 50) => {
    const targetStep = minPixelGap / scale;
    const power = Math.floor(Math.log10(targetStep));
    const magnitude = Math.pow(10, power);
    const normalized = targetStep / magnitude; // 1..10
    
    let step = 1;
    if (normalized > 5) step = 10;
    else if (normalized > 2) step = 5;
    else if (normalized > 1) step = 2;
    else step = 1;
    
    return step * magnitude;
};

// Helper to determine nice grid steps for Time (Integer Frames)
// Shared by TimelineRuler and GraphEditor
export const getTimeGridSteps = (pxPerFrame: number) => {
    const minTextSpace = 40; // Pixels needed for label
    const minLineSpace = 6;  // Pixels needed for a tick

    const intervals = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];
    
    // Find smallest interval that fits the text
    let textStep = intervals.find(i => i * pxPerFrame >= minTextSpace) || 1000;
    
    // Find smallest interval that fits the lines
    let lineStep = intervals.find(i => i * pxPerFrame >= minLineSpace) || textStep;
    
    if (textStep % lineStep !== 0) lineStep = textStep;

    return { textStep, lineStep };
};
