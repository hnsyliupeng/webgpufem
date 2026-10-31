"""Optional native backend regression, not proof that TPMS meshes are suitable."""
import json, os, subprocess, sys
from collections import Counter
import numpy as np
n=16;s=np.linspace(-1,1,n+1);z,y,x=np.meshgrid(s,s,s,indexing='ij')
fields=np.stack([np.sqrt((x-c)**2+y*y+z*z)-.4 for c in (-.35,0,.35)],axis=-1).astype('<f4')
opts={'n':n,'lengths':[2,2,2],'length':.2,'eps':.02,'iterations':3,'threads':1}
def run(options):
    p=subprocess.run([sys.executable,'wild-mesh.py',json.dumps(options)],input=fields.tobytes(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),timeout=120)
    events=[json.loads(line[7:]) for line in p.stdout.splitlines() if line.startswith(b'@event@')]
    return p,events
p,events=run(opts);assert p.returncode==0,(events,p.stderr.decode()[-1000:]);r=next(e['result'] for e in events if 'result' in e);v=np.array(r['points']);t=np.array(r['tets']);mat=np.array(r['materials']);assert set(mat)=={1,2,3};d=np.linalg.det(np.stack([v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]],v[t[:,3]]-v[t[:,0]]],axis=1));assert np.all(d>0)
faces={}; interfaces=Counter()
for tet,material in zip(t,mat):
    for ids in ((0,1,2),(0,1,3),(0,2,3),(1,2,3)):
        key=tuple(sorted(tet[list(ids)])); faces.setdefault(key,[]).append(material)
for owners in faces.values():
    assert len(owners)<=2
    if len(owners)==2 and owners[0]!=owners[1]: interfaces[tuple(sorted(owners))]+=1
assert interfaces[(1,2)] and interfaces[(2,3)],interfaces
# Compare union volume to high-resolution analytic midpoint integration.
m=96;a=-1+(np.arange(m)+.5)*2/m;zz,yy,xx=np.meshgrid(a,a,a,indexing='ij');inside=np.zeros_like(xx,dtype=bool)
for c in (-.35,0,.35): inside|=(xx-c)**2+yy**2+zz**2<.4**2
reference=inside.mean()*8;mesh=d.sum()/6;assert abs(mesh-reference)/reference<.12,(mesh,reference)
q,ev=run({**opts,'referenceVolumes':[5,5,5],'referenceN':48});assert q.returncode!=0;assert any('偏差过大' in e.get('error','') for e in ev);assert not any('SimWild 多区域嵌入' in e.get('progress','') for e in ev)
print('SimWild analytic: three tags, shared interfaces, positive tets, union volume, preflight rejection:',len(t),dict(interfaces),mesh,reference)
