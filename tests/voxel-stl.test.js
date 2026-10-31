const assert = require('node:assert/strict');
const stl = require('../voxel-stl.js');
function check(n, labels, expected) {
  const b=stl({n,labels:Uint8Array.from(labels),spacing:[2,3,4]});
  const v=new DataView(b); assert.equal(v.getUint32(80,true),expected); assert.equal(b.byteLength,84+expected*50);
  for(let i=0;i<expected;i++) {
    let p=84+i*50, normal=[0,1,2].map(j=>v.getFloat32(p+j*4,true));
    let xyz=Array.from({length:3},(_,j)=>Array.from({length:3},(_,k)=>v.getFloat32(p+12+12*j+4*k,true)));
    let a=xyz[1].map((v,j)=>v-xyz[0][j]), c=xyz[2].map((v,j)=>v-xyz[0][j]);
    let cross=[a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]];
    assert.ok(cross.reduce((s,v,j)=>s+v*normal[j],0)>0,'outward winding');
  }
}
check(1,[1],12); check(2,[1,1,0,0,0,0,0,0],20); check(2,Array(8).fill(1),48); check(1,[0],0);
assert.throws(()=>stl({n:2,labels:[1],spacing:[1,1,1]}));
console.log('voxel STL tests passed');
