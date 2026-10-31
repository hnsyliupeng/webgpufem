const assert=require('node:assert/strict'),build=require('../cut-tet.js').buildShell;
// 3 cells per axis: no grid vertex lies in [-0.1, 0.1], but the slab still crosses cells.
global.geo=(x,y,z)=>{let q=Array(13).fill(0);q[0]=Math.abs(x)-.1;q[5]=x;q[12]=.1;return q};
const r=build({lx:2,ly:2,lz:2,form:1,host:0},{n:3});assert.ok(r.tets.length);assert.equal(r.components,1);assert.equal(r.nonmanifold,0);assert.equal(r.badEdges,0);assert.ok(Math.abs(r.volume-.8)<1e-8,`volume ${r.volume}`);
for(const f of r.boundary){const p=f.map(i=>r.points[i]);assert.ok([0,1,2].some(k=>[-1,1].some(a=>p.every(v=>Math.abs(v[k]-a)<1e-8)))||[-.1,.1].some(a=>p.every(v=>Math.abs(v[0]-a)<1e-8)),'internal crack')}
console.log('two-sided thin slab tetrahedra test passed');
for (const [n,w] of [[3,.01],[4,.13],[5,.23]]) {
 global.geo=(x)=>{const q=Array(13).fill(0);q[0]=Math.abs(x-.07)-w;q[5]=x-.07;q[12]=w;return q};
 const mesh=build({lx:2,ly:2,lz:2,form:1,host:0},{n});
 assert.equal(mesh.components,1);assert.equal(mesh.badEdges,0);assert.equal(mesh.nonmanifold,0);assert.ok(Math.abs(mesh.volume-8*w)<1e-8);
}
