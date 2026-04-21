const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');

// Carrega o estado inicial do arquivo se existir
let conversations = new Map();
try {
  if (fs.existsSync(STATE_FILE)) {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // Converte os dados salvos de volta para um Map
    Object.keys(data).forEach(phone => {
      conversations.set(phone, data[phone]);
    });
    console.log(`[State] ${conversations.size} conversas carregadas do arquivo.`);
  }
} catch (err) {
  console.error('[State] Erro ao carregar arquivo de estado:', err.message);
}

function saveToFile() {
  try {
    const data = {};
    conversations.forEach((val, key) => {
      // Remove timers antes de salvar (não podem ser serializados)
      const toSave = { ...val };
      delete toSave.followupTimers;
      data[key] = toSave;
    });
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[State] Erro ao salvar arquivo de estado:', err.message);
  }
}

function getOrCreate(phone, leadData = {}) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      phone,
      status: 'waiting_response',
      ...leadData,
      createdAt: Date.now(),
      followupTimers: [],
    });
    saveToFile();
  }
  return conversations.get(phone);
}

function get(phone) {
  return conversations.get(phone) || null;
}

function set(phone, data) {
  const existing = conversations.get(phone) || {};
  conversations.set(phone, { ...existing, ...data });
  saveToFile();
}

function updateStatus(phone, status) {
  const state = conversations.get(phone);
  if (state) {
    state.status = status;
    conversations.set(phone, state);
    saveToFile();
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
