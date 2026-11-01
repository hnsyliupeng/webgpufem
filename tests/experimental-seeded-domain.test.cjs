const {spawnSync}=require('node:child_process'), fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const root=process.env.CGAL_ROOT;
if(!root||!fs.existsSync(root))throw Error('Set CGAL_ROOT to the CGAL source tree for this optional test');
let includes=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(root,d.name,'include')).filter(p=>fs.existsSync(p)).map(p=>'-I'+p);
if(process.env.BOOST_INCLUDE)includes.push('-I'+process.env.BOOST_INCLUDE);
const exe=path.join(os.tmpdir(),`tpms-cgal-seeded-test-${process.pid}`);
try{
 let c=spawnSync(process.env.CXX||'g++',['-std=c++17','-O1','-DCGAL_NO_CORE=1','-DCGAL_DISABLE_GMP=1',...includes,'tests/experimental-seeded-domain.test.cpp','-lpthread','-ldl','-lm','-o',exe],{encoding:'utf8'});
 if(c.status!==0)throw Error(c.stderr||String(c.error));
 let r=spawnSync(exe,[],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||String(r.error));process.stdout.write(r.stdout);
}finally{fs.rmSync(exe,{force:true})}
