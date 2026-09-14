/* Comportamento do site: menu, submenu e a busca do Milon.
   Sem bibliotecas — o site funciona inteiro sem JavaScript, isto aqui só
   melhora o que já está na página. */

(function () {
  'use strict';

  /* ---------------------------------------------------------- cabeçalho */

  var cabecalho = document.querySelector('.cabecalho');
  if (cabecalho) {
    var marcarRolagem = function () {
      cabecalho.classList.toggle('rolado', window.scrollY > 8);
    };
    marcarRolagem();
    window.addEventListener('scroll', marcarRolagem, { passive: true });
  }

  /* --------------------------------------------------------------- menu */

  var hamburguer = document.querySelector('.hamburguer');
  var menu = document.querySelector('.menu');

  if (hamburguer && menu) {
    hamburguer.addEventListener('click', function () {
      var aberto = menu.getAttribute('data-aberto') === 'sim';
      menu.setAttribute('data-aberto', aberto ? 'nao' : 'sim');
      hamburguer.setAttribute('aria-expanded', String(!aberto));
    });
  }

  var abridores = document.querySelectorAll('.abridor');

  var fecharSubmenus = function (menosEste) {
    abridores.forEach(function (botao) {
      if (botao === menosEste) return;
      botao.setAttribute('aria-expanded', 'false');
      var lista = document.getElementById(botao.getAttribute('aria-controls'));
      if (lista) lista.setAttribute('data-aberto', 'nao');
    });
  };

  abridores.forEach(function (botao) {
    var lista = document.getElementById(botao.getAttribute('aria-controls'));
    if (!lista) return;

    botao.addEventListener('click', function (evento) {
      evento.stopPropagation();
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      fecharSubmenus(botao);
      botao.setAttribute('aria-expanded', String(!aberto));
      lista.setAttribute('data-aberto', aberto ? 'nao' : 'sim');
    });
  });

  document.addEventListener('click', function (evento) {
    if (!evento.target.closest('.menu')) fecharSubmenus(null);
  });

  document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Escape') return;
    fecharSubmenus(null);
    if (menu && menu.getAttribute('data-aberto') === 'sim') {
      menu.setAttribute('data-aberto', 'nao');
      if (hamburguer) {
        hamburguer.setAttribute('aria-expanded', 'false');
        hamburguer.focus();
      }
    }
  });

  /* -------------------------------------------------------------- milon */

  var busca = document.getElementById('busca');
  if (!busca) return;

  var itens = Array.prototype.slice.call(document.querySelectorAll('[data-busca]'));
  var blocos = Array.prototype.slice.call(document.querySelectorAll('.bloco-milon'));
  var letras = Array.prototype.slice.call(document.querySelectorAll('.letra'));
  var contagem = document.getElementById('contagem');
  var alfabeto = document.querySelector('.alfabeto');
  var inicial = contagem ? contagem.dataset.inicial : '';

  var semAcento = function (texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  var filtrar = function () {
    var termo = semAcento(busca.value.trim());

    if (!termo) {
      itens.forEach(function (item) { item.classList.remove('escondido'); });
      letras.forEach(function (letra) { letra.classList.remove('escondido'); });
      blocos.forEach(function (bloco) { bloco.classList.remove('escondido'); });
      if (alfabeto) alfabeto.classList.remove('escondido');
      contagem.textContent = inicial;
      return;
    }

    var achados = 0;
    itens.forEach(function (item) {
      var bate = item.dataset.busca.indexOf(termo) !== -1;
      item.classList.toggle('escondido', !bate);
      if (bate) achados++;
    });

    letras.forEach(function (letra) { letra.classList.add('escondido'); });
    if (alfabeto) alfabeto.classList.add('escondido');

    blocos.forEach(function (bloco) {
      var tem = bloco.querySelector('[data-busca]:not(.escondido)');
      bloco.classList.toggle('escondido', !tem);
    });

    contagem.textContent = achados === 0
      ? 'Nada encontrado para \u201c' + busca.value.trim() + '\u201d.'
      : achados + (achados === 1 ? ' resultado.' : ' resultados.');
  };

  busca.addEventListener('input', filtrar);

  var limpar = document.getElementById('limpar-busca');
  if (limpar) {
    limpar.addEventListener('click', function () {
      busca.value = '';
      filtrar();
      busca.focus();
    });
  }

  filtrar();
})();
