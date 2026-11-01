// PINTACOMEUPINTO: original ExtendScript ES3 adapter; no vendor runtime required.
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
function pintaCapture() {
    try {
        if (!app.documents.length) throw Error('Abra um documento no Photoshop.');
        var info = pintaOptions(), sid = stringIDToTypeID;
        var tool = typeIDToStringID(info.getEnumerationType(sid('tool')));
        if (tool !== 'paintbrushTool' && tool !== 'eraser') throw Error('Selecione o pincel ou a borracha antes de capturar.');
        var options = info.getObjectValue(sid('currentToolOptions')), brush = options.getObjectValue(sid('brush'));
        var binary = options.toStream(), hex = '', i;
        for (i = 0; i < binary.length; i++) hex += ('0' + binary.charCodeAt(i).toString(16)).slice(-2);
        return pintaJSON({id:'captured' + new Date().getTime(), name:tool === 'eraser' ? 'Borracha capturada' : 'Pincel capturado', type:tool === 'eraser' ? 'eraser' : 'brush', size:pintaNumber(brush,'diameter'), opacity:pintaNumber(options,'opacity'), flow:pintaNumber(options,'flow'), color:'#' + app.foregroundColor.rgb.hexValue, captured:{runtime:'CEP',stream:hex}});
    } catch(e) { return 'ERROR: ' + e.message; }
}
function pintaApply(request) {
    function sid(v) { return stringIDToTypeID(v); }
    function select(ref) { var d = new ActionDescriptor(); d.putReference(sid('null'), ref); executeAction(sid('select'),d,DialogModes.NO); }
    try {
        var p = request.preset || request;
        if (p.type === 'label') return 'OK';
        if (!app.documents.length) throw Error('Abra um documento no Photoshop.');
        if (p.type === 'action') { app.doAction(p.action,p.set); return 'OK'; }
        var r, d, b, tool, size = p.size;
        if (p.type === 'menu') {
            d = new ActionDescriptor(); r = new ActionReference();
            if (p.command === 'newLayer') { r.putClass(sid('layer')); d.putReference(sid('null'),r); executeAction(sid('make'),d,DialogModes.NO); }
            else if (p.command === 'duplicateLayer') { r.putEnumerated(sid('layer'),sid('ordinal'),sid('targetEnum')); d.putReference(sid('null'),r); executeAction(sid('duplicate'),d,DialogModes.NO); }
            else if (p.command === 'deselect') { r.putProperty(sid('channel'),sid('selection')); d.putReference(sid('null'),r); d.putEnumerated(sid('to'),sid('ordinal'),sid('none')); executeAction(sid('set'),d,DialogModes.NO); }
            else if (p.command === 'mergeVisible') executeAction(sid('mergeVisible'),d,DialogModes.NO);
            else throw Error('Comando não permitido.');
            return 'OK';
        }
        var allowed = ['paintbrushTool','eraser','pencilTool','cloneStampTool','smudgeTool','blurTool','dodgeTool','burnInTool','eyedropperTool','moveTool','lassoTool'];
        tool = p.type === 'tool' ? p.tool : p.type === 'eraser' ? 'eraser' : p.type === 'brush' ? 'paintbrushTool' : '';
        var found = false; for (var a = 0; a < allowed.length; a++) if (allowed[a] === tool) found = true;
        if (!found) throw Error('Ferramenta inválida.');
        if (p.captured && p.captured.runtime !== 'CEP') throw Error('Capture novamente a ferramenta no ambiente CEP.');
        if ((p.type === 'brush' || p.type === 'eraser') && request.preserveSize && !p.forceSize) size = pintaNumber(pintaOptions().getObjectValue(sid('currentToolOptions')).getObjectValue(sid('brush')),'diameter');
        r = new ActionReference(); r.putClass(sid(tool)); select(r);
        if (p.type === 'tool') return 'OK';
        if (p.presetName) { r = new ActionReference(); r.putName(sid(p.presetKind === 'toolPreset' ? 'toolPreset' : 'brush'),p.presetName); select(r); }
        if (p.captured) {
            if (!/^(?:[a-f\d]{2}){1,200000}$/i.test(p.captured.stream)) throw Error('Captura inválida.');
            var raw = ''; for (var j = 0; j < p.captured.stream.length; j += 2) raw += String.fromCharCode(parseInt(p.captured.stream.substr(j,2),16));
            b = new ActionDescriptor(); b.fromStream(raw);
            d = new ActionDescriptor(); r = new ActionReference(); r.putClass(sid(tool)); d.putReference(sid('null'),r); d.putObject(sid('to'),sid('currentToolOptions'),b); executeAction(sid('set'),d,DialogModes.NO);
        }
        d = new ActionDescriptor(); r = new ActionReference(); r.putEnumerated(sid('brush'),sid('ordinal'),sid('targetEnum')); d.putReference(sid('null'),r);
        b = new ActionDescriptor(); b.putUnitDouble(sid('diameter'),sid('pixelsUnit'),size); d.putObject(sid('to'),sid('brush'),b); executeAction(sid('set'),d,DialogModes.NO);
        d = new ActionDescriptor(); r = new ActionReference(); r.putClass(sid(tool)); d.putReference(sid('null'),r);
        b = new ActionDescriptor(); b.putUnitDouble(sid('opacity'),sid('percentUnit'),p.opacity); b.putUnitDouble(sid('flow'),sid('percentUnit'),p.flow); d.putObject(sid('to'),sid('null'),b); executeAction(sid('set'),d,DialogModes.NO);
        if (p.type === 'brush') { var c = new SolidColor(); c.rgb.red=parseInt(p.color.substr(1,2),16); c.rgb.green=parseInt(p.color.substr(3,2),16); c.rgb.blue=parseInt(p.color.substr(5,2),16); app.foregroundColor=c; }
        return 'OK';
    } catch(e) { return 'ERROR: ' + e.message + ' (configurações anteriores podem ter sido aplicadas)'; }
}
