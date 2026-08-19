const fs = require('fs');
const { header, data } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const idx = (name) => header.indexOf(name);

const iUniv = idx('university_name');
const iKind = idx('parent_kind_name');
const iLevel = idx('parent_level_name');
const iValorCheio = idx('valor_cheio');
const iValorVenc = idx('valor_no_vencimento');
const iBillType = idx('bill_type');
const iStatus = idx('billing_status');

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function groupCount(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const out = {};

out.total = data.length;
out.byUniversity = groupCount(data, r => r[iUniv] || '(vazio)');
out.byModalidade = groupCount(data, r => r[iKind] || '(vazio)');
out.byNivel = groupCount(data, r => r[iLevel] || '(vazio)');
out.byBillType = groupCount(data, r => r[iBillType] || '(vazio)');
out.byStatus = groupCount(data, r => r[iStatus] || '(vazio)');

const totalValorCheio = data.reduce((s, r) => s + num(r[iValorCheio]), 0);
const totalValorVencimento = data.reduce((s, r) => s + num(r[iValorVenc]), 0);
out.financeiro = {
  totalValorCheio,
  totalValorVencimento,
  ticketMedioCheio: data.length ? totalValorCheio / data.length : 0,
  ticketMedioVencimento: data.length ? totalValorVencimento / data.length : 0,
};

out.meta = {
  dataset: 'aptos_rematricula',
  generatedAt: new Date().toISOString(),
  sourceSheetUrl: 'https://docs.google.com/spreadsheets/d/175ofeL64-b0G7hlYKqIBkmyN7aYisozAV72v_qykTAM/edit?usp=sharing',
  rowCount: data.length,
};

fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log('OK, linhas:', data.length);
