// script.js - Projeto 8 EM 12

document.addEventListener('DOMContentLoaded', () => {
    // Lógica da Calculadora
    window.calculateResults = function() {
        const peso = parseFloat(document.getElementById('peso').value);
        const altura = parseFloat(document.getElementById('altura').value);
        
        if (!peso || !altura) return alert("Preencha peso e altura!");

        // Exemplo de cálculo (substitua pela sua fórmula original se desejar)
        const gorduraPerda = peso * 0.12; 
        const massaGanho = 2.5;

        document.getElementById('res-gordura').innerText = gorduraPerda.toFixed(1) + "kg";
        document.getElementById('res-massa').innerText = "+" + massaGanho.toFixed(1) + "kg";
        
        // Abre o modal de captura
        document.getElementById('modal').style.display = 'flex';
    };
});

// Envio para WhatsApp
function sendToWhatsApp() {
    const nome = document.getElementById('modal-nome').value;
    const fone = document.getElementById('modal-fone').value;
    const texto = `Olá! Meu nome é ${nome}. Acabei de calcular meu plano no site e quero minha vaga no Projeto 8 em 12!`;
    const url = `https://wa.me/5547999999999?text=${encodeURIComponent(texto)}`; // AJUSTE SEU NÚMERO AQUI
    window.open(url, '_blank');
}
