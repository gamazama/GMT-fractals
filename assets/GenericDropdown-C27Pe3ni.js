var yo=Object.defineProperty;var bo=(e,o,t)=>o in e?yo(e,o,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[o]=t;var S=(e,o,t)=>bo(e,typeof o!="symbol"?o+"":o,t);import{a as Ot}from"./three-drei-hqOrdlmR.js";import{d as J,c as E,l as vo,Q as be,E as Re,O as xo,P as So,n as _e,m as G,p as _o,q as wo,r as lt,s as ct,k as We}from"./three-DZB2NGqN.js";import{p as dt}from"./pako-DwGzBETv.js";import{j as u,r as j,R as H}from"./three-fiber-C5DkfiAm.js";(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&a(n)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const Io=e=>(o,t,a)=>{const i=a.subscribe;return a.subscribe=(n,l,s)=>{let c=n;if(l){const d=(s==null?void 0:s.equalityFn)||Object.is;let h=n(a.getState());c=p=>{const f=n(p);if(!d(h,f)){const m=h;l(h=f,m)}},s!=null&&s.fireImmediately&&l(h,h)}return i(c)},e(o,t,a)},Nt=Io,$={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula",RESET_HINTS:"reset_hints",CAMERA_SLOT_SAVED:"camera_slot_saved"};class Co{constructor(){S(this,"listeners",{})}on(o,t){return this.listeners[o]||(this.listeners[o]=[]),this.listeners[o].push(t),()=>this.off(o,t)}off(o,t){this.listeners[o]&&(this.listeners[o]=this.listeners[o].filter(a=>a!==t))}emit(o,t){this.listeners[o]&&this.listeners[o].forEach(a=>a(t))}}const w=new Co,q={Time:"uTime",FrameCount:"uFrameCount",Resolution:"uResolution",SceneOffsetHigh:"uSceneOffsetHigh",SceneOffsetLow:"uSceneOffsetLow",CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",ImageTileOrigin:"uImageTileOrigin",ImageTileSize:"uImageTileSize",FullOutputResolution:"uFullOutputResolution",TilePixelOrigin:"uTilePixelOrigin",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",HistoryTexture:"uHistoryTexture",BlendFactor:"uBlendFactor",Jitter:"uJitter",BlueNoiseTexture:"uBlueNoiseTexture",BlueNoiseResolution:"uBlueNoiseResolution",ModularParams:"uModularParams",EnvRotationMatrix:"uEnvRotationMatrix",FogColorLinear:"uFogColorLinear",HistogramLayer:"uHistogramLayer",PreRotMatrix:"uPreRotMatrix",PostRotMatrix:"uPostRotMatrix",WorldRotMatrix:"uWorldRotMatrix",InternalScale:"uInternalScale",PixelSizeBase:"uPixelSizeBase",OutputPass:"uOutputPass",DepthMin:"uDepthMin",DepthMax:"uDepthMax"},ut=e=>{if(typeof window>"u")return!1;const o=new URLSearchParams(window.location.search),t=o.get(e);return o.has(e)&&(t==null?void 0:t.toLowerCase())!=="false"&&t!=="0"},Mo={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Ro=(e,o)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,histogramLoading:!1,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,openLightPopupIndex:-1,shadowPanelOpen:!1,vpQualityOpen:!1,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:ut("clean")||ut("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:Mo,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:(()=>{try{const t=localStorage.getItem("gmt-tutorials");return t?JSON.parse(t).completed||[]:[]}catch{return[]}})(),setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t,histogramLoading:!1}),setHistogramLoading:t=>e({histogramLoading:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{o().histogramLayer!==t&&(e({histogramLayer:t}),w.emit("uniform",{key:q.HistogramLayer,value:t}),e(a=>({histogramTrigger:a.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setOpenLightPopupIndex:t=>e({openLightPopupIndex:t}),setShadowPanelOpen:t=>e({shadowPanelOpen:t}),setVpQualityOpen:t=>e({vpQualityOpen:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),w.emit("reset_accum",void 0)},setFixedResolution:(t,a)=>{e({fixedResolution:[t,a]}),w.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(a=>({helpWindow:{visible:!0,activeTopicId:t||a.helpWindow.activeTopicId},contextMenu:{...a.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,a,i,r)=>e({contextMenu:{visible:!0,x:t,y:a,items:i,targetHelpIds:r||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,a,i)=>e(r=>{var m,b;const n={...r.panels};n[t]||(n[t]={id:t,location:a,order:0,isCore:!1,isOpen:!0});const l=!0;let s=i;s===void 0&&(s=Object.values(n).filter(g=>g.location===a).length),(a==="left"||a==="right")&&Object.values(n).forEach(y=>{y.location===a&&y.id!==t&&(y.isOpen=!1)});let c=n[t].floatPos;a==="float"&&!c&&(c={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),n[t]={...n[t],location:a,order:s,isOpen:l,floatPos:c};const d=a==="left"?t:((m=Object.values(n).find(y=>y.location==="left"&&y.isOpen))==null?void 0:m.id)||null,h=a==="right"?t:((b=Object.values(n).find(y=>y.location==="right"&&y.isOpen))==null?void 0:b.id)||null,p=a==="left"?!1:r.isLeftDockCollapsed,f=a==="right"?!1:r.isRightDockCollapsed;return{panels:n,activeLeftTab:d,activeRightTab:h,isLeftDockCollapsed:p,isRightDockCollapsed:f}}),reorderPanel:(t,a)=>e(i=>{const r={...i.panels},n=r[t],l=r[a];if(!n||!l)return{};n.location!==l.location&&(n.location=l.location,n.isOpen=!1);const s=l.location,c=Object.values(r).filter(f=>f.location===s).sort((f,m)=>f.order-m.order),d=c.findIndex(f=>f.id===t),h=c.findIndex(f=>f.id===a);if(d===-1||h===-1)return{};const[p]=c.splice(d,1);return c.splice(h,0,p),c.forEach((f,m)=>{r[f.id]={...r[f.id],order:m}}),{panels:r}}),togglePanel:(t,a)=>e(i=>{var d,h;const r={...i.panels};if(!r[t])return{};const n=r[t],l=a!==void 0?a:!n.isOpen;if(n.location==="float")n.isOpen=l;else if(l){if(Object.values(r).forEach(p=>{p.location===n.location&&p.id!==t&&(p.isOpen=!1)}),n.isOpen=!0,n.location==="left")return{panels:r,activeLeftTab:t,isLeftDockCollapsed:!1};if(n.location==="right")return{panels:r,activeRightTab:t,isRightDockCollapsed:!1}}else n.isOpen=!1;const s=((d=Object.values(r).find(p=>p.location==="left"&&p.isOpen))==null?void 0:d.id)||null,c=((h=Object.values(r).find(p=>p.location==="right"&&p.isOpen))==null?void 0:h.id)||null;return{panels:r,activeLeftTab:s,activeRightTab:c}}),setDockSize:(t,a)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:a}),setDockCollapsed:(t,a)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:a}),setFloatPosition:(t,a,i)=>e(r=>({panels:{...r.panels,[t]:{...r.panels[t],floatPos:{x:a,y:i}}}})),setFloatSize:(t,a,i)=>e(r=>({panels:{...r.panels,[t]:{...r.panels[t],floatSize:{width:a,height:i}}}})),startPanelDrag:t=>e(a=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(a.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>o().togglePanel(t,!0),floatTab:t=>o().movePanel(t,"float"),dockTab:t=>o().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(a=>({compositionOverlaySettings:{...a.compositionOverlaySettings,...t}})),startTutorial:t=>e({tutorialActive:!0,tutorialLessonId:t,tutorialStepIndex:0,showHints:!1}),advanceTutorialStep:()=>e(t=>({tutorialStepIndex:t.tutorialStepIndex+1})),skipTutorial:()=>e({tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,showHints:!0}),completeTutorial:()=>e(t=>{const a=t.tutorialLessonId!==null&&!t.tutorialCompleted.includes(t.tutorialLessonId)?[...t.tutorialCompleted,t.tutorialLessonId]:t.tutorialCompleted;try{localStorage.setItem("gmt-tutorials",JSON.stringify({completed:a}))}catch{}return{tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:a,showHints:!0}})}),Eo=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,Lo=(e,o)=>({dpr:Eo()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,adaptiveSuppressed:!1,renderRegion:null,previewRegion:null,isBucketRendering:!1,bucketSize:512,outputWidth:1920,outputHeight:1080,tileCols:1,tileRows:1,matchViewportAspect:!0,convergenceThreshold:.25,samplesPerBucket:64,canvasPixelSize:[1920,1080],setDpr:t=>{e({dpr:t}),w.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:a}=o();(a==="Always"||a==="Auto")&&e({dpr:t}),w.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:a}=o();a==="Always"||a==="Auto"?w.emit("config",{msaaSamples:t}):w.emit("config",{msaaSamples:1}),w.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:a,msaaSamples:i}=o();t==="Off"?(e({dpr:1}),w.emit("config",{msaaSamples:1})):(e({dpr:a}),w.emit("config",{msaaSamples:i})),w.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),w.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),w.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const a=t==="PathTracing"?1:0,i=o().setLighting;i&&i({renderMode:a})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const a=t?new J(t.minX,t.minY):new J(0,0),i=t?new J(t.maxX,t.maxY):new J(1,1);w.emit("uniform",{key:q.RegionMin,value:a}),w.emit("uniform",{key:q.RegionMax,value:i}),w.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setOutputWidth:t=>e({outputWidth:Math.max(64,Math.round(t))}),setOutputHeight:t=>e({outputHeight:Math.max(64,Math.round(t))}),setTileCols:t=>e({tileCols:Math.max(1,Math.min(32,Math.round(t)))}),setTileRows:t=>e({tileRows:Math.max(1,Math.min(32,Math.round(t)))}),setMatchViewportAspect:t=>e({matchViewportAspect:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setCanvasPixelSize:(t,a)=>e({canvasPixelSize:[t,a]}),setIsExporting:t=>e({isExporting:t}),setAdaptiveSuppressed:t=>e({adaptiveSuppressed:t}),setPreviewRegion:t=>e({previewRegion:t})}),jt=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let t=0;t<8;t++)o=o&1?3988292384^o>>>1:o>>>1;jt[e]=o}const To=e=>{let o=-1;for(let t=0;t<e.length;t++)o=o>>>8^jt[(o^e[t])&255];return(o^-1)>>>0},Po=new TextEncoder,ft=new TextDecoder,ko=e=>{const o=new Uint8Array(e.length);for(let t=0;t<e.length;t++)o[t]=e.charCodeAt(t);return o},Oe=e=>{let o="";for(let t=0;t<e.length;t++)o+=String.fromCharCode(e[t]);return o},pt=(e,o,t)=>{e[o]=t>>>24&255,e[o+1]=t>>>16&255,e[o+2]=t>>>8&255,e[o+3]=t&255},zo=async(e,o,t)=>{const a=await e.arrayBuffer(),i=new Uint8Array(a);if(i[0]!==137||i[1]!==80||i[2]!==78||i[3]!==71)throw new Error("Not a valid PNG");const r=ko(o),n=Po.encode(t),l=r.length+1+1+1+1+1+n.length,s=12+l,c=new Uint8Array(s);pt(c,0,l),c[4]=105,c[5]=84,c[6]=88,c[7]=116;let d=8;c.set(r,d),d+=r.length,c[d++]=0,c[d++]=0,c[d++]=0,c[d++]=0,c[d++]=0,c.set(n,d);const h=To(c.slice(4,s-4));pt(c,s-4,h);let p=8;for(;p<i.length;){const m=i[p]<<24|i[p+1]<<16|i[p+2]<<8|i[p+3];if(Oe(i.slice(p+4,p+8))==="IEND")break;p+=12+m}const f=new Uint8Array(i.length+s);return f.set(i.slice(0,p),0),f.set(c,p),f.set(i.slice(p),p+s),new Blob([f],{type:"image/png"})},yr=async(e,o)=>{const t=await e.arrayBuffer(),a=new Uint8Array(t);if(a[0]!==137||a[1]!==80)return null;let i=8;for(;i<a.length;){const r=a[i]<<24|a[i+1]<<16|a[i+2]<<8|a[i+3],n=Oe(a.slice(i+4,i+8));if(n==="iTXt"){const l=a.slice(i+8,i+8+r);let s=-1;for(let c=0;c<l.length;c++)if(l[c]===0){s=c;break}if(s!==-1&&Oe(l.slice(0,s))===o){let d=s+1+1+1;for(;d<l.length&&l[d]!==0;)d++;for(d++;d<l.length&&l[d]!==0;)d++;return d++,ft.decode(l.slice(d))}}if(n==="tEXt"){const l=a.slice(i+8,i+8+r);let s=-1;for(let c=0;c<l.length;c++)if(l[c]===0){s=c;break}if(s!==-1&&Oe(l.slice(0,s))===o)return ft.decode(l.slice(s+1))}if(n==="IEND")break;i+=12+r}return null};class Ao{constructor(){S(this,"activeCamera",null);S(this,"virtualSpace",null);S(this,"renderer",null);S(this,"pipeline",null);S(this,"_worker",null);S(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});S(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});S(this,"_offsetGuarded",!1);S(this,"_offsetGuardTimer",null);S(this,"_onCompiling",null);S(this,"_onCompileTime",null);S(this,"_onShaderCode",null);S(this,"_onBootedCallback",null);S(this,"_pendingSnapshots",new Map);S(this,"_pendingPicks",new Map);S(this,"_pendingFocusPicks",new Map);S(this,"_pendingHistograms",new Map);S(this,"_pendingShaderSource",new Map);S(this,"_gpuInfo","");S(this,"_lastGeneratedFrag","");S(this,"_onWorkerFrame",null);S(this,"_pendingTimeouts",new Map);S(this,"_exportStartTimer",null);S(this,"_exportFinishTimer",null);S(this,"modulations",{});S(this,"_isBucketRendering",!1);S(this,"_isExporting",!1);S(this,"_exportReady",null);S(this,"_exportFrameDone",null);S(this,"_exportComplete",null);S(this,"_exportError",null);S(this,"_container",null);S(this,"_lastInitArgs",null);S(this,"_onCrash",null);S(this,"pendingTeleport",null);S(this,"_isGizmoInteracting",!1);S(this,"_bootSent",!1);S(this,"_pendingOffsetSync",null)}initWorkerMode(o,t,a,i,r,n,l){if(this._worker)return;this._container=o.parentElement,this._lastInitArgs={config:t,width:a,height:i,dpr:r,isMobile:n,initialCamera:l};const s=o.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-BSzzxJeG.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=d=>{this._handleWorkerMessage(d.data)},this._worker.onerror=d=>{console.error("[WorkerProxy] Worker error:",d),this._handleWorkerCrash("Worker error: "+(d.message||"unknown"))};const c={type:"INIT",canvas:s,width:a,height:i,dpr:r,isMobile:n,initialConfig:t,initialCamera:l};this._worker.postMessage(c,[s])}restart(o,t){if(!this._container||!this._lastInitArgs)return;this._clearAllTimers(),this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const a=this._container.querySelector("canvas");a&&a.remove();const{width:i,height:r,dpr:n,isMobile:l}=this._lastInitArgs,s=document.createElement("canvas");s.width=i*n,s.height=r*n,s.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(s),this._lastInitArgs={...this._lastInitArgs,config:o,initialCamera:t};const c=s.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-BSzzxJeG.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=h=>{this._handleWorkerMessage(h.data)},this._worker.onerror=h=>{console.error("[WorkerProxy] Worker error:",h),this._handleWorkerCrash("Worker error: "+(h.message||"unknown"))};const d={type:"INIT",canvas:c,width:i,height:r,dpr:n,isMobile:l,initialConfig:o,initialCamera:t};this._worker.postMessage(d,[c])}set onCompiling(o){this._onCompiling=o}set onCompileTime(o){this._onCompileTime=o}set onShaderCode(o){this._onShaderCode=o}registerFrameCounter(o){this._onWorkerFrame=o}_handleWorkerMessage(o){switch(o.type){case"READY":break;case"FRAME_READY":if(o.state)if(this._shadow=o.state,this._offsetGuarded){const t=o.state.sceneOffset,a=this._localOffset;Math.abs(t.x+t.xL-(a.x+a.xL))+Math.abs(t.y+t.yL-(a.y+a.yL))+Math.abs(t.z+t.zL-(a.z+a.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...o.state.sceneOffset};this._onWorkerFrame&&this._onWorkerFrame();break;case"COMPILING":this._shadow.isCompiling=!!o.status,this._shadow.hasCompiledShader=!o.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(o.status),w.emit($.IS_COMPILING,o.status);break;case"COMPILE_TIME":o.duration&&(this._shadow.lastCompileDuration=o.duration),this._onCompileTime&&this._onCompileTime(o.duration),w.emit($.COMPILE_TIME,o.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=o.code,this._onShaderCode&&this._onShaderCode(o.code),w.emit($.SHADER_CODE,o.code);break;case"SHADER_SOURCE_RESULT":this._resolveRequest(o.id,this._pendingShaderSource,o.code);break;case"BOOTED":this._shadow.isBooted=!0,o.gpuInfo&&(this._gpuInfo=o.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=o.info;break;case"HISTOGRAM_RESULT":this._resolveRequest(o.id,this._pendingHistograms,o.data);break;case"SNAPSHOT_RESULT":this._resolveRequest(o.id,this._pendingSnapshots,o.blob);break;case"PICK_RESULT":this._resolveRequest(o.id,this._pendingPicks,o.position?new E(o.position[0],o.position[1],o.position[2]):null);break;case"FOCUS_RESULT":this._resolveRequest(o.id,this._pendingFocusPicks,o.distance);break;case"ERROR":console.error("[WorkerProxy] Worker error:",o.message);break;case"EXPORT_READY":this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=o.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:o.frameIndex,progress:o.progress,measuredDistance:o.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null),this._exportComplete&&this._exportComplete(o.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null),console.error("[WorkerProxy] Export error:",o.message),this._exportError&&this._exportError(o.message);break;case"BUCKET_STATUS":this._isBucketRendering=o.isRendering,w.emit($.BUCKET_STATUS,{isRendering:o.isRendering,progress:o.progress,totalBuckets:o.totalBuckets,currentBucket:o.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(o);break}}post(o,t){this._worker&&(t?this._worker.postMessage(o,t):this._worker.postMessage(o))}_pendingRequest(o,t,a,i){const r=crypto.randomUUID();return new Promise(n=>{o.set(r,n),this.post(t(r)),this._pendingTimeouts.set(r,setTimeout(()=>{this._pendingTimeouts.delete(r),o.has(r)&&(o.delete(r),n(a))},i))})}_resolveRequest(o,t,a){const i=t.get(o);i&&(i(a),t.delete(o));const r=this._pendingTimeouts.get(o);r&&(clearTimeout(r),this._pendingTimeouts.delete(o))}_clearAllTimers(){this._pendingTimeouts.forEach(o=>clearTimeout(o)),this._pendingTimeouts.clear(),this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null),this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null)}set onCrash(o){this._onCrash=o}set onBooted(o){this._onBootedCallback=o}_handleWorkerCrash(o){console.error(`[WorkerProxy] Worker crashed: ${o}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._clearAllTimers(),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._pendingShaderSource.forEach(t=>t(null)),this._pendingShaderSource.clear(),this._exportReady&&(this._exportReady=null),this._exportComplete&&(this._exportComplete=null),this._exportFrameDone&&(this._exportFrameDone=null),this._exportError&&(this._exportError=null),this._onCrash&&this._onCrash(o)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get convergenceValue(){return this._shadow.convergenceValue}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(o){this._shadow.lastMeasuredDistance=o}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(o){o&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(o){this.post({type:"PAUSE",paused:o})}get shouldSnapCamera(){return!1}set shouldSnapCamera(o){o&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(o){this._isGizmoInteracting=o}get isCameraInteracting(){return!1}set isCameraInteracting(o){o&&this.post({type:"MARK_INTERACTION"})}get bootSent(){return this._bootSent}bootWithConfig(o,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(o,t),this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0}setUniform(o,t,a=!1){this.post({type:"UNIFORM",key:o,value:t,noReset:a})}setPreviewSampleCap(o){this.post({type:"SET_SAMPLE_CAP",n:o})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(o,t){if(t){const a=t.indexOf(";base64,"),i=a>=0?t.substring(a+8,a+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||i.startsWith("Iz8")||i.startsWith("Iz9")?fetch(t).then(n=>n.arrayBuffer()).then(n=>{this.post({type:"TEXTURE_HDR",textureType:o,buffer:n},[n])}).catch(n=>console.error("[WorkerProxy] HDR texture transfer failed:",n)):fetch(t).then(n=>n.blob()).then(n=>createImageBitmap(n,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(n=>{this.post({type:"TEXTURE",textureType:o,bitmap:n},[n])}).catch(n=>console.error("[WorkerProxy] Texture transfer failed:",n))}else this.post({type:"TEXTURE",textureType:o,bitmap:null})}queueOffsetSync(o){this._pendingOffsetSync={x:o.x,y:o.y,z:o.z,xL:o.xL,yL:o.yL,zL:o.zL},this.setShadowOffset(o)}setShadowOffset(o){this._localOffset={...o},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(o,t,a){}resolveLightPosition(o,t){return o}measureDistanceAtScreenPoint(o,t,a,i){return this._shadow.lastMeasuredDistance}pickWorldPosition(o,t,a,i){return a?this._pendingRequest(this._pendingPicks,r=>({type:"PICK_WORLD_POSITION",id:r,x:o,y:t,fast:i||void 0}),null,5e3):null}startFocusPick(o,t){return this._pendingRequest(this._pendingFocusPicks,a=>({type:"FOCUS_PICK_START",id:a,x:o,y:t}),-1,5e3)}sampleFocusPick(o,t){return this._pendingRequest(this._pendingFocusPicks,a=>({type:"FOCUS_PICK_SAMPLE",id:a,x:o,y:t}),-1,2e3)}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){return this._pendingRequest(this._pendingSnapshots,o=>({type:"CAPTURE_SNAPSHOT",id:o}),null,1e4)}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(o){return this._pendingRequest(this._pendingHistograms,t=>({type:"HISTOGRAM_READBACK",id:t,source:o}),new Float32Array(0),5e3)}getCompiledFragmentShader(){return this._pendingRequest(this._pendingShaderSource,o=>({type:"GET_SHADER_SOURCE",id:o,variant:"compiled"}),null,5e3)}getTranslatedFragmentShader(){return this._pendingRequest(this._pendingShaderSource,o=>({type:"GET_SHADER_SOURCE",id:o,variant:"translated"}),null,5e3)}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(o,t,a,i){if(this._pendingOffsetSync){const r=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:o,offset:r,delta:a,timestamp:performance.now(),renderState:i,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:o,offset:t,delta:a,timestamp:performance.now(),renderState:i})}resizeWorker(o,t,a){this.post({type:"RESIZE",width:o,height:t,dpr:a})}sendConfig(o){this.post({type:"CONFIG",config:o})}registerFormula(o,t){this.post({type:"REGISTER_FORMULA",id:o,shader:t})}startExport(o,t,a){return this._isExporting=!0,new Promise((i,r)=>{this._exportReady=()=>{this._exportReady=null,i()},this._exportError=s=>{this._exportError=null,r(new Error(s))};let n=null;if(t){const s=t;n=new WritableStream({write(c){return s.write(c)},close(){return s.close()},abort(c){return s.abort(c)}})}const l=[];n&&l.push(n),this.post({type:"EXPORT_START",config:o,stream:n,dirHandle:a},l),this._exportStartTimer=setTimeout(()=>{this._exportStartTimer=null,this._exportReady&&(this._exportReady=null,r(new Error("Export start timed out")))},1e4)})}renderExportFrame(o,t,a,i,r,n){return new Promise(l=>{this._exportFrameDone=s=>{this._exportFrameDone=null,l(s)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:o,time:t,camera:a,offset:i,renderState:r,modulations:n})})}finishExport(){return new Promise((o,t)=>{this._exportComplete=a=>{this._exportComplete=null,o(a)},this._exportError=a=>{this._exportError=null,t(new Error(a))},this.post({type:"EXPORT_FINISH"}),this._exportFinishTimer=setTimeout(()=>{this._exportFinishTimer=null,this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(o,t,a){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:o,config:t,exportData:a?{preset:JSON.stringify(a.preset),name:a.name,version:a.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}setPreviewRegion(o,t,a,i){this.post({type:"PREVIEW_REGION_SET",region:o,outputWidth:t,outputHeight:a,sampleCap:i})}clearPreviewRegion(){this.post({type:"PREVIEW_REGION_CLEAR"})}async _handleBucketImage(o){const{pixels:t,width:a,height:i,presetJson:r,filename:n}=o,l=document.createElement("canvas");l.width=a,l.height=i;const s=l.getContext("2d");if(!s)return;const c=new ImageData(new Uint8ClampedArray(t.buffer),a,i);s.putImageData(c,0,0),l.toBlob(async d=>{if(d)try{const h=await zo(d,"FractalData",r),p=URL.createObjectURL(h),f=document.createElement("a");f.download=n,f.href=p,f.click(),URL.revokeObjectURL(p)}catch(h){console.error("Failed to inject metadata",h);const p=document.createElement("a");p.download=n,p.href=l.toDataURL("image/png"),p.click()}},"image/png")}}let Xe=null;function ve(){return Xe||(Xe=new Ao),Xe}class Do{constructor(){S(this,"definitions",new Map)}register(o){this.definitions.set(o.id,o)}registerAlias(o,t){const a=this.definitions.get(t);a?this.definitions.set(o,a):console.warn(`FractalRegistry: Cannot register alias '${o}' for unknown target '${t}'`)}get(o){return this.definitions.get(o)}getAll(){return Array.from(new Set(this.definitions.values()))}getIds(){return Array.from(this.definitions.keys())}}const Y=new Do;class z{constructor(o={x:0,y:0,z:0,xL:0,yL:0,zL:0}){S(this,"offset");S(this,"_rotMatrix",new vo);S(this,"_camRight",new E);S(this,"_camUp",new E);S(this,"_camForward",new E);S(this,"_visualVector",new E);S(this,"_quatInverse",new be);S(this,"_relativePos",new E);S(this,"smoothedPos",new E);S(this,"smoothedQuat",new be);S(this,"smoothedFov",60);S(this,"prevOffsetState");S(this,"isLocked",!1);S(this,"isFirstFrame",!0);this.offset={...o},this.prevOffsetState={...o}}get state(){return{...this.offset}}set state(o){this.offset={...o},z.normalize(this.offset)}static split(o){const t=Math.fround(o),a=o-t;return{high:t,low:a}}static normalize(o){if(Math.abs(o.xL)>.5){const a=Math.floor(o.xL+.5);o.x+=a,o.xL-=a}if(Math.abs(o.yL)>.5){const a=Math.floor(o.yL+.5);o.y+=a,o.yL-=a}if(Math.abs(o.zL)>.5){const a=Math.floor(o.zL+.5);o.z+=a,o.zL-=a}}setFromUnified(o,t,a){const i=z.split(o),r=z.split(t),n=z.split(a);this.offset.x=i.high,this.offset.xL=i.low,this.offset.y=r.high,this.offset.yL=r.low,this.offset.z=n.high,this.offset.zL=n.low,z.normalize(this.offset)}move(o,t,a){this.offset.xL+=o,this.offset.yL+=t,this.offset.zL+=a,z.normalize(this.offset)}absorbCamera(o){this.offset.xL+=o.x,this.offset.yL+=o.y,this.offset.zL+=o.z,z.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(o,t,a,i,r){if(!r&&!i&&!this.isFirstFrame){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||i){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const n=this.offset,l=this.prevOffsetState;if(l.x!==n.x||l.y!==n.y||l.z!==n.z||l.xL!==n.xL||l.yL!==n.yL||l.zL!==n.zL){const c=l.x-n.x+(l.xL-n.xL),d=l.y-n.y+(l.yL-n.yL),h=l.z-n.z+(l.zL-n.zL);if(Math.abs(c)>10||Math.abs(d)>10||Math.abs(h)>10){this.resetSmoothing(),this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion);return}this.smoothedPos.x+=c,this.smoothedPos.y+=d,this.smoothedPos.z+=h,this.prevOffsetState={...n}}const s=this.smoothedPos.distanceToSquared(o.position);if(this.isLocked?s>1e-18&&(this.isLocked=!1):s<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(o.position);else{const c=1-Math.exp(-40*a);this.smoothedPos.lerp(o.position,c)}this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t}getUnifiedCameraState(o,t){const a={...this.offset};return a.xL+=o.position.x,a.yL+=o.position.y,a.zL+=o.position.z,z.normalize(a),{position:{x:0,y:0,z:0},rotation:{x:o.quaternion.x,y:o.quaternion.y,z:o.quaternion.z,w:o.quaternion.w},sceneOffset:a,targetDistance:t>0?t:3.5}}applyCameraState(o,t){if(t.sceneOffset){const c={...t.sceneOffset};c.xL+=t.position.x,c.yL+=t.position.y,c.zL+=t.position.z,this.state=c}const a=t.rotation,i=a.x??a._x??0,r=a.y??a._y??0,n=a.z??a._z??0,l=a.w??a._w??1;o.position.set(0,0,0),o.quaternion.set(i,r,n,l).normalize();const s=new E(0,1,0).applyQuaternion(o.quaternion);o.up.copy(s),o.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(o.quaternion)}updateShaderUniforms(o,t,a){const i=this.offset.x+this.offset.xL+o.x,r=this.offset.y+this.offset.yL+o.y,n=this.offset.z+this.offset.zL+o.z,l=Math.fround(i),s=Math.fround(r),c=Math.fround(n);t.set(l,s,c),a.set(i-l,r-s,n-c)}getLightShaderVector(o,t,a,i){const r=this.offset;t?(this._relativePos.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),i.copy(this._relativePos)):i.set(o.x-(r.x+r.xL)-a.position.x,o.y-(r.y+r.yL)-a.position.y,o.z-(r.z+r.zL)-a.position.z)}resolveRealWorldPosition(o,t,a){const i=this.offset;return t?(this._visualVector.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),{x:a.position.x+this._visualVector.x+(i.x+i.xL),y:a.position.y+this._visualVector.y+(i.y+i.yL),z:a.position.z+this._visualVector.z+(i.z+i.zL)}):(this._visualVector.set(o.x-(i.x+i.xL)-a.position.x,o.y-(i.y+i.yL)-a.position.y,o.z-(i.z+i.zL)-a.position.z),this._quatInverse.copy(a.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(o,t,a){const i=new E(0,0,-1).applyEuler(new Re(o.x,o.y,o.z,"YXZ"));t?i.applyQuaternion(a.quaternion):i.applyQuaternion(a.quaternion.clone().invert());const r=new be().setFromUnitVectors(new E(0,0,-1),i),n=new Re().setFromQuaternion(r,"YXZ");return{x:n.x,y:n.y,z:n.z}}}let $e=null,Ht=null,se=null,te=null,$t=!1;function br(e){$e=e}function vr(e){Ht=e}function we(){return $e}function xr(){return Ht}function Sr(e){const o=K.getState().optics,t=o?o.camType>.5&&o.camType<1.5:!1;if($t=t,t){const a=o.orthoScale??2,r=e.aspect||1,n=a/2,l=n*r;te?(te.left=-l,te.right=l,te.top=n,te.bottom=-n):te=new xo(-l,l,n,-n,.001,1e4),te.position.copy(e.position),te.quaternion.copy(e.quaternion),te.updateProjectionMatrix(),te.updateMatrixWorld()}else{se||(se=new So),se.position.copy(e.position),se.quaternion.copy(e.quaternion);const a=e;a.fov!==void 0&&(se.fov=a.fov,se.aspect=a.aspect,se.updateProjectionMatrix()),se.updateMatrixWorld()}}function _r(){return $t?te||$e:se||$e}let Bt=!1;function wr(e){Bt=e}function Ir(){return Bt}const Le=ve(),ye={getUnifiedPosition:(e,o)=>new E(o.x+o.xL+e.x,o.y+o.yL+e.y,o.z+o.zL+e.z),getUnifiedFromEngine:()=>{const e=we()||Le.activeCamera;return e?ye.getUnifiedPosition(e.position,Le.sceneOffset):new E},getRotationFromEngine:()=>{const e=we()||Le.activeCamera;return e?e.quaternion.clone():new be},getDistanceFromEngine:()=>{const e=we()||Le.activeCamera;if(e){const o=e.position.length();if(o>.001)return o}return null},getRotationDegrees:e=>{const o=new be(e.x,e.y,e.z,e.w),t=new Re().setFromQuaternion(o);return new E(_e.radToDeg(t.x),_e.radToDeg(t.y),_e.radToDeg(t.z))},teleportPosition:(e,o,t)=>{const a=z.split(e.x),i=z.split(e.y),r=z.split(e.z),n={position:{x:0,y:0,z:0},sceneOffset:{x:a.high,y:i.high,z:r.high,xL:a.low,yL:i.low,zL:r.low}};if(o)n.rotation=o;else{const l=we()||Le.activeCamera;if(l){const s=l.quaternion;n.rotation={x:s.x,y:s.y,z:s.z,w:s.w}}}t!==void 0&&(n.targetDistance=t),w.emit($.CAMERA_TELEPORT,n)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const o=new Re(_e.degToRad(e.x),_e.degToRad(e.y),_e.degToRad(e.z)),t=new be().setFromEuler(o),a=ye.getUnifiedFromEngine(),i=z.split(a.x),r=z.split(a.y),n=z.split(a.z);w.emit($.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:i.high,y:r.high,z:n.high,xL:i.low,yL:r.low,zL:n.low}})}},Fo="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let oe=(e=21)=>{let o="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)o+=Fo[t[e]&63];return o};const O=ve(),ht=e=>typeof e.setOptics=="function"?e.setOptics:null,Oo=(e,o)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const a={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};O.virtualSpace?(O.virtualSpace.state=a,e({sceneOffset:O.virtualSpace.state}),w.emit("offset_set",O.virtualSpace.state)):(e({sceneOffset:a}),w.emit("offset_set",a))},updateCamera:(t,a)=>{e(i=>({savedCameras:i.savedCameras.map(r=>r.id===t?{...r,...a}:r)}))},deleteCamera:t=>{e(a=>({savedCameras:a.savedCameras.filter(i=>i.id!==t),activeCameraId:a.activeCameraId===t?null:a.activeCameraId}))},reorderCameras:(t,a)=>{e(i=>{const r=[...i.savedCameras],[n]=r.splice(t,1);return r.splice(a,0,n),{savedCameras:r}})},addCamera:t=>{const a=o(),i=ye.getUnifiedFromEngine(),r=ye.getRotationFromEngine(),n=O.lastMeasuredDistance>0&&O.lastMeasuredDistance<1e3?O.lastMeasuredDistance:a.targetDistance,l=z.split(i.x),s=z.split(i.y),c=z.split(i.z),d={position:{x:0,y:0,z:0},rotation:{x:r.x,y:r.y,z:r.z,w:r.w},sceneOffset:{x:l.high,y:s.high,z:c.high,xL:l.low,yL:s.low,zL:c.low},targetDistance:n},h={...a.optics},p=t||`Camera ${a.savedCameras.length+1}`,f={id:oe(),label:p,position:d.position,rotation:d.rotation,sceneOffset:d.sceneOffset,targetDistance:d.targetDistance,optics:h};e(m=>({savedCameras:[...m.savedCameras,f],activeCameraId:f.id}))},saveToSlot:t=>{const a=o(),i=a.savedCameras[t],r=ye.getUnifiedFromEngine(),n=ye.getRotationFromEngine(),l=O.lastMeasuredDistance>0&&O.lastMeasuredDistance<1e3?O.lastMeasuredDistance:a.targetDistance,s=z.split(r.x),c=z.split(r.y),d=z.split(r.z),h={position:{x:0,y:0,z:0},rotation:{x:n.x,y:n.y,z:n.z,w:n.w},sceneOffset:{x:s.high,y:c.high,z:d.high,xL:s.low,yL:c.low,zL:d.low},targetDistance:l},p={...a.optics};if(i)e(f=>({savedCameras:f.savedCameras.map((m,b)=>b===t?{...m,...h,optics:p}:m),activeCameraId:i.id})),w.emit($.CAMERA_SLOT_SAVED,{slot:t+1,label:i.label});else{const f=`Camera ${t+1}`,m={id:oe(),label:f,position:h.position,rotation:h.rotation,sceneOffset:h.sceneOffset,targetDistance:h.targetDistance,optics:p};e(b=>({savedCameras:[...b.savedCameras,m],activeCameraId:m.id})),w.emit($.CAMERA_SLOT_SAVED,{slot:t+1,label:f})}},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const a=o().savedCameras.find(i=>i.id===t);if(a){if(w.emit("camera_transition",a),e({activeCameraId:t,cameraRot:a.rotation,sceneOffset:a.sceneOffset,targetDistance:a.targetDistance||3.5}),a.optics){const i=ht(o());i&&i(a.optics)}O.resetAccumulation()}},duplicateCamera:t=>{const a=o(),i=a.savedCameras.find(s=>s.id===t);if(!i)return;const r={...JSON.parse(JSON.stringify(i)),id:oe(),label:i.label+" (copy)"},n=a.savedCameras.indexOf(i),l=[...a.savedCameras];if(l.splice(n+1,0,r),e({savedCameras:l,activeCameraId:r.id}),w.emit("camera_teleport",r),e({cameraRot:r.rotation,sceneOffset:r.sceneOffset,targetDistance:r.targetDistance||3.5}),r.optics){const s=ht(o());s&&s(r.optics)}O.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=o().formula,a=Y.get(t),i=a==null?void 0:a.defaultPreset,r=(i==null?void 0:i.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},n=(i==null?void 0:i.cameraPos)||{x:0,y:0,z:3.5},l=(i==null?void 0:i.cameraRot)||{x:0,y:0,z:0,w:1},s=(i==null?void 0:i.targetDistance)||3.5,c=r.x+r.xL+n.x,d=r.y+r.yL+n.y,h=r.z+r.zL+n.z,p=z.split(c),f=z.split(d),m=z.split(h),b={x:p.high,y:f.high,z:m.high,xL:p.low,yL:f.low,zL:m.low};o().setSceneOffset(b),e({cameraRot:l,targetDistance:s});const y={position:{x:0,y:0,z:0},rotation:l,sceneOffset:b,targetDistance:s};w.emit("reset_accum",void 0),w.emit("camera_teleport",y)},undoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(t.length===0)return;const i=t[t.length-1];let r;if(O.activeCamera&&O.virtualSpace)r=O.virtualSpace.getUnifiedCameraState(O.activeCamera,o().targetDistance),O.virtualSpace.applyCameraState(O.activeCamera,i);else{const n=o();r={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,redoStack:[...a,r],undoStack:t.slice(0,-1)}),w.emit("reset_accum",void 0),w.emit("camera_teleport",i)},redoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(a.length===0)return;const i=a[a.length-1];let r;if(O.activeCamera&&O.virtualSpace)r=O.virtualSpace.getUnifiedCameraState(O.activeCamera,o().targetDistance),O.virtualSpace.applyCameraState(O.activeCamera,i);else{const n=o();r={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}i.sceneOffset&&e({sceneOffset:i.sceneOffset}),e({cameraRot:i.rotation,targetDistance:i.targetDistance||3.5,undoStack:[...t,r],redoStack:a.slice(0,-1)}),w.emit("reset_accum",void 0),w.emit("camera_teleport",i)}});class No{constructor(){S(this,"features",new Map);S(this,"sortedCache",null)}register(o){if(o.dependsOn)for(const t of o.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${o.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(o.id,o),this.sortedCache=null}get(o){return this.features.get(o)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(o=>o.tabConfig).map(o=>({id:o.id,...o.tabConfig})).sort((o,t)=>o.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(o=>o.viewportConfig).map(o=>({id:o.id,...o.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(o=>o.menuConfig).map(o=>({id:o.id,...o.menuConfig}))}getExtraMenuItems(){const o=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(a=>o.push({...a,featureId:t.id}))}),o}getEngineFeatures(){return Array.from(this.features.values()).filter(o=>!!o.engineConfig)}getDictionary(){const o={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const a=t.shortId||t.id,i={};Object.entries(t.params).forEach(([r,n])=>{n.shortId&&(i[r]=n.shortId)}),o.features.children[t.id]={_alias:a,children:i}}),o}getUniformDefinitions(){const o=[];return this.features.forEach(t=>{Object.values(t.params).forEach(a=>{if(a.uniform){let i=a.type,r=a.default;i==="color"&&(i="vec3"),i==="boolean"&&(i="float",r=r?1:0),(i==="image"||i==="gradient")&&(i="sampler2D",r=null),o.push({name:a.uniform,type:i,default:r})}}),t.extraUniforms&&o.push(...t.extraUniforms)}),o}topologicalSort(){const o=Array.from(this.features.values()),t=new Map;o.forEach((l,s)=>t.set(l.id,s));const a=new Map,i=new Map;for(const l of o)a.set(l.id,0),i.has(l.id)||i.set(l.id,[]);for(const l of o)if(l.dependsOn)for(const s of l.dependsOn)this.features.has(s)&&(a.set(l.id,(a.get(l.id)||0)+1),i.get(s).push(l.id));const r=[];for(const l of o)a.get(l.id)===0&&r.push(l.id);const n=[];for(;r.length>0;){r.sort((s,c)=>(t.get(s)||0)-(t.get(c)||0));const l=r.shift();n.push(this.features.get(l));for(const s of i.get(l)||[]){const c=(a.get(s)||1)-1;a.set(s,c),c===0&&r.push(s)}}if(n.length!==o.length){const l=o.filter(s=>!n.includes(s)).map(s=>s.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${l.join(", ")}`),o}return n}}const R=new No,Cr=(e,o)=>{const t={};e.forEach(n=>t[n.id]=[]),o.forEach(n=>{t[n.source]&&t[n.source].push(n.target)});const a=new Set,i=new Set,r=n=>{if(!a.has(n)){a.add(n),i.add(n);const l=t[n]||[];for(const s of l)if(!a.has(s)&&r(s)||i.has(s))return!0}return i.delete(n),!1};for(const n of e)if(r(n.id))return!0;return!1},mt=(e,o)=>{const t={},a={};e.forEach(n=>{t[n.id]=[],a[n.id]=0}),o.forEach(n=>{t[n.source]&&(t[n.source].push(n.target),a[n.target]=(a[n.target]||0)+1)});const i=[];e.forEach(n=>{a[n.id]===0&&i.push(n.id)});const r=[];for(;i.length>0;){i.sort();const n=i.shift(),l=e.find(s=>s.id===n);if(l){const{position:s,...c}=l;r.push(c)}if(t[n])for(const s of t[n])a[s]--,a[s]===0&&i.push(s)}return r},gt=e=>{const o=e.map((a,i)=>({...a,position:{x:250,y:150+i*200}})),t=[];if(o.length>0){t.push({id:`e-root-start-${o[0].id}`,source:"root-start",target:o[0].id});for(let a=0;a<o.length-1;a++)t.push({id:`e-${o[a].id}-${o[a+1].id}`,source:o[a].id,target:o[a+1].id});t.push({id:`e-${o[o.length-1].id}-root-end`,source:o[o.length-1].id,target:"root-end"})}return{nodes:o,edges:t}},Vt=(e,o)=>{var t,a;if(e.length!==o.length)return!1;for(let i=0;i<e.length;i++){const r=e[i],n=o[i];if(r.id!==n.id||r.type!==n.type||r.enabled!==n.enabled||JSON.stringify(r.bindings??{})!==JSON.stringify(n.bindings??{}))return!1;const l=((t=r.condition)==null?void 0:t.active)??!1,s=((a=n.condition)==null?void 0:a.active)??!1;if(l!==s)return!1}return!0},jo=(e,o)=>e.length!==o.length?!1:JSON.stringify(e)===JSON.stringify(o),Ho=ve(),$o=e=>{const o={formula:e.formula,pipeline:e.pipeline,graph:JSON.parse(JSON.stringify(e.graph)),renderRegion:e.renderRegion?{...e.renderRegion}:null};return R.getAll().forEach(a=>{const i=e[a.id];i&&(o[a.id]=JSON.parse(JSON.stringify(i)))}),o},yt=(e,o)=>{const t={};return e.forEach(a=>{t[a]=o[a]}),t},bt=(e,o,t)=>{const a=t(),i=e.pipeline?t().pipeline:void 0;o(e);let r=!1;Object.keys(e).forEach(n=>{const l=n,s=e[l];if(l==="formula"){w.emit("config",{formula:s});return}if(l==="pipeline"&&!r){const d=s,h=t();if(i&&!Vt(i,d)){const f=h.pipelineRevision+1;o({pipelineRevision:f}),w.emit("config",{pipeline:d,graph:h.graph,pipelineRevision:f})}else w.emit("config",{pipeline:d});r=!0;return}if(l==="graph")return;const c="set"+l.charAt(0).toUpperCase()+l.slice(1);typeof a[c]=="function"&&a[c](s)}),Ho.resetAccumulation()},Bo=1500;let vt=0;const Vo=(e,o)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const i=t,r=Date.now();r-vt<Bo&&o().undoStack.length>0||(e(l=>{const s=[...l.undoStack,i];return{undoStack:s.length>50?s.slice(-50):s,redoStack:[]}}),vt=r);return}const a=$o(o());e({interactionSnapshot:a})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:a,aaLevel:i,msaaSamples:r,dpr:n}=o();let l=a==="Auto"||a==="Always"?i:1;if(Math.abs(n-l)>1e-4&&(e({dpr:l}),w.emit("config",{msaaSamples:a==="Auto"||a==="Always"?r:1}),w.emit("reset_accum",void 0)),!t)return;const s=o(),c={};let d=!1;Object.keys(t).forEach(h=>{const p=h,f=t[p],m=s[p];JSON.stringify(f)!==JSON.stringify(m)&&(c[p]=f,d=!0)}),e(d?h=>{const p=[...h.paramUndoStack,c];return{paramUndoStack:p.length>50?p.slice(-50):p,paramRedoStack:[],interactionSnapshot:null}}:{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(t.length===0)return;const i=t[t.length-1],r=t.slice(0,-1),n=yt(Object.keys(i),o());bt(i,e,o),e({paramUndoStack:r,paramRedoStack:[...a,n]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(a.length===0)return;const i=a[a.length-1],r=a.slice(0,-1),n=yt(Object.keys(i),o());bt(i,e,o),e({paramUndoStack:[...t,n],paramRedoStack:r})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),xt=[{id:"note-1",type:"Note",enabled:!0,params:{},text:`Infinite Repetition
The 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals.`},{id:"mod-1",type:"Mod",enabled:!0,params:{x:4,y:4,z:0}},{id:"note-2",type:"Note",enabled:!0,params:{},text:`Dynamic Rotation
This rotation is bound to 'ParamC' (Slider below). Try dragging it!`},{id:"rot-1",type:"Rotate",enabled:!0,params:{x:0,y:0,z:0},bindings:{z:"ParamC"}},{id:"bulb-1",type:"Mandelbulb",enabled:!0,params:{power:8}},{id:"add-c",type:"AddConstant",enabled:!0,params:{scale:1}}],Go=(e,o)=>({pipeline:xt,pipelineRevision:1,graph:gt(xt),setGraph:t=>{const a=mt(t.nodes,t.edges),i=o(),r=!Vt(i.pipeline,a),n=r||!jo(i.pipeline,a);if(r&&i.autoCompile){const l=i.pipelineRevision+1;e({graph:t,pipeline:a,pipelineRevision:l}),w.emit($.CONFIG,{pipeline:a,graph:t,pipelineRevision:l})}else r?e({graph:t}):n?(e({graph:t,pipeline:a}),w.emit($.CONFIG,{pipeline:a})):e({graph:t})},setPipeline:t=>{const a=o().pipelineRevision+1,i=gt(t);e({pipeline:t,graph:i,pipelineRevision:a}),w.emit($.CONFIG,{pipeline:t,graph:i,pipelineRevision:a})},refreshPipeline:()=>{const t=o(),a=mt(t.graph.nodes,t.graph.edges),i=t.pipelineRevision+1;e({pipeline:a,pipelineRevision:i}),w.emit($.CONFIG,{pipeline:a,graph:t.graph,pipelineRevision:i})}}),St=`
    if (uGlowIntensity > 0.0001) {
        float dist = max(h.x, 0.0);
        // Aura mode: glow peaks AWAY from surface (tightness < 1)
        float k = max(uGlowSharpness, 0.01);
        float aura = dist * k * 2.718 * exp(-k * dist);
        // Standard mode: glow hugs the surface (tightness >= 1)
        float standard = exp(-uGlowSharpness * dist);
        // Blend between aura and standard in the 0.75-1.0 range
        float blend = smoothstep(0.75, 1.0, uGlowSharpness);
        float gFactor = mix(aura, standard, blend);
        gFactor *= uFudgeFactor * 0.4;
        
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
`,qo=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,Uo=`
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
`,Wo=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,Xo={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new G(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:.1,max:1e3,step:.1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new G(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,o,t)=>{if(t!=="Main")return;e.addPostProcessLogic(Uo),e.addPostProcessLogic(Wo);const a=o.atmosphere;a&&a.glowEnabled&&(a.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(St,qo)):e.addVolumeTracing(St,""))}},Yo=`
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
`,Ko={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new J(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:Yo,mainUV:`
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
        `}},Zo={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
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
        `}},Jo=`
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
`,Qo=`
    roughness = clamp(uRoughness, 0.02, 1.0);
    vec3 emitSource = albedo; 
    if (abs(uEmissionMode - 1.0) < 0.1) emitSource = col1;
    else if (abs(uEmissionMode - 2.0) < 0.1) emitSource = col2;
    else if (abs(uEmissionMode - 3.0) < 0.1) {
        float n01 = noiseVal * 0.5 + 0.5;
        emitSource = uLayer3Color * n01;
    }
    else if (abs(uEmissionMode - 4.0) < 0.1) emitSource = uEmissionColor; 
    emission = emitSource * uEmission;
`,ea=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,ta={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},rimColor:{type:"color",default:new G(.5,.7,1),label:"Rim Color",shortId:"rc",uniform:"uRimColor",group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:wo,minFilter:_o,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new G(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:(e,o,t)=>{t!=="Mesh"&&(e.addHeader(ea),e.addMaterialLogic(Qo),e.addFunction(Jo))}},oa={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
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
        `}},aa={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:ct,wrapT:ct,minFilter:lt,magFilter:lt},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new J(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new J(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},Gt=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = logTrap(result.y);"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
            // Standard Iterations
            v = result.z;
            
            // HYBRID FIX: For SDF fractals (Menger, Amazing Box) that don't "escape",
            // the iteration count is constant (1.0). This looks flat.
            // If we hit max iterations (approx 1.0), mix in Orbit Trap (y) to provide texture.
            if (v > 0.99) {
                float trap = logTrap(result.y);
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
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = logTrap(g_orbitTrap.x);"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = logTrap(g_orbitTrap.y);"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = logTrap(g_orbitTrap.z);"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = logTrap(g_orbitTrap.w);"}],ia=()=>{let e=`
    // Legacy scale factor (-0.2) kept for save file / preset compatibility.
    // Arbitrary but baked into existing uColorScale values.
    float logTrap(float t) { return log(max(1.0e-5, t)) * -0.2; }

    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return Gt.forEach(o=>{e+=`
        case ${Math.round(o.value)}: { // ${o.label}
            ${o.glsl}
        } break;`}),e+=`
        default: // Fallback
            v = result.z;
            break;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `,e},_t=Gt.map(e=>({label:e.label,value:e.value})),ra={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:_t},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:_t},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new G(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,o,t)=>{const a=o.coloring;(a==null?void 0:a.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(ia()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},na={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},sa={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},la={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},ca={id:"decoupled",label:"Decoupled",glsl:`
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
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new E(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},da={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new E(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},ua={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},fa={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},pa={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
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
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},ha={id:"menger",label:"Menger (Cubic)",glsl:`
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
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new E(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},Be=[na,sa,la,ca,da,ua,fa,pa,ha],ma=Be.map((e,o)=>({label:e.label,value:o}));function ga(e){return Be[e]??Be[0]}const ya=`
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
`,ba=["xyz","xzy","yxz","yzx","zxy","zyx"];function va(e){const o=ba[e]??"xyz";return o==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${o};`}function xa(e,o,t=!1){return`
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
    ${o==="wrap"?"if (hybridHasRot) z3 = hybridRotMat * z3;":""}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${o==="wrap"?"if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;":""}

    ${t?"// selfContained fold — scaling + DR handled inside foldOperation":`
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${o==="post"?"if (hybridHasRot) { z3 = hybridRotMat * z3; }":""}

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
`}function Sa(){const e={};return Be.forEach((o,t)=>{o.extraParams&&Object.entries(o.extraParams).forEach(([a,i])=>{e[a]={...i,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const _a={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:ma.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new E(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new E(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new E(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...Sa(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new E(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new E(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new E(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new E(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,o)=>{var d;const t=o.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const i=t?t.preRotMaster!==!1:!0;e.setRotation(i),e.addPreamble(ya);const r=(t==null?void 0:t.hybridCompiled)??!1;if(!r)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const h=(t==null?void 0:t.hybridFoldType)??0,p=ga(h);e.addFunction(p.glsl);const f=(t==null?void 0:t.hybridPermute)??0,m=va(f);e.addFunction(xa(m,p.rotMode??"wrap",p.selfContained??!1))}let n="",l="";const s=o.formula,c=((d=Y.get(s))==null?void 0:d.shader.selfContainedSDE)??!1;if(c||(l+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),r&&!c)if(!(t&&t.hybridComplex))n+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const p=(t==null?void 0:t.hybridSwap)??!1;n+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,l+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${p?"1":"0"}) {
                        int rel_i = i - ${p?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybridFold("",n,l)}},wt=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF"],It=["uVec2A","uVec2B","uVec2C"],Ct=["uVec3A","uVec3B","uVec3C"],Mt=["uVec4A","uVec4B","uVec4C"],qt=["uInterlaceParamA","uInterlaceParamB","uInterlaceParamC","uInterlaceParamD","uInterlaceParamE","uInterlaceParamF"],Ut=["uInterlaceVec2A","uInterlaceVec2B","uInterlaceVec2C"],Wt=["uInterlaceVec3A","uInterlaceVec3B","uInterlaceVec3C"],Xt=["uInterlaceVec4A","uInterlaceVec4B","uInterlaceVec4C"];function wa(){const e=[];for(let o=0;o<wt.length;o++)e.push([new RegExp(`\\b${wt[o]}\\b`,"g"),qt[o]]);for(let o=0;o<It.length;o++)e.push([new RegExp(`\\b${It[o]}\\b`,"g"),Ut[o]]);for(let o=0;o<Ct.length;o++)e.push([new RegExp(`\\b${Ct[o]}\\b`,"g"),Wt[o]]);for(let o=0;o<Mt.length;o++)e.push([new RegExp(`\\b${Mt[o]}\\b`,"g"),Xt[o]]);return e}const Ia=wa();function nt(e){let o=e;for(const[t,a]of Ia)o=o.replace(t,a);return o}function Ge(e,o){const t=[...o].sort((i,r)=>r.length-i.length);let a=e;for(const i of t)a=a.replace(new RegExp(`\\b${i}\\b`,"g"),`interlace_${i}`);return a}function Ne(e){const o=[],t=/\b(?:void|vec[234]|float|int|mat[234]|bool)\s+(\w+)\s*\(/g,a=/^\s*(?:const\s+)?(?:vec[234]|float|int|mat[234]|bool)\s+([^;]+);/,i=/^\s*(\w+)/;let r=0;for(const n of e.split(`
`)){if(r===0){t.lastIndex=0;let l;for(;(l=t.exec(n))!==null;){const c=l[1];!c.startsWith("formula_")&&!o.includes(c)&&o.push(c)}const s=a.exec(n);if(s){const c=[];let d=0,h="";for(const p of s[1]){if(p==="(")d++;else if(p===")")d--;else if(p===","&&d===0){c.push(h),h="";continue}h+=p}h&&c.push(h);for(const p of c){const f=i.exec(p);f&&!o.includes(f[1])&&o.push(f[1])}}}for(const l of n)l==="{"?r++:l==="}"&&r--}return o}function Ca(e,o,t){let a=e;a=a.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),r=>`interlace_${r}`);const i=Ne(e);for(const r of i)a=a.replace(new RegExp(`\\b${r}\\b`,"g"),`interlace_${r}`);return t&&t.length>0&&(a=Ge(a,t)),a=nt(a),a}function Ma(e,o,t,a){let i=e;if(i=i.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace"),i=nt(i),t&&t.length>0&&(i=Ge(i,t)),a&&a.length>0)for(const r of a)i=i.replace(new RegExp(`\\b${r}\\b`,"g"),`interlace_${r}`);return i}function Ra(e,o,t){let a=e.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace");return t&&t.length>0&&(a=Ge(a,t)),a}function Ea(e,o,t,a){let i=e;if(i=i.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),r=>`interlace_${r}`),i=nt(i),t&&t.length>0&&(i=Ge(i,t)),a&&a.length>0)for(const r of a)i=i.replace(new RegExp(`\\b${r}\\b`,"g"),`interlace_${r}`);return i}function La(e,o,t){let a="";o&&(a=`
    vec3 _il_savedAxis = gmt_rotAxis;
    float _il_savedCos = gmt_rotCos;
    float _il_savedSin = gmt_rotSin;
    ${o}
    vec3 _il_interlaceAxis = gmt_rotAxis;
    float _il_interlaceCos = gmt_rotCos;
    float _il_interlaceSin = gmt_rotSin;
    gmt_rotAxis = _il_savedAxis;
    gmt_rotCos = _il_savedCos;
    gmt_rotSin = _il_savedSin;`);const n=`
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
    }`;return{preLoop:a,inLoop:n}}const Fe={scalars:qt,vec2s:Ut,vec3s:Wt,vec4s:Xt};function Ta(){return Y.getAll().filter(e=>e.id!=="Modular").map(e=>({label:e.name,value:e.id}))}const Yt={interlaceParamA:"paramA",interlaceParamB:"paramB",interlaceParamC:"paramC",interlaceParamD:"paramD",interlaceParamE:"paramE",interlaceParamF:"paramF",interlaceVec3A:"vec3A",interlaceVec3B:"vec3B",interlaceVec3C:"vec3C",interlaceVec2A:"vec2A",interlaceVec2B:"vec2B",interlaceVec2C:"vec2C",interlaceVec4A:"vec4A",interlaceVec4B:"vec4B",interlaceVec4C:"vec4C"},Pa=Object.fromEntries(Object.entries(Yt).map(([e,o])=>[o,e]));function ka(e){const o=Y.get(e);if(!o)return{};const t={};for(const a of o.parameters){if(!a)continue;const i=Pa[a.id];i!==void 0&&(t[i]=a.default)}return t}function Kt(e,o){const t=e==null?void 0:e.interlaceFormula;if(!t)return;const a=Y.get(t);if(!a)return;const i=Yt[o];return a.parameters.find(r=>r&&r.id===i)??void 0}function W(e){return o=>{const t=Kt(o,e);if(!t)return;const a={label:t.label};return t.min!==void 0&&(a.min=t.min),t.max!==void 0&&(a.max=t.max),t.step!==void 0&&(a.step=t.step),t.mode&&(a.mode=t.mode),t.scale&&(a.scale=t.scale),t.linkable!==void 0&&(a.linkable=t.linkable),t.options&&(a.options=t.options),a}}function X(e){return o=>!!Kt(o,e)}const za={id:"interlace",shortId:"il",name:"Formula Interlace",category:"Formulas",dependsOn:["coreMath","geometry"],engineConfig:{toggleParam:"interlaceCompiled",mode:"compile",label:"Formula Interlacing",description:"Alternate between two formulas per iteration (like Mandelbulber hybrid).",groupFilter:"engine_settings"},panelConfig:{compileParam:"interlaceCompiled",runtimeToggleParam:"interlaceEnabled",compileSettingsParams:["interlaceFormula"],runtimeGroup:"interlace_runtime",label:"Interlace",compileMessage:"Compiling interlaced formula..."},params:{interlaceCompiled:{type:"boolean",default:!1,label:"Formula Interlacing",shortId:"ilc",group:"engine_settings",ui:"checkbox",description:"Compiles a secondary formula into the shader for per-iteration alternation.",onUpdate:"compile",noReset:!0,estCompileMs:1500},interlaceFormula:{type:"float",default:"Mandelbulb",label:"Secondary Formula",shortId:"ilf",group:"engine_settings",get options(){return Ta().map(e=>({label:e.label,value:e.value,estCompileMs:800}))},description:"Formula to alternate with the primary formula each iteration.",onUpdate:"compile",noReset:!0,condition:{param:"interlaceCompiled",bool:!0},onSet:e=>ka(e)},interlaceEnabled:{type:"boolean",default:!1,label:"Interlace Active",shortId:"ile",uniform:"uInterlaceEnabled",group:"interlace_runtime",hidden:!0},interlaceInterval:{type:"float",default:2,label:"Interval",shortId:"ili",uniform:"uInterlaceInterval",min:1,max:10,step:1,group:"interlace_runtime",description:"Run secondary formula every N iterations.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceStartIter:{type:"float",default:0,label:"Start Iter",shortId:"ils",uniform:"uInterlaceStartIter",min:0,max:20,step:1,group:"interlace_runtime",description:"First iteration where secondary formula runs.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceParamA:{type:"float",default:8,label:"Param A",shortId:"ila",uniform:"uInterlaceParamA",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamA"),dynamicVisible:X("interlaceParamA")},interlaceParamB:{type:"float",default:0,label:"Param B",shortId:"ilb",uniform:"uInterlaceParamB",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamB"),dynamicVisible:X("interlaceParamB")},interlaceParamC:{type:"float",default:0,label:"Param C",shortId:"ilc2",uniform:"uInterlaceParamC",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamC"),dynamicVisible:X("interlaceParamC")},interlaceParamD:{type:"float",default:0,label:"Param D",shortId:"ild",uniform:"uInterlaceParamD",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamD"),dynamicVisible:X("interlaceParamD")},interlaceParamE:{type:"float",default:0,label:"Param E",shortId:"ile2",uniform:"uInterlaceParamE",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamE"),dynamicVisible:X("interlaceParamE")},interlaceParamF:{type:"float",default:0,label:"Param F",shortId:"ilf2",uniform:"uInterlaceParamF",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceParamF"),dynamicVisible:X("interlaceParamF")},interlaceVec3A:{type:"vec3",default:new E(0,0,0),label:"Vec3 A",shortId:"ilv3a",uniform:"uInterlaceVec3A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec3A"),dynamicVisible:X("interlaceVec3A")},interlaceVec3B:{type:"vec3",default:new E(0,0,0),label:"Vec3 B",shortId:"ilv3b",uniform:"uInterlaceVec3B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec3B"),dynamicVisible:X("interlaceVec3B")},interlaceVec3C:{type:"vec3",default:new E(0,0,0),label:"Vec3 C",shortId:"ilv3c",uniform:"uInterlaceVec3C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec3C"),dynamicVisible:X("interlaceVec3C")},interlaceVec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"ilv2a",uniform:"uInterlaceVec2A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec2A"),dynamicVisible:X("interlaceVec2A")},interlaceVec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"ilv2b",uniform:"uInterlaceVec2B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec2B"),dynamicVisible:X("interlaceVec2B")},interlaceVec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"ilv2c",uniform:"uInterlaceVec2C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec2C"),dynamicVisible:X("interlaceVec2C")},interlaceVec4A:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 A",shortId:"ilv4a",uniform:"uInterlaceVec4A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec4A"),dynamicVisible:X("interlaceVec4A")},interlaceVec4B:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 B",shortId:"ilv4b",uniform:"uInterlaceVec4B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec4B"),dynamicVisible:X("interlaceVec4B")},interlaceVec4C:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 C",shortId:"ilv4c",uniform:"uInterlaceVec4C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:W("interlaceVec4C"),dynamicVisible:X("interlaceVec4C")}},groups:{interlace_runtime:{label:"Interlace Controls"}},inject:(e,o,t)=>{var f;const a=o.interlace;if(!(a!=null&&a.interlaceCompiled))return;const i=a.interlaceFormula;if(!i||i==="Modular"||o.formula==="Modular"||(f=Y.get(o.formula))!=null&&f.shader.selfContainedSDE)return;const r=Y.get(i);if(!r||r.shader.selfContainedSDE)return;if(t==="Mesh"){for(const m of Fe.scalars)e.addUniform(m,"float");for(const m of Fe.vec2s)e.addUniform(m,"vec2");for(const m of Fe.vec3s)e.addUniform(m,"vec3");for(const m of Fe.vec4s)e.addUniform(m,"vec4");e.addUniform("uInterlaceEnabled","float"),e.addUniform("uInterlaceInterval","float"),e.addUniform("uInterlaceStartIter","float")}const n=[...Ne(r.shader.preamble??""),...Ne(r.shader.function??""),...Ne(r.shader.loopInit??"")].filter((m,b,y)=>y.indexOf(m)===b);if(r.shader.preamble){const m=Ca(r.shader.preamble,r.id,r.shader.preambleVars);e.addPreamble(m)}const l=Ma(r.shader.function,r.id,r.shader.preambleVars,n);e.addFunction(l);const s=Ra(r.shader.loopBody,r.id,r.shader.preambleVars);let c="";r.shader.loopInit&&(c=Ea(r.shader.loopInit,r.id,r.shader.preambleVars,n));const d=!!r.shader.usesSharedRotation,{preLoop:h,inLoop:p}=La(s,c,d);e.addHybridFold("",h,p)}},Mr=220,Rr=24,Er=32,Lr=24,Tr=24,Pr=50,Ce=64,N=8,Pe=2e3,kr=256,zr=50,Ar={DEFAULT_BITRATE:40},Dr=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm",imageSequence:!1},{label:"PNG Sequence (RGBA)",container:"png",codec:"png",ext:"png",mime:"image/png",imageSequence:!0},{label:"JPG Sequence (per pass)",container:"jpg",codec:"jpg",ext:"jpg",mime:"image/jpeg",imageSequence:!0}],Aa={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:Pe,label:"Hard Loop Cap",shortId:"hc",min:64,max:Pe,step:1,group:"engine_settings",ui:"numeric",description:"Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",onUpdate:"compile",noReset:!0,hidden:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0,hidden:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0,hidden:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:Pe,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!0,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{and:[{param:"dynamicScaling",bool:!0},{param:"adaptiveTarget",eq:0}]},format:e=>`1/${e}x`,noReset:!0},adaptiveTarget:{type:"float",default:30,label:"Target FPS",shortId:"at",min:15,max:60,step:5,group:"performance",condition:{param:"dynamicScaling",bool:!0},noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,o)=>{const t=o.quality,a=(t==null?void 0:t.compilerHardCap)||Pe;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(a).toString())}};class Da{constructor(){S(this,"nodes",new Map)}register(o){this.nodes.set(o.id,o)}get(o){return this.nodes.get(o)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const o={};return this.nodes.forEach(t=>{o[t.category]||(o[t.category]=[]),o[t.category].push(t.id)}),o}}const F=new Da;F.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});F.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});F.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});F.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});F.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});F.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});F.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});F.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});F.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});F.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});F.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});F.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});F.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});F.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});F.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
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
`});F.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});F.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});F.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});F.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});F.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});F.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});F.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});F.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});F.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});F.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});F.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const Fa=e=>{const o=new Map;return e.forEach(t=>{o.has(t.target)||o.set(t.target,[]),o.get(t.target).push(t)}),o},Oa=e=>{const o=new Set,t=["root-end"],a=new Set;for(;t.length>0;){const i=t.pop();a.has(i)||(a.add(i),i!=="root-end"&&i!=="root-start"&&o.add(i),(e.get(i)??[]).forEach(r=>t.push(r.source)))}return o},Na=(e,o)=>{const t=Fa(o),a=Oa(t),i=e.filter(d=>a.has(d.id));if(!i||i.length===0)return`
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;let r=`
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;const n=new Map;n.set("root-start","v_start");let l=0;i.forEach((d,h)=>{const f=`v_${d.id.replace(/[^a-zA-Z0-9]/g,"")}`;n.set(d.id,f);const m=t.get(d.id)??[],b=m.find(I=>!I.targetHandle||I.targetHandle==="a"),y=m.find(I=>I.targetHandle==="b"),g=b&&n.get(b.source)||"v_start",v=y&&n.get(y.source)||"v_start";if(r+=`    // Node: ${d.type} (${d.id})
`,r+=`    vec3 ${f}_p = ${g}_p;
`,r+=`    float ${f}_d = ${g}_d;
`,r+=`    float ${f}_dr = ${g}_dr;
`,d.enabled){const I=F.get(d.type);if(I){const M=d.condition&&d.condition.active;let x="    ";if(M){const P=l<Ce?`uModularParams[${l++}]`:"2.0",A=l<Ce?`uModularParams[${l++}]`:"0.0";r+=`    { int ${f}_cmod = max(1, int(${P})); int ${f}_crem = int(${A});
`,r+=`    if ( (i - (i/${f}_cmod)*${f}_cmod) == ${f}_crem ) {
`,x="        "}const L=P=>d.bindings&&d.bindings[P]?`u${d.bindings[P]}`:l<Ce?`uModularParams[${l++}]`:"0.0";r+=I.glsl({varName:f,in1:g,in2:v,getParam:L,indent:x}),M&&(r+=`    }}
`)}}r+=`
`});const s=o.find(d=>d.target==="root-end");let c="v_start";return s&&s.source!=="root-start"&&(c=n.get(s.source)||"v_start"),r+=`
    z.xyz = ${c}_p;
    dr = ${c}_dr;
    
    float final_d = ${c}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${r}
}
`},ja=e=>{let o="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `:e<1.5?o="d = (r - 1.0) / dr_safe;":e<2.5?o="d = r / dr_safe;":e<3.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `:o="d = (r - 2.0) / dr_safe;",`
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
            
            ${o}
            
            return vec2(d, smoothIter);
        }`},Ha={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:q.ModularParams,type:"float",arraySize:Ce,default:new Float32Array(Ce),backingOnly:!0}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new E(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new E(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new E(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new We(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new We(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new We(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,o)=>{var d;const t=o.formula,a=o.quality;t==="Modular"&&(e.addDefine("PIPELINE_REV",(o.pipelineRevision||0).toString()),e.addUniform(q.ModularParams,"float",Ce));const i=Y.get(t);i!=null&&i.shader.selfContainedSDE&&e.addDefine("SKIP_PRE_BAILOUT","1");let r="",n="",l="";const s=(a==null?void 0:a.estimator)||0;let c=ja(s);if(t==="Modular"){const h=Na(o.pipeline||[],((d=o.graph)==null?void 0:d.edges)||[]);r+=h+`
`,n="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else i&&(r+=i.shader.function+`
`,n=i.shader.loopBody,l=i.shader.loopInit||"",i.shader.preamble&&e.addPreamble(i.shader.preamble),i.shader.getDist&&(c=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${i.shader.getDist} }`));e.addFunction(r),e.setFormula(n,l,c)}};let $a=0;function Me(){return`l${++$a}`}const Ba=(e,o)=>{if(!e)return`
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;if(o===3)return`
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
`;const t=256,a=o<1.5?`
        float t = 0.05;
        float fudge = 1.0;
    `:`
        float t = 0.0;
        float fudge = uFudgeFactor;
    `,i=o<1.5?`
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
// SHADOWS (${o<1.5?"Lite Soft":"Robust Soft"})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${a}

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
`},Zt=e=>`
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
`,Jt=`
    }

    return Lo;
}
`,Va=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${Zt(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Jt}
`,Ga=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${Zt(e)}
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
${Jt}
`,Qt=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,qa=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,Rt=Qt+qa,Ua=`
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
`,Wa=`
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
`,Xa=()=>`
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
`,Ya=(e,o,t=!0)=>`
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
            emission += uRimColor * rimFactor;
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
`;function Et(e){let o=!1;const t=e.map(a=>a.id?a:(o=!0,{...a,id:Me()}));return o?t:e}const Fr=(e,o)=>!e||!e.lights||o>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[o],Ka=[{id:Me(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#fff4e6",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:5500},{id:Me(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:3500},{id:Me(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:7500}],Za={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:q.LightCount,type:"int",default:0},{name:q.LightType,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightPos,type:"vec3",arraySize:N,default:new Array(N).fill(new E)},{name:q.LightDir,type:"vec3",arraySize:N,default:new Array(N).fill(new E(0,-1,0))},{name:q.LightColor,type:"vec3",arraySize:N,default:new Array(N).fill(new G(1,1,1))},{name:q.LightIntensity,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightShadows,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightFalloff,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightFalloffType,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightRadius,type:"float",arraySize:N,default:new Float32Array(N).fill(0)},{name:q.LightSoftness,type:"float",arraySize:N,default:new Float32Array(N).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Hardness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Too low: acne. Too high: detached."},lights:{type:"complex",default:Ka,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",N.toString());const a=o.lighting;if(a&&!a.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
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
             `);return}const i=(a==null?void 0:a.shadowsCompile)!==!1,r=(a==null?void 0:a.shadowAlgorithm)??0,n=r===2?3:r===1?1:2;e.addPostDEFunction(Ba(i,n)),!i&&!(a!=null&&a.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(a==null?void 0:a.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),a!=null&&a.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),a!=null&&a.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const l=(a==null?void 0:a.ptStochasticShadows)===!0&&i,s=o.renderMode==="PathTracing"||(a==null?void 0:a.renderMode)===1,c=o.quality,d=(c==null?void 0:c.precisionMode)===1;if(s)e.addIntegrator(Rt),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(Ya(d,N,l));else{const h=(a==null?void 0:a.specularModel)===1;e.addIntegrator(h?Rt:Qt),e.setRenderMode("Direct"),e.addIntegrator(h?Ga(l):Va(l)),e.requestShading()}},actions:{updateLight:(e,o)=>{const{index:t,params:a}=o;if(!e.lights||t>=e.lights.length)return{};const i=[...e.lights];return i[t]={...i[t],...a},{lights:i}},addLight:e=>{if(e.lights.length>=N)return{};const o={id:Me(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,o]}},removeLight:(e,o)=>{if(o<0||o>=e.lights.length)return{};const t=[...e.lights];return t.splice(o,1),{lights:t}},duplicateLight:(e,o)=>{if(o<0||o>=e.lights.length||e.lights.length>=N)return{};const t={...e.lights[o],id:Me()},a=[...e.lights];return a.splice(o+1,0,t),{lights:a}}}},Ja={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.lightSpheres;!a||a.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(Ua),e.addIntegrator(Xa()),e.addMissLogic(Wa),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},Qa={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},ei={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},ti={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},oi={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new G("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,o)=>({shapes:[...e.shapes||[],o]}),removeDrawnShape:(e,o)=>({shapes:(e.shapes||[]).filter(t=>t.id!==o)}),updateDrawnShape:(e,o)=>({shapes:(e.shapes||[]).map(t=>t.id===o.id?{...t,...o.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},Lt=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],ai={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,o)=>{const t=Lt[e.rules.length%Lt.length],a={id:oe(),target:o.target,source:o.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,a],selectedRuleId:a.id}},removeModulation:(e,o)=>({rules:e.rules.filter(t=>t.id!==o),selectedRuleId:e.selectedRuleId===o?null:e.selectedRuleId}),updateModulation:(e,o)=>({rules:e.rules.map(t=>t.id===o.id?{...t,...o.update}:t)}),selectModulation:(e,o)=>({selectedRuleId:o})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},ii={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},ri={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},ni={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},si={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,o)=>{const{mode:t,actions:a}=o,i=ni[t];return i?(Object.entries(i).forEach(([r,n])=>{const l=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,s=a[l];typeof s=="function"&&s(n)}),{}):{}}}},li=(e,o,t=32)=>{if(!e)return`
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;let a="";return o&&(a=`
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

${a}

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

    #if ${o?1:0}
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
`},ci={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new G(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const a=o.ao,i=(a==null?void 0:a.aoEnabled)!==!1,r=(a==null?void 0:a.aoStochasticCp)!==!1,n=(a==null?void 0:a.aoMaxSamples)||32;e.addPostDEFunction(li(i,r,n))}},di=()=>`
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
    `,Tt=0,Ye=1,de=3,ui=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,fi=`
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
`,pi={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:Ye,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:Tt,estCompileMs:0},{label:"Environment Map",value:Ye,estCompileMs:0},{label:"Raymarched (Quality)",value:de,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:de},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:de},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:de},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:de}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:de}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.reflections;if(!a||a.enabled===!1)return;const i=a.reflectionMode??Ye;if(i!==Tt){if(i!==de){e.addShadingLogic(ui);return}if(i===de){e.addPostDEFunction(di());const r=Math.max(1,Math.min(3,a.bounces??1));e.addDefine("MAX_REFL_BOUNCES",r.toString()),a.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(fi)}}}},hi=`
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
`,mi=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,gi=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,yi=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,bi={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new G("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,o,t)=>{const a=o.waterPlane;a&&a.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(hi),e.addPostMapCode(mi),e.addPostDistCode(gi),e.addMaterialLogic(yi))}},vi={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},xi=`
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
`,Si=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,_i={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new G(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.volumetric;a!=null&&a.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(xi,""),e.addPostProcessLogic(Si))}},wi=()=>{R.register(Ha),R.register(_a),R.register(za),R.register(Za),R.register(Ja),R.register(ci),R.register(pi),R.register(Xo),R.register(_i),R.register(ta),R.register(bi),R.register(ra),R.register(aa),R.register(Aa),R.register(Ko),R.register(Zo),R.register(oa),R.register(Qa),R.register(ei),R.register(vi),R.register(ti),R.register(oi),R.register(ai),R.register(ii),R.register(ri),R.register(si)},Ie=e=>{const o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return o?{r:parseInt(o[1],16),g:parseInt(o[2],16),b:parseInt(o[3],16)}:null},eo=(e,o,t)=>(typeof e=="object"&&(o=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(o)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),Ve=({r:e,g:o,b:t})=>{e/=255,o/=255,t/=255;const a=Math.max(e,o,t),i=Math.min(e,o,t);let r=0,n=0,l=a;const s=a-i;if(n=a===0?0:s/a,a!==i){switch(a){case e:r=(o-t)/s+(o<t?6:0);break;case o:r=(t-e)/s+2;break;case t:r=(e-o)/s+4;break}r/=6}return{h:r*360,s:n*100,v:l*100}},to=(e,o,t)=>{e/=360,o/=100,t/=100;let a=0,i=0,r=0;const n=Math.floor(e*6),l=e*6-n,s=t*(1-o),c=t*(1-l*o),d=t*(1-(1-l)*o);switch(n%6){case 0:a=t,i=d,r=s;break;case 1:a=c,i=t,r=s;break;case 2:a=s,i=t,r=d;break;case 3:a=s,i=c,r=t;break;case 4:a=d,i=s,r=t;break;case 5:a=t,i=s,r=c;break}return{r:a*255,g:i*255,b:r*255}},Ii=(e,o,t)=>({r:e.r+(o.r-e.r)*t,g:e.g+(o.g-e.g)*t,b:e.b+(o.b-e.b)*t}),Ci=(e,o,t)=>{const a=Ve(e),i=Ve(o);let r=i.h-a.h;r>180&&(r-=360),r<-180&&(r+=360);const n=((a.h+r*t)%360+360)%360,l=a.s+(i.s-a.s)*t,s=a.v+(i.v-a.v)*t;return to(n,l,s)},Mi=(e,o,t)=>{const a=Ve(e),i=Ve(o);let r=i.h-a.h;r>=0&&r<=180&&(r-=360),r<0&&r>=-180&&(r+=360);const n=((a.h+r*t)%360+360)%360,l=a.s+(i.s-a.s)*t,s=a.v+(i.v-a.v)*t;return to(n,l,s)},je=e=>{const o=e/255;return o<=.04045?o/12.92:Math.pow((o+.055)/1.055,2.4)},Ke=e=>{const o=Math.max(0,Math.min(1,e));return(o<=.0031308?o*12.92:1.055*Math.pow(o,1/2.4)-.055)*255},Pt=e=>{const o=je(e.r),t=je(e.g),a=je(e.b),i=Math.cbrt(.4122214708*o+.5363325363*t+.0514459929*a),r=Math.cbrt(.2119034982*o+.6806995451*t+.1073969566*a),n=Math.cbrt(.0883024619*o+.2817188376*t+.6299787005*a);return{L:.2104542553*i+.793617785*r-.0040720468*n,a:1.9779984951*i-2.428592205*r+.4505937099*n,b:.0259040371*i+.7827717662*r-.808675766*n}},kt=e=>{const o=e.L+.3963377774*e.a+.2158037573*e.b,t=e.L-.1055613458*e.a-.0638541728*e.b,a=e.L-.0894841775*e.a-1.291485548*e.b,i=o*o*o,r=t*t*t,n=a*a*a;return{r:Ke(4.0767416621*i-3.3077115913*r+.2309699292*n),g:Ke(-1.2684380046*i+2.6097574011*r-.3413193965*n),b:Ke(-.0041960863*i-.7034186147*r+1.707614701*n)}},Ri=(e,o,t)=>{const a=Pt(e),i=Pt(o),r=Math.sqrt(a.a*a.a+a.b*a.b),n=Math.sqrt(i.a*i.a+i.b*i.b);if(r<.005||n<.005)return kt({L:a.L+(i.L-a.L)*t,a:a.a+(i.a-a.a)*t,b:a.b+(i.b-a.b)*t});const l=Math.atan2(a.b,a.a);let c=Math.atan2(i.b,i.a)-l;c>Math.PI&&(c-=2*Math.PI),c<-Math.PI&&(c+=2*Math.PI);const d=l+c*t,h=r+(n-r)*t,p=a.L+(i.L-a.L)*t;return kt({L:p,a:h*Math.cos(d),b:h*Math.sin(d)})},oo=(e,o,t,a)=>{switch(a){case"hsv":return Ci(e,o,t);case"hsv-far":return Mi(e,o,t);case"oklab":return Ri(e,o,t);default:return Ii(e,o,t)}},ao=(e,o)=>{if(Math.abs(o-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,o)),a=Math.log(.5)/Math.log(t);return Math.pow(e,a)},Or=(e,o=1)=>{let t,a="rgb";if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops,a=e.blendSpace||"oklab";else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const i=[...t].sort((l,s)=>l.position-s.position),r=a!=="rgb",n=[];for(let l=0;l<i.length;l++){const s=i[l];let c=Math.pow(s.position,1/o);if(c=Math.max(0,Math.min(1,c))*100,n.push(`${s.color} ${c.toFixed(2)}%`),l<i.length-1){const d=i[l+1],h=s.bias??.5,p=s.interpolation||"linear";if(p==="step"){let f=Math.pow(d.position,1/o);f=Math.max(0,Math.min(1,f))*100,n.push(`${s.color} ${f.toFixed(2)}%`),n.push(`${d.color} ${f.toFixed(2)}%`)}else if(r){const f=Ie(s.color)||{r:0,g:0,b:0},m=Ie(d.color)||{r:0,g:0,b:0},b=12;for(let y=1;y<b;y++){let g=y/b;Math.abs(h-.5)>.001&&(g=ao(g,h)),(p==="smooth"||p==="cubic")&&(g=g*g*(3-2*g));const v=oo(f,m,g,a),I=s.position+(d.position-s.position)*(y/b);let M=Math.pow(I,1/o)*100;M=Math.max(0,Math.min(100,M)),n.push(`${eo(v)} ${M.toFixed(2)}%`)}}else if(Math.abs(h-.5)>.001){const f=s.position+(d.position-s.position)*h;let m=Math.pow(f,1/o)*100;m=Math.max(0,Math.min(100,m)),n.push(`${m.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${n.join(", ")})`},Ze=e=>je(e)*255,Je=e=>{const o=e/255;if(o>=.99)return 255;const t=(Math.sqrt(-10127*o*o+13702*o+9)+59*o-3)/(502-486*o);return Math.max(0,t)*255},zt=e=>{const t=new Uint8Array(1024);let a,i="srgb",r="oklab";if(Array.isArray(e))a=e;else if(e&&Array.isArray(e.stops))a=e.stops,i=e.colorSpace||"srgb",r=e.blendSpace||"oklab";else return t;if(a.length===0){for(let s=0;s<256;s++){const c=Math.floor(s/255*255);t[s*4]=c,t[s*4+1]=c,t[s*4+2]=c,t[s*4+3]=255}return t}const n=[...a].sort((s,c)=>s.position-c.position),l=s=>{let c={r:0,g:0,b:0};if(s<=n[0].position)c=Ie(n[0].color)||{r:0,g:0,b:0};else if(s>=n[n.length-1].position)c=Ie(n[n.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<n.length-1;d++)if(s>=n[d].position&&s<=n[d+1].position){const h=n[d],p=n[d+1];let f=(s-h.position)/(p.position-h.position);const m=h.bias??.5;Math.abs(m-.5)>.001&&(f=ao(f,m));const b=h.interpolation||"linear";b==="step"?f=0:(b==="smooth"||b==="cubic")&&(f=f*f*(3-2*f));const y=Ie(h.color)||{r:0,g:0,b:0},g=Ie(p.color)||{r:0,g:0,b:0};c=oo(y,g,f,r);break}return i==="linear"?{r:Ze(c.r),g:Ze(c.g),b:Ze(c.b)}:i==="aces_inverse"?{r:Je(c.r),g:Je(c.g),b:Je(c.b)}:c};for(let s=0;s<256;s++){const c=s/255,d=l(c);t[s*4]=d.r,t[s*4+1]=d.g,t[s*4+2]=d.b,t[s*4+3]=255}return t},Ei=e=>{const o=Math.max(1e3,Math.min(4e4,e))/100;let t,a,i;return o<=66?t=255:(t=o-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),o<=66?(a=o,a=99.4708025861*Math.log(a)-161.1195681661,a=Math.max(0,Math.min(255,a))):(a=o-60,a=288.1221695283*Math.pow(a,-.0755148492),a=Math.max(0,Math.min(255,a))),o>=66?i=255:o<=19?i=0:(i=o-10,i=138.5177312231*Math.log(i)-305.0447927307,i=Math.max(0,Math.min(255,i))),{r:Math.round(t),g:Math.round(a),b:Math.round(i)}},Nr=e=>{const{r:o,g:t,b:a}=Ei(e);return eo(o,t,a)},Li=(e,o)=>{const t={};return wi(),R.getAll().forEach(i=>{const r={},n={};i.state&&Object.assign(r,i.state),Object.entries(i.params).forEach(([s,c])=>{c.composeFrom?c.composeFrom.forEach(d=>{n[d]=s}):r[s]===void 0&&(r[s]=c.default)}),t[i.id]=r;const l=`set${i.id.charAt(0).toUpperCase()+i.id.slice(1)}`;t[l]=s=>{let c=!1;const d={};e(h=>{const p=h[i.id],f={...s};Object.keys(s).forEach(y=>{const g=i.params[y];if(g){const v=s[y];if(v==null)return;g.type==="vec2"&&!(v instanceof J)&&(f[y]=new J(v.x,v.y)),g.type==="vec3"&&!(v instanceof E)&&(f[y]=new E(v.x,v.y,v.z)),g.type==="color"&&!(v instanceof G)&&(typeof v=="string"?f[y]=new G(v):typeof v=="number"?f[y]=new G(v):typeof v=="object"&&"r"in v&&(f[y]=new G(v.r,v.g,v.b)))}}),Object.keys(f).forEach(y=>{const g=i.params[y];if(g!=null&&g.onSet){const v=g.onSet(f[y],p);v&&Object.entries(v).forEach(([I,M])=>{s[I]===void 0&&(f[I]=M)})}});const m={...p,...f},b=new Set;return Object.keys(f).forEach(y=>{const g=i.params[y];if(n[y]&&b.add(n[y]),g&&(g.noReset||(c=!0),g.type!=="image"&&(d[i.id]||(d[i.id]={}),d[i.id][y]=m[y]),g.uniform)){const v=m[y];if(g.type==="image"){const I=g.uniform.toLowerCase().includes("env")?"env":"color";v&&typeof v=="string"?(w.emit("texture",{textureType:I,dataUrl:v}),y==="envMapData"&&m.useEnvMap===!1&&(m.useEnvMap=!0,w.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),y==="layer1Data"&&m.active===!1&&(m.active=!0,w.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(w.emit("texture",{textureType:I,dataUrl:null}),y==="envMapData"&&m.useEnvMap===!0&&(m.useEnvMap=!1,w.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),y==="layer1Data"&&m.active===!0&&(m.active=!1,w.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(g.type==="gradient"){const I=zt(v);w.emit("uniform",{key:g.uniform,value:{isGradientBuffer:!0,buffer:I},noReset:!!g.noReset})}else{let I=v;g.type==="boolean"&&(I=v?1:0),g.type==="color"&&!(I instanceof G)&&(I=new G(I)),w.emit("uniform",{key:g.uniform,value:I,noReset:!!g.noReset})}}}),b.forEach(y=>{const g=i.params[y];if(g&&g.composeFrom&&g.uniform){const v=g.composeFrom.map(I=>m[I]);if(g.type==="gradient"){const I=m[y];if(I){const M=zt(I);w.emit("uniform",{key:g.uniform,value:{isGradientBuffer:!0,buffer:M},noReset:!!g.noReset}),g.noReset||(c=!0)}}else if(g.type==="vec2"){const I=new J(v[0],v[1]);w.emit("uniform",{key:g.uniform,value:I,noReset:!!g.noReset}),g.noReset||(c=!0)}else if(g.type==="vec3"){const I=new E(v[0],v[1],v[2]);w.emit("uniform",{key:g.uniform,value:I,noReset:!!g.noReset}),g.noReset||(c=!0)}}}),{[i.id]:m}}),Object.keys(d).length>0&&w.emit("config",d),c&&w.emit("reset_accum",void 0)},i.actions&&Object.entries(i.actions).forEach(([s,c])=>{t[s]=d=>{const p=o()[i.id],f=c(p,d);f&&Object.keys(f).length>0&&(e({[i.id]:{...p,...f}}),w.emit("reset_accum",void 0))}})}),t},Ti={id:"shadows",label:"Shadows",renderContext:"direct",controlledParams:["lighting.shadowsCompile","lighting.shadowAlgorithm","lighting.ptStochasticShadows"],tiers:[{label:"Off",overrides:{lighting:{shadows:!1,shadowsCompile:!1,ptStochasticShadows:!1}},estCompileMs:0},{label:"Hard",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,ptStochasticShadows:!1}},estCompileMs:500},{label:"Soft",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1}},estCompileMs:3e3},{label:"Full",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0}},estCompileMs:3800}]},Pi={id:"reflections",label:"Reflections (Direct)",renderContext:"direct",controlledParams:["reflections.reflectionMode","reflections.bounceShadows","reflections.bounces"],tiers:[{label:"Off",overrides:{reflections:{reflectionMode:0,bounceShadows:!1}},estCompileMs:0},{label:"Env Map",overrides:{reflections:{reflectionMode:1,bounceShadows:!1}},estCompileMs:0},{label:"Raymarched",overrides:{reflections:{reflectionMode:3,bounceShadows:!1,bounces:1}},estCompileMs:7500},{label:"Full",overrides:{reflections:{reflectionMode:3,bounceShadows:!0,bounces:2}},estCompileMs:12e3}]},ki={id:"lighting_quality",label:"Lighting",isAdvanced:!0,controlledParams:["lighting.specularModel","lighting.ptEnabled","lighting.ptNEEAllLights","lighting.ptEnvNEE"],tiers:[{label:"Preview",overrides:{lighting:{advancedLighting:!1,ptEnabled:!1}},estCompileMs:-2500},{label:"Path Traced",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!1,ptEnvNEE:!1}},estCompileMs:1900},{label:"PT + NEE",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!0,ptEnvNEE:!0}},estCompileMs:2500}]},zi={id:"atmosphere_quality",label:"Atmosphere",controlledParams:["atmosphere.glowEnabled","atmosphere.glowQuality","volumetric.ptVolumetric"],tiers:[{label:"Off",overrides:{atmosphere:{glowEnabled:!1},volumetric:{ptVolumetric:!1}},estCompileMs:0},{label:"Fast Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:1},volumetric:{ptVolumetric:!1}},estCompileMs:200},{label:"Color Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!1}},estCompileMs:400},{label:"Volumetric",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!0}},estCompileMs:5900}]},st=[Ti,Pi,ki,zi],ke=[{id:"preview",label:"Preview",description:"Instant preview shader — navigate without waiting for compile.",subsystems:{shadows:0,reflections:0,lighting_quality:0,atmosphere_quality:0}},{id:"fastest",label:"Fastest",description:"Path traced lighting with fast glow.",subsystems:{shadows:0,reflections:0,lighting_quality:1,atmosphere_quality:1}},{id:"lite",label:"Lite",description:"Hard shadows, env map reflections, color glow.",subsystems:{shadows:1,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"balanced",label:"Balanced",description:"Soft shadows, env map reflections, color glow.",subsystems:{shadows:2,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"full",label:"Full",description:"Full shadows, raymarched reflections, volumetric.",subsystems:{shadows:3,reflections:3,lighting_quality:1,atmosphere_quality:3}},{id:"ultra",label:"Ultra",description:"Full + PT NEE. Experimental.",isAdvanced:!0,subsystems:{shadows:3,reflections:3,lighting_quality:2,atmosphere_quality:3}}],Ai={activePreset:"balanced",subsystems:{...ke[3].subsystems},isCustomized:!1};function Di(e){return ke.find(o=>o.id===e)}function Fi(e){for(const o of ke)if(Object.keys(o.subsystems).every(a=>o.subsystems[a]===e[a]))return o.id;return null}function jr(e){if(!e.activePreset)return"Custom";const o=Di(e.activePreset);if(!o)return"Custom";if(!e.isCustomized)return o.label;const t=[];for(const a of st){const i=o.subsystems[a.id],r=e.subsystems[a.id];if(i!==r){const n=a.tiers[r];t.push(`${a.label}=${(n==null?void 0:n.label)??"?"}`)}}return`${o.label} (${t.join(", ")})`}const Oi=4200;function Hr(e){let o=Oi;for(const t of st){const a=e[t.id]??0,i=t.tiers[a];i&&(o+=i.estCompileMs)}return o}let ot=null;function Ni(e){ot=e}function At(e,o){const t=o(),a={};for(const i of st){const r=e[i.id]??0,n=i.tiers[r];if(n)for(const[l,s]of Object.entries(n.overrides))a[l]||(a[l]={}),Object.assign(a[l],s)}for(const[i,r]of Object.entries(a)){const n=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,l=t[n];typeof l=="function"&&l(r)}}function ji(e){if(!ot)return;const o=ot(e());w.emit($.CONFIG,o)}const Hi=(e,o)=>({scalability:{...Ai},hardwareProfile:null,applyScalabilityPreset:t=>{const a=ke.find(i=>i.id===t);a&&(e({scalability:{activePreset:t,subsystems:{...a.subsystems},isCustomized:!1}}),At(a.subsystems,o))},setSubsystemTier:(t,a)=>{const i=o().scalability,r={...i.subsystems,[t]:a};let n=!1;if(i.activePreset){const s=ke.find(c=>c.id===i.activePreset);s&&(n=Object.keys(r).some(c=>r[c]!==s.subsystems[c]))}else n=!0;const l=Fi(r);e({scalability:{activePreset:l??i.activePreset,subsystems:r,isCustomized:l?!1:n}}),At(r,o)},setHardwareProfile:t=>{e({hardwareProfile:t});const i=o().setQuality;typeof i=="function"&&i({compilerHardCap:t.caps.compilerHardCap,precisionMode:t.caps.precisionMode,bufferPrecision:t.caps.bufferPrecision}),ji(o)}});class at{constructor(o,t=null){S(this,"defaultState");S(this,"dictionary");S(this,"reverseDictCache",new Map);this.defaultState=o,this.dictionary=t}encode(o,t){try{const a=this.getDiff(o,this.defaultState);if(!a||Object.keys(a).length===0)return"";let i=this.quantize(a);if(!i||Object.keys(i).length===0)return"";this.dictionary&&(i=this.applyDictionary(i,this.dictionary,!0));const r=JSON.stringify(i),n=dt.deflate(r),l=Array.from(n).map(c=>String.fromCharCode(c)).join("");return btoa(l).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(a){return console.error("UrlStateEncoder: Error encoding",a),""}}decode(o){try{if(!o)return null;let t=o.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const a=atob(t),i=new Uint8Array(a.length);for(let l=0;l<a.length;l++)i[l]=a.charCodeAt(l);const r=dt.inflate(i,{to:"string"});let n=JSON.parse(r);return this.dictionary&&(n=this.applyDictionary(n,this.dictionary,!1)),this.deepMerge({...this.defaultState},n)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(o){if(this.reverseDictCache.has(o))return this.reverseDictCache.get(o);const t={};return Object.keys(o).forEach(a=>{const i=o[a];typeof i=="string"?t[i]=a:t[i._alias]=a}),this.reverseDictCache.set(o,t),t}applyDictionary(o,t,a){if(!o||typeof o!="object"||Array.isArray(o))return o;const i={};if(a)Object.keys(o).forEach(r=>{let n=r,l=null;const s=t[r];s&&(typeof s=="string"?n=s:(n=s._alias,l=s.children));const c=o[r];l&&c&&typeof c=="object"&&!Array.isArray(c)?i[n]=this.applyDictionary(c,l,!0):i[n]=c});else{const r=this.getReverseDict(t);Object.keys(o).forEach(n=>{const l=r[n]||n,s=o[n],c=t[l],d=c&&typeof c=="object"?c.children:null;d&&s&&typeof s=="object"&&!Array.isArray(s)?i[l]=this.applyDictionary(s,d,!1):i[l]=s})}return i}isEqual(o,t){if(o===t)return!0;if(o==null||t==null)return o===t;if(typeof o=="number"&&typeof t=="number")return Math.abs(o-t)<1e-4;if(Array.isArray(o)&&Array.isArray(t))return o.length!==t.length?!1:o.every((a,i)=>this.isEqual(a,t[i]));if(typeof o=="object"&&typeof t=="object"){const a=o,i=t,r=Object.keys(a).filter(l=>!l.startsWith("is")),n=Object.keys(i).filter(l=>!l.startsWith("is"));return r.length!==n.length?!1:r.every(l=>this.isEqual(a[l],i[l]))}return!1}quantize(o){if(typeof o=="string")return o.startsWith("data:image")?void 0:o;if(typeof o=="number")return o===0||Math.abs(o)<1e-9?0:parseFloat(o.toFixed(5));if(Array.isArray(o))return o.map(t=>this.quantize(t));if(o!==null&&typeof o=="object"){const t={};let a=!1;const i=Object.keys(o).filter(r=>!r.startsWith("is"));for(const r of i){const n=this.quantize(o[r]);n!==void 0&&(t[r]=n,a=!0)}return a?t:void 0}return o}getDiff(o,t){if(this.isEqual(o,t))return;if(typeof o!="object"||o===null||typeof t!="object"||t===null||Array.isArray(o))return o;const a={};let i=!1;const r=o,n=t;return Object.keys(r).forEach(l=>{if(l.startsWith("is")||l==="histogramData"||l==="interactionSnapshot"||l==="liveModulations"||l.endsWith("Stack"))return;const s=this.getDiff(r[l],n[l]);s!==void 0&&(a[l]=s,i=!0)}),i?a:void 0}deepMerge(o,t){if(typeof t!="object"||t===null)return t;const a={...o};return Object.keys(t).forEach(i=>{typeof t[i]=="object"&&t[i]!==null&&!Array.isArray(t[i])?a[i]=this.deepMerge(o[i]||{},t[i]):a[i]=t[i]}),a}}const $i=(e,o)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=o();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const a=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:a,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(o().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),Bi=(e,o)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,a)=>e(i=>({selectedTrackIds:a?i.selectedTrackIds.includes(t)?i.selectedTrackIds.filter(r=>r!==t):[...i.selectedTrackIds,t]:[t]})),selectTracks:(t,a)=>e(i=>{const r=new Set(i.selectedTrackIds);return a?t.forEach(n=>r.add(n)):t.forEach(n=>r.delete(n)),{selectedTrackIds:Array.from(r)}}),selectKeyframe:(t,a,i)=>e(r=>{const n=`${t}::${a}`;return{selectedKeyframeIds:i?r.selectedKeyframeIds.includes(n)?r.selectedKeyframeIds.filter(l=>l!==n):[...r.selectedKeyframeIds,n]:[n]}}),selectKeyframes:(t,a)=>e(i=>({selectedKeyframeIds:a?Array.from(new Set([...i.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,a)=>e({softSelectionRadius:t,softSelectionEnabled:a}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,a)=>e({bounceTension:t,bounceFriction:a})});function io(e,o,t,a,i){const r=1-e,n=e*e,l=r*r,s=l*r,c=n*e;return s*o+3*l*e*t+3*r*n*a+c*i}function Dt(e,o){let t=o[0],a=o[o.length-1];for(let d=0;d<o.length-1;d++)if(e>=o[d].frame&&e<o[d+1].frame){t=o[d],a=o[d+1];break}if(e>=a.frame)return a.value;if(e<=t.frame)return t.value;const i=a.frame-t.frame,r=(e-t.frame)/i;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(a.value-t.value)*r;const n=t.value,l=t.value+(t.rightTangent?t.rightTangent.y:0),s=a.value+(a.leftTangent?a.leftTangent.y:0),c=a.value;return io(r,n,l,s,c)}function Vi(e,o=1){const t=[],a=e[0].frame,i=e[e.length-1].frame,r=Math.max(o,(i-a)/50);for(let n=a;n<=i;n+=r)t.push({t:n,val:Dt(n,e)});return t.length>0&&t[t.length-1].t<i&&t.push({t:i,val:Dt(i,e)}),t}function Gi(e,o,t){let a=0,i=0,r=0,n=0,l=0,s=0,c=0;for(let y=0;y<e.length;y++){const g=e[y].t,v=1-g,I=e[y].val;s+=I,c+=I*I;const M=3*v*v*g,x=3*v*g*g,L=v*v*v*o+g*g*g*t,P=I-L;a+=M*M,i+=M*x,r+=x*x,n+=P*M,l+=P*x}const d=e.length,h=s/d;if(c/d-h*h<1e-9)return null;const f=a*r-i*i;if(Math.abs(f)<1e-9)return null;const m=(r*n-i*l)/f,b=(a*l-i*n)/f;return{h1:m,h2:b}}function qi(e,o){const t=e.length;if(t<2){const f=e[0].val;return{leftY:f,rightY:f}}const a=e[0].val,i=e[t-1].val,r=i-a,n=a+r*.333,l=a+r*.666,s=Gi(e,a,i);let c=n,d=l;s&&(c=s.h1,d=s.h2);const h=n+(c-n)*o,p=l+(d-l)*o;return{leftY:h,rightY:p}}function it(e,o,t,a){if(e.length<2)return;const i=e[0],r=e[e.length-1],n=r.t-i.t,l=e.map(p=>({t:(p.t-i.t)/n,val:p.val})),{leftY:s,rightY:c}=qi(l,a);let d=0,h=-1;if(n<1)d=0;else for(let p=1;p<l.length-1;p++){const f=l[p].t,m=io(f,i.val,s,c,r.val),b=Math.abs(m-l[p].val);b>d&&(d=b,h=p)}if(d<=t||e.length<=2){const p=o[o.length-1];p&&(p.rightTangent={x:n*.333,y:s-i.val});const f={id:oe(),frame:r.t,value:r.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-n*.333,y:c-r.val},rightTangent:{x:1,y:0}};o.push(f)}else{const p=e.slice(0,h+1),f=e.slice(h);it(p,o,t,a),it(f,o,t,a)}}const Ui=(e,o,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const a=[...e].sort((l,s)=>l.frame-s.frame),i=Vi(a,1),r=[],n=i[0];return r.push({id:oe(),frame:n.t,value:n.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),it(i,r,o,t),r.length>0&&(r[0].leftTangent={x:-1,y:0},r[r.length-1].rightTangent={x:1,y:0}),r},Wi=4;function ro(e,o,t,a,i){const r=1-e,n=e*e,l=r*r,s=l*r,c=n*e;return s*o+3*l*e*t+3*r*n*a+c*i}function Xi(e,o,t,a,i){const r=1-e;return 3*r*r*(t-o)+6*r*e*(a-t)+3*e*e*(i-a)}function Yi(e,o,t,a,i){const r=i-o;if(r<=1e-9)return 0;let n=(e-o)/r;for(let l=0;l<Wi;++l){const s=ro(n,o,t,a,i),c=Xi(n,o,t,a,i);if(Math.abs(c)<1e-9)break;const d=s-e;n-=d/c}return Math.max(0,Math.min(1,n))}function Ki(e,o,t,a,i,r,n,l,s){const c=o,d=t,h=o+a,p=t+i,f=r+l,m=n+s,b=r,y=n,g=Yi(e,c,h,f,b);return ro(g,d,p,m,y)}const Z=.333,le={interpolate:(e,o,t,a=!1)=>{if(o.interpolation==="Step")return o.value;let i=o.value,r=t.value;if(a){const s=Math.PI*2,c=r-i;c>Math.PI?r-=s:c<-Math.PI&&(r+=s)}if(o.interpolation==="Bezier"){const s=o.rightTangent?o.rightTangent.x:(t.frame-o.frame)*Z,c=o.rightTangent?o.rightTangent.y:0,d=t.leftTangent?t.leftTangent.x:-(t.frame-o.frame)*Z,h=t.leftTangent?t.leftTangent.y:0;return Ki(e,o.frame,i,s,c,t.frame,r,d,h)}const n=t.frame-o.frame;if(n<1e-9)return i;const l=(e-o.frame)/n;return i+(r-i)*l},scaleHandles:(e,o,t,a,i)=>{const r={};if(e.interpolation!=="Bezier")return r;if(o&&e.leftTangent){const n=a-o.frame,l=i-o.frame;if(Math.abs(n)>1e-5&&Math.abs(l)>1e-5){const s=l/n;r.leftTangent={x:e.leftTangent.x*s,y:e.leftTangent.y*s}}}if(t&&e.rightTangent){const n=t.frame-a,l=t.frame-i;if(Math.abs(n)>1e-5&&Math.abs(l)>1e-5){const s=l/n;r.rightTangent={x:e.rightTangent.x*s,y:e.rightTangent.y*s}}}return r},calculateTangents:(e,o,t,a)=>{if(a==="Ease"){const y=o?(e.frame-o.frame)*Z:10,g=t?(t.frame-e.frame)*Z:10;return{l:{x:-y,y:0},r:{x:g,y:0}}}if(!o&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!o){const y=(t.value-e.value)/(t.frame-e.frame),g=(t.frame-e.frame)*Z;return{l:{x:-10,y:0},r:{x:g,y:g*y}}}if(!t){const y=(e.value-o.value)/(e.frame-o.frame),g=(e.frame-o.frame)*Z;return{l:{x:-g,y:-g*y},r:{x:10,y:0}}}const i=e.frame-o.frame,r=e.value-o.value,n=i===0?0:r/i,l=t.frame-e.frame,s=t.value-e.value,c=l===0?0:s/l;if(n*c<=0){const y=i*Z,g=l*Z;return{l:{x:-y,y:0},r:{x:g,y:0}}}const d=t.frame-o.frame,h=t.value-o.value;let p=d===0?0:h/d;const f=3*Math.min(Math.abs(n),Math.abs(c));Math.abs(p)>f&&(p=Math.sign(p)*f);const m=i*Z,b=l*Z;return{l:{x:-m,y:-m*p},r:{x:b,y:b*p}}},constrainHandles:(e,o,t)=>{var i,r;const a={};if(e.leftTangent&&o){const n=e.frame-o.frame;if(n>.001){const l=n*Z;if(Math.abs(e.leftTangent.x)>l){const s=l/Math.abs(e.leftTangent.x);a.leftTangent={x:e.leftTangent.x*s,y:e.leftTangent.y*s}}e.leftTangent.x>0&&(a.leftTangent={x:0,y:((i=a.leftTangent)==null?void 0:i.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const n=t.frame-e.frame;if(n>.001){const l=n*Z;if(Math.abs(e.rightTangent.x)>l){const s=l/Math.abs(e.rightTangent.x);a.rightTangent={x:e.rightTangent.x*s,y:e.rightTangent.y*s}}e.rightTangent.x<0&&(a.rightTangent={x:0,y:((r=a.rightTangent)==null?void 0:r.y)??e.rightTangent.y})}}return a},calculateSoftFalloff:(e,o,t)=>{if(e>=o)return 0;const a=e/o;switch(t){case"Linear":return 1-a;case"Dome":return Math.sqrt(1-a*a);case"Pinpoint":return Math.pow(1-a,4);case"S-Curve":return .5*(1+Math.cos(a*Math.PI));default:return 1-a}}},Qe={updateNeighbors:(e,o)=>{const t=e[o],a=o===e.length-1,i=o-1;if(i>=0){const n={...e[i]};if(e[i]=n,n.interpolation==="Bezier"){const l=t.frame-n.frame;if(n.autoTangent){const s=e[i-1],{l:c,r:d}=le.calculateTangents(n,s,t,"Auto");n.leftTangent=c,n.rightTangent=d}else{const s=le.constrainHandles(n,e[i-1],t);Object.assign(n,s)}if(a&&l>1e-4){const s=l*.3,c=n.rightTangent||{x:10,y:0};if(c.x<s){const d=s/Math.max(1e-4,Math.abs(c.x));n.rightTangent={x:s,y:c.y*d}}}}}const r=o+1;if(r<e.length){const n={...e[r]};if(e[r]=n,n.interpolation==="Bezier")if(n.autoTangent){const l=e[r+1],{l:s,r:c}=le.calculateTangents(n,t,l,"Auto");n.leftTangent=s,n.rightTangent=c}else{const l=le.constrainHandles(n,t,e[r+1]);Object.assign(n,l)}}},inferInterpolation:(e,o)=>{const t=e.filter(a=>a.frame<o).sort((a,i)=>i.frame-a.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},Zi=ve(),Ji={durationFrames:300,fps:30,tracks:{}},Qi=(e,o)=>({sequence:Ji,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=o().sequence,a=JSON.parse(JSON.stringify(t));e(i=>{const r=[...i.undoStack,{type:"SEQUENCE",data:a}];return{undoStack:r.length>50?r.slice(1):r,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:a,sequence:i}=o();if(t.length===0)return!1;const r=t[t.length-1],n=t.slice(0,-1),s={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:r.data,undoStack:n,redoStack:[...a,s]}),!0},redo:()=>{const{undoStack:t,redoStack:a,sequence:i}=o();if(a.length===0)return!1;const r=a[a.length-1],n=a.slice(0,-1),s={type:"SEQUENCE",data:JSON.parse(JSON.stringify(i))};return e({sequence:r.data,undoStack:[...t,s],redoStack:n}),!0},setSequence:t=>{o().snapshot(),e({sequence:t})},addTrack:(t,a)=>{o().snapshot(),e(i=>i.sequence.tracks[t]?i:{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{id:t,type:"float",label:a,keyframes:[]}}}})},removeTrack:t=>{o().snapshot(),e(a=>{const i={...a.sequence.tracks};return delete i[t],{sequence:{...a.sequence,tracks:i},selectedTrackIds:a.selectedTrackIds.filter(r=>r!==t)}})},setTrackBehavior:(t,a)=>{o().snapshot(),e(i=>{const r=i.sequence.tracks[t];return r?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...r,postBehavior:a}}}}:i})},addKeyframe:(t,a,i,r)=>{e(n=>{const l=n.sequence.tracks[t];if(!l)return n;let s=r||"Bezier";r||(s=Qe.inferInterpolation(l.keyframes,a));const c=s==="Bezier",d={id:oe(),frame:a,value:i,interpolation:s,autoTangent:c,brokenTangents:!1},p=[...l.keyframes.filter(m=>Math.abs(m.frame-a)>.001),d].sort((m,b)=>m.frame-b.frame),f=p.findIndex(m=>m.id===d.id);if(s==="Bezier"){const m=f>0?p[f-1]:void 0,b=f<p.length-1?p[f+1]:void 0,{l:y,r:g}=le.calculateTangents(d,m,b,"Auto");d.leftTangent=y,d.rightTangent=g}return Qe.updateNeighbors(p,f),{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[t]:{...l,keyframes:p}}}}})},batchAddKeyframes:(t,a,i)=>{e(r=>{const n={...r.sequence.tracks};let l=!1;return a.forEach(({trackId:s,value:c})=>{n[s]||(n[s]={id:s,type:"float",label:s,keyframes:[]},l=!0);const d=n[s],h=[...d.keyframes],p=h.length>0?h[h.length-1]:null,f={id:oe(),frame:t,value:c,interpolation:i||"Linear",autoTangent:i==="Bezier",brokenTangents:!1};if(p)if(t>p.frame)h.push(f);else if(Math.abs(t-p.frame)<.001)f.id=p.id,h[h.length-1]=f;else{const m=h.filter(b=>Math.abs(b.frame-t)>.001);m.push(f),m.sort((b,y)=>b.frame-y.frame),d.keyframes=m,l=!0;return}else h.push(f);d.keyframes=h,l=!0}),l?{sequence:{...r.sequence,tracks:n}}:r})},removeKeyframe:(t,a)=>{o().snapshot(),e(i=>{const r=i.sequence.tracks[t];return r?{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...r,keyframes:r.keyframes.filter(n=>n.id!==a)}}}}:i})},updateKeyframe:(t,a,i)=>{e(r=>{const n=r.sequence.tracks[t];if(!n)return r;const l=n.keyframes.map(s=>s.id===a?{...s,...i}:s).sort((s,c)=>s.frame-c.frame);return{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...n,keyframes:l}}}}})},updateKeyframes:t=>{e(a=>{const i={...a.sequence.tracks};return t.forEach(({trackId:r,keyId:n,patch:l})=>{const s=i[r];if(s){const c=s.keyframes.findIndex(d=>d.id===n);if(c!==-1){const d=s.keyframes[c];l.interpolation==="Bezier"&&d.interpolation!=="Bezier"&&(l.autoTangent=!0),s.keyframes[c]={...d,...l}}}}),Object.keys(i).forEach(r=>{i[r].keyframes.sort((n,l)=>n.frame-l.frame)}),{sequence:{...a.sequence,tracks:i}}})},deleteSelectedKeyframes:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks},i=new Set(t.selectedKeyframeIds);return Object.keys(a).forEach(r=>{a[r]={...a[r],keyframes:a[r].keyframes.filter(n=>!i.has(`${r}::${n.id}`))}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks};return Object.keys(a).forEach(i=>{a[i]={...a[i],keyframes:[]}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{o().snapshot(),e({sequence:{...o().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{o().snapshot(),e(a=>{const i={...a.sequence.tracks};return a.selectedKeyframeIds.forEach(r=>{const[n,l]=r.split("::"),s=i[n];if(s){const c=s.keyframes.findIndex(h=>h.id===l);if(c===-1)return;const d=s.keyframes[c];if(t==="Split")s.keyframes[c]={...d,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let h=d.rightTangent,p=d.leftTangent;if(h&&p){const f=Math.sqrt(h.x*h.x+h.y*h.y),m=Math.sqrt(p.x*p.x+p.y*p.y);h={x:-p.x*(f/Math.max(.001,m)),y:-p.y*(f/Math.max(.001,m))}}s.keyframes[c]={...d,rightTangent:h,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const h=s.keyframes[c-1],p=s.keyframes[c+1],{l:f,r:m}=le.calculateTangents(d,h,p,t);s.keyframes[c]={...d,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:f,rightTangent:m}}}}),{sequence:{...a.sequence,tracks:i}}})},setGlobalInterpolation:(t,a)=>{o().snapshot(),e(i=>{const r={...i.sequence.tracks};return Object.keys(r).forEach(n=>{const l=r[n];l.keyframes.length!==0&&l.keyframes.forEach((s,c)=>{if(s.interpolation=t,t==="Bezier"&&a){const d=l.keyframes[c-1],h=l.keyframes[c+1],{l:p,r:f}=le.calculateTangents(s,d,h,a);s.leftTangent=p,s.rightTangent=f,s.autoTangent=a==="Auto",s.brokenTangents=!1}})}),{sequence:{...i.sequence,tracks:r}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:a}=o();if(a.length===0)return;let i=1/0;a.forEach(n=>{var d,h;const[l,s]=n.split("::"),c=(h=(d=t.tracks[l])==null?void 0:d.keyframes.find(p=>p.id===s))==null?void 0:h.frame;c!==void 0&&c<i&&(i=c)});const r=[];a.forEach(n=>{var d;const[l,s]=n.split("::"),c=(d=t.tracks[l])==null?void 0:d.keyframes.find(h=>h.id===s);c&&r.push({relativeFrame:c.frame-i,value:c.value,interpolation:c.interpolation,leftTangent:c.leftTangent,rightTangent:c.rightTangent,originalTrackId:l})}),r.length>0&&e({clipboard:r})},pasteKeyframes:t=>{const{clipboard:a,currentFrame:i}=o();a&&(o().snapshot(),e(r=>{const n={...r.sequence.tracks},l=t!==void 0?t:i;return a.forEach(s=>{const c=n[s.originalTrackId];if(c){const d=l+s.relativeFrame,h={id:oe(),frame:d,value:s.value,interpolation:s.interpolation,leftTangent:s.leftTangent,rightTangent:s.rightTangent,autoTangent:!1,brokenTangents:!1};c.keyframes=[...c.keyframes.filter(p=>Math.abs(p.frame-d)>.001),h].sort((p,f)=>p.frame-f.frame)}}),{sequence:{...r.sequence,tracks:n}}}))},duplicateSelection:()=>{o().copySelectedKeyframes(),o().pasteKeyframes(o().currentFrame)},loopSelection:t=>{const a=o();if(a.selectedKeyframeIds.length<1)return;a.snapshot();let i=1/0,r=-1/0;if(a.selectedKeyframeIds.forEach(l=>{const[s,c]=l.split("::"),d=a.sequence.tracks[s],h=d==null?void 0:d.keyframes.find(p=>p.id===c);h&&(h.frame<i&&(i=h.frame),h.frame>r&&(r=h.frame))}),i===1/0||r===-1/0)return;const n=Math.max(1,r-i);e(l=>{const s={...l.sequence.tracks};for(let c=1;c<=t;c++){const d=n*c;l.selectedKeyframeIds.forEach(h=>{const[p,f]=h.split("::"),m=s[p];if(!m)return;const b=m.keyframes.find(y=>y.id===f);if(b){const y=b.frame+d,g={...b,id:oe(),frame:y};m.keyframes=[...m.keyframes.filter(v=>Math.abs(v.frame-y)>.001),g]}})}return Object.values(s).forEach(c=>c.keyframes.sort((d,h)=>d.frame-h.frame)),{sequence:{...l.sequence,tracks:s}}})},captureCameraFrame:(t,a=!1,i)=>{const r=we()||Zi.activeCamera;if(!r)return;a||o().snapshot();const n=ye.getUnifiedFromEngine(),l=r.quaternion,s=new Re().setFromQuaternion(l),c=[{id:"camera.unified.x",val:n.x,label:"Position X"},{id:"camera.unified.y",val:n.y,label:"Position Y"},{id:"camera.unified.z",val:n.z,label:"Position Z"},{id:"camera.rotation.x",val:s.x,label:"Rotation X"},{id:"camera.rotation.y",val:s.y,label:"Rotation Y"},{id:"camera.rotation.z",val:s.z,label:"Rotation Z"}];e(d=>{const h={...d.sequence.tracks},p=h["camera.unified.x"],f=!p||p.keyframes.length===0,m=i||(f?"Linear":"Bezier");return c.forEach(b=>{let y=h[b.id];y||(y={id:b.id,type:"float",label:b.label,keyframes:[],hidden:!1},h[b.id]=y);const g={id:oe(),frame:t,value:b.val,interpolation:m,autoTangent:m==="Bezier",brokenTangents:!1},I=[...y.keyframes.filter(x=>Math.abs(x.frame-t)>.001),g].sort((x,L)=>x.frame-L.frame),M=I.findIndex(x=>x.id===g.id);if(m==="Bezier"){const x=M>0?I[M-1]:void 0,L=M<I.length-1?I[M+1]:void 0,{l:P,r:A}=le.calculateTangents(g,x,L,"Auto");g.leftTangent=P,g.rightTangent=A}Qe.updateNeighbors(I,M),y.keyframes=I}),{sequence:{...d.sequence,tracks:h}}})},simplifySelectedKeys:(t=.01)=>{o().snapshot(),e(a=>{const i=a,r={...i.sequence.tracks},n=new Set(i.selectedKeyframeIds),l={};i.selectedKeyframeIds.forEach(c=>{const[d,h]=c.split("::");l[d]||(l[d]=[]);const p=i.sequence.tracks[d],f=p==null?void 0:p.keyframes.find(m=>m.id===h);f&&l[d].push(f)});const s=[];return Object.entries(l).forEach(([c,d])=>{const h=r[c];if(!h)return;const p={...h};if(r[c]=p,d.length<3)return;const f=d.sort((b,y)=>b.frame-y.frame);p.keyframes=p.keyframes.filter(b=>!n.has(`${c}::${b.id}`));const m=Ui(f,t);p.keyframes=[...p.keyframes,...m].sort((b,y)=>b.frame-y.frame),m.forEach(b=>s.push(`${c}::${b.id}`))}),{sequence:{...i.sequence,tracks:r},selectedKeyframeIds:s}})}}),rt=Ot()(Nt((e,o,t)=>({...$i(e,o),...Bi(e),...Qi(e,o)})));typeof window<"u"&&(window.useAnimationStore=rt);const Te=ve(),He=e=>{const o={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const a=e[t];if(a&&typeof a=="object"&&"isColor"in a)o[t]="#"+a.getHexString();else if(a&&typeof a=="object"&&("isVector2"in a||"isVector3"in a)){const i={...a};delete i.isVector2,delete i.isVector3,o[t]=i}else o[t]=a}),o},no=e=>{const o=Y.get(e),t=o&&o.defaultPreset?o.defaultPreset:{},a={version:5,name:e,formula:e,features:{}};return R.getAll().forEach(i=>{const r={};Object.entries(i.params).forEach(([n,l])=>{l.composeFrom||(r[n]=l.default)}),a.features[i.id]=He(r)}),t.features&&Object.entries(t.features).forEach(([i,r])=>{a.features[i]?a.features[i]={...a.features[i],...He(r)}:a.features[i]=He(r)}),t.lights&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.lights=t.lights),t.renderMode&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),a.cameraMode=t.cameraMode||"Orbit",a.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},a.lights=[],a.animations=t.animations||[],a.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},a.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},a.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},a.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},a.targetDistance=t.targetDistance||3.5,a.duration=t.duration||300,a.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},a},er=(e,o,t)=>{const a=t(),i=e.features||{};if(e.renderMode&&(i.lighting||(i.lighting={}),i.lighting.renderMode===void 0&&(i.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),i.atmosphere&&!i.ao){const v={};i.atmosphere.aoIntensity!==void 0&&(v.aoIntensity=i.atmosphere.aoIntensity),i.atmosphere.aoSpread!==void 0&&(v.aoSpread=i.atmosphere.aoSpread),i.atmosphere.aoMode!==void 0&&(v.aoMode=i.atmosphere.aoMode),i.atmosphere.aoEnabled!==void 0&&(v.aoEnabled=i.atmosphere.aoEnabled),Object.keys(v).length>0&&(i.ao=v)}const r=new Set(["compilerHardCap","precisionMode","bufferPrecision"]);if(R.getAll().forEach(v=>{const I=`set${v.id.charAt(0).toUpperCase()+v.id.slice(1)}`,M=a[I];if(typeof M=="function"){const x=i[v.id],L={},P=v.id==="quality"?t().quality:null;if(v.state&&Object.assign(L,v.state),Object.entries(v.params).forEach(([A,D])=>{if(v.id==="quality"&&r.has(A)&&P){L[A]=P[A];return}if(x&&x[A]!==void 0){let _=x[A];D.type==="vec2"&&_&&!(_ instanceof J)?_=new J(_.x,_.y):D.type==="vec3"&&_&&!(_ instanceof E)?_=new E(_.x,_.y,_.z):D.type==="color"&&_&&!(_ instanceof G)&&(_=new G(_)),L[A]=_}else if(L[A]===void 0){let _=D.default;_&&typeof _=="object"&&(typeof _.clone=="function"?_=_.clone():Array.isArray(_)?_=[..._]:_={..._}),L[A]=_}}),v.id==="lighting"&&x){if(x.lights)L.lights=Et(x.lights.map(A=>({...A,type:A.type||"Point",rotation:A.rotation||{x:0,y:0,z:0}})));else if(x.light0_posX!==void 0){const A=[];for(let D=0;D<3;D++)if(x[`light${D}_posX`]!==void 0){let _=x[`light${D}_color`]||"#ffffff";_.getHexString&&(_="#"+_.getHexString()),A.push({type:"Point",position:{x:x[`light${D}_posX`],y:x[`light${D}_posY`],z:x[`light${D}_posZ`]},rotation:{x:0,y:0,z:0},color:_,intensity:x[`light${D}_intensity`]??1,falloff:x[`light${D}_falloff`]??0,falloffType:x[`light${D}_type`]?"Linear":"Quadratic",fixed:x[`light${D}_fixed`]??!1,visible:x[`light${D}_visible`]??D===0,castShadow:x[`light${D}_castShadow`]??!0})}A.length>0&&(L.lights=A)}}v.id==="materials"&&x&&x.envMapVisible!==void 0&&x.envBackgroundStrength===void 0&&(L.envBackgroundStrength=x.envMapVisible?1:0),M(L)}}),e.lights&&e.lights.length>0){const v=a.setLighting;if(typeof v=="function"){const I=Et(e.lights.map(M=>({...M,type:M.type||"Point",rotation:M.rotation||{x:0,y:0,z:0}})));v({lights:I})}}e.sequence&&rt.getState().setSequence(e.sequence),a.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&o({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const n=e.cameraPos||{x:0,y:0,z:3.5},l=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},s=e.targetDistance||3.5,c=e.cameraRot||{x:0,y:0,z:0,w:1},d=l.x+l.xL+n.x,h=l.y+l.yL+n.y,p=l.z+l.zL+n.z,f=z.split(d),m=z.split(h),b=z.split(p),y={x:f.high,y:m.high,z:b.high,xL:f.low,yL:m.low,zL:b.low};o({cameraRot:c,targetDistance:s,sceneOffset:y,cameraMode:e.cameraMode||t().cameraMode}),Te.activeCamera&&Te.virtualSpace&&Te.virtualSpace.applyCameraState(Te.activeCamera,{position:{x:0,y:0,z:0},rotation:c,sceneOffset:y,targetDistance:s});const g={position:{x:0,y:0,z:0},rotation:c,sceneOffset:y,targetDistance:s};Te.pendingTeleport=g,w.emit("camera_teleport",g),e.duration&&rt.getState().setDuration(e.duration),e.formula==="Modular"&&a.refreshPipeline(),a.refreshHistogram(),w.emit("reset_accum",void 0)},tr={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},or=(e,o,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const a=no(e.formula);a.formula="";const i=R.getDictionary();return new at(a,i).encode(e,o)}catch(a){return console.error("Sharing: Failed to generate share string",a),""}},$r=e=>{if(!e)return null;try{const o=R.getDictionary(),a=new at(tr,o).decode(e);if(a&&a.formula){const i=no(a.formula);return new at(i,o).decode(e)}}catch(o){console.error("Sharing: Failed to load share string",o)}return null},et=ve();class ar{constructor(){S(this,"pendingCam");S(this,"binders",new Map);S(this,"overriddenTracks",new Set);S(this,"lastCameraIndex",-1);S(this,"animStore",null);S(this,"fractalStore",null);this.pendingCam={rot:new Re,unified:new E,rotDirty:!1,unifiedDirty:!1}}connect(o,t){this.animStore=o,this.fractalStore=t}setOverriddenTracks(o){this.overriddenTracks=o}getBinder(o){if(this.binders.has(o))return this.binders.get(o);let t=()=>{};if(o==="camera.active_index")t=a=>{const i=Math.round(a);if(i!==this.lastCameraIndex){const r=this.fractalStore.getState(),n=r.savedCameras;n&&n[i]&&(r.selectCamera(n[i].id),this.lastCameraIndex=i)}};else if(o.startsWith("camera.")){const a=o.split("."),i=a[1],r=a[2];i==="unified"?t=n=>{this.pendingCam.unified[r]=n,this.pendingCam.unifiedDirty=!0}:i==="rotation"&&(t=n=>{this.pendingCam.rot[r]=n,this.pendingCam.rotDirty=!0})}else if(o.startsWith("lights.")){const a=o.split("."),i=parseInt(a[1]),r=a[2];let n="";r==="position"?n=`pos${a[3].toUpperCase()}`:r==="color"?n="color":n=r;const l=`lighting.light${i}_${n}`;return this.getBinder(l)}else if(o.startsWith("lighting.light")){const a=o.match(/lighting\.light(\d+)_(\w+)/);if(a){const i=parseInt(a[1]),r=a[2],n=this.fractalStore.getState();if(r==="intensity")t=l=>n.updateLight({index:i,params:{intensity:l}});else if(r==="falloff")t=l=>n.updateLight({index:i,params:{falloff:l}});else if(r.startsWith("pos")){const l=r.replace("pos","").toLowerCase();t=s=>{var h;const d=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[i];if(d){const p={...d.position,[l]:s};n.updateLight({index:i,params:{position:p}})}}}else if(r.startsWith("rot")){const l=r.replace("rot","").toLowerCase();t=s=>{var h;const d=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[i];if(d){const p={...d.rotation,[l]:s};n.updateLight({index:i,params:{rotation:p}})}}}}}else if(o.includes(".")){const a=o.split("."),i=a[0],r=a[1];if(R.get(i)){const l=this.fractalStore.getState(),s=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,c=l[s];if(c&&typeof c=="function"){const d=r.match(/^(vec[23][ABC])_(x|y|z)$/);if(d){const h=d[1],p=d[2];t=f=>{var y;const b=(y=this.fractalStore.getState()[i])==null?void 0:y[h];if(b){const g=b.clone();g[p]=f,c({[h]:g})}}}else t=h=>c({[r]:h})}else console.warn(`AnimationEngine: Setter ${s} not found for feature ${i}`)}}else{const a=this.fractalStore.getState(),i="set"+o.charAt(0).toUpperCase()+o.slice(1);typeof a[i]=="function"&&(t=r=>a[i](r))}return this.binders.set(o,t),t}tick(o){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const a=t.fps,i=t.currentFrame,r=t.durationFrames,n=t.loopMode,l=o*a;let s=i+l;if(s>=r)if(n==="Once"||t.isRecordingModulation){s=r,this.scrub(r),this.animStore.setState({isPlaying:!1,currentFrame:r}),t.isRecordingModulation&&t.stopModulationRecording();return}else s=0;this.animStore.setState({currentFrame:s}),this.scrub(s)}scrub(o){if(!this.animStore)return;const{sequence:t,isPlaying:a,isRecording:i,recordCamera:r}=this.animStore.getState(),n=Object.values(t.tracks);this.syncBuffersFromEngine();const l=a&&i&&r;for(let s=0;s<n.length;s++){const c=n[s];if(this.overriddenTracks.has(c.id)||c.keyframes.length===0||c.type!=="float"||c.id.includes("camera.position")||c.id.includes("camera.offset")||l&&c.id.startsWith("camera."))continue;const d=this.interpolate(c,o);this.getBinder(c.id)(d)}this.commitState()}syncBuffersFromEngine(){const o=we()||et.activeCamera;if(o){this.pendingCam.rot.setFromQuaternion(o.quaternion);const t=et.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+o.position.x,t.y+t.yL+o.position.y,t.z+t.zL+o.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(o,t){const a=o.keyframes;if(a.length===0)return 0;const i=a[0],r=a[a.length-1],n=o.id.startsWith("camera.rotation")||o.id.includes("rot")||o.id.includes("phase")||o.id.includes("twist");if(t>r.frame){const l=o.postBehavior||"Hold";if(l==="Hold")return r.value;if(l==="Continue"){let f=0;if(a.length>1){const m=a[a.length-2];r.interpolation==="Linear"?f=(r.value-m.value)/(r.frame-m.frame):r.interpolation==="Bezier"&&(r.leftTangent&&Math.abs(r.leftTangent.x)>.001?f=r.leftTangent.y/r.leftTangent.x:f=(r.value-m.value)/(r.frame-m.frame))}return r.value+f*(t-r.frame)}const s=r.frame-i.frame;if(s<=.001)return r.value;const c=t-i.frame,d=Math.floor(c/s),h=i.frame+c%s,p=this.evaluateCurveInternal(a,h,n);if(l==="Loop")return p;if(l==="PingPong"){if(d%2===1){const m=r.frame-c%s;return this.evaluateCurveInternal(a,m,n)}return p}if(l==="OffsetLoop"){const f=r.value-i.value;return p+f*d}}return t<i.frame?i.value:this.evaluateCurveInternal(a,t,n)}evaluateCurveInternal(o,t,a){for(let i=0;i<o.length-1;i++){const r=o[i],n=o[i+1];if(t>=r.frame&&t<=n.frame)return le.interpolate(t,r,n,a)}return o[o.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){et.shouldSnapCamera=!0;const o=new be().setFromEuler(this.pendingCam.rot),t={x:o.x,y:o.y,z:o.z,w:o.w},a=z.split(this.pendingCam.unified.x),i=z.split(this.pendingCam.unified.y),r=z.split(this.pendingCam.unified.z);w.emit($.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:a.high,y:i.high,z:r.high,xL:a.low,yL:i.low,zL:r.low}}),this.fractalStore.setState({cameraRot:t})}}}const ir=new ar;class rr{constructor(){S(this,"_pendingWork",null);S(this,"_newCyclePending",!1)}queue(o,t){this._pendingWork=t,this._newCyclePending=!0,w.emit($.IS_COMPILING,o)}consumeNewCycle(){return this._newCyclePending?(this._newCyclePending=!1,!0):!1}flush(){if(this._pendingWork){const o=this._pendingWork;this._pendingWork=null,o()}}}const Ft=new rr,V=ve(),K=Ot()(Nt((e,o,t)=>({...Ro(e,o),...Lo(e,o),...Oo(e,o),...Vo(e,o),...Go(e,o),...Li(e,o),...Hi(e,o),formula:"Mandelbulb",projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(a,i={})=>{const r=o(),n=r.formula;if(n===a&&a!=="Modular")return;i.skipDefaultPreset||(o().resetParamHistory(),e({undoStack:[],redoStack:[]}));const l=r.projectSettings.name;let s=l;(l===n||l==="Untitled"||l==="Custom Preset")&&(s=a),e({formula:a,projectSettings:{...r.projectSettings,name:s}}),Ft.queue("Loading Preview...",()=>{if(w.emit($.CONFIG,{formula:a,pipeline:r.pipeline,graph:r.graph}),a!=="Modular"&&!i.skipDefaultPreset){const c=Y.get(a),d=c&&c.defaultPreset?JSON.parse(JSON.stringify(c.defaultPreset)):{formula:a};d.features||(d.features={});const h=o();if(R.getEngineFeatures().forEach(f=>{const m=h[f.id];if(!m)return;const b=d.features[f.id]||{},y={},g=f.engineConfig.toggleParam;m[g]!==void 0&&b[g]===void 0&&(y[g]=m[g]),Object.entries(f.params).forEach(([v,I])=>{I.onUpdate==="compile"&&m[v]!==void 0&&b[v]===void 0&&(y[v]=m[v])}),d.features[f.id]||(d.features[f.id]={}),Object.assign(d.features[f.id],y)}),o().lockSceneOnSwitch){const f=o().getPreset(),m={...f.features||{}},b=d.features||{};b.coreMath&&(m.coreMath=b.coreMath),b.geometry&&(m.geometry=b.geometry);const y={...f,formula:a,features:m};o().loadPreset(y)}else o().loadPreset(d)}o().handleInteractionEnd(),V.post({type:"CONFIG_DONE"})})},setProjectSettings:a=>e(i=>{const r={...i.projectSettings,...a};return a.name&&a.name!==i.projectSettings.name?(r.version=0,{projectSettings:r,lastSavedHash:null}):{projectSettings:r}}),prepareExport:()=>{const a=o(),i=a.getPreset({includeScene:!0}),{version:r,name:n,...l}=i,s=JSON.stringify(l);if(a.lastSavedHash===null||a.projectSettings.version===0){const c=Math.max(1,a.projectSettings.version+1);return e({projectSettings:{...a.projectSettings,version:c},lastSavedHash:s}),c}if(a.lastSavedHash!==s){const c=a.projectSettings.version+1;return e({projectSettings:{...a.projectSettings,version:c},lastSavedHash:s}),c}return a.projectSettings.version},setAnimations:a=>{const i=o().animations,r=a.map(n=>{const l=i.find(s=>s.id===n.id);if(!l)return n;if(n.period!==l.period&&n.period>0){const s=performance.now()/1e3,c=(s/l.period+l.phase-s/n.period)%1;return{...n,phase:(c+1)%1}}return n});e({animations:r})},setLiveModulations:a=>e({liveModulations:a}),loadPreset:a=>{a._formulaDef&&!Y.get(a.formula)&&Y.register(a._formulaDef),o().resetParamHistory();const i=Y.get(a.formula),r=i?i.id:a.formula;e({formula:r}),w.emit($.CONFIG,{formula:r});let n=a.name;(!n||n==="Untitled"||n==="Custom Preset")&&(n=r),e({projectSettings:{name:n,version:0},lastSavedHash:null}),er(a,e,o),setTimeout(()=>{const l=o().getPreset({includeScene:!0}),{version:s,name:c,...d}=l;e({lastSavedHash:JSON.stringify(d)})},50)},loadScene:({def:a,preset:i})=>{if(a&&(Y.get(a.id)||Y.register(a),w.emit($.REGISTER_FORMULA,{id:a.id,shader:a.shader})),!V.isBooted&&!V.bootSent){o().loadPreset(i);return}Ft.queue("Loading Preview...",()=>{o().loadPreset(i);const r=so(o());w.emit($.CONFIG,r);const n=o().sceneOffset;if(n){const l={x:n.x,y:n.y,z:n.z,xL:n.xL??0,yL:n.yL??0,zL:n.zL??0};V.setShadowOffset(l),V.post({type:"OFFSET_SET",offset:l})}V.post({type:"CONFIG_DONE"})})},getPreset:a=>{var l,s;const i=o(),r={version:i.projectSettings.version,name:i.projectSettings.name,formula:i.formula,features:{}};if((a==null?void 0:a.includeScene)!==!1){if(r.cameraPos={x:0,y:0,z:0},V.activeCamera&&V.virtualSpace){const c=V.virtualSpace.getUnifiedCameraState(V.activeCamera,i.targetDistance);r.cameraRot=c.rotation,r.sceneOffset=c.sceneOffset,r.targetDistance=c.targetDistance}else r.cameraRot=i.cameraRot,r.sceneOffset=i.sceneOffset,r.targetDistance=i.targetDistance;r.cameraMode=i.cameraMode,r.lights=[],r.renderMode=i.renderMode,r.quality={aaMode:i.aaMode,aaLevel:i.aaLevel,msaa:i.msaaSamples,accumulation:i.accumulation}}R.getAll().forEach(c=>{const d=i[c.id];d&&(r.features||(r.features={}),r.features[c.id]=He(d))}),r.animations=i.animations,i.savedCameras.length>0&&(r.savedCameras=i.savedCameras.map(c=>({id:c.id,label:c.label,position:c.position,rotation:c.rotation,sceneOffset:c.sceneOffset,targetDistance:c.targetDistance,optics:c.optics}))),i.formula==="Modular"&&(r.graph=i.graph,r.pipeline=i.pipeline);try{const c=(s=(l=window.useAnimationStore)==null?void 0:l.getState)==null?void 0:s.call(l);c&&(r.sequence=c.sequence,r.duration=c.durationFrames)}catch(c){console.warn("Failed to save animation sequence:",c)}return r},getShareString:a=>{const i=o().getPreset({includeScene:!0}),r=o().advancedMode;return or(i,r,a)}}))),Br=e=>e.isUserInteracting||e.interactionMode!=="none",Vr=e=>{const o=e.dpr||1;return e.resolutionMode==="Fixed"?[Math.max(1,Math.floor(e.fixedResolution[0]*o)),Math.max(1,Math.floor(e.fixedResolution[1]*o))]:e.canvasPixelSize},Gr=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting||e.isBucketRendering||e.tutorialActive&&e.tutorialLessonId===1)return!0;const o=R.getAll();for(const a of o)if((t=a.interactionConfig)!=null&&t.blockCamera&&a.interactionConfig.activeParam){const i=e[a.id];if(i&&i[a.interactionConfig.activeParam])return!0}return!1},so=e=>{var a;const o={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:{...e.quality}};if(R.getAll().forEach(i=>{const r=e[i.id];r&&(o[i.id]={...r})}),e.hardwareProfile){const i=e.hardwareProfile,r=o.quality;r&&(r.precisionMode=Math.max(r.precisionMode??0,i.caps.precisionMode),r.bufferPrecision=Math.max(r.bufferPrecision??0,i.caps.bufferPrecision),r.compilerHardCap=Math.min(r.compilerHardCap??Pe,i.caps.compilerHardCap)),o.compilerHardCap=((a=o.quality)==null?void 0:a.compilerHardCap)??o.compilerHardCap}return o};Ni(so);const qr=()=>{const e=K.getState();ir.connect(window.useAnimationStore,K),V.isPaused=e.isPaused,V.setPreviewSampleCap(e.sampleCap),V.onBooted=()=>{const t=K.getState(),a=t.sceneOffset;if(a){const i={x:a.x,y:a.y,z:a.z,xL:a.xL??0,yL:a.yL??0,zL:a.zL??0};V.setShadowOffset(i),V.post({type:"OFFSET_SET",offset:i})}V.setPreviewSampleCap(t.sampleCap)},K.subscribe(t=>t.isPaused,t=>{V.isPaused=t}),K.subscribe(t=>t.sampleCap,t=>{V.setPreviewSampleCap(t)}),K.subscribe(t=>{var a;return(a=t.lighting)==null?void 0:a.renderMode},t=>{if(t===void 0)return;const a=t===1?"PathTracing":"Direct";K.getState().renderMode!==a&&K.setState({renderMode:a})});let o;K.subscribe(t=>{var a;return(a=t.optics)==null?void 0:a.camType},t=>{var r;if(t===void 0)return;const a=o!==void 0&&o<.5,i=t>.5&&t<1.5;if(a&&i){const n=K.getState();if(!n.activeCameraId){const l=((r=n.optics)==null?void 0:r.camFov)||60;let s=V.lastMeasuredDistance;(!s||s>=1e3||s<=0)&&(s=n.targetDistance||3.5);const c=s*Math.tan(l*Math.PI/360),d=n.setOptics;typeof d=="function"&&d({orthoScale:c})}}o=t}),w.on($.BUCKET_STATUS,({isRendering:t})=>{const a=K.getState();a.setIsBucketRendering(t),a.setIsExporting(t)})};typeof window<"u"&&(window.__store=K);const nr=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("polyline",{points:"6 9 12 15 18 9"})}),Ur=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("polyline",{points:"18 15 12 9 6 15"})}),Wr=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("polyline",{points:"15 18 9 12 15 6"})}),Xr=()=>u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("polyline",{points:"9 18 15 12 9 6"})}),Yr=()=>u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("polyline",{points:"9 18 15 12 9 6"})}),Kr=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"})}),Zr=()=>u.jsx("svg",{width:"100%",height:"100%",viewBox:"0 0 10 10",children:u.jsx("path",{d:"M 6 10 L 10 6 L 10 10 Z",fill:"currentColor",opacity:"0.5"})}),Jr=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("line",{x1:"4",y1:"9",x2:"20",y2:"9"}),u.jsx("line",{x1:"4",y1:"15",x2:"20",y2:"15"})]}),Qr=()=>u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("path",{d:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})}),en=()=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),u.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),tn=()=>u.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("line",{x1:"3",y1:"12",x2:"21",y2:"12"}),u.jsx("line",{x1:"3",y1:"6",x2:"21",y2:"6"}),u.jsx("line",{x1:"3",y1:"18",x2:"21",y2:"18"})]}),on=()=>u.jsx("svg",{width:"16",height:"16",viewBox:"0 0 512 512",fill:"currentColor",children:u.jsx("path",{d:"M0,0v512h512V106.9l-6.5-7.3L412.4,6.5L405.1,0H0z M46.5,46.5h69.8v139.6h279.3V56.7l69.8,69.8v338.9h-46.5V256H93.1v209.5H46.5V46.5z M162.9,46.5H256V93h46.5V46.5H349v93.1H162.9V46.5z M139.6,302.5h232.7v162.9H139.6V302.5z"})}),an=()=>u.jsx("svg",{width:"16",height:"16",viewBox:"190 230 680 620",fill:"currentColor",children:u.jsx("path",{d:"M257.3312 451.84V332.8c0-42.3936 34.2016-76.8 76.4416-76.8h107.8272c29.5936 0 56.5248 17.152 69.12 44.032l14.8992 31.6416a25.4976 25.4976 0 0 0 23.04 14.6944h192.8192c42.1888 0 76.4416 34.3552 76.4416 76.8v28.672a76.8 76.8 0 0 1 50.9952 88.064l-43.3152 217.6A76.544 76.544 0 0 1 750.6432 819.2H324.5568a76.544 76.544 0 0 1-74.9568-61.7472l-43.3152-217.6a76.8512 76.8512 0 0 1 51.0464-88.0128z m509.5936-3.84v-24.832c0-14.1312-11.4176-25.6-25.4464-25.6h-192.8192a76.4416 76.4416 0 0 1-69.12-44.032l-14.848-31.6928A25.4976 25.4976 0 0 0 441.6 307.2H333.7216a25.5488 25.5488 0 0 0-25.4976 25.6v115.2h458.6496z m-485.6832 51.2a25.6 25.6 0 0 0-24.9856 30.6176l43.3152 217.6c2.4064 11.9808 12.8512 20.5824 24.9856 20.5824h426.0864a25.4976 25.4976 0 0 0 24.9856-20.5824l43.3152-217.6a25.7024 25.7024 0 0 0-24.9856-30.6176H281.2416z"})}),rn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("circle",{cx:"12",cy:"12",r:"10"}),u.jsx("line",{x1:"12",cy:"16",x2:"12",y2:"12"}),u.jsx("line",{x1:"12",cy:"8",x2:"12.01",y2:"8"})]}),nn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("circle",{cx:"12",cy:"12",r:"10"}),u.jsx("path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}),u.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),sn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[u.jsx("path",{d:"M3 10h10a5 5 0 0 1 5 5v2"}),u.jsx("path",{d:"M7 6l-4 4 4 4"})]}),ln=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[u.jsx("path",{d:"M21 10h-10a5 5 0 0 0 -5 5v2"}),u.jsx("path",{d:"M17 6l4 4 -4 4"})]}),cn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[u.jsx("path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}),u.jsx("path",{d:"M3 3v5h5"})]}),dn=()=>u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("polyline",{points:"20 6 9 17 4 12"})}),un=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),u.jsx("polyline",{points:"17 8 12 3 7 8"}),u.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),fn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),u.jsx("polyline",{points:"7 10 12 15 17 10"}),u.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),pn=()=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"4",children:[u.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),u.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),hn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),u.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]}),mn=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("path",{d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),gn=()=>u.jsxs("svg",{width:"64",height:"64",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"5",y:"2",width:"14",height:"20",rx:"2",ry:"2"}),u.jsx("path",{d:"M12 18h.01"})]}),yn=({className:e})=>u.jsxs("svg",{className:e,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[u.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),u.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),bn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polyline",{points:"16 18 22 12 16 6"}),u.jsx("polyline",{points:"8 6 2 12 8 18"})]}),vn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("circle",{cx:"12",cy:"12",r:"10"}),u.jsx("path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}),u.jsx("line",{x1:"9",y1:"9",x2:"9.01",y2:"9"}),u.jsx("line",{x1:"15",y1:"9",x2:"15.01",y2:"9"})]}),xn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),u.jsx("polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}),u.jsx("line",{x1:"12",y1:"22.08",x2:"12",y2:"12"})]}),Sn=()=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",strokeDasharray:"4 4"}),u.jsx("path",{d:"M9 12l2 2 4-4"})]}),_n=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"})}),wn=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("circle",{cx:"12",cy:"12",r:"10"})}),In=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 512 512",fill:"currentColor",children:u.jsx("path",{d:"M167.4,59.1l-6.2,8l-23.4,31.4h-19.7V78.8H39.4v19.7H0v354.5h512V98.5H374.2l-23.4-31.4l-6.2-8H167.4z M187.1,98.5h137.8l23.4,31.4l6.2,8h118.2v78.8H358.2c-20.5-35.2-58.7-59.1-102.2-59.1s-81.6,23.9-102.2,59.1H39.4v-78.8h118.2l6.2-8L187.1,98.5z M393.8,157.5v39.4h39.4v-39.4H393.8z M256,196.9c43.8,0,78.8,35,78.8,78.8s-35,78.8-78.8,78.8s-78.8-35-78.8-78.8S212.2,196.9,256,196.9z M39.4,256h100.3c-1.1,6.3-1.8,13.1-1.8,19.7c0,65,53.2,118.2,118.2,118.2s118.2-53.2,118.2-118.2c0-6.6-0.8-13.4-1.8-19.7h100.3v157.5H39.4V256z"})}),Cn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M12 3v18"}),u.jsx("path",{d:"M3 12h18"}),u.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Mn=()=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"})}),Rn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),u.jsx("polyline",{points:"2 17 12 22 22 17"}),u.jsx("polyline",{points:"2 12 12 17 22 12"})]}),En=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M12 2l-5 9h10l-5 9"}),u.jsx("path",{d:"M12 2v20"})]}),Ln=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}),u.jsx("path",{d:"M18 22V8a2 2 0 0 0-2-2H2"})]}),Tn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),u.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"}),u.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"})]}),Pn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),u.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),u.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),u.jsx("path",{d:"M3 14h7v7H3z",fill:"currentColor",stroke:"none"})]}),kn=()=>u.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:u.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"})}),zn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),u.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),u.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),u.jsx("path",{d:"M10 7h4"}),u.jsx("path",{d:"M17 10v4"})]}),An=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M12 22V8"}),u.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),u.jsx("circle",{cx:"12",cy:"5",r:"3"})]}),Dn=()=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M12 18V8"}),u.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),u.jsx("circle",{cx:"12",cy:"5",r:"3"}),u.jsx("line",{x1:"3",y1:"21",x2:"21",y2:"3",stroke:"currentColor",opacity:"0.9"})]}),Fn=({status:e})=>{let o="currentColor";e==="keyed"||e==="partial"?o="#f59e0b":(e==="dirty"||e==="keyed-dirty")&&(o="#ef4444");const t=e==="keyed"||e==="keyed-dirty"?o:"none";return u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:o,strokeWidth:"2.5",children:u.jsx("path",{d:"M12 2L2 12l10 10 10-10L12 2z",fill:t})})},On=({active:e})=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),u.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]}),Nn=()=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[u.jsx("path",{d:"M10 13l-4 4"}),u.jsx("path",{d:"M14 11l4 -4"})]}),jn=({active:e})=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#f59e0b":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polyline",{points:"16 18 22 12 16 6"}),u.jsx("polyline",{points:"8 6 2 12 8 18"})]}),Hn=({open:e})=>u.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:`transition-transform ${e?"rotate-90":""}`,children:u.jsx("path",{d:"M9 18l6-6-6-6"})}),$n=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"2",y:"2",width:"20",height:"20",rx:"5",ry:"5"}),u.jsx("path",{d:"M16 8h.01"}),u.jsx("path",{d:"M8 8h.01"}),u.jsx("path",{d:"M8 16h.01"}),u.jsx("path",{d:"M16 16h.01"}),u.jsx("path",{d:"M12 12h.01"})]}),Bn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polyline",{points:"16 3 21 3 21 8"}),u.jsx("line",{x1:"4",y1:"20",x2:"21",y2:"3"}),u.jsx("polyline",{points:"21 16 21 21 16 21"}),u.jsx("line",{x1:"15",y1:"15",x2:"21",y2:"21"}),u.jsx("line",{x1:"4",y1:"4",x2:"9",y2:"9"})]}),Vn=()=>u.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:u.jsx("path",{d:"M8 5v14l11-7z"})}),Gn=()=>u.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:u.jsx("path",{d:"M6 19h4V5H6v14zm8-14v14h4V5h-4z"})}),qn=()=>u.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:u.jsx("path",{d:"M6 6h12v12H6z"})}),Un=({active:e})=>u.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:e?"currentColor":"none",stroke:"currentColor",strokeWidth:"2",children:u.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:e?"none":"currentColor",fill:e?"#ef4444":"none"})}),Wn=({active:e})=>u.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:u.jsx("path",{d:"M3 18C3 18 6 5 12 12C18 19 21 5 21 5"})}),Xn=({active:e})=>u.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:[u.jsx("rect",{x:"3",y:"8",width:"6",height:"8"}),u.jsx("rect",{x:"15",y:"8",width:"6",height:"8"})]}),Yn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),u.jsx("path",{d:"M4 22v-7"}),u.jsx("path",{d:"M8 4v10"}),u.jsx("path",{d:"M12 5v10"}),u.jsx("path",{d:"M16 4v10"}),u.jsx("path",{d:"M4 8h16"}),u.jsx("path",{d:"M4 12h16"})]}),Kn=({active:e})=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),u.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"}),u.jsx("line",{x1:"3",y1:"15",x2:"21",y2:"15"}),u.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),u.jsx("line",{x1:"15",y1:"3",x2:"15",y2:"21"})]}),Zn=({mode:e})=>u.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e==="Loop"||e==="PingPong"?u.jsx("path",{d:"M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3"}):u.jsx("path",{d:"M5 12h14 M12 5l7 7-7 7"})}),Jn=({active:e,arming:o})=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M3 12h18",strokeOpacity:e||o?.3:.2}),u.jsx("path",{d:"M3 12 Q 6 2, 9 12 T 15 12 T 21 12",stroke:e?"#ef4444":o?"#fca5a5":"currentColor"}),o&&!e&&u.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"#fca5a5",stroke:"none"})]}),Qn=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polyline",{points:"4 14 10 14 10 20"}),u.jsx("polyline",{points:"20 10 14 10 14 4"}),u.jsx("line",{x1:"14",y1:"10",x2:"21",y2:"3"}),u.jsx("line",{x1:"3",y1:"21",x2:"10",y2:"14"})]}),es=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}),u.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"currentColor",stroke:"none"})]}),ts=({active:e})=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("line",{x1:"4",y1:"20",x2:"20",y2:"20"}),u.jsx("line",{x1:"4",y1:"4",x2:"20",y2:"4"}),u.jsx("polyline",{points:"4 14 8 10 12 14 16 10 20 14"})]}),os=()=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),u.jsx("path",{d:"M4 12h16"}),u.jsx("path",{d:"M12 4v16"}),u.jsx("path",{d:"M16 16l-4 4-4-4"})]}),as=({active:e})=>u.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M19 13l-7-7-7 7"}),u.jsx("path",{d:"M5 19l7-7 7 7"}),u.jsx("path",{d:"M12 5l2-2 2 2-2 2-2-2z",fill:e?"#22d3ee":"none",stroke:"none"}),u.jsx("path",{d:"M12 5l-2-2-2 2 2 2 2-2z",fill:e?"#22d3ee":"none",stroke:"none"})]}),is=({active:e})=>u.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("path",{d:"M2 12s3-7 7-7 7 7 7 7 3-7 7-7"})}),rs=({active:e})=>u.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:e?"text-gray-200":"text-gray-600",children:[u.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),u.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),sr=e=>{const{value:o,onChange:t,onDragStart:a,onDragEnd:i,step:r=.01,sensitivity:n=1,hardMin:l,hardMax:s,mapping:c,disabled:d,dragThreshold:h=2}=e,[p,f]=j.useState(!1),m=j.useRef(null),b=j.useRef(0),y=j.useRef(0),g=j.useRef(!1),v=j.useRef(!1),I=j.useRef(!1),M=j.useRef(null),x=j.useCallback((_,T)=>{let ie=r*.5*n;return _&&(ie*=10),T&&(ie*=.1),ie},[r,n]),L=j.useCallback(_=>{if(d||_.button!==0)return;_.preventDefault(),_.stopPropagation(),_.currentTarget.setPointerCapture(_.pointerId),M.current=_.pointerId,b.current=_.clientX;const T=c?c.toDisplay(o):o;y.current=isNaN(T)?0:T,g.current=!1,v.current=_.shiftKey,I.current=_.altKey,f(!0),a==null||a()},[o,c,d,a]),P=j.useCallback(_=>{if(d||!p||!_.currentTarget.hasPointerCapture(_.pointerId))return;const T=_.clientX-b.current;if(Math.abs(T)>h&&(g.current=!0),!g.current)return;_.preventDefault(),_.stopPropagation();const ie=v.current!==_.shiftKey,ue=I.current!==_.altKey;if(ie||ue){const B=x(v.current,I.current),fe=y.current+T*B;y.current=fe,b.current=_.clientX,v.current=_.shiftKey,I.current=_.altKey}const ae=x(_.shiftKey,_.altKey);let Q=y.current+T*ae;l!==void 0&&(Q=Math.max(l,Q)),s!==void 0&&(Q=Math.min(s,Q));const re=c?c.fromDisplay(Q):Q;isNaN(re)||(m.current=re,t(re))},[p,d,r,l,s,c,t,x,h]),A=j.useCallback(_=>{d||(_.currentTarget.releasePointerCapture(_.pointerId),M.current=null,f(!1),m.current=null,i==null||i())},[d,i]),D=j.useCallback(()=>{const _=!g.current;return g.current=!1,_},[]);return{isDragging:p,immediateValueRef:m,handlePointerDown:L,handlePointerMove:P,handlePointerUp:A,handleClick:D}},lr=e=>{const{value:o,mapping:t,onChange:a,onDragStart:i,onDragEnd:r,disabled:n,mapTextInput:l=!1}=e,[s,c]=j.useState(!1),[d,h]=j.useState(""),p=j.useRef(null),f=j.useRef(""),m=j.useCallback(()=>{if(n)return;c(!0);const x=l&&t?t.toDisplay(o):o,L=typeof x=="number"?parseFloat(x.toFixed(6)):x??0,P=String(L);h(P),f.current=P,setTimeout(()=>{p.current&&(p.current.focus(),p.current.select())},10)},[o,t,n,l]),b=j.useCallback(()=>{const x=f.current;let L;if(t!=null&&t.parseInput&&l?L=t.parseInput(x):(L=parseFloat(x),isNaN(L)&&(L=null)),L!==null){const P=l&&t?t.fromDisplay(L):L;i==null||i(),a(P),r==null||r()}c(!1)},[t,a,i,r,l]),y=j.useCallback(()=>{c(!1)},[]),g=j.useCallback(x=>{h(x),f.current=x},[]),v=j.useCallback(x=>{x.key==="Enter"?(x.preventDefault(),b()):x.key==="Escape"&&(x.preventDefault(),y()),x.key!=="Tab"&&x.stopPropagation()},[b,y]),I=j.useCallback(()=>{s||m()},[s,m]),M=j.useCallback(()=>{s&&b()},[s,b]);return{isEditing:s,inputValue:d,inputRef:p,startEditing:m,commitEdit:b,cancelEdit:y,handleInputChange:g,handleKeyDown:v,handleFocus:I,handleBlur:M}},lo=e=>e===0||Math.abs(e)<1e-9?"0":parseFloat(e.toFixed(8)).toString(),ns={toDisplay:e=>e/Math.PI,fromDisplay:e=>e*Math.PI,format:e=>{const o=e/Math.PI,t=Math.abs(o),a=o<0?"-":"";if(t<.001)return"0";if(Math.abs(t-1)<.001)return`${a}π`;if(Math.abs(t-.5)<.001)return`${a}π/2`;if(Math.abs(t-.25)<.001)return`${a}π/4`;if(Math.abs(t-.75)<.001)return`${a}3π/4`;if(Math.abs(t-2)<.001)return`${a}2π`;const i=Math.round(t*3);if(Math.abs(t-i/3)<.001&&i!==0){if(i===1)return`${a}π/3`;if(i===2)return`${a}2π/3`;if(i===3)return`${a}π`;if(i===4)return`${a}4π/3`;if(i===5)return`${a}5π/3`}return`${a}${t.toFixed(2)}π`},parseInput:e=>{const o=e.trim().toLowerCase().replace(/\s/g,"");if(o==="π"||o==="pi")return Math.PI;if(o==="-π"||o==="-pi")return-Math.PI;if(o.includes("π")||o.includes("pi")){const a=o.replace(/[πpi]/g,"");if(a.includes("/")){const[n,l]=a.split("/").map(c=>parseFloat(c)||1);return(o.startsWith("-")?-1:1)*(Math.abs(n)/l)*Math.PI}const i=a?parseFloat(a):1;return isNaN(i)?null:(o.startsWith("-")?-1:1)*Math.abs(i)*Math.PI}const t=parseFloat(o);return isNaN(t)?null:t}},ss={toDisplay:e=>e*(180/Math.PI),fromDisplay:e=>e*(Math.PI/180),format:e=>`${(e*(180/Math.PI)).toFixed(1)}°`,parseInput:e=>{const o=e.trim().replace(/°/g,""),t=parseFloat(o);return isNaN(t)?null:t}},ls=(e,o)=>({toDisplay:t=>t<=0?e:Math.log10(t),fromDisplay:t=>Math.pow(10,t),format:t=>lo(t),parseInput:t=>{const a=parseFloat(t);return isNaN(a)?null:a}}),cr=(e,o,t,a)=>{const i=a?a.toDisplay(e):e,r=a?a.toDisplay(o):o,n=a?a.toDisplay(t):t;return Math.max(0,Math.min(100,(i-r)/(n-r)*100))},tt=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i=.01,sensitivity:r=1,min:n,max:l,hardMin:s,hardMax:c,mapping:d,format:h,mapTextInput:p,disabled:f=!1,highlight:m=!1,liveValue:b,defaultValue:y,onImmediateChange:g})=>{const v=H.useRef(null),I=H.useCallback(U=>h?h(U):d!=null&&d.format?d.format(U):lo(U),[h,d]),{isDragging:M,immediateValueRef:x,handlePointerDown:L,handlePointerMove:P,handlePointerUp:A,handleClick:D}=sr({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i,sensitivity:r,hardMin:s,hardMax:c,mapping:d,disabled:f}),_=H.useCallback(U=>{P(U);const xe=x.current;xe!==null&&(v.current&&(v.current.textContent=I(xe)),g==null||g(xe))},[P,x,I,g]),{isEditing:T,inputValue:ie,inputRef:ue,startEditing:ae,handleInputChange:Q,handleKeyDown:re,handleBlur:B}=lr({value:e,mapping:d,onChange:o,onDragStart:t,onDragEnd:a,disabled:f,mapTextInput:p}),fe=H.useMemo(()=>I(e),[e,I]),ze=H.useCallback(()=>{!f&&!T&&ae()},[f,T,ae]),Ae=H.useCallback(U=>{if(f)return;D()&&ae()},[f,D,ae]),ne=`
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${f?"cursor-not-allowed opacity-50 text-gray-600":"cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50"}
        ${M?"bg-cyan-500/20 text-cyan-300":(M||m||b!==void 0&&!f)&&!f?"text-cyan-400":f?"":"text-gray-300 hover:text-white"}
    `;return T?u.jsx("input",{ref:ue,type:"text",value:ie,onChange:U=>Q(U.target.value),onBlur:B,onKeyDown:re,className:"w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1",onClick:U=>U.stopPropagation(),autoFocus:!0}):u.jsx("div",{ref:v,"data-role":"value",tabIndex:f?-1:0,onPointerDown:L,onPointerMove:_,onPointerUp:A,onClick:Ae,onFocus:ze,className:ne,title:f?"Disabled":"Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)",children:fe})},cs=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i=.01,min:r,max:n,hardMin:l,hardMax:s,mapping:c,format:d,overrideText:h,mapTextInput:p,label:f,labelSuffix:m,headerRight:b,showTrack:y=!0,trackPosition:g="below",trackHeight:v=20,variant:I="full",className:M="",defaultValue:x,onReset:L,liveValue:P,showLiveIndicator:A=!0,onContextMenu:D,dataHelpId:_,disabled:T=!1,highlight:ie=!1})=>{const ue=H.useRef(null),ae=H.useRef(null),Q=H.useRef(null),re=H.useRef({active:!1,startX:0,startValue:0,lastShift:!1,lastAlt:!1}),B=r!==void 0&&n!==void 0&&r!==n,fe=H.useMemo(()=>{if(!B)return 0;const C=c?c.toDisplay(e):e,k=c?c.toDisplay(r):r,ee=c?c.toDisplay(n):n;return Math.max(0,Math.min(100,(C-k)/(ee-k)*100))},[e,r,n,c,B]),ze=H.useMemo(()=>{if(!B||P===void 0)return 0;const C=c?c.toDisplay(P):P,k=c?c.toDisplay(r):r,ee=c?c.toDisplay(n):n;return Math.max(0,Math.min(100,(C-k)/(ee-k)*100))},[P,r,n,c,B]),Ae=H.useMemo(()=>{if(!B||x===void 0)return null;const C=c?c.toDisplay(x):x,k=c?c.toDisplay(r):r,ee=c?c.toDisplay(n):n;return(C-k)/(ee-k)*100},[x,r,n,c,B]),qe=H.useCallback(C=>B?cr(C,r,n,c):0,[B,r,n,c]),ne=H.useCallback(C=>{var he;const k=qe(C),ee=`${k}%`;ue.current&&(ue.current.style.width=ee),ae.current&&(ae.current.style.width=ee);const pe=(he=Q.current)==null?void 0:he.querySelector('[data-role="thumb"]');pe&&(pe.style.left=`calc(${k}% - 8px)`)},[qe]),U=H.useCallback(C=>i?Math.round(C/i)*i:C,[i]),xe=H.useCallback(C=>{if(T||!B||C.button!==0)return;C.preventDefault(),C.stopPropagation(),C.currentTarget.setPointerCapture(C.pointerId);const k=C.currentTarget.getBoundingClientRect(),ee=Math.max(0,Math.min(1,(C.clientX-k.left)/k.width)),pe=c?c.toDisplay(r):r,he=c?c.toDisplay(n):n,Se=U(pe+ee*(he-pe));let me=c?c.fromDisplay(Se):Se;l!==void 0&&(me=Math.max(l,me)),s!==void 0&&(me=Math.min(s,me)),o(me),ne(me);const ce=re.current;ce.active=!0,ce.startX=C.clientX,ce.startValue=Se,ce.lastShift=C.shiftKey,ce.lastAlt=C.altKey,t==null||t()},[T,B,r,n,c,l,s,o,t,ne,U]),co=H.useCallback(C=>{const k=re.current;if(!k.active||T||!B)return;C.preventDefault();const pe=C.currentTarget.getBoundingClientRect().width,he=c?c.toDisplay(r):r,Se=c?c.toDisplay(n):n,ce=(Se-he)/pe;if(k.lastShift!==C.shiftKey||k.lastAlt!==C.altKey){const mo=ce*(k.lastShift?10:1)*(k.lastAlt?.1:1),go=C.clientX-k.startX;k.startValue=k.startValue+go*mo,k.startX=C.clientX,k.lastShift=C.shiftKey,k.lastAlt=C.altKey}let Ue=ce;C.shiftKey&&(Ue*=10),C.altKey&&(Ue*=.1);const ho=C.clientX-k.startX;let De=U(k.startValue+ho*Ue);De=Math.max(he,Math.min(Se,De));let ge=c?c.fromDisplay(De):De;l!==void 0&&(ge=Math.max(l,ge)),s!==void 0&&(ge=Math.min(s,ge)),isNaN(ge)||(o(ge),ne(ge))},[T,B,r,n,c,l,s,o,ne,U]),uo=H.useCallback(C=>{const k=re.current;k.active&&(k.active=!1,C.currentTarget.releasePointerCapture(C.pointerId),a==null||a())},[a]),fo=H.useCallback(()=>{x!==void 0&&!T&&(t==null||t(),o(x),a==null||a(),L==null||L())},[x,T,o,t,a,L]),Ee=ie||P!==void 0,po=I==="compact";return I==="minimal"?u.jsx("div",{className:M,children:u.jsx(tt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:d,mapTextInput:p,defaultValue:x,disabled:T,highlight:Ee,onImmediateChange:ne})}):po?u.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${T?"opacity-70 pointer-events-none":""} ${M}`,onContextMenu:D,"data-help-id":_,children:[u.jsx("div",{className:"absolute inset-0 bg-white/[0.12]",style:T?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"}}),y&&B&&u.jsx("div",{ref:ue,"data-role":"fill",className:`absolute top-0 bottom-0 left-0 pointer-events-none ${T?"bg-gray-500/20":Ee?"bg-cyan-500/30":"bg-cyan-500/20"}`,style:{width:`${fe}%`}}),A&&P!==void 0&&!T&&B&&u.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${ze}% - 0.75px)`}}),u.jsx("div",{className:"absolute inset-0",children:u.jsx(tt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:d,mapTextInput:p,defaultValue:x,disabled:T,highlight:Ee,onImmediateChange:ne})}),Ee&&!T&&u.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 pointer-events-none"})]}):u.jsxs("div",{className:`mb-px animate-slider-entry ${T?"opacity-70 pointer-events-none":""} ${M}`,"data-help-id":_,onContextMenu:D,children:[f&&u.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[u.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[b,u.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${T?"text-gray-600":"text-gray-400"}`,children:[f,m,P!==void 0&&!T&&u.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"})]})]}),u.jsx("div",{className:"w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none",style:T?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},children:u.jsx(tt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:i,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:d,mapTextInput:p,defaultValue:x,disabled:T,highlight:Ee,onImmediateChange:ne})})]}),y&&B&&u.jsxs("div",{ref:Q,className:`relative flex items-center touch-none overflow-hidden ${T?"cursor-not-allowed":"cursor-ew-resize"}`,style:{touchAction:"none",height:v},onPointerDown:xe,onPointerMove:co,onPointerUp:uo,children:[u.jsxs("div",{className:"absolute inset-0 bg-white/10",children:[u.jsx("div",{ref:ae,className:`absolute top-0 bottom-0 left-0 ${T?"bg-gray-400/20":"bg-cyan-500/30"}`,style:{width:`${fe}%`}}),A&&P!==void 0&&!T&&u.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${ze}% - 0.75px)`}})]}),u.jsx("div",{"data-role":"thumb",className:"absolute top-0 bottom-0 w-4 z-10 pointer-events-none border-l border-r transition-colors",style:{left:`calc(${fe}% - 8px)`,borderColor:T?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.25)"}}),Ae!==null&&u.jsxs(u.Fragment,{children:[u.jsx("div",{className:"absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2",style:{left:`${Ae}%`}}),u.jsx("button",{onPointerDown:C=>{C.preventDefault(),C.stopPropagation()},onClick:C=>{C.preventDefault(),C.stopPropagation(),fo()},className:"absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10",title:`Reset to ${x}`,"aria-label":"Reset to default",tabIndex:-1})]})]})]})};function ds({label:e,value:o,options:t,onChange:a,fullWidth:i,className:r="",selectClassName:n="",labelSuffix:l,onContextMenu:s,disabled:c=!1,...d}){const h=p=>{var b;const f=p.target.value,m=typeof((b=t[0])==null?void 0:b.value)=="number";a(m?Number(f):f)};return u.jsxs("div",{className:`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${i?"w-full":""} ${c?"opacity-50 pointer-events-none":""} ${r}`,"data-help-id":d["data-help-id"],onContextMenu:s,children:[e&&u.jsx("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:u.jsxs("label",{className:"text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400",children:[e,l]})}),u.jsxs("div",{className:`${e?"w-1/2":"w-full"} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`,children:[u.jsx("select",{value:o,onChange:h,disabled:c,className:`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${n}`,children:t.map(p=>u.jsx("option",{value:String(p.value),className:"bg-[#111] text-gray-300",children:p.label},String(p.value)))}),u.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",children:u.jsx("div",{className:"w-2.5 h-2.5",children:u.jsx(nr,{})})})]})]})}export{rn as $,st as A,pn as B,dn as C,fn as D,In as E,w as F,Cn as G,sn as H,ln as I,cn as J,Xr as K,Rn as L,tn as M,zo as N,kr as O,Vn as P,Pe as Q,Pn as R,ke as S,Y as T,Dn as U,On as V,on as W,an as X,bn as Y,Kr as Z,yr as _,rt as a,rs as a$,vn as a0,un as a1,zn as a2,xn as a3,ir as a4,en as a5,Ie as a6,Gr as a7,zr as a8,z as a9,ds as aA,ns as aB,cs as aC,ya as aD,Fe as aE,Ca as aF,Ma as aG,Ea as aH,Ra as aI,La as aJ,wi as aK,q as aL,ss as aM,lo as aN,cr as aO,ls as aP,zt as aQ,le as aR,Fn as aS,Ve as aT,eo as aU,to as aV,Ui as aW,Tr as aX,Pr as aY,Hn as aZ,Sn as a_,Ft as aa,yn as ab,Et as ac,oe as ad,Qr as ae,br as af,vr as ag,Sr as ah,so as ai,wr as aj,nn as ak,Yr as al,qr as am,$r as an,Wr as ao,Jr as ap,Zr as aq,gn as ar,kn as as,_n as at,wn as au,Or as av,hn as aw,$n as ax,Bn as ay,F as az,$ as b,Qn as b0,es as b1,ts as b2,os as b3,as as b4,Kn as b5,is as b6,Ar as b7,Dr as b8,qn as b9,Un as ba,Jn as bb,Zn as bc,Xn as bd,Wn as be,Yn as bf,Nn as bg,Rr as bh,Mr as bi,Lr as bj,Er as bk,jn as bl,Cr as bm,xt as bn,oo as bo,Vr as c,jr as d,Hr as e,Gn as f,ve as g,En as h,Ir as i,Tn as j,Ln as k,Fr as l,ye as m,An as n,Nr as o,we as p,R as q,mn as r,Br as s,_r as t,K as u,xr as v,nr as w,Ur as x,Mn as y,N as z};
