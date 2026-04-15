// =============================================================
// STATE MANAGER
// Gerencia o estado de cada conversa por número de telefone.
// Usa memória (Map) — em produção pode ser trocado por Redis/Supabase.
// =============================================================

/**
 * Estados possíveis por lead:
 *   'waiting_response' — aguardando resposta à ETAPA 2 (sim/info/não)
 *   'waiting_subresponse' — aguardando sub-resposta da ETAPA 3B (quer conversar?)
 *   'interested'       — confirmou interesse, Dionatan foi notificado
 *   'more_info'        — pediu mais informações
 *   'no'              — recusou por enquanto
 *   'done'            — conversa encerrada / fechamento concluído
 */

const conversations = new Map();

/**
 * Inicializa ou retorna o estado de um lead pelo telefone.
 * @param {string} phone - normalizado (ex: 5574999531223)
 * @param {object} leadData - dados do lead vindos do formulário
 */
function getOrCreate(phone, leadData = {}) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      phone,
      status: 'waiting_response',
      ...leadData,
      createdAt: Date.now(),
      followupTimers: [],
    });
  }
  return conversations.get(phone);
}

function get(phone) {
  return conversations.get(phone) || null;
}

function set(phone, data) {
  const existing = conversations.get(phone) || {};
  conversations.set(phone, { ...existing, ...data });
}

function updateStatus(phone, status) {
  const state = conversations.get(phone);
  if (state) {
    state.status = status;
    conversations.set(phone, state);
  }
}

function addFollowupTimer(phone, timerId) {
  const state = conversations.get(phone);
  if (state) {
    state.followupTimers = state.followupTimers || [];
    state.followupTimers.push(timerId);
  }
}

function cancelFollowups(phone) {
  const state = conversations.get(phone);
  if (state && state.followupTimers) {
    state.followupTimers.forEach((id) => clearTimeout(id));
    state.followupTimers = [];
  }
}

function isAlreadyHandled(phone) {
  const state = conversations.get(phone);
  if (!state) return false;
  return ['interested', 'done', 'no'].includes(state.status);
}

module.exports = {
  getOrCreate,
  get,
  set,
  updateStatus,
  addFollowupTimer,
  cancelFollowups,
  isAlreadyHandled,
};
