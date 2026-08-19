# Painel Quero Pago — pipeline de atualização diária

Gera o dashboard publicado em:
https://claude.ai/code/artifact/64a10fc2-c258-4267-862d-42a895632ccd

Fonte dos dados: [planilha Google Sheets](https://docs.google.com/spreadsheets/d/175ofeL64-b0G7hlYKqIBkmyN7aYisozAV72v_qykTAM/edit?usp=sharing)
alimentada por queries de notebook Databricks, com **duas abas** que alimentam **dois
relatórios distintos** no mesmo dashboard. As duas abas respondem perguntas
diferentes — não misturar a interpretação de uma com a outra.

## Aba 1 — `sem_painel`

Identifica alunos que foram **matriculados mas não têm painel financeiro criado**
no Quero Pago (Unialphaville e UniaSP).

Cada linha representa um aluno que:
- Teve matrícula confirmada (enrolled) na Unialphaville ou UniaSP;
- **Não possui painel financeiro** no Quero Pago para aquela universidade;
- Tem dados de contato (telefone, WhatsApp, e-mail) para ação operacional — o
  dashboard **não exibe** esses valores (só agrega), mas eles existem na planilha
  para quem for atuar na lista.

⚠️ **Qualidade de dado conhecida:** parte desta base está poluída. Alguns alunos
aparecem aqui porque o painel foi **interrompido no ADMIN**, mas a matrícula
**não foi cancelada no QA** — nesses casos não é de fato um painel faltando ser
criado, é uma inconsistência de status entre sistemas. O dashboard sinaliza esse
caveat visualmente; ainda falta um trabalho de limpeza cruzando status ADMIN × QA
antes de qualquer ação operacional em massa sobre esta lista.

Export via CSV público padrão (primeira aba da planilha):
```
https://docs.google.com/spreadsheets/d/175ofeL64.../export?format=csv
```

## Aba 2 — `aptos_rematricula`

Identifica alunos (Unialphaville, **graduação**) que precisam ter **novas
mensalidades geradas** para o próximo período.

Cada linha representa um aluno que:
- Está em dia com os pagamentos;
- Ainda tem semestres/parcelas pela frente;
- **Não teve a próxima remessa de boletos gerada** → ação de rematrícula necessária.

Export via gviz CSV, pelo nome da aba (não tem gid conhecido, então usamos o nome):
```
https://docs.google.com/spreadsheets/d/175ofeL64.../gviz/tq?tqx=out:csv&sheet=aptos_rematricula
```

## Pipeline

1. `curl` nos dois CSVs públicos da planilha → `sheet.csv` (sem_painel) e
   `aptos.csv` (aptos_rematricula).
2. `node 1-parse.cjs <csv> <parsed.json>` — parser de CSV genérico (respeita
   aspas/vírgulas em campos), usado para as duas abas.
3. `node 2a-aggregate-sem-painel.cjs parsed-sem-painel.json agg-sem-painel.json`
   — agrega a aba 1 (contagens, top-N, % com contato disponível).
4. `node 2b-aggregate-aptos-rematricula.cjs parsed-aptos.json agg-aptos.json`
   — agrega a aba 2 (contagens, valor total/médio da próxima remessa).

   **Nenhum dos dois scripts produz linha individual** — só números agregados.
   Os `parsed-*.json`/`sheet.csv`/`aptos.csv` contêm CPF/e-mail/telefone/nome e
   **nunca devem ser commitados** (estão no `.gitignore`).
5. `node 3-inject.cjs painel-quero-pago.html agg-sem-painel.json dash-data-sem-painel`
   e o mesmo para `dash-data-aptos-rematricula` — substitui cada bloco
   `<script id="...">` do HTML pelo `agg-*.json` novo, sem tocar no resto do
   arquivo (design/CSS/JS ficam intactos).
6. Republicar `painel-quero-pago.html` via ferramenta Artifact, com
   `url: "https://claude.ai/code/artifact/64a10fc2-c258-4267-862d-42a895632ccd"`
   (atualiza o artifact existente em vez de criar um novo).

## Automação

- **GitHub Actions** (`.github/workflows/refresh-dashboard.yml`) roda todo dia às
  07:30 (Brasília) — passos 1 a 5 acima, com commit do HTML atualizado se algo mudou.
  Roda na infra do GitHub porque o ambiente de nuvem das rotinas Claude bloqueia
  acesso direto a `docs.google.com` (política de rede do sandbox).
- **Rotina Claude** (`painel-quero-pago-diario`) roda às 08:04 (Brasília), depois
  do Action — clona o repo, confere sanidade dos dados (`rowCount` válido nas duas
  abas) e republica o artifact (passo 6). Não busca dados nem roda scripts node.

Se qualquer passo falhar em qualquer uma das automações, nada é publicado —
o erro é reportado em vez de publicar dado quebrado ou parcial.
