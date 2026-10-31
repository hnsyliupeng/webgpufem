const assert=require('node:assert/strict'),cut=require('../cut-tet.js');
// Union of two half-spaces is the full box, while the first material alone is half.
global.geo=(x,y,z,p)=>[x-.1,-x-.1,100];
let p={lx:2,ly:2,lz:2,layer:0},a=cut(p,{n:4}),u=cut(p,{n:4,hierarchical:true});
assert.ok(Math.abs(u.volume-8)<1e-9);assert.ok(a.volume<5&&a.volume>4);assert.equal(u.components,1);assert.equal(u.nonmanifold,0);assert.equal(u.badEdges,0);
p.layer=2;let b=cut(p,{n:4,hierarchical:true});assert.ok(Math.abs(a.volume-b.volume)<1e-9);
let geom=cut.estimateGeometry({...p,layer:0},{n:4,hierarchical:true,boundaryPoints:[]});assert.equal(geom.inside,geom.total);console.log('hierarchical union cut and sampling tests passed');
