// =============================================================
// BOT PRÉ-VENDAS — PROJETO 8 EM 12
// Servidor Express: recebe trigger do formulário + webhook Z-API
// Deploy: Railway (https://railway.app)
// =============================================================

require('dotenv').config();
const express = require('express');
const { sendText, sendSequence, normalizePhone } = require('./zapi');
const state = require('./state');
const { scheduleFollowups } = require('./followup');
const { updateLeadStatus, logEvent } = require('./crm');

const app = express();

// CORS — permite requisições do site e de qualquer origem
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

const DIONATAN_PHONE = process.env.DIONATAN_PHONE; // número privado do Dionatan

// =============================================================
// POST /trigger
// Chamado pelo site imediatamente após o formulário ser enviado.
// Recebe os dados do lead e inicia a conversa no WhatsApp.
// =============================================================
app.post('/trigger', async (req, res) => {
  const lead = req.body;
  const { nome, whatsapp, sexo, objetivo, nivel, idade, peso, altura, gordura, massa, utm_source } = lead;

  if (!whatsapp) {
    return res.status(400).json({ error: 'whatsapp obrigatório' });
  }

  const phone = normalizePhone(whatsapp);

  // Evita reprocessar leads que já estão em conversa ativa (comentado para testes)
  /*
  if (state.get(phone)) {
    console.log(`[Trigger] Lead ${phone} já em conversa — ignorando`);
    return res.json({ ok: true, msg: 'já em andamento' });
  }
  */

  // Inicializa estado
  state.getOrCreate(phone, {
    nome, whatsapp: phone, sexo, objetivo, nivel,
    idade, peso, altura, gordura, massa, utm_source,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Trigger] Novo lead: ${nome} | ${phone}`);
  res.json({ ok: true });

  // Dispara a sequência de boas-vindas de forma assíncrona
  try {
    await iniciarFluxo(phone);
  } catch (err) {
    console.error('[Trigger] Erro ao iniciar fluxo:', err.message);
  }
});

// =============================================================
// POST /webhook
// Recebe mensagens dos leads via Z-API webhook.
// Configure a URL no painel Z-API: https://<seu-dominio>/webhook
// =============================================================
app.post('/webhook', async (req, res) => {
  res.json({ ok: true }); // responde rápido para o Z-API não retransmitir

  const payload = req.body;

  // Z-API envia diferentes tipos: message, delivery, read, etc.
  if (payload.type !== 'ReceivedCallback') return;

  const phone = normalizePhone(payload.phone || payload.sender || '');
  const text = (payload.text?.message || '').trim();

  if (!phone || !text) return;

  console.log(`[Webhook] ${phone}: "${text}"`);

  const lead = state.get(phone);
  if (!lead) {
    // Lead não iniciado via formulário — ignora
    return;
  }

  // Cancela follow-ups pendentes pois o lead respondeu
  state.cancelFollowups(phone);

  // Loga a resposta do lead na timeline
  logEvent(phone, 'lead_replied', `Lead respondeu: "${text}"`);

  await processarResposta(phone, text, lead);
});

// =============================================================
// GET /health — health check para Railway
// =============================================================
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// =============================================================
// FLUXO ETAPA 1 + 2 — Primeiro contato
// =============================================================
async function iniciarFluxo(phone) {
  const lead = state.get(phone);
  if (!lead) return;

  const nome = lead.nome || 'você';
  const gordura = lead.gordura || '?';
  const massa = lead.massa || '?';
  const sexoLabel = lead.sexo === 'F' ? 'Feminino' : 'Masculino';
  const nivelLabel = lead.nivel || 'iniciante';
  const idade = lead.idade || '?';
  const peso = lead.peso || '?';

  // ETAPA 1 — Apresentação e resultados personalizados
  const msgs1 = [
    `Oi, ${nome}! 👋 Aqui é o assistente do Dionatan, treinador do Projeto 8 EM 12. Vi que você acabou de se cadastrar no site!`,
    `Calculei o seu potencial com o protocolo 🔥\n\n→ Gordura a eliminar em 12 semanas: ~${gordura}kg\n→ Massa muscular a ganhar: ~${massa}kg\n\nEsse resultado é baseado no seu perfil: ${sexoLabel}, ${idade} anos, ${peso}kg, nível ${nivelLabel}.`,
    `Quem segue o protocolo à risca alcança esses números. O Dionatan já conduziu dezenas de pessoas nessa mesma transformação. 🎯`,
  ];
  await sendSequence(phone, msgs1, 2000);
  msgs1.forEach(m => logEvent(phone, 'bot_sent', m));

  // Pequena pausa antes da ETAPA 2
  await sleep(2500);

  // ETAPA 2 — Urgência e confirmação de interesse
  const msgs2 = [
    `⚠️ Essa turma tem apenas 50 vagas. Com o tráfego rodando agora, as vagas estão sendo preenchidas rápido. Quando fechar, fecha mesmo.`,
    `${nome}, você ainda tem interesse em garantir sua vaga?\n\n1️⃣ Sim, quero garantir!\n2️⃣ Preciso de mais informações\n3️⃣ Por enquanto não`,
  ];
  await sendSequence(phone, msgs2, 1800);
  msgs2.forEach(m => logEvent(phone, 'bot_sent', m));

  // Agenda follow-ups caso o lead não responda
  scheduleFollowups(phone);
}

// =============================================================
// PROCESSAMENTO DE RESPOSTAS
// =============================================================
async function processarResposta(phone, text, lead) {
  const status = lead.status;
  const normalizado = text.toLowerCase().replace(/[^\w\s]/g, '');

  // --- Resposta à ETAPA 2 ou follow-up ---
  if (status === 'waiting_response') {
    if (matchesSim(text)) {
      await etapa3A(phone, lead);
    } else if (matchesInfo(text)) {
      await etapa3B(phone, lead);
    } else if (matchesNao(text)) {
      await etapa3C(phone, lead);
    } else {
      // Resposta não reconhecida — repete as opções
      await sendText(
        phone,
        `Desculpa, não entendi bem. 😅\n\nPode me responder com o número da opção?\n\n1️⃣ Sim, quero garantir!\n2️⃣ Preciso de mais informações\n3️⃣ Por enquanto não`
      );
    }
    return;
  }

  // --- Sub-resposta da ETAPA 3B ---
  if (status === 'waiting_subresponse') {
    if (matchesSim(text)) {
      state.updateStatus(phone, 'interested');
      await notificarDionatan(phone, lead);
      await sendText(
        phone,
        `Perfeito! 🔥 Vou te colocar agora na fila de atendimento do Dionatan. Ele vai te chamar em breve para tirar suas dúvidas e te passar o link de pagamento.`
      );
      await sleep(1500);
      await sendText(phone, `Enquanto isso, você pode conhecer melhor a metodologia aqui: teamdiou.com.br`);
      await updateLeadStatus(phone, 'Contato Feito');
    } else {
      state.updateStatus(phone, 'no');
      await sendText(
        phone,
        `Tudo bem! Se mudar de ideia, pode me chamar aqui que verifico as vagas pra você. Boa sorte na sua jornada! 💪`
      );
      await updateLeadStatus(phone, 'Em dúvida');
    }
  }
}

// =============================================================
// ETAPA 3A — Lead confirmou interesse
// =============================================================
async function etapa3A(phone, lead) {
  state.updateStatus(phone, 'interested');

  const msgs = [
    `Perfeito! 🔥 Vou te colocar agora na fila de atendimento do Dionatan. Ele vai te chamar em breve para tirar suas dúvidas e te passar o link de pagamento.`,
    `Enquanto isso, você pode conhecer melhor a metodologia aqui: teamdiou.com.br`,
  ];
  await sendSequence(phone, msgs, 1800);
  msgs.forEach(m => logEvent(phone, 'bot_sent', m));

  await notificarDionatan(phone, lead);
  await updateLeadStatus(phone, 'Contato Feito');
  logEvent(phone, 'status_change', 'Status atualizado para "Contato Feito" — lead confirmou interesse');
}

// =============================================================
// ETAPA 3B — Lead quer mais informações
// =============================================================
async function etapa3B(phone, lead) {
  state.updateStatus(phone, 'more_info');

  const msgs = [
    `Claro! O Dionatan é formado em Educação Física, Pós-Graduado em Bodybuilder Coach e certificado pelo Dorian Yates — o maior fisiculturista de todos os tempos.`,
    `O protocolo inclui: plano de treino personalizado, dieta com lista de substituições e cardio estruturado. Tudo entregue por app e PDF. Investimento: R$ 497,00.`,
    `Quer que eu te passe pro Dionatan esclarecer qualquer dúvida?\n\n1️⃣ Sim, quero conversar\n2️⃣ Vou pensar mais`,
  ];
  await sendSequence(phone, msgs, 2000);
  msgs.forEach(m => logEvent(phone, 'bot_sent', m));

  state.updateStatus(phone, 'waiting_subresponse');
  await updateLeadStatus(phone, 'Em dúvida');
  logEvent(phone, 'status_change', 'Status atualizado para "Em dúvida" — lead pediu mais informações');
}

// =============================================================
// ETAPA 3C — Lead recusou
// =============================================================
async function etapa3C(phone, lead) {
  state.updateStatus(phone, 'no');

  const msg = `Sem problema! Se mudar de ideia, pode me chamar aqui que verifico as vagas pra você. Boa sorte na sua jornada! 💪`;
  await sendText(phone, msg);
  logEvent(phone, 'bot_sent', msg);

  await updateLeadStatus(phone, 'Desistiu');
  logEvent(phone, 'status_change', 'Status atualizado para "Desistiu" — lead recusou por enquanto');

  // Agenda mensagem de retomada em 48h com gatilho de escassez
  const t = setTimeout(async () => {
    const current = state.get(phone);
    if (!current || current.status !== 'no') return;
    try {
      await sendText(
        phone,
        `${lead.nome || 'Oi'}! Passando rapidinho aqui... 👋\n\nAs vagas da próxima turma do Projeto 8 EM 12 estão quase esgotadas. Caso queira garantir a sua antes que feche, é só responder aqui!`
      );
    } catch (err) {
      console.error('[Retomada 3C] Erro:', err.message);
    }
  }, 48 * 60 * 60 * 1000);

  state.addFollowupTimer(phone, t);
}

// =============================================================
// NOTIFICAÇÃO AO DIONATAN
// =============================================================
async function notificarDionatan(phone, lead) {
  if (!DIONATAN_PHONE) {
    console.warn('[Bot] DIONATAN_PHONE não configurado — notificação ignorada');
    return;
  }

  const msg =
    `🔔 *LEAD PRONTO PARA FECHAR*\n\n` +
    `Nome: ${lead.nome || '-'}\n` +
    `WhatsApp: ${lead.whatsapp || phone}\n` +
    `Objetivo: ${lead.objetivo || '-'}\n` +
    `Perfil: ${lead.sexo || '-'}, ${lead.idade || '-'} anos, ${lead.peso || '-'}kg, ${lead.altura || '-'}cm — nível ${lead.nivel || '-'}\n` +
    `Estimativa: -${lead.gordura || '?'}kg gordura | +${lead.massa || '?'}kg músculo\n` +
    `Origem: ${lead.utm_source || 'direto'}\n` +
    `Cadastrado em: ${lead.timestamp || new Date().toISOString()}`;

  try {
    await sendText(DIONATAN_PHONE, msg);
    console.log(`[Bot] Dionatan notificado sobre lead: ${lead.nome}`);
    logEvent(phone, 'dionatan_notified', 'Dionatan notificado com resumo do lead — pronto para fechar');
  } catch (err) {
    console.error('[Bot] Erro ao notificar Dionatan:', err.message);
  }
}

// =============================================================
// HELPERS DE MATCH DE RESPOSTA
// =============================================================
function matchesSim(text) {
  const t = text.toLowerCase().trim();
  return t === '1' || t.includes('sim') || t.includes('quero') || t.includes('garantir') || t.includes('conversar');
}

function matchesInfo(text) {
  const t = text.toLowerCase().trim();
  return t === '2' || t.includes('informa') || t.includes('mais') || t.includes('dúvida') || t.includes('detalhes');
}

function matchesNao(text) {
  const t = text.toLowerCase().trim();
  return t === '3' || t.includes('não') || t.includes('nao') || t.includes('agora não') || t.includes('depois');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================================
// START
// =============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Bot] Servidor rodando na porta ${PORT}`);
});
