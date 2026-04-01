const fs = require('fs');
const file = process.argv[2];
if (!file) { console.log('Usage: node fix-bom.js <filepath>'); process.exit(1); }
const buf = fs.readFileSync(file);
const content = buf.toString('utf8').replace(/^\uFEFF/, '');
fs.writeFileSync(file, content, { encoding: 'utf8' });
console.log('BOM removed from', file);
