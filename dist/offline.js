(() => {
  const status = document.querySelector('#offline-status');
  const button = document.querySelector('#offline-update');
  let registration, ready = false, reloading = false, applying = false;
  function show() {
    status.textContent = ready ? (navigator.onLine ? 'Offline listo' : 'Sin conexión · listo') :
      (navigator.onLine ? 'Preparando offline…' : 'Offline no preparado');
    status.dataset.ready = String(ready);
    status.title = ready ? 'La app está guardada en este navegador para usarla sin Internet.' :
      'Abre la app con Internet para descargar todos sus archivos.';
    button.hidden = !registration?.waiting;
  }
  function unavailable() {
    ready = false; show();
    status.textContent = 'Offline no disponible';
    status.title = 'No se pudieron guardar los archivos de la app. Reintenta con Internet; la edición sigue funcionando.';
  }
  async function check() {
    const active = registration?.active;
    if (!active) return;
    ready = await new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 4000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(!!event.data?.ready); };
      active.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
    });
    show();
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    unavailable(); return;
  }
  window.addEventListener('online', show);
  window.addEventListener('offline', show);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying && !reloading) { reloading = true; location.reload(); }
    else check();
  });
  button.onclick = () => {
    const waiting = registration?.waiting;
    if (!waiting) { show(); return; }
    try {
      flushWorkspace();
      if (localStorage.getItem('labela-current') !== JSON.stringify(state)) throw Error('Unsaved design');
    } catch {
      toast('No se pudo guardar el diseño. Descarga una copia antes de actualizar.'); return;
    }
    applying = true; button.disabled = true;
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  };
  show();
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' })
    .then(async reg => {
      registration = reg;
      function watch(worker) {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') show();
          if (worker.state === 'redundant' && !registration.active) unavailable();
        });
      }
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      if (reg.active) await check();
      navigator.serviceWorker.ready.then(() => check());
      show();
    }).catch(unavailable);
})();
