
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// Module-level: survives tab switches (component unmount/remount).
// useRef would reset to null every time the Graph tab is re-entered.
let persistedViewport: { x: number; y: number; zoom: number } | null = null;
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
import { useEngineStore } from '../../../../store/engineStore';
import { ContextMenuItem } from '../../../../types/help';
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

    // Ghost insert state: node type pending placement under cursor
    const [pendingNodeType, setPendingNodeType] = useState<NodeType | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    // Global Context Menu Action
    const openGlobalMenu = useEngineStore(s => s.openContextMenu);
    
    const { getNodes, getEdges, project, getViewport } = useReactFlow();
    
    const lastRevision = useRef(state.pipelineRevision);
    const lastGraph = useRef<typeof state.graph | null>(null);
    const ignoreNextUpdate = useRef(false);
    const skipNextOnNodesDelete = useRef(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get Registry Data for Dropdown
    const groups = nodeRegistry.getGrouped();

    // --- Store → React Flow Synchronization ---
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
                    actions: { updateParams: handleUpdateParams, setBinding: handleSetBinding, updateNode: handleUpdateNode, removeNode: handleRemoveNode, onInteractionStart: () => actions.handleInteractionStart('param'), onInteractionEnd: actions.handleInteractionEnd }
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
        if (ignoreNextUpdate.current) {
            ignoreNextUpdate.current = false;
            lastRevision.current = state.pipelineRevision;
            lastGraph.current = state.graph;
            return;
        }
        const revChanged = state.pipelineRevision !== lastRevision.current;
        // Also re-sync when graph reference changes without a revision bump —
        // this catches undo of position-only changes (node drag) and structural
        // changes when autoCompile is off, where pipelineRevision stays the same.
        const graphChanged = lastGraph.current !== null && state.graph !== lastGraph.current;
        if (!isInitialized || revChanged || graphChanged) {
            const { nodes: flowNodes, edges: flowEdges } = storeToFlow(state.graph);
            setNodes(flowNodes);
            setEdges(flowEdges);
            lastRevision.current = state.pipelineRevision;
            lastGraph.current = state.graph;
            setIsInitialized(true);
        }
    }, [state.pipelineRevision, state.graph]);

    // Keyboard shortcuts for undo/redo within the graph editor
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                actions.undoParam();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                actions.redoParam();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [actions]);

    // Track mouse position and Escape key while a node is pending placement
    useEffect(() => {
        if (!pendingNodeType) return;
        const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPendingNodeType(null); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('keydown', onEsc);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('keydown', onEsc); };
    }, [pendingNodeType]);

    // Highlight all edges cyan when a non-CSG node is pending insertion
    const displayEdges = useMemo(() => {
        if (!pendingNodeType) return edges;
        const def = nodeRegistry.get(pendingNodeType);
        if (def?.category === 'Combiners (CSG)') return edges;
        return edges.map(e => ({ ...e, style: { stroke: '#06b6d4', strokeWidth: 3 }, animated: true }));
    }, [edges, pendingNodeType]);

    // Convert screen (clientX/Y) to flow coordinates, accounting for the container's page offset.
    // ReactFlow v11's `project` expects coordinates relative to the RF container, not the viewport.
    const clientToFlow = useCallback((clientX: number, clientY: number) => {
        const r = wrapperRef.current?.getBoundingClientRect();
        return project({ x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) });
    }, [project]);

    const syncToStore = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
        const graphNodes: GraphNode[] = currentNodes.filter(n => n.type === 'shaderNode').map(n => ({ ...n.data.node, position: n.position }));
        const graphEdges = currentEdges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }));
        ignoreNextUpdate.current = true;
        actions.setGraph({ nodes: graphNodes, edges: graphEdges });
    }, [actions]);

    // --- Handlers ---
    const onConnect = useCallback((params: Connection) => {
        actions.handleInteractionStart('param');
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
        setTimeout(() => actions.handleInteractionEnd(), 0);
    }, [setNodes, setEdges, syncToStore, actions]);

    const onNodesDelete = useCallback(() => {
        if (skipNextOnNodesDelete.current) { skipNextOnNodesDelete.current = false; return; }
        actions.handleInteractionStart('param');
        setTimeout(() => { syncToStore(getNodes(), getEdges()); actions.handleInteractionEnd(); }, 0);
    }, [syncToStore, getNodes, getEdges, actions]);
    const onEdgesDelete = useCallback(() => { actions.handleInteractionStart('param'); setTimeout(() => { syncToStore(getNodes(), getEdges()); actions.handleInteractionEnd(); }, 0); }, [syncToStore, getNodes, getEdges, actions]);

    const handleUpdateParams = useCallback((id: string, params: any) => {
        setNodes(nds => {
            const newNodes = nds.map(n => { if (n.id === id) { return { ...n, data: { ...n.data, node: { ...n.data.node, params: { ...n.data.node.params, ...params } } } }; } return n; });
            syncToStore(newNodes, getEdges());
            return newNodes;
        });
    }, [syncToStore, getEdges]);

    const handleSetBinding = useCallback((id: string, paramKey: string, val: string | undefined) => {
        setNodes(nds => {
            const newNodes = nds.map(n => {
                if (n.id === id) {
                    const bindings = { ...n.data.node.bindings };
                    if (val) bindings[paramKey] = val;
                    else delete bindings[paramKey];
                    return { ...n, data: { ...n.data, node: { ...n.data.node, bindings } } };
                }
                return n;
            });
            syncToStore(newNodes, getEdges());
            return newNodes;
        });
    }, [syncToStore, getEdges]);

    const handleUpdateNode = useCallback((id: string, updates: any) => {
        setNodes(nds => {
            const newNodes = nds.map(n => { if (n.id === id) { return { ...n, data: { ...n.data, node: { ...n.data.node, ...updates } } }; } return n; });
            syncToStore(newNodes, getEdges());
            return newNodes;
        });
    }, [syncToStore, getEdges]);

    const handleRemoveNode = useCallback((id: string) => {
        actions.handleInteractionStart('param');
        skipNextOnNodesDelete.current = true; // we handle sync ourselves (with bridge edge)
        setNodes(nds => {
            const removedNode = nds.find(n => n.id === id);
            const removedDef = removedNode?.data?.node ? nodeRegistry.get(removedNode.data.node.type) : undefined;
            const isCSG = removedDef?.category === 'Combiners (CSG)';
            const newNodes = nds.filter(n => n.id !== id);
            setEdges(eds => {
                const inEdge = eds.find(e => e.target === id && (!e.targetHandle || e.targetHandle === 'a'));
                const outEdge = eds.find(e => e.source === id);
                const newEdges = eds.filter(e => e.source !== id && e.target !== id);
                // Auto-reconnect parent→child for non-CSG nodes
                if (!isCSG && inEdge && outEdge) {
                    newEdges.push({
                        id: `e-${inEdge.source}-${outEdge.target}`,
                        source: inEdge.source,
                        target: outEdge.target,
                        sourceHandle: inEdge.sourceHandle,
                        targetHandle: outEdge.targetHandle,
                        animated: true,
                        style: { stroke: '#555', strokeWidth: 2 },
                    });
                }
                syncToStore(newNodes, newEdges);
                return newEdges;
            });
            return newNodes;
        });
        setTimeout(() => actions.handleInteractionEnd(), 0);
    }, [syncToStore, setEdges, actions]);

    const handleRemoveEdge = useCallback((id: string) => {
        actions.handleInteractionStart('param');
        setEdges(eds => {
            const newEdges = eds.filter(e => e.id !== id);
            syncToStore(getNodes(), newEdges);
            return newEdges;
        });
        setTimeout(() => actions.handleInteractionEnd(), 0);
    }, [syncToStore, getNodes, setEdges, actions]);

    const onNodeDragStart = useCallback(() => { actions.handleInteractionStart('param'); }, [actions]);
    const onNodeDragStop = useCallback(() => { syncToStore(getNodes(), getEdges()); actions.handleInteractionEnd(); }, [syncToStore, getNodes, getEdges, actions]);

    const addNode = (type: NodeType, position?: { x: number, y: number }) => {
        const id = nanoid();
        const def = nodeRegistry.get(type);
        
        // Build default params map
        const defaultParams: any = {};
        if (def) {
            def.inputs.forEach(inp => defaultParams[inp.id] = inp.default);
        }

        const newNode: GraphNode = { id, type, enabled: true, params: defaultParams, position: position || { x: 250, y: 150 } };
        const flowNode: Node = { id, type: 'shaderNode', position: newNode.position, data: { node: newNode, actions: { updateParams: handleUpdateParams, setBinding: handleSetBinding, updateNode: handleUpdateNode, removeNode: handleRemoveNode, onInteractionStart: () => actions.handleInteractionStart('param'), onInteractionEnd: actions.handleInteractionEnd } }, dragHandle: '.handle' };
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
        const position = clientToFlow(event.clientX, event.clientY);
        setAddMenu({ type: 'pane', x: event.clientX, y: event.clientY, paneX: position.x, paneY: position.y });
    }, [clientToFlow]);

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

    const onEdgeClick = useCallback((e: React.MouseEvent, edge: Edge) => {
        if (!pendingNodeType) return;
        const def = nodeRegistry.get(pendingNodeType);
        if (def?.category === 'Combiners (CSG)') return; // CSG needs 2 inputs — can't insert into single edge
        e.stopPropagation();
        const clickPos = clientToFlow(e.clientX, e.clientY);
        const id = nanoid();
        const defaultParams: any = {};
        if (def) def.inputs.forEach(inp => defaultParams[inp.id] = inp.default);
        const newGraphNode: GraphNode = { id, type: pendingNodeType, enabled: true, params: defaultParams, position: clickPos };
        const flowNode: Node = {
            id, type: 'shaderNode', position: clickPos, dragHandle: '.handle',
            data: { node: newGraphNode, actions: { updateParams: handleUpdateParams, setBinding: handleSetBinding, updateNode: handleUpdateNode, removeNode: handleRemoveNode, onInteractionStart: () => actions.handleInteractionStart('param'), onInteractionEnd: actions.handleInteractionEnd } }
        };
        actions.handleInteractionStart('param');
        setNodes(nds => {
            const newNodes = [...nds, flowNode];
            setEdges(eds => {
                const filtered = eds.filter(ed => ed.id !== edge.id);
                const newEdges = [
                    ...filtered,
                    { id: `e-${edge.source}-${id}`, source: edge.source, target: id, sourceHandle: edge.sourceHandle, targetHandle: 'a', animated: true, style: { stroke: '#555', strokeWidth: 2 } },
                    { id: `e-${id}-${edge.target}`, source: id, target: edge.target, sourceHandle: undefined, targetHandle: edge.targetHandle, animated: true, style: { stroke: '#555', strokeWidth: 2 } },
                ];
                syncToStore(newNodes, newEdges);
                return newEdges;
            });
            return newNodes;
        });
        setTimeout(() => actions.handleInteractionEnd(), 0);
        setPendingNodeType(null);
    }, [pendingNodeType, clientToFlow, handleUpdateParams, handleSetBinding, handleUpdateNode, handleRemoveNode, actions, setNodes, setEdges, syncToStore]);

    const onPaneClick = useCallback((e: React.MouseEvent) => {
        if (pendingNodeType) {
            const pos = clientToFlow(e.clientX, e.clientY);
            actions.handleInteractionStart('param');
            addNode(pendingNodeType, pos);
            setTimeout(() => actions.handleInteractionEnd(), 0);
            setPendingNodeType(null);
            return;
        }
        setAddMenu(null);
    }, [pendingNodeType, clientToFlow, actions]);

    // Prevent browser drag behaviors (image copy, etc.)
    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    return (
        <div
            ref={wrapperRef}
            className={`w-full h-full flex flex-col relative${pendingNodeType ? ' cursor-crosshair' : ''}`}
            data-help-id="ui.graph"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggable={false}
        >
            <ReactFlow
                nodes={nodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onPaneContextMenu={handlePaneContextMenu}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeContextMenu={handleEdgeContextMenu}
                onPaneClick={onPaneClick}
                onMoveStart={() => setAddMenu(null)}
                nodeTypes={nodeTypes}
                onInit={(instance) => {
                    if (persistedViewport) {
                        instance.setViewport(persistedViewport);
                    } else {
                        // Defer until nodes have rendered and have measured dimensions
                        setTimeout(() => instance.fitView({ padding: 0.2 }), 50);
                    }
                }}
                onMoveEnd={() => { persistedViewport = getViewport(); }}
                minZoom={0.1}
                maxZoom={4}
                deleteKeyCode={['Backspace', 'Delete']}
                selectionKeyCode="Shift"
                multiSelectionKeyCode={['Control', 'Meta']}
            >
                <Background color="#222" gap={20} size={1} />
                <Controls />
                <MiniMap
                    style={{ height: 100, backgroundColor: '#111' }}
                    maskColor="rgba(0,0,0,0.5)"
                    nodeColor={(node) => {
                        if (node.type === 'start') return '#22c55e';
                        if (node.type === 'end') return '#ec4899';
                        const nd = node.data?.node as { type?: string } | undefined;
                        const def = nd ? nodeRegistry.get(nd.type as any) : undefined;
                        const cat = def?.category;
                        if (cat === 'Folds') return '#f59e0b';
                        if (cat === 'Fractals') return '#ec4899';
                        if (cat === 'Transforms' || cat === 'Distortion') return '#3b82f6';
                        if (cat === 'Combiners (CSG)') return '#22c55e';
                        if (cat === 'Primitives') return '#a855f7';
                        return '#6b7280';
                    }}
                />
                
                {/* Add Node UI Overlay */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[90%]">
                    {/* Add Node Dropdown */}
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded shadow-lg overflow-hidden">
                        <span className="px-2 text-[10px] text-gray-500 font-bold select-none">Add:</span>
                        <select
                            onChange={(e) => { if(e.target.value) { const t = e.target.value as NodeType; setTimeout(() => setPendingNodeType(t), 0); } e.target.value=""; }}
                            className="t-select text-white hover:text-cyan-400 border-l border-gray-800"
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
                        <span className="px-2 text-[10px] text-gray-500 font-bold select-none">Load:</span>
                        <select 
                            onChange={(e) => { if(e.target.value) loadPreset(e.target.value); e.target.value=""; }}
                            className="t-select text-white hover:text-purple-400 border-l border-gray-800"
                        >
                            <option value="" className="bg-gray-900 text-gray-500">Select Preset...</option>
                            {MODULAR_PRESETS.map(p => (
                                <option key={p.name} value={p.name} className="bg-gray-900 text-white">{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggles */}
                    <label className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded px-2 shadow-lg cursor-pointer text-[10px] text-gray-400 font-bold hover:border-gray-500 hover:text-gray-300 transition-colors select-none">
                        <input type="checkbox" checked={state.autoCompile} onChange={(e) => actions.setAutoCompile(e.target.checked)} className="cursor-pointer accent-cyan-500" />
                        Auto Compile
                    </label>
                    <button onClick={actions.refreshPipeline} className={`text-[10px] font-bold px-3 py-1.5 rounded border shadow-lg transition-all ${state.autoCompile ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 animate-pulse'}`} title="Force Recompile Shader">COMPILE</button>
                </div>
            </ReactFlow>
            
            {addMenu && (
                <GraphContextMenu
                    menu={addMenu}
                    onClose={() => setAddMenu(null)}
                    onAdd={(type) => { setAddMenu(null); setTimeout(() => setPendingNodeType(type), 0); }}
                />
            )}

            {/* Ghost node following cursor when a node type is pending placement */}
            {pendingNodeType && (
                <div
                    className="fixed pointer-events-none z-50 opacity-70 select-none"
                    style={{ left: mousePos.x + 14, top: mousePos.y + 14 }}
                >
                    <div className="bg-gray-900/95 border border-cyan-500/70 rounded-lg px-3 py-2 text-xs text-cyan-300 font-bold shadow-2xl whitespace-nowrap">
                        + {nodeRegistry.get(pendingNodeType)?.label || pendingNodeType}
                        <div className="text-[9px] text-gray-500 font-normal mt-0.5">Click edge to insert · Click pane to place · Esc to cancel</div>
                    </div>
                </div>
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
