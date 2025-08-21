// Prevenir scroll automático em cliques de botões
function preventAutoScroll() {
  // Prevenir scroll em cliques de links com href="#"
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a, button');
    if (target) {
      // Se for um link com href="#", prevenir o comportamento padrão
      if (target.tagName === 'A' && target.getAttribute('href') === '#') {
        e.preventDefault();
      }
      
      // Prevenir scroll para elementos com classes específicas
      if (target.classList.contains('download-btn') || 
          target.textContent.includes('Descargar') ||
          target.textContent.includes('Download')) {
        // Salvar posição atual
        const currentScrollY = window.scrollY;
        
        // Restaurar posição após um pequeno delay
        setTimeout(() => {
          window.scrollTo(0, currentScrollY);
        }, 10);
      }
    }
  });

  // Prevenir scroll em mudanças de hash
  window.addEventListener('hashchange', function(e) {
    e.preventDefault();
    return false;
  });

  // Remover scroll-behavior smooth temporariamente
  document.documentElement.style.scrollBehavior = 'auto';
}

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preventAutoScroll);
} else {
  preventAutoScroll();
}

export default preventAutoScroll;