// Substitui o bloco <script id="dash-data" type="application/json">...</script>
// pelo conteúdo de um novo agg.json, mantendo todo o resto do HTML intacto.
const fs = require('fs');
const [, , htmlPath, aggPath] = process.argv;

const html = fs.readFileSync(htmlPath, 'utf8');
const data = fs.readFileSync(aggPath, 'utf8').replace(/<\/script/gi, '<\\/script');

const re = /(<script id="dash-data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!re.test(html)) {
  console.error('Bloco dash-data não encontrado em', htmlPath);
  process.exit(1);
}
const out = html.replace(re, `$1\n${data}\n$2`);
fs.writeFileSync(htmlPath, out);
console.log('OK: dados injetados em', htmlPath);
