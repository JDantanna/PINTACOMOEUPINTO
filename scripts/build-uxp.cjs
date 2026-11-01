const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'dist', 'photoshop2024', 'PINTAKOMEOPINTO');
const files = ['manifest.json', 'index.html', 'style.css', 'icon.svg', 'src/core.js', 'src/host.js', 'src/ui.js'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.host.app !== 'PS' || manifest.main !== 'index.html') throw Error('Manifesto Photoshop inválido.');
for (const file of files) {
  const destination = path.join(target, file);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(path.join(root, file), destination);
}
if(fs.existsSync(path.join(root,'icons')))fs.cpSync(path.join(root,'icons'),path.join(target,'icons'),{recursive:true});
console.log(target);
console.log(`${files.length} arquivos UXP preparados. CEP e arquivos de teste não entram na instalação UXP.`);
