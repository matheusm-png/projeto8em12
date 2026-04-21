// =============================================================
// SETUP WEBHOOK — Z-API
// Execute UMA VEZ após o deploy para registrar a URL do servidor
// na instância Z-API. Após isso o bot já recebe mensagens.
//
// Uso:
//   node setup-webhook.js
//
// Requer SERVER_URL preenchido no .env (URL pública do Railway ou ngrok).
// =============================================================

require('dotenv').config();

// Usa fetch nativo do Node.js 18+ — sem dependência externa
const INSTANCE_ID    = process.env.ZAPI_INSTANCE_ID;
const TOKEN          = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN   = process.env.ZAPI_CLIENT_TOKEN || '';
const SERVER_URL     = process.env.SERVER_URL;

if (!INSTANCE_ID || !TOKEN) {
  console.error('❌  ZAPI_INSTANCE_ID e ZAPI_TOKEN são obrigatórios no .env');
  process.exit(1);
}

if (!SERVER_URL || SERVER_URL.includes('SEU-DOMINIO')) {
  console.error('❌  Preencha SERVER_URL no .env com a URL pública do servidor antes de rodar este script.');
  process.exit(1);
}

const BASE = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;
const WEBHOOK_URL = `${SERVER_URL}/webhook`;

const headers = {
  'Content-Type': 'application/json',
  ...(CLIENT_TOKEN ? { 'Client-Token': CLIENT_TOKEN } : {}),
};

async function main() {
  console.log(`\n🔧 Configurando webhook Z-API`);
  console.log(`   Instância : ${INSTANCE_ID}`);
  console.log(`   Webhook   : ${WEBHOOK_URL}\n`);

  // 1. Webhook de mensagens recebidas (ReceivedCallback)
  await setWebhook('update-webhook-received', WEBHOOK_URL);

  // 2. Confirma a configuração atual
  await getStatus();

  console.log('\n✅  Webhook configurado! O bot já está pronto para receber mensagens.\n');
}

async function setWebhook(endpoint, url) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value: url }),
  });

  const json = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log(`✔  ${endpoint}: OK`);
  } else {
    console.error(`✘  ${endpoint}: ${res.status}`, json);
  }
}

async function getStatus() {
  const res = await fetch(`${BASE}/status`, { headers });
  const json = await res.json().catch(() => ({}));
  console.log(`\n📡 Status da instância:`, json.connected ? '🟢 Conectada' : '🔴 Desconectada');
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
