const assert=require('node:assert/strict'),opt=require('../quality-opt.js'),inspect=require('../cut-tet.js').inspect;
const points=[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[.015,.2,.2]],faces=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
function det(t){let [a,b,c,d]=t.map(i=>points[i]),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),w=d.map((v,k)=>v-a[k]);return u[0]*(v[1]*w[2]-v[2]*w[1])-u[1]*(v[0]*w[2]-v[2]*w[0])+u[2]*(v[0]*w[1]-v[1]*w[0])}
let tets=faces.map(f=>{let t=[...f,4];if(det(t)<0)[t[1],t[2]]=[t[2],t[1]];return t}),mesh=inspect(points,tets,1),before=mesh.minJacobian,fixed=points.slice(0,4).map(x=>x.slice()),volume=mesh.volume;
let result=opt(mesh,{passes:8,limit:4}),after=inspect(points,tets,1);assert.ok(result.totalMoves>0);assert.ok(after.minJacobian>before);assert.ok(Math.abs(after.volume-volume)<1e-12);assert.deepEqual(points.slice(0,4),fixed);assert.ok(tets.every(t=>det(t)>0));assert.throws(()=>opt(mesh,{passes:0,limit:4}));console.log('interior-node quality optimization test passed');
