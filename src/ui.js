(function(){
  'use strict';
  var core=window.PintaCore,host=window.PintaHost,store,editing=null,busy=false;
  function el(id){return document.getElementById(id);}
  function status(text,error){el('status').textContent=text;el('status').className=error?'error':'';}
  el('mode').textContent=host.mode;
  try{store=new core.Store(localStorage);}catch(e){status('Não foi possível ler os presets: '+e.message+' Os dados foram preservados. Corrija o armazenamento antes de recarregar.',true);el('add').disabled=true;return;}
  function actionButton(text,title,fn){var b=document.createElement('button');b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.onclick=function(){if(!busy)try{fn();}catch(e){status(e.message,true);}};return b;}
  function render(){
    var list=el('list');list.textContent='';
    var shown=store.items.filter(function(p){return el('filter').value==='all'||p.type===el('filter').value;});
    if(!shown.length){var empty=document.createElement('p');empty.textContent='Nenhum preset por aqui. Crie o primeiro.';list.appendChild(empty);}
    shown.forEach(function(p){
      var card=document.createElement('article');card.className='card';
      var run=actionButton('','Ativar '+p.name,async function(){
        busy=true;render();status('Aplicando '+p.name+'…');
        try{await host.apply(p);status(host.mode==='DEMONSTRAÇÃO'?'Simulação: '+p.name+'. Nenhum Photoshop conectado.':'Aplicado: '+p.name);}
        catch(e){status(e.message+' Confira a ferramenta: comandos anteriores podem ter sido aplicados.',true);}
        finally{busy=false;render();}
      });run.className='activate';run.disabled=busy;
      var glyph=document.createElement('span');glyph.className='glyph';var icons={pen:'✎',eraser:'▱',star:'★',circle:'●',play:'▶'};glyph.textContent=icons[p.icon] || (p.type==='brush'?'✎':p.type==='eraser'?'▱':'▶');
      if(p.type==='brush')glyph.style.borderLeft='3px solid '+p.color;
      var details=document.createElement('span');details.className='details';var name=document.createElement('strong');name.textContent=p.name;var meta=document.createElement('small');meta.textContent=p.type==='action'?p.set+' / '+p.action:p.size+' px · '+p.opacity+'% op. · '+p.flow+'% flow'+(p.type==='brush'?' · '+p.color:'');details.appendChild(name);details.appendChild(meta);run.appendChild(glyph);run.appendChild(details);card.appendChild(run);
      var controls=document.createElement('div');controls.className='controls';controls.appendChild(actionButton('Editar','Editar '+p.name,function(){open(p);}));
      [-1,1].forEach(function(delta){var b=actionButton(delta<0?'↑':'↓',delta<0?'Mover para cima':'Mover para baixo',function(){store.move(p.id,delta);render();});var index=store.items.indexOf(p);b.disabled=busy||(delta<0?index===0:index===store.items.length-1);controls.appendChild(b);});
      var del=actionButton('Excluir','Excluir '+p.name,function(){store.remove(p.id);if(editing===p.id)close();render();status('Preset excluído.');});del.className='delete';controls.appendChild(del);card.appendChild(controls);list.appendChild(card);
    });
  }
  function fields(){var action=el('type').value==='action';el('paintFields').hidden=action;el('actionFields').hidden=!action;['size','color','opacity','flow'].forEach(function(id){el(id).disabled=action;});['set','action'].forEach(function(id){el(id).disabled=!action;el(id).required=action;});el('colorLabel').hidden=el('type').value==='eraser';}
  function open(p){editing=p?p.id:null;el('form').reset();if(p)Object.keys(p).forEach(function(k){if(el(k))el(k).value=p[k];});el('editorTitle').textContent=p?'Editar preset':'Novo preset';el('editor').hidden=false;fields();el('name').focus();}
  function close(){el('editor').hidden=true;editing=null;}
  el('add').onclick=function(){open();};el('cancel').onclick=close;el('type').onchange=fields;el('filter').onchange=render;
  el('form').onsubmit=function(e){e.preventDefault();try{var p={id:editing||'p'+Date.now().toString(36)+Math.random().toString(36).slice(2),name:el('name').value,type:el('type').value,icon:el('icon').value,size:Number(el('size').value),color:el('color').value,opacity:Number(el('opacity').value),flow:Number(el('flow').value),set:el('set').value,action:el('action').value};store.save(p);close();render();status('Preset salvo neste painel.');}catch(err){status(err.message,true);}};
  el('export').onclick=function(){el('backupText').value=core.encode(store.items);status('Backup pronto. Copie o texto e salve em um arquivo.');};
  el('import').onclick=function(){try{store.commit(core.decode(el('backupText').value));close();render();status('Backup importado.');}catch(e){status(e.message,true);}};
  render();if(host.mode==='DEMONSTRAÇÃO')status('Modo demonstração: os botões simulam a ativação.');
}());
