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
 let received;vm.runInNewContext(script,{pintaApply:x=>{received=x;}});assert.equal(received.action,p.action);
 const bad=load({__adobe_cep__:{evalScript:(s,cb)=>cb('ERROR: ausente')}});await assert.rejects(()=>bad.apply(p),/ausente/);
});
