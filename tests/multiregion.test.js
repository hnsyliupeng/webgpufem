const assert=require('node:assert/strict'),build=require('../cut-tet').buildMultiRegion;
// Three disjoint bands separated by x and y planes, with a conforming triple junction.
global.geo=(x,y,z)=>[x-.17,y-.13,z-.07];
let r=build({lx:2,ly:2,lz:2},{n:3}),counts=[0,0,0,0];for(let x of r.materials)counts[x]++;
assert.ok(counts[1]&&counts[2]&&counts[3]);assert.equal(r.nonmanifold,0);assert.equal(r.badEdges,0);assert.equal(r.components,1);assert.ok(Math.abs(r.volume-(8-(1-.17)*(1-.13)*(1-.07)))<1e-8);assert.equal(r.materials.length,r.tets.length);
let faces=new Map(),interfaces=0;for(let i=0;i<r.tets.length;i++){let [a,b,c,d]=r.tets[i];for(let f of [[a,b,c],[a,b,d],[a,c,d],[b,c,d]]){let key=f.sort((x,y)=>x-y).join(':');if(faces.has(key)&&faces.get(key)!==r.materials[i])interfaces++;else faces.set(key,r.materials[i])}}assert.ok(interfaces>0);console.log('conforming multi-material interface test passed',counts,interfaces);
// A thin macro sheet crosses cells although no background grid vertex lies in it.
global.geo=(x,y,z)=>{let d=[Math.abs(x)-.08,100,100];d[5]=x;d[12]=.08;return d};let thin=build({lx:2,ly:2,lz:2,form:4,host:0},{n:3});assert.ok(Math.abs(thin.volume-.64)<1e-8);assert.equal(thin.components,1);assert.equal(thin.badEdges,0);assert.ok(thin.materials.every(m=>m===1));console.log('two-sided macro thin sheet recovered');
