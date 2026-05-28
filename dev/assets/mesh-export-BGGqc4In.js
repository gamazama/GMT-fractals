var en=Object.defineProperty;var tn=(e,t,o)=>t in e?en(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var oe=(e,t,o)=>tn(e,typeof t!="symbol"?t+"":t,o);import{H as Oe,aT as Te,b3 as on,b4 as ct,aH as Ie,aP as Nt,ab as tt,U as me,f as Eo,aU as nn}from"./FractalRegistry-BUHzgo28.js";import{r as de,j as b,R as Ce}from"./three-fiber-GKfjny8F.js";import{a as an,c as sn}from"./three-drei-D6d-dyvY.js";import{l as rn,f as ln,I as ot,r as cn,h as un,i as Fo,p as fn,j as dn,k as mn,m as hn}from"./FormulaFormat-DiFYSOaS.js";import{d as Be,c as Ve,o as Lt}from"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";const ze={estimator:0,distanceMetric:0,surfaceThreshold:0,fudgeFactor:1,detail:1,pixelThreshold:.5};let nt=null;function pn(e){nt=e}function vn(){nt=null}function xn(e,t,o){nt==null||nt(e,t,o)}const no=[3,3,3],ao=[0,0,0];function gn(){const e=new Date;return e.toTimeString().split(" ")[0]+"."+String(e.getMilliseconds()).padStart(3,"0")}const Y=an()((e,t)=>({selectedFormulaId:"Mandelbulb",loadedDefinition:null,formulaParams:{},interlaceState:null,loadedFilename:null,loadError:null,qualitySettings:{...ze},resolution:512,iters:12,deType:"auto",deSamples:2,zSubSlices:4,minFeature:"auto",cavityFill:"2",closingRadius:0,newton:!0,newtonSteps:6,smoothPasses:3,smoothLambda:.5,colorSamples:8,colorJitter:.5,exportFormat:"vdb",customFilename:"",vdbColor:!1,bboxCenter:ao,bboxSize:no,bboxLock:!1,clipOutsideBounds:!1,isRunning:!1,isCancelled:!1,progress:0,phaseProgress:0,phaseName:"",status:"",logEntries:[],memoryBlocks:[],lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,useNarrowBand:!1,gl:null,setSelectedFormula:o=>e({selectedFormulaId:o}),setLoadedDefinition:o=>e({loadedDefinition:o}),setFormulaParams:o=>e({formulaParams:o}),setInterlaceState:o=>e({interlaceState:o}),updateParam:(o,n)=>e(s=>({formulaParams:{...s.formulaParams,[o]:n}})),setLoadedFilename:o=>e({loadedFilename:o}),setLoadError:o=>e({loadError:o}),setQualitySettings:o=>e({qualitySettings:o}),updateQuality:(o,n)=>e(s=>({qualitySettings:{...s.qualitySettings,[o]:n}})),setResolution:o=>e({resolution:o}),setIters:o=>e({iters:o}),setDeType:o=>e({deType:o}),setDeSamples:o=>e({deSamples:o}),setZSubSlices:o=>e({zSubSlices:o}),setMinFeature:o=>e({minFeature:o}),setCavityFill:o=>e({cavityFill:o}),setClosingRadius:o=>e({closingRadius:o}),setNewton:o=>e({newton:o}),setNewtonSteps:o=>e({newtonSteps:o}),setSmoothPasses:o=>e({smoothPasses:o}),setSmoothLambda:o=>e({smoothLambda:o}),setColorSamples:o=>e({colorSamples:o}),setColorJitter:o=>e({colorJitter:o}),setExportFormat:o=>e({exportFormat:o}),setVdbColor:o=>e({vdbColor:o}),setCustomFilename:o=>e({customFilename:o}),setBboxCenter:o=>e({bboxCenter:o}),setBboxSize:o=>e({bboxSize:o}),setBboxLock:o=>e({bboxLock:o}),setClipOutsideBounds:o=>e({clipOutsideBounds:o}),resetBounds:()=>e({bboxCenter:[...ao],bboxSize:[...no]}),setRunning:o=>e({isRunning:o}),setCancelled:o=>e({isCancelled:o}),setProgress:o=>e({progress:o}),setPhase:(o,n)=>e({phaseName:o,phaseProgress:n}),setStatus:o=>e({status:o}),addLog:(o,n="info")=>e(s=>({logEntries:[...s.logEntries,{time:gn(),msg:o,type:n}]})),clearLog:()=>e({logEntries:[]}),memAlloc:(o,n,s,r)=>e(a=>{const i=a.memoryBlocks.findIndex(f=>f.id===o),l=[...a.memoryBlocks];return i>=0?l[i]={id:o,label:n,mb:s,color:r,freed:!1}:l.push({id:o,label:n,mb:s,color:r,freed:!1}),{memoryBlocks:l}}),memFree:o=>e(n=>({memoryBlocks:n.memoryBlocks.map(s=>s.id===o?{...s,freed:!0}:s)})),clearMemory:()=>e({memoryBlocks:[]}),setMesh:(o,n)=>e({lastMesh:o,lastBaseName:n}),setTimings:(o,n,s)=>e({lastTimings:o,smoothingSkipped:n,useNarrowBand:s}),setExportBlob:(o,n)=>e({lastBlob:o,lastFilename:n}),setGL:o=>e({gl:o}),resetMeshResult:()=>e({lastMesh:null,lastBaseName:"",lastBlob:null,lastFilename:"",lastTimings:null,smoothingSkipped:!1,gl:null,logEntries:[],memoryBlocks:[],progress:0,phaseName:"",status:""})}));function Po(e){var s,r,a,i;const t={};for(const l of e.parameters)l&&(t[l.id]=l.default);const o=(r=(s=e.defaultPreset)==null?void 0:s.features)==null?void 0:r.geometry;o&&(o.juliaMode&&(t.juliaMode=1),(o.juliaX!==void 0||o.juliaY!==void 0||o.juliaZ!==void 0)&&(t.julia={x:o.juliaX??0,y:o.juliaY??0,z:o.juliaZ??0}));const n=(i=(a=e.defaultPreset)==null?void 0:a.features)==null?void 0:i.coreMath;if(n)for(const l of e.parameters)l&&n[l.id]!==void 0&&(t[l.id]=n[l.id]);return t}function Ao(e,t){var v,m,d,x;const o=Y.getState(),{def:n,preset:s}=rn(e);if(!n)throw new Error("No formula definition found in GMF");o.setSelectedFormula(n.id),o.setLoadedDefinition(n),o.setLoadedFilename(t??null),o.setLoadError(null);const r={},a=(v=s==null?void 0:s.features)==null?void 0:v.coreMath;for(const g of n.parameters)g&&(a&&a[g.id]!==void 0?r[g.id]=a[g.id]:r[g.id]=g.default);o.setFormulaParams(r),(a==null?void 0:a.iterations)!==void 0&&o.setIters(Math.round(a.iterations));const i=(m=s==null?void 0:s.features)==null?void 0:m.geometry;i&&(i.juliaMode&&(r.juliaMode=1),(i.juliaX!==void 0||i.juliaY!==void 0||i.juliaZ!==void 0)&&(r.julia={x:i.juliaX??0,y:i.juliaY??0,z:i.juliaZ??0}),o.setFormulaParams(r));const l=(d=s==null?void 0:s.features)==null?void 0:d.quality;l?(o.setQualitySettings({estimator:l.estimator??0,distanceMetric:l.distanceMetric??0,surfaceThreshold:0,fudgeFactor:l.fudgeFactor??1,detail:l.detail??1,pixelThreshold:l.pixelThreshold??.5}),l.distanceMetric!==void 0&&(r.distanceMetric=l.distanceMetric),l.deBailout!==void 0&&(r.deBailout=l.deBailout),(l.distanceMetric!==void 0||l.deBailout!==void 0)&&o.setFormulaParams(r)):o.setQualitySettings({...ze});const f=(x=s==null?void 0:s.features)==null?void 0:x.interlace;if(f!=null&&f.interlaceCompiled&&(f!=null&&f.interlaceFormula)){const g=Oe.get(f.interlaceFormula);if(g){const y={};for(const p of g.parameters){if(!p)continue;const E="interlace"+p.id.charAt(0).toUpperCase()+p.id.slice(1);f[E]!==void 0?y[p.id]=f[E]:y[p.id]=p.default}o.setInterlaceState({definition:g,params:y,enabled:f.interlaceEnabled!==!1,interval:f.interlaceInterval??2,startIter:f.interlaceStartIter??0})}else o.setInterlaceState(null)}else o.setInterlaceState(null)}const bn=()=>{const e=Y(),t=Y(f=>f.loadedFilename),o=Y(f=>f.loadError),n=de.useRef(null),r=Oe.getAll().map(f=>({label:f.name,value:f.id})),a=()=>{const f=Y.getState();return f.lastMesh||f.lastBlob?window.confirm("Changing formula will clear the current mesh and export data. Continue?"):!0},i=f=>{var m,d;if(!a())return;e.resetMeshResult(),e.setSelectedFormula(f);const v=Oe.get(f);if(v){e.setLoadedDefinition(v),e.setFormulaParams(Po(v)),e.setInterlaceState(null),e.setLoadedFilename(null),e.setLoadError(null);const x=(d=(m=v.defaultPreset)==null?void 0:m.features)==null?void 0:d.quality;e.setQualitySettings(x?{estimator:x.estimator??ze.estimator,distanceMetric:x.distanceMetric??ze.distanceMetric,surfaceThreshold:ze.surfaceThreshold,fudgeFactor:x.fudgeFactor??ze.fudgeFactor,detail:x.detail??ze.detail,pixelThreshold:x.pixelThreshold??ze.pixelThreshold}:{...ze})}},l=f=>{var d;const v=(d=f.target.files)==null?void 0:d[0];if(!v)return;if(!a()){f.target.value="";return}e.resetMeshResult(),e.setLoadError(null);const m=new FileReader;m.onload=()=>{try{Ao(m.result,v.name)}catch(x){console.error("Failed to load GMF file:",x),e.setLoadError("Failed to parse GMF: "+x.message),e.setLoadedFilename(null)}},m.readAsText(v),f.target.value=""};return b.jsxs("div",{className:"flex flex-col gap-1.5",children:[b.jsx(Te,{value:e.selectedFormulaId,options:r,onChange:i,fullWidth:!0}),b.jsx("button",{onClick:()=>{var f;return(f=n.current)==null?void 0:f.click()},className:"text-[11px] px-3 py-1.5 bg-sky-800/60 text-sky-200 border border-sky-600/40 rounded hover:bg-sky-700/60 cursor-pointer font-mono",children:"Load GMF..."}),t&&b.jsx("div",{className:"text-[10px] text-gray-400 truncate px-0.5",title:t,children:t}),o&&b.jsx("div",{className:"text-[10px] text-red-400 bg-red-900/20 px-2 py-1 rounded",children:o}),b.jsx("input",{ref:n,type:"file",accept:".gmf",className:"hidden",onChange:l})]})},_t=({primaryAxis:e,secondaryAxis:t,disabled:o,onHover:n})=>b.jsx("div",{className:`w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden transition-all duration-150 ease-out relative bg-white/[0.08] border border-white/5 ${o?"opacity-30 pointer-events-none":""}`,onMouseEnter:()=>n==null?void 0:n(!0),onMouseLeave:()=>n==null?void 0:n(!1),title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${t.toUpperCase()}`,children:b.jsx("div",{className:"absolute inset-0 flex items-center justify-center opacity-50",children:b.jsx("div",{className:"w-3 h-3 border border-white/20 rotate-45"})})}),Vt=({value:e,onChange:t,mode:o="normal",modeToggleable:n=!1,axes:s,axisConfig:r,showDualAxisPads:a=!0,showRotationGizmo:i=!1,label:l,disabled:f=!1,trackKeys:v,trackLabels:m,interactionMode:d="param",headerRight:x,onContextMenu:g,dataHelpId:y})=>{const p=e.w!==void 0,E=e.z!==void 0,[h,S]=Ce.useState(e),[C,N]=Ce.useState(null),[k,F]=Ce.useState(o),D=de.useRef(!1),V=de.useRef(null);de.useEffect(()=>{D.current||S(e)},[e.x,e.y,e.z,e.w,E,p]);const u=k==="rotation",c=Ce.useCallback(w=>{var I,G;return u?on:(r==null?void 0:r.mapping)||((I=s==null?void 0:s.x)==null?void 0:I.mapping)||((G=s==null?void 0:s.y)==null?void 0:G.mapping)},[u,r,s]),L=Ce.useCallback(w=>{if(u)return{min:-2*Math.PI,max:2*Math.PI};const I=(s==null?void 0:s[w])||r;return{min:(I==null?void 0:I.min)??-1e4,max:(I==null?void 0:I.max)??1e4,hardMin:I==null?void 0:I.hardMin,hardMax:I==null?void 0:I.hardMax}},[u,s,r]),P=Ce.useCallback(()=>{D.current=!0,V.current={...h}},[h]),B=Ce.useCallback(()=>{V.current=null,D.current=!1},[]),z=Ce.useCallback((w,I)=>{const G={...h,[w]:I};S(G),t(G)},[h,t]),T=Ce.useCallback((w,I,G,H)=>{const $={...V.current||h,[w]:G,[I]:H};S($),t($)},[h,t]),j=C==="xy",A=C==="xy"||C==="zy",M=C==="zy"||C==="wz",_=C==="wz",R=(w,I)=>{const G=L(I),H=c(I),X=s==null?void 0:s[I];return{variant:"compact",showTrack:!0,disabled:f,highlight:w===0?j:w===1?A:w===2?M:_,mapping:H,min:G.min,max:G.max,hardMin:G.hardMin,hardMax:G.hardMax,step:u?.01:(r==null?void 0:r.step)??(X==null?void 0:X.step)??.01,...r,...X}},O=()=>n?b.jsx("button",{onClick:()=>F(w=>w==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors ${k==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:k==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null;return b.jsxs("div",{className:"mb-px animate-slider-entry","data-help-id":y,onContextMenu:g,children:[l&&b.jsx("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:b.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[n&&O(),x,b.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${f?"text-gray-600":"text-gray-400"}`,children:[l,u&&b.jsx("span",{className:"text-[8px] text-cyan-400/60",children:"(π)"})]})]})}),b.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},children:b.jsxs("div",{className:"flex gap-px w-full h-full",children:[b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${ct[0].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"X"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Ie,{value:h.x,onChange:w=>z("x",w),onDragStart:P,onDragEnd:B,...R(0,"x")})})]}),a&&b.jsx(_t,{primaryAxis:"x",secondaryAxis:"y",primaryValue:h.x,secondaryValue:h.y,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(w,I)=>T("x","y",w,I),onDragStart:P,onDragEnd:B,disabled:f,onHover:w=>N(w?"xy":null)}),b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${ct[1].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"Y"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Ie,{value:h.y,onChange:w=>z("y",w),onDragStart:P,onDragEnd:B,...R(1,"y")})})]}),E&&a&&b.jsx(_t,{primaryAxis:"z",secondaryAxis:"y",primaryValue:h.z??0,secondaryValue:h.y,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(w,I)=>T("z","y",w,I),onDragStart:P,onDragEnd:B,disabled:f,onHover:w=>N(w?"zy":null)}),E&&b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${ct[2].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"Z"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Ie,{value:h.z??0,onChange:w=>z("z",w),onDragStart:P,onDragEnd:B,...R(2,"z")})})]}),p&&a&&b.jsx(_t,{primaryAxis:"x",secondaryAxis:"z",primaryValue:h.w??0,secondaryValue:h.z??0,min:r==null?void 0:r.min,max:r==null?void 0:r.max,step:r==null?void 0:r.step,onUpdate:(w,I)=>T("w","z",w,I),onDragStart:P,onDragEnd:B,disabled:f,onHover:w=>N(w?"wz":null)}),p&&b.jsxs("div",{className:"flex-1 flex items-center relative group",children:[b.jsx("div",{className:`absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center border-r border-white/10 bg-white/[0.05] pointer-events-none select-none z-10 ${ct[3].text}`,children:b.jsx("span",{className:"text-[10px] font-bold",children:"W"})}),b.jsx("div",{className:"flex-1 pl-5",children:b.jsx(Ie,{value:h.w??0,onChange:w=>z("w",w),onDragStart:P,onDragEnd:B,...R(3,"w")})})]})]})})]})},Io=({definition:e,params:t,onUpdate:o})=>{const n=Y(d=>d.loadedDefinition),s=Y(d=>d.formulaParams),r=Y(d=>d.updateParam),a=e||n,i=t||s,l=o||r;if(!a)return null;const f=a.parameters.filter(d=>d!==null),v=i.juliaMode??0,m=i.julia??{x:0,y:0,z:0};return b.jsxs("div",{className:"flex flex-col gap-px",children:[f.map(d=>{const x=i[d.id],g=d.type||"float";if(d.mode==="toggle"){const y=x?typeof x=="number"?x>0:!!x:!1;return b.jsx(Nt,{label:d.label,value:y,onChange:p=>l(d.id,p?1:0)},d.id)}if(g==="vec2"||g==="vec3"||g==="vec4"){const y=x??d.default??{x:0,y:0,z:0,w:0};return b.jsx(Vt,{label:d.label,value:y,onChange:p=>l(d.id,p),axisConfig:{min:d.min,max:d.max,step:d.step||.01},showDualAxisPads:g!=="vec2"},d.id)}return b.jsx(Ie,{label:d.label,value:x??d.default??0,onChange:y=>l(d.id,y),min:d.min,max:d.max,step:d.step||.01,defaultValue:d.default,variant:"full"},d.id)}),b.jsxs("div",{className:"border-t border-white/5 mt-1 pt-1",children:[b.jsx(Nt,{label:"Julia Mode",value:v>.5,onChange:d=>l("juliaMode",d?1:0)}),v>.5&&b.jsx(Vt,{label:"Julia Offset",value:m,onChange:d=>l("julia",d),axisConfig:{min:-4,max:4,step:.01}})]})]})};function Ye({label:e,children:t}){return b.jsxs("div",{className:"flex flex-col gap-px border-t border-white/5 first:border-t-0 pt-1 first:pt-0",children:[b.jsx("span",{className:"text-[9px] text-gray-500 uppercase tracking-wide px-0.5 mb-0.5",children:e}),t]})}function yn(){const e=Y(),t=Y(r=>r.qualitySettings),o=Y(r=>r.loadedDefinition),n=Y(r=>r.exportFormat)==="vdb",s=!!(o!=null&&o.shader.supportsCuttingPlane);return b.jsx(tt,{label:"Pipeline",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-1",children:[b.jsxs(Ye,{label:"Quality",children:[b.jsx(Te,{label:"Estimator",value:t.estimator,options:[{label:"Analytic (Log)",value:0},{label:"Linear (Fold 1.0)",value:1},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3},{label:"Linear (Fold 2.0)",value:4},{label:"Cutting Plane",value:5,disabled:!s}],onChange:r=>e.updateQuality("estimator",r)}),b.jsx(Te,{label:"Distance Metric",value:t.distanceMetric,options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],onChange:r=>e.updateQuality("distanceMetric",r)}),b.jsx(Ie,{label:"Surface Threshold",value:t.surfaceThreshold,onChange:r=>e.updateQuality("surfaceThreshold",r),min:0,max:2,step:.001,variant:"full"}),b.jsx(Ie,{label:"Fudge Factor",value:t.fudgeFactor,onChange:r=>e.updateQuality("fudgeFactor",r),min:.01,max:1,step:.01,variant:"full"}),b.jsx(Ie,{label:"Ray Detail",value:t.detail,onChange:r=>e.updateQuality("detail",r),min:.1,max:10,step:.1,variant:"full"}),b.jsx(Ie,{label:"Pixel Threshold",value:t.pixelThreshold,onChange:r=>e.updateQuality("pixelThreshold",r),min:.1,max:2,step:.1,variant:"full"})]}),b.jsxs(Ye,{label:"SDF",children:[b.jsxs("div",{className:"flex items-end gap-1",children:[b.jsx("div",{className:"flex-1",children:b.jsx(Te,{label:"Resolution",value:[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?e.resolution:"custom",options:[...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].map(r=>({label:`${r}³`,value:r})),...[32,64,128,256,384,512,768,1024,1536,2048,3072,4096].includes(e.resolution)?[]:[{label:`${e.resolution}³ (custom)`,value:e.resolution}]],onChange:r=>{typeof r=="number"&&e.setResolution(r)}})}),b.jsx("input",{type:"number",min:16,max:8192,step:1,value:e.resolution,onChange:r=>{const a=Math.max(16,Math.min(8192,parseInt(r.target.value)||512));e.setResolution(a)},className:"w-[60px] h-[26px] bg-gray-800 border border-gray-700 rounded text-[11px] text-gray-200 text-center font-mono",title:"Custom resolution (16–8192)"})]}),b.jsx(Te,{label:"DE Samples",value:e.deSamples,options:[{label:"1",value:1},{label:"2³ = 8",value:2},{label:"3³ = 27",value:3},{label:"4³ = 64",value:4}],onChange:e.setDeSamples}),b.jsx(Te,{label:"Z Sub-slices",value:e.zSubSlices,options:[1,2,4,8,16].map(r=>({label:r===1?"off":String(r),value:r})),onChange:e.setZSubSlices}),!n&&b.jsx(Te,{label:"DE Type",value:e.deType,options:[{label:"Auto",value:"auto"},{label:"Power",value:"power"},{label:"IFS",value:"ifs"}],onChange:e.setDeType})]}),!n&&b.jsxs(b.Fragment,{children:[b.jsxs(Ye,{label:"Filter",children:[b.jsx(Te,{label:"Min Feature",value:e.minFeature,options:[{label:"Auto",value:"auto"},{label:"Off",value:"off"},{label:"1x voxel",value:"1"},{label:"1.5x",value:"1.5"},{label:"2x",value:"2"},{label:"3x",value:"3"},{label:"5x",value:"5"}],onChange:e.setMinFeature}),b.jsx(Te,{label:"Cavity Fill",value:e.cavityFill,options:[{label:"Off",value:"off"},{label:"Dilate 1",value:"1"},{label:"Dilate 2",value:"2"},{label:"Dilate 4",value:"4"},{label:"Dilate 8",value:"8"},{label:"Dilate 16",value:"16"},{label:"Escape Test",value:"escape"}],onChange:e.setCavityFill}),b.jsx(Ie,{label:"Closing",value:e.closingRadius,onChange:e.setClosingRadius,min:0,max:20,step:.5,variant:"full"})]}),b.jsxs(Ye,{label:"Newton",children:[b.jsx(Nt,{label:"Newton Projection",value:e.newton,onChange:e.setNewton}),b.jsx(Te,{label:"Steps",value:e.newtonSteps,options:[2,4,6,8,12,16].map(r=>({label:String(r),value:r})),onChange:e.setNewtonSteps,disabled:!e.newton})]}),b.jsxs(Ye,{label:"Smooth",children:[b.jsx(Ie,{label:"Passes",value:e.smoothPasses,onChange:e.setSmoothPasses,min:0,max:50,step:1,variant:"full"}),b.jsx(Te,{label:"Lambda",value:e.smoothLambda,options:[{label:"0.3 (gentle)",value:.3},{label:"0.5 (standard)",value:.5},{label:"0.7 (strong)",value:.7}],onChange:e.setSmoothLambda})]}),b.jsxs(Ye,{label:"Color",children:[b.jsx(Te,{label:"Samples",value:e.colorSamples,options:[1,4,8,16,32,64,128,256].map(r=>({label:r===1?"off":String(r),value:r})),onChange:e.setColorSamples}),b.jsx(Te,{label:"Jitter Radius",value:e.colorJitter,options:[.25,.5,1,2].map(r=>({label:`${r}x`,value:r})),onChange:e.setColorJitter})]})]})]})})}const Ht=`
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = max(dot(z,z), 1.0e-9);
    float minR2 = max(minR * minR, 1.0e-9);
    float fixedR2 = max(fixedR * fixedR, 1.0e-9);
    float k = clamp(fixedR2 / r2, 1.0, fixedR2 / minR2);
    z *= k; dz *= k;
}`,Yt=`
void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}`;function Do(e){return`
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
${Ht}
${Yt}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

// Shared transforms (Rodrigues rotation, twist)
${ln}

// Simplex noise (Stefan Gustavson)
${Do("_")}
`,Ro=`
#define PI 3.14159265
#define TAU 6.28318530
#define INV_TAU 0.15915494
#define INV_PI  0.31830989
const float phi = 1.61803398875;
`,wn=e=>`
// Constants
${Ro}
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

${Ht}
${Yt}

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
`;function qt(e){if(e.shader.getDist)return"custom";const t=e.shader.function+" "+e.shader.loopBody+" "+(e.shader.preamble||"");return/boxFold|sphereFold/.test(t)||/dr\s*=\s*dr\s*\*\s*\w/.test(t)&&!/pow\s*\(/.test(t)||/abs\s*\(\s*z/.test(t)&&/dr\s*[\*=]/.test(t)&&!/pow\s*\(/.test(t)?"ifs":"power"}function Lo(e){return e.deType!=="auto"?e.deType:qt(e.definition)}function _o(e){return e.shader.getDist?`
vec2 _getDistCustom(float r, float safeDr, float iter, vec4 z) {
  float dr = safeDr;
  ${e.shader.getDist}
}
`:""}function so(e,t=!1){return e>4.5&&!t&&(e=1),e<.5?`float logR2 = log2(r * r);
    return 0.17328679 * logR2 * r / safeDr;`:e<1.5?"return (r - 1.0) / safeDr;":e<2.5?"return r / safeDr;":e<3.5?`float logR2 = log2(r * r);
    return 0.34657359 * logR2 * r / (safeDr + 8.0);`:e<4.5?"return (r - 2.0) / safeDr;":"return abs(cp_dmin);"}function Bo(e,t,o,n,s=!1){const r=n!==void 0&&n>4.5&&s;if(t&&!r)return e==="ifs"?`return _getDistCustom(r, safeDr, iter, z).x - ${o};`:"return _getDistCustom(r, safeDr, iter, z).x;";if(n!==void 0&&n>0){const a=so(n,s);if(n>=.5&&n<1.5||n>=3.5){const i=a.split(`
`),l=i[i.length-1];return i[i.length-1]=l.replace(/;$/,` - ${o};`),i.join(`
`)}if(e!=="ifs")return`if (r > 2.0) { ${a} }
    return -1.0;`}return e==="power"?`// Power fractals: orbit must escape (r > 2) for valid DE.
    // Non-escaped = interior sentinel.
    if (r > 2.0) { ${so(0)} }
    return -1.0;`:`return (r - 1.0) / safeDr - ${o};`}function wt(){const{scalars:e,vec2s:t,vec3s:o,vec4s:n}=ot;return`
uniform float ${e.join(", ")};
uniform vec2  ${t.join(", ")};
uniform vec3  ${o.join(", ")};
uniform vec4  ${n.join(", ")};
uniform float uInterlaceEnabled;
uniform float uInterlaceInterval;
uniform float uInterlaceStartIter;
`}function St(e){const t=e.definition;let o="";t.shader.preamble&&(o=cn(t.shader.preamble,t.id,t.shader.preambleVars));const n=un(t.shader.function,t.id,t.shader.preambleVars);let s="";return t.shader.loopInit&&(s=Fo(t.shader.loopInit,t.id,t.shader.preambleVars)),{preamble:o,func:n,loopInit:s}}function He(e,t){return fn(e,t==null?void 0:t.definition,"estimator:cutting-plane")}function Ct(e,t,o){let n="",s="";if(o){const i=dn(o.definition.shader.loopBody,o.definition.id);let l="";o.definition.shader.loopInit&&(l=Fo(o.definition.shader.loopInit,o.definition.id,o.definition.shader.preambleVars));const f=!!o.definition.shader.usesSharedRotation;({preLoop:n,inLoop:s}=mn(i,l,f))}const r=o?`if (!skipMainFormula) { ${e.shader.loopBody} }`:e.shader.loopBody;return`  vec4 z = vec4(pos, 0.0);
  vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
  float dr = 1.0;
  float trap = 1e10;
  float iter = 0.0;
  ${He(e,o)?"cp_dmin = -1e10; cp_scale = 1.0; cp_trap = 1e10;":""}
  ${e.shader.loopInit||""}
  ${n}

  for (int i = 0; i < 100; i++) {
    if (i >= ${t}) break;
    float r2 = dot(z.xyz, z.xyz);
    if (r2 > 1e4) break;
    ${o?"bool skipMainFormula = false;":""}
    ${s}
    ${r}
    iter += 1.0;
  }`}const Qe=`#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 2 - 1, (gl_VertexID >> 1) * 2 - 1);
  gl_Position = vec4(p, 0, 1);
}`;function Sn(e){const t=e.definition,o=e.interlace,n=o?St(o):null;return`#version 300 es
precision highp float;
uniform float uZ;
uniform float uPower;
uniform int   uIters;
uniform float uInvRes;
uniform vec2  uTileOffset;
uniform vec3  uBoundsMin;
uniform float uBoundsRange;
${at}
${o?wt():""}
out vec4 fragColor;

${bt}

${He(t,o)?yt:""}
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
}`}function Cn(e){const t=e.definition,o=Lo(e),n=e.interlace,s=n?St(n):null,r=_o(t),a=Bo(o,!!t.shader.getDist,"uVoxelSize * 0.5",e.estimator,He(t,n));return`#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int   uIters;
uniform float uVoxelSize;
uniform int   uNewtonSteps;
${at}
${n?wt():""}

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outNormal;

${bt}

${He(t,n)?yt:""}
${t.shader.preamble||""}
${(s==null?void 0:s.preamble)||""}

// --- Formula function ---
${t.shader.function}
${(s==null?void 0:s.func)||""}

${r}
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
}`}function zo(e){const t=e.definition,o=e.interlace,n=o?St(o):null;return`#version 300 es
// GMT mesh-color ${Date.now()}
precision highp float;
uniform sampler2D uPositions;
uniform float uPower;
uniform int uIters;
uniform int uWidth;
uniform vec3 uJitterOffset;
${at}
${o?wt():""}
out vec4 fragColor;

${bt}

${He(t,o)?yt:""}
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
}`}function Mn(e){const t=e.definition,o=Lo(e),n=e.interlace,s=n?St(n):null,r=_o(t),a=o==="ifs"?"0.0":"0.001",i=Bo(o,!!t.shader.getDist,a,e.estimator,He(t,n));return`#version 300 es
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
${n?wt():""}
out vec4 fragColor;

${bt}

${He(t,n)?yt:""}
${t.shader.preamble||""}
${(s==null?void 0:s.preamble)||""}

${t.shader.function}
${(s==null?void 0:s.func)||""}

${r}
float formulaDE(vec3 pos, float power, int iters) {
${Ct(t,"iters",n)}

  float r = length(z.xyz);
  float safeDr = max(abs(dr), 1e-10);
  ${i}
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
}`}const qe=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF","uVec2A","uVec2B","uVec2C","uVec3A","uVec3B","uVec3C","uVec4A","uVec4B","uVec4C","uJulia","uJuliaMode","uEscapeThresh","uDeBailout","uDistanceMetric",...ot.scalars,...ot.vec2s,...ot.vec3s,...ot.vec4s,"uInterlaceEnabled","uInterlaceInterval","uInterlaceStartIter","uFudgeFactor","uDetail","uPixelThreshold","uSurfaceThreshold","uClipBounds","uBoundsMin","uBoundsMax"];hn();const ko=[{name:me.Time,type:"float",default:0},{name:me.FrameCount,type:"int",default:0},{name:me.Resolution,type:"vec2",default:new Be(100,100)},{name:me.SceneOffsetHigh,type:"vec3",default:new Ve},{name:me.SceneOffsetLow,type:"vec3",default:new Ve},{name:me.CameraPosition,type:"vec3",default:new Ve},{name:me.CamBasisX,type:"vec3",default:new Ve},{name:me.CamBasisY,type:"vec3",default:new Ve},{name:me.CamForward,type:"vec3",default:new Ve},{name:me.RegionMin,type:"vec2",default:new Be(0,0)},{name:me.RegionMax,type:"vec2",default:new Be(1,1)},{name:me.ImageTileOrigin,type:"vec2",default:new Be(0,0)},{name:me.ImageTileSize,type:"vec2",default:new Be(1,1)},{name:me.FullOutputResolution,type:"vec2",default:new Be(100,100)},{name:me.TilePixelOrigin,type:"vec2",default:new Be(0,0)},{name:me.HistoryTexture,type:"sampler2D",default:null},{name:me.BlendFactor,type:"float",default:1},{name:me.Jitter,type:"vec2",default:new Be(0,0)},{name:me.BlueNoiseTexture,type:"sampler2D",default:null},{name:me.BlueNoiseResolution,type:"vec2",default:new Be(128,128)},{name:me.HistogramLayer,type:"int",default:0},{name:me.InternalScale,type:"float",default:1},{name:me.PixelSizeBase,type:"float",default:.01,comment:"CPU: length(uCamBasisY)/resolution.y*2, avoids per-fragment sqrt"},{name:me.OutputPass,type:"float",default:0,comment:"0=beauty, 1=alpha, 2=depth"},{name:me.DepthMin,type:"float",default:0},{name:me.DepthMax,type:"float",default:5},{name:me.PreRotMatrix,type:"mat3",default:new Lt},{name:me.PostRotMatrix,type:"mat3",default:new Lt},{name:me.WorldRotMatrix,type:"mat3",default:new Lt},{name:me.EnvRotationMatrix,type:"mat2",default:[1,0,0,1]},{name:me.FogColorLinear,type:"vec3",default:new Ve(0,0,0),comment:"CPU: InverseACESFilm(uFogColor)"}],Wt=Eo.getUniformDefinitions(),Tn=new Set(ko.map(e=>e.name)),ro=Wt.filter(e=>Tn.has(e.name)).map(e=>e.name);if(ro.length>0)throw new Error(`[UniformSchema] Feature uniform(s) shadow base schema: ${ro.join(", ")}. Rename in the feature def (themed prefix: uPT*/uLight*/uModular*) or remove the base entry.`);const io=new Set,$t=[];for(const e of Wt)io.has(e.name)?$t.push(e.name):io.add(e.name);if($t.length>0)throw new Error(`[UniformSchema] Two features declare the same uniform: ${$t.join(", ")}. Rename one (themed prefix convention: uPT*/uLight*/uModular*).`);const Oo=[...ko,...Wt];Oo.reduce((e,t)=>(e[t.name]=t.default,e),{});const En=()=>{let e=`precision highp float;
precision highp int;

`;return Oo.forEach(t=>{t.backingOnly||(t.arraySize?e+=`uniform ${t.type} ${t.name}[${t.arraySize}];
`:e+=`uniform ${t.type} ${t.name};
`)}),e+=`
in vec2 vUv;
`,e},Fn=En(),lo=(e,t="",o,n="",s="",r="",a="",i="",l="",f="",v="",m="",d="")=>{const x=r.includes("skipMainFormula");return`
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
    // Absolute raymarch bailout (uDeBailout, default 100), decoupled from the
    // escape/coloring threshold. High = accurate analytic DE, sharp surfaces;
    // low = early bail that slices the fractal into shells (overstep artifacts
    // by design). When bailout < uEscapeThresh the decomp/potential capture
    // below never fires — accepted tradeoff for the slicing effect. Floored at
    // 1.0 so |z|² stays ≥ 1 (keeps log-based DEs well-defined).
    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${x?"bool skipMainFormula = false;":""}

        ${r}

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

        // Geometric trap — accumulates here (post-formula, pre-snapshot) so
        // it shares z state + snapshot timing with g_orbitTrap above. The
        // older addHybridFold position fired BEFORE the formula step and
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

        ${i}
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

    ${f}

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
    ${m}

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

    // Geometry-only twin of map()'s bailout — see that comment for the rationale.
    float bailout = max(uDeBailout, 1.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${x?"bool skipMainFormula = false;":""}

        ${r}

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
    ${d}

    return finalD;
}

// Wrapper for Coloring
vec4 DE(vec3 p_ray) {
    return map(p_ray + uCameraPosition);
}

// Wrapper for Geometry (Shadows/AO/Normals)
float DE_Dist(vec3 p_ray) {
    return mapDist(p_ray + uCameraPosition);
}`},Pn=(e="")=>`
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
}`,An=(e,t,o="")=>`
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
        if (uDOFStrength > 0.00001) needNoise = true;
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
`,Bt=(e,t,o=0,n=0,s="",r="",a="traceScene")=>{const l=o===1||e?`
        float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);  // Low precision: ~10 ppm
    `:`
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);  // High precision: ~0.5 ppm
    `,f=r.trim().length>0?`vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = MISS_DIST;
    vec3 p = p_end;
    ${r}`:"h = vec4(MISS_DIST, 0.0, 0.0, 0.0);";return`
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool ${a}(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric, out vec3 fogScatter) {
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

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        
        // A. Distance Estimation
        // When no per-step volumetric body needs trap data, use mapDist() —
        // distance only, skipping orbit-trap mins / decomposition / smoothing.
        h = map(p + uCameraPosition);
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${s}
        
        // C. Precision
        vec3 p_fractal_approx = p + worldOriginOffset;
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

            // Populate full map() data (orbit-trap, iter, decomposition) once
            // at the hit point — only the distance was tracked through the
            // inner loop when innerVolumeBodyEmpty is true. No-op otherwise.
            

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
            ${r}
            
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
             
             ${r}
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
`},zt=`
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
`,In=(e="")=>`
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
`,Dn=(e="")=>`
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane)
vec3 applyEnvFog(vec3 env) {
    if (uFogIntensity < 0.001 || uFogFar >= 1000.0) return env;
    float fogFactor = uFogIntensity;
    return mix(env, uFogColorLinear, fogFactor);
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
`,kt=`
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
`;class Rn{constructor(t){oe(this,"defines",new Map);oe(this,"uniforms",new Map);oe(this,"preDEFunctions",[]);oe(this,"postDEFunctions",[]);oe(this,"integrators",[]);oe(this,"headers",[]);oe(this,"preambles",[]);oe(this,"postMapCode",[]);oe(this,"postDistCode",[]);oe(this,"materialLogic",[]);oe(this,"compositeLogic",[]);oe(this,"missLogic",[]);oe(this,"volumeBody",[]);oe(this,"volumeFinalize",[]);oe(this,"postProcessLogic",[]);oe(this,"shadingReflectionCode",[]);oe(this,"needsShading",!1);oe(this,"hybridInit",[]);oe(this,"hybridPreLoop",[]);oe(this,"hybridInLoop",[]);oe(this,"formulaLoopBody","");oe(this,"formulaInit","");oe(this,"formulaDist","");oe(this,"distOverrideInit","");oe(this,"distOverrideInLoopFull","");oe(this,"distOverrideInLoopGeom","");oe(this,"distOverridePostFull","");oe(this,"distOverridePostGeom","");oe(this,"useRotation",!0);oe(this,"renderMode","Direct");oe(this,"isLite",!1);oe(this,"precisionMode",0);oe(this,"maxLights",0);oe(this,"physicsRayGen",`
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
`}),t}buildUniformsString(){let t=Fn+`
`;return this.uniforms.forEach((o,n)=>{o.arraySize?t+=`uniform ${o.type} ${n}[${o.arraySize}];
`:t+=`uniform ${o.type} ${n};
`}),t}buildMeshSDFLibrary(){let t="";this.uniforms.forEach((s,r)=>{s.arraySize?t+=`uniform ${s.type} ${r}[${s.arraySize}];
`:t+=`uniform ${s.type} ${r};
`});const o=lo(this.formulaLoopBody,this.formulaInit,this.formulaDist,this.hybridInit.join(`
`),this.hybridPreLoop.join(`
`),this.hybridInLoop.join(`
`),this.distOverrideInit,this.distOverrideInLoopFull,this.distOverrideInLoopGeom,this.distOverridePostFull,this.distOverridePostGeom,this.postMapCode.join(`
`),this.postDistCode.join(`
`)),n=`
${Ht}
${Yt}

float getLength(vec3 p) { return length(p); }

void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}

${Do("_")}
`;return`
#define MAX_HARD_ITERATIONS 100

// Math constants shared with the main renderer (PI, TAU, INV_TAU, INV_PI, phi)
${Ro}

${at}

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
`),r=this.preDEFunctions.join(`
`),a=this.postDEFunctions.join(`
`);if(this.needsShading){const h=this.shadingReflectionCode.join(`
`);this.integrators.push(Dn(h))}const i=this.integrators.join(`
`),l=wn(this.useRotation),f=lo(this.formulaLoopBody,this.formulaInit,this.formulaDist,this.hybridInit.join(`
`),this.hybridPreLoop.join(`
`),this.hybridInLoop.join(`
`),this.distOverrideInit,this.distOverrideInLoopFull,this.distOverrideInLoopGeom,this.distOverridePostFull,this.distOverridePostGeom,this.postMapCode.join(`
`),this.postDistCode.join(`
`));if(this.variant==="Physics")return`
${t}
${o}
${l}
${kt}
${zt}
${n}
${s}
${r}
${f}


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
`;if(this.variant==="Histogram"){const h=Bt(!1,!1,this.precisionMode,0,"",""),S=co("Direct");return`
${t}
${o}
${l}
${kt}
${zt}
${n}
${s}
${r}
${f}
${a}

${h}
${S}

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
`}const v=Pn(this.materialLogic.join(`
`)),m=this.buildMissHandler(),d=this.renderMode==="PathTracing",x=Bt(this.isLite,!0,this.precisionMode,0,this.volumeBody.join(`
`),this.volumeFinalize.join(`
`)),g=d?Bt(this.isLite,!1,this.precisionMode,0,"","","traceSceneLean"):"",y=An(d,this.maxLights,this.compositeLogic.join(`
`)),p=co(this.renderMode),E=In(this.postProcessLogic.join(`
`));return`
${t}
${o}
${n}
${l}
${kt}
${zt}

${s}

${r}

${f}

${a}

${v}

${m}

${p}

${x}
${g}

${i}

${E}
${y}
`}}class Ln{static generateFragmentShader(t){return this.buildShader(t,"Main")}static generatePhysicsShader(t){return this.buildShader(t,"Physics")}static generateHistogramShader(t){return this.buildShader(t,"Histogram")}static generateMeshSDFLibrary(t){return this.buildShader(t,"Mesh")}static buildShader(t,o){const n=new Rn(o),s=t.lighting,a=(s==null?void 0:s.ptEnabled)!==!1&&(t.renderMode==="PathTracing"||(s==null?void 0:s.renderMode)===1);n.setRenderMode(a?"PathTracing":"Direct");const i=t.quality||{};return n.setQuality(i.precisionMode===1,i.precisionMode??0),Eo.getAll().forEach(f=>{f.inject&&f.inject(n,t,o)}),n.buildFragment()}}class mt{constructor(t=65536){oe(this,"data");oe(this,"length");this.data=new Float32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,r=new Float32Array(s);r.set(this.data),this.data=r}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}class jo{constructor(t=65536){oe(this,"data");oe(this,"length");this.data=new Uint32Array(t),this.length=0}push3(t,o,n){if(this.length+3>this.data.length){const s=this.data.length*2,r=new Uint32Array(s);r.set(this.data),this.data=r}this.data[this.length++]=t,this.data[this.length++]=o,this.data[this.length++]=n}trim(){return this.data.subarray(0,this.length)}}function Ue(e,t,o,n,s){return o=o|0,n=n|0,s=s|0,o=o<0?0:o>=t?t-1:o,n=n<0?0:n>=t?t-1:n,s=s<0?0:s>=t?t-1:s,e[(s*t+n)*t+o]}function Xe(e,t,o,n,s){const r=Math.floor(o),a=Math.floor(n),i=Math.floor(s),l=o-r,f=n-a,v=s-i,m=Ue(e,t,r,a,i),d=Ue(e,t,r+1,a,i),x=Ue(e,t,r,a+1,i),g=Ue(e,t,r+1,a+1,i),y=Ue(e,t,r,a,i+1),p=Ue(e,t,r+1,a,i+1),E=Ue(e,t,r,a+1,i+1),h=Ue(e,t,r+1,a+1,i+1),S=m*(1-l)+d*l,C=x*(1-l)+g*l,N=y*(1-l)+p*l,k=E*(1-l)+h*l,F=S*(1-f)+C*f,D=N*(1-f)+k*f;return F*(1-v)+D*v}function uo(e,t,o,n,s){const a=Xe(e,t,o+.5,n,s)-Xe(e,t,o-.5,n,s),i=Xe(e,t,o,n+.5,s)-Xe(e,t,o,n-.5,s),l=Xe(e,t,o,n,s+.5)-Xe(e,t,o,n,s-.5),f=Math.sqrt(a*a+i*i+l*l);if(f<1e-10)return[0,1,0];const v=1/f;return[a*v,i*v,l*v]}function Se(e,t,o,n){return o+e/(t-1)*(n-o)}function We(e,t,o,n){return(e-o)/(n-o)*(t-1)}const ht=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];function Uo(e,t,o){if(e.length===0)return null;let n=0,s=0,r=0;for(let D=0;D<e.length;D++)n+=e[D].point[0],s+=e[D].point[1],r+=e[D].point[2];const a=1/e.length;n*=a,s*=a,r*=a;let i=0,l=0,f=0,v=0,m=0,d=0,x=0,g=0,y=0;for(let D=0;D<e.length;D++){const V=e[D].normal,u=e[D].point,c=V[0]*u[0]+V[1]*u[1]+V[2]*u[2];i+=V[0]*V[0],l+=V[0]*V[1],f+=V[0]*V[2],v+=V[1]*V[1],m+=V[1]*V[2],d+=V[2]*V[2],x+=V[0]*c,g+=V[1]*c,y+=V[2]*c}const p=.01;i+=p,v+=p,d+=p,x+=p*n,g+=p*s,y+=p*r;const E=i*(v*d-m*m)-l*(l*d-m*f)+f*(l*m-v*f);let h,S,C;if(Math.abs(E)<1e-6)h=n,S=s,C=r;else{const D=1/E;h=D*(x*(v*d-m*m)-l*(g*d-m*y)+f*(g*m-v*y)),S=D*(i*(g*d-m*y)-x*(l*d-m*f)+f*(l*y-g*f)),C=D*(i*(v*y-g*m)-l*(l*y-g*f)+x*(l*m-v*f))}const N=(o[0]-t[0])*.1,k=(o[1]-t[1])*.1,F=(o[2]-t[2])*.1;return h=Math.max(t[0]-N,Math.min(o[0]+N,h)),S=Math.max(t[1]-k,Math.min(o[1]+k,S)),C=Math.max(t[2]-F,Math.min(o[2]+F,C)),[h,S,C]}let Zt=!1;function _n(){Zt=!0}function fo(){Zt=!1}function mo(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(Zt)throw new Error("CANCELLED")})}async function Bn(e,t,o,n,s,r=()=>{}){const a=t-1;r("contouring",0);const i=new Map,l=new mt(8192),f=new mt(8192);let v=0;for(let k=0;k<a;k++){k&7||(r("contouring",Math.round(40*k/a)),await mo());for(let F=0;F<a;F++)for(let D=0;D<a;D++){const V=e[(k*t+F)*t+D],u=V>=0,c=[V,e[(k*t+F)*t+D+1],e[(k*t+(F+1))*t+D],e[(k*t+(F+1))*t+D+1],e[((k+1)*t+F)*t+D],e[((k+1)*t+F)*t+D+1],e[((k+1)*t+(F+1))*t+D],e[((k+1)*t+(F+1))*t+D+1]];let L=!1;for(let M=1;M<8;M++)if(c[M]>=0!==u){L=!0;break}if(!L)continue;const P=[];for(let M=0;M<12;M++){const _=ht[M],R=c[_[0]],O=c[_[1]];if(R>=0==O>=0)continue;const w=D+(_[0]&1),I=F+(_[0]>>1&1),G=k+(_[0]>>2&1),H=D+(_[1]&1),X=F+(_[1]>>1&1),$=k+(_[1]>>2&1);let U=w,Z=I,Q=G,ne=H,K=X,ee=$,re=R;for(let W=0;W<8;W++){const te=(U+ne)*.5,ce=(Z+K)*.5,se=(Q+ee)*.5,J=Xe(e,t,te,ce,se);J>=0==re>=0?(U=te,Z=ce,Q=se,re=J):(ne=te,K=ce,ee=se)}const ie=(U+ne)*.5,le=(Z+K)*.5,ve=(Q+ee)*.5,q=uo(e,t,ie,le,ve);P.push({point:[Se(ie,t,o[0],n[0]),Se(le,t,o[1],n[1]),Se(ve,t,o[2],n[2])],normal:q})}if(P.length===0)continue;const B=[Se(D,t,o[0],n[0]),Se(F,t,o[1],n[1]),Se(k,t,o[2],n[2])],z=[Se(D+1,t,o[0],n[0]),Se(F+1,t,o[1],n[1]),Se(k+1,t,o[2],n[2])],T=Uo(P,B,z);if(!T)continue;const j=uo(e,t,We(T[0],t,o[0],n[0]),We(T[1],t,o[1],n[1]),We(T[2],t,o[2],n[2])),A=(k*a+F)*a+D;i.set(A,v),l.push3(T[0],T[1],T[2]),f.push3(j[0],j[1],j[2]),v++}}if(r("contouring",50),console.log("DC: "+v+" vertices from "+i.size+" cells"),v===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const m=new jo(8192),d=new Set;let x=0,g=0,y=0;const p=i.size,E=Array.from(i.entries());for(let k=0;k<E.length;k++){E[k][1];const F=E[k][0];y++;const D=F%a,V=(F/a|0)%a,u=F/(a*a)|0;for(let c=0;c<12;c++){const L=ht[c],P=D+(L[0]&1),B=V+(L[0]>>1&1),z=u+(L[0]>>2&1),T=D+(L[1]&1),j=V+(L[1]>>1&1),A=u+(L[1]>>2&1),M=e[(z*t+B)*t+P],_=e[(A*t+j)*t+T];if(M>=0==_>=0)continue;let R;const O=Math.min(P,T),w=Math.min(B,j),I=Math.min(z,A);P!==T?R=0:B!==j?R=1:R=2;const G=(I*t+w)*t*4+O*4+R;if(d.has(G))continue;d.add(G),x++;const H=(R+1)%3,X=(R+2)%3,$=[O,w,I],U=[-1,-1,-1,-1];let Z=!0;for(let ne=0;ne<4;ne++){const K=[$[0],$[1],$[2]];if(K[H]-=ne&1?0:1,K[X]-=ne&2?0:1,K[0]<0||K[1]<0||K[2]<0||K[0]>=a||K[1]>=a||K[2]>=a){Z=!1;break}const ee=(K[2]*a+K[1])*a+K[0],re=i.get(ee);if(re===void 0){Z=!1;break}U[ne]=re}if(!Z){g++;continue}const Q=M>=0;U[0]!==U[1]&&U[0]!==U[3]&&U[1]!==U[3]&&(Q?m.push3(U[0],U[3],U[1]):m.push3(U[0],U[1],U[3])),U[0]!==U[2]&&U[0]!==U[3]&&U[2]!==U[3]&&(Q?m.push3(U[0],U[2],U[3]):m.push3(U[0],U[3],U[2]))}y&4095||(r("contouring",50+Math.round(50*y/p)),await mo())}r("contouring",100),console.log("DC: "+x+" sign-change edges, "+g+" dropped (boundary), "+m.length/3+" faces");const h=l.trim(),S=f.trim(),C=m.trim(),N=Math.floor(m.length/3);return{positions:h,normals:S,indices:C,vertexCount:v,faceCount:N}}let Jt=!1;function zn(){Jt=!0}function ho(){Jt=!1}function Ot(){return new Promise(e=>setTimeout(e,0)).then(()=>{if(Jt)throw new Error("CANCELLED")})}class kn{constructor(t,o=8,n=1){oe(this,"N");oe(this,"blockSize");oe(this,"defaultValue");oe(this,"blocksPerAxis");oe(this,"blockCellCount");oe(this,"blocks");oe(this,"allocatedCount");this.N=t,this.blockSize=o,this.defaultValue=n,this.blocksPerAxis=Math.ceil(t/o),this.blockCellCount=o*o*o,this.blocks=new Map,this.allocatedCount=0}blockKey(t,o,n){return(n*this.blocksPerAxis+o)*this.blocksPerAxis+t}allocateBlock(t,o,n){const s=this.blockKey(t,o,n);if(!this.blocks.has(s)){const r=new Float32Array(this.blockCellCount);r.fill(this.defaultValue),this.blocks.set(s,r),this.allocatedCount++}return this.blocks.get(s)}hasBlock(t,o,n){return this.blocks.has(this.blockKey(t,o,n))}set(t,o,n,s){const r=this.blockSize,a=t/r|0,i=o/r|0,l=n/r|0,f=this.allocateBlock(a,i,l),v=t-a*r,m=o-i*r,d=n-l*r;f[(d*r+m)*r+v]=s}get(t,o,n){if(t<0||o<0||n<0||t>=this.N||o>=this.N||n>=this.N)return this.defaultValue;const s=this.blockSize,r=t/s|0,a=o/s|0,i=n/s|0,l=this.blockKey(r,a,i),f=this.blocks.get(l);if(!f)return this.defaultValue;const v=t-r*s,m=o-a*s,d=n-i*s;return f[(d*s+m)*s+v]}lerp(t,o,n){const s=Math.floor(t),r=Math.floor(o),a=Math.floor(n),i=t-s,l=o-r,f=n-a,v=this.get(s,r,a),m=this.get(s+1,r,a),d=this.get(s,r+1,a),x=this.get(s+1,r+1,a),g=this.get(s,r,a+1),y=this.get(s+1,r,a+1),p=this.get(s,r+1,a+1),E=this.get(s+1,r+1,a+1),h=v*(1-i)+m*i,S=d*(1-i)+x*i,C=g*(1-i)+y*i,N=p*(1-i)+E*i,k=h*(1-l)+S*l,F=C*(1-l)+N*l;return k*(1-f)+F*f}gradient(t,o,n){const r=this.lerp(t+.5,o,n)-this.lerp(t-.5,o,n),a=this.lerp(t,o+.5,n)-this.lerp(t,o-.5,n),i=this.lerp(t,o,n+.5)-this.lerp(t,o,n-.5),l=Math.sqrt(r*r+a*a+i*i);if(l<1e-10)return[0,1,0];const f=1/l;return[r*f,a*f,i*f]}memoryMB(){return this.allocatedCount*this.blockCellCount*4/(1024*1024)}}function On(e,t,o,n=8,s=2){const r=o/t,a=Math.ceil(o/n),i=new Set;for(let v=0;v<t-1;v++)for(let m=0;m<t-1;m++)for(let d=0;d<t-1;d++){const g=e[(v*t+m)*t+d]>=0;let y=!1;for(let p=0;p<=1&&!y;p++)for(let E=0;E<=1&&!y;E++)for(let h=0;h<=1;h++){if(h===0&&E===0&&p===0)continue;if(e[((v+p)*t+(m+E))*t+(d+h)]>=0!==g){y=!0;break}}if(y)for(let p=-s;p<=s;p++)for(let E=-s;E<=s;E++)for(let h=-s;h<=s;h++){const S=d+h,C=m+E,N=v+p;S>=0&&C>=0&&N>=0&&S<t&&C<t&&N<t&&i.add((N*t+C)*t+S)}}const l=new kn(o,n,1);let f=0;return i.forEach(v=>{const m=v%t,d=(v/t|0)%t,x=v/(t*t)|0,g=Math.floor(m*r),y=Math.floor(d*r),p=Math.floor(x*r),E=Math.ceil((m+1)*r),h=Math.ceil((d+1)*r),S=Math.ceil((x+1)*r),C=g/n|0,N=y/n|0,k=p/n|0,F=Math.min(a-1,E/n|0),D=Math.min(a-1,h/n|0),V=Math.min(a-1,S/n|0);for(let u=k;u<=V;u++)for(let c=N;c<=D;c++)for(let L=C;L<=F;L++)l.hasBlock(L,c,u)||(l.allocateBlock(L,c,u),f++)}),console.log("Narrow band: "+i.size+" coarse surface cells -> "+f+" fine blocks ("+l.memoryMB().toFixed(1)+" MB) out of "+a*a*a+" total blocks"),{grid:l,surfaceCells:i,bandBlockCount:f}}function Qt(e,t){const o=e.blockSize,n=e.blocksPerAxis;e.blocks.forEach((s,r)=>{const a=r%n,i=(r/n|0)%n,l=r/(n*n)|0;t(a,i,l,a*o,i*o,l*o)})}async function jn(e,t,o,n=()=>{}){const s=e.N,r=s-1,a=e.blockSize,i=e.blocksPerAxis;let l=new Map,f=null;function v(T,j,A,M){const _=T/a|0,R=j/a|0,O=A/a|0,w=e.blockKey(_,R,O),I=T-_*a,G=j-R*a,X=((A-O*a)*a+G)*a+I;let $=l.get(w);$||($={locals:[],globals:[]},l.set(w,$)),$.locals.push(X),$.globals.push(M)}function m(T,j,A){const M=T/a|0,_=j/a|0,R=A/a|0,O=e.blockKey(M,_,R),w=f.get(O);if(!w)return-1;const I=T-M*a,G=j-_*a,X=((A-R*a)*a+G)*a+I,$=w.locals;let U=0,Z=$.length-1;for(;U<=Z;){const Q=U+Z>>1;if($[Q]===X)return w.globals[Q];$[Q]<X?U=Q+1:Z=Q-1}return-1}const d=new Map;function x(T,j,A,M){const _=T/a|0,R=j/a|0,O=A/a|0,w=e.blockKey(_,R,O);let I=d.get(w);I||(I=new Uint8Array(e.blockCellCount),d.set(w,I));const G=T-_*a,H=j-R*a,$=((A-O*a)*a+H)*a+G,U=1<<M;return I[$]&U?!0:(I[$]|=U,!1)}n("contouring",0);const g=new mt(262144),y=new mt(262144);let p=0,E=0;const h=e.allocatedCount,S=[];Qt(e,(T,j,A,M,_,R)=>{S.push([T,j,A,M,_,R])});for(let T=0;T<S.length;T++){const j=S[T],A=j[3],M=j[4],_=j[5];E++;const R=Math.min(A+a,r),O=Math.min(M+a,r),w=Math.min(_+a,r);for(let I=_;I<w;I++)for(let G=M;G<O;G++)for(let H=A;H<R;H++){const X=e.get(H,G,I),$=X>=0,U=[X,e.get(H+1,G,I),e.get(H,G+1,I),e.get(H+1,G+1,I),e.get(H,G,I+1),e.get(H+1,G,I+1),e.get(H,G+1,I+1),e.get(H+1,G+1,I+1)];let Z=!1;for(let ie=1;ie<8;ie++)if(U[ie]>=0!==$){Z=!0;break}if(!Z)continue;const Q=[];for(let ie=0;ie<12;ie++){const le=ht[ie],ve=U[le[0]],q=U[le[1]];if(ve>=0==q>=0)continue;const W=H+(le[0]&1),te=G+(le[0]>>1&1),ce=I+(le[0]>>2&1),se=H+(le[1]&1),J=G+(le[1]>>1&1),ae=I+(le[1]>>2&1);let fe=W,pe=te,be=ce,Fe=se,Ee=J,ue=ae,we=ve;for(let Pe=0;Pe<8;Pe++){const Le=(fe+Fe)*.5,$e=(pe+Ee)*.5,Ge=(be+ue)*.5,Ke=e.lerp(Le,$e,Ge);Ke>=0==we>=0?(fe=Le,pe=$e,be=Ge,we=Ke):(Fe=Le,Ee=$e,ue=Ge)}const ye=(fe+Fe)*.5,xe=(pe+Ee)*.5,he=(be+ue)*.5,Me=e.gradient(ye,xe,he);Q.push({point:[Se(ye,s,t[0],o[0]),Se(xe,s,t[1],o[1]),Se(he,s,t[2],o[2])],normal:Me})}if(Q.length===0)continue;const ne=[Se(H,s,t[0],o[0]),Se(G,s,t[1],o[1]),Se(I,s,t[2],o[2])],K=[Se(H+1,s,t[0],o[0]),Se(G+1,s,t[1],o[1]),Se(I+1,s,t[2],o[2])],ee=Uo(Q,ne,K);if(!ee)continue;const re=e.gradient(We(ee[0],s,t[0],o[0]),We(ee[1],s,t[1],o[1]),We(ee[2],s,t[2],o[2]));v(H,G,I,p),g.push3(ee[0],ee[1],ee[2]),y.push3(re[0],re[1],re[2]),p++}E&63||(n("contouring",Math.round(40*E/h)),await Ot())}if(n("contouring",50),console.log("DC sparse: "+p+" vertices ("+((g.data.byteLength+y.data.byteLength)/(1024*1024)).toFixed(0)+" MB vertex data)"),p===0)return{positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};const C=new Map,N=e.blockCellCount+7>>3,k=e.memoryMB();let F=Array.from(e.blocks.keys());for(let T=0;T<F.length;T++){const j=F[T],A=e.blocks.get(j),M=new Uint8Array(N);for(let _=0;_<A.length;_++)A[_]>=0&&(M[_>>3]|=1<<(_&7));C.set(j,M),e.blocks.delete(j),T&255||await Ot()}F=null,e.allocatedCount=0;const D=(C.size*N/(1024*1024)).toFixed(0);console.log("Sign compression: freed "+k.toFixed(0)+" MB float data, using "+D+" MB sign maps"),f=new Map,l.forEach((T,j)=>{const A=T.locals.length,M=new Array(A);for(let I=0;I<A;I++)M[I]=I;const _=T.locals,R=T.globals;M.sort((I,G)=>_[I]-_[G]);const O=new Uint16Array(A),w=new Uint32Array(A);for(let I=0;I<A;I++)O[I]=_[M[I]],w[I]=R[M[I]];f.set(j,{locals:O,globals:w})}),l.clear(),l=null,console.log("Vertex map compaction: "+f.size+" blocks with vertices");function V(T,j,A){if(T<0||j<0||A<0||T>=s||j>=s||A>=s)return!0;const M=T/a|0,_=j/a|0,R=A/a|0,O=e.blockKey(M,_,R),w=C.get(O);if(!w)return!0;const I=T-M*a,G=j-_*a,X=((A-R*a)*a+G)*a+I;return(w[X>>3]&1<<(X&7))!==0}const u=new jo(262144);let c=0,L=0,P=0;const B=f.size;let z=Array.from(f.entries());for(let T=0;T<z.length;T++){const j=z[T],A=j[0],M=j[1];P++;const _=A%i,R=(A/i|0)%i,O=A/(i*i)|0,w=_*a,I=R*a,G=O*a;for(let H=0;H<M.locals.length;H++){const X=M.locals[H],$=X%a,U=(X/a|0)%a,Z=X/(a*a)|0,Q=w+$,ne=I+U,K=G+Z;if(!(Q>=r||ne>=r||K>=r))for(let ee=0;ee<12;ee++){const re=ht[ee],ie=Q+(re[0]&1),le=ne+(re[0]>>1&1),ve=K+(re[0]>>2&1),q=Q+(re[1]&1),W=ne+(re[1]>>1&1),te=K+(re[1]>>2&1),ce=V(ie,le,ve),se=V(q,W,te);if(ce===se)continue;let J;const ae=Math.min(ie,q),fe=Math.min(le,W),pe=Math.min(ve,te);if(ie!==q?J=0:le!==W?J=1:J=2,x(ae,fe,pe,J))continue;c++;const be=(J+1)%3,Fe=(J+2)%3,Ee=[ae,fe,pe],ue=[-1,-1,-1,-1];let we=!0;for(let xe=0;xe<4;xe++){const he=[Ee[0],Ee[1],Ee[2]];if(he[be]-=xe&1?0:1,he[Fe]-=xe&2?0:1,he[0]<0||he[1]<0||he[2]<0||he[0]>=r||he[1]>=r||he[2]>=r){we=!1;break}const Me=m(he[0],he[1],he[2]);if(Me<0){we=!1;break}ue[xe]=Me}if(!we){L++;continue}const ye=ce;ue[0]!==ue[1]&&ue[0]!==ue[3]&&ue[1]!==ue[3]&&(ye?u.push3(ue[0],ue[3],ue[1]):u.push3(ue[0],ue[1],ue[3])),ue[0]!==ue[2]&&ue[0]!==ue[3]&&ue[2]!==ue[3]&&(ye?u.push3(ue[0],ue[2],ue[3]):u.push3(ue[0],ue[3],ue[2]))}}P&63||(n("contouring",50+Math.round(50*P/B)),await Ot())}return f=null,z=null,n("contouring",100),console.log("DC sparse: "+c+" sign-change edges, "+L+" dropped, "+u.length/3+" faces"),{positions:g.trim(),normals:y.trim(),indices:u.trim(),vertexCount:p,faceCount:Math.floor(u.length/3)}}const No=new Float32Array(1),Un=new Uint32Array(No.buffer);function Nn(e){No[0]=e;const t=Un[0],o=t>>16&32768,n=(t>>23&255)-127+15,s=t&8388607;return n<=0?o:n>=31?o|31744:o|n<<10|s>>13}const Vo=new Uint16Array(256);for(let e=0;e<256;e++)Vo[e]=Nn(e/255);class $o{constructor(t){oe(this,"buf");oe(this,"a");oe(this,"v");oe(this,"pos");this.buf=new ArrayBuffer(t||8*1024*1024),this.a=new Uint8Array(this.buf),this.v=new DataView(this.buf),this.pos=0}grow(t){let o=this.pos+t;this.buf.byteLength<256*1024*1024?o=Math.max(this.buf.byteLength*2,o):o=Math.max(Math.round(this.buf.byteLength*1.25),o);const n=new ArrayBuffer(o);new Uint8Array(n).set(this.a),this.buf=n,this.a=new Uint8Array(n),this.v=new DataView(n)}en(t){this.pos+t>this.buf.byteLength&&this.grow(t)}u8(t){this.en(1),this.v.setUint8(this.pos,t),this.pos++}u16(t){this.en(2),this.v.setUint16(this.pos,t,!0),this.pos+=2}u32(t){this.en(4),this.v.setUint32(this.pos,t,!0),this.pos+=4}i32(t){this.en(4),this.v.setInt32(this.pos,t,!0),this.pos+=4}u64(t){this.en(8),this.v.setBigUint64(this.pos,t,!0),this.pos+=8}f64(t){this.en(8),this.v.setFloat64(this.pos,t,!0),this.pos+=8}raw(t){this.en(t.length),this.a.set(t,this.pos),this.pos+=t.length}str(t){this.en(t.length);for(let o=0;o<t.length;o++)this.a[this.pos++]=t.charCodeAt(o)}name(t){this.u32(t.length),this.str(t)}zeros(t){this.en(t),this.pos+=t}bulk64(t){const o=t.length*8;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulk16(t){const o=t.length*2;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}bulkF32(t){const o=t.length*4;this.en(o),this.a.set(new Uint8Array(t.buffer,t.byteOffset,o),this.pos),this.pos+=o}result(){return new Uint8Array(this.buf,0,this.pos)}}const pt=0xFFFFFFFFFFFFFFFFn;function Vn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Uint16Array(32768),n4map:new Map}}function $n(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Uint16Array(4096),leafMap:new Map}}function Gn(e,t,o,n,s){const r=new BigUint64Array(8),a=new Uint16Array(512);let i=0;for(let g=0;g<512;g++)s[g]>0&&(r[g>>6]|=1n<<BigInt(g&63),a[g]=Vo[s[g]],i++);if(i===0)return 0;const l=t<<3,f=o<<3,v=n<<3,m=(v&4095)>>7|(f&4095)>>7<<5|(l&4095)>>7<<10;e.n5childMask[m>>6]|=1n<<BigInt(m&63);let d=e.n4map.get(m);d||(d=$n(),e.n4map.set(m,d));const x=(v&127)>>3|(f&127)>>3<<4|(l&127)>>3<<8;return d.childMask[x>>6]|=1n<<BigInt(x&63),d.leafMap.set(x,{mask:r,data:a}),i}function Xn(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const r=[];n.leafMap.forEach(function(a,i){let l=!0;for(let m=0;m<8;m++)if(a.mask[m]!==pt){l=!1;break}if(!l)return;const f=a.data[0];let v=!0;for(let m=1;m<512;m++)if(a.data[m]!==f){v=!1;break}v&&r.push([i,f])});for(let a=0;a<r.length;a++){const i=r[a][0],l=r[a][1];n.leafMap.delete(i),n.childMask[i>>6]&=~(1n<<BigInt(i&63)),n.valueMask[i>>6]|=1n<<BigInt(i&63),n.tileValues[i]=l,t++}if(n.leafMap.size===0){let a=!0;for(let i=0;i<64;i++)if(n.valueMask[i]!==pt){a=!1;break}if(a){const i=n.tileValues[0];let l=!0;for(let f=1;f<4096;f++)if(n.tileValues[f]!==i){l=!1;break}l&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s]=i,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Hn(){return{n5childMask:new BigUint64Array(512),n5valueMask:new BigUint64Array(512),n5tileValues:new Float32Array(32768*3),n4map:new Map}}function Yn(){return{childMask:new BigUint64Array(64),valueMask:new BigUint64Array(64),tileValues:new Float32Array(4096*3),leafMap:new Map}}function qn(e,t,o,n,s,r,a){const i=new BigUint64Array(8),l=new Float32Array(512*3);let f=0;for(let p=0;p<512;p++)(s[p]>0||r[p]>0||a[p]>0)&&(i[p>>6]|=1n<<BigInt(p&63),l[p*3]=s[p]/255,l[p*3+1]=r[p]/255,l[p*3+2]=a[p]/255,f++);if(f===0)return 0;const v=t<<3,m=o<<3,d=n<<3,x=(d&4095)>>7|(m&4095)>>7<<5|(v&4095)>>7<<10;e.n5childMask[x>>6]|=1n<<BigInt(x&63);let g=e.n4map.get(x);g||(g=Yn(),e.n4map.set(x,g));const y=(d&127)>>3|(m&127)>>3<<4|(v&127)>>3<<8;return g.childMask[y>>6]|=1n<<BigInt(y&63),g.leafMap.set(y,{mask:i,data:l}),f}function Wn(e){let t=0,o=0;return e.n4map.forEach(function(n,s){const r=[];n.leafMap.forEach(function(a,i){let l=!0;for(let x=0;x<8;x++)if(a.mask[x]!==pt){l=!1;break}if(!l)return;const f=a.data[0],v=a.data[1],m=a.data[2];let d=!0;for(let x=1;x<512;x++)if(a.data[x*3]!==f||a.data[x*3+1]!==v||a.data[x*3+2]!==m){d=!1;break}d&&r.push([i,f,v,m])});for(const[a,i,l,f]of r)n.leafMap.delete(a),n.childMask[a>>6]&=~(1n<<BigInt(a&63)),n.valueMask[a>>6]|=1n<<BigInt(a&63),n.tileValues[a*3]=i,n.tileValues[a*3+1]=l,n.tileValues[a*3+2]=f,t++;if(n.leafMap.size===0){let a=!0;for(let i=0;i<64;i++)if(n.valueMask[i]!==pt){a=!1;break}if(a){const i=n.tileValues[0],l=n.tileValues[1],f=n.tileValues[2];let v=!0;for(let m=1;m<4096;m++)if(n.tileValues[m*3]!==i||n.tileValues[m*3+1]!==l||n.tileValues[m*3+2]!==f){v=!1;break}v&&(e.n4map.delete(s),e.n5childMask[s>>6]&=~(1n<<BigInt(s&63)),e.n5valueMask[s>>6]|=1n<<BigInt(s&63),e.n5tileValues[s*3]=i,e.n5tileValues[s*3+1]=l,e.n5tileValues[s*3+2]=f,o++)}}}),{promotedLeaves:t,promotedN4s:o}}function Ze(e){return Array.from(e.keys()).sort(function(t,o){return t-o})}function ke(e,t,o){e.name(t),e.name("string"),e.name(o)}function Kt(e,t,o){e.name(t),e.name("bool"),e.u32(1),e.u8(o?1:0)}function Go(e,t){e.u32(1),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulk16(t.n5tileValues);const o=Ze(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulk16(s.tileValues);const r=Ze(s.leafMap);for(let a=0;a<r.length;a++)e.bulk64(s.leafMap.get(r[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),r=Ze(s.leafMap);for(let a=0;a<r.length;a++){const i=s.leafMap.get(r[a]);e.bulk64(i.mask),e.u8(6),e.bulk16(i.data),i.data=null}}}function Zn(e,t){e.u32(1),e.f64(0),e.u32(0),e.u32(0),e.u32(1),e.i32(0),e.i32(0),e.i32(0),e.bulk64(t.n5childMask),e.bulk64(t.n5valueMask),e.u8(6),e.bulkF32(t.n5tileValues);const o=Ze(t.n4map);for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]);e.bulk64(s.childMask),e.bulk64(s.valueMask),e.u8(6),e.bulkF32(s.tileValues);const r=Ze(s.leafMap);for(let a=0;a<r.length;a++)e.bulk64(s.leafMap.get(r[a]).mask)}for(let n=0;n<o.length;n++){const s=t.n4map.get(o[n]),r=Ze(s.leafMap);for(let a=0;a<r.length;a++){const i=s.leafMap.get(r[a]);e.bulk64(i.mask),e.u8(6),e.bulkF32(i.data),i.data=null}}}function Xo(e,t,o,n){const s=n/t;e.name("AffineMap"),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(0),e.f64(0),e.f64(0),e.f64(s),e.f64(0),e.f64(o[0]),e.f64(o[1]),e.f64(o[2]),e.f64(1)}function Jn(e,t,o,n,s,r){e.u32(0),e.u32(4),ke(e,"class","unknown"),ke(e,"file_compression","none"),Kt(e,"is_saved_as_half_float",!0),ke(e,"name",o),Xo(e,n,s,r),Go(e,t)}function Qn(e,t,o,n,s,r){e.u32(0),e.u32(4),ke(e,"class","unknown"),ke(e,"file_compression","none"),Kt(e,"is_saved_as_half_float",!1),ke(e,"name",o),Xo(e,n,s,r),Zn(e,t)}function Kn(e,t,o,n){let s=0;e.n4map.forEach(function(l){s+=l.leafMap.size});const r=2e5+s*1200+e.n4map.size*1e4,a=new $o(Math.max(r,1024*1024));a.raw(new Uint8Array([32,66,68,86,0,0,0,0])),a.u32(224),a.u32(8),a.u32(1),a.u8(0),a.str("d2b59639-ac2f-4047-9c50-9648f951180c"),a.u32(0),a.u32(1),a.name("density"),a.name("Tree_float_5_4_3_HalfFloat"),a.u32(0),a.u64(BigInt(a.pos+24)),a.u64(0n),a.u64(0n),a.u32(0),a.u32(4),ke(a,"class","unknown"),ke(a,"file_compression","none"),Kt(a,"is_saved_as_half_float",!0),ke(a,"name","density");const i=n/t;return a.name("AffineMap"),a.f64(i),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(i),a.f64(0),a.f64(0),a.f64(0),a.f64(0),a.f64(i),a.f64(0),a.f64(o[0]),a.f64(o[1]),a.f64(o[2]),a.f64(1),Go(a,e),a.result()}function ea(e,t,o,n,s){let r=0;e.n4map.forEach(function(f){r+=f.leafMap.size});let a=0;t.n4map.forEach(function(f){a+=f.leafMap.size});const i=2e5+r*1200+e.n4map.size*1e4+2e5+a*7200+t.n4map.size*6e4,l=new $o(Math.max(i,2*1024*1024));return l.raw(new Uint8Array([32,66,68,86,0,0,0,0])),l.u32(224),l.u32(8),l.u32(1),l.u8(0),l.str("d2b59639-ac2f-4047-9c50-9648f951180c"),l.u32(0),l.u32(2),l.name("density"),l.name("Tree_float_5_4_3_HalfFloat"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Jn(l,e,"density",o,n,s),l.name("Cd"),l.name("Tree_vec3s_5_4_3"),l.u32(0),l.u64(BigInt(l.pos+24)),l.u64(0n),l.u64(0n),Qn(l,t,"Cd",o,n,s),l.result()}function ta(e,t,o){return{formula:e.id,pipelineRevision:0,quality:o?{estimator:o.estimator??0,distanceMetric:o.distanceMetric??0}:void 0,interlace:t?{interlaceCompiled:!0,interlaceFormula:t.definition.id,interlaceEnabled:t.enabled,interlaceInterval:t.interval,interlaceStartIter:t.startIter,interlaceParamA:0,interlaceParamB:0,interlaceParamC:0,interlaceParamD:0,interlaceParamE:0,interlaceParamF:0,interlaceVec2A:{x:0,y:0},interlaceVec2B:{x:0,y:0},interlaceVec2C:{x:0,y:0},interlaceVec3A:{x:0,y:0,z:0},interlaceVec3B:{x:0,y:0,z:0},interlaceVec3C:{x:0,y:0,z:0}}:void 0}}function st(e,t,o){const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0);const s=p=>p?[p.x??p[0]??0,p.y??p[1]??0]:[0,0],r=p=>p?[p.x??p[0]??0,p.y??p[1]??0,p.z??p[2]??0]:[0,0,0],a=p=>p?[p.x??p[0]??0,p.y??p[1]??0,p.z??p[2]??0,p.w??p[3]??0]:[0,0,0,0],i=s(n.vec2A);t.uVec2A&&e.uniform2f(t.uVec2A,i[0],i[1]);const l=s(n.vec2B);t.uVec2B&&e.uniform2f(t.uVec2B,l[0],l[1]);const f=s(n.vec2C);t.uVec2C&&e.uniform2f(t.uVec2C,f[0],f[1]);const v=r(n.vec3A);t.uVec3A&&e.uniform3f(t.uVec3A,v[0],v[1],v[2]);const m=r(n.vec3B);t.uVec3B&&e.uniform3f(t.uVec3B,m[0],m[1],m[2]);const d=r(n.vec3C);t.uVec3C&&e.uniform3f(t.uVec3C,d[0],d[1],d[2]);const x=a(n.vec4A);t.uVec4A&&e.uniform4f(t.uVec4A,x[0],x[1],x[2],x[3]);const g=a(n.vec4B);t.uVec4B&&e.uniform4f(t.uVec4B,g[0],g[1],g[2],g[3]);const y=a(n.vec4C);if(t.uVec4C&&e.uniform4f(t.uVec4C,y[0],y[1],y[2],y[3]),t.uJulia){const p=n.julia;Array.isArray(p)?e.uniform3f(t.uJulia,p[0]??0,p[1]??0,p[2]??0):p&&typeof p=="object"?e.uniform3f(t.uJulia,p.x??0,p.y??0,p.z??0):e.uniform3f(t.uJulia,0,0,0)}t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode?1:0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??10),t.uDeBailout&&e.uniform1f(t.uDeBailout,n.deBailout??100),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}function rt(e,t,o){if(!o){t.uInterlaceEnabled&&e.uniform1f(t.uInterlaceEnabled,0);return}t.uInterlaceEnabled&&e.uniform1f(t.uInterlaceEnabled,o.enabled?1:0),t.uInterlaceInterval&&e.uniform1f(t.uInterlaceInterval,o.interval??2),t.uInterlaceStartIter&&e.uniform1f(t.uInterlaceStartIter,o.startIter??0);const n=o.params||{},s=p=>p?[p.x??p[0]??0,p.y??p[1]??0]:[0,0],r=p=>p?[p.x??p[0]??0,p.y??p[1]??0,p.z??p[2]??0]:[0,0,0],a=p=>p?[p.x??p[0]??0,p.y??p[1]??0,p.z??p[2]??0,p.w??p[3]??0]:[0,0,0,0];t.uInterlaceParamA&&e.uniform1f(t.uInterlaceParamA,n.paramA??0),t.uInterlaceParamB&&e.uniform1f(t.uInterlaceParamB,n.paramB??0),t.uInterlaceParamC&&e.uniform1f(t.uInterlaceParamC,n.paramC??0),t.uInterlaceParamD&&e.uniform1f(t.uInterlaceParamD,n.paramD??0),t.uInterlaceParamE&&e.uniform1f(t.uInterlaceParamE,n.paramE??0),t.uInterlaceParamF&&e.uniform1f(t.uInterlaceParamF,n.paramF??0);const i=s(n.vec2A);t.uInterlaceVec2A&&e.uniform2f(t.uInterlaceVec2A,i[0],i[1]);const l=s(n.vec2B);t.uInterlaceVec2B&&e.uniform2f(t.uInterlaceVec2B,l[0],l[1]);const f=s(n.vec2C);t.uInterlaceVec2C&&e.uniform2f(t.uInterlaceVec2C,f[0],f[1]);const v=r(n.vec3A);t.uInterlaceVec3A&&e.uniform3f(t.uInterlaceVec3A,v[0],v[1],v[2]);const m=r(n.vec3B);t.uInterlaceVec3B&&e.uniform3f(t.uInterlaceVec3B,m[0],m[1],m[2]);const d=r(n.vec3C);t.uInterlaceVec3C&&e.uniform3f(t.uInterlaceVec3C,d[0],d[1],d[2]);const x=a(n.vec4A);t.uInterlaceVec4A&&e.uniform4f(t.uInterlaceVec4A,x[0],x[1],x[2],x[3]);const g=a(n.vec4B);t.uInterlaceVec4B&&e.uniform4f(t.uInterlaceVec4B,g[0],g[1],g[2],g[3]);const y=a(n.vec4C);t.uInterlaceVec4C&&e.uniform4f(t.uInterlaceVec4C,y[0],y[1],y[2],y[3])}function po(e,t,o,n){const s=e.createShader(t);if(!s)throw new Error("Failed to create shader");if(e.shaderSource(s,o),e.compileShader(s),!e.getShaderParameter(s,e.COMPILE_STATUS)){const r=e.getShaderInfoLog(s)||"",a=t===e.VERTEX_SHADER?"vertex":"fragment";n("Shader compile error ("+a+"): "+r,"error");const i=o.split(`
`),l=r.match(/\d+:\d+/g)||[];for(let f=0;f<Math.min(l.length,5);f++){const v=parseInt(l[f].split(":")[1])-1;v>=0&&v<i.length&&n("  Line "+(v+1)+": "+i[v].trim(),"error")}throw new Error("Shader compile: "+r.split(`
`)[0])}return s}function it(e,t,o,n){const s=e.createProgram();if(!s)throw new Error("Failed to create program");if(e.attachShader(s,po(e,e.VERTEX_SHADER,t,n)),e.attachShader(s,po(e,e.FRAGMENT_SHADER,o,n)),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS)){const r=e.getProgramInfoLog(s)||"";throw n("Program link error: "+r,"error"),new Error("Program link: "+r)}return s}function vt(){const e=document.createElement("canvas");e.width=2048,e.height=2048;const t=e.getContext("webgl2",{antialias:!1});if(!t)throw new Error("WebGL2 not supported");return t.getExtension("EXT_color_buffer_float"),t.getExtension("OES_texture_float_linear"),t}function eo(e,t){const o={};for(let n=0;n<qe.length;n++)o[qe[n]]=e.getUniformLocation(t,qe[n]);return o}function Je(e,t,o,n,s,r,a){Oe.register(o),r&&Oe.register(r.definition);const i=Ln.generateMeshSDFLibrary(ta(o,r,a)),l=n,f=`#version 300 es
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
}`,v=it(e,Qe,f,s);e.useProgram(v);const m=e.createTexture();e.bindTexture(e.TEXTURE_2D,m),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,t,t);const d=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,d),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,m,0),e.viewport(0,0,t,t),e.bindVertexArray(e.createVertexArray());const x=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...qe],g={};for(let y=0;y<x.length;y++)g[x[y]]=e.getUniformLocation(v,x[y]);return{prog:v,loc:g,fbo:d,tex:m}}function lt(e,t,o,n,s,r,a,i,l,f){e.useProgram(t.prog),e.uniform1f(t.loc.uPower,n),e.uniform1i(t.loc.uIters,s),e.uniform1f(t.loc.uInvRes,1/o),e.uniform3f(t.loc.uBoundsMin,r[0],r[1],r[2]),e.uniform1f(t.loc.uBoundsRange,a),t.loc.uSurfaceThreshold&&e.uniform1f(t.loc.uSurfaceThreshold,f??0),st(e,t.loc,i),rt(e,t.loc,l),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo)}async function Ho(e,t,o,n,s,r,a,i,l,f,v,m,d){const{log:x,setPhase:g,setStatus:y,tick:p}=f,E=128,h=i[0]-a[0];let S=0,C=n-1;if(n>E){x("Coarse pre-pass: sampling "+E+"³ to detect Z range...","info"),g("Coarse Pre-pass",0),y("Coarse pre-pass ("+E+"³)..."),await p();const N=Je(e,E,t,1,x,v,m);lt(e,N,E,s,r,a,h,o,v,d),e.viewport(0,0,E,E);const k=new Float32Array(E*E*4);let F=E,D=-1;for(let V=0;V<E;V++){e.uniform1f(N.loc.uZ,(V+.5)/E),e.uniform2f(N.loc.uTileOffset,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,E,E,e.RGBA,e.FLOAT,k);let u=!1;for(let c=0;c<E*E;c++)if(k[c*4]<l*3){u=!0;break}u&&(V<F&&(F=V),D=V)}if(e.deleteTexture(N.tex),e.deleteFramebuffer(N.fbo),e.deleteProgram(N.prog),D>=F){const u=n/E;S=Math.max(0,Math.floor((F-2)*u)),C=Math.min(n-1,Math.ceil((D+2+1)*u)),S=S&-8,C=Math.min(n-1,C|7);const c=(100*(1-(C-S+1)/n)).toFixed(0);x("Coarse pre-pass: data in Z ["+F+","+D+"] of "+E+" → fine Z ["+S+","+C+"] of "+n+" (skipping "+c+"% of slices)","data")}else x("Coarse pre-pass: no data found — sampling all slices","warn");g("Coarse Pre-pass",100)}return{zSliceMin:S,zSliceMax:C}}function Yo(e,t,o,n,s,r,a,i,l){function f(v,m){if(e.useProgram(t.prog),e.bindFramebuffer(e.FRAMEBUFFER,t.fbo),e.uniform1f(t.loc.uZ,v),o<=n){e.uniform2f(t.loc.uTileOffset,0,0),e.viewport(0,0,o,o),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,o,o,e.RGBA,e.FLOAT,s);for(let d=0;d<o*o;d++)m[d]=s[d*4]}else for(let d=0;d<o;d+=n)for(let x=0;x<o;x+=n){const g=Math.min(n,o-x),y=Math.min(n,o-d);e.uniform2f(t.loc.uTileOffset,x,d),e.viewport(0,0,g,y),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,g,y,e.RGBA,e.FLOAT,s);for(let p=0;p<y;p++)for(let E=0;E<g;E++)m[(d+p)*o+(x+E)]=s[(p*g+E)*4]}}if(!i||i<=1)f((a+.5)/o,r);else{r.fill(0);const v=1/i;for(let m=0;m<i;m++){const d=(a+(m+.5)*v)/o;f(d,l);for(let x=0;x<o*o;x++)r[x]+=l[x]}for(let m=0;m<o*o;m++)r[m]*=v}}function qo(e,t,o,n){const s=t/n,r=new ImageData(n,n);for(let a=0;a<n;a++){const i=Math.min(Math.round(a*s),t-1);for(let l=0;l<n;l++){const f=Math.min(Math.round(l*s),t-1),v=e[i*t+f],m=Math.abs(v),d=m<o*2?Math.round(255*(1-m/(o*2))):0,x=v<0?50:0,g=(a*n+l)*4;r.data[g]=d+x,r.data[g+1]=v<0?30:d,r.data[g+2]=d,r.data[g+3]=255}}return r}async function vo(e,t,o,n,s,r,a,i,l,f,v,m,d,x,g,y){const{setProgress:p,setPhase:E,setStatus:h,tick:S,log:C,onSlicePreview:N}=x,k=Math.min(o,2048),F=i[0]-a[0];(!v||v<1)&&(v=1),m==null&&(m=0),d==null&&(d=o-1),lt(e,t,o,n,s,a,F,r,g,y),e.viewport(0,0,k,k);const D=new Float32Array(k*k*4),V=new Float32Array(o*o*o),u=F/o,c=new Float32Array(o*o),L=v>1?new Float32Array(o*o):null,P=Math.min(o,512);(m>0||d<o-1)&&V.fill(1),v>1&&C("Z sub-slicing: "+v+" sub-samples per voxel layer (smooths Z-axis banding)","info");const B=d-m+1;let z=0;for(let T=m;T<=d;T++){if(Yo(e,t,o,k,D,c,T,v,L),V.set(c,T*o*o),N){const j=qo(c,o,u,P);N(j,P,P)}z++,p(l+Math.round(z/B*f)),E("SDF Sampling",Math.round(z/B*100)),z&3||(h("Sampling SDF... slice "+z+"/"+B),await S())}return V}function oa(e,t,o,n,s,r,a,i,l){const f=a/l,v=new ImageData(l,l);for(let m=0;m<l;m++){const d=Math.round(m*f);for(let x=0;x<l;x++){const g=Math.round(x*f),y=(m*l+x)*4;if(g>=t&&g<n&&d>=o&&d<s){const p=((d-o)*r+(g-t))*4,E=e[p],h=Math.abs(E),S=h<i*2?Math.round(255*(1-h/(i*2))):0,C=E<0?50:0;v.data[y]=S+C,v.data[y+1]=E<0?30:S,v.data[y+2]=S}else v.data[y]=15,v.data[y+1]=15,v.data[y+2]=20;v.data[y+3]=255}}return v}async function na(e,t,o,n,s,r,a,i,l,f,v,m,d){const{setProgress:x,setPhase:g,setStatus:y,tick:p,onSlicePreview:E}=v,h=o.N,S=o.blockSize,C=Math.min(h,2048),N=i[0]-a[0];lt(e,t,h,n,s,a,N,r,m,d),e.viewport(0,0,C,C);const k=new Map;Qt(o,(P,B,z,T,j,A)=>{for(let M=0;M<S;M++){const _=A+M;if(_>=h)continue;let R=k.get(_);R||(R={entries:[],minX:T,minY:j,maxX:T+S,maxY:j+S},k.set(_,R)),R.entries.push({startX:T,startY:j}),T<R.minX&&(R.minX=T),j<R.minY&&(R.minY=j),T+S>R.maxX&&(R.maxX=T+S),j+S>R.maxY&&(R.maxY=j+S)}});const F=Array.from(k.keys()).sort((P,B)=>P-B);let D=0;for(let P=0;P<F.length;P++){const B=k.get(F[P]),z=Math.min(h,B.maxX)-Math.max(0,B.minX),T=Math.min(h,B.maxY)-Math.max(0,B.minY),j=z*T*4;j>D&&(D=j)}const V=new Float32Array(D),u=Math.min(h,512),c=N/h;let L=0;for(let P=0;P<F.length;P++){const B=F[P],z=k.get(B);e.uniform1f(t.loc.uZ,(B+.5)/h);const T=Math.max(0,z.minX),j=Math.max(0,z.minY),A=Math.min(h,z.maxX),M=Math.min(h,z.maxY),_=A-T,R=M-j;e.uniform2f(t.loc.uTileOffset,T,j),e.viewport(0,0,_,R),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,_,R,e.RGBA,e.FLOAT,V);const O=z.entries;for(let w=0;w<O.length;w++){const I=O[w];for(let G=0;G<S;G++){const H=I.startX+G;if(!(H<T||H>=A))for(let X=0;X<S;X++){const $=I.startY+X;if($<j||$>=M)continue;const U=(($-j)*_+(H-T))*4;o.set(H,$,B,V[U])}}}if(L++,!(L&7)){if(E){const w=oa(V,T,j,A,M,_,h,c,u);E(w,u,u)}x(l+Math.round(L/F.length*f)),g("Fine SDF Sampling",Math.round(L/F.length*100)),y("Sampling fine SDF... slice "+L+"/"+F.length+" (narrow-band)"),await p()}}return o}async function aa(e,t,o,n,s,r,a,i,l,f,v,m,d,x,g,y){const{log:p,setProgress:E,setPhase:h,setStatus:S,tick:C,onSlicePreview:N}=m,k=i[0]-a[0],F=k/n,D=8,V=n/D|0,u=Math.min(n,2048);(!v||v<1)&&(v=1);const c=await Ho(e,t,o,n,s,r,a,i,F,m,d,x,g),{zSliceMin:L,zSliceMax:P}=c,B=Je(e,u,t,f||1,p,d,x);lt(e,B,n,s,r,a,k,o,d,g);const z=new Float32Array(u*u*4),T=Vn();let j=0;const A=new Array(D);for(let X=0;X<D;X++)A[X]=new Float32Array(n*n);const M=v>1?new Float32Array(n*n):null,_=Math.min(n,512),R=P-L+1;let O=0;v>1&&p("Z sub-slicing: "+v+" sub-samples per voxel layer (smooths Z-axis banding)","info");for(let X=L;X<=P;X++){const $=A[X%D];if(Yo(e,B,n,u,z,$,X,v,M),X%D===D-1){const U=X/D|0;for(let Z=0;Z<V;Z++)for(let Q=0;Q<V;Q++){const ne=new Uint8Array(512);let K=!1;for(let ee=0;ee<D;ee++){const re=A[ee];for(let ie=0;ie<D;ie++)for(let le=0;le<D;le++){const ve=Q*D+le,q=Z*D+ie,W=re[q*n+ve],te=ee|ie<<3|le<<6;let ce;W<0?ce=255:ce=Math.round(Math.max(0,Math.min(255,255*(1-W/(F*2.5))))),ne[te]=ce,ce>0&&(K=!0)}}K&&(j+=Gn(T,Q,Z,U,ne))}}if(O++,!(O&7)){const U=Math.round(O/R*80);if(E(U),h("VDB Sampling",Math.round(O/R*100)),S("VDB sampling slice "+O+"/"+R+(L>0||P<n-1?" (Z "+L+"–"+P+")":"")),N){const Z=qo(A[X%D],n,F,_);N(Z,_,_)}await C()}}if(e.deleteTexture(B.tex),e.deleteFramebuffer(B.fbo),e.deleteProgram(B.prog),m.memAlloc){let X=0;T.n4map.forEach(U=>{X+=U.leafMap.size});const $=Math.round((X*1.1+T.n4map.size*10)/1024);m.memAlloc("vdbDensity","VDB Density",$,"#8c6")}let w=null;if(y){h("VDB Color",0),S("Sampling voxel colors..."),p("Color pass: sampling orbit-trap colors for active voxels","phase");let X=0;if(T.n4map.forEach($=>{$.leafMap.forEach(U=>{for(let Z=0;Z<8;Z++){let Q=U.mask[Z];for(;Q!==0n;)Q&=Q-1n,X++}})}),p("Color pass: "+X.toLocaleString()+" active voxels to colorize","data"),X>0){const $=Hn(),U=Math.min(e.getParameter(e.MAX_TEXTURE_SIZE),2048),Z=U*U,Q=zo({definition:t,interlace:d}),ne=it(e,Qe,Q,p),K=eo(e,ne),ee=e.createVertexArray(),re=e.getUniformLocation(ne,"uPositions"),ie=e.getUniformLocation(ne,"uPower"),le=e.getUniformLocation(ne,"uIters"),ve=e.getUniformLocation(ne,"uWidth"),q=e.getUniformLocation(ne,"uJitterOffset"),W=[];T.n4map.forEach((xe,he)=>{xe.leafMap.forEach((Me,Pe)=>{W.push(he,Pe)})});const te=W.length>>1,ce=Math.ceil(Math.sqrt(Z)),se=Math.ceil(Z/ce),J=ce*se,ae=new Float32Array(J*4),fe=new Uint8Array(J*4),pe=new Uint16Array(Z),be=new Uint32Array(Z),Fe=new Uint8Array(512),Ee=new Uint8Array(512),ue=new Uint8Array(512);let we=0,ye=0;for(;ye<te;){let xe=0,he=ye;for(;he<te&&xe+512<=Z;){const De=W[he*2],je=W[he*2+1],et=T.n4map.get(De).leafMap.get(je),Mt=(De>>10&31)<<7,Tt=(De>>5&31)<<7,Et=(De&31)<<7,Ft=(je>>8&15)<<3,Pt=(je>>4&15)<<3,At=(je&15)<<3,It=Mt+Ft,Dt=Tt+Pt,Rt=Et+At;for(let Ae=0;Ae<512;Ae++){if((et.mask[Ae>>6]&1n<<BigInt(Ae&63))===0n)continue;const Jo=Ae&7,Qo=Ae>>3&7,Ko=Ae>>6&7;ae[xe*4]=a[0]+(It+Ko+.5)*F,ae[xe*4+1]=a[1]+(Dt+Qo+.5)*F,ae[xe*4+2]=a[2]+(Rt+Jo+.5)*F,ae[xe*4+3]=1,pe[xe]=Ae,be[xe]=he,xe++}he++}const Me=xe;if(Me===0){ye=he;continue}const Pe=Math.ceil(Math.sqrt(Me)),Le=Math.ceil(Me/Pe);e.useProgram(ne);const $e=e.createTexture();e.bindTexture(e.TEXTURE_2D,$e),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,Pe,Le,0,e.RGBA,e.FLOAT,ae.subarray(0,Pe*Le*4)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const Ge=e.createTexture();e.bindTexture(e.TEXTURE_2D,Ge),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA8,Pe,Le);const Ke=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,Ke),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Ge,0),e.viewport(0,0,Pe,Le),e.bindVertexArray(ee),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,$e),e.uniform1i(re,0),e.uniform1f(ie,s),e.uniform1i(le,r),e.uniform1i(ve,Pe),e.uniform3f(q,0,0,0),st(e,K,o),rt(e,K,d),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,Pe,Le,e.RGBA,e.UNSIGNED_BYTE,fe),e.deleteTexture($e),e.deleteTexture(Ge),e.deleteFramebuffer(Ke);let _e=0;for(let De=ye;De<he;De++){if(_e>=Me||be[_e]!==De)continue;const je=W[De*2],et=W[De*2+1],Mt=(je>>10&31)<<7,Tt=(je>>5&31)<<7,Et=(je&31)<<7,Ft=(et>>8&15)<<3,Pt=(et>>4&15)<<3,At=(et&15)<<3,It=Mt+Ft>>3,Dt=Tt+Pt>>3,Rt=Et+At>>3;for(Fe.fill(0),Ee.fill(0),ue.fill(0);_e<Me&&be[_e]===De;){const Ae=pe[_e];Fe[Ae]=fe[_e*4],Ee[Ae]=fe[_e*4+1],ue[Ae]=fe[_e*4+2],_e++}qn($,It,Dt,Rt,Fe,Ee,ue)}we+=Me,ye=he;const oo=Math.round(we/X*100);E(80+Math.round(oo*.12)),h("VDB Color",oo),S("Color pass: "+we.toLocaleString()+"/"+X.toLocaleString()+" voxels"),await C()}if(e.deleteProgram(ne),e.deleteVertexArray(ee),Wn($),w=$,m.memAlloc){let xe=0;$.n4map.forEach(Me=>{xe+=Me.leafMap.size});const he=Math.round((xe*6.2+$.n4map.size*60)/1024);m.memAlloc("vdbColor","VDB Color",he,"#e6a")}p("Color pass complete: Cd vec3s grid built","success")}h("VDB Color",100),await C()}E(92),h("VDB Optimize",0),S("Optimizing VDB tree...");const I=Xn(T);E(95),h("VDB Serialize",50),S("Serializing VDB..."),await C();let G=0;T.n4map.forEach(X=>{G+=X.leafMap.size});let H;if(w?H=ea(T,w,n,a,k):H=Kn(T,n,a,k),m.memFree&&(m.memFree("vdbDensity"),w&&m.memFree("vdbColor")),m.memAlloc){const X=Math.round(H.byteLength/1048576);m.memAlloc("vdbBlob","VDB File",X,"#5af")}return E(100),h("VDB Complete",100),{blob:new Blob([H.buffer.slice(H.byteOffset,H.byteOffset+H.byteLength)],{type:"application/octet-stream"}),voxelCount:j,leafCount:G,promoted:I,zRange:[L,P],skippedSlices:n-R}}async function sa(e,t,o,n,s,r,a,i,l,f,v){const{log:m,tick:d}=l,x=t.N,g=t.blockSize,y=t.blocksPerAxis,p=Math.min(x,2048),E=i[0]-a[0],h=t.blockCellCount+7>>3,S=Sn({definition:o,interlace:v}),C=it(e,Qe,S,m);e.useProgram(C);const N=["uZ","uPower","uIters","uInvRes","uTileOffset","uBoundsMin","uBoundsRange",...qe],k={};for(let z=0;z<N.length;z++)k[N[z]]=e.getUniformLocation(C,N[z]);const F=e.createTexture();e.bindTexture(e.TEXTURE_2D,F),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,p,p);const D=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,D),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,F,0),e.uniform1f(k.uPower,n),e.uniform1i(k.uIters,s),e.uniform1f(k.uInvRes,1/x),e.uniform3f(k.uBoundsMin,a[0],a[1],a[2]),e.uniform1f(k.uBoundsRange,E),st(e,k,r),rt(e,k,v),e.bindVertexArray(e.createVertexArray());const V=new Map;Qt(t,(z,T,j,A,M,_)=>{for(let R=0;R<g;R++){const O=_+R;if(O>=x)continue;let w=V.get(O);w||(w={entries:[],minX:A,minY:M,maxX:A+g,maxY:M+g},V.set(O,w)),w.entries.push({startX:A,startY:M}),A<w.minX&&(w.minX=A),M<w.minY&&(w.minY=M),A+g>w.maxX&&(w.maxX=A+g),M+g>w.maxY&&(w.maxY=M+g)}});const u=Array.from(V.keys()).sort((z,T)=>z-T);let c=0;for(let z=0;z<u.length;z++){const T=V.get(u[z]),j=Math.min(x,T.maxX)-Math.max(0,T.minX),A=Math.min(x,T.maxY)-Math.max(0,T.minY);j*A*4>c&&(c=j*A*4)}const L=new Float32Array(c),P=new Map;t.blocks.forEach((z,T)=>{P.set(T,new Uint8Array(h))});let B=0;for(let z=0;z<u.length;z++){const T=u[z],j=V.get(T);e.uniform1f(k.uZ,(T+.5)/x);const A=Math.max(0,j.minX),M=Math.max(0,j.minY),_=Math.min(x,j.maxX),R=Math.min(x,j.maxY),O=_-A,w=R-M;e.uniform2f(k.uTileOffset,A,M),e.viewport(0,0,O,w),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readPixels(0,0,O,w,e.RGBA,e.FLOAT,L);const I=j.entries;for(let G=0;G<I.length;G++){const H=I[G],X=H.startX/g|0,$=H.startY/g|0,U=T/g|0,Z=(U*y+$)*y+X,Q=P.get(Z);if(!Q)continue;const ne=T-U*g;for(let K=0;K<g;K++){const ee=H.startX+K;if(!(ee<A||ee>=_))for(let re=0;re<g;re++){const ie=H.startY+re;if(ie<M||ie>=R)continue;const le=((ie-M)*O+(ee-A))*4;if(L[le]>.5){const ve=(ne*g+re)*g+K;Q[ve>>3]|=1<<(ve&7),B++}}}}!(z&7)&&f&&(f(Math.round(z/u.length*100)),await d())}return e.deleteTexture(F),e.deleteFramebuffer(D),e.deleteProgram(C),{escapeMap:P,solidCount:B}}function ra(e,t,o,n,s,r,a,i,l,f){i||(i=6);const v=t.vertexCount,m=Math.ceil(Math.sqrt(v)),d=Math.ceil(v/m),x=new Float32Array(m*d*4);for(let F=0;F<v;F++)x[F*4]=t.positions[F*3],x[F*4+1]=t.positions[F*3+1],x[F*4+2]=t.positions[F*3+2],x[F*4+3]=1;const g=e.createTexture();e.bindTexture(e.TEXTURE_2D,g),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,m,d,0,e.RGBA,e.FLOAT,x),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const y=e.createTexture();e.bindTexture(e.TEXTURE_2D,y),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,m,d);const p=e.createTexture();e.bindTexture(e.TEXTURE_2D,p),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA32F,m,d);const E=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,E),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,y,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,p,0),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]);const h=Cn({definition:o,deType:"auto",interlace:f}),S=it(e,Qe,h,l);e.useProgram(S),e.viewport(0,0,m,d),e.bindVertexArray(e.createVertexArray()),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,g),e.uniform1i(e.getUniformLocation(S,"uPositions"),0),e.uniform1f(e.getUniformLocation(S,"uPower"),s),e.uniform1i(e.getUniformLocation(S,"uIters"),r),e.uniform1f(e.getUniformLocation(S,"uVoxelSize"),a),e.uniform1i(e.getUniformLocation(S,"uNewtonSteps"),i);const C=eo(e,S);st(e,C,n),rt(e,C,f),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.readBuffer(e.COLOR_ATTACHMENT0);const N=new Float32Array(m*d*4);e.readPixels(0,0,m,d,e.RGBA,e.FLOAT,N),e.readBuffer(e.COLOR_ATTACHMENT1);const k=new Float32Array(m*d*4);e.readPixels(0,0,m,d,e.RGBA,e.FLOAT,k);for(let F=0;F<v;F++)t.positions[F*3]=N[F*4],t.positions[F*3+1]=N[F*4+1],t.positions[F*3+2]=N[F*4+2],t.normals[F*3]=k[F*4],t.normals[F*3+1]=k[F*4+1],t.normals[F*3+2]=k[F*4+2];return e.deleteTexture(g),e.deleteTexture(y),e.deleteTexture(p),e.deleteFramebuffer(E),e.deleteProgram(S),t}async function ia(e,t,o,n,s,r,a,i,l,f){const{log:v,setProgress:m,setPhase:d,setStatus:x,tick:g}=l;(!a||a<1)&&(a=1),i||(i=0);const y=t.vertexCount,p=Math.ceil(Math.sqrt(y)),E=Math.ceil(y/p);v("Color texture: "+p+"x"+E+" ("+(p*E*16/(1024*1024)).toFixed(0)+" MB position data)"+(a>1?" | "+a+" samples, radius="+i.toFixed(5):""),"mem");let h=new Float32Array(p*E*4);for(let L=0;L<y;L++)h[L*4]=t.positions[L*3],h[L*4+1]=t.positions[L*3+1],h[L*4+2]=t.positions[L*3+2],h[L*4+3]=1;const S=zo({definition:o,interlace:f}),C=it(e,Qe,S,v);e.useProgram(C);const N=e.createTexture();e.bindTexture(e.TEXTURE_2D,N),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,p,E,0,e.RGBA,e.FLOAT,h),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),h=null;const k=a>1,F=e.createTexture();e.bindTexture(e.TEXTURE_2D,F),e.texStorage2D(e.TEXTURE_2D,1,k?e.RGBA32F:e.RGBA8,p,E);const D=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,D),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,F,0),e.viewport(0,0,p,E),e.bindVertexArray(e.createVertexArray());const V=eo(e,C),u=e.getUniformLocation(C,"uJitterOffset");if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,N),e.uniform1i(e.getUniformLocation(C,"uPositions"),0),e.uniform1f(e.getUniformLocation(C,"uPower"),s),e.uniform1i(e.getUniformLocation(C,"uIters"),r),e.uniform1i(e.getUniformLocation(C,"uWidth"),p),st(e,V,n),rt(e,V,f),a<=1)e.uniform3f(u,0,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4);else{e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);const L=Math.PI*(3-Math.sqrt(5));for(let P=0;P<a;P++){const B=Math.acos(1-2*(P+.5)/a),z=L*P,T=i*Math.cbrt((P+.5)/a),j=T*Math.sin(B)*Math.cos(z),A=T*Math.sin(B)*Math.sin(z),M=T*Math.cos(B);if(e.uniform3f(u,j,A,M),e.drawArrays(e.TRIANGLE_STRIP,0,4),!(P&3)||P===a-1){const _=Math.round((P+1)/a*100);m(80+Math.round((P+1)/a*10)),d("Phase 5: Vertex Coloring",_),x("Color sample "+(P+1)+"/"+a),await g()}}e.disable(e.BLEND)}const c=new Uint8Array(y*4);if(k){const L=new Float32Array(p*E*4);e.readPixels(0,0,p,E,e.RGBA,e.FLOAT,L);const P=1/a;for(let B=0;B<y;B++)c[B*4]=Math.min(255,Math.round(L[B*4]*P*255)),c[B*4+1]=Math.min(255,Math.round(L[B*4+1]*P*255)),c[B*4+2]=Math.min(255,Math.round(L[B*4+2]*P*255)),c[B*4+3]=255}else{const L=new Uint8Array(p*E*4);e.readPixels(0,0,p,E,e.RGBA,e.UNSIGNED_BYTE,L);for(let P=0;P<y;P++)c[P*4]=L[P*4],c[P*4+1]=L[P*4+1],c[P*4+2]=L[P*4+2],c[P*4+3]=255}return e.deleteTexture(N),e.deleteTexture(F),e.deleteFramebuffer(D),e.deleteProgram(C),c}async function la(e,t,o,n,s,r,a){var g;const i=vt(),l=64,f=6,v=[-f/2,-f/2,-f/2],m=f,d=m/l,x=a??0;try{const y=Je(i,l,e,1,()=>{},s,r);lt(i,y,l,n,o,v,m,t,s,x),i.viewport(0,0,l,l);const p=new Float32Array(l*l*4);let E=1/0,h=1/0,S=1/0,C=-1/0,N=-1/0,k=-1/0,F=!1;for(let P=0;P<l;P++){i.uniform1f(y.loc.uZ,(P+.5)/l),i.uniform2f(y.loc.uTileOffset,0,0),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.readPixels(0,0,l,l,i.RGBA,i.FLOAT,p);const B=v[2]+(P+.5)*d;for(let z=0;z<l;z++)for(let T=0;T<l;T++)if(p[(z*l+T)*4]<d*2){const A=v[0]+(T+.5)*d,M=v[1]+(z+.5)*d;A<E&&(E=A),A>C&&(C=A),M<h&&(h=M),M>N&&(N=M),B<S&&(S=B),B>k&&(k=B),F=!0}}if(i.deleteTexture(y.tex),i.deleteFramebuffer(y.fbo),i.deleteProgram(y.prog),!F)return null;const D=.15,V=(C-E)*(1+D),u=(N-h)*(1+D),c=(k-S)*(1+D),L=Math.max(V,u,c,.5);return{center:[(E+C)/2,(h+N)/2,(S+k)/2],size:[L,L,L]}}finally{(g=i.getExtension("WEBGL_lose_context"))==null||g.loseContext()}}function ca(){const e=Y(m=>m.bboxCenter),t=Y(m=>m.bboxSize),o=Y(m=>m.setBboxCenter),n=Y(m=>m.setBboxSize),s=Y(m=>m.resetBounds),[r,a]=de.useState(!1),i=m=>{o([m.x,m.y,m.z??0])},l=de.useMemo(()=>new Ve(t[0],t[1],t[2]),[t[0],t[1],t[2]]),f=de.useCallback(m=>{n([m.x,m.y,m.z])},[n]),v=async()=>{const m=Y.getState(),d=m.loadedDefinition||Oe.get(m.selectedFormulaId);if(d){a(!0);try{let x;m.interlaceState&&(x={definition:m.interlaceState.definition,params:m.interlaceState.params,enabled:m.interlaceState.enabled,interval:m.interlaceState.interval,startIter:m.interlaceState.startIter});const g=m.qualitySettings,y={estimator:g.estimator,distanceMetric:g.distanceMetric},p=await la(d,m.formulaParams,m.iters,m.formulaParams.paramA||8,x,y,g.surfaceThreshold);p&&(o(p.center),n(p.size))}catch(x){console.error("Auto-fit failed:",x)}finally{a(!1)}}};return b.jsxs("div",{className:"flex flex-col gap-px mt-1",children:[b.jsx(Vt,{label:"Center",value:{x:e[0],y:e[1],z:e[2]},onChange:i,axisConfig:{min:-100,max:100,step:.1},showDualAxisPads:!1}),b.jsx(nn,{label:"Size",value:l,onChange:f,min:.1,max:100,step:.1,showDualAxisPads:!1,linkable:!0}),b.jsxs("div",{className:"flex items-center gap-2 mt-1 px-0.5",children:[b.jsx("button",{onClick:s,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-300 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Reset"}),b.jsx("button",{onClick:v,disabled:r,className:"text-[10px] px-2 py-0.5 bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 rounded-sm hover:bg-emerald-800/40 cursor-pointer disabled:opacity-50 disabled:cursor-default",children:r?"Fitting...":"Auto-fit"}),b.jsxs("span",{className:"text-[10px] text-gray-600",children:[t[0].toFixed(1)," × ",t[1].toFixed(1)," × ",t[2].toFixed(1)]})]})]})}const xo={info:"text-gray-400",phase:"text-emerald-400 font-bold",data:"text-sky-400",warn:"text-amber-400",error:"text-red-400 font-bold",success:"text-emerald-400",mem:"text-pink-300"},ua=()=>{const e=Y(h=>h.status),t=Y(h=>h.progress),o=Y(h=>h.phaseName),n=Y(h=>h.phaseProgress),s=Y(h=>h.memoryBlocks),r=Y(h=>h.logEntries),a=Y(h=>h.clearLog),i=Y(h=>h.lastMesh),l=Y(h=>h.lastTimings),f=Y(h=>h.smoothingSkipped),v=Y(h=>h.useNarrowBand),m=Y(h=>h.resolution),d=Y(h=>h.newton),x=Y(h=>h.isRunning),g=de.useRef(null);de.useEffect(()=>{var h;(h=g.current)==null||h.scrollIntoView({behavior:"smooth"})},[r.length]);const y=s.reduce((h,S)=>h+(S.freed?0:S.mb),0),p=Math.max(1,...s.map(h=>h.mb)),E=()=>{const h=r.map(S=>`[${S.time}] ${S.msg}`).join(`
`);navigator.clipboard.writeText(h).catch(()=>{})};return b.jsxs("div",{className:"font-mono flex flex-col gap-2",children:[e&&b.jsx("div",{className:"text-[13px] text-amber-400 font-bold",children:e}),b.jsx("div",{className:"h-1 bg-gray-800 rounded overflow-hidden",children:b.jsx("div",{className:"h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,t))}%`}})}),o&&b.jsx("div",{className:"text-[11px] text-gray-500",children:o}),b.jsx("div",{className:"h-[3px] bg-gray-800 rounded overflow-hidden",children:b.jsx("div",{className:"h-full bg-gradient-to-r from-sky-700 to-sky-400 transition-[width] duration-300",style:{width:`${Math.min(100,Math.max(0,n))}%`}})}),i&&l&&!x&&b.jsxs("div",{className:"text-[11px] leading-relaxed bg-black/40 border border-white/10 rounded px-2 py-1.5",children:[b.jsxs("span",{className:"text-emerald-400",children:[m,"³ · ",i.vertexCount.toLocaleString()," vertices · ",i.faceCount.toLocaleString()," faces"]})," · ",b.jsxs("span",{className:"text-sky-400",children:[Math.round((i.positions.byteLength+i.normals.byteLength+i.indices.byteLength)/(1024*1024))," MB mesh"]}),d&&b.jsx("span",{className:"text-gray-400",children:" · Newton projected"}),f&&b.jsx("span",{className:"text-amber-400",children:" · smoothing skipped (>5M verts)"}),b.jsx("br",{}),b.jsxs("span",{className:"text-gray-500",children:[v?`Coarse: ${(l.coarse/1e3).toFixed(1)}s · Fine: ${(l.fine/1e3).toFixed(1)}s`:`SDF: ${(l.sdf/1e3).toFixed(1)}s`," · ","DC: ",(l.dc/1e3).toFixed(1),"s",l.newton>100&&` · Newton: ${(l.newton/1e3).toFixed(1)}s`," · ","Post: ",(l.post/1e3).toFixed(1),"s"," · ","Color: ",(l.color/1e3).toFixed(1),"s"," · ","Total: ",(l.total/1e3).toFixed(1),"s"]})]}),s.length>0&&b.jsxs("div",{children:[b.jsx("div",{className:"flex gap-px h-[18px] rounded overflow-hidden",children:s.map(h=>b.jsx("div",{title:`${h.label}: ${h.mb} MB${h.freed?" (freed)":""}`,className:"flex items-center justify-center text-[9px] text-black font-bold overflow-hidden whitespace-nowrap rounded-sm transition-opacity",style:{flex:Math.max(h.mb/p,.08),background:h.color,opacity:h.freed?.25:1},children:h.label},h.id))}),b.jsxs("div",{className:"text-[10px] text-gray-600 mt-0.5",children:["Memory: ",y," MB active"]})]}),r.length>0&&b.jsxs("div",{children:[b.jsxs("div",{className:"max-h-[200px] overflow-y-auto bg-black/80 border border-white/10 rounded p-1.5 text-[11px] leading-relaxed",children:[r.map((h,S)=>b.jsxs("div",{className:xo[h.type]||xo.info,children:[b.jsx("span",{className:"text-gray-600",children:h.time})," ",h.msg]},S)),b.jsx("div",{ref:g})]}),b.jsxs("div",{className:"flex gap-1.5 mt-1",children:[b.jsx("button",{onClick:E,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Copy"}),b.jsx("button",{onClick:a,className:"text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer",children:"Clear"})]})]})]})};function fa(e,t,o){let n=0;for(let s=0;s<e.length;s++)e[s]<-o&&(e[s]=o,n++);return n}function da(e,t){let o=0;return e.blocks.forEach(n=>{for(let s=0;s<n.length;s++)n[s]<-t&&(n[s]=t,o++)}),o}function go(e,t,o,n,s){const r=new Float32Array(e.length);for(let i=0;i<o;i++)for(let l=0;l<o;l++){const f=i*o*o+l*o;for(let v=0;v<o;v++){let m=e[f+v];for(let d=-n;d<=n;d++){const x=v+d;x>=0&&x<o&&(m=s(m,e[f+x]))}r[f+v]=m}}const a=new Float32Array(e.length);for(let i=0;i<o;i++)for(let l=0;l<o;l++)for(let f=0;f<o;f++){const v=i*o*o+f*o+l;let m=r[v];for(let d=-n;d<=n;d++){const x=f+d;x>=0&&x<o&&(m=s(m,r[i*o*o+x*o+l]))}a[v]=m}for(let i=0;i<o;i++)for(let l=0;l<o;l++)for(let f=0;f<o;f++){const v=f*o*o+i*o+l;let m=a[v];for(let d=-n;d<=n;d++){const x=f+d;x>=0&&x<o&&(m=s(m,a[x*o*o+i*o+l]))}t[v]=m}}async function ma(e,t,o,n){const s=n||(()=>{});if(o<=0)return;const r=Math.round(o),a=t*t*t,i=new Float32Array(a);s(0),go(e,i,t,r,Math.min),s(25),await new Promise(l=>{setTimeout(l,0)}),go(i,e,t,r,Math.max),s(50)}async function ha(e,t,o){const n=o||(()=>{});if(t<=0)return;const s=Math.round(t);e.N;const r=e.blockSize;for(let a=0;a<2;a++){const i=a===0?Math.min:Math.max,l=new Map;e.blocks.forEach((f,v)=>{const m=new Float32Array(f.length),d=e.blocksPerAxis,x=v%d,g=(v/d|0)%d,y=v/(d*d)|0,p=x*r,E=g*r,h=y*r;for(let S=0;S<r;S++)for(let C=0;C<r;C++)for(let N=0;N<r;N++){let k=f[(S*r+C)*r+N];for(let F=-s;F<=s;F++)for(let D=-s;D<=s;D++)for(let V=-s;V<=s;V++){const u=p+N+V,c=E+C+D,L=h+S+F;k=i(k,e.get(u,c,L))}m[(S*r+C)*r+N]=k}l.set(v,m)}),l.forEach((f,v)=>{e.blocks.set(v,f)}),n(a===0?50:100),await new Promise(f=>{setTimeout(f,0)})}}async function pa(e,t,o,n){const s=o||(()=>{}),r=n||(()=>{}),a=t*t*t,i=a+7>>3,l=new Uint8Array(i),f=(D,V,u)=>(u*t+V)*t+D,v=D=>(l[D>>3]&1<<(D&7))!==0,m=D=>{l[D>>3]|=1<<(D&7)};let d=Math.min(a,4*1024*1024),x=new Int32Array(d),g=0,y=0,p=0;const E=D=>{if(p>=d){const V=d*2,u=new Int32Array(V);for(let c=0;c<p;c++)u[c]=x[(g+c)%d];x=u,g=0,y=p,d=V}x[y]=D,y=(y+1)%d,p++},h=()=>{const D=x[g];return g=(g+1)%d,p--,D};for(let D=0;D<t;D++)for(let V=0;V<t;V++)for(let u=0;u<t;u++)if(u===0||u===t-1||V===0||V===t-1||D===0||D===t-1){const c=f(u,V,D);e[c]>=0&&!v(c)&&(m(c),E(c))}s(5);let S=0;const C=[-1,1,0,0,0,0],N=[0,0,-1,1,0,0],k=[0,0,0,0,-1,1];for(;p>0;){const D=h(),V=D%t,u=(D/t|0)%t,c=D/(t*t)|0;for(let L=0;L<6;L++){const P=V+C[L],B=u+N[L],z=c+k[L];if(P<0||B<0||z<0||P>=t||B>=t||z>=t)continue;const T=f(P,B,z);v(T)||e[T]>=0&&(m(T),E(T))}S++,S&1048575||(s(5+Math.round(85*S/a)),await new Promise(L=>{setTimeout(L,0)}),r())}let F=0;for(let D=0;D<a;D++)e[D]>=0&&!v(D)&&(e[D]=-Math.abs(e[D])-.001,F++);return s(100),F}async function va(e,t,o,n){const s=o||(()=>{}),r=n||(()=>{}),a=e.N,i=e.blockSize,l=e.blocksPerAxis,f=e.blockCellCount+7>>3;function v(_,R,O,w){if(R<0||O<0||w<0||R>=a||O>=a||w>=a)return!1;const I=R/i|0,G=O/i|0,H=w/i|0,X=(H*l+G)*l+I,$=_.get(X);if(!$)return!1;const U=R-I*i,Z=O-G*i,ne=((w-H*i)*i+Z)*i+U;return($[ne>>3]&1<<(ne&7))!==0}function m(_,R,O,w){const I=R/i|0,G=O/i|0,H=w/i|0,X=(H*l+G)*l+I,$=_.get(X);if(!$)return;const U=R-I*i,Z=O-G*i,ne=((w-H*i)*i+Z)*i+U;$[ne>>3]|=1<<(ne&7)}let d=2*1024*1024,x=new Int32Array(d),g=new Uint8Array(d),y=0,p=0;function E(){const _=p-y,R=d*2,O=new Int32Array(R),w=new Uint8Array(R);for(let I=0;I<_;I++)O[I]=x[(y+I)%d],w[I]=g[(y+I)%d];x=O,g=w,y=0,p=_,d=R}function h(_,R){p-y>=d-1&&E(),x[p%d]=_,g[p%d]=R,p++}function S(){const _=x[y%d],R=g[y%d];return y++,{coord:_,dist:R}}let C=2*1024*1024,N=new Int32Array(C),k=0,F=0;function D(){const _=F-k,R=C*2,O=new Int32Array(R);for(let w=0;w<_;w++)O[w]=N[(k+w)%C];N=O,k=0,F=_,C=R}function V(_){F-k>=C-1&&D(),N[F++%C]=_}function u(){return N[k++%C]}const c=new Map;e.blocks.forEach((_,R)=>{const O=new Uint8Array(f);for(let w=0;w<_.length;w++)_[w]<0&&(O[w>>3]|=1<<(w&7));c.set(R,O)});let L=0;e.blocks.forEach((_,R)=>{const O=R%l,w=(R/l|0)%l,I=R/(l*l)|0,G=O*i,H=w*i,X=I*i;for(let $=0;$<i;$++)for(let U=0;U<i;U++)for(let Z=0;Z<i;Z++){const Q=($*i+U)*i+Z;if(_[Q]<0)continue;const ne=G+Z,K=H+U,ee=X+$;let re=!1;for(let ie=0;ie<6&&!re;ie++){const le=ne+(ie===0?-1:ie===1?1:0),ve=K+(ie===2?-1:ie===3?1:0),q=ee+(ie===4?-1:ie===5?1:0);e.get(le,ve,q)<0&&(re=!0)}re&&(m(c,ne,K,ee),h((ee*a+K)*a+ne,1),L++)}}),console.log("[CavityFill] Dilate by "+t+": "+L+" surface seeds"),s(5);let P=0,B=0;for(;y<p;){const _=S(),R=_.coord,O=_.dist,w=R%a,I=(R/a|0)%a,G=R/(a*a)|0;for(let H=0;H<6;H++){const X=w+(H===0?-1:H===1?1:0),$=I+(H===2?-1:H===3?1:0),U=G+(H===4?-1:H===5?1:0);X<0||$<0||U<0||X>=a||$>=a||U>=a||v(c,X,$,U)||(m(c,X,$,U),P++,O+1<t&&h((U*a+$)*a+X,O+1))}++B&262143||(s(5+Math.round(20*Math.min(1,P/(L*t+1)))),await new Promise(H=>{setTimeout(H,0)}),r())}console.log("[CavityFill] Dilate done: "+P+" cells expanded"),s(30);const z=new Map;e.blocks.forEach((_,R)=>{z.set(R,new Uint8Array(f))}),e.blocks.forEach((_,R)=>{const O=c.get(R),w=R%l,I=(R/l|0)%l,G=R/(l*l)|0,H=w*i,X=I*i,$=G*i;for(let U=0;U<i;U++)for(let Z=0;Z<i;Z++)for(let Q=0;Q<i;Q++){const ne=(U*i+Z)*i+Q;if(O[ne>>3]&1<<(ne&7))continue;const K=H+Q,ee=X+Z,re=$+U;let ie=!1;if(K===0||K===a-1||ee===0||ee===a-1||re===0||re===a-1)ie=!0;else if(Q===0||Q===i-1||Z===0||Z===i-1||U===0||U===i-1)for(let le=0;le<6&&!ie;le++){const ve=K+(le===0?-1:le===1?1:0),q=ee+(le===2?-1:le===3?1:0),W=re+(le===4?-1:le===5?1:0),te=ve/i|0,ce=q/i|0,se=W/i|0;e.hasBlock(te,ce,se)||(ie=!0)}if(ie){const le=z.get(R);le[ne>>3]|=1<<(ne&7),V((re*a+ee)*a+K)}}}),console.log("[CavityFill] Flood fill: "+F+" boundary seeds"),s(40);let j=0,A=0;for(;k<F;){const _=u(),R=_%a,O=(_/a|0)%a,w=_/(a*a)|0;for(let I=0;I<6;I++){const G=R+(I===0?-1:I===1?1:0),H=O+(I===2?-1:I===3?1:0),X=w+(I===4?-1:I===5?1:0);if(G<0||H<0||X<0||G>=a||H>=a||X>=a)continue;const $=G/i|0,U=H/i|0,Z=X/i|0,Q=(Z*l+U)*l+$,ne=G-$*i,K=H-U*i,re=((X-Z*i)*i+K)*i+ne,ie=z.get(Q);ie&&(ie[re>>3]&1<<(re&7)||v(c,G,H,X)||(ie[re>>3]|=1<<(re&7),V((X*a+H)*a+G),j++))}++A&262143||(s(40+Math.round(40*j/(j+(F-k)+1))),await new Promise(I=>{setTimeout(I,0)}),r())}console.log("[CavityFill] Flood done: "+j+" cells reached"),s(85);let M=0;return e.blocks.forEach((_,R)=>{const O=z.get(R);for(let w=0;w<_.length;w++)_[w]>=0&&!(O[w>>3]&1<<(w&7))&&(_[w]=-Math.abs(_[w])-.001,M++)}),s(100),console.log("[CavityFill] Filled: "+M+" cavity cells"),{filled:M,dilated:P,seeds:L}}function xa(e,t){const o=new Array(t);for(let s=0;s<t;s++)o[s]=new Set;for(let s=0,r=e.length;s<r;s+=3){const a=e[s],i=e[s+1],l=e[s+2];o[a].add(i),o[a].add(l),o[i].add(a),o[i].add(l),o[l].add(a),o[l].add(i)}const n=new Array(t);for(let s=0;s<t;s++){const r=o[s],a=new Uint32Array(r.size);let i=0;for(const l of r)a[i++]=l;n[s]=a}return n}function bo(e,t,o,n){const s=t.length;n.set(e);for(let r=0;r<s;r++){const a=t[r],i=a.length;if(i===0)continue;const l=r*3,f=n[l],v=n[l+1],m=n[l+2];let d=0,x=0,g=0;for(let p=0;p<i;p++){const E=a[p]*3;d+=n[E]-f,x+=n[E+1]-v,g+=n[E+2]-m}const y=o/i;e[l]=f+d*y,e[l+1]=v+x*y,e[l+2]=m+g*y}}function ga(e,t=.5,o=-.53,n=5){const s=xa(e.indices,e.vertexCount),r=new Float32Array(e.positions.length);for(let a=0;a<n;a++)bo(e.positions,s,t,r),bo(e.positions,s,o,r);return e}function ba(e,t=1e-6){const o=e.positions,n=e.normals,s=e.indices,r=e.vertexCount,i=1/(t>0?t:1e-6),l=new Map,f=new Int32Array(r);f.fill(-1);const v=[],m=[];let d=0;function x(y,p,E){return y+","+p+","+E}for(let y=0;y<r;y++){const p=y*3,E=o[p],h=o[p+1],S=o[p+2],C=Math.floor(E*i),N=Math.floor(h*i),k=Math.floor(S*i);let F=!1;for(let u=-1;u<=1&&!F;u++)for(let c=-1;c<=1&&!F;c++)for(let L=-1;L<=1&&!F;L++){const P=x(C+u,N+c,k+L),B=l.get(P);if(B!==void 0)for(let z=0;z<B.length;z++){const T=B[z],j=T*3,A=o[j]-E,M=o[j+1]-h,_=o[j+2]-S;if(A*A+M*M+_*_<=t*t){f[y]=f[T],F=!0;break}}}F||(f[y]=d,v.push(E,h,S),m.push(n[p],n[p+1],n[p+2]),d++);const D=x(C,N,k),V=l.get(D);V===void 0?l.set(D,[y]):V.push(y)}const g=new Uint32Array(s.length);for(let y=0,p=s.length;y<p;y++)g[y]=f[s[y]];return{positions:new Float32Array(v),normals:new Float32Array(m),indices:g,vertexCount:d,faceCount:e.faceCount}}function ya(e){const t=e.positions,o=e.indices,n=e.faceCount,s=[];for(let r=0;r<n;r++){const a=r*3,i=o[a]*3,l=o[a+1]*3,f=o[a+2]*3,v=t[l]-t[i],m=t[l+1]-t[i+1],d=t[l+2]-t[i+2],x=t[f]-t[i],g=t[f+1]-t[i+1],y=t[f+2]-t[i+2],p=m*y-d*g,E=d*x-v*y,h=v*g-m*x;p*p+E*E+h*h>=1e-20&&s.push(o[a],o[a+1],o[a+2])}return{positions:e.positions,normals:e.normals,indices:new Uint32Array(s),vertexCount:e.vertexCount,faceCount:s.length/3}}function wa(e){const t=e.positions,o=e.indices,n=e.normals,s=e.vertexCount,r=e.faceCount;for(let a=0;a<s*3;a++)n[a]=0;for(let a=0;a<r;a++){const i=a*3,l=o[i],f=o[i+1],v=o[i+2],m=l*3,d=f*3,x=v*3,g=t[d]-t[m],y=t[d+1]-t[m+1],p=t[d+2]-t[m+2],E=t[x]-t[m],h=t[x+1]-t[m+1],S=t[x+2]-t[m+2],C=y*S-p*h,N=p*E-g*S,k=g*h-y*E;n[m]+=C,n[m+1]+=N,n[m+2]+=k,n[d]+=C,n[d+1]+=N,n[d+2]+=k,n[x]+=C,n[x+1]+=N,n[x+2]+=k}for(let a=0;a<s;a++){const i=a*3,l=n[i],f=n[i+1],v=n[i+2],m=Math.sqrt(l*l+f*f+v*v);if(m>1e-12){const d=1/m;n[i]*=d,n[i+1]*=d,n[i+2]*=d}}return e}function Sa(e){const t=e.positions,o=e.indices,n=e.vertexCount,s=e.faceCount;let r=0,a=0,i=0;for(let f=0;f<n;f++){const v=f*3;r+=t[v],a+=t[v+1],i+=t[v+2]}const l=1/n;r*=l,a*=l,i*=l;for(let f=0;f<s;f++){const v=f*3,m=o[v],d=o[v+1],x=o[v+2],g=m*3,y=d*3,p=x*3,E=(t[g]+t[y]+t[p])/3,h=(t[g+1]+t[y+1]+t[p+1])/3,S=(t[g+2]+t[y+2]+t[p+2])/3,C=t[y]-t[g],N=t[y+1]-t[g+1],k=t[y+2]-t[g+2],F=t[p]-t[g],D=t[p+1]-t[g+1],V=t[p+2]-t[g+2],u=N*V-k*D,c=k*F-C*V,L=C*D-N*F;if(u*(E-r)+c*(h-a)+L*(S-i)<0){const P=o[v+1];o[v+1]=o[v+2],o[v+2]=P}}return e}function Ca(e,t){const o=t??{},n=o.smoothing??!0,s=o.smoothIterations??5,r=o.lambda??.5,a=o.mu??-(r+.03);return o.mergeVertices&&(e=ba(e,o.mergeEpsilon??1e-6)),e.faceCount<5e6&&(e=ya(e)),n&&s>0&&(e.vertexCount>5e6?console.warn("Skipping smoothing: "+e.vertexCount.toLocaleString()+" vertices too large (>5M limit)"):e=ga(e,r,a,s)),o.consistentWinding&&(e=Sa(e)),e=wa(e),e}class Ma{constructor(t){oe(this,"_buf");oe(this,"_view");oe(this,"_u8");oe(this,"_pos");t||(t=1024*1024),this._buf=new ArrayBuffer(t),this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf),this._pos=0}get pos(){return this._pos}set pos(t){this._pos=t}_grow(t){const o=this._pos+t;if(o<=this._buf.byteLength)return;let n=this._buf.byteLength;for(;n<o;)n*=2;const s=new ArrayBuffer(n);new Uint8Array(s).set(this._u8),this._buf=s,this._view=new DataView(this._buf),this._u8=new Uint8Array(this._buf)}u8(t){this._grow(1),this._view.setUint8(this._pos,t),this._pos+=1}u16(t){this._grow(2),this._view.setUint16(this._pos,t,!0),this._pos+=2}u32(t){this._grow(4),this._view.setUint32(this._pos,t,!0),this._pos+=4}i32(t){this._grow(4),this._view.setInt32(this._pos,t,!0),this._pos+=4}f32(t){this._grow(4),this._view.setFloat32(this._pos,t,!0),this._pos+=4}raw(t){const o=t.length;this._grow(o),this._u8.set(t,this._pos),this._pos+=o}str(t){const o=t.length;this._grow(o);for(let n=0;n<o;n++)this._u8[this._pos++]=t.charCodeAt(n)&127}strNull(t){this.str(t),this.u8(0)}pad(t){this.padWith(t,0)}padWith(t,o){const n=this._pos%t;if(n===0)return;const s=t-n;this._grow(s);for(let r=0;r<s;r++)this._u8[this._pos++]=o}bulkF32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU32(t){const o=t.byteLength;this._grow(o),this._u8.set(new Uint8Array(t.buffer,t.byteOffset,o),this._pos),this._pos+=o}bulkU8(t){this.raw(t)}result(){return this._buf.slice(0,this._pos)}}function Ta(e){const t=e.positions,o=e.normals,n=e.colors,s=e.indices,r=e.vertexCount,a=e.faceCount,i=n!=null&&n.length>0,l=[1/0,1/0,1/0],f=[-1/0,-1/0,-1/0];for(let R=0;R<r;R++){const O=t[R*3],w=t[R*3+1],I=t[R*3+2];O<l[0]&&(l[0]=O),w<l[1]&&(l[1]=w),I<l[2]&&(l[2]=I),O>f[0]&&(f[0]=O),w>f[1]&&(f[1]=w),I>f[2]&&(f[2]=I)}const v=r*12,m=r*12,d=i?r*16:0,x=a*3*4,g=0,y=v,p=v+m,E=v+m+d,h=v+m+d+x,S=(4-h%4)%4,C=h+S,N=[],k=[],F={};let D=0,V=0;N.push({buffer:0,byteOffset:g,byteLength:v,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:r,type:"VEC3",min:[l[0],l[1],l[2]],max:[f[0],f[1],f[2]]}),F.POSITION=V,D++,V++,N.push({buffer:0,byteOffset:y,byteLength:m,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:r,type:"VEC3"}),F.NORMAL=V,D++,V++,i&&(N.push({buffer:0,byteOffset:p,byteLength:d,target:34962}),k.push({bufferView:D,byteOffset:0,componentType:5126,count:r,type:"VEC4"}),F.COLOR_0=V,D++,V++);const u=V;N.push({buffer:0,byteOffset:E,byteLength:x,target:34963}),k.push({bufferView:D,byteOffset:0,componentType:5125,count:a*3,type:"SCALAR"});const c={attributes:F,indices:u,mode:4},L={asset:{version:"2.0",generator:"GMT Fractal Explorer"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[c]}],accessors:k,bufferViews:N,buffers:[{byteLength:h}]};i&&(L.materials=[{name:"FractalVertexColor",pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}}],c.material=0);const P=JSON.stringify(L),B=(4-P.length%4)%4,z=P.length+B,T=20+z+8+C,j=20+z+8,A=new Ma(j+16);A.u32(1179937895),A.u32(2),A.u32(T),A.u32(z),A.u32(1313821514),A.str(P);for(let R=0;R<B;R++)A.u8(32);A.u32(C),A.u32(5130562);const M=R=>R.buffer.slice(R.byteOffset,R.byteOffset+R.byteLength),_=[A._buf.slice(0,A._pos),M(t),M(o)];if(i){const R=new Float32Array(r*4);for(let O=0;O<r*4;O++)R[O]=n[O]/255;_.push(R.buffer)}return _.push(M(s)),S>0&&_.push(new ArrayBuffer(S)),new Blob(_,{type:"application/octet-stream"})}async function Ea(e,t){const o=t||function(){},n=e.positions,s=e.indices,r=e.faceCount,a=new ArrayBuffer(84),i=new DataView(a),l="Fractal Mesh Export - GMT Fractal Explorer";for(let d=0;d<l.length;d++)i.setUint8(d,l.charCodeAt(d)&127);for(let d=l.length;d<80;d++)i.setUint8(d,32);i.setUint32(80,r,!0);const f=[new Uint8Array(a)],v=65536,m=Math.ceil(r/v);for(let d=0;d<r;d+=v){const x=Math.min(d+v,r),g=x-d,y=new ArrayBuffer(g*50),p=new DataView(y);let E=0;for(let S=d;S<x;S++){const C=s[S*3],N=s[S*3+1],k=s[S*3+2],F=n[C*3],D=n[C*3+1],V=n[C*3+2],u=n[N*3],c=n[N*3+1],L=n[N*3+2],P=n[k*3],B=n[k*3+1],z=n[k*3+2],T=u-F,j=c-D,A=L-V,M=P-F,_=B-D,R=z-V;let O=j*R-A*_,w=A*M-T*R,I=T*_-j*M;const G=Math.sqrt(O*O+w*w+I*I);G>1e-12&&(O/=G,w/=G,I/=G),p.setFloat32(E,O,!0),p.setFloat32(E+4,w,!0),p.setFloat32(E+8,I,!0),p.setFloat32(E+12,F,!0),p.setFloat32(E+16,D,!0),p.setFloat32(E+20,V,!0),p.setFloat32(E+24,u,!0),p.setFloat32(E+28,c,!0),p.setFloat32(E+32,L,!0),p.setFloat32(E+36,P,!0),p.setFloat32(E+40,B,!0),p.setFloat32(E+44,z,!0),p.setUint16(E+48,0,!0),E+=50}f.push(new Uint8Array(y));const h=d/v|0;h&7||(o(Math.round(100*(h+1)/m)),await new Promise(function(S){setTimeout(S,0)}))}return o(100),new Blob(f,{type:"application/octet-stream"})}function yo(e,t){if(t==="stl")return 84+e.faceCount*50;{const n=e.colors!=null&&e.colors.length>0?e.vertexCount*16:0;return 1024+e.vertexCount*24+n+e.faceCount*12}}function Fa(e,t){const o=document.createElement("a");o.href=URL.createObjectURL(e),o.download=t,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(o.href)}function Re(e){return e.tick?e.tick():new Promise(t=>setTimeout(t,0))}async function Pa(e,t){const{N:o,iters:n,smoothPasses:s,useNewton:r,newtonSteps:a,smoothLambda:i,definition:l,formulaParams:f,power:v,deType:m,deSamples:d,zSubSlices:x,minFeatureSel:g,closingRadius:y,colorSamples:p,colorJitterMul:E,cavityFillMode:h,cavityFillLevel:S,gridMin:C,gridMax:N,boundsRange:k,interlace:F,estimator:D,distanceMetric:V}=e;let u=e.surfaceThreshold??0;const L=(m==="auto"?qt(l):m)==="ifs"&&D!==void 0&&D>=1.5&&D<2.5?1:D,P=L!==void 0||V!==void 0?{estimator:L??0,distanceMetric:V??0}:void 0,B={log:t.log,setStatus:t.setStatus,setProgress:t.setProgress,setPhase:t.setPhase,tick:t.tick,onSlicePreview:t.onSlicePreview},z=o>256,T=k/o,j=performance.now();let A=null,M=null,_,R,O=0,w=0,I=0,G=0,H=0,X=0,$=null,U=null,Z=!1,Q=!1;const ne=l.name||l.id||"unknown";t.log("=== Generate: "+ne+" ===","phase"),t.log("Resolution: "+o+"³ | Iterations: "+n+" | DE: "+m+" | SS: "+d+"³="+d*d*d+(x>1?" | Z-SS: "+x:"")+" | Newton: "+(r?a+" steps":"off")+" | Smooth: "+s+"×λ"+i+(p>1?" | Color-SS: "+p+"×r"+E:"")+" | MinFeat: "+g+" | CavityFill: "+(h==="escape"?"escape-test":S+"x")+" | Closing: "+y,"data"),t.log("Params: "+JSON.stringify(f).substring(0,200),"data"),t.log("Bounds: min=["+C[0].toFixed(2)+","+C[1].toFixed(2)+","+C[2].toFixed(2)+"] max=["+N[0].toFixed(2)+","+N[1].toFixed(2)+","+N[2].toFixed(2)+"] range="+k.toFixed(2),"data");let K;if(m==="ifs")K=Math.ceil(Math.log2(k/T));else{const ee=Math.max(v,2);K=Math.ceil(Math.log(k/T)/Math.log(ee))}n>K+2&&t.log("Note: At "+o+"³ (voxel="+T.toFixed(5)+"), ~"+K+" iterations resolve detail at voxel scale. Using "+n+" adds "+(n-K)+" levels of sub-voxel interior detail. Min Feature filter will clamp this. Consider reducing iterations for faster export.","warn");try{try{if(t.log("[Phase 1] GPU SDF Sampling","phase"),t.setPhase("Phase 1: SDF Sampling",0),t.memAlloc("webgl","WebGL",8,t.MEM_COLORS.webgl),t.setStatus("Initializing WebGL2..."),await Re(t),M=vt(),t.log("WebGL2 initialized (max texture: "+M.getParameter(M.MAX_TEXTURE_SIZE)+")","info"),z){t.log("Pass 1: Coarse SDF 128³ ("+(128*128*128*4/(1024*1024)).toFixed(1)+" MB)","info"),t.setStatus("Pass 1: Coarse SDF (128³)..."),await Re(t);const W=Je(M,Math.min(128,2048),l,d,t.log,F,P),te=Math.round(128*128*128*4/(1024*1024));t.memAlloc("coarseGrid","Coarse SDF",te,t.MEM_COLORS.coarseGrid);let ce=await vo(M,W,128,v,n,f,C,N,0,10,1,null,null,B,F,u);_=performance.now();let se=0,J=0,ae=1/0;for(let ue=0;ue<ce.length;ue++){const we=ce[ue];we>=0?se++:J++,we<ae&&(ae=we)}if(t.log("Coarse: "+se.toLocaleString()+" outside, "+J.toLocaleString()+" inside ("+((_-j)/1e3).toFixed(1)+"s)","data"),J===0&&ae<10&&u===0){const ue=k/128,we=ae+ue*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+ae.toFixed(6)+" → threshold="+we.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let ye=0;ye<ce.length;ye++)ce[ye]-=we;u=we,J=0;for(let ye=0;ye<ce.length;ye++)ce[ye]<0&&J++;t.log("After auto-threshold: "+J.toLocaleString()+" interior coarse cells","data")}else J===0&&t.log("WARNING: No interior voxels in coarse grid — surface may not be found","warn");t.setStatus("Building narrow band for "+o+"³..."),await Re(t);const fe=On(ce,128,o,8,2);ce=null,t.memFree("coarseGrid"),$=fe.grid;const pe=Math.pow(o/$.blockSize,3),be=($.allocatedCount/pe*100).toFixed(1),Fe=Math.round($.memoryMB());t.memAlloc("sparseGrid","Sparse SDF",Fe,t.MEM_COLORS.sparseGrid),t.log("Narrow band: "+$.allocatedCount.toLocaleString()+" blocks ("+be+"% of "+pe.toLocaleString()+"), "+Fe+" MB","data"),t.log("Pass 2: Fine SDF "+o+"³ (narrow-band, "+$.memoryMB().toFixed(0)+" MB allocated)","info"),t.setStatus("Pass 2: Fine SDF ("+o+"³ narrow-band)..."),await Re(t),M.deleteTexture(W.tex),M.deleteFramebuffer(W.fbo);const Ee=Je(M,Math.min(o,2048),l,d,t.log,F,P);await na(M,Ee,$,v,n,f,C,N,10,25,B,F,u),O=performance.now(),R=O,t.log("Fine sampling done: "+((R-_)/1e3).toFixed(1)+"s","success")}else{const q=Math.round(o*o*o*4/1048576);t.memAlloc("sdfGrid","SDF Grid",q,t.MEM_COLORS.sdfGrid),t.log("Dense SDF "+o+"³ ("+q+" MB grid)","info");const W=await Ho(M,l,f,o,v,n,C,N,T,B,F,P,u),te=Je(M,Math.min(o,2048),l,d,t.log,F,P);U=await vo(M,te,o,v,n,f,C,N,0,35,x,W.zSliceMin,W.zSliceMax,B,F,u),O=performance.now();let ce=0,se=0,J=0;for(let ae=0;ae<U.length;ae++){const fe=U[ae];isNaN(fe)?J++:fe>0?ce++:se++}if(t.log("SDF: "+ce.toLocaleString()+" outside, "+se.toLocaleString()+" inside"+(J>0?", "+J+" NaN!":"")+" ("+((O-j)/1e3).toFixed(1)+"s)","data"),se===0&&u===0){let ae=1/0;for(let fe=0;fe<U.length;fe++)U[fe]<ae&&(ae=U[fe]);if(ae<10){const fe=ae+T*2;t.log("Auto-threshold: DE always positive (IFS/surface fractal), min="+ae.toFixed(6)+" → threshold="+fe.toFixed(6)+". Set “Surface Threshold” in Quality to control shell thickness.","warn");for(let pe=0;pe<U.length;pe++)U[pe]-=fe;u=fe}}}}catch(q){t.checkCancel();const W=q;throw t.log("PHASE 1 FAILED: "+W.message,"error"),t.log(W.stack||"","error"),t.setStatus("Error in SDF sampling: "+W.message),q}t.checkCancel();let ee=0;g==="auto"?ee=T*1.5:parseFloat(g)>0&&(ee=T*parseFloat(g));{let q=1/0,W=-1/0,te=0,ce=0;if(z&&$)$.blocks.forEach(se=>{for(let J=0;J<se.length;J++){const ae=se[J];ae<q&&(q=ae),ae>W&&(W=ae),ae<0&&te++,ce++}});else if(U){ce=U.length;for(let se=0;se<U.length;se++){const J=U[se];J<q&&(q=J),J>W&&(W=J),J<0&&te++}}if(t.log("SDF range: ["+q.toFixed(6)+", "+W.toFixed(6)+"] | "+te.toLocaleString()+" interior cells of "+ce.toLocaleString()+" | threshold="+(ee>0?ee.toFixed(6):"off"),"data"),te===0&&q>0&&q<10){const se=q+T*2;if(t.log("Auto-threshold: no interior found, SDF min="+q.toFixed(6)+" → applying threshold "+se.toFixed(6)+" (set Surface Threshold manually to control shell thickness)","warn"),z&&$)$.blocks.forEach(J=>{for(let ae=0;ae<J.length;ae++)J[ae]-=se});else if(U)for(let J=0;J<U.length;J++)U[J]-=se;te=z&&$?(()=>{let J=0;return $.blocks.forEach(ae=>{for(let fe=0;fe<ae.length;fe++)ae[fe]<0&&J++}),J})():U?U.reduce((J,ae)=>J+(ae<0?1:0),0):0,t.log("After auto-threshold: "+te.toLocaleString()+" interior cells","data")}if(S>0||ee>0||y>0){if(t.log("[Phase 1b] SDF Filtering","phase"),t.setPhase("Phase 1b: SDF Filtering",0),t.setStatus("Filtering SDF..."),await Re(t),S>0){if(h==="escape"&&z&&$&&M){t.setStatus("Cavity fill (escape test)..."),t.setPhase("Phase 1b: Escape Test",0);const se=await sa(M,$,l,v,n,f,C,N,B,ae=>{t.setPhase("Phase 1b: Escape Test",ae)},F);let J=0;$.blocks.forEach((ae,fe)=>{const pe=se.escapeMap.get(fe);if(pe)for(let be=0;be<ae.length;be++)ae[be]>=0&&pe[be>>3]&1<<(be&7)&&(ae[be]=-Math.abs(ae[be])-.001,J++)}),t.log("Cavity fill (escape test): "+se.solidCount.toLocaleString()+" escape-interior cells, "+J.toLocaleString()+" positive cells filled","data")}else if(z&&$){t.setStatus("Cavity fill (dilate r="+S+", then flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const se=await va($,S,J=>{t.setPhase("Phase 1b: Cavity Fill (r="+S+")",J)},()=>{t.checkCancel()});t.log("Cavity fill: dilate="+S+" | "+se.dilated.toLocaleString()+" dilated, "+se.filled.toLocaleString()+" filled solid","data")}else if(U){t.setStatus("Cavity fill (flood)..."),t.setPhase("Phase 1b: Cavity Fill",0);const se=await pa(U,o,J=>{t.setPhase("Phase 1b: Cavity Fill",J)},()=>{t.checkCancel()});t.log("Cavity fill: "+se.toLocaleString()+" cells filled solid","data")}}if(ee>0){let se;z&&$?se=da($,ee):U?se=fa(U,o,ee):se=0,t.log("Min feature clamp: threshold="+ee.toFixed(6)+" ("+(ee/T).toFixed(1)+"x voxel), "+se.toLocaleString()+" cells clamped","data")}y>0&&(t.setStatus("Morphological closing (r="+y+" voxels)..."),z&&$?await ha($,y,se=>{t.setPhase("Phase 1b: Morph Closing",se)}):U&&await ma(U,o,y,se=>{t.setPhase("Phase 1b: Morph Closing",se)}),t.log("Morphological closing: radius="+y+" voxels","data")),t.setPhase("Phase 1b: SDF Filtering",100)}}t.checkCancel();try{if(t.log("[Phase 2] Dual Contouring","phase"),t.setPhase("Phase 2: Dual Contouring",0),t.setProgress(35),await Re(t),z&&$)t.setStatus("Dual contouring (sparse, "+o+"³)..."),A=await jn($,C,N,(se,J)=>{t.setProgress(35+Math.round(J*.25)),t.setPhase("Phase 2: Dual Contouring",J)});else if(U){t.setStatus("Dual contouring ("+o+"³)...");const ce=Math.round(Math.log2(o));A=await Bn(U,o,C,N,ce,(J,ae)=>{t.setProgress(35+Math.round(ae*.25)),t.setPhase("Phase 2: Dual Contouring",ae)}),U=null,t.memFree("sdfGrid")}if(w=performance.now(),!A||A.vertexCount===0)return t.log("No surface found — check parameters and bounds","error"),t.setStatus("No surface found! Try different parameters."),{mesh:null,timings:null,baseName:"",newtonApplied:!1,useNarrowBand:z,gl:M};t.log("DC result: "+A.vertexCount.toLocaleString()+" vertices, "+A.faceCount.toLocaleString()+" faces ("+((w-O)/1e3).toFixed(1)+"s)","data");const q=(A.positions.byteLength/(1024*1024)).toFixed(0),W=(A.normals.byteLength/(1024*1024)).toFixed(0),te=(A.indices.byteLength/(1024*1024)).toFixed(0);t.log("Mesh memory: positions="+q+"MB normals="+W+"MB indices="+te+"MB (total "+(parseInt(q)+parseInt(W)+parseInt(te))+"MB)","mem"),$&&($=null,t.memFree("sparseGrid"),t.log("Sparse grid freed","mem")),t.memAlloc("meshPos","Positions",parseInt(q),t.MEM_COLORS.meshPos),t.memAlloc("meshNrm","Normals",parseInt(W),t.MEM_COLORS.meshNrm),t.memAlloc("meshIdx","Indices",parseInt(te),t.MEM_COLORS.meshIdx),t.setStatus("Mesh: "+A.vertexCount.toLocaleString()+" verts, "+A.faceCount.toLocaleString()+" faces"),t.setProgress(60),await Re(t)}catch(q){t.checkCancel();const W=q;throw t.log("PHASE 2 FAILED: "+W.message,"error"),t.log(W.stack||"","error"),t.setStatus("Error in dual contouring: "+W.message),q}t.checkCancel(),X=w;const re=k/o;if(r&&A&&M)try{t.log("[Phase 3] Newton Projection","phase"),t.setPhase("Phase 3: Newton Projection",0),t.log("Mode: GPU (float32, generic formula) — "+A.vertexCount.toLocaleString()+" vertices","info");const q=Math.ceil(Math.sqrt(A.vertexCount));t.log("Newton texture: "+q+"x"+q+" ("+(q*q*16*3/(1024*1024)).toFixed(0)+" MB GPU)","mem"),t.setStatus("GPU Newton projection ("+A.vertexCount.toLocaleString()+" vertices)..."),t.setPhase("Phase 3: Newton Projection",50),await Re(t),ra(M,A,l,f,v,n,re,a,t.log,F),X=performance.now(),Q=!0,t.setPhase("Phase 3: Newton Projection",100),t.log("GPU Newton done: "+((X-w)/1e3).toFixed(1)+"s","success")}catch(q){t.checkCancel(),X=performance.now();const W=q;t.log("Newton FAILED: "+W.message,"error"),t.log(W.stack||"","error"),t.setStatus("Newton failed — continuing without projection"),await Re(t)}t.setProgress(70),t.checkCancel();try{t.log("[Phase 4] Post-processing","phase"),t.setPhase("Phase 4: Post-processing",0),t.setStatus("Post-processing (smoothing, normals)..."),await Re(t),Z=A.vertexCount>5e6,Z&&t.log("Large mesh ("+A.vertexCount.toLocaleString()+" verts) — smoothing disabled to avoid OOM","warn"),A=Ca(A,{smoothing:s>0,smoothIterations:s,lambda:i}),I=performance.now(),t.setPhase("Phase 4: Post-processing",100),t.log("Post-processing done: "+((I-X)/1e3).toFixed(1)+"s","success")}catch(q){t.checkCancel(),I=performance.now();const W=q;throw t.log("PHASE 4 FAILED: "+W.message,"error"),t.log(W.stack||"","error"),t.setStatus("Error in post-processing: "+W.message),q}t.setProgress(80),t.checkCancel();try{t.log("[Phase 5] Vertex Coloring","phase"),t.setPhase("Phase 5: Vertex Coloring",0),t.setStatus("Colorizing vertices..."),await Re(t),(!M||M.isContextLost())&&(t.log("Re-initializing WebGL for colorizer","warn"),M=vt());const q=T*E;A.colors=await ia(M,A,l,f,v,n,p,q,B,F),G=performance.now(),t.setPhase("Phase 5: Vertex Coloring",100);const W=(A.vertexCount*3/(1024*1024)).toFixed(1);t.memAlloc("meshCol","Colors",parseFloat(W),t.MEM_COLORS.meshCol),t.log("Coloring done: "+((G-I)/1e3).toFixed(1)+"s"+(p>1?" ("+p+" samples)":""),"success")}catch(q){t.checkCancel(),G=performance.now();const W=q;t.log("PHASE 5 FAILED: "+W.message,"error"),t.log(W.stack||"","error"),t.log("Continuing without vertex colors","warn")}t.setProgress(90),t.checkCancel(),H=performance.now(),t.setProgress(100),t.setPhase("Complete",100),t.setStatus("Done — choose format and export");const ie=((H-j)/1e3).toFixed(1);t.log("=== Complete in "+ie+"s ===","phase");const le=(l.name||l.id||"fractal").toLowerCase().replace(/\s+/g,"-"),ve={total:H-j,sdf:O-j,coarse:_?_-j:0,fine:R&&_?R-_:0,dc:w-O,newton:X-w,post:I-X,color:G-I};return{mesh:A,baseName:le,smoothingSkipped:Z,newtonApplied:Q,timings:ve,useNarrowBand:z,gl:M}}catch(ee){if(M)try{const re=M.getExtension("WEBGL_lose_context");re&&re.loseContext()}catch{}throw ee}}async function Aa(e,t,o,n,s){const r=performance.now();let a,i;if(s.log("[Export] Encoding "+e.toUpperCase()+"...","phase"),s.setStatus("Encoding "+e.toUpperCase()+"..."),s.setPhase("Export "+e.toUpperCase(),0),e==="vdb"){const{definition:v,formulaParams:m,N:d,iters:x,power:g,gridMin:y,gridMax:p,deSamples:E,zSubSlices:h,interlace:S,estimator:C,distanceMetric:N,surfaceThreshold:k}=n,F=C!==void 0||N!==void 0?{estimator:C??0,distanceMetric:N??0}:void 0,D=v.name||v.id||"unknown";s.log("=== VDB Export: "+D+" ===","phase"),s.log("Resolution: "+d+"³ | Iterations: "+x+" | Mode: solid | Z Sub-slices: "+h,"data");const V=vt(),u={log:s.log,setStatus:s.setStatus,setProgress:s.setProgress,setPhase:s.setPhase,tick:s.tick,onSlicePreview:s.onSlicePreview,memAlloc:s.memAlloc,memFree:s.memFree},c=await aa(V,v,m,d,g,x,y,p,"solid",E,h,u,S,F,k,n.vdbColor);try{const z=V.getExtension("WEBGL_lose_context");z&&z.loseContext()}catch{}a=c.blob;const L=(v.name||v.id||"fractal").toLowerCase().replace(/\s+/g,"-"),P=new Date().toISOString().replace(/[-:T]/g,"").slice(0,12),B=n.vdbColor?"-density-color":"-density";i=L+"-"+d+B+"-"+P+".vdb",s.log("VDB: "+c.voxelCount.toLocaleString()+" active voxels, "+c.leafCount+" leaf blocks"+(c.promoted.promotedLeaves?", "+c.promoted.promotedLeaves+" tiles promoted":"")+(c.skippedSlices>0?", "+c.skippedSlices+" empty slices skipped":""),"data")}else if(e==="glb"){const v=yo(t,e);s.log("Estimated size: ~"+(v/(1024*1024)).toFixed(0)+" MB","mem"),a=Ta(t),i=o+".glb",s.setPhase("Export GLB",100)}else{const v=yo(t,e);s.log("Estimated size: ~"+(v/(1024*1024)).toFixed(0)+" MB","mem"),a=await Ea(t,m=>{s.setPhase("Export STL",m),s.setStatus("Encoding STL... "+m+"%")}),i=o+".stl"}const l=performance.now(),f=(a.size/(1024*1024)).toFixed(2);return s.memAlloc("exportBlob",e.toUpperCase()+" Blob",parseFloat(f),s.MEM_COLORS.exportBlob),s.log("Export: "+f+" MB "+e.toUpperCase()+" ("+((l-r)/1e3).toFixed(1)+"s)","success"),s.setStatus(f+" MB "+e.toUpperCase()+" ready"),s.setPhase("Export complete",100),{blob:a,filename:i}}const Ia={webgl:"#47a",coarseGrid:"#7af",sparseGrid:"#5a8",sdfGrid:"#7af",meshPos:"#f80",meshNrm:"#fa0",meshIdx:"#fc0",meshCol:"#f5a",exportBlob:"#5af"},ut="font-mono text-[13px] font-bold border-none rounded px-4 py-2 cursor-pointer transition-opacity disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-default",Da=()=>{const e=Y(),t=Y(h=>h.isRunning),o=Y(h=>h.exportFormat),n=Y(h=>h.lastMesh),s=Y(h=>h.lastBlob),r=Y(h=>h.lastFilename),a=Y(h=>h.loadedDefinition),i=Y(h=>h.selectedFormulaId),l=Y(h=>h.customFilename),f=Y(h=>h.vdbColor),v=!!(a||Oe.get(i)),m=o==="vdb";function d(){const h=Y.getState(),S=h.loadedDefinition||Oe.get(h.selectedFormulaId),C=h.bboxSize.map(c=>c/2),N=[h.bboxCenter[0]-C[0],h.bboxCenter[1]-C[1],h.bboxCenter[2]-C[2]],k=[h.bboxCenter[0]+C[0],h.bboxCenter[1]+C[1],h.bboxCenter[2]+C[2]];let F,D;h.cavityFill==="escape"?(F="escape",D=1):(F="dilate",D=parseInt(h.cavityFill)||0);let V;h.interlaceState&&(V={definition:h.interlaceState.definition,params:h.interlaceState.params,enabled:h.interlaceState.enabled,interval:h.interlaceState.interval,startIter:h.interlaceState.startIter});const u=h.qualitySettings;return{N:h.resolution,iters:h.iters,smoothPasses:h.smoothPasses,useNewton:h.newton,newtonSteps:h.newtonSteps,smoothLambda:h.smoothLambda,definition:S,formulaParams:h.formulaParams,power:h.formulaParams.paramA||8,deType:h.deType,deSamples:h.deSamples,zSubSlices:h.zSubSlices,minFeatureSel:h.minFeature,closingRadius:h.closingRadius,colorSamples:h.colorSamples,colorJitterMul:h.colorJitter,cavityFillMode:F,cavityFillLevel:D,gridMin:N,gridMax:k,boundsRange:k[0]-N[0],interlace:V,estimator:u.estimator,distanceMetric:u.distanceMetric,surfaceThreshold:u.surfaceThreshold}}function x(){return{setStatus:h=>Y.getState().setStatus(h),setProgress:h=>Y.getState().setProgress(h),setPhase:(h,S)=>Y.getState().setPhase(h,S),log:(h,S)=>Y.getState().addLog(h,S),memAlloc:(h,S,C,N)=>Y.getState().memAlloc(h,S,C,N),memFree:h=>Y.getState().memFree(h),tick:async()=>{if(await new Promise(h=>setTimeout(h,0)),Y.getState().isCancelled)throw new Error("Cancelled")},checkCancel:()=>{if(Y.getState().isCancelled)throw new Error("Cancelled")},onSlicePreview:(h,S,C)=>{xn(h,S,C)},MEM_COLORS:Ia}}const g=async()=>{const h=Y.getState();h.setMesh(null,""),h.setExportBlob(null,""),h.setRunning(!0),h.setCancelled(!1),h.setProgress(0),h.setPhase("",0),h.clearMemory(),fo(),ho();try{const S=await Pa(d(),x()),C=Y.getState();C.setMesh(S.mesh,S.baseName),C.setTimings(S.timings,S.smoothingSkipped??!1,S.useNarrowBand),S.gl&&C.setGL(S.gl)}catch(S){const C=S;C.message!=="Cancelled"?(Y.getState().addLog("ERROR: "+C.message,"error"),Y.getState().setStatus("Error: "+C.message)):(Y.getState().addLog("Cancelled","warn"),Y.getState().setStatus("Cancelled"))}finally{Y.getState().setRunning(!1)}},y=()=>{_n(),zn(),Y.getState().setCancelled(!0)},p=async()=>{const h=Y.getState();h.setRunning(!0),h.setCancelled(!1),fo(),ho();try{const S=d(),C=await Aa(h.exportFormat,h.lastMesh,h.lastBaseName,{definition:S.definition,formulaParams:S.formulaParams,N:S.N,iters:S.iters,power:S.power,gridMin:S.gridMin,gridMax:S.gridMax,deSamples:S.deSamples,zSubSlices:S.zSubSlices,interlace:S.interlace,estimator:S.estimator,distanceMetric:S.distanceMetric,surfaceThreshold:S.surfaceThreshold,vdbColor:h.vdbColor},x()),N=Y.getState().customFilename.trim(),k=N?N.replace(/\.[^.]+$/,"")+"."+C.filename.split(".").pop():C.filename;Y.getState().setExportBlob(C.blob,k)}catch(S){const C=S;C.message!=="Cancelled"&&(Y.getState().addLog("Export error: "+C.message,"error"),Y.getState().setStatus("Export error: "+C.message))}finally{Y.getState().setRunning(!1)}},E=()=>{s&&r&&Fa(s,r)};return b.jsxs("div",{className:"font-mono flex flex-col gap-2 mt-1",children:[b.jsx(Te,{label:"Format",value:o,options:[{label:"GLB (Binary glTF)",value:"glb"},{label:"STL (Binary)",value:"stl"},{label:"VDB (OpenVDB)",value:"vdb"}],onChange:e.setExportFormat,fullWidth:!0}),b.jsxs("div",{className:"flex items-center gap-2",children:[b.jsx("span",{className:"text-[10px] text-gray-500 uppercase tracking-wide shrink-0",children:"Filename"}),b.jsx("input",{type:"text",value:l,onChange:h=>e.setCustomFilename(h.target.value),placeholder:((a==null?void 0:a.name)||i||"fractal").toLowerCase().replace(/\s+/g,"-"),className:"flex-1 h-[26px] bg-gray-800 border border-gray-700 rounded px-2 text-[11px] text-gray-200 font-mono placeholder:text-gray-600"}),b.jsxs("span",{className:"text-[10px] text-gray-600",children:[".",o]})]}),m&&b.jsx("div",{className:"text-[11px] text-sky-400 bg-sky-900/20 px-2 py-1 rounded",children:"VDB exports directly — no Generate needed"}),m&&b.jsxs("label",{className:"flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer select-none",children:[b.jsx("input",{type:"checkbox",checked:f,onChange:h=>e.setVdbColor(h.target.checked),className:"accent-amber-500"}),"Include color grids (slower)"]}),b.jsxs("div",{className:"flex gap-2 flex-wrap",children:[!m&&b.jsxs("button",{disabled:t||!v,onClick:g,className:`${ut} bg-emerald-700 text-white hover:bg-emerald-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:"1"}),"Generate"]}),t&&b.jsx("button",{onClick:y,className:`${ut} bg-red-700 text-white hover:bg-red-600`,children:"Cancel"}),b.jsxs("button",{disabled:t||!n&&!m,onClick:p,className:`${ut} bg-amber-700 text-white hover:bg-amber-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:m?"1":"2"}),"Export"]}),b.jsxs("button",{disabled:!s,onClick:E,className:`${ut} bg-sky-700 text-white hover:bg-sky-600`,children:[b.jsx("span",{className:"bg-white/15 rounded px-1 mr-1 text-[10px]",children:m?"2":"3"}),"Download",r?` (${r})`:""]})]})]})};function Wo(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function xt(e,t){return[e[0]+t[0],e[1]+t[1],e[2]+t[2]]}function Gt(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function gt(e,t){return[e[0]*t,e[1]*t,e[2]*t]}function Ra(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function to(e,t){const o=Math.cos(e),n=Math.sin(e),s=Math.cos(t),r=Math.sin(t),a=[o,0,-n],i=[-s*n,-r,-s*o],l=Ra(a,i);return{pos:Wo([0,0,0],gt(i,10)),fwd:i,right:a,up:l}}function wo(e,t,o,n,s,r,a){const i=to(t,o),l=a||[0,0,0],f=xt(i.pos,l),v=Wo(e,f),m=Gt(v,i.right),d=Gt(v,i.up),x=r/n;return[s*.5+m*x,r*.5-d*x,0]}function jt(e,t,o,n,s,r){const a=r/s,i=to(o,n),l=e/a,f=-t/a;return xt(gt(i.right,l),gt(i.up,f))}const ft=Math.PI*.5,So=[{angle:0,pitch:0,label:"Front (-Z)"},{angle:Math.PI,pitch:0,label:"Back (+Z)"},{angle:ft,pitch:0,label:"Right (+X)"},{angle:-ft,pitch:0,label:"Left (-X)"},{angle:0,pitch:ft,label:"Top (+Y)"},{angle:0,pitch:-ft,label:"Bottom (-Y)"}],Co=15*Math.PI/180;function Xt(e){return e=e%(2*Math.PI),e>Math.PI&&(e-=2*Math.PI),e<-Math.PI&&(e+=2*Math.PI),e}function Ut(e,t,o){const n=Xt(e);let s=null,r=1/0;for(let a=0;a<So.length;a++){const i=So[a];let l,f;Math.abs(i.pitch)>1?(l=0,f=Math.abs(t-i.pitch)):(l=Math.abs(Xt(n-i.angle)),f=Math.abs(t-i.pitch));const v=Math.sqrt(l*l+f*f);v<o&&v<r&&(r=v,s={angle:Math.abs(i.pitch)>1?n:i.angle,pitch:i.pitch,label:i.label})}return s}function La(){return{positions:null,indices:null,normals:null,vertexCount:0,faceCount:0,rotX:-.4,rotY:.6,zoom:1,cx:0,cy:0,cz:0,scale:1,dragging:!1,lastMX:0,lastMY:0}}function Mo(e,t,o,n,s,r){e.positions=t,e.indices=o,e.vertexCount=n,e.faceCount=s;let a=1/0,i=1/0,l=1/0,f=-1/0,v=-1/0,m=-1/0;for(let d=0;d<n;d++){const x=t[d*3],g=t[d*3+1],y=t[d*3+2];x<a&&(a=x),g<i&&(i=g),y<l&&(l=y),x>f&&(f=x),g>v&&(v=g),y>m&&(m=y)}e.cx=(a+f)/2,e.cy=(i+v)/2,e.cz=(l+m)/2,e.scale=r/(Math.max(f-a,v-i,m-l)*1.15)}function dt(e,t,o,n){if(t.fillStyle="#111",t.fillRect(0,0,o,n),!e.positions||!e.indices||e.vertexCount===0)return;const s=Math.cos(e.rotX),r=Math.sin(e.rotX),a=Math.cos(e.rotY),i=Math.sin(e.rotY),l=e.scale*e.zoom,f=e.positions,v=e.cx,m=e.cy,d=e.cz;function x(E){const h=f[E*3]-v,S=f[E*3+1]-m,C=f[E*3+2]-d,N=h*a-C*i,k=h*i+C*a,F=S*s-k*r;return[N*l+o/2,n/2-F*l]}const g=15e4,y=e.faceCount>g?Math.ceil(e.faceCount/g):1;let p=0;t.strokeStyle="rgba(42,170,85,0.12)",t.lineWidth=.5,t.beginPath();for(let E=0;E<e.faceCount&&p<g;E+=y){const h=x(e.indices[E*3]),S=x(e.indices[E*3+1]),C=x(e.indices[E*3+2]);t.moveTo(h[0],h[1]),t.lineTo(S[0],S[1]),t.lineTo(C[0],C[1]),t.lineTo(h[0],h[1]),p++}t.stroke(),t.fillStyle="#888",t.font="11px monospace",t.fillText(e.vertexCount.toLocaleString()+" verts, "+e.faceCount.toLocaleString()+" faces",4,n-4),t.fillStyle="#555",t.fillText("drag to rotate, scroll to zoom",4,14)}function To(e,t,o){const n=e.createShader(t);if(e.shaderSource(n,o),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const s=e.getShaderInfoLog(n)||"";throw e.deleteShader(n),new Error("Shader compile: "+s)}return n}function _a(e,t,o){const n=e.createProgram();if(e.attachShader(n,To(e,e.VERTEX_SHADER,t)),e.attachShader(n,To(e,e.FRAGMENT_SHADER,o)),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS)){const s=e.getProgramInfoLog(n)||"";throw e.deleteProgram(n),new Error("Program link: "+s)}return n}function Ba(e,t,o){var s,r,a,i,l,f,v,m,d,x,g,y,p,E,h,S,C,N,k,F,D,V,u,c,L,P,B,z,T,j;const n=o||{};t.uParamA&&e.uniform1f(t.uParamA,n.paramA??8),t.uParamB&&e.uniform1f(t.uParamB,n.paramB??0),t.uParamC&&e.uniform1f(t.uParamC,n.paramC??0),t.uParamD&&e.uniform1f(t.uParamD,n.paramD??0),t.uParamE&&e.uniform1f(t.uParamE,n.paramE??0),t.uParamF&&e.uniform1f(t.uParamF,n.paramF??0),t.uVec2A&&e.uniform2f(t.uVec2A,((s=n.vec2A)==null?void 0:s.x)??0,((r=n.vec2A)==null?void 0:r.y)??0),t.uVec2B&&e.uniform2f(t.uVec2B,((a=n.vec2B)==null?void 0:a.x)??0,((i=n.vec2B)==null?void 0:i.y)??0),t.uVec2C&&e.uniform2f(t.uVec2C,((l=n.vec2C)==null?void 0:l.x)??0,((f=n.vec2C)==null?void 0:f.y)??0),t.uVec3A&&e.uniform3f(t.uVec3A,((v=n.vec3A)==null?void 0:v.x)??0,((m=n.vec3A)==null?void 0:m.y)??0,((d=n.vec3A)==null?void 0:d.z)??0),t.uVec3B&&e.uniform3f(t.uVec3B,((x=n.vec3B)==null?void 0:x.x)??0,((g=n.vec3B)==null?void 0:g.y)??0,((y=n.vec3B)==null?void 0:y.z)??0),t.uVec3C&&e.uniform3f(t.uVec3C,((p=n.vec3C)==null?void 0:p.x)??0,((E=n.vec3C)==null?void 0:E.y)??0,((h=n.vec3C)==null?void 0:h.z)??0),t.uVec4A&&e.uniform4f(t.uVec4A,((S=n.vec4A)==null?void 0:S.x)??0,((C=n.vec4A)==null?void 0:C.y)??0,((N=n.vec4A)==null?void 0:N.z)??0,((k=n.vec4A)==null?void 0:k.w)??0),t.uVec4B&&e.uniform4f(t.uVec4B,((F=n.vec4B)==null?void 0:F.x)??0,((D=n.vec4B)==null?void 0:D.y)??0,((V=n.vec4B)==null?void 0:V.z)??0,((u=n.vec4B)==null?void 0:u.w)??0),t.uVec4C&&e.uniform4f(t.uVec4C,((c=n.vec4C)==null?void 0:c.x)??0,((L=n.vec4C)==null?void 0:L.y)??0,((P=n.vec4C)==null?void 0:P.z)??0,((B=n.vec4C)==null?void 0:B.w)??0),t.uJulia&&e.uniform3f(t.uJulia,((z=n.julia)==null?void 0:z.x)??0,((T=n.julia)==null?void 0:T.y)??0,((j=n.julia)==null?void 0:j.z)??0),t.uJuliaMode&&e.uniform1f(t.uJuliaMode,n.juliaMode??0),t.uEscapeThresh&&e.uniform1f(t.uEscapeThresh,n.escapeThresh??4),t.uDeBailout&&e.uniform1f(t.uDeBailout,n.deBailout??100),t.uDistanceMetric&&e.uniform1f(t.uDistanceMetric,n.distanceMetric??0)}const ge=512,Ne=Math.PI*.5;function za(){const e=Y(u=>u.isRunning),t=Y(u=>u.lastMesh),o=Y(u=>u.loadedDefinition),n=Y(u=>u.bboxCenter),s=Y(u=>u.bboxSize),r=Y(u=>u.formulaParams),a=Y(u=>u.interlaceState),i=Y(u=>u.iters),l=Y(u=>u.qualitySettings),f=Y(u=>u.clipOutsideBounds),v=de.useRef(null),m=de.useRef(null),d=de.useRef(null),x=de.useRef(null),g=de.useRef({gl:null,prog:null,loc:{},defId:null,rawAngle:.6,rawPitch:.3,camAngle:.6,camPitch:.3,camDist:3.5,camTarget:[0,0,0],dragging:!1,dragMode:null,hover:null,lastX:0,lastY:0,shiftHeld:!1,snapped:!1,snapTarget:null,snapAnimId:0,rafId:0}),y=de.useRef(La()),p=t?"mesh":e?"slice":"fractal",E=de.useCallback(()=>{const u=g.current,c=Y.getState(),L=c.loadedDefinition;if(!u.gl||!L)return;const P=u.gl;let B;c.interlaceState&&(B={definition:c.interlaceState.definition,params:c.interlaceState.params,enabled:c.interlaceState.enabled,interval:c.interlaceState.interval,startIter:c.interlaceState.startIter});const z=c.qualitySettings,j=qt(L)==="ifs"&&z.estimator>=1.5&&z.estimator<2.5?1:z.estimator,A=L.id+(B?"+"+B.definition.id:"")+":e"+(j??0);if(u.defId===A&&u.prog)return;u.prog&&(P.deleteProgram(u.prog),u.prog=null);try{const _=Mn({definition:L,deType:"auto",interlace:B,estimator:j});console.log("[Preview] Compiling shader for",L.id,"| estimator:",j,"| length:",_.length),u.prog=_a(P,Qe,_),console.log("[Preview] Shader compiled OK for",L.id)}catch(_){console.warn("Preview shader compile failed for",L.id+":",_.message),u.prog=null,u.defId=null;return}P.useProgram(u.prog),P.bindVertexArray(P.createVertexArray()),u.loc={};const M=["uPower","uIters","uResolution","uCamPos","uCamTarget","uCamRight","uFov","uFudgeFactor","uDetail","uPixelThreshold","uClipBounds","uBoundsMin","uBoundsMax",...qe];for(const _ of M)u.loc[_]=P.getUniformLocation(u.prog,_);u.defId=A},[]),h=de.useCallback(()=>{const u=m.current;if(!u)return;const c=u.getContext("2d"),L=u.width,P=u.height;c.clearRect(0,0,L,P);const B=g.current,z=Y.getState(),[T,j,A]=z.bboxCenter,[M,_,R]=z.bboxSize,O=M*.5,w=_*.5,I=R*.5,G=q=>wo(q,B.camAngle,B.camPitch,B.camDist,ge,ge,B.camTarget),H=[];for(let q=0;q<2;q++)for(let W=0;W<2;W++)for(let te=0;te<2;te++)H.push([T+(q?O:-O),j+(W?w:-w),A+(te?I:-I)]);const X=H.map(G),$=[{color:"#f554",edges:[[0,4],[1,5],[2,6],[3,7]]},{color:"#5f54",edges:[[0,2],[1,3],[4,6],[5,7]]},{color:"#55f4",edges:[[0,1],[2,3],[4,5],[6,7]]}];for(const q of $){c.strokeStyle=q.color,c.lineWidth=1,c.setLineDash([4,3]),c.beginPath();for(const[W,te]of q.edges)c.moveTo(X[W][0],X[W][1]),c.lineTo(X[te][0],X[te][1]);c.stroke()}c.setLineDash([]);const U={"sizeX+":[T+O,j,A],"sizeX-":[T-O,j,A],"sizeY+":[T,j+w,A],"sizeY-":[T,j-w,A],"sizeZ+":[T,j,A+I],"sizeZ-":[T,j,A-I]},Z={"sizeX+":"#f55","sizeX-":"#f55","sizeY+":"#5f5","sizeY-":"#5f5","sizeZ+":"#55f","sizeZ-":"#55f"},Q=Object.keys(U);for(const q of Q){const W=G(U[q]),te=B.hover===q?7:5;c.fillStyle=Z[q],c.beginPath(),c.moveTo(W[0],W[1]-te),c.lineTo(W[0]+te,W[1]),c.lineTo(W[0],W[1]+te),c.lineTo(W[0]-te,W[1]),c.closePath(),c.fill(),B.hover===q&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke())}const ne=[T,j,A],K=G(ne),ee=B.camDist*.12,re=["#f55","#5f5","#55f"],ie=[[1,0,0],[0,1,0],[0,0,1]],le=["X","Y","Z"];for(let q=0;q<3;q++){const W=xt(ne,gt(ie[q],ee)),te=G(W),ce=te[0]-K[0],se=te[1]-K[1],J=Math.sqrt(ce*ce+se*se);if(J<2)continue;const ae=B.hover==="center";c.strokeStyle=re[q],c.lineWidth=ae?3:2,c.beginPath(),c.moveTo(K[0],K[1]),c.lineTo(te[0],te[1]),c.stroke();const fe=ce/J,pe=se/J;c.fillStyle=re[q],c.beginPath(),c.moveTo(te[0],te[1]),c.lineTo(te[0]-fe*6+pe*3,te[1]-pe*6-fe*3),c.lineTo(te[0]-fe*6-pe*3,te[1]-pe*6+fe*3),c.closePath(),c.fill(),c.font="bold 9px monospace",c.fillStyle=re[q],c.fillText(le[q],te[0]+fe*6-3,te[1]+pe*6+3)}const ve=B.hover==="center"?5:3;if(c.fillStyle=B.hover==="center"?"#fc0":"#fa0",c.beginPath(),c.arc(K[0],K[1],ve,0,Math.PI*2),c.fill(),B.hover==="center"&&(c.strokeStyle="#fff",c.lineWidth=1,c.stroke()),B.snapTarget){const q=Ut(B.snapTarget.angle,B.snapTarget.pitch,.1);q&&(c.font="bold 11px monospace",c.fillStyle="#fa0",c.textAlign="right",c.fillText(q.label,L-6,14),c.textAlign="left")}else if(B.shiftHeld){const q=Ut(B.camAngle,B.camPitch,Co);q&&(c.font="10px monospace",c.fillStyle="#888",c.textAlign="right",c.fillText("snap: "+q.label,L-6,14),c.textAlign="left")}},[]),S=de.useCallback(()=>{const u=g.current;if(!u.gl||!u.prog){console.log("[Preview] Render skipped: gl=",!!u.gl,"prog=",!!u.prog);return}const c=u.gl,L=c.canvas;c.viewport(0,0,L.width,L.height),c.useProgram(u.prog);const P=to(u.camAngle,u.camPitch),B=u.camTarget;c.uniform2f(u.loc.uResolution,L.width,L.height),c.uniform3f(u.loc.uCamPos,P.pos[0]+B[0],P.pos[1]+B[1],P.pos[2]+B[2]),c.uniform3f(u.loc.uCamTarget,B[0],B[1],B[2]),c.uniform3f(u.loc.uCamRight,P.right[0],P.right[1],P.right[2]),c.uniform1f(u.loc.uFov,u.camDist);const z=Y.getState(),T=z.formulaParams;if(c.uniform1f(u.loc.uPower,T.paramA??8),c.uniform1i(u.loc.uIters,z.iters),Ba(c,u.loc,T),z.interlaceState){const A=z.interlaceState,M=A.params||{};u.loc.uInterlaceEnabled&&c.uniform1f(u.loc.uInterlaceEnabled,A.enabled?1:0),u.loc.uInterlaceInterval&&c.uniform1f(u.loc.uInterlaceInterval,A.interval??2),u.loc.uInterlaceStartIter&&c.uniform1f(u.loc.uInterlaceStartIter,A.startIter??0),u.loc.uInterlaceParamA&&c.uniform1f(u.loc.uInterlaceParamA,M.paramA??0),u.loc.uInterlaceParamB&&c.uniform1f(u.loc.uInterlaceParamB,M.paramB??0),u.loc.uInterlaceParamC&&c.uniform1f(u.loc.uInterlaceParamC,M.paramC??0),u.loc.uInterlaceParamD&&c.uniform1f(u.loc.uInterlaceParamD,M.paramD??0),u.loc.uInterlaceParamE&&c.uniform1f(u.loc.uInterlaceParamE,M.paramE??0),u.loc.uInterlaceParamF&&c.uniform1f(u.loc.uInterlaceParamF,M.paramF??0);const _=(O,w)=>{u.loc[O]&&c.uniform2f(u.loc[O],(w==null?void 0:w.x)??0,(w==null?void 0:w.y)??0)},R=(O,w)=>{u.loc[O]&&c.uniform3f(u.loc[O],(w==null?void 0:w.x)??0,(w==null?void 0:w.y)??0,(w==null?void 0:w.z)??0)};_("uInterlaceVec2A",M.vec2A),_("uInterlaceVec2B",M.vec2B),_("uInterlaceVec2C",M.vec2C),R("uInterlaceVec3A",M.vec3A),R("uInterlaceVec3B",M.vec3B),R("uInterlaceVec3C",M.vec3C)}else u.loc.uInterlaceEnabled&&c.uniform1f(u.loc.uInterlaceEnabled,0);const j=z.qualitySettings;if(u.loc.uFudgeFactor&&c.uniform1f(u.loc.uFudgeFactor,(j.fudgeFactor??1)*.75),u.loc.uDetail&&c.uniform1f(u.loc.uDetail,j.detail??1),u.loc.uPixelThreshold&&c.uniform1f(u.loc.uPixelThreshold,j.pixelThreshold??.5),u.loc.uDistanceMetric&&c.uniform1f(u.loc.uDistanceMetric,j.distanceMetric??0),u.loc.uClipBounds&&c.uniform1f(u.loc.uClipBounds,z.clipOutsideBounds?1:0),u.loc.uBoundsMin){const A=z.bboxSize.map(M=>M/2);c.uniform3f(u.loc.uBoundsMin,z.bboxCenter[0]-A[0],z.bboxCenter[1]-A[1],z.bboxCenter[2]-A[2]),c.uniform3f(u.loc.uBoundsMax,z.bboxCenter[0]+A[0],z.bboxCenter[1]+A[1],z.bboxCenter[2]+A[2])}c.drawArrays(c.TRIANGLE_STRIP,0,4),h()},[h]),C=de.useCallback(()=>{const u=g.current;u.rafId||(u.rafId=requestAnimationFrame(()=>{u.rafId=0;const c=Y.getState();(c.lastMesh?"mesh":c.isRunning?"slice":"fractal")==="fractal"&&(E(),S())}))},[E,S]),N=de.useCallback((u,c)=>{const L=g.current,P=Y.getState(),[B,z,T]=P.bboxCenter,[j,A,M]=P.bboxSize,_=j*.5,R=A*.5,O=M*.5,w=X=>wo(X,L.camAngle,L.camPitch,L.camDist,ge,ge,L.camTarget),I=8,G=w([B,z,T]);if(Math.abs(u-G[0])<I&&Math.abs(c-G[1])<I)return"center";const H=[["sizeX+",[B+_,z,T]],["sizeX-",[B-_,z,T]],["sizeY+",[B,z+R,T]],["sizeY-",[B,z-R,T]],["sizeZ+",[B,z,T+O]],["sizeZ-",[B,z,T-O]]];for(const[X,$]of H){const U=w($);if(Math.abs(u-U[0])<I&&Math.abs(c-U[1])<I)return X}return null},[]),k=de.useCallback(()=>{const u=g.current;if(u.shiftHeld){const c=Ut(u.rawAngle,u.rawPitch,Co);if(c){if(u.snapped=!0,u.snapTarget=c,!u.snapAnimId){const L=()=>{if(u.snapAnimId=0,!u.snapTarget)return;const P=Xt(u.snapTarget.angle-u.camAngle),B=u.snapTarget.pitch-u.camPitch;if(Math.sqrt(P*P+B*B)<.002){u.camAngle=u.snapTarget.angle,u.camPitch=u.snapTarget.pitch,C(),u.snapped&&(u.snapAnimId=requestAnimationFrame(L));return}u.camAngle+=P*.2,u.camPitch+=B*.2,C(),u.snapAnimId=requestAnimationFrame(L)};u.snapAnimId=requestAnimationFrame(L)}return}}u.snapped=!1,u.snapTarget=null,u.snapAnimId&&(cancelAnimationFrame(u.snapAnimId),u.snapAnimId=0),u.camAngle=u.rawAngle,u.camPitch=u.rawPitch},[C]);de.useEffect(()=>{const u=v.current;if(!u)return;const c=g.current;return c.gl=u.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0}),c.gl||console.warn("Preview: WebGL2 not available"),()=>{c.prog&&c.gl&&c.gl.deleteProgram(c.prog),c.prog=null,c.defId=null}},[]),de.useEffect(()=>{const u=d.current;if(!u)return;const c=u.getContext("2d");if(c)return pn((L,P,B)=>{const z=document.createElement("canvas");z.width=P,z.height=B,z.getContext("2d").putImageData(L,0,0),c.clearRect(0,0,ge,ge),c.imageSmoothingEnabled=!1,c.drawImage(z,0,0,ge,ge)}),()=>{vn()}},[]),de.useEffect(()=>{if(p!=="fractal")return;const u=g.current,L=Y.getState().interlaceState,P=((o==null?void 0:o.id)??"")+(L?"+"+L.definition.id:"");o&&u.defId!==P&&(u.defId=null),C()},[o,a,p,C]),de.useEffect(()=>{p==="fractal"&&C()},[r,a,i,n,s,f,l,p,C]),de.useEffect(()=>{if(!t)return;const u=x.current;if(!u)return;const c=u.getContext("2d");if(!c)return;const L=y.current;Mo(L,t.positions,t.indices,t.vertexCount,t.faceCount,u.width),dt(L,c,u.width,u.height)},[t]),de.useEffect(()=>{const u=m.current;if(!u)return;const c=g.current,L=M=>{const _=u.getBoundingClientRect(),R=M.clientX-_.left,O=M.clientY-_.top;if(c.lastX=M.clientX,c.lastY=M.clientY,M.button===1||M.button===2){c.dragMode="pan",c.dragging=!0,u.style.cursor="all-scroll",M.preventDefault();return}const w=N(R,O);c.dragMode=w||"orbit",c.dragging=!0,u.style.cursor=c.dragMode==="orbit"?"grabbing":"ew-resize",M.preventDefault()},P=M=>{M.preventDefault()},B=M=>{if(!c.dragging){const O=u.getBoundingClientRect(),w=M.clientX-O.left,I=M.clientY-O.top,G=c.hover;c.hover=N(w,I),u.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab",c.hover!==G&&C();return}const _=M.clientX-c.lastX,R=M.clientY-c.lastY;if(c.lastX=M.clientX,c.lastY=M.clientY,c.dragMode==="pan"){const O=jt(-_,-R,c.camAngle,c.camPitch,c.camDist,ge);c.camTarget=xt(c.camTarget,O),C()}else if(c.dragMode==="orbit")c.rawAngle+=_*.008,c.rawPitch=Math.max(-Ne,Math.min(Ne,c.rawPitch+R*.008)),k(),C();else if(c.dragMode==="center"){const O=jt(_,R,c.camAngle,c.camPitch,c.camDist,ge),w=Y.getState(),[I,G,H]=w.bboxCenter;w.setBboxCenter([I+O[0],G+O[1],H+O[2]]),C()}else if(c.dragMode){const O=c.dragMode.charAt(4),w=c.dragMode.charAt(5)==="+"?1:-1,I=O==="X"?[1,0,0]:O==="Y"?[0,1,0]:[0,0,1],G=jt(_,R,c.camAngle,c.camPitch,c.camDist,ge),H=Gt(G,I)*w,X=O==="X"?0:O==="Y"?1:2,$=Y.getState(),U=[...$.bboxSize],Z=[...$.bboxCenter],Q=Math.max(.1,U[X]+H*2),ne=Q-U[X];$.bboxLock?$.setBboxSize([Q,Q,Q]):(U[X]=Q,Z[X]+=ne*.5*w,$.setBboxSize(U),$.setBboxCenter(Z)),C()}},z=()=>{c.dragging=!1,c.dragMode=null,u.style.cursor=c.hover?c.hover==="center"?"move":"ew-resize":"grab"},T=M=>{M.preventDefault(),c.camDist=Math.max(.5,Math.min(20,c.camDist*(1+M.deltaY*.001))),C()},j=M=>{M.key==="Shift"&&!c.shiftHeld&&(c.shiftHeld=!0,k(),C())},A=M=>{M.key==="Shift"&&(c.shiftHeld=!1,k(),C())};return u.addEventListener("mousedown",L),window.addEventListener("mousemove",B),window.addEventListener("mouseup",z),u.addEventListener("wheel",T,{passive:!1}),u.addEventListener("contextmenu",P),window.addEventListener("keydown",j),window.addEventListener("keyup",A),()=>{u.removeEventListener("mousedown",L),window.removeEventListener("mousemove",B),window.removeEventListener("mouseup",z),u.removeEventListener("wheel",T),u.removeEventListener("contextmenu",P),window.removeEventListener("keydown",j),window.removeEventListener("keyup",A)}},[N,k,C]),de.useEffect(()=>{const u=x.current;if(!u)return;const c=y.current;let L=null;const P=()=>{const M=u.getContext("2d");M&&dt(c,M,u.width,u.height)},B=M=>{c.dragging=!0,c.lastMX=M.clientX,c.lastMY=M.clientY,L=M.button===1||M.button===2?"pan":"orbit"},z=()=>{c.dragging=!1,L=null},T=M=>{if(!c.dragging||!c.positions)return;const _=M.clientX-c.lastMX,R=M.clientY-c.lastMY;if(c.lastMX=M.clientX,c.lastMY=M.clientY,L==="pan"){const O=1/(c.scale*c.zoom);c.cx-=_*O,c.cy+=R*O,P()}else c.rotY+=_*.01,c.rotX+=R*.01,c.rotX=Math.max(-Ne,Math.min(Ne,c.rotX)),P()},j=M=>{M.preventDefault(),c.zoom*=M.deltaY>0?.9:1.1,c.zoom=Math.max(.1,Math.min(10,c.zoom)),c.positions&&P()},A=M=>{M.preventDefault()};return u.addEventListener("mousedown",B),window.addEventListener("mouseup",z),window.addEventListener("mousemove",T),u.addEventListener("wheel",j,{passive:!1}),u.addEventListener("contextmenu",A),()=>{u.removeEventListener("mousedown",B),window.removeEventListener("mouseup",z),window.removeEventListener("mousemove",T),u.removeEventListener("wheel",j),u.removeEventListener("contextmenu",A)}},[]);const F=de.useCallback((u,c,L)=>{const P=g.current;P.rawAngle=u,P.rawPitch=c,P.camAngle=u,P.camPitch=c,P.snapped=!1,P.snapTarget=null,P.snapAnimId&&(cancelAnimationFrame(P.snapAnimId),P.snapAnimId=0);const B=y.current;if(B.rotX=-c,B.rotY=u,B.positions){const z=x.current;if(z){const T=z.getContext("2d");T&&dt(B,T,z.width,z.height)}}C()},[C]),D=de.useCallback(()=>{const u=g.current;u.camTarget=[0,0,0];const c=y.current;if(c.positions){Mo(c,c.positions,c.indices,c.vertexCount,c.faceCount,ge);const L=x.current;if(L){const P=L.getContext("2d");P&&dt(c,P,L.width,L.height)}}C()},[C]),V=[{label:"F",title:"Front (-Z)",angle:0,pitch:0},{label:"B",title:"Back (+Z)",angle:Math.PI,pitch:0},{label:"L",title:"Left (-X)",angle:-Ne,pitch:0},{label:"R",title:"Right (+X)",angle:Ne,pitch:0},{label:"T",title:"Top (+Y)",angle:0,pitch:Ne},{label:"D",title:"Bottom (-Y)",angle:0,pitch:-Ne}];return b.jsxs("div",{className:"relative",style:{width:ge,height:ge},children:[b.jsx("canvas",{ref:v,width:ge,height:ge,className:"border border-white/10 rounded-sm",style:{imageRendering:"pixelated",display:p==="fractal"?"block":"none"}}),b.jsx("canvas",{ref:m,width:ge,height:ge,style:{position:"absolute",top:0,left:0,cursor:"grab",display:p==="fractal"?"block":"none"}}),b.jsx("canvas",{ref:d,width:ge,height:ge,className:"border border-white/10 rounded-sm",style:{imageRendering:"pixelated",display:p==="slice"?"block":"none"}}),b.jsx("canvas",{ref:x,width:ge,height:ge,className:"border border-white/10 rounded-sm",style:{cursor:"grab",display:p==="mesh"?"block":"none"}}),b.jsxs("div",{className:"absolute top-2 left-2 text-[10px] text-gray-500 uppercase tracking-wider pointer-events-none",children:[p==="fractal"&&"SDF Preview",p==="slice"&&"Sampling...",p==="mesh"&&"Mesh Preview"]}),p!=="slice"&&b.jsxs("div",{className:"absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/70 backdrop-blur rounded px-1 py-0.5 pointer-events-auto",children:[V.map(u=>b.jsx("button",{title:u.title,onClick:()=>F(u.angle,u.pitch,u.label),className:"w-[22px] h-[20px] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors",children:u.label},u.label)),b.jsx("div",{className:"w-px h-3 bg-gray-700 mx-0.5"}),b.jsx("button",{title:"Reset pan (re-center view)",onClick:D,className:"w-[22px] h-[20px] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors",children:"C"})]}),p==="fractal"&&b.jsxs("label",{className:"absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur rounded px-1.5 py-0.5 cursor-pointer pointer-events-auto select-none",children:[b.jsx("input",{type:"checkbox",checked:f,onChange:u=>Y.getState().setClipOutsideBounds(u.target.checked),className:"accent-amber-500 w-3 h-3"}),b.jsx("span",{className:"text-[9px] text-gray-400",children:"Clip bounds"})]}),p!=="slice"&&b.jsx("div",{className:"absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-gray-600 pointer-events-none whitespace-nowrap",children:"LMB orbit · RMB pan · Scroll zoom · Shift snap"})]})}function ka(){const e=Y(),t=Y(o=>o.interlaceState);return t?b.jsxs("div",{className:"flex flex-col gap-1.5 border border-purple-700/40 rounded px-2 py-1.5 bg-purple-900/10 mt-1",children:[b.jsxs("div",{className:"text-[11px] text-purple-300 font-bold flex items-center justify-between",children:[b.jsxs("span",{children:["Interlace: ",t.definition.name]}),b.jsxs("label",{className:"flex items-center gap-1 cursor-pointer",children:[b.jsx("input",{type:"checkbox",checked:t.enabled,onChange:o=>e.setInterlaceState({...t,enabled:o.target.checked})}),b.jsx("span",{className:"text-[10px] text-purple-400",children:"enabled"})]})]}),b.jsxs("div",{className:"flex gap-3 text-[11px] text-gray-400",children:[b.jsxs("label",{className:"flex items-center gap-1",children:["Interval",b.jsx("input",{type:"number",min:1,max:16,step:1,value:t.interval,onChange:o=>e.setInterlaceState({...t,interval:Math.max(1,parseInt(o.target.value)||1)}),className:"w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"})]}),b.jsxs("label",{className:"flex items-center gap-1",children:["Start iter",b.jsx("input",{type:"number",min:0,max:64,step:1,value:t.startIter,onChange:o=>e.setInterlaceState({...t,startIter:Math.max(0,parseInt(o.target.value)||0)}),className:"w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"})]})]}),b.jsx(Io,{definition:t.definition,params:t.params,onUpdate:(o,n)=>e.setInterlaceState({...t,params:{...t.params,[o]:n}})})]}):null}function Oa(){const e=Ce.useRef(null),t=Ce.useRef(null),o=Ce.useRef(0),n=Ce.useRef(!1),s=Ce.useCallback(()=>{n.current=!0,clearTimeout(o.current);const a=e.current,i=t.current;i.style.transition="none",i.style.transform="scale(1)",a.offsetHeight,a.style.transition="max-height 0.35s ease-out",a.style.maxHeight="200px"},[]),r=Ce.useCallback(()=>{n.current=!1;const a=e.current,i=t.current;i.style.transition="transform 0.3s ease-in",i.style.transform="scale(0) translateY(0)",i.style.transformOrigin="bottom center",o.current=window.setTimeout(()=>{n.current||(a.style.transition="none",a.style.maxHeight="0")},310)},[]);return b.jsxs("div",{className:"fixed bottom-5 right-5 z-50 inline-flex flex-col items-stretch",onMouseEnter:s,onMouseLeave:r,children:[b.jsx("div",{ref:e,className:"overflow-hidden",style:{maxHeight:0},children:b.jsx("img",{ref:t,src:"guy.png",alt:"",className:"pointer-events-none object-contain block w-full",style:{transform:"scale(0)",transformOrigin:"bottom center"}})}),b.jsx("a",{href:"https://ko-fi.com/gmtfractals",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-2 px-3 py-1 rounded bg-[#13C3FF] hover:bg-[#00b0f0] text-white text-[11px] font-bold transition-colors",children:"Support GMT"})]})}function ja(){const e=Y(o=>o.iters),t=Y(o=>o.setIters);return b.jsxs("div",{className:"font-mono bg-[#080808] text-gray-200 h-screen flex flex-col overflow-hidden",children:[b.jsx("h1",{className:"text-sm font-bold text-white tracking-wide px-5 pt-4 pb-2 shrink-0",children:"GMT — Fractal Mesh Export"}),b.jsxs("div",{className:"flex gap-4 flex-1 min-h-0 px-5 pb-4",children:[b.jsxs("div",{className:"flex flex-col gap-2.5 w-[340px] shrink-0 overflow-y-auto pr-1",children:[b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(tt,{label:"Export",defaultOpen:!0,children:b.jsx(Da,{})})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(yn,{})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(tt,{label:"Bounds",defaultOpen:!0,children:b.jsx(ca,{})})})]}),b.jsxs("div",{className:"flex flex-col gap-2.5 flex-1 min-w-0 items-center",children:[b.jsx(za,{}),b.jsx(ua,{})]}),b.jsxs("div",{className:"flex flex-col gap-2.5 w-[300px] shrink-0 overflow-y-auto pl-1",children:[b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(tt,{label:"Formula",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-2 mt-1",children:[b.jsx(bn,{}),b.jsx(Ie,{label:"Iterations",value:e,onChange:t,min:2,max:64,step:1,variant:"full"})]})})}),b.jsx("div",{className:"bg-black/60 border border-white/10 rounded p-3",children:b.jsx(tt,{label:"Parameters",defaultOpen:!0,children:b.jsxs("div",{className:"flex flex-col gap-1 mt-1",children:[b.jsx(Io,{}),b.jsx(ka,{})]})})})]})]}),b.jsx(Oa,{})]})}function Ua(){const e=de.useRef(!1);return de.useEffect(()=>{if(e.current)return;e.current=!0;try{const o=localStorage.getItem("gmt-mesh-export-scene");if(o){localStorage.removeItem("gmt-mesh-export-scene"),Ao(o,"(from main app)");return}}catch(o){console.warn("[MeshExport] Auto-load from main app failed:",o)}const t=Y.getState();if(!t.loadedDefinition){const o=Oe.get(t.selectedFormulaId);o&&(t.setLoadedDefinition(o),t.setFormulaParams(Po(o)))}},[]),b.jsx(ja,{})}const Zo=document.getElementById("root");if(!Zo)throw new Error("Could not find root element to mount to");const Na=sn.createRoot(Zo);Na.render(b.jsx(Ce.StrictMode,{children:b.jsx(Ua,{})}));
