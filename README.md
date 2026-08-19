# Painel Quero Pago — pipeline de atualização diária

Gera o dashboard publicado em:
https://claude.ai/code/artifact/64a10fc2-c258-4267-862d-42a895632ccd

Fonte dos dados: planilha Google Sheets (exportada como CSV público), alimentada por
uma query de notebook Databricks — alunos com painel ativo no Quero Pago
(Unialphaville + UniaSP, todos os status de contrato).

## Pipeline

1. `curl` no CSV público da planilha → `sheet.csv`
2. `node 1-parse.cjs sheet.csv parsed.json` — parser de CSV (respeita aspas/vírgulas em campos)
3. `node 2-aggregate.cjs parsed.json agg.json` — agrega tudo (contagens, somas, top-N).
   **Não produz nenhuma linha individual** — só números agregados. `parsed.json` e
   `sheet.csv` contêm CPF/e-mail/telefone/nome e **nunca devem ser commitados**
   (estão no `.gitignore`).
4. `node 3-inject.cjs painel-quero-pago.html agg.json` — substitui o bloco
   `<script id="dash-data" type="application/json">` do HTML pelo `agg.json` novo,
   sem tocar no resto do arquivo (design/CSS/JS ficam intactos).
5. Republicar `painel-quero-pago.html` via ferramenta Artifact, com
   `url: "https://claude.ai/code/artifact/64a10fc2-c258-4267-862d-42a895632ccd"`
   (atualiza o artifact existente em vez de criar um novo).

Rodado automaticamente todo dia por uma rotina em nuvem (Claude Code Routines).
Se qualquer passo falhar, a rotina não publica nada — reporta o erro.
