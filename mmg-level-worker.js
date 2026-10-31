/* Discretize scalar level set in a conforming background tetrahedral mesh using MMG3D. */
importScripts('./cut-tet.js');
onmessage=async e=>{let api,h;try{
 const {n,values,lengths,hausd}=e.data,m=n+1,np=m**3,ne=6*n**3;if(values.length!==np)throw Error('节点数据长度无效');
 let logs=[];postMessage({progress:'加载 MMG3D…'});api=await (await import('./vendor/mmg/dist/mmg.mjs')).default({print:s=>logs.push(String(s)),printErr:s=>logs.push(String(s))});let g=api.mmg3d;h=g.init({levelset:true});g.setIparameter(h.mesh,h.ls,g.IPARAM_verbose,-1);g.setMeshSize(h.mesh,np,ne,0,0,0,0);g.setSolSize(h.mesh,h.ls,api.MMG5_Vertex,np,api.MMG5_Scalar);
 const idx=(x,y,z)=>1+x+m*(y+m*z);for(let z=0;z<m;z++)for(let y=0;y<m;y++)for(let x=0;x<m;x++){let i=idx(x,y,z);g.setVertex(h.mesh,(x/n-.5)*lengths[0],(y/n-.5)*lengths[1],(z/n-.5)*lengths[2],0,i);g.setScalarSol(h.ls,values[i-1],i)}
 let perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]],count=0;for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(let pi=0;pi<6;pi++){let c=[x,y,z],t=[idx(...c)];for(let k of perms[pi]){c=c.slice();c[k]++;t.push(idx(...c))}if(pi===1||pi===2||pi===5)[t[1],t[2]]=[t[2],t[1]];g.setTetrahedron(h.mesh,...t,1,++count)}
 g.setIparameter(h.mesh,h.ls,g.IPARAM_iso,1);g.setDparameter(h.mesh,h.ls,g.DPARAM_hausd,hausd);postMessage({progress:'MMG3D 正在离散隐式曲面并生成四面体，请稍候…'});let code=g.levelset(h.mesh,h.ls,h.met);if(code!==api.MMG5_SUCCESS)throw Error('MMG 状态 '+code+'，结果丢弃。'+logs.slice(-5).join(' | '));
 let sz=g.getMeshSize(h.mesh),v=g.getVertices(h.mesh,sz.np).vertices,{tetra,refs}=g.getTetrahedra(h.mesh,sz.ne),points=[],tets=[];for(let i=0;i<v.length;i+=3)points.push([v[i],v[i+1],v[i+2]]);
 // MMG's default split assigns reference 3 to the negative level-set domain.
 for(let i=0;i<refs.length;i++){if(refs[i]!==3)continue;let t=Array.from(tetra.slice(i*4,i*4+4),x=>x-1),[a,b,c,d]=t.map(j=>points[j]);if(!a||!b||!c||!d)throw Error('节点索引错误');let u=b.map((x,k)=>x-a[k]),v=c.map((x,k)=>x-a[k]),w=d.map((x,k)=>x-a[k]),det=u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0]);if(!Number.isFinite(det)||Math.abs(det)<1e-14)throw Error('退化四面体');if(det<0)[t[1],t[2]]=[t[2],t[1]];tets.push(t)}
 if(!tets.length)throw Error('未生成负域实体，请检查薄壁采样。');postMessage({progress:'评估生成网格质量和连通性…'});let result=inspectCutTetMesh(points,tets,n);result.source='MMG-LS';postMessage({result});
 }catch(err){postMessage({error:String(err.message||err)})}finally{if(h&&api)api.mmg3d.free(h)}
};
