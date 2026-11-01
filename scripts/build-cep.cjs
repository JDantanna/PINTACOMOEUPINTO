const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),dest=path.join(root,'dist','photoshop2024','PINTAKOMEOPINTO-CEP');
for(const file of ['index.html','style.css','icon.svg','src/core.js','src/host.js','src/ui.js','src/updater.js','host/cep.jsx','CSXS/manifest.xml']){
 const out=path.join(dest,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,file),out);
}
if(fs.existsSync(path.join(root,'icons')))fs.cpSync(path.join(root,'icons'),path.join(dest,'icons'),{recursive:true});
console.log(dest);
