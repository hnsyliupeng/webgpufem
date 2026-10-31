/* Experimental piecewise-linear level-set cut tetrahedra. No quality or solver guarantee. */
function buildCutTetMesh(p,o,notify=()=>{}) {
 const n=o.n, m=n+1, pts=[], val=[], tet=[], crossings=new Map();
 const at=(x,y,z)=>x+m*(y+m*z), xyz=id=>pts[id];
 const sub=(a,b)=>a.map((x,i)=>x-b[i]), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const length=a=>Math.sqrt(dot(a,a));
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
  const X=2*x/n-1,Y=2*y/n-1,Z=2*z/n-1;pts.push([X*p.lx/2,Y*p.ly/2,Z*p.lz/2]);let f=geo(X,Y,Z,p)[0];val.push(Math.abs(f)<1e-10?1e-10:f);
 }
 const edge=(a,b)=>{let k=a<b?a+':'+b:b+':'+a;if(crossings.has(k))return crossings.get(k);const t=val[a]/(val[a]-val[b]),A=xyz(a),B=xyz(b),id=pts.length;pts.push(A.map((v,i)=>v+t*(B[i]-v)));crossings.set(k,id);return id};
 const clip=ids=>{let r=[];for(let i=0;i<ids.length;i++){let a=ids[i],b=ids[(i+1)%ids.length],ina=val[a]<0,inb=val[b]<0;if(ina)r.push(a);if(ina!==inb)r.push(edge(a,b))}return r};
 const tri=(poly,center)=>{if(poly.length<3)return;let start=poly.indexOf(Math.min(...poly));let q=poly.slice(start).concat(poly.slice(0,start));for(let i=1;i<q.length-1;i++){
   let a=q[0],b=q[i],c=q[i+1], A=xyz(a),B=xyz(b),C=xyz(c),D=xyz(center),det=dot(sub(B,A),cross(sub(C,A),sub(D,A)));if(Math.abs(det)<1e-14)continue;if(det<0)[b,c]=[c,b];tet.push([a,b,c,center]);
 }};
 const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(let z=0;z<n;z++){notify('隐式边界切割四面体：'+z+'/'+n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const order of permutations){let c=[x,y,z],v=[at(...c)];for(const d of order){c=c.slice();c[d]++;v.push(at(...c))}let inside=v.filter(i=>val[i]<0).length;if(!inside)continue;
  let polys=[[v[0],v[1],v[2]],[v[0],v[3],v[1]],[v[0],v[2],v[3]],[v[1],v[3],v[2]]].map(clip).filter(a=>a.length>=3);
  if(inside<4){let cuts=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if((val[v[i]]<0)!==(val[v[j]]<0))cuts.push(edge(v[i],v[j]));let mid=[0,1,2].map(k=>cuts.reduce((s,id)=>s+xyz(id)[k],0)/cuts.length),u=sub(xyz(cuts[0]),mid),normal=cross(u,sub(xyz(cuts[1]),mid)),vaxis=cross(normal,u);cuts.sort((a,b)=>Math.atan2(dot(sub(xyz(a),mid),vaxis),dot(sub(xyz(a),mid),u))-Math.atan2(dot(sub(xyz(b),mid),vaxis),dot(sub(xyz(b),mid),u)));polys.push(cuts)}
  let all=[...new Set(polys.flat())],center=pts.length;pts.push([0,1,2].map(k=>all.reduce((s,id)=>s+xyz(id)[k],0)/all.length));for(const poly of polys)tri(poly,center);
 }}
 if(!tet.length)throw Error('未采样到实体；请提高分辨率或增大壁厚。');
 return inspectCutTetMesh(pts,tet,n);
}
function inspectCutTetMesh(pts,tet,n){
 const xyz=id=>pts[id], sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),length=a=>Math.sqrt(dot(a,a));
 let faces=new Map();for(let element=0;element<tet.length;element++){let [a,b,c,d]=tet[element];for(const f of [[a,b,c],[a,b,d],[a,c,d],[b,c,d]]){let k=f.slice().sort((x,y)=>x-y).join(':');let e=faces.get(k);if(e){e.count++;e.elements.push(element)}else faces.set(k,{f,count:1,elements:[element]})}}
 let worst=Infinity, small=0, nonmanifold=0, histogram=Array(10).fill(0), volume=0, maxAspect=0, minAngle=180, minJacobian=1;
 const parent=Int32Array.from({length:tet.length},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b};
 for(const t of tet){let [a,b,c,d]=t.map(xyz),det=Math.abs(dot(sub(b,a),cross(sub(c,a),sub(d,a)))),pairs=[[a,b],[a,c],[a,d],[b,c],[b,d],[c,d]],sum=pairs.reduce((s,[u,v])=>s+dot(sub(u,v),sub(u,v)),0),q=12*Math.pow(det/2,2/3)/sum;volume+=det/6;worst=Math.min(worst,q);histogram[Math.min(9,Math.max(0,Math.floor(q*10)))]++;if(q<.1)small++;
  let longest=Math.max(...pairs.map(([u,v])=>length(sub(u,v))));let facets=[[a,b,c],[a,b,d],[a,c,d],[b,c,d]];for(const [u,v,w] of facets){let area2=length(cross(sub(v,u),sub(w,u)));maxAspect=Math.max(maxAspect,longest*area2/det);for(const [p1,p2,p3] of [[u,v,w],[v,u,w],[w,u,v]]){let e=sub(p2,p1),f=sub(p3,p1);minAngle=Math.min(minAngle,Math.acos(Math.max(-1,Math.min(1,dot(e,f)/(length(e)*length(f)))))*180/Math.PI)}}
  for(let i=0;i<4;i++){let other=[0,1,2,3].filter(j=>j!==i),p0=xyz(t[i]),e=other.map(j=>sub(xyz(t[j]),p0));minJacobian=Math.min(minJacobian,det/(length(e[0])*length(e[1])*length(e[2])))}
 }
 let boundary=[], edgeCounts=new Map();for(const x of faces.values()){if(x.count===1){boundary.push(x.f);for(const [a,b] of [[x.f[0],x.f[1]],[x.f[1],x.f[2]],[x.f[2],x.f[0]]]){let k=a<b?a+':'+b:b+':'+a;edgeCounts.set(k,(edgeCounts.get(k)||0)+1)}}if(x.count===2)join(x.elements[0],x.elements[1]);if(x.count>2)nonmanifold++}
 let badEdges=Array.from(edgeCounts.values()).filter(count=>count!==2).length,components=new Set(tet.map((_,i)=>find(i))).size;
 return {points:pts,tets:tet,boundary,worst,small,nonmanifold,badEdges,components,histogram,n,volume,maxAspect,minAngle,minJacobian};
}
if(typeof module!=='undefined'){module.exports=buildCutTetMesh;module.exports.inspect=inspectCutTetMesh;}
