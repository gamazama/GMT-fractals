var Qo=Object.defineProperty;var Ko=(e,t,o)=>t in e?Qo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var oe=(e,t,o)=>Ko(e,typeof t!="symbol"?t+"":t,o);import{ap as _e,cp as Te,cq as en,cr as ct,I as Ae,b4 as jt,bb as ot,ai as me,f as To,c1 as tn,x as on,y as nn}from"./CollapsibleSection-BNXp-YEC.js";import{r as de,j as x,R as Ce}from"./three-fiber-BpjhY67l.js";import{a as an,c as sn}from"./three-drei-7h0TGCLY.js";import{ar as rn}from"./FormulaFormat-CArkfUCJ.js";import{m as ln,R as cn,T as un,U as fn}from"./weaveMigration-B31bQA1i.js";import{d as Me,c as $e,n as ke,m as oo}from"./three-t6Th-fjv.js";import"./pako-DwGzBETv.js";import"./gradientEditorEntrance-CfFverW5.js";import"./createSingleSlot-BAHyf9Ga.js";import"./gradientSeam-70pEQwLM.js";const Oe={estimator:0,distanceMetric:0,surfaceThreshold:0,fudgeFactor:1,detail:1,pixelThreshold:.5};let nt=null;function dn(e){nt=e}function mn(){nt=null}function pn(e,t,o){nt==null||nt(e,t,o)}const no=[3,3,3],ao=[0,0,0];function hn(){const e=new Date;return e.toTimeString().split(" ")[0]+"."+String(e.getMilliseconds()).padStart(3,"0")}const W=an()((e,t)=>({selectedFormulaId:"Mandelbulb",loadedDefinition:null,formulaParams:{},weaveState:null,loadedFilename:null,loadError:null,qualitySettings:{...Oe},resolution:512,iters:12,deType:"auto",deSamples:2,zSubSlices:4,minFeature:"auto",cavityFill:"2",closingRadius:0,newton:!0,newtonSteps:6,smoothPasses:3,smoothLambda:.5,colorSamples:8,colorJitter:.5,exportFormat:"vdb",customFilename:"",vdbColor:!1,bboxCenter:ao,bboxSize:no,bboxLock:!1,clipOutsideBounds:!1,isRunning:!1,isCancelled:!1,progress:0,phaseProgress:0,phaseName:"",status:"",logEntries:[],memoryBlocks:[],lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,useNarrowBand:!1,gl:null,setSelectedFormula:o=>e({selectedFormulaId:o}),setLoadedDefinition:o=>e({loadedDefinition:o}),setFormulaParams:o=>e({formulaParams:o}),setWeaveState:o=>e({weaveState:o}),updateParam:(o,n)=>e(s=>({formulaParams:{...s.formulaParams,[o]:n}})),setLoadedFilename:o=>e({loadedFilename:o}),setLoadError:o=>e({loadError:o}),setQualitySettings:o=>e({qualitySettings:o}),updateQuality:(o,n)=>e(s=>({qualitySettings:{...s.qualitySettings,[o]:n}})),setResolution:o=>e({resolution:o}),setIters:o=>e({iters:o}),setDeType:o=>e({deType:o}),setDeSamples:o=>e({deSamples:o}),setZSubSlices:o=>e({zSubSlices:o}),setMinFeature:o=>e({minFeature:o}),setCavityFill:o=>e({cavityFill:o}),setClosingRadius:o=>e({closingRadius:o}),setNewton:o=>e({newton:o}),setNewtonSteps:o=>e({newtonSteps:o}),setSmoothPasses:o=>e({smoothPasses:o}),setSmoothLambda:o=>e({smoothLambda:o}),setColorSamples:o=>e({colorSamples:o}),setColorJitter:o=>e({colorJitter:o}),setExportFormat:o=>e({exportFormat:o}),setVdbColor:o=>e({vdbColor:o}),setCustomFilename:o=>e({customFilename:o}),setBboxCenter:o=>e({bboxCenter:o}),setBboxSize:o=>e({bboxSize:o}),setBboxLock:o=>e({bboxLock:o}),setClipOutsideBounds:o=>e({clipOutsideBounds:o}),resetBounds:()=>e({bboxCenter:[...ao],bboxSize:[...no]}),setRunning:o=>e({isRunning:o}),setCancelled:o=>e({isCancelled:o}),setProgress:o=>e({progress:o}),setPhase:(o,n)=>e({phaseName:o,phaseProgress:n}),setStatus:o=>e({status:o}),addLog:(o,n="info")=>e(s=>({logEntries:[...s.logEntries,{time:hn(),msg:o,type:n}]})),clearLog:()=>e({logEntries:[]}),memAlloc:(o,n,s,r)=>e(a=>{const i=a.memoryBlocks.findIndex(p=>p.id===o),l=[...a.memoryBlocks];return i>=0?l[i]={id:o,label:n,mb:s,color:r,freed:!1}:l.push({id:o,label:n,mb:s,color:r,freed:!1}),{memoryBlocks:l}}),memFree:o=>e(n=>({memoryBlocks:n.memoryBlocks.map(s=>s.id===o?{...s,freed:!0}:s)})),clearMemory:()=>e({memoryBlocks:[]}),setMesh:(o,n)=>e({lastMesh:o,lastBaseName:n}),setTimings:(o,n,s)=>e({lastTimings:o,smoothingSkipped:n,useNarrowBand:s}),setExportBlob:(o,n)=>e({lastBlob:o,lastFilename:n}),setGL:o=>e({gl:o}),resetMeshResult:()=>e({lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,gl:null,logEntries:[],memoryBlocks:[],progress:0,phaseName:"",status:""})}));function Gt(e){const t={};for(const[o,n]of Object.entries(e.formulaParams??{}))/^ws\d/.test(o)&&(t[o]=n);return Object.assign(t,e.weaveState??{}),Object.keys(t).length?t:void 0}function Do(e){var s,r,a,i;const t={};for(const l of e.parameters)l&&(t[l.id]=l.default);const o=(r=(s=e.defaultPreset)==null?void 0:s.features)==null?void 0:r.geometry;o&&(o.juliaMode&&(t.juliaMode=1),(o.juliaX!==void 0||o.juliaY!==void 0||o.juliaZ!==void 0)&&(t.julia={x:o.juliaX??0,y:o.juliaY??0,z:o.juliaZ??0}));const n=(i=(a=e.defaultPreset)==null?void 0:a.features)==null?void 0:i.coreMath;if(n)for(const l of e.parameters)l&&n[l.id]!==void 0&&(t[l.id]=n[l.id]);return t}function Ro(e,t){var f,g,b,y;const o=W.getState(),{def:n,preset:s}=rn(e);if(!n)throw new Error("No formula definition found in GMF");_e.get(n.id)||_e.register(n);const r=s&&ln(s),a=(r==null?void 0:r.formula)&&_e.get(r.formula)||n;o.setSelectedFormula(a.id),o.setLoadedDefinition(a),o.setLoadedFilename(t??null),o.setLoadError(null);const i={},l=(f=r==null?void 0:r.features)==null?void 0:f.coreMath,p=(g=r==null?void 0:r.features)==null?void 0:g.weave;for(const v of a.parameters){if(!v)continue;const M=v.feature==="weave"?p:l;i[v.id]=M&&M[v.id]!==void 0?M[v.id]:v.default}if(o.setFormulaParams(i),p){const v={};for(const[M,m]of Object.entries(p))M.startsWith("weave")&&(v[M]=m);o.setWeaveState(Object.keys(v).length>0?v:null)}else o.setWeaveState(null);(l==null?void 0:l.iterations)!==void 0&&o.setIters(Math.round(l.iterations));const h=(b=r==null?void 0:r.features)==null?void 0:b.geometry;h&&(h.juliaMode&&(i.juliaMode=1),(h.juliaX!==void 0||h.juliaY!==void 0||h.juliaZ!==void 0)&&(i.julia={x:h.juliaX??0,y:h.juliaY??0,z:h.juliaZ??0}),o.setFormulaParams(i));const u=(y=r==null?void 0:r.features)==null?void 0:y.quality;u?(o.setQualitySettings({estimator:u.estimator??0,distanceMetric:u.distanceMetric??0,surfaceThreshold:0,fudgeFactor:u.fudgeFactor??1,detail:u.detail??1,pixelThreshold:u.pixelThreshold??.5}),u.distanceMetric!==void 0&&(i.distanceMetric=u.distanceMetric),u.deBailout!==void 0&&(i.deBailout=u.deBailout),(u.distanceMetric!==void 0||u.deBailout!==void 0)&&o.setFormulaParams(i)):o.setQualitySettings({...Oe})}const vn=()=>{const e=W(),t=W(p=>p.loadedFilename),o=W(p=>p.loadError),n=de.useRef(null),r=_e.getAll().map(p=>({label:p.name,value:p.id})),a=()=>{const p=W.getState();return p.lastMesh||p.lastBlob?window.confirm("Changing formula will clear the current mesh and export data. Continue?"):!0},i=p=>{var u,f;if(!a())return;e.resetMeshResult(),e.setSelectedFormula(p);const h=_e.get(p);if(h){e.setLoadedDefinition(h),e.setFormulaParams(Do(h)),e.setWeaveState(null),e.setLoadedFilename(null),e.setLoadError(null);const g=(f=(u=h.defaultPreset)==null?void 0:u.features)==null?void 0:f.quality;e.setQualitySettings(g?{estimator:g.estimator??Oe.estimator,distanceMetric:g.distanceMetric??Oe.distanceMetric,surfaceThreshold:Oe.surfaceThreshold,fudgeFactor:g.fudgeFactor??Oe.fudgeFactor,detail:g.detail??Oe.detail,pixelThreshold:g.pixelThreshold??Oe.pixelThreshold}:{...Oe})}},l=p=>{var f;const h=(f=p.target.files)==null?void 0:f[0];if(!h)return;if(!a()){p.target.value="";return}e.resetMeshResult(),e.setLoadError(null);const u=new FileReader;u.onload=()=>{try{Ro(u.result,h.name)}catch(g){console.error("Failed to load GMF file:",g),e.setLoadError("Failed to parse GMF: "+g.message),e.setLoadedFilename(null)}},u.readAsText(h),p.target.value=""};return x.jsxs("div",{className:"flex flex-col gap-1.5",children:[x.jsx(Te,{value:e.selectedFormulaId,options:r,onChange:i,fullWidth:!0}),x.jsx("button",{onClick:()=>{var p;return(p=n.current)==null?void 0:p.click()},className:"text-[11px] px-3 py-1.5 bg-info/60 text-info border border-info/40 rounded hover:bg-info/60 cursor-pointer font-mono",children:"Load GMF..."}),t&&x.jsx("div",{className:"text-[10px] text-fg-muted truncate px-0.5",title:t,children:t}),o&&x.jsx("div",{className:"text-[10px] text-danger bg-danger/20 px-2 py-1 rounded",children:o}),x.jsx("input",{ref:n,type:"file",accept:".gmf",className:"hidden",onChange:l})]})},Lt=({primaryAxis:e,secondaryAxis:t,disabled:o,onHover:n})=>x.jsx("div",{className:`w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden transition-all duration-150 ease-out relative bg-line/[0.08] border border-line/5 ${o?"opacity-30 pointer-events-none":""}`,onMouseEnter:()=>n==null?void 0:n(!0),onMouseLeave:()=>n==null?void 0:n(!1),title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${t.toUpperCase()}`,children:x.jsx("div",{className:"absolute inset-0 flex items-center justify-center opacity-50",children:x.jsx("div",{className:"w-3 h-3 border border-line/20 rotate-45"})})}),Nt=({value:e,onChange:t,mode:o="normal",modeToggleable:n=!1,axes:s,axisConfig:r,showDualAxisPads:a=!0,showRotationGizmo:i=!1,label:l,disabled:p=!1,trackKeys:h,trackLabels:u,interactionMode:f="param",headerRight:g,onContextMenu:b,dataHelpId:y})=>{const v=e.w!==void 0,M=e.z!==void 0,[m,w]=Ce.useState(e),[C,U]=Ce.useState(null),[z,R]=Ce.useState(o),L=de.useRef(!1),V=de.useRef(null);de.useEffect(()=>{L.current||w(e)},[e.x,e.y,e.z,e.w,M,v]);const d=z==="rotation",c=Ce.useCallback(D=>{var P,G;return d?en:(r==null?void 0:r.mapping)||((P=s==null?void 0:s.x)==null?void 0:P.mapping)||((G=s==null?void 0:s.y)==null?void 0:G.mapping)},[d,r,s]),I=Ce.useCallback(D=>{if(d)return{min:-2*Math.PI,max:2*Math.PI};const P=(s==null?void 0:s[D])||r;return{min:(P==null?void 0:P.min)??-1e4,max:(P==null?void 0:P.max)??1e4,hardMin:P==null?void 0:P.hardMin,hardMax:P==null?void 0:P.hardMax}},[d,s,r]),F=Ce.useCallback(()=>{L.current=!0,V.current={...m}},[m]),_=Ce.useCallback(()=>{V.current=null,L.current=!1},[]),k=Ce.useCallback((D,P)=>{const G={...m,[D]:P};w(G),t(G)},[m,t]),E=Ce.useCallback((D,P,G,H)=>{const $={...V.current||m,[D]:G,[P]:H};w($),t($)},[m,t]),j=C==="xy",A=C==="xy"||C==="zy",T=C==="zy"||C==="wz",B=C==="wz",S=(D,P)=>{const G=I(P),H=c(P),X=s==null?void 0:s[P];return{variant:"compact",showTrack:!0,disabled:p,highlight:D===0?j:D===1?A:D===2?T:B,mapping:H,min:G.min,max:G.max,hardMin:G.hardMin,hardMax:G.hardMax,step:d?.01:(r==null?void 0:r.step)??(X==null?void 0:X.step)??.01,...r,...X}},O=()=>n?x.jsx("button",{onClick:()=>R(D=>D==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors ${z==="rotation"?"text-accent-400 bg-accent-500/20":"text-fg-dim hover:text-fg-tertiary"}`,title:z==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null;return x.jsxs("div",{className:"mb-px animate-slider-entry","data-help-id":y,onContextMenu:b,children:[l&&x.jsx("div",{className:"flex items-stretch bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5",children:x.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[n&&O(),g,x.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${p?"text-fg-faint":"text-fg-muted"}`,children:[l,d&&x.jsx("span",{className:"text-[8px] text-accent-400/60",children:"(π)"})]})]})}),x.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},children:x.jsxs("div",{className:"flex gap-px w-full h-full",children:[x.jsxs("div",{className:"flex-1 flex items-center relative group",children:[x.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-line/10 bg-line/[0.05] pointer-events-none select-none z-10 ${ct[0].text}`,children:x.jsx("span",{className:"text-[10px] font-bold",children:"X"})}),x.jsx("div",{className:"flex-1 pl-5",children:x.jsx(Ae,{value:m.x,onChange:D=>k("x",D),onDragStart:F,onDragEnd:_,...S(0,"x")})})]}),a&&x.jsx(Lt,{primaryAxis:"x",secondaryAxis:"y",primaryValue:m.x,secondaryValue:m.y,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(D,P)=>E("x","y",D,P),onDragStart:F,onDragEnd:_,disabled:p,onHover:D=>U(D?"xy":null)}),x.jsxs("div",{className:"flex-1 flex items-center relative group",children:[x.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-line/10 bg-line/[0.05] pointer-events-none select-none z-10 ${ct[1].text}`,children:x.jsx("span",{className:"text-[10px] font-bold",children:"Y"})}),x.jsx("div",{className:"flex-1 pl-5",children:x.jsx(Ae,{value:m.y,onChange:D=>k("y",D),onDragStart:F,onDragEnd:_,...S(1,"y")})})]}),M&&a&&x.jsx(Lt,{primaryAxis:"z",secondaryAxis:"y",primaryValue:m.z??0,secondaryValue:m.y,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(D,P)=>E("z","y",D,P),onDragStart:F,onDragEnd:_,disabled:p,onHover:D=>U(D?"zy":null)}),M&&x.jsxs("div",{className:"flex-1 flex items-center relative group",children:[x.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-line/10 bg-line/[0.05] pointer-events-none select-none z-10 ${ct[2].text}`,children:x.jsx("span",{className:"text-[10px] font-bold",children:"Z"})}),x.jsx("div",{className:"flex-1 pl-5",children:x.jsx(Ae,{value:m.z??0,onChange:D=>k("z",D),onDragStart:F,onDragEnd:_,...S(2,"z")})})]}),v&&a&&x.jsx(Lt,{primaryAxis:"x",secondaryAxis:"z",primaryValue:m.w??0,secondaryValue:m.z??0,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(D,P)=>E("w","z",D,P),onDragStart:F,onDragEnd:_,disabled:p,onHover:D=>U(D?"wz":null)}),v&&x.jsxs("div",{className:"flex-1 flex items-center relative group",children:[x.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-line/10 bg-line/[0.05] pointer-events-none select-none z-10 ${ct[3].text}`,children:x.jsx("span",{className:"text-[10px] font-bold",children:"W"})}),x.jsx("div",{className:"flex-1 pl-5",children:x.jsx(Ae,{value:m.w??0,onChange:D=>k("w",D),onDragStart:F,onDragEnd:_,...S(3,"w")})})]})]})})]})},gn=({definition:e,params:t,onUpdate:o})=>{const n=W(f=>f.loadedDefinition),s=W(f=>f.formulaParams),r=W(f=>f.updateParam),a=e||n,i=t||s,l=o||r;if(!a)return null;const p=a.parameters.filter(f=>f!==null),h=i.juliaMode??0,u=i.julia??{x:0,y:0,z:0};return x.jsxs("div",{className:"flex flex-col gap-px",children:[p.map(f=>{const g=i[f.id],b=f.type||"float";if(f.mode==="toggle"){const y=g?typeof g=="number"?g>0:!!g:!1;return x.jsx(jt,{label:f.label,value:y,onChange:v=>l(f.id,v?1:0)},f.id)}if(b==="vec2"||b==="vec3"||b==="vec4"){const y=g??f.default??{x:0,y:0,z:0,w:0};return x.jsx(Nt,{label:f.label,value:y,onChange:v=>l(f.id,v),axisConfig:{min:f.min,max:f.max,step:f.step||.01},showDualAxisPads:b!=="vec2"},f.id)}return x.jsx(Ae,{label:f.label,value:g??f.default??0,onChange:y=>l(f.id,y),min:f.min,max:f.max,step:f.step||.01,defaultValue:f.default,variant:"full"},f.id)}),x.jsxs("div",{className:"border-t border-line/5 mt-1 pt-1",children:[x.jsx(jt,{label:"Julia Mode",value:h>.5,onChange:f=>l("juliaMode",f?1:0)}),h>.5&&x.jsx(Nt,{label:"Julia Offset",value:u,onChange:f=>l("julia",f),axisConfig:{min:-4,max:4,step:.01}})]})]})};function Ye({label:e,children:t}){return x.jsxs("div",{className:"flex flex-col gap-px border-t border-line/5 first:border-t-0 pt-1 first:pt-0",children:[x.jsx("span",{className:"text-[9px] text-fg-dim uppercase tracking-wide px-0.5 mb-0.5",children:e}),t]})}function xn(){var r;const e=W(),t=W(a=>a.qualitySettings),o=W(a=>a.loadedDefinition),n=W(a=>a.exportFormat)==="vdb",s=!!((r=o==null?void 0:o.shader.capabilities)!=null&&r.has("estimator:cutting-plane"));return x.jsx(ot,{label:"Pipeline",defaultOpen:!0,children:x.jsxs("div",{className:"flex flex-col gap-1",children:[x.jsxs(Ye,{label:"Quality",children:[x.jsx(Te,{label:"Estimator",value:t.estimator,options:[{label:"Analytic (Log)",value:0},{label:"Linear (Fold 1.0)",value:1},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3},{label:"Linear (Fold 2.0)",value:4},{label:"Cutting Plane",value:5,disabled:!s}],onChange:a=>e.updateQuality("estimator",a)}),x.jsx(Te,{label:"Distance Metric",value:t.distanceMetric,options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],onChange:a=>e.updateQuality("distanceMetric",a)}),x.jsx(Ae,{label:"Surface Threshold",value:t.surfaceThreshold,onChange:a=>e.updateQuality("surfaceThreshold",a),min:0,max:2,step:.001,variant:"full"}),x.jsx(Ae,{label:"Fudge Factor",value:t.fudgeFactor,onChange:a=>e.updateQuality("fudgeFactor",a),min:.01,max:1,step:.01,variant:"full"}),x.jsx(Ae,{label:"Ray Detail",value:t.detail,onChange:a=>e.updateQuality("detail",a),min:.1,max:10,step:.1,variant:"full"}),x.jsx(Ae,{label:"Pixel Threshold",value:t.pixelThreshold,onChange:a=>e.updateQuality("pixelThreshold",a),min:.1,max:2,step:.1,variant:"full"})]}),x.jsxs(Ye,{label:"SDF",children:[x.jsxs("div",{className:"flex items-end gap-1",children:[x.jsx("div",{className:"flex-1",children:x.jsx(Te,{label:"Resolution",value:[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?e.resolution:"custom",options:[...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].map(a=>({label:`${a}³`,value:a})),...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?[]:[{label:`${e.resolution}³ (custom)`,value:e.resolution}]],onChange:a=>{typeof a=="number"&&e.setResolution(a)}})}),x.jsx("input",{type:"number",min:16,max:8192,step:1,value:e.resolution,onChange:a=>{const i=Math.max(16,Math.min(8192,parseInt(a.target.value)||512));e.setResolution(i)},className:"w-[60px] h-[26px] bg-surface-header border border-line/20 rounded text-[11px] text-fg-secondary text-center font-mono",title:"Custom resolution (16–8192)"})]}),x.jsx(Te,{label:"DE Samples",value:e.deSamples,options:[{label:"1",value:1},{label:"2³ = 8",value:2},{label:"3³ = 27",value:3},{label:"4³ = 64",value:4}],onChange:e.setDeSamples}),x.jsx(Te,{label:"Z Sub-slices",value:e.zSubSlices,options:[1,2,4,8,16].map(a=>({label:a===1?"off":String(a),value:a})),onChange:e.setZSubSlices}),!n&&x.jsx(Te,{label:"DE Type",value:e.deType,options:[{label:"Auto",value:"auto"},{label:"Power",value:"power"},{label:"IFS",value:"ifs"}],onChange:e.setDeType})]}),!n&&x.jsxs(x.Fragment,{children:[x.jsxs(Ye,{label:"Filter",children:[x.jsx(Te,{label:"Min Feature",value:e.minFeature,options:[{label:"Auto",value:"auto"},{label:"Off",value:"off"},{label:"1x voxel",value:"1"},{label:"1.5x",value:"1.5"},{label:"2x",value:"2"},{label:"3x",value:"3"},{label:"5x",value:"5"}],onChange:e.setMinFeature}),x.jsx(Te,{label:"Cavity Fill",value:e.cavityFill,options:[{label:"Off",value:"off"},{label:"Dilate 1",value:"1"},{label:"Dilate 2",value:"2"},{label:"Dilate 4",value:"4"},{label:"Dilate 8",value:"8"},{label:"Dilate 16",value:"16"},{label:"Escape Test",value:"escape"}],onChange:e.setCavityFill}),x.jsx(Ae,{label:"Closing",value:e.closingRadius,onChange:e.setClosingRadius,min:0,max:20,step:.5,variant:"full"})]}),x.jsxs(Ye,{label:"Newton",children:[x.jsx(jt,{label:"Newton Projection",value:e.newton,onChange:e.setNewton}),x.jsx(Te,{label:"Steps",value:e.newtonSteps,options:[2,4,6,8,12,16].map(a=>({label:String(a),value:a})),onChange:e.setNewtonSteps,disabled:!e.newton})]}),x.jsxs(Ye,{label:"Smooth",children:[x.jsx(Ae,{label:"Passes",value:e.smoothPasses,onChange:e.setSmoothPasses,min:0,max:50,step:1,variant:"full"}),x.jsx(Te,{label:"Lambda",value:e.smoothLambda,options:[{label:"0.3 (gentle)",value:.3},{label:"0.5 (standard)",value:.5},{label:"0.7 (strong)",value:.7}],onChange:e.setSmoothLambda})]}),x.jsxs(Ye,{label:"Color",children:[x.jsx(Te,{label:"Samples",value:e.colorSamples,options:[1,4,8,16,32,64,128,256].map(a=>({label:a===1?"off":String(a),value:a})),onChange:e.setColorSamples}),x.jsx(Te,{label:"Jitter Radius",value:e.colorJitter,options:[.25,.5,1,2].map(a=>({label:`${a}x`,value:a})),onChange:e.setColorJitter})]})]})]})})}const Xt=`
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = max(dot(z,z), 1.0e-9);
    float minR2 = max(minR * minR, 1.0e-9);
    float fixedR2 = max(fixedR * fixedR, 1.0e-9);
    float k = clamp(fixedR2 / r2, 1.0, fixedR2 / minR2);
    z *= k; dz *= k;
}`,Ht=`
void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}`;function Fo(e){return`
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
}`}const at=`
uniform float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;
uniform vec2  uVec2A, uVec2B, uVec2C;
uniform vec3  uVec3A, uVec3B, uVec3C;
uniform vec4  uVec4A, uVec4B, uVec4C;
uniform vec3  uJulia;
uniform float uJuliaMode;
uniform float uEscapeThresh;
uniform float uDeBailout;
uniform float uDistanceMetric;
#define uIterations float(uIters)
`,bt=`
// --- Helper functions for mesh export formulas ---
${Xt}
${Ht}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

// Shared transforms (Rodrigues rotation, twist)
${cn}

// Simplex noise (Stefan Gustavson)
${Fo("_")}
`,Po=`
#define PI 3.14159265
#define TAU 6.28318530
#define INV_TAU 0.15915494
#define INV_PI  0.31830989
const float phi = 1.61803398875;
`,bn=e=>`
// Constants
${Po}
#define MAX_DIST 10000.0
#define MISS_DIST 1000.0            // Far sentinel for missed rays — d > MISS_DIST means no geometry hit; must be < MAX_DIST
#define BOUNDING_RADIUS 400.0
#define PRECISION_RATIO_HIGH 5.0e-7 // ~0.5 ppm — float precision floor, scales with distance from fractal origin
#define PRECISION_RATIO_LOW  1.0e-5 // ~10 ppm — low precision / mobile float floor
#define GGX_EPSILON 1.0e-7          // GGX denominator safety — must be tiny: at low roughness (a²≈6e-6 at r=0.05), an epsilon of 1e-4 dominates the peak math and crushes specular highlights ~800,000× dimmer than they should be. 1e-7 only kicks in at literal div-by-zero singularities and leaves the GGX peak math intact.
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

${Xt}
${Ht}

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

`,yt=`
// --- Cutting-plane DE accumulators (engine-provided) ---
float cp_dmin;
float cp_scale;
float cp_trap;
`;function Wt(e){if(e.shader.getDist)return"custom";const t=e.shader.function+" "+e.shader.loopBody+" "+(e.shader.preamble||"");return/boxFold|sphereFold/.test(t)||/dr\s*=\s*dr\s*\*\s*\w/.test(t)&&!/pow\s*\(/.test(t)||/abs\s*\(\s*z/.test(t)&&/dr\s*[\*=]/.test(t)&&!/pow\s*\(/.test(t)?"ifs":"power"}function Ao(e){return e.deType!=="auto"?e.deType:Wt(e.definition)}function Lo(e){return e.shader.getDist?`
vec2 _getDistCustom(float r, float safeDr, float iter, vec4 z) {
  float dr = safeDr;
  ${e.shader.getDist}
}
`:""}function so(e,t=!1){return e>4.5&&!t&&(e=1),e<.5?`float logR2 = log2(r * r);
    return 0.17328679 * logR2 * r / safeDr;`:e<1.5?"return (r - 1.0) / safeDr;":e<2.5?"return r / safeDr;":e<3.5?`float logR2 = log2(r * r);
    return 0.34657359 * logR2 * r / (safeDr + 8.0);`:e<4.5?"return (r - 2.0) / safeDr;":"return abs(cp_dmin);"}function Io(e,t,o,n,s=!1){const r=n!==void 0&&n>4.5&&s;if(t&&!r)return e==="ifs"?`return _getDistCustom(r, safeDr, iter, z).x - ${o};`:"return _getDistCustom(r, safeDr, iter, z).x;";if(n!==void 0&&n>0){const a=so(n,s);if(n>=.5&&n<1.5||n>=3.5){const i=a.split(`
`),l=i[i.length-1];return i[i.length-1]=l.replace(/;$/,` - ${o};`),i.join(`
`)}if(e!=="ifs")return`if (r > 2.0) { ${a} }
    return -1.0;`}return e==="power"?`// Power fractals: orbit must escape (r > 2) for valid DE.
    // Non-escaped = interior sentinel.
    if (r > 2.0) { ${so(0)} }
    return -1.0;`:`return (r - 1.0) / safeDr - ${o};`}function wt(e){const t=e.shader,o=`${t.preamble??""}
${t.function}
${t.loopInit??""}
${t.loopBody}
${t.getDist??""}`,n=[...new Set(o.match(/\bu(?:Ws\d(?:Param[A-F]|Vec[234][A-C])|Weave(?:Enabled|Interval\d|StartIter\d|Beats\d))\b/g)??[])];if(n.length===0)return"";const s=r=>/Vec2/.test(r)?"vec2":/Vec3/.test(r)?"vec3":/Vec4/.test(r)?"vec4":"float";return n.map(r=>`uniform ${s(r)} ${r};`).join(`
`)+`
`}function We(e){return un(e,void 0,"estimator:cutting-plane")}function St(e,t){return`  vec4 z = vec4(pos, 0.0);
  vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
  float dr = 1.0;
  float trap = 1e10;
  float iter = 0.0;
  ${We(e)?"cp_dmin = -1e10; cp_scale = 1.0; cp_trap = 1e10;":""}
  ${e.shader.loopInit||""}

  for (int i = 0; i < 100; i++) {
    if (i >= ${t}) break;
    float r2 = dot(z.xyz, z.xyz);
    if (r2 > 1e4) break;
    ${e.shader.loopBody}
    iter += 1.0;
  }`}const Ke=`#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 2 - 1, (gl_VertexID >> 1) * 2 - 1);
  gl_Position = vec4(p, 0, 1);
}`;function yn(e){const t=e.definition;return`#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
${at}
${wt(t)}
out vec4 fragColor;

${bt}

${We(t)?yt:""}
${t.shader.preamble||""}

${t.shader.function}

void main() {
  vec3 pos = vec3(
    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin.x,
    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin.y,
    uZ * uBoundsRange + uBoundsMin.z
  );

${St(t,"uIters")}

  float r2 = dot(z.xyz, z.xyz);
  // 1.0 = interior (did not escape), 0.0 = exterior
  fragColor = vec4(r2 < 1e4 ? 1.0 : 0.0, 0.0, 0.0, 1.0);
}`}function wn(e){const t=e.definition,o=Ao(e),n=Lo(t),s=Io(o,!!t.shader.getDist,"uVoxelSize * 0.5",e.estimator,We(t));return`#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int   uIters;
uniform float uVoxelSize;
uniform int   uNewtonSteps;
${at}
${wt(t)}

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outNormal;

${bt}

${We(t)?yt:""}
${t.shader.preamble||""}

// --- Formula function ---
${t.shader.function}

${n}
float formulaDE(vec3 pos) {
${St(t,"uIters")}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${s}
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
}`}function _o(e){const t=e.definition;return`#version 300 es
// GMT mesh-color ${Date.now()}
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int uIters;
uniform int uWidth;
uniform vec3 uJitterOffset;
${at}
${wt(t)}
out vec4 fragColor;

${bt}

${We(t)?yt:""}
${t.shader.preamble||""}

// --- Formula function ---
${t.shader.function}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 pd = texelFetch(uPositions, coord, 0);
  vec3 pos = pd.xyz + uJitterOffset;
  if (pd.w < 0.5) { fragColor = vec4(0.5, 0.5, 0.5, 1.0); return; }

${St(t,"uIters")}

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
}`}function Sn(e){const t=e.definition,o=Ao(e),n=Lo(t),s=o==="ifs"?"0.0":"0.001",r=Io(o,!!t.shader.getDist,s,e.estimator,We(t));return`#version 300 es
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
${at}
${wt(t)}
out vec4 fragColor;

${bt}

${We(t)?yt:""}
${t.shader.preamble||""}

${t.shader.function}

${n}
float formulaDE(vec3 pos, float power, int iters) {
${St(t,"iters")}

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
}`}const Cn=["ParamA","ParamB","ParamC","ParamD","ParamE","ParamF","Vec2A","Vec2B","Vec2C","Vec3A","Vec3B","Vec3C","Vec4A","Vec4B","Vec4C"],Mn=[...Array.from({length:6},(e,t)=>Cn.map(o=>`uWs${t}${o}`)).flat(),"uWeaveEnabled",...Array.from({length:5},(e,t)=>[`uWeaveInterval${t+1}`,`uWeaveStartIter${t+1}`,`uWeaveBeats${t+1}`]).flat()],qe=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF","uVec2A","uVec2B","uVec2C","uVec3A","uVec3B","uVec3C","uVec4A","uVec4B","uVec4C","uJulia","uJuliaMode","uEscapeThresh","uDeBailout","uDistanceMetric",...Mn,"uFudgeFactor","uDetail","uPixelThreshold","uSurfaceThreshold","uClipBounds","uBoundsMin","uBoundsMax"];fn();const Bo=[{name:me.Time,type:"float",default:0},{name:me.FrameCount,type:"int",default:0},{name:me.Resolution,type:"vec2",default:new Me(100,100)},{name:me.SceneOffsetHigh,type:"vec3",default:new $e},{name:me.SceneOffsetLow,type:"vec3",default:new $e},{name:me.CameraPosition,type:"vec3",default:new $e},{name:me.CamBasisX,type:"vec3",default:new $e},{name:me.CamBasisY,type:"vec3",default:new $e},{name:me.CamForward,type:"vec3",default:new $e},{name:me.RegionMin,type:"vec2",default:new Me(0,0)},{name:me.RegionMax,type:"vec2",default:new Me(1,1)},{name:me.ImageTileOrigin,type:"vec2",default:new Me(0,0)},{name:me.ImageTileSize,type:"vec2",default:new Me(1,1)},{name:me.FullOutputResolution,type:"vec2",default:new Me(100,100)},{name:me.TilePixelOrigin,type:"vec2",default:new Me(0,0)},{name:me.HistoryTexture,type:"sampler2D",default:null},{name:me.BlendFactor,type:"float",default:1},{name:me.Jitter,type:"vec2",default:new Me(0,0)},{name:me.BlueNoiseTexture,type:"sampler2D",default:null},{name:me.BlueNoiseResolution,type:"vec2",default:new Me(128,128)},{name:me.HistogramLayer,type:"int",default:0},{name:me.InternalScale,type:"float",default:1},{name:me.PixelSizeBase,type:"float",default:.01,comment:"CPU: length(uCamBasisY)/resolution.y*2, avoids per-fragment sqrt"},{name:me.OutputPass,type:"float",default:0,comment:"0=beauty, 1=alpha, 2=depth"},{name:me.DepthMin,type:"float",default:0},{name:me.DepthMax,type:"float",default:5},{name:me.PreRotMatrix,type:"mat3",default:new ke},{name:me.PostRotMatrix,type:"mat3",default:new ke},{name:me.WorldRotMatrix,type:"mat3",default:new ke},{name:me.EnvRotationMatrix,type:"mat2",default:[1,0,0,1]},{name:me.FogColorLinear,type:"vec3",default:new $e(0,0,0),comment:"CPU: InverseACESFilm(uFogColor)"},{name:"uMb3dRotM0",type:"mat3",default:new ke},{name:"uMb3dRotM1",type:"mat3",default:new ke},{name:"uMb3dRotM2",type:"mat3",default:new ke},{name:"uMb3dRotM3",type:"mat3",default:new ke},{name:"uMb3dRotM4",type:"mat3",default:new ke},{name:"uMb3dRotM5",type:"mat3",default:new ke},{name:"uMb3dRotSC0",type:"vec2",default:new Me(0,1)},{name:"uMb3dRotSC1",type:"vec2",default:new Me(0,1)},{name:"uMb3dRotSC2",type:"vec2",default:new Me(0,1)},{name:"uMb3dRotSC3",type:"vec2",default:new Me(0,1)},{name:"uMb3dRotSC4",type:"vec2",default:new Me(0,1)},{name:"uMb3dRotSC5",type:"vec2",default:new Me(0,1)},{name:"uMb3dRot4D0",type:"mat4",default:new oo},{name:"uMb3dRot4D1",type:"mat4",default:new oo}],Yt=To.getUniformDefinitions(),En=new Set(Bo.map(e=>e.name)),ro=Yt.filter(e=>En.has(e.name)).map(e=>e.name);if(ro.length>0)throw new Error(`[UniformSchema] Feature uniform(s) shadow base schema: ${ro.join(", ")}. Rename in the feature def (themed prefix: uPT*/uLight*/uModular*) or remove the base entry.`);const io=new Set,Ut=[];for(const e of Yt)io.has(e.name)?Ut.push(e.name):io.add(e.name);if(Ut.length>0)throw new Error(`[UniformSchema] Two features declare the same uniform: ${Ut.join(", ")}. Rename one (themed prefix convention: uPT*/uLight*/uModular*).`);const zo=[...Bo,...Yt];zo.reduce((e,t)=>(e[t.name]=t.default,e),{});const Tn=()=>{let e=`precision highp float;
precision highp int;

`;return zo.forEach(t=>{t.backingOnly||(t.arraySize?e+=`uniform ${t.type} ${t.name}[${t.arraySize}];
`:e+=`uniform ${t.type} ${t.name};
`)}),e+=`
in vec2 vUv;
`,e},Dn=Tn(),lo=(e,t,o={})=>{const{loopInit:n="",perIterInject:s="",distOverrideInit:r="",distOverrideInLoopFull:a="",distOverrideInLoopGeom:i="",distOverridePostFull:l="",distOverridePostGeom:p="",postMapCode:h="",postDistCode:u="",kernel:f={}}=o,g=!!f.numericDE,b=g?`
// numFootprint(p): the local view footprint at p — pixel-size × camera distance
// (perspective) or constant (ortho), the same geometric scale trace.ts uses for its hit
// threshold but WITHOUT the uPixelThreshold / uDetail quality factors. Zoom-invariant,
// quality-param-free basis for the auto probe + the DE floor (cause C). @see docs/adr/0085.
float numFootprint(vec3 p) {
    bool ortho = (uCamType > 0.5 && uCamType < 1.5);
    float fp = ortho ? uPixelSizeBase : uPixelSizeBase * length(p - uCameraPosition);
    return max(fp, 1.0e-7);
}

// numProbe(p, epsScale): MB3D's mctDEoffset (≈ StepWidth-scaled 4-point probe), mapped to GMT
// — the view footprint supplies the probe scale (zoom-scaled, quality-param-free), capped at
// 0.004 near the camera (MB3D's Min(msDEstop·0.1, 0.004)) and floored so the ΔRout finite
// difference stays float32-resolvable. epsScale widens it for shadows/AO (2.5×). The DE is
// probe-INVARIANT in magnitude (the probe cancels), so this never needs per-scene retuning
// (cause C) — the magnitude knob is uNumDEeps (the dDEscale). @see docs/adr/0085.
float numProbe(vec3 p, float epsScale) {
    return max(min(numFootprint(p), 0.004) * epsScale, 1.0e-5);
}

// centerCount(p): run the orbit with the NORMAL bailout; return the completed-iteration count
// at which the CENTER escaped (capped at uIterations) — MB3D's ItResultI (Calc.pas:473). This
// is the FIXED count every perturbed sample then re-runs, which makes the differenced Rout a
// SMOOTH function of the seed (no per-sample escape-iteration jump → cause A). Does NOT touch
// the colouring globals. @see docs/adr/0085.
int centerCount(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;

    ${r}
    ${n}

    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${s}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) return i;   // escaped before iteration i
            #endif

            ${e}

            applyPostRotation(z.xyz);

        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) return i + 1;

        ${i}
    }

    return int(uIterations);
}

// iterateLogRadius(p, fixedIters): the SAME orbit body run a FIXED count, returning ln(Rout)
// (log of the final radius²). The per-sample early-escape break is REMOVED; the ITERATION COUNT
// is the real terminator, with only a float32 OVERFLOW guard (dot > 1e30). We return the LOG,
// not Rout, and difference the log downstream: differencing ln(Rout) is the float32-robust
// equivalent of MB3D's raw-Rout difference (the huge Rout cancels — see the block comment above),
// and it never saturates. The old min(dot, cap) form clamped fast/high-power escapers to an
// identical cap → g=0 → DE explosion → black scene (fixed here). ln compresses any magnitude to
// ≤ ln(1e30)=69, so distinct taps stay distinct. @see docs/adr/0085.
float iterateLogRadius(vec3 p, int fixedIters) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;

    ${r}
    ${n}

    float ovf = 1.0e30;   // float32 overflow guard (well below FLT_MAX; log compresses it to ≤69)

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= fixedIters) break;

        ${s}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            ${e}

            applyPostRotation(z.xyz);

        iter += 1.0;

        if (dot(z.xyz, z.xyz) > ovf) break;   // overflow guard (count is the terminator)

        ${i}
    }

    // ln(Rout). Tiny lower bound keeps the gradient alive for BOUNDED/IFS orbits (Rout∈(0,1) →
    // ln<0 → DE<0 → floored, matching MB3D's bufRout·ln(bufRout)<0 → floor). @see docs/adr/0085.
    return log(clamp(dot(z.xyz, z.xyz), 1.0e-12, ovf));
}

// numericDistance(p, epsScale): MB3D CalcDEnoADE estimate (Calc.pas:503), float32-robust LOG
// reformulation. The center sets the count; the 3 axis-perturbed samples re-run that SAME count;
// difference ln(Rout). DE = L0·dDEscale·e / (√ΣΔ(ln Rout)² + e·0.06), floored at 0.25× the HIT
// THRESHOLD (see below), where L0 = ln(R0). This equals MB3D's R0·ln(R0)·dDEscale/(√ΣΔRout²+off)
// with the huge R0 cancelled top-and-bottom — so it never saturates (the black-scene fix; the
// old raw-Rout form clamped fast escapers to g=0 → DE explosion → blank). uNumDEeps carries
// MB3D's dDEscale (per-scene magnitude). The probe e in the numerator makes the magnitude
// PROBE-INVARIANT (g = |Δln Rout| ∝ e and e·0.06 both scale with e, so e cancels) → e supplies
// world units, the probe never needs per-scene retuning, uNumDEeps is a pure magnitude knob.
// R0<1e-200 (MB3D d1em200 guard, Calc.pas:455) and bounded Rout<1 fall out naturally: ln→≤0 →
// de≤0 → floored. epsScale: map() passes 1.0 (sharp silhouette), mapDist() passes 2.5 (wider).
//
// THE FLOOR IS 0.25× GMT's HIT THRESHOLD, not 0.25× the raw footprint. MB3D floors at
// msDEstop·0.25 where msDEstop IS its hit threshold (a floored DE < msDEstop still registers a
// hit). GMT's hit threshold (trace.ts) is numFootprint·(uPixelThreshold/effectiveDetail) — a
// SMALLER fraction of the footprint. The original numFootprint·0.25 port therefore EXCEEDED the
// threshold whenever uPixelThreshold/effectiveDetail < 0.25 (e.g. the Mandelbulb preset's
// pixelThreshold=0.2 → threshold=fp·0.13 < floor=fp·0.25): the floored DE could never drop below
// the hit threshold → every ray missed → BLACK. Flooring at 0.25× the actual threshold restores
// MB3D's "floor sits a quarter below the hit distance" invariant at any quality setting. @see docs/adr/0085.
float numericDistance(vec3 p, float epsScale) {
    float fp = numFootprint(p);
    // GMT's hit threshold (mirror of trace.ts:204-208): footprint × pixelThreshold ÷ effectiveDetail.
    float effDetail = uDetail / max(uInternalScale, 1.0e-4);
    float hitThresh = fp * (uPixelThreshold / max(effDetail, 1.0e-4));
    float floorDE = hitThresh * 0.25;              // MB3D msDEstop·0.25, mapped to GMT's threshold
    int nC = centerCount(p);
    float L0 = iterateLogRadius(p, nC);            // ln(R0)
    float e = numProbe(p, epsScale);
    float dLx = iterateLogRadius(p + vec3(e, 0.0, 0.0), nC) - L0;
    float dLy = iterateLogRadius(p + vec3(0.0, e, 0.0), nC) - L0;
    float dLz = iterateLogRadius(p + vec3(0.0, 0.0, e), nC) - L0;
    float g = sqrt(dLx * dLx + dLy * dLy + dLz * dLz);
    float de = L0 * uNumDEeps * e / (g + e * 0.06);
    return max(de, floorDE);
}

// Surface normal for the numeric estimator = the fixed-iteration ln(Rout) gradient direction.
// Finite-differencing the numeric DE (which is ITSELF a finite difference) gives difference-
// of-differences noise → flat/dark shading; the fixed-count ln(Rout) field is smooth (all taps
// share one count), so its gradient is a clean normal. After a FIXED count, points on the
// ESCAPING (outside) side reach a far larger Rout than bounded interior points → ln(Rout)
// increases OUTWARD → the outward normal is +∇ln(Rout) (same direction as +∇Rout since ln is
// monotonic, but robust: the raw-Rout gradient collapsed to zero for fast escapers). @see docs/adr/0085.
vec3 numericNormal(vec3 p, float eps) {
    // Probe a few× the pixel footprint eps GetNormal already computes — wide enough to stay
    // well-conditioned, narrow enough to keep real structure. eps SCALES with zoom
    // (≈pixelSize·dist) so it holds at deep zoom. CRITICAL: all six taps re-run the SAME shared
    // count nC — that shared count is what makes the field smooth (a per-tap count would
    // reintroduce the escape-iteration jump). CENTRAL differences on ln(Rout). @see docs/adr/0085.
    float e = max(eps * 3.0, 1.0e-7);
    int nC = centerCount(p);
    float Lxp = iterateLogRadius(p + vec3(e, 0.0, 0.0), nC);
    float Lxm = iterateLogRadius(p - vec3(e, 0.0, 0.0), nC);
    float Lyp = iterateLogRadius(p + vec3(0.0, e, 0.0), nC);
    float Lym = iterateLogRadius(p - vec3(0.0, e, 0.0), nC);
    float Lzp = iterateLogRadius(p + vec3(0.0, 0.0, e), nC);
    float Lzm = iterateLogRadius(p - vec3(0.0, 0.0, e), nC);
    vec3 grad = vec3(Lxp - Lxm, Lyp - Lym, Lzp - Lzm);
    if (dot(grad, grad) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    return normalize(grad);
}
`:"";return`
${t}
${b}

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

    ${r}
    ${n}

    bool escaped = false;
    // Absolute raymarch bailout (uDeBailout, default 100), decoupled from the
    // escape/coloring threshold. High = accurate analytic DE, sharp surfaces;
    // low = early bail that slices the fractal into shells (overstep artifacts
    // by design). When bailout < uEscapeThresh the decomp/potential capture
    // below never fires — accepted tradeoff for the slicing effect. Floored at
    // 1.0 so |z|² stays ≥ 1 (keeps log-based DEs well-defined).
    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${s}

        // --- Main Formula ---
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

        // Count completed iterations. After uIterations runs iter == uIterations,
        // which matches Fragmentarium's n counter used in explicit getDist expressions.
        iter += 1.0;

        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));

        // Geometric trap — accumulates here (post-formula, pre-snapshot) so
        // it shares z state + snapshot timing with g_orbitTrap above. The
        // older per-iter-inject position fired BEFORE the formula step and
        // its skip-iter-0 guard left savedGeomTrap at 1e10 for low
        // uColorIter, freezing the trap to a flat constant. Self-contained
        // formulas thread their own trap math through their inner loop and
        // gate this block off via SELF_CONTAINED_SDE (core_math.ts).
#if defined(TRAP_ENABLED) && !defined(SELF_CONTAINED_SDE)
        {
            vec3 _d = z.xyz - uTrapCenter;
            float _td;
            int _ts = int(uTrapShape + 0.1);
            if (_ts == 1)      _td = length(_d);
            else if (_ts == 2) _td = abs(length(_d) - uTrapRadius);
            else if (_ts == 3) _td = min(min(abs(_d.x), abs(_d.y)), abs(_d.z));
            else               _td = abs(dot(z.xyz, uTrapNormal) - uTrapOffset);
            g_geomTrap = min(g_geomTrap, _td);
        }
#endif

        // Color iteration snapshot. Direct if-assignment (rather than mix
        // with a 0/1 gate) lets fxc co-locate savedX with the running X
        // in the same register: with mix, savedX was both an operand and
        // a destination on every iter, forcing a separate live range.
        // Audit Tier 2 / compile #3.
        if (iter <= uColorIter) {
            savedOrbitTrap = g_orbitTrap;
            savedTrap      = trap;
            savedGeomTrap  = g_geomTrap;
            savedIter      = iter;
        }

        if (!decompCaptured && r2 > uEscapeThresh) {
            decomp = atan(z.y, z.x) * INV_TAU + 0.5;
            lastLength = sqrt(r2);
            decompCaptured = true;
        }

        if (dr > 1.0e10 || r2 > bailout) {
            escaped = true;
            break;
        }

        ${a}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    if (!decompCaptured) {
        decomp = atan(z.y, z.x) * INV_TAU + 0.5;
        lastLength = r;
    }

    ${g?`float finalD = numericDistance(p, uNumDESmooth);
    smoothIter = iter;`:`vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;
    smoothIter = distRes.y;`}

    ${l}

    // Restore saved coloring state if color iteration limit was active
    // When uColorIter > 0, use the frozen snapshot; otherwise keep full-iteration values
    float useColorSnap = step(0.5, uColorIter);
    g_orbitTrap = mix(g_orbitTrap, savedOrbitTrap, useColorSnap);
    trap = mix(trap, savedTrap, useColorSnap);
    g_geomTrap = mix(g_geomTrap, savedGeomTrap, useColorSnap);

    // Persist the capped geometric trap into g_geomTrapFinal so the colour
    // sampler reads the value at the actual hit point. mapDist() (called
    // later for normals / shadows / AO) resets g_geomTrap and re-accumulates
    // it from a different position, which is why we need the side channel.
    // Standard g_orbitTrap doesn't need this — mapDist never writes to it.
    g_geomTrapFinal = g_geomTrap;

    // Color mode 8 = LLI (Last Length Iteration) decomposition — needs lastLength from escape check
    bool useLLI = (abs(uColorMode - 8.0) < 0.1) || (abs(uColorMode2 - 8.0) < 0.1);
#ifdef USE_TEXTURE
    if (uUseTexture > 0.5) {
        if (abs(uTextureModeU - 8.0) < 0.1) useLLI = true;
        if (abs(uTextureModeV - 8.0) < 0.1) useLLI = true;
    }
#endif
    float outTrap = useLLI ? lastLength : trap;

    // --- FEATURE INJECTION: POST-MAP (accumulative) ---
    // Variables in scope: p_fractal, finalD, decomp, smoothIter, outTrap
    ${h}

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

    ${r}
    ${n}

    // Geometry-only twin of map()'s bailout — see that comment for the rationale.
    float bailout = max(uDeBailout, 1.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${s}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) break;
            #endif

            ${e}

            applyPostRotation(z.xyz);

        // Track completed iterations so getDist expressions that use iter
        // (e.g. r * pow(Scale, -iter)) receive the correct count for shadow marching.
        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) break;

        ${i}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    ${g?"float finalD = numericDistance(p, 2.5);":`vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;`}

    ${p}

    // --- FEATURE INJECTION: POST-DIST (accumulative) ---
    ${u}

    return finalD;
}

// Wrapper for Coloring
vec4 DE(vec3 p_ray) {
    return map(p_ray + uCameraPosition);
}

// Wrapper for Geometry (Shadows/AO/Normals)
float DE_Dist(vec3 p_ray) {
    return mapDist(p_ray + uCameraPosition);
}`},Rn=(e="")=>`
// ------------------------------------------------------------------
// SHARED SURFACE EVALUATION
// ------------------------------------------------------------------

vec3 GetNormal(vec3 p_ray, float eps) {
#ifdef NUMERIC_DE
    // Numerical estimator: the DE is a finite difference, so finite-differencing it
    // again (below) gives difference-of-difference noise. Use the escape-time gradient
    // directly, probed at the pixel footprint eps to avoid speckle. @see docs/adr/0085
    return numericNormal(p_ray + uCameraPosition, eps);
#else
    // High Quality: Tetrahedron Normal (4 taps)
    // OPTIMIZATION: Use DE_Dist
    vec2 k = vec2(1.0, -1.0);
    vec3 n = k.xyy * DE_Dist(p_ray + k.xyy * eps) + 
             k.yyx * DE_Dist(p_ray + k.yyx * eps) + 
             k.yxy * DE_Dist(p_ray + k.yxy * eps) + 
             k.xxx * DE_Dist(p_ray + k.xxx * eps);
    
    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);

    return normalize(n);
#endif
}

vec3 GetFastNormal(vec3 p, float eps) {
#ifdef NUMERIC_DE
    return numericNormal(p + uCameraPosition, eps);
#else
    // Forward Difference (4 taps). The center tap d0 is load-bearing: the ray
    // stops at DE < threshold, so DE(p) is a small POSITIVE residual, not 0.
    // Dropping it (n = vec3(dx,dy,dz)) leaves n = trueGradient + DE(p)*(1,1,1),
    // skewing every normal toward the +X+Y+Z diagonal. On fractals with a loose
    // DE estimator that residual is large enough to collapse NdotL to one side,
    // which read as single-light "only lights one quadrant" in Direct mode.
    vec2 e = vec2(eps, 0.0);

    float d0 = DE_Dist(p);
    float dx = DE_Dist(p + e.xyy);
    float dy = DE_Dist(p + e.yxy);
    float dz = DE_Dist(p + e.yyx);

    vec3 n = vec3(dx - d0, dy - d0, dz - d0);

    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);

    return normalize(n);
#endif
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
#ifdef RENDER_MODE_PATHTRACING
    // PT: a SINGLE tetrahedron-normal call for all bounces (4 DE_Dist taps).
    // The if(highQuality) GetNormal / else GetFastNormal form inlined BOTH
    // estimators (8 DE_Dist taps) because highQuality (= bounce==0) is RUNTIME
    // in PT — fxc can't DCE either branch. Collapsing to one call halves the
    // DE_Dist inlines in the bounce loop: measured ~-0.9..-2.5s (Mandelbulb) /
    // ~-4.6s (Great Stellated) cold PT compile. Bounce 0 is byte-identical
    // (GetNormal(eps)); indirect bounces upgrade from forward-difference to the
    // (better, symmetric) tetrahedron normal as a bonus.
    // @see docs/adr/0075-pt-single-normal-estimator.md
    n = GetNormal(p_ray, highQuality ? eps : eps * 1.5);
#else
    // Direct: highQuality is a COMPILE-TIME CONSTANT at every call site (false
    // in calculateShading + raymarched reflections), so fxc already DCEs the
    // unused branch → only one estimator is inlined (4 taps). Kept exactly as-is
    // — byte-identical, no win to take here (measured ~0).
    if (highQuality) {
        n = GetNormal(p_ray, eps);
    } else {
        // Boost epsilon slightly for fast normals to avoid noise
        // FIX: Removed invalid 'd' argument. FastNormal calculates relative to 0.0 surface.
        n = GetFastNormal(p_ray, eps * 1.5);
    }
#endif
    
    // --- Layer 3: Procedural Noise & Bump Mapping ---
    // Calculate if needed for Surface OR Emission (Mode 3)
    float noiseVal = 0.0;
    vec3 noiseP = p_fractal * uLayer3Scale;
    bool useL3 = (uLayer3Strength > 0.0 || abs(uLayer3Bump) > 0.0 || abs(uEmissionMode - 3.0) < 0.1);
    
    if (useL3) {
        noiseVal = getLayer3Noise(noiseP);

        // Bump-map finite-difference is gated on highQuality at the apply
        // site below; gate the COMPUTATION too so reflection-bounce inlines
        // (highQuality=false) skip the 3 noise taps entirely. Saves ~3
        // getLayer3Noise calls per bounce hit pixel on raymarched reflections.
        // Audit compile #2 (minimal version of getSurfaceMaterialBounce).
        if (abs(uLayer3Bump) > 0.001 && highQuality) {
            vec2 e = vec2(0.01, 0.0);  // Fixed-size finite difference step for bump gradient (world-space units)
            float nx = getLayer3Noise(noiseP + e.xyy) - noiseVal;
            float ny = getLayer3Noise(noiseP + e.yxy) - noiseVal;
            float nz = getLayer3Noise(noiseP + e.yyx) - noiseVal;
            vec3 grad = vec3(nx, ny, nz);
            n = normalize(n - grad * uLayer3Bump * 10.0);  // 10x amplification to make bump visually significant at world scale
        }
    }

    // --- Coloring Calculation ---
    vec3 col1 = vec3(0.0);
    
    // Layer 1 (Always calculated as base). Texture branch is compile-gated
    // because uUseTexture is a checkbox toggle (default off) but ANGLE
    // predicates the runtime if() and runs getTextureColor() anyway.
#ifdef USE_TEXTURE
    if (uUseTexture > 0.5) {
        col1 = getTextureColor(p_fractal, n, result);
    } else
#endif
    {
        float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
        float t1Raw = val1 * uColorScale + uColorOffset
                    + gmt_colorSpiral(p_fractal, uColorTwist, uColorTwistArms);
        float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
        col1 = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }

    // Layer 2
    // Calculate if needed for Surface Blending OR Emission (Mode 2)
    vec3 col2 = vec3(0.0);
    bool useL2 = (uBlendOpacity > 0.01 || uBlendMode > 5.5 || abs(uEmissionMode - 2.0) < 0.1);

    if (useL2) { 
        float val2 = getMappingValue(uColorMode2, p_fractal, result, n, uColorScale2);
        float t2Raw = val2 * uColorScale2 + uColorOffset2
                    + gmt_colorSpiral(p_fractal, uColorTwist2, uColorTwistArms2);
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
}`,Fn=(e,t,o="")=>`
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

    // Background = THE SKY (Solid / Gradient / Image via GetEnvMap) scaled by
    // Sky Visibility — a plain brightness dial, 0 → black backdrop (ADR-0098;
    // matches the path tracer's long-standing semantics). The old "fall back to
    // the flat Background Color at visibility 0" rule is GONE: a flat-colour
    // backdrop is now the Solid sky source.
    //
    // Camera-blur softening of the sky: a mip-LOD blur scaled by the DoF
    // aperture, ADDED on top of the aperture-jittered ray direction (rd, not
    // rdClean) so the sky keeps the same grain as the fractal's DoF. Sky is at
    // infinity → max defocus. Fourth-root curve calibrated to the LOG aperture
    // slider's practical range (0.001–0.1): 0.005 → lod ≈ 2.4 (visible),
    // 0.05 → ≈ 4.3 (strong), 1.0 → ≈ 8.5 (washed). Supersedes ADR-0072's
    // "capped to stay subtle" 0.4·sqrt curve — owner: camera blur must blur
    // the background MEANINGFULLY. uDOFStrength == 0 → skyBlur 0 → unchanged.
    float skyBlur = min(0.85, pow(uDOFStrength, 0.25) * 0.9);
    // Per-direction fog in-scatter (fogRadiance, ADR-0097): with Sky Tint up,
    // the fogged sky keeps its directional gradient instead of flattening.
    vec3 bgCol = mix(
        GetEnvMap(rd, skyBlur) * uEnvBackgroundStrength,
        fogRadiance(rd),
        clamp(uFogIntensity, 0.0, 1.0));

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

    col = applyPostProcessing(col, d, rd, glow, volumetric, fogScatter);
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
`,co=e=>`
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
        if (uDOFStrength > 0.000001) needNoise = true;
        if (!isMoving) needNoise = true;  // Other effects need noise when stationary
        if (uAreaLights > 0.5) needNoise = true;
        // Volumetric scatter: gate hash relies on per-pixel stochasticSeed
        // for spatial decorrelation. Without this clause, during navigation
        // the seed defaults to 0.5 for every pixel and the gate fires/skips
        // identically across the whole screen — producing visible bands
        // synced to fixed d-values.
        if (uVolEnabled > 0.5) needNoise = true;
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
    if (uDOFStrength > 0.000001) {
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
`,It=(e={})=>{const{isMobile:t=!1,enableGlow:o=!1,precisionMode:n=0,glowQuality:s=0,volumeBodyCode:r="",volumeFinalizeCode:a="",functionName:i="traceScene",kernel:l={}}=e,p=!!l.refine,u=n===1||t?`
        float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);  // Low precision: ~10 ppm
    `:`
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);  // High precision: ~0.5 ppm
    `,f=a.trim().length>0?`vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = MISS_DIST;
    vec3 p = p_end;
    ${a}`:"h = vec4(MISS_DIST, 0.0, 0.0, 0.0);";return`
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool ${i}(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric, out vec3 fogScatter) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    // Pre-compute the world-origin offset once. uCameraPosition + uSceneOffset*
    // are all frame-constant and were being re-summed every march step at the
    // precision-check site below — moving the addition outside the loop saves
    // 2 vec3 adds per step per pixel (audit Tier 1).
    vec3 worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
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
    vec4 candidateH = vec4(0.0);
${p?`    float dPrev = d;          // last OUTSIDE sample → bracket [dPrev,d] for the hit refine below
`:""}    float mb3dRLastDE = 0.0;     // DE at the previous march point
    float mb3dRLastStep = 0.0;   // previous step width (world units)
    float mb3dRSF = 1.0;         // RSFmul convergence damper, clamped to [0.5, 1.0]
    bool  mb3dPrimed = false;    // skip clamp/damper on the first sample (no history yet)

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        
        // A. Distance Estimation
        // When no per-step volumetric body needs trap data, use mapDist() —
        // distance only, skipping orbit-trap mins / decomposition / smoothing.
        h = map(p + uCameraPosition);
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${r}
        
        // C. Precision
        vec3 p_fractal_approx = p + worldOriginOffset;
        float distFromFractalOrigin = length(p_fractal_approx);
        
        ${u}
        
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
            // MB3D overstep clamp + RSFmul damper (CalcThread.pas:223-230)
            if (mb3dPrimed) {
                h.x = min(h.x, mb3dRLastDE + mb3dRLastStep);     // clamp a non-Lipschitz DE jump
                if (mb3dRLastDE > h.x + 1.0e-30) {
                    float mb3dT = mb3dRLastStep / (mb3dRLastDE - h.x);
                    mb3dRSF = (mb3dT < 1.0) ? max(0.5, mb3dT) : 1.0;
                } else { mb3dRSF = 1.0; }
            }

        // D. Hit Detection
        if (h.x < finalEps) {

            // Populate full map() data (orbit-trap, iter, decomposition) once
            // at the hit point — only the distance was tracked through the
            // inner loop when innerVolumeBodyEmpty is true. No-op otherwise.
            

            // (Surface "Edge Polish" refinement removed 2026-06-19 — it was a
            // never-useful control, default-0 and inert, and its loop carried a
            // live mapDist inline worth ~1.2–1.7s of cold compile. @see docs/adr/0076)
${p?`            // --- MB3D-style damped-bisection SURFACE REFINEMENT ---
            // The coarse march only BRACKETS: dPrev was outside (h.x >= finalEps),
            // d is inside (h.x < finalEps). A non-Lipschitz / over-estimating fused
            // DE oversteps a thin or discontinuous surface, so the accepted overshoot
            // scatters into "dust"; bisecting the ray parameter onto the DE==finalEps
            // crossing lands a coherent near face instead. Compile-gated on the quality
            // 'Surface Refinement' toggle (refineEnabled). @see MB3D RMdoBinSearch
            // (Calc.pas:1641), docs/adr/0084. Note the forward-only "Edge Polish"
            // above could only push deeper past the crossing — this steps BACK onto it.
            // uRefineActive is the instant runtime on/off (loop compiled but skipped at 0).
            if (uRefineActive > 0.5) {
                float dOut = dPrev;           // outside  (h.x >= finalEps here)
                float dIn  = d;               // inside   (h.x <  finalEps)
                for (int j = 0; j < REFINE_HARD_CAP; j++) {
                    if (j >= int(uRefineSteps)) break;
                    float dMid = 0.5 * (dOut + dIn);
                    // geometry-only twin — distance is all the root-find needs; keeps
                    // the inline cheap (mapDist, not map) per docs/adr/0076.
                    float hMid = mapDist((ro + rd * dMid) + uCameraPosition);
                    if (hMid < finalEps) dIn = dMid; else dOut = dMid;
                }
                d = dIn;                      // refined near-face surface (like MB3D)
                // h.yzw (trap/iter/decomp colour) kept from the overshoot map() — the
                // nudge is sub-pixel so colour is visually identical (docs/adr/0076).
            }
`:""}
            // Apply Final Volumetric Resolve (Inlined)
            vec3 p_final = ro + rd * d; 
            vec3 p = p_final; // Alias for volumeFinalizeCode
            ${a}
            
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
                // Snapshot the full map() result already computed this step so
                // recovery can reuse it instead of re-inlining map() below.
                candidateH = h;
            }
        }
        
        // F. Step Advance
        // (Dynamic "Step Relaxation" removed 2026-06-19 — never-useful control,
        // default-0 and inert; straight-line ALU so removal is compile-neutral.)

        // Stochastic step jitter: break up deterministic DE banding.
        // Asymmetric [1-jitter, 1.0] — biased short to avoid overshoot.
        // uStepJitter=0 disables (stepJitter=1.0). uStepJitter=0.15 is default.
        // Disabled during navigation for a clean image — banding
        // averages away once accumulation starts.
        // Stochastic step jitter — coprime hash constants (127.1, 31.7) prevent banding artifacts
        float stepJitter = uBlendFactor >= 0.99 ? 1.0 : (1.0 - uStepJitter) + uStepJitter * fract(stochasticSeed * 127.1 + d * 31.7);
        ${p?`dPrev = d;   // remember this outside sample before advancing the ray
        `:""}mb3dRLastDE = h.x;
            // MB3D step: safety-subtract a fraction of the hit threshold, scale by the
            // step divisor (uFudgeFactor = MB3D sZstepDiv), damp by RSFmul
            // (CalcThread.pas:200). uMb3dDEsub = MB3D msDEsub (iOptions bit 2; 0 when unset).
            float mb3dStepW = max(floatPrecision * 0.5, (h.x - uMb3dDEsub * finalEps) * uFudgeFactor * mb3dRSF);
            mb3dRLastStep = mb3dStepW;
            mb3dPrimed = true;
            d += mb3dStepW * stepJitter;

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
             // Reuse the full map() captured at the candidate step (same
             // position ro+rd*candidateD) — byte-identical to re-evaluating
             // map(p_cand), without re-inlining the heaviest body. @see docs/adr/0076
             result = candidateH;
             result.x = 0.0; // Force hit
             
             // Finalize volume for the recovered path? 
             // Strictly speaking we should, but for visual consistency we use the accumulated values.
             
             vec3 p = p_cand; // Alias for injected code which expects 'p'
             
             ${a}
             glow = accColor;
             fogScatter = accScatter;
             volumetric = accDensity;
             return true;
        }
    }

    // MISS: Resolve volume at infinity
    ${f}

    glow = accColor;
    fogScatter = accScatter;
    volumetric = accDensity;

    return false;
}
`},_t=`
// ------------------------------------------------------------------
// COLORING & PATTERN GENERATION
// ------------------------------------------------------------------

// Forward Declaration for Linkage
vec3 getGlowColor(vec3 p_fractal, vec4 result);
float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale);

// The 'getMappingValue' function is now injected dynamically by ColoringFeature.
// See features/coloring/MappingModes.ts for logic.

// Log-spiral palette warp — single source of truth for the colour Twist control.
//   index += arms * azimuth(turns) + twist * log(radius)
// Integer arms keep the atan(-x) branch cut seamless; log(r) makes the spiral
// scale-invariant (self-similar under zoom). Returns 0 when both knobs are off.
// NOTE: MandelTerrain inlines the same maths because it compiles into the mesh
// SDF library, which does not include this COLORING chunk — keep them in sync.
float gmt_colorSpiral(vec3 p, float twist, float arms) {
    if (abs(twist) <= 0.001 && abs(arms) <= 0.001) return 0.0;
    return arms * (atan(p.y, p.x) * INV_TAU) + twist * log(max(length(p), 1.0e-3));
}

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
        float t1Raw = val1 * uColorScale + uColorOffset
                    + gmt_colorSpiral(p_fractal, uColorTwist, uColorTwistArms);
        float t1Wrapped = fract(t1Raw);
        if (t1Raw < 0.0) t1Wrapped = 1.0 - t1Wrapped;
        
        float t1 = pow(t1Wrapped, uGradientBias);
        color = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }
    return color;
}
`,Pn=(e="")=>`
// ------------------------------------------------------------------
// POST PROCESSING (LINEAR ONLY)
// All fog, glow, and scatter code is feature-injected via addPostProcessLogic().
// Atmosphere feature: fog (distance + volumetric density) + glow
// Volumetric feature: scatter (god rays)
// ------------------------------------------------------------------
vec3 applyPostProcessing(vec3 col, float d, vec3 rd, vec3 glow, float volumetric, vec3 fogScatter) {

    // --- FEATURE INJECTION: POST-PROCESSING ---
    // Variables in scope: col (modifiable), d, rd (primary ray direction — for
    //   per-direction fog in-scatter), glow, volumetric, fogScatter.
    // Uniforms available: uFogNear, uFogFar, uFogIntensity, uFogDensity,
    //   uFogColorLinear, uGlowIntensity, uEnvBackgroundStrength, MISS_DIST.
    // Functions available: fogRadiance(dir) — per-direction fog colour (env.ts, ADR-0097).
    ${e}

    // Tone Mapping is handled in the Display Shader
    return col;
}
`,An=(e="")=>`
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane).
// dir = the direction the env was sampled along — the in-scatter colour is
// per-direction (fogRadiance, ADR-0097), so a fogged sky keeps its gradient.
vec3 applyEnvFog(vec3 env, vec3 dir) {
    if (uFogIntensity < 0.001 || uFogFar >= 1000.0) return env;
    return mix(env, fogRadiance(dir), uFogIntensity);
}

// Sample environment for a miss ray (reflection/bounce), with fog and feature overrides.
// The flat far-plane env fog spares the fraction covered by a self-fogged overlay
// (light spheres fog themselves by their own distance inside sampleMiss and report
// coverage via g_missSelfFogCover) — otherwise reflected emitters wipe to fog colour
// at full intensity even when they sit right next to the reflector.
vec3 sampleMissEnv(vec3 ro, vec3 rd, float roughness, vec3 throughput) {
    g_missSelfFogCover = 0.0;
    vec3 raw = sampleMiss(ro, rd, roughness, uEnvStrength);
    return mix(applyEnvFog(raw, rd), raw, g_missSelfFogCover) * throughput;
}

// Fog-hoisted twin of sampleMissEnv for the raymarched reflection block: takes the
// caller's precomputed fog radiance + weight instead of running the per-direction
// applyEnvFog -> fogRadiance -> env-sample chain per call site. fxc inlines that
// chain at EVERY call site (~260ms each cold, section 2.6.2) — the reflection block
// samples fog once at reflDir and shares it. fogW MUST be 0.0 when fog is inactive
// (callers replicate applyEnvFog's uFogIntensity/uFogFar gate).
vec3 sampleMissEnvPre(vec3 ro, vec3 rd, float roughness, vec3 throughput, vec3 fogRad, float fogW) {
    g_missSelfFogCover = 0.0;
    vec3 raw = sampleMiss(ro, rd, roughness, uEnvStrength);
    vec3 fogged = mix(raw, fogRad, fogW);
    return mix(fogged, raw, g_missSelfFogCover) * throughput;
}

vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

    vec3 albedo, n, emission;
    float roughness;

    // 1. Primary Surface — 3-tap forward-difference (GetFastNormal). With
    // shadows dominating cost on the corrected bench, this is statistically
    // tied with 4-tap tetra (within run-to-run noise) but ~5% theoretically
    // cheaper on math-only scenes. Visually indistinguishable for default
    // Mandelbulb. Audit Tier 1 #2.
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, false);

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
        // Fog wraps the raw env radiance before the surface response (F, uSpecular) —
        // same treatment as the ENV-mode injection; the dome sits at the fog far plane.
        vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir);
        reflectionLighting = envColor * F * uSpecular;
    `}

    // 6. Rim
    float fresnelTerm = pow(1.0 - NdotV, uRimExponent);
    vec3 rimColor = uRimColor * fresnelTerm * uRim;

    // 7. Ambient IBL — the env map acting as a dome light. Fog wraps the raw
    // irradiance BEFORE the surface response (kD·albedo): in heavy fog the dome
    // light reaching a surface dims/tints toward the fog colour, matching the
    // fogged sky behind it — otherwise surfaces glow unfogged against the fog.
    // (applyEnvFog is identity when fog is off.)
    if (uEnvStrength > 0.001) {
        vec3 envIrradiance = applyEnvFog(GetEnvMap(n, 1.0) * uEnvStrength, n);
        vec3 kD = (vec3(1.0) - F) * (1.0 - uReflection);
        ambient = kD * albedo * envIrradiance * uDiffuse;
    }

    // 8. Compose
    vec3 finalColor = directLighting + reflectionLighting + rimColor + emission + ambient;

    // AO Tint: black = classic darkening. Custom color = tinted occlusion.
    finalColor *= mix(uAOColor, vec3(1.0), ao);

    return finalColor;
}
`,Bt=`
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
`;class Ln{constructor(t){oe(this,"defines",new Map);oe(this,"uniforms",new Map);oe(this,"preDEFunctions",[]);oe(this,"postDEFunctions",[]);oe(this,"integrators",[]);oe(this,"headers",[]);oe(this,"preambles",[]);oe(this,"postMapCode",[]);oe(this,"postDistCode",[]);oe(this,"materialLogic",[]);oe(this,"compositeLogic",[]);oe(this,"missLogic",[]);oe(this,"volumeBody",[]);oe(this,"volumeFinalize",[]);oe(this,"postProcessLogic",[]);oe(this,"shadingReflectionCode",[]);oe(this,"needsShading",!1);oe(this,"perIterInject",[]);oe(this,"formulaLoopBody","");oe(this,"formulaInit","");oe(this,"formulaDist","");oe(this,"distOverrideInit","");oe(this,"distOverrideInLoopFull","");oe(this,"distOverrideInLoopGeom","");oe(this,"distOverridePostFull","");oe(this,"distOverridePostGeom","");oe(this,"useRotation",!0);oe(this,"renderMode","Direct");oe(this,"isLite",!1);oe(this,"precisionMode",0);oe(this,"maxLights",0);oe(this,"enableRefine",!1);oe(this,"numericDE",!1);oe(this,"physicsRayGen",`
    // Standard Linear Projection
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 rd = normalize(uCamForward + uv.x * uCamBasisX + uv.y * uCamBasisY);
    `);this.variant=t}setRotation(t){this.useRotation=t}setRenderMode(t){this.renderMode=t}setQuality(t,o){this.isLite=t,this.precisionMode=o}enableRefinement(t){this.enableRefine=t}enableNumericDE(t){this.numericDE=t}setMaxLights(t){this.maxLights=t}kernelFeatures(){return{refine:this.enableRefine,numericDE:this.numericDE}}deMasterOptions(t){return{loopInit:this.formulaInit,perIterInject:this.perIterInject.join(`
`),distOverrideInit:this.distOverrideInit,distOverrideInLoopFull:this.distOverrideInLoopFull,distOverrideInLoopGeom:this.distOverrideInLoopGeom,distOverridePostFull:this.distOverridePostFull,distOverridePostGeom:this.distOverridePostGeom,postMapCode:this.postMapCode.join(`
`),postDistCode:this.postDistCode.join(`
`),kernel:t}}addDefine(t,o="1"){this.defines.set(t,o)}addUniform(t,o,n){this.uniforms.set(t,{type:o,arraySize:n})}addHeader(t){this.headers.push(t)}addPreamble(t){this.preambles.includes(t)||this.preambles.push(t)}addFunction(t){this.preDEFunctions.includes(t)||this.preDEFunctions.push(t)}addPostDEFunction(t){this.postDEFunctions.includes(t)||this.postDEFunctions.push(t)}addIntegrator(t){this.integrators.includes(t)||this.integrators.push(t)}setFormula(t,o,n){this.formulaLoopBody=t,this.formulaInit=o,this.formulaDist=n}setDistOverride(t){this.distOverrideInit=t.init??"",this.distOverrideInLoopFull=t.inLoopFull??"",this.distOverrideInLoopGeom=t.inLoopGeom??"",this.distOverridePostFull=t.postFull??"",this.distOverridePostGeom=t.postGeom??""}addPerIterInject(t){t&&this.perIterInject.push(t)}addMaterialLogic(t){this.materialLogic.push(t)}addPostMapCode(t){this.postMapCode.push(t)}addPostDistCode(t){this.postDistCode.push(t)}addPostProcessLogic(t){this.postProcessLogic.push(t)}requestShading(){this.needsShading=!0}addShadingLogic(t){this.shadingReflectionCode.push(t)}addCompositeLogic(t){this.compositeLogic.push(t)}addMissLogic(t){this.missLogic.push(t)}buildMissHandler(){return`
// Coverage [0..1] of the last sampleMiss() ray by an overlay that already fogged
// ITSELF by its own distance (light spheres). The flat far-plane env fog that
// callers apply (applyEnvFog in sampleMissEnv) reads this to SPARE that fraction —
// otherwise a near emitter seen in a reflection is wiped to pure fog colour at
// full fog intensity (it isn't at the far plane). Callers reset before the call;
// injections that self-fog set it.
float g_missSelfFogCover = 0.0;

// envScale: the caller's env-strength factor, applied to the SKY SAMPLE ONLY —
// injected overlays (light spheres) mix in unscaled, physical emitter colour on
// top, matching the primary-view composite (a light's brightness must not track
// the env/dome strength slider).
vec3 sampleMiss(vec3 ro, vec3 rd, float roughness, float envScale) {
    vec3 env = GetEnvMap(rd, roughness) * envScale;

    // --- FEATURE INJECTION: MISS RAY OVERRIDE ---
    ${this.missLogic.join(`
`)}

    return env;
}
`}addVolumeTracing(t,o){t&&this.volumeBody.push(t),o&&this.volumeFinalize.push(o)}buildDefinesString(){let t="";return this.defines.forEach((o,n)=>{t+=`#define ${n} ${o}
`}),t}buildUniformsString(){let t=Dn+`
`;return this.uniforms.forEach((o,n)=>{o.arraySize?t+=`uniform ${o.type} ${n}[${o.arraySize}];
`:t+=`uniform ${o.type} ${n};
`}),t}buildMeshSDFLibrary(){let t="";this.uniforms.forEach((s,r)=>{s.arraySize?t+=`uniform ${s.type} ${r}[${s.arraySize}];
`:t+=`uniform ${s.type} ${r};
`});const o=lo(this.formulaLoopBody,this.formulaDist,this.deMasterOptions({})),n=`
${Xt}
${Ht}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

${Fo("_")}
`;return`
#define MAX_HARD_ITERATIONS 100

// Math constants shared with the main renderer (PI, TAU, INV_TAU, INV_PI, phi)
${Po}

${at}

// Stub uniforms required by DE_MASTER generated code (map + mapDist reference these;
// only mapDist is called in the mesh SDF path but both functions must compile).
// Any uniform referenced by features' perIterInject injections also goes here.
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

// Feature-injected uniforms (e.g. weave bank params from the weave feature's Mesh inject)
${t}

// Precision offset stub — mesh SDF operates in local space (no camera offset needed)
vec3 applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p; }

// Base mesh helpers (sphereFold, boxFold, getLength, rotation stubs, snoise)
${n}

// Preambles from feature inject() calls (e.g. SHARED_TRANSFORMS_GLSL from Geometry)
${this.preambles.join(`
`)}

// Pre-DE functions (formula functions, incl. fused weave slot fns)
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
`),r=this.preDEFunctions.join(`
`),a=this.postDEFunctions.join(`
`);if(this.needsShading){const m=this.shadingReflectionCode.join(`
`);this.integrators.push(An(m))}const i=this.integrators.join(`
`),l=bn(this.useRotation),p=lo(this.formulaLoopBody,this.formulaDist,this.deMasterOptions(this.kernelFeatures()));if(this.variant==="Physics")return`
${t}
${o}
${l}
${Bt}
${_t}
${n}
${s}
${r}
${p}


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
`;if(this.variant==="Histogram"){const m=It({precisionMode:this.precisionMode}),w=co("Direct");return`
${t}
${o}
${l}
${Bt}
${_t}
${n}
${s}
${r}
${p}
${a}

${m}
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
`}const h=Rn(this.materialLogic.join(`
`)),u=this.buildMissHandler(),f=this.renderMode==="PathTracing",g=It({isMobile:this.isLite,enableGlow:!0,precisionMode:this.precisionMode,volumeBodyCode:this.volumeBody.join(`
`),volumeFinalizeCode:this.volumeFinalize.join(`
`),kernel:this.kernelFeatures()}),b=f?It({isMobile:this.isLite,precisionMode:this.precisionMode,functionName:"traceSceneLean"}):"",y=Fn(f,this.maxLights,this.compositeLogic.join(`
`)),v=co(this.renderMode),M=Pn(this.postProcessLogic.join(`
`));return`
${t}
${o}
${n}
${l}
${Bt}
${_t}

${s}

${r}

${p}

${a}

${h}

${u}

${v}

${g}
${b}

${i}

${M}
${y}
`}}class In{static generateFragmentShader(t){return this.buildShader(t,"Main")}static generatePhysicsShader(t){return this.buildShader(t,"Physics")}static generateHistogramShader(t){return this.buildShader(t,"Histogram")}static generateMeshSDFLibrary(t){return this.buildShader(t,"Mesh")}static buildShader(t,o){const n=new Ln(o),s=t.lighting,a=(s==null?void 0:s.ptEnabled)!==!1&&(t.renderMode==="PathTracing"||(s==null?void 0:s.renderMode)===1);n.setRenderMode(a?"PathTracing":"Direct");const i=t.quality||{};return n.setQuality(i.precisionMode===1,i.precisionMode??0),To.getAll().forEach(p=>{p.inject&&p.inject(n,t,o)}),n.buildFragment()}}class mt{constructor(t=65536){oe(this,"data");oe(this,"length");this.data=new Float32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,r=new Float32Array(s);r.set(this.data),this.data=r}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}class ko{constructor(t=65536){oe(this,"data");oe(this,"length");this.data=new Uint32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,r=new Uint32Array(s);r.set(this.data),this.data=r}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}function Ue(e,t,o,n,s){return o=o|0,n=n|0,s=s|0,o=o<0?0:o>=t?t-1:o,n=n<0?0:n>=t?t-1:n,s=s<0?0:s>=t?t-1:s,e[(s*t+n)*t+o]}function He(e,t,o,n,s){const r=Math.floor(o),a=Math.floor(n),i=Math.floor(s),l=o-r,p=n-a,h=s-i,u=Ue(e,t,r,a,i),f=Ue(e,t,r+1,a,i),g=Ue(e,t,r,a+1,i),b=Ue(e,t,r+1,a+1,i),y=Ue(e,t,r,a,i+1),v=Ue(e,t,r+1,a,i+1),M=Ue(e,t,r,a+1,i+1),m=Ue(e,t,r+1,a+1,i+1),w=u*(1-l)+f*l,C=g*(1-l)+b*l,U=y*(1-l)+v*l,z=M*(1-l)+m*l,R=w*(1-p)+C*p,L=U*(1-p)+z*p;return R*(1-h)+L*h}function uo(e,t,o,n,s){const a=He(e,t,o+.5,n,s)-He(e,t,o-.5,n,s),i=He(e,t,o,n+.5,s)-He(e,t,o,n-.5,s),l=He(e,t,o,n,s+.5)-He(e,t,o,n,s-.5),p=Math.sqrt(a*a+i*i+l*l);if(p<1e-10)return[0,1,0];const h=1/p;return[a*h,i*h,l*h]}function Se(e,t,o,n){return o+e/(t-1)*(n-o)}function Ze(e,t,o,n){return(e-o)/(n-o)*(t-1)}const pt=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];function Oo(e,t,o){if(e.length===0)return null;let n=0,s=0,r=0;for(let L=0;L<e.length;L++)n+=e[L].point[0],s+=e[L].point[1],r+=e[L].point[2];const a=1/e.length;n*=a,s*=a,r*=a;let i=0,l=0,p=0,h=0,u=0,f=0,g=0,b=0,y=0;for(let L=0;L<e.length;L++){const V=e[L].normal,d=e[L].point,c=V[0]*d[0]+V[1]*d[1]+V[2]*d[2];i+=V[0]*V[0],l+=V[0]*V[1],p+=V[0]*V[2],h+=V[1]*V[1],u+=V[1]*V[2],f+=V[2]*V[2],g+=V[0]*c,b+=V[1]*c,y+=V[2]*c}const v=.01;i+=v,h+=v,f+=v,g+=v*n,b+=v*s,y+=v*r;const M=i*(h*f-u*u)-l*(l*f-u*p)+p*(l*u-h*p);let m,w,C;if(Math.abs(M)<1e-6)m=n,w=s,C=r;else{const L=1/M;m=L*(g*(h*f-u*u)-l*(b*f-u*y)+p*(b*u-h*y)),w=L*(i*(b*f-u*y)-g*(l*f-u*p)+p*(l*y-b*p)),C=L*(i*(h*y-b*u)-l*(l*y-b*p)+g*(l*u-h*p))}const U=(o[0]-t[0])*.1,z=(o[1]-t[1])*.1,R=(o[2]-t[2])*.1;return m=Math.max(t[0]-U,Math.min(o[0]+U,m)),w=Math.max(t[1]-z,Math.min(o[1]+z,w)),C=Math.max(t[2]-R,Math.min(o[2]+R,C)),[m,w,C]}let qt=!1;function _n(){qt=!0}function fo(){qt=!1}function mo(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(qt)throw new Error("CANCELLED")})}async function Bn(e,t,o,n,s,r=()=>{}){const a=t-1;r("contouring",0);const i=new Map,l=new mt(8192),p=new mt(8192);let h=0;for(let z=0;z<a;z++){z&7||(r("contouring",Math.round(40*z/a)),await mo());for(let R=0;R<a;R++)for(let L=0;L<a;L++){const V=e[(z*t+R)*t+L],d=V>=0,c=[V,e[(z*t+R)*t+L+1],e[(z*t+(R+1))*t+L],e[(z*t+(R+1))*t+L+1],e[((z+1)*t+R)*t+L],e[((z+1)*t+R)*t+L+1],e[((z+1)*t+(R+1))*t+L],e[((z+1)*t+(R+1))*t+L+1]];let I=!1;for(let T=1;T<8;T++)if(c[T]>=0!==d){I=!0;break}if(!I)continue;const F=[];for(let T=0;T<12;T++){const B=pt[T],S=c[B[0]],O=c[B[1]];if(S>=0==O>=0)continue;const D=L+(B[0]&1),P=R+(B[0]>>1&1),G=z+(B[0]>>2&1),H=L+(B[1]&1),X=R+(B[1]>>1&1),$=z+(B[1]>>2&1);let N=D,Z=P,Q=G,ne=H,K=X,ee=$,re=S;for(let q=0;q<8;q++){const te=(N+ne)*.5,ce=(Z+K)*.5,se=(Q+ee)*.5,J=He(e,t,te,ce,se);J>=0==re>=0?(N=te,Z=ce,Q=se,re=J):(ne=te,K=ce,ee=se)}const ie=(N+ne)*.5,le=(Z+K)*.5,ve=(Q+ee)*.5,Y=uo(e,t,ie,le,ve);F.push({point:[Se(ie,t,o[0],n[0]),Se(le,t,o[1],n[1]),Se(ve,t,o[2],n[2])],normal:Y})}if(F.length===0)continue;const _=[Se(L,t,o[0],n[0]),Se(R,t,o[1],n[1]),Se(z,t,o[2],n[2])],k=[Se(L+1,t,o[0],n[0]),Se(R+1,t,o[1],n[1]),Se(z+1,t,o[2],n[2])],E=Oo(F,_,k);if(!E)continue;const j=uo(e,t,Ze(E[0],t,o[0],n[0]),Ze(E[1],t,o[1],n[1]),Ze(E[2],t,o[2],n[2])),A=(z*a+R)*a+L;i.set(A,h),l.push3(E[0],E[1],E[2]),p.push3(j[0],j[1],j[2]),h++}}if(r("contouring",50),console.log("DC: "+h+" vertices from "+i.size+" cells"),h===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const u=new ko(8192),f=new Set;let g=0,b=0,y=0;const v=i.size,M=Array.from(i.entries());for(let z=0;z<M.length;z++){M[z][1];const R=M[z][0];y++;const L=R%a,V=(R/a|0)%a,d=R/(a*a)|0;for(let c=0;c<12;c++){const I=pt[c],F=L+(I[0]&1),_=V+(I[0]>>1&1),k=d+(I[0]>>2&1),E=L+(I[1]&1),j=V+(I[1]>>1&1),A=d+(I[1]>>2&1),T=e[(k*t+_)*t+F],B=e[(A*t+j)*t+E];if(T>=0==B>=0)continue;let S;const O=Math.min(F,E),D=Math.min(_,j),P=Math.min(k,A);F!==E?S=0:_!==j?S=1:S=2;const G=(P*t+D)*t*4+O*4+S;if(f.has(G))continue;f.add(G),g++;const H=(S+1)%3,X=(S+2)%3,$=[O,D,P],N=[-1,-1,-1,-1];let Z=!0;for(let ne=0;ne<4;ne++){const K=[$[0],$[1],$[2]];if(K[H]-=ne&1?0:1,K[X]-=ne&2?0:1,K[0]<0||K[1]<0||K[2]<0||K[0]>=a||K[1]>=a||K[2]>=a){Z=!1;break}const ee=(K[2]*a+K[1])*a+K[0],re=i.get(ee);if(re===void 0){Z=!1;break}N[ne]=re}if(!Z){b++;continue}const Q=T>=0;N[0]!==N[1]&&N[0]!==N[3]&&N[1]!==N[3]&&(Q?u.push3(N[0],N[3],N[1]):u.push3(N[0],N[1],N[3])),N[0]!==N[2]&&N[0]!==N[3]&&N[2]!==N[3]&&(Q?u.push3(N[0],N[2],N[3]):u.push3(N[0],N[3],N[2]))}y&4095||(r("contouring",50+Math.round(50*y/v)),await mo())}r("contouring",100),console.log("DC: "+g+" sign-change edges, "+b+" dropped (boundary), "+u.length/3+" faces");const m=l.trim(),w=p.trim(),C=u.trim(),U=Math.floor(u.length/3);return{positions:m,normals:w,indices:C,vertexCount:h,faceCount:U}}let Zt=!1;function zn(){Zt=!0}function po(){Zt=!1}function zt(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(Zt)throw new Error("CANCELLED")})}class kn{constructor(t,o=8,n=1){oe(this,"N");oe(this,"blockSize");oe(this,"defaultValue");oe(this,"blocksPerAxis");oe(this,"blockCellCount");oe(this,"blocks");oe(this,"allocatedCount");this.N=t,this.blockSize=o,this.defaultValue=n,this.blocksPerAxis=Math.ceil(t/o),this.blockCellCount=o*o*o,this.blocks=new Map,this.allocatedCount=0}blockKey(t,o,n){return(n*this.blocksPerAxis+o)*this.blocksPerAxis+t}allocateBlock(t,o,n){const s=this.blockKey(t,o,n);if(!this.blocks.has(s)){const r=new Float32Array(this.blockCellCount);r.fill(this.defaultValue),this.blocks.set(s,r),this.allocatedCount++}return this.blocks.get(s)}hasBlock(t,o,n){return this.blocks.has(this.blockKey(t,o,n))}set(t,o,n,s){const r=this.blockSize,a=t/r|0,i=o/r|0,l=n/r|0,p=this.allocateBlock(a,i,l),h=t-a*r,u=o-i*r,f=n-l*r;p[(f*r+u)*r+h]=s}get(t,o,n){if(t<0||o<0||n<0||t>=this.N||o>=this.N||n>=this.N)return this.defaultValue;const s=this.blockSize,r=t/s|0,a=o/s|0,i=n/s|0,l=this.blockKey(r,a,i),p=this.blocks.get(l);if(!p)return this.defaultValue;const h=t-r*s,u=o-a*s,f=n-i*s;return p[(f*s+u)*s+h]}lerp(t,o,n){const s=Math.floor(t),r=Math.floor(o),a=Math.floor(n),i=t-s,l=o-r,p=n-a,h=this.get(s,r,a),u=this.get(s+1,r,a),f=this.get(s,r+1,a),g=this.get(s+1,r+1,a),b=this.get(s,r,a+1),y=this.get(s+1,r,a+1),v=this.get(s,r+1,a+1),M=this.get(s+1,r+1,a+1),m=h*(1-i)+u*i,w=f*(1-i)+g*i,C=b*(1-i)+y*i,U=v*(1-i)+M*i,z=m*(1-l)+w*l,R=C*(1-l)+U*l;return z*(1-p)+R*p}gradient(t,o,n){const r=this.lerp(t+.5,o,n)-this.lerp(t-.5,o,n),a=this.lerp(t,o+.5,n)-this.lerp(t,o-.5,n),i=this.lerp(t,o,n+.5)-this.lerp(t,o,n-.5),l=Math.sqrt(r*r+a*a+i*i);if(l<1e-10)return[0,1,0];const p=1/l;return[r*p,a*p,i*p]}memoryMB(){return this.allocatedCount*this.blockCellCount*4/(1024*1024)}}function On(e,t,o,n=8,s=2){const r=o/t,a=Math.ceil(o/n),i=new Set;for(let h=0;h<t-1;h++)for(let u=0;u<t-1;u++)for(let f=0;f<t-1;f++){const b=e[(h*t+u)*t+f]>=0;let y=!1;for(let v=0;v<=1&&!y;v++)for(let M=0;M<=1&&!y;M++)for(let m=0;m<=1;m++){if(m===0&&M===0&&v===0)continue;if(e[((h+v)*t+(u+M))*t+(f+m)]>=0!==b){y=!0;break}}if(y)for(let v=-s;v<=s;v++)for(let M=-s;M<=s;M++)for(let m=-s;m<=s;m++){const w=f+m,C=u+M,U=h+v;w>=0&&C>=0&&U>=0&&w<t&&C<t&&U<t&&i.add((U*t+C)*t+w)}}const l=new kn(o,n,1);let p=0;return i.forEach(h=>{const u=h%t,f=(h/t|0)%t,g=h/(t*t)|0,b=Math.floor(u*r),y=Math.floor(f*r),v=Math.floor(g*r),M=Math.ceil((u+1)*r),m=Math.ceil((f+1)*r),w=Math.ceil((g+1)*r),C=b/n|0,U=y/n|0,z=v/n|0,R=Math.min(a-1,M/n|0),L=Math.min(a-1,m/n|0),V=Math.min(a-1,w/n|0);for(let d=z;d<=V;d++)for(let c=U;c<=L;c++)for(let I=C;I<=R;I++)l.hasBlock(I,c,d)||(l.allocateBlock(I,c,d),p++)}),console.log("Narrow band: "+i.size+" coarse surface cells -> "+p+" fine blocks ("+l.memoryMB().toFixed(1)+" MB) out of "+a*a*a+" total blocks"),{grid:l,surfaceCells:i,bandBlockCount:p}}function Jt(e,t){const o=e.blockSize,n=e.blocksPerAxis;e.blocks.forEach((s,r)=>{const a=r%n,i=(r/n|0)%n,l=r/(n*n)|0;t(a,i,l,a*o,i*o,l*o)})}async function jn(e,t,o,n=()=>{}){const s=e.N,r=s-1,a=e.blockSize,i=e.blocksPerAxis;let l=new Map,p=null;function h(E,j,A,T){const B=E/a|0,S=j/a|0,O=A/a|0,D=e.blockKey(B,S,O),P=E-B*a,G=j-S*a,X=((A-O*a)*a+G)*a+P;let $=l.get(D);$||($={locals:[],globals:[]},l.set(D,$)),$.locals.push(X),$.globals.push(T)}function u(E,j,A){const T=E/a|0,B=j/a|0,S=A/a|0,O=e.blockKey(T,B,S),D=p.get(O);if(!D)return-1;const P=E-T*a,G=j-B*a,X=((A-S*a)*a+G)*a+P,$=D.locals;let N=0,Z=$.length-1;for(;N<=Z;){const Q=N+Z>>1;if($[Q]===X)return D.globals[Q];$[Q]<X?N=Q+1:Z=Q-1}return-1}const f=new Map;function g(E,j,A,T){const B=E/a|0,S=j/a|0,O=A/a|0,D=e.blockKey(B,S,O);let P=f.get(D);P||(P=new Uint8Array(e.blockCellCount),f.set(D,P));const G=E-B*a,H=j-S*a,$=((A-O*a)*a+H)*a+G,N=1<<T;return P[$]&N?!0:(P[$]|=N,!1)}n("contouring",0);const b=new mt(262144),y=new mt(262144);let v=0,M=0;const m=e.allocatedCount,w=[];Jt(e,(E,j,A,T,B,S)=>{w.push([E,j,A,T,B,S])});for(let E=0;E<w.length;E++){const j=w[E],A=j[3],T=j[4],B=j[5];M++;const S=Math.min(A+a,r),O=Math.min(T+a,r),D=Math.min(B+a,r);for(let P=B;P<D;P++)for(let G=T;G<O;G++)for(let H=A;H<S;H++){const X=e.get(H,G,P),$=X>=0,N=[X,e.get(H+1,G,P),e.get(H,G+1,P),e.get(H+1,G+1,P),e.get(H,G,P+1),e.get(H+1,G,P+1),e.get(H,G+1,P+1),e.get(H+1,G+1,P+1)];let Z=!1;for(let ie=1;ie<8;ie++)if(N[ie]>=0!==$){Z=!0;break}if(!Z)continue;const Q=[];for(let ie=0;ie<12;ie++){const le=pt[ie],ve=N[le[0]],Y=N[le[1]];if(ve>=0==Y>=0)continue;const q=H+(le[0]&1),te=G+(le[0]>>1&1),ce=P+(le[0]>>2&1),se=H+(le[1]&1),J=G+(le[1]>>1&1),ae=P+(le[1]>>2&1);let fe=q,he=te,be=ce,Re=se,De=J,ue=ae,we=ve;for(let Fe=0;Fe<8;Fe++){const Be=(fe+Re)*.5,Ge=(he+De)*.5,Xe=(be+ue)*.5,et=e.lerp(Be,Ge,Xe);et>=0==we>=0?(fe=Be,he=Ge,be=Xe,we=et):(Re=Be,De=Ge,ue=Xe)}const ye=(fe+Re)*.5,ge=(he+De)*.5,pe=(be+ue)*.5,Ee=e.gradient(ye,ge,pe);Q.push({point:[Se(ye,s,t[0],o[0]),Se(ge,s,t[1],o[1]),Se(pe,s,t[2],o[2])],normal:Ee})}if(Q.length===0)continue;const ne=[Se(H,s,t[0],o[0]),Se(G,s,t[1],o[1]),Se(P,s,t[2],o[2])],K=[Se(H+1,s,t[0],o[0]),Se(G+1,s,t[1],o[1]),Se(P+1,s,t[2],o[2])],ee=Oo(Q,ne,K);if(!ee)continue;const re=e.gradient(Ze(ee[0],s,t[0],o[0]),Ze(ee[1],s,t[1],o[1]),Ze(ee[2],s,t[2],o[2]));h(H,G,P,v),b.push3(ee[0],ee[1],ee[2]),y.push3(re[0],re[1],re[2]),v++}M&63||(n("contouring",Math.round(40*M/m)),await zt())}if(n("contouring",50),console.log("DC sparse: "+v+" vertices ("+((b.data.byteLength+y.data.byteLength)/(1024*1024)).toFixed(0)+" MB vertex data)"),v===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const C=new Map,U=e.blockCellCount+7>>3,z=e.memoryMB();let R=Array.from(e.blocks.keys());for(let E=0;E<R.length;E++){const j=R[E],A=e.blocks.get(j),T=new Uint8Array(U);for(let B=0;B<A.length;B++)A[B]>=0&&(T[B>>3]|=1<<(B&7));C.set(j,T),e.blocks.delete(j),E&255||await zt()}R=null,e.allocatedCount=0;const L=(C.size*U/(1024*1024)).toFixed(0);console.log("Sign compression: freed "+z.toFixed(0)+" MB float data, using "+L+" MB sign maps"),p=new Map,l.forEach((E,j)=>{const A=E.locals.length,T=new Array(A);for(let P=0;P<A;P++)T[P]=P;const B=E.locals,S=E.globals;T.sort((P,G)=>B[P]-B[G]);const O=new Uint16Array(A),D=new Uint32Array(A);for(let P=0;P<A;P++)O[P]=B[T[P]],D[P]=S[T[P]];p.set(j,{locals:O,globals:D})}),l.clear(),l=null,console.log("Vertex map compaction: "+p.size+" blocks with vertices");function V(E,j,A){if(E<0||j<0||A<0||E>=s||j>=s||A>=s)return!0;const T=E/a|0,B=j/a|0,S=A/a|0,O=e.blockKey(T,B,S),D=C.get(O);if(!D)return!0;const P=E-T*a,G=j-B*a,X=((A-S*a)*a+G)*a+P;return(D[X>>3]&1<<(X&7))!==0}const d=new ko(262144);let c=0,I=0,F=0;const _=p.size;let k=Array.from(p.entries());for(let E=0;E<k.length;E++){const j=k[E],A=j[0],T=j[1];F++;const B=A%i,S=(A/i|0)%i,O=A/(i*i)|0,D=B*a,P=S*a,G=O*a;for(let H=0;H<T.locals.length;H++){const X=T.locals[H],$=X%a,N=(X/a|0)%a,Z=X/(a*a)|0,Q=D+$,ne=P+N,K=G+Z;if(!(Q>=r||ne>=r||K>=r))for(let ee=0;ee<12;ee++){const re=pt[ee],ie=Q+(re[0]&1),le=ne+(re[0]>>1&1),ve=K+(re[0]>>2&1),Y=Q+(re[1]&1),q=ne+(re[1]>>1&1),te=K+(re[1]>>2&1),ce=V(ie,le,ve),se=V(Y,q,te);if(ce===se)continue;let J;const ae=Math.min(ie,Y),fe=Math.min(le,q),he=Math.min(ve,te);if(ie!==Y?J=0:le!==q?J=1:J=2,g(ae,fe,he,J))continue;c++;const be=(J+1)%3,Re=(J+2)%3,De=[ae,fe,he],ue=[-1,-1,-1,-1];let we=!0;for(let ge=0;ge<4;ge++){const pe=[De[0],De[1],De[2]];if(pe[be]-=ge&1?0:1,pe[Re]-=ge&2?0:1,pe[0]<0||pe[1]<0||pe[2]<0||pe[0]>=r||pe[1]>=r||pe[2]>=r){we=!1;break}const Ee=u(pe[0],pe[1],pe[2]);if(Ee<0){we=!1;break}ue[ge]=Ee}if(!we){I++;continue}const ye=ce;ue[0]!==ue[1]&&ue[0]!==ue[3]&&ue[1]!==ue[3]&&(ye?d.push3(ue[0],ue[3],ue[1]):d.push3(ue[0],ue[1],ue[3])),ue[0]!==ue[2]&&ue[0]!==ue[3]&&ue[2]!==ue[3]&&(ye?d.push3(ue[0],ue[2],ue[3]):d.push3(ue[0],ue[3],ue[2]))}}F&63||(n("contouring",50+Math.round(50*F/_)),await zt())}return p=null,k=null,n("contouring",100),console.log("DC sparse: "+c+" sign-change edges, "+I+" dropped, "+d.length/3+" faces"),{positions:b.trim(),normals:y.trim(),indices:d.trim(),vertexCount:v,faceCount:Math.floor(d.length/3)}}const jo=new Float32Array(1),Nn=new Uint32Array(jo.buffer);function Un(e){jo[0]=e;const t=Nn[0],o=t>>16&32768,n=(t>>23&255)-127+15,s=t&8388607;return n<=0?o:n>=31?o|31744:o|n<<10|s>>13}const No=new Uint16Array(256);for(let e=0;e<256;e++)No[e]=Un(e/255);class Uo{constructor(t){oe(this,"buf");oe(this,"a");oe(this,"v");oe(this,"pos");this.buf=new ArrayBuffer(t||8*1024*1024),this.a=new Uint8Array(this.buf),this.v=new DataView(this.buf),this.pos=0}grow(t){let o=this.pos+t;this.buf.byteLength<256*1024*1024?o=Math.max(this.buf.byteLength*2,o):o=Math.max(Math.round(this.buf.byteLength*1.25),o);const n=new ArrayBuffer(o);new Uint8Array(n).set(this.a),this.buf=n,this.a=new Uint8Array(n),this.v=new DataView(n)}en(t){this.pos+t>this.buf.byteLength&&this.grow(t)}u8(t){this.en(1),this.v.setUint8(this.pos,t),this.pos++}u16(t){this.en(2),this.v.setUint16(this.pos,t,!0),this.pos+=2}u32(t){this.en(4),this.v.setUint32(this.pos,t,!0),this.pos+=4}i32(t){this.en(4),this.v.setInt32(this.pos,t,!0),this.pos+=4}u64(t){this.en(8),this.v.setBigUint64(this.pos,t,!0),this.pos+=8}f64(t){this.en(8),this.v.setFloat64(this.pos,t,!0),this.pos+=8}raw(t){this.en(t.length),this.a.set(t,this.pos),this.pos+=t.length}str(t){this.en(t.length);for(let o=0;o<t.length;o++)this.a[this.pos++]=t.charCodeAt(o)}name(t){this.u32(t.length),this.str(t)}zeros(t){this.en(t),this.pos+=t}bulk64(t){const o=t.length*8;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulk16(t){const o=t.length*2;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulkF32(t){const o=t.length*4;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}result(){return new Uint8Array(this.buf,0,this.pos)}}const ht=0xFFFFFFFFFFFFFFFFn;function Vn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Uint16Array(32768),n4map:new Map}}function $n(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Uint16Array(4096),leafMap:new Map}}function Gn(e,t,o,n,s){const r=new BigUint64Array(8),a=new Uint16Array(512);let i=0;for(let b=0;b<512;b++)s[b]>0&&(r[b>>6]|=1n<<BigInt(b&63),a[b]=No[s[b]],i++);if(i===0)return 0;const l=t<<3,p=o<<3,h=n<<3,u=(h&4095)>>7|(p&4095)>>7<<5|(l&4095)>>7<<10;e.n5childMask[u>>6]|=1n<<BigInt(u&63);let f=e.n4map.get(u);f||(f=$n(),e.n4map.set(u,f));const g=(h&127)>>3|(p&127)>>3<<4|(l&127)>>3<<8;return f.childMask[g>>6]|=1n<<BigInt(g&63),f.leafMap.set(g,{mask:r,data:a}),i}function Xn(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const r=[];n.leafMap.forEach(function(a,i){let l=!0;for(let u=0;u<8;u++)if(a.mask[u]!==ht){l=!1;break}if(!l)return;const p=a.data[0];let h=!0;for(let u=1;u<512;u++)if(a.data[u]!==p){h=!1;break}h&&r.push([i,p])});for(let a=0;a<r.length;a++){const i=r[a][0],l=r[a][1];n.leafMap.delete(i),n.childMask[i>>6]&=~(1n<<BigInt(i&63)),n.valueMask[i>>6]|=1n<<BigInt(i&63),n.tileValues[i]=l,t++}if(n.leafMap.size===0){let a=!0;for(let i=0;i<64;i++)if(n.valueMask[i]!==ht){a=!1;break}if(a){const i=n.tileValues[0];let l=!0;for(let p=1;p<4096;p++)if(n.tileValues[p]!==i){l=!1;break}l&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s]=i,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Hn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Float32Array(32768*3),n4map:new Map}}function Wn(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Float32Array(4096*3),leafMap:new Map}}function Yn(e,t,o,n,s,r,a){const i=new BigUint64Array(8),l=new Float32Array(512*3);let p=0;for(let v=0;v<512;v++)(s[v]>0||r[v]>0||a[v]>0)&&(i[v>>6]|=1n<<BigInt(v&63),l[v*3]=s[v]/255,l[v*3+1]=r[v]/255,l[v*3+2]=a[v]/255,p++);if(p===0)return 0;const h=t<<3,u=o<<3,f=n<<3,g=(f&4095)>>7|(u&4095)>>7<<5|(h&4095)>>7<<10;e.n5childMask[g>>6]|=1n<<BigInt(g&63);let b=e.n4map.get(g);b||(b=Wn(),e.n4map.set(g,b));const y=(f&127)>>3|(u&127)>>3<<4|(h&127)>>3<<8;return b.childMask[y>>6]|=1n<<BigInt(y&63),b.leafMap.set(y,{mask:i,data:l}),p}function qn(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const r=[];n.leafMap.forEach(function(a,i){let l=!0;for(let g=0;g<8;g++)if(a.mask[g]!==ht){l=!1;break}if(!l)return;const p=a.data[0],h=a.data[1],u=a.data[2];let f=!0;for(let g=1;g<512;g++)if(a.data[g*3]!==p||a.data[g*3+1]!==h||a.data[g*3+2]!==u){f=!1;break}f&&r.push([i,p,h,u])});for(const[a,i,l,p]of r)n.leafMap.delete(a),n.childMask[a>>6]&=~(1n<<BigInt(a&63)),n.valueMask[a>>6]|=1n<<BigInt(a&63),n.tileValues[a*3]=i,n.tileValues[a*3+1]=l,n.tileValues[a*3+2]=p,t++;if(n.leafMap.size===0){let a=!0;for(let i=0;i<64;i++)if(n.valueMask[i]!==ht){a=!1;break}if(a){const i=n.tileValues[0],l=n.tileValues[1],p=n.tileValues[2];let h=!0;for(let u=1;u<4096;u++)if(n.tileValues[u*3]!==i||n.tileValues[u*3+1]!==l||n.tileValues[u*3+2]!==p){h=!1;break}h&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s*3]=i,e.n5tileValues[s*3+1]=l,e.n5tileValues[s*3+2]=p,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Je(e){return Array.from(e.keys()).sort(function(t,o){return t-o})}function je(e,t,o){e.name(t),e.name("string"),e.name(o)}function Qt(e,t,o){e.name(t),e.name("bool"),e.u32(1),e.u8(o?1:0)}function Vo(e,t){e.u32(1),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulk16(t.n5tileValues);const o=Je(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulk16(s.tileValues);const r=Je(s.leafMap);for(let a=0;a<r.length;a++)e.bulk64(s.leafMap.get(r[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),r=Je(s.leafMap);for(let a=0;a<r.length;a++){const i=s.leafMap.get(r[a]);e.bulk64(i.mask),e.u8(6),e.bulk16(i.data),i.data=null}}}function Zn(e,t){e.u32(1),e.f64(0),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulkF32(t.n5tileValues);const o=Je(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulkF32(s.tileValues);const r=Je(s.leafMap);for(let a=0;a<r.length;a++)e.bulk64(s.leafMap.get(r[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),r=Je(s.leafMap);for(let a=0;a<r.length;a++){const i=s.leafMap.get(r[a]);e.bulk64(i.mask),e.u8(6),e.bulkF32(i.data),i.data=null}}}function $o(e,t,o,n){const s=n/t;e.name("AffineMap"),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(o[0]),e.f64(o[1]),e.f64(o[2]),e.f64(1)}function Jn(e,t,o,n,s,r){e.u32(0),e.u32(4),je(e,"class","unknown"),je(e,"file_compression","none"),Qt(e,"is_saved_as_half_float",!0),je(e,"name",o),$o(e,n,s,r),Vo(e,t)}function Qn(e,t,o,n,s,r){e.u32(0),e.u32(4),je(e,"class","unknown"),je(e,"file_compression","none"),Qt(e,"is_saved_as_half_float",!1),je(e,"name",o),$o(e,n,s,r),Zn(e,t)}function Kn(e,t,o,n){let s=0;e.n4map.forEach(function(l){s+=l.leafMap.size});const r=2e5+s*1200+e.n4map.size*1e4,a=new Uo(Math.max(r,1024*1024));a.raw(new Uint8Array([32,66,68,86,0,0,0,0])),a.u32(224),a.u32(8),a.u32(1),a.u8(0),a.str("d2b59639-ac2f-4047-9c50-9648f951180c"),a.u32(0),a.u32(1),a.name("density"),a.name("Tree_float_5_4_3_HalfFloat"),a.u32(0),a.u64(BigInt(a.pos+24)),a.u64(0n),a.u64(0n),a.u32(0),a.u32(4),je(a,"class","unknown"),je(a,"file_compression","none"),Qt(a,"is_saved_as_half_float",!0),je(a,"name","density");const i=n/t;return a.name("AffineMap"),a.f64(i),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(i),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(i),a.f64(0),a.f64(o[0]),a.f64(o[1]),a.f64(o[2]),a.f64(1),Vo(a,e),a.result()}function ea(e,t,o,n,s){let r=0;e.n4map.forEach(function(p){r+=p.leafMap.size});let a=0;t.n4map.forEach(function(p){a+=p.leafMap.size});const i=2e5+r*1200+e.n4map.size*1e4+2e5+a*7200+t.n4map.size*6e4,l=new Uo(Math.max(i,2*1024*1024));return l.raw(new Uint8Array([32,66,68,86,0,0,0,0])),l.u32(224),l.u32(8),l.u32(1),l.u8(0),l.str("d2b59639-ac2f-4047-9c50-9648f951180c"),l.u32(0),l.u32(2),l.name("density"),l.name("Tree_float_5_4_3_HalfFloat"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Jn(l,e,"density",o,n,s),l.name("Cd"),l.name("Tree_vec3s_5_4_3"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Qn(l,t,"Cd",o,n,s),l.result()}function ta(e,t){return{formula:e.id,pipelineRevision:0,quality:t?{estimator:t.estimator??0,distanceMetric:t.distanceMetric??0}:void 0}}function st(e,t,o){const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0);const s=v=>v?[v.x??v[0]??0,v.y??v[1]??0]:[0,0],r=v=>v?[v.x??v[0]??0,v.y??v[1]??0,v.z??v[2]??0]:[0,0,0],a=v=>v?[v.x??v[0]??0,v.y??v[1]??0,v.z??v[2]??0,v.w??v[3]??0]:[0,0,0,0],i=s(n.vec2A);t.uVec2A&&e.uniform2f(t.uVec2A,i[0],i[1]);const l=s(n.vec2B);t.uVec2B&&e.uniform2f(t.uVec2B,l[0],l[1]);const p=s(n.vec2C);t.uVec2C&&e.uniform2f(t.uVec2C,p[0],p[1]);const h=r(n.vec3A);t.uVec3A&&e.uniform3f(t.uVec3A,h[0],h[1],h[2]);const u=r(n.vec3B);t.uVec3B&&e.uniform3f(t.uVec3B,u[0],u[1],u[2]);const f=r(n.vec3C);t.uVec3C&&e.uniform3f(t.uVec3C,f[0],f[1],f[2]);const g=a(n.vec4A);t.uVec4A&&e.uniform4f(t.uVec4A,g[0],g[1],g[2],g[3]);const b=a(n.vec4B);t.uVec4B&&e.uniform4f(t.uVec4B,b[0],b[1],b[2],b[3]);const y=a(n.vec4C);if(t.uVec4C&&e.uniform4f(t.uVec4C,y[0],y[1],y[2],y[3]),t.uJulia){const v=n.julia;Array.isArray(v)?e.uniform3f(t.uJulia,v[0]??0,v[1]??0,v[2]??0):v&&typeof v=="object"?e.uniform3f(t.uJulia,v.x??0,v.y??0,v.z??0):e.uniform3f(t.uJulia,0,0,0)}t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode?1:0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??10),t.uDeBailout&&e.uniform1f(t.uDeBailout,n.deBailout??100),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}function rt(e,t,o){if(t.uWeaveEnabled&&e.uniform1f(t.uWeaveEnabled,(o==null?void 0:o.weaveEnabled)===!1?0:1),!o)return;const n=s=>s.charAt(0).toUpperCase()+s.slice(1);for(const[s,r]of Object.entries(o)){if(s==="weaveEnabled")continue;const a=t["u"+n(s)];a&&(/^ws\d+Vec2/.test(s)?e.uniform2f(a,(r==null?void 0:r.x)??0,(r==null?void 0:r.y)??0):/^ws\d+Vec3/.test(s)?e.uniform3f(a,(r==null?void 0:r.x)??0,(r==null?void 0:r.y)??0,(r==null?void 0:r.z)??0):/^ws\d+Vec4/.test(s)?e.uniform4f(a,(r==null?void 0:r.x)??0,(r==null?void 0:r.y)??0,(r==null?void 0:r.z)??0,(r==null?void 0:r.w)??0):e.uniform1f(a,typeof r=="number"?r:r?1:0))}}function ho(e,t,o,n){const s=e.createShader(t);if(!s)throw new Error("Failed to create shader");if(e.shaderSource(s,o),e.compileShader(s),!e.getShaderParameter(s,e.COMPILE_STATUS)){const r=e.getShaderInfoLog(s)||"",a=t===e.VERTEX_SHADER?"vertex":"fragment";n("Shader compile error ("+a+"): "+r,"error");const i=o.split(`
`),l=r.match(/\d+:\d+/g)||[];for(let p=0;p<Math.min(l.length,5);p++){const h=parseInt(l[p].split(":")[1])-1;h>=0&&h<i.length&&n("  Line "+(h+1)+": "+i[h].trim(),"error")}throw new Error("Shader compile: "+r.split(`
`)[0])}return s}function it(e,t,o,n){const s=e.createProgram();if(!s)throw new Error("Failed to create program");if(e.attachShader(s,ho(e,e.VERTEX_SHADER,t,n)),e.attachShader(s,ho(e,e.FRAGMENT_SHADER,o,n)),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS)){const r=e.getProgramInfoLog(s)||"";throw n("Program link error: "+r,"error"),new Error("Program link: "+r)}return s}function vt(){const e=document.createElement("canvas");e.width=2048,e.height=2048;const t=e.getContext("webgl2",{antialias:!1});if(!t)throw new Error("WebGL2 not supported");return t.getExtension("EXT_color_buffer_float"),t.getExtension("OES_texture_float_linear"),t}function Kt(e,t){const o={};for(let n=0;n<qe.length;n++)o[qe[n]]=e.getUniformLocation(t,qe[n]);return o}function Qe(e,t,o,n,s,r,a){_e.register(o);const i=In.generateMeshSDFLibrary(ta(o,a)),l=n,p=`#version 300 es
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

${i}

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
}`,h=it(e,Ke,p,s);e.useProgram(h);const u=e.createTexture();e.bindTexture(e.TEXTURE_2D,u),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,t,t);const f=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,f),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,u,0),e.viewport(0,0,t,t),e.bindVertexArray(e.createVertexArray());const g=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...qe],b={};for(let y=0;y<g.length;y++)b[g[y]]=e.getUniformLocation(h,g[y]);return{prog:h,loc:b,fbo:f,tex:u}}function lt(e,t,o,n,s,r,a,i,l,p){e.useProgram(t.prog),e.uniform1f(t.loc.uPower,n),e.uniform1i(t.loc.uIters,s),e.uniform1f(t.loc.uInvRes,1/o),e.uniform3f(t.loc.uBoundsMin,r[0],r[1],r[2]),e.uniform1f(t.loc.uBoundsRange,a),t.loc.uSurfaceThreshold&&e.uniform1f(t.loc.uSurfaceThreshold,p??0),st(e,t.loc,i),rt(e,t.loc,l),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo)}async function Go(e,t,o,n,s,r,a,i,l,p,h,u,f){const{log:g,setPhase:b,setStatus:y,tick:v}=p,M=128,m=i[0]-a[0];let w=0,C=n-1;if(n>M){g("Coarse pre-pass: sampling "+M+"³ to detect Z range...","info"),b("Coarse Pre-pass",0),y("Coarse pre-pass ("+M+"³)..."),await v();const U=Qe(e,M,t,1,g,h,u);lt(e,U,M,s,r,a,m,o,h,f),e.viewport(0,0,M,M);const z=new Float32Array(M*M*4);let R=M,L=-1;for(let V=0;V<M;V++){e.uniform1f(U.loc.uZ,(V+.5)/M),e.uniform2f(U.loc.uTileOffset,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,M,M,e.RGBA,e.FLOAT,z);let d=!1;for(let c=0;c<M*M;c++)if(z[c*4]<l*3){d=!0;break}d&&(V<R&&(R=V),L=V)}if(e.deleteTexture(U.tex),e.deleteFramebuffer(U.fbo),e.deleteProgram(U.prog),L>=R){const d=n/M;w=Math.max(0,Math.floor((R-2)*d)),C=Math.min(n-1,Math.ceil((L+2+1)*d)),w=w&-8,C=Math.min(n-1,C|7);const c=(100*(1-(C-w+1)/n)).toFixed(0);g("Coarse pre-pass: data in Z ["+R+","+L+"] of "+M+" → fine Z ["+w+","+C+"] of "+n+" (skipping "+c+"% of slices)","data")}else g("Coarse pre-pass: no data found — sampling all slices","warn");b("Coarse Pre-pass",100)}return{zSliceMin:w,zSliceMax:C}}function Xo(e,t,o,n,s,r,a,i,l){function p(h,u){if(e.useProgram(t.prog),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo),e.uniform1f(t.loc.uZ,h),o<=n){e.uniform2f(t.loc.uTileOffset,0,0),e.viewport(0,0,o,o),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,o,o,e.RGBA,e.FLOAT,s);for(let f=0;f<o*o;f++)u[f]=s[f*4]}else for(let f=0;f<o;f+=n)for(let g=0;g<o;g+=n){const b=Math.min(n,o-g),y=Math.min(n,o-f);e.uniform2f(t.loc.uTileOffset,g,f),e.viewport(0,0,b,y),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,b,y,e.RGBA,e.FLOAT,s);for(let v=0;v<y;v++)for(let M=0;M<b;M++)u[(f+v)*o+(g+M)]=s[(v*b+M)*4]}}if(!i||i<=1)p((a+.5)/o,r);else{r.fill(0);const h=1/i;for(let u=0;u<i;u++){const f=(a+(u+.5)*h)/o;p(f,l);for(let g=0;g<o*o;g++)r[g]+=l[g]}for(let u=0;u<o*o;u++)r[u]*=h}}function Ho(e,t,o,n){const s=t/n,r=new ImageData(n,n);for(let a=0;a<n;a++){const i=Math.min(Math.round(a*s),t-1);for(let l=0;l<n;l++){const p=Math.min(Math.round(l*s),t-1),h=e[i*t+p],u=Math.abs(h),f=u<o*2?Math.round(255*(1-u/(o*2))):0,g=h<0?50:0,b=(a*n+l)*4;r.data[b]=f+g,r.data[b+1]=h<0?30:f,r.data[b+2]=f,r.data[b+3]=255}}return r}async function vo(e,t,o,n,s,r,a,i,l,p,h,u,f,g,b,y){const{setProgress:v,setPhase:M,setStatus:m,tick:w,log:C,onSlicePreview:U}=g,z=Math.min(o,2048),R=i[0]-a[0];(!h||h<1)&&(h=1),u==null&&(u=0),f==null&&(f=o-1),lt(e,t,o,n,s,a,R,r,b,y),e.viewport(0,0,z,z);const L=new Float32Array(z*z*4),V=new Float32Array(o*o*o),d=R/o,c=new Float32Array(o*o),I=h>1?new Float32Array(o*o):null,F=Math.min(o,512);(u>0||f<o-1)&&V.fill(1),h>1&&C("Z sub-slicing: "+h+" sub-samples per voxel layer (smooths Z-axis banding)","info");const _=f-u+1;let k=0;for(let E=u;E<=f;E++){if(Xo(e,t,o,z,L,c,E,h,I),V.set(c,E*o*o),U){const j=Ho(c,o,d,F);U(j,F,F)}k++,v(l+Math.round(k/_*p)),M("SDF Sampling",Math.round(k/_*100)),k&3||(m("Sampling SDF... slice "+k+"/"+_),await w())}return V}function oa(e,t,o,n,s,r,a,i,l){const p=a/l,h=new ImageData(l,l);for(let u=0;u<l;u++){const f=Math.round(u*p);for(let g=0;g<l;g++){const b=Math.round(g*p),y=(u*l+g)*4;if(b>=t&&b<n&&f>=o&&f<s){const v=((f-o)*r+(b-t))*4,M=e[v],m=Math.abs(M),w=m<i*2?Math.round(255*(1-m/(i*2))):0,C=M<0?50:0;h.data[y]=w+C,h.data[y+1]=M<0?30:w,h.data[y+2]=w}else h.data[y]=15,h.data[y+1]=15,h.data[y+2]=20;h.data[y+3]=255}}return h}async function na(e,t,o,n,s,r,a,i,l,p,h,u,f){const{setProgress:g,setPhase:b,setStatus:y,tick:v,onSlicePreview:M}=h,m=o.N,w=o.blockSize,C=Math.min(m,2048),U=i[0]-a[0];lt(e,t,m,n,s,a,U,r,u,f),e.viewport(0,0,C,C);const z=new Map;Jt(o,(F,_,k,E,j,A)=>{for(let T=0;T<w;T++){const B=A+T;if(B>=m)continue;let S=z.get(B);S||(S={entries:[],minX:E,minY:j,maxX:E+w,maxY:j+w},z.set(B,S)),S.entries.push({startX:E,startY:j}),E<S.minX&&(S.minX=E),j<S.minY&&(S.minY=j),E+w>S.maxX&&(S.maxX=E+w),j+w>S.maxY&&(S.maxY=j+w)}});const R=Array.from(z.keys()).sort((F,_)=>F-_);let L=0;for(let F=0;F<R.length;F++){const _=z.get(R[F]),k=Math.min(m,_.maxX)-Math.max(0,_.minX),E=Math.min(m,_.maxY)-Math.max(0,_.minY),j=k*E*4;j>L&&(L=j)}const V=new Float32Array(L),d=Math.min(m,512),c=U/m;let I=0;for(let F=0;F<R.length;F++){const _=R[F],k=z.get(_);e.uniform1f(t.loc.uZ,(_+.5)/m);const E=Math.max(0,k.minX),j=Math.max(0,k.minY),A=Math.min(m,k.maxX),T=Math.min(m,k.maxY),B=A-E,S=T-j;e.uniform2f(t.loc.uTileOffset,E,j),e.viewport(0,0,B,S),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,B,S,e.RGBA,e.FLOAT,V);const O=k.entries;for(let D=0;D<O.length;D++){const P=O[D];for(let G=0;G<w;G++){const H=P.startX+G;if(!(H<E||H>=A))for(let X=0;X<w;X++){const $=P.startY+X;if($<j||$>=T)continue;const N=(($-j)*B+(H-E))*4;o.set(H,$,_,V[N])}}}if(I++,!(I&7)){if(M){const D=oa(V,E,j,A,T,B,m,c,d);M(D,d,d)}g(l+Math.round(I/R.length*p)),b("Fine SDF Sampling",Math.round(I/R.length*100)),y("Sampling fine SDF... slice "+I+"/"+R.length+" (narrow-band)"),await v()}}return o}async function aa(e,t,o,n,s,r,a,i,l,p,h,u,f,g,b,y){const{log:v,setProgress:M,setPhase:m,setStatus:w,tick:C,onSlicePreview:U}=u,z=i[0]-a[0],R=z/n,L=8,V=n/L|0,d=Math.min(n,2048);(!h||h<1)&&(h=1);const c=await Go(e,t,o,n,s,r,a,i,R,u,f,g,b),{zSliceMin:I,zSliceMax:F}=c,_=Qe(e,d,t,p||1,v,f,g);lt(e,_,n,s,r,a,z,o,f,b);const k=new Float32Array(d*d*4),E=Vn();let j=0;const A=new Array(L);for(let X=0;X<L;X++)A[X]=new Float32Array(n*n);const T=h>1?new Float32Array(n*n):null,B=Math.min(n,512),S=F-I+1;let O=0;h>1&&v("Z sub-slicing: "+h+" sub-samples per voxel layer (smooths Z-axis banding)","info");for(let X=I;X<=F;X++){const $=A[X%L];if(Xo(e,_,n,d,k,$,X,h,T),X%L===L-1){const N=X/L|0;for(let Z=0;Z<V;Z++)for(let Q=0;Q<V;Q++){const ne=new Uint8Array(512);let K=!1;for(let ee=0;ee<L;ee++){const re=A[ee];for(let ie=0;ie<L;ie++)for(let le=0;le<L;le++){const ve=Q*L+le,Y=Z*L+ie,q=re[Y*n+ve],te=ee|ie<<3|le<<6;let ce;q<0?ce=255:ce=Math.round(Math.max(0,Math.min(255,255*(1-q/(R*2.5))))),ne[te]=ce,ce>0&&(K=!0)}}K&&(j+=Gn(E,Q,Z,N,ne))}}if(O++,!(O&7)){const N=Math.round(O/S*80);if(M(N),m("VDB Sampling",Math.round(O/S*100)),w("VDB sampling slice "+O+"/"+S+(I>0||F<n-1?" (Z "+I+"–"+F+")":"")),U){const Z=Ho(A[X%L],n,R,B);U(Z,B,B)}await C()}}if(e.deleteTexture(_.tex),e.deleteFramebuffer(_.fbo),e.deleteProgram(_.prog),u.memAlloc){let X=0;E.n4map.forEach(N=>{X+=N.leafMap.size});const $=Math.round((X*1.1+E.n4map.size*10)/1024);u.memAlloc("vdbDensity","VDB Density",$,"#8c6")}let D=null;if(y){m("VDB Color",0),w("Sampling voxel colors..."),v("Color pass: sampling orbit-trap colors for active voxels","phase");let X=0;if(E.n4map.forEach($=>{$.leafMap.forEach(N=>{for(let Z=0;Z<8;Z++){let Q=N.mask[Z];for(;Q!==0n;)Q&=Q-1n,X++}})}),v("Color pass: "+X.toLocaleString()+" active voxels to colorize","data"),X>0){const $=Hn(),N=Math.min(e.getParameter(e.MAX_TEXTURE_SIZE),2048),Z=N*N,Q=_o({definition:t}),ne=it(e,Ke,Q,v),K=Kt(e,ne),ee=e.createVertexArray(),re=e.getUniformLocation(ne,"uPositions"),ie=e.getUniformLocation(ne,"uPower"),le=e.getUniformLocation(ne,"uIters"),ve=e.getUniformLocation(ne,"uWidth"),Y=e.getUniformLocation(ne,"uJitterOffset"),q=[];E.n4map.forEach((ge,pe)=>{ge.leafMap.forEach((Ee,Fe)=>{q.push(pe,Fe)})});const te=q.length>>1,ce=Math.ceil(Math.sqrt(Z)),se=Math.ceil(Z/ce),J=ce*se,ae=new Float32Array(J*4),fe=new Uint8Array(J*4),he=new Uint16Array(Z),be=new Uint32Array(Z),Re=new Uint8Array(512),De=new Uint8Array(512),ue=new Uint8Array(512);let we=0,ye=0;for(;ye<te;){let ge=0,pe=ye;for(;pe<te&&ge+512<=Z;){const Le=q[pe*2],Ne=q[pe*2+1],tt=E.n4map.get(Le).leafMap.get(Ne),Ct=(Le>>10&31)<<7,Mt=(Le>>5&31)<<7,Et=(Le&31)<<7,Tt=(Ne>>8&15)<<3,Dt=(Ne>>4&15)<<3,Rt=(Ne&15)<<3,Ft=Ct+Tt,Pt=Mt+Dt,At=Et+Rt;for(let Pe=0;Pe<512;Pe++){if((tt.mask[Pe>>6]&1n<<BigInt(Pe&63))===0n)continue;const qo=Pe&7,Zo=Pe>>3&7,Jo=Pe>>6&7;ae[ge*4]=a[0]+(Ft+Jo+.5)*R,ae[ge*4+1]=a[1]+(Pt+Zo+.5)*R,ae[ge*4+2]=a[2]+(At+qo+.5)*R,ae[ge*4+3]=1,he[ge]=Pe,be[ge]=pe,ge++}pe++}const Ee=ge;if(Ee===0){ye=pe;continue}const Fe=Math.ceil(Math.sqrt(Ee)),Be=Math.ceil(Ee/Fe);e.useProgram(ne);const Ge=e.createTexture();e.bindTexture(e.TEXTURE_2D,Ge),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,Fe,Be,0,e.RGBA,e.FLOAT,ae.subarray(0,Fe*Be*4)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const Xe=e.createTexture();e.bindTexture(e.TEXTURE_2D,Xe),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA8,Fe,Be);const et=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,et),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Xe,0),e.viewport(0,0,Fe,Be),e.bindVertexArray(ee),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,Ge),e.uniform1i(re,0),e.uniform1f(ie,s),e.uniform1i(le,r),e.uniform1i(ve,Fe),e.uniform3f(Y,0,0,0),st(e,K,o),rt(e,K,f),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,Fe,Be,e.RGBA,e.UNSIGNED_BYTE,fe),e.deleteTexture(Ge),e.deleteTexture(Xe),e.deleteFramebuffer(et);let ze=0;for(let Le=ye;Le<pe;Le++){if(ze>=Ee||be[ze]!==Le)continue;const Ne=q[Le*2],tt=q[Le*2+1],Ct=(Ne>>10&31)<<7,Mt=(Ne>>5&31)<<7,Et=(Ne&31)<<7,Tt=(tt>>8&15)<<3,Dt=(tt>>4&15)<<3,Rt=(tt&15)<<3,Ft=Ct+Tt>>3,Pt=Mt+Dt>>3,At=Et+Rt>>3;for(Re.fill(0),De.fill(0),ue.fill(0);ze<Ee&&be[ze]===Le;){const Pe=he[ze];Re[Pe]=fe[ze*4],De[Pe]=fe[ze*4+1],ue[Pe]=fe[ze*4+2],ze++}Yn($,Ft,Pt,At,Re,De,ue)}we+=Ee,ye=pe;const to=Math.round(we/X*100);M(80+Math.round(to*.12)),m("VDB Color",to),w("Color pass: "+we.toLocaleString()+"/"+X.toLocaleString()+" voxels"),await C()}if(e.deleteProgram(ne),e.deleteVertexArray(ee),qn($),D=$,u.memAlloc){let ge=0;$.n4map.forEach(Ee=>{ge+=Ee.leafMap.size});const pe=Math.round((ge*6.2+$.n4map.size*60)/1024);u.memAlloc("vdbColor","VDB Color",pe,"#e6a")}v("Color pass complete: Cd vec3s grid built","success")}m("VDB Color",100),await C()}M(92),m("VDB Optimize",0),w("Optimizing VDB tree...");const P=Xn(E);M(95),m("VDB Serialize",50),w("Serializing VDB..."),await C();let G=0;E.n4map.forEach(X=>{G+=X.leafMap.size});let H;if(D?H=ea(E,D,n,a,z):H=Kn(E,n,a,z),u.memFree&&(u.memFree("vdbDensity"),D&&u.memFree("vdbColor")),u.memAlloc){const X=Math.round(H.byteLength/1048576);u.memAlloc("vdbBlob","VDB File",X,"#5af")}return M(100),m("VDB Complete",100),{blob:new Blob([H.buffer.slice(H.byteOffset,H.byteOffset+H.byteLength)],{type:"application/octet-stream"}),voxelCount:j,leafCount:G,promoted:P,zRange:[I,F],skippedSlices:n-S}}async function sa(e,t,o,n,s,r,a,i,l,p,h){const{log:u,tick:f}=l,g=t.N,b=t.blockSize,y=t.blocksPerAxis,v=Math.min(g,2048),M=i[0]-a[0],m=t.blockCellCount+7>>3,w=yn({definition:o}),C=it(e,Ke,w,u);e.useProgram(C);const U=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...qe],z={};for(let k=0;k<U.length;k++)z[U[k]]=e.getUniformLocation(C,U[k]);const R=e.createTexture();e.bindTexture(e.TEXTURE_2D,R),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,v,v);const L=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,L),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,R,0),e.uniform1f(z.uPower,n),e.uniform1i(z.uIters,s),e.uniform1f(z.uInvRes,1/g),e.uniform3f(z.uBoundsMin,a[0],a[1],a[2]),e.uniform1f(z.uBoundsRange,M),st(e,z,r),rt(e,z,h),e.bindVertexArray(e.createVertexArray());const V=new Map;Jt(t,(k,E,j,A,T,B)=>{for(let S=0;S<b;S++){const O=B+S;if(O>=g)continue;let D=V.get(O);D||(D={entries:[],minX:A,minY:T,maxX:A+b,maxY:T+b},V.set(O,D)),D.entries.push({startX:A,startY:T}),A<D.minX&&(D.minX=A),T<D.minY&&(D.minY=T),A+b>D.maxX&&(D.maxX=A+b),T+b>D.maxY&&(D.maxY=T+b)}});const d=Array.from(V.keys()).sort((k,E)=>k-E);let c=0;for(let k=0;k<d.length;k++){const E=V.get(d[k]),j=Math.min(g,E.maxX)-Math.max(0,E.minX),A=Math.min(g,E.maxY)-Math.max(0,E.minY);j*A*4>c&&(c=j*A*4)}const I=new Float32Array(c),F=new Map;t.blocks.forEach((k,E)=>{F.set(E,new Uint8Array(m))});let _=0;for(let k=0;k<d.length;k++){const E=d[k],j=V.get(E);e.uniform1f(z.uZ,(E+.5)/g);const A=Math.max(0,j.minX),T=Math.max(0,j.minY),B=Math.min(g,j.maxX),S=Math.min(g,j.maxY),O=B-A,D=S-T;e.uniform2f(z.uTileOffset,A,T),e.viewport(0,0,O,D),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,O,D,e.RGBA,e.FLOAT,I);const P=j.entries;for(let G=0;G<P.length;G++){const H=P[G],X=H.startX/b|0,$=H.startY/b|0,N=E/b|0,Z=(N*y+$)*y+X,Q=F.get(Z);if(!Q)continue;const ne=E-N*b;for(let K=0;K<b;K++){const ee=H.startX+K;if(!(ee<A||ee>=B))for(let re=0;re<b;re++){const ie=H.startY+re;if(ie<T||ie>=S)continue;const le=((ie-T)*O+(ee-A))*4;if(I[le]>.5){const ve=(ne*b+re)*b+K;Q[ve>>3]|=1<<(ve&7),_++}}}}!(k&7)&&p&&(p(Math.round(k/d.length*100)),await f())}return e.deleteTexture(R),e.deleteFramebuffer(L),e.deleteProgram(C),{escapeMap:F,solidCount:_}}function ra(e,t,o,n,s,r,a,i,l,p){i||(i=6);const h=t.vertexCount,u=Math.ceil(Math.sqrt(h)),f=Math.ceil(h/u),g=new Float32Array(u*f*4);for(let R=0;R<h;R++)g[R*4]=t.positions[R*3],g[R*4+1]=t.positions[R*3+1],g[R*4+2]=t.positions[R*3+2],g[R*4+3]=1;const b=e.createTexture();e.bindTexture(e.TEXTURE_2D,b),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,u,f,0,e.RGBA,e.FLOAT,g),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const y=e.createTexture();e.bindTexture(e.TEXTURE_2D,y),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,u,f);const v=e.createTexture();e.bindTexture(e.TEXTURE_2D,v),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,u,f);const M=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,M),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,y,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,v,0),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]);const m=wn({definition:o,deType:"auto"}),w=it(e,Ke,m,l);e.useProgram(w),e.viewport(0,0,u,f),e.bindVertexArray(e.createVertexArray()),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,b),e.uniform1i(e.getUniformLocation(w,"uPositions"),0),e.uniform1f(e.getUniformLocation(w,"uPower"),s),e.uniform1i(e.getUniformLocation(w,"uIters"),r),e.uniform1f(e.getUniformLocation(w,"uVoxelSize"),a),e.uniform1i(e.getUniformLocation(w,"uNewtonSteps"),i);const C=Kt(e,w);st(e,C,n),rt(e,C,p),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readBuffer(e.COLOR_ATTACHMENT0);const U=new Float32Array(u*f*4);e.readPixels(0,0,u,f,e.RGBA,e.FLOAT,U),e.readBuffer(e.COLOR_ATTACHMENT1);const z=new Float32Array(u*f*4);e.readPixels(0,0,u,f,e.RGBA,e.FLOAT,z);for(let R=0;R<h;R++)t.positions[R*3]=U[R*4],t.positions[R*3+1]=U[R*4+1],t.positions[R*3+2]=U[R*4+2],t.normals[R*3]=z[R*4],t.normals[R*3+1]=z[R*4+1],t.normals[R*3+2]=z[R*4+2];return e.deleteTexture(b),e.deleteTexture(y),e.deleteTexture(v),e.deleteFramebuffer(M),e.deleteProgram(w),t}async function ia(e,t,o,n,s,r,a,i,l,p){const{log:h,setProgress:u,setPhase:f,setStatus:g,tick:b}=l;(!a||a<1)&&(a=1),i||(i=0);const y=t.vertexCount,v=Math.ceil(Math.sqrt(y)),M=Math.ceil(y/v);h("Color texture: "+v+"x"+M+" ("+(v*M*16/(1024*1024)).toFixed(0)+" MB position data)"+(a>1?" | "+a+" samples, radius="+i.toFixed(5):""),"mem");let m=new Float32Array(v*M*4);for(let I=0;I<y;I++)m[I*4]=t.positions[I*3],m[I*4+1]=t.positions[I*3+1],m[I*4+2]=t.positions[I*3+2],m[I*4+3]=1;const w=_o({definition:o}),C=it(e,Ke,w,h);e.useProgram(C);const U=e.createTexture();e.bindTexture(e.TEXTURE_2D,U),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,v,M,0,e.RGBA,e.FLOAT,m),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),m=null;const z=a>1,R=e.createTexture();e.bindTexture(e.TEXTURE_2D,R),e.texStorage2D(e.TEXTURE_2D,1,z?e.RGBA32F:e.RGBA8,v,M);const L=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,L),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,R,0),e.viewport(0,0,v,M),e.bindVertexArray(e.createVertexArray());const V=Kt(e,C),d=e.getUniformLocation(C,"uJitterOffset");if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,U),e.uniform1i(e.getUniformLocation(C,"uPositions"),0),e.uniform1f(e.getUniformLocation(C,"uPower"),s),e.uniform1i(e.getUniformLocation(C,"uIters"),r),e.uniform1i(e.getUniformLocation(C,"uWidth"),v),st(e,V,n),rt(e,V,p),a<=1)e.uniform3f(d,0,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4);else{e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);const I=Math.PI*(3-Math.sqrt(5));for(let F=0;F<a;F++){const _=Math.acos(1-2*(F+.5)/a),k=I*F,E=i*Math.cbrt((F+.5)/a),j=E*Math.sin(_)*Math.cos(k),A=E*Math.sin(_)*Math.sin(k),T=E*Math.cos(_);if(e.uniform3f(d,j,A,T),e.drawArrays(e.TRIANGLE_STRIP,0,4),!(F&3)||F===a-1){const B=Math.round((F+1)/a*100);u(80+Math.round((F+1)/a*10)),f("Phase 5: Vertex Coloring",B),g("Color sample "+(F+1)+"/"+a),await b()}}e.disable(e.BLEND)}const c=new Uint8Array(y*4);if(z){const I=new Float32Array(v*M*4);e.readPixels(0,0,v,M,e.RGBA,e.FLOAT,I);const F=1/a;for(let _=0;_<y;_++)c[_*4]=Math.min(255,Math.round(I[_*4]*F*255)),c[_*4+1]=Math.min(255,Math.round(I[_*4+1]*F*255)),c[_*4+2]=Math.min(255,Math.round(I[_*4+2]*F*255)),c[_*4+3]=255}else{const I=new Uint8Array(v*M*4);e.readPixels(0,0,v,M,e.RGBA,e.UNSIGNED_BYTE,I);for(let F=0;F<y;F++)c[F*4]=I[F*4],c[F*4+1]=I[F*4+1],c[F*4+2]=I[F*4+2],c[F*4+3]=255}return e.deleteTexture(U),e.deleteTexture(R),e.deleteFramebuffer(L),e.deleteProgram(C),c}async function la(e,t,o,n,s,r,a){var b;const i=vt(),l=64,p=6,h=[-p/2,-p/2,-p/2],u=p,f=u/l,g=a??0;try{const y=Qe(i,l,e,1,()=>{},s,r);lt(i,y,l,n,o,h,u,t,s,g),i.viewport(0,0,l,l);const v=new Float32Array(l*l*4);let M=1/0,m=1/0,w=1/0,C=-1/0,U=-1/0,z=-1/0,R=!1;for(let F=0;F<l;F++){i.uniform1f(y.loc.uZ,(F+.5)/l),i.uniform2f(y.loc.uTileOffset,0,0),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.readPixels(0,0,l,l,i.RGBA,i.FLOAT,v);const _=h[2]+(F+.5)*f;for(let k=0;k<l;k++)for(let E=0;E<l;E++)if(v[(k*l+E)*4]<f*2){const A=h[0]+(E+.5)*f,T=h[1]+(k+.5)*f;A<M&&(M=A),A>C&&(C=A),T<m&&(m=T),T>U&&(U=T),_<w&&(w=_),_>z&&(z=_),R=!0}}if(i.deleteTexture(y.tex),i.deleteFramebuffer(y.fbo),i.deleteProgram(y.prog),!R)return null;const L=.15,V=(C-M)*(1+L),d=(U-m)*(1+L),c=(z-w)*(1+L),I=Math.max(V,d,c,.5);return{center:[(M+C)/2,(m+U)/2,(w+z)/2],size:[I,I,I]}}finally{(b=i.getExtension("WEBGL_lose_context"))==null||b.loseContext()}}function ca(){const e=W(u=>u.bboxCenter),t=W(u=>u.bboxSize),o=W(u=>u.setBboxCenter),n=W(u=>u.setBboxSize),s=W(u=>u.resetBounds),[r,a]=de.useState(!1),i=u=>{o([u.x,u.y,u.z??0])},l=de.useMemo(()=>new $e(t[0],t[1],t[2]),[t[0],t[1],t[2]]),p=de.useCallback(u=>{n([u.x,u.y,u.z])},[n]),h=async()=>{const u=W.getState(),f=u.loadedDefinition||_e.get(u.selectedFormulaId);if(f){a(!0);try{const g=Gt(u),b=u.qualitySettings,y={estimator:b.estimator,distanceMetric:b.distanceMetric},v=await la(f,u.formulaParams,u.iters,u.formulaParams.paramA||8,g,y,b.surfaceThreshold);v&&(o(v.center),n(v.size))}catch(g){console.error("Auto-fit failed:",g)}finally{a(!1)}}};return x.jsxs("div",{className:"flex flex-col gap-px mt-1",children:[x.jsx(Nt,{label:"Center",value:{x:e[0],y:e[1],z:e[2]},onChange:i,axisConfig:{min:-100,max:100,step:.1},showDualAxisPads:!1}),x.jsx(tn,{label:"Size",value:l,onChange:p,min:.1,max:100,step:.1,showDualAxisPads:!1,linkable:!0}),x.jsxs("div",{className:"flex items-center gap-2 mt-1 px-0.5",children:[x.jsx("button",{onClick:s,className:"text-[10px] px-2 py-0.5 bg-line/10 text-fg-tertiary border border-line/10 rounded-sm hover:bg-line/15 cursor-pointer",children:"Reset"}),x.jsx("button",{onClick:h,disabled:r,className:"text-[10px] px-2 py-0.5 bg-ok/40 text-ok border border-ok/30 rounded-sm hover:bg-ok/40 cursor-pointer disabled:opacity-50 disabled:cursor-default",children:r?"Fitting...":"Auto-fit"}),x.jsxs("span",{className:"text-[10px] text-fg-faint",children:[t[0].toFixed(1)," × ",t[1].toFixed(1)," × ",t[2].toFixed(1)]})]})]})}const go={info:"text-fg-muted",phase:"text-emerald-400 font-bold",data:"text-sky-400",warn:"text-amber-400",error:"text-red-400 font-bold",success:"text-emerald-400",mem:"text-pink-300"},ua=()=>{const e=W(m=>m.status),t=W(m=>m.progress),o=W(m=>m.phaseName),n=W(m=>m.phaseProgress),s=W(m=>m.memoryBlocks),r=W(m=>m.logEntries),a=W(m=>m.clearLog),i=W(m=>m.lastMesh),l=W(m=>m.lastTimings),p=W(m=>m.smoothingSkipped),h=W(m=>m.useNarrowBand),u=W(m=>m.resolution),f=W(m=>m.newton),g=W(m=>m.isRunning),b=de.useRef(null);de.useEffect(()=>{var m;(m=b.current)==null||m.scrollIntoView({behavior:"smooth"})},[r.length]);const y=s.reduce((m,w)=>m+(w.freed?0:w.mb),0),v=Math.max(1,...s.map(m=>m.mb)),M=()=>{const m=r.map(w=>`[${w.time}] ${w.msg}`).join(`
`);navigator.clipboard.writeText(m).catch(()=>{})};return x.jsxs("div",{className:"font-mono flex flex-col gap-2",children:[e&&x.jsx("div",{className:"text-[13px] text-warn font-bold",children:e}),x.jsx("div",{className:"h-1 bg-surface-header rounded overflow-hidden",children:x.jsx("div",{className:"h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,t))}%`}})}),o&&x.jsx("div",{className:"text-[11px] text-fg-dim",children:o}),x.jsx("div",{className:"h-[3px] bg-surface-header rounded overflow-hidden",children:x.jsx("div",{className:"h-full bg-gradient-to-r from-sky-700 to-sky-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,n))}%`}})}),i&&l&&!g&&x.jsxs("div",{className:"text-[11px] leading-relaxed bg-surface-section border border-line/10 rounded px-2 py-1.5",children:[x.jsxs("span",{className:"text-emerald-400",children:[u,"³ · ",i.vertexCount.toLocaleString()," vertices · ",i.faceCount.toLocaleString()," faces"]})," · ",x.jsxs("span",{className:"text-sky-400",children:[Math.round((i.positions.byteLength+i.normals.byteLength+i.indices.byteLength)/(1024*1024))," MB mesh"]}),f&&x.jsx("span",{className:"text-fg-muted",children:" · Newton projected"}),p&&x.jsx("span",{className:"text-warn",children:" · smoothing skipped (>5M verts)"}),x.jsx("br",{}),x.jsxs("span",{className:"text-fg-dim",children:[h?`Coarse: ${(l.coarse/1e3).toFixed(1)}s · Fine: ${(l.fine/1e3).toFixed(1)}s`:`SDF: ${(l.sdf/1e3).toFixed(1)}s`," · ","DC: ",(l.dc/1e3).toFixed(1),"s",l.newton>100&&` · Newton: ${(l.newton/1e3).toFixed(1)}s`," · ","Post: ",(l.post/1e3).toFixed(1),"s"," · ","Color: ",(l.color/1e3).toFixed(1),"s"," · ","Total: ",(l.total/1e3).toFixed(1),"s"]})]}),s.length>0&&x.jsxs("div",{children:[x.jsx("div",{className:"flex gap-px h-[18px] rounded overflow-hidden",children:s.map(m=>x.jsx("div",{title:`${m.label}: ${m.mb} MB${m.freed?" (freed)":""}`,className:"flex items-center justify-center text-[9px] text-black font-bold overflow-hidden whitespace-nowrap rounded-sm transition-opacity",style:{flex:Math.max(m.mb/v,.08),background:m.color,opacity:m.freed?.25:1},children:m.label},m.id))}),x.jsxs("div",{className:"text-[10px] text-fg-faint mt-0.5",children:["Memory: ",y," MB active"]})]}),r.length>0&&x.jsxs("div",{children:[x.jsxs("div",{className:"max-h-[200px] overflow-y-auto bg-surface border border-line/10 rounded p-1.5 text-[11px] leading-relaxed",children:[r.map((m,w)=>x.jsxs("div",{className:go[m.type]||go.info,children:[x.jsx("span",{className:"text-fg-faint",children:m.time})," ",m.msg]},w)),x.jsx("div",{ref:b})]}),x.jsxs("div",{className:"flex gap-1.5 mt-1",children:[x.jsx("button",{onClick:M,className:"text-[10px] px-2 py-0.5 bg-line/10 text-fg-muted border border-line/10 rounded-sm hover:bg-line/15 cursor-pointer",children:"Copy"}),x.jsx("button",{onClick:a,className:"text-[10px] px-2 py-0.5 bg-line/10 text-fg-muted border border-line/10 rounded-sm hover:bg-line/15 cursor-pointer",children:"Clear"})]})]})]})};function fa(e,t,o){let n=0;for(let s=0;s<e.length;s++)e[s]<-o&&(e[s]=o,n++);return n}function da(e,t){let o=0;return e.blocks.forEach(n=>{for(let s=0;s<n.length;s++)n[s]<-t&&(n[s]=t,o++)}),o}function xo(e,t,o,n,s){const r=new Float32Array(e.length);for(let i=0;i<o;i++)for(let l=0;l<o;l++){const p=i*o*o+l*o;for(let h=0;h<o;h++){let u=e[p+h];for(let f=-n;f<=n;f++){const g=h+f;g>=0&&g<o&&(u=s(u,e[p+g]))}r[p+h]=u}}const a=new Float32Array(e.length);for(let i=0;i<o;i++)for(let l=0;l<o;l++)for(let p=0;p<o;p++){const h=i*o*o+p*o+l;let u=r[h];for(let f=-n;f<=n;f++){const g=p+f;g>=0&&g<o&&(u=s(u,r[i*o*o+g*o+l]))}a[h]=u}for(let i=0;i<o;i++)for(let l=0;l<o;l++)for(let p=0;p<o;p++){const h=p*o*o+i*o+l;let u=a[h];for(let f=-n;f<=n;f++){const g=p+f;g>=0&&g<o&&(u=s(u,a[g*o*o+i*o+l]))}t[h]=u}}async function ma(e,t,o,n){const s=n||(()=>{});if(o<=0)return;const r=Math.round(o),a=t*t*t,i=new Float32Array(a);s(0),xo(e,i,t,r,Math.min),s(25),await new Promise(l=>{setTimeout(l,0)}),xo(i,e,t,r,Math.max),s(50)}async function pa(e,t,o){const n=o||(()=>{});if(t<=0)return;const s=Math.round(t);e.N;const r=e.blockSize;for(let a=0;a<2;a++){const i=a===0?Math.min:Math.max,l=new Map;e.blocks.forEach((p,h)=>{const u=new Float32Array(p.length),f=e.blocksPerAxis,g=h%f,b=(h/f|0)%f,y=h/(f*f)|0,v=g*r,M=b*r,m=y*r;for(let w=0;w<r;w++)for(let C=0;C<r;C++)for(let U=0;U<r;U++){let z=p[(w*r+C)*r+U];for(let R=-s;R<=s;R++)for(let L=-s;L<=s;L++)for(let V=-s;V<=s;V++){const d=v+U+V,c=M+C+L,I=m+w+R;z=i(z,e.get(d,c,I))}u[(w*r+C)*r+U]=z}l.set(h,u)}),l.forEach((p,h)=>{e.blocks.set(h,p)}),n(a===0?50:100),await new Promise(p=>{setTimeout(p,0)})}}async function ha(e,t,o,n){const s=o||(()=>{}),r=n||(()=>{}),a=t*t*t,i=a+7>>3,l=new Uint8Array(i),p=(L,V,d)=>(d*t+V)*t+L,h=L=>(l[L>>3]&1<<(L&7))!==0,u=L=>{l[L>>3]|=1<<(L&7)};let f=Math.min(a,4*1024*1024),g=new Int32Array(f),b=0,y=0,v=0;const M=L=>{if(v>=f){const V=f*2,d=new Int32Array(V);for(let c=0;c<v;c++)d[c]=g[(b+c)%f];g=d,b=0,y=v,f=V}g[y]=L,y=(y+1)%f,v++},m=()=>{const L=g[b];return b=(b+1)%f,v--,L};for(let L=0;L<t;L++)for(let V=0;V<t;V++)for(let d=0;d<t;d++)if(d===0||d===t-1||V===0||V===t-1||L===0||L===t-1){const c=p(d,V,L);e[c]>=0&&!h(c)&&(u(c),M(c))}s(5);let w=0;const C=[-1,1,0,0,0,0],U=[0,0,-1,1,0,0],z=[0,0,0,0,-1,1];for(;v>0;){const L=m(),V=L%t,d=(L/t|0)%t,c=L/(t*t)|0;for(let I=0;I<6;I++){const F=V+C[I],_=d+U[I],k=c+z[I];if(F<0||_<0||k<0||F>=t||_>=t||k>=t)continue;const E=p(F,_,k);h(E)||e[E]>=0&&(u(E),M(E))}w++,w&1048575||(s(5+Math.round(85*w/a)),await new Promise(I=>{setTimeout(I,0)}),r())}let R=0;for(let L=0;L<a;L++)e[L]>=0&&!h(L)&&(e[L]=-Math.abs(e[L])-.001,R++);return s(100),R}async function va(e,t,o,n){const s=o||(()=>{}),r=n||(()=>{}),a=e.N,i=e.blockSize,l=e.blocksPerAxis,p=e.blockCellCount+7>>3;function h(B,S,O,D){if(S<0||O<0||D<0||S>=a||O>=a||D>=a)return!1;const P=S/i|0,G=O/i|0,H=D/i|0,X=(H*l+G)*l+P,$=B.get(X);if(!$)return!1;const N=S-P*i,Z=O-G*i,ne=((D-H*i)*i+Z)*i+N;return($[ne>>3]&1<<(ne&7))!==0}function u(B,S,O,D){const P=S/i|0,G=O/i|0,H=D/i|0,X=(H*l+G)*l+P,$=B.get(X);if(!$)return;const N=S-P*i,Z=O-G*i,ne=((D-H*i)*i+Z)*i+N;$[ne>>3]|=1<<(ne&7)}let f=2*1024*1024,g=new Int32Array(f),b=new Uint8Array(f),y=0,v=0;function M(){const B=v-y,S=f*2,O=new Int32Array(S),D=new Uint8Array(S);for(let P=0;P<B;P++)O[P]=g[(y+P)%f],D[P]=b[(y+P)%f];g=O,b=D,y=0,v=B,f=S}function m(B,S){v-y>=f-1&&M(),g[v%f]=B,b[v%f]=S,v++}function w(){const B=g[y%f],S=b[y%f];return y++,{coord:B,dist:S}}let C=2*1024*1024,U=new Int32Array(C),z=0,R=0;function L(){const B=R-z,S=C*2,O=new Int32Array(S);for(let D=0;D<B;D++)O[D]=U[(z+D)%C];U=O,z=0,R=B,C=S}function V(B){R-z>=C-1&&L(),U[R++%C]=B}function d(){return U[z++%C]}const c=new Map;e.blocks.forEach((B,S)=>{const O=new Uint8Array(p);for(let D=0;D<B.length;D++)B[D]<0&&(O[D>>3]|=1<<(D&7));c.set(S,O)});let I=0;e.blocks.forEach((B,S)=>{const O=S%l,D=(S/l|0)%l,P=S/(l*l)|0,G=O*i,H=D*i,X=P*i;for(let $=0;$<i;$++)for(let N=0;N<i;N++)for(let Z=0;Z<i;Z++){const Q=($*i+N)*i+Z;if(B[Q]<0)continue;const ne=G+Z,K=H+N,ee=X+$;let re=!1;for(let ie=0;ie<6&&!re;ie++){const le=ne+(ie===0?-1:ie===1?1:0),ve=K+(ie===2?-1:ie===3?1:0),Y=ee+(ie===4?-1:ie===5?1:0);e.get(le,ve,Y)<0&&(re=!0)}re&&(u(c,ne,K,ee),m((ee*a+K)*a+ne,1),I++)}}),console.log("[CavityFill] Dilate by "+t+": "+I+" surface seeds"),s(5);let F=0,_=0;for(;y<v;){const B=w(),S=B.coord,O=B.dist,D=S%a,P=(S/a|0)%a,G=S/(a*a)|0;for(let H=0;H<6;H++){const X=D+(H===0?-1:H===1?1:0),$=P+(H===2?-1:H===3?1:0),N=G+(H===4?-1:H===5?1:0);X<0||$<0||N<0||X>=a||$>=a||N>=a||h(c,X,$,N)||(u(c,X,$,N),F++,O+1<t&&m((N*a+$)*a+X,O+1))}++_&262143||(s(5+Math.round(20*Math.min(1,F/(I*t+1)))),await new Promise(H=>{setTimeout(H,0)}),r())}console.log("[CavityFill] Dilate done: "+F+" cells expanded"),s(30);const k=new Map;e.blocks.forEach((B,S)=>{k.set(S,new Uint8Array(p))}),e.blocks.forEach((B,S)=>{const O=c.get(S),D=S%l,P=(S/l|0)%l,G=S/(l*l)|0,H=D*i,X=P*i,$=G*i;for(let N=0;N<i;N++)for(let Z=0;Z<i;Z++)for(let Q=0;Q<i;Q++){const ne=(N*i+Z)*i+Q;if(O[ne>>3]&1<<(ne&7))continue;const K=H+Q,ee=X+Z,re=$+N;let ie=!1;if(K===0||K===a-1||ee===0||ee===a-1||re===0||re===a-1)ie=!0;else if(Q===0||Q===i-1||Z===0||Z===i-1||N===0||N===i-1)for(let le=0;le<6&&!ie;le++){const ve=K+(le===0?-1:le===1?1:0),Y=ee+(le===2?-1:le===3?1:0),q=re+(le===4?-1:le===5?1:0),te=ve/i|0,ce=Y/i|0,se=q/i|0;e.hasBlock(te,ce,se)||(ie=!0)}if(ie){const le=k.get(S);le[ne>>3]|=1<<(ne&7),V((re*a+ee)*a+K)}}}),console.log("[CavityFill] Flood fill: "+R+" boundary seeds"),s(40);let j=0,A=0;for(;z<R;){const B=d(),S=B%a,O=(B/a|0)%a,D=B/(a*a)|0;for(let P=0;P<6;P++){const G=S+(P===0?-1:P===1?1:0),H=O+(P===2?-1:P===3?1:0),X=D+(P===4?-1:P===5?1:0);if(G<0||H<0||X<0||G>=a||H>=a||X>=a)continue;const $=G/i|0,N=H/i|0,Z=X/i|0,Q=(Z*l+N)*l+$,ne=G-$*i,K=H-N*i,re=((X-Z*i)*i+K)*i+ne,ie=k.get(Q);ie&&(ie[re>>3]&1<<(re&7)||h(c,G,H,X)||(ie[re>>3]|=1<<(re&7),V((X*a+H)*a+G),j++))}++A&262143||(s(40+Math.round(40*j/(j+(R-z)+1))),await new Promise(P=>{setTimeout(P,0)}),r())}console.log("[CavityFill] Flood done: "+j+" cells reached"),s(85);let T=0;return e.blocks.forEach((B,S)=>{const O=k.get(S);for(let D=0;D<B.length;D++)B[D]>=0&&!(O[D>>3]&1<<(D&7))&&(B[D]=-Math.abs(B[D])-.001,T++)}),s(100),console.log("[CavityFill] Filled: "+T+" cavity cells"),{filled:T,dilated:F,seeds:I}}function ga(e,t){const o=new Array(t);for(let s=0;s<t;s++)o[s]=new Set;for(let s=0,r=e.length;s<r;s+=3){const a=e[s],i=e[s+1],l=e[s+2];o[a].add(i),o[a].add(l),o[i].add(a),o[i].add(l),o[l].add(a),o[l].add(i)}const n=new Array(t);for(let s=0;s<t;s++){const r=o[s],a=new Uint32Array(r.size);let i=0;for(const l of r)a[i++]=l;n[s]=a}return n}function bo(e,t,o,n){const s=t.length;n.set(e);for(let r=0;r<s;r++){const a=t[r],i=a.length;if(i===0)continue;const l=r*3,p=n[l],h=n[l+1],u=n[l+2];let f=0,g=0,b=0;for(let v=0;v<i;v++){const M=a[v]*3;f+=n[M]-p,g+=n[M+1]-h,b+=n[M+2]-u}const y=o/i;e[l]=p+f*y,e[l+1]=h+g*y,e[l+2]=u+b*y}}function xa(e,t=.5,o=-.53,n=5){const s=ga(e.indices,e.vertexCount),r=new Float32Array(e.positions.length);for(let a=0;a<n;a++)bo(e.positions,s,t,r),bo(e.positions,s,o,r);return e}function ba(e,t=1e-6){const o=e.positions,n=e.normals,s=e.indices,r=e.vertexCount,i=1/(t>0?t:1e-6),l=new Map,p=new Int32Array(r);p.fill(-1);const h=[],u=[];let f=0;function g(y,v,M){return y+","+v+","+M}for(let y=0;y<r;y++){const v=y*3,M=o[v],m=o[v+1],w=o[v+2],C=Math.floor(M*i),U=Math.floor(m*i),z=Math.floor(w*i);let R=!1;for(let d=-1;d<=1&&!R;d++)for(let c=-1;c<=1&&!R;c++)for(let I=-1;I<=1&&!R;I++){const F=g(C+d,U+c,z+I),_=l.get(F);if(_!==void 0)for(let k=0;k<_.length;k++){const E=_[k],j=E*3,A=o[j]-M,T=o[j+1]-m,B=o[j+2]-w;if(A*A+T*T+B*B<=t*t){p[y]=p[E],R=!0;break}}}R||(p[y]=f,h.push(M,m,w),u.push(n[v],n[v+1],n[v+2]),f++);const L=g(C,U,z),V=l.get(L);V===void 0?l.set(L,[y]):V.push(y)}const b=new Uint32Array(s.length);for(let y=0,v=s.length;y<v;y++)b[y]=p[s[y]];return{positions:new Float32Array(h),normals:new Float32Array(u),indices:b,vertexCount:f,faceCount:e.faceCount}}function ya(e){const t=e.positions,o=e.indices,n=e.faceCount,s=[];for(let r=0;r<n;r++){const a=r*3,i=o[a]*3,l=o[a+1]*3,p=o[a+2]*3,h=t[l]-t[i],u=t[l+1]-t[i+1],f=t[l+2]-t[i+2],g=t[p]-t[i],b=t[p+1]-t[i+1],y=t[p+2]-t[i+2],v=u*y-f*b,M=f*g-h*y,m=h*b-u*g;v*v+M*M+m*m>=1e-20&&s.push(o[a],o[a+1],o[a+2])}return{positions:e.positions,normals:e.normals,indices:new Uint32Array(s),vertexCount:e.vertexCount,faceCount:s.length/3}}function wa(e){const t=e.positions,o=e.indices,n=e.normals,s=e.vertexCount,r=e.faceCount;for(let a=0;a<s*3;a++)n[a]=0;for(let a=0;a<r;a++){const i=a*3,l=o[i],p=o[i+1],h=o[i+2],u=l*3,f=p*3,g=h*3,b=t[f]-t[u],y=t[f+1]-t[u+1],v=t[f+2]-t[u+2],M=t[g]-t[u],m=t[g+1]-t[u+1],w=t[g+2]-t[u+2],C=y*w-v*m,U=v*M-b*w,z=b*m-y*M;n[u]+=C,n[u+1]+=U,n[u+2]+=z,n[f]+=C,n[f+1]+=U,n[f+2]+=z,n[g]+=C,n[g+1]+=U,n[g+2]+=z}for(let a=0;a<s;a++){const i=a*3,l=n[i],p=n[i+1],h=n[i+2],u=Math.sqrt(l*l+p*p+h*h);if(u>1e-12){const f=1/u;n[i]*=f,n[i+1]*=f,n[i+2]*=f}}return e}function Sa(e){const t=e.positions,o=e.indices,n=e.vertexCount,s=e.faceCount;let r=0,a=0,i=0;for(let p=0;p<n;p++){const h=p*3;r+=t[h],a+=t[h+1],i+=t[h+2]}const l=1/n;r*=l,a*=l,i*=l;for(let p=0;p<s;p++){const h=p*3,u=o[h],f=o[h+1],g=o[h+2],b=u*3,y=f*3,v=g*3,M=(t[b]+t[y]+t[v])/3,m=(t[b+1]+t[y+1]+t[v+1])/3,w=(t[b+2]+t[y+2]+t[v+2])/3,C=t[y]-t[b],U=t[y+1]-t[b+1],z=t[y+2]-t[b+2],R=t[v]-t[b],L=t[v+1]-t[b+1],V=t[v+2]-t[b+2],d=U*V-z*L,c=z*R-C*V,I=C*L-U*R;if(d*(M-r)+c*(m-a)+I*(w-i)<0){const F=o[h+1];o[h+1]=o[h+2],o[h+2]=F}}return e}function Ca(e,t){const o=t??{},n=o.smoothing??!0,s=o.smoothIterations??5,r=o.lambda??.5,a=o.mu??-(r+.03);return o.mergeVertices&&(e=ba(e,o.mergeEpsilon??1e-6)),e.faceCount<5e6&&(e=ya(e)),n&&s>0&&(e.vertexCount>5e6?console.warn("Skipping smoothing: "+e.vertexCount.toLocaleString()+" vertices too large (>5M limit)"):e=xa(e,r,a,s)),o.consistentWinding&&(e=Sa(e)),e=wa(e),e}class Ma{constructor(t){oe(this,"_buf");oe(this,"_view");oe(this,"_u8");oe(this,"_pos");t||(t=1024*1024),this._buf=new ArrayBuffer(t),this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf),this._pos=0}get pos(){return this._pos}set pos(t){this._pos=t}_grow(t){const o=this._pos+t;if(o<=this._buf.byteLength)return;let n=this._buf.byteLength;for(;n<o;)n*=2;const s=new ArrayBuffer(n);new Uint8Array(s).set(this._u8),this._buf=s,this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf)}u8(t){this._grow(1),this._view.setUint8(this._pos,t),this._pos+=1}u16(t){this._grow(2),this._view.setUint16(this._pos,t,!0),this._pos+=2}u32(t){this._grow(4),this._view.setUint32(this._pos,t,!0),this._pos+=4}i32(t){this._grow(4),this._view.setInt32(this._pos,t,!0),this._pos+=4}f32(t){this._grow(4),this._view.setFloat32(this._pos,t,!0),this._pos+=4}raw(t){const o=t.length;this._grow(o),this._u8.set(t,this._pos),this._pos+=o}str(t){const o=t.length;this._grow(o);for(let n=0;n<o;n++)this._u8[this._pos++]=t.charCodeAt(n)&127}strNull(t){this.str(t),this.u8(0)}pad(t){this.padWith(t,0)}padWith(t,o){const n=this._pos%t;if(n===0)return;const s=t-n;this._grow(s);for(let r=0;r<s;r++)this._u8[this._pos++]=o}bulkF32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU8(t){this.raw(t)}result(){return this._buf.slice(0,this._pos)}}function Ea(e){const t=e.positions,o=e.normals,n=e.colors,s=e.indices,r=e.vertexCount,a=e.faceCount,i=n!=null&&n.length>0,l=[1/0,1/0,1/0],p=[-1/0,-1/0,-1/0];for(let S=0;S<r;S++){const O=t[S*3],D=t[S*3+1],P=t[S*3+2];O<l[0]&&(l[0]=O),D<l[1]&&(l[1]=D),P<l[2]&&(l[2]=P),O>p[0]&&(p[0]=O),D>p[1]&&(p[1]=D),P>p[2]&&(p[2]=P)}const h=r*12,u=r*12,f=i?r*16:0,g=a*3*4,b=0,y=h,v=h+u,M=h+u+f,m=h+u+f+g,w=(4-m%4)%4,C=m+w,U=[],z=[],R={};let L=0,V=0;U.push({buffer:0,byteOffset:b,byteLength:h,target:34962}),z.push({bufferView:L,byteOffset:0,componentType:5126,count:r,type:"VEC3",min:[l[0],l[1],l[2]],max:[p[0],p[1],p[2]]}),R.POSITION=V,L++,V++,U.push({buffer:0,byteOffset:y,byteLength:u,target:34962}),z.push({bufferView:L,byteOffset:0,componentType:5126,count:r,type:"VEC3"}),R.NORMAL=V,L++,V++,i&&(U.push({buffer:0,byteOffset:v,byteLength:f,target:34962}),z.push({bufferView:L,byteOffset:0,componentType:5126,count:r,type:"VEC4"}),R.COLOR_0=V,L++,V++);const d=V;U.push({buffer:0,byteOffset:M,byteLength:g,target:34963}),z.push({bufferView:L,byteOffset:0,componentType:5125,count:a*3,type:"SCALAR"});const c={attributes:R,indices:d,mode:4},I={asset:{version:"2.0",generator:"GMT Fractal Explorer"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[c]}],accessors:z,bufferViews:U,buffers:[{byteLength:m}]};i&&(I.materials=[{name:"FractalVertexColor",pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}}],c.material=0);const F=JSON.stringify(I),_=(4-F.length%4)%4,k=F.length+_,E=20+k+8+C,j=20+k+8,A=new Ma(j+16);A.u32(1179937895),A.u32(2),A.u32(E),A.u32(k),A.u32(1313821514),A.str(F);for(let S=0;S<_;S++)A.u8(32);A.u32(C),A.u32(5130562);const T=S=>S.buffer.slice(S.byteOffset,S.byteOffset+S.byteLength),B=[A._buf.slice(0,A._pos),T(t),T(o)];if(i){const S=new Float32Array(r*4);for(let O=0;O<r*4;O++)S[O]=n[O]/255;B.push(S.buffer)}return B.push(T(s)),w>0&&B.push(new ArrayBuffer(w)),new Blob(B,{type:"application/octet-stream"})}async function Ta(e,t){const o=t||function(){},n=e.positions,s=e.indices,r=e.faceCount,a=new ArrayBuffer(84),i=new DataView(a),l="Fractal Mesh Export - GMT Fractal Explorer";for(let f=0;f<l.length;f++)i.setUint8(f,l.charCodeAt(f)&127);for(let f=l.length;f<80;f++)i.setUint8(f,32);i.setUint32(80,r,!0);const p=[new Uint8Array(a)],h=65536,u=Math.ceil(r/h);for(let f=0;f<r;f+=h){const g=Math.min(f+h,r),b=g-f,y=new ArrayBuffer(b*50),v=new DataView(y);let M=0;for(let w=f;w<g;w++){const C=s[w*3],U=s[w*3+1],z=s[w*3+2],R=n[C*3],L=n[C*3+1],V=n[C*3+2],d=n[U*3],c=n[U*3+1],I=n[U*3+2],F=n[z*3],_=n[z*3+1],k=n[z*3+2],E=d-R,j=c-L,A=I-V,T=F-R,B=_-L,S=k-V;let O=j*S-A*B,D=A*T-E*S,P=E*B-j*T;const G=Math.sqrt(O*O+D*D+P*P);G>1e-12&&(O/=G,D/=G,P/=G),v.setFloat32(M,O,!0),v.setFloat32(M+4,D,!0),v.setFloat32(M+8,P,!0),v.setFloat32(M+12,R,!0),v.setFloat32(M+16,L,!0),v.setFloat32(M+20,V,!0),v.setFloat32(M+24,d,!0),v.setFloat32(M+28,c,!0),v.setFloat32(M+32,I,!0),v.setFloat32(M+36,F,!0),v.setFloat32(M+40,_,!0),v.setFloat32(M+44,k,!0),v.setUint16(M+48,0,!0),M+=50}p.push(new Uint8Array(y));const m=f/h|0;m&7||(o(Math.round(100*(m+1)/u)),await new Promise(function(w){setTimeout(w,0)}))}return o(100),new Blob(p,{type:"application/octet-stream"})}function yo(e,t){if(t==="stl")return 84+e.faceCount*50;{const n=e.colors!=null&&e.colors.length>0?e.vertexCount*16:0;return 1024+e.vertexCount*24+n+e.faceCount*12}}function Da(e,t){const o=document.createElement("a");o.href=URL.createObjectURL(e),o.download=t,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(o.href)}function Ie(e){return e.tick?e.tick():new Promise(t=>setTimeout(t,0))}async function Ra(e,t){const{N:o,iters:n,smoothPasses:s,useNewton:r,newtonSteps:a,smoothLambda:i,definition:l,formulaParams:p,power:h,deType:u,deSamples:f,zSubSlices:g,minFeatureSel:b,closingRadius:y,colorSamples:v,colorJitterMul:M,cavityFillMode:m,cavityFillLevel:w,gridMin:C,gridMax:U,boundsRange:z,weave:R,estimator:L,distanceMetric:V}=e;let d=e.surfaceThreshold??0;const I=(u==="auto"?Wt(l):u)==="ifs"&&L!==void 0&&L>=1.5&&L<2.5?1:L,F=I!==void 0||V!==void 0?{estimator:I??0,distanceMetric:V??0}:void 0,_={log:t.log,setStatus:t.setStatus,setProgress:t.setProgress,setPhase:t.setPhase,tick:t.tick,onSlicePreview:t.onSlicePreview},k=o>256,E=z/o,j=performance.now();let A=null,T=null,B,S,O=0,D=0,P=0,G=0,H=0,X=0,$=null,N=null,Z=!1,Q=!1;const ne=l.name||l.id||"unknown";t.log("=== Generate: "+ne+" ===","phase"),t.log("Resolution: "+o+"³ | Iterations: "+n+" | DE: "+u+" | SS: "+f+"³="+f*f*f+(g>1?" | Z-SS: "+g:"")+" | Newton: "+(r?a+" steps":"off")+" | Smooth: "+s+"×λ"+i+(v>1?" | Color-SS: "+v+"×r"+M:"")+" | MinFeat: "+b+" | CavityFill: "+(m==="escape"?"escape-test":w+"x")+" | Closing: "+y,"data"),t.log("Params: "+JSON.stringify(p).substring(0,200),"data"),t.log("Bounds: min=["+C[0].toFixed(2)+","+C[1].toFixed(2)+","+C[2].toFixed(2)+"] max=["+U[0].toFixed(2)+","+U[1].toFixed(2)+","+U[2].toFixed(2)+"] range="+z.toFixed(2),"data");let K;if(u==="ifs")K=Math.ceil(Math.log2(z/E));else{const ee=Math.max(h,2);K=Math.ceil(Math.log(z/E)/Math.log(ee))}n>K+2&&t.log("Note: At "+o+"³ (voxel="+E.toFixed(5)+"), ~"+K+" iterations resolve detail at voxel scale. Using "+n+" adds "+(n-K)+" levels of sub-voxel interior detail. Min Feature filter will clamp this. Consider reducing iterations for faster export.","warn");try{try{if(t.log("[Phase 1] GPU SDF Sampling","phase"),t.setPhase("Phase 1: SDF Sampling",0),t.memAlloc("webgl","WebGL",8,t.MEM_COLORS.webgl),t.setStatus("Initializing WebGL2..."),await Ie(t),T=vt(),t.log("WebGL2 initialized (max texture: "+T.getParameter(T.MAX_TEXTURE_SIZE)+")","info"),k){t.log("Pass 1: Coarse SDF 128³ ("+(128*128*128*4/(1024*1024)).toFixed(1)+" MB)","info"),t.setStatus("Pass 1: Coarse SDF (128³)..."),await Ie(t);const q=Qe(T,Math.min(128,2048),l,f,t.log,R,F),te=Math.round(128*128*128*4/(1024*1024));t.memAlloc("coarseGrid","Coarse SDF",te,t.MEM_COLORS.coarseGrid);let ce=await vo(T,q,128,h,n,p,C,U,0,10,1,null,null,_,R,d);B=performance.now();let se=0,J=0,ae=1/0;for(let ue=0;ue<ce.length;ue++){const we=ce[ue];we>=0?se++:J++,we<ae&&(ae=we)}if(t.log("Coarse: "+se.toLocaleString()+" outside, "+J.toLocaleString()+" inside ("+((B-j)/1e3).toFixed(1)+"s)","data"),J===0&&ae<10&&d===0){const ue=z/128,we=ae+ue*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+ae.toFixed(6)+" → threshold="+we.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let ye=0;ye<ce.length;ye++)ce[ye]-=we;d=we,J=0;for(let ye=0;ye<ce.length;ye++)ce[ye]<0&&J++;t.log("After auto-threshold: "+J.toLocaleString()+" interior coarse cells","data")}else J===0&&t.log("WARNING: No interior voxels in coarse grid — surface may not be found","warn");t.setStatus("Building narrow band for "+o+"³..."),await Ie(t);const fe=On(ce,128,o,8,2);ce=null,t.memFree("coarseGrid"),$=fe.grid;const he=Math.pow(o/$.blockSize,3),be=($.allocatedCount/he*100).toFixed(1),Re=Math.round($.memoryMB());t.memAlloc("sparseGrid","Sparse SDF",Re,t.MEM_COLORS.sparseGrid),t.log("Narrow band: "+$.allocatedCount.toLocaleString()+" blocks ("+be+"% of "+he.toLocaleString()+"), "+Re+" MB","data"),t.log("Pass 2: Fine SDF "+o+"³ (narrow-band, "+$.memoryMB().toFixed(0)+" MB allocated)","info"),t.setStatus("Pass 2: Fine SDF ("+o+"³ narrow-band)..."),await Ie(t),T.deleteTexture(q.tex),T.deleteFramebuffer(q.fbo);const De=Qe(T,Math.min(o,2048),l,f,t.log,R,F);await na(T,De,$,h,n,p,C,U,10,25,_,R,d),O=performance.now(),S=O,t.log("Fine sampling done: "+((S-B)/1e3).toFixed(1)+"s","success")}else{const Y=Math.round(o*o*o*4/1048576);t.memAlloc("sdfGrid","SDF Grid",Y,t.MEM_COLORS.sdfGrid),t.log("Dense SDF "+o+"³ ("+Y+" MB grid)","info");const q=await Go(T,l,p,o,h,n,C,U,E,_,R,F,d),te=Qe(T,Math.min(o,2048),l,f,t.log,R,F);N=await vo(T,te,o,h,n,p,C,U,0,35,g,q.zSliceMin,q.zSliceMax,_,R,d),O=performance.now();let ce=0,se=0,J=0;for(let ae=0;ae<N.length;ae++){const fe=N[ae];isNaN(fe)?J++:fe>0?ce++:se++}if(t.log("SDF: "+ce.toLocaleString()+" outside, "+se.toLocaleString()+" inside"+(J>0?", "+J+" NaN!":"")+" ("+((O-j)/1e3).toFixed(1)+"s)","data"),se===0&&d===0){let ae=1/0;for(let fe=0;fe<N.length;fe++)N[fe]<ae&&(ae=N[fe]);if(ae<10){const fe=ae+E*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+ae.toFixed(6)+" → threshold="+fe.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let he=0;he<N.length;he++)N[he]-=fe;d=fe}}}}catch(Y){t.checkCancel();const q=Y;throw t.log("PHASE 1 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in SDF sampling: "+q.message),Y}t.checkCancel();let ee=0;b==="auto"?ee=E*1.5:parseFloat(b)>0&&(ee=E*parseFloat(b));{let Y=1/0,q=-1/0,te=0,ce=0;if(k&&$)$.blocks.forEach(se=>{for(let J=0;J<se.length;J++){const ae=se[J];ae<Y&&(Y=ae),ae>q&&(q=ae),ae<0&&te++,ce++}});else if(N){ce=N.length;for(let se=0;se<N.length;se++){const J=N[se];J<Y&&(Y=J),J>q&&(q=J),J<0&&te++}}if(t.log("SDF range: ["+Y.toFixed(6)+", "+q.toFixed(6)+"] | "+te.toLocaleString()+" interior cells of "+ce.toLocaleString()+" | threshold="+(ee>0?ee.toFixed(6):"off"),"data"),te===0&&Y>0&&Y<10){const se=Y+E*2;if(t.log("Auto-threshold: no interior found, SDF min="+Y.toFixed(6)+" → applying threshold "+se.toFixed(6)+" (set Surface Threshold manually to control shell thickness)","warn"),k&&$)$.blocks.forEach(J=>{for(let ae=0;ae<J.length;ae++)J[ae]-=se});else if(N)for(let J=0;J<N.length;J++)N[J]-=se;te=k&&$?(()=>{let J=0;return $.blocks.forEach(ae=>{for(let fe=0;fe<ae.length;fe++)ae[fe]<0&&J++}),J})():N?N.reduce((J,ae)=>J+(ae<0?1:0),0):0,t.log("After auto-threshold: "+te.toLocaleString()+" interior cells","data")}if(w>0||ee>0||y>0){if(t.log("[Phase 1b] SDF Filtering","phase"),t.setPhase("Phase 1b: SDF Filtering",0),t.setStatus("Filtering SDF..."),await Ie(t),w>0){if(m==="escape"&&k&&$&&T){t.setStatus("Cavity fill (escape test)..."),t.setPhase("Phase 1b: Escape Test",0);const se=await sa(T,$,l,h,n,p,C,U,_,ae=>{t.setPhase("Phase 1b: Escape Test",ae)},R);let J=0;$.blocks.forEach((ae,fe)=>{const he=se.escapeMap.get(fe);if(he)for(let be=0;be<ae.length;be++)ae[be]>=0&&he[be>>3]&1<<(be&7)&&(ae[be]=-Math.abs(ae[be])-.001,J++)}),t.log("Cavity fill (escape test): "+se.solidCount.toLocaleString()+" escape-interior cells, "+J.toLocaleString()+" positive cells filled","data")}else if(k&&$){t.setStatus("Cavity fill (dilate r="+w+", then flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const se=await va($,w,J=>{t.setPhase("Phase 1b: Cavity Fill (r="+w+")",J)},()=>{t.checkCancel()});t.log("Cavity fill: dilate="+w+" | "+se.dilated.toLocaleString()+" dilated, "+se.filled.toLocaleString()+" filled solid","data")}else if(N){t.setStatus("Cavity fill (flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const se=await ha(N,o,J=>{t.setPhase("Phase 1b: Cavity Fill",J)},()=>{t.checkCancel()});t.log("Cavity fill: "+se.toLocaleString()+" cells filled solid","data")}}if(ee>0){let se;k&&$?se=da($,ee):N?se=fa(N,o,ee):se=0,t.log("Min feature clamp: threshold="+ee.toFixed(6)+" ("+(ee/E).toFixed(1)+"x voxel), "+se.toLocaleString()+" cells clamped","data")}y>0&&(t.setStatus("Morphological closing (r="+y+" voxels)..."),k&&$?await pa($,y,se=>{t.setPhase("Phase 1b: Morph Closing",se)}):N&&await ma(N,o,y,se=>{t.setPhase("Phase 1b: Morph Closing",se)}),t.log("Morphological closing: radius="+y+" voxels","data")),t.setPhase("Phase 1b: SDF Filtering",100)}}t.checkCancel();try{if(t.log("[Phase 2] Dual Contouring","phase"),t.setPhase("Phase 2: Dual Contouring",0),t.setProgress(35),await Ie(t),k&&$)t.setStatus("Dual contouring (sparse, "+o+"³)..."),A=await jn($,C,U,(se,J)=>{t.setProgress(35+Math.round(J*.25)),t.setPhase("Phase 2: Dual Contouring",J)});else if(N){t.setStatus("Dual contouring ("+o+"³)...");const ce=Math.round(Math.log2(o));A=await Bn(N,o,C,U,ce,(J,ae)=>{t.setProgress(35+Math.round(ae*.25)),t.setPhase("Phase 2: Dual Contouring",ae)}),N=null,t.memFree("sdfGrid")}if(D=performance.now(),!A||A.vertexCount===0)return t.log("No surface found — check parameters and bounds","error"),t.setStatus("No surface found! Try different parameters."),{mesh:null,timings:null,baseName:"",newtonApplied:!1,useNarrowBand:k,gl:T};t.log("DC result: "+A.vertexCount.toLocaleString()+" vertices, "+A.faceCount.toLocaleString()+" faces ("+((D-O)/1e3).toFixed(1)+"s)","data");const Y=(A.positions.byteLength/(1024*1024)).toFixed(0),q=(A.normals.byteLength/(1024*1024)).toFixed(0),te=(A.indices.byteLength/(1024*1024)).toFixed(0);t.log("Mesh memory: positions="+Y+"MB normals="+q+"MB indices="+te+"MB (total "+(parseInt(Y)+parseInt(q)+parseInt(te))+"MB)","mem"),$&&($=null,t.memFree("sparseGrid"),t.log("Sparse grid freed","mem")),t.memAlloc("meshPos","Positions",parseInt(Y),t.MEM_COLORS.meshPos),t.memAlloc("meshNrm","Normals",parseInt(q),t.MEM_COLORS.meshNrm),t.memAlloc("meshIdx","Indices",parseInt(te),t.MEM_COLORS.meshIdx),t.setStatus("Mesh: "+A.vertexCount.toLocaleString()+" verts, "+A.faceCount.toLocaleString()+" faces"),t.setProgress(60),await Ie(t)}catch(Y){t.checkCancel();const q=Y;throw t.log("PHASE 2 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in dual contouring: "+q.message),Y}t.checkCancel(),X=D;const re=z/o;if(r&&A&&T)try{t.log("[Phase 3] Newton Projection","phase"),t.setPhase("Phase 3: Newton Projection",0),t.log("Mode: GPU (float32, generic formula) — "+A.vertexCount.toLocaleString()+" vertices","info");const Y=Math.ceil(Math.sqrt(A.vertexCount));t.log("Newton texture: "+Y+"x"+Y+" ("+(Y*Y*16*3/(1024*1024)).toFixed(0)+" MB GPU)","mem"),t.setStatus("GPU Newton projection ("+A.vertexCount.toLocaleString()+" vertices)..."),t.setPhase("Phase 3: Newton Projection",50),await Ie(t),ra(T,A,l,p,h,n,re,a,t.log,R),X=performance.now(),Q=!0,t.setPhase("Phase 3: Newton Projection",100),t.log("GPU Newton done: "+((X-D)/1e3).toFixed(1)+"s","success")}catch(Y){t.checkCancel(),X=performance.now();const q=Y;t.log("Newton FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Newton failed — continuing without projection"),await Ie(t)}t.setProgress(70),t.checkCancel();try{t.log("[Phase 4] Post-processing","phase"),t.setPhase("Phase 4: Post-processing",0),t.setStatus("Post-processing (smoothing, normals)..."),await Ie(t),Z=A.vertexCount>5e6,Z&&t.log("Large mesh ("+A.vertexCount.toLocaleString()+" verts) — smoothing disabled to avoid OOM","warn"),A=Ca(A,{smoothing:s>0,smoothIterations:s,lambda:i}),P=performance.now(),t.setPhase("Phase 4: Post-processing",100),t.log("Post-processing done: "+((P-X)/1e3).toFixed(1)+"s","success")}catch(Y){t.checkCancel(),P=performance.now();const q=Y;throw t.log("PHASE 4 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.setStatus("Error in post-processing: "+q.message),Y}t.setProgress(80),t.checkCancel();try{t.log("[Phase 5] Vertex Coloring","phase"),t.setPhase("Phase 5: Vertex Coloring",0),t.setStatus("Colorizing vertices..."),await Ie(t),(!T||T.isContextLost())&&(t.log("Re-initializing WebGL for colorizer","warn"),T=vt());const Y=E*M;A.colors=await ia(T,A,l,p,h,n,v,Y,_,R),G=performance.now(),t.setPhase("Phase 5: Vertex Coloring",100);const q=(A.vertexCount*3/(1024*1024)).toFixed(1);t.memAlloc("meshCol","Colors",parseFloat(q),t.MEM_COLORS.meshCol),t.log("Coloring done: "+((G-P)/1e3).toFixed(1)+"s"+(v>1?" ("+v+" samples)":""),"success")}catch(Y){t.checkCancel(),G=performance.now();const q=Y;t.log("PHASE 5 FAILED: "+q.message,"error"),t.log(q.stack||"","error"),t.log("Continuing without vertex colors","warn")}t.setProgress(90),t.checkCancel(),H=performance.now(),t.setProgress(100),t.setPhase("Complete",100),t.setStatus("Done — choose format and export");const ie=((H-j)/1e3).toFixed(1);t.log("=== Complete in "+ie+"s ===","phase");const le=(l.name||l.id||"fractal").toLowerCase().replace(/\s+/g,"-"),ve={total:H-j,sdf:O-j,coarse:B?B-j:0,fine:S&&B?S-B:0,dc:D-O,newton:X-D,post:P-X,color:G-P};return{mesh:A,baseName:le,smoothingSkipped:Z,newtonApplied:Q,timings:ve,useNarrowBand:k,gl:T}}catch(ee){if(T)try{const re=T.getExtension("WEBGL_lose_context");re&&re.loseContext()}catch{}throw ee}}async function Fa(e,t,o,n,s){const r=performance.now();let a,i;if(s.log("[Export] Encoding "+e.toUpperCase()+"...","phase"),s.setStatus("Encoding "+e.toUpperCase()+"..."),s.setPhase("Export "+e.toUpperCase(),0),e==="vdb"){const{definition:h,formulaParams:u,N:f,iters:g,power:b,gridMin:y,gridMax:v,deSamples:M,zSubSlices:m,weave:w,estimator:C,distanceMetric:U,surfaceThreshold:z}=n,R=C!==void 0||U!==void 0?{estimator:C??0,distanceMetric:U??0}:void 0,L=h.name||h.id||"unknown";s.log("=== VDB Export: "+L+" ===","phase"),s.log("Resolution: "+f+"³ | Iterations: "+g+" | Mode: solid | Z Sub-slices: "+m,"data");const V=vt(),d={log:s.log,setStatus:s.setStatus,setProgress:s.setProgress,setPhase:s.setPhase,tick:s.tick,onSlicePreview:s.onSlicePreview,memAlloc:s.memAlloc,memFree:s.memFree},c=await aa(V,h,u,f,b,g,y,v,"solid",M,m,d,w,R,z,n.vdbColor);try{const k=V.getExtension("WEBGL_lose_context");k&&k.loseContext()}catch{}a=c.blob;const I=(h.name||h.id||"fractal").toLowerCase().replace(/\s+/g,"-"),F=new Date().toISOString().replace(/[-:T]/g,"").slice(0,12),_=n.vdbColor?"-density-color":"-density";i=I+"-"+f+_+"-"+F+".vdb",s.log("VDB: "+c.voxelCount.toLocaleString()+" active voxels, "+c.leafCount+" leaf blocks"+(c.promoted.promotedLeaves?", "+c.promoted.promotedLeaves+" tiles promoted":"")+(c.skippedSlices>0?", "+c.skippedSlices+" empty slices skipped":""),"data")}else if(e==="glb"){const h=yo(t,e);s.log("Estimated size: ~"+(h/(1024*1024)).toFixed(0)+" MB","mem"),a=Ea(t),i=o+".glb",s.setPhase("Export GLB",100)}else{const h=yo(t,e);s.log("Estimated size: ~"+(h/(1024*1024)).toFixed(0)+" MB","mem"),a=await Ta(t,u=>{s.setPhase("Export STL",u),s.setStatus("Encoding STL... "+u+"%")}),i=o+".stl"}const l=performance.now(),p=(a.size/(1024*1024)).toFixed(2);return s.memAlloc("exportBlob",e.toUpperCase()+" Blob",parseFloat(p),s.MEM_COLORS.exportBlob),s.log("Export: "+p+" MB "+e.toUpperCase()+" ("+((l-r)/1e3).toFixed(1)+"s)","success"),s.setStatus(p+" MB "+e.toUpperCase()+" ready"),s.setPhase("Export complete",100),{blob:a,filename:i}}const Pa={webgl:"#47a",coarseGrid:"#7af",sparseGrid:"#5a8",sdfGrid:"#7af",meshPos:"#f80",meshNrm:"#fa0",meshIdx:"#fc0",meshCol:"#f5a",exportBlob:"#5af"},ut="font-mono text-[13px] font-bold border-none rounded px-4 py-2 cursor-pointer transition-opacity disabled:bg-surface-header disabled:text-fg-faint disabled:cursor-default",Aa=()=>{const e=W(),t=W(m=>m.isRunning),o=W(m=>m.exportFormat),n=W(m=>m.lastMesh),s=W(m=>m.lastBlob),r=W(m=>m.lastFilename),a=W(m=>m.loadedDefinition),i=W(m=>m.selectedFormulaId),l=W(m=>m.customFilename),p=W(m=>m.vdbColor),h=!!(a||_e.get(i)),u=o==="vdb";function f(){const m=W.getState(),w=m.loadedDefinition||_e.get(m.selectedFormulaId),C=m.bboxSize.map(c=>c/2),U=[m.bboxCenter[0]-C[0],m.bboxCenter[1]-C[1],m.bboxCenter[2]-C[2]],z=[m.bboxCenter[0]+C[0],m.bboxCenter[1]+C[1],m.bboxCenter[2]+C[2]];let R,L;m.cavityFill==="escape"?(R="escape",L=1):(R="dilate",L=parseInt(m.cavityFill)||0);const V=Gt(m),d=m.qualitySettings;return{N:m.resolution,iters:m.iters,smoothPasses:m.smoothPasses,useNewton:m.newton,newtonSteps:m.newtonSteps,smoothLambda:m.smoothLambda,definition:w,formulaParams:m.formulaParams,power:m.formulaParams.paramA||8,deType:m.deType,deSamples:m.deSamples,zSubSlices:m.zSubSlices,minFeatureSel:m.minFeature,closingRadius:m.closingRadius,colorSamples:m.colorSamples,colorJitterMul:m.colorJitter,cavityFillMode:R,cavityFillLevel:L,gridMin:U,gridMax:z,boundsRange:z[0]-U[0],weave:V,estimator:d.estimator,distanceMetric:d.distanceMetric,surfaceThreshold:d.surfaceThreshold}}function g(){return{setStatus:m=>W.getState().setStatus(m),setProgress:m=>W.getState().setProgress(m),setPhase:(m,w)=>W.getState().setPhase(m,w),log:(m,w)=>W.getState().addLog(m,w),memAlloc:(m,w,C,U)=>W.getState().memAlloc(m,w,C,U),memFree:m=>W.getState().memFree(m),tick:async()=>{if(await new Promise(m=>setTimeout(m,0)),W.getState().isCancelled)throw new Error("Cancelled")},checkCancel:()=>{if(W.getState().isCancelled)throw new Error("Cancelled")},onSlicePreview:(m,w,C)=>{pn(m,w,C)},MEM_COLORS:Pa}}const b=async()=>{const m=W.getState();m.setMesh(null,""),m.setExportBlob(null,""),m.setRunning(!0),m.setCancelled(!1),m.setProgress(0),m.setPhase("",0),m.clearMemory(),fo(),po();try{const w=await Ra(f(),g()),C=W.getState();C.setMesh(w.mesh,w.baseName),C.setTimings(w.timings,w.smoothingSkipped??!1,w.useNarrowBand),w.gl&&C.setGL(w.gl)}catch(w){const C=w;C.message!=="Cancelled"?(W.getState().addLog("ERROR: "+C.message,"error"),W.getState().setStatus("Error: "+C.message)):(W.getState().addLog("Cancelled","warn"),W.getState().setStatus("Cancelled"))}finally{W.getState().setRunning(!1)}},y=()=>{_n(),zn(),W.getState().setCancelled(!0)},v=async()=>{const m=W.getState();m.setRunning(!0),m.setCancelled(!1),fo(),po();try{const w=f(),C=await Fa(m.exportFormat,m.lastMesh,m.lastBaseName,{definition:w.definition,formulaParams:w.formulaParams,N:w.N,iters:w.iters,power:w.power,gridMin:w.gridMin,gridMax:w.gridMax,deSamples:w.deSamples,zSubSlices:w.zSubSlices,weave:w.weave,estimator:w.estimator,distanceMetric:w.distanceMetric,surfaceThreshold:w.surfaceThreshold,vdbColor:m.vdbColor},g()),U=W.getState().customFilename.trim(),z=U?U.replace(/\.[^.]+$/,"")+"."+C.filename.split(".").pop():C.filename;W.getState().setExportBlob(C.blob,z)}catch(w){const C=w;C.message!=="Cancelled"&&(W.getState().addLog("Export error: "+C.message,"error"),W.getState().setStatus("Export error: "+C.message))}finally{W.getState().setRunning(!1)}},M=()=>{s&&r&&Da(s,r)};return x.jsxs("div",{className:"font-mono flex flex-col gap-2 mt-1",children:[x.jsx(Te,{label:"Format",value:o,options:[{label:"GLB (Binary glTF)",value:"glb"},{label:"STL (Binary)",value:"stl"},{label:"VDB (OpenVDB)",value:"vdb"}],onChange:e.setExportFormat,fullWidth:!0}),x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx("span",{className:"text-[10px] text-fg-dim uppercase tracking-wide shrink-0",children:"Filename"}),x.jsx("input",{type:"text",value:l,onChange:m=>e.setCustomFilename(m.target.value),placeholder:((a==null?void 0:a.name)||i||"fractal").toLowerCase().replace(/\s+/g,"-"),className:"flex-1 h-[26px] bg-surface-header border border-line/20 rounded px-2 text-[11px] text-fg-secondary font-mono placeholder:text-fg-faint"}),x.jsxs("span",{className:"text-[10px] text-fg-faint",children:[".",o]})]}),u&&x.jsx("div",{className:"text-[11px] text-info bg-info/20 px-2 py-1 rounded",children:"VDB exports directly — no Generate needed"}),u&&x.jsxs("label",{className:"flex items-center gap-2 text-[11px] text-fg-tertiary cursor-pointer select-none",children:[x.jsx("input",{type:"checkbox",checked:p,onChange:m=>e.setVdbColor(m.target.checked),className:"accent-amber-500"}),"Include color grids (slower)"]}),x.jsxs("div",{className:"flex gap-2 flex-wrap",children:[!u&&x.jsxs("button",{disabled:t||!h,onClick:b,className:`${ut} bg-ok-strong text-fg hover:bg-ok-strong`,children:[x.jsx("span",{className:"bg-line/15 rounded px-1 mr-1 text-[10px]",children:"1"}),"Generate"]}),t&&x.jsx("button",{onClick:y,className:`${ut} bg-danger-strong text-fg hover:bg-danger-strong`,children:"Cancel"}),x.jsxs("button",{disabled:t||!n&&!u,onClick:v,className:`${ut} bg-warn-strong text-fg hover:bg-warn-strong`,children:[x.jsx("span",{className:"bg-line/15 rounded px-1 mr-1 text-[10px]",children:u?"1":"2"}),"Export"]}),x.jsxs("button",{disabled:!s,onClick:M,className:`${ut} bg-info text-fg hover:bg-info`,children:[x.jsx("span",{className:"bg-line/15 rounded px-1 mr-1 text-[10px]",children:u?"2":"3"}),"Download",r?` (${r})`:""]})]})]})};function Wo(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function gt(e,t){return[e[0]+t[0],e[1]+t[1],e[2]+t[2]]}function Vt(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function xt(e,t){return[e[0]*t,e[1]*t,e[2]*t]}function La(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function eo(e,t){const o=Math.cos(e),n=Math.sin(e),s=Math.cos(t),r=Math.sin(t),a=[o,0,-n],i=[-s*n,-r,-s*o],l=La(a,i);return{pos:Wo([0,0,0],xt(i,10)),fwd:i,right:a,up:l}}function wo(e,t,o,n,s,r,a){const i=eo(t,o),l=a||[0,0,0],p=gt(i.pos,l),h=Wo(e,p),u=Vt(h,i.right),f=Vt(h,i.up),g=r/n;return[s*.5+u*g,r*.5-f*g,0]}function kt(e,t,o,n,s,r){const a=r/s,i=eo(o,n),l=e/a,p=-t/a;return gt(xt(i.right,l),xt(i.up,p))}const ft=Math.PI*.5,So=[{angle:0,pitch:0,label:"Front (-Z)"},{angle:Math.PI,pitch:0,label:"Back (+Z)"},{angle:ft,pitch:0,label:"Right (+X)"},{angle:-ft,pitch:0,label:"Left (-X)"},{angle:0,pitch:ft,label:"Top (+Y)"},{angle:0,pitch:-ft,label:"Bottom (-Y)"}],Co=15*Math.PI/180;function $t(e){return e=e%(2*Math.PI),e>Math.PI&&(e-=2*Math.PI),e<-Math.PI&&(e+=2*Math.PI),e}function Ot(e,t,o){const n=$t(e);let s=null,r=1/0;for(let a=0;a<So.length;a++){const i=So[a];let l,p;Math.abs(i.pitch)>1?(l=0,p=Math.abs(t-i.pitch)):(l=Math.abs($t(n-i.angle)),p=Math.abs(t-i.pitch));const h=Math.sqrt(l*l+p*p);h<o&&h<r&&(r=h,s={angle:Math.abs(i.pitch)>1?n:i.angle,pitch:i.pitch,label:i.label})}return s}function Ia(){return{positions:null,indices:null,normals:null,vertexCount:0,faceCount:0,rotX:-.4,rotY:.6,zoom:1,cx:0,cy:0,cz:0,scale:1,dragging:!1,lastMX:0,lastMY:0}}function Mo(e,t,o,n,s,r){e.positions=t,e.indices=o,e.vertexCount=n,e.faceCount=s;let a=1/0,i=1/0,l=1/0,p=-1/0,h=-1/0,u=-1/0;for(let f=0;f<n;f++){const g=t[f*3],b=t[f*3+1],y=t[f*3+2];g<a&&(a=g),b<i&&(i=b),y<l&&(l=y),g>p&&(p=g),b>h&&(h=b),y>u&&(u=y)}e.cx=(a+p)/2,e.cy=(i+h)/2,e.cz=(l+u)/2,e.scale=r/(Math.max(p-a,h-i,u-l)*1.15)}function dt(e,t,o,n){if(t.fillStyle="#111",t.fillRect(0,0,o,n),!e.positions||!e.indices||e.vertexCount===0)return;const s=Math.cos(e.rotX),r=Math.sin(e.rotX),a=Math.cos(e.rotY),i=Math.sin(e.rotY),l=e.scale*e.zoom,p=e.positions,h=e.cx,u=e.cy,f=e.cz;function g(M){const m=p[M*3]-h,w=p[M*3+1]-u,C=p[M*3+2]-f,U=m*a-C*i,z=m*i+C*a,R=w*s-z*r;return[U*l+o/2,n/2-R*l]}const b=15e4,y=e.faceCount>b?Math.ceil(e.faceCount/b):1;let v=0;t.strokeStyle="rgba(42,170,85,0.12)",t.lineWidth=.5,t.beginPath();for(let M=0;M<e.faceCount&&v<b;M+=y){const m=g(e.indices[M*3]),w=g(e.indices[M*3+1]),C=g(e.indices[M*3+2]);t.moveTo(m[0],m[1]),t.lineTo(w[0],w[1]),t.lineTo(C[0],C[1]),t.lineTo(m[0],m[1]),v++}t.stroke(),t.fillStyle="#888",t.font="11px monospace",t.fillText(e.vertexCount.toLocaleString()+" verts, "+e.faceCount.toLocaleString()+" faces",4,n-4),t.fillStyle="#555",t.fillText("drag to rotate, scroll to zoom",4,14)}function Eo(e,t,o){const n=e.createShader(t);if(e.shaderSource(n,o),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const s=e.getShaderInfoLog(n)||"";throw e.deleteShader(n),new Error("Shader compile: "+s)}return n}function _a(e,t,o){const n=e.createProgram();if(e.attachShader(n,Eo(e,e.VERTEX_SHADER,t)),e.attachShader(n,Eo(e,e.FRAGMENT_SHADER,o)),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS)){const s=e.getProgramInfoLog(n)||"";throw e.deleteProgram(n),new Error("Program link: "+s)}return n}function Ba(e,t,o){var s,r,a,i,l,p,h,u,f,g,b,y,v,M,m,w,C,U,z,R,L,V,d,c,I,F,_,k,E,j;const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0),t.uVec2A&&e.uniform2f(t.uVec2A,((s=n.vec2A)==null?void 0:s.x)??0,((r=n.vec2A)==null?void 0:r.y)??0),t.uVec2B&&e.uniform2f(t.uVec2B,((a=n.vec2B)==null?void 0:a.x)??0,((i=n.vec2B)==null?void 0:i.y)??0),t.uVec2C&&e.uniform2f(t.uVec2C,((l=n.vec2C)==null?void 0:l.x)??0,((p=n.vec2C)==null?void 0:p.y)??0),t.uVec3A&&e.uniform3f(t.uVec3A,((h=n.vec3A)==null?void 0:h.x)??0,((u=n.vec3A)==null?void 0:u.y)??0,((f=n.vec3A)==null?void 0:f.z)??0),t.uVec3B&&e.uniform3f(t.uVec3B,((g=n.vec3B)==null?void 0:g.x)??0,((b=n.vec3B)==null?void 0:b.y)??0,((y=n.vec3B)==null?void 0:y.z)??0),t.uVec3C&&e.uniform3f(t.uVec3C,((v=n.vec3C)==null?void 0:v.x)??0,((M=n.vec3C)==null?void 0:M.y)??0,((m=n.vec3C)==null?void 0:m.z)??0),t.uVec4A&&e.uniform4f(t.uVec4A,((w=n.vec4A)==null?void 0:w.x)??0,((C=n.vec4A)==null?void 0:C.y)??0,((U=n.vec4A)==null?void 0:U.z)??0,((z=n.vec4A)==null?void 0:z.w)??0),t.uVec4B&&e.uniform4f(t.uVec4B,((R=n.vec4B)==null?void 0:R.x)??0,((L=n.vec4B)==null?void 0:L.y)??0,((V=n.vec4B)==null?void 0:V.z)??0,((d=n.vec4B)==null?void 0:d.w)??0),t.uVec4C&&e.uniform4f(t.uVec4C,((c=n.vec4C)==null?void 0:c.x)??0,((I=n.vec4C)==null?void 0:I.y)??0,((F=n.vec4C)==null?void 0:F.z)??0,((_=n.vec4C)==null?void 0:_.w)??0),t.uJulia&&e.uniform3f(t.uJulia,((k=n.julia)==null?void 0:k.x)??0,((E=n.julia)==null?void 0:E.y)??0,((j=n.julia)==null?void 0:j.z)??0),t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode??0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??4),t.uDeBailout&&e.uniform1f(t.uDeBailout,n.deBailout??100),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}const xe=512,Ve=Math.PI*.5;function za(){const e=W(d=>d.isRunning),t=W(d=>d.lastMesh),o=W(d=>d.loadedDefinition),n=W(d=>d.bboxCenter),s=W(d=>d.bboxSize),r=W(d=>d.formulaParams),a=W(d=>d.weaveState),i=W(d=>d.iters),l=W(d=>d.qualitySettings),p=W(d=>d.clipOutsideBounds),h=de.useRef(null),u=de.useRef(null),f=de.useRef(null),g=de.useRef(null),b=de.useRef({gl:null,prog:null,loc:{},defId:null,rawAngle:.6,rawPitch:.3,camAngle:.6,camPitch:.3,camDist:3.5,camTarget:[0,0,0],dragging:!1,dragMode:null,hover:null,lastX:0,lastY:0,shiftHeld:!1,snapped:!1,snapTarget:null,snapAnimId:0,rafId:0}),y=de.useRef(Ia()),v=t?"mesh":e?"slice":"fractal",M=de.useCallback(()=>{const d=b.current,c=W.getState(),I=c.loadedDefinition;if(!d.gl||!I)return;const F=d.gl,_=c.qualitySettings,E=Wt(I)==="ifs"&&_.estimator>=1.5&&_.estimator<2.5?1:_.estimator,j=I.id+":e"+(E??0);if(d.defId===j&&d.prog)return;d.prog&&(F.deleteProgram(d.prog),d.prog=null);try{const T=Sn({definition:I,deType:"auto",estimator:E});console.log("[Preview] Compiling shader for",I.id,"| estimator:",E,"| length:",T.length),d.prog=_a(F,Ke,T),console.log("[Preview] Shader compiled OK for",I.id)}catch(T){console.warn("Preview shader compile failed for",I.id+":",T.message),d.prog=null,d.defId=null;return}F.useProgram(d.prog),F.bindVertexArray(F.createVertexArray()),d.loc={};const A=["uPower","uIters","uResolution","uCamPos","uCamTarget","uCamRight","uFov","uFudgeFactor","uDetail","uPixelThreshold","uClipBounds","uBoundsMin","uBoundsMax",...qe];for(const T of A)d.loc[T]=F.getUniformLocation(d.prog,T);d.defId=j},[]),m=de.useCallback(()=>{const d=u.current;if(!d)return;const c=d.getContext("2d"),I=d.width,F=d.height;c.clearRect(0,0,I,F);const _=b.current,k=W.getState(),[E,j,A]=k.bboxCenter,[T,B,S]=k.bboxSize,O=T*.5,D=B*.5,P=S*.5,G=Y=>wo(Y,_.camAngle,_.camPitch,_.camDist,xe,xe,_.camTarget),H=[];for(let Y=0;Y<2;Y++)for(let q=0;q<2;q++)for(let te=0;te<2;te++)H.push([E+(Y?O:-O),j+(q?D:-D),A+(te?P:-P)]);const X=H.map(G),$=[{color:"#f554",edges:[[0,4],[1,5],[2,6],[3,7]]},{color:"#5f54",edges:[[0,2],[1,3],[4,6],[5,7]]},{color:"#55f4",edges:[[0,1],[2,3],[4,5],[6,7]]}];for(const Y of $){c.strokeStyle=Y.color,c.lineWidth=1,c.setLineDash([4,3]),c.beginPath();for(const[q,te]of Y.edges)c.moveTo(X[q][0],X[q][1]),c.lineTo(X[te][0],X[te][1]);c.stroke()}c.setLineDash([]);const N={"sizeX+":[E+O,j,A],"sizeX-":[E-O,j,A],"sizeY+":[E,j+D,A],"sizeY-":[E,j-D,A],"sizeZ+":[E,j,A+P],"sizeZ-":[E,j,A-P]},Z={"sizeX+":"#f55","sizeX-":"#f55","sizeY+":"#5f5","sizeY-":"#5f5","sizeZ+":"#55f","sizeZ-":"#55f"},Q=Object.keys(N);for(const Y of Q){const q=G(N[Y]),te=_.hover===Y?7:5;c.fillStyle=Z[Y],c.beginPath(),c.moveTo(q[0],q[1]-te),c.lineTo(q[0]+te,q[1]),c.lineTo(q[0],q[1]+te),c.lineTo(q[0]-te,q[1]),c.closePath(),c.fill(),_.hover===Y&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke())}const ne=[E,j,A],K=G(ne),ee=_.camDist*.12,re=["#f55","#5f5","#55f"],ie=[[1,0,0],[0,1,0],[0,0,1]],le=["X","Y","Z"];for(let Y=0;Y<3;Y++){const q=gt(ne,xt(ie[Y],ee)),te=G(q),ce=te[0]-K[0],se=te[1]-K[1],J=Math.sqrt(ce*ce+se*se);if(J<2)continue;const ae=_.hover==="center";c.strokeStyle=re[Y],c.lineWidth=ae?3:2,c.beginPath(),c.moveTo(K[0],K[1]),c.lineTo(te[0],te[1]),c.stroke();const fe=ce/J,he=se/J;c.fillStyle=re[Y],c.beginPath(),c.moveTo(te[0],te[1]),c.lineTo(te[0]-fe*6+he*3,te[1]-he*6-fe*3),c.lineTo(te[0]-fe*6-he*3,te[1]-he*6+fe*3),c.closePath(),c.fill(),c.font="bold 9px monospace",c.fillStyle=re[Y],c.fillText(le[Y],te[0]+fe*6-3,te[1]+he*6+3)}const ve=_.hover==="center"?5:3;if(c.fillStyle=_.hover==="center"?"#fc0":"#fa0",c.beginPath(),c.arc(K[0],K[1],ve,0,Math.PI*2),c.fill(),_.hover==="center"&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke()),_.snapTarget){const Y=Ot(_.snapTarget.angle,_.snapTarget.pitch,.1);Y&&(c.font="bold 11px monospace",c.fillStyle="#fa0",c.textAlign="right",c.fillText(Y.label,I-6,14),c.textAlign="left")}else if(_.shiftHeld){const Y=Ot(_.camAngle,_.camPitch,Co);Y&&(c.font="10px monospace",c.fillStyle="#888",c.textAlign="right",c.fillText("snap: "+Y.label,I-6,14),c.textAlign="left")}},[]),w=de.useCallback(()=>{const d=b.current;if(!d.gl||!d.prog){console.log("[Preview] Render skipped: gl=",!!d.gl,"prog=",!!d.prog);return}const c=d.gl,I=c.canvas;c.viewport(0,0,I.width,I.height),c.useProgram(d.prog);const F=eo(d.camAngle,d.camPitch),_=d.camTarget;c.uniform2f(d.loc.uResolution,I.width,I.height),c.uniform3f(d.loc.uCamPos,F.pos[0]+_[0],F.pos[1]+_[1],F.pos[2]+_[2]),c.uniform3f(d.loc.uCamTarget,_[0],_[1],_[2]),c.uniform3f(d.loc.uCamRight,F.right[0],F.right[1],F.right[2]),c.uniform1f(d.loc.uFov,d.camDist);const k=W.getState(),E=k.formulaParams;c.uniform1f(d.loc.uPower,E.paramA??8),c.uniform1i(d.loc.uIters,k.iters),Ba(c,d.loc,E);{const A=Gt(k);d.loc.uWeaveEnabled&&c.uniform1f(d.loc.uWeaveEnabled,(A==null?void 0:A.weaveEnabled)===!1?0:1);const T=B=>B.charAt(0).toUpperCase()+B.slice(1);for(const[B,S]of Object.entries(A??{})){if(B==="weaveEnabled")continue;const O=d.loc["u"+T(B)];O&&(/^ws\d+Vec2/.test(B)?c.uniform2f(O,(S==null?void 0:S.x)??0,(S==null?void 0:S.y)??0):/^ws\d+Vec3/.test(B)?c.uniform3f(O,(S==null?void 0:S.x)??0,(S==null?void 0:S.y)??0,(S==null?void 0:S.z)??0):/^ws\d+Vec4/.test(B)?c.uniform4f(O,(S==null?void 0:S.x)??0,(S==null?void 0:S.y)??0,(S==null?void 0:S.z)??0,(S==null?void 0:S.w)??0):c.uniform1f(O,typeof S=="number"?S:S?1:0))}}const j=k.qualitySettings;if(d.loc.uFudgeFactor&&c.uniform1f(d.loc.uFudgeFactor,(j.fudgeFactor??1)*.75),d.loc.uDetail&&c.uniform1f(d.loc.uDetail,j.detail??1),d.loc.uPixelThreshold&&c.uniform1f(d.loc.uPixelThreshold,j.pixelThreshold??.5),d.loc.uDistanceMetric&&c.uniform1f(d.loc.uDistanceMetric,j.distanceMetric??0),d.loc.uClipBounds&&c.uniform1f(d.loc.uClipBounds,k.clipOutsideBounds?1:0),d.loc.uBoundsMin){const A=k.bboxSize.map(T=>T/2);c.uniform3f(d.loc.uBoundsMin,k.bboxCenter[0]-A[0],k.bboxCenter[1]-A[1],k.bboxCenter[2]-A[2]),c.uniform3f(d.loc.uBoundsMax,k.bboxCenter[0]+A[0],k.bboxCenter[1]+A[1],k.bboxCenter[2]+A[2])}c.drawArrays(c.TRIANGLE_STRIP,0,4),m()},[m]),C=de.useCallback(()=>{const d=b.current;d.rafId||(d.rafId=requestAnimationFrame(()=>{d.rafId=0;const c=W.getState();(c.lastMesh?"mesh":c.isRunning?"slice":"fractal")==="fractal"&&(M(),w())}))},[M,w]),U=de.useCallback((d,c)=>{const I=b.current,F=W.getState(),[_,k,E]=F.bboxCenter,[j,A,T]=F.bboxSize,B=j*.5,S=A*.5,O=T*.5,D=X=>wo(X,I.camAngle,I.camPitch,I.camDist,xe,xe,I.camTarget),P=8,G=D([_,k,E]);if(Math.abs(d-G[0])<P&&Math.abs(c-G[1])<P)return"center";const H=[["sizeX+",[_+B,k,E]],["sizeX-",[_-B,k,E]],["sizeY+",[_,k+S,E]],["sizeY-",[_,k-S,E]],["sizeZ+",[_,k,E+O]],["sizeZ-",[_,k,E-O]]];for(const[X,$]of H){const N=D($);if(Math.abs(d-N[0])<P&&Math.abs(c-N[1])<P)return X}return null},[]),z=de.useCallback(()=>{const d=b.current;if(d.shiftHeld){const c=Ot(d.rawAngle,d.rawPitch,Co);if(c){if(d.snapped=!0,d.snapTarget=c,!d.snapAnimId){const I=()=>{if(d.snapAnimId=0,!d.snapTarget)return;const F=$t(d.snapTarget.angle-d.camAngle),_=d.snapTarget.pitch-d.camPitch;if(Math.sqrt(F*F+_*_)<.002){d.camAngle=d.snapTarget.angle,d.camPitch=d.snapTarget.pitch,C(),d.snapped&&(d.snapAnimId=requestAnimationFrame(I));return}d.camAngle+=F*.2,d.camPitch+=_*.2,C(),d.snapAnimId=requestAnimationFrame(I)};d.snapAnimId=requestAnimationFrame(I)}return}}d.snapped=!1,d.snapTarget=null,d.snapAnimId&&(cancelAnimationFrame(d.snapAnimId),d.snapAnimId=0),d.camAngle=d.rawAngle,d.camPitch=d.rawPitch},[C]);de.useEffect(()=>{const d=h.current;if(!d)return;const c=b.current;return c.gl=d.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0}),c.gl||console.warn("Preview: WebGL2 not available"),()=>{c.prog&&c.gl&&c.gl.deleteProgram(c.prog),c.prog=null,c.defId=null}},[]),de.useEffect(()=>{const d=f.current;if(!d)return;const c=d.getContext("2d");if(c)return dn((I,F,_)=>{const k=document.createElement("canvas");k.width=F,k.height=_,k.getContext("2d").putImageData(I,0,0),c.clearRect(0,0,xe,xe),c.imageSmoothingEnabled=!1,c.drawImage(k,0,0,xe,xe)}),()=>{mn()}},[]),de.useEffect(()=>{var I;if(v!=="fractal")return;const d=b.current,c=(o==null?void 0:o.id)??"";o&&!((I=d.defId)!=null&&I.startsWith(c))&&(d.defId=null),C()},[o,v,C]),de.useEffect(()=>{v==="fractal"&&C()},[r,a,i,n,s,p,l,v,C]),de.useEffect(()=>{if(!t)return;const d=g.current;if(!d)return;const c=d.getContext("2d");if(!c)return;const I=y.current;Mo(I,t.positions,t.indices,t.vertexCount,t.faceCount,d.width),dt(I,c,d.width,d.height)},[t]),de.useEffect(()=>{const d=u.current;if(!d)return;const c=b.current,I=T=>{const B=d.getBoundingClientRect(),S=T.clientX-B.left,O=T.clientY-B.top;if(c.lastX=T.clientX,c.lastY=T.clientY,T.button===1||T.button===2){c.dragMode="pan",c.dragging=!0,d.style.cursor="all-scroll",T.preventDefault();return}const D=U(S,O);c.dragMode=D||"orbit",c.dragging=!0,d.style.cursor=c.dragMode==="orbit"?"grabbing":"ew-resize",T.preventDefault()},F=T=>{T.preventDefault()},_=T=>{if(!c.dragging){const O=d.getBoundingClientRect(),D=T.clientX-O.left,P=T.clientY-O.top,G=c.hover;c.hover=U(D,P),d.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab",c.hover!==G&&C();return}const B=T.clientX-c.lastX,S=T.clientY-c.lastY;if(c.lastX=T.clientX,c.lastY=T.clientY,c.dragMode==="pan"){const O=kt(-B,-S,c.camAngle,c.camPitch,c.camDist,xe);c.camTarget=gt(c.camTarget,O),C()}else if(c.dragMode==="orbit")c.rawAngle+=B*.008,c.rawPitch=Math.max(-Ve,Math.min(Ve,c.rawPitch+S*.008)),z(),C();else if(c.dragMode==="center"){const O=kt(B,S,c.camAngle,c.camPitch,c.camDist,xe),D=W.getState(),[P,G,H]=D.bboxCenter;D.setBboxCenter([P+O[0],G+O[1],H+O[2]]),C()}else if(c.dragMode){const O=c.dragMode.charAt(4),D=c.dragMode.charAt(5)==="+"?1:-1,P=O==="X"?[1,0,0]:O==="Y"?[0,1,0]:[0,0,1],G=kt(B,S,c.camAngle,c.camPitch,c.camDist,xe),H=Vt(G,P)*D,X=O==="X"?0:O==="Y"?1:2,$=W.getState(),N=[...$.bboxSize],Z=[...$.bboxCenter],Q=Math.max(.1,N[X]+H*2),ne=Q-N[X];$.bboxLock?$.setBboxSize([Q,Q,Q]):(N[X]=Q,Z[X]+=ne*.5*D,$.setBboxSize(N),$.setBboxCenter(Z)),C()}},k=()=>{c.dragging=!1,c.dragMode=null,d.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab"},E=T=>{T.preventDefault(),c.camDist=Math.max(.5,Math.min(20,c.camDist*(1+T.deltaY*.001))),C()},j=T=>{T.key==="Shift"&&!c.shiftHeld&&(c.shiftHeld=!0,z(),C())},A=T=>{T.key==="Shift"&&(c.shiftHeld=!1,z(),C())};return d.addEventListener("mousedown",I),window.addEventListener("mousemove",_),window.addEventListener("mouseup",k),d.addEventListener("wheel",E,{passive:!1}),d.addEventListener("contextmenu",F),window.addEventListener("keydown",j),window.addEventListener("keyup",A),()=>{d.removeEventListener("mousedown",I),window.removeEventListener("mousemove",_),window.removeEventListener("mouseup",k),d.removeEventListener("wheel",E),d.removeEventListener("contextmenu",F),window.removeEventListener("keydown",j),window.removeEventListener("keyup",A)}},[U,z,C]),de.useEffect(()=>{const d=g.current;if(!d)return;const c=y.current;let I=null;const F=()=>{const T=d.getContext("2d");T&&dt(c,T,d.width,d.height)},_=T=>{c.dragging=!0,c.lastMX=T.clientX,c.lastMY=T.clientY,I=T.button===1||T.button===2?"pan":"orbit"},k=()=>{c.dragging=!1,I=null},E=T=>{if(!c.dragging||!c.positions)return;const B=T.clientX-c.lastMX,S=T.clientY-c.lastMY;if(c.lastMX=T.clientX,c.lastMY=T.clientY,I==="pan"){const O=1/(c.scale*c.zoom);c.cx-=B*O,c.cy+=S*O,F()}else c.rotY+=B*.01,c.rotX+=S*.01,c.rotX=Math.max(-Ve,Math.min(Ve,c.rotX)),F()},j=T=>{T.preventDefault(),c.zoom*=T.deltaY>0?.9:1.1,c.zoom=Math.max(.1,Math.min(10,c.zoom)),c.positions&&F()},A=T=>{T.preventDefault()};return d.addEventListener("mousedown",_),window.addEventListener("mouseup",k),window.addEventListener("mousemove",E),d.addEventListener("wheel",j,{passive:!1}),d.addEventListener("contextmenu",A),()=>{d.removeEventListener("mousedown",_),window.removeEventListener("mouseup",k),window.removeEventListener("mousemove",E),d.removeEventListener("wheel",j),d.removeEventListener("contextmenu",A)}},[]);const R=de.useCallback((d,c,I)=>{const F=b.current;F.rawAngle=d,F.rawPitch=c,F.camAngle=d,F.camPitch=c,F.snapped=!1,F.snapTarget=null,F.snapAnimId&&(cancelAnimationFrame(F.snapAnimId),F.snapAnimId=0);const _=y.current;if(_.rotX=-c,_.rotY=d,_.positions){const k=g.current;if(k){const E=k.getContext("2d");E&&dt(_,E,k.width,k.height)}}C()},[C]),L=de.useCallback(()=>{const d=b.current;d.camTarget=[0,0,0];const c=y.current;if(c.positions){Mo(c,c.positions,c.indices,c.vertexCount,c.faceCount,xe);const I=g.current;if(I){const F=I.getContext("2d");F&&dt(c,F,I.width,I.height)}}C()},[C]),V=[{label:"F",title:"Front (-Z)",angle:0,pitch:0},{label:"B",title:"Back (+Z)",angle:Math.PI,pitch:0},{label:"L",title:"Left (-X)",angle:-Ve,pitch:0},{label:"R",title:"Right (+X)",angle:Ve,pitch:0},{label:"T",title:"Top (+Y)",angle:0,pitch:Ve},{label:"D",title:"Bottom (-Y)",angle:0,pitch:-Ve}];return x.jsxs("div",{className:"relative",style:{width:xe,height:xe},children:[x.jsx("canvas",{ref:h,width:xe,height:xe,className:"border border-line/10 rounded-sm",style:{imageRendering:"pixelated",display:v==="fractal"?"block":"none"}}),x.jsx("canvas",{ref:u,width:xe,height:xe,style:{position:"absolute",top:0,left:0,cursor:"grab",display:v==="fractal"?"block":"none"}}),x.jsx("canvas",{ref:f,width:xe,height:xe,className:"border border-line/10 rounded-sm",style:{imageRendering:"pixelated",display:v==="slice"?"block":"none"}}),x.jsx("canvas",{ref:g,width:xe,height:xe,className:"border border-line/10 rounded-sm",style:{cursor:"grab",display:v==="mesh"?"block":"none"}}),x.jsxs("div",{className:"absolute top-2 left-2 text-[10px] text-fg-dim uppercase tracking-wider pointer-events-none",children:[v==="fractal"&&"SDF Preview",v==="slice"&&"Sampling...",v==="mesh"&&"Mesh Preview"]}),v!=="slice"&&x.jsxs("div",{className:"absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-surface/70 backdrop-blur rounded px-1 py-0.5 pointer-events-auto",children:[V.map(d=>x.jsx("button",{title:d.title,onClick:()=>R(d.angle,d.pitch,d.label),className:"w-[22px] h-[20px] text-[10px] font-bold text-fg-muted hover:text-fg hover:bg-line/10 rounded transition-colors",children:d.label},d.label)),x.jsx("div",{className:"w-px h-3 bg-fg-ghost mx-0.5"}),x.jsx("button",{title:"Reset pan (re-center view)",onClick:L,className:"w-[22px] h-[20px] text-[10px] font-bold text-fg-muted hover:text-fg hover:bg-line/10 rounded transition-colors",children:"C"})]}),v==="fractal"&&x.jsxs("label",{className:"absolute top-2 right-2 flex items-center gap-1 bg-surface/70 backdrop-blur rounded px-1.5 py-0.5 cursor-pointer pointer-events-auto select-none",children:[x.jsx("input",{type:"checkbox",checked:p,onChange:d=>W.getState().setClipOutsideBounds(d.target.checked),className:"accent-amber-500 w-3 h-3"}),x.jsx("span",{className:"text-[9px] text-fg-muted",children:"Clip bounds"})]}),v!=="slice"&&x.jsx("div",{className:"absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-fg-faint pointer-events-none whitespace-nowrap",children:"LMB orbit · RMB pan · Scroll zoom · Shift snap"})]})}function ka(){const e=W(),t=W(s=>s.weaveState);if(!t)return null;const o=[1,2,3,4,5].filter(s=>t[`weaveInterval${s}`]!==void 0),n=(s,r)=>e.setWeaveState({...t,[s]:r});return x.jsxs("div",{className:"flex flex-col gap-1.5 border border-secondary/40 rounded px-2 py-1.5 bg-secondary/10 mt-1",children:[x.jsxs("div",{className:"text-[11px] text-secondary font-bold flex items-center justify-between",children:[x.jsx("span",{children:"Weave"}),x.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[x.jsx("input",{type:"checkbox",checked:t.weaveEnabled!==!1,onChange:s=>n("weaveEnabled",s.target.checked)}),x.jsx("span",{className:"text-[10px] text-secondary",children:"active"})]})]}),o.map(s=>x.jsxs("div",{className:"flex gap-3 text-[11px] text-fg-muted",children:[x.jsxs("label",{className:"flex items-center gap-1",children:["Layer ",s," every",x.jsx("input",{type:"number",min:1,max:32,step:1,value:Number(t[`weaveInterval${s}`]??2),onChange:r=>n(`weaveInterval${s}`,Math.max(1,parseInt(r.target.value)||1)),className:"w-12 bg-surface-header border border-line/20 rounded px-1 text-fg-secondary text-center"})]}),x.jsxs("label",{className:"flex items-center gap-1",children:["from",x.jsx("input",{type:"number",min:0,max:64,step:1,value:Number(t[`weaveStartIter${s}`]??0),onChange:r=>n(`weaveStartIter${s}`,Math.max(0,parseInt(r.target.value)||0)),className:"w-12 bg-surface-header border border-line/20 rounded px-1 text-fg-secondary text-center"})]})]},s))]})}function Oa(){const e=Ce.useRef(null),t=Ce.useRef(null),o=Ce.useRef(0),n=Ce.useRef(!1),s=Ce.useCallback(()=>{n.current=!0,clearTimeout(o.current);const a=e.current,i=t.current;i.style.transition="none",i.style.transform="scale(1)",a.offsetHeight,a.style.transition="max-height 0.35s ease-out",a.style.maxHeight="200px"},[]),r=Ce.useCallback(()=>{n.current=!1;const a=e.current,i=t.current;i.style.transition="transform 0.3s ease-in",i.style.transform="scale(0) translateY(0)",i.style.transformOrigin="bottom center",o.current=window.setTimeout(()=>{n.current||(a.style.transition="none",a.style.maxHeight="0")},310)},[]);return x.jsxs("div",{className:"fixed bottom-5 right-5 z-50 inline-flex flex-col items-stretch",onMouseEnter:s,onMouseLeave:r,children:[x.jsx("div",{ref:e,className:"overflow-hidden",style:{maxHeight:0},children:x.jsx("img",{ref:t,src:"guy.png",alt:"",className:"pointer-events-none object-contain block w-full",style:{transform:"scale(0)",transformOrigin:"bottom center"}})}),x.jsx("a",{href:"https://ko-fi.com/gmtfractals",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center justify-center gap-2 px-3 py-1 rounded bg-[#13C3FF] hover:bg-[#00b0f0] text-fg text-[11px] font-bold transition-colors",children:"Support on Ko-fi"}),x.jsx("a",{href:"https://www.paypal.com/ncp/payment/WHMZWATKN6GEY",target:"_blank",rel:"noopener noreferrer",className:"mt-1 inline-flex items-center justify-center gap-2 px-3 py-1 rounded bg-[#0070ba] hover:bg-[#005ea6] text-fg text-[11px] font-bold transition-colors",children:"Support via PayPal"})]})}function ja(){const e=W(o=>o.iters),t=W(o=>o.setIters);return x.jsxs("div",{className:"font-mono bg-surface-dock text-fg-secondary h-screen flex flex-col overflow-hidden",children:[x.jsx("h1",{className:"text-sm font-bold text-fg tracking-wide px-5 pt-4 pb-2 shrink-0",children:"GMT — Fractal Mesh Export"}),x.jsxs("div",{className:"flex gap-4 flex-1 min-h-0 px-5 pb-4",children:[x.jsxs("div",{className:"flex flex-col gap-2.5 w-[340px] shrink-0 overflow-y-auto pr-1",children:[x.jsx("div",{className:"bg-surface-section border border-line/10 rounded p-3",children:x.jsx(ot,{label:"Export",defaultOpen:!0,children:x.jsx(Aa,{})})}),x.jsx("div",{className:"bg-surface-section border border-line/10 rounded p-3",children:x.jsx(xn,{})}),x.jsx("div",{className:"bg-surface-section border border-line/10 rounded p-3",children:x.jsx(ot,{label:"Bounds",defaultOpen:!0,children:x.jsx(ca,{})})})]}),x.jsxs("div",{className:"flex flex-col gap-2.5 flex-1 min-w-0 items-center",children:[x.jsx(za,{}),x.jsx(ua,{})]}),x.jsxs("div",{className:"flex flex-col gap-2.5 w-[300px] shrink-0 overflow-y-auto pl-1",children:[x.jsx("div",{className:"bg-surface-section border border-line/10 rounded p-3",children:x.jsx(ot,{label:"Formula",defaultOpen:!0,children:x.jsxs("div",{className:"flex flex-col gap-2 mt-1",children:[x.jsx(vn,{}),x.jsx(Ae,{label:"Iterations",value:e,onChange:t,min:2,max:64,step:1,variant:"full"})]})})}),x.jsx("div",{className:"bg-surface-section border border-line/10 rounded p-3",children:x.jsx(ot,{label:"Parameters",defaultOpen:!0,children:x.jsxs("div",{className:"flex flex-col gap-1 mt-1",children:[x.jsx(gn,{}),x.jsx(ka,{})]})})})]})]}),x.jsx(Oa,{})]})}function Na(){const e=de.useRef(!1);return de.useEffect(()=>{if(e.current)return;e.current=!0;try{const o=on("gmt-mesh-export-scene");if(o){nn("gmt-mesh-export-scene"),Ro(o,"(from main app)");return}}catch(o){console.warn("[MeshExport] Auto-load from main app failed:",o)}const t=W.getState();if(!t.loadedDefinition){const o=_e.get(t.selectedFormulaId);o&&(t.setLoadedDefinition(o),t.setFormulaParams(Do(o)))}},[]),x.jsx(ja,{})}const Yo=document.getElementById("root");if(!Yo)throw new Error("Could not find root element to mount to");const Ua=sn.createRoot(Yo);Ua.render(x.jsx(Ce.StrictMode,{children:x.jsx(Na,{})}));
