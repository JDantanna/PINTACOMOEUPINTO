(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PintaCore = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  // Keep the original key so an upgrade never abandons an existing library.
  var KEY = 'pinta.presets.v1';
  var TOOLS = ['paintbrushTool','eraser','pencilTool','cloneStampTool','smudgeTool','blurTool','dodgeTool','burnInTool','eyedropperTool','moveTool','lassoTool'];
  var MENUS = ['newLayer','duplicateLayer','deselect','mergeVisible'];
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,10); }
  function text(v,label,max,empty) {
    if(typeof v!=='string'||(!empty&&!v.trim())||v.length>max)throw Error(label+': texto inválido.');
    return v.trim();
  }
  function number(v,min,max,label) {
    if(typeof v!=='number'||!isFinite(v)||v<min||v>max)throw Error('Valor inválido: '+label);
    return v;
  }
  function color(v) { if(typeof v!=='string'||!/^#[a-f\d]{6}$/i.test(v))throw Error('Cor: use #RRGGBB.');return v; }
  function snap(v) { return Math.round(v/8)*8; }
  function descriptor(value) {
    var count=0;
    function walk(v,depth) {
      if(++count>12000||depth>32)throw Error('Captura de ferramenta muito complexa.');
      if(v===null||typeof v==='boolean'||typeof v==='string')return v;
      if(typeof v==='number'&&isFinite(v))return v;
      if(Array.isArray(v))return v.map(function(x){return walk(x,depth+1);});
      if(!v||typeof v!=='object')throw Error('Captura inválida.');
      var result={};
      Object.keys(v).forEach(function(k){
        if(['__proto__','constructor','prototype','_target','_path'].indexOf(k)>=0)throw Error('Propriedade inválida na captura.');
        result[k]=walk(v[k],depth+1);
      });
      return result;
    }
    if(!value||value._obj!=='currentToolOptions'||JSON.stringify(value).length>200000)throw Error('Opções capturadas inválidas.');
    return walk(value,0);
  }
  function validate(p) {
    if(!p||typeof p!=='object')throw Error('Botão inválido.');
    var r={id:text(p.id,'Identificador',100),name:text(p.name,'Nome',60),type:p.type};
    if(['brush','eraser','action','tool','menu','label'].indexOf(p.type)<0)throw Error('Tipo inválido.');
    r.icon=p.icon||'auto';
    if(['auto','pen','eraser','star','circle','play'].indexOf(r.icon)<0)throw Error('Ícone inválido.');
    r.shelf=text(p.shelf===undefined?'main':p.shelf,'Aba',100);
    r.x=number(p.x===undefined?0:p.x,0,4096,'posição X');
    r.y=number(p.y===undefined?0:p.y,0,8192,'posição Y');
    r.width=number(p.width===undefined?104:p.width,48,640,'largura');
    r.height=number(p.height===undefined?64:p.height,24,480,'altura');
    r.background=color(p.background||(p.type==='action'?'#76603c':p.type==='eraser'?'#485a65':'#454654'));
    r.appearance=p.appearance||'icon';
    if(['text','icon','stroke','image'].indexOf(r.appearance)<0)throw Error('Aparência inválida.');
    r.image=p.image||'';
    if(r.image&&(typeof r.image!=='string'||r.image.length>350000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(r.image)))throw Error('Miniatura: use PNG, JPEG ou WebP de até 250 KB.');
    if(p.type==='action'){r.action=text(p.action,'Ação',120);r.set=text(p.set,'Conjunto',120);}
    else if(p.type==='tool'){if(TOOLS.indexOf(p.tool)<0)throw Error('Ferramenta inválida.');r.tool=p.tool;}
    else if(p.type==='menu'){if(MENUS.indexOf(p.command)<0)throw Error('Comando inválido.');r.command=p.command;}
    else if(p.type==='brush'||p.type==='eraser'){
      r.size=number(p.size,1,5000,'tamanho');r.opacity=number(p.opacity,0,100,'opacidade');r.flow=number(p.flow,0,100,'flow');r.color=color(p.color);
      r.forceSize=p.forceSize===true;
      r.presetName=text(p.presetName||'','Preset do Photoshop',160,true);r.presetKind=p.presetKind||'brush';
      if(['brush','toolPreset'].indexOf(r.presetKind)<0)throw Error('Tipo de preset inválido.');
      if(p.captured){
        if(p.captured.runtime==='UXP')r.captured={runtime:'UXP',options:descriptor(p.captured.options)};
        else if(p.captured.runtime==='CEP'&&typeof p.captured.stream==='string'&&/^(?:[a-f\d]{2}){1,200000}$/i.test(p.captured.stream))r.captured={runtime:'CEP',stream:p.captured.stream};
        else throw Error('Captura de ferramenta inválida.');
      }
    }
    return r;
  }
  function defaults(){
    return [validate({id:'ink',name:'Traço fino',type:'brush',size:8,color:'#252735',opacity:100,flow:100,x:0,y:0,appearance:'stroke'}),validate({id:'shade',name:'Sombra suave',type:'brush',size:120,color:'#6962d8',opacity:35,flow:20,x:112,y:0,appearance:'stroke'}),validate({id:'erase',name:'Limpar',type:'eraser',size:40,color:'#000000',opacity:100,flow:100,x:0,y:72})];
  }
  function base(items){return {version:2,shelves:[{id:'main',name:'Principal'}],activeShelf:'main',settings:{showNames:true,preserveSize:false},presets:items};}
  function validateDocument(data){
    if(!data||data.version!==2||!Array.isArray(data.presets)||data.presets.length>500||!Array.isArray(data.shelves)||!data.shelves.length||data.shelves.length>40)throw Error('Biblioteca inválida ou versão incompatível.');
    var shelfIds=Object.create(null),presetIds=Object.create(null);
    var shelves=data.shelves.map(function(s){if(!s)throw Error('Aba inválida.');var id=text(s.id,'Identificador da aba',100);if(shelfIds[id])throw Error('Aba duplicada.');shelfIds[id]=true;return {id:id,name:text(s.name,'Nome da aba',40)};});
    var presets=data.presets.map(function(p){var v=validate(p);if(presetIds[v.id])throw Error('Identificador duplicado.');presetIds[v.id]=true;if(!shelfIds[v.shelf])throw Error('Botão associado a uma aba inexistente.');return v;});
    if(!shelfIds[data.activeShelf])throw Error('Aba ativa inexistente.');
    return {version:2,shelves:shelves,activeShelf:data.activeShelf,settings:{showNames:!(data.settings&&data.settings.showNames===false),preserveSize:!!(data.settings&&data.settings.preserveSize===true)},presets:presets};
  }
  function parse(raw){
    var data;
    if(typeof raw!=='string'||raw.length>7000000)throw Error('Backup muito grande ou inválido.');
    try{data=JSON.parse(raw);}catch(e){throw Error('Texto de backup inválido. Use um JSON gerado pelo painel.');}
    if(data&&data.version===1&&Array.isArray(data.presets)){
      data=base(data.presets.map(function(p,i){var v=Object.assign({},p);v.shelf='main';v.x=(i%2)*112;v.y=Math.floor(i/2)*72;return v;}));
    }
    return validateDocument(data);
  }
  function encodeDocument(data){return JSON.stringify(validateDocument(data));}
  function decode(raw){return parse(raw).presets;}
  function encode(items){return encodeDocument(base(items));}
  function Store(storage){this.storage=storage;this.history=[];var raw=storage.getItem(KEY);this.state=raw===null?base(defaults()):parse(raw);}
  Object.defineProperty(Store.prototype,'items',{get:function(){return this.state.presets;}});
  Store.prototype.write=function(data,undoable){
    var raw=encodeDocument(data),next=parse(raw);this.storage.setItem(KEY,raw);
    if(undoable!==false){this.history.push(encodeDocument(this.state));if(this.history.length>20)this.history.shift();}
    this.state=next;
  };
  Store.prototype.commit=function(items){this.write(Object.assign({},this.state,{presets:items}));};
  Store.prototype.save=function(p){p=validate(p);var next=this.items.slice(),i=next.findIndex(function(x){return x.id===p.id;});if(i<0)next.push(p);else next[i]=p;this.commit(next);};
  Store.prototype.remove=function(id){this.commit(this.items.filter(function(p){return p.id!==id;}));};
  Store.prototype.move=function(id,delta){var next=this.items.slice(),i=next.findIndex(function(p){return p.id===id;}),j=i+delta;if(i<0||j<0||j>=next.length)return;next.splice(j,0,next.splice(i,1)[0]);this.commit(next);};
  Store.prototype.undo=function(){if(!this.history.length)return;this.write(parse(this.history[this.history.length-1]),false);this.history.pop();};
  Store.prototype.export=function(){return encodeDocument(this.state);};
  Store.prototype.import=function(raw){this.write(parse(raw));};
  Store.prototype.selectShelf=function(id){this.write(Object.assign({},this.state,{activeShelf:id}),false);};
  Store.prototype.addShelf=function(name){var id=uid();this.write(Object.assign({},this.state,{shelves:this.state.shelves.concat({id:id,name:name}),activeShelf:id}));return id;};
  Store.prototype.renameShelf=function(id,name){this.write(Object.assign({},this.state,{shelves:this.state.shelves.map(function(s){return s.id===id?{id:id,name:name}:s;})}));};
  Store.prototype.removeShelf=function(id){
    if(this.state.shelves.length===1)throw Error('Mantenha pelo menos uma aba.');
    var shelves=this.state.shelves.filter(function(s){return s.id!==id;});
    if(shelves.length===this.state.shelves.length)throw Error('Aba inexistente.');
    this.write(Object.assign({},this.state,{shelves:shelves,activeShelf:shelves[0].id,presets:this.items.map(function(p){return p.shelf===id?Object.assign({},p,{shelf:shelves[0].id}):p;})}));
  };
  Store.prototype.settings=function(settings){this.write(Object.assign({},this.state,{settings:Object.assign({},this.state.settings,settings)}));};
  Store.prototype.layout=function(ids,dx,dy){
    var selected=this.items.filter(function(p){return ids.indexOf(p.id)>=0;});if(!selected.length)return;
    number(dx,-8192,8192,'deslocamento X');number(dy,-16384,16384,'deslocamento Y');
    dx=Math.max(-Math.min.apply(null,selected.map(function(p){return p.x;})),Math.min(4096-Math.max.apply(null,selected.map(function(p){return p.x;})),snap(dx)));
    dy=Math.max(-Math.min.apply(null,selected.map(function(p){return p.y;})),Math.min(8192-Math.max.apply(null,selected.map(function(p){return p.y;})),snap(dy)));
    this.commit(this.items.map(function(p){return ids.indexOf(p.id)>=0?Object.assign({},p,{x:p.x+dx,y:p.y+dy}):p;}));
  };
  Store.prototype.transfer=function(ids,shelf,copy){var additions=[];var next=this.items.map(function(p){if(ids.indexOf(p.id)<0)return p;if(copy){additions.push(Object.assign({},p,{id:uid(),shelf:shelf}));return p;}return Object.assign({},p,{shelf:shelf});});this.commit(next.concat(additions));};
  Store.prototype.align=function(ids,axis){if(['x','y'].indexOf(axis)<0)throw Error('Alinhamento inválido.');var selected=this.items.filter(function(p){return ids.indexOf(p.id)>=0;});if(!selected.length)return;var position=Math.min.apply(null,selected.map(function(p){return p[axis];}));this.commit(this.items.map(function(p){if(ids.indexOf(p.id)<0)return p;var next=Object.assign({},p);next[axis]=position;return next;}));};
  function commands(input,options){
    var p=validate(input);options=options||{};
    if(p.type==='label')return [];
    if(p.type==='action')return [{_obj:'play',_target:[{_ref:'action',_name:p.action},{_ref:'actionSet',_name:p.set}]}];
    if(p.type==='menu'){
      if(p.command==='newLayer')return [{_obj:'make',_target:[{_ref:'layer'}]}];
      if(p.command==='duplicateLayer')return [{_obj:'duplicate',_target:[{_ref:'layer',_enum:'ordinal',_value:'targetEnum'}]}];
      if(p.command==='deselect')return [{_obj:'set',_target:[{_ref:'channel',_property:'selection'}],to:{_enum:'ordinal',_value:'none'}}];
      return [{_obj:'mergeVisible'}];
    }
    var tool=p.type==='tool'?p.tool:p.type==='eraser'?'eraser':'paintbrushTool';
    var list=[{_obj:'select',_target:[{_ref:tool}]}];if(p.type==='tool')return list;
    if(p.presetName)list.push({_obj:'select',_target:[{_ref:p.presetKind,_name:p.presetName}]});
    if(p.captured){if(p.captured.runtime!=='UXP')throw Error('Esta captura é CEP. Capture novamente no Photoshop com UXP.');list.push({_obj:'set',_target:[{_ref:tool}],to:p.captured.options});}
    list.push({_obj:'set',_target:[{_ref:'brush',_enum:'ordinal',_value:'targetEnum'}],to:{_obj:'brush',diameter:{_unit:'pixelsUnit',_value:options.preservedSize===undefined?p.size:options.preservedSize}}});
    list.push({_obj:'set',_target:[{_ref:tool}],to:{_obj:'null',opacity:{_unit:'percentUnit',_value:p.opacity},flow:{_unit:'percentUnit',_value:p.flow}}});
    if(p.type==='brush')list.push({_obj:'set',_target:[{_ref:'color',_property:'foregroundColor'}],to:{_obj:'RGBColor',red:parseInt(p.color.slice(1,3),16),grain:parseInt(p.color.slice(3,5),16),blue:parseInt(p.color.slice(5,7),16)}});
    return list;
  }
  return {Store:Store,validate:validate,defaults:defaults,decode:decode,encode:encode,parse:parse,encodeDocument:encodeDocument,commands:commands,KEY:KEY,uid:uid,snap:snap,TOOLS:TOOLS,MENUS:MENUS};
}));
