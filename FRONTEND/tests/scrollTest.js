// Adicionar ao Google Analytics ou similar
function trackScrollEvents() {
  let scrollPrevented = 0;
  
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) {
      scrollPrevented++;
      // Enviar métrica
      gtag('event', 'scroll_prevented', {
        'event_category': 'UX',
        'event_label': e.target.tagName,
        'value': scrollPrevented
      });
    }
  });
}

// Adicionar ao Google Analytics ou similar
function trackScrollEvents() {
  let scrollPrevented = 0;
  
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) {
      scrollPrevented++;
      // Enviar métrica
      gtag('event', 'scroll_prevented', {
        'event_category': 'UX',
        'event_label': e.target.tagName,
        'value': scrollPrevented
      });
    }
  });
}
// Teste automatizado para verificar scroll
function testScrollPrevention() {
}// Teste automatizado para verificar scroll
function testScrollPrevention() {
  const tests = [
    {
      name: 'Botão Descargar',
      selector: '.descargar-btn',
      expectedScroll: false
    },
    {
      name: 'Link com #',
      selector: 'a[href="#"]',
      expectedScroll: false
    },
    {
      name: 'Botão normal',
      selector: 'button:not(.descargar-btn)',
      expectedScroll: false
    }
  ];

  tests.forEach(test => {
    const elements = document.querySelectorAll(test.selector);
    elements.forEach(el => {
      const initialScroll = window.scrollY;
      el.click();
      
      setTimeout(() => {
        const finalScroll = window.scrollY;
        const scrollOccurred = Math.abs(finalScroll - initialScroll) > 10;
        
        console.log(`${test.name}: ${scrollOccurred ? '❌ FALHOU' : '✅ PASSOU'}`);
      }, 100);
    });
  });
}

// Executar teste
testScrollPrevention();