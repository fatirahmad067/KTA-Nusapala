const fs=require('fs');
const path=require('path');
const PUB=path.join(__dirname,'..','public');
const ROOT=path.join(__dirname,'..');
const vm=require('vm');
const files=['admin.html','registrasi.html','index.html','cuaca-gunung.html'];
let bad=0;
process.on('exit',()=>{});
files.forEach(f=>{
  const raw=fs.readFileSync(PUB+'/'+f,'utf8');
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m,i=0;
  while((m=re.exec(raw))!==null){
    if(/src\s*=/i.test(m[1])) continue;
    i++;
    try{ new vm.Script(m[2], {filename:`${f}#script${i}`}); }
    catch(e){ bad++; console.log(`❌ ${f} script#${i}: ${e.message}`); }
  }
  console.log(`  ${f}: ${i} blok inline script diperiksa`);
});
// api/kartu.js
try{ require(path.join(ROOT,'api','kartu.js')); }catch(e){
  if(e.code==='MODULE_NOT_FOUND') console.log('  api/kartu.js: butuh @supabase (dilewati)');
  else { bad++; console.log('❌ api/kartu.js:', e.message); }
}
console.log(bad? `\n${bad} ERROR SINTAKS` : '\n✅ Semua sintaks JS valid');
process.exit(bad?1:0);
