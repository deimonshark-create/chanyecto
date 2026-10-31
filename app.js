/* =========================================================
   QUIZ INTERACTIVO — LAMINARIO DE PARASITOLOGÍA (TEMA 6)
   Lógica: orden aleatorio, verificación estricta por campo,
   navegación, puntuación y resultados finales.
   ========================================================= */
(function () {
  'use strict';

  var CAMPOS = [
    { key: 'enfermedad',  label: 'ENFERMEDAD',   rows: 2, ph: 'Escribe el nombre de la enfermedad…' },
    { key: 'agente',      label: 'AGENTE CAUSAL', rows: 2, ph: 'Escribe el agente causal…' },
    { key: 'sintomas',    label: 'SÍNTOMAS',      rows: 4, ph: 'Escribe los síntomas…' },
    { key: 'tratamiento', label: 'TRATAMIENTO',   rows: 3, ph: 'Escribe el tratamiento…' }
  ];

  var TOTAL_CAMPOS = window.LAMINARIO.length * CAMPOS.length;

  /* ---------- utilidades ---------- */

  function norm(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')          // tildes / diéresis
      .toLowerCase()
      .replace(/[“”„«»"'´`]/g, '')              // comillas
      .replace(/[–—−]/g, '-')                    // guiones tipográficos
      .replace(/[.,;:!?¿¡()[\]{}…]/g, ' ')       // signos de puntuación
      .replace(/\//g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function coincide(entrada, esperado) {
    var limpio = norm(entrada);
    if (!limpio) return false;
    return norm(esperado) === limpio;
  }

  function escaparHtml(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pintarRespuesta(texto) {
    return escaparHtml(texto).replace(/\n/g, '<br>');
  }

  function barajar(lista) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copia[i];
      copia[i] = copia[j];
      copia[j] = tmp;
    }
    return copia;
  }

  function porId(id) {
    for (var i = 0; i < window.LAMINARIO.length; i++) {
      if (window.LAMINARIO[i].id === id) return window.LAMINARIO[i];
    }
    return null;
  }

  /* ---------- estado ---------- */

  var estado = {
    orden: [],
    indice: 0,
    respuestas: {},
    estados: {},       // 'idle' | 'correct' | 'incorrect'
    verificado: {},    // preguntas verificadas al menos una vez
    finalizado: false
  };

  function nuevoEstado() {
    estado.orden = barajar(window.LAMINARIO.map(function (q) { return q.id; }));
    estado.indice = 0;
    estado.respuestas = {};
    estado.estados = {};
    estado.verificado = {};
    estado.finalizado = false;

    window.LAMINARIO.forEach(function (q) {
      estado.respuestas[q.id] = {};
      estado.estados[q.id] = {};
      estado.verificado[q.id] = false;
      CAMPOS.forEach(function (c) {
        estado.respuestas[q.id][c.key] = '';
        estado.estados[q.id][c.key] = 'idle';
      });
    });
  }

  function preguntaActual() {
    return porId(estado.orden[estado.indice]);
  }

  /* ---------- referencias DOM ---------- */

  var $ = function (sel) { return document.querySelector(sel); };

  var el = {
    form: $('#answer-form'),
    camposCont: $('#fields'),
    imagen: $('#q-image'),
    mediaFrame: $('#media-frame'),
    pagina: $('#q-page'),
    indicador: $('#q-indicator'),
    lamina: $('#q-lamina'),
    barra: $('#p-bar'),
    pPregunta: $('#p-question'),
    pPorcentaje: $('#p-percent'),
    sOk: $('#s-ok'),
    sBad: $('#s-bad'),
    sScore: $('#s-score'),
    sPending: $('#s-pending'),
    mapa: $('#qmap'),
    btnVerificar: $('#btn-verify'),
    btnAnterior: $('#btn-prev'),
    btnSiguiente: $('#btn-next'),
    btnReintentar: $('#btn-retry'),
    btnFinalizar: $('#btn-finish'),
    quiz: $('#quiz'),
    resultados: $('#results'),
    rGrade: $('#r-grade'),
    rOk: $('#r-ok'),
    rBad: $('#r-bad'),
    rPct: $('#r-pct'),
    rPreguntas: $('#r-questions'),
    rLista: $('#r-review'),
    rBloqueOk: $('#r-correct-block'),
    rListaOk: $('#r-correct-list'),
    rMensaje: $('#r-message'),
    btnReiniciar: $('#btn-restart'),
    btnRevisar: $('#btn-review-answers'),
    modal: $('#modal'),
    modalTexto: $('#modal-text'),
    modalOk: $('#modal-ok'),
    modalCancel: $('#modal-cancel'),
    toast: $('#toast'),
    lightbox: $('#lightbox'),
    lightboxImg: $('#lightbox-img')
  };

  /* ---------- construcción de campos ---------- */

  var refsCampos = {};

  function construirCampos() {
    CAMPOS.forEach(function (c, i) {
      var wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.dataset.field = c.key;

      var head = document.createElement('div');
      head.className = 'field-head';

      var num = document.createElement('span');
      num.className = 'field-num';
      num.textContent = String(i + 1);

      var label = document.createElement('label');
      label.setAttribute('for', 'in-' + c.key);
      label.textContent = c.label;

      var marca = document.createElement('span');
      marca.className = 'field-status';
      marca.setAttribute('aria-live', 'polite');

      head.appendChild(num);
      head.appendChild(label);
      head.appendChild(marca);

      var area = document.createElement('textarea');
      area.id = 'in-' + c.key;
      area.rows = c.rows;
      area.placeholder = c.ph;
      area.autocomplete = 'off';
      area.spellcheck = false;
      area.setAttribute('aria-label', c.label);

      var feedback = document.createElement('div');
      feedback.className = 'field-feedback';
      feedback.hidden = true;
      feedback.innerHTML =
        '<p class="fb-line"><span class="fb-icon" aria-hidden="true"></span><span class="fb-text"></span></p>' +
        '<div class="fb-answer" hidden>' +
          '<span class="fb-answer-label">Respuesta correcta del PDF:</span>' +
          '<span class="fb-answer-text"></span>' +
        '</div>';

      wrap.appendChild(head);
      wrap.appendChild(area);
      wrap.appendChild(feedback);
      el.camposCont.appendChild(wrap);

      refsCampos[c.key] = {
        wrap: wrap,
        area: area,
        marca: marca,
        feedback: feedback,
        fbIcon: feedback.querySelector('.fb-icon'),
        fbText: feedback.querySelector('.fb-text'),
        fbAnswer: feedback.querySelector('.fb-answer'),
        fbAnswerText: feedback.querySelector('.fb-answer-text')
      };

      area.addEventListener('input', function () {
        var q = preguntaActual();
        estado.respuestas[q.id][c.key] = area.value;
        autoAlto(area);
        pintarMapa();
      });

      area.addEventListener('keydown', function (ev) {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
          ev.preventDefault();
          verificar();
        }
      });
    });
  }

  function autoAlto(area) {
    area.style.height = 'auto';
    area.style.height = Math.max(area.scrollHeight, 52) + 'px';
  }

  /* ---------- render ---------- */

  function pintarPregunta() {
    var q = preguntaActual();
    var n = estado.indice + 1;

    el.imagen.src = q.imagen;
    el.imagen.alt = 'Imagen de la ficha ' + q.ficha + ' correspondiente a la pregunta actual';
    el.pagina.textContent = q.ficha;
    el.indicador.textContent = 'Pregunta ' + n + ' de ' + estado.orden.length;
    el.lamina.textContent = 'Ficha ' + q.ficha;

    CAMPOS.forEach(function (c) {
      var r = refsCampos[c.key];
      var valor = estado.respuestas[q.id][c.key];
      if (r.area.value !== valor) r.area.value = valor;
      aplicarEstadoCampo(q, c.key);
      autoAlto(r.area);
    });

    el.btnAnterior.disabled = estado.indice === 0;
    el.btnSiguiente.disabled = estado.indice === estado.orden.length - 1;

    pintarBarra();
    pintarMapa();
    pintarEstadisticas();
  }

  function aplicarEstadoCampo(q, key) {
    var r = refsCampos[key];
    var st = estado.estados[q.id][key];
    var valor = q[key];

    r.wrap.classList.remove('is-correct', 'is-incorrect');
    r.feedback.hidden = true;
    r.fbAnswer.hidden = true;
    r.marca.textContent = '';
    r.marca.className = 'field-status';
    r.area.readOnly = false;
    r.area.setAttribute('aria-invalid', 'false');

    if (st === 'correct') {
      r.wrap.classList.add('is-correct');
      r.area.readOnly = true;
      r.marca.textContent = '✓';
      r.marca.classList.add('ok');
      r.feedback.hidden = false;
      r.fbIcon.textContent = '✓';
      r.fbText.textContent = '¡CORRECTO!';
      r.feedback.classList.add('ok');
      r.feedback.classList.remove('bad');
      r.area.setAttribute('aria-invalid', 'false');
    } else if (st === 'incorrect') {
      r.wrap.classList.add('is-incorrect');
      r.marca.textContent = '✗';
      r.marca.classList.add('bad');
      r.feedback.hidden = false;
      r.feedback.classList.add('bad');
      r.feedback.classList.remove('ok');
      r.fbIcon.textContent = '✗';
      r.fbText.textContent = 'INCORRECTO';
      r.fbAnswer.hidden = false;
      r.fbAnswerText.innerHTML = pintarRespuesta(valor);
      r.area.setAttribute('aria-invalid', 'true');
    } else {
      r.feedback.classList.remove('ok', 'bad');
      r.area.setAttribute('aria-invalid', 'false');
    }
  }

  function pintarBarra() {
    var pct = Math.round(((estado.indice + 1) / estado.orden.length) * 100);
    el.barra.style.width = pct + '%';
    el.pPregunta.textContent = 'Pregunta ' + (estado.indice + 1) + ' de ' + estado.orden.length;
    el.pPorcentaje.textContent = 'Avance ' + pct + '%';
  }

  function calcular() {
    var correctas = 0, incorrectas = 0, pendientes = 0;
    window.LAMINARIO.forEach(function (q) {
      CAMPOS.forEach(function (c) {
        var s = estado.estados[q.id][c.key];
        if (s === 'correct') correctas++;
        else if (s === 'incorrect') incorrectas++;
        else pendientes++;
      });
    });
    return {
      correctas: correctas,
      incorrectas: incorrectas,
      pendientes: pendientes,
      total: TOTAL_CAMPOS,
      puntaje: (correctas / TOTAL_CAMPOS) * 100
    };
  }

  function pintarEstadisticas() {
    var r = calcular();
    el.sOk.textContent = r.correctas;
    el.sBad.textContent = r.incorrectas;
    el.sPending.textContent = r.pendientes;
    el.sScore.textContent = formatearNota(r.puntaje);
  }

  function formatearNota(n) {
    var redondeado = Math.round(n * 10) / 10;
    return (redondeado % 1 === 0) ? String(redondeado) : redondeado.toFixed(1);
  }

  function estadoPregunta(id) {
    var todos = CAMPOS.every(function (c) { return estado.estados[id][c.key] === 'correct'; });
    if (todos) return 'complete';
    var tocada = CAMPOS.some(function (c) { return estado.estados[id][c.key] !== 'idle'; });
    if (tocada) return 'partial';
    var escrita = CAMPOS.some(function (c) { return (estado.respuestas[id][c.key] || '').trim() !== ''; });
    if (escrita) return 'dirty';
    return 'empty';
  }

  function pintarMapa() {
    for (var i = 0; i < el.mapa.children.length; i++) {
      var btn = el.mapa.children[i];
      var id = estado.orden[i];
      btn.className = 'qmap-btn';
      var st = estadoPregunta(id);
      if (st === 'complete') btn.classList.add('done');
      else if (st === 'partial') btn.classList.add('flag');
      else if (st === 'dirty') btn.classList.add('touched');
      if (i === estado.indice) btn.classList.add('current');
      btn.setAttribute('aria-current', i === estado.indice ? 'true' : 'false');
      btn.setAttribute('aria-label', 'Ir a la pregunta ' + (i + 1));
      btn.title = 'Pregunta ' + (i + 1);
    }
  }

  function construirMapa() {
    el.mapa.innerHTML = '';
    estado.orden.forEach(function (id, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qmap-btn';
      b.textContent = String(i + 1);
      b.addEventListener('click', function () {
        irA(i);
      });
      el.mapa.appendChild(b);
    });
  }

  /* ---------- acciones ---------- */

  function verificar() {
    var q = preguntaActual();
    var algo = CAMPOS.some(function (c) {
      return (estado.respuestas[q.id][c.key] || '').trim() !== '';
    });

    if (!algo) {
      aviso('Escribe al menos una respuesta antes de verificar.');
      refsCampos[CAMPOS[0].key].area.focus();
      return;
    }

    var aciertosAhora = 0;
    CAMPOS.forEach(function (c) {
      if (estado.estados[q.id][c.key] === 'correct') return;
      var ok = coincide(estado.respuestas[q.id][c.key], q[c.key]);
      estado.estados[q.id][c.key] = ok ? 'correct' : 'incorrect';
      if (ok) aciertosAhora++;
    });

    estado.verificado[q.id] = true;

    CAMPOS.forEach(function (c) { aplicarEstadoCampo(q, c.key); });
    pintarMapa();
    pintarEstadisticas();

    var r = calcular();
    var todos = CAMPOS.every(function (c) { return estado.estados[q.id][c.key] === 'correct'; });

    if (todos) {
      aviso('¡Pregunta completada! Las cuatro respuestas son correctas.', 'ok');
      enfocarPendiente();
    } else {
      var fallos = CAMPOS.filter(function (c) {
        return estado.estados[q.id][c.key] !== 'correct';
      }).length;
      aviso(fallos + (fallos === 1 ? ' respuesta para corregir.' : ' respuestas para corregir.'), 'bad');
    }
  }

  function enfocarPendiente() {
    var q = preguntaActual();
    for (var i = 0; i < CAMPOS.length; i++) {
      var key = CAMPOS[i].key;
      if (estado.estados[q.id][key] !== 'correct') {
        refsCampos[key].area.focus();
        return;
      }
    }
  }

  function irA(indice) {
    if (indice < 0 || indice >= estado.orden.length) return;
    estado.indice = indice;
    pintarPregunta();
    document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reiniciarPregunta() {
    var q = preguntaActual();
    CAMPOS.forEach(function (c) {
      estado.respuestas[q.id][c.key] = '';
      estado.estados[q.id][c.key] = 'idle';
      refsCampos[c.key].area.value = '';
      aplicarEstadoCampo(q, c.key);
      autoAlto(refsCampos[c.key].area);
    });
    estado.verificado[q.id] = false;
    pintarMapa();
    pintarEstadisticas();
    aviso('Pregunta reiniciada. Inténtalo de nuevo.');
    refsCampos[CAMPOS[0].key].area.focus();
  }

  function finalizar() {
    var r = calcular();
    if (r.pendientes > 0) {
      el.modalTexto.textContent =
        'Todavía tienes ' + r.pendientes + ' respuesta' + (r.pendientes === 1 ? '' : 's') +
        ' sin resolver. Si finalizas ahora, esas respuestas contarán como incorrectas en la calificación final. ¿Deseas finalizar de todas formas?';
      abrirModal(function () { mostrarResultados(); });
    } else {
      mostrarResultados();
    }
  }

  function mostrarResultados() {
    estado.finalizado = true;
    var r = calcular();
    var nota = formatearNota(r.puntaje);

    el.rGrade.textContent = nota;
    el.rOk.textContent = r.correctas + ' / ' + r.total;
    el.rBad.textContent = (r.total - r.correctas) + ' / ' + r.total;
    el.rPct.textContent = formatearNota((r.correctas / r.total) * 100) + '%';
    el.rPreguntas.textContent = contarCompletas() + ' / ' + estado.orden.length;

    var repaso = [];
    var acertadas = [];
    estado.orden.forEach(function (id) {
      var q = porId(id);
      var fallos = CAMPOS.filter(function (c) {
        return estado.estados[id][c.key] !== 'correct';
      });
      if (fallos.length) {
        repaso.push({ q: q, fallos: fallos });
      } else {
        acertadas.push(q);
      }
    });

    repaso.sort(function (a, b) { return a.q.ficha - b.q.ficha; });
    acertadas.sort(function (a, b) { return a.ficha - b.ficha; });

    var lista = el.rLista;
    lista.innerHTML = '';
    if (!repaso.length) {
      el.rMensaje.hidden = false;
      el.rMensaje.textContent = '¡Excelente! Dominaste todas las enfermedades. No hay fichas pendientes de repaso.';
    } else {
      el.rMensaje.hidden = true;
      repaso.forEach(function (item) {
        var li = document.createElement('li');
        var head = document.createElement('div');
        head.className = 'rev-head';
        head.innerHTML =
          '<span class="rev-name">' + escaparHtml(nombreCorto(item.q)) + '</span>' +
          '<span class="rev-page">Ficha ' + item.q.ficha + '</span>';
        li.appendChild(head);

        var detalle = document.createElement('div');
        detalle.className = 'rev-detail';

        item.fallos.forEach(function (c) {
          detalle.appendChild(construirFila(item.q, c, false));
        });

        li.appendChild(detalle);
        lista.appendChild(li);
      });
    }

    // Preguntas con los cuatro apartados correctos
    el.rListaOk.innerHTML = '';
    if (!acertadas.length) {
      el.rBloqueOk.hidden = true;
    } else {
      el.rBloqueOk.hidden = false;
      acertadas.forEach(function (q) {
        var li = document.createElement('li');
        var head = document.createElement('div');
        head.className = 'rev-head';
        head.innerHTML =
          '<span class="rev-name">' + escaparHtml(nombreCorto(q)) + '</span>' +
          '<span class="rev-page">Ficha ' + q.ficha + ' · ✓ completa</span>';
        li.appendChild(head);

        var detalle = document.createElement('div');
        detalle.className = 'rev-detail';

        CAMPOS.forEach(function (c) {
          detalle.appendChild(construirFila(q, c, true));
        });

        li.appendChild(detalle);
        el.rListaOk.appendChild(li);
      });
    }

    el.quiz.hidden = true;
    el.resultados.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nombreCorto(q) {
    return q.enfermedad.split('\n')[0];
  }

  function construirFila(q, campo, acierto) {
    var dada = (estado.respuestas[q.id][campo.key] || '').trim();
    var fila = document.createElement('div');
    fila.className = 'rev-row';
    fila.innerHTML =
      '<p class="rev-field">' + campo.label + '</p>' +
      '<div class="rev-answers">' +
        '<div class="rev-answer rev-yours' + (acierto ? ' is-ok' : '') + '">' +
          '<span class="rev-answer-label">Tu respuesta</span>' +
          (dada
            ? '<span class="rev-text">' + pintarRespuesta(dada) + '</span>'
            : '<span class="rev-text rev-empty">Sin responder</span>') +
        '</div>' +
        '<div class="rev-answer rev-correct">' +
          '<span class="rev-answer-label">Respuesta correcta</span>' +
          '<span class="rev-text">' + pintarRespuesta(q[campo.key]) + '</span>' +
        '</div>' +
      '</div>';
    return fila;
  }

  function contarCompletas() {
    var n = 0;
    estado.orden.forEach(function (id) {
      if (estadoPregunta(id) === 'complete') n++;
    });
    return n;
  }

  function reiniciarQuiz() {
    nuevoEstado();
    el.resultados.hidden = true;
    el.quiz.hidden = false;
    construirMapa();
    pintarPregunta();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    aviso('Quiz reiniciado. Nuevo orden de preguntas.');
  }

  /* ---------- modal / aviso / lightbox ---------- */

  var modalAccion = null;

  function abrirModal(alAccion) {
    modalAccion = alAccion;
    el.modal.hidden = false;
    el.modalOk.focus();
  }

  function cerrarModal() {
    el.modal.hidden = true;
    modalAccion = null;
  }

  var toastTimer = null;

  function aviso(texto, tipo) {
    el.toast.textContent = texto;
    el.toast.className = 'toast' + (tipo ? ' ' + tipo : '');
    el.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.hidden = true;
    }, 3200);
  }

  function abrirLightbox() {
    var q = preguntaActual();
    el.lightboxImg.src = q.imagen;
    el.lightboxImg.alt = 'Imagen ampliada de la ficha ' + q.ficha;
    el.lightbox.hidden = false;
  }

  function cerrarLightbox() {
    el.lightbox.hidden = true;
  }

  /* ---------- eventos ---------- */

  el.btnVerificar.addEventListener('click', verificar);
  el.btnAnterior.addEventListener('click', function () { irA(estado.indice - 1); });
  el.btnSiguiente.addEventListener('click', function () { irA(estado.indice + 1); });
  el.btnReintentar.addEventListener('click', reiniciarPregunta);
  el.btnFinalizar.addEventListener('click', finalizar);
  el.btnReiniciar.addEventListener('click', reiniciarQuiz);
  el.btnRevisar.addEventListener('click', function () {
    el.resultados.hidden = true;
    el.quiz.hidden = false;
    estado.finalizado = false;
    var primero = -1;
    for (var i = 0; i < estado.orden.length; i++) {
      if (estadoPregunta(estado.orden[i]) !== 'complete') { primero = i; break; }
    }
    irA(primero >= 0 ? primero : 0);
  });

  el.modalOk.addEventListener('click', function () {
    var accion = modalAccion;
    cerrarModal();
    if (accion) accion();
  });
  el.modalCancel.addEventListener('click', cerrarModal);
  el.modal.addEventListener('click', function (ev) {
    if (ev.target === el.modal) cerrarModal();
  });

  el.mediaFrame.addEventListener('click', abrirLightbox);
  el.mediaFrame.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      abrirLightbox();
    }
  });
  el.lightbox.addEventListener('click', cerrarLightbox);

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if (!el.lightbox.hidden) cerrarLightbox();
      else if (!el.modal.hidden) cerrarModal();
    }
  });

  /* ---------- arranque ---------- */

  construirCampos();
  nuevoEstado();
  construirMapa();
  pintarPregunta();
})();
