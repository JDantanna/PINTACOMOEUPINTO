const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
function memory(initial){const data=new Map(initial?[[core.KEY,initial]]:[]);return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};}
test('v1 library migrates positions without dropping settings or replacing the old key',()=>{
 const old={version:1,presets:[{id:'legacy',name:'Antigo',type:'brush',size:11,color:'#112233',opacity:42,flow:23}]};
 const disk=memory(JSON.stringify(old)),s=new core.Store(disk);assert.equal(s.items[0].size,11);assert.equal(s.items[0].shelf,'main');assert.equal(s.state.version,2);
 assert.equal(JSON.parse(disk.getItem(core.KEY)).version,1); // Read-only migration until first write.
 s.save({...s.items[0],width:160});assert.equal(JSON.parse(disk.getItem(core.KEY)).version,2);assert.equal(new core.Store(disk).items[0].width,160);
});
test('shelves, transfer, copies, deletion and undo preserve button data across reload',()=>{
 const disk=memory(),s=new core.Store(disk),other=s.addShelf('Pintura');
 s.transfer(['ink'],other,true);assert.equal(s.items.length,4);const copy=s.items.find(p=>p.shelf===other);assert.notEqual(copy.id,'ink');
 s.transfer(['shade'],other,false);s.renameShelf(other,'Acabamento');s.selectShelf(other);
 assert.equal(new core.Store(disk).state.shelves[1].name,'Acabamento');
 s.removeShelf(other);assert.equal(s.items.length,4);assert.ok(s.items.every(p=>p.shelf==='main'));
 s.undo();assert.equal(s.state.shelves.length,2);assert.equal(s.items.find(p=>p.id==='shade').shelf,other);
 s.removeShelf(other);assert.throws(()=>s.removeShelf('main'),/pelo menos/);
});
test('group movement snaps to grid, clamps as a group, aligns and persists resize',()=>{
 const s=new core.Store(memory());s.layout(['ink','shade'],-80,19);assert.equal(s.items[0].x,0);assert.equal(s.items[1].x,112);assert.equal(s.items[0].y,16);
 s.layout(['ink','shade'],17,0);assert.equal(s.items[0].x,16);assert.equal(s.items[1].x,128);
 s.align(['ink','shade'],'x');assert.equal(s.items[1].x,16);
 s.save({...s.items[0],width:192,height:96});assert.equal(core.parse(s.export()).presets[0].width,192);
 assert.throws(()=>s.layout(['ink'],NaN,0));assert.throws(()=>s.save({...s.items[0],width:1}));
});
test('v2 backup round trips images, captures, layout and preferences; invalid import is atomic',()=>{
 const s=new core.Store(memory()),image='data:image/png;base64,aGVsbG8=';
 const options={_obj:'currentToolOptions',brush:{_obj:'computedBrush',diameter:{_unit:'pixelsUnit',_value:37}},flow:23,opacity:42};
 s.save({...s.items[0],image,appearance:'image',presetName:'Meu pincel',captured:{runtime:'UXP',options}});s.settings({showNames:false,preserveSize:true});
 const target=new core.Store(memory());target.import(s.export());assert.deepEqual(target.state,s.state);
 const before=target.export();assert.throws(()=>target.import('{'));assert.equal(target.export(),before);
 const bad=JSON.parse(before);bad.presets[0].shelf='missing';assert.throws(()=>target.import(JSON.stringify(bad)));assert.equal(target.export(),before);
 assert.throws(()=>core.validate({...s.items[0],image:'data:image/svg+xml;base64,PHN2Zz4='}));
 assert.throws(()=>core.validate({...s.items[0],captured:{runtime:'UXP',options:{_obj:'delete'}}}));
 assert.throws(()=>core.parse('{"version":99,"presets":[]}'));
});
test('failed storage writes leave undo history and active shelf unchanged',()=>{
 const disk=memory(),s=new core.Store(disk);s.save({...s.items[0],name:'Antes'});const raw=s.export(),history=s.history.length;
 disk.setItem=()=>{throw Error('quota');};assert.throws(()=>s.addShelf('Não salvar'));assert.equal(s.export(),raw);assert.equal(s.history.length,history);
 assert.throws(()=>s.undo());assert.equal(s.history.length,history);
});
test('named preset loads before captured options and explicit overrides; preserve size wins',()=>{
 const p={...core.defaults()[0],presetName:'Pincel 1',presetKind:'toolPreset',captured:{runtime:'UXP',options:{_obj:'currentToolOptions',opacity:88}}};
 const cmds=core.commands(p,{preservedSize:73});assert.equal(cmds[1]._target[0]._ref,'toolPreset');assert.equal(cmds[1]._target[0]._name,'Pincel 1');assert.equal(cmds[2].to.opacity,88);assert.equal(cmds[3].to.diameter._value,73);
 assert.throws(()=>core.commands({...p,captured:{runtime:'CEP',stream:'00'}}),/CEP/);
});
test('labels are inert; tools and menu commands have a restricted vocabulary',()=>{
 const p={id:'x',name:'Grupo',type:'label'};assert.deepEqual(core.commands(p),[]);
 assert.equal(core.commands({...p,type:'tool',tool:'moveTool'})[0]._target[0]._ref,'moveTool');
 assert.equal(core.commands({...p,type:'menu',command:'newLayer'})[0]._obj,'make');
 assert.throws(()=>core.commands({...p,type:'menu',command:'deleteEverything'}));
});
test('core remains available on window in runtimes that also provide CommonJS',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),ctx={window:{},module:{exports:{}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/core.js'),'utf8'),ctx);assert.equal(ctx.window.PintaCore,ctx.module.exports);assert.equal(typeof ctx.window.PintaCore.Store,'function');
});
