var qo=Object.defineProperty;var Zo=(e,t,o)=>t in e?qo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var ae=(e,t,o)=>Zo(e,typeof t!="symbol"?t+"":t,o);import{aP as Me,a$ as Wo,b0 as lt,aE as Pe,aL as jt,ac as et,U as me,f as yo,aQ as Jo}from"./CollapsibleSection-Ra5nB2I4.js";import{r as de,j as b,R as we}from"./three-fiber-GKfjny8F.js";import{b as Qo,c as Ko}from"./three-drei-2g7QvUdQ.js";import{l as en,r as Oe,f as tn,I as tt,h as on,i as nn,j as So,k as an,m as sn,o as rn}from"./FormulaFormat-GG0bLOun.js";import{d as Be,c as Ne,o as Lt}from"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";const ze={estimator:0,distanceMetric:0,surfaceThreshold:0,fudgeFactor:1,detail:1,pixelThreshold:.5};let ot=null;function ln(e){ot=e}function cn(){ot=null}function un(e,t,o){ot==null||ot(e,t,o)}const Kt=[3,3,3],eo=[0,0,0];function fn(){const e=new Date;return e.toTimeString().split(" ")[0]+"."+String(e.getMilliseconds()).padStart(3,"0")}const Y=Qo()((e,t)=>({selectedFormulaId:"Mandelbulb",loadedDefinition:null,formulaParams:{},interlaceState:null,loadedFilename:null,loadError:null,qualitySettings:{...ze},resolution:512,iters:12,deType:"auto",deSamples:2,zSubSlices:4,minFeature:"auto",cavityFill:"2",closingRadius:0,newton:!0,newtonSteps:6,smoothPasses:3,smoothLambda:.5,colorSamples:8,colorJitter:.5,exportFormat:"vdb",customFilename:"",vdbColor:!1,bboxCenter:eo,bboxSize:Kt,bboxLock:!1,clipOutsideBounds:!1,isRunning:!1,isCancelled:!1,progress:0,phaseProgress:0,phaseName:"",status:"",logEntries:[],memoryBlocks:[],lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,useNarrowBand:!1,gl:null,setSelectedFormula:o=>e({selectedFormulaId:o}),setLoadedDefinition:o=>e({loadedDefinition:o}),setFormulaParams:o=>e({formulaParams:o}),setInterlaceState:o=>e({interlaceState:o}),updateParam:(o,n)=>e(s=>({formulaParams:{...s.formulaParams,[o]:n}})),setLoadedFilename:o=>e({loadedFilename:o}),setLoadError:o=>e({loadError:o}),setQualitySettings:o=>e({qualitySettings:o}),updateQuality:(o,n)=>e(s=>({qualitySettings:{...s.qualitySettings,[o]:n}})),setResolution:o=>e({resolution:o}),setIters:o=>e({iters:o}),setDeType:o=>e({deType:o}),setDeSamples:o=>e({deSamples:o}),setZSubSlices:o=>e({zSubSlices:o}),setMinFeature:o=>e({minFeature:o}),setCavityFill:o=>e({cavityFill:o}),setClosingRadius:o=>e({closingRadius:o}),setNewton:o=>e({newton:o}),setNewtonSteps:o=>e({newtonSteps:o}),setSmoothPasses:o=>e({smoothPasses:o}),setSmoothLambda:o=>e({smoothLambda:o}),setColorSamples:o=>e({colorSamples:o}),setColorJitter:o=>e({colorJitter:o}),setExportFormat:o=>e({exportFormat:o}),setVdbColor:o=>e({vdbColor:o}),setCustomFilename:o=>e({customFilename:o}),setBboxCenter:o=>e({bboxCenter:o}),setBboxSize:o=>e({bboxSize:o}),setBboxLock:o=>e({bboxLock:o}),setClipOutsideBounds:o=>e({clipOutsideBounds:o}),resetBounds:()=>e({bboxCenter:[...eo],bboxSize:[...Kt]}),setRunning:o=>e({isRunning:o}),setCancelled:o=>e({isCancelled:o}),setProgress:o=>e({progress:o}),setPhase:(o,n)=>e({phaseName:o,phaseProgress:n}),setStatus:o=>e({status:o}),addLog:(o,n="info")=>e(s=>({logEntries:[...s.logEntries,{time:fn(),msg:o,type:n}]})),clearLog:()=>e({logEntries:[]}),memAlloc:(o,n,s,i)=>e(a=>{const r=a.memoryBlocks.findIndex(m=>m.id===o),l=[...a.memoryBlocks];return r>=0?l[r]={id:o,label:n,mb:s,color:i,freed:!1}:l.push({id:o,label:n,mb:s,color:i,freed:!1}),{memoryBlocks:l}}),memFree:o=>e(n=>({memoryBlocks:n.memoryBlocks.map(s=>s.id===o?{...s,freed:!0}:s)})),clearMemory:()=>e({memoryBlocks:[]}),setMesh:(o,n)=>e({lastMesh:o,lastBaseName:n}),setTimings:(o,n,s)=>e({lastTimings:o,smoothingSkipped:n,useNarrowBand:s}),setExportBlob:(o,n)=>e({lastBlob:o,lastFilename:n}),setGL:o=>e({gl:o}),resetMeshResult:()=>e({lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,gl:null,logEntries:[],memoryBlocks:[],progress:0,phaseName:"",status:""})}));function wo(e){var s,i,a,r;const t={};for(const l of e.parameters)l&&(t[l.id]=l.default);const o=(i=(s=e.defaultPreset)==null?void 0:s.features)==null?void 0:i.geometry;o&&(o.juliaMode&&(t.juliaMode=1),(o.juliaX!==void 0||o.juliaY!==void 0||o.juliaZ!==void 0)&&(t.julia={x:o.juliaX??0,y:o.juliaY??0,z:o.juliaZ??0}));const n=(r=(a=e.defaultPreset)==null?void 0:a.features)==null?void 0:r.coreMath;if(n)for(const l of e.parameters)l&&n[l.id]!==void 0&&(t[l.id]=n[l.id]);return t}function Co(e,t){var v,d,f,x;const o=Y.getState(),{def:n,preset:s}=en(e);if(!n)throw new Error("No formula definition found in GMF");o.setSelectedFormula(n.id),o.setLoadedDefinition(n),o.setLoadedFilename(t??null),o.setLoadError(null);const i={},a=(v=s==null?void 0:s.features)==null?void 0:v.coreMath;for(const g of n.parameters)g&&(a&&a[g.id]!==void 0?i[g.id]=a[g.id]:i[g.id]=g.default);o.setFormulaParams(i),(a==null?void 0:a.iterations)!==void 0&&o.setIters(Math.round(a.iterations));const r=(d=s==null?void 0:s.features)==null?void 0:d.geometry;r&&(r.juliaMode&&(i.juliaMode=1),(r.juliaX!==void 0||r.juliaY!==void 0||r.juliaZ!==void 0)&&(i.julia={x:r.juliaX??0,y:r.juliaY??0,z:r.juliaZ??0}),o.setFormulaParams(i));const l=(f=s==null?void 0:s.features)==null?void 0:f.quality;l?(o.setQualitySettings({estimator:l.estimator??0,distanceMetric:l.distanceMetric??0,surfaceThreshold:0,fudgeFactor:l.fudgeFactor??1,detail:l.detail??1,pixelThreshold:l.pixelThreshold??.5}),l.distanceMetric!==void 0&&(i.distanceMetric=l.distanceMetric,o.setFormulaParams(i))):o.setQualitySettings({...ze});const m=(x=s==null?void 0:s.features)==null?void 0:x.interlace;if(m!=null&&m.interlaceCompiled&&(m!=null&&m.interlaceFormula)){const g=Oe.get(m.interlaceFormula);if(g){const M={};for(const h of g.parameters){if(!h)continue;const F="interlace"+h.id.charAt(0).toUpperCase()+h.id.slice(1);m[F]!==void 0?M[h.id]=m[F]:M[h.id]=h.default}o.setInterlaceState({definition:g,params:M,enabled:m.interlaceEnabled!==!1,interval:m.interlaceInterval??2,startIter:m.interlaceStartIter??0})}else o.setInterlaceState(null)}else o.setInterlaceState(null)}const dn=()=>{const e=Y(),t=Y(m=>m.loadedFilename),o=Y(m=>m.loadError),n=de.useRef(null),i=Oe.getAll().map(m=>({label:m.name,value:m.id})),a=()=>{const m=Y.getState();return m.lastMesh||m.lastBlob?window.confirm("Changing formula will clear the current mesh and export data. Continue?"):!0},r=m=>{var d,f;if(!a())return;e.resetMeshResult(),e.setSelectedFormula(m);const v=Oe.get(m);if(v){e.setLoadedDefinition(v),e.setFormulaParams(wo(v)),e.setInterlaceState(null),e.setLoadedFilename(null),e.setLoadError(null);const x=(f=(d=v.defaultPreset)==null?void 0:d.features)==null?void 0:f.quality;e.setQualitySettings(x?{estimator:x.estimator??ze.estimator,distanceMetric:x.distanceMetric??ze.distanceMetric,surfaceThreshold:ze.surfaceThreshold,fudgeFactor:x.fudgeFactor??ze.fudgeFactor,detail:x.detail??ze.detail,pixelThreshold:x.pixelThreshold??ze.pixelThreshold}:{...ze})}},l=m=>{var f;const v=(f=m.target.files)==null?void 0:f[0];if(!v)return;if(!a()){m.target.value="";return}e.resetMeshResult(),e.setLoadError(null);const d=new FileReader;d.onload=()=>{try{Co(d.result,v.name)}catch(x){console.error("Failed to load GMF file:",x),e.setLoadError("Failed to parse GMF: "+x.message),e.setLoadedFilename(null)}},d.readAsText(v),m.target.value=""};return b.jsxs("div",{className:"flex flex-col gap-1.5",children:[b.jsx(Me,{value:e.selectedFormulaId,options:i,onChange:r,fullWidth:!0}),b.jsx("button",{onClick:()=>{var m;return(m=n.current)==null?void 0:m.click()},className:"text-[11px] px-3 py-1.5 bg-sky-800/60 text-sky-200 border border-sky-600/40 rounded hover:bg-sky-700/60 cursor-pointer font-mono",children:"Load GMF..."}),t&&b.jsx("div",{className:"text-[10px] text-gray-400 truncate px-0.5",title:t,children:t}),o&&b.jsx("div",{className:"text-[10px] text-red-400 bg-red-900/20 px-2 py-1 rounded",children:o}),b.jsx("input",{ref:n,type:"file",accept:".gmf",className:"hidden",onChange:l})]})},_t=({primaryAxis:e,secondaryAxis:t,disabled:o,onHover:n})=>b.jsx("div",{className:`w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden transition-all duration-150 ease-out relative bg-white/[0.08] border border-white/5 ${o?"opacity-30 pointer-events-none":""}`,onMouseEnter:()=>n==null?void 0:n(!0),onMouseLeave:()=>n==null?void 0:n(!1),title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${t.toUpperCase()}`,children:b.jsx("div",{className:"absolute inset-0 flex items-center justify-center opacity-50",children:b.jsx("div",{className:"w-3 h-3 border border-white/20 rotate-45"})})}),Ut=({value:e,onChange:t,mode:o="normal",modeToggleable:n=!1,axes:s,axisConfig:i,showDualAxisPads:a=!0,showRotationGizmo:r=!1,label:l,disabled:m=!1,trackKeys:v,trackLabels:d,interactionMode:f="param",headerRight:x,onContextMenu:g,dataHelpId:M})=>{const h=e.w!==void 0,F=e.z!==void 0,[p,y]=we.useState(e),[w,V]=we.useState(null),[k,R]=we.useState(o),D=de.useRef(!1),N=de.useRef(null);de.useEffect(()=>{D.current||y(e)},[e.x,e.y,e.z,e.w,F,h]);const u=k==="rotation",c=we.useCallback(S=>{var E,G;return u?Wo:(i==null?void 0:i.mapping)||((E=s==null?void 0:s.x)==null?void 0:E.mapping)||((G=s==null?void 0:s.y)==null?void 0:G.mapping)},[u,i,s]),_=we.useCallback(S=>{if(u)return{min:-2*Math.PI,max:2*Math.PI};const E=(s==null?void 0:s[S])||i;return{min:(E==null?void 0:E.min)??-1e4,max:(E==null?void 0:E.max)??1e4,hardMin:E==null?void 0:E.hardMin,hardMax:E==null?void 0:E.hardMax}},[u,s,i]),P=we.useCallback(()=>{D.current=!0,N.current={...p}},[p]),B=we.useCallback(()=>{N.current=null,D.current=!1},[]),z=we.useCallback((S,E)=>{const G={...p,[S]:E};y(G),t(G)},[p,t]),T=we.useCallback((S,E,G,H)=>{const $={...N.current||p,[S]:G,[E]:H};y($),t($)},[p,t]),U=w==="xy",I=w==="xy"||w==="zy",C=w==="zy"||w==="wz",L=w==="wz",A=(S,E)=>{const G=_(E),H=c(E),X=s==null?void 0:s[E];return{variant:"compact",showTrack:!0,disabled:m,highlight:S===0?U:S===1?I:S===2?C:L,mapping:H,min:G.min,max:G.max,hardMin:G.hardMin,hardMax:G.hardMax,step:u?.01:(i==null?void 0:i.step)??(X==null?void 0:X.step)??.01,...i,...X}},O=()=>n?b.jsx("button",{onClick:()=>R(S=>S==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors ${k==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:k==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null;return b.jsxs("div",{className:"mb-px animate-slider-entry","data-help-id":M,onContextMenu:g,children:[l&&b.jsx("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:b.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[n&&O(),x,b.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${m?"text-gray-600":"text-gray-400"}`,children:[l,u&&b.jsx("span",{className:"text-[8px] text-cyan-400/60",children:"(π)"})]})]})}),b.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},children:b.jsxs("div",{className:"flex gap-px w-full h-full",children:[b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${lt[0].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"X"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Pe,{value:p.x,onChange:S=>z("x",S),onDragStart:P,onDragEnd:B,...A(0,"x")})})]}),a&&b.jsx(_t,{primaryAxis:"x",secondaryAxis:"y",primaryValue:p.x,secondaryValue:p.y,min:i==null?void 0:i.min,max:i==null?void 0:i.max,step:i==null?void 0:i.step,onUpdate:(S,E)=>T("x","y",S,E),onDragStart:P,onDragEnd:B,disabled:m,onHover:S=>V(S?"xy":null)}),b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${lt[1].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"Y"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Pe,{value:p.y,onChange:S=>z("y",S),onDragStart:P,onDragEnd:B,...A(1,"y")})})]}),F&&a&&b.jsx(_t,{primaryAxis:"z",secondaryAxis:"y",primaryValue:p.z??0,secondaryValue:p.y,min:i==null?void 0:i.min,max:i==null?void 0:i.max,step:i==null?void 0:i.step,onUpdate:(S,E)=>T("z","y",S,E),onDragStart:P,onDragEnd:B,disabled:m,onHover:S=>V(S?"zy":null)}),F&&b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${lt[2].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"Z"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Pe,{value:p.z??0,onChange:S=>z("z",S),onDragStart:P,onDragEnd:B,...A(2,"z")})})]}),h&&a&&b.jsx(_t,{primaryAxis:"x",secondaryAxis:"z",primaryValue:p.w??0,secondaryValue:p.z??0,min:i==null?void 0:i.min,max:i==null?void 0:i.max,step:i==null?void 0:i.step,onUpdate:(S,E)=>T("w","z",S,E),onDragStart:P,onDragEnd:B,disabled:m,onHover:S=>V(S?"wz":null)}),h&&b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${lt[3].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"W"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Pe,{value:p.w??0,onChange:S=>z("w",S),onDragStart:P,onDragEnd:B,...A(3,"w")})})]})]})})]})},Mo=({definition:e,params:t,onUpdate:o})=>{const n=Y(f=>f.loadedDefinition),s=Y(f=>f.formulaParams),i=Y(f=>f.updateParam),a=e||n,r=t||s,l=o||i;if(!a)return null;const m=a.parameters.filter(f=>f!==null),v=r.juliaMode??0,d=r.julia??{x:0,y:0,z:0};return b.jsxs("div",{className:"flex flex-col gap-px",children:[m.map(f=>{const x=r[f.id],g=f.type||"float";if(f.mode==="toggle"){const M=x?typeof x=="number"?x>0:!!x:!1;return b.jsx(jt,{label:f.label,value:M,onChange:h=>l(f.id,h?1:0)},f.id)}if(g==="vec2"||g==="vec3"||g==="vec4"){const M=x??f.default??{x:0,y:0,z:0,w:0};return b.jsx(Ut,{label:f.label,value:M,onChange:h=>l(f.id,h),axisConfig:{min:f.min,max:f.max,step:f.step||.01},showDualAxisPads:g!=="vec2"},f.id)}return b.jsx(Pe,{label:f.label,value:x??f.default??0,onChange:M=>l(f.id,M),min:f.min,max:f.max,step:f.step||.01,defaultValue:f.default,variant:"full"},f.id)}),b.jsxs("div",{className:"border-t border-white/5 mt-1 pt-1",children:[b.jsx(jt,{label:"Julia Mode",value:v>.5,onChange:f=>l("juliaMode",f?1:0)}),v>.5&&b.jsx(Ut,{label:"Julia Offset",value:d,onChange:f=>l("julia",f),axisConfig:{min:-4,max:4,step:.01}})]})]})};function He({label:e,children:t}){return b.jsxs("div",{className:"flex flex-col gap-px border-t border-white/5 first:border-t-0 pt-1 first:pt-0",children:[b.jsx("span",{className:"text-[9px] text-gray-500 uppercase tracking-wide px-0.5 mb-0.5",children:e}),t]})}function mn(){const e=Y(),t=Y(n=>n.qualitySettings),o=Y(n=>n.exportFormat)==="vdb";return b.jsx(et,{label:"Pipeline",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-1",children:[b.jsxs(He,{label:"Quality",children:[b.jsx(Me,{label:"Estimator",value:t.estimator,options:[{label:"Analytic (Log)",value:0},{label:"Linear (Fold 1.0)",value:1},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3},{label:"Linear (Fold 2.0)",value:4}],onChange:n=>e.updateQuality("estimator",n)}),b.jsx(Me,{label:"Distance Metric",value:t.distanceMetric,options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],onChange:n=>e.updateQuality("distanceMetric",n)}),b.jsx(Pe,{label:"Surface Threshold",value:t.surfaceThreshold,onChange:n=>e.updateQuality("surfaceThreshold",n),min:0,max:2,step:.001,variant:"full"}),b.jsx(Pe,{label:"Fudge Factor",value:t.fudgeFactor,onChange:n=>e.updateQuality("fudgeFactor",n),min:.01,max:1,step:.01,variant:"full"}),b.jsx(Pe,{label:"Ray Detail",value:t.detail,onChange:n=>e.updateQuality("detail",n),min:.1,max:10,step:.1,variant:"full"}),b.jsx(Pe,{label:"Pixel Threshold",value:t.pixelThreshold,onChange:n=>e.updateQuality("pixelThreshold",n),min:.1,max:2,step:.1,variant:"full"})]}),b.jsxs(He,{label:"SDF",children:[b.jsxs("div",{className:"flex items-end gap-1",children:[b.jsx("div",{className:"flex-1",children:b.jsx(Me,{label:"Resolution",value:[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?e.resolution:"custom",options:[...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].map(n=>({label:`${n}³`,value:n})),...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?[]:[{label:`${e.resolution}³ (custom)`,value:e.resolution}]],onChange:n=>{typeof n=="number"&&e.setResolution(n)}})}),b.jsx("input",{type:"number",min:16,max:8192,step:1,value:e.resolution,onChange:n=>{const s=Math.max(16,Math.min(8192,parseInt(n.target.value)||512));e.setResolution(s)},className:"w-[60px] h-[26px] bg-gray-800 border border-gray-700 rounded text-[11px] text-gray-200 text-center font-mono",title:"Custom resolution (16–8192)"})]}),b.jsx(Me,{label:"DE Samples",value:e.deSamples,options:[{label:"1",value:1},{label:"2³ = 8",value:2},{label:"3³ = 27",value:3},{label:"4³ = 64",value:4}],onChange:e.setDeSamples}),b.jsx(Me,{label:"Z Sub-slices",value:e.zSubSlices,options:[1,2,4,8,16].map(n=>({label:n===1?"off":String(n),value:n})),onChange:e.setZSubSlices}),!o&&b.jsx(Me,{label:"DE Type",value:e.deType,options:[{label:"Auto",value:"auto"},{label:"Power",value:"power"},{label:"IFS",value:"ifs"}],onChange:e.setDeType})]}),!o&&b.jsxs(b.Fragment,{children:[b.jsxs(He,{label:"Filter",children:[b.jsx(Me,{label:"Min Feature",value:e.minFeature,options:[{label:"Auto",value:"auto"},{label:"Off",value:"off"},{label:"1x voxel",value:"1"},{label:"1.5x",value:"1.5"},{label:"2x",value:"2"},{label:"3x",value:"3"},{label:"5x",value:"5"}],onChange:e.setMinFeature}),b.jsx(Me,{label:"Cavity Fill",value:e.cavityFill,options:[{label:"Off",value:"off"},{label:"Dilate 1",value:"1"},{label:"Dilate 2",value:"2"},{label:"Dilate 4",value:"4"},{label:"Dilate 8",value:"8"},{label:"Dilate 16",value:"16"},{label:"Escape Test",value:"escape"}],onChange:e.setCavityFill}),b.jsx(Pe,{label:"Closing",value:e.closingRadius,onChange:e.setClosingRadius,min:0,max:20,step:.5,variant:"full"})]}),b.jsxs(He,{label:"Newton",children:[b.jsx(jt,{label:"Newton Projection",value:e.newton,onChange:e.setNewton}),b.jsx(Me,{label:"Steps",value:e.newtonSteps,options:[2,4,6,8,12,16].map(n=>({label:String(n),value:n})),onChange:e.setNewtonSteps,disabled:!e.newton})]}),b.jsxs(He,{label:"Smooth",children:[b.jsx(Pe,{label:"Passes",value:e.smoothPasses,onChange:e.setSmoothPasses,min:0,max:50,step:1,variant:"full"}),b.jsx(Me,{label:"Lambda",value:e.smoothLambda,options:[{label:"0.3 (gentle)",value:.3},{label:"0.5 (standard)",value:.5},{label:"0.7 (strong)",value:.7}],onChange:e.setSmoothLambda})]}),b.jsxs(He,{label:"Color",children:[b.jsx(Me,{label:"Samples",value:e.colorSamples,options:[1,4,8,16,32,64,128,256].map(n=>({label:n===1?"off":String(n),value:n})),onChange:e.setColorSamples}),b.jsx(Me,{label:"Jitter Radius",value:e.colorJitter,options:[.25,.5,1,2].map(n=>({label:`${n}x`,value:n})),onChange:e.setColorJitter})]})]})]})})}const $t=`
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = max(dot(z,z), 1.0e-9);
    float minR2 = max(minR * minR, 1.0e-9);
    float fixedR2 = max(fixedR * fixedR, 1.0e-9);
    float k = clamp(fixedR2 / r2, 1.0, fixedR2 / minR2);
    z *= k; dz *= k;
}`,Gt=`
void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}`;function To(e){return`
vec3 ${e}mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 ${e}mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 ${e}permute(vec4 x) { return ${e}mod289v4(((x*34.0)+1.0)*x); }
vec4 ${e}taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = ${e}mod289v3(i);
  vec4 p = ${e}permute(${e}permute(${e}permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x2_ = x_ * ns.x + ns.yyyy;
  vec4 y2_ = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);
  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = ${e}taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`}const nt=`
uniform float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;
uniform vec2  uVec2A, uVec2B, uVec2C;
uniform vec3  uVec3A, uVec3B, uVec3C;
uniform vec4  uVec4A, uVec4B, uVec4C;
uniform vec3  uJulia;
uniform float uJuliaMode;
uniform float uEscapeThresh;
uniform float uDistanceMetric;
#define uIterations float(uIters)
`,yt=`
// --- Helper functions for mesh export formulas ---
${$t}
${Gt}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

// Shared transforms (Rodrigues rotation, twist)
${tn}

// Simplex noise (Stefan Gustavson)
${To("_")}
`,Fo=`
#define PI 3.14159265
#define TAU 6.28318530
#define INV_TAU 0.15915494
#define INV_PI  0.31830989
const float phi = 1.61803398875;
`,pn=e=>`
// Constants
${Fo}
#define MAX_DIST 10000.0
#define MISS_DIST 1000.0            // Far sentinel for missed rays — d > MISS_DIST means no geometry hit; must be < MAX_DIST
#define BOUNDING_RADIUS 400.0
#define PRECISION_RATIO_HIGH 5.0e-7 // ~0.5 ppm — float precision floor, scales with distance from fractal origin
#define PRECISION_RATIO_LOW  1.0e-5 // ~10 ppm — low precision / mobile float floor
#define GGX_EPSILON 0.0001          // GGX denominator safety — prevents divide-by-zero near specular singularities
#define DIR_LIGHT_DIST 100.0        // Directional light distance proxy — larger than BOUNDING_RADIUS, treated as infinite

// --- RANDOM FUNCTIONS ---
// Interleaved Gradient Noise (Jimenez 2014, "Next Generation Post Processing in Call of Duty")
float ign_noise(vec2 uv) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
}

// Hash without sine — Dave Hoskins (shadertoy.com/view/4djSRW)
float hash21(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// --- PRECISION MATH HELPER ---
// Reconstructs the absolute fractal space position from the split-precision context.
// p_fractal = (ctx.pos + ctx.originLow) + ctx.originHigh
vec3 applyPrecisionOffset(vec3 localPos, vec3 low, vec3 high) {
    return (localPos + low) + high;
}

vec4 textureLod0(sampler2D tex, vec2 uv) {
    #if __VERSION__ >= 300
        return textureLod(tex, uv, 0.0);
    #else
        #ifdef GL_EXT_shader_texture_lod
            return texture2DLodEXT(tex, uv, 0.0);
        #else
            return texture2D(tex, uv, -16.0);
        #endif
    #endif
}

// Distance metric: 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
float getLength(vec3 p) {
    float m = uDistanceMetric;
    if (m < 0.5) return length(p);                                     // Euclidean
    if (m < 1.5) return max(abs(p.x), max(abs(p.y), abs(p.z)));       // Chebyshev (L∞)
    if (m < 2.5) return (abs(p.x) + abs(p.y) + abs(p.z)) * 0.57735;  // Manhattan (L1), scaled by 1/√3 to approximate Euclidean magnitude
    vec3 p2 = p*p; vec3 p4 = p2*p2;
    return pow(dot(p4, vec3(1.0)), 0.25);                              // Quartic (L4)
}

#ifdef LAYER3_ENABLED
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
// Perlin's fast approximation: taylorInvSqrt(r) ≈ 1/sqrt(r) for r∈[0.5,2.0]
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// 3D Simplex noise — Stefan Gustavson (github.com/stegu/webgl-noise)
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;  // 1/7 — gradient grid scale
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // 49 = 7×7 gradient cell wrap
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );              // 7 gradient cells per axis
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );  // 42.0 = Perlin's empirical normalization to [-1,1]
}
#endif // LAYER3_ENABLED

vec3 InverseACESFilm(vec3 x) {
    float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;
    vec3 y = clamp(x, 0.0, 0.99);
    vec3 A = c * y - a; vec3 B = d * y - b; vec3 C = e * y;
    vec3 D = sqrt(max(vec3(0.0), B*B - 4.0*A*C));
    return (-B - D) / (2.0 * A);
}

// Applies Color Profile to Texture Lookup
// 0=sRGB, 1=Linear, 2=ACES
vec3 applyTextureProfile(vec3 col, float mode) {
    switch(int(mode + 0.1)) {
    case 0: return pow(max(col, vec3(0.0)), vec3(2.2)); // sRGB -> Linear
    case 2: return InverseACESFilm(col);                 // ACES Inverse -> Linear
    default: return col;                                  // Linear (Pass-through)
    }
}

${$t}
${Gt}

vec2 intersectSphere(vec3 ro, vec3 rd, float r) {
    float b = dot(ro, rd); float c = dot(ro, ro) - r * r;
    float h = b * b - c; if (h < 0.0) return vec2(1.0, 0.0);
    h = sqrt(h); return vec2(-b - h, -b + h);
}

${e?`
    // Kernel Capability: 3-Stage Rotation (Branchless)
    // CPU sends identity mat3 when angles are zero → p = I*p = p, no branch needed.
    // Pre:   inside loop, before formula
    // Post:  inside loop, after formula
    // World: outside loop, applied to p before iteration

    void applyPreRotation(inout vec3 p) {
        p = uPreRotMatrix * p;
    }

    void applyPostRotation(inout vec3 p) {
        p = uPostRotMatrix * p;
    }

    void applyWorldRotation(inout vec3 p) {
        p = uWorldRotMatrix * p;
    }
    `:`
    // Kernel Optimization: No Rotation Code
    void applyPreRotation(inout vec3 p) {}
    void applyPostRotation(inout vec3 p) {}
    void applyWorldRotation(inout vec3 p) {}
    `}

`;function Xt(e){if(e.shader.getDist)return"custom";const t=e.shader.function+" "+e.shader.loopBody+" "+(e.shader.preamble||"");return/boxFold|sphereFold/.test(t)||/dr\s*=\s*dr\s*\*\s*\w/.test(t)&&!/pow\s*\(/.test(t)||/abs\s*\(\s*z/.test(t)&&/dr\s*[\*=]/.test(t)&&!/pow\s*\(/.test(t)?"ifs":"power"}function Eo(e){return e.deType!=="auto"?e.deType:Xt(e.definition)}function Po(e){return e.shader.getDist?`
vec2 _getDistCustom(float r, float safeDr, float iter, vec4 z) {
  float dr = safeDr;
  ${e.shader.getDist}
}
`:""}function to(e){return e<.5?`float logR2 = log2(r * r);
    return 0.17328679 * logR2 * r / safeDr;`:e<1.5?"return (r - 1.0) / safeDr;":e<2.5?"return r / safeDr;":e<3.5?`float logR2 = log2(r * r);
    return 0.34657359 * logR2 * r / (safeDr + 8.0);`:"return (r - 2.0) / safeDr;"}function Ao(e,t,o,n){if(t)return e==="ifs"?`return _getDistCustom(r, safeDr, iter, z).x - ${o};`:"return _getDistCustom(r, safeDr, iter, z).x;";if(n!==void 0&&n>0){const s=to(n);if(n>=.5&&n<1.5||n>=3.5){const i=s.split(`
`),a=i[i.length-1];return i[i.length-1]=a.replace(/;$/,` - ${o};`),i.join(`
`)}if(e!=="ifs")return`if (r > 2.0) { ${s} }
    return -1.0;`}return e==="power"?`// Power fractals: orbit must escape (r > 2) for valid DE.
    // Non-escaped = interior sentinel.
    if (r > 2.0) { ${to(0)} }
    return -1.0;`:`return (r - 1.0) / safeDr - ${o};`}function St(){const{scalars:e,vec2s:t,vec3s:o,vec4s:n}=tt;return`
uniform float ${e.join(", ")};
uniform vec2  ${t.join(", ")};
uniform vec3  ${o.join(", ")};
uniform vec4  ${n.join(", ")};
uniform float uInterlaceEnabled;
uniform float uInterlaceInterval;
uniform float uInterlaceStartIter;
`}function wt(e){const t=e.definition;let o="";t.shader.preamble&&(o=on(t.shader.preamble,t.id,t.shader.preambleVars));const n=nn(t.shader.function,t.id,t.shader.preambleVars);let s="";return t.shader.loopInit&&(s=So(t.shader.loopInit,t.id,t.shader.preambleVars)),{preamble:o,func:n,loopInit:s}}function Ct(e,t,o){let n="",s="";if(o){const a=an(o.definition.shader.loopBody,o.definition.id);let r="";o.definition.shader.loopInit&&(r=So(o.definition.shader.loopInit,o.definition.id,o.definition.shader.preambleVars));const l=!!o.definition.shader.usesSharedRotation;({preLoop:n,inLoop:s}=sn(a,r,l))}const i=o?`if (!skipMainFormula) { ${e.shader.loopBody} }`:e.shader.loopBody;return`  vec4 z = vec4(pos, 0.0);
  vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
  float dr = 1.0;
  float trap = 1e10;
  float iter = 0.0;
  ${e.shader.loopInit||""}
  ${n}

  for (int i = 0; i < 100; i++) {
    if (i >= ${t}) break;
    float r2 = dot(z.xyz, z.xyz);
    if (r2 > 1e4) break;
    ${o?"bool skipMainFormula = false;":""}
    ${s}
    ${i}
    iter += 1.0;
  }`}const Je=`#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 2 - 1, (gl_VertexID >> 1) * 2 - 1);
  gl_Position = vec4(p, 0, 1);
}`;function hn(e){const t=e.definition,o=e.interlace,n=o?wt(o):null;return`#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
${nt}
${o?St():""}
out vec4 fragColor;

${yt}

${t.shader.preamble||""}
${(n==null?void 0:n.preamble)||""}

${t.shader.function}
${(n==null?void 0:n.func)||""}

void main() {
  vec3 pos = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

${Ct(t,"uIters",o)}

  float r2 = dot(z.xyz, z.xyz);
  // 1.0 = interior (did not escape), 0.0 = exterior
  fragColor = vec4(r2 < 1e4 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}`}function vn(e){const t=e.definition,o=Eo(e),n=e.interlace,s=n?wt(n):null,i=Po(t),a=Ao(o,!!t.shader.getDist,"uVoxelSize * 0.5",e.estimator);return`#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int   uIters;
uniform float uVoxelSize;
uniform int   uNewtonSteps;
${nt}
${n?St():""}

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outNormal;

${yt}

${t.shader.preamble||""}
${(s==null?void 0:s.preamble)||""}

// --- Formula function ---
${t.shader.function}
${(s==null?void 0:s.func)||""}

${i}
float formulaDE(vec3 pos) {
${Ct(t,"uIters",n)}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${a}
}

vec3 sdfGradient(vec3 p) {
  float h = 1e-5;
  float gx = formulaDE(p + vec3(h,0,0)) - formulaDE(p - vec3(h,0,0));
  float gy = formulaDE(p + vec3(0,h,0)) - formulaDE(p - vec3(0,h,0));
  float gz = formulaDE(p + vec3(0,0,h)) - formulaDE(p - vec3(0,0,h));
  float len = length(vec3(gx, gy, gz));
  if (len < 1e-12) return vec3(0.0, 1.0, 0.0);
  return vec3(gx, gy, gz) / len;
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 pd = texelFetch(uPositions, coord, 0);
  vec3 pos = pd.xyz;

  if (pd.w < 0.5) {
    outPosition = vec4(pos, 0.0);
    outNormal = vec4(0.0, 1.0, 0.0, 0.0);
    return;
  }

  vec3 orig = pos;
  float prevAbsD = 1e10;
  float maxDist = uVoxelSize * 2.0;

  for (int i = 0; i < 8; i++) {
    if (i >= uNewtonSteps) break;
    float d = formulaDE(pos);
    float absD = abs(d);
    if (absD < 1e-7) break;
    if (absD > prevAbsD * 1.5) break;
    prevAbsD = absD;

    vec3 g = sdfGradient(pos);
    vec3 newPos = pos - d * g;
    if (length(newPos - orig) > maxDist) break;
    pos = newPos;
  }

  vec3 n = sdfGradient(pos);
  outPosition = vec4(pos, 1.0);
  outNormal = vec4(n, 0.0);
}`}function Io(e){const t=e.definition,o=e.interlace,n=o?wt(o):null;return`#version 300 es
// GMT mesh-color ${Date.now()}
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int uIters;
uniform int uWidth;
uniform vec3 uJitterOffset;
${nt}
${o?St():""}
out vec4 fragColor;

${yt}

${t.shader.preamble||""}
${(n==null?void 0:n.preamble)||""}

// --- Formula function ---
${t.shader.function}
${(n==null?void 0:n.func)||""}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 pd = texelFetch(uPositions, coord, 0);
  vec3 pos = pd.xyz + uJitterOffset;
  if (pd.w < 0.5) { fragColor = vec4(0.5, 0.5, 0.5, 1.0); return; }

${Ct(t,"uIters",o)}

  float t = log(max(1e-5, trap)) * -0.3;
  t = fract(t * 1.5 + 0.1);
  vec3 c1 = vec3(0.02, 0.01, 0.08);
  vec3 c2 = vec3(0.8, 0.2, 0.05);
  vec3 c3 = vec3(1.0, 0.85, 0.4);
  vec3 c4 = vec3(0.95, 0.95, 1.0);
  vec3 col;
  if (t < 0.33) col = mix(c1, c2, t / 0.33);
  else if (t < 0.66) col = mix(c2, c3, (t - 0.33) / 0.33);
  else col = mix(c3, c4, (t - 0.66) / 0.34);
  col = pow(col, vec3(0.8));
  fragColor = vec4(col, 1.0);
}`}function xn(e){const t=e.definition,o=Eo(e),n=e.interlace,s=n?wt(n):null,i=Po(t),a=o==="ifs"?"0.0":"0.001",r=Ao(o,!!t.shader.getDist,a,e.estimator);return`#version 300 es
// GMT mesh-preview ${Date.now()}
precision highp float;
uniform float uPower;
uniform int   uIters;
uniform vec2  uResolution;
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform vec3  uCamRight;
uniform float uFov;
uniform float uFudgeFactor;
uniform float uDetail;
uniform float uPixelThreshold;
uniform float uClipBounds;
uniform vec3  uBoundsMin;
uniform vec3  uBoundsMax;
${nt}
${n?St():""}
out vec4 fragColor;

${yt}

${t.shader.preamble||""}
${(s==null?void 0:s.preamble)||""}

${t.shader.function}
${(s==null?void 0:s.func)||""}

${i}
float formulaDE(vec3 pos, float power, int iters) {
${Ct(t,"iters",n)}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${r}
}

float DE(vec3 p) { return formulaDE(p, uPower, uIters); }

vec3 calcNormal(vec3 p) {
  float h = 0.0005;
  return normalize(vec3(
    DE(p+vec3(h,0,0))-DE(p-vec3(h,0,0)),
    DE(p+vec3(0,h,0))-DE(p-vec3(0,h,0)),
    DE(p+vec3(0,0,h))-DE(p-vec3(0,0,h))
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec3 fwd = normalize(uCamTarget - uCamPos);
  vec3 right = uCamRight;
  vec3 up = cross(right, fwd);
  // Orthographic: parallel rays, offset origin
  vec3 ro = uCamPos + right * uv.x * uFov + up * uv.y * uFov;
  vec3 rd = fwd;

  // Quality-aware raymarching
  float fudge = uFudgeFactor;
  float hitThreshold = 0.0002 * uPixelThreshold / max(uDetail, 0.1);

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 400; i++) {
    float d = DE(ro + rd * t);
    if (d < hitThreshold) { hit = true; break; }
    t += max(d, 1e-6) * fudge;
    if (t > 20.0) break;
  }

  if (!hit) {
    fragColor = vec4(0.06, 0.06, 0.06, 1.0);
    return;
  }

  vec3 p = ro + rd * t;

  // Clip outside bounding box when enabled
  if (uClipBounds > 0.5) {
    if (any(lessThan(p, uBoundsMin)) || any(greaterThan(p, uBoundsMax))) {
      fragColor = vec4(0.06, 0.06, 0.06, 1.0);
      return;
    }
  }

  vec3 n = calcNormal(p);
  vec3 light = normalize(vec3(0.6, 0.8, -0.5));
  float diff = max(dot(n, light), 0.0);
  float amb = 0.15;
  float ao = 1.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i) * 0.04;
    ao -= (fi - DE(p + n * fi)) * (1.0 / pow(2.0, float(i)));
  }
  ao = clamp(ao, 0.0, 1.0);
  vec3 col = vec3(0.7, 0.75, 0.8) * (amb + diff * 0.85) * ao;
  col = pow(col, vec3(0.45));
  fragColor = vec4(col, 1.0);
}`}const Ye=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF","uVec2A","uVec2B","uVec2C","uVec3A","uVec3B","uVec3C","uVec4A","uVec4B","uVec4C","uJulia","uJuliaMode","uEscapeThresh","uDistanceMetric",...tt.scalars,...tt.vec2s,...tt.vec3s,...tt.vec4s,"uInterlaceEnabled","uInterlaceInterval","uInterlaceStartIter","uFudgeFactor","uDetail","uPixelThreshold","uSurfaceThreshold","uClipBounds","uBoundsMin","uBoundsMax"];rn();const Ro=[{name:me.Time,type:"float",default:0},{name:me.FrameCount,type:"int",default:0},{name:me.Resolution,type:"vec2",default:new Be(100,100)},{name:me.SceneOffsetHigh,type:"vec3",default:new Ne},{name:me.SceneOffsetLow,type:"vec3",default:new Ne},{name:me.CameraPosition,type:"vec3",default:new Ne},{name:me.CamBasisX,type:"vec3",default:new Ne},{name:me.CamBasisY,type:"vec3",default:new Ne},{name:me.CamForward,type:"vec3",default:new Ne},{name:me.RegionMin,type:"vec2",default:new Be(0,0)},{name:me.RegionMax,type:"vec2",default:new Be(1,1)},{name:me.ImageTileOrigin,type:"vec2",default:new Be(0,0)},{name:me.ImageTileSize,type:"vec2",default:new Be(1,1)},{name:me.FullOutputResolution,type:"vec2",default:new Be(100,100)},{name:me.TilePixelOrigin,type:"vec2",default:new Be(0,0)},{name:me.HistoryTexture,type:"sampler2D",default:null},{name:me.BlendFactor,type:"float",default:1},{name:me.Jitter,type:"vec2",default:new Be(0,0)},{name:me.BlueNoiseTexture,type:"sampler2D",default:null},{name:me.BlueNoiseResolution,type:"vec2",default:new Be(128,128)},{name:me.HistogramLayer,type:"int",default:0},{name:me.InternalScale,type:"float",default:1},{name:me.PixelSizeBase,type:"float",default:.01,comment:"CPU: length(uCamBasisY)/resolution.y*2, avoids per-fragment sqrt"},{name:me.OutputPass,type:"float",default:0,comment:"0=beauty, 1=alpha, 2=depth"},{name:me.DepthMin,type:"float",default:0},{name:me.DepthMax,type:"float",default:5},{name:me.PreRotMatrix,type:"mat3",default:new Lt},{name:me.PostRotMatrix,type:"mat3",default:new Lt},{name:me.WorldRotMatrix,type:"mat3",default:new Lt},{name:me.EnvRotationMatrix,type:"mat2",default:[1,0,0,1]},{name:me.FogColorLinear,type:"vec3",default:new Ne(0,0,0),comment:"CPU: InverseACESFilm(uFogColor)"}],bn=yo.getUniformDefinitions(),gn=new Set(Ro.map(e=>e.name)),yn=bn.filter(e=>!gn.has(e.name)),Do=[...Ro,...yn];Do.reduce((e,t)=>(e[t.name]=t.default,e),{});const Sn=()=>{let e=`precision highp float;
precision highp int;

`;return Do.forEach(t=>{t.backingOnly||(t.arraySize?e+=`uniform ${t.type} ${t.name}[${t.arraySize}];
`:e+=`uniform ${t.type} ${t.name};
`)}),e+=`
in vec2 vUv;
`,e},wn=Sn(),oo=(e,t="",o,n="",s="",i="",a="",r="",l="",m="",v="",d="",f="")=>{const x=i.includes("skipMainFormula");return`
${o}

// --- CORE ESTIMATOR (Coloring & Geometry) ---
// Returns: vec4(distance, trap_distance, iteration_count, decomposition_angle)
vec4 map(vec3 p) {
    // 1. Apply Precision Offset
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);

    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    g_geomTrap = 1e10;

    float iter = 0.0;
    float smoothIter = 0.0;

    float decomp = 0.0;
    float lastLength = 0.0;
    bool decompCaptured = false;

    // Color iteration limit: snapshot coloring state at boundary (branchless)
    vec4 savedOrbitTrap = vec4(1e10);
    float savedTrap = 1e10;
    float savedGeomTrap = 1e10;
    float savedIter = 0.0;

    ${a}
    ${t}
    ${s}

    bool escaped = false;
    // Bailout must exceed escape threshold so coloring captures the last pre-escape state.
    // +100 buffer prevents premature bailout on slowly-escaping orbits.
    float bailout = max(100.0, uEscapeThresh + 100.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${x?"bool skipMainFormula = false;":""}

        ${i}

        ${x?"if (!skipMainFormula) {":"// --- Main Formula ---"}
            applyPreRotation(z.xyz);

            float r2_check = dot(z.xyz, z.xyz);

            if (!decompCaptured && r2_check > uEscapeThresh) {
                decomp = atan(z.y, z.x) * INV_TAU + 0.5;
                lastLength = sqrt(r2_check);
                decompCaptured = true;
            }

            // --- OPTIMIZATION: EARLY BAILOUT ---
            // Check if point has escaped BEFORE running expensive math (pow/sin/cos).
            // Some formulas (JuliaMorph) opt-out of this via define.
            #ifndef SKIP_PRE_BAILOUT
            if (r2_check > bailout) {
                escaped = true;
                break;
            }
            #endif

            ${e}

            applyPostRotation(z.xyz);
        ${x?"}":""}

        // Count completed iterations. After uIterations runs iter == uIterations,
        // which matches Fragmentarium's n counter used in explicit getDist expressions.
        iter += 1.0;

        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));

        // Branchless color iteration snapshot: keep updating until iter exceeds limit
        float colorGate = step(iter, uColorIter);  // 1.0 while iter <= uColorIter, 0.0 after
        savedOrbitTrap = mix(savedOrbitTrap, g_orbitTrap, colorGate);
        savedTrap = mix(savedTrap, trap, colorGate);
        savedGeomTrap = mix(savedGeomTrap, g_geomTrap, colorGate);
        savedIter = mix(savedIter, iter, colorGate);

        if (!decompCaptured && r2 > uEscapeThresh) {
            decomp = atan(z.y, z.x) * INV_TAU + 0.5;
            lastLength = sqrt(r2);
            decompCaptured = true;
        }

        if (dr > 1.0e10 || r2 > bailout) {
            escaped = true;
            break;
        }

        ${r}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    if (!decompCaptured) {
        decomp = atan(z.y, z.x) * INV_TAU + 0.5;
        lastLength = r;
    }

    vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;
    smoothIter = distRes.y;

    ${m}

    // Restore saved coloring state if color iteration limit was active
    // When uColorIter > 0, use the frozen snapshot; otherwise keep full-iteration values
    float useColorSnap = step(0.5, uColorIter);
    g_orbitTrap = mix(g_orbitTrap, savedOrbitTrap, useColorSnap);
    trap = mix(trap, savedTrap, useColorSnap);
    g_geomTrap = mix(g_geomTrap, savedGeomTrap, useColorSnap);

    // Color mode 8 = LLI (Last Length Iteration) decomposition — needs lastLength from escape check
    bool useLLI = (abs(uColorMode - 8.0) < 0.1) || (abs(uColorMode2 - 8.0) < 0.1);
    if (uUseTexture > 0.5) {
        if (abs(uTextureModeU - 8.0) < 0.1) useLLI = true;
        if (abs(uTextureModeV - 8.0) < 0.1) useLLI = true;
    }
    float outTrap = useLLI ? lastLength : trap;

    // --- FEATURE INJECTION: POST-MAP (accumulative) ---
    // Variables in scope: p_fractal, finalD, decomp, smoothIter, outTrap
    ${d}

    // When color iteration limit is active, use capped iter for normalized coloring value
    float colorIterNorm = mix(smoothIter / max(1.0, uIterations), savedIter / max(1.0, uColorIter), useColorSnap);
    return vec4(finalD, outTrap, colorIterNorm, decomp);
}

// --- OPTIMIZED GEOMETRY-ONLY ESTIMATOR ---
// Strips out all Orbit Trap, Coloring, Decomposition, and Smoothing logic.
// Used for Shadows, AO, and Normals.
float mapDist(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
    
    float dr = 1.0;
    // We still need 'trap' for formula signatures, but the compiler will DCE it since we don't return it.
    float trap = 1e10;
    g_geomTrap = 1e10;

    // Add missing iter definition for compatibility with loopInit chunks that might expect it
    float iter = 0.0;

    ${a}
    ${t}
    ${s}

    float bailout = max(100.0, uEscapeThresh + 100.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${x?"bool skipMainFormula = false;":""}

        ${i}

        ${x?"if (!skipMainFormula) {":"// --- Main Formula ---"}
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) break;
            #endif

            ${e}

            applyPostRotation(z.xyz);
        ${x?"}":""}

        // Track completed iterations so getDist expressions that use iter
        // (e.g. r * pow(Scale, -iter)) receive the correct count for shadow marching.
        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) break;

        ${l}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;

    ${v}

    // --- FEATURE INJECTION: POST-DIST (accumulative) ---
    ${f}

    return finalD;
}

// Wrapper for Coloring
vec4 DE(vec3 p_ray) {
    return map(p_ray + uCameraPosition);
}

// Wrapper for Geometry (Shadows/AO/Normals)
float DE_Dist(vec3 p_ray) {
    return mapDist(p_ray + uCameraPosition);
}`},Cn=(e="")=>`
// ------------------------------------------------------------------
// SHARED SURFACE EVALUATION
// ------------------------------------------------------------------

vec3 GetNormal(vec3 p_ray, float eps) {
    // High Quality: Tetrahedron Normal (4 taps)
    // OPTIMIZATION: Use DE_Dist
    vec2 k = vec2(1.0, -1.0);
    vec3 n = k.xyy * DE_Dist(p_ray + k.xyy * eps) + 
             k.yyx * DE_Dist(p_ray + k.yyx * eps) + 
             k.yxy * DE_Dist(p_ray + k.yxy * eps) + 
             k.xxx * DE_Dist(p_ray + k.xxx * eps);
    
    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    
    return normalize(n);
}

vec3 GetFastNormal(vec3 p, float eps) {
    // Low Quality: Forward Difference (3 taps)
    // Optimization: Uses DE_Dist
    // We assume distance at p is ~0.0 (Surface)
    vec2 e = vec2(eps, 0.0);
    
    float dx = DE_Dist(p + e.xyy);
    float dy = DE_Dist(p + e.yxy);
    float dz = DE_Dist(p + e.yyx);
    
    vec3 n = vec3(dx, dy, dz);
    
    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    
    return normalize(n);
}

// Evaluate surface properties (Albedo, Normal, Roughness, Emission)
// Used by both Direct Lighting and Path Tracer
void getSurfaceMaterial(vec3 p_ray_in, vec3 p_fractal_in, vec4 result, float d, out vec3 albedo, out vec3 n, out vec3 emission, out float roughness, bool highQuality) {
    // Initialize outputs to satisfy strict compilers (X4000)
    albedo = vec3(0.0);
    n = vec3(0.0, 1.0, 0.0);
    emission = vec3(0.0);
    roughness = 0.5;

    float distFromFractalOrigin = length(p_fractal_in);
    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    
    // Matches trace.ts precision floor — PRECISION_RATIO_HIGH of distance from fractal origin
    float floatLimit = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
    
    float orthoPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * d;
    float visualLimit = orthoPixelFootprint * (1.0 / uDetail);
    
    float eps = max(floatLimit, visualLimit);

    // Alias inputs (No Retreat/Modification)
    vec3 p_ray = p_ray_in;
    vec3 p_fractal = p_fractal_in;
    
    // --- ADAPTIVE NORMAL ESTIMATION ---
    
    if (highQuality) {
        n = GetNormal(p_ray, eps);
    } else {
        // Boost epsilon slightly for fast normals to avoid noise
        // FIX: Removed invalid 'd' argument. FastNormal calculates relative to 0.0 surface.
        n = GetFastNormal(p_ray, eps * 1.5);
    }
    
    // --- Layer 3: Procedural Noise & Bump Mapping ---
    // Calculate if needed for Surface OR Emission (Mode 3)
    float noiseVal = 0.0;
    vec3 noiseP = p_fractal * uLayer3Scale;
    bool useL3 = (uLayer3Strength > 0.0 || abs(uLayer3Bump) > 0.0 || abs(uEmissionMode - 3.0) < 0.1);
    
    if (useL3) {
        noiseVal = getLayer3Noise(noiseP);
        
        if (abs(uLayer3Bump) > 0.001) {
            vec2 e = vec2(0.01, 0.0);  // Fixed-size finite difference step for bump gradient (world-space units)
            float nx = getLayer3Noise(noiseP + e.xyy) - noiseVal;
            float ny = getLayer3Noise(noiseP + e.yxy) - noiseVal;
            float nz = getLayer3Noise(noiseP + e.yyx) - noiseVal;
            vec3 grad = vec3(nx, ny, nz);
            
            // Only apply detailed bump mapping on high quality rays (primary hit)
            // Skip bump on bounces to save perf and reduce shimmering
            if (highQuality) {
                n = normalize(n - grad * uLayer3Bump * 10.0);  // 10x amplification to make bump visually significant at world scale
            }
        }
    }

    // --- Coloring Calculation ---
    vec3 col1 = vec3(0.0);
    
    // Layer 1 (Always calculated as base)
    if (uUseTexture > 0.5) {
        col1 = getTextureColor(p_fractal, n, result);
    } else {
        float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
        float twistAngle = 0.0;
        if (abs(uColorTwist) > 0.001) {
            twistAngle = atan(p_fractal.y, p_fractal.x) * INV_TAU;
        }
        float t1Raw = val1 * uColorScale + uColorOffset + (distFromFractalOrigin + twistAngle) * uColorTwist;
        float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
        col1 = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }

    // Layer 2
    // Calculate if needed for Surface Blending OR Emission (Mode 2)
    vec3 col2 = vec3(0.0);
    bool useL2 = (uBlendOpacity > 0.01 || uBlendMode > 5.5 || abs(uEmissionMode - 2.0) < 0.1);

    if (useL2) { 
        float val2 = getMappingValue(uColorMode2, p_fractal, result, n, uColorScale2);
        
        float twistAngle2 = 0.0;
        if (abs(uColorTwist2) > 0.001) {
            twistAngle2 = atan(p_fractal.y, p_fractal.x) * INV_TAU;
        }
        
        float t2Raw = val2 * uColorScale2 + uColorOffset2 + (distFromFractalOrigin + twistAngle2) * uColorTwist2;
        float t2 = pow(abs(fract(mod(t2Raw, 1.0))), uGradientBias2);
        
        col2 = textureLod0(uGradientTexture2, vec2(t2, 0.5)).rgb;
    }

    // --- Compose Albedo ---
    albedo = col1;

    // Apply Layer 2 Blend (Only if opacity > 0 or Bump mode)
    if (uBlendOpacity > 0.01 || uBlendMode > 5.5) {
        if (uBlendMode > 5.5) {
             vec3 bumpVec = (col2 - 0.5) * 2.0;
             // Apply layer blend bump
             if (highQuality) {
                n = normalize(n + bumpVec * uBlendOpacity);
             }
        } else {
             albedo = blendColors(albedo, col2, uBlendOpacity, uBlendMode);
        }
    }
    
    // Apply Layer 3 Blend (Only if strength > 0)
    if (uLayer3Strength > 0.001) {
        float n01 = noiseVal * 0.5 + 0.5;
        albedo = mix(albedo, uLayer3Color, n01 * uLayer3Strength);
    }
    
    // --- FEATURE INJECTION: MATERIAL PROPERTIES ---
    // Inject Emission, Roughness, and other surface logic here.
    // Features use builder.addMaterialLogic() to inject code at this point.
    // Variables in scope: albedo, n, emission, roughness, p_fractal, result
    ${e}
}`,Mn=(e,t,o="")=>`
// ------------------------------------------------------------------
// MAIN RENDER LOOP
// ------------------------------------------------------------------

// Output Layout for GLSL 3.00 ES - single color output
layout(location = 0) out vec4 pc_fragColor;

// Safety to prevent NaNs/Infs from poisoning the accumulation buffer.
// Clamp to 200.0 (not 1.0) to preserve HDR range for tone mapping — fireflies above this are clamped.
vec3 sanitizeColor(vec3 col) {
    return min(max(col, vec3(0.0)), vec3(200.0));
}

vec3 renderPixel(vec2 uvCoord, float seedOffset, out float outDepth) {
    vec3 ro = vec3(0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float stochasticSeed = 0.0;
    vec3 roClean, rdClean;

    getCameraRay(uvCoord, ro, rd, stochasticSeed, roClean, rdClean);

    // Background Logic (Direct Mode Miss)
    vec3 bgCol = vec3(0.0);
    vec3 safeFog = uFogColorLinear;

    if (uEnvBackgroundStrength > 0.001) {
        vec3 env = GetEnvMap(rd, 0.0) * uEnvBackgroundStrength;
        bgCol = mix(env, safeFog, clamp(uFogIntensity, 0.0, 1.0));
    } else {
        bgCol = mix(safeFog + vec3(0.01), safeFog, abs(rd.y));
    }

    vec3 col = bgCol;
    float d = 0.0;
    vec4 result = vec4(0.0);

    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;

    // Primary Ray Trace
    bool hit = traceScene(ro, rd, d, result, glow, stochasticSeed, volumetric, fogScatter);

    ${`
        if (hit) {
            ${e?"col = calculatePathTracedColor(ro, rd, d, result, stochasticSeed);":"col = calculateShading(ro, rd, d, result, stochasticSeed);"}
        } else {
            if (d < 0.001) d = MISS_DIST;
        }

        // --- FEATURE INJECTION: POST-INTEGRATOR COMPOSITING ---
        ${o}
    `}

    col = applyPostProcessing(col, d, glow, volumetric, fogScatter);
    // Project hit point onto clean (un-jittered) ray for stable depth readback
    // When DoF is off, roClean==ro and rdClean==rd so this equals d
    outDepth = dot(ro + rd * d - roClean, rdClean);
    return col;
}

void main() {
    vec4 history = texture(uHistoryTexture, vUv); // texture() in GLSL 3

    // --- Region Check ---
    if (vUv.x < uRegionMin.x || vUv.y < uRegionMin.y || vUv.x > uRegionMax.x || vUv.y > uRegionMax.y) {
        pc_fragColor = history;
        return;
    }

    // --- Normal rendering for all pixels ---
    float depth;
    vec3 col = renderPixel(vUv, 0.0, depth);
    col = sanitizeColor(col);
    vec3 safeHistory = history.rgb;

    vec3 finalCol = mix(safeHistory, col, uBlendFactor);

    // Alpha channel write:
    //   Beauty / depth passes store the projected depth (physics probe reads this every frame,
    //   and the depth post-process branch normalizes it).
    //   Alpha pass stores per-sample binary coverage (1.0 for a surface hit, 0.0 for sky).
    //   Accumulating that binary signal across the Halton-jittered sub-pixel samples averages
    //   out to fractional coverage — i.e. properly anti-aliased edges in the final mask, for
    //   free from the existing TAA pipeline.
    //
    //   Hit threshold is MISS_DIST minus a safety margin: depth is a projection of d along the
    //   un-jittered ray, so DoF jitter can push genuine hits slightly past MISS_DIST. The
    //   margin absorbs that without flipping real hits to "sky".
    float alphaOut = (uOutputPass > 0.5 && uOutputPass < 1.5)
        ? step(depth, MISS_DIST - 100.0)
        : depth;
    pc_fragColor = vec4(finalCol, alphaOut);
}
`,no=e=>`
// ------------------------------------------------------------------
// STAGE 1: RAY GENERATION
// Handles Camera Basis and Depth of Field
// ------------------------------------------------------------------
void getCameraRay(vec2 uvCoord, out vec3 ro, out vec3 rd, out float stochasticSeed, out vec3 roClean, out vec3 rdClean) {
    // IMAGE-TILE UV REMAP: map the fullscreen quad's UV (0..1 across this render surface)
    // into the full-output image's UV space. Default uImageTileOrigin=(0,0), uImageTileSize=(1,1)
    // makes this a no-op (uvFull == uvCoord). During tiled bucket export, each tile sets
    // origin/size to its slice so primary rays cover the correct sub-frame of the full image
    // while the camera basis stays configured for the full-output aspect.
    vec2 uvFull = uImageTileOrigin + uvCoord * uImageTileSize;
    vec2 uv = uvFull * 2.0 - 1.0;

    // Store original UV for stable noise lookup (before jitter)
    vec2 uvOriginal = uv;

    // --- TAA JITTER (Calculated on CPU) ---
    // Jitter behavior:
    // - During navigation (blendFactor >= 0.99): NO jitter (stable view)
    // - During accumulation (blendFactor < 0.99): Jitter applied for TAA anti-aliasing
    // isMoving = true means camera is moving (navigation), false means accumulating
    bool isMoving = uBlendFactor >= 0.99;
    if (!isMoving && uResolution.x > 0.5) {
        // Jitter magnitude = 1 render-surface pixel in NDC, then scaled to full-output NDC
        // by uImageTileSize so it corresponds to 1 output pixel regardless of tiling.
        vec2 pixelSize = 2.0 / uResolution * uImageTileSize;
        uv += uJitter * pixelSize * 0.5;
    }

    stochasticSeed = 0.5; // Default safe value
    
    // Cache blending factor locally to help compiler optimization
    float blendFactor = uBlendFactor;
    
    // --- STOCHASTIC SEED GENERATION ---
    bool needNoise = false;
    
    ${e==="PathTracing"?"needNoise = true;":`
        // Always apply DOF noise for blur preview - even during navigation
        if (uDOFStrength > 0.00001) needNoise = true;
        if (!isMoving) needNoise = true;  // Other effects need noise when stationary
        if (uAreaLights > 0.5) needNoise = true;
        `}
    
    // Use Blue Noise Red Channel as base seed
    // Use stable noise during navigation, animated during accumulation for better convergence
    if (needNoise) {
        vec2 noiseCoord = uvOriginal * 0.5 + 0.5; // Convert from NDC [-1,1] to [0,1] (full-output UV)
        // Use full-output resolution so the blue-noise LUT sampling is continuous across image tiles.
        // In single-image mode uFullOutputResolution == uResolution, so behavior is unchanged.
        vec2 noisePixel = noiseCoord * uFullOutputResolution;
        stochasticSeed = isMoving ? getStableBlueNoise4(noisePixel).r
                                 : getBlueNoise4(noisePixel).r;
    }
    
    vec3 forward = uCamForward;
    vec3 right = uCamBasisX;
    vec3 up = uCamBasisY;
    
    // --- PROJECTION SWITCH ---
    if (uCamType > 1.5) {
        // EQUIRECTANGULAR (360 SKYBOX)
        float lambda = uv.x * PI;
        float phi = uv.y * 1.5707963268;
        float cPhi = cos(phi);
        vec3 localRd = vec3(
            sin(lambda) * cPhi,
            sin(phi),
            -cos(lambda) * cPhi
        );
        vec3 r = normalize(right);
        vec3 u = normalize(up);
        vec3 f = normalize(forward);
        mat3 rot = mat3(r, u, -f);
        rd = r * localRd.x + u * localRd.y + f * -localRd.z;
        ro = vec3(0.0);
        // Fallthrough to DOF logic allowed
    } else if (uCamType > 0.5) {
        // ORTHOGRAPHIC
        rd = normalize(forward);
        ro = uv.x * right + uv.y * up;
    } else {
        // PERSPECTIVE
        rd = normalize(forward + uv.x * right + uv.y * up);
        ro = vec3(0.0);
    }

    // Save clean ray before DoF jitter — used for stable depth readback
    roClean = ro;
    rdClean = rd;

    // --- DEPTH OF FIELD ---
    // DOF noise behavior:
    // - During navigation (isMoving): Stable per-pixel noise for blur preview
    // - During accumulation: Animated noise for Monte Carlo convergence
    if (uDOFStrength > 0.00001) {
        vec3 focalPoint = ro + rd * uDOFFocus;
        
        // Use stable blue noise during navigation, animated during accumulation
        vec2 noiseCoord = uvOriginal * 0.5 + 0.5; // Convert from NDC [-1,1] to [0,1] (full-output UV)
        vec2 noisePixel = noiseCoord * uFullOutputResolution;
        vec4 blue = isMoving ? getStableBlueNoise4(noisePixel)
                             : getBlueNoise4(noisePixel);
        
        float r = sqrt(blue.r);
        float theta = blue.g * TAU;

        // Polygonal Bokeh Shape (Hexagon)
        float blades = 6.0;
        float segment = TAU / blades;
        float localTheta = mod(theta, segment) - (segment * 0.5);
        float polyRadius = cos(PI / blades) / cos(localTheta);
        r *= polyRadius;
        
        theta += 0.26; // Rotation offset
        
        vec2 offset = vec2(cos(theta), sin(theta)) * r * uDOFStrength;
        offset.y *= 1.3; // Anamorphic squash
        
        vec3 lensOffset = normalize(right) * offset.x + normalize(up) * offset.y; 
        ro += lensOffset;
        
        // Recalculate ray direction to converge at focal point
        // Works for both Perspective and Orthographic (Tilt-Shift effect)
        rd = normalize(focalPoint - ro);
    }
}
`,Bt=(e,t,o=0,n=0,s="",i="",a="traceScene")=>{const l=o===1||e?`
        float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);  // Low precision: ~10 ppm
    `:`
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);  // High precision: ~0.5 ppm
    `,m=i.trim().length>0?`vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = MISS_DIST;
    vec3 p = p_end;
    ${i}`:"h = vec4(MISS_DIST, 0.0, 0.0, 0.0);";return`
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool ${a}(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric, out vec3 fogScatter) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) { fogScatter = vec3(0.0); return false; }

    d = max(0.0, bounds.x);

    // 2. Flattened Accumulators
    vec3 accColor = vec3(0.0);
    vec3 accScatter = vec3(0.0); // Volumetric scatter (god rays) accumulator
    float accDensity = 0.0;
    float accAlpha = 0.0; // Scalar glow accumulator for Fast Mode
    
    // 3. Loop Config
    int limit = int(uMaxSteps);
    float maxMarch = MAX_DIST;
    
    // Temporary Hit holder (distance, trap, iter, decomp)
    vec4 h = vec4(0.0);

    // --- CANDIDATE TRACKING (Overstep Recovery) ---
    // Tracks the closest the ray ever got to a surface, normalized by the required precision at that depth.
    float minCandidateRatio = 1.0e10; 
    float candidateD = -1.0;

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        
        // A. Distance Estimation (Raw vec4 return)
        // Note: map() now adds uCameraPosition internally
        h = map(p + uCameraPosition);
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${s}
        
        // C. Precision
        vec3 p_fractal_approx = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        float distFromFractalOrigin = length(p_fractal_approx);
        
        ${l}
        
        // Dynamic Epsilon (Cone Tracing). uPixelSizeBase is viewport-pixel size
        // (invariant to adaptive downscale — see UniformManager.syncFrame). The
        // uDetail / uInternalScale factor also cancels DPR from the threshold, so
        // uPixelThreshold means "fraction of a viewport pixel" across all scales.
        // Ortho: parallel rays → pixel footprint is constant.
        // Perspective/360: cone widens with distance → scale by d.
        float effectiveDetail = uDetail / uInternalScale;
        float pixelFootprint = (uCamType > 0.5 && uCamType < 1.5)
            ? uPixelSizeBase
            : uPixelSizeBase * d;
        float threshold = pixelFootprint * (uPixelThreshold / effectiveDetail);
        float finalEps = max(threshold, floatPrecision);
        
        // D. Hit Detection
        if (h.x < finalEps) {
            
            // --- SURFACE REFINEMENT (Edge Polish) ---
            // If enabled, take a few extra tiny steps to settle exactly on the surface.
            // Helps significantly when uFudgeFactor is low but step count limited.
            int refine = uRefinementSteps;
            if (refine > 0) {
                float refineStep = h.x; 
                // We use a safe fraction to converge without overshooting
                float convergeFactor = uFudgeFactor * 0.8;  // 80% of fudge factor — conservative to prevent overshooting surface
                
                for(int j=0; j<5; j++) {
                    if (j >= refine) break;
                    d += refineStep * convergeFactor;
                    vec3 p_ref = ro + rd * d;
                    vec4 h_ref = map(p_ref + uCameraPosition);
                    
                    // If we went inside (negative or very small), or improvement is negligible, stop
                    if (h_ref.x < floatPrecision * 0.1) break;
                    
                    h = h_ref;
                    refineStep = h.x;
                }
            }

            // Apply Final Volumetric Resolve (Inlined)
            vec3 p_final = ro + rd * d; 
            vec3 p = p_final; // Alias for volumeFinalizeCode
            ${i}
            
            // Output
            glow = accColor;
            fogScatter = accScatter;
            volumetric = accDensity;
            result = h; // h.x is dist, h.yzw is trap data
            return true;
        }

        // E. Candidate Tracking
        if (uOverstepTolerance > 0.0) {
            float ratio = h.x / finalEps;
            // Capture the 'closest miss'
            if (ratio < minCandidateRatio) {
                minCandidateRatio = ratio;
                candidateD = d;
            }
        }
        
        // F. Step Advance (Dynamic Step Relaxation)
        // Interpolate between uFudgeFactor and 1.0 based on distance-to-surface ratio.
        // When uStepRelaxation == 0, relax * 0 == 0 so mix returns uFudgeFactor (no-op).
        float safeZone = h.x / (finalEps * 10.0);
        float relax = smoothstep(0.0, 1.0, safeZone);
        float currentFudge = mix(uFudgeFactor, 1.0, relax * uStepRelaxation);

        // Stochastic step jitter: break up deterministic DE banding.
        // Asymmetric [1-jitter, 1.0] — biased short to avoid overshoot.
        // uStepJitter=0 disables (stepJitter=1.0). uStepJitter=0.15 is default.
        // Disabled during navigation for a clean image — banding
        // averages away once accumulation starts.
        // Stochastic step jitter — coprime hash constants (127.1, 31.7) prevent banding artifacts
        float stepJitter = uBlendFactor >= 0.99 ? 1.0 : (1.0 - uStepJitter) + uStepJitter * fract(stochasticSeed * 127.1 + d * 31.7);
        d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;

        if (d > maxMarch) break;
    }
    
    // --- RECOVERY CHECK ---
    // If we missed, but we tracked a candidate that was within 'uOverstepTolerance' multiples of the threshold,
    // we assume we tunneled through a detailed surface and snap back to it.
    if (uOverstepTolerance > 0.0 && candidateD > 0.0) {
        // Example: If tolerance is 2.0, we accept misses that were within 2x the epsilon.
        // E.g. We missed with ratio 1.5, which is < 1.0 (hit) + 2.0 (tol).
        if (minCandidateRatio <= (1.0 + uOverstepTolerance)) {
             d = candidateD;
             // Re-evaluate map at the candidate position to get correct Trap/Color data
             // We can't trust 'h' because it's from the last missed step at infinity
             vec3 p_cand = ro + rd * d;
             result = map(p_cand + uCameraPosition);
             result.x = 0.0; // Force hit
             
             // Finalize volume for the recovered path? 
             // Strictly speaking we should, but for visual consistency we use the accumulated values.
             
             vec3 p = p_cand; // Alias for injected code which expects 'p'
             
             ${i}
             glow = accColor;
             fogScatter = accScatter;
             volumetric = accDensity;
             return true;
        }
    }

    // MISS: Resolve volume at infinity
    ${m}

    glow = accColor;
    fogScatter = accScatter;
    volumetric = accDensity;

    return false;
}
`},ct=`
// ------------------------------------------------------------------
// COLORING & PATTERN GENERATION
// ------------------------------------------------------------------

// Forward Declaration for Linkage
vec3 getGlowColor(vec3 p_fractal, vec4 result);
float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale);

// The 'getMappingValue' function is now injected dynamically by ColoringFeature.
// See features/coloring/MappingModes.ts for logic.

// Blend modes: 0=Mix, 1=Add, 2=Multiply, 3=Overlay, 4+=Screen
vec3 blendColors(vec3 c1, vec3 c2, float opacity, float mode) {
    vec3 col = c1;

    switch(int(mode + 0.1)) {
    case 0: // Mix
        col = mix(c1, c2, opacity);
        break;
    case 1: // Add
        col = c1 + c2 * opacity;
        break;
    case 2: // Multiply
        col = c1 * mix(vec3(1.0), c2, opacity);
        break;
    case 3: { // Overlay
        vec3 check = step(0.5, c1);
        vec3 res = mix(2.0 * c1 * c2, 1.0 - 2.0 * (1.0 - c1) * (1.0 - c2), check);
        col = mix(c1, res, opacity);
    } break;
    default: // Screen
        col = 1.0 - (1.0 - c1) * (1.0 - c2 * opacity);
        break;
    }

    return col;
}

#ifdef LAYER3_ENABLED
float getLayer3Noise(vec3 p) {
    float n = 0.0;
    if (uLayer3Turbulence > 0.001) {
        vec3 warp = vec3(
            snoise(p),
            snoise(p + vec3(12.4, 3.2, 1.1)),
            snoise(p + vec3(7.8, 9.2, 4.3))
        );
        n = snoise(p + warp * uLayer3Turbulence);
    } else {
        n = snoise(p);
    }
    return n;
}
#else
float getLayer3Noise(vec3 p) { return 0.0; }
#endif // LAYER3_ENABLED

vec3 getTextureColor(vec3 p, vec3 n, vec4 result) {
    float u = getMappingValue(uTextureModeU, p, result, n, 1.0);
    float v = getMappingValue(uTextureModeV, p, result, n, 1.0);
    vec2 uv = vec2(u, v) * uTextureScale + uTextureOffset;
    
    vec3 col = textureLod0(uTexture, uv).rgb;
    return applyTextureProfile(col, uTextureColorSpace);
}

// Lightweight coloring for volumetric glow
vec3 getGlowColor(vec3 p_fractal, vec4 result) {
    if (uGlowIntensity < 0.0001) return vec3(0.0);
    
    vec3 color = vec3(0.0);
    if (uGlowMode > 0.5) {
        color = uGlowColor;
    } else {
        vec3 n = vec3(0.0, 1.0, 0.0); 
        float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
        float twistAngle = (abs(uColorTwist) > 0.001) ? atan(p_fractal.y, p_fractal.x) * INV_TAU : 0.0;
        
        float t1Raw = val1 * uColorScale + uColorOffset + (length(p_fractal) + twistAngle) * uColorTwist;
        float t1Wrapped = fract(t1Raw);
        if (t1Raw < 0.0) t1Wrapped = 1.0 - t1Wrapped;
        
        float t1 = pow(t1Wrapped, uGradientBias);
        color = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }
    return color;
}
`,Tn=(e="")=>`
// ------------------------------------------------------------------
// POST PROCESSING (LINEAR ONLY)
// All fog, glow, and scatter code is feature-injected via addPostProcessLogic().
// Atmosphere feature: fog (distance + volumetric density) + glow
// Volumetric feature: scatter (god rays)
// ------------------------------------------------------------------
vec3 applyPostProcessing(vec3 col, float d, vec3 glow, float volumetric, vec3 fogScatter) {

    // --- FEATURE INJECTION: POST-PROCESSING ---
    // Variables in scope: col (modifiable), d, glow, volumetric, fogScatter.
    // Uniforms available: uFogNear, uFogFar, uFogIntensity, uFogDensity,
    //   uFogColorLinear, uGlowIntensity, uEnvBackgroundStrength, MISS_DIST.
    ${e}

    // Tone Mapping is handled in the Display Shader
    return col;
}
`,Fn=(e="")=>`
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane)
vec3 applyEnvFog(vec3 env) {
    if (uFogIntensity < 0.001 || uFogFar >= 1000.0) return env;
    float fogFactor = uFogIntensity;
    return mix(env, uFogColorLinear, fogFactor);
}

// Apply distance-based fog to shaded geometry
vec3 applyDistanceFog(vec3 col, float dist) {
    if (uFogIntensity < 0.001 || uFogFar >= 1000.0) return col;
    float fogFactor = smoothstep(uFogNear, uFogFar, dist) * uFogIntensity;
    return mix(col, uFogColorLinear, fogFactor);
}

// Sample environment for a miss ray (reflection/bounce), with fog and feature overrides
vec3 sampleMissEnv(vec3 ro, vec3 rd, float roughness, vec3 throughput) {
    return applyEnvFog(sampleMiss(ro, rd, roughness) * uEnvStrength) * throughput;
}

vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

    vec3 albedo, n, emission;
    float roughness;

    // 1. Primary Surface
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, true);

    vec3 v = normalize(-rd);

    // 2. Direct Light (Primary)
    vec3 directLighting = calculatePBRContribution(p_ray, n, v, albedo, roughness, uReflection, stochasticSeed, true);

    // 3. Ambient Occlusion (Primary)
    float ao = GetAO(p_ray, n, stochasticSeed);

    // 4. Fresnel & Reflection Setup
    vec3 F0 = mix(vec3(0.04), albedo, uReflection);
    float NdotV = max(0.0, dot(n, v));
    // Schlick-Roughness: clamps grazing Fresnel so rough surfaces don't over-reflect
    // (distinct from per-light Schlick in PBR which uses HdotV for specular response)
    vec3 F = F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0);

    // 5. Reflection
    vec3 reflectionLighting = vec3(0.0);
    vec3 ambient = vec3(0.0);

    // Cache un-jittered reflection direction (reused for env fallback)
    vec3 reflDir = reflect(-v, n);

    // --- FEATURE INJECTION: REFLECTION EVALUATION ---
    // Variables in scope: p_ray, p_fractal, v, n, albedo, roughness, F, NdotV,
    //   reflDir, reflectionLighting (output), stochasticSeed, d, uReflection, uSpecular
    // Functions available: GetEnvMap, applyEnvFog, sampleMissEnv, getSurfaceMaterial,
    //   calculatePBRContribution, getBlueNoise4, traceReflectionRay (if injected)
    ${e||`
        // --- REFLECTIONS OFF (default) ---
        vec3 envColor = GetEnvMap(reflDir, roughness) * uEnvStrength;
        reflectionLighting = envColor * F * uSpecular;
    `}

    // 6. Rim
    float fresnelTerm = pow(1.0 - NdotV, uRimExponent);
    vec3 rimColor = uRimColor * fresnelTerm * uRim;

    // 7. Ambient IBL
    if (uEnvStrength > 0.001) {
        vec3 envIrradiance = GetEnvMap(n, 1.0);
        vec3 kD = (vec3(1.0) - F) * (1.0 - uReflection);
        ambient = kD * albedo * envIrradiance * uEnvStrength * uDiffuse;
    }

    // 8. Compose
    vec3 finalColor = directLighting + reflectionLighting + rimColor + emission + ambient;

    // AO Tint: black = classic darkening. Custom color = tinted occlusion.
    finalColor *= mix(uAOColor, vec3(1.0), ao);

    return finalColor;
}
`,ut=`
// Uniforms are auto-generated by Schema

// R2 Quasi-Random Sequence (Martin Roberts, 2018)
// Uses the plastic constant for optimal 2D coverage — no directional bias.
// PHI_2D ≈ 1.32472 is the unique real root of x³ = x + 1.
const float R2_A1 = 0.7548776662466927;  // 1/PHI_2D
const float R2_A2 = 0.5698402909980532;  // 1/PHI_2D²

vec4 getBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));

    // 1. R2 Temporal Offset — shifts texture uniformly in 2D each frame
    float time = float(uFrameCount);
    vec2 temporalOffset = vec2(
        fract(time * R2_A1),
        fract(time * R2_A2)
    );

    // 2. Spatial Lookup with Temporal Offset
    vec2 uv = mod(screenCoord + temporalOffset * res, res) / res;

    // 3. Fetch RGBA Blue Noise (each channel independently distributed)
    vec4 blue = textureLod(uBlueNoiseTexture, uv, 0.0);

    // 4. Channel-Wise Temporal Animation for accumulation convergence
    float frameOffset  = time * R2_A1;
    float frameOffsetG = time * R2_A2;
    float frameOffsetB = time * (R2_A1 + R2_A2);
    float frameOffsetA = time * (R2_A1 * R2_A2);

    return vec4(
        fract(blue.r + frameOffset),
        fract(blue.g + frameOffsetG),
        fract(blue.b + frameOffsetB),
        fract(blue.a + frameOffsetA)
    );
}

float getBlueNoise(vec2 screenCoord) {
    return getBlueNoise4(screenCoord).r;
}

// Stable blue noise for DOF - does not animate with frame count
// This prevents screen shake during navigation while still providing good distribution
vec4 getStableBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));
    vec2 uv = mod(screenCoord, res) / res;
    return textureLod(uBlueNoiseTexture, uv, 0.0);
}
`;class En{constructor(t){ae(this,"defines",new Map);ae(this,"uniforms",new Map);ae(this,"preDEFunctions",[]);ae(this,"postDEFunctions",[]);ae(this,"integrators",[]);ae(this,"headers",[]);ae(this,"preambles",[]);ae(this,"postMapCode",[]);ae(this,"postDistCode",[]);ae(this,"materialLogic",[]);ae(this,"compositeLogic",[]);ae(this,"missLogic",[]);ae(this,"volumeBody",[]);ae(this,"volumeFinalize",[]);ae(this,"postProcessLogic",[]);ae(this,"shadingReflectionCode",[]);ae(this,"needsShading",!1);ae(this,"hybridInit",[]);ae(this,"hybridPreLoop",[]);ae(this,"hybridInLoop",[]);ae(this,"formulaLoopBody","");ae(this,"formulaInit","");ae(this,"formulaDist","");ae(this,"distOverrideInit","");ae(this,"distOverrideInLoopFull","");ae(this,"distOverrideInLoopGeom","");ae(this,"distOverridePostFull","");ae(this,"distOverridePostGeom","");ae(this,"useRotation",!0);ae(this,"renderMode","Direct");ae(this,"isLite",!1);ae(this,"precisionMode",0);ae(this,"maxLights",0);ae(this,"physicsRayGen",`
    // Standard Linear Projection
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 rd = normalize(uCamForward + uv.x * uCamBasisX + uv.y * uCamBasisY);
    `);this.variant=t}setRotation(t){this.useRotation=t}setRenderMode(t){this.renderMode=t}setQuality(t,o){this.isLite=t,this.precisionMode=o}setMaxLights(t){this.maxLights=t}addDefine(t,o="1"){this.defines.set(t,o)}addUniform(t,o,n){this.uniforms.set(t,{type:o,arraySize:n})}addHeader(t){this.headers.push(t)}addPreamble(t){this.preambles.includes(t)||this.preambles.push(t)}addFunction(t){this.preDEFunctions.includes(t)||this.preDEFunctions.push(t)}addPostDEFunction(t){this.postDEFunctions.includes(t)||this.postDEFunctions.push(t)}addIntegrator(t){this.integrators.includes(t)||this.integrators.push(t)}setFormula(t,o,n){this.formulaLoopBody=t,this.formulaInit=o,this.formulaDist=n}setDistOverride(t){this.distOverrideInit=t.init??"",this.distOverrideInLoopFull=t.inLoopFull??"",this.distOverrideInLoopGeom=t.inLoopGeom??"",this.distOverridePostFull=t.postFull??"",this.distOverridePostGeom=t.postGeom??""}addHybridFold(t,o,n){t&&this.hybridInit.push(t),o&&this.hybridPreLoop.push(o),n&&this.hybridInLoop.push(n)}addMaterialLogic(t){this.materialLogic.push(t)}addPostMapCode(t){this.postMapCode.push(t)}addPostDistCode(t){this.postDistCode.push(t)}addPostProcessLogic(t){this.postProcessLogic.push(t)}requestShading(){this.needsShading=!0}addShadingLogic(t){this.shadingReflectionCode.push(t)}addCompositeLogic(t){this.compositeLogic.push(t)}addMissLogic(t){this.missLogic.push(t)}buildMissHandler(){return`
vec3 sampleMiss(vec3 ro, vec3 rd, float roughness) {
    vec3 env = GetEnvMap(rd, roughness);

    // --- FEATURE INJECTION: MISS RAY OVERRIDE ---
    ${this.missLogic.join(`
`)}

    return env;
}
`}addVolumeTracing(t,o){t&&this.volumeBody.push(t),o&&this.volumeFinalize.push(o)}buildDefinesString(){let t="";return this.defines.forEach((o,n)=>{t+=`#define ${n} ${o}
`}),t}buildUniformsString(){let t=wn+`
`;return this.uniforms.forEach((o,n)=>{o.arraySize?t+=`uniform ${o.type} ${n}[${o.arraySize}];
`:t+=`uniform ${o.type} ${n};
`}),t}buildMeshSDFLibrary(){let t="";this.uniforms.forEach((s,i)=>{s.arraySize?t+=`uniform ${s.type} ${i}[${s.arraySize}];
`:t+=`uniform ${s.type} ${i};
`});const o=oo(this.formulaLoopBody,this.formulaInit,this.formulaDist,this.hybridInit.join(`
`),this.hybridPreLoop.join(`
`),this.hybridInLoop.join(`
`),this.distOverrideInit,this.distOverrideInLoopFull,this.distOverrideInLoopGeom,this.distOverridePostFull,this.distOverridePostGeom,this.postMapCode.join(`
`),this.postDistCode.join(`
`)),n=`
${$t}
${Gt}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

${To("_")}
`;return`
#define MAX_HARD_ITERATIONS 100

// Math constants shared with the main renderer (PI, TAU, INV_TAU, INV_PI, phi)
${Fo}

${nt}

// Stub uniforms required by DE_MASTER generated code (map + mapDist reference these;
// only mapDist is called in the mesh SDF path but both functions must compile).
// Any uniform referenced by features' hybridInLoop/hybridPreLoop injections also goes here.
uniform vec3  uSceneOffsetLow;
uniform vec3  uSceneOffsetHigh;
uniform vec3  uCameraPosition;
uniform float uColorIter;
uniform float uColorMode;
uniform float uColorMode2;
uniform float uUseTexture;
uniform float uTextureModeU;
uniform float uTextureModeV;
uniform float uBurningEnabled;

// Feature-injected uniforms (e.g. interlace params from Interlace.inject())
${t}

// Precision offset stub — mesh SDF operates in local space (no camera offset needed)
vec3 applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p; }

// Base mesh helpers (sphereFold, boxFold, getLength, rotation stubs, snoise)
${n}

// Preambles from feature inject() calls (e.g. SHARED_TRANSFORMS_GLSL from Geometry)
${this.preambles.join(`
`)}

// Pre-DE functions (primary formula + secondary interlace formula functions)
${this.preDEFunctions.join(`
`)}

// Distance estimator — generates map(vec3 p) -> vec4 and mapDist(vec3 p) -> float
${o}

// Mesh SDF entry point — wraps mapDist() which is a pure function of position
float formulaDE(vec3 pos) {
    return mapDist(pos);
}
`}buildFragment(){if(this.variant==="Mesh")return this.buildMeshSDFLibrary();const t=this.buildDefinesString(),o=this.buildUniformsString(),n=this.headers.join(`
`),s=this.preambles.join(`
`),i=this.preDEFunctions.join(`
`),a=this.postDEFunctions.join(`
`);if(this.needsShading){const y=this.shadingReflectionCode.join(`
`);this.integrators.push(Fn(y))}const r=this.integrators.join(`
`),l=pn(this.useRotation),m=oo(this.formulaLoopBody,this.formulaInit,this.formulaDist,this.hybridInit.join(`
`),this.hybridPreLoop.join(`
`),this.hybridInLoop.join(`
`),this.distOverrideInit,this.distOverrideInLoopFull,this.distOverrideInLoopGeom,this.distOverridePostFull,this.distOverridePostGeom,this.postMapCode.join(`
`),this.postDistCode.join(`
`));if(this.variant==="Physics")return`
${t}
${o}
${l}
${ut}
${ct}
${n}
${s}
${i}
${m}


bool traceScene(vec3 ro, vec3 rd, out float d, out vec4 result) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) return false;
    
    d = max(0.0, bounds.x);
    
    int limit = 100; // Reduced from uMaxSteps for faster probing
    float maxMarch = 100.0; // Reduced max distance
    
    vec4 h = vec4(0.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        h = map(p + uCameraPosition);
        
        // Simple hit detection (no refinement)
        float distFromFractalOrigin = length(p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh);
        float floatPrecision = max(1.0e-5, distFromFractalOrigin * 1.0e-5);
        
        if (h.x < floatPrecision) {
            result = h;
            return true;
        }
        
        // Simple step advance (fixed step size)
        d += max(h.x, floatPrecision * 0.5) * 0.9;
        
        if (d > maxMarch) break;
    }
    
    return false;
}


layout(location = 0) out vec4 pc_fragColor;

void main() {
    ${this.physicsRayGen}

    vec3 ro = vec3(0.0);
    float d = 0.0;
    vec4 result = vec4(0.0);

    bool hit = traceScene(ro, rd, d, result);

    if (hit) {
        pc_fragColor = vec4(d, 0.0, 0.0, 1.0);
    } else {
        pc_fragColor = vec4(-1.0, 0.0, 0.0, 1.0);
    }
}
`;if(this.variant==="Histogram"){const y=Bt(!1,!1,this.precisionMode,0,"",""),w=no("Direct");return`
${t}
${o}
${l}
${ut}
${ct}
${n}
${s}
${i}
${m}
${a}

${y}
${w}

layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec3 ro, rd, roClean, rdClean;
    float stochasticSeed;
    getCameraRay(vUv, ro, rd, stochasticSeed, roClean, rdClean);

    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;
    float d = 0.0;
    vec4 result = vec4(0.0);

    bool hit = traceScene(ro, rd, d, result, glow, 0.0, volumetric, fogScatter);

    if (hit) {
        float mode = (uHistogramLayer > 0) ? uColorMode2 : uColorMode;
        float scale = (uHistogramLayer > 0) ? uColorScale2 : uColorScale;

        vec3 p = ro + rd * d;
        vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

        vec3 n = vec3(0.0, 1.0, 0.0);

        float val = getMappingValue(mode, p_fractal, result, n, scale);

        pc_fragColor = vec4(val, 0.0, 0.0, 1.0);
    } else {
        pc_fragColor = vec4(-1.0, 0.0, 0.0, 1.0);
    }
}
`}const v=Cn(this.materialLogic.join(`
`)),d=this.buildMissHandler(),f=this.renderMode==="PathTracing",x=Bt(this.isLite,!0,this.precisionMode,0,this.volumeBody.join(`
`),this.volumeFinalize.join(`
`)),g=f?Bt(this.isLite,!1,this.precisionMode,0,"","","traceSceneLean"):"",M=Mn(f,this.maxLights,this.compositeLogic.join(`
`)),h=no(this.renderMode),F=Tn(this.postProcessLogic.join(`
`)),p=[["Defines",t],["Uniforms",o],["Headers",n],["Math",l],["BlueNoise",ut],["Coloring",ct],["Preambles",s],["Formulas",i],["DE",m],["PostDE",a],["MatEval",v],["MissHandler",d],["Ray",h],["Trace",x],["TraceLean",g],["Integrators",r],["Post",F],["Main",M]];return p.filter(([,y])=>y.length>0).map(([y,w])=>`${y}: ${(w.length/1024).toFixed(1)}kb`).join(" | "),p.reduce((y,[,w])=>y+w.length,0),`
${t}
${o}
${n}
${l}
${ut}
${ct}

${s}

${i}

${m}

${a}

${v}

${d}

${h}

${x}
${g}

${r}

${F}
${M}
`}}class Pn{static generateFragmentShader(t){return this.buildShader(t,"Main")}static generatePhysicsShader(t){return this.buildShader(t,"Physics")}static generateHistogramShader(t){return this.buildShader(t,"Histogram")}static generateMeshSDFLibrary(t){return this.buildShader(t,"Mesh")}static buildShader(t,o){const n=new En(o),s=t.lighting,a=(s==null?void 0:s.ptEnabled)!==!1&&(t.renderMode==="PathTracing"||(s==null?void 0:s.renderMode)===1);n.setRenderMode(a?"PathTracing":"Direct");const r=t.quality||{};return n.setQuality(r.precisionMode===1,r.precisionMode??0),yo.getAll().forEach(m=>{m.inject&&m.inject(n,t,o)}),n.buildFragment()}}class pt{constructor(t=65536){ae(this,"data");ae(this,"length");this.data=new Float32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,i=new Float32Array(s);i.set(this.data),this.data=i}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}class Lo{constructor(t=65536){ae(this,"data");ae(this,"length");this.data=new Uint32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,i=new Uint32Array(s);i.set(this.data),this.data=i}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}function Ue(e,t,o,n,s){return o=o|0,n=n|0,s=s|0,o=o<0?0:o>=t?t-1:o,n=n<0?0:n>=t?t-1:n,s=s<0?0:s>=t?t-1:s,e[(s*t+n)*t+o]}function Xe(e,t,o,n,s){const i=Math.floor(o),a=Math.floor(n),r=Math.floor(s),l=o-i,m=n-a,v=s-r,d=Ue(e,t,i,a,r),f=Ue(e,t,i+1,a,r),x=Ue(e,t,i,a+1,r),g=Ue(e,t,i+1,a+1,r),M=Ue(e,t,i,a,r+1),h=Ue(e,t,i+1,a,r+1),F=Ue(e,t,i,a+1,r+1),p=Ue(e,t,i+1,a+1,r+1),y=d*(1-l)+f*l,w=x*(1-l)+g*l,V=M*(1-l)+h*l,k=F*(1-l)+p*l,R=y*(1-m)+w*m,D=V*(1-m)+k*m;return R*(1-v)+D*v}function ao(e,t,o,n,s){const a=Xe(e,t,o+.5,n,s)-Xe(e,t,o-.5,n,s),r=Xe(e,t,o,n+.5,s)-Xe(e,t,o,n-.5,s),l=Xe(e,t,o,n,s+.5)-Xe(e,t,o,n,s-.5),m=Math.sqrt(a*a+r*r+l*l);if(m<1e-10)return[0,1,0];const v=1/m;return[a*v,r*v,l*v]}function ye(e,t,o,n){return o+e/(t-1)*(n-o)}function qe(e,t,o,n){return(e-o)/(n-o)*(t-1)}const ht=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];function _o(e,t,o){if(e.length===0)return null;let n=0,s=0,i=0;for(let D=0;D<e.length;D++)n+=e[D].point[0],s+=e[D].point[1],i+=e[D].point[2];const a=1/e.length;n*=a,s*=a,i*=a;let r=0,l=0,m=0,v=0,d=0,f=0,x=0,g=0,M=0;for(let D=0;D<e.length;D++){const N=e[D].normal,u=e[D].point,c=N[0]*u[0]+N[1]*u[1]+N[2]*u[2];r+=N[0]*N[0],l+=N[0]*N[1],m+=N[0]*N[2],v+=N[1]*N[1],d+=N[1]*N[2],f+=N[2]*N[2],x+=N[0]*c,g+=N[1]*c,M+=N[2]*c}const h=.01;r+=h,v+=h,f+=h,x+=h*n,g+=h*s,M+=h*i;const F=r*(v*f-d*d)-l*(l*f-d*m)+m*(l*d-v*m);let p,y,w;if(Math.abs(F)<1e-6)p=n,y=s,w=i;else{const D=1/F;p=D*(x*(v*f-d*d)-l*(g*f-d*M)+m*(g*d-v*M)),y=D*(r*(g*f-d*M)-x*(l*f-d*m)+m*(l*M-g*m)),w=D*(r*(v*M-g*d)-l*(l*M-g*m)+x*(l*d-v*m))}const V=(o[0]-t[0])*.1,k=(o[1]-t[1])*.1,R=(o[2]-t[2])*.1;return p=Math.max(t[0]-V,Math.min(o[0]+V,p)),y=Math.max(t[1]-k,Math.min(o[1]+k,y)),w=Math.max(t[2]-R,Math.min(o[2]+R,w)),[p,y,w]}let Ht=!1;function An(){Ht=!0}function so(){Ht=!1}function ro(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(Ht)throw new Error("CANCELLED")})}async function In(e,t,o,n,s,i=()=>{}){const a=t-1;i("contouring",0);const r=new Map,l=new pt(8192),m=new pt(8192);let v=0;for(let k=0;k<a;k++){k&7||(i("contouring",Math.round(40*k/a)),await ro());for(let R=0;R<a;R++)for(let D=0;D<a;D++){const N=e[(k*t+R)*t+D],u=N>=0,c=[N,e[(k*t+R)*t+D+1],e[(k*t+(R+1))*t+D],e[(k*t+(R+1))*t+D+1],e[((k+1)*t+R)*t+D],e[((k+1)*t+R)*t+D+1],e[((k+1)*t+(R+1))*t+D],e[((k+1)*t+(R+1))*t+D+1]];let _=!1;for(let C=1;C<8;C++)if(c[C]>=0!==u){_=!0;break}if(!_)continue;const P=[];for(let C=0;C<12;C++){const L=ht[C],A=c[L[0]],O=c[L[1]];if(A>=0==O>=0)continue;const S=D+(L[0]&1),E=R+(L[0]>>1&1),G=k+(L[0]>>2&1),H=D+(L[1]&1),X=R+(L[1]>>1&1),$=k+(L[1]>>2&1);let j=S,W=E,oe=G,ne=H,Z=X,re=$,le=A;for(let se=0;se<8;se++){const K=(j+ne)*.5,ee=(W+Z)*.5,Q=(oe+re)*.5,te=Xe(e,t,K,ee,Q);te>=0==le>=0?(j=K,W=ee,oe=Q,le=te):(ne=K,Z=ee,re=Q)}const ie=(j+ne)*.5,ce=(W+Z)*.5,J=(oe+re)*.5,q=ao(e,t,ie,ce,J);P.push({point:[ye(ie,t,o[0],n[0]),ye(ce,t,o[1],n[1]),ye(J,t,o[2],n[2])],normal:q})}if(P.length===0)continue;const B=[ye(D,t,o[0],n[0]),ye(R,t,o[1],n[1]),ye(k,t,o[2],n[2])],z=[ye(D+1,t,o[0],n[0]),ye(R+1,t,o[1],n[1]),ye(k+1,t,o[2],n[2])],T=_o(P,B,z);if(!T)continue;const U=ao(e,t,qe(T[0],t,o[0],n[0]),qe(T[1],t,o[1],n[1]),qe(T[2],t,o[2],n[2])),I=(k*a+R)*a+D;r.set(I,v),l.push3(T[0],T[1],T[2]),m.push3(U[0],U[1],U[2]),v++}}if(i("contouring",50),console.log("DC: "+v+" vertices from "+r.size+" cells"),v===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const d=new Lo(8192),f=new Set;let x=0,g=0,M=0;const h=r.size,F=Array.from(r.entries());for(let k=0;k<F.length;k++){F[k][1];const R=F[k][0];M++;const D=R%a,N=(R/a|0)%a,u=R/(a*a)|0;for(let c=0;c<12;c++){const _=ht[c],P=D+(_[0]&1),B=N+(_[0]>>1&1),z=u+(_[0]>>2&1),T=D+(_[1]&1),U=N+(_[1]>>1&1),I=u+(_[1]>>2&1),C=e[(z*t+B)*t+P],L=e[(I*t+U)*t+T];if(C>=0==L>=0)continue;let A;const O=Math.min(P,T),S=Math.min(B,U),E=Math.min(z,I);P!==T?A=0:B!==U?A=1:A=2;const G=(E*t+S)*t*4+O*4+A;if(f.has(G))continue;f.add(G),x++;const H=(A+1)%3,X=(A+2)%3,$=[O,S,E],j=[-1,-1,-1,-1];let W=!0;for(let ne=0;ne<4;ne++){const Z=[$[0],$[1],$[2]];if(Z[H]-=ne&1?0:1,Z[X]-=ne&2?0:1,Z[0]<0||Z[1]<0||Z[2]<0||Z[0]>=a||Z[1]>=a||Z[2]>=a){W=!1;break}const re=(Z[2]*a+Z[1])*a+Z[0],le=r.get(re);if(le===void 0){W=!1;break}j[ne]=le}if(!W){g++;continue}const oe=C>=0;j[0]!==j[1]&&j[0]!==j[3]&&j[1]!==j[3]&&(oe?d.push3(j[0],j[3],j[1]):d.push3(j[0],j[1],j[3])),j[0]!==j[2]&&j[0]!==j[3]&&j[2]!==j[3]&&(oe?d.push3(j[0],j[2],j[3]):d.push3(j[0],j[3],j[2]))}M&4095||(i("contouring",50+Math.round(50*M/h)),await ro())}i("contouring",100),console.log("DC: "+x+" sign-change edges, "+g+" dropped (boundary), "+d.length/3+" faces");const p=l.trim(),y=m.trim(),w=d.trim(),V=Math.floor(d.length/3);return{positions:p,normals:y,indices:w,vertexCount:v,faceCount:V}}let Yt=!1;function Rn(){Yt=!0}function io(){Yt=!1}function zt(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(Yt)throw new Error("CANCELLED")})}class Dn{constructor(t,o=8,n=1){ae(this,"N");ae(this,"blockSize");ae(this,"defaultValue");ae(this,"blocksPerAxis");ae(this,"blockCellCount");ae(this,"blocks");ae(this,"allocatedCount");this.N=t,this.blockSize=o,this.defaultValue=n,this.blocksPerAxis=Math.ceil(t/o),this.blockCellCount=o*o*o,this.blocks=new Map,this.allocatedCount=0}blockKey(t,o,n){return(n*this.blocksPerAxis+o)*this.blocksPerAxis+t}allocateBlock(t,o,n){const s=this.blockKey(t,o,n);if(!this.blocks.has(s)){const i=new Float32Array(this.blockCellCount);i.fill(this.defaultValue),this.blocks.set(s,i),this.allocatedCount++}return this.blocks.get(s)}hasBlock(t,o,n){return this.blocks.has(this.blockKey(t,o,n))}set(t,o,n,s){const i=this.blockSize,a=t/i|0,r=o/i|0,l=n/i|0,m=this.allocateBlock(a,r,l),v=t-a*i,d=o-r*i,f=n-l*i;m[(f*i+d)*i+v]=s}get(t,o,n){if(t<0||o<0||n<0||t>=this.N||o>=this.N||n>=this.N)return this.defaultValue;const s=this.blockSize,i=t/s|0,a=o/s|0,r=n/s|0,l=this.blockKey(i,a,r),m=this.blocks.get(l);if(!m)return this.defaultValue;const v=t-i*s,d=o-a*s,f=n-r*s;return m[(f*s+d)*s+v]}lerp(t,o,n){const s=Math.floor(t),i=Math.floor(o),a=Math.floor(n),r=t-s,l=o-i,m=n-a,v=this.get(s,i,a),d=this.get(s+1,i,a),f=this.get(s,i+1,a),x=this.get(s+1,i+1,a),g=this.get(s,i,a+1),M=this.get(s+1,i,a+1),h=this.get(s,i+1,a+1),F=this.get(s+1,i+1,a+1),p=v*(1-r)+d*r,y=f*(1-r)+x*r,w=g*(1-r)+M*r,V=h*(1-r)+F*r,k=p*(1-l)+y*l,R=w*(1-l)+V*l;return k*(1-m)+R*m}gradient(t,o,n){const i=this.lerp(t+.5,o,n)-this.lerp(t-.5,o,n),a=this.lerp(t,o+.5,n)-this.lerp(t,o-.5,n),r=this.lerp(t,o,n+.5)-this.lerp(t,o,n-.5),l=Math.sqrt(i*i+a*a+r*r);if(l<1e-10)return[0,1,0];const m=1/l;return[i*m,a*m,r*m]}memoryMB(){return this.allocatedCount*this.blockCellCount*4/(1024*1024)}}function Ln(e,t,o,n=8,s=2){const i=o/t,a=Math.ceil(o/n),r=new Set;for(let v=0;v<t-1;v++)for(let d=0;d<t-1;d++)for(let f=0;f<t-1;f++){const g=e[(v*t+d)*t+f]>=0;let M=!1;for(let h=0;h<=1&&!M;h++)for(let F=0;F<=1&&!M;F++)for(let p=0;p<=1;p++){if(p===0&&F===0&&h===0)continue;if(e[((v+h)*t+(d+F))*t+(f+p)]>=0!==g){M=!0;break}}if(M)for(let h=-s;h<=s;h++)for(let F=-s;F<=s;F++)for(let p=-s;p<=s;p++){const y=f+p,w=d+F,V=v+h;y>=0&&w>=0&&V>=0&&y<t&&w<t&&V<t&&r.add((V*t+w)*t+y)}}const l=new Dn(o,n,1);let m=0;return r.forEach(v=>{const d=v%t,f=(v/t|0)%t,x=v/(t*t)|0,g=Math.floor(d*i),M=Math.floor(f*i),h=Math.floor(x*i),F=Math.ceil((d+1)*i),p=Math.ceil((f+1)*i),y=Math.ceil((x+1)*i),w=g/n|0,V=M/n|0,k=h/n|0,R=Math.min(a-1,F/n|0),D=Math.min(a-1,p/n|0),N=Math.min(a-1,y/n|0);for(let u=k;u<=N;u++)for(let c=V;c<=D;c++)for(let _=w;_<=R;_++)l.hasBlock(_,c,u)||(l.allocateBlock(_,c,u),m++)}),console.log("Narrow band: "+r.size+" coarse surface cells -> "+m+" fine blocks ("+l.memoryMB().toFixed(1)+" MB) out of "+a*a*a+" total blocks"),{grid:l,surfaceCells:r,bandBlockCount:m}}function qt(e,t){const o=e.blockSize,n=e.blocksPerAxis;e.blocks.forEach((s,i)=>{const a=i%n,r=(i/n|0)%n,l=i/(n*n)|0;t(a,r,l,a*o,r*o,l*o)})}async function _n(e,t,o,n=()=>{}){const s=e.N,i=s-1,a=e.blockSize,r=e.blocksPerAxis;let l=new Map,m=null;function v(T,U,I,C){const L=T/a|0,A=U/a|0,O=I/a|0,S=e.blockKey(L,A,O),E=T-L*a,G=U-A*a,X=((I-O*a)*a+G)*a+E;let $=l.get(S);$||($={locals:[],globals:[]},l.set(S,$)),$.locals.push(X),$.globals.push(C)}function d(T,U,I){const C=T/a|0,L=U/a|0,A=I/a|0,O=e.blockKey(C,L,A),S=m.get(O);if(!S)return-1;const E=T-C*a,G=U-L*a,X=((I-A*a)*a+G)*a+E,$=S.locals;let j=0,W=$.length-1;for(;j<=W;){const oe=j+W>>1;if($[oe]===X)return S.globals[oe];$[oe]<X?j=oe+1:W=oe-1}return-1}const f=new Map;function x(T,U,I,C){const L=T/a|0,A=U/a|0,O=I/a|0,S=e.blockKey(L,A,O);let E=f.get(S);E||(E=new Uint8Array(e.blockCellCount),f.set(S,E));const G=T-L*a,H=U-A*a,$=((I-O*a)*a+H)*a+G,j=1<<C;return E[$]&j?!0:(E[$]|=j,!1)}n("contouring",0);const g=new pt(262144),M=new pt(262144);let h=0,F=0;const p=e.allocatedCount,y=[];qt(e,(T,U,I,C,L,A)=>{y.push([T,U,I,C,L,A])});for(let T=0;T<y.length;T++){const U=y[T],I=U[3],C=U[4],L=U[5];F++;const A=Math.min(I+a,i),O=Math.min(C+a,i),S=Math.min(L+a,i);for(let E=L;E<S;E++)for(let G=C;G<O;G++)for(let H=I;H<A;H++){const X=e.get(H,G,E),$=X>=0,j=[X,e.get(H+1,G,E),e.get(H,G+1,E),e.get(H+1,G+1,E),e.get(H,G,E+1),e.get(H+1,G,E+1),e.get(H,G+1,E+1),e.get(H+1,G+1,E+1)];let W=!1;for(let ie=1;ie<8;ie++)if(j[ie]>=0!==$){W=!0;break}if(!W)continue;const oe=[];for(let ie=0;ie<12;ie++){const ce=ht[ie],J=j[ce[0]],q=j[ce[1]];if(J>=0==q>=0)continue;const se=H+(ce[0]&1),K=G+(ce[0]>>1&1),ee=E+(ce[0]>>2&1),Q=H+(ce[1]&1),te=G+(ce[1]>>1&1),fe=E+(ce[1]>>2&1);let pe=se,ve=K,Te=ee,Ae=Q,Se=te,ue=fe,ge=J;for(let Fe=0;Fe<8;Fe++){const Le=(pe+Ae)*.5,$e=(ve+Se)*.5,Ge=(Te+ue)*.5,Qe=e.lerp(Le,$e,Ge);Qe>=0==ge>=0?(pe=Le,ve=$e,Te=Ge,ge=Qe):(Ae=Le,Se=$e,ue=Ge)}const Ie=(pe+Ae)*.5,xe=(ve+Se)*.5,he=(Te+ue)*.5,Ce=e.gradient(Ie,xe,he);oe.push({point:[ye(Ie,s,t[0],o[0]),ye(xe,s,t[1],o[1]),ye(he,s,t[2],o[2])],normal:Ce})}if(oe.length===0)continue;const ne=[ye(H,s,t[0],o[0]),ye(G,s,t[1],o[1]),ye(E,s,t[2],o[2])],Z=[ye(H+1,s,t[0],o[0]),ye(G+1,s,t[1],o[1]),ye(E+1,s,t[2],o[2])],re=_o(oe,ne,Z);if(!re)continue;const le=e.gradient(qe(re[0],s,t[0],o[0]),qe(re[1],s,t[1],o[1]),qe(re[2],s,t[2],o[2]));v(H,G,E,h),g.push3(re[0],re[1],re[2]),M.push3(le[0],le[1],le[2]),h++}F&63||(n("contouring",Math.round(40*F/p)),await zt())}if(n("contouring",50),console.log("DC sparse: "+h+" vertices ("+((g.data.byteLength+M.data.byteLength)/(1024*1024)).toFixed(0)+" MB vertex data)"),h===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const w=new Map,V=e.blockCellCount+7>>3,k=e.memoryMB();let R=Array.from(e.blocks.keys());for(let T=0;T<R.length;T++){const U=R[T],I=e.blocks.get(U),C=new Uint8Array(V);for(let L=0;L<I.length;L++)I[L]>=0&&(C[L>>3]|=1<<(L&7));w.set(U,C),e.blocks.delete(U),T&255||await zt()}R=null,e.allocatedCount=0;const D=(w.size*V/(1024*1024)).toFixed(0);console.log("Sign compression: freed "+k.toFixed(0)+" MB float data, using "+D+" MB sign maps"),m=new Map,l.forEach((T,U)=>{const I=T.locals.length,C=new Array(I);for(let E=0;E<I;E++)C[E]=E;const L=T.locals,A=T.globals;C.sort((E,G)=>L[E]-L[G]);const O=new Uint16Array(I),S=new Uint32Array(I);for(let E=0;E<I;E++)O[E]=L[C[E]],S[E]=A[C[E]];m.set(U,{locals:O,globals:S})}),l.clear(),l=null,console.log("Vertex map compaction: "+m.size+" blocks with vertices");function N(T,U,I){if(T<0||U<0||I<0||T>=s||U>=s||I>=s)return!0;const C=T/a|0,L=U/a|0,A=I/a|0,O=e.blockKey(C,L,A),S=w.get(O);if(!S)return!0;const E=T-C*a,G=U-L*a,X=((I-A*a)*a+G)*a+E;return(S[X>>3]&1<<(X&7))!==0}const u=new Lo(262144);let c=0,_=0,P=0;const B=m.size;let z=Array.from(m.entries());for(let T=0;T<z.length;T++){const U=z[T],I=U[0],C=U[1];P++;const L=I%r,A=(I/r|0)%r,O=I/(r*r)|0,S=L*a,E=A*a,G=O*a;for(let H=0;H<C.locals.length;H++){const X=C.locals[H],$=X%a,j=(X/a|0)%a,W=X/(a*a)|0,oe=S+$,ne=E+j,Z=G+W;if(!(oe>=i||ne>=i||Z>=i))for(let re=0;re<12;re++){const le=ht[re],ie=oe+(le[0]&1),ce=ne+(le[0]>>1&1),J=Z+(le[0]>>2&1),q=oe+(le[1]&1),se=ne+(le[1]>>1&1),K=Z+(le[1]>>2&1),ee=N(ie,ce,J),Q=N(q,se,K);if(ee===Q)continue;let te;const fe=Math.min(ie,q),pe=Math.min(ce,se),ve=Math.min(J,K);if(ie!==q?te=0:ce!==se?te=1:te=2,x(fe,pe,ve,te))continue;c++;const Te=(te+1)%3,Ae=(te+2)%3,Se=[fe,pe,ve],ue=[-1,-1,-1,-1];let ge=!0;for(let xe=0;xe<4;xe++){const he=[Se[0],Se[1],Se[2]];if(he[Te]-=xe&1?0:1,he[Ae]-=xe&2?0:1,he[0]<0||he[1]<0||he[2]<0||he[0]>=i||he[1]>=i||he[2]>=i){ge=!1;break}const Ce=d(he[0],he[1],he[2]);if(Ce<0){ge=!1;break}ue[xe]=Ce}if(!ge){_++;continue}const Ie=ee;ue[0]!==ue[1]&&ue[0]!==ue[3]&&ue[1]!==ue[3]&&(Ie?u.push3(ue[0],ue[3],ue[1]):u.push3(ue[0],ue[1],ue[3])),ue[0]!==ue[2]&&ue[0]!==ue[3]&&ue[2]!==ue[3]&&(Ie?u.push3(ue[0],ue[2],ue[3]):u.push3(ue[0],ue[3],ue[2]))}}P&63||(n("contouring",50+Math.round(50*P/B)),await zt())}return m=null,z=null,n("contouring",100),console.log("DC sparse: "+c+" sign-change edges, "+_+" dropped, "+u.length/3+" faces"),{positions:g.trim(),normals:M.trim(),indices:u.trim(),vertexCount:h,faceCount:Math.floor(u.length/3)}}const Bo=new Float32Array(1),Bn=new Uint32Array(Bo.buffer);function zn(e){Bo[0]=e;const t=Bn[0],o=t>>16&32768,n=(t>>23&255)-127+15,s=t&8388607;return n<=0?o:n>=31?o|31744:o|n<<10|s>>13}const zo=new Uint16Array(256);for(let e=0;e<256;e++)zo[e]=zn(e/255);class ko{constructor(t){ae(this,"buf");ae(this,"a");ae(this,"v");ae(this,"pos");this.buf=new ArrayBuffer(t||8*1024*1024),this.a=new Uint8Array(this.buf),this.v=new DataView(this.buf),this.pos=0}grow(t){let o=this.pos+t;this.buf.byteLength<256*1024*1024?o=Math.max(this.buf.byteLength*2,o):o=Math.max(Math.round(this.buf.byteLength*1.25),o);const n=new ArrayBuffer(o);new Uint8Array(n).set(this.a),this.buf=n,this.a=new Uint8Array(n),this.v=new DataView(n)}en(t){this.pos+t>this.buf.byteLength&&this.grow(t)}u8(t){this.en(1),this.v.setUint8(this.pos,t),this.pos++}u16(t){this.en(2),this.v.setUint16(this.pos,t,!0),this.pos+=2}u32(t){this.en(4),this.v.setUint32(this.pos,t,!0),this.pos+=4}i32(t){this.en(4),this.v.setInt32(this.pos,t,!0),this.pos+=4}u64(t){this.en(8),this.v.setBigUint64(this.pos,t,!0),this.pos+=8}f64(t){this.en(8),this.v.setFloat64(this.pos,t,!0),this.pos+=8}raw(t){this.en(t.length),this.a.set(t,this.pos),this.pos+=t.length}str(t){this.en(t.length);for(let o=0;o<t.length;o++)this.a[this.pos++]=t.charCodeAt(o)}name(t){this.u32(t.length),this.str(t)}zeros(t){this.en(t),this.pos+=t}bulk64(t){const o=t.length*8;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulk16(t){const o=t.length*2;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulkF32(t){const o=t.length*4;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}result(){return new Uint8Array(this.buf,0,this.pos)}}const vt=0xFFFFFFFFFFFFFFFFn;function kn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Uint16Array(32768),n4map:new Map}}function On(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Uint16Array(4096),leafMap:new Map}}function jn(e,t,o,n,s){const i=new BigUint64Array(8),a=new Uint16Array(512);let r=0;for(let g=0;g<512;g++)s[g]>0&&(i[g>>6]|=1n<<BigInt(g&63),a[g]=zo[s[g]],r++);if(r===0)return 0;const l=t<<3,m=o<<3,v=n<<3,d=(v&4095)>>7|(m&4095)>>7<<5|(l&4095)>>7<<10;e.n5childMask[d>>6]|=1n<<BigInt(d&63);let f=e.n4map.get(d);f||(f=On(),e.n4map.set(d,f));const x=(v&127)>>3|(m&127)>>3<<4|(l&127)>>3<<8;return f.childMask[x>>6]|=1n<<BigInt(x&63),f.leafMap.set(x,{mask:i,data:a}),r}function Un(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const i=[];n.leafMap.forEach(function(a,r){let l=!0;for(let d=0;d<8;d++)if(a.mask[d]!==vt){l=!1;break}if(!l)return;const m=a.data[0];let v=!0;for(let d=1;d<512;d++)if(a.data[d]!==m){v=!1;break}v&&i.push([r,m])});for(let a=0;a<i.length;a++){const r=i[a][0],l=i[a][1];n.leafMap.delete(r),n.childMask[r>>6]&=~(1n<<BigInt(r&63)),n.valueMask[r>>6]|=1n<<BigInt(r&63),n.tileValues[r]=l,t++}if(n.leafMap.size===0){let a=!0;for(let r=0;r<64;r++)if(n.valueMask[r]!==vt){a=!1;break}if(a){const r=n.tileValues[0];let l=!0;for(let m=1;m<4096;m++)if(n.tileValues[m]!==r){l=!1;break}l&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s]=r,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Vn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Float32Array(32768*3),n4map:new Map}}function Nn(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Float32Array(4096*3),leafMap:new Map}}function $n(e,t,o,n,s,i,a){const r=new BigUint64Array(8),l=new Float32Array(512*3);let m=0;for(let h=0;h<512;h++)(s[h]>0||i[h]>0||a[h]>0)&&(r[h>>6]|=1n<<BigInt(h&63),l[h*3]=s[h]/255,l[h*3+1]=i[h]/255,l[h*3+2]=a[h]/255,m++);if(m===0)return 0;const v=t<<3,d=o<<3,f=n<<3,x=(f&4095)>>7|(d&4095)>>7<<5|(v&4095)>>7<<10;e.n5childMask[x>>6]|=1n<<BigInt(x&63);let g=e.n4map.get(x);g||(g=Nn(),e.n4map.set(x,g));const M=(f&127)>>3|(d&127)>>3<<4|(v&127)>>3<<8;return g.childMask[M>>6]|=1n<<BigInt(M&63),g.leafMap.set(M,{mask:r,data:l}),m}function Gn(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const i=[];n.leafMap.forEach(function(a,r){let l=!0;for(let x=0;x<8;x++)if(a.mask[x]!==vt){l=!1;break}if(!l)return;const m=a.data[0],v=a.data[1],d=a.data[2];let f=!0;for(let x=1;x<512;x++)if(a.data[x*3]!==m||a.data[x*3+1]!==v||a.data[x*3+2]!==d){f=!1;break}f&&i.push([r,m,v,d])});for(const[a,r,l,m]of i)n.leafMap.delete(a),n.childMask[a>>6]&=~(1n<<BigInt(a&63)),n.valueMask[a>>6]|=1n<<BigInt(a&63),n.tileValues[a*3]=r,n.tileValues[a*3+1]=l,n.tileValues[a*3+2]=m,t++;if(n.leafMap.size===0){let a=!0;for(let r=0;r<64;r++)if(n.valueMask[r]!==vt){a=!1;break}if(a){const r=n.tileValues[0],l=n.tileValues[1],m=n.tileValues[2];let v=!0;for(let d=1;d<4096;d++)if(n.tileValues[d*3]!==r||n.tileValues[d*3+1]!==l||n.tileValues[d*3+2]!==m){v=!1;break}v&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s*3]=r,e.n5tileValues[s*3+1]=l,e.n5tileValues[s*3+2]=m,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Ze(e){return Array.from(e.keys()).sort(function(t,o){return t-o})}function ke(e,t,o){e.name(t),e.name("string"),e.name(o)}function Zt(e,t,o){e.name(t),e.name("bool"),e.u32(1),e.u8(o?1:0)}function Oo(e,t){e.u32(1),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulk16(t.n5tileValues);const o=Ze(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulk16(s.tileValues);const i=Ze(s.leafMap);for(let a=0;a<i.length;a++)e.bulk64(s.leafMap.get(i[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),i=Ze(s.leafMap);for(let a=0;a<i.length;a++){const r=s.leafMap.get(i[a]);e.bulk64(r.mask),e.u8(6),e.bulk16(r.data),r.data=null}}}function Xn(e,t){e.u32(1),e.f64(0),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulkF32(t.n5tileValues);const o=Ze(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulkF32(s.tileValues);const i=Ze(s.leafMap);for(let a=0;a<i.length;a++)e.bulk64(s.leafMap.get(i[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),i=Ze(s.leafMap);for(let a=0;a<i.length;a++){const r=s.leafMap.get(i[a]);e.bulk64(r.mask),e.u8(6),e.bulkF32(r.data),r.data=null}}}function jo(e,t,o,n){const s=n/t;e.name("AffineMap"),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(o[0]),e.f64(o[1]),e.f64(o[2]),e.f64(1)}function Hn(e,t,o,n,s,i){e.u32(0),e.u32(4),ke(e,"class","unknown"),ke(e,"file_compression","none"),Zt(e,"is_saved_as_half_float",!0),ke(e,"name",o),jo(e,n,s,i),Oo(e,t)}function Yn(e,t,o,n,s,i){e.u32(0),e.u32(4),ke(e,"class","unknown"),ke(e,"file_compression","none"),Zt(e,"is_saved_as_half_float",!1),ke(e,"name",o),jo(e,n,s,i),Xn(e,t)}function qn(e,t,o,n){let s=0;e.n4map.forEach(function(l){s+=l.leafMap.size});const i=2e5+s*1200+e.n4map.size*1e4,a=new ko(Math.max(i,1024*1024));a.raw(new Uint8Array([32,66,68,86,0,0,0,0])),a.u32(224),a.u32(8),a.u32(1),a.u8(0),a.str("d2b59639-ac2f-4047-9c50-9648f951180c"),a.u32(0),a.u32(1),a.name("density"),a.name("Tree_float_5_4_3_HalfFloat"),a.u32(0),a.u64(BigInt(a.pos+24)),a.u64(0n),a.u64(0n),a.u32(0),a.u32(4),ke(a,"class","unknown"),ke(a,"file_compression","none"),Zt(a,"is_saved_as_half_float",!0),ke(a,"name","density");const r=n/t;return a.name("AffineMap"),a.f64(r),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(r),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(r),a.f64(0),a.f64(o[0]),a.f64(o[1]),a.f64(o[2]),a.f64(1),Oo(a,e),a.result()}function Zn(e,t,o,n,s){let i=0;e.n4map.forEach(function(m){i+=m.leafMap.size});let a=0;t.n4map.forEach(function(m){a+=m.leafMap.size});const r=2e5+i*1200+e.n4map.size*1e4+2e5+a*7200+t.n4map.size*6e4,l=new ko(Math.max(r,2*1024*1024));return l.raw(new Uint8Array([32,66,68,86,0,0,0,0])),l.u32(224),l.u32(8),l.u32(1),l.u8(0),l.str("d2b59639-ac2f-4047-9c50-9648f951180c"),l.u32(0),l.u32(2),l.name("density"),l.name("Tree_float_5_4_3_HalfFloat"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Hn(l,e,"density",o,n,s),l.name("Cd"),l.name("Tree_vec3s_5_4_3"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Yn(l,t,"Cd",o,n,s),l.result()}function Wn(e,t,o){return{formula:e.id,pipelineRevision:0,quality:o?{estimator:o.estimator??0,distanceMetric:o.distanceMetric??0}:void 0,interlace:t?{interlaceCompiled:!0,interlaceFormula:t.definition.id,interlaceEnabled:t.enabled,interlaceInterval:t.interval,interlaceStartIter:t.startIter,interlaceParamA:0,interlaceParamB:0,interlaceParamC:0,interlaceParamD:0,interlaceParamE:0,interlaceParamF:0,interlaceVec2A:{x:0,y:0},interlaceVec2B:{x:0,y:0},interlaceVec2C:{x:0,y:0},interlaceVec3A:{x:0,y:0,z:0},interlaceVec3B:{x:0,y:0,z:0},interlaceVec3C:{x:0,y:0,z:0}}:void 0}}function at(e,t,o){const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0);const s=h=>h?[h.x??h[0]??0,h.y??h[1]??0]:[0,0],i=h=>h?[h.x??h[0]??0,h.y??h[1]??0,h.z??h[2]??0]:[0,0,0],a=h=>h?[h.x??h[0]??0,h.y??h[1]??0,h.z??h[2]??0,h.w??h[3]??0]:[0,0,0,0],r=s(n.vec2A);t.uVec2A&&e.uniform2f(t.uVec2A,r[0],r[1]);const l=s(n.vec2B);t.uVec2B&&e.uniform2f(t.uVec2B,l[0],l[1]);const m=s(n.vec2C);t.uVec2C&&e.uniform2f(t.uVec2C,m[0],m[1]);const v=i(n.vec3A);t.uVec3A&&e.uniform3f(t.uVec3A,v[0],v[1],v[2]);const d=i(n.vec3B);t.uVec3B&&e.uniform3f(t.uVec3B,d[0],d[1],d[2]);const f=i(n.vec3C);t.uVec3C&&e.uniform3f(t.uVec3C,f[0],f[1],f[2]);const x=a(n.vec4A);t.uVec4A&&e.uniform4f(t.uVec4A,x[0],x[1],x[2],x[3]);const g=a(n.vec4B);t.uVec4B&&e.uniform4f(t.uVec4B,g[0],g[1],g[2],g[3]);const M=a(n.vec4C);if(t.uVec4C&&e.uniform4f(t.uVec4C,M[0],M[1],M[2],M[3]),t.uJulia){const h=n.julia;Array.isArray(h)?e.uniform3f(t.uJulia,h[0]??0,h[1]??0,h[2]??0):h&&typeof h=="object"?e.uniform3f(t.uJulia,h.x??0,h.y??0,h.z??0):e.uniform3f(t.uJulia,0,0,0)}t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode?1:0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??10),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}function st(e,t,o){if(!o){t.uInterlaceEnabled&&e.uniform1f(t.uInterlaceEnabled,0);return}t.uInterlaceEnabled&&e.uniform1f(t.uInterlaceEnabled,o.enabled?1:0),t.uInterlaceInterval&&e.uniform1f(t.uInterlaceInterval,o.interval??2),t.uInterlaceStartIter&&e.uniform1f(t.uInterlaceStartIter,o.startIter??0);const n=o.params||{},s=h=>h?[h.x??h[0]??0,h.y??h[1]??0]:[0,0],i=h=>h?[h.x??h[0]??0,h.y??h[1]??0,h.z??h[2]??0]:[0,0,0],a=h=>h?[h.x??h[0]??0,h.y??h[1]??0,h.z??h[2]??0,h.w??h[3]??0]:[0,0,0,0];t.uInterlaceParamA&&e.uniform1f(t.uInterlaceParamA,n.paramA??0),t.uInterlaceParamB&&e.uniform1f(t.uInterlaceParamB,n.paramB??0),t.uInterlaceParamC&&e.uniform1f(t.uInterlaceParamC,n.paramC??0),t.uInterlaceParamD&&e.uniform1f(t.uInterlaceParamD,n.paramD??0),t.uInterlaceParamE&&e.uniform1f(t.uInterlaceParamE,n.paramE??0),t.uInterlaceParamF&&e.uniform1f(t.uInterlaceParamF,n.paramF??0);const r=s(n.vec2A);t.uInterlaceVec2A&&e.uniform2f(t.uInterlaceVec2A,r[0],r[1]);const l=s(n.vec2B);t.uInterlaceVec2B&&e.uniform2f(t.uInterlaceVec2B,l[0],l[1]);const m=s(n.vec2C);t.uInterlaceVec2C&&e.uniform2f(t.uInterlaceVec2C,m[0],m[1]);const v=i(n.vec3A);t.uInterlaceVec3A&&e.uniform3f(t.uInterlaceVec3A,v[0],v[1],v[2]);const d=i(n.vec3B);t.uInterlaceVec3B&&e.uniform3f(t.uInterlaceVec3B,d[0],d[1],d[2]);const f=i(n.vec3C);t.uInterlaceVec3C&&e.uniform3f(t.uInterlaceVec3C,f[0],f[1],f[2]);const x=a(n.vec4A);t.uInterlaceVec4A&&e.uniform4f(t.uInterlaceVec4A,x[0],x[1],x[2],x[3]);const g=a(n.vec4B);t.uInterlaceVec4B&&e.uniform4f(t.uInterlaceVec4B,g[0],g[1],g[2],g[3]);const M=a(n.vec4C);t.uInterlaceVec4C&&e.uniform4f(t.uInterlaceVec4C,M[0],M[1],M[2],M[3])}function lo(e,t,o,n){const s=e.createShader(t);if(!s)throw new Error("Failed to create shader");if(e.shaderSource(s,o),e.compileShader(s),!e.getShaderParameter(s,e.COMPILE_STATUS)){const i=e.getShaderInfoLog(s)||"",a=t===e.VERTEX_SHADER?"vertex":"fragment";n("Shader compile error ("+a+"): "+i,"error");const r=o.split(`
`),l=i.match(/\d+:\d+/g)||[];for(let m=0;m<Math.min(l.length,5);m++){const v=parseInt(l[m].split(":")[1])-1;v>=0&&v<r.length&&n("  Line "+(v+1)+": "+r[v].trim(),"error")}throw new Error("Shader compile: "+i.split(`
`)[0])}return s}function rt(e,t,o,n){const s=e.createProgram();if(!s)throw new Error("Failed to create program");if(e.attachShader(s,lo(e,e.VERTEX_SHADER,t,n)),e.attachShader(s,lo(e,e.FRAGMENT_SHADER,o,n)),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS)){const i=e.getProgramInfoLog(s)||"";throw n("Program link error: "+i,"error"),new Error("Program link: "+i)}return s}function xt(){const e=document.createElement("canvas");e.width=2048,e.height=2048;const t=e.getContext("webgl2",{antialias:!1});if(!t)throw new Error("WebGL2 not supported");return t.getExtension("EXT_color_buffer_float"),t.getExtension("OES_texture_float_linear"),t}function Wt(e,t){const o={};for(let n=0;n<Ye.length;n++)o[Ye[n]]=e.getUniformLocation(t,Ye[n]);return o}function We(e,t,o,n,s,i,a){Oe.register(o),i&&Oe.register(i.definition);const r=Pn.generateMeshSDFLibrary(Wn(o,i,a)),l=n,m=`#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
uniform float uSurfaceThreshold;
out vec4 fragColor;

${r}

void main() {
  float voxelSize = uBoundsRange * uInvRes;
  vec3 center = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

  const int SS = ${l};
  const int TOTAL = SS * SS * SS;
  float step = 1.0 / float(SS);
  float halfStep = step * 0.5;
  float h = voxelSize * 0.5;

  float sumDist = 0.0;
  int insideCount = 0;
  int outsideCount = 0;
  float minOutsideDist = 1e10;
  float thresh = uSurfaceThreshold;

  float jx = fract(sin(dot(center.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float jy = fract(sin(dot(center.yz, vec2(93.989, 67.345))) * 23421.6312);
  float jz = fract(sin(dot(center.xz, vec2(45.164, 38.927))) * 61532.2847);
  float jitter = h * step * 0.3;

  for (int sz = 0; sz < ${l}; sz++) {
    for (int sy = 0; sy < ${l}; sy++) {
      for (int sx = 0; sx < ${l}; sx++) {
        vec3 p = center + h * vec3(
          (float(sx) * step + halfStep) * 2.0 - 1.0,
          (float(sy) * step + halfStep) * 2.0 - 1.0,
          (float(sz) * step + halfStep) * 2.0 - 1.0
        );
        p += vec3(jx - 0.5, jy - 0.5, jz - 0.5) * jitter;

        float d = formulaDE(p);
        if (d < thresh) {
          insideCount++;
        } else {
          outsideCount++;
          minOutsideDist = min(minOutsideDist, d - thresh);
          sumDist += d - thresh;
        }
      }
    }
  }

  float sdf;
  if (insideCount == 0) {
    sdf = sumDist / float(TOTAL);
  } else if (outsideCount == 0) {
    sdf = -voxelSize * (1.0 + float(insideCount) / float(TOTAL) * 0.25);
  } else {
    float ratio = float(outsideCount) / float(TOTAL);
    sdf = mix(-minOutsideDist, minOutsideDist, ratio);
  }

  fragColor = vec4(sdf, 0.0, 0.0, 1.0);
}`,v=rt(e,Je,m,s);e.useProgram(v);const d=e.createTexture();e.bindTexture(e.TEXTURE_2D,d),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,t,t);const f=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,f),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,d,0),e.viewport(0,0,t,t),e.bindVertexArray(e.createVertexArray());const x=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...Ye],g={};for(let M=0;M<x.length;M++)g[x[M]]=e.getUniformLocation(v,x[M]);return{prog:v,loc:g,fbo:f,tex:d}}function it(e,t,o,n,s,i,a,r,l,m){e.useProgram(t.prog),e.uniform1f(t.loc.uPower,n),e.uniform1i(t.loc.uIters,s),e.uniform1f(t.loc.uInvRes,1/o),e.uniform3f(t.loc.uBoundsMin,i[0],i[1],i[2]),e.uniform1f(t.loc.uBoundsRange,a),t.loc.uSurfaceThreshold&&e.uniform1f(t.loc.uSurfaceThreshold,m??0),at(e,t.loc,r),st(e,t.loc,l),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo)}async function Uo(e,t,o,n,s,i,a,r,l,m,v,d,f){const{log:x,setPhase:g,setStatus:M,tick:h}=m,F=128,p=r[0]-a[0];let y=0,w=n-1;if(n>F){x("Coarse pre-pass: sampling "+F+"³ to detect Z range...","info"),g("Coarse Pre-pass",0),M("Coarse pre-pass ("+F+"³)..."),await h();const V=We(e,F,t,1,x,v,d);it(e,V,F,s,i,a,p,o,v,f),e.viewport(0,0,F,F);const k=new Float32Array(F*F*4);let R=F,D=-1;for(let N=0;N<F;N++){e.uniform1f(V.loc.uZ,(N+.5)/F),e.uniform2f(V.loc.uTileOffset,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,F,F,e.RGBA,e.FLOAT,k);let u=!1;for(let c=0;c<F*F;c++)if(k[c*4]<l*3){u=!0;break}u&&(N<R&&(R=N),D=N)}if(e.deleteTexture(V.tex),e.deleteFramebuffer(V.fbo),e.deleteProgram(V.prog),D>=R){const u=n/F;y=Math.max(0,Math.floor((R-2)*u)),w=Math.min(n-1,Math.ceil((D+2+1)*u)),y=y&-8,w=Math.min(n-1,w|7);const c=(100*(1-(w-y+1)/n)).toFixed(0);x("Coarse pre-pass: data in Z ["+R+","+D+"] of "+F+" → fine Z ["+y+","+w+"] of "+n+" (skipping "+c+"% of slices)","data")}else x("Coarse pre-pass: no data found — sampling all slices","warn");g("Coarse Pre-pass",100)}return{zSliceMin:y,zSliceMax:w}}function Vo(e,t,o,n,s,i,a,r,l){function m(v,d){if(e.useProgram(t.prog),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo),e.uniform1f(t.loc.uZ,v),o<=n){e.uniform2f(t.loc.uTileOffset,0,0),e.viewport(0,0,o,o),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,o,o,e.RGBA,e.FLOAT,s);for(let f=0;f<o*o;f++)d[f]=s[f*4]}else for(let f=0;f<o;f+=n)for(let x=0;x<o;x+=n){const g=Math.min(n,o-x),M=Math.min(n,o-f);e.uniform2f(t.loc.uTileOffset,x,f),e.viewport(0,0,g,M),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,g,M,e.RGBA,e.FLOAT,s);for(let h=0;h<M;h++)for(let F=0;F<g;F++)d[(f+h)*o+(x+F)]=s[(h*g+F)*4]}}if(!r||r<=1)m((a+.5)/o,i);else{i.fill(0);const v=1/r;for(let d=0;d<r;d++){const f=(a+(d+.5)*v)/o;m(f,l);for(let x=0;x<o*o;x++)i[x]+=l[x]}for(let d=0;d<o*o;d++)i[d]*=v}}function No(e,t,o,n){const s=t/n,i=new ImageData(n,n);for(let a=0;a<n;a++){const r=Math.min(Math.round(a*s),t-1);for(let l=0;l<n;l++){const m=Math.min(Math.round(l*s),t-1),v=e[r*t+m],d=Math.abs(v),f=d<o*2?Math.round(255*(1-d/(o*2))):0,x=v<0?50:0,g=(a*n+l)*4;i.data[g]=f+x,i.data[g+1]=v<0?30:f,i.data[g+2]=f,i.data[g+3]=255}}return i}async function co(e,t,o,n,s,i,a,r,l,m,v,d,f,x,g,M){const{setProgress:h,setPhase:F,setStatus:p,tick:y,log:w,onSlicePreview:V}=x,k=Math.min(o,2048),R=r[0]-a[0];(!v||v<1)&&(v=1),d==null&&(d=0),f==null&&(f=o-1),it(e,t,o,n,s,a,R,i,g,M),e.viewport(0,0,k,k);const D=new Float32Array(k*k*4),N=new Float32Array(o*o*o),u=R/o,c=new Float32Array(o*o),_=v>1?new Float32Array(o*o):null,P=Math.min(o,512);(d>0||f<o-1)&&N.fill(1),v>1&&w("Z sub-slicing: "+v+" sub-samples per voxel layer (smooths Z-axis banding)","info");const B=f-d+1;let z=0;for(let T=d;T<=f;T++){if(Vo(e,t,o,k,D,c,T,v,_),N.set(c,T*o*o),V){const U=No(c,o,u,P);V(U,P,P)}z++,h(l+Math.round(z/B*m)),F("SDF Sampling",Math.round(z/B*100)),z&3||(p("Sampling SDF... slice "+z+"/"+B),await y())}return N}function Jn(e,t,o,n,s,i,a,r,l){const m=a/l,v=new ImageData(l,l);for(let d=0;d<l;d++){const f=Math.round(d*m);for(let x=0;x<l;x++){const g=Math.round(x*m),M=(d*l+x)*4;if(g>=t&&g<n&&f>=o&&f<s){const h=((f-o)*i+(g-t))*4,F=e[h],p=Math.abs(F),y=p<r*2?Math.round(255*(1-p/(r*2))):0,w=F<0?50:0;v.data[M]=y+w,v.data[M+1]=F<0?30:y,v.data[M+2]=y}else v.data[M]=15,v.data[M+1]=15,v.data[M+2]=20;v.data[M+3]=255}}return v}async function Qn(e,t,o,n,s,i,a,r,l,m,v,d,f){const{setProgress:x,setPhase:g,setStatus:M,tick:h,onSlicePreview:F}=v,p=o.N,y=o.blockSize,w=Math.min(p,2048),V=r[0]-a[0];it(e,t,p,n,s,a,V,i,d,f),e.viewport(0,0,w,w);const k=new Map;qt(o,(P,B,z,T,U,I)=>{for(let C=0;C<y;C++){const L=I+C;if(L>=p)continue;let A=k.get(L);A||(A={entries:[],minX:T,minY:U,maxX:T+y,maxY:U+y},k.set(L,A)),A.entries.push({startX:T,startY:U}),T<A.minX&&(A.minX=T),U<A.minY&&(A.minY=U),T+y>A.maxX&&(A.maxX=T+y),U+y>A.maxY&&(A.maxY=U+y)}});const R=Array.from(k.keys()).sort((P,B)=>P-B);let D=0;for(let P=0;P<R.length;P++){const B=k.get(R[P]),z=Math.min(p,B.maxX)-Math.max(0,B.minX),T=Math.min(p,B.maxY)-Math.max(0,B.minY),U=z*T*4;U>D&&(D=U)}const N=new Float32Array(D),u=Math.min(p,512),c=V/p;let _=0;for(let P=0;P<R.length;P++){const B=R[P],z=k.get(B);e.uniform1f(t.loc.uZ,(B+.5)/p);const T=Math.max(0,z.minX),U=Math.max(0,z.minY),I=Math.min(p,z.maxX),C=Math.min(p,z.maxY),L=I-T,A=C-U;e.uniform2f(t.loc.uTileOffset,T,U),e.viewport(0,0,L,A),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,L,A,e.RGBA,e.FLOAT,N);const O=z.entries;for(let S=0;S<O.length;S++){const E=O[S];for(let G=0;G<y;G++){const H=E.startX+G;if(!(H<T||H>=I))for(let X=0;X<y;X++){const $=E.startY+X;if($<U||$>=C)continue;const j=(($-U)*L+(H-T))*4;o.set(H,$,B,N[j])}}}if(_++,!(_&7)){if(F){const S=Jn(N,T,U,I,C,L,p,c,u);F(S,u,u)}x(l+Math.round(_/R.length*m)),g("Fine SDF Sampling",Math.round(_/R.length*100)),M("Sampling fine SDF... slice "+_+"/"+R.length+" (narrow-band)"),await h()}}return o}async function Kn(e,t,o,n,s,i,a,r,l,m,v,d,f,x,g,M){const{log:h,setProgress:F,setPhase:p,setStatus:y,tick:w,onSlicePreview:V}=d,k=r[0]-a[0],R=k/n,D=8,N=n/D|0,u=Math.min(n,2048);(!v||v<1)&&(v=1);const c=await Uo(e,t,o,n,s,i,a,r,R,d,f,x,g),{zSliceMin:_,zSliceMax:P}=c,B=We(e,u,t,m||1,h,f,x);it(e,B,n,s,i,a,k,o,f,g);const z=new Float32Array(u*u*4),T=kn();let U=0;const I=new Array(D);for(let X=0;X<D;X++)I[X]=new Float32Array(n*n);const C=v>1?new Float32Array(n*n):null,L=Math.min(n,512),A=P-_+1;let O=0;v>1&&h("Z sub-slicing: "+v+" sub-samples per voxel layer (smooths Z-axis banding)","info");for(let X=_;X<=P;X++){const $=I[X%D];if(Vo(e,B,n,u,z,$,X,v,C),X%D===D-1){const j=X/D|0;for(let W=0;W<N;W++)for(let oe=0;oe<N;oe++){const ne=new Uint8Array(512);let Z=!1;for(let re=0;re<D;re++){const le=I[re];for(let ie=0;ie<D;ie++)for(let ce=0;ce<D;ce++){const J=oe*D+ce,q=W*D+ie,se=le[q*n+J],K=re|ie<<3|ce<<6;let ee;se<0?ee=255:ee=Math.round(Math.max(0,Math.min(255,255*(1-se/(R*2.5))))),ne[K]=ee,ee>0&&(Z=!0)}}Z&&(U+=jn(T,oe,W,j,ne))}}if(O++,!(O&7)){const j=Math.round(O/A*80);if(F(j),p("VDB Sampling",Math.round(O/A*100)),y("VDB sampling slice "+O+"/"+A+(_>0||P<n-1?" (Z "+_+"–"+P+")":"")),V){const W=No(I[X%D],n,R,L);V(W,L,L)}await w()}}if(e.deleteTexture(B.tex),e.deleteFramebuffer(B.fbo),e.deleteProgram(B.prog),d.memAlloc){let X=0;T.n4map.forEach(j=>{X+=j.leafMap.size});const $=Math.round((X*1.1+T.n4map.size*10)/1024);d.memAlloc("vdbDensity","VDB Density",$,"#8c6")}let S=null;if(M){p("VDB Color",0),y("Sampling voxel colors..."),h("Color pass: sampling orbit-trap colors for active voxels","phase");let X=0;if(T.n4map.forEach($=>{$.leafMap.forEach(j=>{for(let W=0;W<8;W++){let oe=j.mask[W];for(;oe!==0n;)oe&=oe-1n,X++}})}),h("Color pass: "+X.toLocaleString()+" active voxels to colorize","data"),X>0){const $=Vn(),j=Math.min(e.getParameter(e.MAX_TEXTURE_SIZE),2048),W=j*j,oe=Io({definition:t,interlace:f}),ne=rt(e,Je,oe,h),Z=Wt(e,ne),re=e.createVertexArray(),le=e.getUniformLocation(ne,"uPositions"),ie=e.getUniformLocation(ne,"uPower"),ce=e.getUniformLocation(ne,"uIters"),J=e.getUniformLocation(ne,"uWidth"),q=e.getUniformLocation(ne,"uJitterOffset"),se=[];T.n4map.forEach((xe,he)=>{xe.leafMap.forEach((Ce,Fe)=>{se.push(he,Fe)})});const K=se.length>>1,ee=Math.ceil(Math.sqrt(W)),Q=Math.ceil(W/ee),te=ee*Q,fe=new Float32Array(te*4),pe=new Uint8Array(te*4),ve=new Uint16Array(W),Te=new Uint32Array(W),Ae=new Uint8Array(512),Se=new Uint8Array(512),ue=new Uint8Array(512);let ge=0,Ie=0;for(;Ie<K;){let xe=0,he=Ie;for(;he<K&&xe+512<=W;){const Re=se[he*2],je=se[he*2+1],Ke=T.n4map.get(Re).leafMap.get(je),Mt=(Re>>10&31)<<7,Tt=(Re>>5&31)<<7,Ft=(Re&31)<<7,Et=(je>>8&15)<<3,Pt=(je>>4&15)<<3,At=(je&15)<<3,It=Mt+Et,Rt=Tt+Pt,Dt=Ft+At;for(let Ee=0;Ee<512;Ee++){if((Ke.mask[Ee>>6]&1n<<BigInt(Ee&63))===0n)continue;const Xo=Ee&7,Ho=Ee>>3&7,Yo=Ee>>6&7;fe[xe*4]=a[0]+(It+Yo+.5)*R,fe[xe*4+1]=a[1]+(Rt+Ho+.5)*R,fe[xe*4+2]=a[2]+(Dt+Xo+.5)*R,fe[xe*4+3]=1,ve[xe]=Ee,Te[xe]=he,xe++}he++}const Ce=xe;if(Ce===0){Ie=he;continue}const Fe=Math.ceil(Math.sqrt(Ce)),Le=Math.ceil(Ce/Fe);e.useProgram(ne);const $e=e.createTexture();e.bindTexture(e.TEXTURE_2D,$e),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,Fe,Le,0,e.RGBA,e.FLOAT,fe.subarray(0,Fe*Le*4)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const Ge=e.createTexture();e.bindTexture(e.TEXTURE_2D,Ge),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA8,Fe,Le);const Qe=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,Qe),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Ge,0),e.viewport(0,0,Fe,Le),e.bindVertexArray(re),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,$e),e.uniform1i(le,0),e.uniform1f(ie,s),e.uniform1i(ce,i),e.uniform1i(J,Fe),e.uniform3f(q,0,0,0),at(e,Z,o),st(e,Z,f),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,Fe,Le,e.RGBA,e.UNSIGNED_BYTE,pe),e.deleteTexture($e),e.deleteTexture(Ge),e.deleteFramebuffer(Qe);let _e=0;for(let Re=Ie;Re<he;Re++){if(_e>=Ce||Te[_e]!==Re)continue;const je=se[Re*2],Ke=se[Re*2+1],Mt=(je>>10&31)<<7,Tt=(je>>5&31)<<7,Ft=(je&31)<<7,Et=(Ke>>8&15)<<3,Pt=(Ke>>4&15)<<3,At=(Ke&15)<<3,It=Mt+Et>>3,Rt=Tt+Pt>>3,Dt=Ft+At>>3;for(Ae.fill(0),Se.fill(0),ue.fill(0);_e<Ce&&Te[_e]===Re;){const Ee=ve[_e];Ae[Ee]=pe[_e*4],Se[Ee]=pe[_e*4+1],ue[Ee]=pe[_e*4+2],_e++}$n($,It,Rt,Dt,Ae,Se,ue)}ge+=Ce,Ie=he;const Qt=Math.round(ge/X*100);F(80+Math.round(Qt*.12)),p("VDB Color",Qt),y("Color pass: "+ge.toLocaleString()+"/"+X.toLocaleString()+" voxels"),await w()}if(e.deleteProgram(ne),e.deleteVertexArray(re),Gn($),S=$,d.memAlloc){let xe=0;$.n4map.forEach(Ce=>{xe+=Ce.leafMap.size});const he=Math.round((xe*6.2+$.n4map.size*60)/1024);d.memAlloc("vdbColor","VDB Color",he,"#e6a")}h("Color pass complete: Cd vec3s grid built","success")}p("VDB Color",100),await w()}F(92),p("VDB Optimize",0),y("Optimizing VDB tree...");const E=Un(T);F(95),p("VDB Serialize",50),y("Serializing VDB..."),await w();let G=0;T.n4map.forEach(X=>{G+=X.leafMap.size});let H;if(S?H=Zn(T,S,n,a,k):H=qn(T,n,a,k),d.memFree&&(d.memFree("vdbDensity"),S&&d.memFree("vdbColor")),d.memAlloc){const X=Math.round(H.byteLength/1048576);d.memAlloc("vdbBlob","VDB File",X,"#5af")}return F(100),p("VDB Complete",100),{blob:new Blob([H.buffer.slice(H.byteOffset,H.byteOffset+H.byteLength)],{type:"application/octet-stream"}),voxelCount:U,leafCount:G,promoted:E,zRange:[_,P],skippedSlices:n-A}}async function ea(e,t,o,n,s,i,a,r,l,m,v){const{log:d,tick:f}=l,x=t.N,g=t.blockSize,M=t.blocksPerAxis,h=Math.min(x,2048),F=r[0]-a[0],p=t.blockCellCount+7>>3,y=hn({definition:o,interlace:v}),w=rt(e,Je,y,d);e.useProgram(w);const V=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...Ye],k={};for(let z=0;z<V.length;z++)k[V[z]]=e.getUniformLocation(w,V[z]);const R=e.createTexture();e.bindTexture(e.TEXTURE_2D,R),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,h,h);const D=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,D),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,R,0),e.uniform1f(k.uPower,n),e.uniform1i(k.uIters,s),e.uniform1f(k.uInvRes,1/x),e.uniform3f(k.uBoundsMin,a[0],a[1],a[2]),e.uniform1f(k.uBoundsRange,F),at(e,k,i),st(e,k,v),e.bindVertexArray(e.createVertexArray());const N=new Map;qt(t,(z,T,U,I,C,L)=>{for(let A=0;A<g;A++){const O=L+A;if(O>=x)continue;let S=N.get(O);S||(S={entries:[],minX:I,minY:C,maxX:I+g,maxY:C+g},N.set(O,S)),S.entries.push({startX:I,startY:C}),I<S.minX&&(S.minX=I),C<S.minY&&(S.minY=C),I+g>S.maxX&&(S.maxX=I+g),C+g>S.maxY&&(S.maxY=C+g)}});const u=Array.from(N.keys()).sort((z,T)=>z-T);let c=0;for(let z=0;z<u.length;z++){const T=N.get(u[z]),U=Math.min(x,T.maxX)-Math.max(0,T.minX),I=Math.min(x,T.maxY)-Math.max(0,T.minY);U*I*4>c&&(c=U*I*4)}const _=new Float32Array(c),P=new Map;t.blocks.forEach((z,T)=>{P.set(T,new Uint8Array(p))});let B=0;for(let z=0;z<u.length;z++){const T=u[z],U=N.get(T);e.uniform1f(k.uZ,(T+.5)/x);const I=Math.max(0,U.minX),C=Math.max(0,U.minY),L=Math.min(x,U.maxX),A=Math.min(x,U.maxY),O=L-I,S=A-C;e.uniform2f(k.uTileOffset,I,C),e.viewport(0,0,O,S),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,O,S,e.RGBA,e.FLOAT,_);const E=U.entries;for(let G=0;G<E.length;G++){const H=E[G],X=H.startX/g|0,$=H.startY/g|0,j=T/g|0,W=(j*M+$)*M+X,oe=P.get(W);if(!oe)continue;const ne=T-j*g;for(let Z=0;Z<g;Z++){const re=H.startX+Z;if(!(re<I||re>=L))for(let le=0;le<g;le++){const ie=H.startY+le;if(ie<C||ie>=A)continue;const ce=((ie-C)*O+(re-I))*4;if(_[ce]>.5){const J=(ne*g+le)*g+Z;oe[J>>3]|=1<<(J&7),B++}}}}!(z&7)&&m&&(m(Math.round(z/u.length*100)),await f())}return e.deleteTexture(R),e.deleteFramebuffer(D),e.deleteProgram(w),{escapeMap:P,solidCount:B}}function ta(e,t,o,n,s,i,a,r,l,m){r||(r=6);const v=t.vertexCount,d=Math.ceil(Math.sqrt(v)),f=Math.ceil(v/d),x=new Float32Array(d*f*4);for(let R=0;R<v;R++)x[R*4]=t.positions[R*3],x[R*4+1]=t.positions[R*3+1],x[R*4+2]=t.positions[R*3+2],x[R*4+3]=1;const g=e.createTexture();e.bindTexture(e.TEXTURE_2D,g),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,d,f,0,e.RGBA,e.FLOAT,x),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const M=e.createTexture();e.bindTexture(e.TEXTURE_2D,M),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,d,f);const h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,d,f);const F=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,F),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,M,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,h,0),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]);const p=vn({definition:o,deType:"auto",interlace:m}),y=rt(e,Je,p,l);e.useProgram(y),e.viewport(0,0,d,f),e.bindVertexArray(e.createVertexArray()),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,g),e.uniform1i(e.getUniformLocation(y,"uPositions"),0),e.uniform1f(e.getUniformLocation(y,"uPower"),s),e.uniform1i(e.getUniformLocation(y,"uIters"),i),e.uniform1f(e.getUniformLocation(y,"uVoxelSize"),a),e.uniform1i(e.getUniformLocation(y,"uNewtonSteps"),r);const w=Wt(e,y);at(e,w,n),st(e,w,m),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readBuffer(e.COLOR_ATTACHMENT0);const V=new Float32Array(d*f*4);e.readPixels(0,0,d,f,e.RGBA,e.FLOAT,V),e.readBuffer(e.COLOR_ATTACHMENT1);const k=new Float32Array(d*f*4);e.readPixels(0,0,d,f,e.RGBA,e.FLOAT,k);for(let R=0;R<v;R++)t.positions[R*3]=V[R*4],t.positions[R*3+1]=V[R*4+1],t.positions[R*3+2]=V[R*4+2],t.normals[R*3]=k[R*4],t.normals[R*3+1]=k[R*4+1],t.normals[R*3+2]=k[R*4+2];return e.deleteTexture(g),e.deleteTexture(M),e.deleteTexture(h),e.deleteFramebuffer(F),e.deleteProgram(y),t}async function oa(e,t,o,n,s,i,a,r,l,m){const{log:v,setProgress:d,setPhase:f,setStatus:x,tick:g}=l;(!a||a<1)&&(a=1),r||(r=0);const M=t.vertexCount,h=Math.ceil(Math.sqrt(M)),F=Math.ceil(M/h);v("Color texture: "+h+"x"+F+" ("+(h*F*16/(1024*1024)).toFixed(0)+" MB position data)"+(a>1?" | "+a+" samples, radius="+r.toFixed(5):""),"mem");let p=new Float32Array(h*F*4);for(let _=0;_<M;_++)p[_*4]=t.positions[_*3],p[_*4+1]=t.positions[_*3+1],p[_*4+2]=t.positions[_*3+2],p[_*4+3]=1;const y=Io({definition:o,interlace:m}),w=rt(e,Je,y,v);e.useProgram(w);const V=e.createTexture();e.bindTexture(e.TEXTURE_2D,V),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,h,F,0,e.RGBA,e.FLOAT,p),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),p=null;const k=a>1,R=e.createTexture();e.bindTexture(e.TEXTURE_2D,R),e.texStorage2D(e.TEXTURE_2D,1,k?e.RGBA32F:e.RGBA8,h,F);const D=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,D),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,R,0),e.viewport(0,0,h,F),e.bindVertexArray(e.createVertexArray());const N=Wt(e,w),u=e.getUniformLocation(w,"uJitterOffset");if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,V),e.uniform1i(e.getUniformLocation(w,"uPositions"),0),e.uniform1f(e.getUniformLocation(w,"uPower"),s),e.uniform1i(e.getUniformLocation(w,"uIters"),i),e.uniform1i(e.getUniformLocation(w,"uWidth"),h),at(e,N,n),st(e,N,m),a<=1)e.uniform3f(u,0,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4);else{e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);const _=Math.PI*(3-Math.sqrt(5));for(let P=0;P<a;P++){const B=Math.acos(1-2*(P+.5)/a),z=_*P,T=r*Math.cbrt((P+.5)/a),U=T*Math.sin(B)*Math.cos(z),I=T*Math.sin(B)*Math.sin(z),C=T*Math.cos(B);if(e.uniform3f(u,U,I,C),e.drawArrays(e.TRIANGLE_STRIP,0,4),!(P&3)||P===a-1){const L=Math.round((P+1)/a*100);d(80+Math.round((P+1)/a*10)),f("Phase 5: Vertex Coloring",L),x("Color sample "+(P+1)+"/"+a),await g()}}e.disable(e.BLEND)}const c=new Uint8Array(M*4);if(k){const _=new Float32Array(h*F*4);e.readPixels(0,0,h,F,e.RGBA,e.FLOAT,_);const P=1/a;for(let B=0;B<M;B++)c[B*4]=Math.min(255,Math.round(_[B*4]*P*255)),c[B*4+1]=Math.min(255,Math.round(_[B*4+1]*P*255)),c[B*4+2]=Math.min(255,Math.round(_[B*4+2]*P*255)),c[B*4+3]=255}else{const _=new Uint8Array(h*F*4);e.readPixels(0,0,h,F,e.RGBA,e.UNSIGNED_BYTE,_);for(let P=0;P<M;P++)c[P*4]=_[P*4],c[P*4+1]=_[P*4+1],c[P*4+2]=_[P*4+2],c[P*4+3]=255}return e.deleteTexture(V),e.deleteTexture(R),e.deleteFramebuffer(D),e.deleteProgram(w),c}async function na(e,t,o,n,s,i,a){var g;const r=xt(),l=64,m=6,v=[-m/2,-m/2,-m/2],d=m,f=d/l,x=a??0;try{const M=We(r,l,e,1,()=>{},s,i);it(r,M,l,n,o,v,d,t,s,x),r.viewport(0,0,l,l);const h=new Float32Array(l*l*4);let F=1/0,p=1/0,y=1/0,w=-1/0,V=-1/0,k=-1/0,R=!1;for(let P=0;P<l;P++){r.uniform1f(M.loc.uZ,(P+.5)/l),r.uniform2f(M.loc.uTileOffset,0,0),r.drawArrays(r.TRIANGLE_STRIP,0,4),r.readPixels(0,0,l,l,r.RGBA,r.FLOAT,h);const B=v[2]+(P+.5)*f;for(let z=0;z<l;z++)for(let T=0;T<l;T++)if(h[(z*l+T)*4]<f*2){const I=v[0]+(T+.5)*f,C=v[1]+(z+.5)*f;I<F&&(F=I),I>w&&(w=I),C<p&&(p=C),C>V&&(V=C),B<y&&(y=B),B>k&&(k=B),R=!0}}if(r.deleteTexture(M.tex),r.deleteFramebuffer(M.fbo),r.deleteProgram(M.prog),!R)return null;const D=.15,N=(w-F)*(1+D),u=(V-p)*(1+D),c=(k-y)*(1+D),_=Math.max(N,u,c,.5);return{center:[(F+w)/2,(p+V)/2,(y+k)/2],size:[_,_,_]}}finally{(g=r.getExtension("WEBGL_lose_context"))==null||g.loseContext()}}function aa(){const e=Y(d=>d.bboxCenter),t=Y(d=>d.bboxSize),o=Y(d=>d.setBboxCenter),n=Y(d=>d.setBboxSize),s=Y(d=>d.resetBounds),[i,a]=de.useState(!1),r=d=>{o([d.x,d.y,d.z??0])},l=de.useMemo(()=>new Ne(t[0],t[1],t[2]),[t[0],t[1],t[2]]),m=de.useCallback(d=>{n([d.x,d.y,d.z])},[n]),v=async()=>{const d=Y.getState(),f=d.loadedDefinition||Oe.get(d.selectedFormulaId);if(f){a(!0);try{let x;d.interlaceState&&(x={definition:d.interlaceState.definition,params:d.interlaceState.params,enabled:d.interlaceState.enabled,interval:d.interlaceState.interval,startIter:d.interlaceState.startIter});const g=d.qualitySettings,M={estimator:g.estimator,distanceMetric:g.distanceMetric},h=await na(f,d.formulaParams,d.iters,d.formulaParams.paramA||8,x,M,g.surfaceThreshold);h&&(o(h.center),n(h.size))}catch(x){console.error("Auto-fit failed:",x)}finally{a(!1)}}};return b.jsxs("div",{className:"flex flex-col gap-px mt-1",children:[b.jsx(Ut,{label:"Center",value:{x:e[0],y:e[1],z:e[2]},onChange:r,axisConfig:{min:-100,max:100,step:.1},showDualAxisPads:!1}),b.jsx(Jo,{label:"Size",value:l,onChange:m,min:.1,max:100,step:.1,showDualAxisPads:!1,linkable:!0}),b.jsxs("div",{className:"flex items-center gap-2 mt-1 px-0.5",children:[b.jsx("button",{onClick:s,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-300 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Reset"}),b.jsx("button",{onClick:v,disabled:i,className:"text-[10px] px-2 py-0.5 bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 rounded-sm hover:bg-emerald-800/40 cursor-pointer disabled:opacity-50 disabled:cursor-default",children:i?"Fitting...":"Auto-fit"}),b.jsxs("span",{className:"text-[10px] text-gray-600",children:[t[0].toFixed(1)," × ",t[1].toFixed(1)," × ",t[2].toFixed(1)]})]})]})}const uo={info:"text-gray-400",phase:"text-emerald-400 font-bold",data:"text-sky-400",warn:"text-amber-400",error:"text-red-400 font-bold",success:"text-emerald-400",mem:"text-pink-300"},sa=()=>{const e=Y(p=>p.status),t=Y(p=>p.progress),o=Y(p=>p.phaseName),n=Y(p=>p.phaseProgress),s=Y(p=>p.memoryBlocks),i=Y(p=>p.logEntries),a=Y(p=>p.clearLog),r=Y(p=>p.lastMesh),l=Y(p=>p.lastTimings),m=Y(p=>p.smoothingSkipped),v=Y(p=>p.useNarrowBand),d=Y(p=>p.resolution),f=Y(p=>p.newton),x=Y(p=>p.isRunning),g=de.useRef(null);de.useEffect(()=>{var p;(p=g.current)==null||p.scrollIntoView({behavior:"smooth"})},[i.length]);const M=s.reduce((p,y)=>p+(y.freed?0:y.mb),0),h=Math.max(1,...s.map(p=>p.mb)),F=()=>{const p=i.map(y=>`[${y.time}] ${y.msg}`).join(`
`);navigator.clipboard.writeText(p).catch(()=>{})};return b.jsxs("div",{className:"font-mono flex flex-col gap-2",children:[e&&b.jsx("div",{className:"text-[13px] text-amber-400 font-bold",children:e}),b.jsx("div",{className:"h-1 bg-gray-800 rounded overflow-hidden",children:b.jsx("div",{className:"h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,t))}%`}})}),o&&b.jsx("div",{className:"text-[11px] text-gray-500",children:o}),b.jsx("div",{className:"h-[3px] bg-gray-800 rounded overflow-hidden",children:b.jsx("div",{className:"h-full bg-gradient-to-r from-sky-700 to-sky-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,n))}%`}})}),r&&l&&!x&&b.jsxs("div",{className:"text-[11px] leading-relaxed bg-black/40 border border-white/10 rounded px-2 py-1.5",children:[b.jsxs("span",{className:"text-emerald-400",children:[d,"³ · ",r.vertexCount.toLocaleString()," vertices · ",r.faceCount.toLocaleString()," faces"]})," · ",b.jsxs("span",{className:"text-sky-400",children:[Math.round((r.positions.byteLength+r.normals.byteLength+r.indices.byteLength)/(1024*1024))," MB mesh"]}),f&&b.jsx("span",{className:"text-gray-400",children:" · Newton projected"}),m&&b.jsx("span",{className:"text-amber-400",children:" · smoothing skipped (>5M verts)"}),b.jsx("br",{}),b.jsxs("span",{className:"text-gray-500",children:[v?`Coarse: ${(l.coarse/1e3).toFixed(1)}s · Fine: ${(l.fine/1e3).toFixed(1)}s`:`SDF: ${(l.sdf/1e3).toFixed(1)}s`," · ","DC: ",(l.dc/1e3).toFixed(1),"s",l.newton>100&&` · Newton: ${(l.newton/1e3).toFixed(1)}s`," · ","Post: ",(l.post/1e3).toFixed(1),"s"," · ","Color: ",(l.color/1e3).toFixed(1),"s"," · ","Total: ",(l.total/1e3).toFixed(1),"s"]})]}),s.length>0&&b.jsxs("div",{children:[b.jsx("div",{className:"flex gap-px h-[18px] rounded overflow-hidden",children:s.map(p=>b.jsx("div",{title:`${p.label}: ${p.mb} MB${p.freed?" (freed)":""}`,className:"flex items-center justify-center text-[9px] text-black font-bold overflow-hidden whitespace-nowrap rounded-sm transition-opacity",style:{flex:Math.max(p.mb/h,.08),background:p.color,opacity:p.freed?.25:1},children:p.label},p.id))}),b.jsxs("div",{className:"text-[10px] text-gray-600 mt-0.5",children:["Memory: ",M," MB active"]})]}),i.length>0&&b.jsxs("div",{children:[b.jsxs("div",{className:"max-h-[200px] overflow-y-auto bg-black/80 border border-white/10 rounded p-1.5 text-[11px] leading-relaxed",children:[i.map((p,y)=>b.jsxs("div",{className:uo[p.type]||uo.info,children:[b.jsx("span",{className:"text-gray-600",children:p.time})," ",p.msg]},y)),b.jsx("div",{ref:g})]}),b.jsxs("div",{className:"flex gap-1.5 mt-1",children:[b.jsx("button",{onClick:F,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Copy"}),b.jsx("button",{onClick:a,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Clear"})]})]})]})};function ra(e,t,o){let n=0;for(let s=0;s<e.length;s++)e[s]<-o&&(e[s]=o,n++);return n}function ia(e,t){let o=0;return e.blocks.forEach(n=>{for(let s=0;s<n.length;s++)n[s]<-t&&(n[s]=t,o++)}),o}function fo(e,t,o,n,s){const i=new Float32Array(e.length);for(let r=0;r<o;r++)for(let l=0;l<o;l++){const m=r*o*o+l*o;for(let v=0;v<o;v++){let d=e[m+v];for(let f=-n;f<=n;f++){const x=v+f;x>=0&&x<o&&(d=s(d,e[m+x]))}i[m+v]=d}}const a=new Float32Array(e.length);for(let r=0;r<o;r++)for(let l=0;l<o;l++)for(let m=0;m<o;m++){const v=r*o*o+m*o+l;let d=i[v];for(let f=-n;f<=n;f++){const x=m+f;x>=0&&x<o&&(d=s(d,i[r*o*o+x*o+l]))}a[v]=d}for(let r=0;r<o;r++)for(let l=0;l<o;l++)for(let m=0;m<o;m++){const v=m*o*o+r*o+l;let d=a[v];for(let f=-n;f<=n;f++){const x=m+f;x>=0&&x<o&&(d=s(d,a[x*o*o+r*o+l]))}t[v]=d}}async function la(e,t,o,n){const s=n||(()=>{});if(o<=0)return;const i=Math.round(o),a=t*t*t,r=new Float32Array(a);s(0),fo(e,r,t,i,Math.min),s(25),await new Promise(l=>{setTimeout(l,0)}),fo(r,e,t,i,Math.max),s(50)}async function ca(e,t,o){const n=o||(()=>{});if(t<=0)return;const s=Math.round(t);e.N;const i=e.blockSize;for(let a=0;a<2;a++){const r=a===0?Math.min:Math.max,l=new Map;e.blocks.forEach((m,v)=>{const d=new Float32Array(m.length),f=e.blocksPerAxis,x=v%f,g=(v/f|0)%f,M=v/(f*f)|0,h=x*i,F=g*i,p=M*i;for(let y=0;y<i;y++)for(let w=0;w<i;w++)for(let V=0;V<i;V++){let k=m[(y*i+w)*i+V];for(let R=-s;R<=s;R++)for(let D=-s;D<=s;D++)for(let N=-s;N<=s;N++){const u=h+V+N,c=F+w+D,_=p+y+R;k=r(k,e.get(u,c,_))}d[(y*i+w)*i+V]=k}l.set(v,d)}),l.forEach((m,v)=>{e.blocks.set(v,m)}),n(a===0?50:100),await new Promise(m=>{setTimeout(m,0)})}}async function ua(e,t,o,n){const s=o||(()=>{}),i=n||(()=>{}),a=t*t*t,r=a+7>>3,l=new Uint8Array(r),m=(D,N,u)=>(u*t+N)*t+D,v=D=>(l[D>>3]&1<<(D&7))!==0,d=D=>{l[D>>3]|=1<<(D&7)};let f=Math.min(a,4*1024*1024),x=new Int32Array(f),g=0,M=0,h=0;const F=D=>{if(h>=f){const N=f*2,u=new Int32Array(N);for(let c=0;c<h;c++)u[c]=x[(g+c)%f];x=u,g=0,M=h,f=N}x[M]=D,M=(M+1)%f,h++},p=()=>{const D=x[g];return g=(g+1)%f,h--,D};for(let D=0;D<t;D++)for(let N=0;N<t;N++)for(let u=0;u<t;u++)if(u===0||u===t-1||N===0||N===t-1||D===0||D===t-1){const c=m(u,N,D);e[c]>=0&&!v(c)&&(d(c),F(c))}s(5);let y=0;const w=[-1,1,0,0,0,0],V=[0,0,-1,1,0,0],k=[0,0,0,0,-1,1];for(;h>0;){const D=p(),N=D%t,u=(D/t|0)%t,c=D/(t*t)|0;for(let _=0;_<6;_++){const P=N+w[_],B=u+V[_],z=c+k[_];if(P<0||B<0||z<0||P>=t||B>=t||z>=t)continue;const T=m(P,B,z);v(T)||e[T]>=0&&(d(T),F(T))}y++,y&1048575||(s(5+Math.round(85*y/a)),await new Promise(_=>{setTimeout(_,0)}),i())}let R=0;for(let D=0;D<a;D++)e[D]>=0&&!v(D)&&(e[D]=-Math.abs(e[D])-.001,R++);return s(100),R}async function fa(e,t,o,n){const s=o||(()=>{}),i=n||(()=>{}),a=e.N,r=e.blockSize,l=e.blocksPerAxis,m=e.blockCellCount+7>>3;function v(L,A,O,S){if(A<0||O<0||S<0||A>=a||O>=a||S>=a)return!1;const E=A/r|0,G=O/r|0,H=S/r|0,X=(H*l+G)*l+E,$=L.get(X);if(!$)return!1;const j=A-E*r,W=O-G*r,ne=((S-H*r)*r+W)*r+j;return($[ne>>3]&1<<(ne&7))!==0}function d(L,A,O,S){const E=A/r|0,G=O/r|0,H=S/r|0,X=(H*l+G)*l+E,$=L.get(X);if(!$)return;const j=A-E*r,W=O-G*r,ne=((S-H*r)*r+W)*r+j;$[ne>>3]|=1<<(ne&7)}let f=2*1024*1024,x=new Int32Array(f),g=new Uint8Array(f),M=0,h=0;function F(){const L=h-M,A=f*2,O=new Int32Array(A),S=new Uint8Array(A);for(let E=0;E<L;E++)O[E]=x[(M+E)%f],S[E]=g[(M+E)%f];x=O,g=S,M=0,h=L,f=A}function p(L,A){h-M>=f-1&&F(),x[h%f]=L,g[h%f]=A,h++}function y(){const L=x[M%f],A=g[M%f];return M++,{coord:L,dist:A}}let w=2*1024*1024,V=new Int32Array(w),k=0,R=0;function D(){const L=R-k,A=w*2,O=new Int32Array(A);for(let S=0;S<L;S++)O[S]=V[(k+S)%w];V=O,k=0,R=L,w=A}function N(L){R-k>=w-1&&D(),V[R++%w]=L}function u(){return V[k++%w]}const c=new Map;e.blocks.forEach((L,A)=>{const O=new Uint8Array(m);for(let S=0;S<L.length;S++)L[S]<0&&(O[S>>3]|=1<<(S&7));c.set(A,O)});let _=0;e.blocks.forEach((L,A)=>{const O=A%l,S=(A/l|0)%l,E=A/(l*l)|0,G=O*r,H=S*r,X=E*r;for(let $=0;$<r;$++)for(let j=0;j<r;j++)for(let W=0;W<r;W++){const oe=($*r+j)*r+W;if(L[oe]<0)continue;const ne=G+W,Z=H+j,re=X+$;let le=!1;for(let ie=0;ie<6&&!le;ie++){const ce=ne+(ie===0?-1:ie===1?1:0),J=Z+(ie===2?-1:ie===3?1:0),q=re+(ie===4?-1:ie===5?1:0);e.get(ce,J,q)<0&&(le=!0)}le&&(d(c,ne,Z,re),p((re*a+Z)*a+ne,1),_++)}}),console.log("[CavityFill] Dilate by "+t+": "+_+" surface seeds"),s(5);let P=0,B=0;for(;M<h;){const L=y(),A=L.coord,O=L.dist,S=A%a,E=(A/a|0)%a,G=A/(a*a)|0;for(let H=0;H<6;H++){const X=S+(H===0?-1:H===1?1:0),$=E+(H===2?-1:H===3?1:0),j=G+(H===4?-1:H===5?1:0);X<0||$<0||j<0||X>=a||$>=a||j>=a||v(c,X,$,j)||(d(c,X,$,j),P++,O+1<t&&p((j*a+$)*a+X,O+1))}++B&262143||(s(5+Math.round(20*Math.min(1,P/(_*t+1)))),await new Promise(H=>{setTimeout(H,0)}),i())}console.log("[CavityFill] Dilate done: "+P+" cells expanded"),s(30);const z=new Map;e.blocks.forEach((L,A)=>{z.set(A,new Uint8Array(m))}),e.blocks.forEach((L,A)=>{const O=c.get(A),S=A%l,E=(A/l|0)%l,G=A/(l*l)|0,H=S*r,X=E*r,$=G*r;for(let j=0;j<r;j++)for(let W=0;W<r;W++)for(let oe=0;oe<r;oe++){const ne=(j*r+W)*r+oe;if(O[ne>>3]&1<<(ne&7))continue;const Z=H+oe,re=X+W,le=$+j;let ie=!1;if(Z===0||Z===a-1||re===0||re===a-1||le===0||le===a-1)ie=!0;else if(oe===0||oe===r-1||W===0||W===r-1||j===0||j===r-1)for(let ce=0;ce<6&&!ie;ce++){const J=Z+(ce===0?-1:ce===1?1:0),q=re+(ce===2?-1:ce===3?1:0),se=le+(ce===4?-1:ce===5?1:0),K=J/r|0,ee=q/r|0,Q=se/r|0;e.hasBlock(K,ee,Q)||(ie=!0)}if(ie){const ce=z.get(A);ce[ne>>3]|=1<<(ne&7),N((le*a+re)*a+Z)}}}),console.log("[CavityFill] Flood fill: "+R+" boundary seeds"),s(40);let U=0,I=0;for(;k<R;){const L=u(),A=L%a,O=(L/a|0)%a,S=L/(a*a)|0;for(let E=0;E<6;E++){const G=A+(E===0?-1:E===1?1:0),H=O+(E===2?-1:E===3?1:0),X=S+(E===4?-1:E===5?1:0);if(G<0||H<0||X<0||G>=a||H>=a||X>=a)continue;const $=G/r|0,j=H/r|0,W=X/r|0,oe=(W*l+j)*l+$,ne=G-$*r,Z=H-j*r,le=((X-W*r)*r+Z)*r+ne,ie=z.get(oe);ie&&(ie[le>>3]&1<<(le&7)||v(c,G,H,X)||(ie[le>>3]|=1<<(le&7),N((X*a+H)*a+G),U++))}++I&262143||(s(40+Math.round(40*U/(U+(R-k)+1))),await new Promise(E=>{setTimeout(E,0)}),i())}console.log("[CavityFill] Flood done: "+U+" cells reached"),s(85);let C=0;return e.blocks.forEach((L,A)=>{const O=z.get(A);for(let S=0;S<L.length;S++)L[S]>=0&&!(O[S>>3]&1<<(S&7))&&(L[S]=-Math.abs(L[S])-.001,C++)}),s(100),console.log("[CavityFill] Filled: "+C+" cavity cells"),{filled:C,dilated:P,seeds:_}}function da(e,t){const o=new Array(t);for(let s=0;s<t;s++)o[s]=new Set;for(let s=0,i=e.length;s<i;s+=3){const a=e[s],r=e[s+1],l=e[s+2];o[a].add(r),o[a].add(l),o[r].add(a),o[r].add(l),o[l].add(a),o[l].add(r)}const n=new Array(t);for(let s=0;s<t;s++){const i=o[s],a=new Uint32Array(i.size);let r=0;for(const l of i)a[r++]=l;n[s]=a}return n}function mo(e,t,o,n){const s=t.length;n.set(e);for(let i=0;i<s;i++){const a=t[i],r=a.length;if(r===0)continue;const l=i*3,m=n[l],v=n[l+1],d=n[l+2];let f=0,x=0,g=0;for(let h=0;h<r;h++){const F=a[h]*3;f+=n[F]-m,x+=n[F+1]-v,g+=n[F+2]-d}const M=o/r;e[l]=m+f*M,e[l+1]=v+x*M,e[l+2]=d+g*M}}function ma(e,t=.5,o=-.53,n=5){const s=da(e.indices,e.vertexCount),i=new Float32Array(e.positions.length);for(let a=0;a<n;a++)mo(e.positions,s,t,i),mo(e.positions,s,o,i);return e}function pa(e){const t=e.positions,o=e.indices,n=e.faceCount,s=[];for(let i=0;i<n;i++){const a=i*3,r=o[a]*3,l=o[a+1]*3,m=o[a+2]*3,v=t[l]-t[r],d=t[l+1]-t[r+1],f=t[l+2]-t[r+2],x=t[m]-t[r],g=t[m+1]-t[r+1],M=t[m+2]-t[r+2],h=d*M-f*g,F=f*x-v*M,p=v*g-d*x;h*h+F*F+p*p>=1e-20&&s.push(o[a],o[a+1],o[a+2])}return{positions:e.positions,normals:e.normals,indices:new Uint32Array(s),vertexCount:e.vertexCount,faceCount:s.length/3}}function ha(e){const t=e.positions,o=e.indices,n=e.normals,s=e.vertexCount,i=e.faceCount;for(let a=0;a<s*3;a++)n[a]=0;for(let a=0;a<i;a++){const r=a*3,l=o[r],m=o[r+1],v=o[r+2],d=l*3,f=m*3,x=v*3,g=t[f]-t[d],M=t[f+1]-t[d+1],h=t[f+2]-t[d+2],F=t[x]-t[d],p=t[x+1]-t[d+1],y=t[x+2]-t[d+2],w=M*y-h*p,V=h*F-g*y,k=g*p-M*F;n[d]+=w,n[d+1]+=V,n[d+2]+=k,n[f]+=w,n[f+1]+=V,n[f+2]+=k,n[x]+=w,n[x+1]+=V,n[x+2]+=k}for(let a=0;a<s;a++){const r=a*3,l=n[r],m=n[r+1],v=n[r+2],d=Math.sqrt(l*l+m*m+v*v);if(d>1e-12){const f=1/d;n[r]*=f,n[r+1]*=f,n[r+2]*=f}}return e}function va(e,t){const o=t??{},n=o.smoothing??!0,s=o.smoothIterations??5,i=o.lambda??.5,a=o.mu??-(i+.03);return e.faceCount<5e6&&(e=pa(e)),n&&s>0&&(e.vertexCount>5e6?console.warn("Skipping smoothing: "+e.vertexCount.toLocaleString()+" vertices too large (>5M limit)"):e=ma(e,i,a,s)),e=ha(e),e}class xa{constructor(t){ae(this,"_buf");ae(this,"_view");ae(this,"_u8");ae(this,"_pos");t||(t=1024*1024),this._buf=new ArrayBuffer(t),this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf),this._pos=0}get pos(){return this._pos}set pos(t){this._pos=t}_grow(t){const o=this._pos+t;if(o<=this._buf.byteLength)return;let n=this._buf.byteLength;for(;n<o;)n*=2;const s=new ArrayBuffer(n);new Uint8Array(s).set(this._u8),this._buf=s,this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf)}u8(t){this._grow(1),this._view.setUint8(this._pos,t),this._pos+=1}u16(t){this._grow(2),this._view.setUint16(this._pos,t,!0),this._pos+=2}u32(t){this._grow(4),this._view.setUint32(this._pos,t,!0),this._pos+=4}i32(t){this._grow(4),this._view.setInt32(this._pos,t,!0),this._pos+=4}f32(t){this._grow(4),this._view.setFloat32(this._pos,t,!0),this._pos+=4}raw(t){const o=t.length;this._grow(o),this._u8.set(t,this._pos),this._pos+=o}str(t){const o=t.length;this._grow(o);for(let n=0;n<o;n++)this._u8[this._pos++]=t.charCodeAt(n)&127}strNull(t){this.str(t),this.u8(0)}pad(t){this.padWith(t,0)}padWith(t,o){const n=this._pos%t;if(n===0)return;const s=t-n;this._grow(s);for(let i=0;i<s;i++)this._u8[this._pos++]=o}bulkF32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU8(t){this.raw(t)}result(){return this._buf.slice(0,this._pos)}}function ba(e){const t=e.positions,o=e.normals,n=e.colors,s=e.indices,i=e.vertexCount,a=e.faceCount,r=n!=null&&n.length>0,l=[1/0,1/0,1/0],m=[-1/0,-1/0,-1/0];for(let A=0;A<i;A++){const O=t[A*3],S=t[A*3+1],E=t[A*3+2];O<l[0]&&(l[0]=O),S<l[1]&&(l[1]=S),E<l[2]&&(l[2]=E),O>m[0]&&(m[0]=O),S>m[1]&&(m[1]=S),E>m[2]&&(m[2]=E)}const v=i*12,d=i*12,f=r?i*16:0,x=a*3*4,g=0,M=v,h=v+d,F=v+d+f,p=v+d+f+x,y=(4-p%4)%4,w=p+y,V=[],k=[],R={};let D=0,N=0;V.push({buffer:0,byteOffset:g,byteLength:v,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:i,type:"VEC3",min:[l[0],l[1],l[2]],max:[m[0],m[1],m[2]]}),R.POSITION=N,D++,N++,V.push({buffer:0,byteOffset:M,byteLength:d,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:i,type:"VEC3"}),R.NORMAL=N,D++,N++,r&&(V.push({buffer:0,byteOffset:h,byteLength:f,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:i,type:"VEC4"}),R.COLOR_0=N,D++,N++);const u=N;V.push({buffer:0,byteOffset:F,byteLength:x,target:34963}),k.push({bufferView:D,byteOffset:0,componentType:5125,count:a*3,type:"SCALAR"});const c={attributes:R,indices:u,mode:4},_={asset:{version:"2.0",generator:"GMT Fractal Explorer"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[c]}],accessors:k,bufferViews:V,buffers:[{byteLength:p}]};r&&(_.materials=[{name:"FractalVertexColor",pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}}],c.material=0);const P=JSON.stringify(_),B=(4-P.length%4)%4,z=P.length+B,T=20+z+8+w,U=20+z+8,I=new xa(U+16);I.u32(1179937895),I.u32(2),I.u32(T),I.u32(z),I.u32(1313821514),I.str(P);for(let A=0;A<B;A++)I.u8(32);I.u32(w),I.u32(5130562);const C=A=>A.buffer.slice(A.byteOffset,A.byteOffset+A.byteLength),L=[I._buf.slice(0,I._pos),C(t),C(o)];if(r){const A=new Float32Array(i*4);for(let O=0;O<i*4;O++)A[O]=n[O]/255;L.push(A.buffer)}return L.push(C(s)),y>0&&L.push(new ArrayBuffer(y)),new Blob(L,{type:"application/octet-stream"})}async function ga(e,t){const o=t||function(){},n=e.positions,s=e.indices,i=e.faceCount,a=new ArrayBuffer(84),r=new DataView(a),l="Fractal Mesh Export - GMT Fractal Explorer";for(let f=0;f<l.length;f++)r.setUint8(f,l.charCodeAt(f)&127);for(let f=l.length;f<80;f++)r.setUint8(f,32);r.setUint32(80,i,!0);const m=[new Uint8Array(a)],v=65536,d=Math.ceil(i/v);for(let f=0;f<i;f+=v){const x=Math.min(f+v,i),g=x-f,M=new ArrayBuffer(g*50),h=new DataView(M);let F=0;for(let y=f;y<x;y++){const w=s[y*3],V=s[y*3+1],k=s[y*3+2],R=n[w*3],D=n[w*3+1],N=n[w*3+2],u=n[V*3],c=n[V*3+1],_=n[V*3+2],P=n[k*3],B=n[k*3+1],z=n[k*3+2],T=u-R,U=c-D,I=_-N,C=P-R,L=B-D,A=z-N;let O=U*A-I*L,S=I*C-T*A,E=T*L-U*C;const G=Math.sqrt(O*O+S*S+E*E);G>1e-12&&(O/=G,S/=G,E/=G),h.setFloat32(F,O,!0),h.setFloat32(F+4,S,!0),h.setFloat32(F+8,E,!0),h.setFloat32(F+12,R,!0),h.setFloat32(F+16,D,!0),h.setFloat32(F+20,N,!0),h.setFloat32(F+24,u,!0),h.setFloat32(F+28,c,!0),h.setFloat32(F+32,_,!0),h.setFloat32(F+36,P,!0),h.setFloat32(F+40,B,!0),h.setFloat32(F+44,z,!0),h.setUint16(F+48,0,!0),F+=50}m.push(new Uint8Array(M));const p=f/v|0;p&7||(o(Math.round(100*(p+1)/d)),await new Promise(function(y){setTimeout(y,0)}))}return o(100),new Blob(m,{type:"application/octet-stream"})}function po(e,t){if(t==="stl")return 84+e.faceCount*50;{const n=e.colors!=null&&e.colors.length>0?e.vertexCount*16:0;return 1024+e.vertexCount*24+n+e.faceCount*12}}function ya(e,t){const o=document.createElement("a");o.href=URL.createObjectURL(e),o.download=t,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(o.href)}function De(e){return e.tick?e.tick():new Promise(t=>setTimeout(t,0))}async function Sa(e,t){const{N:o,iters:n,smoothPasses:s,useNewton:i,newtonSteps:a,smoothLambda:r,definition:l,formulaParams:m,power:v,deType:d,deSamples:f,zSubSlices:x,minFeatureSel:g,closingRadius:M,colorSamples:h,colorJitterMul:F,cavityFillMode:p,cavityFillLevel:y,gridMin:w,gridMax:V,boundsRange:k,interlace:R,estimator:D,distanceMetric:N}=e;let u=e.surfaceThreshold??0;const _=(d==="auto"?Xt(l):d)==="ifs"&&D!==void 0&&D>=1.5&&D<2.5?1:D,P=_!==void 0||N!==void 0?{estimator:_??0,distanceMetric:N??0}:void 0,B={log:t.log,setStatus:t.setStatus,setProgress:t.setProgress,setPhase:t.setPhase,tick:t.tick,onSlicePreview:t.onSlicePreview},z=o>256,T=k/o,U=performance.now();let I=null,C=null,L,A,O=0,S=0,E=0,G=0,H=0,X=0,$=null,j=null,W=!1;const oe=l.name||l.id||"unknown";t.log("=== Generate: "+oe+" ===","phase"),t.log("Resolution: "+o+"³ | Iterations: "+n+" | DE: "+d+" | SS: "+f+"³="+f*f*f+(x>1?" | Z-SS: "+x:"")+" | Newton: "+(i?a+" steps":"off")+" | Smooth: "+s+"×λ"+r+(h>1?" | Color-SS: "+h+"×r"+F:"")+" | MinFeat: "+g+" | CavityFill: "+(p==="escape"?"escape-test":y+"x")+" | Closing: "+M,"data"),t.log("Params: "+JSON.stringify(m).substring(0,200),"data"),t.log("Bounds: min=["+w[0].toFixed(2)+","+w[1].toFixed(2)+","+w[2].toFixed(2)+"] max=["+V[0].toFixed(2)+","+V[1].toFixed(2)+","+V[2].toFixed(2)+"] range="+k.toFixed(2),"data");let ne;if(d==="ifs")ne=Math.ceil(Math.log2(k/T));else{const Z=Math.max(v,2);ne=Math.ceil(Math.log(k/T)/Math.log(Z))}n>ne+2&&t.log("Note: At "+o+"³ (voxel="+T.toFixed(5)+"), ~"+ne+" iterations resolve detail at voxel scale. Using "+n+" adds "+(n-ne)+" levels of sub-voxel interior detail. Min Feature filter will clamp this. Consider reducing iterations for faster export.","warn");try{try{if(t.log("[Phase 1] GPU SDF Sampling","phase"),t.setPhase("Phase 1: SDF Sampling",0),t.memAlloc("webgl","WebGL",8,t.MEM_COLORS.webgl),t.setStatus("Initializing WebGL2..."),await De(t),C=xt(),t.log("WebGL2 initialized (max texture: "+C.getParameter(C.MAX_TEXTURE_SIZE)+")","info"),z){t.log("Pass 1: Coarse SDF 128³ ("+(128*128*128*4/(1024*1024)).toFixed(1)+" MB)","info"),t.setStatus("Pass 1: Coarse SDF (128³)..."),await De(t);const q=We(C,Math.min(128,2048),l,f,t.log,R,P),se=Math.round(128*128*128*4/(1024*1024));t.memAlloc("coarseGrid","Coarse SDF",se,t.MEM_COLORS.coarseGrid);let K=await co(C,q,128,v,n,m,w,V,0,10,1,null,null,B,R,u);L=performance.now();let ee=0,Q=0,te=1/0;for(let Se=0;Se<K.length;Se++){const ue=K[Se];ue>=0?ee++:Q++,ue<te&&(te=ue)}if(t.log("Coarse: "+ee.toLocaleString()+" outside, "+Q.toLocaleString()+" inside ("+((L-U)/1e3).toFixed(1)+"s)","data"),Q===0&&te<10&&u===0){const Se=k/128,ue=te+Se*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+te.toFixed(6)+" → threshold="+ue.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let ge=0;ge<K.length;ge++)K[ge]-=ue;u=ue,Q=0;for(let ge=0;ge<K.length;ge++)K[ge]<0&&Q++;t.log("After auto-threshold: "+Q.toLocaleString()+" interior coarse cells","data")}else Q===0&&t.log("WARNING: No interior voxels in coarse grid — surface may not be found","warn");t.setStatus("Building narrow band for "+o+"³..."),await De(t);const fe=Ln(K,128,o,8,2);K=null,t.memFree("coarseGrid"),$=fe.grid;const pe=Math.pow(o/$.blockSize,3),ve=($.allocatedCount/pe*100).toFixed(1),Te=Math.round($.memoryMB());t.memAlloc("sparseGrid","Sparse SDF",Te,t.MEM_COLORS.sparseGrid),t.log("Narrow band: "+$.allocatedCount.toLocaleString()+" blocks ("+ve+"% of "+pe.toLocaleString()+"), "+Te+" MB","data"),t.log("Pass 2: Fine SDF "+o+"³ (narrow-band, "+$.memoryMB().toFixed(0)+" MB allocated)","info"),t.setStatus("Pass 2: Fine SDF ("+o+"³ narrow-band)..."),await De(t),C.deleteTexture(q.tex),C.deleteFramebuffer(q.fbo);const Ae=We(C,Math.min(o,2048),l,f,t.log,R,P);await Qn(C,Ae,$,v,n,m,w,V,10,25,B,R,u),O=performance.now(),A=O,t.log("Fine sampling done: "+((A-L)/1e3).toFixed(1)+"s","success")}else{const J=Math.round(o*o*o*4/1048576);t.memAlloc("sdfGrid","SDF Grid",J,t.MEM_COLORS.sdfGrid),t.log("Dense SDF "+o+"³ ("+J+" MB grid)","info");const q=await Uo(C,l,m,o,v,n,w,V,T,B,R,P,u),se=We(C,Math.min(o,2048),l,f,t.log,R,P);j=await co(C,se,o,v,n,m,w,V,0,35,x,q.zSliceMin,q.zSliceMax,B,R,u),O=performance.now();let K=0,ee=0,Q=0;for(let te=0;te<j.length;te++){const fe=j[te];isNaN(fe)?Q++:fe>0?K++:ee++}if(t.log("SDF: "+K.toLocaleString()+" outside, "+ee.toLocaleString()+" inside"+(Q>0?", "+Q+" NaN!":"")+" ("+((O-U)/1e3).toFixed(1)+"s)","data"),ee===0&&u===0){let te=1/0;for(let fe=0;fe<j.length;fe++)j[fe]<te&&(te=j[fe]);if(te<10){const fe=te+T*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+te.toFixed(6)+" → threshold="+fe.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let pe=0;pe<j.length;pe++)j[pe]-=fe;u=fe}}}}catch(J){t.checkCancel();const q=J;throw t.log("PHASE 1 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in SDF sampling: "+q.message),J}t.checkCancel();let Z=0;g==="auto"?Z=T*1.5:parseFloat(g)>0&&(Z=T*parseFloat(g));{let J=1/0,q=-1/0,se=0,K=0;if(z&&$)$.blocks.forEach(ee=>{for(let Q=0;Q<ee.length;Q++){const te=ee[Q];te<J&&(J=te),te>q&&(q=te),te<0&&se++,K++}});else if(j){K=j.length;for(let ee=0;ee<j.length;ee++){const Q=j[ee];Q<J&&(J=Q),Q>q&&(q=Q),Q<0&&se++}}if(t.log("SDF range: ["+J.toFixed(6)+", "+q.toFixed(6)+"] | "+se.toLocaleString()+" interior cells of "+K.toLocaleString()+" | threshold="+(Z>0?Z.toFixed(6):"off"),"data"),se===0&&J>0&&J<10){const ee=J+T*2;if(t.log("Auto-threshold: no interior found, SDF min="+J.toFixed(6)+" → applying threshold "+ee.toFixed(6)+" (set Surface Threshold manually to control shell thickness)","warn"),z&&$)$.blocks.forEach(Q=>{for(let te=0;te<Q.length;te++)Q[te]-=ee});else if(j)for(let Q=0;Q<j.length;Q++)j[Q]-=ee;se=z&&$?(()=>{let Q=0;return $.blocks.forEach(te=>{for(let fe=0;fe<te.length;fe++)te[fe]<0&&Q++}),Q})():j?j.reduce((Q,te)=>Q+(te<0?1:0),0):0,t.log("After auto-threshold: "+se.toLocaleString()+" interior cells","data")}if(y>0||Z>0||M>0){if(t.log("[Phase 1b] SDF Filtering","phase"),t.setPhase("Phase 1b: SDF Filtering",0),t.setStatus("Filtering SDF..."),await De(t),y>0){if(p==="escape"&&z&&$&&C){t.setStatus("Cavity fill (escape test)..."),t.setPhase("Phase 1b: Escape Test",0);const ee=await ea(C,$,l,v,n,m,w,V,B,te=>{t.setPhase("Phase 1b: Escape Test",te)},R);let Q=0;$.blocks.forEach((te,fe)=>{const pe=ee.escapeMap.get(fe);if(pe)for(let ve=0;ve<te.length;ve++)te[ve]>=0&&pe[ve>>3]&1<<(ve&7)&&(te[ve]=-Math.abs(te[ve])-.001,Q++)}),t.log("Cavity fill (escape test): "+ee.solidCount.toLocaleString()+" escape-interior cells, "+Q.toLocaleString()+" positive cells filled","data")}else if(z&&$){t.setStatus("Cavity fill (dilate r="+y+", then flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const ee=await fa($,y,Q=>{t.setPhase("Phase 1b: Cavity Fill (r="+y+")",Q)},()=>{t.checkCancel()});t.log("Cavity fill: dilate="+y+" | "+ee.dilated.toLocaleString()+" dilated, "+ee.filled.toLocaleString()+" filled solid","data")}else if(j){t.setStatus("Cavity fill (flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const ee=await ua(j,o,Q=>{t.setPhase("Phase 1b: Cavity Fill",Q)},()=>{t.checkCancel()});t.log("Cavity fill: "+ee.toLocaleString()+" cells filled solid","data")}}if(Z>0){let ee;z&&$?ee=ia($,Z):j?ee=ra(j,o,Z):ee=0,t.log("Min feature clamp: threshold="+Z.toFixed(6)+" ("+(Z/T).toFixed(1)+"x voxel), "+ee.toLocaleString()+" cells clamped","data")}M>0&&(t.setStatus("Morphological closing (r="+M+" voxels)..."),z&&$?await ca($,M,ee=>{t.setPhase("Phase 1b: Morph Closing",ee)}):j&&await la(j,o,M,ee=>{t.setPhase("Phase 1b: Morph Closing",ee)}),t.log("Morphological closing: radius="+M+" voxels","data")),t.setPhase("Phase 1b: SDF Filtering",100)}}t.checkCancel();try{if(t.log("[Phase 2] Dual Contouring","phase"),t.setPhase("Phase 2: Dual Contouring",0),t.setProgress(35),await De(t),z&&$)t.setStatus("Dual contouring (sparse, "+o+"³)..."),I=await _n($,w,V,(ee,Q)=>{t.setProgress(35+Math.round(Q*.25)),t.setPhase("Phase 2: Dual Contouring",Q)});else if(j){t.setStatus("Dual contouring ("+o+"³)...");const K=Math.round(Math.log2(o));I=await In(j,o,w,V,K,(Q,te)=>{t.setProgress(35+Math.round(te*.25)),t.setPhase("Phase 2: Dual Contouring",te)}),j=null,t.memFree("sdfGrid")}if(S=performance.now(),!I||I.vertexCount===0)return t.log("No surface found — check parameters and bounds","error"),t.setStatus("No surface found! Try different parameters."),{mesh:null,timings:null,baseName:"",useNarrowBand:z,gl:C};t.log("DC result: "+I.vertexCount.toLocaleString()+" vertices, "+I.faceCount.toLocaleString()+" faces ("+((S-O)/1e3).toFixed(1)+"s)","data");const J=(I.positions.byteLength/(1024*1024)).toFixed(0),q=(I.normals.byteLength/(1024*1024)).toFixed(0),se=(I.indices.byteLength/(1024*1024)).toFixed(0);t.log("Mesh memory: positions="+J+"MB normals="+q+"MB indices="+se+"MB (total "+(parseInt(J)+parseInt(q)+parseInt(se))+"MB)","mem"),$&&($=null,t.memFree("sparseGrid"),t.log("Sparse grid freed","mem")),t.memAlloc("meshPos","Positions",parseInt(J),t.MEM_COLORS.meshPos),t.memAlloc("meshNrm","Normals",parseInt(q),t.MEM_COLORS.meshNrm),t.memAlloc("meshIdx","Indices",parseInt(se),t.MEM_COLORS.meshIdx),t.setStatus("Mesh: "+I.vertexCount.toLocaleString()+" verts, "+I.faceCount.toLocaleString()+" faces"),t.setProgress(60),await De(t)}catch(J){t.checkCancel();const q=J;throw t.log("PHASE 2 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in dual contouring: "+q.message),J}t.checkCancel(),X=S;const re=k/o;if(i&&I&&C)try{t.log("[Phase 3] Newton Projection","phase"),t.setPhase("Phase 3: Newton Projection",0),t.log("Mode: GPU (float32, generic formula) — "+I.vertexCount.toLocaleString()+" vertices","info");const J=Math.ceil(Math.sqrt(I.vertexCount));t.log("Newton texture: "+J+"x"+J+" ("+(J*J*16*3/(1024*1024)).toFixed(0)+" MB GPU)","mem"),t.setStatus("GPU Newton projection ("+I.vertexCount.toLocaleString()+" vertices)..."),t.setPhase("Phase 3: Newton Projection",50),await De(t),ta(C,I,l,m,v,n,re,a,t.log,R),X=performance.now(),t.setPhase("Phase 3: Newton Projection",100),t.log("GPU Newton done: "+((X-S)/1e3).toFixed(1)+"s","success")}catch(J){t.checkCancel(),X=performance.now();const q=J;t.log("Newton FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Newton failed — continuing without projection"),await De(t)}t.setProgress(70),t.checkCancel();try{t.log("[Phase 4] Post-processing","phase"),t.setPhase("Phase 4: Post-processing",0),t.setStatus("Post-processing (smoothing, normals)..."),await De(t),W=I.vertexCount>5e6,W&&t.log("Large mesh ("+I.vertexCount.toLocaleString()+" verts) — smoothing disabled to avoid OOM","warn"),I=va(I,{smoothing:s>0,smoothIterations:s,lambda:r}),E=performance.now(),t.setPhase("Phase 4: Post-processing",100),t.log("Post-processing done: "+((E-X)/1e3).toFixed(1)+"s","success")}catch(J){t.checkCancel(),E=performance.now();const q=J;throw t.log("PHASE 4 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in post-processing: "+q.message),J}t.setProgress(80),t.checkCancel();try{t.log("[Phase 5] Vertex Coloring","phase"),t.setPhase("Phase 5: Vertex Coloring",0),t.setStatus("Colorizing vertices..."),await De(t),(!C||C.isContextLost())&&(t.log("Re-initializing WebGL for colorizer","warn"),C=xt());const J=T*F;I.colors=await oa(C,I,l,m,v,n,h,J,B,R),G=performance.now(),t.setPhase("Phase 5: Vertex Coloring",100);const q=(I.vertexCount*3/(1024*1024)).toFixed(1);t.memAlloc("meshCol","Colors",parseFloat(q),t.MEM_COLORS.meshCol),t.log("Coloring done: "+((G-E)/1e3).toFixed(1)+"s"+(h>1?" ("+h+" samples)":""),"success")}catch(J){t.checkCancel(),G=performance.now();const q=J;t.log("PHASE 5 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.log("Continuing without vertex colors","warn")}t.setProgress(90),t.checkCancel(),H=performance.now(),t.setProgress(100),t.setPhase("Complete",100),t.setStatus("Done — choose format and export");const le=((H-U)/1e3).toFixed(1);t.log("=== Complete in "+le+"s ===","phase");const ie=(l.name||l.id||"fractal").toLowerCase().replace(/\s+/g,"-"),ce={total:H-U,sdf:O-U,coarse:L?L-U:0,fine:A&&L?A-L:0,dc:S-O,newton:X-S,post:E-X,color:G-E};return{mesh:I,baseName:ie,smoothingSkipped:W,timings:ce,useNarrowBand:z,gl:C}}catch(Z){if(C)try{const re=C.getExtension("WEBGL_lose_context");re&&re.loseContext()}catch{}throw Z}}async function wa(e,t,o,n,s){const i=performance.now();let a,r;if(s.log("[Export] Encoding "+e.toUpperCase()+"...","phase"),s.setStatus("Encoding "+e.toUpperCase()+"..."),s.setPhase("Export "+e.toUpperCase(),0),e==="vdb"){const{definition:v,formulaParams:d,N:f,iters:x,power:g,gridMin:M,gridMax:h,deSamples:F,zSubSlices:p,interlace:y,estimator:w,distanceMetric:V,surfaceThreshold:k}=n,R=w!==void 0||V!==void 0?{estimator:w??0,distanceMetric:V??0}:void 0,D=v.name||v.id||"unknown";s.log("=== VDB Export: "+D+" ===","phase"),s.log("Resolution: "+f+"³ | Iterations: "+x+" | Mode: solid | Z Sub-slices: "+p,"data");const N=xt(),u={log:s.log,setStatus:s.setStatus,setProgress:s.setProgress,setPhase:s.setPhase,tick:s.tick,onSlicePreview:s.onSlicePreview,memAlloc:s.memAlloc,memFree:s.memFree},c=await Kn(N,v,d,f,g,x,M,h,"solid",F,p,u,y,R,k,n.vdbColor);try{const z=N.getExtension("WEBGL_lose_context");z&&z.loseContext()}catch{}a=c.blob;const _=(v.name||v.id||"fractal").toLowerCase().replace(/\s+/g,"-"),P=new Date().toISOString().replace(/[-:T]/g,"").slice(0,12),B=n.vdbColor?"-density-color":"-density";r=_+"-"+f+B+"-"+P+".vdb",s.log("VDB: "+c.voxelCount.toLocaleString()+" active voxels, "+c.leafCount+" leaf blocks"+(c.promoted.promotedLeaves?", "+c.promoted.promotedLeaves+" tiles promoted":"")+(c.skippedSlices>0?", "+c.skippedSlices+" empty slices skipped":""),"data")}else if(e==="glb"){const v=po(t,e);s.log("Estimated size: ~"+(v/(1024*1024)).toFixed(0)+" MB","mem"),a=ba(t),r=o+".glb",s.setPhase("Export GLB",100)}else{const v=po(t,e);s.log("Estimated size: ~"+(v/(1024*1024)).toFixed(0)+" MB","mem"),a=await ga(t,d=>{s.setPhase("Export STL",d),s.setStatus("Encoding STL... "+d+"%")}),r=o+".stl"}const l=performance.now(),m=(a.size/(1024*1024)).toFixed(2);return s.memAlloc("exportBlob",e.toUpperCase()+" Blob",parseFloat(m),s.MEM_COLORS.exportBlob),s.log("Export: "+m+" MB "+e.toUpperCase()+" ("+((l-i)/1e3).toFixed(1)+"s)","success"),s.setStatus(m+" MB "+e.toUpperCase()+" ready"),s.setPhase("Export complete",100),{blob:a,filename:r}}const Ca={webgl:"#47a",coarseGrid:"#7af",sparseGrid:"#5a8",sdfGrid:"#7af",meshPos:"#f80",meshNrm:"#fa0",meshIdx:"#fc0",meshCol:"#f5a",exportBlob:"#5af"},ft="font-mono text-[13px] font-bold border-none rounded px-4 py-2 cursor-pointer transition-opacity disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-default",Ma=()=>{const e=Y(),t=Y(p=>p.isRunning),o=Y(p=>p.exportFormat),n=Y(p=>p.lastMesh),s=Y(p=>p.lastBlob),i=Y(p=>p.lastFilename),a=Y(p=>p.loadedDefinition),r=Y(p=>p.selectedFormulaId),l=Y(p=>p.customFilename),m=Y(p=>p.vdbColor),v=!!(a||Oe.get(r)),d=o==="vdb";function f(){const p=Y.getState(),y=p.loadedDefinition||Oe.get(p.selectedFormulaId),w=p.bboxSize.map(c=>c/2),V=[p.bboxCenter[0]-w[0],p.bboxCenter[1]-w[1],p.bboxCenter[2]-w[2]],k=[p.bboxCenter[0]+w[0],p.bboxCenter[1]+w[1],p.bboxCenter[2]+w[2]];let R,D;p.cavityFill==="escape"?(R="escape",D=1):(R="dilate",D=parseInt(p.cavityFill)||0);let N;p.interlaceState&&(N={definition:p.interlaceState.definition,params:p.interlaceState.params,enabled:p.interlaceState.enabled,interval:p.interlaceState.interval,startIter:p.interlaceState.startIter});const u=p.qualitySettings;return{N:p.resolution,iters:p.iters,smoothPasses:p.smoothPasses,useNewton:p.newton,newtonSteps:p.newtonSteps,smoothLambda:p.smoothLambda,definition:y,formulaParams:p.formulaParams,power:p.formulaParams.paramA||8,deType:p.deType,deSamples:p.deSamples,zSubSlices:p.zSubSlices,minFeatureSel:p.minFeature,closingRadius:p.closingRadius,colorSamples:p.colorSamples,colorJitterMul:p.colorJitter,cavityFillMode:R,cavityFillLevel:D,gridMin:V,gridMax:k,boundsRange:k[0]-V[0],interlace:N,estimator:u.estimator,distanceMetric:u.distanceMetric,surfaceThreshold:u.surfaceThreshold}}function x(){return{setStatus:p=>Y.getState().setStatus(p),setProgress:p=>Y.getState().setProgress(p),setPhase:(p,y)=>Y.getState().setPhase(p,y),log:(p,y)=>Y.getState().addLog(p,y),memAlloc:(p,y,w,V)=>Y.getState().memAlloc(p,y,w,V),memFree:p=>Y.getState().memFree(p),tick:async()=>{if(await new Promise(p=>setTimeout(p,0)),Y.getState().isCancelled)throw new Error("Cancelled")},checkCancel:()=>{if(Y.getState().isCancelled)throw new Error("Cancelled")},onSlicePreview:(p,y,w)=>{un(p,y,w)},MEM_COLORS:Ca}}const g=async()=>{const p=Y.getState();p.setMesh(null,""),p.setExportBlob(null,""),p.setRunning(!0),p.setCancelled(!1),p.setProgress(0),p.setPhase("",0),p.clearMemory(),so(),io();try{const y=await Sa(f(),x()),w=Y.getState();w.setMesh(y.mesh,y.baseName),w.setTimings(y.timings,y.smoothingSkipped??!1,y.useNarrowBand),y.gl&&w.setGL(y.gl)}catch(y){const w=y;w.message!=="Cancelled"?(Y.getState().addLog("ERROR: "+w.message,"error"),Y.getState().setStatus("Error: "+w.message)):(Y.getState().addLog("Cancelled","warn"),Y.getState().setStatus("Cancelled"))}finally{Y.getState().setRunning(!1)}},M=()=>{An(),Rn(),Y.getState().setCancelled(!0)},h=async()=>{const p=Y.getState();p.setRunning(!0),p.setCancelled(!1),so(),io();try{const y=f(),w=await wa(p.exportFormat,p.lastMesh,p.lastBaseName,{definition:y.definition,formulaParams:y.formulaParams,N:y.N,iters:y.iters,power:y.power,gridMin:y.gridMin,gridMax:y.gridMax,deSamples:y.deSamples,zSubSlices:y.zSubSlices,interlace:y.interlace,estimator:y.estimator,distanceMetric:y.distanceMetric,surfaceThreshold:y.surfaceThreshold,vdbColor:p.vdbColor},x()),V=Y.getState().customFilename.trim(),k=V?V.replace(/\.[^.]+$/,"")+"."+w.filename.split(".").pop():w.filename;Y.getState().setExportBlob(w.blob,k)}catch(y){const w=y;w.message!=="Cancelled"&&(Y.getState().addLog("Export error: "+w.message,"error"),Y.getState().setStatus("Export error: "+w.message))}finally{Y.getState().setRunning(!1)}},F=()=>{s&&i&&ya(s,i)};return b.jsxs("div",{className:"font-mono flex flex-col gap-2 mt-1",children:[b.jsx(Me,{label:"Format",value:o,options:[{label:"GLB (Binary glTF)",value:"glb"},{label:"STL (Binary)",value:"stl"},{label:"VDB (OpenVDB)",value:"vdb"}],onChange:e.setExportFormat,fullWidth:!0}),b.jsxs("div",{className:"flex items-center gap-2",children:[b.jsx("span",{className:"text-[10px] text-gray-500 uppercase tracking-wide shrink-0",children:"Filename"}),b.jsx("input",{type:"text",value:l,onChange:p=>e.setCustomFilename(p.target.value),placeholder:((a==null?void 0:a.name)||r||"fractal").toLowerCase().replace(/\s+/g,"-"),className:"flex-1 h-[26px] bg-gray-800 border border-gray-700 rounded px-2 text-[11px] text-gray-200 font-mono placeholder:text-gray-600"}),b.jsxs("span",{className:"text-[10px] text-gray-600",children:[".",o]})]}),d&&b.jsx("div",{className:"text-[11px] text-sky-400 bg-sky-900/20 px-2 py-1 rounded",children:"VDB exports directly — no Generate needed"}),d&&b.jsxs("label",{className:"flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer select-none",children:[b.jsx("input",{type:"checkbox",checked:m,onChange:p=>e.setVdbColor(p.target.checked),className:"accent-amber-500"}),"Include color grids (slower)"]}),b.jsxs("div",{className:"flex gap-2 flex-wrap",children:[!d&&b.jsxs("button",{disabled:t||!v,onClick:g,className:`${ft} bg-emerald-700 text-white hover:bg-emerald-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:"1"}),"Generate"]}),t&&b.jsx("button",{onClick:M,className:`${ft} bg-red-700 text-white hover:bg-red-600`,children:"Cancel"}),b.jsxs("button",{disabled:t||!n&&!d,onClick:h,className:`${ft} bg-amber-700 text-white hover:bg-amber-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:d?"1":"2"}),"Export"]}),b.jsxs("button",{disabled:!s,onClick:F,className:`${ft} bg-sky-700 text-white hover:bg-sky-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:d?"2":"3"}),"Download",i?` (${i})`:""]})]})]})};function $o(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function bt(e,t){return[e[0]+t[0],e[1]+t[1],e[2]+t[2]]}function Vt(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function gt(e,t){return[e[0]*t,e[1]*t,e[2]*t]}function Ta(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function Jt(e,t){const o=Math.cos(e),n=Math.sin(e),s=Math.cos(t),i=Math.sin(t),a=[o,0,-n],r=[-s*n,-i,-s*o],l=Ta(a,r);return{pos:$o([0,0,0],gt(r,10)),fwd:r,right:a,up:l}}function ho(e,t,o,n,s,i,a){const r=Jt(t,o),l=a||[0,0,0],m=bt(r.pos,l),v=$o(e,m),d=Vt(v,r.right),f=Vt(v,r.up),x=i/n;return[s*.5+d*x,i*.5-f*x,0]}function kt(e,t,o,n,s,i){const a=i/s,r=Jt(o,n),l=e/a,m=-t/a;return bt(gt(r.right,l),gt(r.up,m))}const dt=Math.PI*.5,vo=[{angle:0,pitch:0,label:"Front (-Z)"},{angle:Math.PI,pitch:0,label:"Back (+Z)"},{angle:dt,pitch:0,label:"Right (+X)"},{angle:-dt,pitch:0,label:"Left (-X)"},{angle:0,pitch:dt,label:"Top (+Y)"},{angle:0,pitch:-dt,label:"Bottom (-Y)"}],xo=15*Math.PI/180;function Nt(e){return e=e%(2*Math.PI),e>Math.PI&&(e-=2*Math.PI),e<-Math.PI&&(e+=2*Math.PI),e}function Ot(e,t,o){const n=Nt(e);let s=null,i=1/0;for(let a=0;a<vo.length;a++){const r=vo[a];let l,m;Math.abs(r.pitch)>1?(l=0,m=Math.abs(t-r.pitch)):(l=Math.abs(Nt(n-r.angle)),m=Math.abs(t-r.pitch));const v=Math.sqrt(l*l+m*m);v<o&&v<i&&(i=v,s={angle:Math.abs(r.pitch)>1?n:r.angle,pitch:r.pitch,label:r.label})}return s}function Fa(){return{positions:null,indices:null,normals:null,vertexCount:0,faceCount:0,rotX:-.4,rotY:.6,zoom:1,cx:0,cy:0,cz:0,scale:1,dragging:!1,lastMX:0,lastMY:0}}function bo(e,t,o,n,s,i){e.positions=t,e.indices=o,e.vertexCount=n,e.faceCount=s;let a=1/0,r=1/0,l=1/0,m=-1/0,v=-1/0,d=-1/0;for(let f=0;f<n;f++){const x=t[f*3],g=t[f*3+1],M=t[f*3+2];x<a&&(a=x),g<r&&(r=g),M<l&&(l=M),x>m&&(m=x),g>v&&(v=g),M>d&&(d=M)}e.cx=(a+m)/2,e.cy=(r+v)/2,e.cz=(l+d)/2,e.scale=i/(Math.max(m-a,v-r,d-l)*1.15)}function mt(e,t,o,n){if(t.fillStyle="#111",t.fillRect(0,0,o,n),!e.positions||!e.indices||e.vertexCount===0)return;const s=Math.cos(e.rotX),i=Math.sin(e.rotX),a=Math.cos(e.rotY),r=Math.sin(e.rotY),l=e.scale*e.zoom,m=e.positions,v=e.cx,d=e.cy,f=e.cz;function x(F){const p=m[F*3]-v,y=m[F*3+1]-d,w=m[F*3+2]-f,V=p*a-w*r,k=p*r+w*a,R=y*s-k*i;return[V*l+o/2,n/2-R*l]}const g=15e4,M=e.faceCount>g?Math.ceil(e.faceCount/g):1;let h=0;t.strokeStyle="rgba(42,170,85,0.12)",t.lineWidth=.5,t.beginPath();for(let F=0;F<e.faceCount&&h<g;F+=M){const p=x(e.indices[F*3]),y=x(e.indices[F*3+1]),w=x(e.indices[F*3+2]);t.moveTo(p[0],p[1]),t.lineTo(y[0],y[1]),t.lineTo(w[0],w[1]),t.lineTo(p[0],p[1]),h++}t.stroke(),t.fillStyle="#888",t.font="11px monospace",t.fillText(e.vertexCount.toLocaleString()+" verts, "+e.faceCount.toLocaleString()+" faces",4,n-4),t.fillStyle="#555",t.fillText("drag to rotate, scroll to zoom",4,14)}function go(e,t,o){const n=e.createShader(t);if(e.shaderSource(n,o),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const s=e.getShaderInfoLog(n)||"";throw e.deleteShader(n),new Error("Shader compile: "+s)}return n}function Ea(e,t,o){const n=e.createProgram();if(e.attachShader(n,go(e,e.VERTEX_SHADER,t)),e.attachShader(n,go(e,e.FRAGMENT_SHADER,o)),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS)){const s=e.getProgramInfoLog(n)||"";throw e.deleteProgram(n),new Error("Program link: "+s)}return n}function Pa(e,t,o){var s,i,a,r,l,m,v,d,f,x,g,M,h,F,p,y,w,V,k,R,D,N,u,c,_,P,B,z,T,U;const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0),t.uVec2A&&e.uniform2f(t.uVec2A,((s=n.vec2A)==null?void 0:s.x)??0,((i=n.vec2A)==null?void 0:i.y)??0),t.uVec2B&&e.uniform2f(t.uVec2B,((a=n.vec2B)==null?void 0:a.x)??0,((r=n.vec2B)==null?void 0:r.y)??0),t.uVec2C&&e.uniform2f(t.uVec2C,((l=n.vec2C)==null?void 0:l.x)??0,((m=n.vec2C)==null?void 0:m.y)??0),t.uVec3A&&e.uniform3f(t.uVec3A,((v=n.vec3A)==null?void 0:v.x)??0,((d=n.vec3A)==null?void 0:d.y)??0,((f=n.vec3A)==null?void 0:f.z)??0),t.uVec3B&&e.uniform3f(t.uVec3B,((x=n.vec3B)==null?void 0:x.x)??0,((g=n.vec3B)==null?void 0:g.y)??0,((M=n.vec3B)==null?void 0:M.z)??0),t.uVec3C&&e.uniform3f(t.uVec3C,((h=n.vec3C)==null?void 0:h.x)??0,((F=n.vec3C)==null?void 0:F.y)??0,((p=n.vec3C)==null?void 0:p.z)??0),t.uVec4A&&e.uniform4f(t.uVec4A,((y=n.vec4A)==null?void 0:y.x)??0,((w=n.vec4A)==null?void 0:w.y)??0,((V=n.vec4A)==null?void 0:V.z)??0,((k=n.vec4A)==null?void 0:k.w)??0),t.uVec4B&&e.uniform4f(t.uVec4B,((R=n.vec4B)==null?void 0:R.x)??0,((D=n.vec4B)==null?void 0:D.y)??0,((N=n.vec4B)==null?void 0:N.z)??0,((u=n.vec4B)==null?void 0:u.w)??0),t.uVec4C&&e.uniform4f(t.uVec4C,((c=n.vec4C)==null?void 0:c.x)??0,((_=n.vec4C)==null?void 0:_.y)??0,((P=n.vec4C)==null?void 0:P.z)??0,((B=n.vec4C)==null?void 0:B.w)??0),t.uJulia&&e.uniform3f(t.uJulia,((z=n.julia)==null?void 0:z.x)??0,((T=n.julia)==null?void 0:T.y)??0,((U=n.julia)==null?void 0:U.z)??0),t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode??0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??4),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}const be=512,Ve=Math.PI*.5;function Aa(){const e=Y(u=>u.isRunning),t=Y(u=>u.lastMesh),o=Y(u=>u.loadedDefinition),n=Y(u=>u.bboxCenter),s=Y(u=>u.bboxSize),i=Y(u=>u.formulaParams),a=Y(u=>u.interlaceState),r=Y(u=>u.iters),l=Y(u=>u.qualitySettings),m=Y(u=>u.clipOutsideBounds),v=de.useRef(null),d=de.useRef(null),f=de.useRef(null),x=de.useRef(null),g=de.useRef({gl:null,prog:null,loc:{},defId:null,rawAngle:.6,rawPitch:.3,camAngle:.6,camPitch:.3,camDist:3.5,camTarget:[0,0,0],dragging:!1,dragMode:null,hover:null,lastX:0,lastY:0,shiftHeld:!1,snapped:!1,snapTarget:null,snapAnimId:0,rafId:0}),M=de.useRef(Fa()),h=t?"mesh":e?"slice":"fractal",F=de.useCallback(()=>{const u=g.current,c=Y.getState(),_=c.loadedDefinition;if(!u.gl||!_)return;const P=u.gl;let B;c.interlaceState&&(B={definition:c.interlaceState.definition,params:c.interlaceState.params,enabled:c.interlaceState.enabled,interval:c.interlaceState.interval,startIter:c.interlaceState.startIter});const z=c.qualitySettings,U=Xt(_)==="ifs"&&z.estimator>=1.5&&z.estimator<2.5?1:z.estimator,I=_.id+(B?"+"+B.definition.id:"")+":e"+(U??0);if(u.defId===I&&u.prog)return;u.prog&&(P.deleteProgram(u.prog),u.prog=null);try{const L=xn({definition:_,deType:"auto",interlace:B,estimator:U});console.log("[Preview] Compiling shader for",_.id,"| estimator:",U,"| length:",L.length),u.prog=Ea(P,Je,L),console.log("[Preview] Shader compiled OK for",_.id)}catch(L){console.warn("Preview shader compile failed for",_.id+":",L.message),u.prog=null,u.defId=null;return}P.useProgram(u.prog),P.bindVertexArray(P.createVertexArray()),u.loc={};const C=["uPower","uIters","uResolution","uCamPos","uCamTarget","uCamRight","uFov","uFudgeFactor","uDetail","uPixelThreshold","uClipBounds","uBoundsMin","uBoundsMax",...Ye];for(const L of C)u.loc[L]=P.getUniformLocation(u.prog,L);u.defId=I},[]),p=de.useCallback(()=>{const u=d.current;if(!u)return;const c=u.getContext("2d"),_=u.width,P=u.height;c.clearRect(0,0,_,P);const B=g.current,z=Y.getState(),[T,U,I]=z.bboxCenter,[C,L,A]=z.bboxSize,O=C*.5,S=L*.5,E=A*.5,G=q=>ho(q,B.camAngle,B.camPitch,B.camDist,be,be,B.camTarget),H=[];for(let q=0;q<2;q++)for(let se=0;se<2;se++)for(let K=0;K<2;K++)H.push([T+(q?O:-O),U+(se?S:-S),I+(K?E:-E)]);const X=H.map(G),$=[{color:"#f554",edges:[[0,4],[1,5],[2,6],[3,7]]},{color:"#5f54",edges:[[0,2],[1,3],[4,6],[5,7]]},{color:"#55f4",edges:[[0,1],[2,3],[4,5],[6,7]]}];for(const q of $){c.strokeStyle=q.color,c.lineWidth=1,c.setLineDash([4,3]),c.beginPath();for(const[se,K]of q.edges)c.moveTo(X[se][0],X[se][1]),c.lineTo(X[K][0],X[K][1]);c.stroke()}c.setLineDash([]);const j={"sizeX+":[T+O,U,I],"sizeX-":[T-O,U,I],"sizeY+":[T,U+S,I],"sizeY-":[T,U-S,I],"sizeZ+":[T,U,I+E],"sizeZ-":[T,U,I-E]},W={"sizeX+":"#f55","sizeX-":"#f55","sizeY+":"#5f5","sizeY-":"#5f5","sizeZ+":"#55f","sizeZ-":"#55f"},oe=Object.keys(j);for(const q of oe){const se=G(j[q]),K=B.hover===q?7:5;c.fillStyle=W[q],c.beginPath(),c.moveTo(se[0],se[1]-K),c.lineTo(se[0]+K,se[1]),c.lineTo(se[0],se[1]+K),c.lineTo(se[0]-K,se[1]),c.closePath(),c.fill(),B.hover===q&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke())}const ne=[T,U,I],Z=G(ne),re=B.camDist*.12,le=["#f55","#5f5","#55f"],ie=[[1,0,0],[0,1,0],[0,0,1]],ce=["X","Y","Z"];for(let q=0;q<3;q++){const se=bt(ne,gt(ie[q],re)),K=G(se),ee=K[0]-Z[0],Q=K[1]-Z[1],te=Math.sqrt(ee*ee+Q*Q);if(te<2)continue;const fe=B.hover==="center";c.strokeStyle=le[q],c.lineWidth=fe?3:2,c.beginPath(),c.moveTo(Z[0],Z[1]),c.lineTo(K[0],K[1]),c.stroke();const pe=ee/te,ve=Q/te;c.fillStyle=le[q],c.beginPath(),c.moveTo(K[0],K[1]),c.lineTo(K[0]-pe*6+ve*3,K[1]-ve*6-pe*3),c.lineTo(K[0]-pe*6-ve*3,K[1]-ve*6+pe*3),c.closePath(),c.fill(),c.font="bold 9px monospace",c.fillStyle=le[q],c.fillText(ce[q],K[0]+pe*6-3,K[1]+ve*6+3)}const J=B.hover==="center"?5:3;if(c.fillStyle=B.hover==="center"?"#fc0":"#fa0",c.beginPath(),c.arc(Z[0],Z[1],J,0,Math.PI*2),c.fill(),B.hover==="center"&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke()),B.snapTarget){const q=Ot(B.snapTarget.angle,B.snapTarget.pitch,.1);q&&(c.font="bold 11px monospace",c.fillStyle="#fa0",c.textAlign="right",c.fillText(q.label,_-6,14),c.textAlign="left")}else if(B.shiftHeld){const q=Ot(B.camAngle,B.camPitch,xo);q&&(c.font="10px monospace",c.fillStyle="#888",c.textAlign="right",c.fillText("snap: "+q.label,_-6,14),c.textAlign="left")}},[]),y=de.useCallback(()=>{const u=g.current;if(!u.gl||!u.prog){console.log("[Preview] Render skipped: gl=",!!u.gl,"prog=",!!u.prog);return}const c=u.gl,_=c.canvas;c.viewport(0,0,_.width,_.height),c.useProgram(u.prog);const P=Jt(u.camAngle,u.camPitch),B=u.camTarget;c.uniform2f(u.loc.uResolution,_.width,_.height),c.uniform3f(u.loc.uCamPos,P.pos[0]+B[0],P.pos[1]+B[1],P.pos[2]+B[2]),c.uniform3f(u.loc.uCamTarget,B[0],B[1],B[2]),c.uniform3f(u.loc.uCamRight,P.right[0],P.right[1],P.right[2]),c.uniform1f(u.loc.uFov,u.camDist);const z=Y.getState(),T=z.formulaParams;if(c.uniform1f(u.loc.uPower,T.paramA??8),c.uniform1i(u.loc.uIters,z.iters),Pa(c,u.loc,T),z.interlaceState){const I=z.interlaceState,C=I.params||{};u.loc.uInterlaceEnabled&&c.uniform1f(u.loc.uInterlaceEnabled,I.enabled?1:0),u.loc.uInterlaceInterval&&c.uniform1f(u.loc.uInterlaceInterval,I.interval??2),u.loc.uInterlaceStartIter&&c.uniform1f(u.loc.uInterlaceStartIter,I.startIter??0),u.loc.uInterlaceParamA&&c.uniform1f(u.loc.uInterlaceParamA,C.paramA??0),u.loc.uInterlaceParamB&&c.uniform1f(u.loc.uInterlaceParamB,C.paramB??0),u.loc.uInterlaceParamC&&c.uniform1f(u.loc.uInterlaceParamC,C.paramC??0),u.loc.uInterlaceParamD&&c.uniform1f(u.loc.uInterlaceParamD,C.paramD??0),u.loc.uInterlaceParamE&&c.uniform1f(u.loc.uInterlaceParamE,C.paramE??0),u.loc.uInterlaceParamF&&c.uniform1f(u.loc.uInterlaceParamF,C.paramF??0);const L=(O,S)=>{u.loc[O]&&c.uniform2f(u.loc[O],(S==null?void 0:S.x)??0,(S==null?void 0:S.y)??0)},A=(O,S)=>{u.loc[O]&&c.uniform3f(u.loc[O],(S==null?void 0:S.x)??0,(S==null?void 0:S.y)??0,(S==null?void 0:S.z)??0)};L("uInterlaceVec2A",C.vec2A),L("uInterlaceVec2B",C.vec2B),L("uInterlaceVec2C",C.vec2C),A("uInterlaceVec3A",C.vec3A),A("uInterlaceVec3B",C.vec3B),A("uInterlaceVec3C",C.vec3C)}else u.loc.uInterlaceEnabled&&c.uniform1f(u.loc.uInterlaceEnabled,0);const U=z.qualitySettings;if(u.loc.uFudgeFactor&&c.uniform1f(u.loc.uFudgeFactor,(U.fudgeFactor??1)*.75),u.loc.uDetail&&c.uniform1f(u.loc.uDetail,U.detail??1),u.loc.uPixelThreshold&&c.uniform1f(u.loc.uPixelThreshold,U.pixelThreshold??.5),u.loc.uDistanceMetric&&c.uniform1f(u.loc.uDistanceMetric,U.distanceMetric??0),u.loc.uClipBounds&&c.uniform1f(u.loc.uClipBounds,z.clipOutsideBounds?1:0),u.loc.uBoundsMin){const I=z.bboxSize.map(C=>C/2);c.uniform3f(u.loc.uBoundsMin,z.bboxCenter[0]-I[0],z.bboxCenter[1]-I[1],z.bboxCenter[2]-I[2]),c.uniform3f(u.loc.uBoundsMax,z.bboxCenter[0]+I[0],z.bboxCenter[1]+I[1],z.bboxCenter[2]+I[2])}c.drawArrays(c.TRIANGLE_STRIP,0,4),p()},[p]),w=de.useCallback(()=>{const u=g.current;u.rafId||(u.rafId=requestAnimationFrame(()=>{u.rafId=0;const c=Y.getState();(c.lastMesh?"mesh":c.isRunning?"slice":"fractal")==="fractal"&&(F(),y())}))},[F,y]),V=de.useCallback((u,c)=>{const _=g.current,P=Y.getState(),[B,z,T]=P.bboxCenter,[U,I,C]=P.bboxSize,L=U*.5,A=I*.5,O=C*.5,S=X=>ho(X,_.camAngle,_.camPitch,_.camDist,be,be,_.camTarget),E=8,G=S([B,z,T]);if(Math.abs(u-G[0])<E&&Math.abs(c-G[1])<E)return"center";const H=[["sizeX+",[B+L,z,T]],["sizeX-",[B-L,z,T]],["sizeY+",[B,z+A,T]],["sizeY-",[B,z-A,T]],["sizeZ+",[B,z,T+O]],["sizeZ-",[B,z,T-O]]];for(const[X,$]of H){const j=S($);if(Math.abs(u-j[0])<E&&Math.abs(c-j[1])<E)return X}return null},[]),k=de.useCallback(()=>{const u=g.current;if(u.shiftHeld){const c=Ot(u.rawAngle,u.rawPitch,xo);if(c){if(u.snapped=!0,u.snapTarget=c,!u.snapAnimId){const _=()=>{if(u.snapAnimId=0,!u.snapTarget)return;const P=Nt(u.snapTarget.angle-u.camAngle),B=u.snapTarget.pitch-u.camPitch;if(Math.sqrt(P*P+B*B)<.002){u.camAngle=u.snapTarget.angle,u.camPitch=u.snapTarget.pitch,w(),u.snapped&&(u.snapAnimId=requestAnimationFrame(_));return}u.camAngle+=P*.2,u.camPitch+=B*.2,w(),u.snapAnimId=requestAnimationFrame(_)};u.snapAnimId=requestAnimationFrame(_)}return}}u.snapped=!1,u.snapTarget=null,u.snapAnimId&&(cancelAnimationFrame(u.snapAnimId),u.snapAnimId=0),u.camAngle=u.rawAngle,u.camPitch=u.rawPitch},[w]);de.useEffect(()=>{const u=v.current;if(!u)return;const c=g.current;return c.gl=u.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0}),c.gl||console.warn("Preview: WebGL2 not available"),()=>{c.prog&&c.gl&&c.gl.deleteProgram(c.prog),c.prog=null,c.defId=null}},[]),de.useEffect(()=>{const u=f.current;if(!u)return;const c=u.getContext("2d");if(c)return ln((_,P,B)=>{const z=document.createElement("canvas");z.width=P,z.height=B,z.getContext("2d").putImageData(_,0,0),c.clearRect(0,0,be,be),c.imageSmoothingEnabled=!1,c.drawImage(z,0,0,be,be)}),()=>{cn()}},[]),de.useEffect(()=>{if(h!=="fractal")return;const u=g.current,_=Y.getState().interlaceState,P=((o==null?void 0:o.id)??"")+(_?"+"+_.definition.id:"");o&&u.defId!==P&&(u.defId=null),w()},[o,a,h,w]),de.useEffect(()=>{h==="fractal"&&w()},[i,a,r,n,s,m,l,h,w]),de.useEffect(()=>{if(!t)return;const u=x.current;if(!u)return;const c=u.getContext("2d");if(!c)return;const _=M.current;bo(_,t.positions,t.indices,t.vertexCount,t.faceCount,u.width),mt(_,c,u.width,u.height)},[t]),de.useEffect(()=>{const u=d.current;if(!u)return;const c=g.current,_=C=>{const L=u.getBoundingClientRect(),A=C.clientX-L.left,O=C.clientY-L.top;if(c.lastX=C.clientX,c.lastY=C.clientY,C.button===1||C.button===2){c.dragMode="pan",c.dragging=!0,u.style.cursor="all-scroll",C.preventDefault();return}const S=V(A,O);c.dragMode=S||"orbit",c.dragging=!0,u.style.cursor=c.dragMode==="orbit"?"grabbing":"ew-resize",C.preventDefault()},P=C=>{C.preventDefault()},B=C=>{if(!c.dragging){const O=u.getBoundingClientRect(),S=C.clientX-O.left,E=C.clientY-O.top,G=c.hover;c.hover=V(S,E),u.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab",c.hover!==G&&w();return}const L=C.clientX-c.lastX,A=C.clientY-c.lastY;if(c.lastX=C.clientX,c.lastY=C.clientY,c.dragMode==="pan"){const O=kt(-L,-A,c.camAngle,c.camPitch,c.camDist,be);c.camTarget=bt(c.camTarget,O),w()}else if(c.dragMode==="orbit")c.rawAngle+=L*.008,c.rawPitch=Math.max(-Ve,Math.min(Ve,c.rawPitch+A*.008)),k(),w();else if(c.dragMode==="center"){const O=kt(L,A,c.camAngle,c.camPitch,c.camDist,be),S=Y.getState(),[E,G,H]=S.bboxCenter;S.setBboxCenter([E+O[0],G+O[1],H+O[2]]),w()}else if(c.dragMode){const O=c.dragMode.charAt(4),S=c.dragMode.charAt(5)==="+"?1:-1,E=O==="X"?[1,0,0]:O==="Y"?[0,1,0]:[0,0,1],G=kt(L,A,c.camAngle,c.camPitch,c.camDist,be),H=Vt(G,E)*S,X=O==="X"?0:O==="Y"?1:2,$=Y.getState(),j=[...$.bboxSize],W=[...$.bboxCenter],oe=Math.max(.1,j[X]+H*2),ne=oe-j[X];$.bboxLock?$.setBboxSize([oe,oe,oe]):(j[X]=oe,W[X]+=ne*.5*S,$.setBboxSize(j),$.setBboxCenter(W)),w()}},z=()=>{c.dragging=!1,c.dragMode=null,u.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab"},T=C=>{C.preventDefault(),c.camDist=Math.max(.5,Math.min(20,c.camDist*(1+C.deltaY*.001))),w()},U=C=>{C.key==="Shift"&&!c.shiftHeld&&(c.shiftHeld=!0,k(),w())},I=C=>{C.key==="Shift"&&(c.shiftHeld=!1,k(),w())};return u.addEventListener("mousedown",_),window.addEventListener("mousemove",B),window.addEventListener("mouseup",z),u.addEventListener("wheel",T,{passive:!1}),u.addEventListener("contextmenu",P),window.addEventListener("keydown",U),window.addEventListener("keyup",I),()=>{u.removeEventListener("mousedown",_),window.removeEventListener("mousemove",B),window.removeEventListener("mouseup",z),u.removeEventListener("wheel",T),u.removeEventListener("contextmenu",P),window.removeEventListener("keydown",U),window.removeEventListener("keyup",I)}},[V,k,w]),de.useEffect(()=>{const u=x.current;if(!u)return;const c=M.current;let _=null;const P=()=>{const C=u.getContext("2d");C&&mt(c,C,u.width,u.height)},B=C=>{c.dragging=!0,c.lastMX=C.clientX,c.lastMY=C.clientY,_=C.button===1||C.button===2?"pan":"orbit"},z=()=>{c.dragging=!1,_=null},T=C=>{if(!c.dragging||!c.positions)return;const L=C.clientX-c.lastMX,A=C.clientY-c.lastMY;if(c.lastMX=C.clientX,c.lastMY=C.clientY,_==="pan"){const O=1/(c.scale*c.zoom);c.cx-=L*O,c.cy+=A*O,P()}else c.rotY+=L*.01,c.rotX+=A*.01,c.rotX=Math.max(-Ve,Math.min(Ve,c.rotX)),P()},U=C=>{C.preventDefault(),c.zoom*=C.deltaY>0?.9:1.1,c.zoom=Math.max(.1,Math.min(10,c.zoom)),c.positions&&P()},I=C=>{C.preventDefault()};return u.addEventListener("mousedown",B),window.addEventListener("mouseup",z),window.addEventListener("mousemove",T),u.addEventListener("wheel",U,{passive:!1}),u.addEventListener("contextmenu",I),()=>{u.removeEventListener("mousedown",B),window.removeEventListener("mouseup",z),window.removeEventListener("mousemove",T),u.removeEventListener("wheel",U),u.removeEventListener("contextmenu",I)}},[]);const R=de.useCallback((u,c,_)=>{const P=g.current;P.rawAngle=u,P.rawPitch=c,P.camAngle=u,P.camPitch=c,P.snapped=!1,P.snapTarget=null,P.snapAnimId&&(cancelAnimationFrame(P.snapAnimId),P.snapAnimId=0);const B=M.current;if(B.rotX=-c,B.rotY=u,B.positions){const z=x.current;if(z){const T=z.getContext("2d");T&&mt(B,T,z.width,z.height)}}w()},[w]),D=de.useCallback(()=>{const u=g.current;u.camTarget=[0,0,0];const c=M.current;if(c.positions){bo(c,c.positions,c.indices,c.vertexCount,c.faceCount,be);const _=x.current;if(_){const P=_.getContext("2d");P&&mt(c,P,_.width,_.height)}}w()},[w]),N=[{label:"F",title:"Front (-Z)",angle:0,pitch:0},{label:"B",title:"Back (+Z)",angle:Math.PI,pitch:0},{label:"L",title:"Left (-X)",angle:-Ve,pitch:0},{label:"R",title:"Right (+X)",angle:Ve,pitch:0},{label:"T",title:"Top (+Y)",angle:0,pitch:Ve},{label:"D",title:"Bottom (-Y)",angle:0,pitch:-Ve}];return b.jsxs("div",{className:"relative",style:{width:be,height:be},children:[b.jsx("canvas",{ref:v,width:be,height:be,className:"border border-white/10 rounded-sm",style:{imageRendering:"pixelated",display:h==="fractal"?"block":"none"}}),b.jsx("canvas",{ref:d,width:be,height:be,style:{position:"absolute",top:0,left:0,cursor:"grab",display:h==="fractal"?"block":"none"}}),b.jsx("canvas",{ref:f,width:be,height:be,className:"border border-white/10 rounded-sm",style:{imageRendering:"pixelated",display:h==="slice"?"block":"none"}}),b.jsx("canvas",{ref:x,width:be,height:be,className:"border border-white/10 rounded-sm",style:{cursor:"grab",display:h==="mesh"?"block":"none"}}),b.jsxs("div",{className:"absolute top-2 left-2 text-[10px] text-gray-500 uppercase tracking-wider pointer-events-none",children:[h==="fractal"&&"SDF Preview",h==="slice"&&"Sampling...",h==="mesh"&&"Mesh Preview"]}),h!=="slice"&&b.jsxs("div",{className:"absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/70 backdrop-blur rounded px-1 py-0.5 pointer-events-auto",children:[N.map(u=>b.jsx("button",{title:u.title,onClick:()=>R(u.angle,u.pitch,u.label),className:"w-[22px] h-[20px] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors",children:u.label},u.label)),b.jsx("div",{className:"w-px h-3 bg-gray-700 mx-0.5"}),b.jsx("button",{title:"Reset pan (re-center view)",onClick:D,className:"w-[22px] h-[20px] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors",children:"C"})]}),h==="fractal"&&b.jsxs("label",{className:"absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur rounded px-1.5 py-0.5 cursor-pointer pointer-events-auto select-none",children:[b.jsx("input",{type:"checkbox",checked:m,onChange:u=>Y.getState().setClipOutsideBounds(u.target.checked),className:"accent-amber-500 w-3 h-3"}),b.jsx("span",{className:"text-[9px] text-gray-400",children:"Clip bounds"})]}),h!=="slice"&&b.jsx("div",{className:"absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-gray-600 pointer-events-none whitespace-nowrap",children:"LMB orbit · RMB pan · Scroll zoom · Shift snap"})]})}function Ia(){const e=Y(),t=Y(o=>o.interlaceState);return t?b.jsxs("div",{className:"flex flex-col gap-1.5 border border-purple-700/40 rounded px-2 py-1.5 bg-purple-900/10 mt-1",children:[b.jsxs("div",{className:"text-[11px] text-purple-300 font-bold flex items-center justify-between",children:[b.jsxs("span",{children:["Interlace: ",t.definition.name]}),b.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[b.jsx("input",{type:"checkbox",checked:t.enabled,onChange:o=>e.setInterlaceState({...t,enabled:o.target.checked})}),b.jsx("span",{className:"text-[10px] text-purple-400",children:"enabled"})]})]}),b.jsxs("div",{className:"flex gap-3 text-[11px] text-gray-400",children:[b.jsxs("label",{className:"flex items-center gap-1",children:["Interval",b.jsx("input",{type:"number",min:1,max:16,step:1,value:t.interval,onChange:o=>e.setInterlaceState({...t,interval:Math.max(1,parseInt(o.target.value)||1)}),className:"w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"})]}),b.jsxs("label",{className:"flex items-center gap-1",children:["Start iter",b.jsx("input",{type:"number",min:0,max:64,step:1,value:t.startIter,onChange:o=>e.setInterlaceState({...t,startIter:Math.max(0,parseInt(o.target.value)||0)}),className:"w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"})]})]}),b.jsx(Mo,{definition:t.definition,params:t.params,onUpdate:(o,n)=>e.setInterlaceState({...t,params:{...t.params,[o]:n}})})]}):null}function Ra(){const e=we.useRef(null),t=we.useRef(null),o=we.useRef(0),n=we.useRef(!1),s=we.useCallback(()=>{n.current=!0,clearTimeout(o.current);const a=e.current,r=t.current;r.style.transition="none",r.style.transform="scale(1)",a.offsetHeight,a.style.transition="max-height 0.35s ease-out",a.style.maxHeight="200px"},[]),i=we.useCallback(()=>{n.current=!1;const a=e.current,r=t.current;r.style.transition="transform 0.3s ease-in",r.style.transform="scale(0) translateY(0)",r.style.transformOrigin="bottom center",o.current=window.setTimeout(()=>{n.current||(a.style.transition="none",a.style.maxHeight="0")},310)},[]);return b.jsxs("div",{className:"fixed bottom-5 right-5 z-50 inline-flex flex-col items-stretch",onMouseEnter:s,onMouseLeave:i,children:[b.jsx("div",{ref:e,className:"overflow-hidden",style:{maxHeight:0},children:b.jsx("img",{ref:t,src:"guy.png",alt:"",className:"pointer-events-none object-contain block w-full",style:{transform:"scale(0)",transformOrigin:"bottom center"}})}),b.jsx("a",{href:"https://ko-fi.com/gmtfractals",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-2 px-3 py-1 rounded bg-[#13C3FF] hover:bg-[#00b0f0] text-white text-[11px] font-bold transition-colors",children:"Support GMT"})]})}function Da(){const e=Y(o=>o.iters),t=Y(o=>o.setIters);return b.jsxs("div",{className:"font-mono bg-[#080808] text-gray-200 h-screen flex flex-col overflow-hidden",children:[b.jsx("h1",{className:"text-sm font-bold text-white tracking-wide px-5 pt-4 pb-2 shrink-0",children:"GMT — Fractal Mesh Export"}),b.jsxs("div",{className:"flex gap-4 flex-1 min-h-0 px-5 pb-4",children:[b.jsxs("div",{className:"flex flex-col gap-2.5 w-[340px] shrink-0 overflow-y-auto pr-1",children:[b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(et,{label:"Export",defaultOpen:!0,children:b.jsx(Ma,{})})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(mn,{})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(et,{label:"Bounds",defaultOpen:!0,children:b.jsx(aa,{})})})]}),b.jsxs("div",{className:"flex flex-col gap-2.5 flex-1 min-w-0 items-center",children:[b.jsx(Aa,{}),b.jsx(sa,{})]}),b.jsxs("div",{className:"flex flex-col gap-2.5 w-[300px] shrink-0 overflow-y-auto pl-1",children:[b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(et,{label:"Formula",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-2 mt-1",children:[b.jsx(dn,{}),b.jsx(Pe,{label:"Iterations",value:e,onChange:t,min:2,max:64,step:1,variant:"full"})]})})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(et,{label:"Parameters",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-1 mt-1",children:[b.jsx(Mo,{}),b.jsx(Ia,{})]})})})]})]}),b.jsx(Ra,{})]})}function La(){const e=de.useRef(!1);return de.useEffect(()=>{if(e.current)return;e.current=!0;try{const o=localStorage.getItem("gmt-mesh-export-scene");if(o){localStorage.removeItem("gmt-mesh-export-scene"),Co(o,"(from main app)");return}}catch(o){console.warn("[MeshExport] Auto-load from main app failed:",o)}const t=Y.getState();if(!t.loadedDefinition){const o=Oe.get(t.selectedFormulaId);o&&(t.setLoadedDefinition(o),t.setFormulaParams(wo(o)))}},[]),b.jsx(Da,{})}const Go=document.getElementById("root");if(!Go)throw new Error("Could not find root element to mount to");const _a=Ko.createRoot(Go);_a.render(b.jsx(we.StrictMode,{children:b.jsx(La,{})}));
