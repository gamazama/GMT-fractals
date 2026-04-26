let r=null;const n=new Set;function o(e){r=e,n.forEach(t=>t())}function u(){return r}function p(e){return n.add(e),()=>{n.delete(e)}}export{u as g,o as r,p as s};
