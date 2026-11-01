(function(root) {
  'use strict';
  var ps=null;
  if (!root.__adobe_cep__ && typeof require==='function') { try { ps=require('photoshop'); } catch(e) {} }
  root.PintaHost={mode:ps?'UXP':root.__adobe_cep__?'CEP':'DEMONSTRAÇÃO',apply:async function(p) {
    p=root.PintaCore.validate(p);
    if(ps) {
      if(!ps.app.documents.length) throw Error('Abra um documento no Photoshop.');
      await ps.core.executeAsModal(async function(){
        var cmds=root.PintaCore.commands(p);
        for(var i=0;i<cmds.length;i++) {
          var result=await ps.action.batchPlay([cmds[i]],{});
          if(!result || !result[0] || result[0]._obj==='error') throw Error(result && result[0] && result[0].message || 'O Photoshop não confirmou o comando.');
        }
      },{commandName:'Pinta: '+p.name});
      return;
    }
    if(root.__adobe_cep__) return new Promise(function(resolve,reject){
      var timer=setTimeout(function(){reject(Error('Photoshop não respondeu. Verifique o aplicativo antes de tentar novamente.'));},30000);
      var payload=JSON.stringify(p).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      root.__adobe_cep__.evalScript('pintaApply('+payload+')',function(result){clearTimeout(timer); if(result==='OK') resolve(); else reject(Error(result || 'Falha no ExtendScript.'));});
    });
    root.PintaHost.last=p;
  }};
}(this));
