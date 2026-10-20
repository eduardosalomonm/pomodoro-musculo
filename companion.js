import {VERSION, PUBLIC_URL, ISSUES_URL} from './release.js';

export function initCompanion({store, toast, startTrial, beforeUpdate, hasSession}) {
  const $ = id => document.getElementById(id);
  const showHelp = () => $('helpDialog').showModal();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  $('appVersion').textContent = `Beta ${VERSION}`;
  $('publicLink').value = PUBLIC_URL;
  $('welcomeCard').hidden = store.get('ps.welcomed', false) || hasSession();
  const dismiss = () => { store.set('ps.welcomed', true); $('welcomeCard').hidden = true; };
  $('dismissWelcome').onclick = dismiss;
  $('trialBtn').onclick = () => { dismiss(); startTrial(); };
  $('helpBtn').onclick = showHelp;
  $('installHelpBtn').onclick = showHelp;
  $('helpDialog').addEventListener('click', e => {
    if (e.target !== $('helpDialog')) return;
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
  });
  $('helpDialog').addEventListener('close', () => { $('shareFallback').hidden = true; });
  $('feedbackLink').href = `${ISSUES_URL}?title=${encodeURIComponent('Prueba de Pomodoro Squats')}&body=${encodeURIComponent(`Versión: ${VERSION}\nDispositivo y navegador (escríbelo aquí):\n\n¿Qué estabas intentando hacer?\n\n¿Qué ocurrió?\n\n¿Qué mejorarías?\n\nNo incluyas datos personales ni respaldos del historial.`)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_URL);
      toast('Enlace público copiado. Listo para compartir.');
    } catch {
      if (!$('helpDialog').open) showHelp();
      $('shareFallback').hidden = false;
      $('publicLink').focus();
      $('publicLink').select();
    }
  };
  $('copyLinkBtn').onclick = copyLink;
  $('shareBtn').onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({title:'Pomodoro Squats', text:'Prueba una pausa con movimiento: sentadillas, flexiones y estiramientos.', url:PUBLIC_URL}); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    await copyLink();
  };

  let installPrompt;
  $('installHelpBtn').hidden = standalone;
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    $('installHelpBtn').textContent = 'Instalar app';
    $('installHelpBtn').onclick = async () => {
      if (!installPrompt) { showHelp(); return; }
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      installPrompt = null;
      if (choice.outcome === 'accepted') $('installHelpBtn').hidden = true;
      else { $('installHelpBtn').textContent = 'Añadir al inicio'; $('installHelpBtn').onclick = showHelp; }
    };
  });
  addEventListener('appinstalled', () => { $('installHelpBtn').hidden = true; });
  const connection = () => { $('connectionNotice').hidden = navigator.onLine; };
  addEventListener('online', connection); addEventListener('offline', connection); connection();

  if (!('serviceWorker' in navigator)) return;
  let registration, updating = false;
  const showUpdate = () => { if (registration?.waiting) $('updateNotice').hidden = false; };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
  $('updateAppBtn').onclick = () => {
    if (!registration?.waiting) { toast('La app ya está actualizada.'); $('updateNotice').hidden = true; return; }
    if (beforeUpdate() === false) { toast('No se pudo guardar. Exporta un respaldo antes de actualizar.'); return; }
    updating = true;
    $('updateAppBtn').disabled = true;
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  };
  navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}).then(reg => {
    registration = reg; showUpdate();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') showUpdate(); });
    });
  }).catch(() => {
    $('offlineHelp').textContent = 'Este navegador no pudo preparar el modo sin conexión. Puedes seguir usando la app con internet.';
  });
}
