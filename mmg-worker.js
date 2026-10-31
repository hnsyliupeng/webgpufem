/* MMG3D via LGPL-3.0-or-later mmg-wasm; background worker for browser use. */
importScripts('./cut-tet.js');
onmessage=async e=>{let h,api;try{
 const r=e.data.mesh,hausd=Number(e.data.hausd);if(!(hausd>0))throw Error('容差必须为正数。');
 postMessage({progress:'正在加载 MMG WebAssembly…'});const init=(await import('./vendor/mmg/dist/mmg.mjs')).default;let logs=[];api=await init({print:s=>logs.push(String(s)),printErr:s=>logs.push(String(s))});const m=api.mmg3d;h=m.init();m.setIparameter(h.mesh,h.met,m.IPARAM_verbose,-1);
 let used=new Map();for(const t of r.tets)for(const id of t)if(!used.has(id))used.set(id,used.size+1);
 m.setMeshSize(h.mesh,used.size,r.tets.length,0,r.boundary.length,0,0);for(const [id,j] of used)m.setVertex(h.mesh,...r.points[id],0,j);
 r.tets.forEach((t,i)=>m.setTetrahedron(h.mesh,...t.map(id=>used.get(id)),1,i+1));r.boundary.forEach((t,i)=>m.setTriangle(h.mesh,...t.map(id=>used.get(id)),1,i+1));m.setDparameter(h.mesh,h.met,m.DPARAM_hausd,hausd);
 postMessage({progress:'MMG3D 正在执行四面体重网格（保持当前离散边界）…'});let status=m.remesh(h.mesh,h.met);if(status!==api.MMG5_SUCCESS)throw Error('MMG 未报告完全成功（代码 '+status+'），结果已丢弃。'+logs.slice(-8).join(' | '));
 let size=m.getMeshSize(h.mesh),vv=m.getVertices(h.mesh,size.np).vertices,tt=m.getTetrahedra(h.mesh,size.ne).tetra,points=[],tets=[];
 for(let i=0;i<vv.length;i+=3)points.push([vv[i],vv[i+1],vv[i+2]]);
 for(let i=0;i<tt.length;i+=4){let t=[tt[i]-1,tt[i+1]-1,tt[i+2]-1,tt[i+3]-1],p=t.map(j=>points[j]);if(p.some(x=>!x))throw Error('MMG 返回无效节点索引');let [a,b,c,d]=p,ab=b.map((x,k)=>x-a[k]),ac=c.map((x,k)=>x-a[k]),ad=d.map((x,k)=>x-a[k]),det=ab[0]*(ac[1]*ad[2]-ac[2]*ad[1])-ab[1]*(ac[0]*ad[2]-ac[2]*ad[0])+ab[2]*(ac[0]*ad[1]-ac[1]*ad[0]);if(!Number.isFinite(det)||Math.abs(det)<1e-14)throw Error('MMG 返回退化单元');if(det<0)[t[1],t[2]]=[t[2],t[1]];tets.push(t)}
 postMessage({progress:'检查重网格后的单元、连通与边界…'});let result=inspectCutTetMesh(points,tets,r.n);result.volumeChange=Math.abs(result.volume-r.volume)/r.volume;
 if(result.components!==r.components||result.nonmanifold||result.badEdges||result.volumeChange>.02)throw Error('拓扑或体积检查未通过，已保留原网格（体积变化 '+(result.volumeChange*100).toFixed(2)+'%）。');
 result.source='MMG';postMessage({result});
 }catch(err){postMessage({error:String(err.message||err)})}finally{if(h&&api)api.mmg3d.free(h)}
};
