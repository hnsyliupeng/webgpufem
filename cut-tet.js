/* Experimental piecewise-linear level-set cut tetrahedra. No quality or solver guarantee. */
function buildCutTetMesh(p,o,notify=()=>{}) {
 const n=o.n, m=n+1, pts=[], val=[], tet=[], crossings=new Map();
 const at=(x,y,z)=>x+m*(y+m*z), xyz=id=>pts[id];
 const sub=(a,b)=>a.map((x,i)=>x-b[i]), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const length=a=>Math.sqrt(dot(a,a));
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
  const X=2*x/n-1,Y=2*y/n-1,Z=2*z/n-1;pts.push([X*p.lx/2,Y*p.ly/2,Z*p.lz/2]);let values=geo(X,Y,Z,p),f=o.hierarchical?(p.layer?values[p.layer-1]:Math.min(values[0],values[1],values[2])):values[0];val.push(Math.abs(f)<1e-10?1e-10:f);
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
 let worst=Infinity, small=0, nonmanifold=0, histogram=Array(10).fill(0), volume=0, maxAspect=0, minAngle=180, minJacobian=1,worstTet=-1,tetIndex=0;
 const parent=Int32Array.from({length:tet.length},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b};
 for(const t of tet){let [a,b,c,d]=t.map(xyz),det=Math.abs(dot(sub(b,a),cross(sub(c,a),sub(d,a)))),pairs=[[a,b],[a,c],[a,d],[b,c],[b,d],[c,d]],sum=pairs.reduce((s,[u,v])=>s+dot(sub(u,v),sub(u,v)),0),q=12*Math.pow(det/2,2/3)/sum;volume+=det/6;worst=Math.min(worst,q);histogram[Math.min(9,Math.max(0,Math.floor(q*10)))]++;if(q<.1)small++;
  let longest=Math.max(...pairs.map(([u,v])=>length(sub(u,v))));let facets=[[a,b,c],[a,b,d],[a,c,d],[b,c,d]];for(const [u,v,w] of facets){let area2=length(cross(sub(v,u),sub(w,u)));maxAspect=Math.max(maxAspect,longest*area2/det);for(const [p1,p2,p3] of [[u,v,w],[v,u,w],[w,u,v]]){let e=sub(p2,p1),f=sub(p3,p1);minAngle=Math.min(minAngle,Math.acos(Math.max(-1,Math.min(1,dot(e,f)/(length(e)*length(f)))))*180/Math.PI)}}
  for(let i=0;i<4;i++){let other=[0,1,2,3].filter(j=>j!==i),p0=xyz(t[i]),e=other.map(j=>sub(xyz(t[j]),p0));let j=det/(length(e[0])*length(e[1])*length(e[2]));if(j<minJacobian){minJacobian=j;worstTet=tetIndex}}
  tetIndex++;
 }
 let boundary=[], edgeCounts=new Map();for(const x of faces.values()){if(x.count===1){boundary.push(x.f);for(const [a,b] of [[x.f[0],x.f[1]],[x.f[1],x.f[2]],[x.f[2],x.f[0]]]){let k=a<b?a+':'+b:b+':'+a;edgeCounts.set(k,(edgeCounts.get(k)||0)+1)}}if(x.count===2)join(x.elements[0],x.elements[1]);if(x.count>2)nonmanifold++}
 let badEdges=Array.from(edgeCounts.values()).filter(count=>count!==2).length,components=new Set(tet.map((_,i)=>find(i))).size;
 return {points:pts,tets:tet,boundary,worst,small,nonmanifold,badEdges,components,histogram,n,volume,maxAspect,minAngle,minJacobian,worstTet};
}
if(typeof module!=='undefined'){module.exports=buildCutTetMesh;module.exports.inspect=inspectCutTetMesh;}

// Sample the existing TPMS field, retaining signed values (not center voxel labels).
function sampleLevelset(p,o,notify=()=>{}){let n=o.n,values=new Float64Array((n+1)**3),i=0;for(let z=0;z<=n;z++){notify(`采样 TPMS 隐式函数 ${z}/${n}`);for(let y=0;y<=n;y++)for(let x=0;x<=n;x++)values[i++]=geo(2*x/n-1,2*y/n-1,2*z/n-1,p)[0]}return {n,values}}
// Diagnostic sampling only; estimates are not rigorous error bounds.
function estimateTPMSGeometry(p,o,notify=()=>{}){
 const n=o.n, L=[p.lx,p.ly,p.lz], m=Math.min(96,Math.max(24,3*n)),total=m**3, eps=1e-4;
 let inside=0,materialSamples=[0,0,0,0];for(let z=0;z<m;z++){if(z%8===0)notify('正在评估几何采样误差 '+z+'/'+m);for(let y=0;y<m;y++)for(let x=0;x<m;x++){let d=geo(2*(x+.5)/m-1,2*(y+.5)/m-1,2*(z+.5)/m-1,p),mat=o.hierarchical?(p.layer?(d[p.layer-1]<0?p.layer:0):d.slice(0,3).findIndex(v=>v<0)+1):(d[0]<0?1:0);if(mat){inside++;materialSamples[mat]++}}}
 let errors=[];for(let xyz of o.boundaryPoints){let q=xyz.map((v,i)=>2*v/L[i]);if(q.some(v=>Math.abs(v)>.999999))continue;let field=q=>{let d=geo(...q,p);return o.hierarchical?(p.layer?d[p.layer-1]:Math.min(d[0],d[1],d[2])):d[0]},f=field(q),g=[];for(let i=0;i<3;i++){let a=q.slice(),b=q.slice();a[i]+=eps;b[i]-=eps;g.push((field(a)-field(b))/(eps*L[i]))}let norm=Math.hypot(...g);if(norm>1e-12&&Number.isFinite(f/norm))errors.push(Math.abs(f/norm))}
 errors.sort((a,b)=>a-b);const volume=inside/total*L[0]*L[1]*L[2];return {volume,m,inside,total,materialVolumes:materialSamples.map(count=>count/total*L[0]*L[1]*L[2]),boundarySamples:errors.length,p95:errors.length?errors[Math.min(errors.length-1,Math.floor(.95*errors.length))]:null,max:errors.length?errors[errors.length-1]:null};
}
if(typeof module!=='undefined')module.exports.estimateGeometry=estimateTPMSGeometry;
/* Clip linearized signed TPMS field against BOTH sheet boundaries inside each background tet. */
function buildShellTetMesh(p,o,notify=()=>{}) {
 if(p.form!==1 || p.host!==0)throw Error('当前双界面算法仅支持无外壳的一级板壳。');
 const n=o.n,m=n+1,points=[],fields=[],tet=[],edges=new Map(),at=(x,y,z)=>x+m*(y+m*z);
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){let X=2*x/n-1,Y=2*y/n-1,Z=2*z/n-1,v=geo(X,Y,Z,p),a=v[5],w=v[12];if(!Number.isFinite(a)||!Number.isFinite(w)||!(w>0))throw Error('无效壳体隐式函数');points.push([X*p.lx/2,Y*p.ly/2,Z*p.lz/2]);fields.push([a-w,-a-w])}
 function edge(a,b,k){let key=(a<b?a+':'+b:b+':'+a)+':'+k;if(edges.has(key))return edges.get(key);let fa=fields[a][k],fb=fields[b][k],t=fa/(fa-fb),id=points.length;points.push(points[a].map((v,i)=>v+t*(points[b][i]-v)));fields.push(fields[a].map((v,i)=>v+t*(fields[b][i]-v)));fields[id][k]=0;edges.set(key,id);return id}
 function clipFaces(faces,k){let out=[],cut=new Set();for(const face of faces){let poly=[];for(let j=0;j<face.length;j++){let a=face[j],b=face[(j+1)%face.length],ia=fields[a][k]<=0,ib=fields[b][k]<=0;if(ia)poly.push(a);if(ia!==ib){let c=edge(a,b,k);poly.push(c);cut.add(c)}}poly=poly.filter((v,i)=>v!==poly[(i+poly.length-1)%poly.length]);if(poly.length>=3)out.push(poly)}
  let c=Array.from(cut);if(c.length>=3){let center=[0,1,2].map(j=>c.reduce((s,id)=>s+points[id][j],0)/c.length),u=sub(points[c[0]],center),v=null;for(let i=1;i<c.length;i++){let w=cross(u,sub(points[c[i]],center));if(dot(w,w)>1e-24){v=cross(w,u);break}}if(v){c.sort((a,b)=>Math.atan2(dot(sub(points[a],center),v),dot(sub(points[a],center),u))-Math.atan2(dot(sub(points[b],center),v),dot(sub(points[b],center),u)));out.push(c)}}return out}
 function addFace(poly,center){let first=poly.indexOf(Math.min(...poly)),q=poly.slice(first).concat(poly.slice(0,first));for(let i=1;i<q.length-1;i++){let a=q[0],b=q[i],c=q[i+1],A=points[a],det=dot(sub(points[b],A),cross(sub(points[c],A),sub(points[center],A)));if(Math.abs(det)<1e-12)continue;if(det<0)[b,c]=[c,b];tet.push([a,b,c,center])}}
 const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(let z=0;z<n;z++){notify('双界面切割四面体：'+z+'/'+n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(let order of perms){let c=[x,y,z],v=[at(...c)];for(let k of order){c=c.slice();c[k]++;v.push(at(...c))}if(v.every(i=>fields[i][0]>0)||v.every(i=>fields[i][1]>0))continue;let f=[[v[0],v[1],v[2]],[v[0],v[3],v[1]],[v[0],v[2],v[3]],[v[1],v[3],v[2]]];f=clipFaces(f,0);if(!f.length)continue;f=clipFaces(f,1);if(!f.length)continue;let ids=[...new Set(f.flat())],center=points.length;points.push([0,1,2].map(k=>ids.reduce((s,i)=>s+points[i][k],0)/ids.length));fields.push([0,0]);for(let poly of f)addFace(poly,center)}}
 if(!tet.length)throw Error('没有生成壳体四面体，请检查参数。');return inspectCutTetMesh(points,tet,n);
}
if(typeof module!=='undefined')module.exports.buildShell=buildShellTetMesh;

/* Piecewise-linear arrangement of the three material fields. Each region is
 * split by every field, so neighbouring material regions share interface faces.
 * This is still a sampling approximation, not an exact CAD representation. */
function buildMultiRegionTetMesh(p,o,notify=()=>{}){
 const n=o.n;if(!Number.isInteger(n)||n<2||n>20)throw Error('多材料切割分辨率必须在 2–20 之间。');
 const splitMacro=(p.form===4||p.form===5)&&p.host===0,fieldCount=splitMacro?4:3;
 const m=n+1,points=[],fields=[],tets=[],materials=[],edges=new Map(),vertices=new Map(),at=(x,y,z)=>x+m*(y+m*z),eps=1e-11;
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],tol=Math.max(p.lx,p.ly,p.lz)*1e-11,keyPoint=q=>q.map(v=>Math.round(v/tol)).join(':');
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){let X=2*x/n-1,Y=2*y/n-1,Z=2*z/n-1,d=geo(X,Y,Z,p);points.push([X*p.lx/2,Y*p.ly/2,Z*p.lz/2]);let raw=splitMacro?[d[5]-d[12],-d[5]-d[12],d[1],d[2]]:d.slice(0,3),labels=splitMacro?[1,1,2,3]:[1,2,3];fields.push(raw.map((v,i)=>p.layer&&p.layer!==labels[i]?100:(Math.abs(v)<eps?eps:v)));vertices.set(keyPoint(points[points.length-1]),points.length-1);}
 function edge(a,b,k){let fa=fields[a][k],fb=fields[b][k];if(Math.abs(fa)<eps*.1)return a;if(Math.abs(fb)<eps*.1)return b;let key=(a<b?a+':'+b:b+':'+a)+':'+k;if(edges.has(key))return edges.get(key);let t=fa/(fa-fb),point=points[a].map((v,j)=>v+t*(points[b][j]-v)),pk=keyPoint(point),i=vertices.get(pk);if(i===undefined){i=points.length;points.push(point);fields.push(fields[a].map((v,j)=>v+t*(fields[b][j]-v)));fields[i][k]=0;vertices.set(pk,i)}edges.set(key,i);return i}
 function clip(faces,k,negative){let out=[],cut=new Set();for(let face of faces){let poly=[];for(let i=0;i<face.length;i++){let a=face[i],b=face[(i+1)%face.length],fa=fields[a][k]*(negative?1:-1),fb=fields[b][k]*(negative?1:-1),ia=fa<=eps*.1,ib=fb<=eps*.1;if(ia)poly.push(a);if(ia!==ib){let c=edge(a,b,k);poly.push(c);cut.add(c)}}poly=poly.filter((v,i)=>v!==poly[(i+poly.length-1)%poly.length]);if(new Set(poly).size>=3)out.push(poly)}let c=[...cut];if(c.length>=3){let mid=[0,1,2].map(j=>c.reduce((s,i)=>s+points[i][j],0)/c.length),u=sub(points[c[0]],mid),v=null;for(let i=1;i<c.length;i++){let w=cross(u,sub(points[c[i]],mid));if(dot(w,w)>1e-24){v=cross(w,u);break}}if(v){c.sort((a,b)=>Math.atan2(dot(sub(points[a],mid),v),dot(sub(points[a],mid),u))-Math.atan2(dot(sub(points[b],mid),v),dot(sub(points[b],mid),u)));out.push(c)}}return out}
 function addRegion(faces,mat){let ids=[...new Set(faces.flat())];if(ids.length<4)return;let center=points.length;points.push([0,1,2].map(k=>ids.reduce((s,i)=>s+points[i][k],0)/ids.length));fields.push([0,0,0]);for(let poly of faces){let start=poly.indexOf(Math.min(...poly)),q=poly.slice(start).concat(poly.slice(0,start));for(let i=1;i<q.length-1;i++){let a=q[0],b=q[i],c=q[i+1],A=points[a],det=dot(sub(points[b],A),cross(sub(points[c],A),sub(points[center],A)));if(Math.abs(det)<1e-12)continue;if(det<0)[b,c]=[c,b];tets.push([a,b,c,center]);materials.push(mat)}}}
 const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(let z=0;z<n;z++){notify(`共享材料界面切割 ${z}/${n}；已生成 ${tets.length} 四面体`);for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(let order of perms){let c=[x,y,z],v=[at(...c)];for(let k of order){c=c.slice();c[k]++;v.push(at(...c))}if(splitMacro?((v.every(i=>fields[i][0]>0)||v.every(i=>fields[i][1]>0))&&v.every(i=>fields[i][2]>0)&&v.every(i=>fields[i][3]>0)):v.every(i=>fields[i][0]>0&&fields[i][1]>0&&fields[i][2]>0))continue;let regions=[{f:[[v[0],v[1],v[2]],[v[0],v[3],v[1]],[v[0],v[2],v[3]],[v[1],v[3],v[2]]],sign:[]}];for(let k=0;k<fieldCount;k++){let next=[];for(let r of regions){let vs=[...new Set(r.f.flat())],lo=Math.min(...vs.map(i=>fields[i][k])),hi=Math.max(...vs.map(i=>fields[i][k]));if(lo<-eps*.1&&hi>eps*.1){for(let neg of [true,false]){let f=clip(r.f,k,neg);if(f.length>=4)next.push({f,sign:r.sign.concat(neg)})}}else next.push({f:r.f,sign:r.sign.concat(lo<-eps*.1)})}regions=next}for(let r of regions){let mat=splitMacro?(r.sign[0]&&r.sign[1]?1:r.sign[2]?2:r.sign[3]?3:0):r.sign.indexOf(true)+1;if(mat)addRegion(r.f,mat)}}}
 if(!tets.length)throw Error('未采样到实体；请检查层级场和分辨率。');let result=inspectCutTetMesh(points,tets,n);result.materials=materials;let interfaces=collectMaterialInterfaces(tets,materials);result.materialCounts=interfaces.counts;result.materialInterfaceCount=interfaces.interfaces.length;result.materialVolumes=calculateMaterialVolumes(points,tets,materials);return result;
}
if(typeof module!=='undefined')module.exports.buildMultiRegion=buildMultiRegionTetMesh;
// Extract shared material faces; each entry is an internal face shared by two different labels.
function collectMaterialInterfaces(tets,materials){let faces=new Map(),interfaces=[],counts=[0,0,0,0];for(let i=0;i<tets.length;i++){let [a,b,c,d]=tets[i],mat=materials[i];counts[mat]=(counts[mat]||0)+1;for(let f of [[a,b,c],[a,b,d],[a,c,d],[b,c,d]]){let key=f.slice().sort((x,y)=>x-y).join(':'),prev=faces.get(key);if(prev){if(prev.mat!==mat)interfaces.push({face:f,materials:[prev.mat,mat]})}else faces.set(key,{mat})}}return {interfaces,counts}}
if(typeof module!=='undefined')module.exports.collectMaterialInterfaces=collectMaterialInterfaces;

function calculateMaterialVolumes(points,tets,materials){let out=[0,0,0,0];for(let i=0;i<tets.length;i++){let [a,b,c,d]=tets[i].map(j=>points[j]),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),w=d.map((v,k)=>v-a[k]);out[materials[i]]+=Math.abs(u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0]))/6}return out}
if(typeof module!=='undefined')module.exports.calculateMaterialVolumes=calculateMaterialVolumes;
