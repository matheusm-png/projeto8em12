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

























































