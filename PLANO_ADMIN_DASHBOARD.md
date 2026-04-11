# Plano: Admin Dashboard de Leads

## O que é
Página `admin.html` protegida por senha para Matheus e Dionatan acompanharem os leads em tempo real, com visualização Kanban, filtros e acesso direto ao WhatsApp de cada lead.

---

## Funcionalidades

### Kanban
Colunas (drag-and-drop ou botões de mover):
- **Lead** — entrou pelo formulário
- **Contato Feito** — já foi abordado no WhatsApp
- **Pagou** — confirmou pagamento
- **Ativo** — está no programa (semanas 1–12)
- **Concluído** — terminou as 12 semanas
- **Desistiu** — saiu antes de finalizar

### Cards
Cada lead exibe:
- Nome, e-mail, WhatsApp (botão direto `wa.me`)
- Objetivo, nível de experiência, sexo
- Dados físicos: idade, peso, altura
- Resultado da calculadora: gordura prevista / massa prevista
- UTM source (origem do lead — ad, orgânico, etc.)
- Data/hora de entrada

### Filtros
- Sexo (M / F)
- Objetivo (definição / massa / ambos)
- Nível (iniciante / intermediário / avançado)
- Status/coluna atual
- UTM source

---

## Arquitetura

```
Admin Page  ──GET──►  Apps Script  ──►  Google Sheets  (lê todos os leads)
Admin Page  ──POST──►  Apps Script  ──►  Google Sheets  (atualiza coluna/status do lead)
Formulário  ──POST──►  Apps Script  ──►  Google Sheets  (já codado em script.js)
```

O Google Apps Script funciona como uma mini-API REST gratuita.
- Endpoint POST já está codado (recebe lead do formulário)
- Falta adicionar endpoint GET (retorna todos os leads como JSON)
- Falta adicionar endpoint PATCH/POST (atualiza status de um lead)

### Autenticação
- Client-side: senha hasheada em SHA-256 no JS
- Suficiente para uso interno (2 usuários)
- Migração futura para auth real possível via Netlify/Vercel middleware sem reescrever o dashboard

---

## Ordem de execução quando retomar

1. **Apps Script completo**
   - Endpoint GET: retorna todos os leads como JSON
   - Endpoint POST para atualização de status (coluna Kanban)
   - Configurar planilha "Leads 8 EM 12" com colunas corretas
   - Substituir `APPS_SCRIPT_URL_AQUI` em `script.js`

2. **`admin.html`**
   - Login com senha (SHA-256)
   - Kanban visual no mesmo design da LP (dark, laranja, Bebas Neue)
   - Cards de lead com todos os dados
   - Filtros laterais ou top bar
   - Botão WhatsApp em cada card
   - Atualização de status via clique (reflete no Google Sheets)

---

## Observações
- Design seguirá o sistema visual da LP: fundo escuro, laranja `#FF6A00`, fontes Bebas Neue e Barlow
- Página não será linkada publicamente — acesso apenas por URL direta
- Sem custo adicional: tudo em Google Sheets + Apps Script (gratuito)
