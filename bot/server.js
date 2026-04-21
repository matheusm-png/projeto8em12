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

const DIONATAN_PHONE = process.env.DIONATAN_PHONE;

// Links de Pagamento Exclusivos
const LINK_1X = 'https://link.infinitepay.io/diou-alves/VC1DLTEtSQ-7h2V4HWsbB-497,00';
const LINK_PARCELADO = 'https://link.infinitepay.io/diou-alves/VC1D-ToX69ICrJ-497,00';

app.post('/trigger', async (req, res) => {
  const lead = req.body;
  const { nome, whatsapp, sexo, objetivo, nivel, idade, peso, altura, gordura, massa, utm_source } = lead;

  if (!whatsapp) {
    return res.status(400).json({ error: 'whatsapp obrigatório' });
  }

  const phone = normalizePhone(whatsapp);

  // Evita reprocessar leads que já estão em conversa ativa (comentado para testes conforme sua solicitação)
  /*
  if (state.get(phone)) {
    console.log(`[Trigger] Lead ${phone} já em conversa — ignorando`);
    return res.json({ ok: true, msg: 'já em andamento' });
  }
  */

  state.getOrCreate(phone, {
    nome, whatsapp: phone, sexo, objetivo, nivel,
    idade, peso, altura, gordura, massa, utm_source,
    timestamp: new Date().toISOString(),
    status: 'waiting_response'
  });

  console.log(`[Trigger] Novo lead: ${nome} | ${phone}`);
  res.json({ ok: true });

  try {
    await iniciarFluxo(phone);
  } catch (err) {
    console.error('[Trigger] Erro ao iniciar fluxo:', err.message);
  }
});

app.post('/webhook', async (req, res) => {
  res.json({ ok: true });
  const payload = req.body;
  if (payload.type !== 'ReceivedCallback') return;

  const phone = normalizePhone(payload.phone || payload.sender || '');
  const text = (payload.text?.message || '').trim();

  if (!phone || !text) return;

  console.log(`[Webhook] ${phone}: "${text}"`);

  const lead = state.get(phone);
  if (!lead) return;

  state.cancelFollowups(phone);
  logEvent(phone, 'lead_replied', `Lead respondeu: "${text}"`);

  await processarResposta(phone, text, lead);
});

app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// Endpoint chamado pelo Admin para confirmar pagamento e dar as boas-vindas
app.post('/confirm-payment', async (req, res) => {
  const { phone, nome } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone obrigatório' });

  console.log(`[Payment] Confirmado para: ${nome} (${phone})`);
  
  const msgs = [
    `PAGAMENTO CONFIRMADO! ✅🏆`,
    `Parabéns, ${nome}! Agora você faz parte oficialmente do Projeto 8 EM 12.`,
    `O Dionatan já foi avisado e vai te mandar o seu acesso ao App e o seu protocolo inicial em instantes por aqui.`,
    `Prepare-se, as próximas 12 semanas vão mudar sua vida. VAMOOOOO! 🔥`
  ];

  try {
    await sendSequence(phone, msgs);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Payment] Erro ao enviar confirmação:', err.message);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

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

  const msgs1 = [
    `Oi, ${nome}! 👋 Aqui é o assistente do Dionatan, treinador do Projeto 8 EM 12. Vi que você acabou de se cadastrar no site!`,
    `Calculei o seu potencial com o protocolo 🔥\n\n→ Gordura a eliminar em 12 semanas: ~${gordura}kg\n→ Massa muscular a ganhar: ~${massa}kg\n\nEsse resultado é baseado no seu perfil: ${sexoLabel}, ${idade} anos, ${peso}kg, nível ${nivelLabel}.`,
    `Quem segue o protocolo à risca alcança esses números. O Dionatan já conduziu dezenas de pessoas nessa mesma transformação. 🎯`,
  ];
  await sendSequence(phone, msgs1);
  msgs1.forEach(m => logEvent(phone, 'bot_sent', m));

  await sleep(2500);

  const msgs2 = [
    `⚠️ Essa turma tem apenas 50 vagas. Com o tráfego rodando agora, as vagas estão sendo preenchidas rápido. Quando fechar, fecha mesmo.`,
    `${nome}, você ainda tem interesse em garantir sua vaga?\n\n1️⃣ Sim, quero garantir!\n2️⃣ Preciso de mais informações\n3️⃣ Por enquanto não`,
  ];
  await sendSequence(phone, msgs2);
  msgs2.forEach(m => logEvent(phone, 'bot_sent', m));

  scheduleFollowups(phone);
}

async function processarResposta(phone, text, lead) {
  const status = lead.status;

  if (status === 'waiting_response') {
    if (matchesSim(text)) {
      await etapa3A(phone, lead);
    } else if (matchesInfo(text)) {
      await etapa3B(phone, lead);
    } else if (matchesNao(text)) {
      await etapa3C(phone, lead);
    } else {
      await sendText(
        phone,
        `Desculpa, não entendi bem. 😅\n\nPode me responder com o número da opção?\n\n1️⃣ Sim, quero garantir!\n2️⃣ Preciso de mais informações\n3️⃣ Por enquanto não`
      );
    }
    return;
  }

  if (status === 'waiting_subresponse') {
    if (matchesSim(text)) {
      await etapa3A(phone, lead); // Reaproveita o fluxo de fechamento direto
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

async function etapa3A(phone, lead) {
  state.updateStatus(phone, 'interested');

  const msgs = [
    `Perfeito! 🔥 Vou te colocar agora na fila de atendimento do Dionatan. Ele vai te chamar em breve para validar seus dados técnicos.`,
    `Mas se quiser já garantir sua vaga agora mesmo (e aproveitar o desconto de lançamento), você pode concluir o pagamento por aqui:`,
    `💰 *Link Seguro (1x R$ 497,00):*\n${LINK_1X}`,
    `💳 *Link Seguro (Até 12x no cartão):*\n${LINK_PARCELADO}`,
    `Assim que concluir, me manda o comprovante aqui pra eu agilizar seu acesso ao app!`,
    `Se tiver qualquer dúvida, o Dionatan também pode falar contigo em instantes.`,
    `Enquanto isso, você pode conhecer melhor a metodologia aqui: https://teamdiou.com.br/metodo`
  ];
  await sendSequence(phone, msgs);
  msgs.forEach(m => logEvent(phone, 'bot_sent', m));

  await notificarDionatan(phone, lead);
  await updateLeadStatus(phone, 'Contato Feito');
}

async function etapa3B(phone, lead) {
  state.updateStatus(phone, 'more_info');

  const msgs = [
    `Claro! O Dionatan é formado em Educação Física, Pós-Graduado em Bodybuilder Coach e certificado pelo Dorian Yates — o maior fisiculturista de todos os tempos.`,
    `O protocolo inclui: plano de treino personalizado via App, dieta com lista de substituições e cardio estruturado. Tudo focado em manter seu metabolismo acelerado por 12 semanas.`,
    `Valor do Investimento: R$ 497,00 (preço de lançamento).`,
    `Quer que eu te passe pro Dionatan esclarecer qualquer dúvida ou já quer o link de inscrição?\n\n1️⃣ Sim, quero participar\n2️⃣ Vou pensar mais`
  ];
  await sendSequence(phone, msgs);
  msgs.forEach(m => logEvent(phone, 'bot_sent', m));

  state.updateStatus(phone, 'waiting_subresponse');
  await updateLeadStatus(phone, 'Em dúvida');
}

async function etapa3C(phone, lead) {
  state.updateStatus(phone, 'no');
  const msg = `Sem problema! Se mudar de ideia, pode me chamar aqui que verifico as vagas pra você. Boa sorte na sua jornada! 💪`;
  await sendText(phone, msg);
  logEvent(phone, 'bot_sent', msg);
  await updateLeadStatus(phone, 'Desistiu');
}

async function notificarDionatan(phone, lead) {
  if (!DIONATAN_PHONE) return;
  const msg =
    `🔔 *LEAD PRONTO PARA FECHAR*\n\n` +
    `Nome: ${lead.nome || '-'}\n` +
    `WhatsApp: ${lead.whatsapp || phone}\n` +
    `Objetivo: ${lead.objetivo || '-'}\n` +
    `Perfil: ${lead.sexo || '-'}, ${lead.idade || '-'} anos, ${lead.peso || '-'}kg, ${lead.altura || '-'}cm\n` +
    `Estimativa: -${lead.gordura || '?'}kg gordura | +${lead.massa || '?'}kg músculo\n` +
    `Origem: ${lead.utm_source || 'direto'}`;

  try {
    await sendText(DIONATAN_PHONE, msg);
  } catch (err) {
    console.error('[Bot] Erro ao notificar Dionatan:', err.message);
  }
}

function matchesSim(text) {
  const t = text.toLowerCase().trim();
  return t === '1' || t.includes('sim') || t.includes('quero') || t.includes('garantir') || t.includes('conversar') || t.includes('participar');
}

function matchesInfo(text) {
  const t = text.toLowerCase().trim();
  return t === '2' || t.includes('informa') || t.includes('mais') || t.includes('dúvida') || t.includes('detalhes');
}

function matchesNao(text) {
  const t = text.toLowerCase().trim();
  return t === '3' || t.includes('não') || t.includes('nao') || t.includes('depois');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Bot] Servidor rodando na porta ${PORT}`);
});
