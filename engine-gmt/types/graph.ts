
export type NodeType = 
    | 'Mandelbulb' | 'BoxFold' | 'SphereFold' | 'Abs' | 'Mod' 
    | 'Rotate' | 'Scale' | 'Translate' | 'Twist' | 'Bend' | 'SineWave'
    | 'Union' | 'Subtract' | 'Intersect' | 'SmoothUnion' | 'Mix' 
    | 'Sphere' | 'Box' 
    | 'PlaneFold' | 'MengerFold' | 'SierpinskiFold'
    | 'Custom' | 'Note' | 'IFSScale' | 'AddConstant' | 'AmazingFold';

export interface PipelineNode {
  id: string;
  type: NodeType;
  enabled: boolean;
  params: {
    [key: string]: number; 
  };
  text?: string;
  bindings?: {
      [key: string]: 'ParamA' | 'ParamB' | 'ParamC' | 'ParamD' | 'ParamE' | 'ParamF' | undefined;
  };
  condition?: {
      active: boolean;
      mod: number;
      rem: number;
  };
}

export interface GraphNode extends PipelineNode {
    position: { x: number, y: number };
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export interface FractalGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}