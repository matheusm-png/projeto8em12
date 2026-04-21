// =============================================================
// CRM UPDATER
// Atualiza o status do lead no Supabase após ação do bot.
// =============================================================

// Usa fetch nativo do Node.js 18+ — sem dependência externa
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

/**
 * Atualiza o status de um lead pelo número de WhatsApp.
 * @param {string} phone  - número normalizado (ex: 5547984842336)
 * @param {string} status - ex: 'Contato Feito', 'Em dúvida', 'Desistiu'
 */
async function updateLeadStatus(phone, status) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[CRM] Supabase não configurado — status não atualizado:', status);
    return;
  }

  // O whatsapp no Supabase está no formato sem +55 ou com +55 — tenta ambos
  const digits = String(phone).replace(/\D/g, '');
  const localPhone = digits.startsWith('55') ? digits.slice(2) : digits;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?whatsapp=ilike.*${localPhone}*`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[CRM] Erro ao atualizar status:', res.status, text);
    } else {
      console.log(`[CRM] Status atualizado → ${status} para ${localPhone}`);
    }
  } catch (err) {
    console.error('[CRM] Falha na requisição:', err.message);
  }
}

/**
 * Registra um evento na linha do tempo do lead (tabela lead_events).
 * @param {string} phone   - número normalizado do lead
 * @param {string} type    - 'bot_sent' | 'lead_replied' | 'status_change' | 'dionatan_notified' | 'note'
 * @param {string} content - texto descritivo do evento
 * @param {object} metadata- dados extras (opcional)
 */
async function logEvent(phone, type, content, metadata = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const digits = String(phone).replace(/\D/g, '');
  const localPhone = digits.startsWith('55') ? digits.slice(2) : digits;

  try {
    // Busca o lead_id pelo telefone
    const searchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?whatsapp=ilike.*${localPhone}*&select=id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const leads = await searchRes.json().catch(() => []);
    if (!leads || leads.length === 0) return;

    const leadId = leads[0].id;

    await fetch(`${SUPABASE_URL}/rest/v1/lead_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ lead_id: leadId, type, content, metadata }),
    });
  } catch (err) {
    console.error('[CRM] Erro ao logar evento:', err.message);
  }
}

module.exports = { updateLeadStatus, logEvent };
