const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
function storage(){const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};}
test('CRUD, reorder and persistence across sessions, including empty list',()=>{
 const disk=storage(),s=new core.Store(disk),p={...core.defaults()[0],id:'custom',name:'Novo'};
 s.save(p);assert.equal(s.items.length,4);s.save({...p,name:'Editado',icon:'star'});assert.equal(s.items.length,4);assert.equal(s.items[3].icon,'star');
 s.move('custom',-1);assert.equal(s.items[2].name,'Editado');assert.deepEqual(new core.Store(disk).items,s.items);
 s.items.slice().forEach(p=>s.remove(p.id));assert.deepEqual(new core.Store(disk).items,[]);
});
test('invalid input, corrupt backups, duplicate IDs and unsupported versions are rejected',()=>{
 for(const patch of [{size:0},{size:Infinity},{opacity:101},{flow:-1},{color:'red'},{name:' '},{type:'script'},{icon:'unknown'}]) assert.throws(()=>core.validate({...core.defaults()[0],...patch}));
 assert.throws(()=>core.decode('{'));assert.throws(()=>core.decode('{"version":2,"presets":[]}'));
 assert.throws(()=>core.encode([core.defaults()[0],core.defaults()[0]]));
 assert.throws(()=>core.validate({id:'a',type:'action',name:'Action',set:' ',action:'test'}));
 assert.deepEqual(core.decode(core.encode(core.defaults())),core.defaults());
});
test('storage write failure leaves current state untouched; corrupt storage is preserved',()=>{
 const disk=storage(),s=new core.Store(disk),before=core.encode(s.items);disk.setItem=()=>{throw Error('quota');};
 assert.throws(()=>s.remove('ink'));assert.equal(core.encode(s.items),before);
 const bad={getItem:()=>'{bad',setItem:()=>assert.fail('must not overwrite corrupt data')};assert.throws(()=>new core.Store(bad));
});
test('descriptors select correct tools, units, RGB and installed actions',()=>{
 const b=core.commands(core.defaults()[0]);assert.equal(b[0]._target[0]._ref,'paintbrushTool');assert.equal(b[1].to.diameter._value,8);assert.equal(b[2].to.flow._value,100);assert.deepEqual(b[3].to,{_obj:'RGBColor',red:37,grain:39,blue:53});
 const e=core.commands(core.defaults()[2]);assert.equal(e[0]._target[0]._ref,'eraser');assert.equal(e.length,3);
 assert.deepEqual(core.commands({id:'a',name:'Rodar',type:'action',set:'Meu conjunto',action:'Ação "1"'})[0]._target,[{_ref:'action',_name:'Ação "1"'},{_ref:'actionSet',_name:'Meu conjunto'}]);
});
