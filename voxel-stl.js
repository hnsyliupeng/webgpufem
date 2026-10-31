/* Binary STL of exposed voxel faces. Coordinates and spacing are in mm. */
(function (root) {
  function voxelSTL(mesh) {
    const {n, labels, spacing} = mesh;
    if (!Number.isInteger(n) || n < 1 || labels.length !== n ** 3 || !spacing || spacing.length !== 3 || spacing.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('Invalid voxel mesh');
    const faces = [
      [-1,0,0,[0,4,6,2]], [1,0,0,[1,3,7,5]],
      [0,-1,0,[0,1,5,4]], [0,1,0,[2,6,7,3]],
      [0,0,-1,[0,2,3,1]], [0,0,1,[4,5,7,6]]
    ];
    const occupied = (x,y,z) => x>=0 && y>=0 && z>=0 && x<n && y<n && z<n && labels[x+n*(y+n*z)] !== 0;
    let count=0;
    for(let z=0;z<n;z++) for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(occupied(x,y,z)) for(const [dx,dy,dz] of faces) if(!occupied(x+dx,y+dy,z+dz)) count+=2;
    const bytes=new ArrayBuffer(84+50*count), view=new DataView(bytes); view.setUint32(80,count,true); let offset=84;
    for(let z=0;z<n;z++) for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(occupied(x,y,z)) for(const [dx,dy,dz,ids] of faces) {
      if(occupied(x+dx,y+dy,z+dz)) continue;
      for(const tri of [[ids[0],ids[1],ids[2]],[ids[0],ids[2],ids[3]]]) {
        for(const v of [dx,dy,dz]) { view.setFloat32(offset,v,true); offset+=4; }
        for(const i of tri) for(const v of [(x+(i&1)-n/2)*spacing[0],(y+((i>>1)&1)-n/2)*spacing[1],(z+((i>>2)&1)-n/2)*spacing[2]]) {view.setFloat32(offset,v,true); offset+=4;}
        view.setUint16(offset,0,true); offset+=2;
      }
    }
    return bytes;
  }
  root.voxelSTL=voxelSTL;
  if(typeof module!=='undefined') module.exports=voxelSTL;
})(typeof globalThis!=='undefined'?globalThis:this);
