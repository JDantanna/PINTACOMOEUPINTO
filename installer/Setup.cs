using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Drawing;
using Microsoft.Win32;
using System.Diagnostics;

class Setup : Form {
 const string Version="0.13.0";
 Label status; Button install; CheckBox consent; ProgressBar progress;
 static Dictionary<string,byte[]> Payload(){
  var result=new Dictionary<string,byte[]>(StringComparer.OrdinalIgnoreCase);
  using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
  using(var zip=new ZipArchive(stream,ZipArchiveMode.Read)) foreach(var e in zip.Entries){
   string name=e.FullName.Replace('\\','/');if(name.EndsWith("/"))continue;
   if(name.StartsWith("/")||name.Contains(":")||name.Contains(".."))throw new Exception("Pacote inválido.");
   using(var input=e.Open())using(var output=new MemoryStream()){input.CopyTo(output);result.Add(name,output.ToArray());}
  }
  using(var input=new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream("checksums.txt"))){string line;int count=0;while((line=input.ReadLine())!=null){int sep=line.IndexOf(' ');string name=line.Substring(sep+1);if(!result.ContainsKey(name)||Hash(result[name])!=line.Substring(0,sep))throw new Exception("Falha na conferência do pacote.");count++;}if(count!=result.Count)throw new Exception("Pacote incompleto.");}
  string xml=System.Text.Encoding.UTF8.GetString(result["CSXS/manifest.xml"]);if(!xml.Contains("ExtensionBundleId=\"br.pinta.panel.cep\"")||!xml.Contains("ExtensionBundleVersion=\""+Version+"\""))throw new Exception("Identidade inválida.");return result;
 }
 static string Hash(byte[] data){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(data)).Replace("-","").ToLowerInvariant();}
 static void CheckPath(string path){for(var d=new DirectoryInfo(path);d!=null;d=d.Parent)if(d.Exists&&(d.Attributes&FileAttributes.ReparsePoint)!=0)throw new Exception("A pasta de destino contém um redirecionamento. Instalação interrompida.");}
 static void Copy(Dictionary<string,byte[]> files,string target,Action<int> update){
  CheckPath(target);var originals=new Dictionary<string,byte[]>();var written=new List<string>();
  string manifest=Path.Combine(target,"CSXS","manifest.xml");if(File.Exists(manifest)&&!File.ReadAllText(manifest).Contains("ExtensionBundleId=\"br.pinta.panel.cep\""))throw new Exception("A pasta de destino pertence a outra extensão.");
  try{int index=0;foreach(var f in files){string dest=Path.GetFullPath(Path.Combine(target,f.Key.Replace('/',Path.DirectorySeparatorChar)));if(!dest.StartsWith(Path.GetFullPath(target)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Destino inválido.");CheckPath(Path.GetDirectoryName(dest));if(File.Exists(dest)&&(File.GetAttributes(dest)&FileAttributes.ReparsePoint)!=0)throw new Exception("Arquivo redirecionado.");originals[dest]=File.Exists(dest)?File.ReadAllBytes(dest):null;Directory.CreateDirectory(Path.GetDirectoryName(dest));written.Add(dest);File.WriteAllBytes(dest,f.Value);if(Hash(File.ReadAllBytes(dest))!=Hash(f.Value))throw new Exception("Falha ao verificar arquivo instalado.");update(++index*100/files.Count);}}
  catch{foreach(string dest in written){try{if(originals[dest]==null)File.Delete(dest);else File.WriteAllBytes(dest,originals[dest]);}catch{}}throw;}
 }
 Setup(){
  Text="Instalar PKP";ClientSize=new Size(510,365);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;Font=new Font("Segoe UI",10);BackColor=Color.FromArgb(43,43,43);ForeColor=Color.White;
  var title=new Label{Text="PKP — O amigo do Artistinha",Left=24,Top=24,Width=465,Height=35,Font=new Font("Segoe UI",17,FontStyle.Bold)};Controls.Add(title);
  Controls.Add(new Label{Text="Instalador para Windows • versão "+Version,Left=26,Top=66,Width=460,Height=25,ForeColor=Color.Silver});
  Controls.Add(new Label{Text="Instala o painel automaticamente para seu usuário.\nSeus botões e configurações salvos são preservados.\nPhotoshop 2020–2024; validado no Photoshop 2024.",Left=26,Top=106,Width=460,Height=70});
  consent=new CheckBox{Text="Permitir extensões locais não assinadas no Photoshop\n(necessário para carregar esta edição do PKP).",Left=26,Top=184,Width=460,Height=48};Controls.Add(consent);
  progress=new ProgressBar{Left=26,Top=244,Width=458,Height=10};Controls.Add(progress);
  status=new Label{Text="Pronto para instalar. Nenhuma pasta precisa ser escolhida.",Left=26,Top=264,Width=458,Height=42};Controls.Add(status);
  install=new Button{Text="Instalar PKP",Left=345,Top=316,Width=139,Height=32,Enabled=false,BackColor=Color.FromArgb(40,110,180),FlatStyle=FlatStyle.Flat};install.Click+=Install;Controls.Add(install);
  var close=new Button{Text="Fechar",Left=234,Top=316,Width=100,Height=32,FlatStyle=FlatStyle.Flat};close.Click+=(s,e)=>Close();Controls.Add(close);consent.CheckedChanged+=(s,e)=>install.Enabled=consent.Checked;
 }
 void Install(object sender,EventArgs args){
  install.Enabled=false;consent.Enabled=false;
  var previous=new Dictionary<string,object>();var kinds=new Dictionary<string,RegistryValueKind>();
  try{
   var payload=Payload();string target=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"Adobe","CEP","extensions","br.pinta.panel.cep");
   // User consent is collected above. Preserve registry values for failure recovery.
   for(int i=9;i<=12;i++){string key="Software\\Adobe\\CSXS."+i;using(var k=Registry.CurrentUser.CreateSubKey(key)){object old=k.GetValue("PlayerDebugMode");previous[key]=old;if(old!=null)kinds[key]=k.GetValueKind("PlayerDebugMode");k.SetValue("PlayerDebugMode","1",RegistryValueKind.String);}}
   Copy(payload,target,p=>{progress.Value=p;progress.Refresh();});
   status.Text="Instalação concluída. Reinicie o Photoshop e abra:\nJanela → Extensões (legado) → PKP.";install.Text="Instalado";
  }catch(Exception e){foreach(var pair in previous){try{using(var k=Registry.CurrentUser.CreateSubKey(pair.Key)){if(pair.Value==null)k.DeleteValue("PlayerDebugMode",false);else k.SetValue("PlayerDebugMode",pair.Value,kinds[pair.Key]);}}catch{}}status.Text="Não foi possível instalar. Tente novamente.";MessageBox.Show(e.Message,"Instalação do PKP",MessageBoxButtons.OK,MessageBoxIcon.Error);consent.Enabled=true;install.Enabled=consent.Checked;}
 }
 [STAThread] static int Main(string[] args){
  if(args.Length==1&&args[0]=="/verify"){
   string temp=Path.Combine(Path.GetTempPath(),"PKP-Setup-Test-"+Guid.NewGuid().ToString("N"));
   try{var payload=Payload();Copy(payload,temp,p=>{});Copy(payload,temp,p=>{});File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"setup-validation.txt"),"PASS: "+payload.Count+" arquivos extraídos, instalados e reinstalados com hashes conferidos. Registro e Photoshop não alterados.");return 0;}catch(Exception e){File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"setup-validation.txt"),"FAIL: "+e);return 1;}finally{if(Directory.Exists(temp))Directory.Delete(temp,true);}
  }
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Setup());return 0;
 }
}
