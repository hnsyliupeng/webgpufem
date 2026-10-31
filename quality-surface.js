/* Experimental bounded tangential boundary-node patch optimization. */
function optimizeSurfaceJacobian(mesh,options={},notify=()=>{}) {
 const {points,tets,boundary}=mesh,passes=options.passes??2,limit=options.limit??60,maxMove=options.maxMove??.05,bounds=options.bounds;
 if(!Number.isInteger(passes)||passes<1||passes>8||!Number.isInteger(limit)||limit<1||limit>500||!Number.isFinite(maxMove)||maxMove<=0||maxMove>.2||!Array.isArray(bounds)||bounds.length!==3||bounds.some(v=>!Number.isFinite(v)||v<=0))throw Error('边界优化参数无效');
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a);
 const incident=Array.from({length:points.length},()=>[]),boundaryFaces=Array.from({length:points.length},()=>[]),quality=new Float64Array(tets.length),reference=mesh.boundaryReference||{};
 for(let i=0;i<tets.length;i++)for(const id of tets[i])incident[id].push(i);
 for(let i=0;i<boundary.length;i++)for(const id of boundary[i]){boundaryFaces[id].push(i);if(!reference[id])reference[id]=points[id].slice()}
 function normal(f){let [a,b,c]=f.map(i=>points[i]);return cross(sub(b,a),sub(c,a))}
 function metric(t){let p=t.map(i=>points[i]),d=dot(sub(p[1],p[0]),cross(sub(p[2],p[0]),sub(p[3],p[0])));if(!Number.isFinite(d)||d<=1e-14)return -1;let q=1;for(let i=0;i<4;i++){let l=[];for(let j=0;j<4;j++)if(j!==i)l.push(len(sub(p[j],p[i])));let den=l[0]*l[1]*l[2];if(!(den>0))return -1;q=Math.min(q,d/den)}return q}
 for(let i=0;i<tets.length;i++){quality[i]=metric(tets[i]);if(quality[i]<=0)throw Error('输入包含反向或退化单元')}
 let history=[],totalMoves=0;
 for(let pass=1;pass<=passes;pass++){
  notify(`边界切向修正 ${pass}/${passes}…`);let candidates=Array.from({length:tets.length},(_,i)=>i).sort((a,b)=>quality[a]-quality[b]).slice(0,limit),visited=new Set(),moves=0;
  for(const tid of candidates)for(const id of tets[tid]){
   if(visited.has(id)||!boundaryFaces[id].length)continue;visited.add(id);let p=points[id],origin=p.slice();
   // Outer clipping box is fixed. Sharp features are fixed by the face-normal criterion.
   if(origin.some((v,k)=>Math.abs(Math.abs(v)-bounds[k]/2)<bounds[k]*1e-8))continue;
   let normals=boundaryFaces[id].map(i=>normal(boundary[i])),norms=normals.map(len);if(norms.some(x=>x<1e-12))continue;let ref=normals[0].map(v=>v/norms[0]),sum=[0,0,0],smooth=true;
   for(let i=0;i<normals.length;i++){let unit=normals[i].map(v=>v/norms[i]),sign=dot(unit,ref)<0?-1:1;if(Math.abs(dot(unit,ref))<.90){smooth=false;break}for(let k=0;k<3;k++)sum[k]+=unit[k]*sign}
   if(!smooth||len(sum)<1e-12)continue;let N=sum.map(v=>v/len(sum)),axis=Math.abs(N[0])<.8?[1,0,0]:[0,1,0],u=cross(N,axis),ul=len(u);u=u.map(v=>v/ul);let v=cross(N,u),star=incident[id],before=1,near=Infinity;for(const j of star){before=Math.min(before,quality[j]);for(const k of tets[j])if(k!==id)near=Math.min(near,len(sub(points[k],origin)))}if(!(near>0&&Number.isFinite(near)))continue;
   let best=before,bestPos=null;for(const scale of [1,.5,.25,.125])for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
    if(!x&&!y)continue;let step=Math.min(maxMove,near*.1)*scale/Math.hypot(x,y);for(let k=0;k<3;k++)p[k]=origin[k]+step*(x*u[k]+y*v[k]);if(len(sub(p,reference[id]))>maxMove+1e-10)continue;
    let valid=true;for(let j=0;j<normals.length;j++){let now=normal(boundary[boundaryFaces[id][j]]),nl=len(now);if(nl<norms[j]*.25||dot(now,normals[j])<.9*nl*norms[j]){valid=false;break}}if(!valid)continue;
    let q=1;for(const j of star){q=Math.min(q,metric(tets[j]));if(q<=best+1e-9)break}if(q>best+1e-9){best=q;bestPos=p.slice()}
   }
   for(let k=0;k<3;k++)p[k]=origin[k];if(bestPos){for(let k=0;k<3;k++)p[k]=bestPos[k];for(const j of star)quality[j]=metric(tets[j]);moves++;totalMoves++}
  }
  let min=1;for(const q of quality)min=Math.min(min,q);history.push({pass,moves,minJacobian:min});if(!moves)break;
 }
 let maxObserved=0;for(const id in reference)maxObserved=Math.max(maxObserved,len(sub(points[id],reference[id])));return {history,totalMoves,reference,maxObserved};
}
if(typeof module!=='undefined')module.exports=optimizeSurfaceJacobian;
