var pintaHostFile=File($.fileName);
// PINTAKOMEOPINTO: original ExtendScript ES3 adapter; no vendor runtime required.
function pintaJSON(value) {
    if (value === null) return 'null';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return '"' + value.replace(/[\\"\u0000-\u001f\u2028\u2029]/g, function(c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }) + '"';
    var parts = [], key;
    if (value instanceof Array) { for (key = 0; key < value.length; key++) parts.push(pintaJSON(value[key])); return '[' + parts.join(',') + ']'; }
    for (key in value) if (value.hasOwnProperty(key)) parts.push(pintaJSON(key) + ':' + pintaJSON(value[key]));
    return '{' + parts.join(',') + '}';
}
function pintaOptions() {
    var r = new ActionReference();
    r.putProperty(stringIDToTypeID('property'), stringIDToTypeID('tool'));
    r.putEnumerated(stringIDToTypeID('application'), stringIDToTypeID('ordinal'), stringIDToTypeID('targetEnum'));
    return executeActionGet(r);
}
function pintaNumber(d, key) {
    var id = stringIDToTypeID(key);
    try { return d.getUnitDoubleValue(id); } catch(e) { try { return d.getInteger(id); } catch(e2) { return d.getDouble(id); } }
}
function pintaNativeCapture(p){
    var sid=stringIDToTypeID,d=new ActionDescriptor(),r=new ActionReference(),current=new ActionReference();
    if(p.size!==undefined&&(!isFinite(p.size)||p.size<1||p.size>5000||!isFinite(p.opacity)||!isFinite(p.flow)))throw Error('Opções de ferramenta inválidas.');
    r.putClass(sid('toolPreset'));d.putReference(sid('null'),r);d.putString(sid('name'),p.presetName);current.putProperty(sid('property'),sid('currentToolOptions'));current.putEnumerated(sid('application'),sid('ordinal'),sid('targetEnum'));d.putReference(sid('using'),current);try{executeAction(sid('make'),d,DialogModes.NO);}catch(e){if(!p.captured)throw e;p.nativePreset=false;p.presetName='';p.presetKind='toolPreset';}return pintaJSON(p);
}
function pintaDiscardCapture(p){try{if(!p||!/^__PKP_[a-zA-Z0-9]+$/.test(p.presetName))throw Error('Preset inválido.');var sid=stringIDToTypeID,r=new ActionReference(),d=new ActionDescriptor();r.putName(sid('toolPreset'),p.presetName);d.putReference(sid('null'),r);executeAction(sid('delete'),d,DialogModes.NO);return 'OK';}catch(e){return 'ERROR: '+e.message;}}
function pintaCapture() {
    try {
        if (!app.documents.length) throw Error('Abra um documento no Photoshop.');
        var info = pintaOptions(), sid = stringIDToTypeID;
        var tool=typeIDToStringID(info.getEnumerationType(sid('tool')));
        if(tool==='eraser')tool='eraserTool';if(!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(tool))throw Error('Identificador de ferramenta inválido.');
        var options=info.getObjectValue(sid('currentToolOptions')),brush=null;try{if(tool==='paintbrushTool'){brush=options.getObjectValue(sid('brush'));pintaNumber(options,'opacity');pintaNumber(options,'flow');}}catch(unsupportedMode){brush=null;}
        var binary = options.toStream(), hex = '', i;
        for (i = 0; i < binary.length; i++) hex += ('0' + binary.charCodeAt(i).toString(16)).slice(-2);
        var captureId='captured'+new Date().getTime()+Math.floor(Math.random()*1000000),nativeName='__PKP_'+captureId;
        if(!brush){var generic={id:captureId,name:tool==='eraserTool'?'Borracha capturada':tool,type:'tool',tool:tool,captured:{runtime:'CEP',stream:hex}};if(tool==='eraserTool'){generic.nativePreset=true;generic.presetName=nativeName;generic.presetKind='toolPreset';return pintaNativeCapture(generic);}return pintaJSON(generic);}return pintaNativeCapture({id:captureId,nativePreset:true,presetName:nativeName,presetKind:'toolPreset',name:tool === 'eraserTool' ? 'Borracha capturada' : 'Pincel capturado', type:tool === 'eraserTool' ? 'eraser' : 'brush', size:pintaNumber(brush,'diameter'), opacity:pintaNumber(options,'opacity'), flow:pintaNumber(options,'flow'), color:'#' + app.foregroundColor.rgb.hexValue, captured:{runtime:'CEP',stream:hex}});
    } catch(e) { return 'ERROR: ' + e.message; }
}
function pintaApply(request) {
    function sid(v) { return stringIDToTypeID(v); }
    var stage='executar atalho';
    function select(ref) { var d = new ActionDescriptor(); d.putReference(sid('null'), ref); executeAction(sid('select'),d,DialogModes.NO); }
    try {
        var p = request.preset || request;
        if (p.type === 'label') return 'OK';
        if (!app.documents.length) throw Error('Abra um documento no Photoshop.');
        if (p.type === 'macro') { for(var step=0;step<p.steps.length;step++){var result=pintaApply({preset:p.steps[step],preserveSize:request.preserveSize});if(result!=='OK')throw Error('Passo '+(step+1)+': '+result);}return 'OK'; }
        if (p.type === 'layer') { var layer=app.activeDocument.artLayers.add();layer.name=p.layerName;layer.opacity=p.layerOpacity;var modes={normal:BlendMode.NORMAL,multiply:BlendMode.MULTIPLY,screen:BlendMode.SCREEN,overlay:BlendMode.OVERLAY,softLight:BlendMode.SOFTLIGHT,colorDodge:BlendMode.COLORDODGE,color:BlendMode.COLOR,luminosity:BlendMode.LUMINOSITY};layer.blendMode=modes[p.blendMode];if(p.clipped)layer.grouped=true;return 'OK'; }
        if (p.type === 'style') { app.activeDocument.activeLayer.applyStyle(p.styleName);return 'OK'; }
        if (p.type === 'action') { app.doAction(p.action,p.set); return 'OK'; }
        var r, d, b, toolId, size = p.size;
        if (p.type === 'menu') {
            d = new ActionDescriptor(); r = new ActionReference();
            if(p.command==='flipCanvasHorizontal'){app.activeDocument.flipCanvas(Direction.HORIZONTAL);return 'OK';}
            if (p.command === 'newLayer') { r.putClass(sid('layer')); d.putReference(sid('null'),r); executeAction(sid('make'),d,DialogModes.NO); }
            else if (p.command === 'duplicateLayer') { r.putEnumerated(sid('layer'),sid('ordinal'),sid('targetEnum')); d.putReference(sid('null'),r); executeAction(sid('duplicate'),d,DialogModes.NO); }
            else if (p.command === 'deselect') { r.putProperty(sid('channel'),sid('selection')); d.putReference(sid('null'),r); d.putEnumerated(sid('to'),sid('ordinal'),sid('none')); executeAction(sid('set'),d,DialogModes.NO); }
            else if (p.command === 'mergeVisible') executeAction(sid('mergeVisible'),d,DialogModes.NO);
            else throw Error('Comando não permitido.');
            return 'OK';
        }
        toolId='';if(p.type==='tool'){toolId=p.tool;}else if(p.type==='eraser'){toolId='eraserTool';}else if(p.type==='brush'){toolId='paintbrushTool';}if(toolId==='eraser')toolId='eraserTool';if(!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(toolId))throw Error('Ferramenta inválida.');
        if (p.captured && p.captured.runtime !== 'CEP') throw Error('Capture novamente a ferramenta no ambiente CEP.');
        if ((p.type === 'brush' || p.type === 'eraser') && request.preserveSize && !p.forceSize) size = pintaNumber(pintaOptions().getObjectValue(sid('currentToolOptions')).getObjectValue(sid('brush')),'diameter');
        stage='selecionar ferramenta '+toolId;
        r=new ActionReference();r.putClass(sid(toolId));select(r);
        var selectedInfo=pintaOptions(),actionTool=toolId,nativeFailed=false;
        if(!/^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(actionTool))throw Error('O Photoshop não identificou a ferramenta selecionada.');
        stage='selecionar predefinição salva';
        if (p.presetName) { r = new ActionReference(); r.putName(sid(p.presetKind === 'toolPreset' ? 'toolPreset' : 'brush'),p.presetName);try{select(r);var afterPreset=typeIDToStringID(pintaOptions().getEnumerationType(sid('tool')));if(afterPreset!==actionTool)throw Error('A predefinição mudou a ferramenta ativa.');}catch(presetError){if(!p.nativePreset||!p.captured)throw presetError;nativeFailed=true;app.currentTool=toolId;} }
        stage='restaurar opções capturadas';
        if (p.captured && (!p.nativePreset||nativeFailed)) {
            if (!/^(?:[a-f\d]{2}){1,200000}$/i.test(p.captured.stream)) throw Error('Captura inválida.');
            var raw = ''; for (var j = 0; j < p.captured.stream.length; j += 2) raw += String.fromCharCode(parseInt(p.captured.stream.substr(j,2),16));
            b = new ActionDescriptor(); b.fromStream(raw);
            d = new ActionDescriptor(); r = new ActionReference(); r.putClass(sid(actionTool)); d.putReference(sid('null'),r); d.putObject(sid('to'),sid('target'),b); executeAction(sid('set'),d,DialogModes.NO);
        }
        if(p.type==='tool'){if(app.currentTool!==toolId)throw Error('A ferramenta ativa não corresponde à captura.');return 'OK';}
        stage='aplicar tamanho, opacidade e flow';
        var restored=pintaOptions().getObjectValue(sid('currentToolOptions')),restoredBrush=restored.getObjectValue(sid('brush')),brushClass=restored.getObjectType(sid('brush'));
        restoredBrush.putUnitDouble(sid('diameter'),sid('pixelsUnit'),size);restored.putObject(sid('brush'),brushClass,restoredBrush);
        restored.putInteger(sid('opacity'),Math.round(p.opacity));restored.putInteger(sid('flow'),Math.round(p.flow));
        d=new ActionDescriptor();r=new ActionReference();r.putClass(sid(actionTool));d.putReference(sid('null'),r);d.putObject(sid('to'),sid('currentToolOptions'),restored);executeAction(sid('set'),d,DialogModes.NO);
        var confirmed=pintaOptions().getObjectValue(sid('currentToolOptions')),confirmedBrush=confirmed.getObjectValue(sid('brush'));
        var actualSize=pintaNumber(confirmedBrush,'diameter'),actualOpacity=pintaNumber(confirmed,'opacity'),actualFlow=pintaNumber(confirmed,'flow');
        if(Math.abs(actualSize-size)>.01||Math.abs(actualOpacity-p.opacity)>.51||Math.abs(actualFlow-p.flow)>.51)throw Error('O Photoshop não confirmou os valores. Esperado: '+size+' px / '+p.opacity+'% / '+p.flow+'%. Obtido: '+actualSize+' px / '+actualOpacity+'% / '+actualFlow+'%.');
        if (p.type === 'brush') { var c = new SolidColor(); c.rgb.red=parseInt(p.color.substr(1,2),16); c.rgb.green=parseInt(p.color.substr(3,2),16); c.rgb.blue=parseInt(p.color.substr(5,2),16); app.foregroundColor=c; }
        return 'OK';
    } catch(e) { return 'ERROR: '+stage+': ' + e.message + ' (configurações anteriores podem ter sido aplicadas)'; }
}

function pintaShortcut(request){try{var p=request.preset;if(!p||!/^[-_a-zA-Z0-9]+$/.test(p.id))throw Error('Atalho inválido.');var source=request.adapterPath?new File(request.adapterPath):pintaHostFile;source.encoding='UTF8';if(!source.open('r'))throw Error('Não foi possível ler o adaptador.');var body=source.read();source.close();var filename='PKP_'+p.id+'.jsx',folder=new Folder(app.path.fsName+'/Presets/Scripts'),target=new File(folder.fsName+'/'+filename),installed=true;target.encoding='UTF8';if(!target.open('w')){installed=false;folder=new Folder(Folder.myDocuments.fsName+'/PKP-Atalhos');if(!folder.exists&&!folder.create())throw Error('Sem permissão para criar a pasta de atalhos.');target=new File(folder.fsName+'/'+filename);target.encoding='UTF8';if(!target.open('w'))throw Error('Sem permissão para salvar o comando.');}target.write(body+'\nvar pkpResult=pintaApply('+pintaJSON({preset:p})+');if(pkpResult!=="OK")alert(pkpResult);');target.close();return pintaJSON({path:target.fsName,installed:installed,name:'PKP_'+p.id});}catch(e){return 'ERROR: '+e.message;}}


function pintaPickColor(request){var original=app.foregroundColor;try{if(!/^#[a-f\d]{6}$/i.test(request.color))throw Error('Cor inválida.');var c=new SolidColor();c.rgb.hexValue=request.color.substr(1);app.foregroundColor=c;if(!app.showColorPicker())return 'null';return pintaJSON('#'+app.foregroundColor.rgb.hexValue);}catch(e){return 'ERROR: '+e.message;}finally{app.foregroundColor=original;}}
function pintaBackupSave(request){try{if(typeof request.data!=='string'||request.data.length>7000000)throw Error('Backup inválido.');var file=File.saveDialog('Salvar backup do PKP','JSON:*.json');if(!file)return 'null';if(!/\.json$/i.test(file.name))file=new File(file.fsName+'.json');file.encoding='UTF8';if(!file.open('w'))throw Error('Não foi possível gravar o backup.');try{if(!file.write(request.data))throw Error('Falha ao gravar backup.');}finally{file.close();}return pintaJSON({name:file.name});}catch(e){return 'ERROR: '+e.message;}}
function pintaBackupRead(){try{var file=File.openDialog('Restaurar backup do PKP','JSON:*.json',false);if(!file)return 'null';if(file.length>28000000)throw Error('Arquivo de backup muito grande.');file.encoding='UTF8';if(!file.open('r'))throw Error('Não foi possível ler o backup.');var raw;try{raw=file.read();}finally{file.close();}if(raw.length>7000000)throw Error('Backup muito grande.');return pintaJSON({data:raw.replace(/^\uFEFF/,''),name:file.name});}catch(e){return 'ERROR: '+e.message;}}
