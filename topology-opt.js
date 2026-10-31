var selectWorst = typeof module!=='undefined' ? require('./quality-select.js') : selectWorstQuality;
/* Experimental conforming interior 2-to-3 and 3-to-2 tetrahedral flips. */
function optimizeTetFlips(mesh,options={},notify=()=>{}) {
 const {points}=mesh,passes=options.passes??3,limit=options.limit??300,maxFlips=options.maxFlips??30;
 if(!Number.isInteger(passes)||passes<1||passes>8||!Number.isInteger(limit)||limit<1||limit>500||!Number.isInteger(maxFlips)||maxFlips<1||maxFlips>100)throw Error('翻转参数无效');
 let tets=mesh.tets.map(t=>t.slice()),history=[];const key=a=>a.slice().sort((x,y)=>x-y).join(':'),sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a);
 function determinant(t){let [a,b,c,d]=t.map(i=>points[i]);return dot(sub(b,a),cross(sub(c,a),sub(d,a)))}
 function quality(t){let p=t.map(i=>points[i]),d=determinant(t);if(!(d>1e-14))return -1;let q=1;for(let i=0;i<4;i++){let l=[];for(let j=0;j<4;j++)if(i!==j)l.push(len(sub(p[j],p[i])));q=Math.min(q,d/(l[0]*l[1]*l[2]))}return q}
 const facets=t=>[[t[0],t[1],t[2]],[t[0],t[1],t[3]],[t[0],t[2],t[3]],[t[1],t[2],t[3]]];
 for(let pass=1;pass<=passes;pass++){
  notify(`拓扑翻转 ${pass}/${passes}：构建邻接…`);let faceMap=new Map(),edges=new Set(),edgeMap=new Map(),q=new Float64Array(tets.length);
  for(let i=0;i<tets.length;i++){let t=tets[i];q[i]=quality(t);if(q[i]<=0)throw Error('输入含反向或退化单元');for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){let k=key([t[a],t[b]]);edges.add(k);let e=edgeMap.get(k);if(e)e.ids.push(i);else edgeMap.set(k,{edge:[t[a],t[b]],ids:[i]})}for(let f of facets(t)){let k=key(f),arr=faceMap.get(k);if(arr)arr.ids.push(i);else faceMap.set(k,{face:f,ids:[i]})}}
  const worst=selectWorst(q,limit),seen=new Set(),candidates=[];
  for(let i of worst)for(let f of facets(tets[i])){let k=key(f);if(seen.has(k))continue;seen.add(k);let adj=faceMap.get(k);if(!adj||adj.ids.length!==2)continue;let [i1,i2]=adj.ids,t1=tets[i1],t2=tets[i2],d=t1.find(v=>!f.includes(v)),e=t2.find(v=>!f.includes(v));if(d===undefined||e===undefined||d===e||edges.has(key([d,e])))continue;
   let newTets=[[d,e,f[0],f[1]],[d,e,f[1],f[2]],[d,e,f[2],f[0]]],sum=0,valid=true;for(let t of newTets){let det=determinant(t);if(Math.abs(det)<1e-14){valid=false;break}if(det<0){[t[0],t[1]]=[t[1],t[0]];det=-det}sum+=det}let oldSum=determinant(t1)+determinant(t2);if(!valid||Math.abs(sum-oldSum)>Math.max(1e-10,Math.abs(oldSum)*1e-9))continue;
   let before=Math.min(q[i1],q[i2]),after=Math.min(...newTets.map(quality));if(after>before+1e-7)candidates.push({ids:[i1,i2],vertices:[...f,d,e],newTets,before,after});
  }
  const seenEdges=new Set();for(let i of worst){let t=tets[i];for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){let ek=key([t[a],t[b]]);if(seenEdges.has(ek))continue;seenEdges.add(ek);let edge=edgeMap.get(ek);if(!edge||edge.ids.length!==3)continue;let [d,e]=edge.edge,ids=edge.ids,vertices=[...new Set(ids.flatMap(j=>tets[j]))],f=vertices.filter(v=>v!==d&&v!==e);if(vertices.length!==5||f.length!==3||faceMap.has(key(f)))continue;
   let newTets=[[f[0],f[1],f[2],d],[f[0],f[1],f[2],e]],sum=0,valid=true;for(let tt of newTets){let det=determinant(tt);if(Math.abs(det)<1e-14){valid=false;break}if(det<0){[tt[0],tt[1]]=[tt[1],tt[0]];det=-det}sum+=det}let oldSum=ids.reduce((s,j)=>s+determinant(tets[j]),0);if(!valid||Math.abs(sum-oldSum)>Math.max(1e-10,Math.abs(oldSum)*1e-9))continue;
   let before=Math.min(...ids.map(j=>q[j])),after=Math.min(...newTets.map(quality));if(after>before+1e-7)candidates.push({ids,vertices,newTets,before,after});
  }}
  candidates.sort((a,b)=>a.before-b.before||b.after-a.after);let chosen=[],blocked=new Set();for(const c of candidates){if(chosen.length>=maxFlips)break;if(c.vertices.some(v=>blocked.has(v)))continue;chosen.push(c);c.vertices.forEach(v=>blocked.add(v))}
  if(!chosen.length){history.push({pass,flips:0});break}let remove=new Set(chosen.flatMap(c=>c.ids));tets=tets.filter((_,i)=>!remove.has(i));for(const c of chosen)tets.push(...c.newTets);let min=1;for(const t of tets)min=Math.min(min,quality(t));history.push({pass,flips:chosen.length,minJacobian:min});notify(`拓扑翻转 ${pass}/${passes}：${chosen.length} 次，最差 Jacobian ${min.toFixed(5)}`);
 }
 return {tets,history};
}
if(typeof module!=='undefined')module.exports=optimizeTetFlips;
