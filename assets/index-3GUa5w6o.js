var Io=Object.defineProperty;var Po=(e,a,t)=>a in e?Io(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t;var C=(e,a,t)=>Po(e,typeof a!="symbol"?a+"":a,t);import{j as c,r as P,R as pe}from"./three-fiber-Ckg3Mgb3.js";import{d as be,c as k,l as Ro,Q as Te,o as Re,E as ke,O as To,P as Eo,n as ce,p as Ao,q as Do,r as jt,s as Nt,k as et}from"./three-CA7fxsrE.js";import{b as ma}from"./three-drei-kjR3L1aj.js";import{p as Vt}from"./pako-DwGzBETv.js";(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const Lo=e=>(a,t,o)=>{const i=o.subscribe;return o.subscribe=(n,s,l)=>{let d=n;if(s){const f=(l==null?void 0:l.equalityFn)||Object.is;let p=n(o.getState());d=u=>{const m=n(u);if(!f(p,m)){const g=p;s(p=m,g)}},l!=null&&l.fireImmediately&&s(p,p)}return i(d)},e(a,t,o)},ha=Lo,le={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula"};class ko{constructor(){C(this,"listeners",{})}on(a,t){return this.listeners[a]||(this.listeners[a]=[]),this.listeners[a].push(t),()=>this.off(a,t)}off(a,t){this.listeners[a]&&(this.listeners[a]=this.listeners[a].filter(o=>o!==t))}emit(a,t){this.listeners[a]&&this.listeners[a].forEach(o=>o(t))}}const F=new ko,ie={Time:"uTime",FrameCount:"uFrameCount",Resolution:"uResolution",SceneOffsetHigh:"uSceneOffsetHigh",SceneOffsetLow:"uSceneOffsetLow",CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",HistoryTexture:"uHistoryTexture",BlendFactor:"uBlendFactor",Jitter:"uJitter",BlueNoiseTexture:"uBlueNoiseTexture",BlueNoiseResolution:"uBlueNoiseResolution",ModularParams:"uModularParams",EnvRotationMatrix:"uEnvRotationMatrix",FogColorLinear:"uFogColorLinear",HistogramLayer:"uHistogramLayer",PreRotMatrix:"uPreRotMatrix",PostRotMatrix:"uPostRotMatrix",WorldRotMatrix:"uWorldRotMatrix",InternalScale:"uInternalScale",PixelSizeBase:"uPixelSizeBase"},Ht=e=>{if(typeof window>"u")return!1;const a=new URLSearchParams(window.location.search);return a.has(e)&&a.get(e)!=="false"&&a.get(e)!=="0"},Bo={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Oo=(e,a)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:Ht("clean")||Ht("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:Bo,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{a().histogramLayer!==t&&(e({histogramLayer:t}),F.emit("uniform",{key:ie.HistogramLayer,value:t}),e(o=>({histogramTrigger:o.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),F.emit("reset_accum",void 0)},setFixedResolution:(t,o)=>{e({fixedResolution:[t,o]}),F.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(o=>({helpWindow:{visible:!0,activeTopicId:t||o.helpWindow.activeTopicId},contextMenu:{...o.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,o,i,r)=>e({contextMenu:{visible:!0,x:t,y:o,items:i,targetHelpIds:r||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,o,i)=>e(r=>{var g,v;const n={...r.panels};n[t]||(n[t]={id:t,location:o,order:0,isCore:!1,isOpen:!0});const s=!0;let l=i;l===void 0&&(l=Object.values(n).filter(y=>y.location===o).length),(o==="left"||o==="right")&&Object.values(n).forEach(h=>{h.location===o&&h.id!==t&&(h.isOpen=!1)});let d=n[t].floatPos;o==="float"&&!d&&(d={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),n[t]={...n[t],location:o,order:l,isOpen:s,floatPos:d};const f=o==="left"?t:((g=Object.values(n).find(h=>h.location==="left"&&h.isOpen))==null?void 0:g.id)||null,p=o==="right"?t:((v=Object.values(n).find(h=>h.location==="right"&&h.isOpen))==null?void 0:v.id)||null,u=o==="left"?!1:r.isLeftDockCollapsed,m=o==="right"?!1:r.isRightDockCollapsed;return{panels:n,activeLeftTab:f,activeRightTab:p,isLeftDockCollapsed:u,isRightDockCollapsed:m}}),reorderPanel:(t,o)=>e(i=>{const r={...i.panels},n=r[t],s=r[o];if(!n||!s)return{};n.location!==s.location&&(n.location=s.location,n.isOpen=!1);const l=s.location,d=Object.values(r).filter(m=>m.location===l).sort((m,g)=>m.order-g.order),f=d.findIndex(m=>m.id===t),p=d.findIndex(m=>m.id===o);if(f===-1||p===-1)return{};const[u]=d.splice(f,1);return d.splice(p,0,u),d.forEach((m,g)=>{r[m.id]={...r[m.id],order:g}}),{panels:r}}),togglePanel:(t,o)=>e(i=>{var f,p;const r={...i.panels};if(!r[t])return{};const n=r[t],s=o!==void 0?o:!n.isOpen;if(n.location==="float")n.isOpen=s;else if(s){if(Object.values(r).forEach(u=>{u.location===n.location&&u.id!==t&&(u.isOpen=!1)}),n.isOpen=!0,n.location==="left")return{panels:r,activeLeftTab:t,isLeftDockCollapsed:!1};if(n.location==="right")return{panels:r,activeRightTab:t,isRightDockCollapsed:!1}}else n.isOpen=!1;const l=((f=Object.values(r).find(u=>u.location==="left"&&u.isOpen))==null?void 0:f.id)||null,d=((p=Object.values(r).find(u=>u.location==="right"&&u.isOpen))==null?void 0:p.id)||null;return{panels:r,activeLeftTab:l,activeRightTab:d}}),setDockSize:(t,o)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:o}),setDockCollapsed:(t,o)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:o}),setFloatPosition:(t,o,i)=>e(r=>({panels:{...r.panels,[t]:{...r.panels[t],floatPos:{x:o,y:i}}}})),setFloatSize:(t,o,i)=>e(r=>({panels:{...r.panels,[t]:{...r.panels[t],floatSize:{width:o,height:i}}}})),startPanelDrag:t=>e(o=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(o.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>a().togglePanel(t,!0),floatTab:t=>a().movePanel(t,"float"),dockTab:t=>a().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(o=>({compositionOverlaySettings:{...o.compositionOverlaySettings,...t}}))}),jo=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,No=(e,a)=>({dpr:jo()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,renderRegion:null,isBucketRendering:!1,bucketSize:128,bucketUpscale:1,convergenceThreshold:.25,samplesPerBucket:64,canvasPixelSize:[1920,1080],setDpr:t=>{e({dpr:t}),F.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:o}=a();(o==="Always"||o==="Auto")&&e({dpr:t}),F.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:o}=a();o==="Always"||o==="Auto"?F.emit("config",{msaaSamples:t}):F.emit("config",{msaaSamples:1}),F.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:o,msaaSamples:i}=a();t==="Off"?(e({dpr:1}),F.emit("config",{msaaSamples:1})):(e({dpr:o}),F.emit("config",{msaaSamples:i})),F.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),F.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),F.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const o=t==="PathTracing"?1:0,i=a().setLighting;i&&i({renderMode:o})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const o=t?new be(t.minX,t.minY):new be(0,0),i=t?new be(t.maxX,t.maxY):new be(1,1);F.emit("uniform",{key:ie.RegionMin,value:o}),F.emit("uniform",{key:ie.RegionMax,value:i}),F.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setBucketUpscale:t=>e({bucketUpscale:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setCanvasPixelSize:(t,o)=>e({canvasPixelSize:[t,o]}),setIsExporting:t=>e({isExporting:t})}),ga=new Uint32Array(256);for(let e=0;e<256;e++){let a=e;for(let t=0;t<8;t++)a=a&1?3988292384^a>>>1:a>>>1;ga[e]=a}const Vo=e=>{let a=-1;for(let t=0;t<e.length;t++)a=a>>>8^ga[(a^e[t])&255];return(a^-1)>>>0},Ho=new TextEncoder,$t=new TextDecoder,$o=e=>{const a=new Uint8Array(e.length);for(let t=0;t<e.length;t++)a[t]=e.charCodeAt(t);return a},Ye=e=>{let a="";for(let t=0;t<e.length;t++)a+=String.fromCharCode(e[t]);return a},Gt=(e,a,t)=>{e[a]=t>>>24&255,e[a+1]=t>>>16&255,e[a+2]=t>>>8&255,e[a+3]=t&255},Go=async(e,a,t)=>{const o=await e.arrayBuffer(),i=new Uint8Array(o);if(i[0]!==137||i[1]!==80||i[2]!==78||i[3]!==71)throw new Error("Not a valid PNG");const r=$o(a),n=Ho.encode(t),s=r.length+1+1+1+1+1+n.length,l=12+s,d=new Uint8Array(l);Gt(d,0,s),d[4]=105,d[5]=84,d[6]=88,d[7]=116;let f=8;d.set(r,f),f+=r.length,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d[f++]=0,d.set(n,f);const p=Vo(d.slice(4,l-4));Gt(d,l-4,p);let u=8;for(;u<i.length;){const g=i[u]<<24|i[u+1]<<16|i[u+2]<<8|i[u+3];if(Ye(i.slice(u+4,u+8))==="IEND")break;u+=12+g}const m=new Uint8Array(i.length+l);return m.set(i.slice(0,u),0),m.set(d,u),m.set(i.slice(u),u+l),new Blob([m],{type:"image/png"})},Bn=async(e,a)=>{const t=await e.arrayBuffer(),o=new Uint8Array(t);if(o[0]!==137||o[1]!==80)return null;let i=8;for(;i<o.length;){const r=o[i]<<24|o[i+1]<<16|o[i+2]<<8|o[i+3],n=Ye(o.slice(i+4,i+8));if(n==="iTXt"){const s=o.slice(i+8,i+8+r);let l=-1;for(let d=0;d<s.length;d++)if(s[d]===0){l=d;break}if(l!==-1&&Ye(s.slice(0,l))===a){let f=l+1+1+1;for(;f<s.length&&s[f]!==0;)f++;for(f++;f<s.length&&s[f]!==0;)f++;return f++,$t.decode(s.slice(f))}}if(n==="tEXt"){const s=o.slice(i+8,i+8+r);let l=-1;for(let d=0;d<s.length;d++)if(s[d]===0){l=d;break}if(l!==-1&&Ye(s.slice(0,l))===a)return $t.decode(s.slice(l+1))}if(n==="IEND")break;i+=12+r}return null};let dt=null;function On(e){dt=e}class qo{constructor(){C(this,"activeCamera",null);C(this,"virtualSpace",null);C(this,"renderer",null);C(this,"pipeline",null);C(this,"_worker",null);C(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});C(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});C(this,"_offsetGuarded",!1);C(this,"_offsetGuardTimer",null);C(this,"_onCompiling",null);C(this,"_onCompileTime",null);C(this,"_onShaderCode",null);C(this,"_onBootedCallback",null);C(this,"_pendingSnapshots",new Map);C(this,"_pendingPicks",new Map);C(this,"_pendingFocusPicks",new Map);C(this,"_pendingHistograms",new Map);C(this,"_pendingShaderSource",new Map);C(this,"_gpuInfo","");C(this,"_lastGeneratedFrag","");C(this,"modulations",{});C(this,"_isBucketRendering",!1);C(this,"_isExporting",!1);C(this,"_exportReady",null);C(this,"_exportFrameDone",null);C(this,"_exportComplete",null);C(this,"_exportError",null);C(this,"_container",null);C(this,"_lastInitArgs",null);C(this,"_onCrash",null);C(this,"pendingTeleport",null);C(this,"_isGizmoInteracting",!1);C(this,"_bootSent",!1);C(this,"_pendingOffsetSync",null)}setWorkerModePending(){}initWorkerMode(a,t,o,i,r,n,s){if(this._worker)return;this._container=a.parentElement,this._lastInitArgs={config:t,width:o,height:i,dpr:r,isMobile:n,initialCamera:s};const l=a.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-DADwvjp8.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=f=>{this._handleWorkerMessage(f.data)},this._worker.onerror=f=>{console.error("[WorkerProxy] Worker error:",f),this._handleWorkerCrash("Worker error: "+(f.message||"unknown"))};const d={type:"INIT",canvas:l,width:o,height:i,dpr:r,isMobile:n,initialConfig:t,initialCamera:s};this._worker.postMessage(d,[l])}restart(a,t){if(!this._container||!this._lastInitArgs)return;this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const o=this._container.querySelector("canvas");o&&o.remove();const{width:i,height:r,dpr:n,isMobile:s}=this._lastInitArgs,l=document.createElement("canvas");l.width=i*n,l.height=r*n,l.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(l),this._lastInitArgs={...this._lastInitArgs,config:a,initialCamera:t};const d=l.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-DADwvjp8.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=p=>{this._handleWorkerMessage(p.data)},this._worker.onerror=p=>{console.error("[WorkerProxy] Worker error:",p),this._handleWorkerCrash("Worker error: "+(p.message||"unknown"))};const f={type:"INIT",canvas:d,width:i,height:r,dpr:n,isMobile:s,initialConfig:a,initialCamera:t};this._worker.postMessage(f,[d])}set onCompiling(a){this._onCompiling=a}set onCompileTime(a){this._onCompileTime=a}set onShaderCode(a){this._onShaderCode=a}_handleWorkerMessage(a){switch(a.type){case"READY":break;case"FRAME_READY":if(a.state)if(this._shadow=a.state,this._offsetGuarded){const t=a.state.sceneOffset,o=this._localOffset;Math.abs(t.x+t.xL-(o.x+o.xL))+Math.abs(t.y+t.yL-(o.y+o.yL))+Math.abs(t.z+t.zL-(o.z+o.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...a.state.sceneOffset};dt&&dt();break;case"COMPILING":this._shadow.isCompiling=!!a.status,this._shadow.hasCompiledShader=!a.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(a.status),F.emit(le.IS_COMPILING,a.status);break;case"COMPILE_TIME":a.duration&&(this._shadow.lastCompileDuration=a.duration),this._onCompileTime&&this._onCompileTime(a.duration),F.emit(le.COMPILE_TIME,a.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=a.code,this._onShaderCode&&this._onShaderCode(a.code),F.emit(le.SHADER_CODE,a.code);break;case"SHADER_SOURCE_RESULT":{const t=this._pendingShaderSource.get(a.id);t&&(t(a.code),this._pendingShaderSource.delete(a.id));break}case"BOOTED":this._shadow.isBooted=!0,a.gpuInfo&&(this._gpuInfo=a.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=a.info;break;case"HISTOGRAM_RESULT":{const t=this._pendingHistograms.get(a.id);t&&(t(a.data),this._pendingHistograms.delete(a.id));break}case"SNAPSHOT_RESULT":{const t=this._pendingSnapshots.get(a.id);t&&(t(a.blob),this._pendingSnapshots.delete(a.id));break}case"PICK_RESULT":{const t=this._pendingPicks.get(a.id);t&&(t(a.position?new k(a.position[0],a.position[1],a.position[2]):null),this._pendingPicks.delete(a.id));break}case"FOCUS_RESULT":{const t=this._pendingFocusPicks.get(a.id);t&&(t(a.distance),this._pendingFocusPicks.delete(a.id));break}case"ERROR":console.error("[WorkerProxy] Worker error:",a.message);break;case"EXPORT_READY":this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=a.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:a.frameIndex,progress:a.progress,measuredDistance:a.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportComplete&&this._exportComplete(a.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,console.error("[WorkerProxy] Export error:",a.message),this._exportError&&this._exportError(a.message);break;case"BUCKET_STATUS":this._isBucketRendering=a.isRendering,F.emit(le.BUCKET_STATUS,{isRendering:a.isRendering,progress:a.progress,totalBuckets:a.totalBuckets,currentBucket:a.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(a);break}}post(a,t){this._worker&&(t?this._worker.postMessage(a,t):this._worker.postMessage(a))}set onCrash(a){this._onCrash=a}set onBooted(a){this._onBootedCallback=a}_handleWorkerCrash(a){console.error(`[WorkerProxy] Worker crashed: ${a}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._onCrash&&this._onCrash(a)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get convergenceValue(){return this._shadow.convergenceValue}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(a){this._shadow.lastMeasuredDistance=a}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(a){a&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(a){this.post({type:"PAUSE",paused:a})}get shouldSnapCamera(){return!1}set shouldSnapCamera(a){a&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(a){this._isGizmoInteracting=a}get isCameraInteracting(){return!1}set isCameraInteracting(a){a&&this.post({type:"MARK_INTERACTION"})}get bootSent(){return this._bootSent}bootWithConfig(a,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(a,t),this.post({type:"BOOT",config:a,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:a,camera:t}),this._bootSent=!0}setUniform(a,t,o=!1){this.post({type:"UNIFORM",key:a,value:t,noReset:o})}setPreviewSampleCap(a){this.post({type:"SET_SAMPLE_CAP",n:a})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(a,t){if(t){const o=t.indexOf(";base64,"),i=o>=0?t.substring(o+8,o+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||i.startsWith("Iz8")||i.startsWith("Iz9")?fetch(t).then(n=>n.arrayBuffer()).then(n=>{this.post({type:"TEXTURE_HDR",textureType:a,buffer:n},[n])}).catch(n=>console.error("[WorkerProxy] HDR texture transfer failed:",n)):fetch(t).then(n=>n.blob()).then(n=>createImageBitmap(n,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(n=>{this.post({type:"TEXTURE",textureType:a,bitmap:n},[n])}).catch(n=>console.error("[WorkerProxy] Texture transfer failed:",n))}else this.post({type:"TEXTURE",textureType:a,bitmap:null})}queueOffsetSync(a){this._pendingOffsetSync={x:a.x,y:a.y,z:a.z,xL:a.xL,yL:a.yL,zL:a.zL},this.setShadowOffset(a)}setShadowOffset(a){this._localOffset={...a},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(a,t,o){}resolveLightPosition(a,t){return a}measureDistanceAtScreenPoint(a,t,o,i){return this._shadow.lastMeasuredDistance}pickWorldPosition(a,t,o){if(!o)return null;const i=crypto.randomUUID();return new Promise(r=>{this._pendingPicks.set(i,r),this.post({type:"PICK_WORLD_POSITION",id:i,x:a,y:t}),setTimeout(()=>{this._pendingPicks.has(i)&&(this._pendingPicks.delete(i),r(null))},5e3)})}startFocusPick(a,t){const o=crypto.randomUUID();return new Promise(i=>{this._pendingFocusPicks.set(o,i),this.post({type:"FOCUS_PICK_START",id:o,x:a,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),i(-1))},5e3)})}sampleFocusPick(a,t){const o=crypto.randomUUID();return new Promise(i=>{this._pendingFocusPicks.set(o,i),this.post({type:"FOCUS_PICK_SAMPLE",id:o,x:a,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(o)&&(this._pendingFocusPicks.delete(o),i(-1))},2e3)})}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){const a=crypto.randomUUID();return new Promise(t=>{this._pendingSnapshots.set(a,t),this.post({type:"CAPTURE_SNAPSHOT",id:a}),setTimeout(()=>{this._pendingSnapshots.has(a)&&(this._pendingSnapshots.delete(a),t(null))},1e4)})}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(a){const t=crypto.randomUUID();return new Promise(o=>{this._pendingHistograms.set(t,o),this.post({type:"HISTOGRAM_READBACK",id:t,source:a}),setTimeout(()=>{this._pendingHistograms.has(t)&&(this._pendingHistograms.delete(t),o(new Float32Array(0)))},5e3)})}getCompiledFragmentShader(){const a=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(a,t),this.post({type:"GET_SHADER_SOURCE",id:a,variant:"compiled"}),setTimeout(()=>{this._pendingShaderSource.has(a)&&(this._pendingShaderSource.delete(a),t(null))},5e3)})}getTranslatedFragmentShader(){const a=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(a,t),this.post({type:"GET_SHADER_SOURCE",id:a,variant:"translated"}),setTimeout(()=>{this._pendingShaderSource.has(a)&&(this._pendingShaderSource.delete(a),t(null))},5e3)})}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(a,t,o,i){if(this._pendingOffsetSync){const r=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:a,offset:r,delta:o,timestamp:performance.now(),renderState:i,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:a,offset:t,delta:o,timestamp:performance.now(),renderState:i})}resizeWorker(a,t,o){this.post({type:"RESIZE",width:a,height:t,dpr:o})}sendConfig(a){this.post({type:"CONFIG",config:a})}registerFormula(a,t){this.post({type:"REGISTER_FORMULA",id:a,shader:t})}startExport(a,t){return this._isExporting=!0,new Promise((o,i)=>{this._exportReady=()=>{this._exportReady=null,o()},this._exportError=s=>{this._exportError=null,i(new Error(s))};let r=null;if(t){const s=t;r=new WritableStream({write(l){return s.write(l)},close(){return s.close()},abort(l){return s.abort(l)}})}const n=[];r&&n.push(r),this.post({type:"EXPORT_START",config:a,stream:r},n),setTimeout(()=>{this._exportReady&&(this._exportReady=null,i(new Error("Export start timed out")))},1e4)})}renderExportFrame(a,t,o,i,r,n){return new Promise(s=>{this._exportFrameDone=l=>{this._exportFrameDone=null,s(l)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:a,time:t,camera:o,offset:i,renderState:r,modulations:n})})}finishExport(){return new Promise((a,t)=>{this._exportComplete=o=>{this._exportComplete=null,a(o)},this._exportError=o=>{this._exportError=null,t(new Error(o))},this.post({type:"EXPORT_FINISH"}),setTimeout(()=>{this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(a,t,o){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:a,config:t,exportData:o?{preset:JSON.stringify(o.preset),name:o.name,version:o.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}async _handleBucketImage(a){const{pixels:t,width:o,height:i,presetJson:r,filename:n}=a,s=document.createElement("canvas");s.width=o,s.height=i;const l=s.getContext("2d");if(!l)return;const d=new ImageData(new Uint8ClampedArray(t.buffer),o,i);l.putImageData(d,0,0),s.toBlob(async f=>{if(f)try{const p=await Go(f,"FractalData",r),u=URL.createObjectURL(p),m=document.createElement("a");m.download=n,m.href=u,m.click(),URL.revokeObjectURL(u)}catch(p){console.error("Failed to inject metadata",p);const u=document.createElement("a");u.download=n,u.href=s.toDataURL("image/png"),u.click()}},"image/png")}}let tt=null;function Ee(){return tt||(tt=new qo),tt}class Uo{constructor(){C(this,"definitions",new Map)}register(a){this.definitions.set(a.id,a)}registerAlias(a,t){const o=this.definitions.get(t);o?this.definitions.set(a,o):console.warn(`FractalRegistry: Cannot register alias '${a}' for unknown target '${t}'`)}get(a){return this.definitions.get(a)}getAll(){return Array.from(new Set(this.definitions.values()))}getIds(){return Array.from(this.definitions.keys())}}const te=new Uo;class V{constructor(a={x:0,y:0,z:0,xL:0,yL:0,zL:0}){C(this,"offset");C(this,"_rotMatrix",new Ro);C(this,"_camRight",new k);C(this,"_camUp",new k);C(this,"_camForward",new k);C(this,"_visualVector",new k);C(this,"_quatInverse",new Te);C(this,"_relativePos",new k);C(this,"smoothedPos",new k);C(this,"smoothedQuat",new Te);C(this,"smoothedFov",60);C(this,"prevOffsetState");C(this,"isLocked",!1);C(this,"isFirstFrame",!0);this.offset={...a},this.prevOffsetState={...a}}get state(){return{...this.offset}}set state(a){this.offset={...a},V.normalize(this.offset)}static split(a){const t=Math.fround(a),o=a-t;return{high:t,low:o}}static normalize(a){if(Math.abs(a.xL)>.5){const o=Math.floor(a.xL+.5);a.x+=o,a.xL-=o}if(Math.abs(a.yL)>.5){const o=Math.floor(a.yL+.5);a.y+=o,a.yL-=o}if(Math.abs(a.zL)>.5){const o=Math.floor(a.zL+.5);a.z+=o,a.zL-=o}}setFromUnified(a,t,o){const i=V.split(a),r=V.split(t),n=V.split(o);this.offset.x=i.high,this.offset.xL=i.low,this.offset.y=r.high,this.offset.yL=r.low,this.offset.z=n.high,this.offset.zL=n.low,V.normalize(this.offset)}move(a,t,o){this.offset.xL+=a,this.offset.yL+=t,this.offset.zL+=o,V.normalize(this.offset)}absorbCamera(a){this.offset.xL+=a.x,this.offset.yL+=a.y,this.offset.zL+=a.z,V.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(a,t,o,i,r){if(!r&&!i&&!this.isFirstFrame){this.smoothedPos.copy(a.position),this.smoothedQuat.copy(a.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||i){this.smoothedPos.copy(a.position),this.smoothedQuat.copy(a.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const n=this.offset,s=this.prevOffsetState;if(s.x!==n.x||s.y!==n.y||s.z!==n.z||s.xL!==n.xL||s.yL!==n.yL||s.zL!==n.zL){const d=s.x-n.x+(s.xL-n.xL),f=s.y-n.y+(s.yL-n.yL),p=s.z-n.z+(s.zL-n.zL);if(Math.abs(d)>10||Math.abs(f)>10||Math.abs(p)>10){this.resetSmoothing(),this.smoothedPos.copy(a.position),this.smoothedQuat.copy(a.quaternion);return}this.smoothedPos.x+=d,this.smoothedPos.y+=f,this.smoothedPos.z+=p,this.prevOffsetState={...n}}const l=this.smoothedPos.distanceToSquared(a.position);if(this.isLocked?l>1e-18&&(this.isLocked=!1):l<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(a.position);else{const d=1-Math.exp(-40*o);this.smoothedPos.lerp(a.position,d)}this.smoothedQuat.copy(a.quaternion),this.smoothedFov=t}getUnifiedCameraState(a,t){const o={...this.offset};return o.xL+=a.position.x,o.yL+=a.position.y,o.zL+=a.position.z,V.normalize(o),{position:{x:0,y:0,z:0},rotation:{x:a.quaternion.x,y:a.quaternion.y,z:a.quaternion.z,w:a.quaternion.w},sceneOffset:o,targetDistance:t>0?t:3.5}}applyCameraState(a,t){if(t.sceneOffset){const d={...t.sceneOffset};d.xL+=t.position.x,d.yL+=t.position.y,d.zL+=t.position.z,this.state=d}const o=t.rotation,i=o.x??o._x??0,r=o.y??o._y??0,n=o.z??o._z??0,s=o.w??o._w??1;a.position.set(0,0,0),a.quaternion.set(i,r,n,s).normalize();const l=new k(0,1,0).applyQuaternion(a.quaternion);a.up.copy(l),a.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(a.quaternion)}updateShaderUniforms(a,t,o){const i=this.offset.x+this.offset.xL+a.x,r=this.offset.y+this.offset.yL+a.y,n=this.offset.z+this.offset.zL+a.z,s=Math.fround(i),l=Math.fround(r),d=Math.fround(n);t.set(s,l,d),o.set(i-s,r-l,n-d)}updateCameraBasis(a,t,o){const i=a;this._rotMatrix.makeRotationFromQuaternion(i.quaternion);const r=this._rotMatrix.elements;this._camRight.set(r[0],r[1],r[2]),this._camUp.set(r[4],r[5],r[6]),this._camForward.set(-r[8],-r[9],-r[10]);let n=1,s=1;o&&o.isOrtho?(s=o.orthoScale/2,n=s*i.aspect):(s=Math.tan(Re.degToRad(i.fov)*.5),n=s*i.aspect),t[ie.CamBasisX].value.copy(this._camRight).multiplyScalar(n),t[ie.CamBasisY].value.copy(this._camUp).multiplyScalar(s),t[ie.CamForward].value.copy(this._camForward),t[ie.CameraPosition].value.set(0,0,0)}getLightShaderVector(a,t,o,i){const r=this.offset;t?(this._relativePos.set(a.x,a.y,a.z).applyQuaternion(o.quaternion),i.copy(this._relativePos)):i.set(a.x-(r.x+r.xL)-o.position.x,a.y-(r.y+r.yL)-o.position.y,a.z-(r.z+r.zL)-o.position.z)}resolveRealWorldPosition(a,t,o){const i=this.offset;return t?(this._visualVector.set(a.x,a.y,a.z).applyQuaternion(o.quaternion),{x:o.position.x+this._visualVector.x+(i.x+i.xL),y:o.position.y+this._visualVector.y+(i.y+i.yL),z:o.position.z+this._visualVector.z+(i.z+i.zL)}):(this._visualVector.set(a.x-(i.x+i.xL)-o.position.x,a.y-(i.y+i.yL)-o.position.y,a.z-(i.z+i.zL)-o.position.z),this._quatInverse.copy(o.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(a,t,o){const i=new k(0,0,-1).applyEuler(new ke(a.x,a.y,a.z,"YXZ"));t?i.applyQuaternion(o.quaternion):i.applyQuaternion(o.quaternion.clone().invert());const r=new Te().setFromUnitVectors(new k(0,0,-1),i),n=new ke().setFromQuaternion(r,"YXZ");return{x:n.x,y:n.y,z:n.z}}}let Qe=null,ya=null,Ce=null,xe=null,ba=!1;function jn(e){Qe=e}function Nn(e){ya=e}function De(){return Qe}function Vn(){return ya}function Hn(e){const a=ue.getState().optics,t=a?a.camType>.5&&a.camType<1.5:!1;if(ba=t,t){const o=a.orthoScale??2,r=e.aspect||1,n=o/2,s=n*r;xe?(xe.left=-s,xe.right=s,xe.top=n,xe.bottom=-n):xe=new To(-s,s,n,-n,.001,1e4),xe.position.copy(e.position),xe.quaternion.copy(e.quaternion),xe.updateProjectionMatrix(),xe.updateMatrixWorld()}else{Ce||(Ce=new Eo),Ce.position.copy(e.position),Ce.quaternion.copy(e.quaternion);const o=e;o.fov!==void 0&&(Ce.fov=o.fov,Ce.aspect=o.aspect,Ce.updateProjectionMatrix()),Ce.updateMatrixWorld()}}function $n(){return ba?xe||Qe:Ce||Qe}const je=Ee(),$e={getUnifiedPosition:(e,a)=>new k(a.x+a.xL+e.x,a.y+a.yL+e.y,a.z+a.zL+e.z),getUnifiedFromEngine:()=>{const e=De()||je.activeCamera;return e?$e.getUnifiedPosition(e.position,je.sceneOffset):new k},getRotationFromEngine:()=>{const e=De()||je.activeCamera;return e?e.quaternion.clone():new Te},getDistanceFromEngine:()=>{const e=De()||je.activeCamera;if(e){const a=e.position.length();if(a>.001)return a}return null},getRotationDegrees:e=>{const a=new Te(e.x,e.y,e.z,e.w),t=new ke().setFromQuaternion(a);return new k(Re.radToDeg(t.x),Re.radToDeg(t.y),Re.radToDeg(t.z))},teleportPosition:(e,a,t)=>{const o=V.split(e.x),i=V.split(e.y),r=V.split(e.z),n={position:{x:0,y:0,z:0},sceneOffset:{x:o.high,y:i.high,z:r.high,xL:o.low,yL:i.low,zL:r.low}};if(a)n.rotation=a;else{const s=De()||je.activeCamera;if(s){const l=s.quaternion;n.rotation={x:l.x,y:l.y,z:l.z,w:l.w}}}t!==void 0&&(n.targetDistance=t),F.emit(le.CAMERA_TELEPORT,n)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const a=new ke(Re.degToRad(e.x),Re.degToRad(e.y),Re.degToRad(e.z)),t=new Te().setFromEuler(a),o=$e.getUnifiedFromEngine(),i=V.split(o.x),r=V.split(o.y),n=V.split(o.z);F.emit(le.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:i.high,y:r.high,z:n.high,xL:i.low,yL:r.low,zL:n.low}})}},Wo="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let ze=(e=21)=>{let a="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)a+=Wo[t[e]&63];return a};const K=Ee(),qt=e=>typeof e.setOptics=="function"?e.setOptics:null,Xo=(e,a)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const o={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};K.virtualSpace?(K.virtualSpace.state=o,e({sceneOffset:K.virtualSpace.state}),F.emit("offset_set",K.virtualSpace.state)):(e({sceneOffset:o}),F.emit("offset_set",o))},setActiveCameraId:t=>e({activeCameraId:t}),applyCameraState:t=>{e({cameraRot:t.rotation,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance||3.5})},addSavedCamera:t=>{e(o=>({savedCameras:[...o.savedCameras,t],activeCameraId:t.id}))},updateCamera:(t,o)=>{e(i=>({savedCameras:i.savedCameras.map(r=>r.id===t?{...r,...o}:r)}))},deleteCamera:t=>{e(o=>({savedCameras:o.savedCameras.filter(i=>i.id!==t),activeCameraId:o.activeCameraId===t?null:o.activeCameraId}))},reorderCameras:(t,o)=>{e(i=>{const r=[...i.savedCameras],[n]=r.splice(t,1);return r.splice(o,0,n),{savedCameras:r}})},addCamera:t=>{const o=a(),i=$e.getUnifiedFromEngine(),r=$e.getRotationFromEngine(),n=K.lastMeasuredDistance>0&&K.lastMeasuredDistance<1e3?K.lastMeasuredDistance:o.targetDistance,s=V.split(i.x),l=V.split(i.y),d=V.split(i.z),f={position:{x:0,y:0,z:0},rotation:{x:r.x,y:r.y,z:r.z,w:r.w},sceneOffset:{x:s.high,y:l.high,z:d.high,xL:s.low,yL:l.low,zL:d.low},targetDistance:n},p={...o.optics},u=t||`Camera ${o.savedCameras.length+1}`,m={id:ze(),label:u,position:f.position,rotation:f.rotation,sceneOffset:f.sceneOffset,targetDistance:f.targetDistance,optics:p};e(g=>({savedCameras:[...g.savedCameras,m],activeCameraId:m.id}))},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const o=a().savedCameras.find(i=>i.id===t);if(o){if(F.emit("camera_transition",o),e({activeCameraId:t,cameraRot:o.rotation,sceneOffset:o.sceneOffset,targetDistance:o.targetDistance||3.5}),o.optics){const i=qt(a());i&&i(o.optics)}K.resetAccumulation()}},duplicateCamera:t=>{const o=a(),i=o.savedCameras.find(l=>l.id===t);if(!i)return;const r={...JSON.parse(JSON.stringify(i)),id:ze(),label:i.label+" (copy)"},n=o.savedCameras.indexOf(i),s=[...o.savedCameras];if(s.splice(n+1,0,r),e({savedCameras:s,activeCameraId:r.id}),F.emit("camera_teleport",r),e({cameraRot:r.rotation,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance||3.5}),r.optics){const l=qt(a());l&&l(r.optics)}K.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=a().formula,o=te.get(t),i=o==null?void 0:o.defaultPreset,r=(i==null?void 0:i.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},n=(i==null?void 0:i.cameraPos)||{x:0,y:0,z:3.5},s=(i==null?void 0:i.cameraRot)||{x:0,y:0,z:0,w:1},l=(i==null?void 0:i.targetDistance)||3.5,d=r.x+r.xL+n.x,f=r.y+r.yL+n.y,p=r.z+r.zL+n.z,u=V.split(d),m=V.split(f),g=V.split(p),v={x:u.high,y:m.high,z:g.high,xL:u.low,yL:m.low,zL:g.low};a().setSceneOffset(v),e({cameraRot:s,targetDistance:l});const h={position:{x:0,y:0,z:0},rotation:s,sceneOffset:v,targetDistance:l};F.emit("reset_accum",void 0),F.emit("camera_teleport",h)},undoCamera:()=>{const{undoStack:t,redoStack:o}=a();if(t.length===0)return;const i=t[t.length-1];let r;if(K.activeCamera&&K.virtualSpace)r=K.virtualSpace.getUnifiedCameraState(K.activeCamera,a().targetDistance),K.virtualSpace.applyCameraState(K.activeCamera,i);else{const n=a();r={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,redoStack:[...o,r],undoStack:t.slice(0,-1)}),F.emit("reset_accum",void 0),F.emit("camera_teleport",i)},redoCamera:()=>{const{undoStack:t,redoStack:o}=a();if(o.length===0)return;const i=o[o.length-1];let r;if(K.activeCamera&&K.virtualSpace)r=K.virtualSpace.getUnifiedCameraState(K.activeCamera,a().targetDistance),K.virtualSpace.applyCameraState(K.activeCamera,i);else{const n=a();r={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,undoStack:[...t,r],redoStack:o.slice(0,-1)}),F.emit("reset_accum",void 0),F.emit("camera_teleport",i)}});class Yo{constructor(){C(this,"features",new Map);C(this,"sortedCache",null)}register(a){if(a.dependsOn)for(const t of a.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${a.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(a.id,a),this.sortedCache=null}get(a){return this.features.get(a)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(a=>a.tabConfig).map(a=>({id:a.id,...a.tabConfig})).sort((a,t)=>a.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(a=>a.viewportConfig).map(a=>({id:a.id,...a.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(a=>a.menuConfig).map(a=>({id:a.id,...a.menuConfig}))}getExtraMenuItems(){const a=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(o=>a.push({...o,featureId:t.id}))}),a}getEngineFeatures(){return Array.from(this.features.values()).filter(a=>!!a.engineConfig)}getDictionary(){const a={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const o=t.shortId||t.id,i={};Object.entries(t.params).forEach(([r,n])=>{n.shortId&&(i[r]=n.shortId)}),a.features.children[t.id]={_alias:o,children:i}}),a}getUniformDefinitions(){const a=[];return this.features.forEach(t=>{Object.values(t.params).forEach(o=>{if(o.uniform){let i=o.type,r=o.default;i==="color"&&(i="vec3"),i==="boolean"&&(i="float",r=r?1:0),(i==="image"||i==="gradient")&&(i="sampler2D",r=null),a.push({name:o.uniform,type:i,default:r})}}),t.extraUniforms&&a.push(...t.extraUniforms)}),a}topologicalSort(){const a=Array.from(this.features.values()),t=new Map;a.forEach((s,l)=>t.set(s.id,l));const o=new Map,i=new Map;for(const s of a)o.set(s.id,0),i.has(s.id)||i.set(s.id,[]);for(const s of a)if(s.dependsOn)for(const l of s.dependsOn)this.features.has(l)&&(o.set(s.id,(o.get(s.id)||0)+1),i.get(l).push(s.id));const r=[];for(const s of a)o.get(s.id)===0&&r.push(s.id);const n=[];for(;r.length>0;){r.sort((l,d)=>(t.get(l)||0)-(t.get(d)||0));const s=r.shift();n.push(this.features.get(s));for(const l of i.get(s)||[]){const d=(o.get(l)||1)-1;o.set(l,d),d===0&&r.push(l)}}if(n.length!==a.length){const s=a.filter(l=>!n.includes(l)).map(l=>l.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${s.join(", ")}`),a}return n}}const L=new Yo,Zo=Ee(),Qo=e=>{const a={formula:e.formula,pipeline:e.pipeline,renderRegion:e.renderRegion?{...e.renderRegion}:null};return L.getAll().forEach(o=>{const i=e[o.id];i&&(a[o.id]=JSON.parse(JSON.stringify(i)))}),a},Ut=(e,a,t)=>{const o=t();a(e),Object.keys(e).forEach(i=>{const r=i,n=e[r];if(r==="formula"){F.emit("config",{formula:n});return}const s="set"+r.charAt(0).toUpperCase()+r.slice(1);if(typeof o[s]=="function"){o[s](n);return}if(r==="pipeline"){o.setPipeline(n);return}if(r==="graph"){o.setGraph(n);return}const l="set"+r.charAt(0).toUpperCase()+r.slice(1);typeof o[l]=="function"&&!L.get(r)&&o[l](n)}),Zo.resetAccumulation()},Ko=1500;let Wt=0;const Jo=(e,a)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const i=t,r=Date.now();r-Wt<Ko&&a().undoStack.length>0||(e(s=>{const l=[...s.undoStack,i];return{undoStack:l.length>50?l.slice(-50):l,redoStack:[]}}),Wt=r);return}const o=Qo(a());e({interactionSnapshot:o})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:o,aaLevel:i,msaaSamples:r,dpr:n}=a();let s=o==="Auto"||o==="Always"?i:1;if(Math.abs(n-s)>1e-4&&(e({dpr:s}),F.emit("config",{msaaSamples:o==="Auto"||o==="Always"?r:1}),F.emit("reset_accum",void 0)),!t)return;const l=a(),d={};let f=!1;Object.keys(t).forEach(p=>{const u=p,m=t[u],g=l[u];JSON.stringify(m)!==JSON.stringify(g)&&(d[u]=m,f=!0)}),e(f?p=>({paramUndoStack:[...p.paramUndoStack,d],paramRedoStack:[],interactionSnapshot:null}):{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=a();if(t.length===0)return;const i=t[t.length-1],r=t.slice(0,-1),n=a(),s={};Object.keys(i).forEach(l=>{s[l]=n[l]}),Ut(i,e,a),e({paramUndoStack:r,paramRedoStack:[...o,s]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:o}=a();if(o.length===0)return;const i=o[o.length-1],r=o.slice(0,-1),n=a(),s={};Object.keys(i).forEach(l=>{s[l]=n[l]}),Ut(i,e,a),e({paramUndoStack:[...t,s],paramRedoStack:r})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),Xt=`
    if (uGlowIntensity > 0.0001) {
        float sharpness = max(1.0, uGlowSharpness);
        // Boost factor for visibility.
        float gFactor = exp(-sharpness * max(h.x, 0.0)) * uFudgeFactor * 0.4;
        
        #ifdef GLOW_FAST
            // Fast Mode: Accumulate scalar intensity only
            accAlpha += gFactor;
        #else
            // Quality Mode: Accumulate full vector color
            if (gFactor > 1.0e-6) {
                vec3 p_fractal_glow = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
                accColor += getGlowColor(p_fractal_glow, h) * gFactor;
            }
        #endif
    }

    // Volumetric Fog
    if (uFogDensity > 0.0001) {
        float stepVal = max(h.x, 0.0001);
        // Corrected density factor: Reduced from 0.05 to 0.0005 (100x reduction)
        accDensity += (1.0 / (stepVal * 5.0 + 0.1)) * uFogDensity * uFudgeFactor * 0.0005;
    }
`,ei=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,ti=`
    // --- FOG (Atmosphere Feature) ---
    float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;
    vec3 fogColor = uFogColorLinear;

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog
    if (uEnvBackgroundStrength > 0.001) {
        // Background visible: only fog geometry, preserve env map on miss
        if (d < MISS_DIST - 10.0) {
            col = mix(col, fogColor, fogFactor);
        }
    } else {
        col = mix(col, fogColor, fogFactor);
    }
`,ai=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,oi={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new ce(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:1,max:1e3,step:1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new ce(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,a,t)=>{if(t!=="Main")return;e.addPostProcessLogic(ti),e.addPostProcessLogic(ai);const o=a.atmosphere;o&&o.glowEnabled&&(o.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(Xt,ei)):e.addVolumeTracing(Xt,""))}},ii=`
// ------------------------------------------------------------------
// DROSTE EFFECT (ESCHER MATH)
// Ported faithfully from Tom Beddard's Pixel Bender script
// ------------------------------------------------------------------

#define DROSTE_PI 3.141592653
#define DROSTE_TWOPI 6.283185307
#define DROSTE_EPS 1.0e-9

// Complex Math Helpers
// NOTE: Droste always compiles into the post-processing shader (not the formula shader),
// so cMult/cDiv/cExp/cLog won't collide with Frag builtins (cMul/cPow) which live in the formula shader.
vec2 cMult(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cDiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; }
vec2 cExp(vec2 z) { return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y)); }
vec2 cLog(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }

// Extended Math (Renamed to avoid GLSL built-in collisions)
float d_sinh(float x) { return (exp(x) - exp(-x)) * 0.5; }
float d_cosh(float x) { return (exp(x) + exp(-x)) * 0.5; }

vec2 cSin(vec2 z) { return vec2(sin(z.x) * d_cosh(z.y), cos(z.x) * d_sinh(z.y)); }
vec2 cCos(vec2 z) { return vec2(cos(z.x) * d_cosh(z.y), -sin(z.x) * d_sinh(z.y)); }

vec2 cTan(vec2 z) {
    float r = 2.0 * z.x;
    float i = 2.0 * z.y;
    float div = cos(r) + d_cosh(i);
    if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;
    return vec2(sin(r)/div, d_sinh(i)/div);
}

// Complex Power: z^p
vec2 cPower(vec2 z, float p) {
    float r = length(z);
    if (r < DROSTE_EPS) return vec2(0.0);
    float a = atan(z.y, z.x);
    float newR = pow(r, p);
    float newA = a * p;
    return vec2(newR * cos(newA), newR * sin(newA));
}

// Returns vec3: .xy = UV, .z = Mask (1.0 = valid, 0.0 = invalid/transparent)
vec3 applyDroste(
    vec2 uv, 
    vec2 center, 
    float r1, float r2, 
    float period, float strands, 
    float zoom, float rot, 
    bool twist, float tilingMode,
    float rotateSpin,
    bool hyperDroste,
    float fractalPoints,
    bool autoPeriodicity,
    bool strandMirror,
    float rotatePolar
) {
    // 1. Shift & Normalize
    // We expect UV in 0..1 range. Center in -1..1 range (percentage)
    vec2 z = uv - 0.5 - (center * 0.01);
    
    // Adjust aspect ratio to square the calculation space
    float aspect = uResolution.x / uResolution.y;
    z.x *= aspect;
    
    // Scale radii to percentage (0.1 - 100 range from UI)
    float R1 = max(0.0001, r1 * 0.01);
    float R2 = max(R1 * 1.001, r2 * 0.01);
    
    float P2 = strands;
    float P1 = period;

    // --- AUTO PERIODICITY LOGIC ---
    // Matches Pixel Bender: p1 = p2/2.0 * (1.0 + sqrt(1.0 - pow(log(r2/r1)/PI, 2.0)))
    if (autoPeriodicity) {
        float logRatio = log(R2/R1);
        float ratioOverPi = logRatio / DROSTE_PI;
        float term = 1.0 - (ratioOverPi * ratioOverPi);
        
        if (term >= 0.0) {
            P1 = (P2 / 2.0) * (1.0 + sqrt(term));
        }
    }
    
    if (abs(P1) < 0.001) P1 = 0.001;
    
    // --- PRE-TRANSFORM DISTORTIONS ---
    
    // Hyper Droste (Complex Sine)
    if (hyperDroste) {
        z = cSin(z);
    }
    
    // Fractal Points (Complex Power + Tan)
    if (fractalPoints > 0.0) {
        z = cPower(z, fractalPoints);
        z = cTan(cMult(z, vec2(2.0, 0.0)));
    }
    
    // --- POLAR ROTATION ---
    // Ported from Pixel Bender: Stereo-graphic projection rotation
    if (abs(rotatePolar) > 0.001) {
        float theta = radians(rotatePolar);
        float cT = cos(theta);
        float sT = sin(theta);

        float zz = dot(z, z); // x^2 + y^2

        float div = (1.0 + zz + (1.0 - zz) * cT - 2.0 * z.x * sT) * 0.5;

        if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;

        float numX = z.x * cT + (1.0 - zz) * sT * 0.5;
        
        // Complex division: (numX + i*y) / (div + 0i) = numX/div + i*y/div
        z.x = numX / div;
        z.y = z.y / div;
    }
    
    // Rotate Spin (Image Rotation independent of Spiral)
    // Matches Pixel Bender: z *= imageSpin
    if (abs(rotateSpin) > 0.001) {
        float rads = radians(rotateSpin);
        float s = sin(rads);
        float c = cos(rads);
        z = vec2(z.x*c - z.y*s, z.x*s + z.y*c);
    }

    // 2. Pre-Twist Transform
    if (twist) {
         // Apply Zoom & Rotation in log space effectively
         float angle = radians(rot);
         float scale = exp(zoom * 0.1); 
         // Manual rotation matrix
         float c = cos(angle); float s = sin(angle);
         z = vec2(z.x*c - z.y*s, z.x*s + z.y*c) / scale;
         
         // To Log-Polar
         z = cLog(cDiv(z, vec2(R1, 0.0)));
    } else {
        // Cartesian Log mapping for untwisted (Rectangular Projection)
        // Map Y to Angle [-PI, PI]
        z.y *= DROSTE_TWOPI; 
        
        // Map X to Log Radius
        float logWidth = log(R2/R1);
        z.x = z.x * logWidth; 
        
        // Align center
        z.x += logWidth * 0.5;

        // Linear Zoom/Rot application
        z.x -= zoom * 0.1;
        z.y += radians(rot);
    }
    
    // 3. Droste Conformal Map
    float logR = log(R2/R1);
    float angle = atan((P2/P1) * (logR / DROSTE_TWOPI));
    
    float f = cos(angle);
    vec2 beta = cMult(vec2(f, 0.0), cExp(vec2(0.0, angle)));
    
    // Transform Z
    z = cDiv(cMult(vec2(P1, 0.0), z), beta);
    
    // Inverse Log (Exp) to get back to Cartesian
    z = cMult(vec2(R1, 0.0), cExp(z));
    
    // 4. Infinite Tiling (The "Spiral into Infinity")
    float mode = floor(tilingMode + 0.1);
    
    bool doLoop = (mode < 1.5);
    bool doMirror = (abs(mode - 1.0) < 0.1);
    bool flipped = false;
    
    // Calculate Tile Rotation Angle
    float tileAngle = -DROSTE_TWOPI * P1;
    if (P2 > 0.0) tileAngle = -tileAngle;
    
    // Mirror Strand Logic: Divide rotation by number of strands
    // Matches Ref: if (strandMirror) angle /= p2;
    if (strandMirror && abs(P2) > 0.001) {
        tileAngle /= P2;
    }

    if (doLoop) {
        // Ratio determines the scaling and rotation per level
        vec2 ratio = cMult(vec2(R2/R1, 0.0), cExp(vec2(0.0, tileAngle)));
        vec2 ratioInv = cDiv(vec2(1.0, 0.0), ratio);

        float mag = length(z);
        
        // Iteratively scale until within bounds [R1, R2]
        // This simulates the "while" loop in the reference, but GLSL prefers fixed loops
        for(int i=0; i<12; i++) {
            if (mag >= R1 && mag <= R2) break;
            
            if (mag < R1) {
                z = cMult(z, ratio); // Grow
                mag = length(z);
                flipped = !flipped;
            } else if (mag > R2) {
                z = cMult(z, ratioInv); // Shrink
                mag = length(z);
                flipped = !flipped;
            }
        }
    }
    
    if (doMirror && flipped) {
        float r2 = dot(z, z);
        if(r2 > 1.0e-9) {
            z *= (R1 * R2) / r2;
        }
    }

    // 5. Map back to UV
    z.x /= aspect;
    z += 0.5 + (center * 0.01);
    
    float mask = 1.0;
    
    // 6. Apply Final Tiling Mode (Edge Handling)
    if (mode < 0.5) {
        // 0: Repeat
        z = fract(z);
    } else if (mode < 1.5) {
        // 1: Mirror (Standard edge mirroring)
        z.x = 1.0 - abs(mod(z.x, 2.0) - 1.0);
        z.y = 1.0 - abs(mod(z.y, 2.0) - 1.0);
    } else if (mode < 2.5) {
        // 2: Clamp
        z = clamp(z, 0.0, 1.0);
    } else {
        // 3: Transparent
        if (z.x < 0.0 || z.x > 1.0 || z.y < 0.0 || z.y > 1.0) {
            mask = 0.0;
        }
    }
    
    return vec3(z, mask);
}
`,ri={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new be(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:ii,mainUV:`
            if (uDrosteActive > 0.5) {
                vec3 res = applyDroste(
                    sampleUV, 
                    uDrosteCenter, 
                    uDrosteR1, 
                    uDrosteR2, 
                    uDrostePeriodicity, 
                    uDrosteStrands, 
                    uDrosteZoom, 
                    uDrosteRotate, 
                    uDrosteTwist > 0.5,
                    uDrosteTiling,
                    uDrosteSpin,
                    uDrosteHyper > 0.5,
                    (uDrosteHyper > 0.5 ? uDrosteFractal : 0.0),
                    uDrosteAuto > 0.5,
                    uDrosteMirror > 0.5,
                    uDrostePolar
                );
                sampleUV = res.xy;
                mask = res.z;
            }
        `}},ni={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const a=e;return a===0?"0.0 (off)":a.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const a=e;return a===0?"0.0 (off)":a.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
            // Barrel distortion — models how real lenses bend light more at edges
            vec2 caBarrelDistort(vec2 coord, float amt) {
                vec2 cc = coord - 0.5;
                float dist = dot(cc, cc);
                return coord + cc * dist * amt;
            }

            // Attempt to approximate visible spectrum as RGB
            // Maps t in [0,1] across the hue spectrum (YACA by Fu-Bama)
            vec3 caSpectrum(float t) {
                vec3 w = abs(t * 4.0 - vec3(1.0, 2.0, 1.0));
                w = clamp(1.5 - w, 0.0, 1.0);
                w.xz += clamp(t * 4.0 - 3.5, 0.0, 1.0);
                w.z = 1.0 - w.z;
                return w;
            }
        `,main:`
            // --- Spectral Chromatic Aberration ---
            // Per-wavelength barrel distortion (12 spectral samples)
            if (uCAStrength > 0.0001) {
                const int CA_SAMPLES = 12;
                float caMaxDistort = uCAStrength * 0.15;

                vec3 caSum = vec3(0.0);
                vec3 caWSum = vec3(0.0);
                for (int i = 0; i < CA_SAMPLES; i++) {
                    float t = float(i) / float(CA_SAMPLES - 1);
                    vec3 w = caSpectrum(t);
                    caWSum += w;
                    caSum += w * texture(map, caBarrelDistort(sampleUV, caMaxDistort * (t - 0.5))).rgb;
                }
                col = caSum / caWSum;
            }

            // --- Multi-Pass Bloom (composited by BloomPass in worker) ---
            if (uBloomIntensity > 0.001) {
                col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity;
            }
        `}},si=`
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

vec3 GetEnvMap(vec3 dir, float roughness) {
    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix, identity when rotation is 0)
    dir.xz = uEnvRotationMatrix * dir.xz;

    vec3 col; // Result variable

    if (uEnvSource > 0.5) {
        // Path 1: Gradient Texture
        float t = dir.y * 0.5 + 0.5;
        col = texture(uEnvGradient, vec2(t, 0.5)).rgb;
    }
    else if (uUseEnvMap > 0.5) {
        // Path 2: EnvMap Texture (Flattened else-if for compiler safety)
        // Equirectangular projection: longitude → [0,1], latitude → [0,1]
        vec2 uv = vec2(atan(dir.z, dir.x) * INV_TAU + 0.5, 1.0 - acos(dir.y) * INV_PI);
        float bias = roughness * 6.0;  // Mip bias: 6 levels ≈ typical env map mip chain depth
        col = texture(uEnvMapTexture, uv, bias).rgb;
        
        // Apply Color Profile (Linear/ACES)
        col = applyTextureProfile(col, uEnvMapColorSpace);
    } 
    else {
        // Path 3: Procedural Sky — simple gradient + sun glint + rim fill
        float y = dir.y * 0.5 + 0.5;  // Remap vertical direction [-1,1] → [0,1]
        vec3 skyBase = mix(vec3(0.02, 0.02, 0.05), vec3(0.15, 0.15, 0.25), y);  // Dark navy horizon → lighter zenith
        vec3 sky = mix(skyBase, vec3(0.1), roughness * 0.5);  // Desaturate with roughness (blurry reflections see averaged sky)

        // Sun: sharp specular highlight, blurs with roughness
        float specPower = mix(100.0, 0.5, roughness * roughness);  // Sharp (100) for mirrors, soft (0.5) for rough
        float rimPower = mix(10.0, 1.0, roughness);  // Rim falloff exponent

        vec3 sunDir = normalize(vec3(1.0, 4.0, 2.0));  // Fixed upper-right sun position
        float sunDot = max(0.0, dot(dir, sunDir));
        float light = pow(sunDot, specPower);

        // Counter-light rim fill — prevents pure black on shadow side
        vec3 rimDir = normalize(vec3(-1.0, 1.0, -1.0));
        float rimDot = max(0.0, dot(dir, rimDir));
        float rim = pow(rimDot, rimPower) * 0.5;

        float brightness = mix(1.0, 0.3, roughness);  // Rough surfaces see dimmer sky overall
        col = sky + vec3(1.0) * light * 0.8 * brightness + vec3(0.8, 0.9, 1.0) * rim * brightness;
    }

    return col;
}
`,li=`
    roughness = clamp(uRoughness, 0.02, 1.0);
    vec3 emitSource = albedo; 
    if (abs(uEmissionMode - 1.0) < 0.1) emitSource = col1;
    else if (abs(uEmissionMode - 2.0) < 0.1) emitSource = col2;
    else if (abs(uEmissionMode - 3.0) < 0.1) {
        float n01 = noiseVal * 0.5 + 0.5;
        emitSource = uLayer3Color * n01;
    }
    else if (abs(uEmissionMode - 4.0) < 0.1) emitSource = uEmissionColor; 
    emission = emitSource * uEmission * 1.5;
`,ci=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,di={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:Do,minFilter:Ao,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new ce(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:(e,a,t)=>{t!=="Mesh"&&(e.addHeader(ci),e.addMaterialLogic(li),e.addFunction(si))}},fi={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
            vec3 applyColorGrading(vec3 col) {
                col = max(vec3(0.0), col - uLevelsMin);
                col /= max(0.0001, uLevelsMax - uLevelsMin);
                if (abs(uLevelsGamma - 1.0) > 0.001) {
                    col = pow(max(vec3(0.0), col), vec3(1.0 / uLevelsGamma));
                }
                float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
                col = mix(vec3(luma), col, uSaturation);
                return col;
            }
        `,main:`
            if (uGradingActive > 0.5) {
                col = applyColorGrading(col);
            }
        `}},pi={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:Nt,wrapT:Nt,minFilter:jt,magFilter:jt},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new be(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new be(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},xa=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = log(max(1.0e-5, result.y)) * -0.2;"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
            // Standard Iterations
            v = result.z;
            
            // HYBRID FIX: For SDF fractals (Menger, Amazing Box) that don't "escape",
            // the iteration count is constant (1.0). This looks flat.
            // If we hit max iterations (approx 1.0), mix in Orbit Trap (y) to provide texture.
            if (v > 0.99) {
                float trap = log(max(1.0e-5, result.y)) * -0.2;
                // Modulate the 1.0 base with the trap value
                v = 0.95 + 0.05 * sin(trap * 10.0);
            }
        `},{value:2,label:"Radial",description:"Distance from the center of the world.",glsl:"v = length(p) * 0.2;"},{value:3,label:"Z-Depth",description:"Height map based on Z coordinate. Good for landscapes.",glsl:"v = p.z * 0.2;"},{value:4,label:"Angle",description:"Polar angle around the Z axis. Creates spirals.",glsl:"v = atan(p.y, p.x) * 0.15915 + 0.5;"},{value:5,label:"Normal",description:"Based on surface slope (Up/Down).",glsl:"v = dot(n, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;"},{value:6,label:"Decomposition",description:"Analytic angle decomposition. Creates grid/chip patterns.",glsl:`
            // Removed aggressive zero-clamping that broke some metric modes
            v = result.w;
        `},{value:7,label:"Raw Iterations",description:"Stepped bands showing exact iteration counts.",glsl:"v = floor(result.z * float(uIterations)) / float(uIterations);"},{value:8,label:"Potential (Log-Log)",description:"Electric potential. Creates smooth bands near the set boundary.",glsl:`
            // Uses result.y (Trap) as magnitude holder if available
            // Optimized for R > 1.0
            float r = max(result.y, 1.0001); 
            v = log2(log2(r));
        `},{value:9,label:"Flow (Angle + Iter)",description:"Combines Decomposition (Angle) and Iterations to create spirals and grids.",glsl:`
            // Result.w = Decomposition (Angle 0-1)
            // Result.z = Smoothed Iterations (Count 0-N)
            // Adding them creates a diagonal slope in the mapping space.
            // When wrapped by the gradient, this creates spirals.
            v = result.w + result.z;
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = log(max(1.0e-5, g_orbitTrap.x)) * -0.2;"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = log(max(1.0e-5, g_orbitTrap.y)) * -0.2;"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = log(max(1.0e-5, g_orbitTrap.z)) * -0.2;"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = log(max(1.0e-5, g_orbitTrap.w)) * -0.2;"}],ui=()=>{let e=`
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return xa.forEach(a=>{e+=`
        case ${Math.round(a.value)}: { // ${a.label}
            ${a.glsl}
        } break;`}),e+=`
        default: // Fallback
            v = result.z;
            break;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `,e},Yt=xa.map(e=>({label:e.label,value:e.value})),mi={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:Yt},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:Yt},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new ce(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,a,t)=>{const o=a.coloring;(o==null?void 0:o.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(ui()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},hi={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},gi={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},yi={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},bi={id:"decoupled",label:"Decoupled",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Fold boundary at foldLimit, reflect to foldingValue (Mandelbulber box fold)
    vec3 fv = uHybridFoldingValue;
    if (z.x > foldLimit.x) z.x = fv.x - z.x;
    else if (z.x < -foldLimit.x) z.x = -fv.x - z.x;
    if (z.y > foldLimit.y) z.y = fv.y - z.y;
    else if (z.y < -foldLimit.y) z.y = -fv.y - z.y;
    if (z.z > foldLimit.z) z.z = fv.z - z.z;
    else if (z.z < -foldLimit.z) z.z = -fv.z - z.z;
}
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new k(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},xi={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new k(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},vi={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},Si={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},zi={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's icosahedral fold — golden ratio plane normals
    const float PHI = 1.618033988749895;
    const vec3 n1 = normalize(vec3(-PHI, PHI - 1.0, 1.0));
    const vec3 n2 = normalize(vec3(1.0, -PHI, PHI + 1.0));
    const vec3 n3 = vec3(0.0, 0.0, -1.0);

    z = abs(z);
    float t;
    t = dot(z, n1); if (t > 0.0) z -= 2.0 * t * n1;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
    t = dot(z, n3); if (t > 0.0) z -= 2.0 * t * n3;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},wi={id:"menger",label:"Menger (Cubic)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // 1. 48-fold octahedral symmetry: abs + branchless descending sort
    z = abs(z);
    vec3 s = z;
    z.x = max(max(s.x, s.y), s.z);
    z.z = min(min(s.x, s.y), s.z);
    z.y = s.x + s.y + s.z - z.x - z.z;

    // 2. Scale + Offset (IFS step): z = Scale*z - Offset*(Scale-1)
    float scale = uHybridScale;
    vec3 shift = uHybridMengerOffset * (scale - 1.0);
    z = z * scale - shift;

    // 3. Center-Z conditional fold (restores full cubic symmetry)
    if (uHybridMengerCenterZ > 0.5) {
        z.z += shift.z * step(z.z, -0.5 * shift.z);
    }

    // 4. Derivative (chain rule for uniform scale)
    dr *= abs(scale);
}
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new k(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},Ke=[hi,gi,yi,bi,xi,vi,Si,zi,wi],_i=Ke.map((e,a)=>({label:e.label,value:a}));function Mi(e){return Ke[e]??Ke[0]}const Ci=`
// --- GMT Shared Transforms ---
// Rodrigues rotation state (pre-calculated once per frame in loopInit)
vec3 gmt_rotAxis = vec3(0.0, 1.0, 0.0);
float gmt_rotCos = 1.0;
float gmt_rotSin = 0.0;

void gmt_precalcRodrigues(vec3 params) {
    if (abs(params.z) > 0.001) {
        float azimuth = params.x;
        float pitch = params.y;
        float rotAngle = params.z * 0.5;
        float cosPitch = cos(pitch);
        gmt_rotAxis = vec3(
            cosPitch * sin(azimuth),
            sin(pitch),
            cosPitch * cos(azimuth)
        );
        gmt_rotSin = sin(rotAngle);
        gmt_rotCos = cos(rotAngle);
    }
}

void gmt_applyRodrigues(inout vec3 z) {
    if (abs(gmt_rotSin) > 0.0001) {
        z = z * gmt_rotCos + cross(gmt_rotAxis, z) * gmt_rotSin
            + gmt_rotAxis * dot(gmt_rotAxis, z) * (1.0 - gmt_rotCos);
    }
}

void gmt_applyTwist(inout vec3 z, float amount) {
    if (abs(amount) > 0.001) {
        float ang = z.z * amount;
        float s = sin(ang);
        float co = cos(ang);
        z.xy = mat2(co, -s, s, co) * z.xy;
    }
}
`,Fi=["xyz","xzy","yxz","yzx","zxy","zyx"];function Ii(e){const a=Fi[e]??"xyz";return a==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${a};`}function Pi(e,a,t=!1){return`
mat3 hybridRotMat;
bool hybridHasRot;

void initHybridTransform() {
    vec3 hr = uHybridRot;
    hybridHasRot = (abs(hr.x) + abs(hr.y) + abs(hr.z)) > 0.001;
    hybridRotMat = mat3(1.0);
    if (hybridHasRot) {
        float sx = sin(hr.x), cx = cos(hr.x);
        float sy = sin(hr.y), cy = cos(hr.y);
        float sz = sin(hr.z), cz = cos(hr.z);
        hybridRotMat = mat3(
            cy*cz, -cy*sz, sy,
            sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
            -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
        );
    }
}

void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    // Transform into fold space
    ${a==="wrap"?"if (hybridHasRot) z3 = hybridRotMat * z3;":""}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${a==="wrap"?"if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;":""}

    ${t?"// selfContained fold — scaling + DR handled inside foldOperation":`
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${a==="post"?"if (hybridHasRot) { z3 = hybridRotMat * z3; }":""}

    // Dynamic scale variation (Mandelbulber ABoxVaryScale)
    float s = uHybridScale + uHybridScaleVary * (abs(uHybridScale) - 1.0);
    z3 *= s;`}

    // C-axis permutation
    ${e}
    if (uHybridAddC > 0.5) z3 += c_perm;

    z.xyz = z3;
    ${t?"":"dr = dr * abs(s) + 1.0;"}
    trap = min(trap, getLength(z3));
}
`}function Ri(){const e={};return Ke.forEach((a,t)=>{a.extraParams&&Object.entries(a.extraParams).forEach(([o,i])=>{e[o]={...i,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const Ti={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:_i.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new k(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new k(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new k(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...Ri(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new k(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new k(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new k(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new k(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,a)=>{const t=a.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const i=t?t.preRotMaster!==!1:!0;e.setRotation(i),e.addPreamble(Ci);const r=(t==null?void 0:t.hybridCompiled)??!1;if(!r)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const d=(t==null?void 0:t.hybridFoldType)??0,f=Mi(d);e.addFunction(f.glsl);const p=(t==null?void 0:t.hybridPermute)??0,u=Ii(p);e.addFunction(Pi(u,f.rotMode??"wrap",f.selfContained??!1))}let n="",s="";if(a.formula!=="MandelTerrain"&&(s+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),r)if(!(t&&t.hybridComplex))n+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const f=(t==null?void 0:t.hybridSwap)??!1;n+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,s+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${f?"1":"0"}) {
                        int rel_i = i - ${f?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybridFold("",n,s)}},Zt=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF"],Qt=["uVec2A","uVec2B","uVec2C"],Kt=["uVec3A","uVec3B","uVec3C"],Jt=["uVec4A","uVec4B","uVec4C"],va=["uInterlaceParamA","uInterlaceParamB","uInterlaceParamC","uInterlaceParamD","uInterlaceParamE","uInterlaceParamF"],Sa=["uInterlaceVec2A","uInterlaceVec2B","uInterlaceVec2C"],za=["uInterlaceVec3A","uInterlaceVec3B","uInterlaceVec3C"],wa=["uInterlaceVec4A","uInterlaceVec4B","uInterlaceVec4C"];function Ei(){const e=[];for(let a=0;a<Zt.length;a++)e.push([new RegExp(`\\b${Zt[a]}\\b`,"g"),va[a]]);for(let a=0;a<Qt.length;a++)e.push([new RegExp(`\\b${Qt[a]}\\b`,"g"),Sa[a]]);for(let a=0;a<Kt.length;a++)e.push([new RegExp(`\\b${Kt[a]}\\b`,"g"),za[a]]);for(let a=0;a<Jt.length;a++)e.push([new RegExp(`\\b${Jt[a]}\\b`,"g"),wa[a]]);return e}const Ai=Ei();function Ft(e){let a=e;for(const[t,o]of Ai)a=a.replace(t,o);return a}function _a(e,a){const t=[...a].sort((i,r)=>r.length-i.length);let o=e;for(const i of t)o=o.replace(new RegExp(`\\b${i}\\b`,"g"),`interlace_${i}`);return o}function Di(e,a,t){let o=e;return o=o.replace(new RegExp(`\\b${a}_\\w+\\b`,"g"),i=>`interlace_${i}`),t&&t.length>0&&(o=_a(o,t)),o=Ft(o),o}function Li(e,a,t){let o=e;return o=o.replace(new RegExp(`\\bformula_${a}\\b`,"g"),"formula_Interlace"),o=Ft(o),t&&t.length>0&&(o=_a(o,t)),o}function ki(e,a){return e.replace(new RegExp(`\\bformula_${a}\\b`,"g"),"formula_Interlace")}function Bi(e,a){let t=e;return t=t.replace(new RegExp(`\\b${a}_\\w+\\b`,"g"),o=>`interlace_${o}`),t=Ft(t),t}function Oi(e,a,t){let o="";a&&(o=`
    vec3 _il_savedAxis = gmt_rotAxis;
    float _il_savedCos = gmt_rotCos;
    float _il_savedSin = gmt_rotSin;
    vec3 _il_interlaceAxis = gmt_rotAxis;
    float _il_interlaceCos = gmt_rotCos;
    float _il_interlaceSin = gmt_rotSin;
    if (uInterlaceEnabled > 0.5) {
        ${a}
        _il_interlaceAxis = gmt_rotAxis;
        _il_interlaceCos = gmt_rotCos;
        _il_interlaceSin = gmt_rotSin;
        gmt_rotAxis = _il_savedAxis;
        gmt_rotCos = _il_savedCos;
        gmt_rotSin = _il_savedSin;
    }`);const n=`
    if (uInterlaceEnabled > 0.5) {
        int ilSkip = int(uInterlaceInterval);
        int ilStart = int(uInterlaceStartIter);
        if (ilSkip < 1) ilSkip = 1;
        if (i >= ilStart && ((i - ilStart) % ilSkip) == 0) {
            ${t?`
            gmt_rotAxis = _il_interlaceAxis;
            gmt_rotCos = _il_interlaceCos;
            gmt_rotSin = _il_interlaceSin;`:""}
            ${e}
            ${t?`
            gmt_rotAxis = _il_savedAxis;
            gmt_rotCos = _il_savedCos;
            gmt_rotSin = _il_savedSin;`:""}
            skipMainFormula = true;
        }
    }`;return{preLoop:o,inLoop:n}}const Ue={scalars:va,vec2s:Sa,vec3s:za,vec4s:wa};function ji(){return te.getAll().filter(e=>e.id!=="Modular").map(e=>({label:e.name,value:e.id}))}const Ma={interlaceParamA:"paramA",interlaceParamB:"paramB",interlaceParamC:"paramC",interlaceParamD:"paramD",interlaceParamE:"paramE",interlaceParamF:"paramF",interlaceVec3A:"vec3A",interlaceVec3B:"vec3B",interlaceVec3C:"vec3C",interlaceVec2A:"vec2A",interlaceVec2B:"vec2B",interlaceVec2C:"vec2C"},Ni=Object.fromEntries(Object.entries(Ma).map(([e,a])=>[a,e]));function Vi(e){const a=te.get(e);if(!a)return{};const t={};for(const o of a.parameters){if(!o)continue;const i=Ni[o.id];i!==void 0&&(t[i]=o.default)}return t}function Ca(e,a){const t=e==null?void 0:e.interlaceFormula;if(!t)return;const o=te.get(t);if(!o)return;const i=Ma[a];return o.parameters.find(r=>r&&r.id===i)??void 0}function he(e){return a=>{const t=Ca(a,e);if(!t)return;const o={label:t.label};return t.min!==void 0&&(o.min=t.min),t.max!==void 0&&(o.max=t.max),t.step!==void 0&&(o.step=t.step),t.mode&&(o.mode=t.mode),t.scale&&(o.scale=t.scale),t.linkable!==void 0&&(o.linkable=t.linkable),t.options&&(o.options=t.options),o}}function ge(e){return a=>!!Ca(a,e)}const Hi={id:"interlace",shortId:"il",name:"Formula Interlace",category:"Formulas",dependsOn:["coreMath","geometry"],engineConfig:{toggleParam:"interlaceCompiled",mode:"compile",label:"Formula Interlacing",description:"Alternate between two formulas per iteration (like Mandelbulber hybrid).",groupFilter:"engine_settings"},panelConfig:{compileParam:"interlaceCompiled",runtimeToggleParam:"interlaceEnabled",compileSettingsParams:["interlaceFormula"],runtimeGroup:"interlace_runtime",label:"Interlace",compileMessage:"Compiling interlaced formula..."},params:{interlaceCompiled:{type:"boolean",default:!1,label:"Formula Interlacing",shortId:"ilc",group:"engine_settings",ui:"checkbox",description:"Compiles a secondary formula into the shader for per-iteration alternation.",onUpdate:"compile",noReset:!0,estCompileMs:1500},interlaceFormula:{type:"float",default:"Mandelbulb",label:"Secondary Formula",shortId:"ilf",group:"engine_settings",get options(){return ji().map(e=>({label:e.label,value:e.value,estCompileMs:800}))},description:"Formula to alternate with the primary formula each iteration.",onUpdate:"compile",noReset:!0,condition:{param:"interlaceCompiled",bool:!0},onSet:e=>Vi(e)},interlaceEnabled:{type:"boolean",default:!1,label:"Interlace Active",shortId:"ile",uniform:"uInterlaceEnabled",group:"interlace_runtime",hidden:!0},interlaceInterval:{type:"float",default:2,label:"Interval",shortId:"ili",uniform:"uInterlaceInterval",min:1,max:10,step:1,group:"interlace_runtime",description:"Run secondary formula every N iterations.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceStartIter:{type:"float",default:0,label:"Start Iter",shortId:"ils",uniform:"uInterlaceStartIter",min:0,max:20,step:1,group:"interlace_runtime",description:"First iteration where secondary formula runs.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceParamA:{type:"float",default:8,label:"Param A",shortId:"ila",uniform:"uInterlaceParamA",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamA"),dynamicVisible:ge("interlaceParamA")},interlaceParamB:{type:"float",default:0,label:"Param B",shortId:"ilb",uniform:"uInterlaceParamB",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamB"),dynamicVisible:ge("interlaceParamB")},interlaceParamC:{type:"float",default:0,label:"Param C",shortId:"ilc2",uniform:"uInterlaceParamC",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamC"),dynamicVisible:ge("interlaceParamC")},interlaceParamD:{type:"float",default:0,label:"Param D",shortId:"ild",uniform:"uInterlaceParamD",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamD"),dynamicVisible:ge("interlaceParamD")},interlaceParamE:{type:"float",default:0,label:"Param E",shortId:"ile2",uniform:"uInterlaceParamE",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamE"),dynamicVisible:ge("interlaceParamE")},interlaceParamF:{type:"float",default:0,label:"Param F",shortId:"ilf2",uniform:"uInterlaceParamF",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceParamF"),dynamicVisible:ge("interlaceParamF")},interlaceVec3A:{type:"vec3",default:new k(0,0,0),label:"Vec3 A",shortId:"ilv3a",uniform:"uInterlaceVec3A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec3A"),dynamicVisible:ge("interlaceVec3A")},interlaceVec3B:{type:"vec3",default:new k(0,0,0),label:"Vec3 B",shortId:"ilv3b",uniform:"uInterlaceVec3B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec3B"),dynamicVisible:ge("interlaceVec3B")},interlaceVec3C:{type:"vec3",default:new k(0,0,0),label:"Vec3 C",shortId:"ilv3c",uniform:"uInterlaceVec3C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec3C"),dynamicVisible:ge("interlaceVec3C")},interlaceVec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"ilv2a",uniform:"uInterlaceVec2A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec2A"),dynamicVisible:ge("interlaceVec2A")},interlaceVec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"ilv2b",uniform:"uInterlaceVec2B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec2B"),dynamicVisible:ge("interlaceVec2B")},interlaceVec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"ilv2c",uniform:"uInterlaceVec2C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:he("interlaceVec2C"),dynamicVisible:ge("interlaceVec2C")}},groups:{interlace_runtime:{label:"Interlace Controls"}},inject:(e,a,t)=>{const o=a.interlace;if(!(o!=null&&o.interlaceCompiled))return;const i=o.interlaceFormula;if(!i||i==="Modular"||a.formula==="Modular")return;const r=te.get(i);if(!r)return;if(t==="Mesh"){for(const u of Ue.scalars)e.addUniform(u,"float");for(const u of Ue.vec2s)e.addUniform(u,"vec2");for(const u of Ue.vec3s)e.addUniform(u,"vec3");for(const u of Ue.vec4s)e.addUniform(u,"vec4");e.addUniform("uInterlaceEnabled","float"),e.addUniform("uInterlaceInterval","float"),e.addUniform("uInterlaceStartIter","float")}if(r.shader.preamble){const u=Di(r.shader.preamble,r.id,r.shader.preambleVars);e.addPreamble(u)}const n=Li(r.shader.function,r.id,r.shader.preambleVars);e.addFunction(n);const s=ki(r.shader.loopBody,r.id);let l="";r.shader.loopInit&&(l=Bi(r.shader.loopInit,r.id));const d=!!r.shader.usesSharedRotation,{preLoop:f,inLoop:p}=Oi(s,l,d);e.addHybridFold("",f,p)}},$i={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:500,label:"Hard Loop Cap",shortId:"hc",min:64,max:2e3,step:1,group:"engine_settings",ui:"numeric",description:"Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",onUpdate:"compile",noReset:!0,hidden:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0,hidden:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0,hidden:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:2e3,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",isAdvanced:!0,dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!1,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{param:"dynamicScaling",bool:!0},format:e=>`1/${e}x`,noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,a)=>{const t=a.quality,o=(t==null?void 0:t.compilerHardCap)||500;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(o).toString())}},Gn=220,qn=24,Un=32,Wn=24,Xn=24,Yn=50,ft=64,X=8,Zn=50,Qn={DEFAULT_BITRATE:40},Kn=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4"},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm"}];class Gi{constructor(){C(this,"nodes",new Map)}register(a){this.nodes.set(a.id,a)}get(a){return this.nodes.get(a)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const a={};return this.nodes.forEach(t=>{a[t.category]||(a[t.category]=[]),a[t.category].push(t.id)}),a}}const H=new Gi;H.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});H.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});H.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});H.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});H.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});H.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});H.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});H.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});H.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});H.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});H.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});H.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});H.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});H.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});H.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 p = ${e.varName}_p;
${e.indent}    float r = length(p);
${e.indent}    float power = ${e.getParam("power")};
${e.indent}    ${e.varName}_dr = pow(max(r, 1e-5), power - 1.0) * power * ${e.varName}_dr + 1.0;
${e.indent}    float theta = acos(clamp(p.z / r, -1.0, 1.0));
${e.indent}    float phi = atan(p.y, p.x);
${e.indent}    theta = theta * power + ${e.getParam("phaseX")};
${e.indent}    phi = phi * power + ${e.getParam("phaseY")};
${e.indent}    float zr = pow(r, power);
${e.indent}    p = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
${e.indent}    float tw = ${e.getParam("twist")};
${e.indent}    if(abs(tw) > 0.001) { float ang = p.z * tw; float s = sin(ang); float c = cos(ang); p.xy = mat2(c,-s,s,c) * p.xy; }
${e.indent}    ${e.varName}_p = p;
${e.indent}}
`});H.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});H.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});H.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});H.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});H.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});H.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});H.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});H.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});H.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});H.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});H.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const qi=(e,a)=>{const t=new Set,o=["root-end"],i=new Set;for(;o.length>0;){const p=o.pop();if(i.has(p))continue;i.add(p),p!=="root-end"&&p!=="root-start"&&t.add(p),a.filter(m=>m.target===p).forEach(m=>o.push(m.source))}const r=e.filter(p=>t.has(p.id));if(!r||r.length===0)return`
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;let n=`
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;const s=new Map;s.set("root-start","v_start");let l=0;r.forEach((p,u)=>{const g=`v_${p.id.replace(/[^a-zA-Z0-9]/g,"")}`;s.set(p.id,g);const v=a.filter(T=>T.target===p.id),h=v.find(T=>!T.targetHandle||T.targetHandle==="a"),y=v.find(T=>T.targetHandle==="b"),b=h&&s.get(h.source)||"v_start",M=y&&s.get(y.source)||"v_start";if(n+=`    // Node: ${p.type} (${p.id})
`,n+=`    vec3 ${g}_p = ${b}_p;
`,n+=`    float ${g}_d = ${b}_d;
`,n+=`    float ${g}_dr = ${b}_dr;
`,p.enabled){const T=H.get(p.type);if(T){const z=p.condition&&p.condition.active;let _="    ";if(z){const I=Math.round(Math.max(1,p.condition.mod)),A=Math.round(p.condition.rem);n+=`    if ( (i - (i/${I})*${I}) == ${A} ) {
`,_="        "}const R=I=>p.bindings&&p.bindings[I]?`u${p.bindings[I]}`:l<ft?`uModularParams[${l++}]`:"0.0";n+=T.glsl({varName:g,in1:b,in2:M,getParam:R,indent:_}),z&&(n+=`    }
`)}}n+=`
`});const d=a.find(p=>p.target==="root-end");let f="v_start";return d&&d.source!=="root-start"&&(f=s.get(d.source)||"v_start"),n+=`
    z.xyz = ${f}_p;
    dr = ${f}_dr;
    
    float final_d = ${f}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${n}
}
`},Ui=e=>{let a="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?a=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `:e<1.5?a="d = (r - 1.0) / dr_safe;":e<2.5?a="d = r / dr_safe;":e<3.5?a=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `:a="d = (r - 2.0) / dr_safe;",`
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            ${a}
            
            return vec2(d, smoothIter);
        }`},Wi={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:ie.ModularParams,type:"float",arraySize:ft,default:new Float32Array(ft)}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new k(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new k(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new k(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new et(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new et(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new et(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,a)=>{var f;const t=a.formula,o=a.quality;t==="Modular"&&e.addDefine("PIPELINE_REV",(a.pipelineRevision||0).toString()),["JuliaMorph","MandelTerrain"].includes(t)&&e.addDefine("SKIP_PRE_BAILOUT","1");const i=te.get(t);let r="",n="",s="";const l=(o==null?void 0:o.estimator)||0;let d=Ui(l);if(t==="Modular"){const p=qi(a.pipeline||[],((f=a.graph)==null?void 0:f.edges)||[]);r+=p+`
`,n="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else i&&(r+=i.shader.function+`
`,n=i.shader.loopBody,s=i.shader.loopInit||"",i.shader.preamble&&e.addPreamble(i.shader.preamble),i.shader.getDist&&(d=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${i.shader.getDist} }`));e.addFunction(r),e.setFormula(n,s,d)}};let Xi=0;function Le(){return`l${++Xi}`}const Yi=(e,a)=>{if(!e)return`
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;if(a===3)return`
// ------------------------------------------------------------------
// SHADOWS (Hard Only — Fastest)
// ------------------------------------------------------------------
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    float t = 0.01;
    int limit = min(uShadowSteps, 128);

    for(int i = 0; i < 128; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        if(h < max(1.0e-5, t * 0.0005)) return 0.0;  // Distance-adaptive hit threshold (0.05% of ray distance)
        t += h;
        if(t > lightDist) return 1.0;
    }
    return 1.0;
}

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    return GetHardShadow(ro, rd, lightDist);
}
`;const t=256,o=a<1.5?`
        float t = 0.05;
        float fudge = 1.0;
    `:`
        float t = 0.0;
        float fudge = uFudgeFactor;
    `,i=a<1.5?`
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            t += max(h, 0.05);
    `:`
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            res = min(res, k * h / max(t, 1.0e-5));
            t += h * fudge;
    `;return`
// ------------------------------------------------------------------
// SHADOWS (${a<1.5?"Lite Soft":"Robust Soft"})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${o}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${i}
        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        float thresh = max(1.0e-6, t * 0.0002);

        if(h < thresh) return 0.0;

        t += h * fudge;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`},Fa=e=>`
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    vec3 Lo = vec3(0.0);

    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    float biasAmount = uShadowBias + pixelSizeScale * 2.0;
    vec3 shadowRo = p + n * biasAmount;

    // COMPILER OPTIMIZATION: Prevent unrolling of light loop
    int lightCount = uLightCount;

    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= lightCount) break;

        float intensity = uLightIntensity[i];
        if (intensity < 0.01) continue;

        float type = uLightType[i];
        bool isDirectional = type > 0.5;

        vec3 lVec;
        float distToLight;

        if (isDirectional) {
             lVec = uLightDir[i]; // Already "toward light" from uniform manager
             distToLight = DIR_LIGHT_DIST;  // Directional: treat as infinitely far (> BOUNDING_RADIUS)
        } else {
             lVec = uLightPos[i] - p;
             distToLight = length(lVec);
             if (distToLight < 0.0001) continue;  // Skip degenerate (light inside surface)
        }

        vec3 l = isDirectional ? normalize(lVec) : lVec / distToLight;

        float NdotL = max(0.0, dot(n, l));
        if (NdotL <= 0.0) continue;

        float shadow = 1.0;
        if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5) {
            float s = 1.0;
${e?`
            bool useStochasticShadows = (uAreaLights > 0.5);
            if (useStochasticShadows) {
                 float samplingSeed = fract(stochasticSeed + float(i) * 1.618);

                 vec3 u, v;
                 buildTangentBasis(l, u, v);

                 float r_jitter = sqrt(samplingSeed);
                 float theta = samplingSeed * TAU * 1.618033;
                 float spread = 2.0 / max(uShadowSoftness, 0.1);

                 vec3 offset = (u * cos(theta) + v * sin(theta)) * r_jitter * spread;

                 vec3 jitteredLDir = normalize(l + offset);
                 float jitteredDist = distToLight;

                 if (!isDirectional) {
                      vec3 jitteredTarget = uLightPos[i] + offset * distToLight;
                      vec3 jVec = jitteredTarget - p;
                      jitteredDist = length(jVec);
                      jitteredLDir = jVec / jitteredDist;
                 }

                 s = GetHardShadow(shadowRo, jitteredLDir, jitteredDist);
            } else {
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
            }
`:`
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
`}
            shadow = mix(1.0, s, uShadowIntensity);
        }

        // Branchless attenuation: CPU packs coefficients into uLightFalloff (d² term) and uLightFalloffType (d term)
        // Quadratic: (k, 0) → 1/(1+k·d²)   Linear: (0, k) → 1/(1+k·d)   InvSq: (k_from_range, 0)
        float att = 1.0;
        if (!isDirectional && (uLightFalloff[i] + uLightFalloffType[i]) > 0.001) {
            float d2 = distToLight * distToLight;
            att = 1.0 / (1.0 + uLightFalloff[i] * d2 + uLightFalloffType[i] * distToLight);
        }

        vec3 radiance = uLightColor[i] * intensity * att * shadow;
`,Ia=`
    }

    return Lo;
}
`,Zi=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${Fa(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Ia}
`,Qi=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${Fa(e)}
        vec3 F0 = mix(vec3(0.04), albedo, metallic);
        float NdotV = max(0.001, dot(n, v));

        vec3 h = normalize(l + v);
        float HdotV = max(0.0, dot(h, v));
        float NdotH = max(0.0, dot(n, h));

        // Fresnel (Schlick)
        vec3 F = fresnelSchlick(HdotV, F0);

        // Distribution (GGX / Trowbridge-Reitz)
        float a = roughness * roughness;
        float a2 = a * a;
        float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
        float D = a2 / (PI * denom * denom + GGX_EPSILON);

        // Geometry (Smith-GGX)
        float kG = a * 0.5;
        float G1V = NdotV / (NdotV * (1.0 - kG) + kG);
        float G1L = NdotL / (NdotL * (1.0 - kG) + kG);
        float G = G1V * G1L;

        // Cook-Torrance specular BRDF
        vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + GGX_EPSILON);

        // Energy Conservation
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Ia}
`,Pa=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,Ki=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,ea=Pa+Ki,Ji=`
#ifdef LIGHT_SPHERES
vec3 intersectLightSphere(vec3 ro, vec3 rd, float radiusJitter) {
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightIntensity[i] < 0.01 || uLightType[i] > 0.5 || uLightRadius[i] < 0.001) continue;

        vec3 oc = ro - uLightPos[i];
        float distSq = dot(oc, oc);
        float r = uLightRadius[i] * (1.0 + radiusJitter);
        float soft = uLightSoftness[i];

        // Halo: soft > 1 extends test radius beyond sphere
        float testR = r * max(1.0, soft);

        // Inside sphere: tint view
        if (distSq < testR * testR) {
            float dist = sqrt(distSq);
            float fade = 1.0 - dist / testR;
            fade = fade * fade * (3.0 - 2.0 * fade);
            if (fade > 0.001) return vec3(fade, float(i), 1.0);
        }

        // Ray-sphere intersection — chord-based thickness for volumetric look
        float b = dot(rd, oc);
        if (-b < 0.001) continue;

        float c = distSq - testR * testR;
        float disc = b * b - c;
        if (disc > 0.0) {
            // thickness: 0 at edge, 1 at center — gives natural 3D sphere falloff
            float thickness = sqrt(disc) / testR;

            // soft 0: solid orb, sharp edge (low exponent flattens brightness)
            // soft 1: gentle gradient, center-to-edge
            // soft 2: concentrated core, extended glow
            float fade = pow(thickness, 0.15 + soft * 1.4);

            // Energy conservation: as halo expands beyond r, dim proportionally
            // so it reads as "softer" not "bigger". r/testR = 1 when soft<=1.
            fade *= min(1.0, r / testR);

            if (fade > 0.001) return vec3(fade, float(i), 0.0);
        }
    }
    return vec3(0.0, -1.0, 0.0);
}
#endif
`,er=`
#ifdef LIGHT_SPHERES
{
    vec3 _lsHit = intersectLightSphere(ro, rd, 0.0);
    if (_lsHit.x > 0.0) {
        int _li = int(_lsHit.y);
        vec3 _lc = uLightColor[_li] * uLightIntensity[_li];
        env = mix(env, _lc, _lsHit.x);
    }
}
#endif
`,tr=()=>`
#ifdef LIGHT_SPHERES
void compositeLightSpheres(vec3 ro, vec3 rd, inout vec3 col, inout float d, bool hit, float seed) {
    // Stochastic radius jitter: +-2% per frame, accumulation averages into smooth AA edges.
    // Disabled during navigation (uBlendFactor >= 0.99) for a clean image.
    float radiusJitter = uBlendFactor >= 0.99 ? 0.0 : (fract(seed * 91.3) - 0.5) * 0.04;

    vec3 lsHit = intersectLightSphere(ro, rd, radiusJitter);
    if (lsHit.x > 0.001) {
        int li = int(lsHit.y);
        vec3 lc = uLightColor[li] * uLightIntensity[li];

        if (lsHit.z > 0.5) {
            // Inside sphere: tint the entire view like a glowing fog volume
            col = mix(col, lc, lsHit.x * 0.6);
        } else {
            // Outside: depth-test against fractal surface
            vec3 oc = ro - uLightPos[li];
            float b = dot(rd, oc);
            float r = uLightRadius[li] * (1.0 + radiusJitter);
            float disc = r * r - (dot(oc, oc) - b * b);
            float lightD = disc > 0.0 ? max(0.001, -b - sqrt(disc)) : max(0.001, -b);

            if (!hit || lightD < d) {
                col = mix(col, lc, lsHit.x);
                d = lightD;
            }
        }
    }
}
#endif
`,ar=(e,a,t=!0)=>`
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cosineSampleHemisphere(vec3 n, vec2 seedVec) {
    float r = fract(seedVec.x * phi);
    float angle = seedVec.y * TAU;
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 t, b;
    buildTangentBasis(n, t, b);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(t * p.x + b * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * phi),
        fract(seedVec.y * phi + 0.5)
    );
    float a = roughness * roughness;
    float azimuth = TAU * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(azimuth) * sinTheta, sin(azimuth) * sinTheta, cosTheta);
    vec3 t, b;
    buildTangentBasis(n, t, b);
    return normalize(t * h.x + b * h.y + n * h.z);
}

vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
    vec3 radiance = vec3(0.0);
    vec3 throughput = vec3(1.0);
    vec3 currentRo = ro;
    vec3 currentRd = rd;
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    int maxBounces = uPTBounces;
    float pixelSizeScale = uPixelSizeBase / uInternalScale;

    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${e?"2":"maxBounces"}) break;

        // Coprime decorrelation: irrational constants shift the blue noise texture lookup by a different
        // amount each bounce, ensuring samples from different bounces land on uncorrelated texels.
        // 17.123 and 23.456 are mutually irrational (no integer ratio) — same principle as Halton sequences.
        // 7.31 / 11.17 used for secondary env noise lookup below (also mutually irrational).
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            vec3 env = sampleMiss(currentRo, currentRd, 0.0) * skyIntensity;
            if (bounce == 0 && uFogFar < 1000.0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                env = mix(env, uFogColorLinear, fogFactor * 0.5);
            }
            radiance += env * throughput;
            break;
        }

        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);

        float ao = 1.0;
        if (uAOIntensity > 0.01 && bounce == 0) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }

        if (bounce == 0 && uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += vec3(0.5, 0.7, 1.0) * rimFactor;
        }

        roughness = max(roughness, 0.04);  // Minimum roughness — prevents NaN in GGX distribution denominator
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;

        // --- Shared state for NEE and bounce selection ---
        vec3 viewDir = -currentRd;
        float NdotV = max(0.001, dot(n, viewDir));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);  // 0.04 = standard dielectric F0 (4% reflectance at normal incidence)
        vec3 F_surface = fresnelSchlick(NdotV, F0);

        // Schlick-GGX geometry term parameters (shared by NEE and IS weight)
        float a_ggx = roughness * roughness;
        float kG = a_ggx * 0.5;

        // --- NEXT EVENT ESTIMATION ---
        // Active light list — hoisted so PT_VOLUMETRIC can reuse it
        int activeCount = 0;
        int activeIndices[3];
        if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
        if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
        if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;

        // Bias epsilon — hoisted so PT_ENV_NEE can reuse it
        // Use camera-to-point distance for pixel footprint (not bounce travel distance).
        // Bounce rays that hit nearby geometry have small d, which would collapse the bias
        // and cause self-intersection on the next bounce. p_ray is in camera-local space,
        // so length(p_ray) gives the true camera distance for correct pixel footprint scaling.
        float cameraDist = length(p_ray);
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
        float orthoPixelFootprintNEE = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist;
        float visualLimitNEE = orthoPixelFootprintNEE * (1.0 / uDetail);
        float biasEps = max(floatLimitNEE, visualLimitNEE);

        if (activeCount > 0) {
            float lightSeed = blueNoise.r;
            int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);

            // PT_NEE_ALL_LIGHTS: evaluate every active light per bounce.
            // Default: sample one random light with PDF compensation (unbiased, faster).
            int neeCount = 1;
            #ifdef PT_NEE_ALL_LIGHTS
                neeCount = activeCount;
            #endif

            for (int nee_i = 0; nee_i < 3; nee_i++) {
                if (nee_i >= neeCount) break;

                int lightIdx;
                #ifdef PT_NEE_ALL_LIGHTS
                    lightIdx = activeIndices[nee_i];
                #else
                    lightIdx = activeIndices[pick];
                #endif

                bool isDirectional = uLightType[lightIdx] > 0.5;
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);

                vec3 lVec;
                float distToLight;
                if (isDirectional) {
                    lVec = uLightDir[lightIdx]; // Already "toward light" from uniform manager
                    distToLight = DIR_LIGHT_DIST;
                } else {
                    lVec = uLightPos[lightIdx] - p_ray;
                    distToLight = length(lVec);
                }

                vec3 lDir = isDirectional ? normalize(lVec) : lVec / max(1.0e-5, distToLight);

                float shadow = 1.0;
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    ${!t||e?`
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    `:`
        if (uAreaLights > 0.5) {
            vec2 jitter = blueNoise.gb;
            vec3 sT, sB;
            buildTangentBasis(lDir, sT, sB);

            float spread = 2.0 / max(uShadowSoftness, 0.1);
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * TAU;

            vec3 offsetDir = sT * cos(theta) * r + sB * sin(theta) * r;
            vec3 shadowDir = normalize(lDir + offsetDir);
            float shadowDist = distToLight;

            if (!isDirectional) {
                 float radius = spread * distToLight;
                 vec3 jitterOffset = (sT * cos(theta) + sB * sin(theta)) * sqrt(jitter.x) * radius;
                 vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                 vec3 tVec = targetPos - p_ray;
                 shadowDist = length(tVec);
                 shadowDir = tVec / max(1.0e-5, shadowDist);
            }

            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
        }
    `}
                    shadow = mix(1.0, shadow, uShadowIntensity);
                }

                if (shadow > 0.01) {
                    vec3 h = normalize(lDir + viewDir);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, viewDir));
                    float ndoth = max(0.0, dot(n, h));

                    // Branchless attenuation (see pbr.ts LOOP_OPEN)
                    float att = 1.0;
                    if (!isDirectional && (uLightFalloff[lightIdx] + uLightFalloffType[lightIdx]) > 0.001) {
                        float d2_att = distToLight * distToLight;
                        att = 1.0 / (1.0 + uLightFalloff[lightIdx] * d2_att + uLightFalloffType[lightIdx] * distToLight);
                    }

                    vec3 F_nee = fresnelSchlick(hdotv, F0);

                    // GGX Cook-Torrance specular (Schlick-GGX geometry, matches pbr.ts)
                    float ndotl_s = max(0.001, ndotl);
                    float a2_nee = a_ggx * a_ggx;
                    float denom_nee = ndoth * ndoth * (a2_nee - 1.0) + 1.0;
                    float D_nee = a2_nee / (PI * denom_nee * denom_nee + GGX_EPSILON);
                    float G1V_nee = NdotV / (NdotV * (1.0 - kG) + kG);
                    float G1L_nee = ndotl_s / (ndotl_s * (1.0 - kG) + kG);
                    float G_nee = G1V_nee * G1L_nee;
                    vec3 spec = (D_nee * F_nee * G_nee) / max(0.001, 4.0 * NdotV * ndotl_s);

                    vec3 kS_nee = F_nee;
                    vec3 kD_nee = (vec3(1.0) - kS_nee) * (1.0 - uReflection);

                    // PDF: 1 when sampling all lights, activeCount when sampling 1 randomly
                    float pdf;
                    #ifdef PT_NEE_ALL_LIGHTS
                        pdf = 1.0;
                    #else
                        pdf = float(activeCount);
                    #endif

                    vec3 directContrib = (kD_nee * albedo * uDiffuse / PI + spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx] * ndotl * shadow * att * ao * pdf;

                    // Firefly clamp: suppress outlier samples (runtime, raise uPTMaxLuminance to disable)
                    float dcLum = luminance(directContrib);
                    directContrib *= min(1.0, uPTMaxLuminance / max(dcLum, 0.001));

                    radiance += directContrib * throughput;
                }
            }
        } // End NEE

        // --- ENVIRONMENT NEE (compile switch) ---
        // Directly samples the env map as a diffuse light source each bounce.
        // Eliminates the need for a bounce to "accidentally" escape to sky.
        #ifdef PT_ENV_NEE
        if (uEnvStrength > 0.001) {
            vec4 envNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(7.31, 11.17));
            vec3 envDir = cosineSampleHemisphere(n, envNoise.rg);
            float envNdotL = max(0.0, dot(n, envDir));
            if (envNdotL > 0.001) {
                vec3 envOrigin = p_ray + n * (biasEps * 2.0);
                float envD; vec4 envResult; vec3 envGlow = vec3(0.0); float envVol = 0.0; vec3 envScatter = vec3(0.0);
                bool envHit = traceSceneLean(envOrigin, envDir, envD, envResult, envGlow, seed + float(bounce) * 5.31, envVol, envScatter);
                if (!envHit) {
                    // Cosine-weighted PDF = NdotL/PI cancels with Lambertian BRDF = kD*albedo/PI
                    // → weight = kD * albedo (clean, no NdotL needed)
                    vec3 envF = fresnelSchlick(envNdotL, F0);
                    vec3 envKD = (vec3(1.0) - envF) * (1.0 - uReflection);
                    vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    radiance += envKD * albedo * uDiffuse * envColor * throughput;
                }
            }
        }
        #endif

        // --- BOUNCE DIRECTION SELECTION ---
        vec3 kS = F_surface;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse;
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness;
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);  // Bias smooth surfaces toward specular bounces
        probSpec = clamp(probSpec, 0.05, 0.95);  // Ensure both bounce types always have non-zero probability
        float randType = fract(blueNoise.a * 1.618);  // Golden ratio decorrelation for bounce type selection
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            vec3 H = importanceSampleGGX(n, roughness, dirSeed);
            vec3 newDir = reflect(currentRd, H);
            // GGX IS weight: BRDF/PDF ≈ F * G * HdotV / (NdotV * NdotH)
            float HdotV_sp = max(0.001, dot(H, -currentRd));
            float NdotH_sp = max(0.001, dot(n, H));
            float NdotL_sp = max(0.001, dot(n, newDir));
            float NdotV_sp = max(0.001, NdotV);
            // Schlick-GGX geometry (matches NEE and pbr.ts)
            float G1L_sp = NdotL_sp / (NdotL_sp * (1.0 - kG) + kG);
            float G1V_sp = NdotV_sp / (NdotV_sp * (1.0 - kG) + kG);
            currentRd = newDir;
            throughput *= F_surface * G1L_sp * G1V_sp * HdotV_sp / (NdotV_sp * NdotH_sp) / probSpec;
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed);
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            throughput *= weightDiff / (1.0 - probSpec);
        }

        throughput *= uPTGIStrength;
        currentRo = p_ray + n * (biasEps * 2.0);
        float bounceVol = 0.0;
        vec3 bounceGlow = vec3(0.0);
        vec3 bounceScatter = vec3(0.0);
        hit = traceSceneLean(currentRo, currentRd, d, result, bounceGlow, seed + float(bounce), bounceVol, bounceScatter);

        // Absorption-only fog on bounce paths (Beer-Lambert with actual march distance).
        // Primary-ray scatter (god rays) is accumulated in traceScene on the camera ray.
        if (uFogDensity > 0.001) {
            float trans = exp(-uFogDensity * d);
            radiance += uFogColorLinear * (1.0 - trans) * throughput;
            throughput *= trans;
        }

        // Russian roulette termination (decorrelated from bounce type selection)
        // Start after bounce 2 to guarantee primary + 1st indirect are always evaluated
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) {  // Below 5% contribution — candidate for termination
                // Use a separate noise sample for termination to avoid correlation with randType
                float rrRand = fract(blueNoise.r * 1.618 + 0.7);  // 1.618 = golden ratio decorrelation
                float survivalProb = maxThroughput * 10.0;  // Scale: 5% throughput → 50% survival
                if (rrRand > survivalProb) break;
                throughput /= survivalProb;  // Energy-conserving boost for surviving paths
            }
        }
        throughput = min(throughput, vec3(4.0));  // Firefly suppression clamp
    }
    return radiance;
}
`;function ta(e){let a=!1;const t=e.map(o=>o.id?o:(a=!0,{...o,id:Le()}));return a?t:e}const Jn=(e,a)=>!e||!e.lights||a>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[a],or=[{id:Le(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#fff4e6",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:5500},{id:Le(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:3500},{id:Le(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:7500}],ir={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:ie.LightCount,type:"int",default:0},{name:ie.LightType,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightPos,type:"vec3",arraySize:X,default:new Array(X).fill(new k)},{name:ie.LightDir,type:"vec3",arraySize:X,default:new Array(X).fill(new k(0,-1,0))},{name:ie.LightColor,type:"vec3",arraySize:X,default:new Array(X).fill(new ce(1,1,1))},{name:ie.LightIntensity,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightShadows,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightFalloff,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightFalloffType,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightRadius,type:"float",arraySize:X,default:new Float32Array(X).fill(0)},{name:ie.LightSoftness,type:"float",arraySize:X,default:new Float32Array(X).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Softness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Prevents surface acne."},lights:{type:"complex",default:or,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,a,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",X.toString());const o=a.lighting;if(o&&!o.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
                 vec3 p = ro + rd * d;
                 vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
                 float eps = max(d * 0.001, 1e-6);
                 vec2 e = vec2(eps, 0.0);
                 vec3 n = normalize(vec3(
                     DE_Dist(p + e.xyy),
                     DE_Dist(p + e.yxy),
                     DE_Dist(p + e.yyx)
                 ));

                 // Layer 1 gradient color (same as full shader)
                 float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
                 float t1Raw = val1 * uColorScale + uColorOffset;
                 float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
                 vec3 albedo = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;

                 // Simple N·L + ambient
                 float NdotL = max(dot(n, normalize(vec3(-0.5, 1.0, 0.8))), 0.0);
                 float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.08;
                 float light = 0.03 + NdotL * 0.3 + rim;
                 return albedo * light;
             }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
                 return calculateShading(ro, rd, d_init, result_init, seed);
             }
             `);return}const i=(o==null?void 0:o.shadowsCompile)!==!1,r=(o==null?void 0:o.shadowAlgorithm)??0,n=r===2?3:r===1?1:2;e.addPostDEFunction(Yi(i,n)),!i&&!(o!=null&&o.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(o==null?void 0:o.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),o!=null&&o.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),o!=null&&o.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const s=(o==null?void 0:o.ptStochasticShadows)===!0&&i,l=a.renderMode==="PathTracing"||(o==null?void 0:o.renderMode)===1,d=a.quality,f=(d==null?void 0:d.precisionMode)===1;if(l)e.addIntegrator(ea),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(ar(f,X,s));else{const p=(o==null?void 0:o.specularModel)===1;e.addIntegrator(p?ea:Pa),e.setRenderMode("Direct"),e.addIntegrator(p?Qi(s):Zi(s)),e.requestShading()}},actions:{updateLight:(e,a)=>{const{index:t,params:o}=a;if(!e.lights||t>=e.lights.length)return{};const i=[...e.lights];return i[t]={...i[t],...o},{lights:i}},addLight:e=>{if(e.lights.length>=X)return{};const a={id:Le(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,a]}},removeLight:(e,a)=>{if(a<0||a>=e.lights.length)return{};const t=[...e.lights];return t.splice(a,1),{lights:t}},duplicateLight:(e,a)=>{if(a<0||a>=e.lights.length||e.lights.length>=X)return{};const t={...e.lights[a],id:Le()},o=[...e.lights];return o.splice(a+1,0,t),{lights:o}}}},rr={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,a,t)=>{if(t!=="Main")return;const o=a.lightSpheres;!o||o.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(Ji),e.addIntegrator(tr()),e.addMissLogic(er),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},nr={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},sr={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},lr={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},cr={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new ce("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,a)=>({shapes:[...e.shapes||[],a]}),removeDrawnShape:(e,a)=>({shapes:(e.shapes||[]).filter(t=>t.id!==a)}),updateDrawnShape:(e,a)=>({shapes:(e.shapes||[]).map(t=>t.id===a.id?{...t,...a.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},aa=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],dr={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,a)=>{const t=aa[e.rules.length%aa.length],o={id:ze(),target:a.target,source:a.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,o],selectedRuleId:o.id}},removeModulation:(e,a)=>({rules:e.rules.filter(t=>t.id!==a),selectedRuleId:e.selectedRuleId===a?null:e.selectedRuleId}),updateModulation:(e,a)=>({rules:e.rules.map(t=>t.id===a.id?{...t,...a.update}:t)}),selectModulation:(e,a)=>({selectedRuleId:a})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},fr={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},pr={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},ur={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},mr={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,a)=>{const{mode:t,actions:o}=a,i=ur[t];return i?(Object.entries(i).forEach(([r,n])=>{const s=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,l=o[s];typeof l=="function"&&l(n)}),{}):{}}}},hr=(e,a,t=32)=>{if(!e)return`
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;let o="";return a&&(o=`
        vec3 getCosHemisphereDir(vec3 n, vec2 seedVec) {
            // Use provided vector (Blue Noise Green/Alpha) instead of calculating hash
            vec2 r = seedVec;
            
            float sign = n.z >= 0.0 ? 1.0 : -1.0;
            float a = -1.0 / (sign + n.z);
            float b = n.x * n.y * a;
            vec3 tangent = vec3(1.0 + sign * n.x * n.x * a, sign * b, -sign * n.x);
            vec3 bitangent = vec3(b, sign + n.y * n.y * a, -n.y);
            
            float ra = sqrt(r.y);
            float rx = ra * cos(6.2831 * r.x);
            float ry = ra * sin(6.2831 * r.x);
            float rz = sqrt(1.0 - r.y);
            return normalize(rx * tangent + ry * bitangent + rz * n);
        }`),`
// ------------------------------------------------------------------
// AMBIENT OCCLUSION (Modular Feature)
// ------------------------------------------------------------------

${o}

float GetAO(vec3 p_ray, vec3 n, float seed) {
    if (uAOIntensity < 0.001) return 1.0;

    float occ = 0.0;
    float weight = 1.0;
    float spread = max(uAOSpread, 0.001);
    
    bool isMoving = uBlendFactor >= 0.99;
    bool isStochastic = uAOMode > 0.5;
    
    // Sample Blue Noise Texture
    vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
    
    // Green channel for standard jitter
    float jitter = blueNoise.g;
    
    #if defined(RENDER_MODE_PATHTRACING)
        jitter = fract(seed * 13.5 + blueNoise.g);
    #endif

    vec3 dir = n;
    bool useRandomDir = isStochastic;
    
    #if !defined(RENDER_MODE_PATHTRACING)
        if (isMoving) useRandomDir = false;
    #endif

    #if ${a?1:0}
        if (useRandomDir) {
            // Use Green and Alpha channels for 2D direction sampling
            dir = getCosHemisphereDir(n, blueNoise.ga);
        } else if (isStochastic) {
            // Stochastic enabled but camera moving (non-PT): use blue noise for stable bias
            dir = normalize(mix(n, getCosHemisphereDir(n, blueNoise.ga), 0.5));
        }
    #endif
    
    vec3 p_bias = p_ray;
    float totalWeight = 0.0;
    int limit = uAOSamples;
    float jitterBias = isMoving ? 0.0 : jitter * 0.1 * spread;

    // Use dynamic limit injected from DDFS
    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = (0.1 + 0.125 * float(i)) * spread + jitterBias;
        
        vec3 aopos = p_bias + dir * h;
        
        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float d = DE_Dist(aopos);
        
        if (d < h) {
            float diff = h - d;
            occ += diff * weight;
        }
        
        totalWeight += h * weight;
        weight *= 0.8; 
    }
    
    occ /= (totalWeight + 0.0001);
    
    return clamp(1.0 - (occ * uAOIntensity * 2.5), 0.0, 1.0);
}
`},gr={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new ce(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,a,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const o=a.ao,i=(o==null?void 0:o.aoEnabled)!==!1,r=(o==null?void 0:o.aoStochasticCp)!==!1,n=(o==null?void 0:o.aoMaxSamples)||32;e.addPostDEFunction(hr(i,r,n))}},yr=()=>`
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here

    // Dynamic loop
    int limit = uReflSteps;

    for(int i=0; i<256; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float d = DE_Dist(ro + rd * t);

        if(d < REFL_HIT_THRESHOLD * t) {
            // HIT: Retreat by half the last step to refine surface position.
            // Reduces orbit-trap noise at glancing angles where the hit threshold is loose.
            float refinedT = t - d * 0.5;
            vec4 fullRes = DE(ro + rd * refinedT);
            return vec4(refinedT, fullRes.yzw);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `,oa=0,at=1,Pe=3,br=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,xr=`
    // --- REFLECTIONS: RAYMARCHED ---
    {
        // Adaptive bias: scales with pixel size at camera distance to avoid self-intersection.
        // Use camera distance (length(p_ray)) not ray travel distance (d) — for reflected
        // hits near the surface, d can be tiny, collapsing the bias and causing self-intersection.
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float cameraDist_refl = length(p_ray);
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist_refl;
        float reflBias = max(reflPixelFootprint * 2.0, length(p_fractal) * PRECISION_RATIO_HIGH * 2.0);
        vec3 currRo = p_ray + n * reflBias;
        vec3 currRd = reflDir;

        // Jitter first bounce based on roughness using Blue Noise
        bool isMoving = uBlendFactor >= 0.99;
        if (roughness > 0.05 && !isMoving) {
             vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
             vec3 randomVec = vec3(blueNoise.b, blueNoise.a, blueNoise.r) * 2.0 - 1.0;

             if (dot(randomVec, randomVec) > 0.001) {
                 vec3 jittered = normalize(currRd + normalize(randomVec) * (roughness * 0.8));
                 if (dot(jittered, n) > 0.05) currRd = jittered;
             }
        }

        vec3 currentThroughput = F * uSpecular;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            vec4 refHit = traceReflectionRay(currRo, currRd);

            if (refHit.x > 0.0) {
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

                vec3 r_albedo, r_n, r_emission;
                float r_rough;

                // Use camera-to-reflected-point distance for normal epsilon, not reflection ray travel distance.
                // p_next is in camera-local space, so length(p_next) = camera distance.
                float reflCameraDist = length(p_next);
                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), reflCameraDist, r_albedo, r_n, r_emission, r_rough, false);

                if (dot(r_n, -currRd) < 0.0) r_n = -r_n;

                vec3 hitColor = r_emission;
                #ifdef REFL_BOUNCE_SHADOWS
                    // Always compute shadows when enabled — avoids brightness pop
                    // between navigation (no shadows) and accumulation (shadows).
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, true);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                reflectionLighting += hitColor * currentThroughput;

            } else {
                reflectionLighting += sampleMissEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);
    }
`,vr={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:at,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:oa,estCompileMs:0},{label:"Environment Map",value:at,estCompileMs:0},{label:"Raymarched (Quality)",value:Pe,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:Pe},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:Pe},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:Pe},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:Pe}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:Pe}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,a,t)=>{if(t!=="Main")return;const o=a.reflections;if(!o||o.enabled===!1)return;const i=o.reflectionMode??at;if(i!==oa){if(i!==Pe){e.addShadingLogic(br);return}if(i===Pe){e.addPostDEFunction(yr());const r=Math.max(1,Math.min(3,o.bounces??1));e.addDefine("MAX_REFL_BOUNCES",r.toString()),o.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(xr)}}}},Sr=`
// --- WATER PLANE LOGIC ---

// Helper: Multi-octave wave function
float getWaterHeight(vec3 p, float t, float freq, float strength) {
    if (strength <= 0.001) return 0.0;
    
    float h = 0.0;
    vec3 q = p * freq;
    
    // Layer 1: Rolling Swell (Sine based for mass)
    float wave1 = sin(q.x * 1.0 + t) * cos(q.z * 0.8 + t * 0.8);
    h += wave1 * 0.5;
    
    // Layer 2: Organic Surface (Simplex Noise)
    // Moving opposing direction for turbulence
    vec3 nP = q * 2.5 + vec3(t * 0.5, 0.0, -t * 0.5);
    float noise = snoise(nP);
    h += noise * 0.3;
    
    // Layer 3: Fine Choppiness
    vec3 nP2 = q * 6.0 + vec3(-t, 0.0, t * 0.2);
    h += snoise(nP2) * 0.1;

    return h * strength;
}

// Returns distance to water. 
// Uses Lipschitz bound (0.6) to prevent overstepping on steep waves, 
// ensuring shadows and AO resolve correctly.
float mapWater(vec3 p) {
    if (uWaterActive < 0.5) return 1e10;
    
    float level = uWaterHeight;
    float disp = 0.0;
    
    // Only calculate noise close to the plane to save performance
    // Bounding box check: if |y - level| > max_wave_height, return simple plane
    float distPlane = p.y - level;
    
    if (uWaterWaveStrength > 0.001) {
        // Optimization: If far away, treat as flat plane
        if (abs(distPlane) < uWaterWaveStrength * 2.0) {
            float t = uTime * uWaterWaveSpeed;
            disp = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
        }
    }
    
    // SDF = Vertical distance - Displacement
    // Multiply by 0.6 to stabilize raymarching against the steep gradients of the waves
    return (distPlane - disp) * 0.6;
}

// Override material if water is hit
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {
    if (uWaterActive > 0.5) {
        
        // 1. Recalculate Normal via Finite Difference
        // This ensures the reflection/specular matches the wave geometry perfectly
        if (uWaterWaveStrength > 0.001) {
             float t = uTime * uWaterWaveSpeed;
             float eps = 0.05; // Sampling delta
             
             // Sample height at 3 points
             float h0 = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
             float hx = getWaterHeight(p + vec3(eps, 0.0, 0.0), t, uWaterWaveFreq, uWaterWaveStrength);
             float hz = getWaterHeight(p + vec3(0.0, 0.0, eps), t, uWaterWaveFreq, uWaterWaveStrength);
             
             // Construct tangent vectors
             vec3 v1 = vec3(eps, hx - h0, 0.0);
             vec3 v2 = vec3(0.0, hz - h0, eps);
             
             // N = v2 x v1 (Cross product for Up-facing normal)
             normal = normalize(cross(v2, v1));
        } else {
             normal = vec3(0.0, 1.0, 0.0);
        }
        
        // 2. Physics Material
        albedo = uWaterColor;
        roughness = uWaterRoughness;
        
        // 3. Fake Depth Absorption (Fresnel darken)
        // Darken albedo when looking straight down (deep water)
        // Lighten at grazing angles
        float viewAngle = max(0.0, dot(normal, normalize(uCameraPosition - p)));
        albedo *= mix(0.4, 1.0, 1.0 - viewAngle);
    }
}
`,zr=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,wr=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,_r=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,Mr={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new ce("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,a,t)=>{const o=a.waterPlane;o&&o.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(Sr),e.addPostMapCode(zr),e.addPostDistCode(wr),e.addMaterialLogic(_r))}},Cr={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},Fr=`
#ifdef PT_VOLUMETRIC
{
    bool _hasDensity = uVolDensity > 0.001;
    bool _hasEmissive = uVolEmissive > 0.001;
    if (uVolEnabled > 0.5 && (_hasDensity || _hasEmissive)) {
        // Spatial stochastic gate: P=0.125
        // uVolStepJitter blends between fixed seed (persistent slicing) and temporal seed (smooth accumulation)
        float _volSeed = mix(0.5, stochasticSeed, uVolStepJitter);
        if (fract(_volSeed * 7.43 + d * 1.0) < 0.125) {
            float _sigma = uVolDensity;

            // Height fog: modulate density by Y distance from origin
            if (uVolHeightFalloff > 0.001) {
                float _yWorld = (p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow).y;
                _sigma *= exp(-uVolHeightFalloff * abs(_yWorld - uVolHeightOrigin));
            }

            float _sigmaEff = max(_sigma, 0.001);
            // Beer-Lambert transmittance from camera to this scatter point
            float _trans = exp(-_sigmaEff * d);
            if (_trans > 0.001) {
                float _seg = 8.0;

                // --- DENSITY SCATTER (shadow rays — expensive) ---
                if (_hasDensity && _sigma > 0.001) {
                    float _jScale = min(h.x * 0.2, 0.35);
                    vec3 _jDir = normalize(vec3(
                        fract(stochasticSeed * 127.1 + d * 31.7) * 2.0 - 1.0,
                        fract(stochasticSeed *  37.3 + d * 47.1) * 2.0 - 1.0,
                        fract(stochasticSeed *  73.7 + d * 13.3) * 2.0 - 1.0
                    ));
                    int _volLightMax = int(uVolMaxLights);
                    for (int _li = 0; _li < MAX_LIGHTS; _li++) {
                        if (_li >= uLightCount || _li >= _volLightMax) break;
                        if (uLightIntensity[_li] < 0.01) continue;
                        bool _dir = uLightType[_li] > 0.5;
                        vec3  _lv  = _dir ? uLightDir[_li] : (uLightPos[_li] - p);
                        float _ld  = _dir ? 10000.0 : length(_lv);
                        if (!_dir && _ld < 0.001) continue;
                        vec3 _l = _dir ? normalize(_lv) : (_lv / _ld);
                        float _att = 1.0;
                        if (!_dir && uLightFalloff[_li] > 0.001) {
                            _att = uLightFalloffType[_li] < 0.5
                                ? 1.0 / (1.0 + uLightFalloff[_li] * _ld * _ld)
                                : 1.0 / (1.0 + uLightFalloff[_li] * _ld);
                        }
                        if (uLightIntensity[_li] * _att * _sigma * _trans * _seg < 1e-5) continue;
                        vec3 _l_shadow = normalize(_l + _jDir * _jScale);
                        float _sh = GetHardShadow(p + _l_shadow * max(h.x * 2.0, 0.01), _l_shadow, _ld);
                        if (_sh < 0.01) continue;
                        // Henyey-Greenstein phase
                        float _cosT  = dot(rd, -_l);
                        float _g     = uVolAnisotropy;
                        float _hgD   = max(0.0001, 1.0 + _g*_g - 2.0*_g*_cosT);
                        float _phase = (1.0 - _g*_g) / (4.0 * PI * pow(_hgD, 1.5));
                        accScatter += uLightColor[_li] * uLightIntensity[_li] * _att * _sigma * _phase * _sh * _trans * _seg * uVolScatterTint;
                    }
                }

                // --- SURFACE COLOR SCATTER (orbit trap lookup — cheap, independent) ---
                if (_hasEmissive) {
                    vec3 _pfrac = p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow;
                    float _mapVal = getMappingValue(uColorMode, _pfrac, h, vec3(0.0, 1.0, 0.0), uColorScale);
                    float _distFrac = length(_pfrac);
                    float _t1Raw = _mapVal * uColorScale + uColorOffset + _distFrac * uColorTwist;
                    float _t1 = pow(abs(fract(mod(_t1Raw, 1.0))), uGradientBias);
                    vec3 _emitCol = textureLod0(uGradientTexture, vec2(_t1, 0.5)).rgb;
                    float _emitAtten = 1.0;
                    if (uVolEmissiveFalloff > 0.001) {
                        _emitAtten = exp(-uVolEmissiveFalloff * h.x);
                    }
                    accScatter += _emitCol * uVolEmissive * _sigmaEff * _trans * _seg * _emitAtten * uVolScatterTint;
                }
            }
        }
    }
}
#endif
`,Ir=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,Pr={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new ce(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,a,t)=>{if(t!=="Main")return;const o=a.volumetric;o!=null&&o.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(Fr,""),e.addPostProcessLogic(Ir))}},Rr=()=>{L.register(Wi),L.register(Ti),L.register(Hi),L.register(ir),L.register(rr),L.register(gr),L.register(vr),L.register(oi),L.register(Pr),L.register(di),L.register(Mr),L.register(mi),L.register(pi),L.register($i),L.register(ri),L.register(ni),L.register(fi),L.register(nr),L.register(sr),L.register(Cr),L.register(lr),L.register(cr),L.register(dr),L.register(fr),L.register(pr),L.register(mr)},We=e=>{const a=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return a?{r:parseInt(a[1],16),g:parseInt(a[2],16),b:parseInt(a[3],16)}:null},Tr=(e,a,t)=>(typeof e=="object"&&(a=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(a)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),es=({r:e,g:a,b:t})=>{e/=255,a/=255,t/=255;const o=Math.max(e,a,t),i=Math.min(e,a,t);let r=0,n=0,s=o;const l=o-i;if(n=o===0?0:l/o,o!==i){switch(o){case e:r=(a-t)/l+(a<t?6:0);break;case a:r=(t-e)/l+2;break;case t:r=(e-a)/l+4;break}r/=6}return{h:r*360,s:n*100,v:s*100}},ts=(e,a,t)=>{e/=360,a/=100,t/=100;let o=0,i=0,r=0;const n=Math.floor(e*6),s=e*6-n,l=t*(1-a),d=t*(1-s*a),f=t*(1-(1-s)*a);switch(n%6){case 0:o=t,i=f,r=l;break;case 1:o=d,i=t,r=l;break;case 2:o=l,i=t,r=f;break;case 3:o=l,i=d,r=t;break;case 4:o=f,i=l,r=t;break;case 5:o=t,i=l,r=d;break}return{r:o*255,g:i*255,b:r*255}},Er=(e,a,t)=>({r:e.r+(a.r-e.r)*t,g:e.g+(a.g-e.g)*t,b:e.b+(a.b-e.b)*t}),Ar=(e,a)=>{if(Math.abs(a-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,a)),o=Math.log(.5)/Math.log(t);return Math.pow(e,o)},as=(e,a=1)=>{let t;if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops;else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const o=[...t].sort((r,n)=>r.position-n.position),i=[];for(let r=0;r<o.length;r++){const n=o[r];let s=Math.pow(n.position,1/a);if(s=Math.max(0,Math.min(1,s))*100,i.push(`${n.color} ${s.toFixed(2)}%`),r<o.length-1){const l=o[r+1],d=n.bias??.5;if((n.interpolation||"linear")==="step"){let p=Math.pow(l.position,1/a);p=Math.max(0,Math.min(1,p))*100,i.push(`${n.color} ${p.toFixed(2)}%`),i.push(`${l.color} ${p.toFixed(2)}%`)}else if(Math.abs(d-.5)>.001){const p=n.position+(l.position-n.position)*d;let u=Math.pow(p,1/a)*100;u=Math.max(0,Math.min(100,u)),i.push(`${u.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${i.join(", ")})`},ot=e=>Math.pow(e/255,2.2)*255,it=e=>{const a=e/255;if(a>=.99)return 255;const t=(Math.sqrt(-10127*a*a+13702*a+9)+59*a-3)/(502-486*a);return Math.max(0,t)*255},ia=e=>{const t=new Uint8Array(1024);let o,i="srgb";if(Array.isArray(e))o=e;else if(e&&Array.isArray(e.stops))o=e.stops,i=e.colorSpace||"srgb";else return t;if(o.length===0){for(let s=0;s<256;s++){const l=Math.floor(s/255*255);t[s*4]=l,t[s*4+1]=l,t[s*4+2]=l,t[s*4+3]=255}return t}const r=[...o].sort((s,l)=>s.position-l.position),n=s=>{let l={r:0,g:0,b:0};if(s<=r[0].position)l=We(r[0].color)||{r:0,g:0,b:0};else if(s>=r[r.length-1].position)l=We(r[r.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<r.length-1;d++)if(s>=r[d].position&&s<=r[d+1].position){const f=r[d],p=r[d+1];let u=(s-f.position)/(p.position-f.position);const m=f.bias??.5;Math.abs(m-.5)>.001&&(u=Ar(u,m));const g=f.interpolation||"linear";g==="step"?u=0:(g==="smooth"||g==="cubic")&&(u=u*u*(3-2*u));const v=We(f.color)||{r:0,g:0,b:0},h=We(p.color)||{r:0,g:0,b:0};l=Er(v,h,u);break}return i==="linear"?{r:ot(l.r),g:ot(l.g),b:ot(l.b)}:i==="aces_inverse"?{r:it(l.r),g:it(l.g),b:it(l.b)}:l};for(let s=0;s<256;s++){const l=s/255,d=n(l);t[s*4]=d.r,t[s*4+1]=d.g,t[s*4+2]=d.b,t[s*4+3]=255}return t},Dr=e=>{const a=Math.max(1e3,Math.min(4e4,e))/100;let t,o,i;return a<=66?t=255:(t=a-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),a<=66?(o=a,o=99.4708025861*Math.log(o)-161.1195681661,o=Math.max(0,Math.min(255,o))):(o=a-60,o=288.1221695283*Math.pow(o,-.0755148492),o=Math.max(0,Math.min(255,o))),a>=66?i=255:a<=19?i=0:(i=a-10,i=138.5177312231*Math.log(i)-305.0447927307,i=Math.max(0,Math.min(255,i))),{r:Math.round(t),g:Math.round(o),b:Math.round(i)}},os=e=>{const{r:a,g:t,b:o}=Dr(e);return Tr(a,t,o)},Lr=(e,a)=>{const t={};return Rr(),L.getAll().forEach(i=>{const r={},n={};i.state&&Object.assign(r,i.state),Object.entries(i.params).forEach(([l,d])=>{d.composeFrom?d.composeFrom.forEach(f=>{n[f]=l}):r[l]===void 0&&(r[l]=d.default)}),t[i.id]=r;const s=`set${i.id.charAt(0).toUpperCase()+i.id.slice(1)}`;t[s]=l=>{let d=!1;const f={};e(p=>{const u=p[i.id],m={...l};Object.keys(l).forEach(h=>{const y=i.params[h];if(y){const b=l[h];if(b==null)return;y.type==="vec2"&&!(b instanceof be)&&(m[h]=new be(b.x,b.y)),y.type==="vec3"&&!(b instanceof k)&&(m[h]=new k(b.x,b.y,b.z)),y.type==="color"&&!(b instanceof ce)&&(typeof b=="string"?m[h]=new ce(b):typeof b=="number"?m[h]=new ce(b):typeof b=="object"&&"r"in b&&(m[h]=new ce(b.r,b.g,b.b)))}}),Object.keys(m).forEach(h=>{const y=i.params[h];if(y!=null&&y.onSet){const b=y.onSet(m[h],u);b&&Object.entries(b).forEach(([M,T])=>{l[M]===void 0&&(m[M]=T)})}});const g={...u,...m},v=new Set;return Object.keys(m).forEach(h=>{const y=i.params[h];if(n[h]&&v.add(n[h]),y&&(y.noReset||(d=!0),y.type!=="image"&&(f[i.id]||(f[i.id]={}),f[i.id][h]=g[h]),y.uniform)){const b=g[h];if(y.type==="image"){const M=y.uniform.toLowerCase().includes("env")?"env":"color";b&&typeof b=="string"?(F.emit("texture",{textureType:M,dataUrl:b}),h==="envMapData"&&g.useEnvMap===!1&&(g.useEnvMap=!0,F.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),h==="layer1Data"&&g.active===!1&&(g.active=!0,F.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(F.emit("texture",{textureType:M,dataUrl:null}),h==="envMapData"&&g.useEnvMap===!0&&(g.useEnvMap=!1,F.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),h==="layer1Data"&&g.active===!0&&(g.active=!1,F.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(y.type==="gradient"){const M=ia(b);F.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:M},noReset:!!y.noReset})}else{let M=b;y.type==="boolean"&&(M=b?1:0),y.type==="color"&&!(M instanceof ce)&&(M=new ce(M)),F.emit("uniform",{key:y.uniform,value:M,noReset:!!y.noReset})}}}),v.forEach(h=>{const y=i.params[h];if(y&&y.composeFrom&&y.uniform){const b=y.composeFrom.map(M=>g[M]);if(y.type==="gradient"){const M=g[h];if(M){const T=ia(M);F.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:T},noReset:!!y.noReset}),y.noReset||(d=!0)}}else if(y.type==="vec2"){const M=new be(b[0],b[1]);F.emit("uniform",{key:y.uniform,value:M,noReset:!!y.noReset}),y.noReset||(d=!0)}else if(y.type==="vec3"){const M=new k(b[0],b[1],b[2]);F.emit("uniform",{key:y.uniform,value:M,noReset:!!y.noReset}),y.noReset||(d=!0)}}}),{[i.id]:g}}),Object.keys(f).length>0&&F.emit("config",f),d&&F.emit("reset_accum",void 0)},i.actions&&Object.entries(i.actions).forEach(([l,d])=>{t[l]=f=>{const u=a()[i.id],m=d(u,f);m&&Object.keys(m).length>0&&(e({[i.id]:{...u,...m}}),F.emit("reset_accum",void 0))}})}),t},kr={id:"shadows",label:"Shadows",renderContext:"direct",controlledParams:["lighting.shadowsCompile","lighting.shadowAlgorithm","lighting.ptStochasticShadows"],tiers:[{label:"Off",overrides:{lighting:{shadows:!1,shadowsCompile:!1,ptStochasticShadows:!1}},estCompileMs:0},{label:"Hard",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,ptStochasticShadows:!1}},estCompileMs:500},{label:"Soft",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1}},estCompileMs:3e3},{label:"Full",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0}},estCompileMs:3800}]},Br={id:"reflections",label:"Reflections (Direct)",renderContext:"direct",controlledParams:["reflections.reflectionMode","reflections.bounceShadows","reflections.bounces"],tiers:[{label:"Off",overrides:{reflections:{reflectionMode:0,bounceShadows:!1}},estCompileMs:0},{label:"Env Map",overrides:{reflections:{reflectionMode:1,bounceShadows:!1}},estCompileMs:0},{label:"Raymarched",overrides:{reflections:{reflectionMode:3,bounceShadows:!1,bounces:1}},estCompileMs:7500},{label:"Full",overrides:{reflections:{reflectionMode:3,bounceShadows:!0,bounces:2}},estCompileMs:12e3}]},Or={id:"lighting_quality",label:"Lighting",isAdvanced:!0,controlledParams:["lighting.specularModel","lighting.ptEnabled","lighting.ptNEEAllLights","lighting.ptEnvNEE"],tiers:[{label:"Preview",overrides:{lighting:{advancedLighting:!1,ptEnabled:!1}},estCompileMs:-2500},{label:"Path Traced",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!1,ptEnvNEE:!1}},estCompileMs:1900},{label:"PT + NEE",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!0,ptEnvNEE:!0}},estCompileMs:2500}]},jr={id:"atmosphere_quality",label:"Atmosphere",controlledParams:["atmosphere.glowEnabled","atmosphere.glowQuality","volumetric.ptVolumetric"],tiers:[{label:"Off",overrides:{atmosphere:{glowEnabled:!1},volumetric:{ptVolumetric:!1}},estCompileMs:0},{label:"Fast Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:1},volumetric:{ptVolumetric:!1}},estCompileMs:200},{label:"Color Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!1}},estCompileMs:400},{label:"Volumetric",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!0}},estCompileMs:5900}]},It=[kr,Br,Or,jr],Ge=[{id:"preview",label:"Preview",description:"Instant preview shader — navigate without waiting for compile.",subsystems:{shadows:0,reflections:0,lighting_quality:0,atmosphere_quality:0}},{id:"fastest",label:"Fastest",description:"Path traced lighting with fast glow.",subsystems:{shadows:0,reflections:0,lighting_quality:1,atmosphere_quality:1}},{id:"lite",label:"Lite",description:"Hard shadows, env map reflections, color glow.",subsystems:{shadows:1,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"balanced",label:"Balanced",description:"Soft shadows, env map reflections, color glow.",subsystems:{shadows:2,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"full",label:"Full",description:"Full shadows, raymarched reflections, volumetric.",subsystems:{shadows:3,reflections:3,lighting_quality:1,atmosphere_quality:3}},{id:"ultra",label:"Ultra",description:"Full + PT NEE. Experimental.",isAdvanced:!0,subsystems:{shadows:3,reflections:3,lighting_quality:2,atmosphere_quality:3}}],Nr={activePreset:"balanced",subsystems:{...Ge[3].subsystems},isCustomized:!1};function Vr(e){return Ge.find(a=>a.id===e)}function Hr(e){for(const a of Ge)if(Object.keys(a.subsystems).every(o=>a.subsystems[o]===e[o]))return a.id;return null}function is(e){if(!e.activePreset)return"Custom";const a=Vr(e.activePreset);if(!a)return"Custom";if(!e.isCustomized)return a.label;const t=[];for(const o of It){const i=a.subsystems[o.id],r=e.subsystems[o.id];if(i!==r){const n=o.tiers[r];t.push(`${o.label}=${(n==null?void 0:n.label)??"?"}`)}}return`${a.label} (${t.join(", ")})`}const $r=4200;function rs(e){let a=$r;for(const t of It){const o=e[t.id]??0,i=t.tiers[o];i&&(a+=i.estCompileMs)}return a}let pt=null;function Gr(e){pt=e}function ra(e,a){const t=a(),o={};for(const i of It){const r=e[i.id]??0,n=i.tiers[r];if(n)for(const[s,l]of Object.entries(n.overrides))o[s]||(o[s]={}),Object.assign(o[s],l)}for(const[i,r]of Object.entries(o)){const n=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,s=t[n];typeof s=="function"&&s(r)}}function qr(e){if(!pt)return;const a=pt(e());F.emit(le.CONFIG,a)}const Ur=(e,a)=>({scalability:{...Nr},hardwareProfile:null,applyScalabilityPreset:t=>{const o=Ge.find(i=>i.id===t);o&&(e({scalability:{activePreset:t,subsystems:{...o.subsystems},isCustomized:!1}}),ra(o.subsystems,a))},setSubsystemTier:(t,o)=>{const i=a().scalability,r={...i.subsystems,[t]:o};let n=!1;if(i.activePreset){const l=Ge.find(d=>d.id===i.activePreset);l&&(n=Object.keys(r).some(d=>r[d]!==l.subsystems[d]))}else n=!0;const s=Hr(r);e({scalability:{activePreset:s??i.activePreset,subsystems:r,isCustomized:s?!1:n}}),ra(r,a)},setHardwareProfile:t=>{e({hardwareProfile:t});const i=a().setQuality;typeof i=="function"&&i({compilerHardCap:t.caps.compilerHardCap,precisionMode:t.caps.precisionMode,bufferPrecision:t.caps.bufferPrecision}),qr(a)}});class ut{constructor(a,t=null){C(this,"defaultState");C(this,"dictionary");C(this,"reverseDictCache",new Map);this.defaultState=a,this.dictionary=t}encode(a,t){try{const o=this.getDiff(a,this.defaultState);if(!o||Object.keys(o).length===0)return"";let i=this.quantize(o);if(!i||Object.keys(i).length===0)return"";this.dictionary&&(i=this.applyDictionary(i,this.dictionary,!0));const r=JSON.stringify(i),n=Vt.deflate(r),s=Array.from(n).map(d=>String.fromCharCode(d)).join("");return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(o){return console.error("UrlStateEncoder: Error encoding",o),""}}decode(a){try{if(!a)return null;let t=a.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const o=atob(t),i=new Uint8Array(o.length);for(let s=0;s<o.length;s++)i[s]=o.charCodeAt(s);const r=Vt.inflate(i,{to:"string"});let n=JSON.parse(r);return this.dictionary&&(n=this.applyDictionary(n,this.dictionary,!1)),this.deepMerge({...this.defaultState},n)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(a){if(this.reverseDictCache.has(a))return this.reverseDictCache.get(a);const t={};return Object.keys(a).forEach(o=>{const i=a[o];typeof i=="string"?t[i]=o:t[i._alias]=o}),this.reverseDictCache.set(a,t),t}applyDictionary(a,t,o){if(!a||typeof a!="object"||Array.isArray(a))return a;const i={};if(o)Object.keys(a).forEach(r=>{let n=r,s=null;const l=t[r];l&&(typeof l=="string"?n=l:(n=l._alias,s=l.children));const d=a[r];s&&d&&typeof d=="object"&&!Array.isArray(d)?i[n]=this.applyDictionary(d,s,!0):i[n]=d});else{const r=this.getReverseDict(t);Object.keys(a).forEach(n=>{const s=r[n]||n,l=a[n],d=t[s],f=d&&typeof d=="object"?d.children:null;f&&l&&typeof l=="object"&&!Array.isArray(l)?i[s]=this.applyDictionary(l,f,!1):i[s]=l})}return i}isEqual(a,t){if(a===t)return!0;if(a==null||t==null)return a===t;if(typeof a=="number"&&typeof t=="number")return Math.abs(a-t)<1e-4;if(Array.isArray(a)&&Array.isArray(t))return a.length!==t.length?!1:a.every((o,i)=>this.isEqual(o,t[i]));if(typeof a=="object"&&typeof t=="object"){const o=a,i=t,r=Object.keys(o).filter(s=>!s.startsWith("is")),n=Object.keys(i).filter(s=>!s.startsWith("is"));return r.length!==n.length?!1:r.every(s=>this.isEqual(o[s],i[s]))}return!1}quantize(a){if(typeof a=="string")return a.startsWith("data:image")?void 0:a;if(typeof a=="number")return a===0||Math.abs(a)<1e-9?0:parseFloat(a.toFixed(5));if(Array.isArray(a))return a.map(t=>this.quantize(t));if(a!==null&&typeof a=="object"){const t={};let o=!1;const i=Object.keys(a).filter(r=>!r.startsWith("is"));for(const r of i){const n=this.quantize(a[r]);n!==void 0&&(t[r]=n,o=!0)}return o?t:void 0}return a}getDiff(a,t){if(this.isEqual(a,t))return;if(typeof a!="object"||a===null||typeof t!="object"||t===null||Array.isArray(a))return a;const o={};let i=!1;const r=a,n=t;return Object.keys(r).forEach(s=>{if(s.startsWith("is")||s==="histogramData"||s==="interactionSnapshot"||s==="liveModulations"||s.endsWith("Stack"))return;const l=this.getDiff(r[s],n[s]);l!==void 0&&(o[s]=l,i=!0)}),i?o:void 0}deepMerge(a,t){if(typeof t!="object"||t===null)return t;const o={...a};return Object.keys(t).forEach(i=>{typeof t[i]=="object"&&t[i]!==null&&!Array.isArray(t[i])?o[i]=this.deepMerge(a[i]||{},t[i]):o[i]=t[i]}),o}}const Wr=(e,a)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,zoomLevel:1,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=a();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const o=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:o,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(a().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),Xr=(e,a)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,o)=>e(i=>({selectedTrackIds:o?i.selectedTrackIds.includes(t)?i.selectedTrackIds.filter(r=>r!==t):[...i.selectedTrackIds,t]:[t]})),selectTracks:(t,o)=>e(i=>{const r=new Set(i.selectedTrackIds);return o?t.forEach(n=>r.add(n)):t.forEach(n=>r.delete(n)),{selectedTrackIds:Array.from(r)}}),selectKeyframe:(t,o,i)=>e(r=>{const n=`${t}::${o}`;return{selectedKeyframeIds:i?r.selectedKeyframeIds.includes(n)?r.selectedKeyframeIds.filter(s=>s!==n):[...r.selectedKeyframeIds,n]:[n]}}),selectKeyframes:(t,o)=>e(i=>({selectedKeyframeIds:o?Array.from(new Set([...i.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,o)=>e({softSelectionRadius:t,softSelectionEnabled:o}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,o)=>e({bounceTension:t,bounceFriction:o})});function Ra(e,a,t,o,i){const r=1-e,n=e*e,s=r*r,l=s*r,d=n*e;return l*a+3*s*e*t+3*r*n*o+d*i}function na(e,a){let t=a[0],o=a[a.length-1];for(let f=0;f<a.length-1;f++)if(e>=a[f].frame&&e<a[f+1].frame){t=a[f],o=a[f+1];break}if(e>=o.frame)return o.value;if(e<=t.frame)return t.value;const i=o.frame-t.frame,r=(e-t.frame)/i;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(o.value-t.value)*r;const n=t.value,s=t.value+(t.rightTangent?t.rightTangent.y:0),l=o.value+(o.leftTangent?o.leftTangent.y:0),d=o.value;return Ra(r,n,s,l,d)}function Yr(e,a=1){const t=[],o=e[0].frame,i=e[e.length-1].frame,r=Math.max(a,(i-o)/50);for(let n=o;n<=i;n+=r)t.push({t:n,val:na(n,e)});return t.length>0&&t[t.length-1].t<i&&t.push({t:i,val:na(i,e)}),t}function Zr(e,a,t){let o=0,i=0,r=0,n=0,s=0,l=0,d=0;for(let h=0;h<e.length;h++){const y=e[h].t,b=1-y,M=e[h].val;l+=M,d+=M*M;const T=3*b*b*y,z=3*b*y*y,_=b*b*b*a+y*y*y*t,R=M-_;o+=T*T,i+=T*z,r+=z*z,n+=R*T,s+=R*z}const f=e.length,p=l/f;if(d/f-p*p<1e-9)return null;const m=o*r-i*i;if(Math.abs(m)<1e-9)return null;const g=(r*n-i*s)/m,v=(o*s-i*n)/m;return{h1:g,h2:v}}function Qr(e,a){const t=e.length;if(t<2){const m=e[0].val;return{leftY:m,rightY:m}}const o=e[0].val,i=e[t-1].val,r=i-o,n=o+r*.333,s=o+r*.666,l=Zr(e,o,i);let d=n,f=s;l&&(d=l.h1,f=l.h2);const p=n+(d-n)*a,u=s+(f-s)*a;return{leftY:p,rightY:u}}function mt(e,a,t,o){if(e.length<2)return;const i=e[0],r=e[e.length-1],n=r.t-i.t,s=e.map(u=>({t:(u.t-i.t)/n,val:u.val})),{leftY:l,rightY:d}=Qr(s,o);let f=0,p=-1;if(n<1)f=0;else for(let u=1;u<s.length-1;u++){const m=s[u].t,g=Ra(m,i.val,l,d,r.val),v=Math.abs(g-s[u].val);v>f&&(f=v,p=u)}if(f<=t||e.length<=2){const u=a[a.length-1];u&&(u.rightTangent={x:n*.333,y:l-i.val});const m={id:ze(),frame:r.t,value:r.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-n*.333,y:d-r.val},rightTangent:{x:1,y:0}};a.push(m)}else{const u=e.slice(0,p+1),m=e.slice(p);mt(u,a,t,o),mt(m,a,t,o)}}const Kr=(e,a,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const o=[...e].sort((s,l)=>s.frame-l.frame),i=Yr(o,1),r=[],n=i[0];return r.push({id:ze(),frame:n.t,value:n.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),mt(i,r,a,t),r.length>0&&(r[0].leftTangent={x:-1,y:0},r[r.length-1].rightTangent={x:1,y:0}),r},Jr=4;function Ta(e,a,t,o,i){const r=1-e,n=e*e,s=r*r,l=s*r,d=n*e;return l*a+3*s*e*t+3*r*n*o+d*i}function en(e,a,t,o,i){const r=1-e;return 3*r*r*(t-a)+6*r*e*(o-t)+3*e*e*(i-o)}function tn(e,a,t,o,i){const r=i-a;if(r<=1e-9)return 0;let n=(e-a)/r;for(let s=0;s<Jr;++s){const l=Ta(n,a,t,o,i),d=en(n,a,t,o,i);if(Math.abs(d)<1e-9)break;const f=l-e;n-=f/d}return Math.max(0,Math.min(1,n))}function an(e,a,t,o,i,r,n,s,l){const d=a,f=t,p=a+o,u=t+i,m=r+s,g=n+l,v=r,h=n,y=tn(e,d,p,m,v);return Ta(y,f,u,g,h)}const ye=.333,Fe={interpolate:(e,a,t,o=!1)=>{if(a.interpolation==="Step")return a.value;let i=a.value,r=t.value;if(o){const l=Math.PI*2,d=r-i;d>Math.PI?r-=l:d<-Math.PI&&(r+=l)}if(a.interpolation==="Bezier"){const l=a.rightTangent?a.rightTangent.x:(t.frame-a.frame)*ye,d=a.rightTangent?a.rightTangent.y:0,f=t.leftTangent?t.leftTangent.x:-(t.frame-a.frame)*ye,p=t.leftTangent?t.leftTangent.y:0;return an(e,a.frame,i,l,d,t.frame,r,f,p)}const n=t.frame-a.frame;if(n<1e-9)return i;const s=(e-a.frame)/n;return i+(r-i)*s},scaleHandles:(e,a,t,o,i)=>{const r={};if(e.interpolation!=="Bezier")return r;if(a&&e.leftTangent){const n=o-a.frame,s=i-a.frame;if(Math.abs(n)>1e-5&&Math.abs(s)>1e-5){const l=s/n;r.leftTangent={x:e.leftTangent.x*l,y:e.leftTangent.y*l}}}if(t&&e.rightTangent){const n=t.frame-o,s=t.frame-i;if(Math.abs(n)>1e-5&&Math.abs(s)>1e-5){const l=s/n;r.rightTangent={x:e.rightTangent.x*l,y:e.rightTangent.y*l}}}return r},calculateTangents:(e,a,t,o)=>{if(o==="Ease"){const h=a?(e.frame-a.frame)*ye:10,y=t?(t.frame-e.frame)*ye:10;return{l:{x:-h,y:0},r:{x:y,y:0}}}if(!a&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!a){const h=(t.value-e.value)/(t.frame-e.frame),y=(t.frame-e.frame)*ye;return{l:{x:-10,y:0},r:{x:y,y:y*h}}}if(!t){const h=(e.value-a.value)/(e.frame-a.frame),y=(e.frame-a.frame)*ye;return{l:{x:-y,y:-y*h},r:{x:10,y:0}}}const i=e.frame-a.frame,r=e.value-a.value,n=i===0?0:r/i,s=t.frame-e.frame,l=t.value-e.value,d=s===0?0:l/s;if(n*d<=0){const h=i*ye,y=s*ye;return{l:{x:-h,y:0},r:{x:y,y:0}}}const f=t.frame-a.frame,p=t.value-a.value;let u=f===0?0:p/f;const m=3*Math.min(Math.abs(n),Math.abs(d));Math.abs(u)>m&&(u=Math.sign(u)*m);const g=i*ye,v=s*ye;return{l:{x:-g,y:-g*u},r:{x:v,y:v*u}}},constrainHandles:(e,a,t)=>{var i,r;const o={};if(e.leftTangent&&a){const n=e.frame-a.frame;if(n>.001){const s=n*ye;if(Math.abs(e.leftTangent.x)>s){const l=s/Math.abs(e.leftTangent.x);o.leftTangent={x:e.leftTangent.x*l,y:e.leftTangent.y*l}}e.leftTangent.x>0&&(o.leftTangent={x:0,y:((i=o.leftTangent)==null?void 0:i.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const n=t.frame-e.frame;if(n>.001){const s=n*ye;if(Math.abs(e.rightTangent.x)>s){const l=s/Math.abs(e.rightTangent.x);o.rightTangent={x:e.rightTangent.x*l,y:e.rightTangent.y*l}}e.rightTangent.x<0&&(o.rightTangent={x:0,y:((r=o.rightTangent)==null?void 0:r.y)??e.rightTangent.y})}}return o},calculateSoftFalloff:(e,a,t)=>{if(e>=a)return 0;const o=e/a;switch(t){case"Linear":return 1-o;case"Dome":return Math.sqrt(1-o*o);case"Pinpoint":return Math.pow(1-o,4);case"S-Curve":return .5*(1+Math.cos(o*Math.PI));default:return 1-o}}},rt={updateNeighbors:(e,a)=>{const t=e[a],o=a===e.length-1,i=a-1;if(i>=0){const n={...e[i]};if(e[i]=n,n.interpolation==="Bezier"){const s=t.frame-n.frame;if(n.autoTangent){const l=e[i-1],{l:d,r:f}=Fe.calculateTangents(n,l,t,"Auto");n.leftTangent=d,n.rightTangent=f}else{const l=Fe.constrainHandles(n,e[i-1],t);Object.assign(n,l)}if(o&&s>1e-4){const l=s*.3,d=n.rightTangent||{x:10,y:0};if(d.x<l){const f=l/Math.max(1e-4,Math.abs(d.x));n.rightTangent={x:l,y:d.y*f}}}}}const r=a+1;if(r<e.length){const n={...e[r]};if(e[r]=n,n.interpolation==="Bezier")if(n.autoTangent){const s=e[r+1],{l,r:d}=Fe.calculateTangents(n,t,s,"Auto");n.leftTangent=l,n.rightTangent=d}else{const s=Fe.constrainHandles(n,t,e[r+1]);Object.assign(n,s)}}},inferInterpolation:(e,a)=>{const t=e.filter(o=>o.frame<a).sort((o,i)=>i.frame-o.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},on=Ee(),rn={durationFrames:300,fps:30,tracks:{}},nn=(e,a)=>({sequence:rn,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=a().sequence,o=JSON.parse(JSON.stringify(t));e(i=>{const r=[...i.undoStack,{type:"SEQUENCE",data:o}];return{undoStack:r.length>50?r.slice(1):r,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:o,sequence:i}=a();if(t.length===0)return!1;const r=t[t.length-1],n=t.slice(0,-1),l={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:r.data,undoStack:n,redoStack:[l,...o]}),!0},redo:()=>{const{undoStack:t,redoStack:o,sequence:i}=a();if(o.length===0)return!1;const r=o[0],n=o.slice(1),l={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:r.data,undoStack:[...t,l],redoStack:n}),!0},setSequence:t=>{a().snapshot(),e({sequence:t})},addTrack:(t,o)=>{a().snapshot(),e(i=>i.sequence.tracks[t]?i:{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{id:t,type:"float",label:o,keyframes:[]}}}})},removeTrack:t=>{a().snapshot(),e(o=>{const i={...o.sequence.tracks};return delete i[t],{sequence:{...o.sequence,tracks:i},selectedTrackIds:o.selectedTrackIds.filter(r=>r!==t)}})},setTrackBehavior:(t,o)=>{a().snapshot(),e(i=>{const r=i.sequence.tracks[t];return r?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...r,postBehavior:o}}}}:i})},addKeyframe:(t,o,i,r)=>{e(n=>{const s=n.sequence.tracks[t];if(!s)return n;let l=r||"Bezier";r||(l=rt.inferInterpolation(s.keyframes,o));const d=l==="Bezier",f={id:ze(),frame:o,value:i,interpolation:l,autoTangent:d,brokenTangents:!1},u=[...s.keyframes.filter(g=>Math.abs(g.frame-o)>.001),f].sort((g,v)=>g.frame-v.frame),m=u.findIndex(g=>g.id===f.id);if(l==="Bezier"){const g=m>0?u[m-1]:void 0,v=m<u.length-1?u[m+1]:void 0,{l:h,r:y}=Fe.calculateTangents(f,g,v,"Auto");f.leftTangent=h,f.rightTangent=y}return rt.updateNeighbors(u,m),{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[t]:{...s,keyframes:u}}}}})},batchAddKeyframes:(t,o,i)=>{e(r=>{const n={...r.sequence.tracks};let s=!1;return o.forEach(({trackId:l,value:d})=>{n[l]||(n[l]={id:l,type:"float",label:l,keyframes:[]},s=!0);const f=n[l],p=[...f.keyframes],u=p.length>0?p[p.length-1]:null,m={id:ze(),frame:t,value:d,interpolation:i||"Linear",autoTangent:i==="Bezier",brokenTangents:!1};if(u)if(t>u.frame)p.push(m);else if(Math.abs(t-u.frame)<.001)m.id=u.id,p[p.length-1]=m;else{const g=p.filter(v=>Math.abs(v.frame-t)>.001);g.push(m),g.sort((v,h)=>v.frame-h.frame),f.keyframes=g,s=!0;return}else p.push(m);f.keyframes=p,s=!0}),s?{sequence:{...r.sequence,tracks:n}}:r})},removeKeyframe:(t,o)=>{a().snapshot(),e(i=>{const r=i.sequence.tracks[t];return r?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...r,keyframes:r.keyframes.filter(n=>n.id!==o)}}}}:i})},updateKeyframe:(t,o,i)=>{e(r=>{const n=r.sequence.tracks[t];if(!n)return r;const s=n.keyframes.map(l=>l.id===o?{...l,...i}:l).sort((l,d)=>l.frame-d.frame);return{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...n,keyframes:s}}}}})},updateKeyframes:t=>{e(o=>{const i={...o.sequence.tracks};return t.forEach(({trackId:r,keyId:n,patch:s})=>{const l=i[r];if(l){const d=l.keyframes.findIndex(f=>f.id===n);if(d!==-1){const f=l.keyframes[d];s.interpolation==="Bezier"&&f.interpolation!=="Bezier"&&(s.autoTangent=!0),l.keyframes[d]={...f,...s}}}}),Object.keys(i).forEach(r=>{i[r].keyframes.sort((n,s)=>n.frame-s.frame)}),{sequence:{...o.sequence,tracks:i}}})},deleteSelectedKeyframes:()=>{a().snapshot(),e(t=>{const o={...t.sequence.tracks},i=new Set(t.selectedKeyframeIds);return Object.keys(o).forEach(r=>{o[r]={...o[r],keyframes:o[r].keyframes.filter(n=>!i.has(`${r}::${n.id}`))}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{a().snapshot(),e(t=>{const o={...t.sequence.tracks};return Object.keys(o).forEach(i=>{o[i]={...o[i],keyframes:[]}}),{sequence:{...t.sequence,tracks:o},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{a().snapshot(),e({sequence:{...a().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{a().snapshot(),e(o=>{const i={...o.sequence.tracks};return o.selectedKeyframeIds.forEach(r=>{const[n,s]=r.split("::"),l=i[n];if(l){const d=l.keyframes.findIndex(p=>p.id===s);if(d===-1)return;const f=l.keyframes[d];if(t==="Split")l.keyframes[d]={...f,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let p=f.rightTangent,u=f.leftTangent;if(p&&u){const m=Math.sqrt(p.x*p.x+p.y*p.y),g=Math.sqrt(u.x*u.x+u.y*u.y);p={x:-u.x*(m/Math.max(.001,g)),y:-u.y*(m/Math.max(.001,g))}}l.keyframes[d]={...f,rightTangent:p,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const p=l.keyframes[d-1],u=l.keyframes[d+1],{l:m,r:g}=Fe.calculateTangents(f,p,u,t);l.keyframes[d]={...f,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:m,rightTangent:g}}}}),{sequence:{...o.sequence,tracks:i}}})},setGlobalInterpolation:(t,o)=>{a().snapshot(),e(i=>{const r={...i.sequence.tracks};return Object.keys(r).forEach(n=>{const s=r[n];s.keyframes.length!==0&&s.keyframes.forEach((l,d)=>{if(l.interpolation=t,t==="Bezier"&&o){const f=s.keyframes[d-1],p=s.keyframes[d+1],{l:u,r:m}=Fe.calculateTangents(l,f,p,o);l.leftTangent=u,l.rightTangent=m,l.autoTangent=o==="Auto",l.brokenTangents=!1}})}),{sequence:{...i.sequence,tracks:r}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:o}=a();if(o.length===0)return;let i=1/0;o.forEach(n=>{var f,p;const[s,l]=n.split("::"),d=(p=(f=t.tracks[s])==null?void 0:f.keyframes.find(u=>u.id===l))==null?void 0:p.frame;d!==void 0&&d<i&&(i=d)});const r=[];o.forEach(n=>{var f;const[s,l]=n.split("::"),d=(f=t.tracks[s])==null?void 0:f.keyframes.find(p=>p.id===l);d&&r.push({relativeFrame:d.frame-i,value:d.value,interpolation:d.interpolation,leftTangent:d.leftTangent,rightTangent:d.rightTangent,originalTrackId:s})}),r.length>0&&e({clipboard:r})},pasteKeyframes:t=>{const{clipboard:o,currentFrame:i}=a();o&&(a().snapshot(),e(r=>{const n={...r.sequence.tracks},s=t!==void 0?t:i;return o.forEach(l=>{const d=n[l.originalTrackId];if(d){const f=s+l.relativeFrame,p={id:ze(),frame:f,value:l.value,interpolation:l.interpolation,leftTangent:l.leftTangent,rightTangent:l.rightTangent,autoTangent:!1,brokenTangents:!1};d.keyframes=[...d.keyframes.filter(u=>Math.abs(u.frame-f)>.001),p].sort((u,m)=>u.frame-m.frame)}}),{sequence:{...r.sequence,tracks:n}}}))},duplicateSelection:()=>{a().copySelectedKeyframes(),a().pasteKeyframes(a().currentFrame)},loopSelection:t=>{const o=a();if(o.selectedKeyframeIds.length<1)return;o.snapshot();let i=1/0,r=-1/0;if(o.selectedKeyframeIds.forEach(s=>{const[l,d]=s.split("::"),f=o.sequence.tracks[l],p=f==null?void 0:f.keyframes.find(u=>u.id===d);p&&(p.frame<i&&(i=p.frame),p.frame>r&&(r=p.frame))}),i===1/0||r===-1/0)return;const n=Math.max(1,r-i);e(s=>{const l={...s.sequence.tracks};for(let d=1;d<=t;d++){const f=n*d;s.selectedKeyframeIds.forEach(p=>{const[u,m]=p.split("::"),g=l[u];if(!g)return;const v=g.keyframes.find(h=>h.id===m);if(v){const h=v.frame+f,y={...v,id:ze(),frame:h};g.keyframes=[...g.keyframes.filter(b=>Math.abs(b.frame-h)>.001),y]}})}return Object.values(l).forEach(d=>d.keyframes.sort((f,p)=>f.frame-p.frame)),{sequence:{...s.sequence,tracks:l}}})},captureCameraFrame:(t,o=!1,i)=>{const r=De()||on.activeCamera;if(!r)return;o||a().snapshot();const n=$e.getUnifiedFromEngine(),s=r.quaternion,l=new ke().setFromQuaternion(s),d=[{id:"camera.unified.x",val:n.x,label:"Position X"},{id:"camera.unified.y",val:n.y,label:"Position Y"},{id:"camera.unified.z",val:n.z,label:"Position Z"},{id:"camera.rotation.x",val:l.x,label:"Rotation X"},{id:"camera.rotation.y",val:l.y,label:"Rotation Y"},{id:"camera.rotation.z",val:l.z,label:"Rotation Z"}];e(f=>{const p={...f.sequence.tracks},u=p["camera.unified.x"],m=!u||u.keyframes.length===0,g=i||(m?"Linear":"Bezier");return d.forEach(v=>{let h=p[v.id];h||(h={id:v.id,type:"float",label:v.label,keyframes:[],hidden:!1},p[v.id]=h);const y={id:ze(),frame:t,value:v.val,interpolation:g,autoTangent:g==="Bezier",brokenTangents:!1},M=[...h.keyframes.filter(z=>Math.abs(z.frame-t)>.001),y].sort((z,_)=>z.frame-_.frame),T=M.findIndex(z=>z.id===y.id);if(g==="Bezier"){const z=T>0?M[T-1]:void 0,_=T<M.length-1?M[T+1]:void 0,{l:R,r:I}=Fe.calculateTangents(y,z,_,"Auto");y.leftTangent=R,y.rightTangent=I}rt.updateNeighbors(M,T),h.keyframes=M}),{sequence:{...f.sequence,tracks:p}}})},simplifySelectedKeys:(t=.01)=>{a().snapshot(),e(o=>{const i=o,r={...i.sequence.tracks},n=new Set(i.selectedKeyframeIds),s={};i.selectedKeyframeIds.forEach(d=>{const[f,p]=d.split("::");s[f]||(s[f]=[]);const u=i.sequence.tracks[f],m=u==null?void 0:u.keyframes.find(g=>g.id===p);m&&s[f].push(m)});const l=[];return Object.entries(s).forEach(([d,f])=>{const p=r[d];if(!p)return;const u={...p};if(r[d]=u,f.length<3)return;const m=f.sort((v,h)=>v.frame-h.frame);u.keyframes=u.keyframes.filter(v=>!n.has(`${d}::${v.id}`));const g=Kr(m,t);u.keyframes=[...u.keyframes,...g].sort((v,h)=>v.frame-h.frame),g.forEach(v=>l.push(`${d}::${v.id}`))}),{sequence:{...i.sequence,tracks:r},selectedKeyframeIds:l}})}}),ht=ma()(ha((e,a,t)=>({...Wr(e,a),...Xr(e),...nn(e,a)})));typeof window<"u"&&(window.useAnimationStore=ht);const Ne=Ee(),Ze=e=>{const a={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const o=e[t];if(o&&typeof o=="object"&&"isColor"in o)a[t]="#"+o.getHexString();else if(o&&typeof o=="object"&&("isVector2"in o||"isVector3"in o)){const i={...o};delete i.isVector2,delete i.isVector3,a[t]=i}else a[t]=o}),a},Ea=e=>{const a=te.get(e),t=a&&a.defaultPreset?a.defaultPreset:{},o={version:5,name:e,formula:e,features:{}};return L.getAll().forEach(i=>{const r={};Object.entries(i.params).forEach(([n,s])=>{s.composeFrom||(r[n]=s.default)}),o.features[i.id]=Ze(r)}),t.features&&Object.entries(t.features).forEach(([i,r])=>{o.features[i]?o.features[i]={...o.features[i],...Ze(r)}:o.features[i]=Ze(r)}),t.lights&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.lights=t.lights),t.renderMode&&(o.features.lighting||(o.features.lighting={}),o.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),o.cameraMode=t.cameraMode||"Orbit",o.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},o.lights=[],o.animations=t.animations||[],o.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},o.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},o.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},o.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},o.targetDistance=t.targetDistance||3.5,o.duration=t.duration||300,o.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},o},sn=(e,a,t)=>{const o=t(),i=e.features||{};if(e.renderMode&&(i.lighting||(i.lighting={}),i.lighting.renderMode===void 0&&(i.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),i.atmosphere&&!i.ao){const b={};i.atmosphere.aoIntensity!==void 0&&(b.aoIntensity=i.atmosphere.aoIntensity),i.atmosphere.aoSpread!==void 0&&(b.aoSpread=i.atmosphere.aoSpread),i.atmosphere.aoMode!==void 0&&(b.aoMode=i.atmosphere.aoMode),i.atmosphere.aoEnabled!==void 0&&(b.aoEnabled=i.atmosphere.aoEnabled),Object.keys(b).length>0&&(i.ao=b)}const r=new Set(["compilerHardCap","precisionMode","bufferPrecision"]);if(L.getAll().forEach(b=>{const M=`set${b.id.charAt(0).toUpperCase()+b.id.slice(1)}`,T=o[M];if(typeof T=="function"){const z=i[b.id],_={},R=b.id==="quality"?t().quality:null;if(b.state&&Object.assign(_,b.state),Object.entries(b.params).forEach(([I,A])=>{if(b.id==="quality"&&r.has(I)&&R){_[I]=R[I];return}if(z&&z[I]!==void 0){let x=z[I];A.type==="vec2"&&x&&!(x instanceof be)?x=new be(x.x,x.y):A.type==="vec3"&&x&&!(x instanceof k)?x=new k(x.x,x.y,x.z):A.type==="color"&&x&&!(x instanceof ce)&&(x=new ce(x)),_[I]=x}else if(_[I]===void 0){let x=A.default;x&&typeof x=="object"&&(typeof x.clone=="function"?x=x.clone():Array.isArray(x)?x=[...x]:x={...x}),_[I]=x}}),b.id==="lighting"&&z){if(z.lights)_.lights=ta(z.lights.map(I=>({...I,type:I.type||"Point",rotation:I.rotation||{x:0,y:0,z:0}})));else if(z.light0_posX!==void 0){const I=[];for(let A=0;A<3;A++)if(z[`light${A}_posX`]!==void 0){let x=z[`light${A}_color`]||"#ffffff";x.getHexString&&(x="#"+x.getHexString()),I.push({type:"Point",position:{x:z[`light${A}_posX`],y:z[`light${A}_posY`],z:z[`light${A}_posZ`]},rotation:{x:0,y:0,z:0},color:x,intensity:z[`light${A}_intensity`]??1,falloff:z[`light${A}_falloff`]??0,falloffType:z[`light${A}_type`]?"Linear":"Quadratic",fixed:z[`light${A}_fixed`]??!1,visible:z[`light${A}_visible`]??A===0,castShadow:z[`light${A}_castShadow`]??!0})}I.length>0&&(_.lights=I)}}b.id==="materials"&&z&&z.envMapVisible!==void 0&&z.envBackgroundStrength===void 0&&(_.envBackgroundStrength=z.envMapVisible?1:0),T(_)}}),e.lights&&e.lights.length>0){const b=o.setLighting;if(typeof b=="function"){const M=ta(e.lights.map(T=>({...T,type:T.type||"Point",rotation:T.rotation||{x:0,y:0,z:0}})));b({lights:M})}}e.sequence&&ht.getState().setSequence(e.sequence),o.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&a({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const n=e.cameraPos||{x:0,y:0,z:3.5},s=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},l=e.targetDistance||3.5,d=e.cameraRot||{x:0,y:0,z:0,w:1},f=s.x+s.xL+n.x,p=s.y+s.yL+n.y,u=s.z+s.zL+n.z,m=V.split(f),g=V.split(p),v=V.split(u),h={x:m.high,y:g.high,z:v.high,xL:m.low,yL:g.low,zL:v.low};a({cameraRot:d,targetDistance:l,sceneOffset:h,cameraMode:e.cameraMode||t().cameraMode}),Ne.activeCamera&&Ne.virtualSpace&&Ne.virtualSpace.applyCameraState(Ne.activeCamera,{position:{x:0,y:0,z:0},rotation:d,sceneOffset:h,targetDistance:l});const y={position:{x:0,y:0,z:0},rotation:d,sceneOffset:h,targetDistance:l};Ne.pendingTeleport=y,F.emit("camera_teleport",y),e.duration&&ht.getState().setDuration(e.duration),e.formula==="Modular"&&o.refreshPipeline(),o.refreshHistogram(),F.emit("reset_accum",void 0)},ln={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},cn=(e,a,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const o=Ea(e.formula);o.formula="";const i=L.getDictionary();return new ut(o,i).encode(e,a)}catch(o){return console.error("Sharing: Failed to generate share string",o),""}},ns=e=>{if(!e)return null;try{const a=L.getDictionary(),o=new ut(ln,a).decode(e);if(o&&o.formula){const i=Ea(o.formula);return new ut(i,a).decode(e)}}catch(a){console.error("Sharing: Failed to load share string",a)}return null},nt=Ee();class dn{constructor(){C(this,"pendingCam");C(this,"binders",new Map);C(this,"overriddenTracks",new Set);C(this,"lastCameraIndex",-1);C(this,"animStore",null);C(this,"fractalStore",null);this.pendingCam={rot:new ke,unified:new k,rotDirty:!1,unifiedDirty:!1}}connect(a,t){this.animStore=a,this.fractalStore=t}setOverriddenTracks(a){this.overriddenTracks=a}getBinder(a){if(this.binders.has(a))return this.binders.get(a);let t=()=>{};if(a==="camera.active_index")t=o=>{const i=Math.round(o);if(i!==this.lastCameraIndex){const r=this.fractalStore.getState(),n=r.savedCameras;n&&n[i]&&(r.selectCamera(n[i].id),this.lastCameraIndex=i)}};else if(a.startsWith("camera.")){const o=a.split("."),i=o[1],r=o[2];i==="unified"?t=n=>{this.pendingCam.unified[r]=n,this.pendingCam.unifiedDirty=!0}:i==="rotation"&&(t=n=>{this.pendingCam.rot[r]=n,this.pendingCam.rotDirty=!0})}else if(a.startsWith("lights.")){const o=a.split("."),i=parseInt(o[1]),r=o[2];let n="";r==="position"?n=`pos${o[3].toUpperCase()}`:r==="color"?n="color":n=r;const s=`lighting.light${i}_${n}`;return this.getBinder(s)}else if(a.startsWith("lighting.light")){const o=a.match(/lighting\.light(\d+)_(\w+)/);if(o){const i=parseInt(o[1]),r=o[2],n=this.fractalStore.getState();if(r==="intensity")t=s=>n.updateLight({index:i,params:{intensity:s}});else if(r==="falloff")t=s=>n.updateLight({index:i,params:{falloff:s}});else if(r.startsWith("pos")){const s=r.replace("pos","").toLowerCase();t=l=>{var p;const f=(p=this.fractalStore.getState().lighting)==null?void 0:p.lights[i];if(f){const u={...f.position,[s]:l};n.updateLight({index:i,params:{position:u}})}}}else if(r.startsWith("rot")){const s=r.replace("rot","").toLowerCase();t=l=>{var p;const f=(p=this.fractalStore.getState().lighting)==null?void 0:p.lights[i];if(f){const u={...f.rotation,[s]:l};n.updateLight({index:i,params:{rotation:u}})}}}}}else if(a.includes(".")){const o=a.split("."),i=o[0],r=o[1];if(L.get(i)){const s=this.fractalStore.getState(),l=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,d=s[l];if(d&&typeof d=="function"){const f=r.match(/^(vec[23][ABC])_(x|y|z)$/);if(f){const p=f[1],u=f[2];t=m=>{var h;const v=(h=this.fractalStore.getState()[i])==null?void 0:h[p];if(v){const y=v.clone();y[u]=m,d({[p]:y})}}}else t=p=>d({[r]:p})}else console.warn(`AnimationEngine: Setter ${l} not found for feature ${i}`)}}else{const o=this.fractalStore.getState(),i="set"+a.charAt(0).toUpperCase()+a.slice(1);typeof o[i]=="function"&&(t=r=>o[i](r))}return this.binders.set(a,t),t}tick(a){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const o=t.fps,i=t.currentFrame,r=t.durationFrames,n=t.loopMode,s=a*o;let l=i+s;if(l>=r)if(n==="Once"||t.isRecordingModulation){l=r,this.scrub(r),this.animStore.setState({isPlaying:!1,currentFrame:r}),t.isRecordingModulation&&t.stopModulationRecording();return}else l=0;this.animStore.setState({currentFrame:l}),this.scrub(l)}scrub(a){if(!this.animStore)return;const{sequence:t,isPlaying:o,isRecording:i,recordCamera:r}=this.animStore.getState(),n=Object.values(t.tracks);this.syncBuffersFromEngine();const s=o&&i&&r;for(let l=0;l<n.length;l++){const d=n[l];if(this.overriddenTracks.has(d.id)||d.keyframes.length===0||d.type!=="float"||d.id.includes("camera.position")||d.id.includes("camera.offset")||s&&d.id.startsWith("camera."))continue;const f=this.interpolate(d,a);this.getBinder(d.id)(f)}this.commitState()}syncBuffersFromEngine(){const a=De()||nt.activeCamera;if(a){this.pendingCam.rot.setFromQuaternion(a.quaternion);const t=nt.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+a.position.x,t.y+t.yL+a.position.y,t.z+t.zL+a.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(a,t){const o=a.keyframes;if(o.length===0)return 0;const i=o[0],r=o[o.length-1],n=a.id.startsWith("camera.rotation")||a.id.includes("rot")||a.id.includes("phase")||a.id.includes("twist");if(t>r.frame){const s=a.postBehavior||"Hold";if(s==="Hold")return r.value;if(s==="Continue"){let m=0;if(o.length>1){const g=o[o.length-2];r.interpolation==="Linear"?m=(r.value-g.value)/(r.frame-g.frame):r.interpolation==="Bezier"&&(r.leftTangent&&Math.abs(r.leftTangent.x)>.001?m=r.leftTangent.y/r.leftTangent.x:m=(r.value-g.value)/(r.frame-g.frame))}return r.value+m*(t-r.frame)}const l=r.frame-i.frame;if(l<=.001)return r.value;const d=t-i.frame,f=Math.floor(d/l),p=i.frame+d%l,u=this.evaluateCurveInternal(o,p,n);if(s==="Loop")return u;if(s==="PingPong"){if(f%2===1){const g=r.frame-d%l;return this.evaluateCurveInternal(o,g,n)}return u}if(s==="OffsetLoop"){const m=r.value-i.value;return u+m*f}}return t<i.frame?i.value:this.evaluateCurveInternal(o,t,n)}evaluateCurveInternal(a,t,o){for(let i=0;i<a.length-1;i++){const r=a[i],n=a[i+1];if(t>=r.frame&&t<=n.frame)return Fe.interpolate(t,r,n,o)}return a[a.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){nt.shouldSnapCamera=!0;const a=new Te().setFromEuler(this.pendingCam.rot),t={x:a.x,y:a.y,z:a.z,w:a.w},o=V.split(this.pendingCam.unified.x),i=V.split(this.pendingCam.unified.y),r=V.split(this.pendingCam.unified.z);F.emit(le.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:o.high,y:i.high,z:r.high,xL:o.low,yL:i.low,zL:r.low}}),this.fractalStore.setState({cameraRot:t})}}}const fn=new dn,ss=(e,a)=>{const t={};e.forEach(n=>t[n.id]=[]),a.forEach(n=>{t[n.source]&&t[n.source].push(n.target)});const o=new Set,i=new Set,r=n=>{if(!o.has(n)){o.add(n),i.add(n);const s=t[n]||[];for(const l of s)if(!o.has(l)&&r(l)||i.has(l))return!0}return i.delete(n),!1};for(const n of e)if(r(n.id))return!0;return!1},sa=(e,a)=>{const t={},o={};e.forEach(n=>{t[n.id]=[],o[n.id]=0}),a.forEach(n=>{t[n.source]&&(t[n.source].push(n.target),o[n.target]=(o[n.target]||0)+1)});const i=[];e.forEach(n=>{o[n.id]===0&&i.push(n.id)});const r=[];for(;i.length>0;){i.sort();const n=i.shift(),s=e.find(l=>l.id===n);if(s){const{position:l,...d}=s;r.push(d)}if(t[n])for(const l of t[n])o[l]--,o[l]===0&&i.push(l)}return r},la=e=>{const a=e.map((o,i)=>({...o,position:{x:250,y:150+i*200}})),t=[];if(a.length>0){t.push({id:`e-root-start-${a[0].id}`,source:"root-start",target:a[0].id});for(let o=0;o<a.length-1;o++)t.push({id:`e-${a[o].id}-${a[o+1].id}`,source:a[o].id,target:a[o+1].id});t.push({id:`e-${a[a.length-1].id}-root-end`,source:a[a.length-1].id,target:"root-end"})}return{nodes:a,edges:t}},pn=(e,a)=>{if(e.length!==a.length)return!1;for(let t=0;t<e.length;t++){const o=e[t],i=a[t];if(o.id!==i.id||o.type!==i.type||o.enabled!==i.enabled)return!1;const r=o.bindings||{},n=i.bindings||{},s=Object.keys(r).filter(p=>r[p]!==void 0),l=Object.keys(n).filter(p=>n[p]!==void 0);if(s.length!==l.length)return!1;for(const p of s)if(r[p]!==n[p])return!1;const d=o.condition||{active:!1,mod:0,rem:0},f=i.condition||{active:!1,mod:0,rem:0};if(d.active!==f.active||d.active&&(d.mod!==f.mod||d.rem!==f.rem))return!1}return!0},un=(e,a)=>e.length!==a.length?!1:JSON.stringify(e)===JSON.stringify(a),gt=[{id:"note-1",type:"Note",enabled:!0,params:{},text:`Infinite Repetition
The 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals.`},{id:"mod-1",type:"Mod",enabled:!0,params:{x:4,y:4,z:0}},{id:"note-2",type:"Note",enabled:!0,params:{},text:`Dynamic Rotation
This rotation is bound to 'ParamC' (Slider below). Try dragging it!`},{id:"rot-1",type:"Rotate",enabled:!0,params:{x:0,y:0,z:0},bindings:{z:"ParamC"}},{id:"bulb-1",type:"Mandelbulb",enabled:!0,params:{power:8}},{id:"add-c",type:"AddConstant",enabled:!0,params:{scale:1}}],se=Ee(),ue=ma()(ha((e,a,t)=>({...Oo(e,a),...No(e,a),...Xo(e,a),...Jo(e,a),...Lr(e,a),...Ur(e,a),formula:"Mandelbulb",pipeline:gt,pipelineRevision:1,graph:la(gt),projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(o,i={})=>{const r=a(),n=r.formula;if(n===o&&o!=="Modular")return;i.skipDefaultPreset||(a().resetParamHistory(),e({undoStack:[],redoStack:[]}));const s=r.projectSettings.name;let l=s;if((s===n||s==="Untitled"||s==="Custom Preset")&&(l=o),e({formula:o,projectSettings:{...r.projectSettings,name:l}}),F.emit(le.CONFIG,{formula:o,pipeline:r.pipeline,graph:r.graph}),o!=="Modular"&&!i.skipDefaultPreset){const d=te.get(o),f=d&&d.defaultPreset?JSON.parse(JSON.stringify(d.defaultPreset)):{formula:o};f.features||(f.features={});const p=a();if(L.getEngineFeatures().forEach(m=>{const g=p[m.id];if(!g)return;const v=f.features[m.id]||{},h={},y=m.engineConfig.toggleParam;g[y]!==void 0&&v[y]===void 0&&(h[y]=g[y]),Object.entries(m.params).forEach(([b,M])=>{M.onUpdate==="compile"&&g[b]!==void 0&&v[b]===void 0&&(h[b]=g[b])}),f.features[m.id]||(f.features[m.id]={}),Object.assign(f.features[m.id],h)}),a().lockSceneOnSwitch){const m=a().getPreset(),g={...m.features||{}},v=f.features||{};v.coreMath&&(g.coreMath=v.coreMath),v.geometry&&(g.geometry=v.geometry);const h={...m,formula:o,features:g};a().loadPreset(h)}else a().loadPreset(f)}a().handleInteractionEnd()},setProjectSettings:o=>e(i=>{const r={...i.projectSettings,...o};return o.name&&o.name!==i.projectSettings.name?(r.version=0,{projectSettings:r,lastSavedHash:null}):{projectSettings:r}}),prepareExport:()=>{const o=a(),i=o.getPreset({includeScene:!0}),{version:r,name:n,...s}=i,l=JSON.stringify(s);if(o.lastSavedHash===null||o.projectSettings.version===0){const d=Math.max(1,o.projectSettings.version+1);return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:l}),d}if(o.lastSavedHash!==l){const d=o.projectSettings.version+1;return e({projectSettings:{...o.projectSettings,version:d},lastSavedHash:l}),d}return o.projectSettings.version},setAnimations:o=>{const i=a().animations,r=o.map(n=>{const s=i.find(l=>l.id===n.id);if(!s)return n;if(n.period!==s.period&&n.period>0){const l=performance.now()/1e3,d=(l/s.period+s.phase-l/n.period)%1;return{...n,phase:(d+1)%1}}return n});e({animations:r})},setLiveModulations:o=>e({liveModulations:o}),setGraph:o=>{const i=sa(o.nodes,o.edges),r=a();if(pn(r.pipeline,i))un(r.pipeline,i)?e({graph:o}):(e({graph:o,pipeline:i}),F.emit(le.CONFIG,{pipeline:i}));else if(r.autoCompile){const n=r.pipelineRevision+1;e({graph:o,pipeline:i,pipelineRevision:n}),F.emit(le.CONFIG,{pipeline:i,graph:o,pipelineRevision:n})}else e({graph:o})},setPipeline:o=>{const i=a().pipelineRevision+1,r=la(o);e({pipeline:o,graph:r,pipelineRevision:i}),F.emit(le.CONFIG,{pipeline:o,graph:r,pipelineRevision:i})},refreshPipeline:()=>{const o=a(),i=sa(o.graph.nodes,o.graph.edges),r=o.pipelineRevision+1;e({pipeline:i,pipelineRevision:r}),F.emit(le.CONFIG,{pipeline:i,graph:o.graph,pipelineRevision:r})},loadPreset:o=>{o._formulaDef&&!te.get(o.formula)&&te.register(o._formulaDef),a().resetParamHistory();const i=te.get(o.formula),r=i?i.id:o.formula;e({formula:r}),F.emit(le.CONFIG,{formula:r});let n=o.name;(!n||n==="Untitled"||n==="Custom Preset")&&(n=r),e({projectSettings:{name:n,version:0},lastSavedHash:null}),sn(o,e,a),setTimeout(()=>{const s=a().getPreset({includeScene:!0}),{version:l,name:d,...f}=s;e({lastSavedHash:JSON.stringify(f)})},50)},loadScene:({def:o,preset:i})=>{if(o&&(te.get(o.id)||te.register(o),F.emit(le.REGISTER_FORMULA,{id:o.id,shader:o.shader})),a().loadPreset(i),!se.isBooted&&!se.bootSent)return;const r=Aa(a());F.emit(le.CONFIG,r);const n=a().sceneOffset;if(n){const s={x:n.x,y:n.y,z:n.z,xL:n.xL??0,yL:n.yL??0,zL:n.zL??0};se.setShadowOffset(s),se.post({type:"OFFSET_SET",offset:s})}},getPreset:o=>{var s,l;const i=a(),r={version:i.projectSettings.version,name:i.projectSettings.name,formula:i.formula,features:{}};if((o==null?void 0:o.includeScene)!==!1){if(r.cameraPos={x:0,y:0,z:0},se.activeCamera&&se.virtualSpace){const d=se.virtualSpace.getUnifiedCameraState(se.activeCamera,i.targetDistance);r.cameraRot=d.rotation,r.sceneOffset=d.sceneOffset,r.targetDistance=d.targetDistance}else r.cameraRot=i.cameraRot,r.sceneOffset=i.sceneOffset,r.targetDistance=i.targetDistance;r.cameraMode=i.cameraMode,r.lights=[],r.renderMode=i.renderMode,r.quality={aaMode:i.aaMode,aaLevel:i.aaLevel,msaa:i.msaaSamples,accumulation:i.accumulation}}L.getAll().forEach(d=>{const f=i[d.id];f&&(r.features||(r.features={}),r.features[d.id]=Ze(f))}),r.animations=i.animations,i.savedCameras.length>0&&(r.savedCameras=i.savedCameras.map(d=>({id:d.id,label:d.label,position:d.position,rotation:d.rotation,sceneOffset:d.sceneOffset,targetDistance:d.targetDistance,optics:d.optics}))),i.formula==="Modular"&&(r.graph=i.graph,r.pipeline=i.pipeline);try{const d=(l=(s=window.useAnimationStore)==null?void 0:s.getState)==null?void 0:l.call(s);d&&(r.sequence=d.sequence,r.duration=d.durationFrames)}catch(d){console.warn("Failed to save animation sequence:",d)}return r},getShareString:o=>{const i=a().getPreset({includeScene:!0}),r=a().advancedMode;return cn(i,r,o)}}))),ls=e=>e.isUserInteracting||e.interactionMode!=="none",cs=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting||e.isBucketRendering)return!0;const a=L.getAll();for(const o of a)if((t=o.interactionConfig)!=null&&t.blockCamera&&o.interactionConfig.activeParam){const i=e[o.id];if(i&&i[o.interactionConfig.activeParam])return!0}return!1},Aa=e=>{var o;const a={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:{...e.quality}};if(L.getAll().forEach(i=>{const r=e[i.id];r&&(a[i.id]={...r})}),e.hardwareProfile){const i=e.hardwareProfile,r=a.quality;r&&(r.precisionMode=Math.max(r.precisionMode??0,i.caps.precisionMode),r.bufferPrecision=Math.max(r.bufferPrecision??0,i.caps.bufferPrecision),r.compilerHardCap=Math.min(r.compilerHardCap??500,i.caps.compilerHardCap)),a.compilerHardCap=((o=a.quality)==null?void 0:o.compilerHardCap)??a.compilerHardCap}return a};Gr(Aa);const ds=()=>{const e=ue.getState();fn.connect(window.useAnimationStore,ue),se.isPaused=e.isPaused,se.setPreviewSampleCap(e.sampleCap),se.onBooted=()=>{const t=ue.getState(),o=t.sceneOffset;if(o){const i={x:o.x,y:o.y,z:o.z,xL:o.xL??0,yL:o.yL??0,zL:o.zL??0};se.setShadowOffset(i),se.post({type:"OFFSET_SET",offset:i})}se.setPreviewSampleCap(t.sampleCap)},ue.subscribe(t=>t.isPaused,t=>{se.isPaused=t}),ue.subscribe(t=>t.sampleCap,t=>{se.setPreviewSampleCap(t)}),ue.subscribe(t=>{var o;return(o=t.lighting)==null?void 0:o.renderMode},t=>{const o=t===1?"PathTracing":"Direct";ue.getState().renderMode!==o&&ue.setState({renderMode:o})});let a;ue.subscribe(t=>{var o;return(o=t.optics)==null?void 0:o.camType},t=>{var r;if(t===void 0)return;const o=a!==void 0&&a<.5,i=t>.5&&t<1.5;if(o&&i){const n=ue.getState();if(!n.activeCameraId){const s=((r=n.optics)==null?void 0:r.camFov)||60;let l=se.lastMeasuredDistance;(!l||l>=1e3||l<=0)&&(l=n.targetDistance||3.5);const d=l*Math.tan(s*Math.PI/360),f=n.setOptics;typeof f=="function"&&f({orthoScale:d})}}a=t}),F.on(le.BUCKET_STATUS,({isRendering:t})=>{const o=ue.getState();o.setIsBucketRendering(t),o.setIsExporting(t)})};typeof window<"u"&&(window.__store=ue);const mn=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"6 9 12 15 18 9"})}),fs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"18 15 12 9 6 15"})}),ps=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"15 18 9 12 15 6"})}),us=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"9 18 15 12 9 6"})}),ms=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"9 18 15 12 9 6"})}),hs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"})}),gs=()=>c.jsx("svg",{width:"100%",height:"100%",viewBox:"0 0 10 10",children:c.jsx("path",{d:"M 6 10 L 10 6 L 10 10 Z",fill:"currentColor",opacity:"0.5"})}),ys=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"4",y1:"9",x2:"20",y2:"9"}),c.jsx("line",{x1:"4",y1:"15",x2:"20",y2:"15"})]}),bs=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})}),xs=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),c.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),vs=()=>c.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"3",y1:"12",x2:"21",y2:"12"}),c.jsx("line",{x1:"3",y1:"6",x2:"21",y2:"6"}),c.jsx("line",{x1:"3",y1:"18",x2:"21",y2:"18"})]}),Ss=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"0 0 512 512",fill:"currentColor",children:c.jsx("path",{d:"M0,0v512h512V106.9l-6.5-7.3L412.4,6.5L405.1,0H0z M46.5,46.5h69.8v139.6h279.3V56.7l69.8,69.8v338.9h-46.5V256H93.1v209.5H46.5V46.5z M162.9,46.5H256V93h46.5V46.5H349v93.1H162.9V46.5z M139.6,302.5h232.7v162.9H139.6V302.5z"})}),zs=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"190 230 680 620",fill:"currentColor",children:c.jsx("path",{d:"M257.3312 451.84V332.8c0-42.3936 34.2016-76.8 76.4416-76.8h107.8272c29.5936 0 56.5248 17.152 69.12 44.032l14.8992 31.6416a25.4976 25.4976 0 0 0 23.04 14.6944h192.8192c42.1888 0 76.4416 34.3552 76.4416 76.8v28.672a76.8 76.8 0 0 1 50.9952 88.064l-43.3152 217.6A76.544 76.544 0 0 1 750.6432 819.2H324.5568a76.544 76.544 0 0 1-74.9568-61.7472l-43.3152-217.6a76.8512 76.8512 0 0 1 51.0464-88.0128z m509.5936-3.84v-24.832c0-14.1312-11.4176-25.6-25.4464-25.6h-192.8192a76.4416 76.4416 0 0 1-69.12-44.032l-14.848-31.6928A25.4976 25.4976 0 0 0 441.6 307.2H333.7216a25.5488 25.5488 0 0 0-25.4976 25.6v115.2h458.6496z m-485.6832 51.2a25.6 25.6 0 0 0-24.9856 30.6176l43.3152 217.6c2.4064 11.9808 12.8512 20.5824 24.9856 20.5824h426.0864a25.4976 25.4976 0 0 0 24.9856-20.5824l43.3152-217.6a25.7024 25.7024 0 0 0-24.9856-30.6176H281.2416z"})}),ws=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("line",{x1:"12",cy:"16",x2:"12",y2:"12"}),c.jsx("line",{x1:"12",cy:"8",x2:"12.01",y2:"8"})]}),_s=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}),c.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),Ms=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M3 10h10a5 5 0 0 1 5 5v2"}),c.jsx("path",{d:"M7 6l-4 4 4 4"})]}),Cs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M21 10h-10a5 5 0 0 0 -5 5v2"}),c.jsx("path",{d:"M17 6l4 4 -4 4"})]}),Fs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}),c.jsx("path",{d:"M3 3v5h5"})]}),Is=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"20 6 9 17 4 12"})}),Ps=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),c.jsx("polyline",{points:"17 8 12 3 7 8"}),c.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),Rs=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),c.jsx("polyline",{points:"7 10 12 15 17 10"}),c.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),Ts=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"4",children:[c.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),c.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),Es=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),c.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]}),As=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),Ds=()=>c.jsxs("svg",{width:"64",height:"64",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"5",y:"2",width:"14",height:"20",rx:"2",ry:"2"}),c.jsx("path",{d:"M12 18h.01"})]}),Ls=({className:e})=>c.jsxs("svg",{className:e,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[c.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),c.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),ks=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 18 22 12 16 6"}),c.jsx("polyline",{points:"8 6 2 12 8 18"})]}),Bs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}),c.jsx("line",{x1:"9",y1:"9",x2:"9.01",y2:"9"}),c.jsx("line",{x1:"15",y1:"9",x2:"15.01",y2:"9"})]}),Os=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),c.jsx("polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}),c.jsx("line",{x1:"12",y1:"22.08",x2:"12",y2:"12"})]}),js=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",strokeDasharray:"4 4"}),c.jsx("path",{d:"M9 12l2 2 4-4"})]}),Ns=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"})}),Vs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("circle",{cx:"12",cy:"12",r:"10"})}),Hs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 512 512",fill:"currentColor",children:c.jsx("path",{d:"M167.4,59.1l-6.2,8l-23.4,31.4h-19.7V78.8H39.4v19.7H0v354.5h512V98.5H374.2l-23.4-31.4l-6.2-8H167.4z M187.1,98.5h137.8l23.4,31.4l6.2,8h118.2v78.8H358.2c-20.5-35.2-58.7-59.1-102.2-59.1s-81.6,23.9-102.2,59.1H39.4v-78.8h118.2l6.2-8L187.1,98.5z M393.8,157.5v39.4h39.4v-39.4H393.8z M256,196.9c43.8,0,78.8,35,78.8,78.8s-35,78.8-78.8,78.8s-78.8-35-78.8-78.8S212.2,196.9,256,196.9z M39.4,256h100.3c-1.1,6.3-1.8,13.1-1.8,19.7c0,65,53.2,118.2,118.2,118.2s118.2-53.2,118.2-118.2c0-6.6-0.8-13.4-1.8-19.7h100.3v157.5H39.4V256z"})}),$s=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 3v18"}),c.jsx("path",{d:"M3 12h18"}),c.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Gs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"})}),qs=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),c.jsx("polyline",{points:"2 17 12 22 22 17"}),c.jsx("polyline",{points:"2 12 12 17 22 12"})]}),Us=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 2l-5 9h10l-5 9"}),c.jsx("path",{d:"M12 2v20"})]}),Ws=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}),c.jsx("path",{d:"M18 22V8a2 2 0 0 0-2-2H2"})]}),Xs=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),c.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"}),c.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"})]}),Ys=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),c.jsx("path",{d:"M3 14h7v7H3z",fill:"currentColor",stroke:"none"})]}),Zs=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:c.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"})}),Qs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),c.jsx("path",{d:"M10 7h4"}),c.jsx("path",{d:"M17 10v4"})]}),Ks=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 22V8"}),c.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),c.jsx("circle",{cx:"12",cy:"5",r:"3"})]}),Js=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 18V8"}),c.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),c.jsx("circle",{cx:"12",cy:"5",r:"3"}),c.jsx("line",{x1:"3",y1:"21",x2:"21",y2:"3",stroke:"currentColor",opacity:"0.9"})]}),el=({status:e})=>{let a="currentColor";e==="keyed"||e==="partial"?a="#f59e0b":(e==="dirty"||e==="keyed-dirty")&&(a="#ef4444");const t=e==="keyed"||e==="keyed-dirty"?a:"none";return c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:a,strokeWidth:"2.5",children:c.jsx("path",{d:"M12 2L2 12l10 10 10-10L12 2z",fill:t})})},tl=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),c.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]}),al=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M10 13l-4 4"}),c.jsx("path",{d:"M14 11l4 -4"})]}),ol=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#f59e0b":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 18 22 12 16 6"}),c.jsx("polyline",{points:"8 6 2 12 8 18"})]}),il=({open:e})=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:`transition-transform ${e?"rotate-90":""}`,children:c.jsx("path",{d:"M9 18l6-6-6-6"})}),rl=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"2",y:"2",width:"20",height:"20",rx:"5",ry:"5"}),c.jsx("path",{d:"M16 8h.01"}),c.jsx("path",{d:"M8 8h.01"}),c.jsx("path",{d:"M8 16h.01"}),c.jsx("path",{d:"M16 16h.01"}),c.jsx("path",{d:"M12 12h.01"})]}),nl=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 3 21 3 21 8"}),c.jsx("line",{x1:"4",y1:"20",x2:"21",y2:"3"}),c.jsx("polyline",{points:"21 16 21 21 16 21"}),c.jsx("line",{x1:"15",y1:"15",x2:"21",y2:"21"}),c.jsx("line",{x1:"4",y1:"4",x2:"9",y2:"9"})]}),sl=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M8 5v14l11-7z"})}),ll=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M6 19h4V5H6v14zm8-14v14h4V5h-4z"})}),cl=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M6 6h12v12H6z"})}),dl=({active:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:e?"currentColor":"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:e?"none":"currentColor",fill:e?"#ef4444":"none"})}),fl=({active:e})=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M3 18C3 18 6 5 12 12C18 19 21 5 21 5"})}),pl=({active:e})=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:[c.jsx("rect",{x:"3",y:"8",width:"6",height:"8"}),c.jsx("rect",{x:"15",y:"8",width:"6",height:"8"})]}),ul=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),c.jsx("path",{d:"M4 22v-7"}),c.jsx("path",{d:"M8 4v10"}),c.jsx("path",{d:"M12 5v10"}),c.jsx("path",{d:"M16 4v10"}),c.jsx("path",{d:"M4 8h16"}),c.jsx("path",{d:"M4 12h16"})]}),ml=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),c.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"}),c.jsx("line",{x1:"3",y1:"15",x2:"21",y2:"15"}),c.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),c.jsx("line",{x1:"15",y1:"3",x2:"15",y2:"21"})]}),hl=({mode:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e==="Loop"||e==="PingPong"?c.jsx("path",{d:"M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3"}):c.jsx("path",{d:"M5 12h14 M12 5l7 7-7 7"})}),gl=({active:e,arming:a})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M3 12h18",strokeOpacity:e||a?.3:.2}),c.jsx("path",{d:"M3 12 Q 6 2, 9 12 T 15 12 T 21 12",stroke:e?"#ef4444":a?"#fca5a5":"currentColor"}),a&&!e&&c.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"#fca5a5",stroke:"none"})]}),yl=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"4 14 10 14 10 20"}),c.jsx("polyline",{points:"20 10 14 10 14 4"}),c.jsx("line",{x1:"14",y1:"10",x2:"21",y2:"3"}),c.jsx("line",{x1:"3",y1:"21",x2:"10",y2:"14"})]}),bl=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}),c.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"currentColor",stroke:"none"})]}),xl=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"4",y1:"20",x2:"20",y2:"20"}),c.jsx("line",{x1:"4",y1:"4",x2:"20",y2:"4"}),c.jsx("polyline",{points:"4 14 8 10 12 14 16 10 20 14"})]}),vl=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),c.jsx("path",{d:"M4 12h16"}),c.jsx("path",{d:"M12 4v16"}),c.jsx("path",{d:"M16 16l-4 4-4-4"})]}),Sl=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M19 13l-7-7-7 7"}),c.jsx("path",{d:"M5 19l7-7 7 7"}),c.jsx("path",{d:"M12 5l2-2 2 2-2 2-2-2z",fill:e?"#22d3ee":"none",stroke:"none"}),c.jsx("path",{d:"M12 5l-2-2-2 2 2 2 2-2z",fill:e?"#22d3ee":"none",stroke:"none"})]}),zl=({active:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M2 12s3-7 7-7 7 7 7 7 3-7 7-7"})}),wl=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:e?"text-gray-200":"text-gray-600",children:[c.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),c.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),hn=e=>{const{value:a,onChange:t,onDragStart:o,onDragEnd:i,step:r=.01,sensitivity:n=1,hardMin:s,hardMax:l,mapping:d,disabled:f,dragThreshold:p=2}=e,[u,m]=P.useState(!1),g=P.useRef(null),v=P.useRef(0),h=P.useRef(0),y=P.useRef(!1),b=P.useRef(!1),M=P.useRef(!1),T=P.useRef(null),z=P.useCallback((x,E)=>{let Y=r*.5*n;return x&&(Y*=10),E&&(Y*=.1),Y},[r,n]),_=P.useCallback(x=>{if(f||x.button!==0)return;x.preventDefault(),x.stopPropagation(),x.currentTarget.setPointerCapture(x.pointerId),T.current=x.pointerId,v.current=x.clientX;const E=d?d.toDisplay(a):a;h.current=isNaN(E)?0:E,y.current=!1,b.current=x.shiftKey,M.current=x.altKey,m(!0),o==null||o()},[a,d,f,o]),R=P.useCallback(x=>{if(f||!u||!x.currentTarget.hasPointerCapture(x.pointerId))return;const E=x.clientX-v.current;if(Math.abs(E)>p&&(y.current=!0),!y.current)return;x.preventDefault(),x.stopPropagation();const Y=b.current!==x.shiftKey,de=M.current!==x.altKey;if(Y||de){const $=z(b.current,M.current),B=h.current+E*$;h.current=B,v.current=x.clientX,b.current=x.shiftKey,M.current=x.altKey}const ae=z(x.shiftKey,x.altKey);let W=h.current+E*ae;s!==void 0&&(W=Math.max(s,W)),l!==void 0&&(W=Math.min(l,W));const S=d?d.fromDisplay(W):W;isNaN(S)||(g.current=S,t(S))},[u,f,r,s,l,d,t,z,p]),I=P.useCallback(x=>{f||(x.currentTarget.releasePointerCapture(x.pointerId),T.current=null,m(!1),g.current=null,i==null||i())},[f,i]),A=P.useCallback(()=>{const x=!y.current;return y.current=!1,x},[]);return{isDragging:u,immediateValueRef:g,handlePointerDown:_,handlePointerMove:R,handlePointerUp:I,handleClick:A}},gn=e=>{const{value:a,mapping:t,onChange:o,onDragStart:i,onDragEnd:r,disabled:n,mapTextInput:s=!1}=e,[l,d]=P.useState(!1),[f,p]=P.useState(""),u=P.useRef(null),m=P.useRef(""),g=P.useCallback(()=>{if(n)return;d(!0);const z=s&&t?t.toDisplay(a):a,_=typeof z=="number"?parseFloat(z.toFixed(6)):z??0,R=String(_);p(R),m.current=R,setTimeout(()=>{u.current&&(u.current.focus(),u.current.select())},10)},[a,t,n,s]),v=P.useCallback(()=>{const z=m.current;let _;if(t!=null&&t.parseInput&&s?_=t.parseInput(z):(_=parseFloat(z),isNaN(_)&&(_=null)),_!==null){const R=s&&t?t.fromDisplay(_):_;i==null||i(),o(R),r==null||r()}d(!1)},[t,o,i,r,s]),h=P.useCallback(()=>{d(!1)},[]),y=P.useCallback(z=>{p(z),m.current=z},[]),b=P.useCallback(z=>{z.key==="Enter"?(z.preventDefault(),v()):z.key==="Escape"&&(z.preventDefault(),h()),z.key!=="Tab"&&z.stopPropagation()},[v,h]),M=P.useCallback(()=>{l||g()},[l,g]),T=P.useCallback(()=>{l&&v()},[l,v]);return{isEditing:l,inputValue:f,inputRef:u,startEditing:g,commitEdit:v,cancelEdit:h,handleInputChange:y,handleKeyDown:b,handleFocus:M,handleBlur:T}},Da=e=>e===0||Math.abs(e)<1e-9?"0":parseFloat(e.toFixed(8)).toString(),ca={toDisplay:e=>e/Math.PI,fromDisplay:e=>e*Math.PI,format:e=>{const a=e/Math.PI,t=Math.abs(a),o=a<0?"-":"";if(t<.001)return"0";if(Math.abs(t-1)<.001)return`${o}π`;if(Math.abs(t-.5)<.001)return`${o}π/2`;if(Math.abs(t-.25)<.001)return`${o}π/4`;if(Math.abs(t-.75)<.001)return`${o}3π/4`;if(Math.abs(t-2)<.001)return`${o}2π`;const i=Math.round(t*3);if(Math.abs(t-i/3)<.001&&i!==0){if(i===1)return`${o}π/3`;if(i===2)return`${o}2π/3`;if(i===3)return`${o}π`;if(i===4)return`${o}4π/3`;if(i===5)return`${o}5π/3`}return`${o}${t.toFixed(2)}π`},parseInput:e=>{const a=e.trim().toLowerCase().replace(/\s/g,"");if(a==="π"||a==="pi")return Math.PI;if(a==="-π"||a==="-pi")return-Math.PI;if(a.includes("π")||a.includes("pi")){const o=a.replace(/[πpi]/g,"");if(o.includes("/")){const[n,s]=o.split("/").map(d=>parseFloat(d)||1);return(a.startsWith("-")?-1:1)*(Math.abs(n)/s)*Math.PI}const i=o?parseFloat(o):1;return isNaN(i)?null:(a.startsWith("-")?-1:1)*Math.abs(i)*Math.PI}const t=parseFloat(a);return isNaN(t)?null:t}},Ve={toDisplay:e=>e*(180/Math.PI),fromDisplay:e=>e*(Math.PI/180),format:e=>`${(e*(180/Math.PI)).toFixed(1)}°`,parseInput:e=>{const a=e.trim().replace(/°/g,""),t=parseFloat(a);return isNaN(t)?null:t}},La=(e,a,t,o)=>{const i=o?o.toDisplay(e):e,r=o?o.toDisplay(a):a,n=o?o.toDisplay(t):t;return Math.max(0,Math.min(100,(i-r)/(n-r)*100))},st=({value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i=.01,sensitivity:r=1,min:n,max:s,hardMin:l,hardMax:d,mapping:f,format:p,mapTextInput:u,disabled:m=!1,highlight:g=!1,liveValue:v,defaultValue:h,onImmediateChange:y})=>{const b=pe.useRef(null),M=pe.useCallback(G=>p?p(G):f!=null&&f.format?f.format(G):Da(G),[p,f]),{isDragging:T,immediateValueRef:z,handlePointerDown:_,handlePointerMove:R,handlePointerUp:I,handleClick:A}=hn({value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i,sensitivity:r,hardMin:l,hardMax:d,mapping:f,disabled:m}),x=pe.useCallback(G=>{R(G);const j=z.current;j!==null&&(b.current&&(b.current.textContent=M(j)),y==null||y(j))},[R,z,M,y]),{isEditing:E,inputValue:Y,inputRef:de,startEditing:ae,handleInputChange:W,handleKeyDown:S,handleBlur:$}=gn({value:e,mapping:f,onChange:a,onDragStart:t,onDragEnd:o,disabled:m,mapTextInput:u}),B=pe.useMemo(()=>M(e),[e,M]),fe=pe.useCallback(()=>{!m&&!E&&ae()},[m,E,ae]),oe=pe.useCallback(G=>{if(m)return;A()&&ae()},[m,A,ae]),J=`
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${m?"cursor-not-allowed opacity-50 text-gray-600":"cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50"}
        ${T?"bg-cyan-500/20 text-cyan-300":(T||g||v!==void 0&&!m)&&!m?"text-cyan-400":m?"":"text-gray-300 hover:text-white"}
    `;return E?c.jsx("input",{ref:de,type:"text",value:Y,onChange:G=>W(G.target.value),onBlur:$,onKeyDown:S,className:"w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1",onClick:G=>G.stopPropagation(),autoFocus:!0}):c.jsx("div",{ref:b,"data-role":"value",tabIndex:m?-1:0,onPointerDown:_,onPointerMove:x,onPointerUp:I,onClick:oe,onFocus:fe,className:J,title:m?"Disabled":"Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)",children:B})},yn=({value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i=.01,min:r,max:n,hardMin:s,hardMax:l,mapping:d,format:f,overrideText:p,mapTextInput:u,label:m,labelSuffix:g,headerRight:v,showTrack:h=!0,trackPosition:y="below",trackHeight:b=20,variant:M="full",className:T="",defaultValue:z,onReset:_,liveValue:R,showLiveIndicator:I=!0,onContextMenu:A,dataHelpId:x,disabled:E=!1,highlight:Y=!1})=>{const de=pe.useRef(null),ae=pe.useRef(null),W=pe.useRef(null),S=r!==void 0&&n!==void 0&&r!==n,$=pe.useMemo(()=>{if(!S)return 0;const Z=d?d.toDisplay(e):e,ne=d?d.toDisplay(r):r,Q=d?d.toDisplay(n):n;return Math.max(0,Math.min(100,(Z-ne)/(Q-ne)*100))},[e,r,n,d,S]),B=pe.useMemo(()=>{if(!S||R===void 0)return 0;const Z=d?d.toDisplay(R):R,ne=d?d.toDisplay(r):r,Q=d?d.toDisplay(n):n;return Math.max(0,Math.min(100,(Z-ne)/(Q-ne)*100))},[R,r,n,d,S]),fe=pe.useMemo(()=>{if(!S||z===void 0)return null;const Z=d?d.toDisplay(z):z,ne=d?d.toDisplay(r):r,Q=d?d.toDisplay(n):n;return(Z-ne)/(Q-ne)*100},[z,r,n,d,S]),oe=pe.useCallback(Z=>S?La(Z,r,n,d):0,[S,r,n,d]),O=pe.useCallback(Z=>{const Q=`${oe(Z)}%`;de.current&&(de.current.style.width=Q),ae.current&&(ae.current.style.width=Q),W.current&&(W.current.value=String(d?d.toDisplay(Z):Z))},[oe,d]),J=pe.useCallback(Z=>{if(E)return;const ne=parseFloat(Z.target.value),Q=d?d.fromDisplay(ne):ne;a(Q)},[E,d,a]),G=pe.useCallback(()=>{z!==void 0&&!E&&(t==null||t(),a(z),o==null||o(),_==null||_())},[z,E,a,t,o,_]),j=Y||R!==void 0,U=M==="compact";return M==="minimal"?c.jsx("div",{className:T,children:c.jsx(st,{value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i,hardMin:s,hardMax:l,mapping:d,format:p?()=>p:f,mapTextInput:u,defaultValue:z,disabled:E,highlight:j,onImmediateChange:O})}):U?c.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${E?"opacity-70 pointer-events-none":""} ${T}`,onContextMenu:A,"data-help-id":x,children:[c.jsx("div",{className:"absolute inset-0 bg-white/[0.12]",style:E?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"}}),h&&S&&c.jsx("div",{ref:de,"data-role":"fill",className:`absolute top-0 bottom-0 left-0 pointer-events-none ${E?"bg-gray-500/20":j?"bg-cyan-500/30":"bg-cyan-500/20"}`,style:{width:`${$}%`}}),I&&R!==void 0&&!E&&S&&c.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${B}% - 0.75px)`}}),c.jsx("div",{className:"absolute inset-0",children:c.jsx(st,{value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i,hardMin:s,hardMax:l,mapping:d,format:p?()=>p:f,mapTextInput:u,defaultValue:z,disabled:E,highlight:j,onImmediateChange:O})}),j&&!E&&c.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 pointer-events-none"})]}):c.jsxs("div",{className:`mb-px animate-slider-entry ${E?"opacity-70 pointer-events-none":""} ${T}`,"data-help-id":x,onContextMenu:A,children:[m&&c.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[v,c.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${E?"text-gray-600":"text-gray-400"}`,children:[m,g,R!==void 0&&!E&&c.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"})]})]}),c.jsx("div",{className:"w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none",style:E?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},children:c.jsx(st,{value:e,onChange:a,onDragStart:t,onDragEnd:o,step:i,hardMin:s,hardMax:l,mapping:d,format:p?()=>p:f,mapTextInput:u,defaultValue:z,disabled:E,highlight:j,onImmediateChange:O})})]}),h&&S&&c.jsxs("div",{className:"relative flex items-center touch-none overflow-hidden",style:{touchAction:"none",height:b},children:[c.jsx("input",{ref:W,type:"range",min:d?d.toDisplay(r):r,max:d?d.toDisplay(n):n,step:i,value:d?d.toDisplay(e):e,onChange:J,disabled:E,onPointerDown:Z=>{E||(Z.stopPropagation(),t==null||t())},onPointerUp:()=>{E||o==null||o()},className:`precision-slider w-full h-full appearance-none cursor-pointer focus:outline-none z-10 ${j&&!E?"accent-cyan-500":"accent-gray-400"}`,style:{background:"transparent",touchAction:"none"},tabIndex:-1}),c.jsxs("div",{className:"absolute inset-0 bg-white/10 pointer-events-none",children:[c.jsx("div",{ref:ae,className:`absolute top-0 bottom-0 left-0 ${E?"bg-gray-400/20":"bg-cyan-500/30"}`,style:{width:`${$}%`}}),I&&R!==void 0&&!E&&c.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${B}% - 0.75px)`}})]}),fe!==null&&c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2",style:{left:`${fe}%`}}),c.jsx("button",{onClick:Z=>{Z.preventDefault(),Z.stopPropagation(),G()},className:"absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10",title:`Reset to ${z}`,"aria-label":"Reset to default",tabIndex:-1})]})]})]})},bn=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],da=e=>e.includes("red")?{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("green")?{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("amber")||e.includes("yellow")?{on:"bg-amber-500/30 text-amber-300 border-amber-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("purple")?{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:{on:"bg-cyan-500/30 text-cyan-300 border-cyan-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"};function _l({label:e,value:a,onChange:t,options:o,color:i="bg-cyan-600",onLfoToggle:r,isLfoActive:n,icon:s,disabled:l=!1,variant:d="default",labelSuffix:f,onContextMenu:p,...u}){const m=h=>{l||t(h)},g=()=>{l||t(!a)},v=da(i);if(d==="dense"&&!o&&typeof a=="boolean"){const h=da(i);return c.jsxs("div",{className:`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${l?"opacity-50 pointer-events-none":"cursor-pointer"}`,"data-help-id":u["data-help-id"],onContextMenu:p,onClick:g,children:[c.jsxs("div",{className:"flex items-center gap-2",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none",children:e})]}),c.jsx("div",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border ${a?h.on:h.off} ${l?"":"hover:brightness-125"}`,children:a?"ON":"OFF"})]})}return o?c.jsxs("div",{className:`mb-px animate-slider-entry ${l?"opacity-50 pointer-events-none":""}`,"data-help-id":u["data-help-id"],onContextMenu:p,children:[e&&c.jsxs("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none",children:e})]}),c.jsx("div",{className:`flex h-9 md:h-[26px] overflow-hidden ${e?"rounded-b-sm":"rounded-sm"}`,children:o.map(h=>c.jsx("button",{onClick:()=>m(h.value),disabled:l,className:`
                                flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-white/5 last:border-r-0 transition-all truncate
                                ${a===h.value?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:h.tooltip||h.label,children:h.label},String(h.value)))})]}):c.jsx("div",{className:`mb-px animate-slider-entry ${l?"opacity-50 pointer-events-none":""}`,"data-help-id":u["data-help-id"],onContextMenu:p,children:c.jsxs("div",{className:`group/toggle flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm transition-colors ${e?"bg-white/[0.12]":""} ${l?"":"cursor-pointer hover:bg-white/[0.18]"}`,onClick:g,children:[e&&c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0 select-none",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 group-hover/toggle:text-gray-300 font-medium tracking-tight truncate transition-colors",children:e}),f]}),c.jsxs("div",{className:`flex ${e?"border-l border-white/5":"flex-1"}`,children:[c.jsx("div",{className:`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${a?v.on:v.off} ${l?"opacity-40":"hover:brightness-125"}
                            ${e?"":"flex-1"}
                        `,children:c.jsx("span",{className:`text-[8px] ${a?"opacity-90":"opacity-50"}`,children:a?"ON":"OFF"})}),r&&c.jsx("button",{onClick:h=>{h.stopPropagation(),l||r()},disabled:l,className:`
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-white/5 ${n?"bg-purple-500/30 text-purple-300":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:"LFO",children:c.jsx("span",{className:`text-[8px] ${n?"opacity-90":"opacity-50"}`,children:"LFO"})})]})]})})}const Be={text:"text-cyan-400",textSubtle:"text-cyan-600",bgSolid:"bg-cyan-900",bgMed:"bg-cyan-700",bgBright:"bg-cyan-600/40",hoverBg:"hover:bg-cyan-500/50"},Ml={bgMed:"bg-purple-700"},fa={text:"text-amber-400",bg:"bg-amber-900/20",border:"border-amber-500/20",btnBg:"bg-amber-600",btnHover:"hover:bg-amber-500",btnText:"text-black"},Oe={dock:"bg-[#080808]",tabBar:"bg-black/40",nested:"bg-black/20",divider:"bg-neutral-800",panelHeader:"bg-gray-800/80",input:"bg-gray-900",tint:"bg-white/5",hoverSubtle:"hover:bg-white/5",hoverMed:"hover:bg-white/10"},we={primary:"text-white",label:"text-gray-400",dimLabel:"text-gray-500",faint:"text-gray-600",ghost:"text-gray-700"},ka={subtle:"border-white/5",standard:"border-white/10"},Cl=`${Oe.dock} ${Be.text} border-x border-t ${ka.standard} z-10 -mb-px pb-2`,Fl=`${we.dimLabel} ${Oe.hoverSubtle} hover:text-gray-300 border border-transparent`,Il=`${Be.bgSolid} ${Be.text}`,Pl=`${we.faint} ${Oe.hoverMed}`,Rl=`${Be.textSubtle}`,Tl=`${we.ghost}`,El=`${Oe.nested} p-2 rounded border ${ka.subtle}`,Al=`${fa.bg} border ${fa.border}`,Dl=`${Be.bgMed} ${we.primary}`,Ll=`${we.dimLabel} hover:text-gray-300`,kl=`${we.ghost} cursor-not-allowed opacity-50 bg-transparent`,Bl=`${Be.bgBright} text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]`,Ol=`bg-transparent ${we.dimLabel} hover:text-gray-300 ${Oe.hoverSubtle}`,xn={primary:`text-[10px] font-bold ${we.label}`,secondary:`text-[9px] font-bold ${we.dimLabel}`,tiny:`text-[8px] ${we.faint}`},vn=({children:e,variant:a="primary",className:t="",color:o})=>{const i=xn[a],r=o||"";return c.jsx("span",{className:`${i} ${r} select-none ${t}`,children:e})},jl=()=>c.jsxs(c.Fragment,{children:[c.jsx("div",{className:`h-1.5 ${Oe.divider} rounded-b-lg`}),c.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]});function Nl({label:e,value:a,options:t,onChange:o,fullWidth:i,className:r="",selectClassName:n="",labelSuffix:s,onContextMenu:l,disabled:d=!1,...f}){const p=u=>{var v;const m=u.target.value,g=typeof((v=t[0])==null?void 0:v.value)=="number";o(g?Number(m):m)};return c.jsxs("div",{className:`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${i?"w-full":""} ${d?"opacity-50 pointer-events-none":""} ${r}`,"data-help-id":f["data-help-id"],onContextMenu:l,children:[e&&c.jsx("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:c.jsxs("label",{className:"text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400",children:[e,s]})}),c.jsxs("div",{className:`${e?"w-1/2":"w-full"} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`,children:[c.jsx("select",{value:a,onChange:p,disabled:d,className:`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${n}`,children:t.map(u=>c.jsx("option",{value:String(u.value),className:"bg-[#111] text-gray-300",children:u.label},String(u.value)))}),c.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",children:c.jsx("div",{className:"w-2.5 h-2.5",children:c.jsx(mn,{})})})]})]})}const Se=({axisIndex:e,value:a,min:t,max:o,step:i,onUpdate:r,onDragStart:n,onDragEnd:s,disabled:l,highlight:d,mapping:f,mapTextInput:p,liveValue:u,defaultValue:m,hardMin:g,hardMax:v,customLabel:h})=>{const y=bn[e],b=h||y.label;return c.jsxs("div",{"data-axis-index":e,className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${l?"opacity-50 pointer-events-none":""}`,children:[c.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:M=>{M.preventDefault(),M.stopPropagation(),m!==void 0&&(n==null||n(),r(m),s==null||s())},title:m!==void 0?`Double-click to reset to ${m}`:"No default value",children:c.jsx("span",{className:`text-[10px] font-bold ${y.text} pointer-events-none`,children:b})}),c.jsx("div",{className:"absolute inset-0 left-5",children:c.jsx(yn,{value:a,onChange:r,onDragStart:n,onDragEnd:s,step:i,min:t,max:o,hardMin:g,hardMax:v,mapping:f,mapTextInput:p,disabled:l,highlight:d,liveValue:u,defaultValue:m,variant:"compact",showTrack:!0})})]})},pa=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],Xe=({primaryAxis:e,secondaryAxis:a,primaryIndex:t,secondaryIndex:o,primaryValue:i,secondaryValue:r,min:n,max:s,step:l,onUpdate:d,onDragStart:f,onDragEnd:p,disabled:u,onHover:m})=>{const[g,v]=P.useState(!1),h=P.useRef(!1),y=P.useRef(!1),b=P.useRef({x:0,y:0}),M=P.useRef({primary:0,secondary:0}),T=P.useRef(!1),z=P.useRef(!1),_=P.useRef(!1),R=pa[t],I=pa[o],A=()=>{v(!0),m(!0)},x=()=>{h.current||(v(!1),m(!1))},E=S=>{u||S.button!==0&&S.button!==1||(S.preventDefault(),S.stopPropagation(),S.currentTarget.setPointerCapture(S.pointerId),b.current={x:S.clientX,y:S.clientY},M.current={primary:i,secondary:r},T.current=!1,z.current=S.shiftKey,_.current=S.altKey,h.current=!0,y.current=S.button===1,f())},Y=S=>{if(u||!h.current||!S.currentTarget.hasPointerCapture(S.pointerId))return;const $=S.clientX-b.current.x,B=S.clientY-b.current.y;if((Math.abs($)>1||Math.abs(B)>1)&&(T.current=!0),!T.current&&Math.abs($)<1&&Math.abs(B)<1)return;S.preventDefault(),S.stopPropagation();const fe=z.current!==S.shiftKey,oe=_.current!==S.altKey;if(fe||oe){let O=l*.5;z.current&&(O*=10),_.current&&(O*=.1),M.current.primary=M.current.primary+$*O,M.current.secondary=M.current.secondary-B*O,b.current={x:S.clientX,y:S.clientY},z.current=S.shiftKey,_.current=S.altKey}if(y.current){let O=.01;S.shiftKey&&(O*=3),S.altKey&&(O*=.3);const J=1+B*O;let G=M.current.primary*J,j=M.current.secondary*J;!isNaN(G)&&!isNaN(j)&&d(G,j)}else{let O=l*.5;S.shiftKey&&(O*=10),S.altKey&&(O*=.1);let J=M.current.primary+$*O,G=M.current.secondary-B*O;!isNaN(J)&&!isNaN(G)&&d(J,G)}},de=S=>{u||(S.currentTarget.releasePointerCapture(S.pointerId),h.current=!1,y.current=!1,p(),T.current=!1,S.currentTarget.matches(":hover")||(v(!1),m(!1)))},ae=S=>{u||(S.preventDefault(),S.stopPropagation(),f(),d(0,0),p())},W=g||h.current;return c.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${W?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${u?"opacity-30 pointer-events-none":""}
            `,onPointerDown:E,onPointerMove:Y,onPointerUp:de,onMouseEnter:A,onMouseLeave:x,onDoubleClick:ae,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${a.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[W&&c.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),c.jsxs("div",{className:"relative w-full h-full",children:[c.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${R.color}
                        transition-all duration-150
                        ${W?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),c.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${I.color}
                        transition-all duration-150
                        ${W?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),c.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${W?"opacity-100":"opacity-0"}
                    `,children:[c.jsx("div",{className:`absolute w-2 h-[1px] ${R.color} -translate-x-1/2`}),c.jsx("div",{className:`absolute h-2 w-[1px] ${I.color} -translate-y-1/2`})]}),c.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${y.current?"opacity-100":"opacity-0"}
                    `,children:c.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[c.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),c.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},ua=({azimuth:e,pitch:a,onChange:t,onDragStart:o,onDragEnd:i,disabled:r=!1,size:n=80})=>{const s=P.useRef(null),l=P.useRef(!1),[d,f]=P.useState(!1),[p,u]=P.useState(!1),[m,g]=P.useState(!1),v=P.useRef({x:0,y:0}),h=P.useRef({azimuth:e,pitch:a}),y=P.useRef({azimuth:e,pitch:a}),b=P.useRef(null);P.useEffect(()=>{h.current={azimuth:e,pitch:a}},[e,a]);const z=p?.05:.5,_=n/2,R=n*.38,I=P.useCallback((S,$,B)=>{const fe=S/(Math.PI/2)*B,oe=-($/(Math.PI/2))*B;return{x:fe,y:oe}},[]),A=P.useMemo(()=>I(e,a,R),[e,a,R,I]),x=P.useMemo(()=>{const S=Math.cos(a),$=Math.sin(a),B=Math.cos(e),oe=Math.sin(e)*S,O=$,J=-B*S,G=oe,j=-O,U=Math.sqrt(G*G+j*j),re=J>0,Ae=U>.001?Math.min(U,1)*R:0,Z=J<=0?1+(1-Math.min(U,1))*.5:1-J*.95,ne=U>.001?G/U*Ae:0,Q=U>.001?j/U*Ae:0;return{x:ne,y:Q,isBack:re,length:Ae,headScale:Z,dirX:oe,dirY:O,dirZ:J}},[e,a,R]),E=P.useCallback((S,$,B)=>{const fe=S/B*(Math.PI/2),oe=-($/B)*(Math.PI/2);return{azimuth:fe,pitch:oe}},[]),Y=P.useCallback((S,$)=>{let B=S,fe=$;m&&b.current&&(b.current==="x"?fe=0:B=0);const oe=B*z,O=fe*z,J=I(h.current.azimuth,h.current.pitch,R),G=J.x+oe,j=J.y+O,{azimuth:U,pitch:re}=E(G,j,R);m&&b.current?b.current==="x"?(h.current={azimuth:U,pitch:y.current.pitch},t(U,y.current.pitch)):(h.current={azimuth:y.current.azimuth,pitch:re},t(y.current.azimuth,re)):(h.current={azimuth:U,pitch:re},t(U,re))},[I,E,t,R,z,m]),de=S=>{r||S.button===0&&(S.preventDefault(),S.stopPropagation(),S.currentTarget.setPointerCapture(S.pointerId),l.current=!0,f(!0),v.current={x:S.clientX,y:S.clientY},h.current={azimuth:e,pitch:a},y.current={azimuth:e,pitch:a},b.current=null,o==null||o(),u(S.altKey),g(S.shiftKey))},ae=S=>{if(r||!l.current)return;const $=S.clientX-v.current.x,B=S.clientY-v.current.y;v.current={x:S.clientX,y:S.clientY},u(S.altKey),g(S.shiftKey),m&&!b.current&&(Math.abs($)>2||Math.abs(B)>2)&&(b.current=Math.abs($)>Math.abs(B)?"x":"y"),Y($,B)},W=S=>{l.current&&(l.current=!1,f(!1),u(!1),g(!1),b.current=null,i==null||i())};return c.jsxs("div",{ref:s,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${r?"opacity-50 pointer-events-none":""}
                ${d?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:n,height:n,touchAction:"none",boxShadow:d?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:de,onPointerMove:ae,onPointerUp:W,onPointerLeave:W,onDoubleClick:S=>{r||(S.preventDefault(),S.stopPropagation(),o==null||o(),t(0,0),i==null||i())},onContextMenu:S=>{},title:"Drag to rotate direction, Double-click to reset",children:[c.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:R*2,height:R*2,left:_-R,top:_-R}}),c.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:_}}),c.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:_}}),c.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:_-3,top:_-3}}),c.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:_+A.x,top:_+A.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:x.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${x.isBack?"#ef4444":"#22d3ee"}`,transform:d?"scale(1.2)":"scale(1)"}}),x.isBack&&c.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),c.jsxs(c.Fragment,{children:[c.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:n,height:n},children:[Math.abs(e)>.01&&c.jsxs(c.Fragment,{children:[c.jsx("ellipse",{cx:_,cy:_,rx:R*Math.abs(Math.sin(e)),ry:R,fill:"none",stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:x.isBack?.175:.35,clipPath:x.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),c.jsx("ellipse",{cx:_,cy:_,rx:R*Math.abs(Math.sin(e)),ry:R,fill:"none",stroke:x.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:x.isBack?.35:.175,clipPath:x.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(a)>.01&&c.jsxs(c.Fragment,{children:[c.jsx("ellipse",{cx:_,cy:_,rx:R,ry:R*Math.abs(Math.sin(a)),fill:"none",stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:x.isBack?.15:.3,clipPath:x.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),c.jsx("ellipse",{cx:_,cy:_,rx:R,ry:R*Math.abs(Math.sin(a)),fill:"none",stroke:x.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:x.isBack?.3:.15,clipPath:x.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),c.jsxs("defs",{children:[c.jsx("clipPath",{id:"longitudeRight",children:c.jsx("rect",{x:_,y:"0",width:_,height:n})}),c.jsx("clipPath",{id:"longitudeLeft",children:c.jsx("rect",{x:"0",y:"0",width:_,height:n})}),c.jsx("clipPath",{id:"latitudeTop",children:c.jsx("rect",{x:"0",y:"0",width:n,height:_})}),c.jsx("clipPath",{id:"latitudeBottom",children:c.jsx("rect",{x:"0",y:_,width:n,height:_})})]}),c.jsx("line",{x1:_,y1:_,x2:_+x.x,y2:_+x.y,stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+x.length/R*.5}),c.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:x.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(x.headScale-1)*.4),transform:`translate(${_+x.x}, ${_+x.y}) rotate(${Math.atan2(x.y,x.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+x.headScale*.1)}, ${Math.max(.05,x.headScale)})`})]}),d&&c.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:c.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(a*180/Math.PI).toFixed(0),"°"]})})]})]})},lt=Math.PI/180,Sn=180/Math.PI,zn=["x","y","z","w"],ct={x:0,y:1,z:2,w:3},wn=e=>{const a=e.length();if(a<1e-9)return{azimuth:0,pitch:0};const t=Math.max(-1,Math.min(1,e.y/a));return{azimuth:Math.atan2(e.x/a,e.z/a),pitch:Math.asin(t)}},_n=(e,a)=>{const t=Math.cos(a);return new k(t*Math.sin(e),Math.sin(a),t*Math.cos(e))},Vl=({label:e,value:a,onChange:t,min:o=-1e4,max:i=1e4,step:r=.01,disabled:n=!1,convertRadToDeg:s=!1,mode:l="normal",modeToggleable:d=!1,showLiveIndicator:f=!1,liveValue:p,defaultValue:u,hardMin:m,hardMax:g,axisMin:v,axisMax:h,axisStep:y,onDragStart:b,onDragEnd:M,headerRight:T,showDualAxisPads:z=!0,linkable:_=!1,scale:R})=>{const[I,A]=P.useState(a.clone()),[x,E]=P.useState(null),[Y,de]=P.useState(l),[ae,W]=P.useState("degrees"),[S,$]=P.useState("degrees"),[B,fe]=P.useState(_),oe=P.useRef(!1),O=P.useRef(null),J=P.useRef(null);P.useEffect(()=>{de(l)},[l]);const G=ue(w=>w.openContextMenu),j="w"in a,U="z"in a,re=Y==="rotation",Ae=Y==="toggle",Z=Y==="mixed",ne=Y==="direction"&&U,Q=ne?wn(I):{azimuth:0,pitch:0},qe=(w,D)=>{const N=Math.max(-Math.PI/2,Math.min(Math.PI/2,D)),q=_n(w,N);ve(0,w),ve(1,N),A(q),t(q)};P.useEffect(()=>{if(oe.current)return;const w=1e-4,D=Math.abs(a.x-I.x),N=Math.abs(a.y-I.y),q=U?Math.abs(a.z-I.z):0,me=j?Math.abs(a.w-I.w):0;(D>w||N>w||q>w||me>w)&&A(a.clone())},[a,U,j]);const _e=()=>{oe.current=!0,O.current=I.clone(),b&&b()},Me=()=>{O.current=null,oe.current=!1,M&&M()},Pt=w=>{if(re)return ae==="degrees"?Ve:ca;if(R==="pi")return S==="pi"?ca:Ve;if(s)return Ve},Rt=w=>{if(re){const ee=ae==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:ee,hardMin:void 0,hardMax:void 0}}const D=v||{x:o,y:o,z:o},N=h||{x:i,y:i,z:i},q=y||{x:r,y:r,z:r},me=R==="pi"&&S==="degrees"?Sn:1;return{min:D[w],max:N[w],step:(q[w]??r)*me,hardMin:m,hardMax:g}},ve=(w,D)=>{const N=J.current;if(!N)return;const q=N.querySelector(`[data-axis-index="${w}"]`);if(!q)return;const me=zn[w],ee=Pt(),Dt=q.querySelector('[data-role="value"]');Dt&&(Dt.textContent=ee!=null&&ee.format?ee.format(D):Da(D));const Lt=q.querySelector('[data-role="fill"]');if(Lt){const kt=Rt(me),Bt=kt.min??o,Ot=kt.max??i;if(Bt!==Ot){const Fo=La(D,Bt,Ot,ee);Lt.style.width=`${Fo}%`}}},Tt=(w,D)=>{const N=O.current||I,q=N.clone();if(B&&!re){const me=N[w],ee=D-me;q.x=N.x+ee,q.y=N.y+ee,U&&(q.z=N.z+ee),j&&(q.w=N.w+ee),ve(0,q.x),ve(1,q.y),U&&ve(2,q.z),j&&ve(3,q.w)}else q[w]=D;A(q),t(q)},Je=(w,D,N,q)=>{const ee=(O.current||I).clone();ee[w]=N,ee[D]=q,ve(ct[w],N),ve(ct[D],q),A(ee),t(ee)},go=x==="xy",yo=x==="xy"||x==="zy",bo=x==="zy"||x==="wz",xo=x==="wz",vo=w=>{if(p)return p[w]},So=w=>{if(u)return u[w]},Et=I,zo={x:go,y:yo,z:bo,w:xo},Ie=w=>({axisIndex:ct[w],value:I[w],...Rt(w),onUpdate:D=>Tt(w,D),onDragStart:_e,onDragEnd:Me,disabled:n,highlight:zo[w],mapping:Pt(),mapTextInput:re||R==="pi",liveValue:f?vo(w):void 0,defaultValue:So(w)}),wo=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],At=(w,D,N)=>{const me=I[w]>.5,ee=wo[D];return c.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${me?ee.on:ee.off} ${n?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${N||"flex-1"}`,onClick:()=>Tt(w,me?0:1),disabled:n,children:[N?null:c.jsx("span",{children:w}),c.jsx("span",{className:`text-[8px] ${me?"opacity-80":"opacity-70"}`,children:me?"ON":"OFF"})]},w)},_o=()=>d?c.jsx("button",{onClick:()=>de(w=>w==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${Y==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:Y==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,Mo=()=>!_||re?null:c.jsx("button",{onClick:()=>fe(w=>!w),className:`p-1 rounded transition-colors mr-2 ${B?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:B?"Axes linked (uniform)":"Link axes",children:c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),c.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),Co=w=>{const D=[];re&&D.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:ae==="degrees",action:()=>W("degrees")},{label:"Radians (π)",checked:ae==="radians",action:()=>W("radians")}),!re&&R==="pi"&&D.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:S==="pi",action:()=>$("pi")},{label:"Degrees (°)",checked:S==="degrees",action:()=>$("degrees")}),U&&(l==="rotation"||l==="axes")&&D.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:Y==="rotation",action:()=>de("rotation")},{label:"Per-Axis (X/Y/Z)",checked:Y==="axes"||Y==="normal",action:()=>de("normal")}),D.length!==0&&(w.preventDefault(),w.stopPropagation(),G(w.clientX,w.clientY,D,["ui.vector"]))};return c.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&c.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[d&&_o(),T,c.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${n?"text-gray-600":"text-gray-400"}`,children:e})]}),_&&!re&&c.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:Mo()})]}),c.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:Co,"data-help-id":"ui.vector",children:c.jsx("div",{ref:J,className:"flex gap-px w-full h-full",children:Ae?c.jsx(c.Fragment,{children:["x","y","z","w"].slice(0,j?4:U?3:2).map((w,D)=>At(w,D))}):Z?c.jsxs(c.Fragment,{children:[At("x",0,"w-14 flex-shrink-0"),c.jsx(Se,{...Ie("y"),disabled:n||I.x<.5})]}):ne?c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:c.jsx(ua,{azimuth:Q.azimuth,pitch:Q.pitch,onChange:(w,D)=>{qe(w,D)},onDragStart:_e,onDragEnd:Me,disabled:n,size:56})}),c.jsx(Se,{axisIndex:0,value:Q.azimuth,min:-Math.PI,max:Math.PI,step:lt,onUpdate:w=>qe(w,Q.pitch),onDragStart:_e,onDragEnd:Me,disabled:n,mapping:Ve,mapTextInput:!0,customLabel:"Az"}),c.jsx(Xe,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:Q.azimuth,secondaryValue:Q.pitch,min:-Math.PI,max:Math.PI,step:lt,onUpdate:(w,D)=>qe(w,D),onDragStart:_e,onDragEnd:Me,disabled:n,onHover:w=>E(w?"xy":null)}),c.jsx(Se,{axisIndex:1,value:Q.pitch,min:-Math.PI/2,max:Math.PI/2,step:lt,onUpdate:w=>qe(Q.azimuth,w),onDragStart:_e,onDragEnd:Me,disabled:n,mapping:Ve,mapTextInput:!0,customLabel:"Pt"})]}):re?c.jsxs(c.Fragment,{children:[U&&c.jsx(Se,{...Ie("z"),customLabel:"∠"}),c.jsx("div",{className:"flex items-center justify-center px-1",children:c.jsx(ua,{azimuth:I.x,pitch:I.y,onChange:(w,D)=>{const N=I.clone();N.x=w,N.y=D,ve(0,w),ve(1,D),A(N),t(N)},onDragStart:_e,onDragEnd:Me,disabled:n,size:56})}),c.jsx("div",{className:"contents",children:c.jsx(Se,{...Ie("x"),customLabel:"A"})}),c.jsx(Se,{...Ie("y"),customLabel:"P"})]}):c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"contents",children:c.jsx(Se,{...Ie("x")})}),z&&c.jsx(Xe,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:I.x,secondaryValue:I.y,min:o,max:i,step:r,onUpdate:(w,D)=>Je("x","y",w,D),onDragStart:_e,onDragEnd:Me,disabled:n,onHover:w=>E(w?"xy":null)}),c.jsx(Se,{...Ie("y")}),U&&z&&c.jsx(Xe,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:Et.z,secondaryValue:Et.y,min:o,max:i,step:r,onUpdate:(w,D)=>Je("z","y",w,D),onDragStart:_e,onDragEnd:Me,disabled:n,onHover:w=>E(w?"zy":null)}),U&&c.jsx(Se,{...Ie("z")}),j&&z&&c.jsx(Xe,{primaryAxis:"x",secondaryAxis:"z",primaryIndex:3,secondaryIndex:2,primaryValue:I.w,secondaryValue:I.z,min:o,max:i,step:r,onUpdate:(w,D)=>Je("w","z",w,D),onDragStart:_e,onDragEnd:Me,disabled:n,onHover:w=>E(w?"wz":null)}),j&&c.jsx(Se,{...Ie("w")})]})})})]})},Mn={default:"",panel:"px-2 py-0.5 text-[9px] font-bold text-gray-500 hover:text-gray-300 bg-neutral-800 rounded-sm"},Cn=({open:e})=>c.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:c.jsx("path",{d:"M0 0l6 5-6 5z"})}),Hl=({label:e,children:a,defaultOpen:t=!0,count:o,labelVariant:i="secondary",labelColor:r,rightContent:n,className:s="",headerClassName:l="",variant:d="default",open:f,onToggle:p})=>{const u=l||Mn[d],[m,g]=P.useState(t),v=f!==void 0,h=v?f:m,y=()=>{p&&p(),v||g(b=>!b)};return c.jsxs("div",{className:s,children:[c.jsxs("div",{className:`flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-white/5 transition-colors rounded-sm ${u}`,children:[c.jsxs("button",{onClick:y,className:"flex items-center gap-1.5 flex-1 min-w-0",children:[c.jsx(Cn,{open:h}),c.jsx(vn,{variant:i,color:r,children:e}),o!==void 0&&c.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-1",children:o})]}),n&&c.jsx("div",{className:"ml-auto flex items-center gap-1",children:n})]}),h&&a]})},Fn=`
  /*
   * --- GMT SHADER API REFERENCE ---
   *
   * Scalar Parameters (float uniforms — mapped to UI sliders):
   *   uParamA, uParamB, uParamC, uParamD, uParamE, uParamF
   *
   * Vector Parameters (mapped to multi-axis UI controls):
   *   vec2 uVec2A, uVec2B, uVec2C
   *   vec3 uVec3A, uVec3B, uVec3C
   *   vec4 uVec4A, uVec4B, uVec4C
   *
   * System Uniforms:
   *   int   uIterations      — Iteration count (user-adjustable)
   *   float uTime            — Elapsed time in seconds
   *   vec3  uJulia           — Julia seed coordinates (if Julia mode active)
   *   float uJuliaMode       — 1.0 if Julia mode active, 0.0 otherwise
   *   float uDistanceMetric  — 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
   *
   * Built-in Helper Functions:
   *   void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
   *   void  boxFold(inout vec3 z, inout float dz, float foldLimit)
   *   float snoise(vec3 v)                — Simplex Noise (-1.0 to 1.0)
   *   float getLength(vec3 p)             — Distance metric (respects uDistanceMetric)
   *
   * Rotation Helpers (branchless, CPU-precomputed matrices):
   *   void applyPreRotation(inout vec3 p)   — Applied inside loop, before formula
   *   void applyPostRotation(inout vec3 p)  — Applied inside loop, after formula
   *   void applyWorldRotation(inout vec3 p) — Applied before iteration loop
   *
   * Formula Function Signature:
   *   void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
   *     z    : Current coordinate (.xyz = position, .w = auxiliary)
   *     dr   : Running derivative (float) — used for distance estimation
   *     trap : Orbit trap accumulator (float) — used for coloring
   *     c    : Constant for the fractal (Julia seed or initial position)
   *
   * To modify this formula, edit the GLSL blocks below directly.
   * The Metadata JSON block configures parameter names, ranges, and defaults.
   */
`,Ba=e=>JSON.stringify(e,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,a=>a.includes('"id": "param')?a.replace(/\n\s+/g," "):a).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,a=>a.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,a=>a.replace(/\n\s+/g," ")),He=e=>{const a=e.split(`
`);for(;a.length>0&&a[0].trim()==="";)a.shift();for(;a.length>0&&a[a.length-1].trim()==="";)a.pop();if(a.length===0)return"";if(a.length===1)return a[0].trim();let t=1/0;for(const o of a){if(o.trim().length===0)continue;const i=o.match(/^(\s*)/);i&&(t=Math.min(t,i[1].length))}return t===0||t===1/0?a.join(`
`):a.map(o=>o.slice(t)).join(`
`)},In=(e,a)=>{var s;const{shader:t,...o}=e,i={};(s=t.preambleVars)!=null&&s.length&&(i.preambleVars=t.preambleVars),t.usesSharedRotation&&(i.usesSharedRotation=!0);const r={...o,...Object.keys(i).length>0?{shaderMeta:i}:{},defaultPreset:a};let n=`<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${Fn}
`;return n+=`<Metadata>
${Ba(r)}
</Metadata>

`,t.preamble&&(n+=`<!-- Global scope code: variables and helper functions (before formula) -->
`,n+=`<Shader_Preamble>
${He(t.preamble)}
</Shader_Preamble>

`),t.loopInit&&(n+=`<!-- Code executed once before the loop (Setup) -->
`,n+=`<Shader_Init>
${He(t.loopInit)}
</Shader_Init>

`),n+=`<!-- Main Distance Estimator Function -->
`,n+=`<Shader_Function>
${He(t.function)}
</Shader_Function>

`,n+=`<!-- The Iteration Loop Body -->
`,n+=`<Shader_Loop>
${He(t.loopBody)}
</Shader_Loop>

`,t.getDist&&(n+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,n+=`<Shader_Dist>
${He(t.getDist)}
</Shader_Dist>

`),n},Pn=e=>{const a=f=>{const p=new RegExp(`<${f}>([\\s\\S]*?)<\\/${f}>`),u=e.match(p);return u?u[1].trim():null},t=a("Metadata");if(!t){try{const f=JSON.parse(e);if(f.id&&f.shader)return f}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const o=JSON.parse(t),i=a("Shader_Preamble"),r=a("Shader_Function"),n=a("Shader_Loop"),s=a("Shader_Init"),l=a("Shader_Dist");if(!r||!n)throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");const d={function:r,loopBody:n,preamble:i||void 0,loopInit:s||void 0,getDist:l||void 0};return o.shaderMeta&&(o.shaderMeta.preambleVars&&(d.preambleVars=o.shaderMeta.preambleVars),o.shaderMeta.usesSharedRotation&&(d.usesSharedRotation=!0),delete o.shaderMeta),{...o,shader:d}},Rn=e=>{const a=e.trimStart();return a.startsWith("<!--")||a.startsWith("<Metadata>")},$l=e=>{const a=te.get(e.formula);if(!a)return JSON.stringify(e,null,2);let t=In(a,a.defaultPreset);return t+=`<!-- Full scene state (camera, lights, features, quality, animations) -->
`,t+=`<Scene>
${Ba(e)}
</Scene>
`,t},Gl=e=>{if(Rn(e)){const t=Pn(e),o=e.match(/<Scene>([\s\S]*?)<\/Scene>/);if(o){const r=JSON.parse(o[1].trim());return{def:t,preset:r}}const i=t.defaultPreset||{formula:t.id};return i.formula||(i.formula=t.id),{def:t,preset:i}}return{preset:JSON.parse(e)}},yt={id:"Mandelbulb",name:"Mandelbulb",shortDescription:"The classic 3D extension of the Mandelbrot set. Features organic, broccoli-like recursive structures.",description:'The classic 3D extension of the Mandelbrot set. Features standard Power controls plus the "Radiolaria" mutation for skeletal/hollow effects.',juliaType:"julia",shader:{function:`
        void formula_Mandelbulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            // Standard derivative — reuse pow(r, power-1) for both dr and zr
            float power = uParamA;
            float rp1 = pow(r, power - 1.0);
            dr = rp1 * power * dr + 1.0;

            // Spherical exponentiation
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);

            // Apply Power & Phase Shifts
            theta = theta * power + uVec2A.x;
            phi = phi * power + uVec2A.y;

            float zr = rp1 * r;
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            
            // Optional Z-Twist (Param D)
            if (abs(uParamD) > 0.001) {
                float twist = z3.z * uParamD;
                float s = sin(twist);
                float c_ = cos(twist);
                z3.xy = mat2(c_, -s, s, c_) * z3.xy;
            }

            z3 += c.xyz;
            
            // --- RADIOLARIA MUTATION (Tom Beddard) ---
            // Applied AFTER iteration to affect the triplex structure, not the world bounding box.
            // vec2B.x = toggle (on/off), vec2B.y = limit value
            if (uVec2B.x > 0.5) {
                z3.y = min(z3.y, uVec2B.y);
            }
            
            z.xyz = z3;
            trap = min(trap, length(z3));
        }`,loopBody:"formula_Mandelbulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.001,default:8},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"},{label:"Z Twist",id:"paramD",min:-2,max:2,step:.01,default:0},{label:"Radiolaria",id:"vec2B",type:"vec2",min:-2,max:2,step:.01,default:{x:0,y:.5},mode:"mixed"}],defaultPreset:{formula:"Mandelbulb",features:{coreMath:{iterations:16,paramA:8,paramD:0,vec2A:{x:0,y:0},vec2B:{x:0,y:.5}},geometry:{hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1,hybridSwap:!1,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:0,repeats:2,phase:0,scale:1,offset:0,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},ao:{aoIntensity:.28,aoSpread:.5,aoMode:!1,aoEnabled:!0,aoSamples:5,aoStochasticCp:!0},materials:{reflection:.2,specular:1,roughness:.75,diffuse:1,envStrength:.3,rim:0,rimExponent:3,emission:0,emissionMode:0,emissionColor:"#ffffff",envMapVisible:!1,useEnvMap:!0,envSource:1,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:1,fudgeFactor:1,pixelThreshold:.2,maxSteps:300,distanceMetric:0,estimator:0},optics:{dofStrength:0,dofFocus:2},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1}},cameraPos:{x:0,y:0,z:2.157},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.157},targetDistance:2.157,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.7,y:.37,z:1.4},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!1}]}},Oa={id:"Mandelbar3D",name:"Mandelbar 3D",shortDescription:"The 3D Tricorn. Features heavy shelving and tri-corner symmetry.",description:"The 3D extension of the Tricorn (Mandelbar) fractal: x²-y²-z², 2xy, -2xz. The conjugation on z creates the distinctive tri-corner symmetry. Supports rotation, offset, and twist.",juliaType:"julia",shader:{function:`
    void formula_Mandelbar3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = -2.0 * x * z_;

        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;

        // Scale (A)
        float scale = uParamA;
        z3 = z3 * scale + c.xyz;

        // Vec3A: Offset X/Y/Z
        z3 += uVec3A;

        dr *= abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_Mandelbar3D(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Mandelbar3D",features:{coreMath:{iterations:26,paramA:1.303,paramF:0,vec3A:{x:.309,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:0,scale:1,offset:0,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766240207225_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1766240207225_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1766240207225_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1766240207225_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1766240207225_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1766240207225_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1766240207225_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:1,glowColor:"#ffffff",glowMode:!1,aoIntensity:.37,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.38,diffuse:0,envStrength:0,rim:0,rimExponent:2,emission:2.59,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.04,juliaY:-.12,juliaZ:-.24},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.17,fudgeFactor:.7,pixelThreshold:.13,aaMode:"Auto",aaLevel:1}},cameraPos:{x:-.9750951483888902,y:.4967096298390524,z:-1.878572142465631},cameraRot:{x:-.35319547668295764,y:.8984954585062485,z:.19510512782513617,w:-.17289550425237224},sceneOffset:{x:0,y:0,z:0,xL:-.003768067067355675,yL:.19239495665458275,zL:-.5314800136479048},lights:[{type:"Point",position:{x:-.34,y:.2,z:1.76},rotation:{x:0,y:0,z:0},color:"#F0F0FF",useTemperature:!0,temperature:6500,intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},ja={id:"Quaternion",name:"Quaternion",shortDescription:'A 3D slice of a 4D Julia set. Use the "Slice W" and Rotations to morph the object.',description:"A 4D Julia set projected into 3D. Features 4D rotations, iteration damping for smooth variants, and optional spherical inversion (Kosalos) for inside-out effects.",juliaType:"julia",shader:{function:`
    vec4 quatSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w);
    }

    void formula_Quaternion(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // 3D Rotations (vec2A: XY, XZ)
        float angXY = uVec2A.x;
        if (abs(angXY) > 0.0) {
            float s = sin(angXY), c_ = cos(angXY);
            z.xy = mat2(c_, -s, s, c_) * z.xy;
        }

        float angXZ = uVec2A.y;
        if (abs(angXZ) > 0.0) {
            float s = sin(angXZ), c_ = cos(angXZ);
            z.xz = mat2(c_, -s, s, c_) * z.xz;
        }

        // 4D Rotations (vec2B: XW, YW)
        float angXW = uVec2B.x;
        if (abs(angXW) > 0.0) {
            float s = sin(angXW), c_ = cos(angXW);
            vec2 xw = vec2(z.x, z.w);
            xw = mat2(c_, -s, s, c_) * xw;
            z.x = xw.x; z.w = xw.y;
        }

        float angYW = uVec2B.y;
        if (abs(angYW) > 0.0) {
            float s = sin(angYW), c_ = cos(angYW);
            vec2 yw = vec2(z.y, z.w);
            yw = mat2(c_, -s, s, c_) * yw;
            z.y = yw.x; z.w = yw.y;
        }

        // Save pre-iteration state for damping
        vec4 oldZ = z;

        // Chain Rule: Magnitude increases by 2*|z| + 1 (from +c)
        dr = 2.0 * length(z) * dr + 1.0;
        z = quatSquare(z) + c;

        // Iteration Damping (Kosalos variant)
        // Adds momentum feedback: smooths iteration trajectory
        if (abs(uParamC) > 0.001) {
            float den = 2.0 + abs(uParamC) * 100.0;
            z += (z - oldZ) / den;
        }

        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Quaternion(z, dr, trap, c);",loopInit:`
        // Spherical Inversion pre-transform (Kosalos variant)
        // Inverts space around a center point, creating inside-out shapes
        // Smooth blend: mix between original and inverted based on radius
        if (uParamD > 0.001) {
            vec3 invCenter = uVec3A;
            float invRadius = uParamD;
            float invAngle = uParamE;
            vec3 offset = z.xyz - invCenter;
            float r = length(offset);
            float r2 = max(r * r, 1.0e-8);
            vec3 inverted = (invRadius * invRadius / r2) * offset + invCenter;
            // Smooth blend: ramp from 0..1 over radius 0..1 to avoid hard pop
            float blend = smoothstep(0.0, 1.0, invRadius);
            z.xyz = mix(z.xyz, inverted, blend);
            // Optional angular twist
            if (abs(invAngle) > 0.001) {
                float an = atan(z.y, z.x) + invAngle;
                float ra = length(z.xy);
                z.x = cos(an) * ra;
                z.y = sin(an) * ra;
            }
            // Re-derive c after inversion (position changed)
            c = mix(vec4(z.xyz, uParamB), vec4(uJulia, uParamA), step(0.5, uJuliaMode));
        }`},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.252},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:-.222},{label:"Damping",id:"paramC",min:0,max:5,step:.01,default:0},{label:"Inversion Radius",id:"paramD",min:0,max:10,step:.01,default:0},{label:"Inversion Angle",id:"paramE",min:-10,max:10,step:.01,default:0},{label:"Rot 3D (XY, XZ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-6.44,y:.29},scale:"pi"},{label:"Rot 4D (XW, YW)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-.21,y:.05},scale:"pi"},{label:"Inversion Center",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:.612,y:.381,z:.786}}],defaultPreset:{formula:"Quaternion",features:{coreMath:{iterations:20,paramA:-.252,paramB:-.222,paramC:0,paramD:0,paramE:0,vec2A:{x:-6.44,y:.29},vec2B:{x:-.21,y:.05},vec3A:{x:.612,y:.381,z:.786}},coloring:{mode:6,repeats:1,phase:.73,scale:1,offset:.73,bias:1,twist:0,escape:54.95,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766241181174_0",position:0,color:"#DA9F1C",bias:.5,interpolation:"linear"},{id:"1766241181174_1",position:.167,color:"#FA752D",bias:.5,interpolation:"linear"},{id:"1766241181174_2",position:.333,color:"#F0483F",bias:.5,interpolation:"linear"},{id:"1766241181174_3",position:.5,color:"#E3264F",bias:.5,interpolation:"linear"},{id:"1766241181174_4",position:.667,color:"#DC266B",bias:.5,interpolation:"linear"},{id:"1766241181174_5",position:.833,color:"#b9257a",bias:.5,interpolation:"linear"},{id:"1766241181174_6",position:1,color:"#7c1d6f",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.23,glowSharpness:3.8,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:2},materials:{reflection:.32,specular:.47,roughness:.5,diffuse:2,envStrength:0,rim:0,rimExponent:3.6,emission:1e-4,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:.65,juliaY:-.2,juliaZ:-1.2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Always",aaLevel:1},optics:{dofStrength:0,dofFocus:10}},cameraPos:{x:-2.448955788675867,y:.7723538718365539,z:.32605384095213635},cameraRot:{x:-.1135398122615654,y:-.6512503200884421,z:-.09942502462227083,w:.7437045085887076},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.5453734613707567,yL:.10050638429037613,zL:-.211008843702685},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-2.0026065897203154,y:.7668302923678636,z:.21579993050482316},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},bt={id:"AmazingBox",name:"Amazing Box",shortDescription:"Architectural fractal discovered by Tglad. Creates complex geometric lattices and Borg-like structures.",description:"Also known as the Mandelbox (Tglad). A folding fractal that creates complex, machine-like architectural structures.",juliaType:"offset",shader:{function:`
    void formula_AmazingBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Pre-Fold Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, uParamC);
        sphereFold(z3, dr, uParamB, uParamD);
        z.xyz = z3 * uParamA + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        trap = min(trap, abs(z.x));
    }`,loopBody:"formula_AmazingBox(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Folding Limit",id:"paramC",min:.1,max:2,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:3,step:.001,default:1},{label:"Pre-Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"AmazingBox",features:{coreMath:{iterations:21,paramA:2.566,paramB:1.026,paramC:1.445,paramD:1.637,vec3A:{x:3.14,y:0,z:1.57}},geometry:{juliaMode:!1,juliaX:.35,juliaY:.25,juliaZ:.15},atmosphere:{fogIntensity:1,fogColor:"#6DBAB7",fogNear:.7921,fogFar:7.5076,fogDensity:0,glowIntensity:1e-4,glowSharpness:1,aoIntensity:.32,aoSpread:.2925,aoMode:!1},materials:{diffuse:1.13,reflection:0,specular:2,roughness:.2,rim:0,rimExponent:1,emission:1e-4,envStrength:0,envMapVisible:!1},coloring:{mode:3,scale:113.5,offset:-5.465,repeats:69.1,phase:.36,bias:1,escape:32.06,gradient:[{id:"0",position:0,color:"#d3f2a3"},{id:"1",position:.167,color:"#97e196"},{id:"2",position:.333,color:"#6cc08b"},{id:"3",position:.5,color:"#4c9b82"},{id:"4",position:.667,color:"#217a79"},{id:"5",position:.833,color:"#105965"},{id:"6",position:1,color:"#074050"}],mode2:8,repeats2:96.2,phase2:-2.898,blendMode:6,gradient2:[{id:"0",position:0,color:"#ffffff"},{id:"1",position:.293,color:"#000000"},{id:"2",position:.903,color:"#ffffff"}],layer3Scale:89,layer3Strength:0},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:1,shadowBias:.0029},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camType:0,camFov:60,orthoScale:17.5}},cameraPos:{x:.95989,y:1.13902,z:1.1791},cameraRot:{x:-.235,y:.3667,z:.2665,w:.8598},sceneOffset:{x:1,y:1,z:3,xL:-.65997,yL:-.75248,zL:-.10163},targetDistance:1.9,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.774,y:.079,z:3.089},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:50,falloff:50,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},xt={id:"MengerSponge",name:"Menger Sponge",shortDescription:"The classic cubic fractal. Creates infinite grids and tech-like structures.",description:'The canonical Menger Sponge (Level N). Set Scale to 3.0 and Offset to 1.0 for the classic mathematical shape. Use "Center Z" to toggle between a corner fractal and the full cube.',juliaType:"none",shader:{function:`
    void formula_MengerSponge(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        z3 = abs(z3);
        // Branchless sorting network (descending: x >= y >= z)
        vec3 s = z3;
        z3.x = max(max(s.x, s.y), s.z);
        z3.z = min(min(s.x, s.y), s.z);
        z3.y = s.x + s.y + s.z - z3.x - z3.z;

        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        vec3 offset = uVec3B;

        // IFS Shift: offset * (scale - 1.0) — per-axis
        vec3 shift = offset * (scale - 1.0);

        z3 = z3 * scale - shift;

        // Param C: Center Z (The "Full Sponge" Correction)
        // If active, this conditional shift restores the full cubic symmetry
        if (uParamC > 0.5) {
            z3.z += shift.z * step(z3.z, -0.5 * shift.z);
        }

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3 - c.xyz));
    }`,loopBody:"formula_MengerSponge(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:3},{label:"Offset",id:"vec3B",type:"vec3",min:0,max:2,step:.001,default:{x:1,y:1,z:1},linkable:!0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Center Z",id:"paramC",min:0,max:1,step:1,default:1}],defaultPreset:{formula:"MengerSponge",features:{coreMath:{iterations:10,paramA:3,paramC:1,vec3A:{x:.031,y:0,z:0},vec3B:{x:1.013,y:1.013,z:1.043}},coloring:{gradient:[{id:"1767569325432_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1767569325432_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1767569325432_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1767569325432_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1767569325432_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1767569325432_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1767569325432_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],mode:6,scale:3.099,offset:-.194,repeats:3.1,phase:-.19,bias:1,twist:0,escape:1.9,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},ao:{aoIntensity:.5,aoSpread:5,aoMode:!0,aoEnabled:!0},atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:0,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:.2,roughness:.8,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:.8,shadowBias:.001},quality:{fudgeFactor:1,detail:1,pixelThreshold:.001,maxSteps:200,estimator:1},optics:{camFov:50,dofStrength:0,dofFocus:10},reflections:{enabled:!0,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.3055326162805782,y:-.23752826799481133,z:-.07899585109054458,w:.9186891736613698},sceneOffset:{x:-1,y:2,z:3.12,xL:-.393,yL:.188,zL:-.252},targetDistance:2.622,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.969,y:1.465,z:1.325},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:5,falloff:0,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-4,y:-2,z:1},rotation:{x:0,y:0,z:0},color:"#E8F0FF",useTemperature:!0,temperature:7e3,intensity:.5,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:2.069,y:1.017,z:2.748},rotation:{x:0,y:0,z:0},color:"#FFC58F",useTemperature:!0,temperature:3e3,intensity:.3,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!0}]}},vt={id:"Kleinian",name:"Kleinian",shortDescription:"Inversion fractal. Resembles organic structures, coral, and sponge tissues.",description:"Based on Kleinian groups and inversion in a sphere. Creates intricate, bubbly, sponge-like structures.",juliaType:"offset",shader:{function:`
        void formula_Kleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        float limit = uParamB;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3, z3), 1e-10);
        float k = max(uParamC / r2, 1.0);
        z3 *= k;
        dr *= k;
        
        // Apply Scale (A) and Offset (vec3A)
        z3 = z3 * uParamA + uVec3A + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        
        z.xyz = z3;
        trap = min(trap, r2);
    }`,loopBody:"formula_Kleinian(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:2.5,step:.001,default:1.8},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Fold Size",id:"paramB",min:0,max:2,step:.001,default:1},{label:"K Factor",id:"paramC",min:.5,max:2,step:.001,default:1.2}],defaultPreset:{formula:"Kleinian",features:{coreMath:{iterations:53,paramA:2.058,paramB:.907,paramC:.976,vec3A:{x:0,y:0,z:0}},coloring:{mode:3,repeats:100,phase:0,scale:126.58,offset:67.08,bias:1,twist:0,escape:2,mode2:0,repeats2:100,phase2:0,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"2",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.8275862068965517,color:"#3E3E3E",bias:.5,interpolation:"linear"},{id:"1767121500027",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:0,specular:0,roughness:.79,diffuse:2,envStrength:0,rim:0,rimExponent:1,emission:.148,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:501,fogColor:"#5A81A3",fogDensity:0,glowIntensity:.035,glowSharpness:52,glowColor:"#ffffff",glowMode:!1,aoIntensity:.29,aoSpread:.1,aoMode:!1},lighting:{shadows:!0,shadowSoftness:82.64,shadowIntensity:1,shadowBias:.0014},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,distanceMetric:1,estimator:4},geometry:{juliaMode:!1,juliaX:.5,juliaY:.5,juliaZ:.5,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.577}},cameraPos:{x:0,y:0,z:3.5},cameraRot:{x:0,y:0,z:.931234344584406,w:-.3644209042665525},cameraFov:80,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:.965,cameraMode:"Fly",lights:[{type:"Point",position:{x:.06202062498807429,y:.022274010144572264,z:3.439439471330585},rotation:{x:0,y:0,z:0},color:"#8FA9FF",intensity:.4,falloff:.6760000000000002,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.00041247989335695644,y:-.00142172416335363,z:3.0187219870917428},rotation:{x:0,y:0,z:0},color:"#FFB333",intensity:5,falloff:142.88399999999996,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.12319987256138526,y:-.0954216385692699,z:2.9890303407494763},rotation:{x:0,y:0,z:0},color:"#E8F0FF",useTemperature:!0,temperature:7e3,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},Na={id:"PseudoKleinian",name:"Pseudo Kleinian",shortDescription:'Kleinian variation with a "Magic Factor" that warps the inversion logic.',description:"A modification of the Kleinian group formula. Now supports linear shifting and twisting.",shader:{function:`
    void formula_PseudoKleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        float boxLimitVal = uParamA;
        vec3 boxMin = vec3(-boxLimitVal);
        vec3 boxMax = vec3(boxLimitVal);
        q = 2.0 * clamp(q, boxMin, boxMax) - q;
        float lensq = max(dot(q, q), 1e-10);
        float magic = uParamD;
        float factor = uParamC - magic;
        float rp2 = lensq * factor;
        float k1 = max(uParamB / max(rp2, 1.0e-10), 1.0);
        q *= k1;
        dr *= k1;

        // Vec3A: 3-axis shift (z-shift was original paramE, x/y are new)
        q += uVec3A;

        z.xyz = q;
        trap = min(trap, lensq);
    }`,loopBody:"formula_PseudoKleinian(z, dr, trap, c);"},parameters:[{label:"Box Limit",id:"paramA",min:.1,max:2,step:.01,default:1.93},{label:"Size (C)",id:"paramB",min:.5,max:2.5,step:.001,default:1.76},{label:"Power",id:"paramC",min:1,max:2.5,step:.001,default:1.278},{label:"Magic Factor",id:"paramD",min:0,max:1.5,step:.001,default:.801},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:.119}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"PseudoKleinian",features:{coreMath:{iterations:7,paramA:1.93,paramB:1.76,paramC:1.278,paramD:.801,paramF:0,vec3A:{x:0,y:0,z:.119}},coloring:{gradient:[{id:"1771521894392",position:0,color:"#949494",bias:.5,interpolation:"linear"},{id:"1771519043183",position:.33,color:"#87827D",bias:.5,interpolation:"step"},{id:"1771519043723",position:.448,color:"#007A71",bias:.5,interpolation:"step"},{id:"1771518360330_2",position:.461,color:"#929292",bias:.5,interpolation:"linear"},{id:"1771518360330_3",position:1,color:"#949494",bias:.5,interpolation:"linear"}],mode:9,scale:27.305,offset:-24.938,repeats:3,phase:-.5,bias:1,twist:0,escape:127399.5,gradient2:[{id:"1",position:.318,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1771521834787",position:.386,color:"#26A5B4",bias:.5,interpolation:"step"},{id:"1771521804163",position:.397,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:0,scale2:45.964,offset2:2.748,repeats2:50.5,phase2:.45,bias2:1,twist2:0,blendMode:2,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:466.422,layer3Strength:0,layer3Bump:.05,layer3Turbulence:0},ao:{aoIntensity:.317,aoSpread:.027,aoEnabled:!0,aoMode:!1},atmosphere:{fogIntensity:0,fogNear:1.069,fogFar:1.764,fogColor:"#000000",fogDensity:.36,glowIntensity:.062,glowSharpness:8.511,glowMode:!1,glowColor:"#9be0ff"},materials:{diffuse:1.1,reflection:.52,specular:2,roughness:.269,rim:.586,rimExponent:5.9,envStrength:2.36,envBackgroundStrength:.97,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1771523832902_0",position:0,color:"#001133"},{id:"1771523832902_1",position:.5,color:"#8A9DAA"},{id:"1771523832902_2",position:1,color:"#A5FFFF"}]},colorGrading:{active:!0,saturation:1.11,levelsMin:.01,levelsMax:1.004,levelsGamma:.496},geometry:{juliaMode:!1,juliaX:-.28,juliaY:2,juliaZ:-2,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:178.25,shadowIntensity:1,shadowBias:16e-6},quality:{fudgeFactor:.48,detail:7.7,pixelThreshold:.3,maxSteps:384,estimator:4,distanceMetric:2},optics:{camFov:37,dofStrength:.00147,dofFocus:1.235},reflections:{enabled:!0,reflectionMode:1,bounces:3,steps:128,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.23563338320385452,y:.05927570030462831,z:-.43792255558493787,w:.8655559689490069},sceneOffset:{x:4.677079677581787,y:.8489137291908264,z:1.2545667886734009,xL:-.03396485030158674,yL:.03325700201092376,zL:-.015573679616097938},targetDistance:1.0379663705825806,cameraMode:"Fly",lights:[{type:"Point",position:{x:4.677060177682062,y:.8489393025420574,z:1.254369368841062},rotation:{x:1.092,y:.667,z:.415},color:"#FFA757",intensity:12.96,falloff:109.253,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.557440677764606,y:1.1,z:-.16},rotation:{x:0,y:0,z:0},color:"#A9A9A9",intensity:27.1441,falloff:3.528,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.677024051602566,y:.8488697555642045,z:1.2543798336180192},rotation:{x:0,y:0,z:0},color:"#4E83FF",intensity:28.4,falloff:261.407,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]}},Va={id:"Dodecahedron",name:"Dodecahedron",shortDescription:"Kaleidoscopic IFS with dodecahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with true dodecahedral symmetry using 3 golden-ratio reflection normals. Based on Knighty's method: 3 normals × 3 reflections = 9 fold operations per iteration, producing the icosahedral/dodecahedral reflection group. Supports rotation, twist, and shift.",juliaType:"offset",shader:{preamble:`
    // Dodecahedron: Golden-ratio fold normals
    // Reference: Syntopia/Knighty Kaleidoscopic IFS
    const float dodeca_Phi = (1.0 + sqrt(5.0)) * 0.5; // golden ratio 1.618...
    const vec3 dodeca_n1 = normalize(vec3(-1.0, dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0)));
    const vec3 dodeca_n2 = normalize(vec3(dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0), -1.0));
    const vec3 dodeca_n3 = normalize(vec3(1.0 / (dodeca_Phi - 1.0), -1.0, dodeca_Phi - 1.0));`,function:`
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // 3 normals × 3 repetitions = 9 fold operations (true dodecahedral symmetry)
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;

        // Scale and offset
        float scale = uParamA;
        vec3 offset = vec3(uParamB * (scale - 1.0));

        // Vec3A: Shift
        offset -= uVec3A;

        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_Dodecahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.618},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Dodecahedron",features:{coreMath:{iterations:7,paramA:1.618,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:5.220276663070101,y:.9514730190841805,z:0}},coloring:{mode:0,repeats:1,phase:.41,scale:6.580873844013903,offset:1.195965706975688,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773424223148_0",position:0,color:"#30123B",bias:.5,interpolation:"linear"},{id:"1773424223148_1",position:.071,color:"#4145AB",bias:.5,interpolation:"linear"},{id:"1773424223148_2",position:.143,color:"#4675ED",bias:.5,interpolation:"linear"},{id:"1773424223148_3",position:.214,color:"#39A2FC",bias:.5,interpolation:"linear"},{id:"1773424223148_4",position:.286,color:"#1BCFD4",bias:.5,interpolation:"linear"},{id:"1773424223148_5",position:.357,color:"#24ECA6",bias:.5,interpolation:"linear"},{id:"1773424223148_6",position:.429,color:"#61FC6C",bias:.5,interpolation:"linear"},{id:"1773424223148_7",position:.5,color:"#A4FC3B",bias:.5,interpolation:"linear"},{id:"1773424223148_8",position:.571,color:"#D1E834",bias:.5,interpolation:"linear"},{id:"1773424223148_9",position:.643,color:"#F3C63A",bias:.5,interpolation:"linear"},{id:"1773424223148_10",position:.714,color:"#FE9B2D",bias:.5,interpolation:"linear"},{id:"1773424223148_11",position:.786,color:"#F36315",bias:.5,interpolation:"linear"},{id:"1773424223148_12",position:.857,color:"#D93806",bias:.5,interpolation:"linear"},{id:"1773424223148_13",position:.929,color:"#B11901",bias:.5,interpolation:"linear"},{id:"1773424223148_14",position:1,color:"#7A0402",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},ao:{aoIntensity:.47,aoSpread:.20182911832770353,aoSamples:5,aoEnabled:!0,aoMode:!1},texturing:{active:!1,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{diffuse:2,reflection:0,specular:1.02,roughness:.468,rim:0,rimExponent:4.5,envStrength:.11,envBackgroundStrength:.18,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowColor:"#ffffff",glowMode:!1},geometry:{juliaMode:!1,juliaX:-.495,juliaY:.43,juliaZ:-.07,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:538,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.618,pixelThreshold:.2,maxSteps:300,distanceMetric:2,stepJitter:.15,estimator:2},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:30,dofStrength:0,dofFocus:5.416511696387403}},cameraPos:{x:-2.9461205964615327,y:-6.306149063613445,z:-5.3717968058510825},cameraRot:{x:-.3200177128161143,y:.4273069400949125,z:.4770724626812721,w:.6981398912695737},cameraFov:30,sceneOffset:{x:5.360734701156616,y:13.365931034088135,z:8.818749189376831,xL:-.004044675735693504,yL:-.07134266791832158,zL:.1851590182527553},targetDistance:8.7922319978922,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.3935750958329095,y:1.1219073945240998,z:2.531297422652509},rotation:{x:-.1760895376460553,y:-.04312640645659912,z:.00380748198692117},color:"#FFE6D1",intensity:.43559999999999993,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Ha={id:"Phoenix",name:"Phoenix",shortDescription:"Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.",description:"A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.",juliaType:"julia",shader:{function:`
    vec3 phoenixBulbPow(vec3 z, float power, vec2 phase) {
        float r = length(z);
        float r_safe = max(r, 1.0e-9);
        float theta = acos(clamp(z.z / r_safe, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float zr = pow(r_safe, power);
        theta = theta * power + phase.x;
        phi = phi * power + phase.y;
        return zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    }

        void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 z_prev, inout float dr_prev, inout vec4 z_prev2, inout float dr_prev2) {
            vec3 z3 = z.xyz;
            vec3 zp3 = z_prev.xyz;

            // Vec3A: Anisotropic Stretch (mix to 1.0 when near zero so DDFS default reset is safe)
            vec3 stretch = mix(vec3(1.0), uVec3A, step(vec3(0.01), uVec3A));
            z3 *= stretch;
            dr *= max(max(stretch.x, stretch.y), stretch.z);

            // Vec3C: Pre-rotation (applied before triplex power)
            if (abs(uVec3C.x) > 0.001 || abs(uVec3C.y) > 0.001 || abs(uVec3C.z) > 0.001) {
                float cx = cos(uVec3C.x); float sx = sin(uVec3C.x);
                float cy = cos(uVec3C.y); float sy = sin(uVec3C.y);
                float cz = cos(uVec3C.z); float sz = sin(uVec3C.z);
                // YZ rotation
                z3.yz = mat2(cx, -sx, sx, cx) * z3.yz;
                // XZ rotation
                z3.xz = mat2(cy, -sy, sy, cy) * z3.xz;
                // XY rotation
                z3.xy = mat2(cz, -sz, sz, cz) * z3.xy;
            }

            // Param C: Twist
            if (abs(uParamC) > 0.001) {
                float ang = z3.z * uParamC;
                float s = sin(ang); float co = cos(ang);
                z3.xy = mat2(co, -s, s, co) * z3.xy;
            }

            float power = uParamA;
            float kReal = uVec2A.x;
            float kImag = uVec2A.y;
            float hPower = uParamB;
            float hBlend = uParamD;
            vec2 phase = uVec2B;

            vec3 z_new_part = phoenixBulbPow(z3, power, phase);

            // Vec3B: Abs/fold after power (Burning Phoenix)
            z_new_part = mix(z_new_part, abs(z_new_part), step(vec3(0.5), uVec3B));

            // History: blend z_{n-1} with z_{n-2} for deeper memory
            vec3 historySource = mix(zp3, z_prev2.xyz, hBlend);
            float drHistorySource = mix(dr_prev, dr_prev2, hBlend);

            vec3 z_prev_part;
            bool isLinearHistory = abs(hPower - 1.0) < 0.001;

            if (isLinearHistory) {
                z_prev_part = historySource;
            } else {
                z_prev_part = phoenixBulbPow(historySource, hPower, vec2(0.0));
            }

            vec3 historyTerm;
            historyTerm.x = z_prev_part.x * kReal - z_prev_part.y * kImag;
            historyTerm.y = z_prev_part.x * kImag + z_prev_part.y * kReal;
            historyTerm.z = z_prev_part.z * kReal;

            vec3 z_next = z_new_part + c.xyz + historyTerm;

            float r = length(z3);
            float rh = length(historySource);
            float safeR = max(r, 1.0e-5);
            float safeRh = max(rh, 1.0e-5);

            float dr_pow = power * pow(safeR, power - 1.0);

            float kMag = length(vec2(kReal, kImag));
            float dr_hist = kMag;

            if (!isLinearHistory) {
                 dr_hist *= hPower * pow(safeRh, hPower - 1.0);
            }

            float dc = (uJuliaMode > 0.5) ? 0.0 : 1.0;
            float dr_next = dr_pow * dr + dr_hist * drHistorySource + dc;

            // Shift history: z_{n-2} = z_{n-1}, z_{n-1} = z_n
            z_prev2 = z_prev;
            dr_prev2 = dr_prev;
            z_prev = vec4(z3, 0.0);
            dr_prev = dr;

            z.xyz = z_next;
            dr = dr_next;

            trap = min(trap, dot(z, z));
        }`,loopBody:"formula_Phoenix(z, dr, trap, c, z_prev, dr_prev, z_prev2, dr_prev2);",loopInit:`
        vec4 z_prev = vec4(0.0);
        float dr_prev = 0.0;
        vec4 z_prev2 = vec4(0.0);
        float dr_prev2 = 0.0;
        `},parameters:[{label:"Power (p)",id:"paramA",min:1.5,max:12,step:.01,default:10.777},{label:"History Exp",id:"paramB",min:0,max:3,step:.01,default:.87},{label:"Twist",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"History Depth",id:"paramD",min:0,max:1,step:.01,default:0},{label:"Distortion (Re, Im)",id:"vec2A",type:"vec2",min:-1.5,max:1.5,step:.001,default:{x:.503,y:.961}},{label:"Phase (θ, φ)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Stretch",id:"vec3A",type:"vec3",min:.1,max:3,step:.01,default:{x:1,y:1,z:1},linkable:!0},{label:"Abs Fold",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Pre-Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Phoenix",features:{coreMath:{iterations:31,paramA:10.777,paramB:.87,paramC:0,paramD:0,vec2A:{x:.503,y:.961},vec2B:{x:0,y:0},vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{gradient:[{id:"1766223988966_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766223988966_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766223988966_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766223988966_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766223988966_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766223988966_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766223988966_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766223988966_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766223988966_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766223988966_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766223988966_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766223988966_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode:0,scale:2.31,offset:.272,repeats:1,phase:0,bias:.9,twist:0,escape:4,gradient2:[{id:"1766224725875_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766224725875_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766224725875_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766224725875_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766224725875_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766224725875_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766224725875_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766224725875_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766224725875_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766224725875_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766224725875_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766224725875_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode2:6,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:245.44,layer3Strength:0,layer3Bump:.3,layer3Turbulence:.65},ao:{aoIntensity:.37,aoSpread:.164,aoEnabled:!0,aoMode:!1},atmosphere:{fogColor:"#1b1e24",fogNear:1e-4,fogFar:501.187,fogDensity:0,glowIntensity:1e-4,glowSharpness:825,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:.94,reflection:0,specular:.3,roughness:.4,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:.581,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},geometry:{juliaMode:!0,juliaX:.17,juliaY:.36,juliaZ:.06,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:102.8,shadowIntensity:1,shadowBias:.002},quality:{fudgeFactor:.4,detail:1,pixelThreshold:.5,maxSteps:300},optics:{camFov:58,dofStrength:35e-5,dofFocus:.38}},cameraPos:{x:.876,y:-1.881,z:2.819},cameraRot:{x:.087,y:.3,z:-.715,w:.626},sceneOffset:{x:.246,y:1.112,z:-2.614,xL:-.876,yL:.881,zL:-.819},targetDistance:.287,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.755,y:.531,z:-.026},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},St={id:"MixPinski",name:"MixPinski",shortDescription:"4D Sierpinski-Menger hybrid by Darkbeam. Rich geometric detail.",description:"Darkbeam's MixPinski — a 4D hybrid combining Sierpinski tetrahedron folds (extended to 4D with w-component) and a Menger-like fold-scale transform. The interplay of these two IFS systems produces extraordinary geometric complexity.",juliaType:"offset",shader:{function:`
    void formula_MixPinski(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // --- Stage 1: 4D Sierpinski Folds ---
        // Six reflective folds across all pairs of axes (extends 3D tetrahedron folds to 4D)
        float s;
        s = step(0.0, z.x + z.y); z.xy = mix(-z.yx, z.xy, s);
        s = step(0.0, z.x + z.z); z.xz = mix(-z.zx, z.xz, s);
        s = step(0.0, z.y + z.z); z.zy = mix(-z.yz, z.zy, s);
        s = step(0.0, z.x + z.w); z.xw = mix(-z.wx, z.xw, s);
        s = step(0.0, z.y + z.w); z.yw = mix(-z.wy, z.yw, s);
        s = step(0.0, z.z + z.w); z.zw = mix(-z.wz, z.zw, s);

        // Sierpinski scale + offset (4D)
        float scaleS = uParamA;
        z *= scaleS;
        dr *= abs(scaleS);

        // offsetS: vec3A.xyz for xyz, vec2A.x for w
        z.xyz += uVec3A;
        z.w += uVec2A.x;

        // --- Stage 2: Menger-like Fold-Scale ---
        float scaleM = uParamC;
        float sm1 = scaleM - 1.0;

        // Standard IFS scale-offset on x, y, w
        z.x = scaleM * z.x - uVec3B.x * sm1;
        z.y = scaleM * z.y - uVec3B.y * sm1;
        z.w = scaleM * z.w - uVec2A.y * sm1;

        // Z-axis: Menger fold (abs-fold around center, then scale)
        float zCenter = 0.5 * uVec3B.z * sm1 / scaleM;
        z.z -= zCenter;
        z.z = -abs(z.z);
        z.z += zCenter;
        z.z *= scaleM;

        dr *= abs(scaleM);

        // --- Stage 3: Optional 3D Rotation (uses vec3C, precalc via gmt_precalcRodrigues) ---
        {
            vec3 rp = z.xyz;
            gmt_applyRodrigues(rp);
            z.xyz = rp;
        }

        // Julia mode
        if (uJuliaMode > 0.5) z.xyz += c.xyz;

        // Orbit trap coloring (matches original: abs(vec4(z.xyz, r2)))
        float r2 = dot(z.xyz, z.xyz) + z.w * z.w;
        trap = min(trap, length(abs(vec4(z.xyz, r2))));
    }`,loopBody:"formula_MixPinski(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3C);",usesSharedRotation:!0,getDist:`
            float r4d = max(max(max(abs(z.x), abs(z.y)), abs(z.z)), abs(z.w));
            float d = (r4d - 1.0) / max(abs(dr), 1e-10);
            return vec2(d, iter);
        `},parameters:[{label:"Sierpinski Scale",id:"paramA",min:.1,max:4,step:.001,default:1},{label:"Menger Scale",id:"paramC",min:.1,max:4,step:.001,default:2},{label:"W (4th Dim)",id:"paramB",min:-5,max:5,step:.01,default:0},{label:"Sierpinski Offset",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}},{label:"Menger Offset",id:"vec3B",type:"vec3",min:-5,max:5,step:.01,default:{x:1,y:1,z:1},linkable:!0},{label:"4D Offsets",id:"vec2A",type:"vec2",min:-5,max:5,step:.01,default:{x:0,y:.5}},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"MixPinski",features:{coreMath:{iterations:11,paramA:1,paramB:0,paramC:2,vec3A:{x:0,y:0,z:0},vec3B:{x:1,y:1,z:1},vec3C:{x:0,y:0,z:0},vec2A:{x:0,y:.5}},coloring:{mode:0,repeats:2,phase:0,scale:6.52833425825692,offset:1.5335980513105973,bias:2.7028973971996875,twist:0,escape:16,mode2:0,scale2:14.312371802828013,offset2:3.2910086244771835,repeats2:6,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:0,layer3Color:"#000000",layer3Scale:23.20419452683914,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773421493405_7",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1773421493405_6",position:.143,color:"#9BF5FF",bias:.5,interpolation:"linear"},{id:"1773421493405_5",position:.286,color:"#FFAE55",bias:.5,interpolation:"linear"},{id:"1773421493405_4",position:.429,color:"#803000",bias:.5,interpolation:"linear"},{id:"1773421493405_3",position:.571,color:"#481700",bias:.5,interpolation:"linear"},{id:"1773421493405_2",position:.714,color:"#000000",bias:.5,interpolation:"linear"},{id:"1773421493405_1",position:.857,color:"#005662",bias:.5,interpolation:"linear"},{id:"1773421493405_0",position:1,color:"#00485E",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.20422535211267606,interpolation:"linear"},{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.535,aoSpread:.004173235403614006,aoSamples:5,aoEnabled:!0,aoMode:!0},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.005,glowSharpness:2,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.2,reflection:0,specular:.58,roughness:.333,rim:.1,rimExponent:15,envStrength:.3,envBackgroundStrength:.54,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:5.636765862528907,shadowSteps:112,shadowIntensity:1,shadowBias:.002},quality:{detail:2.5,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camFov:25,dofStrength:0,dofFocus:2.2105886936187744}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.29934375838158195,y:-.36353705098625344,z:-.1246062728732116,w:.8733312107321335},cameraFov:25,sceneOffset:{x:-1.860237717628479,y:2.017045259475708,z:1.8703371286392212,xL:-.06596317582826194,yL:.07221056925599156,zL:.06550313881154746},targetDistance:2.767302989959717,cameraMode:"Fly",lights:[{type:"Point",position:{x:-.8183725352111588,y:1.3532257824970233,z:1.5729904550803229},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},$a={id:"SierpinskiTetrahedron",name:"Sierpinski Tetrahedron",shortDescription:"Classic IFS Sierpinski tetrahedron with fold symmetry.",description:"The Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes. Supports per-axis scale, rotation, shift and twist.",juliaType:"offset",shader:{function:`
    void formula_SierpinskiTetrahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);

        float sf;
        sf = step(0.0, z3.x + z3.y); z3.xy = mix(-z3.yx, z3.xy, sf);
        sf = step(0.0, z3.x + z3.z); z3.xz = mix(-z3.zx, z3.xz, sf);
        sf = step(0.0, z3.y + z3.z); z3.yz = mix(-z3.zy, z3.yz, sf);
        // Vec3C: Per-axis scale (average for DR calculation)
        vec3 scale3 = uVec3C;
        z3 = z3 * scale3 - vec3(uParamB * (scale3 - 1.0));

        // Vec3B: Rotation (post-fold, using shared precalc)
        gmt_applyRodrigues(z3);

        // Vec3A: Shift X, Y, Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        // Use average scale for derivative calculation
        float avgScale = (scale3.x + scale3.y + scale3.z) / 3.0;
        dr = dr * avgScale;
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_SierpinskiTetrahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"vec3C",type:"vec3",min:.1,max:4,step:.001,default:{x:2,y:2,z:2},linkable:!0},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"SierpinskiTetrahedron",features:{coreMath:{iterations:32,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0},vec3C:{x:2,y:2,z:2}},coloring:{mode:0,repeats:2.6,phase:.78,scale:2.595,offset:.785,bias:1,twist:0,escape:3.2,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766253802332_11",position:0,color:"#666666",bias:.5,interpolation:"linear"},{id:"1766253802332_10",position:.09099999999999997,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766253802332_9",position:.18200000000000005,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766253802332_8",position:.273,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766253802332_7",position:.364,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766253802332_6",position:.45499999999999996,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766253802332_5",position:.5449999999999999,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766253802332_4",position:.636,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766253802332_3",position:.727,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766253802332_2",position:.8180000000000001,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766253802332_1",position:.909,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766253802332_0",position:1,color:"#5F4690",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.4},materials:{reflection:0,specular:0,roughness:.5,diffuse:1.5,envStrength:0,rim:0,rimExponent:4,emission:.3,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,estimator:1},optics:{dofStrength:0,dofFocus:.38}},cameraPos:{x:-3.007814612603433,y:1.6549209197166999,z:3.0656971117007727},cameraRot:{x:-.16821916484218788,y:-.37237727913489405,z:-.07175513434637137,w:.9098838800961496},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.6573301623370098,yL:-.6573301623370098,zL:-.6573301623370111},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.435,y:1.031,z:2.022},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},zt={id:"AmazingSurf",name:"Amazing Surf",shortDescription:"Sinusoidal variation of the Amazing Box. Creates flowing, melted machinery.",description:"A variant of the Amazing Box that introduces sinusoidal waves. Now with Wave Twist and Vertical Shift.",juliaType:"offset",shader:{function:`
    void formula_AmazingSurf(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        vec3 transform = uVec3A;
        float limit = 1.0;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3,z3), 1e-10);
        float mR2 = max(uParamB * uParamB, 1e-10);
        float sphereK = clamp(1.0 / r2, 1.0, 1.0 / mR2);
        z3 *= sphereK; dr *= sphereK;
        z3 = z3 * uParamA + c.xyz;
        
        // Param X: Wave Twist
        float twist = 0.0;
        if (abs(transform.x) > 0.001) twist = z3.z * transform.x;
        
        // Param Y: Vertical Shift
        if (abs(transform.y) > 0.001) z3.y += transform.y;

        z3 += vec3(sin(z3.y * uParamC + twist), cos(z3.x * uParamC + twist), 0.0) * uParamD * 0.1;
        dr = dr * abs(uParamA) + 1.0;
        z.xyz = z3;
        trap = min(trap, abs(z3.z));
    }`,loopBody:"formula_AmazingSurf(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:5,step:.001,default:3},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.8},{label:"Wave Freq",id:"paramC",min:0,max:10,step:.1,default:6},{label:"Wave Amp",id:"paramD",min:0,max:2,step:.01,default:.5},{label:"Transform",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"AmazingSurf",features:{coreMath:{iterations:21,paramA:3.03,paramB:.47,paramC:1,paramD:1,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:1.44,scale:1,offset:1.44,bias:1,twist:0,escape:100,mode2:4,repeats2:2284.7,phase2:2.4,blendMode:6,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1767122909918_0",position:0,color:"#DF7200",bias:.5,interpolation:"linear"},{id:"1767122909918_1",position:.5,color:"#cc8800",bias:.5,interpolation:"linear"},{id:"1767122909918_2",position:1,color:"#ffeeaa",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:.44,specular:2,roughness:.51,diffuse:1.01,envStrength:0,rim:0,rimExponent:4,emission:0,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,useEnvMap:!0,envSource:1,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:7.988,fogColor:"#362624",fogDensity:.2,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.147,aoMode:!1},lighting:{shadows:!0,shadowSoftness:128,shadowIntensity:.97,shadowBias:.11},quality:{detail:2,fudgeFactor:.45,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:1},geometry:{juliaMode:!1,juliaX:.06,juliaY:-2,juliaZ:2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.662}},cameraPos:{x:-.0012166192470455862,y:.34651714109424453,z:-.4225635099851341},cameraRot:{x:.0038108513963938193,y:.9416221382735623,z:.33664033788669406,w:-.002551280519921562},cameraFov:60,sceneOffset:{x:0,y:0,z:2,xL:.007764116549374419,yL:.17826292308257122,zL:.3614435950429179},targetDistance:.504,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.06201624057047557,y:-.0404139584830392,z:-.6430434715537097},rotation:{x:0,y:0,z:0},color:"#FF9D7B",intensity:5,falloff:22,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},wt={id:"AmazingSurface",name:"Amazing Surface",description:'A "Menger-Kleinian" hybrid. Uses 3-axis sorting (Menger) followed by a Box Fold and Sphere Inversion. Capable of creating non-orthogonal, organic machinery.',juliaType:"offset",shader:{loopInit:`
            // Fix: Zero out W component to prevent uParamB (InvMax) from affecting magnitude check
            z.w = 0.0;

            // Apply Pre-Scale (Param E) once at the start
            // Loop Init always runs before the loop, so we don't need to check iter
            float preScale = (abs(uParamE) < 0.001) ? 1.0 : (1.0 / uParamE);
            z.xyz *= preScale;
            dr *= preScale;
        `,function:`
    void formula_AmazingSurface(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        vec3 offset = uVec3B;
        // Params
        float scale = uParamA;      // Fractal Scale (fractal_fold + 1)
        float invMax = uParamB;     // Inversion Clamp Max (3.0)
        
        vec3 cSize = uVec3A; //box params
        
        if (uJuliaMode > 0.5) offset += uJulia;

        // 1. Menger-style Folding (Sort Axes)
        p = abs(p);
        if (p.x < p.y) p.xy = p.yx;
        if (p.x < p.z) p.xz = p.zx;
        if (p.y < p.z) p.yz = p.zy;
        
        // 2. Box Fold / Scale
        // formula: p = p * scale - cSize * (scale - 1.0)
        p = p * scale - cSize * (scale - 1.0);
        
        // 3. Sphere Inversion
        float r2 = dot(p, p);
        float k = clamp(1.0 / r2, 1.0, invMax);
        p *= k;
        
        // 4. Translation
        p += offset;
        
        // 5. Derivative Update
        // Based on reference: de = de * k * scale
        // We use full chain rule approximation for stability
        dr = dr * abs(scale) * k + 1.0;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_AmazingSurface(z, dr, trap, c);",getDist:`
            // DE: (length(p) - Thickness) / dr
            // Use 'r' which comes from DE_MASTER (respects Distance Metric)
            float thickness = uParamF;
            return vec2((r - thickness) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2.37},{label:"Inv Max",id:"paramB",min:1,max:5,step:.01,default:3},{label:"Box Params",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1.3},linkable:!0},{label:"Offset Params",id:"vec3B",type:"vec3",min:-3,max:3,step:.001,default:{x:0,y:0,z:.5}},{label:"Pre-Scale",id:"paramE",min:.1,max:5,step:.01,default:1},{label:"Thickness",id:"paramF",min:0,max:10,step:.01,default:.4}],defaultPreset:{formula:"AmazingSurface",features:{atmosphere:{fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.028079152787892275,aoMode:!1},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:.125,envMapVisible:!0,envBackgroundStrength:.013878516332918171,envSource:1,envMapData:null,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},coloring:{gradient:[{id:"2",position:.29337201676350744,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067662570",position:.32743611518925475,color:"#4F8728",bias:.33333333333333326,interpolation:"step"},{id:"1768067659362",position:.4161607050126708,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067719427",position:.5555850604494675,color:"#FF7D7D",bias:.5,interpolation:"step"},{id:"1768067722341",position:.6094535614136845,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1768067729100",position:.6876155711314749,color:"#FFB716",bias:.5,interpolation:"linear"},{id:"1768067900586",position:.7932402117621893,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode:0,scale:13.919207813258625,offset:.787073242086744,repeats:1.5,phase:0,bias:1,twist:0,escape:1.0069316688518042,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridComplex:!1,hybridProtect:!0,hybridSkip:1,hybridSwap:!1,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1},coreMath:{iterations:12,paramA:1.866,paramB:1.63,vec3A:{x:1,y:1,z:.62},vec3B:{x:0,y:0,z:.62},paramE:.97,paramF:1.4},lighting:{shadows:!0,shadowSoftness:12,shadowIntensity:1,shadowBias:1e-4,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,light0_visible:!0,light0_fixed:!1,light0_castShadow:!0,light0_type:!1,light0_intensity:50,light0_falloff:50,light0_posX:-.34174133805446993,light0_posY:-1.233562063425787,light0_posZ:1.8137779830637029,light0_color:"#ffffff",light1_visible:!1,light1_fixed:!1,light1_castShadow:!1,light1_type:!1,light1_intensity:.5,light1_falloff:.5,light1_posX:.05,light1_posY:.075,light1_posZ:-.1,light1_color:"#FFD6AA",light2_visible:!1,light2_fixed:!1,light2_castShadow:!1,light2_type:!1,light2_intensity:.5,light2_falloff:.5,light2_posX:.25,light2_posY:.075,light2_posZ:-.1,light2_color:"#E0EEFF"},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{smoothing:.5,links:[],selectedLinkId:null,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.4173748330716279,y:.023019150204605446,z:-.01057663171011426,w:.9083812538268042},sceneOffset:{x:0,y:-2,z:2,xL:.04868238113505319,yL:-.4245626359584309,zL:.3428044731107205},targetDistance:2.077035516500473,cameraMode:"Orbit",lights:[]}},Ga={id:"BoxBulb",name:"Box Bulb",shortDescription:'Hybrid of Box Folds and Mandelbulb Power. Creates "Boxy Bulbs".',description:"A hybrid that combines box/sphere folding with the Mandelbulb power function. Now with rotation controls. (Formerly FoldingBrot)",juliaType:"offset",shader:{function:`
    void DE_Bulb(inout vec3 z, inout float dr, inout float trap, float power) {
        float r = max(length(z), 1.0e-9);
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        theta *= power;
        phi *= power;
        float zr = rp1 * r;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        trap = min(trap, r);
    }

    void formula_BoxBulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Rotation from vec3A
        float angX = uVec3A.x;
        float angZ = uVec3A.z;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, 1.0); 
        sphereFold(z3, dr, uParamB, uParamD);
        float scale = uParamC;
        z3 *= scale;
        dr *= abs(scale);
        DE_Bulb(z3, dr, trap, uParamA); 
        z.xyz = z3 + c.xyz;
        trap = min(trap, length(z.xyz));
    }`,loopBody:"formula_BoxBulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1.5,max:16,step:.001,default:5},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Scale",id:"paramC",min:.5,max:2.5,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"}],defaultPreset:{formula:"BoxBulb",features:{coreMath:{iterations:16,paramA:5.8386,paramB:.321,paramC:.91,paramD:1.279,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:2.62,scale:1,offset:2.62,bias:1,twist:0,escape:33.72,mode2:0,repeats2:100,phase2:2.4,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766255418053_0",position:.0642570281124498,color:"#567C1A",bias:.5,interpolation:"linear"},{id:"1766255418053_1",position:.167,color:"#33A532",bias:.5,interpolation:"linear"},{id:"1766255418053_2",position:.333,color:"#18DA5F",bias:.5,interpolation:"linear"},{id:"1766255418053_3",position:.5,color:"#299B77",bias:.5,interpolation:"linear"},{id:"1766255418053_4",position:.667,color:"#217a79",bias:.5,interpolation:"linear"},{id:"1766258643816",position:.7469879518072289,color:"#4B0000",bias:.5,interpolation:"linear"},{id:"1766255418053_5",position:.833,color:"#105965",bias:.5,interpolation:"linear"},{id:"1766255418053_6",position:1,color:"#074050",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#132218",fogDensity:.14,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.4,specular:1.05,roughness:.25,diffuse:.21,envStrength:0,rim:0,rimExponent:4,emission:.01,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.19,juliaY:-.93,juliaZ:-.41,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:8,shadowIntensity:.98,shadowBias:.002},quality:{detail:2.4,fudgeFactor:.65,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:4},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.25378547286620784,y:.054246624931105866,z:1.9340201043333456},cameraRot:{x:-.013871509693272319,y:.0651855581354543,z:.0009062372749709499,w:.9977763291256213},cameraFov:81,sceneOffset:{x:0,y:0,z:0,xL:.06415813902081223,yL:.10257047639815663,zL:.48918654020794206},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.3559846285676508,y:.08248395080524681,z:2.1100465907611543},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},qa={id:"MengerAdvanced",name:"Menger Advanced",shortDescription:"Hybrid Menger Sponge with internal Box Folds and vertical scaling.",description:"An advanced variant of the Menger Sponge. It adds an Inner Box Fold (Param E) to generate machinery-like details inside the voids, and Z-Scale (Param F) for creating towering structures. (Formerly UberMenger)",juliaType:"none",shader:{function:`
    void formula_MengerAdvanced(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        float sx = sin(rot.x), cx = cos(rot.x);
        float sy = sin(rot.y), cy = cos(rot.y);
        float sz = sin(rot.z), cz = cos(rot.z);
        mat2 rotX = mat2(cx, -sx, sx, cx);
        mat2 rotY = mat2(cy, -sy, sy, cy);
        mat2 rotZ = mat2(cz, -sz, sz, cz);
        z3.yz = rotX * z3.yz;
        z3.xz = rotY * z3.xz;
        z3.xy = rotZ * z3.xy;

        // 2. Menger Sorting (The Sponge Logic)
        z3 = abs(z3);
        vec3 ms = z3;
        z3.x = max(max(ms.x, ms.y), ms.z);
        z3.z = min(min(ms.x, ms.y), ms.z);
        z3.y = ms.x + ms.y + ms.z - z3.x - z3.z;
        
        // 3. UBER FEATURE: Inner Box Fold (Param C)
        // Injects Mandelbox-like complexity inside the sponge voids
        if (uParamC > 0.0) {
            float limit = uParamC;
            z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        }

        // 4. Scaling & IFS
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        
        // 5. UBER FEATURE: Z-Scale (Param D)
        // Calculate Adaptive Stretch based on alignment with the Z-Axis.
        float zScale = uParamD;
        float stretchFactor = 1.0;
        
        if (abs(zScale - 1.0) > 0.01) {
            // Stretching: adaptive derivative based on Z-alignment
            // Squashing (zScale<1): conservative bound (1.0) prevents overstepping
            float alignment = abs(z3.z) / (length(z3) + 1.0e-9);
            stretchFactor = mix(1.0, mix(1.0, zScale, alignment), step(1.0, zScale));
            z3.z *= zScale;
        }

        // Injection
        if (uJuliaMode > 0.5) z3 += c.xyz;
        
        // Derivative Update (Chain Rule)
        // We multiply by Scale, then by our Calculated Adaptive Stretch
        dr = dr * abs(scale) * stretchFactor;
        
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_MengerAdvanced(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.236},{label:"Offset",id:"paramB",min:0,max:3,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:.88},mode:"rotation"},{label:"Inner Fold",id:"paramC",min:0,max:1.5,step:.01,default:.618},{label:"Z Scale",id:"paramD",min:.2,max:3,step:.01,default:.442}],defaultPreset:{formula:"MengerAdvanced",features:{atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:.1,glowIntensity:0,glowSharpness:10,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.1,aoMode:!1},materials:{diffuse:.9,reflection:0,specular:.87,roughness:.34,rim:.13,rimExponent:16,envStrength:1,envMapVisible:!0,envBackgroundStrength:.1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:0,color:"#00C0BF",bias:.5,interpolation:"linear"},{id:"1",position:.167,color:"#16B178",bias:.5,interpolation:"linear"},{id:"2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"4",position:.667,color:"#EEBB88",bias:.5,interpolation:"linear"},{id:"5",position:.833,color:"#E83513",bias:.5,interpolation:"linear"},{id:"6",position:1,color:"#CF0B1E",bias:.5,interpolation:"linear"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},coloring:{gradient:[{id:"0",position:0,color:"#070611",bias:.5,interpolation:"linear"},{id:"1",position:.32,color:"#111320",bias:.5,interpolation:"linear"},{id:"2",position:.67,color:"#30306B",bias:.5,interpolation:"linear"},{id:"3",position:.68,color:"#EAAC85",bias:.5,interpolation:"linear"},{id:"4",position:.82,color:"#975F44",bias:.5,interpolation:"linear"},{id:"5",position:.97,color:"#170C05",bias:.5,interpolation:"linear"}],mode:0,scale:11.72,offset:1.93,repeats:1,phase:.64,bias:1,twist:0,escape:1.65,gradient2:[{id:"1",position:0,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"2",position:.47,color:"#353535",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],mode2:0,scale2:32.05,offset2:3.76,repeats2:3.3,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{},quality:{fudgeFactor:1,detail:3,pixelThreshold:.5,maxSteps:300,distanceMetric:0,estimator:1},coreMath:{iterations:12,paramA:2.236,paramB:1,paramC:.618,paramD:.442,vec3A:{x:0,y:0,z:.88}},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:.68,shadowBias:.001,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,lights:[{type:"Point",position:{x:-.985,y:1.872,z:2.008},color:"#ffffff",intensity:9.18,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},optics:{},navigation:{}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.045,y:-.453,z:.141,w:.879},sceneOffset:{x:-4,y:0,z:3,xL:.35,yL:-.27,zL:.18},targetDistance:2.98,cameraMode:"Orbit"}},Ua={id:"Bristorbrot",name:"Bristorbrot",shortDescription:"Custom 3D polynomial with sharp edges and smooth bulbous forms.",description:"A custom polynomial fractal: x²-y²-z², y(2x-z), z(2x+y). No folding — the asymmetric cross-terms between axes create sharp crystalline edges mixed with smooth bulb regions. Supports scale, rotation, twist, and shift.",juliaType:"offset",shader:{function:`
    void formula_Bristorbrot(inout vec4 z, inout float dr, inout float trap, vec4 c, mat2 rotX, mat2 rotZ) {
        vec3 z3 = z.xyz;
        
        // Twist D
        if (abs(uParamD) > 0.001) {
            float ang = z3.z * uParamD;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;
        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = y * (2.0 * x - z_);
        z3.z = z_ * (2.0 * x + y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;
        
        // Shift C (X)
        if (abs(uParamC) > 0.001) z3.x += uParamC;
        
        // Offset B (Y)
        if (abs(uParamB) > 0.001) z3.y += uParamB;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopInit:`
        float angC = uVec3A.x;
        float sC = sin(angC), cC = cos(angC);
        mat2 rotX = mat2(cC, -sC, sC, cC);
        
        float angD = uVec3A.z;
        float sD = sin(angD), cD = cos(angD);
        mat2 rotZ = mat2(cD, -sD, sD, cD);
        `,loopBody:"formula_Bristorbrot(z, dr, trap, c, rotX, rotZ);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Offset",id:"paramB",min:-2,max:2,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"},{label:"Shift X",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"Twist",id:"paramD",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Bristorbrot",features:{coreMath:{iterations:21,paramA:.738,paramB:0,vec3A:{x:0,y:0,z:1.2},paramC:.98,paramD:.97},coloring:{mode:1,repeats:24.4,phase:3.9,scale:24.415,offset:3.906,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.067,glowSharpness:480,glowColor:"#FF2323",glowMode:!0,aoIntensity:0,aoSpread:.22},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.02,envStrength:0,rim:.02,rimExponent:2.6,emission:.004,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:1.04,juliaY:.21,juliaZ:.81,hybridCompiled:!0,hybridMode:!0,hybridIter:1,hybridScale:1,hybridMinR:.79,hybridFixedR:1.08,hybridFoldLimit:.87,hybridSwap:!1},lighting:{shadows:!0,shadowSoftness:2,shadowIntensity:.92,shadowBias:.015},quality:{detail:2.8,fudgeFactor:.6,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.19278471475118408,y:1.0849557120921942,z:5.1524976426487115},cameraRot:{x:-.10384525583017853,y:.016524988834210615,z:-.017944827094612474,w:.994294257635102},cameraFov:60,sceneOffset:{x:1,y:1,z:2,xL:-.17139723987914707,yL:-.09973834195017878,zL:-.12121507460186143},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.16245054993746125,y:.326925950685747,z:-2.2309267197330493},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:39.8,falloff:.6,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Wa={id:"MakinBrot",name:"Makin Brot",shortDescription:"Creates stacked, pagoda-like ornamental structures.",description:"A 3D fractal variant discovered by Makin. Custom polynomial: x²-y²-z², 2xy, 2z(x-y). Supports rotation, shift, and twist.",juliaType:"offset",shader:{function:`
    void formula_MakinBrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = 2.0 * z_ * (x - y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;

        // Vec3A: Shift
        z3 += uVec3A;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_MakinBrot(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"MakinBrot",features:{coreMath:{iterations:24,paramA:1.455,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:1,repeats:1.3,phase:.2,scale:1.298,offset:.207,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.037,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.41,envStrength:0,rim:.09,rimExponent:2,emission:.016,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:-.99,juliaY:.54,juliaZ:-.72,hybridMode:!1,hybridIter:2,hybridScale:2.13,hybridMinR:.72,hybridFixedR:1,hybridFoldLimit:.97},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:6.3,fudgeFactor:.7,pixelThreshold:.1,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:-.8533969657887399,y:-.13446693672101487,z:1.154550164122028},cameraRot:{x:.04129519161407524,y:-.3129924386582225,z:.02381642440995219,w:.948558494991564},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.8442073707354043,yL:-.15795817300110893,zL:.25127901307775025},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-1.5227203148465231,y:-.10858858668233184,z:.5084783790561214},rotation:{x:0,y:0,z:0},color:"#F0F0FF",useTemperature:!0,temperature:6500,intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Xa={id:"Tetrabrot",name:"Tetrabrot",shortDescription:"4D Pseudo-Quaternion set. Produces diamond-like geometric symmetries.",description:"A 4D Mandelbrot set visualization using a specific squaring function. Now with pre-rotation support.",juliaType:"offset",shader:{function:`
    vec4 tetraSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z + q.w*q.w, 2.0*(q.x*q.y - q.z*q.w), 2.0*(q.x*q.z - q.y*q.w), 2.0*(q.x*q.w + q.y*q.z));
    }

    void formula_Tetrabrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        
        // Rotations via vec3A (Z, X, Y axes)
        float angZ = uVec3A.x;
        if (abs(angZ) > 0.001) {
            float s = sin(angZ); float co = cos(angZ);
            z.xy = mat2(co, -s, s, co) * z.xy;
        }

        float angX = uVec3A.y;
        if (abs(angX) > 0.001) {
            float s = sin(angX); float co = cos(angX);
            z.yz = mat2(co, -s, s, co) * z.yz;
        }

        float angY = uVec3A.z;
        if (abs(angY) > 0.001) {
            float s = sin(angY); float co = cos(angY);
            z.xz = mat2(co, -s, s, co) * z.xz;
        }

        // Fix: Chain rule +1.0
        dr = 2.0 * length(z) * dr + 1.0;
        z = tetraSquare(z) + c;
        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Tetrabrot(z, dr, trap, c);"},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.2},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"Tetrabrot",features:{coreMath:{iterations:28,paramA:.186,paramB:0,vec3A:{x:0,y:0,z:0}},coloring:{mode:5,repeats:1,phase:.87,scale:1,offset:.87,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766256604050_0",position:0,color:"#0A4CD3",bias:.5,interpolation:"linear"},{id:"1766256604050_1",position:.5,color:"#3E7FAA",bias:.5,interpolation:"linear"},{id:"1766256604050_2",position:1,color:"#62E9E9",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:.4,aoSpread:.16},materials:{reflection:.35,specular:1.98,roughness:.11,diffuse:2,envStrength:0,rim:0,rimExponent:2,emission:.008,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!1,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.4920528506922438,y:-.07167206331378606,z:.4438830367018614},cameraRot:{x:-.2287674791967978,y:.3386642094524777,z:-.6145511225348657,w:.6747584097208478},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.43671384293273163,yL:-.013902955556870706,zL:.11442336133892608},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.554923231509613,y:-.15190121945393503,z:-.030795909267397503},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Ya={id:"Buffalo",name:"Buffalo 3D",shortDescription:'Mandelbulb with per-axis absolute value folds — creates the signature "buffalo" shape.',description:"The Buffalo fractal (ported from Mandelbulber via 3Dickulus). A Mandelbulb variant with selective per-axis absolute value folding before and after the power iteration. The default abs on Y+Z creates the distinctive buffalo/horn shape. Based on the original by youhn @ fractalforums.com.",juliaType:"julia",shader:{function:`
    void formula_Buffalo(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Vec3B: Abs before power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3B));

        gmt_applyRodrigues(z3);

        // Mandelbulb power iteration (branchless)
        float r = max(length(z3), 1.0e-9);
        float power = uParamA;
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;

        float theta = acos(clamp(z3.z / r, -1.0, 1.0));
        float phi_angle = atan(z3.y, z3.x);
        float zr = rp1 * r;
        theta *= power;
        phi_angle *= power;

        z3 = zr * vec3(sin(theta) * cos(phi_angle), sin(phi_angle) * sin(theta), cos(theta));

        // Vec3A: Abs after power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3A));

        z3 += c.xyz;
        z.xyz = z3;
        trap = min(trap, r);
    }`,loopBody:"formula_Buffalo(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3C);",usesSharedRotation:!0},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.001,default:2},{label:"Abs After Power",id:"vec3A",type:"vec3",min:0,max:1,step:1,default:{x:0,y:1,z:1},mode:"toggle"},{label:"Abs Before Power",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Buffalo",features:{coreMath:{iterations:21,paramA:2,vec3A:{x:0,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.21,scale:10.928878861622898,offset:1.0718989457927122,bias:1,twist:0,escape:5,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#aaccff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1766251986254_0",position:0,color:"#330600",bias:.5,interpolation:"linear"},{id:"1766252034417",position:.13654618473895586,color:"#BC2900",bias:.5,interpolation:"linear"},{id:"1766251986254_1",position:.3,color:"#FFAF0D",bias:.5,interpolation:"linear"},{id:"1766252020600",position:.5180722891566265,color:"#743C14",bias:.5,interpolation:"linear"},{id:"1766252024362",position:.6224899598393574,color:"#0B091D",bias:.5,interpolation:"linear"},{id:"1766251986254_2",position:.7,color:"#001B3D",bias:.5,interpolation:"linear"},{id:"1766251986254_3",position:1,color:"#700303",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},ao:{aoIntensity:0,aoSpread:.2,aoSamples:7,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.5,reflection:0,specular:.27,roughness:.342,rim:0,rimExponent:4,envStrength:.65,envBackgroundStrength:.21,envSource:1,useEnvMap:!1,envRotation:0,emission:.1,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773425036101_0",position:0,color:"#421E0F",bias:.5,interpolation:"linear"},{id:"1773425036101_1",position:.067,color:"#19071A",bias:.5,interpolation:"linear"},{id:"1773425036101_2",position:.133,color:"#09012F",bias:.5,interpolation:"linear"},{id:"1773425036101_3",position:.2,color:"#040449",bias:.5,interpolation:"linear"},{id:"1773425036101_4",position:.267,color:"#000764",bias:.5,interpolation:"linear"},{id:"1773425036101_5",position:.333,color:"#0C2C8A",bias:.5,interpolation:"linear"},{id:"1773425036101_6",position:.4,color:"#1852B1",bias:.5,interpolation:"linear"},{id:"1773425036101_7",position:.467,color:"#397DD1",bias:.5,interpolation:"linear"},{id:"1773425036101_8",position:.533,color:"#86B5E5",bias:.5,interpolation:"linear"},{id:"1773425036101_9",position:.6,color:"#D3ECF8",bias:.5,interpolation:"linear"},{id:"1773425036101_10",position:.667,color:"#F1E9BF",bias:.5,interpolation:"linear"},{id:"1773425036101_11",position:.733,color:"#F8C95F",bias:.5,interpolation:"linear"},{id:"1773425036101_12",position:.8,color:"#FFAA00",bias:.5,interpolation:"linear"},{id:"1773425036101_13",position:.867,color:"#CC8000",bias:.5,interpolation:"linear"},{id:"1773425036101_14",position:.933,color:"#995700",bias:.5,interpolation:"linear"},{id:"1773425036101_15",position:1,color:"#6A3403",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:.37,juliaY:-.34,juliaZ:-.42,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1.618,fudgeFactor:1,pixelThreshold:.25,maxSteps:300,estimator:0},optics:{camFov:50,dofStrength:0,dofFocus:1.407048060869024}},cameraPos:{x:-11409465865707341e-33,y:10722232409131055e-32,z:-.09316535897248968},cameraRot:{x:1,y:-7271568003412109e-48,z:-6123233995736766e-32,w:3710962377975202e-33},cameraFov:50,sceneOffset:{x:-17223652652763669e-32,y:9193078863633456e-32,z:-2.6897222995758057,xL:-4285372606041406e-39,yL:-9521451285809295e-41,zL:-39146655694821675e-24},targetDistance:.09316535897248968,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.4527317101694649,y:-.04511061025925526,z:-2.1858885005397504},rotation:{x:0,y:0,z:0},color:"#FFCEA6",intensity:.75,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4e3},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Za={id:"Modular",name:"Modular Builder",shortDescription:"Construct custom fractal equations using a Node Graph.",description:"Construct your own fractal equation by chaining operations together. Combine folds, rotations, and logic via the Graph tab.",juliaType:"none",shader:{function:"",loopBody:"",getDist:""},parameters:[null,null,null,null],defaultPreset:{formula:"Modular",features:{coreMath:{iterations:16,paramA:8,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002}},pipeline:gt,cameraPos:{x:0,y:0,z:4},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}}},_t={id:"MandelTerrain",name:"MandelTerrain",shortDescription:'3D Heightmap of the Mandelbrot set. Creates alien landscapes and "Math Mountains".',description:"A 3D Heightmap of the Mandelbrot set. Iterations slider controls terrain detail.",juliaType:"julia",shader:{function:`
    void formula_MandelTerrain(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec2 p = z.xz;
        
        // --- Zoom Logic ---
        float zoomVal = uParamB; 
        float zoom = pow(2.0, zoomVal);
        vec2 center = uVec2A;
        
        // Map 3D pos to 2D Complex Plane
        vec2 mapPos = p * (2.0 / zoom) + center;
        
        // --- Julia / Mandelbrot Switch ---
        vec2 c2;
        vec2 z2;
        vec2 dz;
        
        bool isJulia = uJuliaMode > 0.5;
        
        if (isJulia) {
            // Julia Mode: C is constant, Z starts at pixel
            c2 = uJulia.xy;
            z2 = mapPos;
            dz = vec2(1.0, 0.0); // Derivative starts at 1
        } else {
            // Mandelbrot Mode: C is pixel, Z starts at 0
            c2 = mapPos;
            z2 = vec2(0.0);
            dz = vec2(0.0); // Derivative starts at 0
        }
        
        float m2 = 0.0;
        float trapDist = 1e20;
        
        // Accumulate trap height (Summation for smooth blending)
        float trapHeightAccum = 0.0;
        float runAtten = 1.0;
        
        // Fixed Attenuation Factor (User Preference)
        float attenDecay = 0.777;
        
        // COMPILER OPTIMIZATION: Use int loop with uLoopGuard
        int maxIter = int(uIterations);
        int limit = maxIter;
        
        float iter = 0.0;
        float smoothVal = 0.0;
        float dist = 0.0;
        bool escaped = false;

        // Local hard limit high enough for deep zooms but low enough to avoid compiler hangs
        const int MAX_FORMULA_ITER = 2000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i > limit) break;

            // --- BURNING SHIP SUPPORT ---
            if (uBurningEnabled > 0.5) {
                 // Flip derivative to maintain DE continuity across axes
                 dz *= sign(z2 + vec2(1e-10));
                 z2 = abs(z2);
            }

            // Derivative: dz = 2*z*dz (+ 1 if Mandelbrot)
            // (Chain rule for z^2 + c)
            float dzx = 2.0 * (z2.x * dz.x - z2.y * dz.y);
            float dzy = 2.0 * (z2.x * dz.y + z2.y * dz.x);
            
            if (!isJulia) {
                dzx += 1.0;
            }
            
            dz = vec2(dzx, dzy);

            // Z = Z^2 + C
            float x = (z2.x * z2.x - z2.y * z2.y) + c2.x;
            float y = (2.0 * z2.x * z2.y) + c2.y;
            z2 = vec2(x, y);
            
            m2 = dot(z2, z2);
            
            // Standard Trap Tracking (for coloring)
            trapDist = min(trapDist, m2);
            
            // --- Trap Height Accumulation ---
            // Sum contributions. 
            // Allow negative param D to work (abs check)
            if (abs(uParamD) > 0.001 && m2 < 0.25) {
                float distToOrigin = sqrt(m2);
                
                // Smooth shape (Metaball-like blending)
                float t = smoothstep(0.5, 0.0, distToOrigin);
                
                // Accumulate with attenuation
                trapHeightAccum += t * runAtten;
            }
            
            // Decay influence for deeper iterations
            runAtten *= attenDecay;
            
            // Use global Escape Threshold (usually squared radius)
            // Default escape is 4.0 (radius 2.0), but allowing it to grow helps decomposition
            if (m2 > uEscapeThresh) { 
                escaped = true;
                // Smooth Iteration Count
                // Renormalize based on log of threshold to keep bands consistent
                float threshLog = log2(uEscapeThresh); // usually 2.0 for 4.0
                smoothVal = float(i) + 1.0 - log2(log2(m2) / threshLog);
                
                // Analytical Distance Estimation
                float r = sqrt(m2);
                float dr_mag = length(dz);
                dist = 0.5 * log(m2) * r / dr_mag;
                
                // CRITICAL: Overwrite Trap with Magnitude ONLY for "Potential" Coloring Mode (8)
                // Otherwise preserve minTrap for Orbit Trap Mode (0)
                if (abs(uColorMode - 8.0) < 0.1 || abs(uColorMode2 - 8.0) < 0.1) {
                    trapDist = r; 
                }
                break;
            }
        }
        
        // --- Heightmap Calculation ---
        float h = 0.0;
        
        if (escaped) {
            // 1. Base Terrain (Param A)
            // 'dist' goes to 0.0 exactly at the boundary.
            // FIXED: Use sqrt(dist * zoom) instead of sqrt(dist) * zoom to keep height
            // proportional to feature width regardless of zoom level.
            // This prevents "spikes" from growing uncontrollably deep in the set.
            h += sqrt(dist * zoom) * uParamA;
            
            // 2. Layer 2 Driven Ripples (Param C) - Driven by Gradient Brightness
            if (abs(uParamC) > 0.001) {
                // Compute Decomposition Angle for Mapping
                float decomp = atan(z2.y, z2.x) * 0.15915 + 0.5;
                
                // Construct proxy result to feed coloring engine
                // Components: x=dist, y=trap, z=iter, w=decomp
                vec4 resProxy = vec4(0.0, trapDist, smoothVal, decomp);
                
                // Construct 3D pos proxy using the mapping position (consistent texture space)
                vec3 pProxy = vec3(mapPos.x, 0.0, mapPos.y);
                
                // Get Mapping Value from Layer 2 Mode (e.g. Angle, Trap, Iterations)
                float l2Val = getMappingValue(uColorMode2, pProxy, resProxy, vec3(0,1,0), uColorScale2);
                
                // Apply Twist 2 if active
                if (abs(uColorTwist2) > 0.001) {
                    float dOrig = length(pProxy);
                    l2Val += dOrig * uColorTwist2;
                }
                
                // Calculate Pattern Phase
                float t2Raw = l2Val * uColorScale2 + uColorOffset2;
                float t2 = fract(t2Raw);
                
                // Sample Gradient 2 for height (Whiteness = Height)
                // SAFE HELPER: Using textureLod0 via math.ts
                vec3 gCol = textureLod0(uGradientTexture2, vec2(t2, 0.5)).rgb;
                float brightness = dot(gCol, vec3(0.299, 0.587, 0.114));
                
                // Apply Displacement
                h += brightness * uParamC;
            }
        } else {
            // Inside the set (The Lake)
            h = 0.0; 
        }
        
        // 3. Orbit Trap Spikes (Param D)
        // Scaled by Zoom to maintain relative visual height
        // Supports negative values (depressions)
        if (abs(uParamD) > 0.001) {
            h += trapHeightAccum * uParamD * zoom * 0.03;
        }
        
        h = clamp(h, -50.0, 50.0);
        
        // SDF Calculation (y is Up)
        float d = (z.y - h) * 0.5;
        
        // --- Output ---
        
        // Encode Angle into Z so DE_MASTER can extract Decomposition
        float angle = 0.0;
        if (dot(z2, z2) > 1e-9) {
            angle = atan(z2.y, z2.x);
        }
        
        float mag = abs(d);
        z = vec4(mag * cos(angle), mag * sin(angle), 0.0, 0.0);
        
        // Final Trap Output: Either minTrap or Magnitude (if escaped)
        // Fix: Use sqrt of trapDist to normalize Orbit Trap coloring range
        trap = sqrt(trapDist);
        dr = smoothVal;
    }`,loopBody:"formula_MandelTerrain(z, dr, trap, c); break;",getDist:`
            // Standard return
            return vec2(r, dr);
        `},parameters:[{label:"Map Zoom",id:"paramB",min:0,max:16,step:.01,default:1},{label:"Pan (Real, Imag)",id:"vec2A",type:"vec2",min:-2,max:2,step:1e-4,default:{x:0,y:0}},{label:"Height: Distance Estimator",id:"paramA",min:-5,max:5,step:.01,default:0},{label:"Height: Layer 2 Gradient",id:"paramC",min:-.2,max:.2,step:.001,default:0},{label:"Height: SmoothTrap",id:"paramD",min:-5,max:5,step:.01,default:0}],defaultPreset:{version:1,name:"MandelTerrain",formula:"MandelTerrain",features:{coreMath:{iterations:60,paramA:0,paramB:1,paramC:0,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.86,juliaY:-.22,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowSteps:128,shadowSoftness:19.5,shadowIntensity:1,shadowBias:1e-4,lights:[{position:{x:-.77,y:1.82,z:-.49},color:"#ffeedd",intensity:2,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{position:{x:-5,y:2,z:-5},color:"#4455aa",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1},{position:{x:0,y:5,z:-5},color:"#ffffff",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1}]},ao:{aoIntensity:0,aoSpread:.11,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:30,fogColor:"#051020",fogDensity:.02,glowIntensity:0,glowSharpness:3.8,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.2,rim:0,rimExponent:3,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,envMapData:null,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],emission:.3,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:[{id:"0",position:0,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.153,color:"#0063A5",bias:.5,interpolation:"linear"},{id:"2",position:.324,color:"#0093F5",bias:.749,interpolation:"linear"},{id:"3",position:.895,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"4",position:.908,color:"#000000",bias:.5,interpolation:"linear"}],mode:7,scale:.2710027100271003,offset:-.007588075880758799,repeats:1,phase:-.2,bias:1,twist:0,escape:20,gradient2:[{id:"1",position:.077,color:"#000000",bias:.52,interpolation:"smooth"},{id:"2",position:.196,color:"#020202",bias:.83,interpolation:"smooth"},{id:"3",position:.857,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.925,color:"#797979",bias:.5,interpolation:"linear"}],mode2:0,scale2:.74,offset2:.55,repeats2:1,phase2:.43,bias2:1,twist2:0,blendMode:0,blendOpacity:0},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:0,fudgeFactor:.35,detail:1.1,pixelThreshold:.5,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1.5,levelsMin:0,levelsMax:.5,levelsGamma:.77},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.7071067811865476,y:0,z:0,w:.7071067811865475},sceneOffset:{x:-.082,y:3.17,z:-.38,xL:.082,yL:-.1700000000000009,zL:.3800000000000002},targetDistance:2.997344970703125,cameraMode:"Orbit",lights:[]}},Qa={id:"MarbleMarcher",name:"Marble Marcher",shortDescription:"The dynamic fractal from the game Marble Marcher. Fast rendering, geometric feel.",description:"The dynamic fractal from the game Marble Marcher. A specialized Menger Sponge IFS with rotation and shifting steps.",juliaType:"offset",shader:{preamble:`
    // MarbleMarcher: Pre-calculated rotation matrices (computed once per frame)
    // Two separate rotations at different algorithm stages
    float uMM_sZ = 0.0, uMM_cZ = 1.0;
    float uMM_sX = 0.0, uMM_cX = 1.0;
    float uMM_sY = 0.0, uMM_cY = 1.0;

    void MarbleMarcher_precalcRotation() {
        if (abs(uVec3B.x) > 0.001) {
            uMM_sZ = sin(uVec3B.x);
            uMM_cZ = cos(uVec3B.x);
        }
        if (abs(uVec3B.y) > 0.001) {
            uMM_sX = sin(uVec3B.y);
            uMM_cX = cos(uVec3B.y);
        }
        if (abs(uVec3B.z) > 0.001) {
            uMM_sY = sin(uVec3B.z);
            uMM_cY = cos(uVec3B.z);
        }
    }`,function:`
    void formula_MarbleMarcher(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Abs
        z3 = abs(z3);

        // 2. Rot Z (Vec3B.x) — applied after abs
        if (abs(uVec3B.x) > 0.001) {
            z3.xy = mat2(uMM_cZ, uMM_sZ, -uMM_sZ, uMM_cZ) * z3.xy;
        }

        // 3. Menger Fold (sort descending)
        float a = min(z3.x - z3.y, 0.0); z3.x -= a; z3.y += a;
        a = min(z3.x - z3.z, 0.0); z3.x -= a; z3.z += a;
        a = min(z3.y - z3.z, 0.0); z3.y -= a; z3.z += a;

        // 4. Rot X (Vec3B.y) — applied after Menger fold
        if (abs(uVec3B.y) > 0.001) {
            z3.yz = mat2(uMM_cX, uMM_sX, -uMM_sX, uMM_cX) * z3.yz;
        }

        // 4b. Rot Y (Vec3B.z) — applied after X rotation
        if (abs(uVec3B.z) > 0.001) {
            z3.xz = mat2(uMM_cY, uMM_sY, -uMM_sY, uMM_cY) * z3.xz;
        }

        // 5. Scale (Param A)
        float scale = uParamA;
        z3 *= scale;
        dr *= abs(scale);

        // 6. Vec3A: Shift X/Y/Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;

        // Box trap for coloring
        vec3 boxDist = abs(z3) - vec3(1.0);
        trap = min(trap, length(max(boxDist, 0.0)) + min(max(boxDist.x, max(boxDist.y, boxDist.z)), 0.0));
    }`,loopBody:"formula_MarbleMarcher(z, dr, trap, c);",loopInit:"MarbleMarcher_precalcRotation();",preambleVars:["uMM_sZ","uMM_cZ","uMM_sX","uMM_cX","uMM_sY","uMM_cY"],getDist:`
            float limit = 6.0;
            return vec2((r - limit) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Shift",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:-2,y:-2,z:-2}},{label:"Rotation (Z, X, Y)",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"MarbleMarcher",features:{coreMath:{iterations:21,paramA:1.89,vec3A:{x:-2.16,y:-2.84,z:-2.47},vec3B:{x:-.047,y:.025,z:0}},coloring:{mode:6,repeats:2.5,phase:0,scale:1,offset:0,bias:1,twist:0,escape:16.18,mode2:6,repeats2:250,phase2:5,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766936009557_0",position:.0369,color:"#130606",bias:.5,interpolation:"linear"},{id:"1766936025161",position:.1409,color:"#463434",bias:.5,interpolation:"linear"},{id:"1766936020401",position:.4194,color:"#828282",bias:.5,interpolation:"linear"},{id:"1766936032564",position:.6879,color:"#BCBCBC",bias:.5,interpolation:"linear"},{id:"1766936039597",position:1,color:"#875656",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},texturing:{active:!1,scaleX:4,scaleY:24,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{reflection:-.44,specular:0,roughness:.5,diffuse:.92,envStrength:0,rim:0,rimExponent:4,emission:.085,emissionColor:"#ffffff",emissionMode:1,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#7E6861",fogDensity:0,glowIntensity:1e-4,glowSharpness:400,glowColor:"#ffffff",glowMode:!1,aoIntensity:.44,aoSpread:.28,aoMode:!1},geometry:{juliaMode:!1,juliaX:-2,juliaY:.86,juliaZ:-2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:7e-4},quality:{detail:1.1,fudgeFactor:.62,pixelThreshold:.5,maxSteps:300,distanceMetric:1},optics:{dofStrength:0,dofFocus:4.65}},cameraPos:{x:1.7472844097880647,y:-1.3734380139592728,z:2.8232426812200377},cameraRot:{x:.23927126357209905,y:.22332520402424524,z:.14464802218445671,w:.9337837358587185},cameraFov:75,sceneOffset:{x:2,y:-2,z:2,xL:-.25680194984918847,yL:.6967983054660813,zL:.44809374764147025},targetDistance:.5,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.936,y:-2.75,z:6.21},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8,falloff:.67,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-5,y:-2,z:2},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-5},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1}]}},Ka={id:"JuliaMorph",name:"Julia Morph (Stack)",shortDescription:'Constructs 3D volumes by stacking 2D Julia sets. Perfect for topographic or sliced "MRI" effects.',description:"Constructs a 3D object by stacking 2D Julia sets along the Z-axis. Start C and End C define the Julia constants at the bottom and top. The constant smoothly interpolates between them along the height.",juliaType:"julia",shader:{function:`
    void formula_JuliaMorph(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // --- 1. MAPPING & DEFORMATION ---
        float height = max(0.1, uParamA);
        float z_val = p.z;
        float taperFactor = 1.0;

        // Bend FIRST: Curve the column along X-axis (works on original p)
        // paramD = bend direction (signed distance), abs value = curvature amount
        // Must come before twist/taper since it remaps all coordinates
        if (abs(uParamD) > 0.001) {
            float R = 20.0 / abs(uParamD);
            float sd = sign(uParamD);
            // Mirror X for negative bend, bend around +X pivot, then mirror back
            float px = p.x * sd;
            float px_shifted = px + R;
            float dist = length(vec2(px_shifted, p.z));
            float ang = atan(p.z, px_shifted);
            // Unbend: radial distance becomes new X, arc length becomes new Z
            p.x = (dist - R) * sd;
            z_val = ang * R;
        }

        float t = clamp((z_val / height) + 0.5, 0.0, 1.0);
        vec2 Z = p.xy;

        // Taper: scale XY based on Z position, with DE compensation
        if (abs(uParamE) > 0.001) {
            taperFactor = 1.0 + t * uParamE;
            Z *= taperFactor;
        }

        // Twist: Rotate XY around center based on Z
        if (abs(uParamC) > 0.001) {
            float ang = z_val * uParamC;
            float s = sin(ang); float co = cos(ang);
            Z = mat2(co, -s, s, co) * Z;
        }

        // --- 2. INTERPOLATION ---
        vec2 c1 = uVec2B;
        vec2 c2 = uVec2A;
        float t_smooth = t * t * (3.0 - 2.0 * t);
        vec2 C = mix(c1, c2, t_smooth);

        // --- 3. 2D JULIA ITERATION ---
        float r2 = dot(Z,Z);
        float dz_2d = 1.0;
        float iter_count = 0.0;

        float bailout = 10000.0;
        int limit = int(uIterations);
        float localTrap = 1e10;

        bool escaped = false;

        const int MAX_FORMULA_ITER = 3000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i >= limit) break;

            // Derivative: |dz'| = 2|z| * |dz|
            dz_2d *= 2.0 * sqrt(r2);
            if (dz_2d > 1.0e10) dz_2d = 1.0e10;

            // Z = Z^2 + C
            float nx = (Z.x * Z.x - Z.y * Z.y) + C.x;
            float ny = (2.0 * Z.x * Z.y) + C.y;
            Z = vec2(nx, ny);

            r2 = dot(Z,Z);
            localTrap = min(localTrap, r2);
            iter_count += 1.0;

            if(r2 > bailout) {
                escaped = true;
                break;
            }
        }

        // --- 4. SMOOTH ITERATION ---
        float smooth_iter;
        if (escaped) {
            float logZn = log(r2) / 2.0;
            float nu = log(logZn / log(2.0)) / log(2.0);
            smooth_iter = iter_count + 1.0 - nu;
        } else {
            smooth_iter = iter_count;
        }

        // --- 5. DISTANCE ESTIMATION ---
        float d2d;
        if (escaped && dz_2d > 1.0e-7) {
             // Exterior: standard 2D Julia DE
             d2d = 0.5 * sqrt(r2) * log(r2) / dz_2d;
        } else {
             // Interior: approximate negative distance from boundary
             // Use sqrt of orbit trap (minimum r² seen) as rough interior distance
             d2d = -sqrt(localTrap) * 0.5;
        }

        // Taper DE compensation: scaled coordinates produce scaled distances
        if (abs(taperFactor) > 0.01) {
            d2d /= abs(taperFactor);
        }

        // Twist DE correction: twist stretches space by sqrt(1 + (twist_rate * r_xy)^2)
        // This is the Jacobian correction for the twist deformation
        if (abs(uParamC) > 0.001) {
            float r_xy = length(p.xy);
            d2d /= sqrt(1.0 + uParamC * uParamC * r_xy * r_xy);
        }

        // Bend DE correction: bend compresses/stretches distances depending on
        // distance from the bend axis. Correction factor = R / (R + p.x)
        if (abs(uParamD) > 0.001) {
            float bendR = 20.0 / abs(uParamD);
            float bendCorr = bendR / max(bendR + p.x * sign(uParamD), 0.1);
            d2d *= bendCorr;
        }

        // Vertical Box Bounds (using warped z_val)
        float d_z = abs(z_val) - (height * 0.5);

        // Combine: Intersection of Julia Column + Height Box
        float d = max(d2d, d_z);

        // --- 6. SLICING ---
        float sliceInterval = uParamF;
        if (sliceInterval > 0.01) {
            float ratio = clamp(uParamB, 0.01, 0.95);
            float thickness = (sliceInterval * 0.5) * ratio;
            float distToSlice = abs(mod(z_val, sliceInterval) - sliceInterval * 0.5) - thickness;
            d = max(d, distToSlice);
        }

        trap = min(trap, localTrap);

        // Return packed result
        z = vec4(Z.x, Z.y, d, smooth_iter);
    }`,loopBody:"formula_JuliaMorph(z, dr, trap, c); break;",getDist:`
            return vec2(z.z, z.w);
        `},parameters:[{label:"Height (Z Scale)",id:"paramA",min:.1,max:10,step:.1,default:5},{label:"Slice Interval",id:"paramF",min:0,max:2,step:.01,default:.33},{label:"Slice Thickness",id:"paramB",min:.01,max:1,step:.01,default:.27},{label:"Start C",id:"vec2B",type:"vec2",min:-2,max:2,step:.001,default:{x:1.03,y:-1.072}},{label:"End C",id:"vec2A",type:"vec2",min:-2,max:2,step:.001,default:{x:.286,y:.009}},{label:"Twist",id:"paramC",min:-5,max:5,step:.01,default:0,scale:"pi"},{label:"Bend",id:"paramD",min:-5,max:5,step:.01,default:0},{label:"Taper",id:"paramE",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"JuliaMorph",features:{coreMath:{iterations:100,paramA:5,paramB:.27,paramC:0,paramF:.53,vec2A:{x:.286,y:.009},vec2B:{x:1.03,y:-1.072}},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:1,scale:4.697920323185873,offset:.13,repeats:1,phase:.13,bias:1,escape:4,gradient:[{id:"1",position:0,color:"#080022",bias:.5,interpolation:"linear"},{id:"2",position:.3,color:"#1C2058",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#00ccff",bias:.5,interpolation:"linear"},{id:"4",position:.735261118203675,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1768818072358",position:1,color:"#090022",bias:.5,interpolation:"linear"}],mode2:0,scale2:.4003079069279198,offset2:.48021004308135196,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:1,gradient2:[{id:"1768817090653_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1768817090653_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1768817090653_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1768817090653_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1768817090653_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1768817090653_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1768817090653_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1768817090653_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1768817090653_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1768817090653_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},atmosphere:{fogNear:0,fogFar:5,fogColor:"#050510",fogDensity:.02,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:0,aoSpread:.2,aoMode:!1},materials:{diffuse:1,reflection:0,specular:.61,roughness:.22438819237827662,rim:0,rimExponent:4,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},lighting:{shadows:!0,shadowSoftness:41.7859226170808,shadowIntensity:.92,shadowBias:.002,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1},quality:{fudgeFactor:1,detail:4,pixelThreshold:.5,maxSteps:300,distanceMetric:0},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.42,autoSlow:!0}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.21740819322063967,y:.12483788618539499,z:-.11589452875015582,w:.9611023035551793},sceneOffset:{x:0,y:-1,z:4,xL:.10960732222484179,yL:-.26099943689461447,zL:.15599693750325688},targetDistance:2.512885481119156,cameraMode:"Fly",lights:[{type:"Point",position:{x:2.056650977487994,y:-.7418778505604411,z:3.39849758131238},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8.76,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.37117243582015064,y:-1.5852765971855902,z:3.0489919017830487},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},Mt={id:"Mandelorus",name:"Mandelorus",shortDescription:'The "True" 3D Mandelbrot topology. Wraps space around a ring instead of a point.',description:"Wraps the fractal iteration around a Torus (Donut). Creates a Solenoid structure. Twist is linked to Power: 1.0 Twist = 1 Symmetry Shift (360/Power).",juliaType:"julia",shader:{function:`
        void formula_Mandelorus(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 p = z.xyz;
            float R = uParamA;       // Major Radius
            float twistInput = uParamB;   // Twist Steps (1.0 = 1 Symmetry Unit)
            float power = uParamC;   // Fractal Power
            
            // Phase controls (vec2A: ring phase, cross phase)
            float ringPhase = uVec2A.x;
            float crossPhase = uVec2A.y;
            
            float zScale = 1.0 + uParamF; // Vertical Scale
            
            // 1. Toroidal Decomposition
            float lenXY = length(p.xy);
            // phi: The angle around the major ring (0 to 2PI)
            float phi = atan(p.y, p.x); 
            
            // q: The cross-section complex plane relative to the ring center
            vec2 q = vec2(lenXY - R, p.z * zScale);
            
            // 2. Twist (Pre-iteration)
            // Rotates the cross-section as we travel around the ring.
            // We want 1.0 "Twist Input" to equal 1 "Symmetry Step".
            // A Symmetry Step is (2 * PI) / Power.
            // So Total Rotation should be: phi * (TwistInput / Power).
            if (abs(twistInput) > 0.001) {
                float rotAng = phi * twistInput / max(1.0, power);
                float s = sin(rotAng); 
                float co = cos(rotAng);
                q = mat2(co, -s, s, co) * q;
            }

            // 3. Complex Power (The Fiber Iteration)
            float r2 = dot(q, q);
            float r = sqrt(r2);
            float angleQ = atan(q.y, q.x);
            
            // Apply Cross Phase (Theta)
            angleQ += crossPhase;

            // --- STABILITY IMPROVEMENT ---
            // Calculate derivative with compensation for Twist and Z-Scale
            
            float dr_cross = power * pow(r, power - 1.0);
            
            // The effective expansion is the max of the Ring expansion (Power)
            // and the Cross-Section expansion (dr_cross).
            float expansion = max(power, dr_cross);
            
            // Pad derivative based on Z-Scale
            expansion *= max(1.0, zScale);
            
            // Pad derivative based on Twist intensity
            // High twist stretches space, requiring smaller steps
            expansion *= (1.0 + abs(twistInput) * 0.3);

            dr = dr * expansion + 1.0;
            
            // Apply Power to Cross Section
            float newR = pow(r, power);
            float newAngleQ = angleQ * power;
            q = newR * vec2(cos(newAngleQ), sin(newAngleQ));
            
            // 4. Solenoidal Wrapping (The Base Iteration)
            // phi -> n * phi + turn
            phi = phi * power + ringPhase;
            
            // 5. Reconstruction (Map back to 3D)
            vec2 ringPos = vec2(cos(phi), sin(phi));
            
            vec3 p_next;
            p_next.xy = ringPos * (R + q.x); // Expand ring by new q.x
            p_next.z = q.y; 
            
            // 6. Addition of C
            p_next += c.xyz;
            
            z.xyz = p_next;
            
            // Trap: Use cross-section magnitude
            trap = min(trap, r2);
        }`,loopBody:"formula_Mandelorus(z, dr, trap, c);"},parameters:[{label:"Ring Radius",id:"paramA",min:.1,max:5,step:.01,default:1},{label:"Twist (Sym)",id:"paramB",min:-8,max:8,step:.1,default:0},{label:"Power",id:"paramC",min:1,max:16,step:.01,default:8},{label:"Phase (Ring, Cross)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Vert Scale",id:"paramF",min:-.9,max:2,step:.01,default:0}],defaultPreset:{version:2,name:"Mandelorus",formula:"Mandelorus",features:{coreMath:{iterations:31,paramA:1.32,paramB:0,paramC:5,paramF:0,vec2A:{x:0,y:-1.159203974648639}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:1.8089856063656191,y:.769231473548869,z:-3.1565777253328235},rotation:{x:.08548818739394098,y:2.7391915549407027,z:.41340674852481984},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.3992177013734381,aoSpread:.12250592248526632,aoSamples:5,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0013419894295067058,glowSharpness:13.803842646028853,glowMode:!0,glowColor:"#ff0000"},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:.4,emissionMode:2,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771161402247_0",position:.07178750897343862,color:"#141414",bias:.5,interpolation:"linear"},{id:"1771161413328",position:.1225174070688263,color:"#F40000",bias:.5,interpolation:"linear"},{id:"1771161432807",position:.1627184120939519,color:"#FFA9A9",bias:.5,interpolation:"linear"},{id:"1771161412141",position:.2027890750198856,color:"#0D0D0D",bias:.5,interpolation:"linear"},{id:"1771161402247_1",position:.6090930507893446,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1771161445770",position:1,color:"#181818",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:5,offset:.30000000000000004,repeats:1,phase:-.7,bias:1,twist:0,escape:4,gradient2:{stops:[{id:"1771161496387_0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_1",position:.07083040060795048,color:"#550000",bias:.5,interpolation:"linear"},{id:"1771161496387_2",position:.1627184120939519,color:"#FF2222",bias:.5,interpolation:"linear"},{id:"1771161496387_3",position:.2027890750198856,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_4",position:.6090930507893446,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_5",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode2:0,scale2:4.999999999999999,offset2:.30000000000000004,repeats2:1,phase2:-.7,bias2:1,twist2:0,blendMode:1,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:1,y:-727156800341211e-47,z:-6123233995736766e-32,w:3710962377975166e-33},sceneOffset:{x:.02015586569905281,y:.005605148617178202,z:-5.211455821990967,xL:5716822570889235e-25,yL:21298747235435714e-26,zL:-22618142203612024e-23},targetDistance:5.214554250240326,cameraMode:"Orbit",lights:[]}},Ja={id:"Appell",name:"Appell Spectral (Ghost)",shortDescription:"Simplified Appell polynomial iteration. Renders skeletal, interference-like structures.",description:'Implements a simplified Appell polynomial: P(x) = x^n - k|x|^2, where the non-conformal subtraction destabilizes the surface, revealing skeletal interference patterns. The "Interference" parameter k controls how much structure is stripped away. Best viewed as a volumetric cloud.',juliaType:"none",shader:{function:`
    void formula_Appell(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        float r = length(p);
        
        // Param A: Interference Factor (k)
        // 0.333 is the theoretical "Euclidean" balance. 
        // Higher values strip the "flesh" off the fractal, leaving the skeleton.
        float k = uParamA;
        
        // Param B: Power (approximate)
        float power = uParamB;
        
        // Param C: Ghost Shift (4th Dimension Bias)
        // Adds a constant bias to the magnitude calculation, simulating a 4D slice.
        float bias = uParamC;
        
        // --- The Appell Polynomial Iteration ---
        
        // 1. Standard Hypercomplex Power
        // We use spherical conversion for generic power support
        float theta = acos(clamp(p.z / r, -1.0, 1.0));
        float phi = atan(p.y, p.x);
        
        // Apply rotation/twist
        phi += uParamE; 
        
        float zr = pow(r, power);
        theta *= power;
        phi *= power;
        
        vec3 p_hyper = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        
        // 2. The Appell Subtraction
        // P_k(x) = x^k - k * |x|^2 ... (Simplified)
        // We subtract the magnitude squared from the Real component (X-axis in this projection)
        // This is the non-conformal "correction" that reveals the skeleton.
        
        float magSq = r*r + bias;
        p_hyper.x -= k * magSq;
        
        // 3. Update Derivative
        // The subtraction term makes the derivative complex. 
        // We approximate it: dr = power * r^(power-1) * dr - 2*k*r*dr
        // This creates "Fuzzy" boundaries automatically.
        dr = (power * pow(r, power - 1.0) - (2.0 * k * r)) * dr + 1.0;
        
        // 4. Param D: Fuzziness (Density Control)
        // Artificially reduces the derivative growth to create volumetric clouds
        if (uParamD > 0.0) {
            dr *= (1.0 - uParamD * 0.1);
        }
        
        z.xyz = p_hyper + c.xyz;
        
        trap = min(trap, r);
    }`,loopBody:"formula_Appell(z, dr, trap, c);"},parameters:[{label:"Interference",id:"paramA",min:0,max:1.5,step:.001,default:.333},{label:"Power",id:"paramB",min:1,max:8,step:.01,default:2},{label:"Ghost Shift",id:"paramC",min:-1,max:1,step:.001,default:0},{label:"Cloud Density",id:"paramD",min:0,max:1,step:.01,default:.5},{label:"Phase",id:"paramE",min:0,max:6.28,step:.01,default:0,scale:"pi"}],defaultPreset:{version:2,name:"Appell",formula:"Appell",features:{coreMath:{iterations:10,paramA:.761,paramB:2.83,paramC:-.391,paramD:.24,paramE:0,paramF:0},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:0,aoSpread:.5,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:6,fogColor:"#000000",fogDensity:0,glowIntensity:4.999999999999999,glowSharpness:12.02264434617413,glowMode:!1,glowColor:"#00ffff"},materials:{diffuse:1.16,reflection:0,specular:0,roughness:.5872188659713031,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"5",position:.006101938262742301,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.07666905958363249,color:"#5744FF",bias:.5,interpolation:"linear"},{id:"3",position:.2198492462311558,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"2",position:.3802584350323044,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.46518305814788224,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_0",position:.5402010050251256,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_1",position:.6,color:"#001133",bias:.5,interpolation:"linear"},{id:"1771161963853_2",position:.75,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"1771161963853_3",position:.9,color:"#F644FF",bias:.5,interpolation:"linear"},{id:"1771161963853_4",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:8,scale:.5557213101593343,offset:.05468077546160833,repeats:1.2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.01,stepRelaxation:0,refinementSteps:0,detail:3.1,pixelThreshold:1,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.6190587983598513,y:.40078133786953346,z:-.5821092438548545,w:.3424753299253732},sceneOffset:{x:-.3737236559391022,y:-1.5770468711853027,z:-.1308211237192154,xL:-.060257730662381714,yL:.02761814157420639,zL:.002646650329445943},targetDistance:1.0691482573747906,cameraMode:"Orbit",lights:[]}},eo={id:"Borromean",name:"Borromean (Cyclic)",shortDescription:"Three interlocking Complex Planes. Uses dimensional feedback loops instead of spherical math.",description:'Treats 3D space as three coupled 2D planes (XY, YZ, ZX). The output of one plane becomes the input of the next, creating a "Rock-Paper-Scissors" feedback loop. Produces tetrahedral symmetries and solid, non-spherical shapes.',juliaType:"none",shader:{function:`
    void formula_Borromean(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        
        // Param A: Power
        float power = uParamA;
        
        // Param E: Phase Shift (Rotation per iteration)
        float phase = uParamE;
        if (abs(phase) > 0.001) {
            float s = sin(phase); 
            float co = cos(phase);
            p.xy = mat2(co, -s, s, co) * p.xy;
        }

        // Derivative for generalized power
        float r = length(p);
        dr = power * pow(r, power - 1.0) * dr + 1.0;
        
        // Generalized Power Terms
        float xP = pow(abs(p.x), power);
        float yP = pow(abs(p.y), power);
        float zP = pow(abs(p.z), power);
        
        // Param B: Connection (The Link Strength)
        float connect = uParamB;
        
        // Param C: Repulsion (The Subtractive Force)
        float repel = uParamC;
        
        // Param D: Balance (Mixing Force)
        float balance = uParamD;
        
        // Param F: Invert (Sign Flip)
        float invert = uParamF;
        
        // The Cyclic Permutation
        // X driven by Z
        // Y driven by X
        // Z driven by Y
        
        float nx = (xP - repel * yP - balance * zP) + (invert * connect * 2.0 * p.z * p.x);
        float ny = (yP - repel * zP - balance * xP) + (invert * connect * 2.0 * p.x * p.y);
        float nz = (zP - repel * xP - balance * yP) + (invert * connect * 2.0 * p.y * p.z);
        
        z.xyz = vec3(nx, ny, nz) + c.xyz;
        
        trap = min(trap, dot(z.xyz, z.xyz));
    }`,loopBody:"formula_Borromean(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:5,step:.01,default:2},{label:"Connection",id:"paramB",min:0,max:3,step:.01,default:1},{label:"Repulsion",id:"paramC",min:0,max:3,step:.01,default:1},{label:"Balance",id:"paramD",min:0,max:2,step:.01,default:0},{label:"Phase",id:"paramE",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Invert",id:"paramF",min:-1,max:1,step:2,default:1}],defaultPreset:{version:1,name:"Borromean",formula:"Borromean",features:{coreMath:{iterations:28,paramA:2.25,paramB:1.04,paramC:.92,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:.82,shadowSoftness:8,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:-1.9999999999999998,y:1,z:2},rotation:{x:-1.3618058113303921,y:2.6135019110558524,z:-2.4974118716462748},color:"#ffffff",intensity:2.8224,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.36219236319294446,aoSpread:.010521796258218545,aoSamples:22,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.064445198559225,glowSharpness:1.8620871366628675,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1.92,reflection:0,specular:1.52,roughness:.23035625001175353,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771160459074_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1771160459074_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1771160459074_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1771160459074_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1771160459074_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1771160459074_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1771160459074_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1771160459074_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1771160459074_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1771160459074_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1771160459074_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1771160459074_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:2.2754446706935223,offset:-.07388697269814448,repeats:2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.2938195179022356,y:.33371368466206736,z:.11030705445694247,w:.8888968563933598},sceneOffset:{x:1.540531039237976,y:1.1154367923736572,z:1.807411551475525,xL:-.31978609027941085,yL:.2396308322743712,zL:-.23608000053467415},targetDistance:2.0720281302928925,cameraMode:"Orbit",lights:[]}},to={id:"MandelMap",name:"MandelMap (Unrolled)",shortDescription:"Unrolls the Mandelbulb surface. Features Sphere, Cylinder, and Torus projections.",description:'Maps the Mandelbulb 3D structure onto a 2D plane. Use "Projection" (Param D) to switch between Spherical (Standard), Cylindrical (Infinite Vertical), and Toroidal (Seamless) mappings.',juliaType:"julia",shader:{function:`
    vec3 planeToBulb(vec3 p, float scale, float heightAmp, float thetaOffset, float phiOffset, float mode) {
        // --- 1. COORDINATE PREP ---
        // Apply Map Scaling & Phase Compensation first
        // This effectively "Slides" the map texture to counter-act the fractal rotation
        float u = p.x * scale - phiOffset;
        float v = p.z * scale - thetaOffset;
        
        // Height (Radius base)
        // Base radius 1.1 puts Y=0 slightly outside the unit bulb surface
        float r = 1.1 + (p.y / max(0.01, heightAmp));
        
        // --- 2. PROJECTION MAPPING ---
        
        if (mode < 0.5) {
            // MODE 0: SPHERICAL (Mercator)
            // Classic mapping. Distorts at poles (high Z).
            // u -> Longitude (Phi), v -> Latitude (Theta)
            
            float theta = v + 1.570796; // Center at equator
            float phi = u;
            
            return r * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
        } 
        else if (mode < 1.5) {
            // MODE 1: CYLINDRICAL
            // Unwraps to an infinite vertical column. No polar distortion.
            // u -> Angle (Phi), v -> Height (Y), r -> Radius
            
            float phi = u;
            float height = v;
            
            // X/Z form the circle, Y is height
            return vec3(r * cos(phi), height, r * sin(phi));
        } 
        else {
            // MODE 2: TOROIDAL
            // Wraps around a donut. Seamless tiling in all directions.
            // u -> Major Angle, v -> Minor Angle
            
            float majorR = 2.0; // Radius of the donut hole
            
            // Torus formula:
            // X = (R + r*cos(v)) * cos(u)
            // Y = (R + r*cos(v)) * sin(u)
            // Z = r * sin(v)
            // We use 'r' (height) as the minor radius scaler
            
            float minorR = r; 
            
            return vec3(
                (majorR + minorR * cos(v)) * cos(u),
                minorR * sin(v),
                (majorR + minorR * cos(v)) * sin(u)
            );
        }
    }

    void formula_MandelMap(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
        float power = uParamA;
        float thetaPhase = uVec2A.x;
        float phiPhase = uVec2A.y;

        // Run transform only on the first iteration
        if (dr == 1.0) {
            float heightAmp = uParamB;
            float mapScale = uParamC;
            float projMode = uParamD;
            
            // --- Coordinate Compensation Logic ---
            // Symmetry Shift = Phase / (Power - 1.0)
            // This locks the visual features in place while they mutate
            float divisor = max(1.0, power - 1.0);
            float thetaOffset = thetaPhase / divisor;
            float phiOffset = phiPhase / divisor;
            
            vec3 w = planeToBulb(z.xyz, mapScale, heightAmp, thetaOffset, phiOffset, projMode);
            
            // --- Lipschitz Correction ---
            // Estimate expansion factor to correct Distance Estimation
            float r = length(w);
            float verticalScale = 1.0 / max(0.01, heightAmp);
            float horizontalScale = r * mapScale;
            float stretch = max(verticalScale, horizontalScale);
            
            dr *= max(1.0, stretch);
            
            z.xyz = w;
            
            if (uJuliaMode < 0.5) {
                c.xyz = w;
            }
        }

        // Standard Mandelbulb Iteration
        vec3 p = z.xyz;
        float r = length(p);
        
        if (r > 1.0e-4) {
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            float theta = acos(clamp(p.z / r, -1.0, 1.0));
            float phi = atan(p.y, p.x);
            
            float zr = pow(r, power);
            
            // Apply Phase Shifts
            theta = theta * power + thetaPhase;
            phi = phi * power + phiPhase;
            
            p = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta));
        }
        
        p += c.xyz;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_MandelMap(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.01,default:8},{label:"Height Amp",id:"paramB",min:.1,max:10,step:.1,default:2},{label:"Map Scale",id:"paramC",min:.1,max:5,step:.01,default:1},{label:"Projection",id:"paramD",min:0,max:2,step:1,default:1,options:[{label:"Spherical",value:0},{label:"Cylindrical",value:1},{label:"Toroidal",value:2}]},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"}],defaultPreset:{version:1,name:"MandelMap",formula:"MandelMap",features:{coreMath:{iterations:11,paramA:4,paramB:1.61,paramC:1,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:33.96487304923489,shadowSteps:304,shadowBias:0,lights:[{type:"Directional",position:{x:-2,y:1,z:2},rotation:{x:-1.2945477312837892,y:3.0961684975756443,z:-3.0815085191809364},color:"#ffffff",intensity:6.969599999999999,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.7102583030181524,aoSpread:.02075305004726551,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:.66,fogNear:3.3177600000000007,fogFar:14.5,fogColor:"#7f6969",fogDensity:0,glowIntensity:0,glowSharpness:11.220184543019629,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:2,reflection:0,specular:0,roughness:.5,rim:0,rimExponent:4,envStrength:.75,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771159172325_0",position:0,color:"#009392",bias:.5,interpolation:"linear"},{id:"1771159172325_1",position:.167,color:"#39b185",bias:.5,interpolation:"linear"},{id:"1771159172325_2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"1771159172325_3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"1771159172325_4",position:.667,color:"#eeb479",bias:.5,interpolation:"linear"},{id:"1771159172325_5",position:.833,color:"#e88471",bias:.5,interpolation:"linear"},{id:"1771159172325_6",position:1,color:"#cf597e",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:3.1065735566446993,offset:.20712783526166173,repeats:1,phase:0,bias:.5963552876944301,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:1,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.40127164816286187,y:8701571167029472e-23,z:2710286594285787e-22,w:.9159590953642958},sceneOffset:{x:0,y:4,z:5,xL:-.00800157869605831,yL:-.1778496246363903,zL:-.24803174116677118},targetDistance:4.905199170112612,cameraMode:"Orbit",lights:[]}},ao={id:"MandelBolic",name:"MandelBolic",shortDescription:"A true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space.",description:'Bypasses the limitations of 3D algebra by using the Poincaré-Ahlfors extension into Hyperbolic 3-Space. This preserves perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals. Now features generalized Power and Hyperbolic distortion parameters.',juliaType:"julia",shader:{function:`
        void formula_MandelBolic(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float power = uParamA;

            // Z is the 2D complex plane (x, y), T is the hyperbolic height (z)
            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy = sqrt(rxy2);

            // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
            // uParamC (Conformal Shift) distorts the hyperbolic mapping
            float m = (rxy2 - uParamC * z3.z*z3.z) / (rxy2 + 1e-20);

            // Shared rxy^(p-1) — used by both derivative and Z mapping
            float rxy_pm1 = pow(max(rxy, 1e-10), power - 1.0);
            float rxy_p = rxy_pm1 * rxy;

            // Derivative: account for split XY/Z Jacobian
            // XY stretch: p * rxy^(p-1) * |m|  (conformal distortion)
            // Z  stretch: p * rxy^(p-1) * |B|  (hyperbolic scaling)
            // Use max for conservative bound on largest singular value
            float stretch = power * rxy_pm1 * max(abs(m), abs(uParamB));
            dr = stretch * dr + 1.0;

            // Apply the conformal 3D power with Phase Twist (uParamD)
            float theta = atan(z3.y, z3.x) * power + uParamD;

            // Z_{n+1} = Z_n^p * M + C_z
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;

            // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
            // uParamB scales the hyperbolic height growth, uParamE adds a constant Z-offset
            float nz = power * rxy_pm1 * z3.z * uParamB + c.z + uParamE;

            z.xyz = vec3(nx, ny, nz);
            trap = min(trap, length(z.xyz) * uParamF);
        }`,loopBody:"formula_MandelBolic(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.01,default:2},{label:"Hyp. Scale",id:"paramB",min:-2,max:2,step:.01,default:1},{label:"Conformal Shift",id:"paramC",min:-2,max:2,step:.01,default:1},{label:"Phase Twist",id:"paramD",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Z-Offset",id:"paramE",min:-2,max:2,step:.01,default:0},{label:"Trap Scale",id:"paramF",min:.1,max:5,step:.01,default:1}],defaultPreset:{formula:"MandelBolic",features:{coreMath:{iterations:26,paramA:2,paramB:1,paramC:1,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!0,hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.277,juliaY:-.05,juliaZ:.31,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!1,shadowIntensity:1,shadowSoftness:381.09214359264973,shadowSteps:352,shadowBias:.0010409787880182823,lights:[{type:"Directional",position:{x:-.7,y:.37,z:1.4},rotation:{x:.39966912659916126,y:-2.29961371262364,z:-.8495893165947439},color:"#ffffff",intensity:1.5625,falloff:.22000013414400005,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},ao:{aoIntensity:.383,aoSpread:.002,aoSamples:12,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.004798262654911253,glowSharpness:1,glowMode:!0,glowColor:"#50aaff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.75,rim:0,rimExponent:3,envStrength:.25,envBackgroundStrength:.06,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771879786393_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1771879786393_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1771879786393_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1771879786393_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1771879786393_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1771879786393_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1771879786393_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1771879786393_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1771879786393_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1771879786393_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:1,scale:1.1510942207477979,offset:-.1726286201331454,repeats:1,phase:-.13,bias:1,twist:0,escape:1.2,gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:4,scale2:1,offset2:0,repeats2:7,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:534,distanceMetric:0,estimator:0,fudgeFactor:.32,stepRelaxation:0,refinementSteps:0,detail:6.1,pixelThreshold:.2,overstepTolerance:2.7,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!0,saturation:1.29,levelsMin:0,levelsMax:.47826086956521746,levelsGamma:.7718886339575918},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:.0598781733877129},navigation:{flySpeed:.42258925411794174,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.6959547620697641,y:-.23496707663264949,z:.30543710842202915,w:.6059254202044269},sceneOffset:{x:-1.9531606435775757,y:1.1919928789138794,z:-1.096980132162571,xL:-.41618868170671375,yL:-.030576279777909363,zL:.3954860597472547},targetDistance:2.4710260497199164,cameraMode:"Fly",lights:[]}},oo={id:"KaliBox",name:"Kali Box",shortDescription:"Kali's abs-fold fractal with sphere inversion. Organic caves and alien landscapes.",description:"A Mandelbox variant by Kali (fractalforums.com), optimized by Rrrola. Uses rotation, abs-fold + translation, clamped sphere inversion, and scale/minRad rescaling. Produces organic, cave-like structures.",juliaType:"offset",shader:{preamble:`
    // KaliBox: Pre-calculated rotation (computed once per frame)
    // Axis-angle rotation around (1,1,0) normalized
    mat3 uKB_rot = mat3(1.0);
    bool uKB_doRot = false;

    void KaliBox_precalcRotation() {
        float rotAngle = uParamF;
        if (abs(rotAngle) > 0.001) {
            uKB_doRot = true;
            vec3 axis = normalize(vec3(1.0, 1.0, 0.0));
            float s = sin(rotAngle);
            float c_rot = cos(rotAngle);
            float oc = 1.0 - c_rot;
            uKB_rot = mat3(
                oc * axis.x * axis.x + c_rot,      oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c_rot,      oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c_rot
            );
        } else {
            uKB_doRot = false;
        }
    }`,function:`
    void formula_KaliBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        float scale = uParamA;
        float minRad2 = uParamB;

        // 1. Rotation (axis-angle around (1,1,0))
        if (uKB_doRot) {
            p *= uKB_rot;
        }

        // 2. Abs fold + translation
        p = abs(p) + uVec3A;

        // 3. Sphere inversion (Rrrola's clamp)
        float r2 = dot(p, p);
        float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p *= k;

        // 4. Scale and add constant
        p = p * (scale / minRad2) + c.xyz;

        // 5. Update derivative
        dr = dr * k * (abs(scale) / minRad2) + 1.0;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_KaliBox(z, dr, trap, c);",loopInit:"KaliBox_precalcRotation();",preambleVars:["uKB_rot","uKB_doRot"],getDist:`
            float absScalem1 = abs(uParamA - 1.0);
            return vec2((r - absScalem1) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:-3,max:3,step:.001,default:2.043},{label:"MinRad2",id:"paramB",min:.001,max:2,step:.001,default:.349},{label:"Translation",id:"vec3A",type:"vec3",min:-5,max:5,step:.001,default:{x:.036,y:-1.861,z:.036}},{label:"Rotation",id:"paramF",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"}],defaultPreset:{formula:"KaliBox",features:{coreMath:{iterations:15,paramA:2.04348,paramB:.3492,paramF:0,vec3A:{x:.0365,y:-1.9183,z:.0365}},coloring:{mode:1,repeats:1,phase:-.44,scale:1.9664327756755327,offset:-1.4432563267287075,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773423501447_0",position:0,color:"#FD6029",bias:.5,interpolation:"step"},{id:"1773423501447_1",position:.111,color:"#698403",bias:.5,interpolation:"step"},{id:"1773423501447_2",position:.222,color:"#FFF59B",bias:.5,interpolation:"step"},{id:"1773423501447_3",position:.333,color:"#F5BD22",bias:.5,interpolation:"step"},{id:"1773423501447_4",position:.444,color:"#0B5E87",bias:.5,interpolation:"step"},{id:"1773423501447_5",position:.556,color:"#C68876",bias:.5,interpolation:"step"},{id:"1773423501447_6",position:.667,color:"#A51C64",bias:.5,interpolation:"step"},{id:"1773423501447_7",position:.778,color:"#3B9FEE",bias:.5,interpolation:"step"},{id:"1773423501447_8",position:.889,color:"#D4FFD4",bias:.5,interpolation:"step"},{id:"1773423501447_9",position:1,color:"#ABA53C",bias:.5,interpolation:"linear"}],gradient2:[{id:"kb2_0",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"kb2_1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"kb2_2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.198,aoSpread:.3610966624411007,aoSamples:8,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0010213564266668151,glowSharpness:3,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1,reflection:0,specular:1,roughness:.3,rim:0,rimExponent:3,envStrength:.35,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773423550251_0",position:0,color:"#3B4CC0",bias:.5,interpolation:"linear"},{id:"1773423550251_1",position:.143,color:"#6889EE",bias:.5,interpolation:"linear"},{id:"1773423550251_2",position:.286,color:"#9ABAFF",bias:.5,interpolation:"linear"},{id:"1773423550251_3",position:.429,color:"#C9D8F0",bias:.5,interpolation:"linear"},{id:"1773423550251_4",position:.571,color:"#EDD1C2",bias:.5,interpolation:"linear"},{id:"1773423550251_5",position:.714,color:"#F7A889",bias:.5,interpolation:"linear"},{id:"1773423550251_6",position:.857,color:"#E26A53",bias:.5,interpolation:"linear"},{id:"1773423550251_7",position:1,color:"#B40426",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:-.6691,juliaY:-1.3028,juliaZ:-.45775},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.2,maxSteps:522,distanceMetric:1,estimator:0},optics:{camFov:90,dofStrength:0,dofFocus:.9911481142044067}},cameraPos:{x:-.5108672817633045,y:-.49092728212507375,z:.06312098713692904},cameraRot:{x:-.21217453440255712,y:.9007285600831599,z:-.2000534384923281,w:-.3219451036263353},cameraFov:90,sceneOffset:{x:-.47271010279655457,y:.5621813535690308,z:-.6614219546318054,xL:.4219589741076178,yL:.40918048066299684,zL:-.16639292373950365},targetDistance:.7113221737919322,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.62,y:-.07,z:1.4},rotation:{x:-.025067221468304684,y:-3.071530976748474,z:.6869655122565176},color:"#ffffff",intensity:1,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Ct={id:"Claude",name:"Claude",shortDescription:"Harmonic resonance IFS — icosahedral folds with parametric 4th reflection plane.",description:'Icosahedral reflection folds (golden-ratio normals) + a parametric "harmonic" fold (4th plane swept around the golden axis) + clamped sphere inversion. The harmonic fold is unique to this formula — it enriches the icosahedral base like an overtone enriches a fundamental tone. φ appears in fold geometry, harmonic axis, and default parameters.',juliaType:"offset",shader:{preamble:`
    // Golden ratio and icosahedral fold normals
    // Declared as non-const globals — GLSL ES 3.0 does not permit built-in functions
    // (sqrt, normalize) in constant expressions. Values are computed in Claude_precalc().
    float claude_Phi;
    vec3 claude_n1;
    vec3 claude_n2;
    vec3 claude_n3;
    vec3 claude_goldenAxis;

    // Harmonic fold normal (4th plane, computed once per frame via Rodrigues)
    vec3 uCl_n4;
    bool uCl_doHarmonic;

    void Claude_precalc() {
        // Compute golden ratio and icosahedral normals
        claude_Phi = (1.0 + sqrt(5.0)) * 0.5;
        claude_n1 = normalize(vec3(-1.0, claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0)));
        claude_n2 = normalize(vec3(claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0), -1.0));
        claude_n3 = normalize(vec3(1.0 / (claude_Phi - 1.0), -1.0, claude_Phi - 1.0));
        claude_goldenAxis = normalize(vec3(1.0, claude_Phi, 0.0));

        // Harmonic fold normal defaults to n3
        uCl_n4 = claude_n3;
        uCl_doHarmonic = false;

        // Harmonic: rotate n3 around golden axis by paramB (Rodrigues formula)
        float h = uParamB;
        if (abs(h) > 0.001) {
            uCl_doHarmonic = true;
            float ch = cos(h), sh = sin(h);
            float dk = dot(claude_goldenAxis, claude_n3);
            uCl_n4 = claude_n3 * ch
                   + cross(claude_goldenAxis, claude_n3) * sh
                   + claude_goldenAxis * dk * (1.0 - ch);
        }
        // Note: gmt_precalcRodrigues(uVec3B) is called separately from loopInit —
        // preamble functions are assembled before shared transforms, so calling it
        // here would cause a "no matching overloaded function" error.
    }`,function:`
    void formula_Claude(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // 1. Pre-fold rotation (shared Rodrigues, vec3B)
        gmt_applyRodrigues(p);

        // 2. Icosahedral fold — three golden-ratio reflection normals
        p -= 2.0 * min(0.0, dot(p, claude_n1)) * claude_n1;
        p -= 2.0 * min(0.0, dot(p, claude_n2)) * claude_n2;
        p -= 2.0 * min(0.0, dot(p, claude_n3)) * claude_n3;

        // 3. Harmonic fold — 4th reflection plane at golden-axis angle
        if (uCl_doHarmonic) {
            p -= 2.0 * min(0.0, dot(p, uCl_n4)) * uCl_n4;
        }

        // 4. Sphere inversion (clamped Mandelbox-style)
        float r2 = max(dot(p, p), 1e-10);
        float minR2 = uParamC;
        float fixR2 = uParamD;
        float sphereK = clamp(fixR2 / r2, 1.0, fixR2 / max(minR2, 1e-10));
        p *= sphereK;
        dr *= sphereK;

        // 5. IFS scale + offset
        float scale = uParamA;
        p = p * scale - uVec3A * (scale - 1.0);
        dr *= abs(scale);

        // 6. Twist (position-dependent spiral)
        if (abs(uParamF) > 0.001) {
            float ang = p.y * uParamF;
            float s = sin(ang), co = cos(ang);
            p.xz = mat2(co, -s, s, co) * p.xz;
        }

        if (uJuliaMode > 0.5) p += c.xyz;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_Claude(z, dr, trap, c);",loopInit:"Claude_precalc(); gmt_precalcRodrigues(uVec3B);",preambleVars:["uCl_n4","uCl_doHarmonic"],usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3.5,step:.001,default:2},{label:"Harmonic",id:"paramB",min:-3.14,max:3.14,step:.001,default:.61},{label:"Inner R²",id:"paramC",min:.001,max:1.5,step:.001,default:.25},{label:"Fix R²",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Offset",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1},linkable:!0},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Claude",features:{coreMath:{iterations:12,paramA:2,paramB:.61,paramC:.25,paramD:1,paramF:0,vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.12,scale:7.8,offset:1.4,bias:1.3,twist:0,escape:2.5,mode2:4,repeats2:2,phase2:.1,blendMode:2,blendOpacity:.25,twist2:0,layer3Color:"#ffffff",layer3Scale:60,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"cl_0",position:0,color:"#1B0A0F",bias:.5,interpolation:"linear"},{id:"cl_1",position:.13,color:"#4A1A0A",bias:.5,interpolation:"linear"},{id:"cl_2",position:.28,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl_3",position:.42,color:"#E8A44A",bias:.5,interpolation:"linear"},{id:"cl_4",position:.56,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl_5",position:.7,color:"#4A8B7A",bias:.5,interpolation:"linear"},{id:"cl_6",position:.85,color:"#2B3A5A",bias:.5,interpolation:"linear"},{id:"cl_7",position:1,color:"#0F0A1B",bias:.5,interpolation:"linear"}],gradient2:[{id:"cl2_0",position:0,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl2_1",position:.5,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl2_2",position:1,color:"#1B0A0F",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.38,aoSpread:.12,aoSamples:5,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:12,fogColor:"#000000",fogDensity:0,glowIntensity:.004,glowSharpness:4.5,glowColor:"#E8A44A",glowMode:!1},materials:{diffuse:1.15,reflection:.12,specular:1.1,roughness:.32,rim:.18,rimExponent:4.5,envStrength:.45,envBackgroundStrength:.22,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"env_0",position:0,color:"#0A0E1B",bias:.5,interpolation:"linear"},{id:"env_1",position:.3,color:"#3A2A1B",bias:.5,interpolation:"linear"},{id:"env_2",position:.5,color:"#C4A87A",bias:.5,interpolation:"linear"},{id:"env_3",position:.72,color:"#7AACCC",bias:.5,interpolation:"linear"},{id:"env_4",position:1,color:"#B4D4E8",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:28,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.3,maxSteps:400,distanceMetric:1,estimator:0},optics:{camFov:40,dofStrength:0,dofFocus:2.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.18,y:-.42,z:-.08,w:.89},cameraFov:40,sceneOffset:{x:1,y:1,z:1,xL:0,yL:0,zL:0},targetDistance:3.8,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.8,y:3.2,z:3.5},rotation:{x:0,y:0,z:0},color:"#FFE4CC",intensity:6,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:3.5,y:-.5,z:1.5},rotation:{x:0,y:0,z:0},color:"#4A8BCC",intensity:2.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!1},{type:"Point",position:{x:1,y:1,z:-2},rotation:{x:0,y:0,z:0},color:"#FFBE8A",useTemperature:!0,temperature:3200,intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},io={id:"Octahedron",name:"Octahedron",shortDescription:"Kaleidoscopic IFS with octahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with octahedral/cubic symmetry. Uses 4 conditional fold operations per iteration to map points into the octahedral fundamental domain. Based on Knighty's method from Fragmentarium. Supports rotation, twist, and shift.",juliaType:"offset",shader:{preamble:`
    // Octahedron: vertex direction for offset (Fragmentarium default: Offset = (1,0,0))
    const vec3 octa_vertexDir = vec3(1.0, 0.0, 0.0);`,function:`
    void formula_Octahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Octahedral symmetry folds (Knighty)
        // 4 conditional reflections map any point into the octahedral fundamental domain
        if (z3.x + z3.y < 0.0) z3.xy = -z3.yx;
        if (z3.x + z3.z < 0.0) z3.xz = -z3.zx;
        if (z3.x - z3.y < 0.0) z3.xy = z3.yx;
        if (z3.x - z3.z < 0.0) z3.xz = z3.zx;

        // Scale and offset toward octahedron vertex
        float scale = uParamA;
        vec3 offset = octa_vertexDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_Octahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Octahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"octa_5",position:0,color:"#5C2D00",bias:.5,interpolation:"linear"},{id:"octa_4",position:.2,color:"#FFA500",bias:.5,interpolation:"linear"},{id:"octa_3",position:.4,color:"#FFD700",bias:.5,interpolation:"linear"},{id:"1775546936281",position:.4568,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1775546967714",position:.5074,color:"#FFCE00",bias:.5,interpolation:"linear"},{id:"octa_2",position:.6,color:"#B8860B",bias:.5,interpolation:"linear"},{id:"octa_1",position:.8,color:"#8B4513",bias:.5,interpolation:"linear"},{id:"octa_0",position:1,color:"#3D1C02",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:8.5531,offset:-.2513,repeats:3,phase:0,bias:1,colorIter:2,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#FFD700"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.47,aoSpread:.1,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.3,specular:1.5,roughness:.35,rim:0,rimExponent:4.5,envStrength:.7,envBackgroundStrength:.18,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#1A0A00",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#4A2800",bias:.5,interpolation:"linear"},{id:"2",position:.6,color:"#B8860B",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#FFE4B5",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100,id:"l7"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l8"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l9"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:2,fudgeFactor:.9,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1.05,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:40,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.0906,y:.1352,z:.0124,w:.9866},cameraFov:40,sceneOffset:{x:1,y:.95,z:3.1,xL:-.1814,yL:-.3153,zL:-.1483},targetDistance:2.5878,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},ro={id:"Icosahedron",name:"Icosahedron",shortDescription:"Kaleidoscopic IFS with icosahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with icosahedral symmetry using golden-ratio fold normals and abs() prefold. Based on Knighty's Fragmentarium implementation. The offset points toward an icosahedron vertex, producing 20-fold triangular face patterns distinct from the dodecahedral variant.",juliaType:"offset",shader:{preamble:`
    // Icosahedron: Golden-ratio fold normals (different from Dodecahedron normals)
    // Reference: Knighty's Fragmentarium Icosahedron.frag
    const float ico_Phi = (1.0 + sqrt(5.0)) * 0.5;
    const vec3 ico_n1 = normalize(vec3(-ico_Phi, ico_Phi - 1.0, 1.0));
    const vec3 ico_n2 = normalize(vec3(1.0, -ico_Phi, ico_Phi + 1.0));
    const vec3 ico_n3 = vec3(0.0, 0.0, -1.0);

    // Icosahedron vertex direction for offset
    const vec3 ico_vertexDir = normalize(vec3(0.850650808, 0.525731112, 0.0));`,function:`
    void formula_Icosahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Inner fold: abs + n1 only (the full prefold runs once in loopInit)
        // Reference: Fragmentarium Icosahedron.frag inner loop
        z3 = abs(z3);
        float t = dot(z3, ico_n1);
        if (t > 0.0) z3 -= 2.0 * t * ico_n1;

        // Scale and offset (toward icosahedron vertex direction)
        float scale = uParamA;
        vec3 offset = ico_vertexDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3, z3));
    }`,loopBody:"formula_Icosahedron(z, dr, trap, c);",loopInit:`
    gmt_precalcRodrigues(uVec3B);
    // Icosahedral prefold: full fold sequence runs ONCE before iteration loop
    // Reference: Fragmentarium Icosahedron.frag prefold (abs + n1 + n2 + n3 + n2)
    {
        vec3 pf = z.xyz;
        pf = abs(pf);
        float t;
        t = dot(pf, ico_n1); if (t > 0.0) pf -= 2.0 * t * ico_n1;
        t = dot(pf, ico_n2); if (t > 0.0) pf -= 2.0 * t * ico_n2;
        t = dot(pf, ico_n3); if (t > 0.0) pf -= 2.0 * t * ico_n3;
        t = dot(pf, ico_n2); if (t > 0.0) pf -= 2.0 * t * ico_n2;
        z.xyz = pf;
    }`,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Icosahedron",features:{coreMath:{iterations:20,paramA:2,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"1775547195175_0",position:0,color:"#7f7f7f",bias:.5,interpolation:"linear"},{id:"1775547195175_1",position:1,color:"#696969",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:4.56,offset:.552,repeats:1,phase:.5,bias:3.4468,colorIter:2,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFFFFF"},{id:"2",position:.9,color:"#4A90D9"}],mode2:1,scale2:19.4934,offset2:-19.1773,repeats2:1,phase2:-.64,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.3,aoSpread:.05,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:0,specular:1.8,roughness:.3,rim:0,rimExponent:5,envStrength:.1,envBackgroundStrength:.15,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"0",position:0,color:"#0A1628"},{id:"1",position:.35,color:"#1E3A5F"},{id:"2",position:.65,color:"#7BA7CC"},{id:"3",position:1,color:"#E8F4FD"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.6943,y:.2676,z:-.0973},color:"#FFF1E4",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5700,id:"l10"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l11"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l12"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:2,fudgeFactor:.8,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.0173,y:.4446,z:.0086,w:.8955},cameraFov:36,sceneOffset:{x:2.97,y:.63,z:1.99,xL:.0362,yL:-.4343,zL:.2942},targetDistance:2.9493,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},no={id:"RhombicDodecahedron",name:"Rhombic Dodecahedron",shortDescription:"Catalan solid fractal — dual of the cuboctahedron.",description:"Kaleidoscopic IFS fractal with rhombic dodecahedral geometry. Uses RD face-normal folds instead of the Knighty fold — reflections through (1,±1,0)/√2 and (0,1,±1)/√2 planes, which ARE the RD face planes themselves. This ensures all fold boundaries align with RD faces, producing true rhombic geometry at every iteration level. The fold domain x ≥ y ≥ |z| is bounded entirely by RD faces.",juliaType:"offset",shader:{preamble:`
    // RhombicDodecahedron: RD face-normal fold (NOT Knighty fold)
    //
    // Key insight: the RD's own face normals (1,±1,0)/√2 and (0,1,±1)/√2 are valid
    // reflection planes that generate the chiral octahedral group O (24 elements).
    // The fundamental domain x ≥ y ≥ |z| is bounded ENTIRELY by RD face planes.
    //
    // In this domain the RD SDF simplifies to a single plane:
    //   d = (x + y - size) / √2
    // because x+y ≥ y+|z| and x+y ≥ |z|+x when x ≥ y ≥ |z|.
    //
    // Verified: fold converges in 3 iterations for all sphere points.
    // Domain boundaries: x=y (RD face), y=z (RD face), y=-z (RD face).

    // RD face fold normals (all unit vectors)
    const vec3 rd_n1 = vec3(0.70710678, 0.70710678, 0.0);    // (1,1,0)/√2
    const vec3 rd_n2 = vec3(0.70710678, -0.70710678, 0.0);   // (1,-1,0)/√2
    const vec3 rd_n3 = vec3(0.0, 0.70710678, 0.70710678);    // (0,1,1)/√2
    const vec3 rd_n4 = vec3(0.0, 0.70710678, -0.70710678);   // (0,1,-1)/√2

    // Cutting-plane normal in the folded domain: (1,1,0)/√2
    // (same as rd_n1, since in domain x≥y≥|z| the RD SDF = (x+y-s)/√2)
    const vec3 rd_cut = vec3(0.70710678, 0.70710678, 0.0);

    // Offset toward face centroid in the domain
    // Face piece vertices: (s,0,0), (s/2,s/2,s/2), (s/2,s/2,-s/2)
    // Centroid ≈ (2/3, 1/3, 0) direction = normalize(2,1,0)
    const vec3 rd_offset_dir = vec3(0.89442719, 0.44721360, 0.0);

    // Cutting-plane DE accumulator
    float rd_dmin;
    float rd_scale;
    float rd_trap;`,preambleVars:["rd_dmin","rd_scale","rd_trap"],function:`
    void formula_RhombicDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: RD face-normal fold — 3 rounds of 4 reflections
        // Folds through the RD's own face planes, NOT Knighty's nc
        // Domain: x ≥ y ≥ |z|, bounded entirely by RD faces
        for (int i = 0; i < 3; i++) {
            z3 -= 2.0 * min(0.0, dot(z3, rd_n1)) * rd_n1;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n2)) * rd_n2;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n3)) * rd_n3;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n4)) * rd_n4;
        }

        // Step 2: Cutting plane — in domain x≥y≥|z|, RD SDF = dot(z3, (1,1,0)/√2) - size/√2
        float size = uParamB;
        float d = dot(z3, rd_cut) - size * 0.70710678;
        rd_dmin = max(rd_dmin, rd_scale * d);

        // Step 3: Scale and offset toward face centroid
        float scale = uParamA;
        vec3 offset = rd_offset_dir * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rd_trap = trap;
    }`,loopBody:"formula_RhombicDodecahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
rd_dmin = -1e10;
rd_scale = 1.0;
rd_trap = 1e10;`,getDist:`
        float rd_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(rd_dmin) * rd_metric, rd_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"RhombicDodecahedron",features:{coreMath:{iterations:16,paramA:1.5,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"rd_0",position:0,color:"#0A2E1B",bias:.5,interpolation:"linear"},{id:"rd_1",position:.2,color:"#1B5E3B",bias:.984,interpolation:"linear"},{id:"rd_2",position:.45,color:"#35EBED",bias:.323,interpolation:"linear"},{id:"rd_3",position:.65,color:"#7DCEA0",bias:.5,interpolation:"linear"},{id:"rd_4",position:.85,color:"#A8E6CF",bias:.5,interpolation:"linear"},{id:"rd_5",position:1,color:"#0D3D21",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:.902,offset:-.601,repeats:1,phase:-.59,bias:1,colorIter:13,twist:0,escape:2,gradient2:[{id:"1",position:.3,color:"#FFFFFF"},{id:"2",position:.85,color:"#2ECC71"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.396,aoSpread:.135,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.8,reflection:.1,specular:1.2,roughness:.4,rim:.307,rimExponent:1.6,envStrength:2.09,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#0A1A10",bias:.5,interpolation:"linear"},{id:"1",position:.4,color:"#1B5E3B",bias:.5,interpolation:"linear"},{id:"2",position:.7,color:"#7DCEA0",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E8F5E9",bias:.5,interpolation:"linear"}],colorSpace:"linear"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:250,shadowIntensity:1,shadowBias:0},quality:{detail:7.5,fudgeFactor:.6,pixelThreshold:2,maxSteps:400,distanceMetric:0,stepJitter:.15,estimator:2},colorGrading:{saturation:1.1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:38,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.2886,y:.3638,z:-.1196,w:.8775},sceneOffset:{x:2,y:-2.05,z:1.6,xL:-.4395,yL:.3823,zL:-.0229},targetDistance:1.905,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#F0FFE8",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},so={id:"Coxeter",name:"Coxeter",shortDescription:"Parameterized Coxeter symmetry fractal — continuous from tetrahedral to icosahedral.",description:"Kaleidoscopic IFS fractal with a parameterized Coxeter fold normal. The Symmetry N parameter continuously interpolates between Coxeter symmetry groups: N=3 gives tetrahedral [3,3], N=4 gives octahedral [3,4], N=5 gives icosahedral [3,5], and non-integer values produce novel intermediate symmetries. Uses cutting-plane DE with the fold's edge-midpoint direction as face normal. Explore fractional N values to discover shapes unique to this formula.",juliaType:"offset",shader:{preamble:`
    // Coxeter: Parameterized Coxeter symmetry with cutting-plane DE
    //
    // Knighty fold with adjustable symmetry order N:
    //   - Fold normal nc = (-0.5, -cos(pi/N), sqrt(0.75 - cos^2(pi/N)))
    //   - Cutting plane normal = normalize(pbc) where pbc = (scospin, 0, 0.5)
    //   - Offset toward pca = normalize(0, scospin, cospin)
    //
    // N=3: tetrahedral, N=4: octahedral, N=5: icosahedral

    // Mutable — recomputed from N each frame
    vec3 uCox_nc;
    vec3 uCox_nor;
    vec3 uCox_pca;

    // Cutting-plane DE accumulator
    float cox_dmin;
    float cox_scale;
    float cox_trap;

    void Coxeter_precalc() {
        float N = uParamC;
        float cospin = cos(3.14159265 / N);
        float scospin = sqrt(max(0.75 - cospin * cospin, 0.0));
        uCox_nc = vec3(-0.5, -cospin, scospin);
        uCox_nor = normalize(vec3(scospin, 0.0, 0.5));
        uCox_pca = normalize(vec3(0.0, scospin, cospin));
    }`,preambleVars:["uCox_nc","uCox_nor","uCox_pca","cox_dmin","cox_scale","cox_trap"],function:`
    void formula_Coxeter(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Full Knighty fold (abs + nc reflect x5)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;

        // Cutting plane after fold
        float size = uParamB;
        float d = dot(z3, uCox_nor) - size;
        cox_dmin = max(cox_dmin, cox_scale * d);

        // Scale and offset toward pca vertex
        float scale = uParamA;
        vec3 offset = uCox_pca * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cox_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cox_trap = trap;
    }`,loopBody:"formula_Coxeter(z, dr, trap, c);",loopInit:`Coxeter_precalc(); gmt_precalcRodrigues(uVec3B);
cox_dmin = -1e10;
cox_scale = 1.0;
cox_trap = 1e10;`,getDist:`
        float cox_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(cox_dmin) * cox_metric, cox_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Symmetry N",id:"paramC",min:3,max:6,step:.01,default:4.5},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Coxeter",features:{coreMath:{iterations:12,paramA:2,paramB:1,paramC:4.465,paramF:0,vec3A:{x:-.48,y:.085,z:-.185},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"cox_0",position:0,color:"#30123B",bias:.5,interpolation:"linear"},{id:"cox_1",position:.071,color:"#4145AB",bias:.5,interpolation:"linear"},{id:"cox_2",position:.143,color:"#4675ED",bias:.5,interpolation:"linear"},{id:"cox_3",position:.214,color:"#39A2FC",bias:.5,interpolation:"linear"},{id:"cox_4",position:.286,color:"#1BCFD4",bias:.5,interpolation:"linear"},{id:"cox_5",position:.357,color:"#24ECA6",bias:.5,interpolation:"linear"},{id:"cox_6",position:.429,color:"#61FC6C",bias:.5,interpolation:"linear"},{id:"cox_7",position:.5,color:"#A4FC3B",bias:.5,interpolation:"linear"},{id:"cox_8",position:.571,color:"#D1E834",bias:.5,interpolation:"linear"},{id:"cox_9",position:.643,color:"#F3C63A",bias:.5,interpolation:"linear"},{id:"cox_10",position:.714,color:"#FE9B2D",bias:.5,interpolation:"linear"},{id:"cox_11",position:.786,color:"#F36315",bias:.5,interpolation:"linear"},{id:"cox_12",position:.857,color:"#D93806",bias:.5,interpolation:"linear"},{id:"cox_13",position:.929,color:"#B11901",bias:.5,interpolation:"linear"},{id:"cox_14",position:1,color:"#7A0402",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:2.144,offset:.517,repeats:1.2,phase:.4,bias:1,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.88,color:"#8A2BE2"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.47,aoSpread:.2,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.8,reflection:.15,specular:.67,roughness:.232,rim:.3,rimExponent:5,envStrength:.3,envBackgroundStrength:.18,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#0A0518",bias:.5,interpolation:"linear"},{id:"1",position:.153,color:"#101850",bias:.5,interpolation:"linear"},{id:"2",position:.385,color:"#5A5EB0",bias:.365,interpolation:"linear"},{id:"3",position:1,color:"#F0E0FF",bias:.5,interpolation:"linear"}],colorSpace:"linear"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:250,shadowIntensity:1,shadowBias:0},quality:{detail:3,fudgeFactor:1,pixelThreshold:2,maxSteps:400,distanceMetric:1,stepJitter:.15,estimator:2},colorGrading:{active:!0,saturation:1.1,levelsMin:0,levelsMax:.537,levelsGamma:.966},optics:{camFov:36,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.213,y:.441,z:.1086,w:.8651},sceneOffset:{x:2.7,y:1.45,z:2.12,xL:.4105,yL:.4583,zL:.1985},targetDistance:3.226,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.321,y:-.171,z:.028},color:"#F0E8FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6e3},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},lo={id:"RhombicTriacontahedron",name:"Rhombic Triacontahedron",shortDescription:"IFS fractal of the 6D hypercube projection — Buckminster Fuller's favorite shape.",description:"Kaleidoscopic IFS fractal based on the rhombic triacontahedron — the 3D shadow of a 6-dimensional hypercube and Buckminster Fuller's favorite geometric form. 30 golden-ratio rhombic faces with icosahedral symmetry. Uses the Knighty icosahedral fold (whose planes ARE RT face normals) with a single cutting plane z=size in the folded domain, giving true RT geometry at all iteration levels.",juliaType:"offset",shader:{preamble:`
    // RhombicTriacontahedron: Cutting plane after Knighty fold
    //
    // Key insight: the Knighty icosahedral fold planes (abs + nc reflections)
    // ARE icosidodecahedron vertex normals = RT face normals. So the fold
    // IS through RT face planes. The fold domain concentrates near z-axis
    // (z range [0.90, 1.00]) where the (0,0,1) RT face normal dominates.
    //
    // Cutting plane: z3.z - size (just the z-component after fold)
    // Verified: 0% overestimates, max error 0.011 vs analytic SDF.
    //
    // This gives correct RT geometry at ALL iteration levels, unlike the
    // previous analytic-SDF-before-fold approach which showed dodecahedral
    // inner structure.

    // Icosahedral fold normal (Type=5)
    const vec3 rt_nc = vec3(-0.5, -0.80901699, 0.30901699);
    // Offset direction: pbc = icosidodecahedron vertex = RT face center
    const vec3 rt_pbc = vec3(0.52573111, 0.0, 0.85065081);

    // Cutting-plane DE accumulator
    float rt_dmin;
    float rt_scale;
    float rt_trap;`,preambleVars:["rt_dmin","rt_scale","rt_trap"],function:`
    void formula_RhombicTriacontahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Knighty icosahedral fold
        // All fold planes ARE RT face normals (icosidodecahedron vertices)
        // abs = 3 axis normals, nc = diagonal RT face normal
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;

        // Step 2: Cutting plane in folded domain
        // After fold, domain concentrates near z-axis where (0,0,1) RT face dominates
        float size = uParamB;
        float d = z3.z - size;
        rt_dmin = max(rt_dmin, rt_scale * d);

        // Step 3: Scale and offset toward RT face center (pbc = icosidodecahedron vertex)
        float scale = uParamA;
        vec3 offset = rt_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rt_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rt_trap = trap;
    }`,loopBody:"formula_RhombicTriacontahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
rt_dmin = -1e10;
rt_scale = 1.0;
rt_trap = 1e10;`,getDist:`
        float rt_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(rt_dmin) * rt_metric, rt_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:1.618},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"RhombicTriacontahedron",features:{coreMath:{iterations:10,paramA:1.878,paramB:1,paramF:0,vec3A:{x:.125,y:.125,z:-.25},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"rt_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"rt_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"rt_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"rt_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"rt_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"rt_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"rt_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:3.633,offset:.486,repeats:.5,phase:.43,bias:1,colorIter:3,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFF8F0"},{id:"2",position:.85,color:"#B87333"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.7,aoSpread:.4,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:2,reflection:.25,specular:.76,roughness:.226,rim:0,rimExponent:4,envStrength:.55,envBackgroundStrength:.2,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#1A0E08",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#5C3520",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#B87333",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#FFE8D0",bias:.5,interpolation:"linear"}],colorSpace:"srgb"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,postRotX:.75},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:17.023,shadowIntensity:1,shadowBias:0},quality:{detail:5,fudgeFactor:.6,pixelThreshold:2,maxSteps:400,distanceMetric:1,stepJitter:.15,estimator:2},colorGrading:{saturation:1.15,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:32,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.0647,y:-.1543,z:.0101,w:.9859},sceneOffset:{x:-1.3942,y:-.5315,z:4.4198,xL:0,yL:0,zL:0},targetDistance:3.622,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.786,y:-1.042,z:.467},color:"#FFE8D0",intensity:1.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4800},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},co={id:"Apollonian",name:"Apollonian",shortDescription:"Apollonian gasket — sphere packing via iterative inversion.",description:"Apollonian gasket fractal using space folding and sphere inversion. Each iteration folds space into a unit cube then applies an inversion sphere, creating a foam-like recursive sphere packing. Based on kosalos's Fragmentarium implementation (fractalforums.org). The modulation factor 't' is computed once from the initial ray position before iterations, matching the reference. Optional spherical inversion pre-transform mode (Inversion > 0) replicates the reference 'doInversion' mode with center, radius, and XY angle rotation with proper DE correction.",juliaType:"offset",tags:["sphere-packing","inversion","foam"],shader:{preamble:`
float apo_t = 1.0;
float apo_invEnabled = 0.0;
float apo_r2 = 1.0;
float apo_invR = 1.0;
float apo_invRadius = 1.0;
`,preambleVars:["apo_t","apo_invEnabled","apo_r2","apo_invR","apo_invRadius"],loopInit:`
// Compute modulation t once from the initial position (kosalos: t is constant throughout loop)
apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
apo_invEnabled = 0.0;
apo_r2 = 1.0;
apo_invR = 1.0;
apo_invRadius = max(uVec2A.x, 0.001);

// Spherical inversion pre-transform (kosalos reference 'doInversion' mode)
if (uParamD > 0.5) {
    apo_invEnabled = 1.0;
    vec3 invCenter = uVec3B;
    float invRadius = apo_invRadius;
    float invAngle = uVec2A.y;

    vec3 ip = z.xyz - invCenter;
    apo_r2 = dot(ip, ip);
    apo_invR = sqrt(apo_r2);

    if (apo_r2 > 1e-10) {
        ip = (invRadius * invRadius / apo_r2) * ip + invCenter;
    }

    // XY plane rotation by invAngle (kosalos reference: atan + cos/sin)
    float an = atan(ip.y, ip.x) + invAngle;
    float ra = length(ip.xy);
    ip.x = cos(an) * ra;
    ip.y = sin(an) * ra;

    z.xyz = ip;

    // Recompute t from the transformed position (inversion changes the coordinates)
    apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
}
`,function:`
    void formula_Apollonian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);

        // Per-axis fold scaling (kosalos: cc = vec3(cx,cy,cz))
        // uVec3A stores (cx-1, cy-1, cz-1) so defaults match reference cx=1.946, cy=0.991, cz=0.945
        vec3 cc = uVec3A + vec3(1.0);
        z3 *= cc;

        // Fold space into [-1, 1] cube
        z3 = -1.0 + 2.0 * fract(0.5 * z3 + 0.5);

        // Undo per-axis scaling
        z3 /= cc;

        // Sphere inversion using pre-computed t (constant per ray, from initial position)
        float z2 = apo_t / max(dot(z3, z3), 1e-10);
        z3 *= z2;
        dr *= abs(z2);

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;
        trap = min(trap, abs(dot(z3, z3)));
    }`,loopBody:"formula_Apollonian(z, dr, trap, c);",getDist:`
    float d = 0.375 * abs(z.y) / max(dr, 1e-10);
    if (apo_invEnabled > 0.5) {
        float invR2 = apo_invRadius * apo_invRadius;
        d = apo_r2 * d / max(invR2 + apo_invR * d, 1e-10);
    }
    return vec2(d, iter);
`},parameters:[{label:"Foam",id:"paramA",min:.1,max:3,step:.001,default:1.032},{label:"Foam 2",id:"paramB",min:.1,max:3,step:.001,default:.92},{label:"Modulation",id:"paramC",min:0,max:2,step:.001,default:.658},{label:"Inversion",id:"paramD",min:0,max:1,step:1,default:0,mode:"toggle"},{label:"Fold Scale",id:"vec3A",type:"vec3",min:-1,max:4,step:.001,default:{x:.946,y:-.009,z:-.055}},{label:"Inv Center",id:"vec3B",type:"vec3",min:-5,max:5,step:.001,default:{x:.758,y:.312,z:.61}},{label:"Inv Radius / Angle",id:"vec2A",type:"vec2",min:-6.3,max:10,step:.001,default:{x:2.74,y:.07}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Apollonian",features:{coreMath:{iterations:13,paramA:1.4,paramB:1,paramC:0,paramD:1,paramF:0,vec2A:{x:1,y:.502},vec3A:{x:0,y:0,z:0},vec3B:{x:1.3525,y:.3285,z:.61}},coloring:{gradient:{stops:[{id:"apo_0",position:0,color:"#0D0221",bias:.5,interpolation:"linear"},{id:"apo_1",position:.15,color:"#2A0845",bias:.5,interpolation:"linear"},{id:"apo_2",position:.3,color:"#6B1D6B",bias:.5,interpolation:"linear"},{id:"apo_3",position:.5,color:"#D4418E",bias:.5,interpolation:"linear"},{id:"apo_4",position:.7,color:"#FF7F50",bias:.2247,interpolation:"linear"},{id:"apo_5",position:.85,color:"#FFD700",bias:.2837,interpolation:"linear"},{id:"apo_6",position:1,color:"#1A0533",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:9.5331,offset:1.1556,repeats:1,phase:.11,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.3,color:"#FFFFFF"},{id:"2",position:.8,color:"#D4418E"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.411,aoSpread:.0032,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.12,specular:.19,roughness:.187,rim:0,rimExponent:4.5,envStrength:.77,envBackgroundStrength:.5,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#0D0221",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#2A0845",bias:.5,interpolation:"linear"},{id:"2",position:.6,color:"#6B1D6B",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#D4418E",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:300,shadowSteps:128,shadowBias:0,lights:[{type:"Point",position:{x:3.3724,y:-.0794,z:.9973},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:14.8996,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500,id:"l7",range:8.7754},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l8"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l9"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:500,distanceMetric:2,estimator:0,fudgeFactor:1,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2.5,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:40,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.41,y:.2424,z:.8532,w:.2125},cameraFov:40,sceneOffset:{x:4,y:1.5,z:1.8,xL:.2077,yL:-.4379,zL:.2855},targetDistance:2.4689,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},fo={id:"Cuboctahedron",name:"Cuboctahedron",shortDescription:"Archimedean solid fractal with cutting-plane DE.",description:"Kaleidoscopic IFS fractal with true cuboctahedral geometry. Uses Knighty's fold-and-cut approach: octahedral symmetry fold combined with cutting-plane distance estimation. The cuboctahedron vertex sits at the edge midpoint of the octahedral Schwarz triangle. Unlike r/dr estimation, the cutting-plane DE naturally handles fold boundary points, producing exact geometry.",juliaType:"offset",tags:["archimedean","ifs","knighty"],shader:{preamble:`
    // Cuboctahedron: Knighty fold-and-cut with cutting-plane DE
    // Octahedral symmetry (Type=4), cuboctahedron = edge midpoint (pbc)
    // Cutting-plane DE: accumulates max(signed_distance_to_face_planes) across iterations
    // This avoids the fold boundary degeneracy that breaks r/dr estimation at (1,1,0)

    // Fold normal for octahedral symmetry: nc = (-0.5, -cos(pi/4), sqrt(0.75 - cos^2(pi/4)))
    const vec3 co_nc = vec3(-0.5, -0.70710678, 0.5);
    // Schwarz triangle basis vectors (hardcoded from Type=4 geometry)
    const vec3 co_pab = vec3(0.0, 0.0, 1.0);                  // face center (octahedron vertex)
    const vec3 co_pbc = vec3(0.70710678, 0.0, 0.70710678);    // edge midpoint (cuboctahedron)
    const vec3 co_pca = vec3(0.0, 0.57735027, 0.81649658);    // cube vertex direction
    // Precomputed dot products for cutting planes: dot(pbc, pab) and dot(pbc, pca)
    const float co_d_pab = 0.70710678;  // 1/sqrt(2)
    const float co_d_pca = 0.57735027;  // 1/sqrt(3)

    // Cutting-plane DE accumulator (mutable — must be in preambleVars)
    float cp_dmin;
    float cp_scale;
    float cp_trap;`,preambleVars:["cp_dmin","cp_scale","cp_trap"],function:`
    void formula_Cuboctahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Knighty octahedral fold: abs + reflect through nc, repeated 4 times (Type=4)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;

        // Cutting plane distance: three face planes of the cuboctahedron
        // Each plane passes through the principal vertex (pbc * size) with normal = basis vector
        float size = uParamB;
        float d0 = dot(z3, co_pab) - co_d_pab * size;
        float d1 = dot(z3, co_pbc) - size;
        float d2 = dot(z3, co_pca) - co_d_pca * size;
        float d_face = max(max(d0, d1), d2);
        cp_dmin = max(cp_dmin, cp_scale * d_face);

        // Scale and offset toward cuboctahedron vertex
        float scale = uParamA;
        vec3 offset = co_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cp_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cp_trap = trap;
    }`,loopBody:"formula_Cuboctahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
cp_dmin = -1e10;
cp_scale = 1.0;
cp_trap = 1e10;`,getDist:`
        float cp_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(cp_dmin) * cp_metric, cp_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Cuboctahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramF:0,vec3A:{x:.7055,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"cubo_5",position:0,color:"#0D3D24",bias:.5,interpolation:"linear"},{id:"cubo_4",position:.2,color:"#E0F5E0",bias:.5,interpolation:"linear"},{id:"cubo_3",position:.4,color:"#90EE90",bias:.5,interpolation:"linear"},{id:"cubo_2",position:.6,color:"#3CB371",bias:.5,interpolation:"linear"},{id:"cubo_1",position:.8,color:"#1B5E3A",bias:.5,interpolation:"linear"},{id:"cubo_0",position:1,color:"#0A2F1F",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:12.3594,offset:-.9222,repeats:1,phase:0,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#3CB371"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.3,aoSpread:.2,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.39,specular:.87,roughness:.35,rim:0,rimExponent:4.5,envStrength:1.12,envBackgroundStrength:.3,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#0A2F1F",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#1B5E3A",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#3CB371",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E0F5E0",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.8701,y:-.1971,z:.0918},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500,id:"l13"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l14"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l15"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:400,distanceMetric:0,estimator:2,fudgeFactor:.6,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.1405,y:.588,z:.1046,w:.7897},cameraFov:36,sceneOffset:{x:2,y:.95,z:1.1,xL:.4539,yL:-.0784,zL:-.3671},targetDistance:2.1206,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},po={id:"TruncatedIcosahedron",name:"Truncated Icosahedron",shortDescription:"Soccer ball / Bucky ball IFS fractal.",description:"Kaleidoscopic IFS fractal with truncated icosahedral geometry (soccer ball / C60 buckyball). Uses icosahedral symmetry folds with an offset pointing toward the truncated vertex position — between the icosahedron vertex and edge midpoint. The truncation parameter controls how much vertex is cut, interpolating between icosahedron (0) and truncated icosahedron (1).",juliaType:"offset",tags:["archimedean","ifs","knighty","soccer-ball"],shader:{preamble:`
    // Truncated Icosahedron: Icosahedral folds + truncated vertex offset
    const float trIco_Phi = (1.0 + sqrt(5.0)) * 0.5;

    // Icosahedral fold normals (same as Icosahedron)
    const vec3 trIco_n1 = normalize(vec3(-trIco_Phi, trIco_Phi - 1.0, 1.0));
    const vec3 trIco_n2 = normalize(vec3(1.0, -trIco_Phi, trIco_Phi + 1.0));
    const vec3 trIco_n3 = vec3(0.0, 0.0, -1.0);

    // Icosahedron vertex direction
    const vec3 trIco_vertexDir = normalize(vec3(0.850650808, 0.525731112, 0.0));
    // Dodecahedron vertex direction (face center of icosahedron after folding)
    // This is genuinely different from vertexDir, enabling truncation interpolation
    const vec3 trIco_dodecDir = normalize(vec3(1.0, 1.0, 1.0));`,function:`
    void formula_TruncatedIcosahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Inner fold: abs + n1 only (full prefold runs once in loopInit)
        z3 = abs(z3);
        float t = dot(z3, trIco_n1);
        if (t > 0.0) z3 -= 2.0 * t * trIco_n1;

        // Offset direction: interpolate between icosahedron vertex and dodecahedron vertex
        // 0 = icosahedron, ~0.33 = truncated icosahedron, ~0.5 = icosidodecahedron, 1 = dodecahedron
        float trunc = clamp(uParamC, 0.0, 1.0);
        vec3 offsetDir = normalize(mix(trIco_vertexDir, trIco_dodecDir, trunc));

        // Scale and offset
        float scale = uParamA;
        vec3 offset = offsetDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3, z3));
    }`,loopBody:"formula_TruncatedIcosahedron(z, dr, trap, c);",loopInit:`
    gmt_precalcRodrigues(uVec3B);
    // Icosahedral prefold: full fold sequence runs ONCE before iteration loop
    {
        vec3 pf = z.xyz;
        pf = abs(pf);
        float t;
        t = dot(pf, trIco_n1); if (t > 0.0) pf -= 2.0 * t * trIco_n1;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        t = dot(pf, trIco_n3); if (t > 0.0) pf -= 2.0 * t * trIco_n3;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        z.xyz = pf;
    }`,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Truncation",id:"paramC",min:0,max:1,step:.001,default:.667},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"TruncatedIcosahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramC:.666,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"trico_0",position:0,color:"#1A0A2E",bias:.5,interpolation:"linear"},{id:"trico_1",position:.2,color:"#3D1C6B",bias:.5,interpolation:"linear"},{id:"trico_2",position:.4,color:"#7B2FBE",bias:.5,interpolation:"linear"},{id:"trico_3",position:.6,color:"#C77DFF",bias:.5,interpolation:"linear"},{id:"trico_4",position:.8,color:"#E0AAFF",bias:.5,interpolation:"linear"},{id:"trico_5",position:1,color:"#240046",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:3.8857,offset:.3843,repeats:1,phase:.333,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFFFFF"},{id:"2",position:.9,color:"#7B2FBE"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.35,aoSpread:.2,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.2,specular:.93,roughness:.3,rim:0,rimExponent:5,envStrength:.25,envBackgroundStrength:.23,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#1A0A2E",bias:.5,interpolation:"linear"},{id:"1",position:.35,color:"#3D1C6B",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#7B2FBE",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E0AAFF",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500,id:"l16"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l17"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l18"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:2,fudgeFactor:.8,stepRelaxation:0,stepJitter:.1,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.1127,y:.1382,z:.0158,w:.9839},cameraFov:36,sceneOffset:{x:.97,y:.63,z:2.99,xL:-.0955,yL:.0888,zL:.0454},targetDistance:2.4005,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},uo={id:"GreatStellatedDodecahedron",name:"Great Stellated Dodecahedron",shortDescription:"Kepler-Poinsot star polyhedron IFS fractal.",description:"Kaleidoscopic IFS fractal based on the great stellated dodecahedron — a Kepler-Poinsot star polyhedron. Uses icosahedral symmetry folds followed by a stellation step that pushes points outward along the vertex direction, creating spiky star-shaped geometry. The stellation parameter controls the spike depth.",juliaType:"offset",tags:["kepler-poinsot","ifs","star","stellation"],shader:{preamble:`
    // Great Stellated Dodecahedron: Cutting-plane DE with stellated face planes
    //
    // Uses Knighty's fold-and-cut stellation approach from Stellations-dodecahedron-try-colored.frag.
    // The icosahedral fold (abs + nc reflect × 3) maps to the fundamental domain.
    // The face plane (pbc) is reflected through symmetry operations for each stellation level:
    //   Iter=0: pbc = normalize(1, 0, φ)     — dodecahedron face (unstellated)
    //   Iter=4: pbc = normalize(φ, 1, 0)     — great stellated dodecahedron
    // The stellation parameter interpolates between these.
    //
    // Hybrid approach:
    //   1. abs(z) + nc reflect × 3 — icosahedral fold to fundamental domain
    //   2. Cutting plane — distance to stellated face
    //   3. Scale + offset — IFS dynamics

    // Icosahedral fold normal: nc = (-0.5, -cos(π/5), sqrt(3/4 - cos²(π/5)))
    const vec3 gsd_nc = vec3(-0.5, -0.80901699, 0.30901699);

    // Offset toward icosahedron vertex (pab = (0,0,1) in Schwarz triangle)
    // The GSD spike tips are at icosahedron vertex positions
    const vec3 gsd_pab = vec3(0.0, 0.0, 1.0);

    // Stellated face normal (mutable, computed from stellation parameter)
    vec3 gsd_faceNor;
    float gsd_faceOff;

    // Cutting-plane DE accumulator
    float gsd_dmin;
    float gsd_scale;
    float gsd_trap;

    void GreatStellatedDodecahedron_precalc() {
        // Precompute stellated face normal from stellation parameter
        // pbc at various stellation levels (traced through Knighty's reflection sequence):
        //   Iter=0: normalize(1, 0, φ)  = (0.52573, 0, 0.85065)
        //   Iter=4: normalize(φ, 1, 0)  = (0.85065, 0.52573, 0)
        vec3 pbc = vec3(0.52573111, 0.0, 0.85065081);

        float stellLevel = uParamC;

        // Apply stellation reflections to pbc
        vec3 sp = pbc;
        sp.x = -sp.x;                                                        // 1st stellation
        float tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;              // 2nd stellation
        sp.y = -sp.y;                                                        // 3rd stellation
        tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;                    // 4th (great stellated)

        gsd_faceNor = normalize(mix(pbc, sp, stellLevel));

        // Face offset: distance from origin to face plane along normal through vertex p
        // p = normalize(pca) = normalize(0, scospin, cospin) = (0, 0.356822, 0.934172)
        vec3 p = vec3(0.0, 0.35682209, 0.93417236);
        gsd_faceOff = dot(gsd_faceNor, p);
    }`,preambleVars:["gsd_faceNor","gsd_faceOff","gsd_dmin","gsd_scale","gsd_trap"],function:`
    void formula_GreatStellatedDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Full icosahedral fold — (abs + nc reflect) × 3
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;

        // Step 2: Cutting plane — distance to stellated face in fundamental domain
        float size = uParamB;
        float d_face = dot(z3, gsd_faceNor) - gsd_faceOff * size;
        gsd_dmin = max(gsd_dmin, gsd_scale * d_face);

        // Step 3: Scale and offset toward icosahedron vertex (spike tip)
        float scale = uParamA;
        vec3 offset = gsd_pab * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        gsd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        gsd_trap = trap;
    }`,loopBody:"formula_GreatStellatedDodecahedron(z, dr, trap, c);",loopInit:`GreatStellatedDodecahedron_precalc();
gmt_precalcRodrigues(uVec3B);
gsd_dmin = -1e10;
gsd_scale = 1.0;
gsd_trap = 1e10;`,getDist:`
        float gsd_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(gsd_dmin) * gsd_metric, gsd_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Stellation",id:"paramC",min:-1,max:2,step:.001,default:.5},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"GreatStellatedDodecahedron",features:{coreMath:{iterations:13,paramA:2,paramB:.5,paramC:2.88,paramF:0,vec3A:{x:-.097,y:0,z:.073},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"gsd_0",position:0,color:"#009392",bias:.5,interpolation:"linear"},{id:"gsd_1",position:.167,color:"#72aaa1",bias:.5,interpolation:"linear"},{id:"gsd_2",position:.333,color:"#b1c7b3",bias:.5,interpolation:"linear"},{id:"gsd_3",position:.438,color:"#f1eac8",bias:.5,interpolation:"linear"},{id:"gsd_4",position:.52,color:"#e5b9ad",bias:.5,interpolation:"linear"},{id:"gsd_5",position:.612,color:"#d98994",bias:.386,interpolation:"linear"},{id:"gsd_6",position:1,color:"#d0587e",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:16.374,offset:-.511,repeats:1,phase:0,bias:1,twist:0,escape:2,gradient2:{stops:[{id:"1",position:.241,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:.676,color:"#5CBDFF",bias:.5,interpolation:"linear"},{id:"3",position:.838,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode2:11,scale2:1.098,offset2:-.479,repeats2:2,phase2:-.34,bias2:1,twist2:0,blendMode:1,blendOpacity:3,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.42,aoSpread:.115,aoSamples:12,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:2,reflection:0,specular:.58,roughness:.132,rim:0,rimExponent:5,envStrength:0,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:.185,emissionMode:1,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#FFFFFF",bias:.531,interpolation:"linear"},{id:"1",position:.3,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#000000",bias:.757,interpolation:"linear"},{id:"3",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],colorSpace:"srgb"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.007,glowSharpness:7.413,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:200,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.6,pixelThreshold:.2,maxSteps:400,distanceMetric:0,stepJitter:.15,estimator:2},colorGrading:{saturation:1.1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:36,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.0554,y:.2593,z:-.0149,w:.9641},sceneOffset:{x:.8864,y:-.4103,z:2.3049,xL:.3623,yL:.0597,zL:.2368},targetDistance:2.44,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.221,y:-.428,z:.048},color:"#FFE0C0",intensity:1,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4800},{type:"Point",position:{x:.242,y:-.766,z:1.511},rotation:{x:0,y:0,z:0},color:"#FF8F8F",intensity:6.708,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#7C7CFF",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},mo={id:"PseudoKleinian06",name:"Pseudo Kleinian 06",shortDescription:"Pseudo Kleinian with Thingy DE + sphere inversion. By Knighty & Theli-at.",description:`Pseudo Kleinian fractal (Scale 1 JuliaBox + Thingy DE shape) by Knighty and Theli-at.

Produces intricate Kleinian group limit sets, nested spherical lattices, and soap-film-like bubble networks.

Each iteration applies:
1. Box fold: p = 2·clamp(p, −CSize, CSize) − p
2. Sphere fold: k = max(Size/r², 1); p *= k
3. Julia shift: p += C

The DE uses the "Thingy" shape — a twisted cylinder cross-section.

With Inversion enabled, the infinite periodic tiling wraps into a bounded sphere via Möbius inversion, producing the classic Kleinian bubble geometry. InvRadius controls the inversion sphere size; InvCenter positions it.

Key parameters:
• Size: sphere fold radius. 1 = scale-1 Julia box.
• CSize: box fold half-size per axis. CSize.z also offsets z before the loop.
• C: Julia constant shift. Zero = pure Kleinian; non-zero = Julia variant.
• Inversion: toggle + radius. Wraps infinite tiling into bounded sphere.
• InvCenter: sphere inversion center. Classic value (1.15, 0.5, −2).
• Thickness: x=TThickness (DE numerator), y=TThickness2 (shell radius).
• Offset: translates the Thingy DE shape origin.
• DEoffset: subtracts from the final DE, inflating the surface.`,juliaType:"none",tags:["kleinian","box-fold","inversion"],shader:{preamble:"float jkk_r; float jkk_r2;",preambleVars:["jkk_r","jkk_r2"],loopInit:`
            jkk_r = 0.0; jkk_r2 = 0.0;
            if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
                jkk_r = length(z.xyz);
                jkk_r2 = jkk_r * jkk_r;
                z.xyz = (uVec2B.y / max(jkk_r2, 1e-10)) * z.xyz + uVec4A.xyz;
            }
            z.z += uVec3B.z;`,function:`
    void formula_PseudoKleinian06(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 cSize = uVec3B;
        z.xyz = 2.0 * clamp(z.xyz, -cSize, cSize) - z.xyz;

        float r2 = dot(z.xyz, z.xyz);
        float k = max(uParamB / max(r2, 1e-10), 1.0);
        z.xyz *= k;
        dr *= k;

        z.xyz += uVec3C;
        trap = min(trap, r2);
    }`,loopBody:"formula_PseudoKleinian06(z, dr, trap, c);",getDist:`
    vec3 p = z.xyz - uVec3A;
    float lxy = length(p.xy);
    float rxy = lxy - uVec2A.y;
    float e = uVec2A.x;
    float thingy = (lxy * abs(p.z) - e) / sqrt(dot(p, p) + abs(e));
    float d = abs(0.5 * max(rxy, thingy) / max(dr, 1e-10) - uParamC);
    if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
        d = jkk_r2 * d / (uVec2B.y + jkk_r * d);
    }
    return vec2(d, iter);
`},parameters:[{label:"Size",id:"paramB",min:.01,max:2,step:.001,default:1},{label:"DEoffset",id:"paramC",min:0,max:.01,step:1e-4,default:0},{label:"Thickness",id:"vec2A",type:"vec2",min:0,max:2,step:.001,default:{x:0,y:2}},{label:"Inversion",id:"vec2B",type:"vec2",min:0,max:2,step:.01,default:{x:1,y:1},mode:"mixed"},{label:"Offset",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:0,y:0,z:0}},{label:"CSize",id:"vec3B",type:"vec3",min:0,max:2,step:.001,default:{x:1,y:.5,z:1},linkable:!0},{label:"C",id:"vec3C",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"InvCenter",id:"vec4A",type:"vec4",min:-3,max:3,step:.01,default:{x:1.15,y:.5,z:-2,w:0}}],defaultPreset:{formula:"PseudoKleinian06",features:{coreMath:{iterations:6,paramB:1,paramC:0,vec2A:{x:0,y:2},vec2B:{x:1,y:1},vec3A:{x:0,y:0,z:0},vec3B:{x:1,y:.5,z:1},vec3C:{x:0,y:0,z:0},vec4A:{x:1.15,y:.5,z:-2,w:0}},coloring:{mode:3,repeats:50,phase:0,scale:20,offset:0,bias:1,twist:0,escape:2,mode2:0,repeats2:50,phase2:0,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1",position:0,color:"#1a2a4a",bias:.5,interpolation:"linear"},{id:"2",position:.4,color:"#4a8fbf",bias:.5,interpolation:"linear"},{id:"3",position:.75,color:"#d4eaf7",bias:.5,interpolation:"linear"},{id:"4",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},materials:{reflection:.1,specular:1.5,roughness:.4,diffuse:1.5,envStrength:.3,rim:0,rimExponent:1,emission:0,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1",position:0,color:"#0a1525",bias:.5,interpolation:"linear"},{id:"2",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"3",position:1,color:"#88aacc",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:.5,fogNear:.001,fogFar:30,fogColor:"#0a1525",fogDensity:0,glowIntensity:.02,glowSharpness:30,glowColor:"#88ccff",glowMode:!1,aoIntensity:.4,aoSpread:.1,aoMode:!1},lighting:{shadows:!0,shadowSoftness:60,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.9,maxSteps:500,aaMode:"Auto",aaLevel:1,distanceMetric:1,estimator:4},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},optics:{dofStrength:0,dofFocus:1}},cameraPos:{x:-.24,y:.93,z:-.48},cameraRot:{x:0,y:0,z:0,w:1},cameraFov:42,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:2,cameraMode:"Fly",lights:[{type:"Point",position:{x:-3.5,y:-1.2,z:.8},rotation:{x:0,y:0,z:0},color:"#fffacd",intensity:10,falloff:30,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:3,z:4},rotation:{x:0,y:0,z:0},color:"#c8deff",intensity:2,falloff:40,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]}},ho={id:"PseudoKleinianMod4",name:"Pseudo Kleinian Mod4",shortDescription:"Extended PK with per-iteration sphere inversion and box offset (darkbeam).",description:"Extended Pseudo Kleinian based on Mandelbulber's Mod4 variant by darkbeam. Adds per-iteration sphere inversion and sign-based box offset to the core Knighty/Theli-at box fold + sphere fold. The sphere inversion maps each iteration through an inversion sphere, creating intricate nested structures. Box offset subtracts a constant times sign(z) per axis, breaking symmetry in controllable ways. Three DE shapes: Plane (Fragmentarium), Cylindrical (Mandelbulber), Thingy (Fragmentarium).",juliaType:"none",tags:["kleinian","box-fold","inversion"],shader:{preamble:`
    // PseudoKleinianMod4: alternating offset state
    float pk4_posNeg = 1.0;`,function:`
    void formula_PseudoKleinianMod4(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Twist (paramF)
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        // Per-iteration sphere inversion (Mandelbulber Mod4 reference)
        // z *= invScale / r²  — disabled when paramE = 0
        float invScale = uParamE;
        if (invScale > 0.001) {
            float rr = max(dot(q, q), 1e-10);
            float invK = invScale / rr;
            q *= invK;
            dr *= invK;
        }

        // Box offset: z -= multiplier * sign(z) (Mandelbulber Mod4 / darkbeam)
        vec3 boxOff = uVec3C;
        if (abs(boxOff.x) + abs(boxOff.y) + abs(boxOff.z) > 0.001) {
            q -= boxOff * sign(q);
        }

        // Core PK box fold (reference: 2*clamp(p,-CSize,CSize)-p)
        vec3 cSize = uVec3B;
        q = 2.0 * clamp(q, -cSize, cSize) - q;

        // Sphere fold: k = max(Size / dot(q,q), 1)
        // Mandelbulber reference: aux.DE *= k + tweak005 (tweak ~0.005)
        float lensq = max(dot(q, q), 1e-10);
        float k1 = max(uParamB / lensq, 1.0);
        q *= k1;
        dr *= k1 + 0.005;

        // Orbit trap
        trap = min(trap, lensq);

        // C shift (reference: p += C)
        q += uVec3A;

        // Alternating offset (Mandelbulber Mod4: pos_neg * constant, flips each iter)
        if (abs(uParamD) > 0.001) {
            q.z += pk4_posNeg * uParamD;
            pk4_posNeg *= -1.0;
        }

        trap = min(trap, dot(q, q));
        z.xyz = q;
    }`,loopBody:"formula_PseudoKleinianMod4(z, dr, trap, c);",loopInit:"pk4_posNeg = 1.0;",getDist:`
    float d;
    if (uParamA > 1.5) {
        // Thingy DE shape (Knighty/Theli-at Fragmentarium reference)
        float lxy = length(z.xy);
        float thingy = (abs(lxy * z.z) - uParamC) / sqrt(dot(z.xyz, z.xyz) + abs(uParamC));
        d = abs(0.5 * thingy / max(dr, 1e-10));
    } else if (uParamA > 0.5) {
        // Cylindrical DE shape (Mandelbulber reference: sqrt(x²+y²) / DE - offset)
        d = abs(0.5 * length(z.xy) / max(dr, 1e-10) - uParamC);
    } else {
        // Plane DE shape (Knighty/Fragmentarium reference)
        d = abs(0.5 * abs(z.z) / max(dr, 1e-10) - uParamC);
    }
    return vec2(d, iter);
`,preambleVars:["pk4_posNeg"]},parameters:[{label:"DE Shape",id:"paramA",min:0,max:2,step:1,default:0,options:[{label:"Plane",value:0},{label:"Cylindrical",value:1},{label:"Thingy",value:2}]},{label:"Size",id:"paramB",min:.1,max:5,step:.001,default:.5},{label:"Thickness",id:"paramC",min:0,max:2,step:.001,default:.01},{label:"Alt Offset",id:"paramD",min:-2,max:2,step:.001,default:0},{label:"Inv Scale",id:"paramE",min:0,max:5,step:.001,default:0},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0},{label:"C Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Box Size",id:"vec3B",type:"vec3",min:.1,max:3,step:.001,default:{x:.7,y:.7,z:.7},linkable:!0},{label:"Box Offset",id:"vec3C",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"PseudoKleinianMod4",features:{coreMath:{iterations:24,paramA:1,paramB:.543,paramC:.0045,paramD:0,paramE:.654,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:.583,y:.5315,z:.6565},vec3C:{x:0,y:0,z:0}},coloring:{gradient:[{id:"pk4_0",position:0,color:"#0A0A1A",bias:.5,interpolation:"linear"},{id:"pk4_1",position:.25,color:"#2B1B4E",bias:.5,interpolation:"linear"},{id:"pk4_2",position:.45,color:"#4A6FA5",bias:.5,interpolation:"linear"},{id:"pk4_3",position:.65,color:"#8ECAE6",bias:.5,interpolation:"linear"},{id:"pk4_4",position:.85,color:"#E0E0E0",bias:.5,interpolation:"linear"},{id:"pk4_5",position:1,color:"#0A0A1A",bias:.5,interpolation:"linear"}],mode:0,scale:2.72,offset:-.203,repeats:3,phase:0,bias:1,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#4A6FA5"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:0,aoSpread:.229,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:3,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.5,reflection:.04,specular:1.07,roughness:.19,rim:.256,rimExponent:10,envStrength:0,envBackgroundStrength:.2,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"0",position:0,color:"#001133"},{id:"1",position:.4,color:"#2B1B4E"},{id:"2",position:.7,color:"#4A6FA5"},{id:"3",position:1,color:"#E0E0E0"}]},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:200,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.7,pixelThreshold:1,maxSteps:300,distanceMetric:0,stepJitter:.15,estimator:4},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:71,dofStrength:0,dofFocus:1.916}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.3652,y:.2028,z:.2407,w:.8761},sceneOffset:{x:1,y:-1.45,z:1.2142,xL:-.0277,yL:.4093,zL:-.3094},targetDistance:1.383,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Tn=[yt,Mt,St,$a,to,eo,Ja,bt,wt,xt,Qa,oo,vt,zt,_t,Ct,Oa,ja,Na,mo,ho,Va,io,ro,fo,po,no,so,lo,uo,co,Ka,Ha,Ya,Ga,qa,Ua,Wa,Xa,ao,Za];Tn.forEach(e=>te.register(e));te.registerAlias("UberMenger","MengerAdvanced");te.registerAlias("FoldingBrot","BoxBulb");te.registerAlias("HyperTorus","Mandelorus");te.registerAlias("HyperbolicMandelbrot","MandelBolic");te.registerAlias("RhombicIcosahedron","Coxeter");const ql=[{name:"Featured Fractals",match:[yt.id,Mt.id,St.id,bt.id,wt.id,xt.id,vt.id,zt.id,_t.id,Ct.id]},{name:"Platonic & Archimedean",match:[$a.id,xt.id,io.id,Va.id,ro.id,fo.id,po.id]},{name:"Catalan & Coxeter",match:[no.id,so.id,lo.id]},{name:"Stellations & Special",match:[uo.id,co.id]},{name:"IFS & Folding",match:[St.id,Qa.id,oo.id,Ga.id,qa.id,vt.id,Na.id,mo.id,ho.id,bt.id,zt.id,wt.id]},{name:"Power Fractals",match:[yt.id,Oa.id,ja.id,Mt.id,Ha.id,Ya.id,Ua.id,Wa.id,Xa.id]},{name:"Hybrids & Experiments",match:[to.id,eo.id,Ja.id,Ka.id,_t.id,ao.id,Ct.id]},{name:"Systems",match:[Za.id]}];export{$l as $,Fe as A,Nl as B,$e as C,Rs as D,Vl as E,F,_l as G,Hl as H,As as I,$n as J,el as K,Vn as L,mn as M,fs as N,Gs as O,sl as P,$s as Q,Ys as R,yn as S,bs as T,X as U,Ts as V,Hs as W,Ms as X,Cs as Y,Fs as Z,qs as _,ht as a,kl as a$,Go as a0,te as a1,tl as a2,Ss as a3,zs as a4,vs as a5,ks as a6,hs as a7,_s as a8,Bs as a9,Oe as aA,ka as aB,Cl as aC,Fl as aD,Rl as aE,Tl as aF,ys as aG,Be as aH,gs as aI,Ds as aJ,Zs as aK,Ns as aL,Vs as aM,jl as aN,as as aO,fa as aP,we as aQ,Es as aR,rl as aS,nl as aT,ql as aU,In as aV,Al as aW,H as aX,El as aY,Dl as aZ,Ll as a_,Bn as aa,Gl as ab,ws as ac,Ps as ad,Qs as ae,Os as af,fn as ag,xs as ah,cs as ai,Zn as aj,V as ak,Ls as al,Js as am,Ks as an,ta as ao,jn as ap,Nn as aq,Hn as ar,Aa as as,us as at,ms as au,ds as av,ns as aw,ps as ax,Il as ay,Pl as az,Jn as b,Ml as b0,Bl as b1,Ol as b2,ca as b3,bn as b4,Ci as b5,Ue as b6,Di as b7,Li as b8,Bi as b9,al as bA,qn as bB,Gn as bC,Wn as bD,Un as bE,ol as bF,ss as bG,Er as bH,ki as ba,Oi as bb,Rr as bc,ie as bd,Kr as be,Xn as bf,Yn as bg,il as bh,js as bi,wl as bj,yl as bk,bl,xl as bm,vl as bn,Sl as bo,ml as bp,zl as bq,Qn as br,Kn as bs,cl as bt,dl as bu,gl as bv,hl as bw,pl as bx,fl as by,ul as bz,De as c,le as d,Da as e,L as f,Ee as g,Is as h,rs as i,is as j,Ge as k,It as l,ll as m,ze as n,Us as o,Xs as p,Ws as q,On as r,ls as s,We as t,ue as u,es as v,Tr as w,ts as x,vn as y,os as z};
