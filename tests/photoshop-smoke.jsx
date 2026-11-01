// Run through File > Scripts > Browse. Uses only a temporary test document.
(function () {
  var dir=File($.fileName).parent.parent;
  var output=File(dir.fsName+'/photoshop-smoke-result.txt'),lines=['Photoshop '+app.version],doc=null;
  var originalDoc=app.documents.length?app.activeDocument:null,originalTool=app.currentTool,originalColor=app.foregroundColor;
  var snapshots={};
  function s(v){return stringIDToTypeID(v);}
  function options(){var r=new ActionReference();r.putProperty(s('property'),s('tool'));r.putEnumerated(s('application'),s('ordinal'),s('targetEnum'));return executeActionGet(r).getObjectValue(s('currentToolOptions'));}
  function select(tool){var r=new ActionReference(),d=new ActionDescriptor();r.putClass(s(tool));d.putReference(s('null'),r);executeAction(s('select'),d,DialogModes.NO);}
  function readNumber(d,k){try{return d.getUnitDoubleValue(s(k));}catch(e){try{return d.getInteger(s(k));}catch(e2){return d.getDouble(s(k));}}}
  function check(p){var result=pintaApply(p);lines.push(p.type+': '+result);if(result!=='OK')throw Error(result);var o=options(),b=o.getObjectValue(s('brush'));var actual=[readNumber(b,'diameter'),readNumber(o,'opacity'),readNumber(o,'flow')];lines.push('Readback: '+actual.join(', '));if(Math.abs(actual[0]-p.size)>.01||Math.abs(actual[1]-p.opacity)>.51||Math.abs(actual[2]-p.flow)>.51)throw Error('Readback mismatch');if(p.type==='brush'){var rgb=app.foregroundColor.rgb;lines.push('RGB: '+rgb.red+', '+rgb.green+', '+rgb.blue);if(Math.abs(rgb.red-51)>1||Math.abs(rgb.green-102)>1||Math.abs(rgb.blue-153)>1)throw Error('RGB mismatch');}}
  try{
    $.evalFile(File(dir.fsName+'/host/cep.jsx'));
    doc=app.documents.add(64,64,72,'Pinta temporary smoke test',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    select('paintbrushTool');snapshots.paintbrushTool=options();
    select('eraser');snapshots.eraser=options();
    check({type:'brush',size:37,opacity:42,flow:23,color:'#336699'});
    var c=app.foregroundColor.rgb.hexValue;
    check({type:'eraser',size:51,opacity:67,flow:31,color:'#000000'});
    if(app.foregroundColor.rgb.hexValue!==c)throw Error('Eraser changed color');
    lines.push('PASS: tool properties and color readback. Panel runtime and action playback NOT tested.');
  }catch(e){lines.push('FAIL: '+e.message);}
  finally{
    for(var key in snapshots){try{select(key);var r=new ActionReference(),d=new ActionDescriptor();r.putClass(s(key));d.putReference(s('null'),r);d.putObject(s('to'),s('currentToolOptions'),snapshots[key]);executeAction(s('set'),d,DialogModes.NO);}catch(e){lines.push('Restore warning: '+e.message);}}
    try{app.currentTool=originalTool;app.foregroundColor=originalColor;}catch(e){lines.push('Restore original tool warning: '+e.message);}
    if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);
    if(originalDoc)app.activeDocument=originalDoc;
    output.encoding='UTF8';output.open('w');output.write(lines.join('\n'));output.close();
  }
}());
