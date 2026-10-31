/* Bounded max-heap: O(N log K) time, O(K) storage, deterministic ties. */
function selectWorstQuality(q,limit){
 const heap=[],worse=(a,b)=>q[a]>q[b]||(q[a]===q[b]&&a>b);
 for(let i=0;i<q.length;i++){
  if(heap.length<limit){let j=heap.length;heap.push(i);while(j){let p=(j-1)>>1;if(!worse(heap[j],heap[p]))break;[heap[j],heap[p]]=[heap[p],heap[j]];j=p}}
  else if(worse(heap[0],i)){heap[0]=i;let j=0;for(;;){let l=2*j+1,r=l+1,b=j;if(l<heap.length&&worse(heap[l],heap[b]))b=l;if(r<heap.length&&worse(heap[r],heap[b]))b=r;if(b===j)break;[heap[j],heap[b]]=[heap[b],heap[j]];j=b}}
 }
 return heap.sort((a,b)=>q[a]-q[b]||a-b);
}
if(typeof module!=='undefined')module.exports=selectWorstQuality;
