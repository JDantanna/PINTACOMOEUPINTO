(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PintaCore = factory();
}(this, function () {
  'use strict';
  var KEY = 'pinta.presets.v1';
  function validate(p) {
    if (!p || typeof p.id !== 'string' || !p.id || p.id.length > 100) throw Error('Identificador inválido.');
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60) throw Error('Nome: use de 1 a 60 caracteres.');
    if (['brush', 'eraser', 'action'].indexOf(p.type) < 0) throw Error('Tipo inválido.');
    var icon=p.icon || 'auto';
    if(['auto','pen','eraser','star','circle','play'].indexOf(icon)<0) throw Error('Ícone inválido.');
    var result = {id:p.id, name:p.name.trim(), type:p.type, icon:icon};
    if (p.type === 'action') {
      ['action', 'set'].forEach(function(k) { if(typeof p[k] !== 'string' || !p[k].trim() || p[k].length > 120) throw Error('Informe ação e conjunto (até 120 caracteres).'); result[k] = p[k].trim(); });
    } else {
      [['size',1,5000],['opacity',0,100],['flow',0,100]].forEach(function(r) { if(typeof p[r[0]] !== 'number' || !isFinite(p[r[0]]) || p[r[0]] < r[1] || p[r[0]] > r[2]) throw Error('Valor inválido: '+r[0]); result[r[0]]=p[r[0]]; });
      if (typeof p.color !== 'string' || !/^#[a-f0-9]{6}$/i.test(p.color)) throw Error('Cor: use #RRGGBB.');
      result.color = p.color;
    }
    return result;
  }
  function defaults() { return [validate({id:'ink',name:'Traço fino',type:'brush',size:8,color:'#252735',opacity:100,flow:100}),validate({id:'shade',name:'Sombra suave',type:'brush',size:120,color:'#6962d8',opacity:35,flow:20}),validate({id:'erase',name:'Limpar',type:'eraser',size:40,color:'#000000',opacity:100,flow:100})]; }
  function decode(raw) {
    var data;
    try { data=JSON.parse(raw); } catch(e) { throw Error('Texto de backup inválido. Use um JSON gerado pelo painel.'); }
    if(!data || data.version !== 1 || !Array.isArray(data.presets) || data.presets.length > 500) throw Error('Arquivo de presets inválido ou versão incompatível.');
    var seen = {};
    return data.presets.map(function(p) { var v=validate(p); if(Object.prototype.hasOwnProperty.call(seen,v.id)) throw Error('Identificador duplicado.'); Object.defineProperty(seen,v.id,{value:true,enumerable:true}); return v; });
  }
  function encode(items) { var raw=JSON.stringify({version:1,presets:items}); decode(raw); return raw; }
  function Store(storage) { this.storage=storage; var raw=storage.getItem(KEY); this.items=raw === null ? defaults() : decode(raw); }
  Store.prototype.commit=function(items) { var raw=encode(items); this.storage.setItem(KEY,raw); this.items=decode(raw); };
  Store.prototype.save=function(p) { p=validate(p); var next=this.items.slice(), i=next.findIndex(function(x){return x.id===p.id;}); if(i<0) next.push(p); else next[i]=p; this.commit(next); };
  Store.prototype.remove=function(id) { this.commit(this.items.filter(function(p){return p.id!==id;})); };
  Store.prototype.move=function(id,delta) { var next=this.items.slice(),i=next.findIndex(function(p){return p.id===id;}),j=i+delta; if(i<0 || j<0 || j>=next.length) return; var p=next.splice(i,1)[0]; next.splice(j,0,p); this.commit(next); };
  function commands(input) {
    var p=validate(input);
    if(p.type==='action') return [{_obj:'play',_target:[{_ref:'action',_name:p.action},{_ref:'actionSet',_name:p.set}]}];
    var tool=p.type==='eraser'?'eraser':'paintbrushTool';
    var list=[{_obj:'select',_target:[{_ref:tool}]},{_obj:'set',_target:[{_ref:'brush',_enum:'ordinal',_value:'targetEnum'}],to:{_obj:'brush',diameter:{_unit:'pixelsUnit',_value:p.size}}},{_obj:'set',_target:[{_ref:tool}],to:{_obj:'null',opacity:{_unit:'percentUnit',_value:p.opacity},flow:{_unit:'percentUnit',_value:p.flow}}}];
    if(p.type==='brush') list.push({_obj:'set',_target:[{_ref:'color',_property:'foregroundColor'}],to:{_obj:'RGBColor',red:parseInt(p.color.slice(1,3),16),grain:parseInt(p.color.slice(3,5),16),blue:parseInt(p.color.slice(5,7),16)}});
    return list;
  }
  return {Store:Store,validate:validate,defaults:defaults,decode:decode,encode:encode,commands:commands,KEY:KEY};
}));
