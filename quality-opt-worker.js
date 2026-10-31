importScripts('./cut-tet.js','./quality-select.js','./quality-opt.js');
onmessage=e=>{try{let original=e.data.mesh,oldVolume=original.volume,oldJac=original.minJacobian,oldAspect=original.maxAspect;let info=optimizeInteriorJacobian(original,e.data.options,p=>postMessage({progress:p}));let r=inspectCutTetMesh(original.points,original.tets,original.n),dv=Math.abs(r.volume-oldVolume)/oldVolume;
 if(r.components!==original.components||r.nonmanifold||r.badEdges||dv>1e-7||r.minJacobian<oldJac-1e-9||r.maxAspect>oldAspect+1e-8)throw Error('优化后质量、拓扑或体积检查未通过，原网格保持不变。');
 if(!info.totalMoves||r.minJacobian<=oldJac+1e-9)throw Error('未改善全局最差 Jacobian，原网格保持不变。');
 r.boundaryReference=original.boundaryReference;r.boundaryAltered=!!original.boundaryAltered;r.boundaryDisplacement=original.boundaryDisplacement;r.cadSurfaceExperimental=original.cadSurfaceExperimental;r.hierarchicalExperimental=original.hierarchicalExperimental;r.source='INTERIOR';r.localHistory=info.history;r.localMoves=info.totalMoves;r.localVolumeChange=dv;postMessage({result:r});
 }catch(err){postMessage({error:String(err.message||err)})}};
