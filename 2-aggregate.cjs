const fs = require('fs');
const { header, data } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const idx = (name) => header.indexOf(name);

const iUniv = idx('university_name');
const iLevel = idx('level_name');
const iEnrolled = idx('enrolled_at');
const iCourse = idx('course_name');
const iCampusState = idx('campus_state');
const iCampusName = idx('campus_name');
const iValorSem = idx('valor_sem_desconto');
const iValorCom = idx('valor_com_desconto');
const iOrigin = idx('origin');
const iSemester = idx('enrollment_semester');

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
out.byLevel = groupCount(data, r => r[iLevel] || '(vazio)');
out.byCampusState = groupCount(data, r => {
  const v = (r[iCampusState] || '').trim();
  if (!v || v.toLowerCase() === 'nan') return 'Não informado / EaD';
  return v;
});

// top 8 estados reais (excluindo o bucket "não informado/EaD"), resto agregado em "Outros estados" - nunca dropar em silêncio
{
  const semEad = out.byCampusState.filter(([k]) => k !== 'Não informado / EaD');
  const naoInformado = out.byCampusState.find(([k]) => k === 'Não informado / EaD');
  const top = semEad.slice(0, 8);
  const restoSum = semEad.slice(8).reduce((s, [, v]) => s + v, 0);
  out.geoTop = { top, outrosEstados: restoSum, naoInformadoEad: naoInformado ? naoInformado[1] : 0 };
}
out.byOrigin = groupCount(data, r => r[iOrigin] || '(vazio)');

// nivel simplificado grad vs pos (checar pós ANTES de gradua, pq "pós-graduação" contém "graduação")
function nivelSimplificado(levelName) {
  const l = (levelName || '').toLowerCase();
  if (l.includes('pós') || l.includes('pos-gradua') || l.includes('mba') || l.includes('especializa')) return 'Pós-graduação';
  if (l.includes('gradua') || l.includes('bacharel') || l.includes('tecnólogo') || l.includes('tecnologo') || l.includes('licenciatura')) return 'Graduação';
  return 'Outro';
}
out.byNivelSimplificado = groupCount(data, r => nivelSimplificado(r[iLevel]));

// por ano de matricula
out.byYear = groupCount(data, r => {
  const d = r[iEnrolled];
  if (!d) return '(sem data)';
  return d.slice(0, 4);
}).sort((a, b) => a[0].localeCompare(b[0]));

// por mes (ultimos 24 meses) para tendencia
out.byMonth = groupCount(data, r => {
  const d = r[iEnrolled];
  if (!d) return '(sem data)';
  return d.slice(0, 7); // YYYY-MM
}).sort((a, b) => a[0].localeCompare(b[0]));

// top cursos por universidade
function topCoursesFor(univName, n = 8) {
  const rows = data.filter(r => r[iUniv] === univName);
  return groupCount(rows, r => r[iCourse] || '(vazio)').slice(0, n);
}
out.topCursosUnialphaville = topCoursesFor('Unialphaville');
out.topCursosUniaSP = topCoursesFor('UniaSP');

// ticket medio por universidade
function avgTicket(univName) {
  const rows = data.filter(r => r[iUniv] === univName);
  const semDesc = rows.reduce((s, r) => s + num(r[iValorSem]), 0);
  const comDesc = rows.reduce((s, r) => s + num(r[iValorCom]), 0);
  return { n: rows.length, avgSem: rows.length ? semDesc / rows.length : 0, avgCom: rows.length ? comDesc / rows.length : 0, totalCom: comDesc };
}
out.ticketUnialphaville = avgTicket('Unialphaville');
out.ticketUniaSP = avgTicket('UniaSP');

// filtro jan/2026 em diante (igual demanda 1)
const desde2026 = data.filter(r => (r[iEnrolled] || '') >= '2026-01-01');
out.total2026 = desde2026.length;
out.byUniversity2026 = groupCount(desde2026, r => r[iUniv] || '(vazio)');
out.byNivelSimplificado2026 = groupCount(desde2026, r => nivelSimplificado(r[iLevel]));

const dates = data.map(r => r[iEnrolled]).filter(Boolean).sort();
out.minDate = dates[0];
out.maxDate = dates[dates.length - 1];
out.generatedFromRows = data.length;

// ultimos 12 meses, preenchendo lacunas com zero, ancorado no mes mais recente com dado
const monthMap = new Map(out.byMonth);
const lastMonthKey = out.maxDate.slice(0, 7);
let [ly, lm] = lastMonthKey.split('-').map(Number);
const last12 = [];
for (let i = 11; i >= 0; i--) {
  let y = ly, m = lm - i;
  while (m <= 0) { m += 12; y -= 1; }
  const key = `${y}-${String(m).padStart(2, '0')}`;
  last12.push([key, monthMap.get(key) || 0]);
}
out.last12Months = last12;

out.meta = {
  generatedAt: new Date().toISOString(),
  sourceSheetUrl: 'https://docs.google.com/spreadsheets/d/175ofeL64-b0G7hlYKqIBkmyN7aYisozAV72v_qykTAM/edit?usp=sharing',
  rowCount: data.length,
};

fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log('OK, linhas:', data.length);
