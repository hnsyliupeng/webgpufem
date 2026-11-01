// A real App model exposing a numerically ambiguous box cut must fail closed.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await b.newPage({viewport:{width:1440,height:1000}});await p.goto(process.env.TPMS_URL||'http://127.0.0.1:8001/');
  for(const preset of ['1','2']){
   await p.locator('#preset').selectOption(preset);await p.locator('#cgalSize').fill('8');await p.locator('#cgalEps').fill('.2');await p.locator('#cgalOptTime').fill('0');await p.locator('#cgalRatio').fill('2');await p.locator('#cgalExude').uncheck();await p.locator('#cgalPeriodRun').click();
   await p.waitForFunction(()=>!document.querySelector('#cgalPeriodRun').disabled,null,{timeout:180000});
   const text=await p.locator('#cgalSizingInfo').innerText();console.log(`PRESET ${preset}:`,text);assert.match(text,/周期单胞未完成：有限盒共节点裁剪失败/);
   assert.match(await p.locator('#cgalPeriodicHistory').innerText(),/未完成/);assert.equal(await p.locator('#cutTetExport').isDisabled(),true);
   await p.locator('#cutTetPanel').screenshot({path:`screenshots/cgal-box-clip-${preset}.png`});
  }
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
