"""Optional SimWild backend: closed sampled implicit surfaces -> labelled tet mesh.
Input: little-endian float32 [z,y,x,material] samples via stdin; options in argv.
The generated surface and mesh are approximations; callers must screen them.
"""
import json, sys, traceback

def event(**kw):
    print('@event@'+json.dumps(kw,separators=(',',':'),allow_nan=False),flush=True)

def surface(field, lengths, n):
    import numpy as np
    from skimage.measure import marching_cubes
    if not np.all(np.isfinite(field)): raise ValueError('隐式场含非有限数值')
    if not np.any(field < 0): return None
    spacing=np.asarray(lengths[::-1],dtype=float)/n
    outside=max(1., float(np.max(np.abs(field)))*10.)
    padded=np.pad(field,1,constant_values=outside)
    vertices,faces,_,_=marching_cubes(padded,level=0.,spacing=tuple(spacing),gradient_direction='ascent',allow_degenerate=False)
    vertices=vertices[:,::-1]-np.asarray(lengths)/2-np.asarray(lengths)/n
    vertices=np.clip(vertices,-np.asarray(lengths)/2,np.asarray(lengths)/2)
    tol=max(lengths)*1e-10
    _,first,inverse=np.unique(np.round(vertices/tol).astype(np.int64),axis=0,return_index=True,return_inverse=True)
    vertices=vertices[first].astype(np.float64); faces=inverse[faces].astype(np.int64)
    good=(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2]);faces=faces[good]
    v=vertices[faces];a=v[:,1]-v[:,0];b=v[:,2]-v[:,0];faces=faces[np.linalg.norm(np.cross(a,b),axis=1)>tol**2]
    edges=np.sort(np.concatenate((faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]])),axis=1)
    _,count=np.unique(edges,axis=0,return_counts=True);bad=int(np.count_nonzero(count!=2))
    if bad: raise ValueError(f'采样曲面存在 {bad} 条非流形/开口边，不能用于材料区域划分')
    return {'V':vertices,'cells':{'triangle':{'connectivity':faces}}}

def main():
    import numpy as np
    import wildmeshing as wm
    opt=json.loads(sys.argv[1]);n=int(opt['n']);lengths=[float(v) for v in opt['lengths']]
    if n<8 or n>96 or len(lengths)!=3 or any(not np.isfinite(v) or v<=0 for v in lengths): raise ValueError('采样网格或模型尺寸无效')
    length=float(opt['length']);eps=float(opt['eps']);iterations=int(opt['iterations']);threads=int(opt['threads'])
    if not (0<length<=max(lengths) and 0<eps<=length and 1<=iterations<=10 and 1<=threads<=4): raise ValueError('SimWild 参数无效')
    raw=sys.stdin.buffer.read();expected=(n+1)**3*3
    if len(raw)!=4*expected: raise ValueError('隐式场采样数据长度不匹配')
    data=np.frombuffer(raw,dtype='<f4').reshape((n+1,n+1,n+1,3));meshes={};names=[];metrics=[]
    for i in range(3):
        event(progress=f'从 App 第 {i+1} 材料的隐式场构造闭合曲面…')
        shape=surface(data[:,:,:,i],lengths,n)
        if shape is not None:
            name=f'material{i+1}';meshes[name]=shape;names.append(name)
            v=shape['V'][shape['cells']['triangle']['connectivity']]
            volume=abs(float(np.einsum('ij,ij->i',v[:,0],np.cross(v[:,1],v[:,2])).sum()/6))
            metrics.append({'material':i+1,'vertices':len(shape['V']),'triangles':len(shape['cells']['triangle']['connectivity']),'volume':volume})
    if not names: raise ValueError('当前采样没有捕获任何材料；提高分辨率。')
    refs=opt.get('referenceVolumes')
    if refs is not None:
        if len(refs)!=3 or any(not np.isfinite(float(x)) or float(x)<0 for x in refs): raise ValueError('参考材料体积无效')
        # Reject obvious aliasing before expensive tetrahedralization. This is a
        # sampling diagnostic, not a proof of topology or Hausdorff accuracy.
        volume_by_material={m['material']:m['volume'] for m in metrics}
        for i,ref in enumerate(refs):
            ref=float(ref); measured=volume_by_material.get(i+1,0.)
            if max(ref,measured)>np.prod(lengths)*0.001 and abs(measured-ref)/max(ref,measured)>0.25:
                raise ValueError(f'材料 {i+1} 曲面体积 {measured:.0f} 与 {opt.get("referenceN", "高密度")}³ 中点采样 {ref:.0f} mm³ 偏差过大；拒绝耗时体网格，请提高几何采样密度。')
    total=sum(v['triangles'] for v in metrics)
    if total>150000: raise ValueError(f'曲面 {total} 面超过安全上限，请降低分辨率或使用更大内存的后端。')
    event(progress=f'闭合曲面共 {total} 面；SimWild 多区域嵌入与体网格优化…',surfaces=metrics)
    options={'input':names,'input_names':names,'eps':eps,'length':length,'num_threads':threads,'max_iterations':iterations,'stop_energy':10,'skip_simplify':False}
    outputs,report=wm.simwild(options,meshes);mesh=outputs['mesh'];points=np.asarray(mesh['V'],dtype=float);cells=mesh['cells']['tetrahedron'];tets=np.asarray(cells['connectivity'],dtype=np.int64);tag=cells['attributes']['tags'];tags=np.asarray(tag['values']);tag_names=tag['labels'];columns=[tag_names.index(name) for name in names];members=tags[:,columns]!=0;keep=members.any(axis=1);tets=tets[keep];members=members[keep]
    if not len(tets): raise ValueError('SimWild 未返回实体区域。')
    if len(tets)>500000: raise ValueError(f'实体四面体 {len(tets)} 超过浏览器安全上限，结果未载入。')
    # Priority matches App classify(): material 1, then 2, then 3.
    labels=np.asarray([int(name[-1]) for name in names],dtype=np.int8)[np.argmax(members,axis=1)]
    v=points[tets];d=np.linalg.det(np.stack((v[:,1]-v[:,0],v[:,2]-v[:,0],v[:,3]-v[:,0]),axis=1));
    if not np.isfinite(d).all() or np.any(np.abs(d)<1e-14): raise ValueError('SimWild 返回退化单元')
    negative=d<0;tmp=tets[negative,1].copy();tets[negative,1]=tets[negative,2];tets[negative,2]=tmp
    used,inverse=np.unique(tets,return_inverse=True);points=points[used];tets=inverse.reshape((-1,4))
    event(progress='SimWild 已完成，正在返回材料标记四面体…')
    event(result={'points':points.tolist(),'tets':tets.tolist(),'materials':labels.tolist(),'surfaceMetrics':metrics,'report':{'tets':int(report['#t']),'maxEnergy':float(report['max_energy']),'runtime':float(report['time'])}})

try: main()
except BaseException as exc:
    event(error=str(exc) or type(exc).__name__)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
