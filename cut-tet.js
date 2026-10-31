/* Experimental piecewise-linear level-set cut tetrahedra. No quality or solver guarantee. */
function buildCutTetMesh(p,o,notify=()=>{}) {
 const n=o.n, m=n+1, pts=[], val=[], tet=[], faces=new Map(), crossings=new Map();
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
   for(const f of [[a,b,c],[a,b,center],[b,c,center],[c,a,center]]){let k=f.slice().sort((x,y)=>x-y).join(':');let e=faces.get(k);if(e)e.count++;else faces.set(k,{f,count:1})}
 }};
 const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(let z=0;z<n;z++){notify('隐式边界切割四面体：'+z+'/'+n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const order of permutations){let c=[x,y,z],v=[at(...c)];for(const d of order){c=c.slice();c[d]++;v.push(at(...c))}let inside=v.filter(i=>val[i]<0).length;if(!inside)continue;
  let polys=[[v[0],v[1],v[2]],[v[0],v[3],v[1]],[v[0],v[2],v[3]],[v[1],v[3],v[2]]].map(clip).filter(a=>a.length>=3);
  if(inside<4){let cuts=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if((val[v[i]]<0)!==(val[v[j]]<0))cuts.push(edge(v[i],v[j]));let mid=[0,1,2].map(k=>cuts.reduce((s,id)=>s+xyz(id)[k],0)/cuts.length),u=sub(xyz(cuts[0]),mid),normal=cross(u,sub(xyz(cuts[1]),mid)),vaxis=cross(normal,u);cuts.sort((a,b)=>Math.atan2(dot(sub(xyz(a),mid),vaxis),dot(sub(xyz(a),mid),u))-Math.atan2(dot(sub(xyz(b),mid),vaxis),dot(sub(xyz(b),mid),u)));polys.push(cuts)}
  let all=[...new Set(polys.flat())],center=pts.length;pts.push([0,1,2].map(k=>all.reduce((s,id)=>s+xyz(id)[k],0)/all.length));for(const poly of polys)tri(poly,center);
 }}
 if(!tet.length)throw Error('未采样到实体；请提高分辨率或增大壁厚。');
 let worst=Infinity, small=0, nonmanifold=0, histogram=Array(10).fill(0);for(const t of tet){let [a,b,c,d]=t.map(xyz),det=Math.abs(dot(sub(b,a),cross(sub(c,a),sub(d,a)))),edges=[[a,b],[a,c],[a,d],[b,c],[b,d],[c,d]],sum=edges.reduce((s,[u,v])=>s+dot(sub(u,v),sub(u,v)),0),q=12*Math.pow(det/2,2/3)/sum;worst=Math.min(worst,q);histogram[Math.min(9,Math.floor(q*10))]++;if(q<.1)small++}let boundary=[];for(const x of faces.values()){if(x.count===1)boundary.push(x.f);if(x.count>2)nonmanifold++}
 return {points:pts,tets:tet,boundary,worst,small,nonmanifold,histogram,n};
}
if(typeof module!=='undefined')module.exports=buildCutTetMesh;
