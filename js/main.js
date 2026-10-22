(function () {
  'use strict';

  var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Accordion (O que você sai sabendo) ---------- */
  document.querySelectorAll('.accordion__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.accordion__item');
      var aberto = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!aberto));
      item.classList.toggle('is-open', !aberto);
    });
  });

  /* ---------- Eventos de clique nos CTAs ---------- */
  window.dataLayer = window.dataLayer || [];
  document.querySelectorAll('[data-cta]').forEach(function (link) {
    link.addEventListener('click', function () {
      var cta = link.getAttribute('data-cta');
      window.dataLayer.push({ event: 'cta_click', cta_id: cta, cta_texto: link.textContent.trim() });
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'cta_click', { cta_id: cta });
      }
    });
  });

  /* ---------- Selos orbitando em volta do especialista ---------- */
  var orbita = document.querySelector('[data-orbita]');
  if (!orbita) return;

  var selos = Array.prototype.slice.call(orbita.querySelectorAll('.orbita__selo'));

  // Geometria medida no layout (imagem de 562 x 611): centro do círculo e raios da órbita
  var BASE_LARGURA = 562;
  var CENTRO_X = 276 / 562;
  var CENTRO_Y = 334 / 611;
  var RAIO_X = 340 / 562;
  var RAIO_Y = 250 / 562;
  var VOLTA_MS = 36000;  // tempo de uma volta completa
  var ENTRADA_MS = 900;  // duração do surgimento de cada selo
  var INTERVALO_MS = 260; // atraso entre um selo e o próximo

  var dados = selos.map(function (el) {
    return { el: el, angulo: parseFloat(el.getAttribute('data-angulo')) * Math.PI / 180, w: 0, h: 0 };
  });

  var largura = 0;
  var altura = 0;

  function medir() {
    largura = orbita.clientWidth;
    altura = orbita.clientHeight;
    orbita.style.setProperty('--s', (largura / BASE_LARGURA).toFixed(4));
    dados.forEach(function (d) {
      d.w = d.el.offsetWidth;
      d.h = d.el.offsetHeight;
    });
    calcularRaioX();
  }

  function easeOutBack(t) {
    var c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Em telas estreitas, encolhe a órbita para os selos não saírem da tela
  var raioX = 0;
  function calcularRaioX() {
    var maiorMetade = dados.reduce(function (m, d) { return Math.max(m, d.w / 2); }, 0);
    var caixa = orbita.getBoundingClientRect();
    var palco = (orbita.closest('.tempo__palco') || document.documentElement).getBoundingClientRect();
    var centro = caixa.left + largura * CENTRO_X;
    var folga = Math.min(centro - palco.left, palco.right - centro) - maiorMetade - 12;
    raioX = Math.max(0, Math.min(largura * RAIO_X, folga));
  }

  function posicionar(d, giro, progresso) {
    var a = d.angulo + giro;
    var raio = easeOutBack(progresso);
    var cx = largura * CENTRO_X + Math.cos(a) * raioX * raio;
    var cy = altura * CENTRO_Y + Math.sin(a) * largura * RAIO_Y * raio;
    // leve profundidade: maior embaixo, menor em cima
    var escala = (0.92 + 0.08 * Math.sin(a)) * (0.4 + 0.6 * Math.min(1, raio));
    d.el.style.opacity = Math.min(1, progresso * 1.6).toFixed(3);
    d.el.style.zIndex = Math.sin(a) > -0.2 ? 3 : 2;
    d.el.style.transform =
      'translate(' + (cx - d.w / 2).toFixed(2) + 'px,' + (cy - d.h / 2).toFixed(2) + 'px) scale(' + escala.toFixed(3) + ')';
  }

  function estatico() {
    dados.forEach(function (d) { posicionar(d, 0, 1); });
  }

  medir();
  if (reduzMovimento) {
    // Sem animação: selos parados nas posições do layout
    var remedir = function () { medir(); estatico(); };
    window.addEventListener('resize', remedir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
    estatico();
    return;
  }
  window.addEventListener('resize', medir);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  dados.forEach(function (d) { posicionar(d, 0, 0); });

  var inicio = null;      // quando os selos começaram a surgir
  var tempoGiro = 0;      // tempo acumulado de rotação
  var ultimo = null;
  var visivel = false;
  var rafId = null;

  function quadro(agora) {
    if (inicio === null) inicio = agora;
    if (ultimo !== null) tempoGiro += agora - ultimo;
    ultimo = agora;

    var giro = (tempoGiro / VOLTA_MS) * Math.PI * 2;
    dados.forEach(function (d, i) {
      var p = (agora - inicio - i * INTERVALO_MS) / ENTRADA_MS;
      posicionar(d, giro, Math.max(0, Math.min(1, p)));
    });

    rafId = visivel ? requestAnimationFrame(quadro) : null;
  }

  // Só anima quando a seção está na tela
  var observer = new IntersectionObserver(function (entradas) {
    visivel = entradas[0].isIntersecting;
    if (visivel && rafId === null) {
      ultimo = null;
      rafId = requestAnimationFrame(quadro);
    }
  }, { threshold: 0.25 });
  observer.observe(orbita);
})();
