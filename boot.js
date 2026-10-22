const main = document.getElementById('main');
const notice = document.getElementById('loadNotice');
const loading = setTimeout(() => { notice.hidden = false; }, 3000);
try {
  // Same-origin navigation retains local history and the shared session lock.
  const legacy=/^\/pomodoro-squats\/(?:index\.html)?$/.test(location.pathname);
  const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(legacy&&navigator.onLine&&!installed){
    const destination=new URL('/pomodoro-musculo/',location.origin);destination.search=location.search;destination.hash=location.hash;
    clearTimeout(loading);notice.hidden=false;document.getElementById('loadMessage').textContent='Abriendo Pomodoro Músculo…';
    location.replace(destination.href);
  }else{
  const {claimSession}=await import('./session-guard.js');
  if(!await claimSession())throw Error('session-busy');
  await import('./app.js');
  clearTimeout(loading);
  notice.hidden = true;
  main.inert = false;
  document.documentElement.dataset.ready = 'true';
  }
} catch (error) {
  clearTimeout(loading);
  notice.hidden = false;
  document.getElementById('loadMessage').textContent = error.message==='session-busy'?'La app ya está abierta en otra pestaña. Continúa allí o ciérrala y pulsa Volver a cargar para entrar aquí.':error.message==='session-unsupported'?'Abre este enlace en una versión actual de Safari o Chrome para guardar tu actividad de forma segura.':'No se pudo abrir la app. Comprueba tu conexión y vuelve a cargar. Tu historial no se ha borrado.';
  document.documentElement.dataset.blocked=error.message;
  for(const el of document.querySelectorAll('header,footer,#welcomeCard'))el.inert=true;
  const retry = document.getElementById('retryLoad');
  retry.hidden = false;
  retry.onclick = () => location.reload();
}
