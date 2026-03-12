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
  const dataLayer = document.getElementById('calc-data');

  if (!idade || !altura || !peso) {
    placeholder.style.display = 'flex';
    dataLayer.style.display = 'none';
    return;
  }

  placeholder.style.display = 'none';
  dataLayer.style.display = 'block';

  // Basic estimation logic
  let gorduraPerda = 0;
  let massaGanho = 0;

  if (calcState.objetivo === 'definicao') {
    gorduraPerda = (peso * 0.12).toFixed(1);
    massaGanho = (peso * 0.02).toFixed(1);
  } else if (calcState.objetivo === 'massa') {
    gorduraPerda = (peso * 0.03).toFixed(1);
    massaGanho = (peso * 0.08).toFixed(1);
  } else {
    gorduraPerda = (peso * 0.08).toFixed(1);
    massaGanho = (peso * 0.05).toFixed(1);
  }

  // Experience adjustment
  if (calcState.nivel === 'avancado') {
    massaGanho = (massaGanho * 0.4).toFixed(1);
    gorduraPerda = (gorduraPerda * 0.8).toFixed(1);
  } else if (calcState.nivel === 'intermediario') {
    massaGanho = (massaGanho * 0.7).toFixed(1);
  }

  document.getElementById('val-gordura').innerText = `-${gorduraPerda}kg`;
  document.getElementById('val-massa').innerText = `+${massaGanho}kg`;

  const barGordura = document.getElementById('bar-gordura');
  const barMassa = document.getElementById('bar-massa');
  barGordura.style.width = Math.min((gorduraPerda / 15) * 100, 100) + '%';
  barMassa.style.width = Math.min((massaGanho / 10) * 100, 100) + '%';

  const badge = document.getElementById('calc-profile-badge');
  badge.innerText = `Perfil: ${calcState.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${calcState.nivel.toUpperCase()}`;

  const motivation = document.getElementById('calc-motivation');
  motivation.innerText = `Você tem um potencial genético excelente para ${calcState.objetivo}. Em 12 semanas, seu físico será outro.`;
}

// MODAL LOGIC
const modalOverlay = document.getElementById('modalOverlay');
const step1 = document.getElementById('modal-step-1');
const step2 = document.getElementById('modal-step-2');

function openModal() {
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
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

  if (idade && peso && altura) {
    resultDiv.style.display = 'block';
    btnAvancar.style.display = 'block';
    
    let g = (peso * 0.1).toFixed(1);
    let m = (peso * 0.05).toFixed(1);
    
    document.getElementById('mr-gordura').innerText = `-${g}kg`;
    document.getElementById('mr-massa').innerText = `+${m}kg`;
    document.getElementById('mr-msg').innerText = "Resultado estimado para 12 semanas de protocolo.";
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
}

function voltarModal() {
  step1.style.display = 'block';
  step2.style.display = 'none';
}

function submitModal(e) {
  e.preventDefault();
  const nome = document.getElementById('modal-nome').value;
  const email = document.getElementById('modal-email').value;
  const fone = document.getElementById('modal-fone').value;
  const g = document.getElementById('mr-gordura').innerText;
  const m = document.getElementById('mr-massa').innerText;

  const msg = `Olá Dionatan! Meu nome é ${nome}. Vi minha calculadora (Potencial: ${g} gordura / ${m} massa) e quero garantir minha vaga no Projeto 8 em 12!`;
  const url = `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`; // Substituir pelo número real
  
  window.open(url, '_blank');
  closeModal();
}

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































