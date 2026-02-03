
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
    const bucketCount = 128; // Increased resolution for better fit
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

// Calculates ideal range start/end using CDF and Void Seeking
export const calculateSmartLevels = (buckets: number[], min: number, max: number): { start: number, end: number } | null => {
    if (!buckets || buckets.length < 10) return null;
    
    const len = buckets.length;
    
    // 1. FILTERING
    // Ignore the very edges (0 and len-1) for mass calculation, as they often contain 
    // "Sky" (0.0) or "Core" (max) accumulation spikes that skew the distribution.
    const cleanBuckets = buckets.map((b, i) => (i === 0 || i === len - 1) ? 0 : b);

    // 2. MASS CALCULATION (Cumulative Distribution)
    let totalMass = 0;
    cleanBuckets.forEach(b => totalMass += b);
    
    // If image is mostly empty/flat, fallback to full range
    if (totalMass < 0.01) return { start: min, end: max };

    // 3. PERCENTILE BOUNDS
    // We look for the range containing the middle 96% of the visual "stuff".
    // This effectively trims outlier blips (the bottom 2% and top 2%).
    const lowCutoff = totalMass * 0.02;
    const highCutoff = totalMass * 0.98;

    let accumulated = 0;
    let startIdx = 0;
    let endIdx = len - 1;
    let foundStart = false;

    for(let i = 0; i < len; i++) {
        accumulated += cleanBuckets[i];
        if (!foundStart && accumulated >= lowCutoff) {
            startIdx = i;
            foundStart = true;
        }
        if (accumulated >= highCutoff) {
            endIdx = i;
            break;
        }
    }

    // 4. VOID SEEKING (Expansion)
    // The percentile cut might slice through a slope. We want to expand outwards
    // until we hit a "Void" (near-zero value) to encompass the full feature.
    
    const NOISE_FLOOR = 0.05; // Visual threshold to consider "empty"

    // Expand Left
    // Keep walking left as long as we have significant data AND haven't hit the edge
    while(startIdx > 1 && buckets[startIdx - 1] > NOISE_FLOOR) {
        // Safety: Don't expand if we encounter a massive spike (likely a separate feature or background)
        if (buckets[startIdx - 1] > buckets[startIdx] * 2.0) break; 
        startIdx--;
    }

    // Expand Right
    while(endIdx < len - 2 && buckets[endIdx + 1] > NOISE_FLOOR) {
        if (buckets[endIdx + 1] > buckets[endIdx] * 2.0) break;
        endIdx++;
    }

    // 5. MAPPING
    const step = (max - min) / len;
    
    let valStart = min + startIdx * step;
    let valEnd = min + endIdx * step;
    
    // Add small padding (5%) for aesthetics, unless we hit the hard edges
    const range = valEnd - valStart;
    const pad = range * 0.05;
    
    valStart = Math.max(min, valStart - pad);
    valEnd = Math.min(max, valEnd + pad);

    return { start: valStart, end: valEnd };
};
