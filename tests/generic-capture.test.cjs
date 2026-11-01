const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('../src/core');
for(const tool of ['eraserTool','eyedropperTool','lassoTool','cloneStampTool'])test('CEP captures and restores '+tool+' without brush fields or native presets',()=>{
 let current=tool,options={mode:'custom',sample:3,pressure:true},sets=0;
 function Ref(){}Ref.prototype.putName=function(){};Ref.prototype.putProperty=function(){};Ref.prototype.putEnumerated=function(){};Ref.prototype.putClass=function(c){this.tool=c;};
 function Desc(data){Object.assign(this,data);}Desc.prototype.putString=function(k,v){this[k]=v;};Desc.prototype.toStream=function(){return JSON.stringify(this);};Desc.prototype.fromStream=function(raw){Object.assign(this,JSON.parse(raw));};Desc.prototype.putReference=function(k,v){this[k]=v;};Desc.prototype.putObject=function(k,c,v){assert.equal(c,'target');this[k]=v;};
 const app={documents:[{}]};Object.defineProperty(app,'currentTool',{get:()=>current,set:v=>{current=v;}});
 const ctx={File:()=>({}),$:{fileName:'host/cep.jsx'},app,ActionReference:Ref,ActionDescriptor:Desc,stringIDToTypeID:x=>x,typeIDToStringID:x=>x,DialogModes:{NO:0},executeActionGet:()=>({getEnumerationType:()=>current,getObjectValue:()=>new Desc(options)}),executeAction:(event,d)=>{if(event==='select'){current=d.null.tool;return;}if(event==='make')throw Error('Native preset unavailable');assert.equal(event,'set');assert.equal(d.null.tool,tool);options=JSON.parse(JSON.stringify(d.to));sets++;}};
 vm.runInNewContext(fs.readFileSync('host/cep.jsx','utf8'),ctx);
 const capture=core.validate(JSON.parse(ctx.pintaCapture()));assert.equal(capture.type,'tool');assert.equal(capture.tool,tool);assert.equal(!!capture.nativePreset,false);
 const store=new core.Store({getItem:()=>null,setItem:()=>{}});const saved=store.capture(capture);options={mode:'changed'};current='paintbrushTool';
 assert.equal(ctx.pintaApply({preset:saved}),'OK');assert.equal(current,tool);assert.deepEqual(options,{mode:'custom',sample:3,pressure:true});assert.equal(sets,1);
});
test('messages expire and older timers are cancelled; click dismisses',()=>{
 const source=fs.readFileSync('src/ui.js','utf8'),snippet=source.slice(source.indexOf('var messageTimer;'),source.indexOf('  function attempt'));
 const status={},timers=new Map();let id=0;const ctx={el:()=>status,setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:i=>timers.delete(i)};
 vm.runInNewContext(snippet,ctx);ctx.message('falha',true);assert.equal(timers.get(id).ms,10000);ctx.message('salvo');assert.equal(timers.size,1);timers.get(id).fn();assert.equal(status.textContent,'');ctx.message('erro',true);status.onclick();assert.equal(status.textContent,'');
});
