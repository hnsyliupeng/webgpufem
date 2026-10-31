const assert=require('node:assert/strict');const build=require('../cut-tet.js');
global.geo=(x,y,z)=>[x+0.13];
const r=build({lx:2,ly:2,lz:2},{n:4});assert.ok(r.tets.length>0);assert.equal(r.nonmanifold,0);assert.equal(r.badEdges,0);assert.equal(r.components,1);assert.ok(r.minJacobian>0&&r.minJacobian<=1);assert.ok(r.maxAspect>=1);assert.ok(r.minAngle>0);assert.ok(r.worst>0);assert.equal(r.histogram.reduce((a,b)=>a+b,0),r.tets.length);
let volume=0;for(const t of r.tets){const [a,b,c,d]=t.map(i=>r.points[i]),v=(u,w)=>u.map((x,i)=>x-w[i]),x=v(b,a),y=v(c,a),z=v(d,a),det=x[0]*(y[1]*z[2]-y[2]*z[1])-x[1]*(y[0]*z[2]-y[2]*z[0])+x[2]*(y[0]*z[1]-y[1]*z[0]);assert.ok(det>0);volume+=det/6}assert.ok(Math.abs(volume-3.48)<1e-8);
// Every boundary triangle must lie on the test plane or the bounding box.
for(const f of r.boundary){const p=f.map(i=>r.points[i]);assert.ok([0,1,2].some(k=>[-1,1].some(a=>p.every(v=>Math.abs(v[k]-a)<1e-8)))||p.every(v=>Math.abs(v[0]+.13)<1e-8),'unexpected interior crack')}
console.log('cut tetrahedron plane test passed');
