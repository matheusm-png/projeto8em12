/*
 INSTRUÇÕES PÓS-DEPLOY:
 1. Crie uma planilha no Google Sheets chamada "Leads 8 EM 12".
 2. Vá em Extensões > Apps Script e cole o código fornecido no prompt.
 3. Substitua 'SHEET_ID_AQUI' pelo ID da sua planilha (presente na URL da planilha).
 4. Clique em Implantar > Nova Implantação > App da Web.
 5. Configure "Executar como: Eu" e "Quem tem acesso: Qualquer pessoa".
 6. Copie a URL gerada e substitua em 'APPS_SCRIPT_URL_AQUI' na função enviarParaCRM abaixo.
*/

// =============================================================
// TRACKING HELPER
// Empurra eventos para o dataLayer do GTM.
// GTM roteia para GA4, Meta Pixel e Meta CAPI conforme config.
// =============================================================
function pushEvent(eventName, params) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({ event: eventName }, params || {}));
}

// =============================================================
// PAGE VIEW
// =============================================================
pushEvent('page_view', {
  page_title: document.title,
  page_location: window.location.href,
  page_path: window.location.pathname
});

// =============================================================
// SCROLL DEPTH — 25%, 50%, 75%, 100%
// Cada marco dispara uma única vez por sessão de página.
// =============================================================
(function () {
  const milestones = [25, 50, 75, 100];
  const reached = new Set();

  function getScrollPercent() {
    const scrolled = window.scrollY || window.pageYOffset || 0;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    return total > 0 ? Math.floor((scrolled / total) * 100) : 0;
  }

  function onScroll() {
    const pct = getScrollPercent();
    milestones.forEach(function (m) {
      if (!reached.has(m) && pct >= m) {
        reached.add(m);
        pushEvent('scroll_depth', { scroll_percent: m });
        if (reached.size === milestones.length) {
          window.removeEventListener('scroll', onScroll);
        }
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

// Observe reveals
document.querySelectorAll('.reveal, .reveal-scale').forEach(el => observer.observe(el));

// Numeric Counter Animations
const countObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      if (el.dataset.animated) return;
      el.dataset.animated = "true";
      
      const targetStr = el.dataset.target || el.innerText.replace(/\D/g, '');
      const target = parseInt(targetStr);
      if (!target) return;
      
      let current = 0;
      const increment = target / 40;
      const originalHTML = el.innerHTML;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.innerHTML = originalHTML.replace(/\d+/, Math.floor(current));
      }, 30);
      
      obs.unobserve(el);
    }
  });
}, { threshold: 0.1 });

// Start observing numeric counters
document.querySelectorAll('.stat-big, .stat-number').forEach(el => countObserver.observe(el));

// CRM INTEGRATION - SUPABASE
async function enviarParaCRM(dadosLead) {
  const SUPABASE_URL = 'https://nlabhkhlvptasstpwxti.supabase.co/rest/v1/leads';
  const SUPABASE_KEY = 'sb_publishable_mPnOSlzFZteqtJEAYwnbPA_Jw7rN-CK';

  const params = new URLSearchParams(window.location.search);

  const payload = {
    nome: dadosLead.nome || '',
    email: dadosLead.email || '',
    whatsapp: dadosLead.whatsapp || '',
    sexo: dadosLead.sexo || '',
    objetivo: dadosLead.objetivo || '',
    nivel: dadosLead.nivel || '',
    idade: dadosLead.idade ? parseInt(dadosLead.idade) : null,
    peso: dadosLead.peso ? parseFloat(dadosLead.peso) : null,
    altura: dadosLead.altura ? parseFloat(dadosLead.altura) : null,
    gordura: dadosLead.gordura ? parseFloat(dadosLead.gordura) : null,
    massa: dadosLead.massa ? parseFloat(dadosLead.massa) : null,
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
    url: window.location.href,
    status: 'Lead'
  };

  try {
    await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(payload)
    });
  } catch(err) {
    console.warn('CRM: falha ao enviar lead', err);
  }
}

// CALCULATOR LOGIC
let calcState = {
  sexo: 'M',
  objetivo: 'definicao',
  nivel: 'iniciante'
};

function setToggle(el, group) {
  const buttons = document.querySelectorAll(`[data-group="${group}"]`);
  buttons.forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
  calcState[group] = el.dataset.value;
  calcularTransformacao();
}

function calcularTransformacao() {
  const idade = parseInt(document.getElementById('idade').value);
  const altura = parseInt(document.getElementById('altura').value);
  const peso = parseInt(document.getElementById('peso').value);

  const placeholder = document.getElementById('calc-placeholder');
  const calcDataEl = document.getElementById('calc-data');

  // Validação: Se qualquer campo obrigatório estiver vazio, ou idade menor que 15, ou peso menor que 40, não calcular e manter "—"
  if (!idade || !altura || !peso || idade < 15 || peso < 40) {
    placeholder.style.display = 'flex';
    calcDataEl.style.display = 'none';
    return;
  }

  placeholder.style.display = 'none';
  calcDataEl.style.display = 'block';

  // --- LÓGICA CIENTÍFICA PROJETO 8 EM 12 ---
  
  // STEP 1 - Base de gordura a perder (kg)
  let gorduraBase = 0;
  if (calcState.objetivo === 'definicao') gorduraBase = 7.0;
  else if (calcState.objetivo === 'massa') gorduraBase = 2.0;
  else gorduraBase = 4.5; // "Os dois"

  // STEP 2 - Multiplicador por nível de experiência
  let multNivel = 1.0;
  if (calcState.nivel === 'iniciante') multNivel = 1.25;
  else if (calcState.nivel === 'avancado') multNivel = 0.8;
  
  // STEP 3 - Multiplicador por faixa etária
  let multIdade = 1.0;
  if (idade <= 25) multIdade = 1.05;
  else if (idade <= 35) multIdade = 1.0;
  else if (idade <= 45) multIdade = 0.92;
  else multIdade = 0.85;

  // STEP 4 - Multiplicador por sexo
  let multSexo = (calcState.sexo === 'M') ? 1.08 : 1.0;

  // STEP 5 & 6 - Cálculo Final Gordura com Cap de 10kg
  let gorduraPerda = gorduraBase * multNivel * multIdade * multSexo;
  if (gorduraPerda > 10) gorduraPerda = 10;
  gorduraPerda = gorduraPerda.toFixed(1);

  // STEP 7 - Ganho de massa muscular (kg)
  let massaBase = 0;
  if (calcState.nivel === 'iniciante') massaBase = 2.5;
  else if (calcState.nivel === 'intermediario') massaBase = 1.5;
  else massaBase = 0.8;

  let multMassaSexo = (calcState.sexo === 'M') ? 1.15 : 1.0;

  let multMassaObj = 1.0;
  if (calcState.objetivo === 'definicao') multMassaObj = 0.6;
  else if (calcState.objetivo === 'massa') multMassaObj = 1.4;

  let massaGanho = (massaBase * multMassaSexo * multMassaObj).toFixed(1);

  // OUTPUT
  document.getElementById('val-gordura').innerText = `-${gorduraPerda}kg`;
  document.getElementById('val-massa').innerText = `+${massaGanho}kg`;

  // Atualização visual das barras
  const barGordura = document.getElementById('bar-gordura');
  const barMassa = document.getElementById('bar-massa');
  barGordura.style.width = Math.min((gorduraPerda / 10) * 100, 100) + '%';
  barMassa.style.width = Math.min((massaGanho / 4) * 100, 100) + '%';

  const badge = document.getElementById('calc-profile-badge');
  badge.innerText = `Perfil: ${calcState.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${calcState.nivel.toUpperCase()}`;

  const motivation = document.getElementById('calc-motivation');
  motivation.innerText = `Você tem um potencial genético excelente para ${calcState.objetivo}. Em 12 semanas, seu físico será outro.`;
}

// DEPO MARKS — dispara animação de risco/círculo
const depoSection = document.querySelector('.testimonial-single');
if (depoSection) {
  const depoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('drawn');
        depoObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  depoObserver.observe(depoSection);
}

// MODAL LOGIC
const modalOverlay = document.getElementById('modalOverlay');
const step1 = document.getElementById('modal-step-1');
const step2 = document.getElementById('modal-step-2');

function openModal() {
  // Sincroniza inputs numéricos
  document.getElementById('m-idade').value = document.getElementById('idade').value;
  document.getElementById('m-altura').value = document.getElementById('altura').value;
  document.getElementById('m-peso').value = document.getElementById('peso').value;

  // Sincroniza o estado dos seletores
  modalState.msexo = calcState.sexo;
  modalState.mobjetivo = calcState.objetivo;
  modalState.mnivel = calcState.nivel;

  // Sincroniza visualmente os botões de toggle do modal
  updateModalToggles();

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // GA4: view_item | Meta: ViewContent
  pushEvent('modal_open', { content_name: 'Projeto 8 EM 12', content_category: 'fitness' });

  // Atualiza o cálculo no modal
  calcModal();
}

function updateModalToggles() {
  const mapping = {
    'msexo': modalState.msexo,
    'mobjetivo': modalState.mobjetivo,
    'mnivel': modalState.mnivel
  };

  Object.keys(mapping).forEach(group => {
    const val = mapping[group];
    const buttons = document.querySelectorAll(`.modal-box [data-group="${group}"]`);
    buttons.forEach(btn => {
      if (btn.dataset.value === val) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  });
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalOnOverlay(e) {
  if (e.target === modalOverlay) closeModal();
}

let modalState = {
  msexo: 'M',
  mobjetivo: 'definicao',
  mnivel: 'iniciante'
};

function setModalToggle(el, group) {
  const buttons = document.querySelectorAll(`[data-group="${group}"]`);
  buttons.forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
  modalState[group] = el.dataset.value;
  calcModal();
}

function calcModal() {
  const idade = parseInt(document.getElementById('m-idade').value);
  const peso = parseInt(document.getElementById('m-peso').value);
  const altura = parseInt(document.getElementById('m-altura').value);
  const resultDiv = document.getElementById('modal-result');
  const btnAvancar = document.getElementById('modal-btn-avancar');

  // Validação idêntica à calculadora principal
  if (idade && peso && altura && idade >= 15 && peso >= 40) {
    resultDiv.style.display = 'block';
    btnAvancar.style.display = 'block';
    
    // --- MESMA LÓGICA CIENTÍFICA ---
    let gorduraBase = 0;
    if (modalState.mobjetivo === 'definicao') gorduraBase = 7.0;
    else if (modalState.mobjetivo === 'massa') gorduraBase = 2.0;
    else gorduraBase = 4.5;

    let multNivel = 1.0;
    if (modalState.mnivel === 'iniciante') multNivel = 1.25;
    else if (modalState.mnivel === 'avancado') multNivel = 0.8;

    let multIdade = 1.0;
    if (idade <= 25) multIdade = 1.05;
    else if (idade <= 35) multIdade = 1.0;
    else if (idade <= 45) multIdade = 0.92;
    else multIdade = 0.85;

    let multSexo = (modalState.msexo === 'M') ? 1.08 : 1.0;

    let g = gorduraBase * multNivel * multIdade * multSexo;
    if (g > 10) g = 10;
    g = g.toFixed(1);

    let massaBase = 0;
    if (modalState.mnivel === 'iniciante') massaBase = 2.5;
    else if (modalState.mnivel === 'intermediario') massaBase = 1.5;
    else massaBase = 0.8;

    let multMassaSexo = (modalState.msexo === 'M') ? 1.15 : 1.0;

    let multMassaObj = 1.0;
    if (modalState.mobjetivo === 'definicao') multMassaObj = 0.6;
    else if (modalState.mobjetivo === 'massa') multMassaObj = 1.4;

    let m = (massaBase * multMassaSexo * multMassaObj).toFixed(1);
    
    // Salva no estado para o CRM
    modalState.g = g;
    modalState.m = m;
    modalState.idade = idade;
    modalState.peso = peso;
    modalState.altura = altura;

    document.getElementById('mr-gordura').innerText = `-${g}kg`;
    document.getElementById('mr-massa').innerText = `+${m}kg`;
    document.getElementById('mr-msg').innerText = "Resultado estimado para 12 semanas de protocolo.";

    // GA4: custom event | Meta: usar como sinal de engajamento
    pushEvent('calculator_result', {
      sexo: modalState.msexo,
      objetivo: modalState.mobjetivo,
      nivel: modalState.mnivel,
      idade: idade,
      gordura_kg: parseFloat(g),
      massa_kg: parseFloat(m)
    });
  } else {
    resultDiv.style.display = 'none';
    btnAvancar.style.display = 'none';
  }
}

function avancarModal() {
  step1.style.display = 'none';
  step2.style.display = 'block';

  const g = document.getElementById('mr-gordura').innerText;
  const m = document.getElementById('mr-massa').innerText;
  document.getElementById('modal-result-summary').innerText = `Seu potencial: ${g} gordura / ${m} massa muscular`;

  // GA4: begin_checkout analogue | Meta: InitiateCheckout
  pushEvent('form_step2', { content_name: 'Projeto 8 EM 12' });
}

function voltarModal() {
  step1.style.display = 'block';
  step2.style.display = 'none';
}

function submitModal(e) {
  e.preventDefault();
  const nome = document.getElementById('modal-nome').value;
  const fone = document.getElementById('modal-fone').value;
  const email = ''; // coletado no checkout

  const resultDiv = document.getElementById('modal-result');
  const hasResults = resultDiv.style.display !== 'none';

  let msg = "";
  if (hasResults) {
    msg = `Olá Dionatan! Me chamo ${nome}. Calculei meu potencial no site e vi que posso perder até ${modalState.g}kg de gordura e ganhar ${modalState.m}kg de massa em 12 semanas. Quero garantir minha vaga no Projeto 8 EM 12!`;
  } else {
    msg = `Olá Dionatan! Me chamo ${nome}. Quero saber mais sobre o Projeto 8 EM 12 e garantir minha vaga!`;
  }

  const dadosCompletos = {
    nome: nome,
    email: email,
    whatsapp: fone,
    sexo: modalState.msexo,
    objetivo: modalState.mobjetivo,
    nivel: modalState.mnivel,
    idade: modalState.idade || '',
    peso: modalState.peso || '',
    altura: modalState.altura || '',
    gordura: hasResults ? modalState.g : '',
    massa: hasResults ? modalState.m : ''
  };

  // Dispara o CRM sem travar o usuário
  enviarParaCRM(dadosCompletos);

  // GA4: generate_lead | Meta CAPI: Lead
  // GTM vai ler email/phone e hashar antes de enviar ao CAPI
  pushEvent('lead', {
    lead_name: nome,
    lead_email: email,
    lead_phone: fone,
    sexo: modalState.msexo,
    objetivo: modalState.mobjetivo,
    nivel: modalState.mnivel,
    gordura_kg: hasResults ? parseFloat(modalState.g) : undefined,
    massa_kg: hasResults ? parseFloat(modalState.m) : undefined,
    value: 497,
    currency: 'BRL',
    content_name: 'Projeto 8 EM 12'
  });

  // GA4: purchase_intent | Meta CAPI: InitiateCheckout
  pushEvent('initiate_checkout', {
    lead_name: nome,
    value: 497,
    currency: 'BRL',
    content_name: 'Projeto 8 EM 12'
  });

  // Mostra step 3 de agradecimento
  step2.style.display = 'none';
  const step3 = document.getElementById('modal-step-3');
  step3.style.display = 'block';
  document.getElementById('modal-thanks-nome').innerText = nome;

  // Abre checkout em nova aba e fecha modal após 2.5s
  window.open('https://link.infinitepay.io/diou-alves/VC1DLUMtSQ-3Q51Xws4F-497,00', '_blank');
  setTimeout(() => {
    step3.style.display = 'none';
    closeModal();
  }, 2500);
}

// =============================================================
// WHATSAPP BOT FLUTUANTE
// Fluxo: nome → objetivo → redirect WhatsApp com contexto
// =============================================================
const WBOT_PHONE = '5574999531223';
let wbotStep = 0;
let wbotData = { nome: '', objetivo: '' };

function wbotOpen() {
  const popup = document.getElementById('wbotPopup');
  const fab = document.getElementById('wbotFab');
  popup.classList.add('open');
  fab.classList.add('hidden');
  if (wbotStep === 0) wbotStart();
}

function wbotClose() {
  document.getElementById('wbotPopup').classList.remove('open');
  document.getElementById('wbotFab').classList.remove('hidden');
}

function wbotStart() {
  const msgs = document.getElementById('wbotMessages');
  msgs.innerHTML = '';
  
  // Resgata o que a pessoa já preencheu na calculadora (se preencheu)
  wbotData = { 
    nome: '', 
    whatsapp: '',
    objetivo: calcState.objetivo || 'perder gordura',
    sexo: calcState.sexo || 'M',
    nivel: calcState.nivel || 'iniciante',
    idade: document.getElementById('idade') ? document.getElementById('idade').value : '',
    peso: document.getElementById('peso') ? document.getElementById('peso').value : '',
    altura: document.getElementById('altura') ? document.getElementById('altura').value : ''
  };

  wbotStep = 1;
  wbotTyping(700, () => {
    wbotAddMsg('bot', 'Fala! 👋 O Dionatan pediu pra eu organizar a fila pra não te deixar esperando.');
    wbotTyping(800, () => {
      wbotAddMsg('bot', 'Qual é o seu <strong>primeiro nome</strong>?');
      wbotShowInput('text', 'Seu nome...', (nome) => {
        wbotData.nome = nome.trim();
        wbotAddMsg('user', wbotData.nome);
        askWhatsApp();
      });
    });
  });
}

function askWhatsApp() {
  wbotTyping(700, () => {
    wbotAddMsg('bot', `${wbotData.nome}! Prazer. Qual é o seu <strong>WhatsApp com DDD</strong>?`);
    wbotShowInput('tel', '(11) 99999-9999', (fone) => {
      wbotData.whatsapp = fone.trim();
      wbotAddMsg('user', wbotData.whatsapp);
      
      // Se a pessoa já usou a calculadora, passa direto
      if (wbotData.idade && wbotData.peso && wbotData.altura) {
        finishWbot();
      } else {
        askObjetivo();
      }
    });
  });
}

function askObjetivo() {
  wbotTyping(700, () => {
    wbotAddMsg('bot', 'Qual é o seu <strong>objetivo principal</strong>?');
    wbotShowButtons([
      { label: '🔥 Perder gordura', value: 'perder gordura' },
      { label: '💪 Ganhar massa', value: 'ganhar massa muscular' },
      { label: '⚡ Os dois', value: 'perder gordura e ganhar massa' }
    ], (val) => {
      wbotData.objetivo = val;
      wbotAddMsg('user', val);
      askFisico();
    });
  });
}

function askFisico() {
  wbotTyping(700, () => {
    wbotAddMsg('bot', 'Pra agilizar a análise do Diou, me manda sua <strong>Idade, Peso e Altura</strong> (ex: 28 anos, 80kg, 175cm):');
    wbotShowInput('text', 'Ex: 28, 80kg, 1.75m', (fisico) => {
      wbotAddMsg('user', fisico);
      
      // Tenta extrair os numeros de "28, 80, 175"
      const numbers = fisico.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
         wbotData.idade = numbers[0];
         wbotData.peso = numbers[1];
         wbotData.altura = numbers[2] > 10 ? numbers[2] : numbers[2] * 100; // Trata "1.75" vs "175"
      }
      finishWbot();
    });
  });
}

function finishWbot() {
  wbotStep = 5;
  
  // Envia tudo pro CRM Supabase!
  enviarParaCRM({
    nome: wbotData.nome,
    whatsapp: wbotData.whatsapp,
    objetivo: wbotData.objetivo,
    sexo: wbotData.sexo,
    nivel: wbotData.nivel,
    idade: wbotData.idade,
    peso: wbotData.peso,
    altura: wbotData.altura,
    gordura: undefined, // Somente calculadora garante esse cálculo exato
    massa: undefined
  });

  wbotTyping(900, () => {
    wbotAddMsg('bot', 'Tudo certo! 🎯 Preparei sua mensagem com seus dados:');
    const msg = `Oi Dionatan! Me chamo ${wbotData.nome}, vim pelo site do Projeto 8 EM 12. Meu objetivo é ${wbotData.objetivo} e quero saber como garantir minha vaga!`;
    
    pushEvent('whatsapp_lead', {
      lead_name: wbotData.nome,
      lead_phone: wbotData.whatsapp,
      objetivo: wbotData.objetivo,
      content_name: 'Projeto 8 EM 12'
    });
    
    const area = document.getElementById('wbotInputArea');
    area.innerHTML = `<a class="wbot-cta-btn" href="https://wa.me/${WBOT_PHONE}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" onclick="setTimeout(()=>{wbotClose();wbotStep=0;},300)">💬 Falar com o Dionatan</a>`;
  });
}

function wbotAddMsg(type, html) {
  const msgs = document.getElementById('wbotMessages');
  const div = document.createElement('div');
  div.className = `wbot-msg wbot-msg--${type}`;
  div.innerHTML = html;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function wbotTyping(delay, cb) {
  const msgs = document.getElementById('wbotMessages');
  const indicator = document.createElement('div');
  indicator.className = 'wbot-typing';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(indicator);
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    indicator.remove();
    cb();
  }, delay);
}

function wbotShowInput(type, placeholder, cb) {
  const area = document.getElementById('wbotInputArea');
  area.innerHTML = `
    <form class="wbot-form" onsubmit="event.preventDefault()">
      <input class="wbot-input" type="${type}" placeholder="${placeholder}" required autofocus>
      <button class="wbot-send" type="submit">→</button>
    </form>`;
  const form = area.querySelector('.wbot-form');
  const input = area.querySelector('.wbot-input');
  form.addEventListener('submit', () => {
    if (!input.value.trim()) return;
    area.innerHTML = '';
    cb(input.value);
  });
}

let _wbotBtnCb = null;
function wbotShowButtons(options, cb) {
  _wbotBtnCb = cb;
  const area = document.getElementById('wbotInputArea');
  area.innerHTML = '<div class="wbot-btns">' + options.map((opt, i) =>
    `<button class="wbot-btn" data-idx="${i}">${opt.label}</button>`
  ).join('') + '</div>';
  area.querySelectorAll('.wbot-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      area.innerHTML = '';
      if (_wbotBtnCb) _wbotBtnCb(options[i].value);
    });
  });
}

// =============================================================
// HERO RIGHT CAROUSEL — cross-fade Dionatan ↔ Antes/Depois
// =============================================================
(function () {
  const img     = document.getElementById('hrcImgInner');
  const imgCard = document.getElementById('hrcImgCard');
  const stat1   = document.getElementById('hrcStat1');
  const stat2   = document.getElementById('hrcStat2');
  const dots    = document.querySelectorAll('.hrc-dot');
  console.log('[HRC] init — img:', !!img, 'dots:', dots.length);
  if (!img) return;

  let current = 0;

  const slides = [
    {
      bg: "url('assets/hero/dramatica1.webp') center top / cover no-repeat",
      bgPos: 'center top',
      filter: 'none',
      card: `<div class="hero-image-name">DIONATAN ALVES</div>
             <div class="hero-image-title">Pós Graduado Bodybuilder Coach · DYHIT Certified</div>`,
      stat1: `<div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--orange);line-height:1">12</div>
              <div style="font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:4px">Semanas</div>`,
      stat2: `<div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--orange);line-height:1">50</div>
              <div style="font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:4px">Vagas disponíveis</div>`
    },
    {
      bg: "url('assets/antes-depois/antesedepois2_home.webp') center top / cover no-repeat",
      bgPos: 'center top',
      filter: 'grayscale(1) contrast(1.1) brightness(0.9)',
      card: `<div class="hero-image-name">TRANSFORMAÇÃO REAL</div>
             <div class="hero-image-title">Protocolo: 12 Semanas · Método 8 em 12</div>`,
      stat1: `<div style="font-family:'Bebas Neue',sans-serif;font-size:42px;color:#FF6A00;line-height:1">-10<span style="font-size:22px">kg</span></div>
              <div style="font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:4px">Resultado médio</div>`,
      stat2: `<div style="display:flex;align-items:center;gap:10px; cursor: pointer;" onclick="document.getElementById('resultados').scrollIntoView({behavior:'smooth'})">
                <div style="width:36px;height:36px;border-radius:50%;background:#FF6A00;color:white;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0">A</div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:white;line-height:1.2">Conheça o depoimento da Ana</div>
                  <div style="font-size:11px;color:#4ade80;margin-top:2px">✓ Aluna do Projeto 8 EM 12</div>
                </div>
              </div>`
    }
  ];

  function goTo(idx) {
    current = ((idx % slides.length) + slides.length) % slides.length;
    const s = slides[current];

    // fade out
    [img, stat1, stat2].forEach(el => { el.style.transition = 'opacity 0.35s ease'; el.style.opacity = '0'; });

    setTimeout(() => {
      // troca background e filtro via inline style
      img.style.background = s.bg;
      img.style.filter = s.filter || 'none';
      imgCard.innerHTML = s.card;
      stat1.innerHTML = s.stat1;
      stat2.innerHTML = s.stat2;

      // Troca de lados (Horizontal Swap) conforme solicitado
      if (current === 1) {
        stat1.classList.add('stat-pos-left');
        stat1.classList.remove('stat-pos-right');
        stat2.classList.add('stat-pos-right');
        stat2.classList.remove('stat-pos-left');
      } else {
        stat1.classList.remove('stat-pos-left');
        stat1.classList.add('stat-pos-right');
        stat2.classList.remove('stat-pos-right');
        stat2.classList.add('stat-pos-left');
      }

      // fade in
      [img, stat1, stat2].forEach(el => { el.style.opacity = '1'; });
    }, 350);

    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      console.log('[HRC] dot click → goTo', dot.dataset.slide);
      goTo(parseInt(dot.dataset.slide));
    });
  });

  // Parâmetro de URL: ?hero=resultado → começa no slide antes/depois
  const heroParam = new URLSearchParams(window.location.search).get('hero');
  if (heroParam === 'resultado') goTo(1);

  // autoplay 5s
  setInterval(() => goTo((current + 1) % slides.length), 5000);
})();

// =============================================================
// BEFORE/AFTER CAROUSEL — controle manual + autoplay
// =============================================================
(function () {
  const track = document.getElementById('baTrack');
  const TOTAL = 8; 
  let current = 0;
  let paused = false;
  let autoTimer = null;

  function updatePosition() {
    const card = track.querySelector('.ba-card');
    if (!card) return;
    const gap = 20; 
    const cardWidth = card.getBoundingClientRect().width;
    const cardSize = cardWidth + gap;
    const wrapperWidth = track.parentElement.offsetWidth;
    
    // Centraliza apenas no Mobile (< 768px)
    let offset = 0;
    if (window.innerWidth < 768) {
      offset = (wrapperWidth - cardWidth) / 2;
    }
    
    track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translate3d(${offset - (current * cardSize)}px, 0, 0)`;
  }

  function goTo(idx) {
    current = ((idx % TOTAL) + TOTAL) % TOTAL;
    updatePosition();
  }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!paused) {
        current = (current + 1) % TOTAL;
        updatePosition();
      }
    }, 3500);
  }

  track.addEventListener('mouseenter', () => paused = true);
  track.addEventListener('mouseleave', () => paused = false);

  window.addEventListener('resize', updatePosition);
  
  // Posicionamento inicial — requestAnimationFrame evita forced reflow na thread principal
  requestAnimationFrame(updatePosition);
  startAuto();
})();

// FAQ TOGGLE
function toggleFaq(el) {
  const item = el.parentElement;
  item.classList.toggle('open');
}

// EXPERT CAROUSEL LOGIC
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('expertCarouselTrack');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  
  if (!track || !prevBtn || !nextBtn) return;

  const items = document.querySelectorAll('.expert-carousel-item');
  let currentIndex = 0;
  const totalItems = items.length;

  function updateCarousel() {
    const offset = currentIndex * -100;
    track.style.transform = `translateX(${offset}%)`;
  }

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % totalItems;
    updateCarousel();
  });

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    updateCarousel();
  });

  // Optional: Auto-play
  let autoPlay = setInterval(() => {
    currentIndex = (currentIndex + 1) % totalItems;
    updateCarousel();
  }, 5000);

  // Pause auto-play on interaction
  [prevBtn, nextBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      clearInterval(autoPlay);
    });
  });
});































