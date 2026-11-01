const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
test('one click capture stores a ready icon in the active shelf and survives reload',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>raw=v},s=new core.Store(storage);
 const shelf=s.addShelf('Estudo'),p=s.capture({...core.defaults()[0],id:'captured1',captured:{runtime:'CEP',stream:'abcd'}});
 assert.equal(p.shelf,shelf);assert.equal(p.appearance,'icon');assert.match(p.name,/8 px/);
 const loaded=new core.Store(storage).items.find(item=>item.id==='captured1');assert.deepEqual(loaded,p);assert.equal(loaded.captured.stream,'abcd');
 s.undo();assert.ok(!s.items.some(item=>item.id==='captured1'));
});
test('capture write errors do not change library or discard existing buttons',()=>{
 const s=new core.Store({getItem:()=>null,setItem:()=>{throw Error('quota');}}),before=JSON.stringify(s.state);
 assert.throws(()=>s.capture({...core.defaults()[0],id:'new'}),/quota/);assert.equal(JSON.stringify(s.state),before);
});
test('captured native preset identity persists; captured size takes precedence over preserve-size preference',()=>{
 let raw=null;const store=new core.Store({getItem:()=>raw,setItem:(k,v)=>raw=v});
 const p=store.capture({...core.defaults()[0],id:'native1',nativePreset:true,presetName:'__PKP_native1',presetKind:'toolPreset',captured:{runtime:'UXP',options:{_obj:'currentToolOptions',brush:{diameter:8}}}});
 assert.equal(p.forceSize,true);const cmds=core.commands(p);assert.equal(cmds[1]._target[0]._name,'__PKP_native1');assert.equal(cmds[2].to.diameter._value,8);
 assert.equal(core.parse(raw).presets.find(x=>x.id==='native1').nativePreset,true);
 assert.throws(()=>core.validate({...p,presetName:'externo'}),/Preset nativo/);
});
