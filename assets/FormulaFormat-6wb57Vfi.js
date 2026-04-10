var Ho=Object.defineProperty;var Vo=(e,o,t)=>o in e?Ho(e,o,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[o]=t;var M=(e,o,t)=>Vo(e,typeof o!="symbol"?o+"":o,t);import{j as c,r as L,R as te}from"./three-fiber-Ckg3Mgb3.js";import{d as ve,c as N,l as Go,Q as Oe,o as Fe,E as Ve,O as Uo,P as qo,n as ce,p as Wo,q as Xo,r as Ft,s as Ot,k as ut}from"./three-CA7fxsrE.js";import{a as po}from"./three-drei-BEFRS5Tk.js";import{p as jt}from"./pako-DwGzBETv.js";(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&a(n)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();const Yo=e=>(o,t,a)=>{const r=a.subscribe;return a.subscribe=(n,s,l)=>{let d=n;if(s){const u=(l==null?void 0:l.equalityFn)||Object.is;let f=n(a.getState());d=p=>{const h=n(p);if(!u(f,h)){const g=f;s(f=h,g)}},l!=null&&l.fireImmediately&&s(f,f)}return r(d)},e(o,t,a)},ho=Yo,le={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula"};class Ko{constructor(){M(this,"listeners",{})}on(o,t){return this.listeners[o]||(this.listeners[o]=[]),this.listeners[o].push(t),()=>this.off(o,t)}off(o,t){this.listeners[o]&&(this.listeners[o]=this.listeners[o].filter(a=>a!==t))}emit(o,t){this.listeners[o]&&this.listeners[o].forEach(a=>a(t))}}const R=new Ko,re={Time:"uTime",FrameCount:"uFrameCount",Resolution:"uResolution",SceneOffsetHigh:"uSceneOffsetHigh",SceneOffsetLow:"uSceneOffsetLow",CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",HistoryTexture:"uHistoryTexture",BlendFactor:"uBlendFactor",Jitter:"uJitter",BlueNoiseTexture:"uBlueNoiseTexture",BlueNoiseResolution:"uBlueNoiseResolution",ModularParams:"uModularParams",EnvRotationMatrix:"uEnvRotationMatrix",FogColorLinear:"uFogColorLinear",HistogramLayer:"uHistogramLayer",PreRotMatrix:"uPreRotMatrix",PostRotMatrix:"uPostRotMatrix",WorldRotMatrix:"uWorldRotMatrix",InternalScale:"uInternalScale",PixelSizeBase:"uPixelSizeBase"},Nt=e=>{if(typeof window>"u")return!1;const o=new URLSearchParams(window.location.search);return o.has(e)&&o.get(e)!=="false"&&o.get(e)!=="0"},Jo={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},Zo=(e,o)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:Nt("clean")||Nt("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:Jo,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:(()=>{try{const t=localStorage.getItem("gmt-tutorials");return t?JSON.parse(t).completed||[]:[]}catch{return[]}})(),setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{o().histogramLayer!==t&&(e({histogramLayer:t}),R.emit("uniform",{key:re.HistogramLayer,value:t}),e(a=>({histogramTrigger:a.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),R.emit("reset_accum",void 0)},setFixedResolution:(t,a)=>{e({fixedResolution:[t,a]}),R.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(a=>({helpWindow:{visible:!0,activeTopicId:t||a.helpWindow.activeTopicId},contextMenu:{...a.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,a,r,i)=>e({contextMenu:{visible:!0,x:t,y:a,items:r,targetHelpIds:i||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,a,r)=>e(i=>{var g,x;const n={...i.panels};n[t]||(n[t]={id:t,location:a,order:0,isCore:!1,isOpen:!0});const s=!0;let l=r;l===void 0&&(l=Object.values(n).filter(y=>y.location===a).length),(a==="left"||a==="right")&&Object.values(n).forEach(m=>{m.location===a&&m.id!==t&&(m.isOpen=!1)});let d=n[t].floatPos;a==="float"&&!d&&(d={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),n[t]={...n[t],location:a,order:l,isOpen:s,floatPos:d};const u=a==="left"?t:((g=Object.values(n).find(m=>m.location==="left"&&m.isOpen))==null?void 0:g.id)||null,f=a==="right"?t:((x=Object.values(n).find(m=>m.location==="right"&&m.isOpen))==null?void 0:x.id)||null,p=a==="left"?!1:i.isLeftDockCollapsed,h=a==="right"?!1:i.isRightDockCollapsed;return{panels:n,activeLeftTab:u,activeRightTab:f,isLeftDockCollapsed:p,isRightDockCollapsed:h}}),reorderPanel:(t,a)=>e(r=>{const i={...r.panels},n=i[t],s=i[a];if(!n||!s)return{};n.location!==s.location&&(n.location=s.location,n.isOpen=!1);const l=s.location,d=Object.values(i).filter(h=>h.location===l).sort((h,g)=>h.order-g.order),u=d.findIndex(h=>h.id===t),f=d.findIndex(h=>h.id===a);if(u===-1||f===-1)return{};const[p]=d.splice(u,1);return d.splice(f,0,p),d.forEach((h,g)=>{i[h.id]={...i[h.id],order:g}}),{panels:i}}),togglePanel:(t,a)=>e(r=>{var u,f;const i={...r.panels};if(!i[t])return{};const n=i[t],s=a!==void 0?a:!n.isOpen;if(n.location==="float")n.isOpen=s;else if(s){if(Object.values(i).forEach(p=>{p.location===n.location&&p.id!==t&&(p.isOpen=!1)}),n.isOpen=!0,n.location==="left")return{panels:i,activeLeftTab:t,isLeftDockCollapsed:!1};if(n.location==="right")return{panels:i,activeRightTab:t,isRightDockCollapsed:!1}}else n.isOpen=!1;const l=((u=Object.values(i).find(p=>p.location==="left"&&p.isOpen))==null?void 0:u.id)||null,d=((f=Object.values(i).find(p=>p.location==="right"&&p.isOpen))==null?void 0:f.id)||null;return{panels:i,activeLeftTab:l,activeRightTab:d}}),setDockSize:(t,a)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:a}),setDockCollapsed:(t,a)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:a}),setFloatPosition:(t,a,r)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatPos:{x:a,y:r}}}})),setFloatSize:(t,a,r)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatSize:{width:a,height:r}}}})),startPanelDrag:t=>e(a=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(a.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>o().togglePanel(t,!0),floatTab:t=>o().movePanel(t,"float"),dockTab:t=>o().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(a=>({compositionOverlaySettings:{...a.compositionOverlaySettings,...t}})),startTutorial:t=>e({tutorialActive:!0,tutorialLessonId:t,tutorialStepIndex:0,showHints:!1}),advanceTutorialStep:()=>e(t=>({tutorialStepIndex:t.tutorialStepIndex+1})),skipTutorial:()=>e({tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,showHints:!0}),completeTutorial:()=>e(t=>{const a=t.tutorialLessonId!==null&&!t.tutorialCompleted.includes(t.tutorialLessonId)?[...t.tutorialCompleted,t.tutorialLessonId]:t.tutorialCompleted;try{localStorage.setItem("gmt-tutorials",JSON.stringify({completed:a}))}catch{}return{tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:a,showHints:!0}})}),Qo=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,ea=(e,o)=>({dpr:Qo()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,renderRegion:null,isBucketRendering:!1,bucketSize:128,bucketUpscale:1,convergenceThreshold:.25,samplesPerBucket:64,canvasPixelSize:[1920,1080],setDpr:t=>{e({dpr:t}),R.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:a}=o();(a==="Always"||a==="Auto")&&e({dpr:t}),R.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:a}=o();a==="Always"||a==="Auto"?R.emit("config",{msaaSamples:t}):R.emit("config",{msaaSamples:1}),R.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:a,msaaSamples:r}=o();t==="Off"?(e({dpr:1}),R.emit("config",{msaaSamples:1})):(e({dpr:a}),R.emit("config",{msaaSamples:r})),R.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),R.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),R.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const a=t==="PathTracing"?1:0,r=o().setLighting;r&&r({renderMode:a})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const a=t?new ve(t.minX,t.minY):new ve(0,0),r=t?new ve(t.maxX,t.maxY):new ve(1,1);R.emit("uniform",{key:re.RegionMin,value:a}),R.emit("uniform",{key:re.RegionMax,value:r}),R.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setBucketUpscale:t=>e({bucketUpscale:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setCanvasPixelSize:(t,a)=>e({canvasPixelSize:[t,a]}),setIsExporting:t=>e({isExporting:t})}),mo=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let t=0;t<8;t++)o=o&1?3988292384^o>>>1:o>>>1;mo[e]=o}const ta=e=>{let o=-1;for(let t=0;t<e.length;t++)o=o>>>8^mo[(o^e[t])&255];return(o^-1)>>>0},oa=new TextEncoder,$t=new TextDecoder,aa=e=>{const o=new Uint8Array(e.length);for(let t=0;t<e.length;t++)o[t]=e.charCodeAt(t);return o},it=e=>{let o="";for(let t=0;t<e.length;t++)o+=String.fromCharCode(e[t]);return o},Bt=(e,o,t)=>{e[o]=t>>>24&255,e[o+1]=t>>>16&255,e[o+2]=t>>>8&255,e[o+3]=t&255},ra=async(e,o,t)=>{const a=await e.arrayBuffer(),r=new Uint8Array(a);if(r[0]!==137||r[1]!==80||r[2]!==78||r[3]!==71)throw new Error("Not a valid PNG");const i=aa(o),n=oa.encode(t),s=i.length+1+1+1+1+1+n.length,l=12+s,d=new Uint8Array(l);Bt(d,0,s),d[4]=105,d[5]=84,d[6]=88,d[7]=116;let u=8;d.set(i,u),u+=i.length,d[u++]=0,d[u++]=0,d[u++]=0,d[u++]=0,d[u++]=0,d.set(n,u);const f=ta(d.slice(4,l-4));Bt(d,l-4,f);let p=8;for(;p<r.length;){const g=r[p]<<24|r[p+1]<<16|r[p+2]<<8|r[p+3];if(it(r.slice(p+4,p+8))==="IEND")break;p+=12+g}const h=new Uint8Array(r.length+l);return h.set(r.slice(0,p),0),h.set(d,p),h.set(r.slice(p),p+l),new Blob([h],{type:"image/png"})},Yi=async(e,o)=>{const t=await e.arrayBuffer(),a=new Uint8Array(t);if(a[0]!==137||a[1]!==80)return null;let r=8;for(;r<a.length;){const i=a[r]<<24|a[r+1]<<16|a[r+2]<<8|a[r+3],n=it(a.slice(r+4,r+8));if(n==="iTXt"){const s=a.slice(r+8,r+8+i);let l=-1;for(let d=0;d<s.length;d++)if(s[d]===0){l=d;break}if(l!==-1&&it(s.slice(0,l))===o){let u=l+1+1+1;for(;u<s.length&&s[u]!==0;)u++;for(u++;u<s.length&&s[u]!==0;)u++;return u++,$t.decode(s.slice(u))}}if(n==="tEXt"){const s=a.slice(r+8,r+8+i);let l=-1;for(let d=0;d<s.length;d++)if(s[d]===0){l=d;break}if(l!==-1&&it(s.slice(0,l))===o)return $t.decode(s.slice(l+1))}if(n==="IEND")break;r+=12+i}return null};let St=null;function Ki(e){St=e}class ia{constructor(){M(this,"activeCamera",null);M(this,"virtualSpace",null);M(this,"renderer",null);M(this,"pipeline",null);M(this,"_worker",null);M(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});M(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});M(this,"_offsetGuarded",!1);M(this,"_offsetGuardTimer",null);M(this,"_onCompiling",null);M(this,"_onCompileTime",null);M(this,"_onShaderCode",null);M(this,"_onBootedCallback",null);M(this,"_pendingSnapshots",new Map);M(this,"_pendingPicks",new Map);M(this,"_pendingFocusPicks",new Map);M(this,"_pendingHistograms",new Map);M(this,"_pendingShaderSource",new Map);M(this,"_gpuInfo","");M(this,"_lastGeneratedFrag","");M(this,"modulations",{});M(this,"_isBucketRendering",!1);M(this,"_isExporting",!1);M(this,"_exportReady",null);M(this,"_exportFrameDone",null);M(this,"_exportComplete",null);M(this,"_exportError",null);M(this,"_container",null);M(this,"_lastInitArgs",null);M(this,"_onCrash",null);M(this,"pendingTeleport",null);M(this,"_isGizmoInteracting",!1);M(this,"_bootSent",!1);M(this,"_pendingOffsetSync",null)}setWorkerModePending(){}initWorkerMode(o,t,a,r,i,n,s){if(this._worker)return;this._container=o.parentElement,this._lastInitArgs={config:t,width:a,height:r,dpr:i,isMobile:n,initialCamera:s};const l=o.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-X4n323pc.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=u=>{this._handleWorkerMessage(u.data)},this._worker.onerror=u=>{console.error("[WorkerProxy] Worker error:",u),this._handleWorkerCrash("Worker error: "+(u.message||"unknown"))};const d={type:"INIT",canvas:l,width:a,height:r,dpr:i,isMobile:n,initialConfig:t,initialCamera:s};this._worker.postMessage(d,[l])}restart(o,t){if(!this._container||!this._lastInitArgs)return;this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const a=this._container.querySelector("canvas");a&&a.remove();const{width:r,height:i,dpr:n,isMobile:s}=this._lastInitArgs,l=document.createElement("canvas");l.width=r*n,l.height=i*n,l.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(l),this._lastInitArgs={...this._lastInitArgs,config:o,initialCamera:t};const d=l.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-X4n323pc.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=f=>{this._handleWorkerMessage(f.data)},this._worker.onerror=f=>{console.error("[WorkerProxy] Worker error:",f),this._handleWorkerCrash("Worker error: "+(f.message||"unknown"))};const u={type:"INIT",canvas:d,width:r,height:i,dpr:n,isMobile:s,initialConfig:o,initialCamera:t};this._worker.postMessage(u,[d])}set onCompiling(o){this._onCompiling=o}set onCompileTime(o){this._onCompileTime=o}set onShaderCode(o){this._onShaderCode=o}_handleWorkerMessage(o){switch(o.type){case"READY":break;case"FRAME_READY":if(o.state)if(this._shadow=o.state,this._offsetGuarded){const t=o.state.sceneOffset,a=this._localOffset;Math.abs(t.x+t.xL-(a.x+a.xL))+Math.abs(t.y+t.yL-(a.y+a.yL))+Math.abs(t.z+t.zL-(a.z+a.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...o.state.sceneOffset};St&&St();break;case"COMPILING":this._shadow.isCompiling=!!o.status,this._shadow.hasCompiledShader=!o.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(o.status),R.emit(le.IS_COMPILING,o.status);break;case"COMPILE_TIME":o.duration&&(this._shadow.lastCompileDuration=o.duration),this._onCompileTime&&this._onCompileTime(o.duration),R.emit(le.COMPILE_TIME,o.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=o.code,this._onShaderCode&&this._onShaderCode(o.code),R.emit(le.SHADER_CODE,o.code);break;case"SHADER_SOURCE_RESULT":{const t=this._pendingShaderSource.get(o.id);t&&(t(o.code),this._pendingShaderSource.delete(o.id));break}case"BOOTED":this._shadow.isBooted=!0,o.gpuInfo&&(this._gpuInfo=o.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=o.info;break;case"HISTOGRAM_RESULT":{const t=this._pendingHistograms.get(o.id);t&&(t(o.data),this._pendingHistograms.delete(o.id));break}case"SNAPSHOT_RESULT":{const t=this._pendingSnapshots.get(o.id);t&&(t(o.blob),this._pendingSnapshots.delete(o.id));break}case"PICK_RESULT":{const t=this._pendingPicks.get(o.id);t&&(t(o.position?new N(o.position[0],o.position[1],o.position[2]):null),this._pendingPicks.delete(o.id));break}case"FOCUS_RESULT":{const t=this._pendingFocusPicks.get(o.id);t&&(t(o.distance),this._pendingFocusPicks.delete(o.id));break}case"ERROR":console.error("[WorkerProxy] Worker error:",o.message);break;case"EXPORT_READY":this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=o.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:o.frameIndex,progress:o.progress,measuredDistance:o.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportComplete&&this._exportComplete(o.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,console.error("[WorkerProxy] Export error:",o.message),this._exportError&&this._exportError(o.message);break;case"BUCKET_STATUS":this._isBucketRendering=o.isRendering,R.emit(le.BUCKET_STATUS,{isRendering:o.isRendering,progress:o.progress,totalBuckets:o.totalBuckets,currentBucket:o.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(o);break}}post(o,t){this._worker&&(t?this._worker.postMessage(o,t):this._worker.postMessage(o))}set onCrash(o){this._onCrash=o}set onBooted(o){this._onBootedCallback=o}_handleWorkerCrash(o){console.error(`[WorkerProxy] Worker crashed: ${o}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._onCrash&&this._onCrash(o)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get convergenceValue(){return this._shadow.convergenceValue}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(o){this._shadow.lastMeasuredDistance=o}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(o){o&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(o){this.post({type:"PAUSE",paused:o})}get shouldSnapCamera(){return!1}set shouldSnapCamera(o){o&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(o){this._isGizmoInteracting=o}get isCameraInteracting(){return!1}set isCameraInteracting(o){o&&this.post({type:"MARK_INTERACTION"})}get bootSent(){return this._bootSent}bootWithConfig(o,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(o,t),this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0}setUniform(o,t,a=!1){this.post({type:"UNIFORM",key:o,value:t,noReset:a})}setPreviewSampleCap(o){this.post({type:"SET_SAMPLE_CAP",n:o})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(o,t){if(t){const a=t.indexOf(";base64,"),r=a>=0?t.substring(a+8,a+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||r.startsWith("Iz8")||r.startsWith("Iz9")?fetch(t).then(n=>n.arrayBuffer()).then(n=>{this.post({type:"TEXTURE_HDR",textureType:o,buffer:n},[n])}).catch(n=>console.error("[WorkerProxy] HDR texture transfer failed:",n)):fetch(t).then(n=>n.blob()).then(n=>createImageBitmap(n,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(n=>{this.post({type:"TEXTURE",textureType:o,bitmap:n},[n])}).catch(n=>console.error("[WorkerProxy] Texture transfer failed:",n))}else this.post({type:"TEXTURE",textureType:o,bitmap:null})}queueOffsetSync(o){this._pendingOffsetSync={x:o.x,y:o.y,z:o.z,xL:o.xL,yL:o.yL,zL:o.zL},this.setShadowOffset(o)}setShadowOffset(o){this._localOffset={...o},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(o,t,a){}resolveLightPosition(o,t){return o}measureDistanceAtScreenPoint(o,t,a,r){return this._shadow.lastMeasuredDistance}pickWorldPosition(o,t,a){if(!a)return null;const r=crypto.randomUUID();return new Promise(i=>{this._pendingPicks.set(r,i),this.post({type:"PICK_WORLD_POSITION",id:r,x:o,y:t}),setTimeout(()=>{this._pendingPicks.has(r)&&(this._pendingPicks.delete(r),i(null))},5e3)})}startFocusPick(o,t){const a=crypto.randomUUID();return new Promise(r=>{this._pendingFocusPicks.set(a,r),this.post({type:"FOCUS_PICK_START",id:a,x:o,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(a)&&(this._pendingFocusPicks.delete(a),r(-1))},5e3)})}sampleFocusPick(o,t){const a=crypto.randomUUID();return new Promise(r=>{this._pendingFocusPicks.set(a,r),this.post({type:"FOCUS_PICK_SAMPLE",id:a,x:o,y:t}),setTimeout(()=>{this._pendingFocusPicks.has(a)&&(this._pendingFocusPicks.delete(a),r(-1))},2e3)})}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){const o=crypto.randomUUID();return new Promise(t=>{this._pendingSnapshots.set(o,t),this.post({type:"CAPTURE_SNAPSHOT",id:o}),setTimeout(()=>{this._pendingSnapshots.has(o)&&(this._pendingSnapshots.delete(o),t(null))},1e4)})}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(o){const t=crypto.randomUUID();return new Promise(a=>{this._pendingHistograms.set(t,a),this.post({type:"HISTOGRAM_READBACK",id:t,source:o}),setTimeout(()=>{this._pendingHistograms.has(t)&&(this._pendingHistograms.delete(t),a(new Float32Array(0)))},5e3)})}getCompiledFragmentShader(){const o=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(o,t),this.post({type:"GET_SHADER_SOURCE",id:o,variant:"compiled"}),setTimeout(()=>{this._pendingShaderSource.has(o)&&(this._pendingShaderSource.delete(o),t(null))},5e3)})}getTranslatedFragmentShader(){const o=crypto.randomUUID();return new Promise(t=>{this._pendingShaderSource.set(o,t),this.post({type:"GET_SHADER_SOURCE",id:o,variant:"translated"}),setTimeout(()=>{this._pendingShaderSource.has(o)&&(this._pendingShaderSource.delete(o),t(null))},5e3)})}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(o,t,a,r){if(this._pendingOffsetSync){const i=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:o,offset:i,delta:a,timestamp:performance.now(),renderState:r,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:o,offset:t,delta:a,timestamp:performance.now(),renderState:r})}resizeWorker(o,t,a){this.post({type:"RESIZE",width:o,height:t,dpr:a})}sendConfig(o){this.post({type:"CONFIG",config:o})}registerFormula(o,t){this.post({type:"REGISTER_FORMULA",id:o,shader:t})}startExport(o,t){return this._isExporting=!0,new Promise((a,r)=>{this._exportReady=()=>{this._exportReady=null,a()},this._exportError=s=>{this._exportError=null,r(new Error(s))};let i=null;if(t){const s=t;i=new WritableStream({write(l){return s.write(l)},close(){return s.close()},abort(l){return s.abort(l)}})}const n=[];i&&n.push(i),this.post({type:"EXPORT_START",config:o,stream:i},n),setTimeout(()=>{this._exportReady&&(this._exportReady=null,r(new Error("Export start timed out")))},1e4)})}renderExportFrame(o,t,a,r,i,n){return new Promise(s=>{this._exportFrameDone=l=>{this._exportFrameDone=null,s(l)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:o,time:t,camera:a,offset:r,renderState:i,modulations:n})})}finishExport(){return new Promise((o,t)=>{this._exportComplete=a=>{this._exportComplete=null,o(a)},this._exportError=a=>{this._exportError=null,t(new Error(a))},this.post({type:"EXPORT_FINISH"}),setTimeout(()=>{this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(o,t,a){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:o,config:t,exportData:a?{preset:JSON.stringify(a.preset),name:a.name,version:a.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}async _handleBucketImage(o){const{pixels:t,width:a,height:r,presetJson:i,filename:n}=o,s=document.createElement("canvas");s.width=a,s.height=r;const l=s.getContext("2d");if(!l)return;const d=new ImageData(new Uint8ClampedArray(t.buffer),a,r);l.putImageData(d,0,0),s.toBlob(async u=>{if(u)try{const f=await ra(u,"FractalData",i),p=URL.createObjectURL(f),h=document.createElement("a");h.download=n,h.href=p,h.click(),URL.revokeObjectURL(p)}catch(f){console.error("Failed to inject metadata",f);const p=document.createElement("a");p.download=n,p.href=s.toDataURL("image/png"),p.click()}},"image/png")}}let ft=null;function je(){return ft||(ft=new ia),ft}class na{constructor(){M(this,"definitions",new Map)}register(o){this.definitions.set(o.id,o)}registerAlias(o,t){const a=this.definitions.get(t);a?this.definitions.set(o,a):console.warn(`FractalRegistry: Cannot register alias '${o}' for unknown target '${t}'`)}get(o){return this.definitions.get(o)}getAll(){return Array.from(new Set(this.definitions.values()))}getIds(){return Array.from(this.definitions.keys())}}const he=new na;class G{constructor(o={x:0,y:0,z:0,xL:0,yL:0,zL:0}){M(this,"offset");M(this,"_rotMatrix",new Go);M(this,"_camRight",new N);M(this,"_camUp",new N);M(this,"_camForward",new N);M(this,"_visualVector",new N);M(this,"_quatInverse",new Oe);M(this,"_relativePos",new N);M(this,"smoothedPos",new N);M(this,"smoothedQuat",new Oe);M(this,"smoothedFov",60);M(this,"prevOffsetState");M(this,"isLocked",!1);M(this,"isFirstFrame",!0);this.offset={...o},this.prevOffsetState={...o}}get state(){return{...this.offset}}set state(o){this.offset={...o},G.normalize(this.offset)}static split(o){const t=Math.fround(o),a=o-t;return{high:t,low:a}}static normalize(o){if(Math.abs(o.xL)>.5){const a=Math.floor(o.xL+.5);o.x+=a,o.xL-=a}if(Math.abs(o.yL)>.5){const a=Math.floor(o.yL+.5);o.y+=a,o.yL-=a}if(Math.abs(o.zL)>.5){const a=Math.floor(o.zL+.5);o.z+=a,o.zL-=a}}setFromUnified(o,t,a){const r=G.split(o),i=G.split(t),n=G.split(a);this.offset.x=r.high,this.offset.xL=r.low,this.offset.y=i.high,this.offset.yL=i.low,this.offset.z=n.high,this.offset.zL=n.low,G.normalize(this.offset)}move(o,t,a){this.offset.xL+=o,this.offset.yL+=t,this.offset.zL+=a,G.normalize(this.offset)}absorbCamera(o){this.offset.xL+=o.x,this.offset.yL+=o.y,this.offset.zL+=o.z,G.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(o,t,a,r,i){if(!i&&!r&&!this.isFirstFrame){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||r){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const n=this.offset,s=this.prevOffsetState;if(s.x!==n.x||s.y!==n.y||s.z!==n.z||s.xL!==n.xL||s.yL!==n.yL||s.zL!==n.zL){const d=s.x-n.x+(s.xL-n.xL),u=s.y-n.y+(s.yL-n.yL),f=s.z-n.z+(s.zL-n.zL);if(Math.abs(d)>10||Math.abs(u)>10||Math.abs(f)>10){this.resetSmoothing(),this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion);return}this.smoothedPos.x+=d,this.smoothedPos.y+=u,this.smoothedPos.z+=f,this.prevOffsetState={...n}}const l=this.smoothedPos.distanceToSquared(o.position);if(this.isLocked?l>1e-18&&(this.isLocked=!1):l<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(o.position);else{const d=1-Math.exp(-40*a);this.smoothedPos.lerp(o.position,d)}this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t}getUnifiedCameraState(o,t){const a={...this.offset};return a.xL+=o.position.x,a.yL+=o.position.y,a.zL+=o.position.z,G.normalize(a),{position:{x:0,y:0,z:0},rotation:{x:o.quaternion.x,y:o.quaternion.y,z:o.quaternion.z,w:o.quaternion.w},sceneOffset:a,targetDistance:t>0?t:3.5}}applyCameraState(o,t){if(t.sceneOffset){const d={...t.sceneOffset};d.xL+=t.position.x,d.yL+=t.position.y,d.zL+=t.position.z,this.state=d}const a=t.rotation,r=a.x??a._x??0,i=a.y??a._y??0,n=a.z??a._z??0,s=a.w??a._w??1;o.position.set(0,0,0),o.quaternion.set(r,i,n,s).normalize();const l=new N(0,1,0).applyQuaternion(o.quaternion);o.up.copy(l),o.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(o.quaternion)}updateShaderUniforms(o,t,a){const r=this.offset.x+this.offset.xL+o.x,i=this.offset.y+this.offset.yL+o.y,n=this.offset.z+this.offset.zL+o.z,s=Math.fround(r),l=Math.fround(i),d=Math.fround(n);t.set(s,l,d),a.set(r-s,i-l,n-d)}updateCameraBasis(o,t,a){const r=o;this._rotMatrix.makeRotationFromQuaternion(r.quaternion);const i=this._rotMatrix.elements;this._camRight.set(i[0],i[1],i[2]),this._camUp.set(i[4],i[5],i[6]),this._camForward.set(-i[8],-i[9],-i[10]);let n=1,s=1;a&&a.isOrtho?(s=a.orthoScale/2,n=s*r.aspect):(s=Math.tan(Fe.degToRad(r.fov)*.5),n=s*r.aspect),t[re.CamBasisX].value.copy(this._camRight).multiplyScalar(n),t[re.CamBasisY].value.copy(this._camUp).multiplyScalar(s),t[re.CamForward].value.copy(this._camForward),t[re.CameraPosition].value.set(0,0,0)}getLightShaderVector(o,t,a,r){const i=this.offset;t?(this._relativePos.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),r.copy(this._relativePos)):r.set(o.x-(i.x+i.xL)-a.position.x,o.y-(i.y+i.yL)-a.position.y,o.z-(i.z+i.zL)-a.position.z)}resolveRealWorldPosition(o,t,a){const r=this.offset;return t?(this._visualVector.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),{x:a.position.x+this._visualVector.x+(r.x+r.xL),y:a.position.y+this._visualVector.y+(r.y+r.yL),z:a.position.z+this._visualVector.z+(r.z+r.zL)}):(this._visualVector.set(o.x-(r.x+r.xL)-a.position.x,o.y-(r.y+r.yL)-a.position.y,o.z-(r.z+r.zL)-a.position.z),this._quatInverse.copy(a.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(o,t,a){const r=new N(0,0,-1).applyEuler(new Ve(o.x,o.y,o.z,"YXZ"));t?r.applyQuaternion(a.quaternion):r.applyQuaternion(a.quaternion.clone().invert());const i=new Oe().setFromUnitVectors(new N(0,0,-1),r),n=new Ve().setFromQuaternion(i,"YXZ");return{x:n.x,y:n.y,z:n.z}}}let st=null,go=null,ke=null,we=null,yo=!1;function Ji(e){st=e}function Zi(e){go=e}function Be(){return st}function Qi(){return go}function en(e){const o=pe.getState().optics,t=o?o.camType>.5&&o.camType<1.5:!1;if(yo=t,t){const a=o.orthoScale??2,i=e.aspect||1,n=a/2,s=n*i;we?(we.left=-s,we.right=s,we.top=n,we.bottom=-n):we=new Uo(-s,s,n,-n,.001,1e4),we.position.copy(e.position),we.quaternion.copy(e.quaternion),we.updateProjectionMatrix(),we.updateMatrixWorld()}else{ke||(ke=new qo),ke.position.copy(e.position),ke.quaternion.copy(e.quaternion);const a=e;a.fov!==void 0&&(ke.fov=a.fov,ke.aspect=a.aspect,ke.updateProjectionMatrix()),ke.updateMatrixWorld()}}function tn(){return yo?we||st:ke||st}const Xe=je(),Qe={getUnifiedPosition:(e,o)=>new N(o.x+o.xL+e.x,o.y+o.yL+e.y,o.z+o.zL+e.z),getUnifiedFromEngine:()=>{const e=Be()||Xe.activeCamera;return e?Qe.getUnifiedPosition(e.position,Xe.sceneOffset):new N},getRotationFromEngine:()=>{const e=Be()||Xe.activeCamera;return e?e.quaternion.clone():new Oe},getDistanceFromEngine:()=>{const e=Be()||Xe.activeCamera;if(e){const o=e.position.length();if(o>.001)return o}return null},getRotationDegrees:e=>{const o=new Oe(e.x,e.y,e.z,e.w),t=new Ve().setFromQuaternion(o);return new N(Fe.radToDeg(t.x),Fe.radToDeg(t.y),Fe.radToDeg(t.z))},teleportPosition:(e,o,t)=>{const a=G.split(e.x),r=G.split(e.y),i=G.split(e.z),n={position:{x:0,y:0,z:0},sceneOffset:{x:a.high,y:r.high,z:i.high,xL:a.low,yL:r.low,zL:i.low}};if(o)n.rotation=o;else{const s=Be()||Xe.activeCamera;if(s){const l=s.quaternion;n.rotation={x:l.x,y:l.y,z:l.z,w:l.w}}}t!==void 0&&(n.targetDistance=t),R.emit(le.CAMERA_TELEPORT,n)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const o=new Ve(Fe.degToRad(e.x),Fe.degToRad(e.y),Fe.degToRad(e.z)),t=new Oe().setFromEuler(o),a=Qe.getUnifiedFromEngine(),r=G.split(a.x),i=G.split(a.y),n=G.split(a.z);R.emit(le.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:r.high,y:i.high,z:n.high,xL:r.low,yL:i.low,zL:n.low}})}},sa="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let Me=(e=21)=>{let o="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)o+=sa[t[e]&63];return o};const Q=je(),Ht=e=>typeof e.setOptics=="function"?e.setOptics:null,la=(e,o)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const a={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};Q.virtualSpace?(Q.virtualSpace.state=a,e({sceneOffset:Q.virtualSpace.state}),R.emit("offset_set",Q.virtualSpace.state)):(e({sceneOffset:a}),R.emit("offset_set",a))},setActiveCameraId:t=>e({activeCameraId:t}),applyCameraState:t=>{e({cameraRot:t.rotation,sceneOffset:t.sceneOffset,targetDistance:t.targetDistance||3.5})},addSavedCamera:t=>{e(a=>({savedCameras:[...a.savedCameras,t],activeCameraId:t.id}))},updateCamera:(t,a)=>{e(r=>({savedCameras:r.savedCameras.map(i=>i.id===t?{...i,...a}:i)}))},deleteCamera:t=>{e(a=>({savedCameras:a.savedCameras.filter(r=>r.id!==t),activeCameraId:a.activeCameraId===t?null:a.activeCameraId}))},reorderCameras:(t,a)=>{e(r=>{const i=[...r.savedCameras],[n]=i.splice(t,1);return i.splice(a,0,n),{savedCameras:i}})},addCamera:t=>{const a=o(),r=Qe.getUnifiedFromEngine(),i=Qe.getRotationFromEngine(),n=Q.lastMeasuredDistance>0&&Q.lastMeasuredDistance<1e3?Q.lastMeasuredDistance:a.targetDistance,s=G.split(r.x),l=G.split(r.y),d=G.split(r.z),u={position:{x:0,y:0,z:0},rotation:{x:i.x,y:i.y,z:i.z,w:i.w},sceneOffset:{x:s.high,y:l.high,z:d.high,xL:s.low,yL:l.low,zL:d.low},targetDistance:n},f={...a.optics},p=t||`Camera ${a.savedCameras.length+1}`,h={id:Me(),label:p,position:u.position,rotation:u.rotation,sceneOffset:u.sceneOffset,targetDistance:u.targetDistance,optics:f};e(g=>({savedCameras:[...g.savedCameras,h],activeCameraId:h.id}))},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const a=o().savedCameras.find(r=>r.id===t);if(a){if(R.emit("camera_transition",a),e({activeCameraId:t,cameraRot:a.rotation,sceneOffset:a.sceneOffset,targetDistance:a.targetDistance||3.5}),a.optics){const r=Ht(o());r&&r(a.optics)}Q.resetAccumulation()}},duplicateCamera:t=>{const a=o(),r=a.savedCameras.find(l=>l.id===t);if(!r)return;const i={...JSON.parse(JSON.stringify(r)),id:Me(),label:r.label+" (copy)"},n=a.savedCameras.indexOf(r),s=[...a.savedCameras];if(s.splice(n+1,0,i),e({savedCameras:s,activeCameraId:i.id}),R.emit("camera_teleport",i),e({cameraRot:i.rotation,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance||3.5}),i.optics){const l=Ht(o());l&&l(i.optics)}Q.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=o().formula,a=he.get(t),r=a==null?void 0:a.defaultPreset,i=(r==null?void 0:r.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},n=(r==null?void 0:r.cameraPos)||{x:0,y:0,z:3.5},s=(r==null?void 0:r.cameraRot)||{x:0,y:0,z:0,w:1},l=(r==null?void 0:r.targetDistance)||3.5,d=i.x+i.xL+n.x,u=i.y+i.yL+n.y,f=i.z+i.zL+n.z,p=G.split(d),h=G.split(u),g=G.split(f),x={x:p.high,y:h.high,z:g.high,xL:p.low,yL:h.low,zL:g.low};o().setSceneOffset(x),e({cameraRot:s,targetDistance:l});const m={position:{x:0,y:0,z:0},rotation:s,sceneOffset:x,targetDistance:l};R.emit("reset_accum",void 0),R.emit("camera_teleport",m)},undoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(t.length===0)return;const r=t[t.length-1];let i;if(Q.activeCamera&&Q.virtualSpace)i=Q.virtualSpace.getUnifiedCameraState(Q.activeCamera,o().targetDistance),Q.virtualSpace.applyCameraState(Q.activeCamera,r);else{const n=o();i={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}r.sceneOffset&&e({sceneOffset:r.sceneOffset}),e({cameraRot:r.rotation,targetDistance:r.targetDistance||3.5,redoStack:[...a,i],undoStack:t.slice(0,-1)}),R.emit("reset_accum",void 0),R.emit("camera_teleport",r)},redoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(a.length===0)return;const r=a[a.length-1];let i;if(Q.activeCamera&&Q.virtualSpace)i=Q.virtualSpace.getUnifiedCameraState(Q.activeCamera,o().targetDistance),Q.virtualSpace.applyCameraState(Q.activeCamera,r);else{const n=o();i={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}r.sceneOffset&&e({sceneOffset:r.sceneOffset}),e({cameraRot:r.rotation,targetDistance:r.targetDistance||3.5,undoStack:[...t,i],redoStack:a.slice(0,-1)}),R.emit("reset_accum",void 0),R.emit("camera_teleport",r)}});class ca{constructor(){M(this,"features",new Map);M(this,"sortedCache",null)}register(o){if(o.dependsOn)for(const t of o.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${o.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(o.id,o),this.sortedCache=null}get(o){return this.features.get(o)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(o=>o.tabConfig).map(o=>({id:o.id,...o.tabConfig})).sort((o,t)=>o.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(o=>o.viewportConfig).map(o=>({id:o.id,...o.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(o=>o.menuConfig).map(o=>({id:o.id,...o.menuConfig}))}getExtraMenuItems(){const o=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(a=>o.push({...a,featureId:t.id}))}),o}getEngineFeatures(){return Array.from(this.features.values()).filter(o=>!!o.engineConfig)}getDictionary(){const o={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const a=t.shortId||t.id,r={};Object.entries(t.params).forEach(([i,n])=>{n.shortId&&(r[i]=n.shortId)}),o.features.children[t.id]={_alias:a,children:r}}),o}getUniformDefinitions(){const o=[];return this.features.forEach(t=>{Object.values(t.params).forEach(a=>{if(a.uniform){let r=a.type,i=a.default;r==="color"&&(r="vec3"),r==="boolean"&&(r="float",i=i?1:0),(r==="image"||r==="gradient")&&(r="sampler2D",i=null),o.push({name:a.uniform,type:r,default:i})}}),t.extraUniforms&&o.push(...t.extraUniforms)}),o}topologicalSort(){const o=Array.from(this.features.values()),t=new Map;o.forEach((s,l)=>t.set(s.id,l));const a=new Map,r=new Map;for(const s of o)a.set(s.id,0),r.has(s.id)||r.set(s.id,[]);for(const s of o)if(s.dependsOn)for(const l of s.dependsOn)this.features.has(l)&&(a.set(s.id,(a.get(s.id)||0)+1),r.get(l).push(s.id));const i=[];for(const s of o)a.get(s.id)===0&&i.push(s.id);const n=[];for(;i.length>0;){i.sort((l,d)=>(t.get(l)||0)-(t.get(d)||0));const s=i.shift();n.push(this.features.get(s));for(const l of r.get(s)||[]){const d=(a.get(l)||1)-1;a.set(l,d),d===0&&i.push(l)}}if(n.length!==o.length){const s=o.filter(l=>!n.includes(l)).map(l=>l.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${s.join(", ")}`),o}return n}}const j=new ca,da=je(),ua=e=>{const o={formula:e.formula,pipeline:e.pipeline,renderRegion:e.renderRegion?{...e.renderRegion}:null};return j.getAll().forEach(a=>{const r=e[a.id];r&&(o[a.id]=JSON.parse(JSON.stringify(r)))}),o},Vt=(e,o,t)=>{const a=t();o(e),Object.keys(e).forEach(r=>{const i=r,n=e[i];if(i==="formula"){R.emit("config",{formula:n});return}const s="set"+i.charAt(0).toUpperCase()+i.slice(1);if(typeof a[s]=="function"){a[s](n);return}if(i==="pipeline"){a.setPipeline(n);return}if(i==="graph"){a.setGraph(n);return}const l="set"+i.charAt(0).toUpperCase()+i.slice(1);typeof a[l]=="function"&&!j.get(i)&&a[l](n)}),da.resetAccumulation()},fa=1500;let Gt=0;const pa=(e,o)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const r=t,i=Date.now();i-Gt<fa&&o().undoStack.length>0||(e(s=>{const l=[...s.undoStack,r];return{undoStack:l.length>50?l.slice(-50):l,redoStack:[]}}),Gt=i);return}const a=ua(o());e({interactionSnapshot:a})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:a,aaLevel:r,msaaSamples:i,dpr:n}=o();let s=a==="Auto"||a==="Always"?r:1;if(Math.abs(n-s)>1e-4&&(e({dpr:s}),R.emit("config",{msaaSamples:a==="Auto"||a==="Always"?i:1}),R.emit("reset_accum",void 0)),!t)return;const l=o(),d={};let u=!1;Object.keys(t).forEach(f=>{const p=f,h=t[p],g=l[p];JSON.stringify(h)!==JSON.stringify(g)&&(d[p]=h,u=!0)}),e(u?f=>({paramUndoStack:[...f.paramUndoStack,d],paramRedoStack:[],interactionSnapshot:null}):{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(t.length===0)return;const r=t[t.length-1],i=t.slice(0,-1),n=o(),s={};Object.keys(r).forEach(l=>{s[l]=n[l]}),Vt(r,e,o),e({paramUndoStack:i,paramRedoStack:[...a,s]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(a.length===0)return;const r=a[a.length-1],i=a.slice(0,-1),n=o(),s={};Object.keys(r).forEach(l=>{s[l]=n[l]}),Vt(r,e,o),e({paramUndoStack:[...t,s],paramRedoStack:i})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),Ut=`
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
`,ha=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,ma=`
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
`,ga=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,ya={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new ce(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:1,max:1e3,step:1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new ce(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,o,t)=>{if(t!=="Main")return;e.addPostProcessLogic(ma),e.addPostProcessLogic(ga);const a=o.atmosphere;a&&a.glowEnabled&&(a.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(Ut,ha)):e.addVolumeTracing(Ut,""))}},ba=`
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
`,va={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new ve(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:ba,mainUV:`
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
        `}},xa={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
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
        `}},Sa=`
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
`,wa=`
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
`,_a=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,Ia={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:Xo,minFilter:Wo,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new ce(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:(e,o,t)=>{t!=="Mesh"&&(e.addHeader(_a),e.addMaterialLogic(wa),e.addFunction(Sa))}},Ca={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
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
        `}},Ma={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:Ot,wrapT:Ot,minFilter:Ft,magFilter:Ft},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new ve(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new ve(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},bo=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = log(max(1.0e-5, result.y)) * -0.2;"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
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
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = log(max(1.0e-5, g_orbitTrap.x)) * -0.2;"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = log(max(1.0e-5, g_orbitTrap.y)) * -0.2;"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = log(max(1.0e-5, g_orbitTrap.z)) * -0.2;"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = log(max(1.0e-5, g_orbitTrap.w)) * -0.2;"}],Ra=()=>{let e=`
    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return bo.forEach(o=>{e+=`
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
    `,e},qt=bo.map(e=>({label:e.label,value:e.value})),Pa={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:qt},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:qt},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new ce(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,o,t)=>{const a=o.coloring;(a==null?void 0:a.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(Ra()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},La={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},Ea={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},ka={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},Ta={id:"decoupled",label:"Decoupled",glsl:`
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
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new N(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},za={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new N(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},Da={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},Aa={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Fa={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
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
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},Oa={id:"menger",label:"Menger (Cubic)",glsl:`
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
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new N(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},lt=[La,Ea,ka,Ta,za,Da,Aa,Fa,Oa],ja=lt.map((e,o)=>({label:e.label,value:o}));function Na(e){return lt[e]??lt[0]}const $a=`
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
`,Ba=["xyz","xzy","yxz","yzx","zxy","zyx"];function Ha(e){const o=Ba[e]??"xyz";return o==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${o};`}function Va(e,o,t=!1){return`
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
`}function Ga(){const e={};return lt.forEach((o,t)=>{o.extraParams&&Object.entries(o.extraParams).forEach(([a,r])=>{e[a]={...r,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const Ua={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:ja.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new N(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new N(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new N(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...Ga(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new N(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new N(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new N(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new N(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,o)=>{const t=o.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const r=t?t.preRotMaster!==!1:!0;e.setRotation(r),e.addPreamble($a);const i=(t==null?void 0:t.hybridCompiled)??!1;if(!i)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const d=(t==null?void 0:t.hybridFoldType)??0,u=Na(d);e.addFunction(u.glsl);const f=(t==null?void 0:t.hybridPermute)??0,p=Ha(f);e.addFunction(Va(p,u.rotMode??"wrap",u.selfContained??!1))}let n="",s="";if(o.formula!=="MandelTerrain"&&(s+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),i)if(!(t&&t.hybridComplex))n+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const u=(t==null?void 0:t.hybridSwap)??!1;n+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,s+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${u?"1":"0"}) {
                        int rel_i = i - ${u?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybridFold("",n,s)}},Wt=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF"],Xt=["uVec2A","uVec2B","uVec2C"],Yt=["uVec3A","uVec3B","uVec3C"],Kt=["uVec4A","uVec4B","uVec4C"],vo=["uInterlaceParamA","uInterlaceParamB","uInterlaceParamC","uInterlaceParamD","uInterlaceParamE","uInterlaceParamF"],xo=["uInterlaceVec2A","uInterlaceVec2B","uInterlaceVec2C"],So=["uInterlaceVec3A","uInterlaceVec3B","uInterlaceVec3C"],wo=["uInterlaceVec4A","uInterlaceVec4B","uInterlaceVec4C"];function qa(){const e=[];for(let o=0;o<Wt.length;o++)e.push([new RegExp(`\\b${Wt[o]}\\b`,"g"),vo[o]]);for(let o=0;o<Xt.length;o++)e.push([new RegExp(`\\b${Xt[o]}\\b`,"g"),xo[o]]);for(let o=0;o<Yt.length;o++)e.push([new RegExp(`\\b${Yt[o]}\\b`,"g"),So[o]]);for(let o=0;o<Kt.length;o++)e.push([new RegExp(`\\b${Kt[o]}\\b`,"g"),wo[o]]);return e}const Wa=qa();function Rt(e){let o=e;for(const[t,a]of Wa)o=o.replace(t,a);return o}function Pt(e,o){const t=[...o].sort((r,i)=>i.length-r.length);let a=e;for(const r of t)a=a.replace(new RegExp(`\\b${r}\\b`,"g"),`interlace_${r}`);return a}function Xa(e,o,t){let a=e;return a=a.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),r=>`interlace_${r}`),t&&t.length>0&&(a=Pt(a,t)),a=Rt(a),a}function Ya(e,o,t){let a=e;return a=a.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace"),a=Rt(a),t&&t.length>0&&(a=Pt(a,t)),a}function Ka(e,o){return e.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace")}function Ja(e,o,t){let a=e;return a=a.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),r=>`interlace_${r}`),a=Rt(a),t&&t.length>0&&(a=Pt(a,t)),a}function Za(e,o,t){let a="";o&&(a=`
    vec3 _il_savedAxis = gmt_rotAxis;
    float _il_savedCos = gmt_rotCos;
    float _il_savedSin = gmt_rotSin;
    vec3 _il_interlaceAxis = gmt_rotAxis;
    float _il_interlaceCos = gmt_rotCos;
    float _il_interlaceSin = gmt_rotSin;
    if (uInterlaceEnabled > 0.5) {
        ${o}
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
    }`;return{preLoop:a,inLoop:n}}const ot={scalars:vo,vec2s:xo,vec3s:So,vec4s:wo};function Qa(){return he.getAll().filter(e=>e.id!=="Modular").map(e=>({label:e.name,value:e.id}))}const _o={interlaceParamA:"paramA",interlaceParamB:"paramB",interlaceParamC:"paramC",interlaceParamD:"paramD",interlaceParamE:"paramE",interlaceParamF:"paramF",interlaceVec3A:"vec3A",interlaceVec3B:"vec3B",interlaceVec3C:"vec3C",interlaceVec2A:"vec2A",interlaceVec2B:"vec2B",interlaceVec2C:"vec2C"},er=Object.fromEntries(Object.entries(_o).map(([e,o])=>[o,e]));function tr(e){const o=he.get(e);if(!o)return{};const t={};for(const a of o.parameters){if(!a)continue;const r=er[a.id];r!==void 0&&(t[r]=a.default)}return t}function Io(e,o){const t=e==null?void 0:e.interlaceFormula;if(!t)return;const a=he.get(t);if(!a)return;const r=_o[o];return a.parameters.find(i=>i&&i.id===r)??void 0}function ge(e){return o=>{const t=Io(o,e);if(!t)return;const a={label:t.label};return t.min!==void 0&&(a.min=t.min),t.max!==void 0&&(a.max=t.max),t.step!==void 0&&(a.step=t.step),t.mode&&(a.mode=t.mode),t.scale&&(a.scale=t.scale),t.linkable!==void 0&&(a.linkable=t.linkable),t.options&&(a.options=t.options),a}}function ye(e){return o=>!!Io(o,e)}const or={id:"interlace",shortId:"il",name:"Formula Interlace",category:"Formulas",dependsOn:["coreMath","geometry"],engineConfig:{toggleParam:"interlaceCompiled",mode:"compile",label:"Formula Interlacing",description:"Alternate between two formulas per iteration (like Mandelbulber hybrid).",groupFilter:"engine_settings"},panelConfig:{compileParam:"interlaceCompiled",runtimeToggleParam:"interlaceEnabled",compileSettingsParams:["interlaceFormula"],runtimeGroup:"interlace_runtime",label:"Interlace",compileMessage:"Compiling interlaced formula..."},params:{interlaceCompiled:{type:"boolean",default:!1,label:"Formula Interlacing",shortId:"ilc",group:"engine_settings",ui:"checkbox",description:"Compiles a secondary formula into the shader for per-iteration alternation.",onUpdate:"compile",noReset:!0,estCompileMs:1500},interlaceFormula:{type:"float",default:"Mandelbulb",label:"Secondary Formula",shortId:"ilf",group:"engine_settings",get options(){return Qa().map(e=>({label:e.label,value:e.value,estCompileMs:800}))},description:"Formula to alternate with the primary formula each iteration.",onUpdate:"compile",noReset:!0,condition:{param:"interlaceCompiled",bool:!0},onSet:e=>tr(e)},interlaceEnabled:{type:"boolean",default:!1,label:"Interlace Active",shortId:"ile",uniform:"uInterlaceEnabled",group:"interlace_runtime",hidden:!0},interlaceInterval:{type:"float",default:2,label:"Interval",shortId:"ili",uniform:"uInterlaceInterval",min:1,max:10,step:1,group:"interlace_runtime",description:"Run secondary formula every N iterations.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceStartIter:{type:"float",default:0,label:"Start Iter",shortId:"ils",uniform:"uInterlaceStartIter",min:0,max:20,step:1,group:"interlace_runtime",description:"First iteration where secondary formula runs.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceParamA:{type:"float",default:8,label:"Param A",shortId:"ila",uniform:"uInterlaceParamA",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamA"),dynamicVisible:ye("interlaceParamA")},interlaceParamB:{type:"float",default:0,label:"Param B",shortId:"ilb",uniform:"uInterlaceParamB",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamB"),dynamicVisible:ye("interlaceParamB")},interlaceParamC:{type:"float",default:0,label:"Param C",shortId:"ilc2",uniform:"uInterlaceParamC",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamC"),dynamicVisible:ye("interlaceParamC")},interlaceParamD:{type:"float",default:0,label:"Param D",shortId:"ild",uniform:"uInterlaceParamD",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamD"),dynamicVisible:ye("interlaceParamD")},interlaceParamE:{type:"float",default:0,label:"Param E",shortId:"ile2",uniform:"uInterlaceParamE",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamE"),dynamicVisible:ye("interlaceParamE")},interlaceParamF:{type:"float",default:0,label:"Param F",shortId:"ilf2",uniform:"uInterlaceParamF",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceParamF"),dynamicVisible:ye("interlaceParamF")},interlaceVec3A:{type:"vec3",default:new N(0,0,0),label:"Vec3 A",shortId:"ilv3a",uniform:"uInterlaceVec3A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec3A"),dynamicVisible:ye("interlaceVec3A")},interlaceVec3B:{type:"vec3",default:new N(0,0,0),label:"Vec3 B",shortId:"ilv3b",uniform:"uInterlaceVec3B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec3B"),dynamicVisible:ye("interlaceVec3B")},interlaceVec3C:{type:"vec3",default:new N(0,0,0),label:"Vec3 C",shortId:"ilv3c",uniform:"uInterlaceVec3C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec3C"),dynamicVisible:ye("interlaceVec3C")},interlaceVec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"ilv2a",uniform:"uInterlaceVec2A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec2A"),dynamicVisible:ye("interlaceVec2A")},interlaceVec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"ilv2b",uniform:"uInterlaceVec2B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec2B"),dynamicVisible:ye("interlaceVec2B")},interlaceVec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"ilv2c",uniform:"uInterlaceVec2C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:ge("interlaceVec2C"),dynamicVisible:ye("interlaceVec2C")}},groups:{interlace_runtime:{label:"Interlace Controls"}},inject:(e,o,t)=>{const a=o.interlace;if(!(a!=null&&a.interlaceCompiled))return;const r=a.interlaceFormula;if(!r||r==="Modular"||o.formula==="Modular")return;const i=he.get(r);if(!i)return;if(t==="Mesh"){for(const p of ot.scalars)e.addUniform(p,"float");for(const p of ot.vec2s)e.addUniform(p,"vec2");for(const p of ot.vec3s)e.addUniform(p,"vec3");for(const p of ot.vec4s)e.addUniform(p,"vec4");e.addUniform("uInterlaceEnabled","float"),e.addUniform("uInterlaceInterval","float"),e.addUniform("uInterlaceStartIter","float")}if(i.shader.preamble){const p=Xa(i.shader.preamble,i.id,i.shader.preambleVars);e.addPreamble(p)}const n=Ya(i.shader.function,i.id,i.shader.preambleVars);e.addFunction(n);const s=Ka(i.shader.loopBody,i.id);let l="";i.shader.loopInit&&(l=Ja(i.shader.loopInit,i.id,i.shader.preambleVars));const d=!!i.shader.usesSharedRotation,{preLoop:u,inLoop:f}=Za(s,l,d);e.addHybridFold("",u,f)}},on=220,an=24,rn=32,nn=24,sn=24,ln=50,wt=64,Y=8,Ze=2e3,cn=256,dn=50,un={DEFAULT_BITRATE:40},fn=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4"},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4"},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm"}],ar={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:Ze,label:"Hard Loop Cap",shortId:"hc",min:64,max:Ze,step:1,group:"engine_settings",ui:"numeric",description:"Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",onUpdate:"compile",noReset:!0,hidden:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0,hidden:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0,hidden:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:Ze,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!1,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{param:"dynamicScaling",bool:!0},format:e=>`1/${e}x`,noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,o)=>{const t=o.quality,a=(t==null?void 0:t.compilerHardCap)||Ze;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(a).toString())}};class rr{constructor(){M(this,"nodes",new Map)}register(o){this.nodes.set(o.id,o)}get(o){return this.nodes.get(o)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const o={};return this.nodes.forEach(t=>{o[t.category]||(o[t.category]=[]),o[t.category].push(t.id)}),o}}const U=new rr;U.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});U.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});U.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});U.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});U.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});U.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});U.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});U.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});U.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});U.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});U.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});U.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});U.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});U.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});U.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
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
`});U.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});U.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});U.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});U.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});U.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});U.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});U.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});U.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});U.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});U.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});U.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const ir=(e,o)=>{const t=new Set,a=["root-end"],r=new Set;for(;a.length>0;){const f=a.pop();if(r.has(f))continue;r.add(f),f!=="root-end"&&f!=="root-start"&&t.add(f),o.filter(h=>h.target===f).forEach(h=>a.push(h.source))}const i=e.filter(f=>t.has(f.id));if(!i||i.length===0)return`
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
    `;const s=new Map;s.set("root-start","v_start");let l=0;i.forEach((f,p)=>{const g=`v_${f.id.replace(/[^a-zA-Z0-9]/g,"")}`;s.set(f.id,g);const x=o.filter(T=>T.target===f.id),m=x.find(T=>!T.targetHandle||T.targetHandle==="a"),y=x.find(T=>T.targetHandle==="b"),b=m&&s.get(m.source)||"v_start",C=y&&s.get(y.source)||"v_start";if(n+=`    // Node: ${f.type} (${f.id})
`,n+=`    vec3 ${g}_p = ${b}_p;
`,n+=`    float ${g}_d = ${b}_d;
`,n+=`    float ${g}_dr = ${b}_dr;
`,f.enabled){const T=U.get(f.type);if(T){const S=f.condition&&f.condition.active;let I="    ";if(S){const P=Math.round(Math.max(1,f.condition.mod)),A=Math.round(f.condition.rem);n+=`    if ( (i - (i/${P})*${P}) == ${A} ) {
`,I="        "}const E=P=>f.bindings&&f.bindings[P]?`u${f.bindings[P]}`:l<wt?`uModularParams[${l++}]`:"0.0";n+=T.glsl({varName:g,in1:b,in2:C,getParam:E,indent:I}),S&&(n+=`    }
`)}}n+=`
`});const d=o.find(f=>f.target==="root-end");let u="v_start";return d&&d.source!=="root-start"&&(u=s.get(d.source)||"v_start"),n+=`
    z.xyz = ${u}_p;
    dr = ${u}_dr;
    
    float final_d = ${u}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${n}
}
`},nr=e=>{let o="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?o=`
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
        }`},sr={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:re.ModularParams,type:"float",arraySize:wt,default:new Float32Array(wt)}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new N(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new N(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new N(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new ut(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new ut(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new ut(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,o)=>{var u;const t=o.formula,a=o.quality;t==="Modular"&&e.addDefine("PIPELINE_REV",(o.pipelineRevision||0).toString()),["JuliaMorph","MandelTerrain"].includes(t)&&e.addDefine("SKIP_PRE_BAILOUT","1");const r=he.get(t);let i="",n="",s="";const l=(a==null?void 0:a.estimator)||0;let d=nr(l);if(t==="Modular"){const f=ir(o.pipeline||[],((u=o.graph)==null?void 0:u.edges)||[]);i+=f+`
`,n="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else r&&(i+=r.shader.function+`
`,n=r.shader.loopBody,s=r.shader.loopInit||"",r.shader.preamble&&e.addPreamble(r.shader.preamble),r.shader.getDist&&(d=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${r.shader.getDist} }`));e.addFunction(i),e.setFormula(n,s,d)}};let lr=0;function He(){return`l${++lr}`}const cr=(e,o)=>{if(!e)return`
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
    `,r=o<1.5?`
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
        ${r}
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
`},Co=e=>`
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
`,Mo=`
    }

    return Lo;
}
`,dr=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${Co(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Mo}
`,ur=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${Co(e)}
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
${Mo}
`,Ro=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,fr=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,Jt=Ro+fr,pr=`
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
`,hr=`
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
`,mr=()=>`
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
`,gr=(e,o,t=!0)=>`
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
`;function Zt(e){let o=!1;const t=e.map(a=>a.id?a:(o=!0,{...a,id:He()}));return o?t:e}const pn=(e,o)=>!e||!e.lights||o>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[o],yr=[{id:He(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#fff4e6",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:5500},{id:He(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:3500},{id:He(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:7500}],br={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:re.LightCount,type:"int",default:0},{name:re.LightType,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightPos,type:"vec3",arraySize:Y,default:new Array(Y).fill(new N)},{name:re.LightDir,type:"vec3",arraySize:Y,default:new Array(Y).fill(new N(0,-1,0))},{name:re.LightColor,type:"vec3",arraySize:Y,default:new Array(Y).fill(new ce(1,1,1))},{name:re.LightIntensity,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightShadows,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightFalloff,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightFalloffType,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightRadius,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)},{name:re.LightSoftness,type:"float",arraySize:Y,default:new Float32Array(Y).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Softness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Prevents surface acne."},lights:{type:"complex",default:yr,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",Y.toString());const a=o.lighting;if(a&&!a.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
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
             `);return}const r=(a==null?void 0:a.shadowsCompile)!==!1,i=(a==null?void 0:a.shadowAlgorithm)??0,n=i===2?3:i===1?1:2;e.addPostDEFunction(cr(r,n)),!r&&!(a!=null&&a.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(a==null?void 0:a.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),a!=null&&a.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),a!=null&&a.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const s=(a==null?void 0:a.ptStochasticShadows)===!0&&r,l=o.renderMode==="PathTracing"||(a==null?void 0:a.renderMode)===1,d=o.quality,u=(d==null?void 0:d.precisionMode)===1;if(l)e.addIntegrator(Jt),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(gr(u,Y,s));else{const f=(a==null?void 0:a.specularModel)===1;e.addIntegrator(f?Jt:Ro),e.setRenderMode("Direct"),e.addIntegrator(f?ur(s):dr(s)),e.requestShading()}},actions:{updateLight:(e,o)=>{const{index:t,params:a}=o;if(!e.lights||t>=e.lights.length)return{};const r=[...e.lights];return r[t]={...r[t],...a},{lights:r}},addLight:e=>{if(e.lights.length>=Y)return{};const o={id:He(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,o]}},removeLight:(e,o)=>{if(o<0||o>=e.lights.length)return{};const t=[...e.lights];return t.splice(o,1),{lights:t}},duplicateLight:(e,o)=>{if(o<0||o>=e.lights.length||e.lights.length>=Y)return{};const t={...e.lights[o],id:He()},a=[...e.lights];return a.splice(o+1,0,t),{lights:a}}}},vr={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.lightSpheres;!a||a.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(pr),e.addIntegrator(mr()),e.addMissLogic(hr),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},xr={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},Sr={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},wr={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},_r={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new ce("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,o)=>({shapes:[...e.shapes||[],o]}),removeDrawnShape:(e,o)=>({shapes:(e.shapes||[]).filter(t=>t.id!==o)}),updateDrawnShape:(e,o)=>({shapes:(e.shapes||[]).map(t=>t.id===o.id?{...t,...o.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},Qt=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],Ir={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,o)=>{const t=Qt[e.rules.length%Qt.length],a={id:Me(),target:o.target,source:o.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,a],selectedRuleId:a.id}},removeModulation:(e,o)=>({rules:e.rules.filter(t=>t.id!==o),selectedRuleId:e.selectedRuleId===o?null:e.selectedRuleId}),updateModulation:(e,o)=>({rules:e.rules.map(t=>t.id===o.id?{...t,...o.update}:t)}),selectModulation:(e,o)=>({selectedRuleId:o})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},Cr={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},Mr={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},Rr={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},Pr={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,o)=>{const{mode:t,actions:a}=o,r=Rr[t];return r?(Object.entries(r).forEach(([i,n])=>{const s=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,l=a[s];typeof l=="function"&&l(n)}),{}):{}}}},Lr=(e,o,t=32)=>{if(!e)return`
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
`},Er={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new ce(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const a=o.ao,r=(a==null?void 0:a.aoEnabled)!==!1,i=(a==null?void 0:a.aoStochasticCp)!==!1,n=(a==null?void 0:a.aoMaxSamples)||32;e.addPostDEFunction(Lr(r,i,n))}},kr=()=>`
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
    `,eo=0,pt=1,De=3,Tr=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,zr=`
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
`,Dr={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:pt,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:eo,estCompileMs:0},{label:"Environment Map",value:pt,estCompileMs:0},{label:"Raymarched (Quality)",value:De,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:De},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:De},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:De},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:De}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:De}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.reflections;if(!a||a.enabled===!1)return;const r=a.reflectionMode??pt;if(r!==eo){if(r!==De){e.addShadingLogic(Tr);return}if(r===De){e.addPostDEFunction(kr());const i=Math.max(1,Math.min(3,a.bounces??1));e.addDefine("MAX_REFL_BOUNCES",i.toString()),a.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(zr)}}}},Ar=`
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
`,Fr=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,Or=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,jr=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,Nr={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new ce("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,o,t)=>{const a=o.waterPlane;a&&a.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(Ar),e.addPostMapCode(Fr),e.addPostDistCode(Or),e.addMaterialLogic(jr))}},$r={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},Br=`
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
`,Hr=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,Vr={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new ce(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.volumetric;a!=null&&a.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(Br,""),e.addPostProcessLogic(Hr))}},Gr=()=>{j.register(sr),j.register(Ua),j.register(or),j.register(br),j.register(vr),j.register(Er),j.register(Dr),j.register(ya),j.register(Vr),j.register(Ia),j.register(Nr),j.register(Pa),j.register(Ma),j.register(ar),j.register(va),j.register(xa),j.register(Ca),j.register(xr),j.register(Sr),j.register($r),j.register(wr),j.register(_r),j.register(Ir),j.register(Cr),j.register(Mr),j.register(Pr)},at=e=>{const o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return o?{r:parseInt(o[1],16),g:parseInt(o[2],16),b:parseInt(o[3],16)}:null},Ur=(e,o,t)=>(typeof e=="object"&&(o=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(o)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),hn=({r:e,g:o,b:t})=>{e/=255,o/=255,t/=255;const a=Math.max(e,o,t),r=Math.min(e,o,t);let i=0,n=0,s=a;const l=a-r;if(n=a===0?0:l/a,a!==r){switch(a){case e:i=(o-t)/l+(o<t?6:0);break;case o:i=(t-e)/l+2;break;case t:i=(e-o)/l+4;break}i/=6}return{h:i*360,s:n*100,v:s*100}},mn=(e,o,t)=>{e/=360,o/=100,t/=100;let a=0,r=0,i=0;const n=Math.floor(e*6),s=e*6-n,l=t*(1-o),d=t*(1-s*o),u=t*(1-(1-s)*o);switch(n%6){case 0:a=t,r=u,i=l;break;case 1:a=d,r=t,i=l;break;case 2:a=l,r=t,i=u;break;case 3:a=l,r=d,i=t;break;case 4:a=u,r=l,i=t;break;case 5:a=t,r=l,i=d;break}return{r:a*255,g:r*255,b:i*255}},qr=(e,o,t)=>({r:e.r+(o.r-e.r)*t,g:e.g+(o.g-e.g)*t,b:e.b+(o.b-e.b)*t}),Wr=(e,o)=>{if(Math.abs(o-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,o)),a=Math.log(.5)/Math.log(t);return Math.pow(e,a)},gn=(e,o=1)=>{let t;if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops;else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const a=[...t].sort((i,n)=>i.position-n.position),r=[];for(let i=0;i<a.length;i++){const n=a[i];let s=Math.pow(n.position,1/o);if(s=Math.max(0,Math.min(1,s))*100,r.push(`${n.color} ${s.toFixed(2)}%`),i<a.length-1){const l=a[i+1],d=n.bias??.5;if((n.interpolation||"linear")==="step"){let f=Math.pow(l.position,1/o);f=Math.max(0,Math.min(1,f))*100,r.push(`${n.color} ${f.toFixed(2)}%`),r.push(`${l.color} ${f.toFixed(2)}%`)}else if(Math.abs(d-.5)>.001){const f=n.position+(l.position-n.position)*d;let p=Math.pow(f,1/o)*100;p=Math.max(0,Math.min(100,p)),r.push(`${p.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${r.join(", ")})`},ht=e=>Math.pow(e/255,2.2)*255,mt=e=>{const o=e/255;if(o>=.99)return 255;const t=(Math.sqrt(-10127*o*o+13702*o+9)+59*o-3)/(502-486*o);return Math.max(0,t)*255},to=e=>{const t=new Uint8Array(1024);let a,r="srgb";if(Array.isArray(e))a=e;else if(e&&Array.isArray(e.stops))a=e.stops,r=e.colorSpace||"srgb";else return t;if(a.length===0){for(let s=0;s<256;s++){const l=Math.floor(s/255*255);t[s*4]=l,t[s*4+1]=l,t[s*4+2]=l,t[s*4+3]=255}return t}const i=[...a].sort((s,l)=>s.position-l.position),n=s=>{let l={r:0,g:0,b:0};if(s<=i[0].position)l=at(i[0].color)||{r:0,g:0,b:0};else if(s>=i[i.length-1].position)l=at(i[i.length-1].color)||{r:0,g:0,b:0};else for(let d=0;d<i.length-1;d++)if(s>=i[d].position&&s<=i[d+1].position){const u=i[d],f=i[d+1];let p=(s-u.position)/(f.position-u.position);const h=u.bias??.5;Math.abs(h-.5)>.001&&(p=Wr(p,h));const g=u.interpolation||"linear";g==="step"?p=0:(g==="smooth"||g==="cubic")&&(p=p*p*(3-2*p));const x=at(u.color)||{r:0,g:0,b:0},m=at(f.color)||{r:0,g:0,b:0};l=qr(x,m,p);break}return r==="linear"?{r:ht(l.r),g:ht(l.g),b:ht(l.b)}:r==="aces_inverse"?{r:mt(l.r),g:mt(l.g),b:mt(l.b)}:l};for(let s=0;s<256;s++){const l=s/255,d=n(l);t[s*4]=d.r,t[s*4+1]=d.g,t[s*4+2]=d.b,t[s*4+3]=255}return t},Xr=e=>{const o=Math.max(1e3,Math.min(4e4,e))/100;let t,a,r;return o<=66?t=255:(t=o-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),o<=66?(a=o,a=99.4708025861*Math.log(a)-161.1195681661,a=Math.max(0,Math.min(255,a))):(a=o-60,a=288.1221695283*Math.pow(a,-.0755148492),a=Math.max(0,Math.min(255,a))),o>=66?r=255:o<=19?r=0:(r=o-10,r=138.5177312231*Math.log(r)-305.0447927307,r=Math.max(0,Math.min(255,r))),{r:Math.round(t),g:Math.round(a),b:Math.round(r)}},yn=e=>{const{r:o,g:t,b:a}=Xr(e);return Ur(o,t,a)},Yr=(e,o)=>{const t={};return Gr(),j.getAll().forEach(r=>{const i={},n={};r.state&&Object.assign(i,r.state),Object.entries(r.params).forEach(([l,d])=>{d.composeFrom?d.composeFrom.forEach(u=>{n[u]=l}):i[l]===void 0&&(i[l]=d.default)}),t[r.id]=i;const s=`set${r.id.charAt(0).toUpperCase()+r.id.slice(1)}`;t[s]=l=>{let d=!1;const u={};e(f=>{const p=f[r.id],h={...l};Object.keys(l).forEach(m=>{const y=r.params[m];if(y){const b=l[m];if(b==null)return;y.type==="vec2"&&!(b instanceof ve)&&(h[m]=new ve(b.x,b.y)),y.type==="vec3"&&!(b instanceof N)&&(h[m]=new N(b.x,b.y,b.z)),y.type==="color"&&!(b instanceof ce)&&(typeof b=="string"?h[m]=new ce(b):typeof b=="number"?h[m]=new ce(b):typeof b=="object"&&"r"in b&&(h[m]=new ce(b.r,b.g,b.b)))}}),Object.keys(h).forEach(m=>{const y=r.params[m];if(y!=null&&y.onSet){const b=y.onSet(h[m],p);b&&Object.entries(b).forEach(([C,T])=>{l[C]===void 0&&(h[C]=T)})}});const g={...p,...h},x=new Set;return Object.keys(h).forEach(m=>{const y=r.params[m];if(n[m]&&x.add(n[m]),y&&(y.noReset||(d=!0),y.type!=="image"&&(u[r.id]||(u[r.id]={}),u[r.id][m]=g[m]),y.uniform)){const b=g[m];if(y.type==="image"){const C=y.uniform.toLowerCase().includes("env")?"env":"color";b&&typeof b=="string"?(R.emit("texture",{textureType:C,dataUrl:b}),m==="envMapData"&&g.useEnvMap===!1&&(g.useEnvMap=!0,R.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),m==="layer1Data"&&g.active===!1&&(g.active=!0,R.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(R.emit("texture",{textureType:C,dataUrl:null}),m==="envMapData"&&g.useEnvMap===!0&&(g.useEnvMap=!1,R.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),m==="layer1Data"&&g.active===!0&&(g.active=!1,R.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(y.type==="gradient"){const C=to(b);R.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:C},noReset:!!y.noReset})}else{let C=b;y.type==="boolean"&&(C=b?1:0),y.type==="color"&&!(C instanceof ce)&&(C=new ce(C)),R.emit("uniform",{key:y.uniform,value:C,noReset:!!y.noReset})}}}),x.forEach(m=>{const y=r.params[m];if(y&&y.composeFrom&&y.uniform){const b=y.composeFrom.map(C=>g[C]);if(y.type==="gradient"){const C=g[m];if(C){const T=to(C);R.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:T},noReset:!!y.noReset}),y.noReset||(d=!0)}}else if(y.type==="vec2"){const C=new ve(b[0],b[1]);R.emit("uniform",{key:y.uniform,value:C,noReset:!!y.noReset}),y.noReset||(d=!0)}else if(y.type==="vec3"){const C=new N(b[0],b[1],b[2]);R.emit("uniform",{key:y.uniform,value:C,noReset:!!y.noReset}),y.noReset||(d=!0)}}}),{[r.id]:g}}),Object.keys(u).length>0&&R.emit("config",u),d&&R.emit("reset_accum",void 0)},r.actions&&Object.entries(r.actions).forEach(([l,d])=>{t[l]=u=>{const p=o()[r.id],h=d(p,u);h&&Object.keys(h).length>0&&(e({[r.id]:{...p,...h}}),R.emit("reset_accum",void 0))}})}),t},Kr={id:"shadows",label:"Shadows",renderContext:"direct",controlledParams:["lighting.shadowsCompile","lighting.shadowAlgorithm","lighting.ptStochasticShadows"],tiers:[{label:"Off",overrides:{lighting:{shadows:!1,shadowsCompile:!1,ptStochasticShadows:!1}},estCompileMs:0},{label:"Hard",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,ptStochasticShadows:!1}},estCompileMs:500},{label:"Soft",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1}},estCompileMs:3e3},{label:"Full",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0}},estCompileMs:3800}]},Jr={id:"reflections",label:"Reflections (Direct)",renderContext:"direct",controlledParams:["reflections.reflectionMode","reflections.bounceShadows","reflections.bounces"],tiers:[{label:"Off",overrides:{reflections:{reflectionMode:0,bounceShadows:!1}},estCompileMs:0},{label:"Env Map",overrides:{reflections:{reflectionMode:1,bounceShadows:!1}},estCompileMs:0},{label:"Raymarched",overrides:{reflections:{reflectionMode:3,bounceShadows:!1,bounces:1}},estCompileMs:7500},{label:"Full",overrides:{reflections:{reflectionMode:3,bounceShadows:!0,bounces:2}},estCompileMs:12e3}]},Zr={id:"lighting_quality",label:"Lighting",isAdvanced:!0,controlledParams:["lighting.specularModel","lighting.ptEnabled","lighting.ptNEEAllLights","lighting.ptEnvNEE"],tiers:[{label:"Preview",overrides:{lighting:{advancedLighting:!1,ptEnabled:!1}},estCompileMs:-2500},{label:"Path Traced",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!1,ptEnvNEE:!1}},estCompileMs:1900},{label:"PT + NEE",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!0,ptEnvNEE:!0}},estCompileMs:2500}]},Qr={id:"atmosphere_quality",label:"Atmosphere",controlledParams:["atmosphere.glowEnabled","atmosphere.glowQuality","volumetric.ptVolumetric"],tiers:[{label:"Off",overrides:{atmosphere:{glowEnabled:!1},volumetric:{ptVolumetric:!1}},estCompileMs:0},{label:"Fast Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:1},volumetric:{ptVolumetric:!1}},estCompileMs:200},{label:"Color Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!1}},estCompileMs:400},{label:"Volumetric",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!0}},estCompileMs:5900}]},Lt=[Kr,Jr,Zr,Qr],et=[{id:"preview",label:"Preview",description:"Instant preview shader — navigate without waiting for compile.",subsystems:{shadows:0,reflections:0,lighting_quality:0,atmosphere_quality:0}},{id:"fastest",label:"Fastest",description:"Path traced lighting with fast glow.",subsystems:{shadows:0,reflections:0,lighting_quality:1,atmosphere_quality:1}},{id:"lite",label:"Lite",description:"Hard shadows, env map reflections, color glow.",subsystems:{shadows:1,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"balanced",label:"Balanced",description:"Soft shadows, env map reflections, color glow.",subsystems:{shadows:2,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"full",label:"Full",description:"Full shadows, raymarched reflections, volumetric.",subsystems:{shadows:3,reflections:3,lighting_quality:1,atmosphere_quality:3}},{id:"ultra",label:"Ultra",description:"Full + PT NEE. Experimental.",isAdvanced:!0,subsystems:{shadows:3,reflections:3,lighting_quality:2,atmosphere_quality:3}}],ei={activePreset:"balanced",subsystems:{...et[3].subsystems},isCustomized:!1};function ti(e){return et.find(o=>o.id===e)}function oi(e){for(const o of et)if(Object.keys(o.subsystems).every(a=>o.subsystems[a]===e[a]))return o.id;return null}function bn(e){if(!e.activePreset)return"Custom";const o=ti(e.activePreset);if(!o)return"Custom";if(!e.isCustomized)return o.label;const t=[];for(const a of Lt){const r=o.subsystems[a.id],i=e.subsystems[a.id];if(r!==i){const n=a.tiers[i];t.push(`${a.label}=${(n==null?void 0:n.label)??"?"}`)}}return`${o.label} (${t.join(", ")})`}const ai=4200;function vn(e){let o=ai;for(const t of Lt){const a=e[t.id]??0,r=t.tiers[a];r&&(o+=r.estCompileMs)}return o}let _t=null;function ri(e){_t=e}function oo(e,o){const t=o(),a={};for(const r of Lt){const i=e[r.id]??0,n=r.tiers[i];if(n)for(const[s,l]of Object.entries(n.overrides))a[s]||(a[s]={}),Object.assign(a[s],l)}for(const[r,i]of Object.entries(a)){const n=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,s=t[n];typeof s=="function"&&s(i)}}function ii(e){if(!_t)return;const o=_t(e());R.emit(le.CONFIG,o)}const ni=(e,o)=>({scalability:{...ei},hardwareProfile:null,applyScalabilityPreset:t=>{const a=et.find(r=>r.id===t);a&&(e({scalability:{activePreset:t,subsystems:{...a.subsystems},isCustomized:!1}}),oo(a.subsystems,o))},setSubsystemTier:(t,a)=>{const r=o().scalability,i={...r.subsystems,[t]:a};let n=!1;if(r.activePreset){const l=et.find(d=>d.id===r.activePreset);l&&(n=Object.keys(i).some(d=>i[d]!==l.subsystems[d]))}else n=!0;const s=oi(i);e({scalability:{activePreset:s??r.activePreset,subsystems:i,isCustomized:s?!1:n}}),oo(i,o)},setHardwareProfile:t=>{e({hardwareProfile:t});const r=o().setQuality;typeof r=="function"&&r({compilerHardCap:t.caps.compilerHardCap,precisionMode:t.caps.precisionMode,bufferPrecision:t.caps.bufferPrecision}),ii(o)}});class It{constructor(o,t=null){M(this,"defaultState");M(this,"dictionary");M(this,"reverseDictCache",new Map);this.defaultState=o,this.dictionary=t}encode(o,t){try{const a=this.getDiff(o,this.defaultState);if(!a||Object.keys(a).length===0)return"";let r=this.quantize(a);if(!r||Object.keys(r).length===0)return"";this.dictionary&&(r=this.applyDictionary(r,this.dictionary,!0));const i=JSON.stringify(r),n=jt.deflate(i),s=Array.from(n).map(d=>String.fromCharCode(d)).join("");return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(a){return console.error("UrlStateEncoder: Error encoding",a),""}}decode(o){try{if(!o)return null;let t=o.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const a=atob(t),r=new Uint8Array(a.length);for(let s=0;s<a.length;s++)r[s]=a.charCodeAt(s);const i=jt.inflate(r,{to:"string"});let n=JSON.parse(i);return this.dictionary&&(n=this.applyDictionary(n,this.dictionary,!1)),this.deepMerge({...this.defaultState},n)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(o){if(this.reverseDictCache.has(o))return this.reverseDictCache.get(o);const t={};return Object.keys(o).forEach(a=>{const r=o[a];typeof r=="string"?t[r]=a:t[r._alias]=a}),this.reverseDictCache.set(o,t),t}applyDictionary(o,t,a){if(!o||typeof o!="object"||Array.isArray(o))return o;const r={};if(a)Object.keys(o).forEach(i=>{let n=i,s=null;const l=t[i];l&&(typeof l=="string"?n=l:(n=l._alias,s=l.children));const d=o[i];s&&d&&typeof d=="object"&&!Array.isArray(d)?r[n]=this.applyDictionary(d,s,!0):r[n]=d});else{const i=this.getReverseDict(t);Object.keys(o).forEach(n=>{const s=i[n]||n,l=o[n],d=t[s],u=d&&typeof d=="object"?d.children:null;u&&l&&typeof l=="object"&&!Array.isArray(l)?r[s]=this.applyDictionary(l,u,!1):r[s]=l})}return r}isEqual(o,t){if(o===t)return!0;if(o==null||t==null)return o===t;if(typeof o=="number"&&typeof t=="number")return Math.abs(o-t)<1e-4;if(Array.isArray(o)&&Array.isArray(t))return o.length!==t.length?!1:o.every((a,r)=>this.isEqual(a,t[r]));if(typeof o=="object"&&typeof t=="object"){const a=o,r=t,i=Object.keys(a).filter(s=>!s.startsWith("is")),n=Object.keys(r).filter(s=>!s.startsWith("is"));return i.length!==n.length?!1:i.every(s=>this.isEqual(a[s],r[s]))}return!1}quantize(o){if(typeof o=="string")return o.startsWith("data:image")?void 0:o;if(typeof o=="number")return o===0||Math.abs(o)<1e-9?0:parseFloat(o.toFixed(5));if(Array.isArray(o))return o.map(t=>this.quantize(t));if(o!==null&&typeof o=="object"){const t={};let a=!1;const r=Object.keys(o).filter(i=>!i.startsWith("is"));for(const i of r){const n=this.quantize(o[i]);n!==void 0&&(t[i]=n,a=!0)}return a?t:void 0}return o}getDiff(o,t){if(this.isEqual(o,t))return;if(typeof o!="object"||o===null||typeof t!="object"||t===null||Array.isArray(o))return o;const a={};let r=!1;const i=o,n=t;return Object.keys(i).forEach(s=>{if(s.startsWith("is")||s==="histogramData"||s==="interactionSnapshot"||s==="liveModulations"||s.endsWith("Stack"))return;const l=this.getDiff(i[s],n[s]);l!==void 0&&(a[s]=l,r=!0)}),r?a:void 0}deepMerge(o,t){if(typeof t!="object"||t===null)return t;const a={...o};return Object.keys(t).forEach(r=>{typeof t[r]=="object"&&t[r]!==null&&!Array.isArray(t[r])?a[r]=this.deepMerge(o[r]||{},t[r]):a[r]=t[r]}),a}}const si=(e,o)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,zoomLevel:1,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=o();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const a=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:a,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(o().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),li=(e,o)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,a)=>e(r=>({selectedTrackIds:a?r.selectedTrackIds.includes(t)?r.selectedTrackIds.filter(i=>i!==t):[...r.selectedTrackIds,t]:[t]})),selectTracks:(t,a)=>e(r=>{const i=new Set(r.selectedTrackIds);return a?t.forEach(n=>i.add(n)):t.forEach(n=>i.delete(n)),{selectedTrackIds:Array.from(i)}}),selectKeyframe:(t,a,r)=>e(i=>{const n=`${t}::${a}`;return{selectedKeyframeIds:r?i.selectedKeyframeIds.includes(n)?i.selectedKeyframeIds.filter(s=>s!==n):[...i.selectedKeyframeIds,n]:[n]}}),selectKeyframes:(t,a)=>e(r=>({selectedKeyframeIds:a?Array.from(new Set([...r.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,a)=>e({softSelectionRadius:t,softSelectionEnabled:a}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,a)=>e({bounceTension:t,bounceFriction:a})});function Po(e,o,t,a,r){const i=1-e,n=e*e,s=i*i,l=s*i,d=n*e;return l*o+3*s*e*t+3*i*n*a+d*r}function ao(e,o){let t=o[0],a=o[o.length-1];for(let u=0;u<o.length-1;u++)if(e>=o[u].frame&&e<o[u+1].frame){t=o[u],a=o[u+1];break}if(e>=a.frame)return a.value;if(e<=t.frame)return t.value;const r=a.frame-t.frame,i=(e-t.frame)/r;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(a.value-t.value)*i;const n=t.value,s=t.value+(t.rightTangent?t.rightTangent.y:0),l=a.value+(a.leftTangent?a.leftTangent.y:0),d=a.value;return Po(i,n,s,l,d)}function ci(e,o=1){const t=[],a=e[0].frame,r=e[e.length-1].frame,i=Math.max(o,(r-a)/50);for(let n=a;n<=r;n+=i)t.push({t:n,val:ao(n,e)});return t.length>0&&t[t.length-1].t<r&&t.push({t:r,val:ao(r,e)}),t}function di(e,o,t){let a=0,r=0,i=0,n=0,s=0,l=0,d=0;for(let m=0;m<e.length;m++){const y=e[m].t,b=1-y,C=e[m].val;l+=C,d+=C*C;const T=3*b*b*y,S=3*b*y*y,I=b*b*b*o+y*y*y*t,E=C-I;a+=T*T,r+=T*S,i+=S*S,n+=E*T,s+=E*S}const u=e.length,f=l/u;if(d/u-f*f<1e-9)return null;const h=a*i-r*r;if(Math.abs(h)<1e-9)return null;const g=(i*n-r*s)/h,x=(a*s-r*n)/h;return{h1:g,h2:x}}function ui(e,o){const t=e.length;if(t<2){const h=e[0].val;return{leftY:h,rightY:h}}const a=e[0].val,r=e[t-1].val,i=r-a,n=a+i*.333,s=a+i*.666,l=di(e,a,r);let d=n,u=s;l&&(d=l.h1,u=l.h2);const f=n+(d-n)*o,p=s+(u-s)*o;return{leftY:f,rightY:p}}function Ct(e,o,t,a){if(e.length<2)return;const r=e[0],i=e[e.length-1],n=i.t-r.t,s=e.map(p=>({t:(p.t-r.t)/n,val:p.val})),{leftY:l,rightY:d}=ui(s,a);let u=0,f=-1;if(n<1)u=0;else for(let p=1;p<s.length-1;p++){const h=s[p].t,g=Po(h,r.val,l,d,i.val),x=Math.abs(g-s[p].val);x>u&&(u=x,f=p)}if(u<=t||e.length<=2){const p=o[o.length-1];p&&(p.rightTangent={x:n*.333,y:l-r.val});const h={id:Me(),frame:i.t,value:i.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-n*.333,y:d-i.val},rightTangent:{x:1,y:0}};o.push(h)}else{const p=e.slice(0,f+1),h=e.slice(f);Ct(p,o,t,a),Ct(h,o,t,a)}}const fi=(e,o,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const a=[...e].sort((s,l)=>s.frame-l.frame),r=ci(a,1),i=[],n=r[0];return i.push({id:Me(),frame:n.t,value:n.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),Ct(r,i,o,t),i.length>0&&(i[0].leftTangent={x:-1,y:0},i[i.length-1].rightTangent={x:1,y:0}),i},pi=4;function Lo(e,o,t,a,r){const i=1-e,n=e*e,s=i*i,l=s*i,d=n*e;return l*o+3*s*e*t+3*i*n*a+d*r}function hi(e,o,t,a,r){const i=1-e;return 3*i*i*(t-o)+6*i*e*(a-t)+3*e*e*(r-a)}function mi(e,o,t,a,r){const i=r-o;if(i<=1e-9)return 0;let n=(e-o)/i;for(let s=0;s<pi;++s){const l=Lo(n,o,t,a,r),d=hi(n,o,t,a,r);if(Math.abs(d)<1e-9)break;const u=l-e;n-=u/d}return Math.max(0,Math.min(1,n))}function gi(e,o,t,a,r,i,n,s,l){const d=o,u=t,f=o+a,p=t+r,h=i+s,g=n+l,x=i,m=n,y=mi(e,d,f,h,x);return Lo(y,u,p,g,m)}const be=.333,Te={interpolate:(e,o,t,a=!1)=>{if(o.interpolation==="Step")return o.value;let r=o.value,i=t.value;if(a){const l=Math.PI*2,d=i-r;d>Math.PI?i-=l:d<-Math.PI&&(i+=l)}if(o.interpolation==="Bezier"){const l=o.rightTangent?o.rightTangent.x:(t.frame-o.frame)*be,d=o.rightTangent?o.rightTangent.y:0,u=t.leftTangent?t.leftTangent.x:-(t.frame-o.frame)*be,f=t.leftTangent?t.leftTangent.y:0;return gi(e,o.frame,r,l,d,t.frame,i,u,f)}const n=t.frame-o.frame;if(n<1e-9)return r;const s=(e-o.frame)/n;return r+(i-r)*s},scaleHandles:(e,o,t,a,r)=>{const i={};if(e.interpolation!=="Bezier")return i;if(o&&e.leftTangent){const n=a-o.frame,s=r-o.frame;if(Math.abs(n)>1e-5&&Math.abs(s)>1e-5){const l=s/n;i.leftTangent={x:e.leftTangent.x*l,y:e.leftTangent.y*l}}}if(t&&e.rightTangent){const n=t.frame-a,s=t.frame-r;if(Math.abs(n)>1e-5&&Math.abs(s)>1e-5){const l=s/n;i.rightTangent={x:e.rightTangent.x*l,y:e.rightTangent.y*l}}}return i},calculateTangents:(e,o,t,a)=>{if(a==="Ease"){const m=o?(e.frame-o.frame)*be:10,y=t?(t.frame-e.frame)*be:10;return{l:{x:-m,y:0},r:{x:y,y:0}}}if(!o&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!o){const m=(t.value-e.value)/(t.frame-e.frame),y=(t.frame-e.frame)*be;return{l:{x:-10,y:0},r:{x:y,y:y*m}}}if(!t){const m=(e.value-o.value)/(e.frame-o.frame),y=(e.frame-o.frame)*be;return{l:{x:-y,y:-y*m},r:{x:10,y:0}}}const r=e.frame-o.frame,i=e.value-o.value,n=r===0?0:i/r,s=t.frame-e.frame,l=t.value-e.value,d=s===0?0:l/s;if(n*d<=0){const m=r*be,y=s*be;return{l:{x:-m,y:0},r:{x:y,y:0}}}const u=t.frame-o.frame,f=t.value-o.value;let p=u===0?0:f/u;const h=3*Math.min(Math.abs(n),Math.abs(d));Math.abs(p)>h&&(p=Math.sign(p)*h);const g=r*be,x=s*be;return{l:{x:-g,y:-g*p},r:{x,y:x*p}}},constrainHandles:(e,o,t)=>{var r,i;const a={};if(e.leftTangent&&o){const n=e.frame-o.frame;if(n>.001){const s=n*be;if(Math.abs(e.leftTangent.x)>s){const l=s/Math.abs(e.leftTangent.x);a.leftTangent={x:e.leftTangent.x*l,y:e.leftTangent.y*l}}e.leftTangent.x>0&&(a.leftTangent={x:0,y:((r=a.leftTangent)==null?void 0:r.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const n=t.frame-e.frame;if(n>.001){const s=n*be;if(Math.abs(e.rightTangent.x)>s){const l=s/Math.abs(e.rightTangent.x);a.rightTangent={x:e.rightTangent.x*l,y:e.rightTangent.y*l}}e.rightTangent.x<0&&(a.rightTangent={x:0,y:((i=a.rightTangent)==null?void 0:i.y)??e.rightTangent.y})}}return a},calculateSoftFalloff:(e,o,t)=>{if(e>=o)return 0;const a=e/o;switch(t){case"Linear":return 1-a;case"Dome":return Math.sqrt(1-a*a);case"Pinpoint":return Math.pow(1-a,4);case"S-Curve":return .5*(1+Math.cos(a*Math.PI));default:return 1-a}}},gt={updateNeighbors:(e,o)=>{const t=e[o],a=o===e.length-1,r=o-1;if(r>=0){const n={...e[r]};if(e[r]=n,n.interpolation==="Bezier"){const s=t.frame-n.frame;if(n.autoTangent){const l=e[r-1],{l:d,r:u}=Te.calculateTangents(n,l,t,"Auto");n.leftTangent=d,n.rightTangent=u}else{const l=Te.constrainHandles(n,e[r-1],t);Object.assign(n,l)}if(a&&s>1e-4){const l=s*.3,d=n.rightTangent||{x:10,y:0};if(d.x<l){const u=l/Math.max(1e-4,Math.abs(d.x));n.rightTangent={x:l,y:d.y*u}}}}}const i=o+1;if(i<e.length){const n={...e[i]};if(e[i]=n,n.interpolation==="Bezier")if(n.autoTangent){const s=e[i+1],{l,r:d}=Te.calculateTangents(n,t,s,"Auto");n.leftTangent=l,n.rightTangent=d}else{const s=Te.constrainHandles(n,t,e[i+1]);Object.assign(n,s)}}},inferInterpolation:(e,o)=>{const t=e.filter(a=>a.frame<o).sort((a,r)=>r.frame-a.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},yi=je(),bi={durationFrames:300,fps:30,tracks:{}},vi=(e,o)=>({sequence:bi,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=o().sequence,a=JSON.parse(JSON.stringify(t));e(r=>{const i=[...r.undoStack,{type:"SEQUENCE",data:a}];return{undoStack:i.length>50?i.slice(1):i,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:a,sequence:r}=o();if(t.length===0)return!1;const i=t[t.length-1],n=t.slice(0,-1),l={type:"SEQUENCE",data:JSON.parse(JSON.stringify(r))};return e({sequence:i.data,undoStack:n,redoStack:[l,...a]}),!0},redo:()=>{const{undoStack:t,redoStack:a,sequence:r}=o();if(a.length===0)return!1;const i=a[0],n=a.slice(1),l={type:"SEQUENCE",data:JSON.parse(JSON.stringify(r))};return e({sequence:i.data,undoStack:[...t,l],redoStack:n}),!0},setSequence:t=>{o().snapshot(),e({sequence:t})},addTrack:(t,a)=>{o().snapshot(),e(r=>r.sequence.tracks[t]?r:{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{id:t,type:"float",label:a,keyframes:[]}}}})},removeTrack:t=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks};return delete r[t],{sequence:{...a.sequence,tracks:r},selectedTrackIds:a.selectedTrackIds.filter(i=>i!==t)}})},setTrackBehavior:(t,a)=>{o().snapshot(),e(r=>{const i=r.sequence.tracks[t];return i?{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...i,postBehavior:a}}}}:r})},addKeyframe:(t,a,r,i)=>{e(n=>{const s=n.sequence.tracks[t];if(!s)return n;let l=i||"Bezier";i||(l=gt.inferInterpolation(s.keyframes,a));const d=l==="Bezier",u={id:Me(),frame:a,value:r,interpolation:l,autoTangent:d,brokenTangents:!1},p=[...s.keyframes.filter(g=>Math.abs(g.frame-a)>.001),u].sort((g,x)=>g.frame-x.frame),h=p.findIndex(g=>g.id===u.id);if(l==="Bezier"){const g=h>0?p[h-1]:void 0,x=h<p.length-1?p[h+1]:void 0,{l:m,r:y}=Te.calculateTangents(u,g,x,"Auto");u.leftTangent=m,u.rightTangent=y}return gt.updateNeighbors(p,h),{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[t]:{...s,keyframes:p}}}}})},batchAddKeyframes:(t,a,r)=>{e(i=>{const n={...i.sequence.tracks};let s=!1;return a.forEach(({trackId:l,value:d})=>{n[l]||(n[l]={id:l,type:"float",label:l,keyframes:[]},s=!0);const u=n[l],f=[...u.keyframes],p=f.length>0?f[f.length-1]:null,h={id:Me(),frame:t,value:d,interpolation:r||"Linear",autoTangent:r==="Bezier",brokenTangents:!1};if(p)if(t>p.frame)f.push(h);else if(Math.abs(t-p.frame)<.001)h.id=p.id,f[f.length-1]=h;else{const g=f.filter(x=>Math.abs(x.frame-t)>.001);g.push(h),g.sort((x,m)=>x.frame-m.frame),u.keyframes=g,s=!0;return}else f.push(h);u.keyframes=f,s=!0}),s?{sequence:{...i.sequence,tracks:n}}:i})},removeKeyframe:(t,a)=>{o().snapshot(),e(r=>{const i=r.sequence.tracks[t];return i?{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...i,keyframes:i.keyframes.filter(n=>n.id!==a)}}}}:r})},updateKeyframe:(t,a,r)=>{e(i=>{const n=i.sequence.tracks[t];if(!n)return i;const s=n.keyframes.map(l=>l.id===a?{...l,...r}:l).sort((l,d)=>l.frame-d.frame);return{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...n,keyframes:s}}}}})},updateKeyframes:t=>{e(a=>{const r={...a.sequence.tracks};return t.forEach(({trackId:i,keyId:n,patch:s})=>{const l=r[i];if(l){const d=l.keyframes.findIndex(u=>u.id===n);if(d!==-1){const u=l.keyframes[d];s.interpolation==="Bezier"&&u.interpolation!=="Bezier"&&(s.autoTangent=!0),l.keyframes[d]={...u,...s}}}}),Object.keys(r).forEach(i=>{r[i].keyframes.sort((n,s)=>n.frame-s.frame)}),{sequence:{...a.sequence,tracks:r}}})},deleteSelectedKeyframes:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks},r=new Set(t.selectedKeyframeIds);return Object.keys(a).forEach(i=>{a[i]={...a[i],keyframes:a[i].keyframes.filter(n=>!r.has(`${i}::${n.id}`))}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks};return Object.keys(a).forEach(r=>{a[r]={...a[r],keyframes:[]}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{o().snapshot(),e({sequence:{...o().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks};return a.selectedKeyframeIds.forEach(i=>{const[n,s]=i.split("::"),l=r[n];if(l){const d=l.keyframes.findIndex(f=>f.id===s);if(d===-1)return;const u=l.keyframes[d];if(t==="Split")l.keyframes[d]={...u,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let f=u.rightTangent,p=u.leftTangent;if(f&&p){const h=Math.sqrt(f.x*f.x+f.y*f.y),g=Math.sqrt(p.x*p.x+p.y*p.y);f={x:-p.x*(h/Math.max(.001,g)),y:-p.y*(h/Math.max(.001,g))}}l.keyframes[d]={...u,rightTangent:f,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const f=l.keyframes[d-1],p=l.keyframes[d+1],{l:h,r:g}=Te.calculateTangents(u,f,p,t);l.keyframes[d]={...u,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:h,rightTangent:g}}}}),{sequence:{...a.sequence,tracks:r}}})},setGlobalInterpolation:(t,a)=>{o().snapshot(),e(r=>{const i={...r.sequence.tracks};return Object.keys(i).forEach(n=>{const s=i[n];s.keyframes.length!==0&&s.keyframes.forEach((l,d)=>{if(l.interpolation=t,t==="Bezier"&&a){const u=s.keyframes[d-1],f=s.keyframes[d+1],{l:p,r:h}=Te.calculateTangents(l,u,f,a);l.leftTangent=p,l.rightTangent=h,l.autoTangent=a==="Auto",l.brokenTangents=!1}})}),{sequence:{...r.sequence,tracks:i}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:a}=o();if(a.length===0)return;let r=1/0;a.forEach(n=>{var u,f;const[s,l]=n.split("::"),d=(f=(u=t.tracks[s])==null?void 0:u.keyframes.find(p=>p.id===l))==null?void 0:f.frame;d!==void 0&&d<r&&(r=d)});const i=[];a.forEach(n=>{var u;const[s,l]=n.split("::"),d=(u=t.tracks[s])==null?void 0:u.keyframes.find(f=>f.id===l);d&&i.push({relativeFrame:d.frame-r,value:d.value,interpolation:d.interpolation,leftTangent:d.leftTangent,rightTangent:d.rightTangent,originalTrackId:s})}),i.length>0&&e({clipboard:i})},pasteKeyframes:t=>{const{clipboard:a,currentFrame:r}=o();a&&(o().snapshot(),e(i=>{const n={...i.sequence.tracks},s=t!==void 0?t:r;return a.forEach(l=>{const d=n[l.originalTrackId];if(d){const u=s+l.relativeFrame,f={id:Me(),frame:u,value:l.value,interpolation:l.interpolation,leftTangent:l.leftTangent,rightTangent:l.rightTangent,autoTangent:!1,brokenTangents:!1};d.keyframes=[...d.keyframes.filter(p=>Math.abs(p.frame-u)>.001),f].sort((p,h)=>p.frame-h.frame)}}),{sequence:{...i.sequence,tracks:n}}}))},duplicateSelection:()=>{o().copySelectedKeyframes(),o().pasteKeyframes(o().currentFrame)},loopSelection:t=>{const a=o();if(a.selectedKeyframeIds.length<1)return;a.snapshot();let r=1/0,i=-1/0;if(a.selectedKeyframeIds.forEach(s=>{const[l,d]=s.split("::"),u=a.sequence.tracks[l],f=u==null?void 0:u.keyframes.find(p=>p.id===d);f&&(f.frame<r&&(r=f.frame),f.frame>i&&(i=f.frame))}),r===1/0||i===-1/0)return;const n=Math.max(1,i-r);e(s=>{const l={...s.sequence.tracks};for(let d=1;d<=t;d++){const u=n*d;s.selectedKeyframeIds.forEach(f=>{const[p,h]=f.split("::"),g=l[p];if(!g)return;const x=g.keyframes.find(m=>m.id===h);if(x){const m=x.frame+u,y={...x,id:Me(),frame:m};g.keyframes=[...g.keyframes.filter(b=>Math.abs(b.frame-m)>.001),y]}})}return Object.values(l).forEach(d=>d.keyframes.sort((u,f)=>u.frame-f.frame)),{sequence:{...s.sequence,tracks:l}}})},captureCameraFrame:(t,a=!1,r)=>{const i=Be()||yi.activeCamera;if(!i)return;a||o().snapshot();const n=Qe.getUnifiedFromEngine(),s=i.quaternion,l=new Ve().setFromQuaternion(s),d=[{id:"camera.unified.x",val:n.x,label:"Position X"},{id:"camera.unified.y",val:n.y,label:"Position Y"},{id:"camera.unified.z",val:n.z,label:"Position Z"},{id:"camera.rotation.x",val:l.x,label:"Rotation X"},{id:"camera.rotation.y",val:l.y,label:"Rotation Y"},{id:"camera.rotation.z",val:l.z,label:"Rotation Z"}];e(u=>{const f={...u.sequence.tracks},p=f["camera.unified.x"],h=!p||p.keyframes.length===0,g=r||(h?"Linear":"Bezier");return d.forEach(x=>{let m=f[x.id];m||(m={id:x.id,type:"float",label:x.label,keyframes:[],hidden:!1},f[x.id]=m);const y={id:Me(),frame:t,value:x.val,interpolation:g,autoTangent:g==="Bezier",brokenTangents:!1},C=[...m.keyframes.filter(S=>Math.abs(S.frame-t)>.001),y].sort((S,I)=>S.frame-I.frame),T=C.findIndex(S=>S.id===y.id);if(g==="Bezier"){const S=T>0?C[T-1]:void 0,I=T<C.length-1?C[T+1]:void 0,{l:E,r:P}=Te.calculateTangents(y,S,I,"Auto");y.leftTangent=E,y.rightTangent=P}gt.updateNeighbors(C,T),m.keyframes=C}),{sequence:{...u.sequence,tracks:f}}})},simplifySelectedKeys:(t=.01)=>{o().snapshot(),e(a=>{const r=a,i={...r.sequence.tracks},n=new Set(r.selectedKeyframeIds),s={};r.selectedKeyframeIds.forEach(d=>{const[u,f]=d.split("::");s[u]||(s[u]=[]);const p=r.sequence.tracks[u],h=p==null?void 0:p.keyframes.find(g=>g.id===f);h&&s[u].push(h)});const l=[];return Object.entries(s).forEach(([d,u])=>{const f=i[d];if(!f)return;const p={...f};if(i[d]=p,u.length<3)return;const h=u.sort((x,m)=>x.frame-m.frame);p.keyframes=p.keyframes.filter(x=>!n.has(`${d}::${x.id}`));const g=fi(h,t);p.keyframes=[...p.keyframes,...g].sort((x,m)=>x.frame-m.frame),g.forEach(x=>l.push(`${d}::${x.id}`))}),{sequence:{...r.sequence,tracks:i},selectedKeyframeIds:l}})}}),Mt=po()(ho((e,o,t)=>({...si(e,o),...li(e),...vi(e,o)})));typeof window<"u"&&(window.useAnimationStore=Mt);const Ye=je(),nt=e=>{const o={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const a=e[t];if(a&&typeof a=="object"&&"isColor"in a)o[t]="#"+a.getHexString();else if(a&&typeof a=="object"&&("isVector2"in a||"isVector3"in a)){const r={...a};delete r.isVector2,delete r.isVector3,o[t]=r}else o[t]=a}),o},Eo=e=>{const o=he.get(e),t=o&&o.defaultPreset?o.defaultPreset:{},a={version:5,name:e,formula:e,features:{}};return j.getAll().forEach(r=>{const i={};Object.entries(r.params).forEach(([n,s])=>{s.composeFrom||(i[n]=s.default)}),a.features[r.id]=nt(i)}),t.features&&Object.entries(t.features).forEach(([r,i])=>{a.features[r]?a.features[r]={...a.features[r],...nt(i)}:a.features[r]=nt(i)}),t.lights&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.lights=t.lights),t.renderMode&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),a.cameraMode=t.cameraMode||"Orbit",a.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},a.lights=[],a.animations=t.animations||[],a.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},a.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},a.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},a.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},a.targetDistance=t.targetDistance||3.5,a.duration=t.duration||300,a.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},a},xi=(e,o,t)=>{const a=t(),r=e.features||{};if(e.renderMode&&(r.lighting||(r.lighting={}),r.lighting.renderMode===void 0&&(r.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),r.atmosphere&&!r.ao){const b={};r.atmosphere.aoIntensity!==void 0&&(b.aoIntensity=r.atmosphere.aoIntensity),r.atmosphere.aoSpread!==void 0&&(b.aoSpread=r.atmosphere.aoSpread),r.atmosphere.aoMode!==void 0&&(b.aoMode=r.atmosphere.aoMode),r.atmosphere.aoEnabled!==void 0&&(b.aoEnabled=r.atmosphere.aoEnabled),Object.keys(b).length>0&&(r.ao=b)}const i=new Set(["compilerHardCap","precisionMode","bufferPrecision"]);if(j.getAll().forEach(b=>{const C=`set${b.id.charAt(0).toUpperCase()+b.id.slice(1)}`,T=a[C];if(typeof T=="function"){const S=r[b.id],I={},E=b.id==="quality"?t().quality:null;if(b.state&&Object.assign(I,b.state),Object.entries(b.params).forEach(([P,A])=>{if(b.id==="quality"&&i.has(P)&&E){I[P]=E[P];return}if(S&&S[P]!==void 0){let v=S[P];A.type==="vec2"&&v&&!(v instanceof ve)?v=new ve(v.x,v.y):A.type==="vec3"&&v&&!(v instanceof N)?v=new N(v.x,v.y,v.z):A.type==="color"&&v&&!(v instanceof ce)&&(v=new ce(v)),I[P]=v}else if(I[P]===void 0){let v=A.default;v&&typeof v=="object"&&(typeof v.clone=="function"?v=v.clone():Array.isArray(v)?v=[...v]:v={...v}),I[P]=v}}),b.id==="lighting"&&S){if(S.lights)I.lights=Zt(S.lights.map(P=>({...P,type:P.type||"Point",rotation:P.rotation||{x:0,y:0,z:0}})));else if(S.light0_posX!==void 0){const P=[];for(let A=0;A<3;A++)if(S[`light${A}_posX`]!==void 0){let v=S[`light${A}_color`]||"#ffffff";v.getHexString&&(v="#"+v.getHexString()),P.push({type:"Point",position:{x:S[`light${A}_posX`],y:S[`light${A}_posY`],z:S[`light${A}_posZ`]},rotation:{x:0,y:0,z:0},color:v,intensity:S[`light${A}_intensity`]??1,falloff:S[`light${A}_falloff`]??0,falloffType:S[`light${A}_type`]?"Linear":"Quadratic",fixed:S[`light${A}_fixed`]??!1,visible:S[`light${A}_visible`]??A===0,castShadow:S[`light${A}_castShadow`]??!0})}P.length>0&&(I.lights=P)}}b.id==="materials"&&S&&S.envMapVisible!==void 0&&S.envBackgroundStrength===void 0&&(I.envBackgroundStrength=S.envMapVisible?1:0),T(I)}}),e.lights&&e.lights.length>0){const b=a.setLighting;if(typeof b=="function"){const C=Zt(e.lights.map(T=>({...T,type:T.type||"Point",rotation:T.rotation||{x:0,y:0,z:0}})));b({lights:C})}}e.sequence&&Mt.getState().setSequence(e.sequence),a.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&o({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const n=e.cameraPos||{x:0,y:0,z:3.5},s=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},l=e.targetDistance||3.5,d=e.cameraRot||{x:0,y:0,z:0,w:1},u=s.x+s.xL+n.x,f=s.y+s.yL+n.y,p=s.z+s.zL+n.z,h=G.split(u),g=G.split(f),x=G.split(p),m={x:h.high,y:g.high,z:x.high,xL:h.low,yL:g.low,zL:x.low};o({cameraRot:d,targetDistance:l,sceneOffset:m,cameraMode:e.cameraMode||t().cameraMode}),Ye.activeCamera&&Ye.virtualSpace&&Ye.virtualSpace.applyCameraState(Ye.activeCamera,{position:{x:0,y:0,z:0},rotation:d,sceneOffset:m,targetDistance:l});const y={position:{x:0,y:0,z:0},rotation:d,sceneOffset:m,targetDistance:l};Ye.pendingTeleport=y,R.emit("camera_teleport",y),e.duration&&Mt.getState().setDuration(e.duration),e.formula==="Modular"&&a.refreshPipeline(),a.refreshHistogram(),R.emit("reset_accum",void 0)},Si={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},wi=(e,o,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const a=Eo(e.formula);a.formula="";const r=j.getDictionary();return new It(a,r).encode(e,o)}catch(a){return console.error("Sharing: Failed to generate share string",a),""}},xn=e=>{if(!e)return null;try{const o=j.getDictionary(),a=new It(Si,o).decode(e);if(a&&a.formula){const r=Eo(a.formula);return new It(r,o).decode(e)}}catch(o){console.error("Sharing: Failed to load share string",o)}return null},yt=je();class _i{constructor(){M(this,"pendingCam");M(this,"binders",new Map);M(this,"overriddenTracks",new Set);M(this,"lastCameraIndex",-1);M(this,"animStore",null);M(this,"fractalStore",null);this.pendingCam={rot:new Ve,unified:new N,rotDirty:!1,unifiedDirty:!1}}connect(o,t){this.animStore=o,this.fractalStore=t}setOverriddenTracks(o){this.overriddenTracks=o}getBinder(o){if(this.binders.has(o))return this.binders.get(o);let t=()=>{};if(o==="camera.active_index")t=a=>{const r=Math.round(a);if(r!==this.lastCameraIndex){const i=this.fractalStore.getState(),n=i.savedCameras;n&&n[r]&&(i.selectCamera(n[r].id),this.lastCameraIndex=r)}};else if(o.startsWith("camera.")){const a=o.split("."),r=a[1],i=a[2];r==="unified"?t=n=>{this.pendingCam.unified[i]=n,this.pendingCam.unifiedDirty=!0}:r==="rotation"&&(t=n=>{this.pendingCam.rot[i]=n,this.pendingCam.rotDirty=!0})}else if(o.startsWith("lights.")){const a=o.split("."),r=parseInt(a[1]),i=a[2];let n="";i==="position"?n=`pos${a[3].toUpperCase()}`:i==="color"?n="color":n=i;const s=`lighting.light${r}_${n}`;return this.getBinder(s)}else if(o.startsWith("lighting.light")){const a=o.match(/lighting\.light(\d+)_(\w+)/);if(a){const r=parseInt(a[1]),i=a[2],n=this.fractalStore.getState();if(i==="intensity")t=s=>n.updateLight({index:r,params:{intensity:s}});else if(i==="falloff")t=s=>n.updateLight({index:r,params:{falloff:s}});else if(i.startsWith("pos")){const s=i.replace("pos","").toLowerCase();t=l=>{var f;const u=(f=this.fractalStore.getState().lighting)==null?void 0:f.lights[r];if(u){const p={...u.position,[s]:l};n.updateLight({index:r,params:{position:p}})}}}else if(i.startsWith("rot")){const s=i.replace("rot","").toLowerCase();t=l=>{var f;const u=(f=this.fractalStore.getState().lighting)==null?void 0:f.lights[r];if(u){const p={...u.rotation,[s]:l};n.updateLight({index:r,params:{rotation:p}})}}}}}else if(o.includes(".")){const a=o.split("."),r=a[0],i=a[1];if(j.get(r)){const s=this.fractalStore.getState(),l=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,d=s[l];if(d&&typeof d=="function"){const u=i.match(/^(vec[23][ABC])_(x|y|z)$/);if(u){const f=u[1],p=u[2];t=h=>{var m;const x=(m=this.fractalStore.getState()[r])==null?void 0:m[f];if(x){const y=x.clone();y[p]=h,d({[f]:y})}}}else t=f=>d({[i]:f})}else console.warn(`AnimationEngine: Setter ${l} not found for feature ${r}`)}}else{const a=this.fractalStore.getState(),r="set"+o.charAt(0).toUpperCase()+o.slice(1);typeof a[r]=="function"&&(t=i=>a[r](i))}return this.binders.set(o,t),t}tick(o){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const a=t.fps,r=t.currentFrame,i=t.durationFrames,n=t.loopMode,s=o*a;let l=r+s;if(l>=i)if(n==="Once"||t.isRecordingModulation){l=i,this.scrub(i),this.animStore.setState({isPlaying:!1,currentFrame:i}),t.isRecordingModulation&&t.stopModulationRecording();return}else l=0;this.animStore.setState({currentFrame:l}),this.scrub(l)}scrub(o){if(!this.animStore)return;const{sequence:t,isPlaying:a,isRecording:r,recordCamera:i}=this.animStore.getState(),n=Object.values(t.tracks);this.syncBuffersFromEngine();const s=a&&r&&i;for(let l=0;l<n.length;l++){const d=n[l];if(this.overriddenTracks.has(d.id)||d.keyframes.length===0||d.type!=="float"||d.id.includes("camera.position")||d.id.includes("camera.offset")||s&&d.id.startsWith("camera."))continue;const u=this.interpolate(d,o);this.getBinder(d.id)(u)}this.commitState()}syncBuffersFromEngine(){const o=Be()||yt.activeCamera;if(o){this.pendingCam.rot.setFromQuaternion(o.quaternion);const t=yt.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+o.position.x,t.y+t.yL+o.position.y,t.z+t.zL+o.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(o,t){const a=o.keyframes;if(a.length===0)return 0;const r=a[0],i=a[a.length-1],n=o.id.startsWith("camera.rotation")||o.id.includes("rot")||o.id.includes("phase")||o.id.includes("twist");if(t>i.frame){const s=o.postBehavior||"Hold";if(s==="Hold")return i.value;if(s==="Continue"){let h=0;if(a.length>1){const g=a[a.length-2];i.interpolation==="Linear"?h=(i.value-g.value)/(i.frame-g.frame):i.interpolation==="Bezier"&&(i.leftTangent&&Math.abs(i.leftTangent.x)>.001?h=i.leftTangent.y/i.leftTangent.x:h=(i.value-g.value)/(i.frame-g.frame))}return i.value+h*(t-i.frame)}const l=i.frame-r.frame;if(l<=.001)return i.value;const d=t-r.frame,u=Math.floor(d/l),f=r.frame+d%l,p=this.evaluateCurveInternal(a,f,n);if(s==="Loop")return p;if(s==="PingPong"){if(u%2===1){const g=i.frame-d%l;return this.evaluateCurveInternal(a,g,n)}return p}if(s==="OffsetLoop"){const h=i.value-r.value;return p+h*u}}return t<r.frame?r.value:this.evaluateCurveInternal(a,t,n)}evaluateCurveInternal(o,t,a){for(let r=0;r<o.length-1;r++){const i=o[r],n=o[r+1];if(t>=i.frame&&t<=n.frame)return Te.interpolate(t,i,n,a)}return o[o.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){yt.shouldSnapCamera=!0;const o=new Oe().setFromEuler(this.pendingCam.rot),t={x:o.x,y:o.y,z:o.z,w:o.w},a=G.split(this.pendingCam.unified.x),r=G.split(this.pendingCam.unified.y),i=G.split(this.pendingCam.unified.z);R.emit(le.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:a.high,y:r.high,z:i.high,xL:a.low,yL:r.low,zL:i.low}}),this.fractalStore.setState({cameraRot:t})}}}const Ii=new _i,Sn=(e,o)=>{const t={};e.forEach(n=>t[n.id]=[]),o.forEach(n=>{t[n.source]&&t[n.source].push(n.target)});const a=new Set,r=new Set,i=n=>{if(!a.has(n)){a.add(n),r.add(n);const s=t[n]||[];for(const l of s)if(!a.has(l)&&i(l)||r.has(l))return!0}return r.delete(n),!1};for(const n of e)if(i(n.id))return!0;return!1},ro=(e,o)=>{const t={},a={};e.forEach(n=>{t[n.id]=[],a[n.id]=0}),o.forEach(n=>{t[n.source]&&(t[n.source].push(n.target),a[n.target]=(a[n.target]||0)+1)});const r=[];e.forEach(n=>{a[n.id]===0&&r.push(n.id)});const i=[];for(;r.length>0;){r.sort();const n=r.shift(),s=e.find(l=>l.id===n);if(s){const{position:l,...d}=s;i.push(d)}if(t[n])for(const l of t[n])a[l]--,a[l]===0&&r.push(l)}return i},io=e=>{const o=e.map((a,r)=>({...a,position:{x:250,y:150+r*200}})),t=[];if(o.length>0){t.push({id:`e-root-start-${o[0].id}`,source:"root-start",target:o[0].id});for(let a=0;a<o.length-1;a++)t.push({id:`e-${o[a].id}-${o[a+1].id}`,source:o[a].id,target:o[a+1].id});t.push({id:`e-${o[o.length-1].id}-root-end`,source:o[o.length-1].id,target:"root-end"})}return{nodes:o,edges:t}},Ci=(e,o)=>{if(e.length!==o.length)return!1;for(let t=0;t<e.length;t++){const a=e[t],r=o[t];if(a.id!==r.id||a.type!==r.type||a.enabled!==r.enabled)return!1;const i=a.bindings||{},n=r.bindings||{},s=Object.keys(i).filter(f=>i[f]!==void 0),l=Object.keys(n).filter(f=>n[f]!==void 0);if(s.length!==l.length)return!1;for(const f of s)if(i[f]!==n[f])return!1;const d=a.condition||{active:!1,mod:0,rem:0},u=r.condition||{active:!1,mod:0,rem:0};if(d.active!==u.active||d.active&&(d.mod!==u.mod||d.rem!==u.rem))return!1}return!0},Mi=(e,o)=>e.length!==o.length?!1:JSON.stringify(e)===JSON.stringify(o),no=[{id:"note-1",type:"Note",enabled:!0,params:{},text:`Infinite Repetition
The 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals.`},{id:"mod-1",type:"Mod",enabled:!0,params:{x:4,y:4,z:0}},{id:"note-2",type:"Note",enabled:!0,params:{},text:`Dynamic Rotation
This rotation is bound to 'ParamC' (Slider below). Try dragging it!`},{id:"rot-1",type:"Rotate",enabled:!0,params:{x:0,y:0,z:0},bindings:{z:"ParamC"}},{id:"bulb-1",type:"Mandelbulb",enabled:!0,params:{power:8}},{id:"add-c",type:"AddConstant",enabled:!0,params:{scale:1}}],se=je(),pe=po()(ho((e,o,t)=>({...Zo(e,o),...ea(e,o),...la(e,o),...pa(e,o),...Yr(e,o),...ni(e,o),formula:"Mandelbulb",pipeline:no,pipelineRevision:1,graph:io(no),projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(a,r={})=>{const i=o(),n=i.formula;if(n===a&&a!=="Modular")return;r.skipDefaultPreset||(o().resetParamHistory(),e({undoStack:[],redoStack:[]}));const s=i.projectSettings.name;let l=s;if((s===n||s==="Untitled"||s==="Custom Preset")&&(l=a),e({formula:a,projectSettings:{...i.projectSettings,name:l}}),R.emit(le.CONFIG,{formula:a,pipeline:i.pipeline,graph:i.graph}),a!=="Modular"&&!r.skipDefaultPreset){const d=he.get(a),u=d&&d.defaultPreset?JSON.parse(JSON.stringify(d.defaultPreset)):{formula:a};u.features||(u.features={});const f=o();if(j.getEngineFeatures().forEach(h=>{const g=f[h.id];if(!g)return;const x=u.features[h.id]||{},m={},y=h.engineConfig.toggleParam;g[y]!==void 0&&x[y]===void 0&&(m[y]=g[y]),Object.entries(h.params).forEach(([b,C])=>{C.onUpdate==="compile"&&g[b]!==void 0&&x[b]===void 0&&(m[b]=g[b])}),u.features[h.id]||(u.features[h.id]={}),Object.assign(u.features[h.id],m)}),o().lockSceneOnSwitch){const h=o().getPreset(),g={...h.features||{}},x=u.features||{};x.coreMath&&(g.coreMath=x.coreMath),x.geometry&&(g.geometry=x.geometry);const m={...h,formula:a,features:g};o().loadPreset(m)}else o().loadPreset(u)}o().handleInteractionEnd()},setProjectSettings:a=>e(r=>{const i={...r.projectSettings,...a};return a.name&&a.name!==r.projectSettings.name?(i.version=0,{projectSettings:i,lastSavedHash:null}):{projectSettings:i}}),prepareExport:()=>{const a=o(),r=a.getPreset({includeScene:!0}),{version:i,name:n,...s}=r,l=JSON.stringify(s);if(a.lastSavedHash===null||a.projectSettings.version===0){const d=Math.max(1,a.projectSettings.version+1);return e({projectSettings:{...a.projectSettings,version:d},lastSavedHash:l}),d}if(a.lastSavedHash!==l){const d=a.projectSettings.version+1;return e({projectSettings:{...a.projectSettings,version:d},lastSavedHash:l}),d}return a.projectSettings.version},setAnimations:a=>{const r=o().animations,i=a.map(n=>{const s=r.find(l=>l.id===n.id);if(!s)return n;if(n.period!==s.period&&n.period>0){const l=performance.now()/1e3,d=(l/s.period+s.phase-l/n.period)%1;return{...n,phase:(d+1)%1}}return n});e({animations:i})},setLiveModulations:a=>e({liveModulations:a}),setGraph:a=>{const r=ro(a.nodes,a.edges),i=o();if(Ci(i.pipeline,r))Mi(i.pipeline,r)?e({graph:a}):(e({graph:a,pipeline:r}),R.emit(le.CONFIG,{pipeline:r}));else if(i.autoCompile){const n=i.pipelineRevision+1;e({graph:a,pipeline:r,pipelineRevision:n}),R.emit(le.CONFIG,{pipeline:r,graph:a,pipelineRevision:n})}else e({graph:a})},setPipeline:a=>{const r=o().pipelineRevision+1,i=io(a);e({pipeline:a,graph:i,pipelineRevision:r}),R.emit(le.CONFIG,{pipeline:a,graph:i,pipelineRevision:r})},refreshPipeline:()=>{const a=o(),r=ro(a.graph.nodes,a.graph.edges),i=a.pipelineRevision+1;e({pipeline:r,pipelineRevision:i}),R.emit(le.CONFIG,{pipeline:r,graph:a.graph,pipelineRevision:i})},loadPreset:a=>{a._formulaDef&&!he.get(a.formula)&&he.register(a._formulaDef),o().resetParamHistory();const r=he.get(a.formula),i=r?r.id:a.formula;e({formula:i}),R.emit(le.CONFIG,{formula:i});let n=a.name;(!n||n==="Untitled"||n==="Custom Preset")&&(n=i),e({projectSettings:{name:n,version:0},lastSavedHash:null}),xi(a,e,o),setTimeout(()=>{const s=o().getPreset({includeScene:!0}),{version:l,name:d,...u}=s;e({lastSavedHash:JSON.stringify(u)})},50)},loadScene:({def:a,preset:r})=>{if(a&&(he.get(a.id)||he.register(a),R.emit(le.REGISTER_FORMULA,{id:a.id,shader:a.shader})),o().loadPreset(r),!se.isBooted&&!se.bootSent)return;const i=ko(o());R.emit(le.CONFIG,i);const n=o().sceneOffset;if(n){const s={x:n.x,y:n.y,z:n.z,xL:n.xL??0,yL:n.yL??0,zL:n.zL??0};se.setShadowOffset(s),se.post({type:"OFFSET_SET",offset:s})}},getPreset:a=>{var s,l;const r=o(),i={version:r.projectSettings.version,name:r.projectSettings.name,formula:r.formula,features:{}};if((a==null?void 0:a.includeScene)!==!1){if(i.cameraPos={x:0,y:0,z:0},se.activeCamera&&se.virtualSpace){const d=se.virtualSpace.getUnifiedCameraState(se.activeCamera,r.targetDistance);i.cameraRot=d.rotation,i.sceneOffset=d.sceneOffset,i.targetDistance=d.targetDistance}else i.cameraRot=r.cameraRot,i.sceneOffset=r.sceneOffset,i.targetDistance=r.targetDistance;i.cameraMode=r.cameraMode,i.lights=[],i.renderMode=r.renderMode,i.quality={aaMode:r.aaMode,aaLevel:r.aaLevel,msaa:r.msaaSamples,accumulation:r.accumulation}}j.getAll().forEach(d=>{const u=r[d.id];u&&(i.features||(i.features={}),i.features[d.id]=nt(u))}),i.animations=r.animations,r.savedCameras.length>0&&(i.savedCameras=r.savedCameras.map(d=>({id:d.id,label:d.label,position:d.position,rotation:d.rotation,sceneOffset:d.sceneOffset,targetDistance:d.targetDistance,optics:d.optics}))),r.formula==="Modular"&&(i.graph=r.graph,i.pipeline=r.pipeline);try{const d=(l=(s=window.useAnimationStore)==null?void 0:s.getState)==null?void 0:l.call(s);d&&(i.sequence=d.sequence,i.duration=d.durationFrames)}catch(d){console.warn("Failed to save animation sequence:",d)}return i},getShareString:a=>{const r=o().getPreset({includeScene:!0}),i=o().advancedMode;return wi(r,i,a)}}))),wn=e=>e.isUserInteracting||e.interactionMode!=="none",_n=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting||e.isBucketRendering||e.tutorialActive&&e.tutorialLessonId===1)return!0;const o=j.getAll();for(const a of o)if((t=a.interactionConfig)!=null&&t.blockCamera&&a.interactionConfig.activeParam){const r=e[a.id];if(r&&r[a.interactionConfig.activeParam])return!0}return!1},ko=e=>{var a;const o={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:{...e.quality}};if(j.getAll().forEach(r=>{const i=e[r.id];i&&(o[r.id]={...i})}),e.hardwareProfile){const r=e.hardwareProfile,i=o.quality;i&&(i.precisionMode=Math.max(i.precisionMode??0,r.caps.precisionMode),i.bufferPrecision=Math.max(i.bufferPrecision??0,r.caps.bufferPrecision),i.compilerHardCap=Math.min(i.compilerHardCap??Ze,r.caps.compilerHardCap)),o.compilerHardCap=((a=o.quality)==null?void 0:a.compilerHardCap)??o.compilerHardCap}return o};ri(ko);const In=()=>{const e=pe.getState();Ii.connect(window.useAnimationStore,pe),se.isPaused=e.isPaused,se.setPreviewSampleCap(e.sampleCap),se.onBooted=()=>{const t=pe.getState(),a=t.sceneOffset;if(a){const r={x:a.x,y:a.y,z:a.z,xL:a.xL??0,yL:a.yL??0,zL:a.zL??0};se.setShadowOffset(r),se.post({type:"OFFSET_SET",offset:r})}se.setPreviewSampleCap(t.sampleCap)},pe.subscribe(t=>t.isPaused,t=>{se.isPaused=t}),pe.subscribe(t=>t.sampleCap,t=>{se.setPreviewSampleCap(t)}),pe.subscribe(t=>{var a;return(a=t.lighting)==null?void 0:a.renderMode},t=>{if(t===void 0)return;const a=t===1?"PathTracing":"Direct";pe.getState().renderMode!==a&&pe.setState({renderMode:a})});let o;pe.subscribe(t=>{var a;return(a=t.optics)==null?void 0:a.camType},t=>{var i;if(t===void 0)return;const a=o!==void 0&&o<.5,r=t>.5&&t<1.5;if(a&&r){const n=pe.getState();if(!n.activeCameraId){const s=((i=n.optics)==null?void 0:i.camFov)||60;let l=se.lastMeasuredDistance;(!l||l>=1e3||l<=0)&&(l=n.targetDistance||3.5);const d=l*Math.tan(s*Math.PI/360),u=n.setOptics;typeof u=="function"&&u({orthoScale:d})}}o=t}),R.on(le.BUCKET_STATUS,({isRendering:t})=>{const a=pe.getState();a.setIsBucketRendering(t),a.setIsExporting(t)})};typeof window<"u"&&(window.__store=pe);const Ri=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"6 9 12 15 18 9"})}),Cn=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"18 15 12 9 6 15"})}),Mn=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("polyline",{points:"15 18 9 12 15 6"})}),Rn=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"9 18 15 12 9 6"})}),Pn=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"9 18 15 12 9 6"})}),Ln=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"})}),En=()=>c.jsx("svg",{width:"100%",height:"100%",viewBox:"0 0 10 10",children:c.jsx("path",{d:"M 6 10 L 10 6 L 10 10 Z",fill:"currentColor",opacity:"0.5"})}),kn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"4",y1:"9",x2:"20",y2:"9"}),c.jsx("line",{x1:"4",y1:"15",x2:"20",y2:"15"})]}),Tn=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})}),zn=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),c.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),Dn=()=>c.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"3",y1:"12",x2:"21",y2:"12"}),c.jsx("line",{x1:"3",y1:"6",x2:"21",y2:"6"}),c.jsx("line",{x1:"3",y1:"18",x2:"21",y2:"18"})]}),An=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"0 0 512 512",fill:"currentColor",children:c.jsx("path",{d:"M0,0v512h512V106.9l-6.5-7.3L412.4,6.5L405.1,0H0z M46.5,46.5h69.8v139.6h279.3V56.7l69.8,69.8v338.9h-46.5V256H93.1v209.5H46.5V46.5z M162.9,46.5H256V93h46.5V46.5H349v93.1H162.9V46.5z M139.6,302.5h232.7v162.9H139.6V302.5z"})}),Fn=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"190 230 680 620",fill:"currentColor",children:c.jsx("path",{d:"M257.3312 451.84V332.8c0-42.3936 34.2016-76.8 76.4416-76.8h107.8272c29.5936 0 56.5248 17.152 69.12 44.032l14.8992 31.6416a25.4976 25.4976 0 0 0 23.04 14.6944h192.8192c42.1888 0 76.4416 34.3552 76.4416 76.8v28.672a76.8 76.8 0 0 1 50.9952 88.064l-43.3152 217.6A76.544 76.544 0 0 1 750.6432 819.2H324.5568a76.544 76.544 0 0 1-74.9568-61.7472l-43.3152-217.6a76.8512 76.8512 0 0 1 51.0464-88.0128z m509.5936-3.84v-24.832c0-14.1312-11.4176-25.6-25.4464-25.6h-192.8192a76.4416 76.4416 0 0 1-69.12-44.032l-14.848-31.6928A25.4976 25.4976 0 0 0 441.6 307.2H333.7216a25.5488 25.5488 0 0 0-25.4976 25.6v115.2h458.6496z m-485.6832 51.2a25.6 25.6 0 0 0-24.9856 30.6176l43.3152 217.6c2.4064 11.9808 12.8512 20.5824 24.9856 20.5824h426.0864a25.4976 25.4976 0 0 0 24.9856-20.5824l43.3152-217.6a25.7024 25.7024 0 0 0-24.9856-30.6176H281.2416z"})}),On=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("line",{x1:"12",cy:"16",x2:"12",y2:"12"}),c.jsx("line",{x1:"12",cy:"8",x2:"12.01",y2:"8"})]}),jn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}),c.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),Nn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M3 10h10a5 5 0 0 1 5 5v2"}),c.jsx("path",{d:"M7 6l-4 4 4 4"})]}),$n=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M21 10h-10a5 5 0 0 0 -5 5v2"}),c.jsx("path",{d:"M17 6l4 4 -4 4"})]}),Bn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}),c.jsx("path",{d:"M3 3v5h5"})]}),Hn=()=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("polyline",{points:"20 6 9 17 4 12"})}),Vn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),c.jsx("polyline",{points:"17 8 12 3 7 8"}),c.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),Gn=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),c.jsx("polyline",{points:"7 10 12 15 17 10"}),c.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),Un=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"4",children:[c.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),c.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),qn=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),c.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]}),Wn=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),Xn=()=>c.jsxs("svg",{width:"64",height:"64",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"5",y:"2",width:"14",height:"20",rx:"2",ry:"2"}),c.jsx("path",{d:"M12 18h.01"})]}),Yn=({className:e})=>c.jsxs("svg",{className:e,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[c.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),c.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),Kn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 18 22 12 16 6"}),c.jsx("polyline",{points:"8 6 2 12 8 18"})]}),Jn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("circle",{cx:"12",cy:"12",r:"10"}),c.jsx("path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}),c.jsx("line",{x1:"9",y1:"9",x2:"9.01",y2:"9"}),c.jsx("line",{x1:"15",y1:"9",x2:"15.01",y2:"9"})]}),Zn=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),c.jsx("polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}),c.jsx("line",{x1:"12",y1:"22.08",x2:"12",y2:"12"})]}),Qn=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",strokeDasharray:"4 4"}),c.jsx("path",{d:"M9 12l2 2 4-4"})]}),es=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"})}),ts=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("circle",{cx:"12",cy:"12",r:"10"})}),os=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 512 512",fill:"currentColor",children:c.jsx("path",{d:"M167.4,59.1l-6.2,8l-23.4,31.4h-19.7V78.8H39.4v19.7H0v354.5h512V98.5H374.2l-23.4-31.4l-6.2-8H167.4z M187.1,98.5h137.8l23.4,31.4l6.2,8h118.2v78.8H358.2c-20.5-35.2-58.7-59.1-102.2-59.1s-81.6,23.9-102.2,59.1H39.4v-78.8h118.2l6.2-8L187.1,98.5z M393.8,157.5v39.4h39.4v-39.4H393.8z M256,196.9c43.8,0,78.8,35,78.8,78.8s-35,78.8-78.8,78.8s-78.8-35-78.8-78.8S212.2,196.9,256,196.9z M39.4,256h100.3c-1.1,6.3-1.8,13.1-1.8,19.7c0,65,53.2,118.2,118.2,118.2s118.2-53.2,118.2-118.2c0-6.6-0.8-13.4-1.8-19.7h100.3v157.5H39.4V256z"})}),as=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 3v18"}),c.jsx("path",{d:"M3 12h18"}),c.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),rs=()=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"})}),is=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),c.jsx("polyline",{points:"2 17 12 22 22 17"}),c.jsx("polyline",{points:"2 12 12 17 22 12"})]}),ns=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 2l-5 9h10l-5 9"}),c.jsx("path",{d:"M12 2v20"})]}),ss=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}),c.jsx("path",{d:"M18 22V8a2 2 0 0 0-2-2H2"})]}),ls=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),c.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"}),c.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"})]}),cs=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),c.jsx("path",{d:"M3 14h7v7H3z",fill:"currentColor",stroke:"none"})]}),ds=()=>c.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:c.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"})}),us=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),c.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),c.jsx("path",{d:"M10 7h4"}),c.jsx("path",{d:"M17 10v4"})]}),fs=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 22V8"}),c.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),c.jsx("circle",{cx:"12",cy:"5",r:"3"})]}),ps=()=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M12 18V8"}),c.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),c.jsx("circle",{cx:"12",cy:"5",r:"3"}),c.jsx("line",{x1:"3",y1:"21",x2:"21",y2:"3",stroke:"currentColor",opacity:"0.9"})]}),hs=({status:e})=>{let o="currentColor";e==="keyed"||e==="partial"?o="#f59e0b":(e==="dirty"||e==="keyed-dirty")&&(o="#ef4444");const t=e==="keyed"||e==="keyed-dirty"?o:"none";return c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:o,strokeWidth:"2.5",children:c.jsx("path",{d:"M12 2L2 12l10 10 10-10L12 2z",fill:t})})},ms=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),c.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]}),gs=()=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[c.jsx("path",{d:"M10 13l-4 4"}),c.jsx("path",{d:"M14 11l4 -4"})]}),ys=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#f59e0b":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 18 22 12 16 6"}),c.jsx("polyline",{points:"8 6 2 12 8 18"})]}),bs=({open:e})=>c.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:`transition-transform ${e?"rotate-90":""}`,children:c.jsx("path",{d:"M9 18l6-6-6-6"})}),vs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"2",y:"2",width:"20",height:"20",rx:"5",ry:"5"}),c.jsx("path",{d:"M16 8h.01"}),c.jsx("path",{d:"M8 8h.01"}),c.jsx("path",{d:"M8 16h.01"}),c.jsx("path",{d:"M16 16h.01"}),c.jsx("path",{d:"M12 12h.01"})]}),xs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"16 3 21 3 21 8"}),c.jsx("line",{x1:"4",y1:"20",x2:"21",y2:"3"}),c.jsx("polyline",{points:"21 16 21 21 16 21"}),c.jsx("line",{x1:"15",y1:"15",x2:"21",y2:"21"}),c.jsx("line",{x1:"4",y1:"4",x2:"9",y2:"9"})]}),Ss=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M8 5v14l11-7z"})}),ws=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M6 19h4V5H6v14zm8-14v14h4V5h-4z"})}),_s=()=>c.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:c.jsx("path",{d:"M6 6h12v12H6z"})}),Is=({active:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:e?"currentColor":"none",stroke:"currentColor",strokeWidth:"2",children:c.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:e?"none":"currentColor",fill:e?"#ef4444":"none"})}),Cs=({active:e})=>c.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:c.jsx("path",{d:"M3 18C3 18 6 5 12 12C18 19 21 5 21 5"})}),Ms=({active:e})=>c.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:[c.jsx("rect",{x:"3",y:"8",width:"6",height:"8"}),c.jsx("rect",{x:"15",y:"8",width:"6",height:"8"})]}),Rs=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),c.jsx("path",{d:"M4 22v-7"}),c.jsx("path",{d:"M8 4v10"}),c.jsx("path",{d:"M12 5v10"}),c.jsx("path",{d:"M16 4v10"}),c.jsx("path",{d:"M4 8h16"}),c.jsx("path",{d:"M4 12h16"})]}),Ps=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),c.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"}),c.jsx("line",{x1:"3",y1:"15",x2:"21",y2:"15"}),c.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),c.jsx("line",{x1:"15",y1:"3",x2:"15",y2:"21"})]}),Ls=({mode:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e==="Loop"||e==="PingPong"?c.jsx("path",{d:"M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3"}):c.jsx("path",{d:"M5 12h14 M12 5l7 7-7 7"})}),Es=({active:e,arming:o})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M3 12h18",strokeOpacity:e||o?.3:.2}),c.jsx("path",{d:"M3 12 Q 6 2, 9 12 T 15 12 T 21 12",stroke:e?"#ef4444":o?"#fca5a5":"currentColor"}),o&&!e&&c.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"#fca5a5",stroke:"none"})]}),ks=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("polyline",{points:"4 14 10 14 10 20"}),c.jsx("polyline",{points:"20 10 14 10 14 4"}),c.jsx("line",{x1:"14",y1:"10",x2:"21",y2:"3"}),c.jsx("line",{x1:"3",y1:"21",x2:"10",y2:"14"})]}),Ts=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}),c.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"currentColor",stroke:"none"})]}),zs=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("line",{x1:"4",y1:"20",x2:"20",y2:"20"}),c.jsx("line",{x1:"4",y1:"4",x2:"20",y2:"4"}),c.jsx("polyline",{points:"4 14 8 10 12 14 16 10 20 14"})]}),Ds=()=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),c.jsx("path",{d:"M4 12h16"}),c.jsx("path",{d:"M12 4v16"}),c.jsx("path",{d:"M16 16l-4 4-4-4"})]}),As=({active:e})=>c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M19 13l-7-7-7 7"}),c.jsx("path",{d:"M5 19l7-7 7 7"}),c.jsx("path",{d:"M12 5l2-2 2 2-2 2-2-2z",fill:e?"#22d3ee":"none",stroke:"none"}),c.jsx("path",{d:"M12 5l-2-2-2 2 2 2 2-2z",fill:e?"#22d3ee":"none",stroke:"none"})]}),Fs=({active:e})=>c.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:c.jsx("path",{d:"M2 12s3-7 7-7 7 7 7 7 3-7 7-7"})}),Os=({active:e})=>c.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:e?"text-gray-200":"text-gray-600",children:[c.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),c.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Pi=e=>{const{value:o,onChange:t,onDragStart:a,onDragEnd:r,step:i=.01,sensitivity:n=1,hardMin:s,hardMax:l,mapping:d,disabled:u,dragThreshold:f=2}=e,[p,h]=L.useState(!1),g=L.useRef(null),x=L.useRef(0),m=L.useRef(0),y=L.useRef(!1),b=L.useRef(!1),C=L.useRef(!1),T=L.useRef(null),S=L.useCallback((v,z)=>{let K=i*.5*n;return v&&(K*=10),z&&(K*=.1),K},[i,n]),I=L.useCallback(v=>{if(u||v.button!==0)return;v.preventDefault(),v.stopPropagation(),v.currentTarget.setPointerCapture(v.pointerId),T.current=v.pointerId,x.current=v.clientX;const z=d?d.toDisplay(o):o;m.current=isNaN(z)?0:z,y.current=!1,b.current=v.shiftKey,C.current=v.altKey,h(!0),a==null||a()},[o,d,u,a]),E=L.useCallback(v=>{if(u||!p||!v.currentTarget.hasPointerCapture(v.pointerId))return;const z=v.clientX-x.current;if(Math.abs(z)>f&&(y.current=!0),!y.current)return;v.preventDefault(),v.stopPropagation();const K=b.current!==v.shiftKey,de=C.current!==v.altKey;if(K||de){const O=S(b.current,C.current),$=m.current+z*O;m.current=$,x.current=v.clientX,b.current=v.shiftKey,C.current=v.altKey}const oe=S(v.shiftKey,v.altKey);let J=m.current+z*oe;s!==void 0&&(J=Math.max(s,J)),l!==void 0&&(J=Math.min(l,J));const w=d?d.fromDisplay(J):J;isNaN(w)||(g.current=w,t(w))},[p,u,i,s,l,d,t,S,f]),P=L.useCallback(v=>{u||(v.currentTarget.releasePointerCapture(v.pointerId),T.current=null,h(!1),g.current=null,r==null||r())},[u,r]),A=L.useCallback(()=>{const v=!y.current;return y.current=!1,v},[]);return{isDragging:p,immediateValueRef:g,handlePointerDown:I,handlePointerMove:E,handlePointerUp:P,handleClick:A}},Li=e=>{const{value:o,mapping:t,onChange:a,onDragStart:r,onDragEnd:i,disabled:n,mapTextInput:s=!1}=e,[l,d]=L.useState(!1),[u,f]=L.useState(""),p=L.useRef(null),h=L.useRef(""),g=L.useCallback(()=>{if(n)return;d(!0);const S=s&&t?t.toDisplay(o):o,I=typeof S=="number"?parseFloat(S.toFixed(6)):S??0,E=String(I);f(E),h.current=E,setTimeout(()=>{p.current&&(p.current.focus(),p.current.select())},10)},[o,t,n,s]),x=L.useCallback(()=>{const S=h.current;let I;if(t!=null&&t.parseInput&&s?I=t.parseInput(S):(I=parseFloat(S),isNaN(I)&&(I=null)),I!==null){const E=s&&t?t.fromDisplay(I):I;r==null||r(),a(E),i==null||i()}d(!1)},[t,a,r,i,s]),m=L.useCallback(()=>{d(!1)},[]),y=L.useCallback(S=>{f(S),h.current=S},[]),b=L.useCallback(S=>{S.key==="Enter"?(S.preventDefault(),x()):S.key==="Escape"&&(S.preventDefault(),m()),S.key!=="Tab"&&S.stopPropagation()},[x,m]),C=L.useCallback(()=>{l||g()},[l,g]),T=L.useCallback(()=>{l&&x()},[l,x]);return{isEditing:l,inputValue:u,inputRef:p,startEditing:g,commitEdit:x,cancelEdit:m,handleInputChange:y,handleKeyDown:b,handleFocus:C,handleBlur:T}},To=e=>e===0||Math.abs(e)<1e-9?"0":parseFloat(e.toFixed(8)).toString(),so={toDisplay:e=>e/Math.PI,fromDisplay:e=>e*Math.PI,format:e=>{const o=e/Math.PI,t=Math.abs(o),a=o<0?"-":"";if(t<.001)return"0";if(Math.abs(t-1)<.001)return`${a}π`;if(Math.abs(t-.5)<.001)return`${a}π/2`;if(Math.abs(t-.25)<.001)return`${a}π/4`;if(Math.abs(t-.75)<.001)return`${a}3π/4`;if(Math.abs(t-2)<.001)return`${a}2π`;const r=Math.round(t*3);if(Math.abs(t-r/3)<.001&&r!==0){if(r===1)return`${a}π/3`;if(r===2)return`${a}2π/3`;if(r===3)return`${a}π`;if(r===4)return`${a}4π/3`;if(r===5)return`${a}5π/3`}return`${a}${t.toFixed(2)}π`},parseInput:e=>{const o=e.trim().toLowerCase().replace(/\s/g,"");if(o==="π"||o==="pi")return Math.PI;if(o==="-π"||o==="-pi")return-Math.PI;if(o.includes("π")||o.includes("pi")){const a=o.replace(/[πpi]/g,"");if(a.includes("/")){const[n,s]=a.split("/").map(d=>parseFloat(d)||1);return(o.startsWith("-")?-1:1)*(Math.abs(n)/s)*Math.PI}const r=a?parseFloat(a):1;return isNaN(r)?null:(o.startsWith("-")?-1:1)*Math.abs(r)*Math.PI}const t=parseFloat(o);return isNaN(t)?null:t}},Ke={toDisplay:e=>e*(180/Math.PI),fromDisplay:e=>e*(Math.PI/180),format:e=>`${(e*(180/Math.PI)).toFixed(1)}°`,parseInput:e=>{const o=e.trim().replace(/°/g,""),t=parseFloat(o);return isNaN(t)?null:t}},zo=(e,o,t,a)=>{const r=a?a.toDisplay(e):e,i=a?a.toDisplay(o):o,n=a?a.toDisplay(t):t;return Math.max(0,Math.min(100,(r-i)/(n-i)*100))},bt=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r=.01,sensitivity:i=1,min:n,max:s,hardMin:l,hardMax:d,mapping:u,format:f,mapTextInput:p,disabled:h=!1,highlight:g=!1,liveValue:x,defaultValue:m,onImmediateChange:y})=>{const b=te.useRef(null),C=te.useCallback(B=>f?f(B):u!=null&&u.format?u.format(B):To(B),[f,u]),{isDragging:T,immediateValueRef:S,handlePointerDown:I,handlePointerMove:E,handlePointerUp:P,handleClick:A}=Pi({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,sensitivity:i,hardMin:l,hardMax:d,mapping:u,disabled:h}),v=te.useCallback(B=>{E(B);const Z=S.current;Z!==null&&(b.current&&(b.current.textContent=C(Z)),y==null||y(Z))},[E,S,C,y]),{isEditing:z,inputValue:K,inputRef:de,startEditing:oe,handleInputChange:J,handleKeyDown:w,handleBlur:O}=Li({value:e,mapping:u,onChange:o,onDragStart:t,onDragEnd:a,disabled:h,mapTextInput:p}),$=te.useMemo(()=>C(e),[e,C]),ue=te.useCallback(()=>{!h&&!z&&oe()},[h,z,oe]),ae=te.useCallback(B=>{if(h)return;A()&&oe()},[h,A,oe]),q=`
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${h?"cursor-not-allowed opacity-50 text-gray-600":"cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50"}
        ${T?"bg-cyan-500/20 text-cyan-300":(T||g||x!==void 0&&!h)&&!h?"text-cyan-400":h?"":"text-gray-300 hover:text-white"}
    `;return z?c.jsx("input",{ref:de,type:"text",value:K,onChange:B=>J(B.target.value),onBlur:O,onKeyDown:w,className:"w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1",onClick:B=>B.stopPropagation(),autoFocus:!0}):c.jsx("div",{ref:b,"data-role":"value",tabIndex:h?-1:0,onPointerDown:I,onPointerMove:v,onPointerUp:P,onClick:ae,onFocus:ue,className:q,title:h?"Disabled":"Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)",children:$})},Ei=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r=.01,min:i,max:n,hardMin:s,hardMax:l,mapping:d,format:u,overrideText:f,mapTextInput:p,label:h,labelSuffix:g,headerRight:x,showTrack:m=!0,trackPosition:y="below",trackHeight:b=20,variant:C="full",className:T="",defaultValue:S,onReset:I,liveValue:E,showLiveIndicator:P=!0,onContextMenu:A,dataHelpId:v,disabled:z=!1,highlight:K=!1})=>{const de=te.useRef(null),oe=te.useRef(null),J=te.useRef(null),w=te.useRef({active:!1,startX:0,startValue:0,lastShift:!1,lastAlt:!1}),O=i!==void 0&&n!==void 0&&i!==n,$=te.useMemo(()=>{if(!O)return 0;const k=d?d.toDisplay(e):e,D=d?d.toDisplay(i):i,fe=d?d.toDisplay(n):n;return Math.max(0,Math.min(100,(k-D)/(fe-D)*100))},[e,i,n,d,O]),ue=te.useMemo(()=>{if(!O||E===void 0)return 0;const k=d?d.toDisplay(E):E,D=d?d.toDisplay(i):i,fe=d?d.toDisplay(n):n;return Math.max(0,Math.min(100,(k-D)/(fe-D)*100))},[E,i,n,d,O]),ae=te.useMemo(()=>{if(!O||S===void 0)return null;const k=d?d.toDisplay(S):S,D=d?d.toDisplay(i):i,fe=d?d.toDisplay(n):n;return(k-D)/(fe-D)*100},[S,i,n,d,O]),H=te.useCallback(k=>O?zo(k,i,n,d):0,[O,i,n,d]),q=te.useCallback(k=>{var ne;const D=H(k),fe=`${D}%`;de.current&&(de.current.style.width=fe),oe.current&&(oe.current.style.width=fe);const _e=(ne=J.current)==null?void 0:ne.querySelector('[data-role="thumb"]');_e&&(_e.style.left=`calc(${D}% - 8px)`)},[H]),B=te.useCallback(k=>r?Math.round(k/r)*r:k,[r]),Z=te.useCallback(k=>{if(z||!O||k.button!==0)return;k.preventDefault(),k.stopPropagation(),k.currentTarget.setPointerCapture(k.pointerId);const D=k.currentTarget.getBoundingClientRect(),fe=Math.max(0,Math.min(1,(k.clientX-D.left)/D.width)),_e=d?d.toDisplay(i):i,ne=d?d.toDisplay(n):n,Le=B(_e+fe*(ne-_e));let Se=d?d.fromDisplay(Le):Le;s!==void 0&&(Se=Math.max(s,Se)),l!==void 0&&(Se=Math.min(l,Se)),o(Se),q(Se);const Ie=w.current;Ie.active=!0,Ie.startX=k.clientX,Ie.startValue=Le,Ie.lastShift=k.shiftKey,Ie.lastAlt=k.altKey,t==null||t()},[z,O,i,n,d,s,l,o,t,q,B]),X=te.useCallback(k=>{const D=w.current;if(!D.active||z||!O)return;k.preventDefault();const _e=k.currentTarget.getBoundingClientRect().width,ne=d?d.toDisplay(i):i,Le=d?d.toDisplay(n):n,Ie=(Le-ne)/_e;if(D.lastShift!==k.shiftKey||D.lastAlt!==k.altKey){const dt=Ie*(D.lastShift?10:1)*(D.lastAlt?.1:1),tt=k.clientX-D.startX;D.startValue=D.startValue+tt*dt,D.startX=k.clientX,D.lastShift=k.shiftKey,D.lastAlt=k.altKey}let We=Ie;k.shiftKey&&(We*=10),k.altKey&&(We*=.1);const ct=k.clientX-D.startX;let $e=B(D.startValue+ct*We);$e=Math.max(ne,Math.min(Le,$e));let Ee=d?d.fromDisplay($e):$e;s!==void 0&&(Ee=Math.max(s,Ee)),l!==void 0&&(Ee=Math.min(l,Ee)),isNaN(Ee)||(o(Ee),q(Ee))},[z,O,i,n,d,s,l,o,q,B]),ie=te.useCallback(k=>{const D=w.current;D.active&&(D.active=!1,k.currentTarget.releasePointerCapture(k.pointerId),a==null||a())},[a]),Ae=te.useCallback(()=>{S!==void 0&&!z&&(t==null||t(),o(S),a==null||a(),I==null||I())},[S,z,o,t,a,I]),Pe=K||E!==void 0,Ne=C==="compact";return C==="minimal"?c.jsx("div",{className:T,children:c.jsx(bt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:s,hardMax:l,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:q})}):Ne?c.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${z?"opacity-70 pointer-events-none":""} ${T}`,onContextMenu:A,"data-help-id":v,children:[c.jsx("div",{className:"absolute inset-0 bg-white/[0.12]",style:z?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"}}),m&&O&&c.jsx("div",{ref:de,"data-role":"fill",className:`absolute top-0 bottom-0 left-0 pointer-events-none ${z?"bg-gray-500/20":Pe?"bg-cyan-500/30":"bg-cyan-500/20"}`,style:{width:`${$}%`}}),P&&E!==void 0&&!z&&O&&c.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${ue}% - 0.75px)`}}),c.jsx("div",{className:"absolute inset-0",children:c.jsx(bt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:s,hardMax:l,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:q})}),Pe&&!z&&c.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 pointer-events-none"})]}):c.jsxs("div",{className:`mb-px animate-slider-entry ${z?"opacity-70 pointer-events-none":""} ${T}`,"data-help-id":v,onContextMenu:A,children:[h&&c.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[x,c.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${z?"text-gray-600":"text-gray-400"}`,children:[h,g,E!==void 0&&!z&&c.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"})]})]}),c.jsx("div",{className:"w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none",style:z?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},children:c.jsx(bt,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:s,hardMax:l,mapping:d,format:f?()=>f:u,mapTextInput:p,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:q})})]}),m&&O&&c.jsxs("div",{ref:J,className:`relative flex items-center touch-none overflow-hidden ${z?"cursor-not-allowed":"cursor-ew-resize"}`,style:{touchAction:"none",height:b},onPointerDown:Z,onPointerMove:X,onPointerUp:ie,children:[c.jsxs("div",{className:"absolute inset-0 bg-white/10",children:[c.jsx("div",{ref:oe,className:`absolute top-0 bottom-0 left-0 ${z?"bg-gray-400/20":"bg-cyan-500/30"}`,style:{width:`${$}%`}}),P&&E!==void 0&&!z&&c.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${ue}% - 0.75px)`}})]}),c.jsx("div",{"data-role":"thumb",className:"absolute top-0 bottom-0 w-4 z-10 pointer-events-none border-l border-r transition-colors",style:{left:`calc(${$}% - 8px)`,borderColor:z?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.25)"}}),ae!==null&&c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2",style:{left:`${ae}%`}}),c.jsx("button",{onPointerDown:k=>{k.preventDefault(),k.stopPropagation()},onClick:k=>{k.preventDefault(),k.stopPropagation(),Ae()},className:"absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10",title:`Reset to ${S}`,"aria-label":"Reset to default",tabIndex:-1})]})]})]})},ki=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],lo=e=>e.includes("red")?{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("green")?{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("amber")||e.includes("yellow")?{on:"bg-amber-500/30 text-amber-300 border-amber-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("purple")?{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:{on:"bg-cyan-500/30 text-cyan-300 border-cyan-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"};function js({label:e,value:o,onChange:t,options:a,color:r="bg-cyan-600",onLfoToggle:i,isLfoActive:n,icon:s,disabled:l=!1,variant:d="default",labelSuffix:u,onContextMenu:f,...p}){const h=m=>{l||t(m)},g=()=>{l||t(!o)},x=lo(r);if(d==="dense"&&!a&&typeof o=="boolean"){const m=lo(r);return c.jsxs("div",{className:`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${l?"opacity-50 pointer-events-none":"cursor-pointer"}`,"data-help-id":p["data-help-id"],onContextMenu:f,onClick:g,children:[c.jsxs("div",{className:"flex items-center gap-2",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none",children:e})]}),c.jsx("div",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border ${o?m.on:m.off} ${l?"":"hover:brightness-125"}`,children:o?"ON":"OFF"})]})}return a?c.jsxs("div",{className:`mb-px animate-slider-entry ${l?"opacity-50 pointer-events-none":""}`,"data-help-id":p["data-help-id"],onContextMenu:f,children:[e&&c.jsxs("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none",children:e})]}),c.jsx("div",{className:`flex h-9 md:h-[26px] overflow-hidden ${e?"rounded-b-sm":"rounded-sm"}`,children:a.map(m=>c.jsx("button",{onClick:()=>h(m.value),disabled:l,className:`
                                flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-white/5 last:border-r-0 transition-all truncate
                                ${o===m.value?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:m.tooltip||m.label,children:m.label},String(m.value)))})]}):c.jsx("div",{className:`mb-px animate-slider-entry ${l?"opacity-50 pointer-events-none":""}`,"data-help-id":p["data-help-id"],onContextMenu:f,children:c.jsxs("div",{className:`group/toggle flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm transition-colors ${e?"bg-white/[0.12]":""} ${l?"":"cursor-pointer hover:bg-white/[0.18]"}`,onClick:g,children:[e&&c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0 select-none",children:[s,c.jsx("span",{className:"text-[10px] text-gray-400 group-hover/toggle:text-gray-300 font-medium tracking-tight truncate transition-colors",children:e}),u]}),c.jsxs("div",{className:`flex ${e?"border-l border-white/5":"flex-1"}`,children:[c.jsx("div",{className:`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${o?x.on:x.off} ${l?"opacity-40":"hover:brightness-125"}
                            ${e?"":"flex-1"}
                        `,children:c.jsx("span",{className:`text-[8px] ${o?"opacity-90":"opacity-50"}`,children:o?"ON":"OFF"})}),i&&c.jsx("button",{onClick:m=>{m.stopPropagation(),l||i()},disabled:l,className:`
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-white/5 ${n?"bg-purple-500/30 text-purple-300":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:"LFO",children:c.jsx("span",{className:`text-[8px] ${n?"opacity-90":"opacity-50"}`,children:"LFO"})})]})]})})}const Ge={text:"text-cyan-400",textSubtle:"text-cyan-600",bgSolid:"bg-cyan-900",bgMed:"bg-cyan-700",bgBright:"bg-cyan-600/40",hoverBg:"hover:bg-cyan-500/50"},Ns={bgMed:"bg-purple-700"},co={text:"text-amber-400",bg:"bg-amber-900/20",border:"border-amber-500/20",btnBg:"bg-amber-600",btnHover:"hover:bg-amber-500",btnText:"text-black"},Ue={dock:"bg-[#080808]",tabBar:"bg-black/40",nested:"bg-black/20",divider:"bg-neutral-800",panelHeader:"bg-gray-800/80",input:"bg-gray-900",tint:"bg-white/5",hoverSubtle:"hover:bg-white/5",hoverMed:"hover:bg-white/10"},Re={primary:"text-white",label:"text-gray-400",dimLabel:"text-gray-500",faint:"text-gray-600",ghost:"text-gray-700"},Do={subtle:"border-white/5",standard:"border-white/10"},$s=`${Ue.dock} ${Ge.text} border-x border-t ${Do.standard} z-10 -mb-px pb-2`,Bs=`${Re.dimLabel} ${Ue.hoverSubtle} hover:text-gray-300 border border-transparent`,Hs=`${Ge.bgSolid} ${Ge.text}`,Vs=`${Re.faint} ${Ue.hoverMed}`,Gs=`${Ge.textSubtle}`,Us=`${Re.ghost}`,qs=`${Ue.nested} p-2 rounded border ${Do.subtle}`,Ws=`${co.bg} border ${co.border}`,Xs=`${Ge.bgMed} ${Re.primary}`,Ys=`${Re.dimLabel} hover:text-gray-300`,Ks=`${Re.ghost} cursor-not-allowed opacity-50 bg-transparent`,Js=`${Ge.bgBright} text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]`,Zs=`bg-transparent ${Re.dimLabel} hover:text-gray-300 ${Ue.hoverSubtle}`,Ti={primary:`text-[10px] font-bold ${Re.label}`,secondary:`text-[9px] font-bold ${Re.dimLabel}`,tiny:`text-[8px] ${Re.faint}`},zi=({children:e,variant:o="primary",className:t="",color:a})=>{const r=Ti[o],i=a||"";return c.jsx("span",{className:`${r} ${i} select-none ${t}`,children:e})},Qs=()=>c.jsxs(c.Fragment,{children:[c.jsx("div",{className:`h-1.5 ${Ue.divider} rounded-b-lg`}),c.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]});function el({label:e,value:o,options:t,onChange:a,fullWidth:r,className:i="",selectClassName:n="",labelSuffix:s,onContextMenu:l,disabled:d=!1,...u}){const f=p=>{var x;const h=p.target.value,g=typeof((x=t[0])==null?void 0:x.value)=="number";a(g?Number(h):h)};return c.jsxs("div",{className:`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${r?"w-full":""} ${d?"opacity-50 pointer-events-none":""} ${i}`,"data-help-id":u["data-help-id"],onContextMenu:l,children:[e&&c.jsx("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:c.jsxs("label",{className:"text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400",children:[e,s]})}),c.jsxs("div",{className:`${e?"w-1/2":"w-full"} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`,children:[c.jsx("select",{value:o,onChange:f,disabled:d,className:`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${n}`,children:t.map(p=>c.jsx("option",{value:String(p.value),className:"bg-[#111] text-gray-300",children:p.label},String(p.value)))}),c.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",children:c.jsx("div",{className:"w-2.5 h-2.5",children:c.jsx(Ri,{})})})]})]})}const Ce=({axisIndex:e,value:o,min:t,max:a,step:r,onUpdate:i,onDragStart:n,onDragEnd:s,disabled:l,highlight:d,mapping:u,mapTextInput:f,liveValue:p,defaultValue:h,hardMin:g,hardMax:x,customLabel:m})=>{const y=ki[e],b=m||y.label;return c.jsxs("div",{"data-axis-index":e,className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${l?"opacity-50 pointer-events-none":""}`,children:[c.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:C=>{C.preventDefault(),C.stopPropagation(),h!==void 0&&(n==null||n(),i(h),s==null||s())},title:h!==void 0?`Double-click to reset to ${h}`:"No default value",children:c.jsx("span",{className:`text-[10px] font-bold ${y.text} pointer-events-none`,children:b})}),c.jsx("div",{className:"absolute inset-0 left-5",children:c.jsx(Ei,{value:o,onChange:i,onDragStart:n,onDragEnd:s,step:r,min:t,max:a,hardMin:g,hardMax:x,mapping:u,mapTextInput:f,disabled:l,highlight:d,liveValue:p,defaultValue:h,variant:"compact",showTrack:!0})})]})},uo=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],rt=({primaryAxis:e,secondaryAxis:o,primaryIndex:t,secondaryIndex:a,primaryValue:r,secondaryValue:i,min:n,max:s,step:l,onUpdate:d,onDragStart:u,onDragEnd:f,disabled:p,onHover:h})=>{const[g,x]=L.useState(!1),m=L.useRef(!1),y=L.useRef(!1),b=L.useRef({x:0,y:0}),C=L.useRef({primary:0,secondary:0}),T=L.useRef(!1),S=L.useRef(!1),I=L.useRef(!1),E=uo[t],P=uo[a],A=()=>{x(!0),h(!0)},v=()=>{m.current||(x(!1),h(!1))},z=w=>{p||w.button!==0&&w.button!==1||(w.preventDefault(),w.stopPropagation(),w.currentTarget.setPointerCapture(w.pointerId),b.current={x:w.clientX,y:w.clientY},C.current={primary:r,secondary:i},T.current=!1,S.current=w.shiftKey,I.current=w.altKey,m.current=!0,y.current=w.button===1,u())},K=w=>{if(p||!m.current||!w.currentTarget.hasPointerCapture(w.pointerId))return;const O=w.clientX-b.current.x,$=w.clientY-b.current.y;if((Math.abs(O)>1||Math.abs($)>1)&&(T.current=!0),!T.current&&Math.abs(O)<1&&Math.abs($)<1)return;w.preventDefault(),w.stopPropagation();const ue=S.current!==w.shiftKey,ae=I.current!==w.altKey;if(ue||ae){let H=l*.5;S.current&&(H*=10),I.current&&(H*=.1),C.current.primary=C.current.primary+O*H,C.current.secondary=C.current.secondary-$*H,b.current={x:w.clientX,y:w.clientY},S.current=w.shiftKey,I.current=w.altKey}if(y.current){let H=.01;w.shiftKey&&(H*=3),w.altKey&&(H*=.3);const q=1+$*H;let B=C.current.primary*q,Z=C.current.secondary*q;!isNaN(B)&&!isNaN(Z)&&d(B,Z)}else{let H=l*.5;w.shiftKey&&(H*=10),w.altKey&&(H*=.1);let q=C.current.primary+O*H,B=C.current.secondary-$*H;!isNaN(q)&&!isNaN(B)&&d(q,B)}},de=w=>{p||(w.currentTarget.releasePointerCapture(w.pointerId),m.current=!1,y.current=!1,f(),T.current=!1,w.currentTarget.matches(":hover")||(x(!1),h(!1)))},oe=w=>{p||(w.preventDefault(),w.stopPropagation(),u(),d(0,0),f())},J=g||m.current;return c.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${J?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${p?"opacity-30 pointer-events-none":""}
            `,onPointerDown:z,onPointerMove:K,onPointerUp:de,onMouseEnter:A,onMouseLeave:v,onDoubleClick:oe,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${o.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[J&&c.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),c.jsxs("div",{className:"relative w-full h-full",children:[c.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${E.color}
                        transition-all duration-150
                        ${J?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),c.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${P.color}
                        transition-all duration-150
                        ${J?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),c.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${J?"opacity-100":"opacity-0"}
                    `,children:[c.jsx("div",{className:`absolute w-2 h-[1px] ${E.color} -translate-x-1/2`}),c.jsx("div",{className:`absolute h-2 w-[1px] ${P.color} -translate-y-1/2`})]}),c.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${y.current?"opacity-100":"opacity-0"}
                    `,children:c.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[c.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),c.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},fo=({azimuth:e,pitch:o,onChange:t,onDragStart:a,onDragEnd:r,disabled:i=!1,size:n=80})=>{const s=L.useRef(null),l=L.useRef(!1),[d,u]=L.useState(!1),[f,p]=L.useState(!1),[h,g]=L.useState(!1),x=L.useRef({x:0,y:0}),m=L.useRef({azimuth:e,pitch:o}),y=L.useRef({azimuth:e,pitch:o}),b=L.useRef(null);L.useEffect(()=>{m.current={azimuth:e,pitch:o}},[e,o]);const S=f?.05:.5,I=n/2,E=n*.38,P=L.useCallback((w,O,$)=>{const ue=w/(Math.PI/2)*$,ae=-(O/(Math.PI/2))*$;return{x:ue,y:ae}},[]),A=L.useMemo(()=>P(e,o,E),[e,o,E,P]),v=L.useMemo(()=>{const w=Math.cos(o),O=Math.sin(o),$=Math.cos(e),ae=Math.sin(e)*w,H=O,q=-$*w,B=ae,Z=-H,X=Math.sqrt(B*B+Z*Z),ie=q>0,Ae=X>.001?Math.min(X,1)*E:0,Pe=q<=0?1+(1-Math.min(X,1))*.5:1-q*.95,Ne=X>.001?B/X*Ae:0,xe=X>.001?Z/X*Ae:0;return{x:Ne,y:xe,isBack:ie,length:Ae,headScale:Pe,dirX:ae,dirY:H,dirZ:q}},[e,o,E]),z=L.useCallback((w,O,$)=>{const ue=w/$*(Math.PI/2),ae=-(O/$)*(Math.PI/2);return{azimuth:ue,pitch:ae}},[]),K=L.useCallback((w,O)=>{let $=w,ue=O;h&&b.current&&(b.current==="x"?ue=0:$=0);const ae=$*S,H=ue*S,q=P(m.current.azimuth,m.current.pitch,E),B=q.x+ae,Z=q.y+H,{azimuth:X,pitch:ie}=z(B,Z,E);h&&b.current?b.current==="x"?(m.current={azimuth:X,pitch:y.current.pitch},t(X,y.current.pitch)):(m.current={azimuth:y.current.azimuth,pitch:ie},t(y.current.azimuth,ie)):(m.current={azimuth:X,pitch:ie},t(X,ie))},[P,z,t,E,S,h]),de=w=>{i||w.button===0&&(w.preventDefault(),w.stopPropagation(),w.currentTarget.setPointerCapture(w.pointerId),l.current=!0,u(!0),x.current={x:w.clientX,y:w.clientY},m.current={azimuth:e,pitch:o},y.current={azimuth:e,pitch:o},b.current=null,a==null||a(),p(w.altKey),g(w.shiftKey))},oe=w=>{if(i||!l.current)return;const O=w.clientX-x.current.x,$=w.clientY-x.current.y;x.current={x:w.clientX,y:w.clientY},p(w.altKey),g(w.shiftKey),h&&!b.current&&(Math.abs(O)>2||Math.abs($)>2)&&(b.current=Math.abs(O)>Math.abs($)?"x":"y"),K(O,$)},J=w=>{l.current&&(l.current=!1,u(!1),p(!1),g(!1),b.current=null,r==null||r())};return c.jsxs("div",{ref:s,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${i?"opacity-50 pointer-events-none":""}
                ${d?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:n,height:n,touchAction:"none",boxShadow:d?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:de,onPointerMove:oe,onPointerUp:J,onPointerLeave:J,onDoubleClick:w=>{i||(w.preventDefault(),w.stopPropagation(),a==null||a(),t(0,0),r==null||r())},onContextMenu:w=>{},title:"Drag to rotate direction, Double-click to reset",children:[c.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:E*2,height:E*2,left:I-E,top:I-E}}),c.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:I}}),c.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:I}}),c.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:I-3,top:I-3}}),c.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:I+A.x,top:I+A.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:v.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${v.isBack?"#ef4444":"#22d3ee"}`,transform:d?"scale(1.2)":"scale(1)"}}),v.isBack&&c.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),c.jsxs(c.Fragment,{children:[c.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:n,height:n},children:[Math.abs(e)>.01&&c.jsxs(c.Fragment,{children:[c.jsx("ellipse",{cx:I,cy:I,rx:E*Math.abs(Math.sin(e)),ry:E,fill:"none",stroke:v.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:v.isBack?.175:.35,clipPath:v.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),c.jsx("ellipse",{cx:I,cy:I,rx:E*Math.abs(Math.sin(e)),ry:E,fill:"none",stroke:v.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:v.isBack?.35:.175,clipPath:v.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(o)>.01&&c.jsxs(c.Fragment,{children:[c.jsx("ellipse",{cx:I,cy:I,rx:E,ry:E*Math.abs(Math.sin(o)),fill:"none",stroke:v.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:v.isBack?.15:.3,clipPath:v.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),c.jsx("ellipse",{cx:I,cy:I,rx:E,ry:E*Math.abs(Math.sin(o)),fill:"none",stroke:v.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:v.isBack?.3:.15,clipPath:v.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),c.jsxs("defs",{children:[c.jsx("clipPath",{id:"longitudeRight",children:c.jsx("rect",{x:I,y:"0",width:I,height:n})}),c.jsx("clipPath",{id:"longitudeLeft",children:c.jsx("rect",{x:"0",y:"0",width:I,height:n})}),c.jsx("clipPath",{id:"latitudeTop",children:c.jsx("rect",{x:"0",y:"0",width:n,height:I})}),c.jsx("clipPath",{id:"latitudeBottom",children:c.jsx("rect",{x:"0",y:I,width:n,height:I})})]}),c.jsx("line",{x1:I,y1:I,x2:I+v.x,y2:I+v.y,stroke:v.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+v.length/E*.5}),c.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:v.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(v.headScale-1)*.4),transform:`translate(${I+v.x}, ${I+v.y}) rotate(${Math.atan2(v.y,v.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+v.headScale*.1)}, ${Math.max(.05,v.headScale)})`})]}),d&&c.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:c.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(o*180/Math.PI).toFixed(0),"°"]})})]})]})},vt=Math.PI/180,Di=180/Math.PI,Ai=["x","y","z","w"],xt={x:0,y:1,z:2,w:3},Fi=e=>{const o=e.length();if(o<1e-9)return{azimuth:0,pitch:0};const t=Math.max(-1,Math.min(1,e.y/o));return{azimuth:Math.atan2(e.x/o,e.z/o),pitch:Math.asin(t)}},Oi=(e,o)=>{const t=Math.cos(o);return new N(t*Math.sin(e),Math.sin(o),t*Math.cos(e))},tl=({label:e,value:o,onChange:t,min:a=-1e4,max:r=1e4,step:i=.01,disabled:n=!1,convertRadToDeg:s=!1,mode:l="normal",modeToggleable:d=!1,showLiveIndicator:u=!1,liveValue:f,defaultValue:p,hardMin:h,hardMax:g,axisMin:x,axisMax:m,axisStep:y,onDragStart:b,onDragEnd:C,headerRight:T,showDualAxisPads:S=!0,linkable:I=!1,scale:E})=>{const[P,A]=L.useState(o.clone()),[v,z]=L.useState(null),[K,de]=L.useState(l),[oe,J]=L.useState("degrees"),[w,O]=L.useState("degrees"),[$,ue]=L.useState(I),ae=L.useRef(!1),H=L.useRef(null),q=L.useRef(null);L.useEffect(()=>{de(l)},[l]);const B=pe(_=>_.openContextMenu),Z="w"in o,X="z"in o,ie=K==="rotation",Ae=K==="toggle",Pe=K==="mixed",Ne=K==="direction"&&X,xe=Ne?Fi(P):{azimuth:0,pitch:0},qe=(_,F)=>{const V=Math.max(-Math.PI/2,Math.min(Math.PI/2,F)),W=Oi(_,V);ne(0,_),ne(1,V),A(W),t(W)};L.useEffect(()=>{if(ae.current)return;const _=1e-4,F=Math.abs(o.x-P.x),V=Math.abs(o.y-P.y),W=X?Math.abs(o.z-P.z):0,me=Z?Math.abs(o.w-P.w):0;(F>_||V>_||W>_||me>_)&&A(o.clone())},[o,X,Z]);const k=()=>{ae.current=!0,H.current=P.clone(),b&&b()},D=()=>{H.current=null,ae.current=!1,C&&C()},fe=_=>{if(ie)return oe==="degrees"?Ke:so;if(E==="pi")return w==="pi"?so:Ke;if(s)return Ke},_e=_=>{if(ie){const ee=oe==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:ee,hardMin:void 0,hardMax:void 0}}const F=x||{x:a,y:a,z:a},V=m||{x:r,y:r,z:r},W=y||{x:i,y:i,z:i},me=E==="pi"&&w==="degrees"?Di:1;return{min:F[_],max:V[_],step:(W[_]??i)*me,hardMin:h,hardMax:g}},ne=(_,F)=>{const V=q.current;if(!V)return;const W=V.querySelector(`[data-axis-index="${_}"]`);if(!W)return;const me=Ai[_],ee=fe(),kt=W.querySelector('[data-role="value"]');kt&&(kt.textContent=ee!=null&&ee.format?ee.format(F):To(F));const Tt=W.querySelector('[data-role="fill"]');if(Tt){const zt=_e(me),Dt=zt.min??a,At=zt.max??r;if(Dt!==At){const Bo=zo(F,Dt,At,ee);Tt.style.width=`${Bo}%`}}},Le=(_,F)=>{const V=H.current||P,W=V.clone();if($&&!ie){const me=V[_],ee=F-me;W.x=V.x+ee,W.y=V.y+ee,X&&(W.z=V.z+ee),Z&&(W.w=V.w+ee),ne(0,W.x),ne(1,W.y),X&&ne(2,W.z),Z&&ne(3,W.w)}else W[_]=F;A(W),t(W)},Se=(_,F,V,W)=>{const ee=(H.current||P).clone();ee[_]=V,ee[F]=W,ne(xt[_],V),ne(xt[F],W),A(ee),t(ee)},Ie=v==="xy",We=v==="xy"||v==="zy",ct=v==="zy"||v==="wz",$e=v==="wz",Ee=_=>{if(f)return f[_]},dt=_=>{if(p)return p[_]},tt=P,Fo={x:Ie,y:We,z:ct,w:$e},ze=_=>({axisIndex:xt[_],value:P[_],..._e(_),onUpdate:F=>Le(_,F),onDragStart:k,onDragEnd:D,disabled:n,highlight:Fo[_],mapping:fe(),mapTextInput:ie||E==="pi",liveValue:u?Ee(_):void 0,defaultValue:dt(_)}),Oo=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],Et=(_,F,V)=>{const me=P[_]>.5,ee=Oo[F];return c.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${me?ee.on:ee.off} ${n?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${V||"flex-1"}`,onClick:()=>Le(_,me?0:1),disabled:n,children:[V?null:c.jsx("span",{children:_}),c.jsx("span",{className:`text-[8px] ${me?"opacity-80":"opacity-70"}`,children:me?"ON":"OFF"})]},_)},jo=()=>d?c.jsx("button",{onClick:()=>de(_=>_==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${K==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:K==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,No=()=>!I||ie?null:c.jsx("button",{onClick:()=>ue(_=>!_),className:`p-1 rounded transition-colors mr-2 ${$?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:$?"Axes linked (uniform)":"Link axes",children:c.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[c.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),c.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),$o=_=>{const F=[];ie&&F.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:oe==="degrees",action:()=>J("degrees")},{label:"Radians (π)",checked:oe==="radians",action:()=>J("radians")}),!ie&&E==="pi"&&F.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:w==="pi",action:()=>O("pi")},{label:"Degrees (°)",checked:w==="degrees",action:()=>O("degrees")}),X&&(l==="rotation"||l==="axes")&&F.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:K==="rotation",action:()=>de("rotation")},{label:"Per-Axis (X/Y/Z)",checked:K==="axes"||K==="normal",action:()=>de("normal")}),F.length!==0&&(_.preventDefault(),_.stopPropagation(),B(_.clientX,_.clientY,F,["ui.vector"]))};return c.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&c.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[c.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[d&&jo(),T,c.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${n?"text-gray-600":"text-gray-400"}`,children:e})]}),I&&!ie&&c.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:No()})]}),c.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:$o,"data-help-id":"ui.vector",children:c.jsx("div",{ref:q,className:"flex gap-px w-full h-full",children:Ae?c.jsx(c.Fragment,{children:["x","y","z","w"].slice(0,Z?4:X?3:2).map((_,F)=>Et(_,F))}):Pe?c.jsxs(c.Fragment,{children:[Et("x",0,"w-14 flex-shrink-0"),c.jsx(Ce,{...ze("y"),disabled:n||P.x<.5})]}):Ne?c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:c.jsx(fo,{azimuth:xe.azimuth,pitch:xe.pitch,onChange:(_,F)=>{qe(_,F)},onDragStart:k,onDragEnd:D,disabled:n,size:56})}),c.jsx(Ce,{axisIndex:0,value:xe.azimuth,min:-Math.PI,max:Math.PI,step:vt,onUpdate:_=>qe(_,xe.pitch),onDragStart:k,onDragEnd:D,disabled:n,mapping:Ke,mapTextInput:!0,customLabel:"Az"}),c.jsx(rt,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:xe.azimuth,secondaryValue:xe.pitch,min:-Math.PI,max:Math.PI,step:vt,onUpdate:(_,F)=>qe(_,F),onDragStart:k,onDragEnd:D,disabled:n,onHover:_=>z(_?"xy":null)}),c.jsx(Ce,{axisIndex:1,value:xe.pitch,min:-Math.PI/2,max:Math.PI/2,step:vt,onUpdate:_=>qe(xe.azimuth,_),onDragStart:k,onDragEnd:D,disabled:n,mapping:Ke,mapTextInput:!0,customLabel:"Pt"})]}):ie?c.jsxs(c.Fragment,{children:[X&&c.jsx(Ce,{...ze("z"),customLabel:"∠"}),c.jsx("div",{className:"flex items-center justify-center px-1",children:c.jsx(fo,{azimuth:P.x,pitch:P.y,onChange:(_,F)=>{const V=P.clone();V.x=_,V.y=F,ne(0,_),ne(1,F),A(V),t(V)},onDragStart:k,onDragEnd:D,disabled:n,size:56})}),c.jsx("div",{className:"contents",children:c.jsx(Ce,{...ze("x"),customLabel:"A"})}),c.jsx(Ce,{...ze("y"),customLabel:"P"})]}):c.jsxs(c.Fragment,{children:[c.jsx("div",{className:"contents",children:c.jsx(Ce,{...ze("x")})}),S&&c.jsx(rt,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:P.x,secondaryValue:P.y,min:a,max:r,step:i,onUpdate:(_,F)=>Se("x","y",_,F),onDragStart:k,onDragEnd:D,disabled:n,onHover:_=>z(_?"xy":null)}),c.jsx(Ce,{...ze("y")}),X&&S&&c.jsx(rt,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:tt.z,secondaryValue:tt.y,min:a,max:r,step:i,onUpdate:(_,F)=>Se("z","y",_,F),onDragStart:k,onDragEnd:D,disabled:n,onHover:_=>z(_?"zy":null)}),X&&c.jsx(Ce,{...ze("z")}),Z&&S&&c.jsx(rt,{primaryAxis:"x",secondaryAxis:"z",primaryIndex:3,secondaryIndex:2,primaryValue:P.w,secondaryValue:P.z,min:a,max:r,step:i,onUpdate:(_,F)=>Se("w","z",_,F),onDragStart:k,onDragEnd:D,disabled:n,onHover:_=>z(_?"wz":null)}),Z&&c.jsx(Ce,{...ze("w")})]})})})]})},ji={default:"",panel:"px-2 py-0.5 text-[9px] font-bold text-gray-500 hover:text-gray-300 bg-neutral-800 rounded-sm"},Ni=({open:e})=>c.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:c.jsx("path",{d:"M0 0l6 5-6 5z"})}),ol=({label:e,children:o,defaultOpen:t=!0,count:a,labelVariant:r="secondary",labelColor:i,rightContent:n,className:s="",headerClassName:l="",variant:d="default",open:u,onToggle:f})=>{const p=l||ji[d],[h,g]=L.useState(t),x=u!==void 0,m=x?u:h,y=()=>{f&&f(),x||g(b=>!b)};return c.jsxs("div",{className:s,children:[c.jsxs("div",{className:`flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-white/5 transition-colors rounded-sm ${p}`,children:[c.jsxs("button",{onClick:y,className:"flex items-center gap-1.5 flex-1 min-w-0",children:[c.jsx(Ni,{open:m}),c.jsx(zi,{variant:r,color:i,children:e}),a!==void 0&&c.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-1",children:a})]}),n&&c.jsx("div",{className:"ml-auto flex items-center gap-1",children:n})]}),m&&o]})},$i=`
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
`,Ao=e=>JSON.stringify(e,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,o=>o.includes('"id": "param')?o.replace(/\n\s+/g," "):o).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,o=>o.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,o=>o.replace(/\n\s+/g," ")),Je=e=>{const o=e.split(`
`);for(;o.length>0&&o[0].trim()==="";)o.shift();for(;o.length>0&&o[o.length-1].trim()==="";)o.pop();if(o.length===0)return"";if(o.length===1)return o[0].trim();let t=1/0;for(const a of o){if(a.trim().length===0)continue;const r=a.match(/^(\s*)/);r&&(t=Math.min(t,r[1].length))}return t===0||t===1/0?o.join(`
`):o.map(a=>a.slice(t)).join(`
`)},Bi=(e,o)=>{var s;const{shader:t,...a}=e,r={};(s=t.preambleVars)!=null&&s.length&&(r.preambleVars=t.preambleVars),t.usesSharedRotation&&(r.usesSharedRotation=!0);const i={...a,...Object.keys(r).length>0?{shaderMeta:r}:{},defaultPreset:o};let n=`<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${$i}
`;return n+=`<Metadata>
${Ao(i)}
</Metadata>

`,t.preamble&&(n+=`<!-- Global scope code: variables and helper functions (before formula) -->
`,n+=`<Shader_Preamble>
${Je(t.preamble)}
</Shader_Preamble>

`),t.loopInit&&(n+=`<!-- Code executed once before the loop (Setup) -->
`,n+=`<Shader_Init>
${Je(t.loopInit)}
</Shader_Init>

`),n+=`<!-- Main Distance Estimator Function -->
`,n+=`<Shader_Function>
${Je(t.function)}
</Shader_Function>

`,n+=`<!-- The Iteration Loop Body -->
`,n+=`<Shader_Loop>
${Je(t.loopBody)}
</Shader_Loop>

`,t.getDist&&(n+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,n+=`<Shader_Dist>
${Je(t.getDist)}
</Shader_Dist>

`),n},Hi=e=>{const o=u=>{const f=new RegExp(`<${u}>([\\s\\S]*?)<\\/${u}>`),p=e.match(f);return p?p[1].trim():null},t=o("Metadata");if(!t){try{const u=JSON.parse(e);if(u.id&&u.shader)return u}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const a=JSON.parse(t),r=o("Shader_Preamble"),i=o("Shader_Function"),n=o("Shader_Loop"),s=o("Shader_Init"),l=o("Shader_Dist");if(!i||!n)throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");const d={function:i,loopBody:n,preamble:r||void 0,loopInit:s||void 0,getDist:l||void 0};return a.shaderMeta&&(a.shaderMeta.preambleVars&&(d.preambleVars=a.shaderMeta.preambleVars),a.shaderMeta.usesSharedRotation&&(d.usesSharedRotation=!0),delete a.shaderMeta),{...a,shader:d}},Vi=e=>{const o=e.trimStart();return o.startsWith("<!--")||o.startsWith("<Metadata>")},al=e=>{const o=he.get(e.formula);if(!o)return JSON.stringify(e,null,2);let t=Bi(o,o.defaultPreset);return t+=`<!-- Full scene state (camera, lights, features, quality, animations) -->
`,t+=`<Scene>
${Ao(e)}
</Scene>
`,t},rl=e=>{if(Vi(e)){const t=Hi(e),a=e.match(/<Scene>([\s\S]*?)<\/Scene>/);if(a){const i=JSON.parse(a[1].trim());return{def:t,preset:i}}const r=t.defaultPreset||{formula:t.id};return r.formula||(r.formula=t.id),{def:t,preset:r}}return{preset:JSON.parse(e)}};export{al as $,Te as A,el as B,Qe as C,Gn as D,tl as E,R as F,js as G,ol as H,Wn as I,tn as J,hs as K,Qi as L,Ri as M,Cn as N,rs as O,Ss as P,as as Q,cs as R,Ei as S,Tn as T,Y as U,Un as V,os as W,Nn as X,$n as Y,Bn as Z,is as _,Mt as a,Ys as a$,ra as a0,cn as a1,Ze as a2,he as a3,ms as a4,An as a5,Fn as a6,Dn as a7,Kn as a8,Ln as a9,Hs as aA,Vs as aB,Ue as aC,Do as aD,$s as aE,Bs as aF,Gs as aG,Us as aH,kn as aI,Ge as aJ,En as aK,Xn as aL,ds as aM,es as aN,ts as aO,Qs as aP,gn as aQ,co as aR,Re as aS,qn as aT,vs as aU,xs as aV,Bi as aW,Ws as aX,U as aY,qs as aZ,Xs as a_,jn as aa,Jn as ab,Yi as ac,rl as ad,On as ae,Vn as af,us as ag,Zn as ah,Ii as ai,zn as aj,_n as ak,dn as al,G as am,Yn as an,ps as ao,fs as ap,Zt as aq,Ji as ar,Zi as as,en as at,ko as au,Rn as av,Pn as aw,In as ax,xn as ay,Mn as az,pn as b,Ks as b0,Ns as b1,Js as b2,Zs as b3,so as b4,ki as b5,$a as b6,ot as b7,Xa as b8,Ya as b9,Rs as bA,gs as bB,an as bC,on as bD,nn as bE,rn as bF,ys as bG,Sn as bH,no as bI,qr as bJ,Ja as ba,Ka as bb,Za as bc,Gr as bd,re as be,fi as bf,sn as bg,ln as bh,bs as bi,Qn as bj,Os as bk,ks as bl,Ts as bm,zs as bn,Ds as bo,As as bp,Ps as bq,Fs as br,un as bs,fn as bt,_s as bu,Is as bv,Es as bw,Ls as bx,Ms as by,Cs as bz,Be as c,le as d,To as e,j as f,je as g,Hn as h,vn as i,bn as j,et as k,Lt as l,ws as m,Me as n,ns as o,ls as p,ss as q,Ki as r,wn as s,at as t,pe as u,hn as v,Ur as w,mn as x,zi as y,yn as z};
