
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
        name: "Greyscale",
        stops: createStops(['#000000', '#ffffff'])
    },
    {
        name: "Grey",
        stops: createStops(['#7f7f7f', '#696969'])
    },
    {
        name: "Rainbow Divergent",
        stops: createStops(['#9e0142','#d53e4f','#f46d43','#fdae61','#fee08b','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2'])
    },
    {
        name: "Spectrum",
        stops: createStops(['#5F4690','#1D6996','#38A6A5','#0F8554','#73AF48','#EDAD08','#E17C05','#CC503E','#94346E','#6F4070','#994E95','#666666'])
    },
    {
        name: "Turbo",
        stops: createStops(['#30123B', '#4145AB', '#4675ED', '#39A2FC', '#1BCFD4', '#24ECA6', '#61FC6C', '#A4FC3B', '#D1E834', '#F3C63A', '#FE9B2D', '#F36315', '#D93806', '#B11901', '#7A0402'])
    },
    {
        name: "Inferno",
        stops: createStops(['#000004', '#280B54', '#65156E', '#9F2A63', '#D44842', '#F57D15', '#FAC127', '#FCFFA4'])
    },
    {
        name: "Plasma",
        stops: createStops(['#0D0887', '#5402A3', '#8B0AA5', '#B93289', '#DB5C68', '#F48849', '#FEBC2B', '#F0F921'])
    },
    {
        name: "Viridis",
        stops: createStops(['#440154', '#46327F', '#365C8D', '#277F8E', '#1FA187', '#4AC26D', '#9FDA3A', '#FDE725'])
    },
    {
        name: "Classic Mandelbrot",
        stops: createStops(['#421E0F', '#19071A', '#09012F', '#040449', '#000764', '#0C2C8A', '#1852B1', '#397DD1', '#86B5E5', '#D3ECF8', '#F1E9BF', '#F8C95F', '#FFAA00', '#CC8000', '#995700', '#6A3403'])
    },
    {
        name: "Cosmic Energy",
        stops: createStops(['#00485E', '#005662', '#000000', '#481700', '#803000', '#FFAE55', '#9BF5FF', '#FFFFFF'])
    },
    {
        name: "Lava Lamp",
        stops: createStops(['#000000', '#001830', '#004060', '#00BFFF', '#006080', '#600000', '#DC0000', '#FF4040'])
    },
    {
        name: "Kindlmann",
        stops: createStops(['#000000', '#240675', '#073E96', '#077361', '#089F15', '#70C409', '#FAD092', '#FFFFFF'])
    },
    {
        name: "Cool Warm",
        stops: createStops(['#3B4CC0', '#6889EE', '#9ABAFF', '#C9D8F0', '#EDD1C2', '#F7A889', '#E26A53', '#B40426'])
    },
    {
        name: "Multihue",
        stops: createStops(['#FD6029', '#698403', '#FFF59B', '#F5BD22', '#0B5E87', '#C68876', '#A51C64', '#3B9FEE', '#D4FFD4', '#ABA53C'])
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
        name: "Warm Sunset",
        stops: createStops(['#fcde9c','#faa476','#f0746e','#e34f6f','#dc3977','#b9257a','#7c1d6f'])
    },
    {
        name: "Cool Forest",
        stops: createStops(['#d3f2a3','#97e196','#6cc08b','#4c9b82','#217a79','#105965','#074050'])
    },
    {
        name: "Earth Tones",
        stops: createStops(['#3d5941','#778868','#b5b991','#f6edbd','#edbb8a','#de8a5a','#ca562c'])
    },
    {
        name: "Cosine Rainbow",
        stops: createStops(['#FF8080', '#BFBF0D', '#00FF0D', '#0DBFBF', '#8080FF', '#BF0DBF', '#FF0D0D', '#FF8080'])
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
        name: "Deep Ocean",
        stops: createStops(['#000764', '#0C2C8A', '#1852B1', '#206BCB', '#397DD1', '#57A5D9', '#86B5E5', '#BAFFFD', '#EDFFFF'])
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
        name: "Black Body",
        stops: createStops(['#000000', '#411712', '#801F1B', '#BC3320', '#E0650A', '#E8A11A', '#E7DA30', '#FFFFFF'])
    },
    {
        name: "Aurora Strata",
        stops: [
            { id: "1",  position: 0,                    color: "#000000", bias: 0.7333333333333334, interpolation: "smooth" },
            { id: "2",  position: 0.08849557522123894,  color: "#363636", bias: 0.5,                interpolation: "smooth" },
            { id: "3",  position: 0.111,                color: "#05C1D4", bias: 0.5,                interpolation: "linear" },
            { id: "4",  position: 0.18584070796460178,  color: "#000000", bias: 0.5,                interpolation: "linear" },
            { id: "5",  position: 0.22789970501474927,  color: "#FF5500", bias: 0.5,                interpolation: "linear" },
            { id: "6",  position: 0.26843657817109146,  color: "#FFAB00", bias: 0.5,                interpolation: "linear" },
            { id: "7",  position: 0.333,                color: "#FFDC7C", bias: 0.5,                interpolation: "linear" },
            { id: "8",  position: 0.3746312684365782,   color: "#FFFFFF", bias: 0.7551454328967512, interpolation: "linear" },
            { id: "9",  position: 0.444,                color: "#3C5732", bias: 0.5,                interpolation: "linear" },
            { id: "10", position: 0.4941474926253687,   color: "#97C79D", bias: 0.5,                interpolation: "linear" },
            { id: "11", position: 0.5353510324483777,   color: "#FFFFFF", bias: 0.5,                interpolation: "linear" },
            { id: "12", position: 0.667,                color: "#000000", bias: 0.5,                interpolation: "linear" },
            { id: "13", position: 0.778,                color: "#3B9FEE", bias: 0.5,                interpolation: "linear" },
            { id: "14", position: 0.889,                color: "#D4FFD4", bias: 0.5,                interpolation: "linear" },
            { id: "15", position: 1,                    color: "#FFF659", bias: 0.5,                interpolation: "linear" }
        ]
    }
];
