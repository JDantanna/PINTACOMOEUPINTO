const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js'),fs=require('node:fs'),vm=require('node:vm');
test('tool identifiers accept eraser and tools outside the former shortlist without executable input',()=>{
 const eraser=core.commands({...core.defaults()[2]})[0];assert.equal(eraser._target[0]._ref,'eraserTool');
 const p=core.validate({id:'heal',name:'Correção',type:'tool',tool:'spotHealingBrushTool',captured:{runtime:'CEP',stream:'abcd'}});
 assert.equal(p.tool,'spotHealingBrushTool');assert.throws(()=>core.validate({...p,tool:'tool);alert(1)'}),/Ferramenta/);
});
test('free coordinates and lock persist, deletion is reversible without changing snapshots',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>raw=v},s=new core.Store(storage),p=s.items[0];
 s.settings({locked:true});s.save({...p,x:712,y:536,width:88});const r=new core.Store(storage);assert.equal(r.state.settings.locked,true);assert.equal(r.items[0].x,712);
 const saved=r.items[0];r.remove(saved.id);assert.ok(!r.items.some(p=>p.id===saved.id));r.undo();assert.deepEqual(r.items.find(p=>p.id===saved.id),saved);
});
test('global shortcut exports a standalone Photoshop command and falls back to user folder on denied installation',()=>{
 const source=fs.readFileSync('host/cep.jsx','utf8'),written={},called=[];
 function File(path){return {fsName:path,encoding:'',open:mode=>mode==='r'||!path.startsWith('C:/PS/Presets/Scripts'),read:()=>source,write:text=>{written[path]=text;},close:()=>{}};}
 function Folder(path){return {fsName:path,exists:true,create:()=>true};}Folder.myDocuments={fsName:'C:/Documents'};
 const ctx={File,Folder,$:{fileName:'host/cep.jsx'},app:{path:{fsName:'C:/PS'},documents:[{}],doAction:(a,s)=>called.push([a,s])},alert:text=>{throw Error(text);}};
 vm.runInNewContext(source,ctx);
 const p={id:'act1',name:'Minha ação',type:'action',set:'Conjunto',action:'Teste "literal"'};
 const result=JSON.parse(ctx.pintaShortcut({preset:p}));assert.equal(result.installed,false);assert.equal(result.path,'C:/Documents/PKP-Atalhos/PKP_act1.jsx');
 vm.runInNewContext(written[result.path],ctx);assert.deepEqual(called,[[p.action,p.set]]);
 assert.match(ctx.pintaShortcut({preset:{...p,id:'../../bad'}}),/^ERROR:/);
});
