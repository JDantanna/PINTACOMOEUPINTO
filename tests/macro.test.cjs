const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
test('macro snapshots survive storage reload; invalid nested macros cannot replace a library',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>raw=v},s=new core.Store(storage);
 const layer={id:'layer1',name:'Camada cor',type:'layer',layerName:'Cor',layerOpacity:35,blendMode:'color'};
 const style={id:'style1',name:'Sombra',type:'style',styleName:'Sombra suave'};
 s.save({id:'macro1',name:'Preparar pintura',type:'macro',steps:[layer,style,core.defaults()[0]]});
 layer.layerOpacity=100;
 const loaded=new core.Store(storage).items.find(p=>p.id==='macro1');assert.equal(loaded.steps[0].layerOpacity,35);
 assert.deepEqual(core.commands(loaded).slice(0,2).map(c=>c._obj),['make','applyStyle']);
 const before=raw;assert.throws(()=>s.save({...loaded,steps:[loaded]}),/Passo/);assert.equal(raw,before);
});
test('generic tool options persist and restore before painting; runtimes remain explicit',()=>{
 const p=core.validate({id:'tool1',name:'Carimbo',type:'tool',tool:'cloneStampTool',captured:{runtime:'UXP',options:{_obj:'currentToolOptions',aligned:true,opacity:42}}});
 const cmds=core.commands(p);assert.equal(cmds.length,2);assert.equal(cmds[1].to.aligned,true);
 assert.throws(()=>core.commands({...p,captured:{runtime:'CEP',stream:'ab'}}),/CEP/);
});
