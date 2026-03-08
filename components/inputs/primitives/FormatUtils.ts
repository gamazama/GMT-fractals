/**
 * Format utilities for numeric input display
 * Unified across Slider and Vector inputs
 */

/**
 * Format a float for display, removing unnecessary precision
 */
export const formatDisplay = (val: number): string => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1e-9) return "0";
    return parseFloat(val.toFixed(8)).toString();
};

/**
 * Pi unit mapping for rotation inputs
 * Converts between radians (internal) and π units (display)
 */
export const piMapping = {
    toDisplay: (v: number): number => v / Math.PI,
    fromDisplay: (v: number): number => v * Math.PI,
    
    format: (v: number): string => {
        const piVal = v / Math.PI;
        const absVal = Math.abs(piVal);
        const sign = piVal < 0 ? '-' : '';
        
        // Special cases for common fractions
        if (absVal < 0.001) return '0';
        if (Math.abs(absVal - 1) < 0.001) return `${sign}π`;
        if (Math.abs(absVal - 0.5) < 0.001) return `${sign}π/2`;
        if (Math.abs(absVal - 0.25) < 0.001) return `${sign}π/4`;
        if (Math.abs(absVal - 0.75) < 0.001) return `${sign}3π/4`;
        if (Math.abs(absVal - 2) < 0.001) return `${sign}2π`;
        
        // Check for other simple fractions
        const thirds = Math.round(absVal * 3);
        if (Math.abs(absVal - thirds / 3) < 0.001 && thirds !== 0) {
            if (thirds === 1) return `${sign}π/3`;
            if (thirds === 2) return `${sign}2π/3`;
            if (thirds === 3) return `${sign}π`;
            if (thirds === 4) return `${sign}4π/3`;
            if (thirds === 5) return `${sign}5π/3`;
        }
        
        // Default to decimal
        return `${sign}${absVal.toFixed(2)}π`;
    },
    
    /**
     * Parse user input that may contain π notation
     * Handles: "0.5", "0.5π", "π/2", "-π", "3.14"
     */
    parseInput: (s: string): number | null => {
        const cleaned = s.trim().toLowerCase().replace(/\s/g, '');
        
        // Special cases
        if (cleaned === 'π' || cleaned === 'pi') return Math.PI;
        if (cleaned === '-π' || cleaned === '-pi') return -Math.PI;
        
        // Check for π notation
        if (cleaned.includes('π') || cleaned.includes('pi')) {
            // Remove π/pi characters
            const numPart = cleaned.replace(/[πpi]/g, '');
            
            // Handle fractions like "π/2"
            if (numPart.includes('/')) {
                const [num, denom] = numPart.split('/').map(n => parseFloat(n) || 1);
                const sign = cleaned.startsWith('-') ? -1 : 1;
                return sign * (Math.abs(num) / denom) * Math.PI;
            }
            
            // Handle decimals like "0.5π"
            const coeff = numPart ? parseFloat(numPart) : 1;
            if (isNaN(coeff)) return null;
            const sign = cleaned.startsWith('-') ? -1 : 1;
            return sign * Math.abs(coeff) * Math.PI;
        }
        
        // Plain number
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
};

/**
 * Degrees mapping for rotation inputs
 * Converts between radians (internal) and degrees (display)
 */
export const degreesMapping = {
    toDisplay: (v: number): number => v * (180 / Math.PI),
    fromDisplay: (v: number): number => v * (Math.PI / 180),
    format: (v: number): string => `${(v * (180 / Math.PI)).toFixed(1)}°`,
    parseInput: (s: string): number | null => {
        const cleaned = s.trim().replace(/°/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return null;
        // Return the display value (degrees), fromDisplay will convert to radians
        return num;
    }
};

/**
 * Logarithmic mapping for large-range sliders
 */
export const createLogMapping = (min: number, max: number) => ({
    toDisplay: (v: number): number => {
        if (v <= 0) return min;
        return Math.log10(v);
    },
    fromDisplay: (v: number): number => {
        return Math.pow(10, v);
    },
    format: (v: number): string => formatDisplay(v),
    parseInput: (s: string): number | null => {
        const num = parseFloat(s);
        return isNaN(num) ? null : num;
    }
});

/**
 * Linear mapping (default)
 */
export const linearMapping = {
    toDisplay: (v: number): number => v,
    fromDisplay: (v: number): number => v,
    format: (v: number): string => formatDisplay(v),
    parseInput: (s: string): number | null => {
        const num = parseFloat(s);
        return isNaN(num) ? null : num;
    }
};

export interface ValueMapping {
    toDisplay: (v: number) => number;
    fromDisplay: (v: number) => number;
    format: (v: number) => string;
    parseInput: (s: string) => number | null;
}

/**
 * Get appropriate mapping based on scale type
 */
export const getMapping = (scale?: 'linear' | 'log' | 'pi', min?: number, max?: number): ValueMapping => {
    if (scale === 'pi') return piMapping;
    if (scale === 'log' && min !== undefined && max !== undefined) {
        return createLogMapping(min, max);
    }
    return linearMapping;
};
