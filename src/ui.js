(function(){
  'use strict';
  var core=window.PintaCore,host=window.PintaHost,store,draft=null,selected=[],editing=false,busy=false,activeId=null,gesture=null,suppressClick=0;
  function el(id){return document.getElementById(id);}
  function applyCepTheme(){
    if(!window.__adobe_cep__)return;
    try{
      var env=JSON.parse(window.__adobe_cep__.getHostEnvironment()),skin=env&&env.appSkinInfo,color=skin&&skin.panelBackgroundColor&&skin.panelBackgroundColor.color;
      if(!color)return;
      function hex(n){return ('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);}
      function shade(delta){return '#'+hex(color.red+delta)+hex(color.green+delta)+hex(color.blue+delta);}
      var rootStyle=document.documentElement.style;
      rootStyle.setProperty('--panel-bg',shade(0));rootStyle.setProperty('--panel-border',shade(-30));rootStyle.setProperty('--control-bg',shade(12));
      rootStyle.setProperty('--panel-text',color.red>145?'#202020':'#f0f0f0');rootStyle.setProperty('--panel-secondary',color.red>145?'#555':'#b5b5b5');
      if(skin.baseFontSize)rootStyle.setProperty('--font-size',skin.baseFontSize+'px');
      if(skin.baseFontFamily)rootStyle.setProperty('font-family','"'+skin.baseFontFamily+'",Arial,sans-serif');
    }catch(e){/* Keep the Photoshop-matched fallback if CEP skin data is unavailable. */}
  }
  function message(text,error){el('status').textContent=text;el('status').className=error?'error':'';}
  function attempt(fn){if(busy)return;try{fn();}catch(e){message(e.message,true);render();}}
  function shelves(select,value){
    select.textContent='';
    store.state.shelves.forEach(function(s){var option=document.createElement('option');option.value=s.id;option.textContent=s.name;select.appendChild(option);});
    select.value=value;
  }
  function find(id){return store.items.find(function(p){return p.id===id;});}
  function currentShelf(){return store.state.activeShelf;}
  function setBusy(value){busy=value;el('app').className=(editing?'editing ':'')+(busy?'busy':'');['add','capture','editMode','manageTabs','undo','library'].forEach(function(id){el(id).disabled=value||(id==='undo'&&!store.history.length);});}
  function nextPosition(){var items=store.items.filter(function(p){return p.shelf===currentShelf();});var bottom=0;items.forEach(function(p){bottom=Math.max(bottom,p.y+p.height+8);});return {x:0,y:Math.min(8192,core.snap(bottom))};}
  function makeButton(name,title,fn){var b=document.createElement('button');b.type='button';b.textContent=name;b.title=title;return b;}
  function glyph(p){return {pen:'✎',eraser:'▱',star:'★',circle:'●',play:'▶'}[p.icon]||{brush:'✎',eraser:'▱',action:'▶',tool:'◇',menu:'▤',label:'—'}[p.type];}
  function describe(p){
    if(p.type==='brush'||p.type==='eraser')return p.name+' · '+p.size+' px · '+p.opacity+'% opacidade · '+p.flow+'% flow'+(p.presetName?' · '+p.presetName:'')+(p.captured?' · opções capturadas':'');
    if(p.type==='action')return p.name+' · '+p.set+' / '+p.action;
    return p.name;
  }
  function render(){
    var tabs=el('tabs');tabs.textContent='';
    store.state.shelves.forEach(function(s){
      var tab=makeButton(s.name,'Abrir aba '+s.name);tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(s.id===currentShelf()));tab.disabled=busy;tab.onclick=function(){attempt(function(){store.selectShelf(s.id);selected=[];el('contextMenu').hidden=true;render();});};tabs.appendChild(tab);
    });
    shelves(el('transferShelf'),el('transferShelf').value||currentShelf());
    el('showNames').checked=store.state.settings.showNames;el('preserveSize').checked=store.state.settings.preserveSize;
    el('editTools').hidden=!editing;el('editMode').setAttribute('aria-pressed',String(editing));el('editMode').textContent=editing?'Concluir edição':'Editar painel';
    el('selectionCount').textContent=selected.length+' botão(ões) selecionado(s).';
    el('shelfName').placeholder=store.state.shelves.find(function(s){return s.id===currentShelf();}).name;
    var board=el('board');board.textContent='';var maxX=216,maxY=220;
    var query=el('search').value.toLocaleLowerCase();
    var items=store.items.filter(function(p){return p.shelf===currentShelf()&&(el('filter').value==='all'||p.type===el('filter').value)&&p.name.toLocaleLowerCase().indexOf(query)>=0;});
    if(!items.length){var empty=document.createElement('p');empty.className='empty';empty.textContent='Esta área está livre. Adicione um botão ou capture o pincel atual no Photoshop.';board.appendChild(empty);}
    items.forEach(function(p){
      maxX=Math.max(maxX,p.x+p.width+8);maxY=Math.max(maxY,p.y+p.height+8);
      var tile=document.createElement('div');tile.className='tile'+(p.type==='label'?' labelTile':'')+(p.appearance==='image'&&p.image?' imageTile':'')+(editing?' editingTile':'')+(selected.indexOf(p.id)>=0?' selected':'')+(activeId===p.id?' active':'');
      tile.setAttribute('data-id',p.id);tile.style.left=p.x+'px';tile.style.top=p.y+'px';tile.style.width=p.width+'px';tile.style.height=p.height+'px';tile.style.backgroundColor=p.background;
      var button=makeButton('',describe(p));button.className='tileButton';button.setAttribute('aria-label',(editing?'Selecionar ':'Ativar ')+p.name);button.disabled=busy;
      if(p.appearance==='image'&&p.image){var image=document.createElement('img');image.src=p.image;image.className='tileImage';image.alt='';image.draggable=false;button.appendChild(image);}
      else if(p.appearance==='stroke'&&(p.type==='brush'||p.type==='eraser')){
        var stroke=document.createElement('span');stroke.className='strokePreview';stroke.style.backgroundColor=p.type==='eraser'?'#dddddd':p.color;stroke.style.opacity=Math.max(.25,p.opacity/100);button.appendChild(stroke);
      }else if(p.appearance!=='text'&&p.type!=='label'){var icon=document.createElement('span');icon.className='tileGlyph';icon.textContent=glyph(p);button.appendChild(icon);}
      if(store.state.settings.showNames||p.appearance==='text'||p.type==='label'){var label=document.createElement('span');label.className='tileName';label.textContent=p.name;button.appendChild(label);}
      button.onclick=function(e){
        if(Date.now()<suppressClick||busy)return;
        if(e.altKey){open(p);return;}
        if(editing){if(e.shiftKey||e.ctrlKey||e.metaKey){var i=selected.indexOf(p.id);if(i>=0)selected.splice(i,1);else selected.push(p.id);}else selected=[p.id];render();return;}
        if(p.type==='label')return;
        activate(p);
      };
      button.ondblclick=function(){if(editing&&!busy)open(p);};
      button.oncontextmenu=function(e){e.preventDefault();if(busy)return;selected=[p.id];render();el('contextMenu').hidden=false;};
      button.onmousedown=function(e){startGesture(e,p,tile,false);};
      button.onkeydown=function(e){if(editing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)>=0){e.preventDefault();attempt(function(){store.layout(selected.length?selected:[p.id],e.key==='ArrowLeft'?-8:e.key==='ArrowRight'?8:0,e.key==='ArrowUp'?-8:e.key==='ArrowDown'?8:0);render();});}};
      tile.appendChild(button);
      if(editing){var handle=makeButton('','Redimensionar '+p.name);handle.className='resizeHandle';handle.setAttribute('aria-label','Redimensionar '+p.name);handle.onmousedown=function(e){startGesture(e,p,tile,true);};handle.onclick=function(e){e.stopPropagation();};tile.appendChild(handle);}
      board.appendChild(tile);
    });
    board.style.minWidth=maxX+'px';board.style.height=maxY+'px';setBusy(busy);
  }
  async function activate(p){
    setBusy(true);render();message('Aplicando '+p.name+'…');
    try{await host.apply(p,store.state.settings);activeId=p.id;message(host.mode==='DEMONSTRAÇÃO'?'Simulação: '+p.name+'. Nenhum comando enviado ao Photoshop.':'Aplicado: '+p.name);}
    catch(e){message(e.message+' Comandos anteriores podem ter sido aplicados.',true);}
    finally{setBusy(false);render();}
  }
  function startGesture(e,p,tile,resize){
    if(!editing||busy||e.button!==0||e.altKey||(!resize&&(e.shiftKey||e.ctrlKey||e.metaKey)))return;
    e.preventDefault();e.stopPropagation();
    if(selected.indexOf(p.id)<0)selected=[p.id];
    var ids=resize?[p.id]:selected.slice(),nodes=[];
    var tiles=el('board').querySelectorAll('.tile');
    ids.forEach(function(id){var node=null;Array.prototype.forEach.call(tiles,function(tileNode){if(tileNode.getAttribute('data-id')===id)node=tileNode;});var item=find(id);if(node&&item)nodes.push({node:node,p:item});});
    gesture={p:p,resize:resize,ids:ids,nodes:nodes,x:e.clientX,y:e.clientY,dx:0,dy:0,moved:false,tile:tile};
  }
  document.addEventListener('mousemove',function(e){
    if(!gesture)return;
    var g=gesture;g.dx=core.snap(e.clientX-g.x);g.dy=core.snap(e.clientY-g.y);if(Math.abs(g.dx)+Math.abs(g.dy)<4)return;g.moved=true;
    if(g.resize){g.tile.style.width=Math.max(48,Math.min(640,g.p.width+g.dx))+'px';g.tile.style.height=Math.max(24,Math.min(480,g.p.height+g.dy))+'px';}
    else g.nodes.forEach(function(n){n.node.style.left=Math.max(0,Math.min(4096,n.p.x+g.dx))+'px';n.node.style.top=Math.max(0,Math.min(8192,n.p.y+g.dy))+'px';});
  });
  document.addEventListener('mouseup',function(){
    if(!gesture)return;var g=gesture;gesture=null;
    if(g.moved){suppressClick=Date.now()+250;attempt(function(){if(g.resize)store.save(Object.assign({},g.p,{width:Math.max(48,Math.min(640,g.p.width+g.dx)),height:Math.max(24,Math.min(480,g.p.height+g.dy))}));else store.layout(g.ids,g.dx,g.dy);message('Posição e tamanho salvos.');});}
    if(g.moved)render();
  });
  function fields(){
    var type=el('type').value;
    [['paintFields',type==='brush'||type==='eraser'],['actionFields',type==='action'],['toolFields',type==='tool'],['menuFields',type==='menu']].forEach(function(pair){
      el(pair[0]).hidden=!pair[1];var inputs=el(pair[0]).querySelectorAll('input,select,button');Array.prototype.forEach.call(inputs,function(input){input.disabled=!pair[1];});
    });
    el('set').required=type==='action';el('action').required=type==='action';
    el('colorLabel').hidden=type==='eraser';el('imageFields').hidden=el('appearance').value!=='image';
    el('clearCapture').hidden=!(draft&&draft.captured&&draft.type===type);
    el('captureInfo').textContent=draft&&draft.captured&&draft.type===type?'Opções nativas capturadas em '+draft.captured.runtime+'. Os recursos do pincel precisam continuar disponíveis no Photoshop.':'';
  }
  function updateImage(){el('imagePreview').hidden=!(draft&&draft.image);if(draft&&draft.image)el('imagePreview').src=draft.image;}
  function open(p,newCapture){
    if(busy)return;
    var pos=nextPosition();
    draft=p?Object.assign({},p):{id:core.uid(),name:'',type:'brush',shelf:currentShelf(),size:20,color:'#6962d8',opacity:100,flow:100,background:'#454654',icon:'auto',appearance:'icon',width:104,height:64,x:pos.x,y:pos.y};
    if(newCapture){draft.shelf=currentShelf();draft.x=pos.x;draft.y=pos.y;}
    el('form').reset();shelves(el('shelf'),draft.shelf||currentShelf());
    ['name','type','size','color','opacity','flow','set','action','tool','command','appearance','background','icon','width','height','x','y','presetName','presetKind'].forEach(function(id){if(draft[id]!==undefined)el(id).value=draft[id];});
    el('forceSize').checked=!!draft.forceSize;el('editorTitle').textContent=find(draft.id)?'Editar botão':'Novo botão';el('editor').hidden=false;el('contextMenu').hidden=true;fields();updateImage();el('name').focus();
  }
  function close(){el('editor').hidden=true;draft=null;}
  function selection(){var items=selected.map(find).filter(Boolean);if(!items.length)throw Error('Selecione pelo menos um botão no modo de edição.');return items;}
  function duplicate(){var items=selection(),ids=[];var next=store.items.slice();items.forEach(function(p){var copy=Object.assign({},p,{id:core.uid(),name:(p.name+' cópia').slice(0,60),x:Math.min(4096,p.x+8),y:Math.min(8192,p.y+8)});next.push(copy);ids.push(copy.id);});store.commit(next);selected=ids;render();message('Botão duplicado.');}
  function removeSelected(){selection();store.commit(store.items.filter(function(p){return selected.indexOf(p.id)<0;}));selected=[];close();el('contextMenu').hidden=true;render();message('Botão excluído. Você pode desfazer.');}
  el('mode').textContent=host.mode;
  applyCepTheme();
  if(window.__adobe_cep__&&window.__adobe_cep__.addEventListener)window.__adobe_cep__.addEventListener('com.adobe.csxs.events.ThemeColorChanged',applyCepTheme);
  try{store=new core.Store(localStorage);}catch(e){message('Não foi possível ler a biblioteca: '+e.message+' Os dados anteriores foram preservados.',true);Array.prototype.forEach.call(document.querySelectorAll('button,input,select'),function(n){n.disabled=true;});return;}
  el('add').onclick=function(){open();};
  el('capture').onclick=async function(){
    if(busy)return;setBusy(true);message('Lendo a ferramenta atual…');
    try{var p=await host.capture();setBusy(false);open(p,true);message('Captura lida. Dê um nome e salve o botão.');}catch(e){message(e.message,true);}finally{setBusy(false);render();}
  };
  el('editMode').onclick=function(){if(busy)return;editing=!editing;selected=[];render();message(editing?'Modo de edição: selecione, arraste ou redimensione os botões.':'Painel pronto para pintar.');};
  el('search').oninput=render;el('filter').onchange=render;
  el('manageTabs').onclick=function(){el('tabManager').hidden=!el('tabManager').hidden;};
  el('newShelf').onclick=function(){attempt(function(){store.addShelf(el('shelfName').value);el('shelfName').value='';selected=[];render();});};
  el('renameShelf').onclick=function(){attempt(function(){store.renameShelf(currentShelf(),el('shelfName').value);el('shelfName').value='';render();});};
  el('deleteShelf').onclick=function(){attempt(function(){store.removeShelf(currentShelf());selected=[];render();message('Aba excluída; os botões foram preservados.');});};
  el('editSelected').onclick=function(){attempt(function(){open(selection()[0]);});};
  el('duplicate').onclick=function(){attempt(duplicate);};el('deleteSelected').onclick=function(){attempt(removeSelected);};
  el('alignLeft').onclick=function(){attempt(function(){selection();store.align(selected,'x');render();});};
  el('alignTop').onclick=function(){attempt(function(){selection();store.align(selected,'y');render();});};
  ['transfer','copy'].forEach(function(id){el(id).onclick=function(){attempt(function(){selection();store.transfer(selected,el('transferShelf').value,id==='copy');selected=[];render();message(id==='copy'?'Botões copiados.':'Botões transferidos.');});};});
  el('contextEdit').onclick=function(){attempt(function(){open(selection()[0]);});};el('contextDuplicate').onclick=function(){attempt(duplicate);el('contextMenu').hidden=true;};el('contextDelete').onclick=function(){attempt(removeSelected);};el('contextClose').onclick=function(){el('contextMenu').hidden=true;};
  el('cancel').onclick=close;el('cancelForm').onclick=close;el('type').onchange=fields;el('appearance').onchange=fields;
  el('clearCapture').onclick=function(){if(draft)delete draft.captured;fields();};
  el('form').onsubmit=function(e){
    e.preventDefault();attempt(function(){
      if(!draft)return;
      var p={id:draft.id,name:el('name').value,type:el('type').value,shelf:el('shelf').value,icon:el('icon').value,appearance:el('appearance').value,background:el('background').value,image:draft.image||'',forceSize:el('forceSize').checked,presetName:el('presetName').value,presetKind:el('presetKind').value,set:el('set').value,action:el('action').value,tool:el('tool').value,command:el('command').value,color:el('color').value};
      ['size','opacity','flow','width','height','x','y'].forEach(function(id){p[id]=Number(el(id).value);});
      if(p.type===draft.type&&draft.captured)p.captured=draft.captured;
      if(p.appearance==='image'&&!p.image)throw Error('Escolha uma imagem para a miniatura.');
      store.save(p);close();render();message('Botão salvo na biblioteca.');
    });
  };
  el('pickImage').onclick=async function(){
    if(!draft||busy)return;
    try{if(host.mode==='UXP'){var image=await host.pickImage();if(image&&draft){draft.image=image;updateImage();}}else el('imageFile').click();}catch(e){message(e.message,true);}
  };
  el('imageFile').onchange=function(){
    var file=el('imageFile').files[0];if(!file||!draft)return;
    if(file.size>250000||['image/png','image/jpeg','image/webp'].indexOf(file.type)<0){message('Escolha PNG, JPEG ou WebP de até 250 KB.',true);return;}
    var originalDraft=draft,reader=new FileReader();reader.onload=function(){if(draft===originalDraft){draft.image=reader.result;updateImage();}};reader.onerror=function(){message('Não foi possível ler a imagem.',true);};reader.readAsDataURL(file);
  };
  el('removeImage').onclick=function(){if(draft){draft.image='';updateImage();}};
  el('undo').onclick=function(){attempt(function(){store.undo();selected=[];close();render();message('Última alteração desfeita.');});};
  el('library').onclick=function(){el('options').hidden=!el('options').hidden;};
  ['showNames','preserveSize'].forEach(function(id){el(id).onchange=function(){attempt(function(){var settings={};settings[id]=el(id).checked;store.settings(settings);render();});};});
  el('export').onclick=function(){el('backupText').value=store.export();message('Backup pronto. Copie o texto e salve em um arquivo.');};
  el('import').onclick=function(){attempt(function(){store.import(el('backupText').value);selected=[];close();render();message('Biblioteca importada. Você pode desfazer.');});};
  el('board').oncontextmenu=function(e){if(e.target===el('board')){e.preventDefault();open();}};
  render();
  message(host.mode==='DEMONSTRAÇÃO'?'Demonstração: organize seus botões aqui. A ativação real acontece no Photoshop.':'Abra um documento de teste para conferir os botões.');
}());
