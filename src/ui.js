(function(){
  'use strict';
  var core=window.PintaCore,host=window.PintaHost,store,draft=null,selected=[],editing=false,busy=false,gesture=null,suppressClick=0;
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
  var messageTimer;
  function message(text,error){clearTimeout(messageTimer);var status=el('status');status.textContent=text;status.className=error?'error':'';status.title=text||'';messageTimer=setTimeout(function(){status.textContent='';status.className='';},error?10000:4000);}
  el('status').onclick=function(){clearTimeout(messageTimer);el('status').textContent='';el('status').className='';};
  function attempt(fn){if(busy)return;try{fn();}catch(e){message(e.message,true);render();}}
  function shelves(select,value){
    select.textContent='';
    store.state.shelves.forEach(function(s){var option=document.createElement('option');option.value=s.id;option.textContent=s.name;select.appendChild(option);});
    select.value=value;
  }
  function find(id){return store.items.find(function(p){return p.id===id;});}
  function currentShelf(){return store.state.activeShelf;}
  function setBusy(value){busy=value;el('app').className=(editing?'editing ':'')+(busy?'busy ':'')+(store.state.settings.locked?'locked ':'')+'freeLayout';['add','capture','editMode','manageTabs','undo','library'].forEach(function(id){el(id).disabled=value||(id==='undo'&&!store.history.length);});}
  function makeButton(name,title){var b=document.createElement('button');b.type='button';b.textContent=name;b.title=title;return b;}
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
    el('lockLayout').setAttribute('aria-pressed',String(store.state.settings.locked));el('lockLayout').querySelector('img').src=store.state.settings.locked?'icons/lock.svg':'icons/unlock.svg';
    shelves(el('transferShelf'),el('transferShelf').value||currentShelf());
    el('showNames').checked=store.state.settings.showNames;el('preserveSize').checked=store.state.settings.preserveSize;
    el('editTools').hidden=!editing;el('editMode').setAttribute('aria-pressed',String(editing));el('editMode').textContent=editing?'Concluir edição':'Editar painel';
    el('selectionCount').textContent=selected.length+' botão(ões) selecionado(s).';
    el('shelfName').placeholder=store.state.shelves.find(function(s){return s.id===currentShelf();}).name;
    var board=el('board');board.textContent='';var extentX=0,extentY=0;
    var query=el('search').value.toLocaleLowerCase();
    var items=store.items.filter(function(p){return p.shelf===currentShelf()&&(el('filter').value==='all'||p.type===el('filter').value)&&p.name.toLocaleLowerCase().indexOf(query)>=0;});
    if(!items.length){var empty=document.createElement('p');empty.className='empty';empty.textContent='Clique em + para salvar a ferramenta atual.';board.appendChild(empty);}
    items.forEach(function(p){
      extentX=Math.max(extentX,p.x+p.width);extentY=Math.max(extentY,p.y+p.height);
      var tile=document.createElement('div');tile.className='tile'+(p.type==='label'?' labelTile':'')+(p.appearance==='image'&&p.image?' imageTile':'')+(editing?' editingTile':'')+(editing&&selected.indexOf(p.id)>=0?' selected':'');
      tile.setAttribute('data-id',p.id);tile.style.left=p.x+'px';tile.style.top=p.y+'px';tile.style.setProperty('--tile-bg',p.background);tile.style.setProperty('--tile-w',p.width+'px');tile.style.setProperty('--tile-h',p.height+'px');
      var button=makeButton('',describe(p));button.className='tileButton';button.setAttribute('aria-label',(editing?'Selecionar ':'Ativar ')+p.name);button.disabled=busy;
      if(p.appearance==='stroke'&&(p.type==='brush'||p.type==='eraser')){var preview=document.createElement('span');preview.className='brushPreview';preview.style.backgroundColor=p.type==='eraser'?'#dddddd':p.color;preview.style.height=Math.max(2,Math.min(16,p.size/8))+'px';preview.style.opacity=Math.max(.15,p.opacity/100);button.appendChild(preview);button.title+=' · preview aproximado';}
      else if(p.appearance!=='text'){var image=document.createElement('img');image.src=p.appearance==='image'&&p.image?p.image:'icons/'+({pen:'brush',eraser:'eraser',play:'action',star:'star',circle:'circle'}[p.icon]||(p.type==='tool'&&(p.tool==='eraserTool'||p.tool==='eraser')?'eraser':p.type))+'.svg';image.className='actionIcon';image.alt='';image.draggable=false;button.appendChild(image);}
      if((editing&&store.state.settings.showNames)||p.appearance==='text'){var label=document.createElement('span');label.className='tileName';label.textContent=p.name;button.appendChild(label);}
      button.onclick=function(e){
        if(Date.now()<suppressClick||busy)return;
        
        if(editing){if(e.shiftKey||e.ctrlKey||e.metaKey){var i=selected.indexOf(p.id);if(i>=0)selected.splice(i,1);else selected.push(p.id);}else selected=[p.id];render();return;}
        if(p.type==='label')return;
        activate(p);
      };
      
      button.oncontextmenu=function(e){e.preventDefault();if(busy)return;selected=[p.id];draft=Object.assign({},p);el('contextKey').value=p.shortcut||'';el('contextColor').value=p.background;el('contextAppearance').value=['icon','stroke','image'].indexOf(p.appearance)>=0?p.appearance:'icon';el('shortcutInfo').textContent='';el('contextWidth').disabled=store.state.settings.locked;el('contextHeight').disabled=store.state.settings.locked;el('contextWidth').value=p.width;el('contextHeight').value=p.height;updateImage();el('contextMenu').hidden=false;};
      button.onmousedown=function(e){startGesture(e,p,tile);};
      button.onkeydown=function(e){if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();attempt(function(){store.move(p.id,e.key==='ArrowLeft'?-1:1);render();});}};
      tile.appendChild(button);
      if(!store.state.settings.locked)["nw","ne","sw","se"].forEach(function(corner){var handle=makeButton("","Arraste para redimensionar "+p.name);handle.className="resizeHandle "+corner;handle.setAttribute("aria-label","Redimensionar "+p.name+" "+corner);handle.onmousedown=function(e){startGesture(e,p,tile,corner);};handle.onclick=function(e){e.stopPropagation();};handle.onkeydown=function(e){if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].indexOf(e.key)<0)return;e.preventDefault();attempt(function(){store.save(Object.assign({},p,{width:Math.max(48,Math.min(640,p.width+(e.key==="ArrowLeft"?-8:e.key==="ArrowRight"?8:0))),height:Math.max(24,Math.min(480,p.height+(e.key==="ArrowUp"?-8:e.key==="ArrowDown"?8:0)))}));render();});};tile.appendChild(handle);});
      
      board.appendChild(tile);
    });
    board.style.minWidth=extentX+'px';board.style.minHeight=extentY+'px';setBusy(busy);
  }
  async function activate(p){
    setBusy(true);render();message('Aplicando '+p.name+'…');
    try{await host.apply(p,store.state.settings);message(host.mode==='DEMONSTRAÇÃO'?'Simulação: '+p.name+'. Nenhum comando enviado ao Photoshop.':'Aplicado: '+p.name);}
    catch(e){message(e.message,true);}
    finally{setBusy(false);render();}
  }
  function startGesture(e,p,tile,corner){
    if(store.state.settings.locked||busy||e.button!==0||e.altKey||e.shiftKey||e.ctrlKey||e.metaKey)return;
    if(corner){e.preventDefault();e.stopPropagation();}
    var rect=tile.getBoundingClientRect();gesture={p:p,tile:tile,corner:corner||null,x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,scrollX:el('boardViewport').scrollLeft,scrollY:el('boardViewport').scrollTop,moved:false};
  }
  document.addEventListener('mousemove',function(e){
    if(!gesture)return;var g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved&&Math.abs(dx)+Math.abs(dy)<5)return;g.moved=true;e.preventDefault();g.tile.classList.add('dragging');
    if(g.corner){g.newWidth=Math.max(48,Math.min(640,core.snap(g.width+(g.corner.indexOf('w')>=0?-dx:dx))));g.newHeight=Math.max(24,Math.min(480,core.snap(g.height+(g.corner.indexOf('n')>=0?-dy:dy))));g.tile.style.setProperty('--tile-w',g.newWidth+'px');g.tile.style.setProperty('--tile-h',g.newHeight+'px');return;}
    g.newX=Math.max(0,Math.min(4096,core.snap(g.p.x+dx+el('boardViewport').scrollLeft-g.scrollX)));g.newY=Math.max(0,Math.min(8192,core.snap(g.p.y+dy+el('boardViewport').scrollTop-g.scrollY)));g.tile.style.left=g.newX+'px';g.tile.style.top=g.newY+'px';el('board').style.minWidth=Math.max(el('boardViewport').clientWidth,g.newX+g.width)+'px';el('board').style.minHeight=Math.max(el('boardViewport').clientHeight,g.newY+g.height)+'px';
    var viewport=el('boardViewport'),v=viewport.getBoundingClientRect();if(e.clientY>v.bottom-20)viewport.scrollTop+=12;else if(e.clientY<v.top+20)viewport.scrollTop-=12;if(e.clientX>v.right-20)viewport.scrollLeft+=12;else if(e.clientX<v.left+20)viewport.scrollLeft-=12;
  });
  document.addEventListener('mouseup',function(){if(!gesture)return;var g=gesture;gesture=null;if(!g.moved)return;suppressClick=Date.now()+300;attempt(function(){if(g.corner)store.save(Object.assign({},g.p,{width:g.newWidth,height:g.newHeight}));else store.save(Object.assign({},g.p,{x:g.newX,y:g.newY}));message(g.corner?'Tamanho salvo.':'Ordem salva.');});render();});
  function cancelGesture(){if(!gesture)return;gesture=null;suppressClick=Date.now()+300;render();}
  window.addEventListener('blur',cancelGesture);document.addEventListener('keydown',function(e){if(e.key==='Escape')cancelGesture();});
  function fields(){
    var type=el('type').value;
    [['paintFields',type==='brush'||type==='eraser'],['actionFields',type==='action'],['toolFields',type==='tool'],['menuFields',type==='menu'],['layerFields',type==='layer'],['styleFields',type==='style'],['macroFields',type==='macro']].forEach(function(pair){
      el(pair[0]).hidden=!pair[1];var inputs=el(pair[0]).querySelectorAll('input,select,button');Array.prototype.forEach.call(inputs,function(input){input.disabled=!pair[1];});
    });
    el('set').required=type==='action';el('action').required=type==='action';
    el('colorLabel').hidden=type==='eraser';el('imageFields').hidden=el('appearance').value!=='image';
    el('clearCapture').hidden=!(draft&&draft.captured&&draft.type===type);
    el('captureInfo').textContent=draft&&draft.captured&&draft.type===type?'Opções nativas capturadas em '+draft.captured.runtime+'. Os recursos do pincel precisam continuar disponíveis no Photoshop.':'';
  }
  function updateImage(){el('contextImage').hidden=!(draft&&draft.image);if(draft&&draft.image)el('contextImage').src=draft.image;el('imagePreview').hidden=!(draft&&draft.image);if(draft&&draft.image)el('imagePreview').src=draft.image;}
  function open(p){
    if(busy)return;
    draft=p?Object.assign({},p):{id:core.uid(),name:'',type:'brush',shelf:currentShelf(),size:20,color:'#6962d8',opacity:100,flow:100,background:'#454654',icon:'auto',appearance:'icon',width:104,height:64,x:0,y:0};
    el('form').reset();el('clipped').checked=!!draft.clipped;shelves(el('shelf'),draft.shelf||currentShelf());
    ['name','type','size','color','opacity','flow','set','action','tool','command','appearance','background','icon','width','height','x','y','presetName','presetKind','layerName','layerOpacity','blendMode','styleName'].forEach(function(id){if(draft[id]!==undefined)el(id).value=draft[id];});
    el('macroSteps').textContent=''; var steps=draft.steps||[]; var choices=store.items.filter(function(item){return item.id!==draft.id&&item.type!=='macro'&&item.type!=='label';}); steps.forEach(function(step){if(!choices.some(function(item){return item.id===step.id;}))choices.push(step);}); choices.forEach(function(item){var label=document.createElement('label');label.className='check';var check=document.createElement('input');check.type='checkbox';check.value=item.id;check.checked=steps.some(function(step){return step.id===item.id;});label.appendChild(check);label.appendChild(document.createTextNode(item.name));el('macroSteps').appendChild(label);});el('advanced').open=false;el('forceSize').checked=!!draft.forceSize;el('editorTitle').textContent=find(draft.id)?'Editar botão':'Novo botão';el('editor').hidden=false;el('contextMenu').hidden=true;fields();updateImage();el('name').focus();
  }
  function close(){el('editor').hidden=true;draft=null;}
  function selection(){var items=selected.map(find).filter(Boolean);if(!items.length)throw Error('Selecione pelo menos um botão no modo de edição.');return items;}
  function duplicate(){var items=selection(),ids=[];var next=store.items.slice();items.forEach(function(p){var copy=Object.assign({},p,{id:core.uid(),name:(p.name+' cópia').slice(0,60),x:Math.min(4096,p.x+8),y:Math.min(8192,p.y+8)});next.push(copy);ids.push(copy.id);});store.commit(next);selected=ids;render();message('Botão duplicado.');}
  function removeSelected(){selection();store.commit(store.items.filter(function(p){return selected.indexOf(p.id)<0;}));selected=[];close();el('contextMenu').hidden=true;render();message('Botão excluído. Você pode desfazer.');}
  el('mode').textContent=host.mode;
  el('updateGithub').onclick=async function(){if(busy)return;setBusy(true);el('updateGithub').disabled=true;el('updateStatus').textContent='Verificando atualização no GitHub…';try{var result=await window.PKPUpdater.update();el('updateStatus').textContent=result.updated?'Versão '+result.version+' instalada. Feche e reabra o Photoshop para carregar a atualização.':'Você já está na versão mais recente: '+result.version+'.';}catch(e){el('updateStatus').textContent='Não foi possível atualizar: '+e.message;}finally{setBusy(false);el('updateGithub').disabled=false;}};
  applyCepTheme();
  if(window.__adobe_cep__&&window.__adobe_cep__.addEventListener)window.__adobe_cep__.addEventListener('com.adobe.csxs.events.ThemeColorChanged',applyCepTheme);
  try{store=new core.Store(localStorage);}catch(e){message('Não foi possível ler a biblioteca: '+e.message+' Os dados anteriores foram preservados.',true);Array.prototype.forEach.call(document.querySelectorAll('button,input,select'),function(n){n.disabled=true;});return;}
  function chooseMacro(){el('macroChooser').hidden=false;el('settingsDrawer').hidden=true;}
  el('add').onclick=chooseMacro;el('closeChooser').onclick=function(){el('macroChooser').hidden=true;};
  Array.prototype.forEach.call(document.querySelectorAll('[data-recipe]'),function(button){button.onclick=function(){if(busy)return;var recipe=button.getAttribute('data-recipe');el('macroChooser').hidden=true;if(recipe==='capture'){el('capture').onclick();return;}if(['layer','action','macro'].indexOf(recipe)>=0){open();el('type').value=recipe;fields();return;}attempt(function(){var p={id:core.uid(),name:recipe==='flip'?'Espelhar imagem':recipe==='clip'?'Camada recortada':recipe==='dodgeClip'?'Color Dodge recortada':'Camada Color Dodge',type:recipe==='flip'?'menu':'layer',command:'flipCanvasHorizontal',layerName:recipe==='clip'?'Camada recortada':'Color Dodge',layerOpacity:100,blendMode:recipe==='clip'?'normal':'colorDodge',clipped:recipe==='clip'||recipe==='dodgeClip',width:48,height:48,shelf:currentShelf(),x:0,y:store.items.filter(function(p){return p.shelf===currentShelf();}).reduce(function(y,p){return Math.max(y,p.y+p.height+8);},0)};store.save(p);render();message('Macro criada: '+p.name+'. Clique no botão para executar.');});};});
  el('capture').onclick=async function(){
    if(busy)return;setBusy(true);message('Lendo a ferramenta atual…');
    try{var p=await host.capture();p=store.capture(p);message('Atalho salvo'+(p.size?': '+p.size+' px / '+p.opacity+'% / '+p.flow+'%':'')+'. Clique no ícone para restaurar.');}catch(e){if(p&&p.nativePreset&&!find(p.id)){try{await host.discardCapture(p);}catch(cleanup){e.message+=' A predefinição temporária não pôde ser removida.';}}message(e.message,true);}finally{setBusy(false);render();}
  };
  el('editMode').onclick=function(){if(busy)return;editing=!editing;selected=[];el('settingsDrawer').hidden=true;el('settingsToggle').setAttribute('aria-expanded','false');render();message(editing?'Modo de edição: selecione, arraste ou redimensione os botões.':'Painel pronto para pintar.');};
  el('search').oninput=render;el('filter').onchange=render;
  el('manageTabs').onclick=function(){el('tabManager').hidden=!el('tabManager').hidden;};
  el('newShelf').onclick=function(){attempt(function(){store.addShelf(el('shelfName').value);el('shelfName').value='';selected=[];render();});};
  el('renameShelf').onclick=function(){attempt(function(){store.renameShelf(currentShelf(),el('shelfName').value);el('shelfName').value='';render();});};
  el('deleteShelf').onclick=function(){attempt(function(){store.removeShelf(currentShelf());selected=[];render();message('Aba excluída; os botões foram preservados.');});};
  el('duplicate').onclick=function(){attempt(duplicate);};el('deleteSelected').onclick=function(){attempt(removeSelected);};
  ['transfer','copy'].forEach(function(id){el(id).onclick=function(){attempt(function(){selection();store.transfer(selected,el('transferShelf').value,id==='copy');selected=[];render();message(id==='copy'?'Botões copiados.':'Botões transferidos.');});};});
  el('lockLayout').onclick=function(){attempt(function(){cancelGesture();store.settings({locked:!store.state.settings.locked});render();});};
  el('contextDelete').onclick=function(){attempt(function(){if(!draft)return;store.remove(draft.id);draft=null;selected=[];el('contextMenu').hidden=true;render();message('Atalho excluído. Use Desfazer para restaurar.');});};
  function keyName(e){var key=e.key.toUpperCase();if(!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-2]))$/.test(key))return '';return (e.ctrlKey?'Ctrl+':'')+(e.altKey?'Alt+':'')+(e.shiftKey?'Shift+':'')+key;}
  el('contextKey').onkeydown=function(e){e.preventDefault();var key=keyName(e);if(key)el('contextKey').value=key;};el('clearKey').onclick=function(){el('contextKey').value='';};
  document.addEventListener('keydown',function(e){if(busy||e.repeat||!el('contextMenu').hidden||!el('editor').hidden||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;var key=keyName(e);if(!key)return;var p=store.items.find(function(item){return item.shortcut===key;});if(p){e.preventDefault();activate(p);}});
  el('pickBackground').onclick=async function(){if(!draft||busy)return;var current=draft;try{var result=await host.pickColor(el('contextColor').value);if(draft===current&&result)el('contextColor').value=result;}catch(e){message(e.message,true);}};
  el('contextShortcut').onclick=async function(){if(!draft||busy)return;try{var result=await host.prepareShortcut(draft);el('shortcutInfo').textContent=(result.installed?'Comando '+result.name+' instalado. Reinicie o Photoshop e atribua as teclas em Editar > Atalhos de teclado > Menus de aplicativos > Arquivo > Scripts.':'Copie o arquivo para a pasta Presets/Scripts do Photoshop, reinicie e atribua as teclas em Editar > Atalhos de teclado. Arquivo: '+result.path);}catch(e){message(e.message,true);}};
  el('contextClose').onclick=function(){el('contextMenu').hidden=true;draft=null;};
  el('contextPickImage').onclick=function(){if(draft)el('pickImage').onclick();};
  el('contextSave').onclick=function(){attempt(function(){if(!draft)return;var original=find(draft.id);if(!original)throw Error('Atalho não encontrado.');var chosenKey=el('contextKey').value;if(chosenKey&&store.items.some(function(item){return item.id!==original.id&&item.shortcut===chosenKey;}))throw Error('Essa combinação já pertence a outro botão.');var appearance=el('contextAppearance').value;if(appearance==='image'&&!draft.image)throw Error('Escolha uma imagem.');store.save(Object.assign({},original,{shortcut:el('contextKey').value,background:el('contextColor').value,appearance:appearance,image:draft.image||'',width:store.state.settings.locked?original.width:Number(el('contextWidth').value),height:store.state.settings.locked?original.height:Number(el('contextHeight').value)}));el('contextMenu').hidden=true;draft=null;render();message('Aparência salva.');});};
  el('cancel').onclick=close;el('cancelForm').onclick=close;el('type').onchange=fields;el('appearance').onchange=fields;
  el('clearCapture').onclick=function(){if(draft)delete draft.captured;fields();};
  el('form').onsubmit=function(e){
    e.preventDefault();attempt(function(){
      if(!draft)return;
      var p={shortcut:draft.shortcut||'',id:draft.id,name:el('name').value,type:el('type').value,shelf:el('shelf').value,icon:el('icon').value,appearance:el('appearance').value,background:el('background').value,image:draft.image||'',forceSize:el('forceSize').checked,presetName:el('presetName').value,presetKind:el('presetKind').value,set:el('set').value,action:el('action').value,tool:el('tool').value,command:el('command').value,color:el('color').value};
      ['size','opacity','flow','width','height','x','y'].forEach(function(id){p[id]=Number(el(id).value);});
      if(p.type===draft.type&&draft.captured){p.captured=draft.captured;if(draft.nativePreset&&p.presetName===draft.presetName){p.nativePreset=true;p.presetKind='toolPreset';}}
      if(p.appearance==='image'&&!p.image)throw Error('Escolha uma imagem para a miniatura.');
      p.clipped=el('clipped').checked;p.layerName=el('layerName').value;p.layerOpacity=Number(el('layerOpacity').value);p.blendMode=el('blendMode').value;p.styleName=el('styleName').value;if(p.type==='macro'){p.steps=[];Array.prototype.forEach.call(el('macroSteps').querySelectorAll('input:checked'),function(input){var step=find(input.value)||(draft.steps||[]).find(function(old){return old.id===input.value;});if(step)p.steps.push(step);});}store.save(p);close();render();message('Botão salvo na biblioteca.');
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
  function settings(visible){el('settingsDrawer').hidden=!visible;el('settingsToggle').setAttribute('aria-expanded',String(visible));if(!visible){editing=false;selected=[];el('contextMenu').hidden=true;el('tabManager').hidden=true;close();}render();}
  el('settingsToggle').onclick=function(){settings(el('settingsDrawer').hidden);};el('settingsClose').onclick=function(){settings(false);};
  el('library').onclick=function(){el('options').hidden=!el('options').hidden;};
  ['showNames','preserveSize'].forEach(function(id){el(id).onchange=function(){attempt(function(){var settings={};settings[id]=el(id).checked;store.settings(settings);render();});};});
  el('export').onclick=function(){el('backupText').value=store.export();message('Backup pronto. Copie o texto e salve em um arquivo.');};
  el('import').onclick=function(){attempt(function(){store.import(el('backupText').value);selected=[];close();render();message('Biblioteca importada. Você pode desfazer.');});};
  el('board').oncontextmenu=function(e){e.preventDefault();};
  el('copyEmail').onclick=async function(){var email='jdantanna@protonmail.com';function fallback(){var area=document.createElement('textarea');area.value=email;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);try{area.select();if(!document.execCommand('copy'))throw Error('Não foi possível copiar.');}finally{document.body.removeChild(area);}}try{var clipboard=navigator.clipboard;if(clipboard&&clipboard.setContent)await clipboard.setContent({'text/plain':email});else if(clipboard&&clipboard.writeText){try{await clipboard.writeText(email);}catch(error){fallback();}}else fallback();el('copyEmail').title='Endereço copiado';el('copyEmail').setAttribute('aria-label','Endereço copiado: '+email);el('copyEmail').textContent='Copiado!';setTimeout(function(){el('copyEmail').textContent=email;},1800);message('E-mail copiado.');}catch(e){message('Não foi possível copiar o e-mail: '+e.message,true);}};
  render();
  message(host.mode==='DEMONSTRAÇÃO'?'Demonstração: organize seus botões aqui. A ativação real acontece no Photoshop.':'Abra um documento de teste para conferir os botões.');
}());

