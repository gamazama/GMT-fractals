
// Analyzes raw GPU float data to create a frequency histogram
export const analyzeHistogram = (data: Float32Array | null, bounds?: { min: number, max: number }) => {
    if (!data) return null;
    
    let dataMin = Infinity;
    let dataMax = -Infinity;
    const validValues = [];
    
    // Strided loop (RGBA, take R)
    for (let i = 0; i < data.length; i += 4) {
        const val = data[i];
        if (val > -0.9) { // Valid value check (shader outputs -1.0 for background)
            // Optimization: Only scan for min/max if we don't have fixed bounds
            if (!bounds) {
                if (val < dataMin) dataMin = val;
                if (val > dataMax) dataMax = val;
            }
            validValues.push(val);
        }
    }
    
    // Determine Range
    let min, max;
    
    if (bounds) {
        min = bounds.min;
        max = bounds.max;
    } else {
        if (dataMin === Infinity) return null; // No fractal visible
        
        // Add a small buffer to range to ensure bars don't clip edges
        const span = dataMax - dataMin;
        if (span < 0.0001) {
            min = dataMin - 0.1;
            max = dataMax + 0.1;
        } else {
            min = dataMin - span * 0.05;
            max = dataMax + span * 0.05;
        }
    }

    // Bucketize
    const bucketCount = 100;
    const buckets = new Array(bucketCount).fill(0);
    const r = max - min;
    const safeR = Math.max(r, 0.000001);
    
    for (const val of validValues) {
        const norm = (val - min) / safeR;
        const idx = Math.floor(norm * bucketCount);
        
        // If using fixed bounds, values might be outside [0, 1]
        // We only count values that fall strictly within the buckets
        if (idx >= 0 && idx < bucketCount) {
             buckets[idx]++;
        }
    }
    
    // Logarithmic normalization for better visual of spikes
    const maxCount = Math.max(...buckets);
    // Returns buckets normalized 0.0 to 1.0 (logarithmic scale)
    const normalizedBuckets = buckets.map(c => c > 0 ? Math.log(c + 1) / Math.log(maxCount + 1) : 0);

    return { buckets: normalizedBuckets, min, max };
};

// Calculates ideal range start/end based on histogram buckets
export const calculateSmartLevels = (buckets: number[], min: number, max: number): { start: number, end: number } | null => {
    if (!buckets || buckets.length === 0) return null;
    
    // "Smart" Auto Level: 
    // 1. Ignore bucket 0 and bucket 99 (The "Sky" and "Core" extremes)
    //    These often contain massive spikes that skew the auto-fit.
    // 2. Disregard the bottom 5% of noise floor.
    
    // Create view of inner buckets for peak detection
    const innerStart = 1;
    const innerEnd = buckets.length - 1;
    let peak = 0;
    
    for(let i=innerStart; i<innerEnd; i++) {
        if (buckets[i] > peak) peak = buckets[i];
    }
    
    // Fallback: If inner data is empty, look at whole thing
    if (peak === 0) {
        peak = Math.max(...buckets);
    }

    const threshold = peak * 0.05; // 5% threshold (Lowered from 20% to catch fine detail)

    let firstIdx = -1;
    let lastIdx = -1;

    // Scan from left
    for(let i=0; i<buckets.length; i++) {
        if (buckets[i] > threshold) {
            firstIdx = i;
            break;
        }
    }
    
    // Scan from right
    for(let i=buckets.length-1; i>=0; i--) {
        if (buckets[i] > threshold) {
            lastIdx = i;
            break;
        }
    }
    
    // Fallback: If data is very sparse or flat (no clear peak), find absolute non-zero boundaries
    if (firstIdx === -1) {
         firstIdx = buckets.findIndex(v => v > 0);
         lastIdx = buckets.length - 1;
         while(lastIdx > firstIdx && buckets[lastIdx] === 0) lastIdx--;
    }

    if (firstIdx === -1) return null;
    
    const w = 1.0 / buckets.length;
    
    // Clamp to inner if we detected valid inner data, preventing snapping to 0.0/1.0 unless necessary
    // This keeps the handles visible
    const pctMin = firstIdx * w;
    const pctMax = (lastIdx + 1) * w;
    
    const span = max - min;
    const valMin = min + pctMin * span;
    const valMax = min + pctMax * span;
    
    // Add 10% padding to let it breathe, but clamp to 0-1 if that's the view range
    const pad = (valMax - valMin) * 0.1;
    
    return { start: valMin - pad, end: valMax + pad };
};
