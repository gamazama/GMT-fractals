
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
    Background, Controls, MiniMap, 
    addEdge, ReactFlowProvider, useReactFlow,
    applyNodeChanges, applyEdgeChanges,
    useNodesState, useEdgesState,
    Node, Edge
} from 'reactflow';
import type { Connection, NodeTypes } from 'reactflow';
import { FractalState, FractalActions, NodeType, GraphNode } from '../../../types';
import { ShaderNode, StartNode, EndNode } from './ShaderNode';
import { hasCycle } from '../../../utils/graphAlg';
import { nanoid } from 'nanoid';
import { GraphContextMenu, GraphMenuState } from './GraphContextMenu'; // Keep for "Add Node" menu only
import { nodeRegistry } from '../../../engine/NodeRegistry';
import { useFractalStore } from '../../../store/fractalStore';
import { ContextMenuItem } from '../../../types/help';
import { MODULAR_PRESETS } from '../../../data/modularPresets';

const nodeTypes: NodeTypes = {
    shaderNode: ShaderNode,
    start: StartNode,
    end: EndNode
};

interface FlowEditorProps {
    state: FractalState;
    actions: FractalActions;
}

const FlowEditorInner: React.FC<FlowEditorProps> = ({ state, actions }) => {
    // ReactFlow internal state using v11 hooks
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Add Node Menu State
    const [addMenu, setAddMenu] = useState<GraphMenuState | null>(null);
    
    // Global Context Menu Action
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    
    const { getNodes, getEdges, project } = useReactFlow();
    
    const lastRevision = useRef(state.pipelineRevision);
    const ignoreNextUpdate = useRef(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get Registry Data for Dropdown
    const groups = nodeRegistry.getGrouped();

    // --- Synchronization Logic (unchanged) ---
    const storeToFlow = (graph: FractalState['graph']) => {
        const flowNodes: Node[] = [];
        const flowEdges: Edge[] = [];
        
        flowNodes.push({ id: 'root-start', type: 'start', position: { x: 250, y: 50 }, data: {}, selectable: false, draggable: false });

        graph.nodes.forEach(n => {
            flowNodes.push({
                id: n.id,
                type: 'shaderNode',
                position: n.position || { x: 0, y: 0 },
                data: { 
                    node: n,
                    actions: { updateParams: handleUpdateParams, toggleBinding: handleToggleBinding, updateNode: handleUpdateNode, removeNode: handleRemoveNode }
                },
                dragHandle: '.handle'
            });
        });
        
        let maxY = 50;
        graph.nodes.forEach(n => { if (n.position?.y > maxY) maxY = n.position.y; });
        
        flowNodes.push({ id: 'root-end', type: 'end', position: { x: 250, y: maxY + 200 }, data: {}, selectable: false, draggable: false });
        
        graph.edges.forEach(e => {
            flowEdges.push({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                animated: true,
                style: { stroke: '#555', strokeWidth: 2 },
            });
        });
        return { nodes: flowNodes, edges: flowEdges };
    };

    useEffect(() => {
        if (ignoreNextUpdate.current) { ignoreNextUpdate.current = false; lastRevision.current = state.pipelineRevision; return; }
        if (!isInitialized || state.pipelineRevision !== lastRevision.current) {
            const { nodes: flowNodes, edges: flowEdges } = storeToFlow(state.graph);
            setNodes(flowNodes);
            setEdges(flowEdges);
            lastRevision.current = state.pipelineRevision;
            setIsInitialized(true);
        }
    }, [state.pipelineRevision, state.graph]);

    const syncToStore = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
        const graphNodes: GraphNode[] = currentNodes.filter(n => n.type === 'shaderNode').map(n => ({ ...n.data.node, position: n.position }));
        const graphEdges = currentEdges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }));
        ignoreNextUpdate.current = true;
        actions.setGraph({ nodes: graphNodes, edges: graphEdges });
    }, [actions]);

    // --- Handlers ---
    const onConnect = useCallback((params: Connection) => {
        setNodes(nds => {
            setEdges(eds => {
                const tempEdges = [...eds, { ...params, id: 'temp' }] as any;
                const tempGraphNodes = nds.map(n => n.data.node).filter(n => !!n);
                if (hasCycle(tempGraphNodes, tempEdges)) { console.warn("Cycle detected!"); return eds; }
                const newEdges = addEdge({ ...params, animated: true, style: { stroke: '#555', strokeWidth: 2 } }, eds);
                syncToStore(nds, newEdges);
                return newEdges;
            });
            return nds;
        });
    }, [setNodes, setEdges, syncToStore]);

    const onNodesDelete = useCallback(() => { setTimeout(() => { syncToStore(getNodes(), getEdges()); }, 0); }, [syncToStore, getNodes, getEdges]);
    const onEdgesDelete = useCallback(() => { setTimeout(() => { syncToStore(getNodes(), getEdges()); }, 0); }, [syncToStore, getNodes, getEdges]);

    const handleUpdateParams = useCallback((id: string, params: any) => {
        setNodes(nds => {
            const newNodes = nds.map(n => { if (n.id === id) { return { ...n, data: { ...n.data, node: { ...n.data.node, params: { ...n.data.node.params, ...params } } } }; } return n; });
            setEdges(eds => { syncToStore(newNodes, eds); return eds; });
            return newNodes;
        });
    }, [syncToStore, setEdges]);

    const handleToggleBinding = useCallback((id: string, paramKey: string) => {
        setNodes(nds => {
            const newNodes = nds.map(n => { if (n.id === id) { const bindings = n.data.node.bindings || {}; let current = bindings[paramKey]; let next = !current ? 'ParamA' : (current === 'ParamA' ? 'ParamB' : (current === 'ParamB' ? 'ParamC' : (current === 'ParamC' ? 'ParamD' : undefined))); return { ...n, data: { ...n.data, node: { ...n.data.node, bindings: { ...bindings, [paramKey]: next } } } }; } return n; });
            setEdges(eds => { syncToStore(newNodes, eds); return eds; });
            return newNodes;
        });
    }, [syncToStore, setEdges]);

    const handleUpdateNode = useCallback((id: string, updates: any) => {
        setNodes(nds => {
            const newNodes = nds.map(n => { if (n.id === id) { return { ...n, data: { ...n.data, node: { ...n.data.node, ...updates } } }; } return n; });
            setEdges(eds => { syncToStore(newNodes, eds); return eds; });
            return newNodes;
        });
    }, [syncToStore, setEdges]);

    const handleRemoveNode = useCallback((id: string) => {
        setNodes(nds => {
            const newNodes = nds.filter(n => n.id !== id);
            setEdges(eds => {
                const newEdges = eds.filter(e => e.source !== id && e.target !== id);
                syncToStore(newNodes, newEdges);
                return newEdges;
            });
            return newNodes;
        });
    }, [syncToStore, setEdges]);

    const handleRemoveEdge = useCallback((id: string) => {
        setEdges(eds => {
            const newEdges = eds.filter(e => e.id !== id);
            syncToStore(getNodes(), newEdges);
            return newEdges;
        });
    }, [syncToStore, getNodes, setEdges]);

    const onNodeDragStop = useCallback(() => { syncToStore(getNodes(), getEdges()); }, [syncToStore, getNodes, getEdges]);

    const addNode = (type: NodeType, position?: { x: number, y: number }) => {
        const id = nanoid();
        const def = nodeRegistry.get(type);
        
        // Build default params map
        const defaultParams: any = {};
        if (def) {
            def.inputs.forEach(inp => defaultParams[inp.id] = inp.default);
        }

        const newNode: GraphNode = { id, type, enabled: true, params: defaultParams, position: position || { x: 250, y: 150 } };
        const flowNode: Node = { id, type: 'shaderNode', position: newNode.position, data: { node: newNode, actions: { updateParams: handleUpdateParams, toggleBinding: handleToggleBinding, updateNode: handleUpdateNode, removeNode: handleRemoveNode } }, dragHandle: '.handle' };
        setNodes(ns => { const newNodes = [...ns, flowNode]; syncToStore(newNodes, getEdges()); return newNodes; });
    };
    
    // Preset Loader
    const loadPreset = (presetName: string) => {
        const preset = MODULAR_PRESETS.find(p => p.name === presetName);
        if (preset) {
            // Need to deep clone and regenerate IDs to avoid React Flow duplicate ID issues if re-loading
            const newNodes = preset.nodes.map(n => ({
                ...n,
                id: nanoid(), // Generate fresh ID
                params: { ...n.params } // Clone params
            }));
            actions.setPipeline(newNodes);
        }
    };

    // --- MIGRATED CONTEXT MENU LOGIC ---

    const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        // project is the v11 equivalent of screenToFlowPosition
        const position = project({ x: event.clientX, y: event.clientY });
        setAddMenu({ type: 'pane', x: event.clientX, y: event.clientY, paneX: position.x, paneY: position.y });
    }, [project]);

    const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        event.stopPropagation();
        if (node.type === 'start' || node.type === 'end') return;

        const items: ContextMenuItem[] = [
            { label: 'Node Actions', action: () => {}, isHeader: true },
            { 
                label: 'Delete Node', 
                danger: true, 
                action: () => handleRemoveNode(node.id) 
            }
        ];
        
        // Dynamic Help ID based on node type
        const helpId = `formula.${node.data.node.type.toLowerCase()}`;
        
        openGlobalMenu(event.clientX, event.clientY, items, [helpId, 'ui.graph']);
    }, [handleRemoveNode, openGlobalMenu]);

    const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        event.stopPropagation();
        
        const items: ContextMenuItem[] = [
            { 
                label: 'Remove Connection', 
                danger: true, 
                action: () => handleRemoveEdge(edge.id) 
            }
        ];
        
        openGlobalMenu(event.clientX, event.clientY, items, ['ui.graph']);
    }, [handleRemoveEdge, openGlobalMenu]);

    const onPaneClick = useCallback(() => setAddMenu(null), []);

    return (
        <div ref={wrapperRef} className="w-full h-[600px] flex flex-col relative" data-help-id="ui.graph">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                onPaneContextMenu={handlePaneContextMenu}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeContextMenu={handleEdgeContextMenu}
                onPaneClick={onPaneClick}
                onMoveStart={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={4}
                deleteKeyCode={['Backspace', 'Delete']}
                selectionKeyCode="Shift"
                multiSelectionKeyCode={['Control', 'Meta']}
            >
                <Background color="#222" gap={20} size={1} />
                <Controls />
                <MiniMap style={{ height: 100, backgroundColor: '#111' }} nodeColor="#333" />
                
                {/* Add Node UI Overlay */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[90%]">
                    {/* Add Node Dropdown */}
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded shadow-lg overflow-hidden">
                        <span className="px-2 text-[10px] text-gray-500 font-bold uppercase select-none">Add:</span>
                        <select 
                            onChange={(e) => { if(e.target.value) addNode(e.target.value as NodeType); e.target.value=""; }}
                            className="bg-gray-900 text-xs text-white px-2 py-1.5 outline-none cursor-pointer hover:text-cyan-400 border-l border-gray-800"
                        >
                            <option value="" className="bg-gray-900 text-gray-500">Select Node...</option>
                            {Object.entries(groups).map(([category, ids]) => {
                                // Skip Utils as they are special
                                if (category === 'Utils' && ids.length === 1 && ids[0] === 'Note') return null;
                                return (
                                    <optgroup key={category} label={category} className="bg-gray-900 text-gray-400 font-bold">
                                        {ids.map(id => {
                                            const def = nodeRegistry.get(id);
                                            return <option key={id} value={id} className="bg-gray-900 text-white font-normal">{def?.label || id}</option>;
                                        })}
                                    </optgroup>
                                );
                            })}
                            <option value="Note" className="bg-gray-900 text-white">Comment / Note</option>
                        </select>
                    </div>

                    {/* Presets Dropdown */}
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded shadow-lg overflow-hidden">
                        <span className="px-2 text-[10px] text-gray-500 font-bold uppercase select-none">Load:</span>
                        <select 
                            onChange={(e) => { if(e.target.value) loadPreset(e.target.value); e.target.value=""; }}
                            className="bg-gray-900 text-xs text-white px-2 py-1.5 outline-none cursor-pointer hover:text-purple-400 border-l border-gray-800"
                        >
                            <option value="" className="bg-gray-900 text-gray-500">Select Preset...</option>
                            {MODULAR_PRESETS.map(p => (
                                <option key={p.name} value={p.name} className="bg-gray-900 text-white">{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggles */}
                    <label className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded px-2 shadow-lg cursor-pointer text-[10px] text-gray-400 font-bold uppercase hover:border-gray-500 hover:text-gray-300 transition-colors select-none">
                        <input type="checkbox" checked={state.autoCompile} onChange={(e) => actions.setAutoCompile(e.target.checked)} className="cursor-pointer accent-cyan-500" />
                        Auto Compile
                    </label>
                    <label className={`flex items-center gap-1.5 rounded px-2 shadow-lg cursor-pointer text-[10px] font-bold uppercase border transition-colors select-none ${state.previewMode ? 'bg-amber-900/40 border-amber-500/50 text-amber-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                        <input type="checkbox" checked={state.previewMode} onChange={(e) => actions.setPreviewMode(e.target.checked)} className="cursor-pointer accent-amber-500" />
                        Preview Mode
                    </label>
                    <button onClick={actions.refreshPipeline} className={`text-[10px] font-bold px-3 py-1.5 rounded border shadow-lg transition-all ${state.autoCompile ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 animate-pulse'}`} title="Force Recompile Shader">COMPILE</button>
                </div>
            </ReactFlow>
            
            {addMenu && (
                <GraphContextMenu 
                    menu={addMenu}
                    onClose={() => setAddMenu(null)} 
                    onAdd={(type, pos) => addNode(type, pos)} 
                />
            )}
        </div>
    );
};

const FlowEditor: React.FC<FlowEditorProps> = (props) => (
    <ReactFlowProvider>
        <FlowEditorInner {...props} />
    </ReactFlowProvider>
);

export default FlowEditor;
