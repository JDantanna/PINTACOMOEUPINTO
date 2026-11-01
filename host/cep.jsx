// ExtendScript ES3: no dependency on JSON or CSInterface.js.
function pintaApply(p) {
  function sid(v) { return stringIDToTypeID(v); }
  try {
    if (!app.documents.length) throw Error('Abra um documento no Photoshop.');
    if (p.type === 'action') { app.doAction(p.action, p.set); return 'OK'; }
    if (p.type !== 'brush' && p.type !== 'eraser') throw Error('Tipo inválido.');
    var tool = p.type === 'eraser' ? 'eraser' : 'paintbrushTool';
    var d = new ActionDescriptor(), r = new ActionReference();
    r.putClass(sid(tool)); d.putReference(sid('null'), r); executeAction(sid('select'), d, DialogModes.NO);
    d = new ActionDescriptor(); r = new ActionReference();
    r.putEnumerated(sid('brush'),sid('ordinal'),sid('targetEnum')); d.putReference(sid('null'),r);
    var b = new ActionDescriptor(); b.putUnitDouble(sid('diameter'),sid('pixelsUnit'),p.size); d.putObject(sid('to'),sid('brush'),b); executeAction(sid('set'),d,DialogModes.NO);
    d = new ActionDescriptor(); r = new ActionReference(); r.putClass(sid(tool)); d.putReference(sid('null'),r);
    b = new ActionDescriptor(); b.putUnitDouble(sid('opacity'),sid('percentUnit'),p.opacity); b.putUnitDouble(sid('flow'),sid('percentUnit'),p.flow); d.putObject(sid('to'),sid('null'),b); executeAction(sid('set'),d,DialogModes.NO);
    if(p.type === 'brush') { var c=new SolidColor(); c.rgb.red=parseInt(p.color.substr(1,2),16); c.rgb.green=parseInt(p.color.substr(3,2),16); c.rgb.blue=parseInt(p.color.substr(5,2),16); app.foregroundColor=c; }
    return 'OK';
  } catch(e) { return 'ERROR: '+e.message+' (algumas configurações podem ter sido aplicadas)'; }
}
