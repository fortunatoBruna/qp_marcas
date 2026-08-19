const fs = require('fs');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const text = fs.readFileSync(process.argv[2], 'utf8');
const rows = parseCSV(text);
const header = rows[0];
const data = rows.slice(1).filter(r => r.length === header.length && r.some(v => v !== ''));

console.log('total colunas header:', header.length);
console.log('header:', header.join(' | '));
console.log('total linhas de dados:', data.length);

const idx = (name) => header.indexOf(name);

function countBy(col) {
  const i = idx(col);
  const counts = {};
  for (const r of data) {
    const v = r[i] || '(vazio)';
    counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

console.log('\n--- university_name ---');
console.log(countBy('university_name'));
console.log('\n--- level_name ---');
console.log(countBy('level_name'));
console.log('\n--- kind_name ---');
console.log(countBy('kind_name'));
console.log('\n--- origin ---');
console.log(countBy('origin'));

const enrolledIdx = idx('enrolled_at');
const dates = data.map(r => r[enrolledIdx]).filter(Boolean).sort();
console.log('\nenrolled_at min:', dates[0], 'max:', dates[dates.length - 1]);

fs.writeFileSync(process.argv[3] || 'parsed.json', JSON.stringify({ header, data }));
console.log('\nsalvo em', process.argv[3]);
