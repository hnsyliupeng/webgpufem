/* Alternate interior patch smoothing and conforming interior topological flips. */
importScripts('./cut-tet.js','./quality-opt.js','./topology-opt.js');
onmessage=e=>{try{
 let current=e.data.mesh,cycles=Number(e.data.cycles),limit=Number(e.data.limit),target=Number(e.data.target),history=[];if(!Number.isInteger(cycles)||cycles<1||cycles>6||!Number.isInteger(limit)||limit<1||limit>500||!(target>0&&target<=1))throw Error('联合优化参数无效。');
 const initial=current.minJacobian,baseVolume=current.volume,faceKey=f=>f.slice().sort((a,b)=>a-b).join(':'),originalBoundary=new Set(current.boundary.map(faceKey));let accepted=0;
 function checked(candidate,old){if(candidate.components!==current.components||candidate.nonmanifold||candidate.badEdges||candidate.boundary.length!==originalBoundary.size||candidate.boundary.some(f=>!originalBoundary.has(faceKey(f)))||Math.abs(candidate.volume-baseVolume)/baseVolume>1e-7||candidate.minJacobian<old.minJacobian-1e-9||candidate.maxAspect>old.maxAspect+1e-8)return false;return true}
 for(let cycle=1;cycle<=cycles;cycle++){
  postMessage({progress:`联合优化 ${cycle}/${cycles}：内部节点扫描…`});let saved=current.points.map(p=>p.slice()),info=optimizeInteriorJacobian(current,{passes:2,limit},()=>{}),next=inspectCutTetMesh(current.points,current.tets,current.n);
  if(info.totalMoves&&checked(next,current)){next.boundaryReference=current.boundaryReference;next.boundaryAltered=current.boundaryAltered;next.boundaryDisplacement=current.boundaryDisplacement;current=next;accepted++;history.push({cycle,stage:'内部节点',count:info.totalMoves,jacobian:current.minJacobian,aspect:current.maxAspect})}else current.points=saved;
  if(current.minJacobian>=target&&current.maxAspect<10)break;
  postMessage({progress:`联合优化 ${cycle}/${cycles}：内部协调拓扑翻转…`});let flip=optimizeTetFlips(current,{passes:1,limit,maxFlips:40},()=>{}),flips=flip.history.reduce((s,v)=>s+v.flips,0);
  if(flips){let result=inspectCutTetMesh(current.points,flip.tets,current.n);if(checked(result,current)){result.boundaryReference=current.boundaryReference;result.boundaryAltered=current.boundaryAltered;result.boundaryDisplacement=current.boundaryDisplacement;current=result;accepted++;history.push({cycle,stage:'拓扑翻转',count:flips,jacobian:current.minJacobian,aspect:current.maxAspect})}}
  if(current.minJacobian>=target&&current.maxAspect<10)break;
 }
 if(!accepted||current.minJacobian<=initial+1e-9)throw Error(`全局最差 Jacobian 未改善（初始 ${initial.toFixed(5)}），原网格保持不变。`);
 current.source='DEEP';current.deepHistory=history;current.deepInitial=initial;postMessage({result:current});
 }catch(err){postMessage({error:String(err.message||err)})}};
