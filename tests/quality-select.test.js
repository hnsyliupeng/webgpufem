const assert=require('node:assert/strict'),select=require('../quality-select.js');
for(let n of [1,10,1000])for(let k of [1,5,100]){let q=Array.from({length:n},(_,i)=>(i*37%13)/13);assert.deepEqual(select(q,k),q.map((_,i)=>i).sort((a,b)=>q[a]-q[b]||a-b).slice(0,k))}console.log('bounded worst-quality heap tests passed');
