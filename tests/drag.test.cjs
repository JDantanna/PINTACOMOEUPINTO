const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../src/core.js');
function memory(){let raw=null;return {getItem:()=>raw,setItem:(k,v)=>raw=v};}
test('drop reorders within a shelf and persists sizes and captured resources across reload',()=>{
 const storage=memory(),s=new core.Store(storage),other=s.addShelf('Outra');
 s.save({...core.defaults()[0],id:'other',shelf:other});
 s.selectShelf('main');const before=s.items.find(p=>p.id==='erase');s.reorder('erase','ink');
 assert.deepEqual(s.items.filter(p=>p.shelf==='main').map(p=>p.id),['erase','ink','shade']);
 assert.deepEqual(s.items.find(p=>p.id==='erase'),before);
 s.reorder('erase',null);assert.deepEqual(new core.Store(storage).items.filter(p=>p.shelf==='main').map(p=>p.id),['ink','shade','erase']);
 const snapshot=s.export();assert.throws(()=>s.reorder('ink','other'),/Destino/);assert.equal(s.export(),snapshot);
 s.save({...s.items.find(p=>p.id==='ink'),width:144,height:96});assert.equal(new core.Store(storage).items.find(p=>p.id==='ink').width,144);
 s.undo();assert.notEqual(s.items.find(p=>p.id==='ink').width,144);
});
test('failed drag persistence is atomic and repeated drops in place do not add undo entries',()=>{
 const storage=memory(),s=new core.Store(storage);s.reorder('ink','shade');assert.equal(s.history.length,0);
 const raw=s.export();storage.setItem=()=>{throw Error('quota');};assert.throws(()=>s.reorder('erase','ink'),/quota/);assert.equal(s.export(),raw);assert.equal(s.history.length,0);
});
