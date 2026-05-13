(function () {
  'use strict';

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function notify(type, data) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: type, data: data }, '*');
    }
  }

  function setInputValue(id, value) {
    var element = document.getElementById(id);
    if (!element || value === undefined || value === null) return;
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyStandaloneModel(model) {
    if (!model || !model.estado || !window.App || !window.App.estado) {
      return false;
    }

    var incoming = model.estado;
    var estado = window.App.estado;

    estado.modo = incoming.modo || estado.modo || 'conocido';
    estado.tipoSistema = incoming.tipoSistema || estado.tipoSistema || '3f';
    estado.tension = number(incoming.tension, estado.tension || 480);
    estado.nodos = Array.isArray(incoming.nodos) && incoming.nodos.length > 0
      ? incoming.nodos
      : estado.nodos;
    estado.motores = Array.isArray(incoming.motores)
      ? incoming.motores
      : estado.motores;
    estado.resultados = null;

    setInputValue('input-tension', estado.tension);
    setInputValue('input-trafo-kva', number(incoming.trafoKva, 500));
    setInputValue('input-trafo-vp', number(incoming.trafoVp, 23000));
    setInputValue('input-trafo-vs', number(incoming.trafoVs, estado.tension));
    setInputValue('input-trafo-z', number(incoming.trafoZ, 5.75));

    if (window.UIConfiguracion && typeof window.UIConfiguracion.setMode === 'function') {
      window.UIConfiguracion.setMode(estado.modo);
    }

    if (window.UIDiagrama && typeof window.UIDiagrama.dibujar === 'function') {
      window.UIDiagrama.dibujar();
    }

    localStorage.setItem('icore_system_model', JSON.stringify(model));
    notify('MODEL_LOADED', {
      success: true,
      source: model.source || 'react-editor',
      nodes: estado.nodos.length,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  function sendResults(results) {
    window.ultimosResultados = results;
    notify('ICC_RESULTS', results);
    notify('RESULTS', results);
  }

  window.loadSystemModel = function (model) {
    try {
      return applyStandaloneModel(model);
    } catch (error) {
      notify('ERROR', { message: error.message });
      return false;
    }
  };

  window.calcularICC = function (model) {
    try {
      if (model) {
        applyStandaloneModel(model);
      }

      if (!window.App || typeof window.App.calculate !== 'function') {
        throw new Error('App.calculate no está disponible');
      }

      window.App.calculate();

      var results = window.App.estado ? window.App.estado.resultados : null;
      if (results) {
        sendResults(results);
      }

      return results;
    } catch (error) {
      notify('ERROR', { message: error.message });
      throw error;
    }
  };

  window.addEventListener('message', function (event) {
    if (!event.data || typeof event.data !== 'object' || !event.data.type) return;

    if (event.data.type === 'LOAD_MODEL' || event.data.type === 'LOAD_CONFIG') {
      window.loadSystemModel(event.data.data);
      return;
    }

    if (event.data.type === 'CALCULATE') {
      window.calcularICC(event.data.data);
      return;
    }

    if (event.data.type === 'GET_RESULTS') {
      sendResults(window.ultimosResultados || null);
    }
  });
})();
