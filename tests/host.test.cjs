const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core=require('../src/core.js'),code=fs.readFileSync(require.resolve('../src/host.js'),'utf8');
function load(extra={}){const ctx={PintaCore:core,setTimeout,clearTimeout,...extra};vm.runInNewContext(code,ctx);return ctx.PintaHost;}
test('browser mode explicitly simulates',async()=>{const h=load();assert.equal(h.mode,'DEMONSTRAÇÃO');await h.apply(core.defaults()[0]);assert.equal(h.last.id,'ink');});
test('UXP executes inside modal scope sequentially and stops on descriptor error',async()=>{
 let modal=false,count=0,fail=false;
 const ps={app:{documents:[{}]},core:{executeAsModal:async fn=>{modal=true;try{await fn();}finally{modal=false;}}},action:{batchPlay:async cmds=>{assert.ok(modal);assert.equal(cmds.length,1);count++;return fail?[{_obj:'error',message:'Falhou'}]:[{_obj:'set'}];}}};
 const h=load({require:()=>ps});assert.equal(h.mode,'UXP');await h.apply(core.defaults()[0]);assert.equal(count,4);
 fail=true;await assert.rejects(()=>h.apply(core.defaults()[0]),/Falhou/);assert.equal(count,5);
 ps.app.documents=[];await assert.rejects(()=>h.apply(core.defaults()[0]),/documento/);assert.equal(count,5);
});
test('CEP bridge uses serialized data, propagates errors and handles quoted action names',async()=>{
 const p={id:'a',name:'Teste',type:'action',set:'Set',action:'x"); alert(1); //'};let script;
 const h=load({__adobe_cep__:{evalScript:(s,cb)=>{script=s;cb('OK');}}});await h.apply(p);
 let received;vm.runInNewContext(script,{pintaApply:x=>{received=x;}});assert.equal(received.preset.action,p.action);
 const bad=load({__adobe_cep__:{evalScript:(s,cb)=>cb('ERROR: ausente')}});await assert.rejects(()=>bad.apply(p),/ausente/);
});
test('UXP capture reads the active brush options and foreground color as a restorable shortcut',async()=>{
 const capturedOptions={_obj:'currentToolOptions',brush:{diameter:{_unit:'pixelsUnit',_value:37},hardness:82,spacing:14},opacity:{_unit:'percentUnit',_value:63},flow:{_unit:'percentUnit',_value:41},smoothing:28};
 const queries=[];let modal=false;
 const ps={app:{documents:[{}]},core:{executeAsModal:async fn=>{modal=true;try{return await fn();}finally{modal=false;}}},action:{batchPlay:async cmds=>{assert.ok(modal);const property=cmds[0]._target[0]._property;queries.push(property);if(property==='tool')return [{tool:{_enum:'paintbrushTool'}}];if(property==='currentToolOptions')return [{currentToolOptions:capturedOptions}];if(property==='foregroundColor')return [{foregroundColor:{red:231,grain:116,blue:60}}];throw Error('Unexpected descriptor');}}};
 const h=load({require:()=>ps}),p=await h.capture();
 assert.deepEqual(queries,['tool','currentToolOptions','foregroundColor']);assert.equal(p.type,'brush');assert.equal(p.size,37);assert.equal(p.opacity,63);assert.equal(p.flow,41);assert.equal(p.color,'#e7743c');assert.deepEqual(p.captured.options,capturedOptions);
 const cmds=core.commands(p);assert.deepEqual(cmds[1].to,capturedOptions);assert.equal(cmds[2].to.diameter._value,37);assert.equal(cmds[3].to.opacity._value,63);assert.equal(cmds[4].to.grain,116);
});
test('capture rejects another tool and refuses a second concurrent host operation',async()=>{
 let release,entered;const enteredPromise=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const ps={app:{documents:[{}]},core:{executeAsModal:async fn=>fn()},action:{batchPlay:async cmds=>{const property=cmds[0]._target[0]._property;if(property==='tool'){entered();await gate;return [{tool:{_enum:'paintbrushTool'}}];}if(property==='currentToolOptions')return [{currentToolOptions:{_obj:'currentToolOptions',brush:{diameter:20},opacity:100,flow:100}}];return [{foregroundColor:{red:0,grain:0,blue:0}}];}}};
 const h=load({require:()=>ps}),first=h.capture();await enteredPromise;await assert.rejects(()=>h.capture(),/operação atual/);release();await first;
 ps.action.batchPlay=async()=>[{tool:{_enum:'moveTool'}}];await assert.rejects(()=>h.capture(),/pincel ou a borracha/);
});

