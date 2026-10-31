var selectWorst = typeof module!=='undefined' ? require('./quality-select.js') : selectWorstQuality;
/* Interior-node patch max-min Jacobian optimization. Boundary nodes are immovable. */
function optimizeInteriorJacobian(mesh,options={},notify=()=>{}) {
 const {points,tets,boundary}=mesh,passes=options.passes??2,limit=options.limit??60;
 if(!Number.isInteger(passes)||passes<1||passes>8||!Number.isInteger(limit)||limit<1||limit>500)throw Error('局部优化参数无效');
 const n=points.length,incident=Array.from({length:n},()=>[]),fixed=new Uint8Array(n),quality=new Float64Array(tets.length);
 for(const f of boundary)for(const id of f)fixed[id]=1;
 for(let i=0;i<tets.length;i++)for(const id of tets[i])incident[id].push(i);
 const metric=t=>{let p=t.map(i=>points[i]),a=p[0],u=p[1].map((v,k)=>v-a[k]),v=p[2].map((x,k)=>x-a[k]),w=p[3].map((x,k)=>x-a[k]),d=u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0]);if(!Number.isFinite(d)||d<=1e-14)return -1;let q=1;for(let i=0;i<4;i++){let lens=[];for(let j=0;j<4;j++)if(i!==j)lens.push(Math.hypot(...p[j].map((x,k)=>x-p[i][k])));let den=lens[0]*lens[1]*lens[2];if(!(den>0))return -1;q=Math.min(q,d/den)}return q};
 for(let i=0;i<tets.length;i++){quality[i]=metric(tets[i]);if(quality[i]<=0)throw Error('输入包含反向或退化四面体');}
 let minBefore=1;for(const q of quality)minBefore=Math.min(minBefore,q);
 let history=[],totalMoves=0;
 for(let pass=1;pass<=passes;pass++){
  notify(`局部质量优化 ${pass}/${passes}：选择最差单元…`);
  const candidates=selectWorst(quality,limit);let moves=0,visited=new Set();
  for(const tid of candidates)for(const id of tets[tid]){
   if(fixed[id]||visited.has(id))continue;visited.add(id);const star=incident[id];if(!star.length)continue;
   let before=1;for(const i of star)before=Math.min(before,quality[i]);let p=points[id],origin=p.slice(),near=Infinity;for(const i of star)for(const j of tets[i])if(j!==id)near=Math.min(near,Math.hypot(...points[j].map((v,k)=>v-origin[k])));if(!(near>0&&Number.isFinite(near)))continue;
   let best=before,bestPos=null;for(const scale of [.20,.10,.05,.025])for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    if(!x&&!y&&!z)continue;let d=Math.hypot(x,y,z),step=near*scale/d;p[0]=origin[0]+x*step;p[1]=origin[1]+y*step;p[2]=origin[2]+z*step;let q=1;for(const i of star){q=Math.min(q,metric(tets[i]));if(q<=best+1e-9)break}if(q>best+1e-9){best=q;bestPos=p.slice()}
   }
   p[0]=origin[0];p[1]=origin[1];p[2]=origin[2];if(bestPos){p[0]=bestPos[0];p[1]=bestPos[1];p[2]=bestPos[2];for(const i of star)quality[i]=metric(tets[i]);moves++;totalMoves++}
  }
  let min=1;for(const q of quality)min=Math.min(min,q);history.push({pass,moves,minJacobian:min});notify(`局部优化 ${pass}/${passes}：移动 ${moves} 个内部节点，最小 Jacobian ${min.toFixed(5)}`);if(!moves)break;
 }
 return {minBefore,history,totalMoves};
}
if(typeof module!=='undefined')module.exports=optimizeInteriorJacobian;
