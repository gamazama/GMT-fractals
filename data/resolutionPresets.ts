/**
 * resolutionPresets — single source of truth for aspect ratios and concrete
 * pixel-size presets used across the app.
 *
 * Three consumers today:
 *   - Viewport "fit to window" dropdown (FixedResolutionControls) — uses ASPECT_RATIOS
 *   - Quality > Resolution panel (QualityRenderControls) — uses RESOLUTION_PRESETS + ASPECT_LOCK_OPTIONS
 *   - High Quality Render / bucket export (BucketRenderPanel) — uses RESOLUTION_PRESETS + ASPECT_LOCK_OPTIONS
 *
 * Add a new preset here once and it appears in every dropdown.
 */

export type AspectRatioValue = number | 'Max' | 'Free';

export interface AspectRatio {
    label: string;
    /** numeric ratio = w/h. 'Max' = fit to window (no fixed ratio). 'Free' = no lock. */
    ratio: AspectRatioValue;
}

/** Full aspect-ratio list — used by the viewport "fit to window" dropdown. */
export const ASPECT_RATIOS: AspectRatio[] = [
    { label: 'Maximum',            ratio: 'Max'  },
    { label: 'Square (1:1)',       ratio: 1.0    },
    { label: 'Landscape (16:9)',   ratio: 16 / 9 },
    { label: 'Ultrawide (21:9)',   ratio: 21 / 9 },
    { label: 'Cinematic (2.35:1)', ratio: 2.35   },
    { label: 'Classic (4:3)',      ratio: 4 / 3  },
    { label: 'Portrait (4:5)',     ratio: 0.8    },
    { label: 'Social (9:16)',      ratio: 9 / 16 },
    { label: 'Skybox (2:1)',       ratio: 2.0    },
];

/**
 * Aspect-LOCK options for paired W/H controls. 'Free' = unlocked; numeric values
 * lock H = W / ratio. Excludes 'Maximum' (fit-to-window doesn't apply when there
 * are explicit dimension inputs).
 */
export const ASPECT_LOCK_OPTIONS: AspectRatio[] = [
    { label: 'Free', ratio: 'Free' },
    ...ASPECT_RATIOS.filter(r => r.ratio !== 'Max'),
];

export interface ResolutionPreset {
    label: string;
    w: number;
    h: number;
}

/**
 * Concrete pixel-size presets — used by Quality > Resolution and Bucket export.
 * Ordered: standard 16:9 sizes, then squares, then social/portrait, then skybox,
 * then print at 300dpi.
 */
export const RESOLUTION_PRESETS: ResolutionPreset[] = [
    { label: 'SVGA (800 × 600)',          w: 800,  h: 600   },
    { label: 'HD (1280 × 720)',           w: 1280, h: 720   },
    { label: 'FHD (1920 × 1080)',         w: 1920, h: 1080  },
    { label: 'QHD (2560 × 1440)',         w: 2560, h: 1440  },
    { label: '4K UHD (3840 × 2160)',      w: 3840, h: 2160  },
    { label: '5K (5120 × 2880)',          w: 5120, h: 2880  },
    { label: '8K UHD (7680 × 4320)',      w: 7680, h: 4320  },
    { label: 'Ultrawide (2560 × 1080)',   w: 2560, h: 1080  },
    { label: 'UWQHD (3440 × 1440)',       w: 3440, h: 1440  },
    { label: '5K2K (5120 × 2160)',        w: 5120, h: 2160  },
    { label: 'Square 1:1 (1080)',         w: 1080, h: 1080  },
    { label: 'Square 1:1 (2048)',         w: 2048, h: 2048  },
    { label: 'Square 1:1 (4096)',         w: 4096, h: 4096  },
    { label: 'Portrait 4:5 (1080p)',      w: 1080, h: 1350  },
    { label: 'Vertical 9:16 (1080p)',     w: 1080, h: 1920  },
    { label: 'Skybox Low (2048 × 1024)',  w: 2048, h: 1024  },
    { label: 'Skybox High (4096 × 2048)', w: 4096, h: 2048  },
    { label: 'A3 Print @ 300dpi',         w: 3508, h: 4961  },
    { label: 'A2 Print @ 300dpi',         w: 4961, h: 7016  },
    { label: 'A1 Print @ 300dpi',         w: 7016, h: 9933  },
    { label: 'A0 Print @ 300dpi',         w: 9933, h: 14043 },
];
