const main = document.getElementById('main');
const notice = document.getElementById('loadNotice');
const loading = setTimeout(() => { notice.hidden = false; }, 3000);
try {
  await import('./app.js');
  clearTimeout(loading);
  notice.hidden = true;
  main.inert = false;
  document.documentElement.dataset.ready = 'true';
} catch {
  clearTimeout(loading);
  notice.hidden = false;
  document.getElementById('loadMessage').textContent = 'No se pudo abrir la app. Comprueba tu conexión y vuelve a cargar. Tu historial no se ha borrado.';
  const retry = document.getElementById('retryLoad');
  retry.hidden = false;
  retry.onclick = () => location.reload();
}
