// Substitui o bloco <script id="{scriptId}" type="application/json">...</script>
// pelo conteudo de um novo json, mantendo todo o resto do HTML intacto.
// Uso: node 3-inject.cjs painel-quero-pago.html agg-sem-painel.json dash-data-sem-painel
const fs = require('fs');
const [, , htmlPath, jsonPath, scriptId] = process.argv;
const id = scriptId || 'dash-data';

const html = fs.readFileSync(htmlPath, 'utf8');
const data = fs.readFileSync(jsonPath, 'utf8').replace(/<\/script/gi, '<\\/script');

const re = new RegExp(`(<script id="${id}" type="application/json">)[\\s\\S]*?(<\\/script>)`);
if (!re.test(html)) {
  console.error(`Bloco #${id} não encontrado em`, htmlPath);
  process.exit(1);
}
const out = html.replace(re, `$1\n${data}\n$2`);
fs.writeFileSync(htmlPath, out);
console.log(`OK: dados injetados em #${id} de`, htmlPath);
