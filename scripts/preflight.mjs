import fs from 'node:fs';
const required=['index.html','admin.html','netlify.toml','package.json','src/main.js','src/admin.js','src/styles.css','lib/bank.mjs','server-data/practical-bank.json','server-data/source-manifest.json','server-data/academic-import-template.json'];
let ok=true;
for(const f of required){if(!fs.existsSync(f)){console.error('MISSING',f);ok=false}}
const p=JSON.parse(fs.readFileSync('server-data/practical-bank.json','utf8'));
const m=JSON.parse(fs.readFileSync('server-data/source-manifest.json','utf8'));
console.log('Practical seed items:',p.items?.length||0);
console.log('Official source groups:',m.sources?.length||0);
console.log('Official corrections:',m.corrections?.length||0);
if(fs.existsSync('server-data/demo-academic.json')){console.error('Unexpected demo-academic.json exists');ok=false}
if(!ok)process.exit(1);
console.log('Preflight OK');
