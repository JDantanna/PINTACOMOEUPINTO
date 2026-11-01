const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('CEP restores full typed brush options, confirms scalars, and rejects a silent Photoshop mismatch',()=>{
 let state={tip:'brush-A',diameter:37,opacity:42,flow:23},native={},events=[],ignoreWrites=false,failSelect=false,allowStream=false,selectedTool='paintbrushTool';
 function Ref(){};Ref.prototype.putProperty=function(c,k){this.property=k;};Ref.prototype.putEnumerated=function(c,t,v){this.className=c;};Ref.prototype.putClass=function(c){this.className=c;};Ref.prototype.putName=function(c,n){this.className=c;this.name=n;};
 function Desc(){};Desc.prototype.putReference=function(k,v){this[k]=v;};Desc.prototype.putString=function(k,v){this[k]=v;};Desc.prototype.putObject=function(k,c,v){this[k]=v;this[k+'Class']=c;};Desc.prototype.putUnitDouble=function(k,u,v){this[k]=v;};Desc.prototype.putInteger=function(k,v){this[k]=v;};Desc.prototype.fromStream=function(){throw Error('Native snapshot must not be overwritten');};Desc.prototype.getObjectValue=function(k){return this[k];};Desc.prototype.getObjectType=function(k){return this[k+'Class'];};Desc.prototype.getUnitDoubleValue=function(k){if(typeof this[k]!=='number')throw Error('Missing number');return this[k];};Desc.prototype.toStream=function(){return '\u0001\u0002';};
 function options(){const o=new Desc(),b=new Desc();b.diameter=state.diameter;b.spacing=14;o.brush=b;o.brushClass='sampledBrush';o.opacity=state.opacity;o.flow=state.flow;return o;}
 const context={File:function(){return {};},$:{fileName:'host/cep.jsx'},stringIDToTypeID:x=>x,typeIDToStringID:x=>x,ActionReference:Ref,ActionDescriptor:Desc,DialogModes:{NO:0},SolidColor:function(){this.rgb={};},app:{documents:[{}],foregroundColor:{rgb:{hexValue:'336699'}}},executeActionGet:()=>({getEnumerationType:()=> 'paintbrushTool',getObjectValue:()=>options()}),executeAction:(event,d)=>{
 events.push(event);
 if(event==='make'){assert.equal(d.using.property,'currentToolOptions');native[d.name]={...state};}
 if(event==='select'&&d.null.className==='toolPreset'){if(!native[d.null.name])throw Error('Preset ausente');state={...native[d.null.name]};}
 if(event==='set'){assert.equal(d.to.brushClass,'sampledBrush');assert.equal(d.to.brush.spacing,14);if(!ignoreWrites){state.diameter=d.to.brush.diameter;state.opacity=d.to.opacity;state.flow=d.to.flow;}}
 }};
 Object.defineProperty(context.app,'currentTool',{get:()=>selectedTool,set:value=>{selectedTool=value;},configurable:true});
 context.executeActionGet=()=>({getEnumerationType:()=>selectedTool,getObjectValue:()=>options()});
 const originalAction=context.executeAction;
 context.executeAction=(event,d)=>{
  if(event==='select'&&d.null.className!=='toolPreset'){if(failSelect)throw Error('Select ferramenta indisponível');selectedTool=d.null.className;return;}
  if(event==='set')assert.equal(d.null.className,selectedTool);
  return originalAction(event,d);
 };
 Desc.prototype.fromStream=function(raw){assert.equal(allowStream,true);assert.equal(raw,'\u0001\u0002');Object.assign(this,options());};
 vm.runInNewContext(fs.readFileSync('host/cep.jsx','utf8'),context);
 const p=JSON.parse(context.pintaCapture());assert.equal(p.nativePreset,true);assert.equal(p.size,37);
 state={tip:'brush-B',diameter:200,opacity:100,flow:100};events=[];
 assert.equal(context.pintaApply({preset:p}),'OK');assert.deepEqual(state,{tip:'brush-A',diameter:37,opacity:42,flow:23});assert.deepEqual(events,['select','set']);
 ignoreWrites=true;assert.match(context.pintaApply({preset:{...p,size:88,opacity:61,flow:17}}),/Esperado: 88 px \/ 61% \/ 17%.*Obtido: 37 px \/ 42% \/ 23%/);
 delete native[p.presetName];events=[];assert.match(context.pintaApply({preset:{...p,captured:undefined}}),/selecionar predefinição salva: Preset ausente/);assert.deepEqual(events,['select']);
 ignoreWrites=false;allowStream=true;events=[];
 assert.equal(context.pintaApply({preset:{...p,type:'eraser',size:19,opacity:68,flow:31}}),'OK');
 assert.equal(selectedTool,'eraserTool');assert.equal(state.diameter,19);assert.equal(state.opacity,68);assert.equal(state.flow,31);
 assert.deepEqual(events,['select','set','set']);
 failSelect=true;
 assert.match(context.pintaApply({preset:{...p,type:'eraser'}}),/selecionar ferramenta eraserTool: Select ferramenta indisponível/);
});

