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
  const normalized = normalizeForSearch(phone);
  
  // Tenta busca direta primeiro
  if (conversations.has(normalized)) {
    return conversations.get(normalized);
  }

  // Se não achar, tenta busca flexível (nono dígito)
  for (let [key, value] of conversations) {
    if (isSameBrazilianPhone(key, normalized)) {
      return value;
    }
  }

  return null;
}

/**
 * Normalização específica para busca interna
 */
function normalizeForSearch(phone) {
  return String(phone).replace(/\D/g, '');
}

/**
 * Compara dois números brasileiros ignorando a presença ou ausência do nono dígito
 */
function isSameBrazilianPhone(p1, p2) {
  if (p1 === p2) return true;
  
  // Remove 55 se houver
  const n1 = p1.startsWith('55') ? p1.slice(2) : p1;
  const n2 = p2.startsWith('55') ? p2.slice(2) : p2;

  // Se não tiverem o mesmo DDD (primeiros 2 dígitos), já era
  if (n1.slice(0, 2) !== n2.slice(0, 2)) return false;

  // Formata ambos sem o nono dígito (se houver) para comparar
  // Números com 9 dígitos: DDD + 9 + 8 dígitos = 11 total
  // Números com 8 dígitos: DDD + 8 dígitos = 10 total
  const clean1 = n1.length === 11 ? n1.slice(0, 2) + n1.slice(3) : n1;
  const clean2 = n2.length === 11 ? n2.slice(0, 2) + n2.slice(3) : n2;

  return clean1 === clean2;
}

function set(phone, data) {
  const existing = conversations.get(phone) || {};
  conversations.set(phone, { ...existing, ...data });
  saveToFile();
}

function updateStatus(phone, status) {
  const lead = get(phone);
  if (lead) {
    lead.status = status;
    saveToFile();
  }
}

function addFollowupTimer(phone, timerId) {
  const lead = get(phone);
  if (lead) {
    lead.followupTimers = lead.followupTimers || [];
    lead.followupTimers.push(timerId);
  }
}

function cancelFollowups(phone) {
  const lead = get(phone);
  if (lead && lead.followupTimers) {
    lead.followupTimers.forEach((id) => clearTimeout(id));
    lead.followupTimers = [];
  }
}

function isAlreadyHandled(phone) {
  const lead = get(phone);
  if (!lead) return false;
  return ['interested', 'done', 'no'].includes(lead.status);
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
