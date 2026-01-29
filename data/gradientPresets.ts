
import { GradientStop } from '../types';

export interface GradientPreset {
    name: string;
    stops: GradientStop[];
}

const createStops = (colors: string[]): GradientStop[] => {
    return colors.map((color, i) => ({
        id: `${i}`,
        position: parseFloat((i / (colors.length - 1)).toFixed(3)),
        color: color
    }));
};

export const GRADIENT_PRESETS: GradientPreset[] = [
    {
        name: "Grayscale",
        stops: createStops(['#000000', '#ffffff'])
    },
    {
        name: "Warm Sunset",
        stops: createStops(['#fcde9c','#faa476','#f0746e','#e34f6f','#dc3977','#b9257a','#7c1d6f'])
    },
    {
        name: "Cool Forest",
        stops: createStops(['#d3f2a3','#97e196','#6cc08b','#4c9b82','#217a79','#105965','#074050'])
    },
    {
        name: "Spring Floral",
        stops: createStops(['#009392','#39b185','#9ccb86','#e9e29c','#eeb479','#e88471','#cf597e'])
    },
    {
        name: "Pastel Dreams",
        stops: createStops(['#009392','#72aaa1','#b1c7b3','#f1eac8','#e5b9ad','#d98994','#d0587e'])
    },
    {
        name: "Earth Tones",
        stops: createStops(['#3d5941','#778868','#b5b991','#f6edbd','#edbb8a','#de8a5a','#ca562c'])
    },
    {
        name: "Spectrum",
        stops: createStops(['#5F4690','#1D6996','#38A6A5','#0F8554','#73AF48','#EDAD08','#E17C05','#CC503E','#94346E','#6F4070','#994E95','#666666'])
    },
    {
        name: "Rainbow Divergent",
        stops: createStops(['#9e0142','#d53e4f','#f46d43','#fdae61','#fee08b','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2'])
    },
        {
        name: "Rainbow Full",
        stops: [
            { id: "1", position: 0.0, color: "#ff0000" },
            { id: "2", position: 0.17, color: "#ffff00" },
            { id: "3", position: 0.33, color: "#00ff00" },
            { id: "4", position: 0.5, color: "#00ffff" },
            { id: "5", position: 0.67, color: "#0000ff" },
            { id: "6", position: 0.83, color: "#ff00ff" },
            { id: "7", position: 1.0, color: "#ff0000" }
        ]
    },
   {
        name: "Oceanic",
        stops: [
            { id: "1", position: 0.0, color: "#001133" },
            { id: "2", position: 0.5, color: "#0066aa" },
            { id: "3", position: 1.0, color: "#00ffff" }
        ]
    },
    {
        name: "Neon Cyber",
        stops: [
            { id: "1", position: 0.0, color: "#220033" },
            { id: "2", position: 0.3, color: "#aa00ff" },
            { id: "3", position: 0.7, color: "#00ffcc" },
            { id: "4", position: 1.0, color: "#ffffff" }
        ]
    },
    {
        name: "Golden Sands",
        stops: [
            { id: "1", position: 0.0, color: "#331a00" },
            { id: "2", position: 0.5, color: "#cc8800" },
            { id: "3", position: 1.0, color: "#ffeeaa" }
        ]
    }
];
