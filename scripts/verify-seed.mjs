import fs from 'node:fs';
for (const name of ['server-data/demo-academic.json','server-data/practical-bank.json','server-data/source-manifest.json']) {
  const d=JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
  console.log(name,'OK',d.count ?? d.sources?.length ?? '');
}
const demo=JSON.parse(fs.readFileSync(new URL('../server-data/demo-academic.json',import.meta.url),'utf8'));
let errors=0;
for(const q of demo.items){if(Object.keys(q.options||{}).length!==4||!q.acceptedAnswers?.length)errors++;}
console.log('demo integrity errors',errors); if(errors)process.exit(1);
