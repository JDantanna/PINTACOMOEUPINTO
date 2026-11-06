(function(root){
  'use strict';
  var core=root.PintaCore,ps=null,uxp=null,locked=false;
  if(!root.__adobe_cep__&&typeof require==='function'){try{ps=require('photoshop');uxp=require('uxp');}catch(e){/* Photoshop detection is independent of optional UXP helpers. */}}
  function failure(result){if(!result||!result[0]||result[0]._obj==='error')throw Error(result&&result[0]&&result[0].message||'O Photoshop não confirmou o comando.');return result[0];}
  async function batch(command){return failure(await ps.action.batchPlay([command],{}));}
  async function saveNative(input){var p=core.validate(input);try{await batch({_obj:'make',_target:[{_ref:'toolPreset'}],name:p.presetName,using:{_ref:'application',_property:'currentToolOptions'}});}catch(error){if(!p.captured)throw error;p.nativePreset=false;delete p.presetName;delete p.presetKind;}return p;}
  function get(property){return {_obj:'get',_target:[{_ref:'property',_property:property},{_ref:'application',_enum:'ordinal',_value:'targetEnum'}]};}
  function value(v){return typeof v==='number'?v:v&&v._value;}
  function bridge(name,payload){
    return new Promise(function(resolve,reject){
      var timer=setTimeout(function(){reject(Error('Photoshop não respondeu. Verifique o término antes de repetir.'));},30000);
      var data=JSON.stringify(payload||{}).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      try{root.__adobe_cep__.evalScript(name+'('+data+')',function(result){
        clearTimeout(timer);
        if(result==='OK')return resolve();
        if(!result||result.indexOf('ERROR:')===0||result==='EvalScript error.')return reject(Error(result||'Falha no ExtendScript.'));
        try{resolve(JSON.parse(result));}catch(e){reject(Error('Resposta inválida do Photoshop.'));}
      });}catch(e){clearTimeout(timer);reject(e);}
    });
  }
  async function guarded(fn){if(locked)throw Error('Aguarde a operação atual.');locked=true;try{return await fn();}finally{locked=false;}}
  var host=root.PintaHost={
    mode:ps?'UXP':root.__adobe_cep__?'CEP':'DEMONSTRAÇÃO',
    apply:async function(input,settings){
      var p=core.validate(input);settings=settings||{};
      if(p.type==='label')return;
      return guarded(async function(){
        if(ps){
          if(!ps.app.documents.length)throw Error('Abra um documento no Photoshop.');
          if(p.captured&&p.captured.runtime!=='UXP')throw Error('Esta captura pertence ao CEP. Capture novamente neste Photoshop.');
          return ps.core.executeAsModal(async function(){
            var options={};
            if((p.type==='brush'||p.type==='eraser')&&settings.preserveSize&&!p.forceSize){
              var current=await batch(get('currentToolOptions'));
              var size=value(current.currentToolOptions&&current.currentToolOptions.brush&&current.currentToolOptions.brush.diameter);
              if(typeof size!=='number'||!isFinite(size))throw Error('Não foi possível preservar o tamanho da ferramenta atual.');
              options.preservedSize=size;
            }
            var cmds=core.commands(p,options);
            for(var i=0;i<cmds.length;i++)await batch(cmds[i]);
          },{commandName:'PINTAKOMEOPINTO: '+p.name});
        }
        if(root.__adobe_cep__){
          if(p.captured&&p.captured.runtime!=='CEP')throw Error('Esta captura pertence ao UXP. Capture novamente neste Photoshop.');
          return bridge('pintaApply',{preset:p,preserveSize:settings.preserveSize===true});
        }
        host.last=p;
      });
    },
    capture:async function(){
      return guarded(async function(){
        if(ps){
          if(!ps.app.documents.length)throw Error('Abra um documento no Photoshop.');
          return ps.core.executeAsModal(async function(){
            var toolInfo=await batch(get('tool')),info=await batch(get('currentToolOptions')),fg=await batch(get('foregroundColor'));
            var tool=toolInfo.tool,toolName=typeof tool==='string'?tool:tool&&(core.TOOLS.indexOf(tool._enum)>=0?tool._enum:tool._value);
            if(!(/^[a-zA-Z][a-zA-Z0-9]{0,79}$/).test(toolName||''))throw Error('Esta ferramenta ainda não oferece captura neste painel.');var captureId=core.uid(),nativeName='__PKP_'+captureId;if(['paintbrushTool','eraserTool','eraser'].indexOf(toolName)<0||!info.currentToolOptions||!info.currentToolOptions.brush||value(info.currentToolOptions.opacity)===undefined||value(info.currentToolOptions.flow)===undefined)return saveNative({id:captureId,nativePreset:true,presetName:nativeName,presetKind:'toolPreset',name:'Ferramenta capturada',type:'tool',tool:toolName,captured:{runtime:'UXP',options:info.currentToolOptions}});
            var options=info.currentToolOptions,brush=options&&options.brush,rgb=fg.foregroundColor;
            if(!rgb||rgb.red===undefined||rgb.blue===undefined||(rgb.grain===undefined&&rgb.green===undefined))throw Error('A captura requer cor de primeiro plano RGB.');
            function hex(n){return ('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);}
            return saveNative({id:captureId,nativePreset:true,presetName:nativeName,presetKind:'toolPreset',name:(toolName==='eraser'||toolName==='eraserTool')?'Borracha capturada':'Pincel capturado',type:(toolName==='eraser'||toolName==='eraserTool')?'eraser':'brush',size:value(brush&&brush.diameter),opacity:value(options.opacity),flow:value(options.flow),color:'#'+hex(rgb.red)+hex(rgb.grain===undefined?rgb.green:rgb.grain)+hex(rgb.blue),captured:{runtime:'UXP',options:options}});
          },{commandName:'PINTAKOMEOPINTO: capturar ferramenta'});
        }
        if(root.__adobe_cep__)return core.validate(await bridge('pintaCapture'));
        throw Error('A captura está disponível dentro do Photoshop. No navegador, crie um botão manualmente.');
      });
    },
    saveBackup:async function(raw){core.parse(raw);if(root.__adobe_cep__)return bridge('pintaBackupSave',{data:raw});if(uxp){var f=await uxp.storage.localFileSystem.getFileForSaving('PKP-backup.json',{types:['json']});if(!f)return null;await f.write(raw);return {name:f.name};}var a=document.createElement('a'),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.href=url;a.download='PKP-backup.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);return {name:a.download};},
    readBackup:async function(){if(root.__adobe_cep__)return bridge('pintaBackupRead');if(uxp){var f=await uxp.storage.localFileSystem.getFileForOpening({types:['json']});if(!f)return null;return {name:f.name,data:await f.read()};}throw Error('Use Importar texto no navegador.');},
    pickColor:async function(color){if(root.__adobe_cep__)return guarded(function(){return bridge('pintaPickColor',{color:color});});throw Error('O seletor nativo está disponível no painel CEP.');},
    prepareShortcut:async function(p){if(root.__adobe_cep__)return bridge('pintaShortcut',{preset:core.validate(p),adapterPath:decodeURI(root.__adobe_cep__.getSystemPath('extension')).replace(/^file:\/\/\//,'').replace(/\/$/,'')+'/host/cep.jsx'});throw Error('A geração de comando global está disponível na edição CEP.');},
    discardCapture:async function(p){if(!p||!p.nativePreset||!/^__PKP_[a-zA-Z0-9]+$/.test(p.presetName))return;return guarded(async function(){if(ps)return ps.core.executeAsModal(async function(){await batch({_obj:'delete',_target:[{_ref:'toolPreset',_name:p.presetName}]});},{commandName:'PKP: cancelar captura'});if(root.__adobe_cep__)return bridge('pintaDiscardCapture',{presetName:p.presetName});});},
    pickImage:async function(){
      if(!uxp)throw Error('Use o seletor de imagem do formulário.');
      var file=await uxp.storage.localFileSystem.getFileForOpening({types:['png','jpg','jpeg','webp']});
      if(!file)return null;
      var bytes=new Uint8Array(await file.read({format:uxp.storage.formats.binary}));
      if(bytes.length>250000)throw Error('Escolha uma imagem de até 250 KB.');
      var alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out='';
      for(var i=0;i<bytes.length;i+=3){
        var n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);
        out+=alphabet[(n>>>18)&63]+alphabet[(n>>>12)&63]+(i+1<bytes.length?alphabet[(n>>>6)&63]:'=')+(i+2<bytes.length?alphabet[n&63]:'=');
      }
      var ext=file.name.split('.').pop().toLowerCase();return 'data:image/'+(ext==='jpg'?'jpeg':ext)+';base64,'+out;
    }
  };
}(typeof window !== 'undefined' ? window : this));
