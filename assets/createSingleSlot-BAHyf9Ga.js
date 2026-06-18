const l=(s=null)=>{let t=s;const r=new Set;return{set:e=>{Object.is(e,t)||(t=e,r.forEach(c=>c()))},get:()=>t,subscribe:e=>(r.add(e),()=>{r.delete(e)})}};export{l as c};
