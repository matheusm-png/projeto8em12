// =============================================================
// Z-API CLIENT
// Wrapper para envio de mensagens via Z-API
// Docs: https://developer.z-api.io
// =============================================================

// Usa fetch nativo do Node.js 18+ — sem dependência externa
const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || '';

/**
 * Normaliza número para formato internacional sem o +
 * Ex: "(47) 98484-2336" → "5547984842336"
 */
function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return '55' + digits;
}

/**
 * Envia mensagem de texto simples
 * @param {string} phone - número do destinatário
 * @param {string} text  - texto da mensagem
 */
async function sendText(phone, text) {
  const number = normalizePhone(phone);
  const url = `${ZAPI_BASE}/send-text`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone: number, message: text }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[Z-API] Erro ao enviar mensagem:', json);
    throw new Error(`Z-API error: ${res.status}`);
  }
  return json;
}

/**
 * Envia múltiplas mensagens com delay entre elas (simula digitação humana)
 * @param {string} phone
 * @param {string[]} messages
 * @param {number} delay - ms entre cada mensagem (padrão: 1500)
 */
async function sendSequence(phone, messages) {
  for (const msg of messages) {
    // Simula tempo de digitação: ~20ms por caractere + 600ms de "pensamento", mínimo 1.3s
    const typingTime = Math.max(1300, (msg.length * 20) + 600);
    
    // Podemos também adicionar o suporte a status de "compondo" se a Z-API permitir no futuro
    await sleep(typingTime);
    await sendText(phone, msg);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { sendText, sendSequence, normalizePhone };
