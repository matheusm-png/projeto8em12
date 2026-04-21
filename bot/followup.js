// =============================================================
// FOLLOW-UP SCHEDULER
// Agenda mensagens de retomada para leads que não responderam.
// Cronograma: 2h → 24h → 48h
// =============================================================

const { sendText } = require('./zapi');
const state = require('./state');

const FOLLOWUP_DELAYS = {
  h2: 2 * 60 * 60 * 1000,   // 2 horas
  h24: 24 * 60 * 60 * 1000, // 24 horas
  h48: 48 * 60 * 60 * 1000, // 48 horas
};

/**
 * Agenda os 3 follow-ups para um lead que não respondeu.
 * Cada mensagem cancela as próximas assim que o lead responder.
 */
function scheduleFollowups(phone) {
  const lead = state.get(phone);
  if (!lead) return;

  const nome = lead.nome || 'você';

  // --- FOLLOW-UP 1: 2h ---
  const t1 = setTimeout(async () => {
    const current = state.get(phone);
    if (!current || current.status !== 'waiting_response') return;

    try {
      await sendText(
        phone,
        `${nome}, ainda está por aqui? 👀\n\nAs vagas do Projeto 8 EM 12 estão acabando e não quero que você perca a sua.\n\nAinda tem interesse em garantir o seu lugar?\n\n1️⃣ Sim, quero garantir!\n2️⃣ Preciso de mais informações\n3️⃣ Por enquanto não`
      );
    } catch (err) {
      console.error('[Follow-up 2h] Erro:', err.message);
    }
  }, FOLLOWUP_DELAYS.h2);

  // --- FOLLOW-UP 2: 24h ---
  const t2 = setTimeout(async () => {
    const current = state.get(phone);
    if (!current || current.status !== 'waiting_response') return;

    const gordura = current.gordura || '?';
    const massa = current.massa || '?';

    try {
      await sendText(
        phone,
        `${nome}, lembra do seu resultado estimado? 💪\n\n📊 Seu potencial em 12 semanas:\n→ Gordura a eliminar: ~${gordura}kg\n→ Massa muscular a ganhar: ~${massa}kg\n\nEsse resultado pode ser real — mas só se você começar agora. Vagas limitadas.\n\nVocê quer garantir a sua?\n\n1️⃣ Sim, quero!\n3️⃣ Não por agora`
      );
    } catch (err) {
      console.error('[Follow-up 24h] Erro:', err.message);
    }
  }, FOLLOWUP_DELAYS.h24);

  // --- FOLLOW-UP 3: 48h (último contato) ---
  const t3 = setTimeout(async () => {
    const current = state.get(phone);
    if (!current || current.status !== 'waiting_response') return;

    try {
      await sendText(
        phone,
        `${nome}, esse é o último aviso. ⚠️\n\nAs últimas vagas do Projeto 8 EM 12 estão sendo preenchidas. Depois disso não consigo garantir a sua.\n\nSe quiser entrar, é agora.\n\n1️⃣ Quero garantir minha vaga\n3️⃣ Não vou participar desta vez`
      );

      // Após o último follow-up, encerra o ciclo
      state.updateStatus(phone, 'done');
    } catch (err) {
      console.error('[Follow-up 48h] Erro:', err.message);
    }
  }, FOLLOWUP_DELAYS.h48);

  // Registra os timers para poder cancelar se o lead responder
  state.addFollowupTimer(phone, t1);
  state.addFollowupTimer(phone, t2);
  state.addFollowupTimer(phone, t3);
}

module.exports = { scheduleFollowups };
