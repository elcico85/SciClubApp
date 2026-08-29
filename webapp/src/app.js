(function () {
  const appEl = document.getElementById('app');
  const statusBar = document.getElementById('status-bar');

  const ctx = {
    Store: window.Store,
    Api: window.Api,
    Sync: window.Sync,
    Scanner: window.Scanner,
    Util: window.Util,
    navigate,
  };

  function navigate(screen, params) {
    window.Scanner.stop();
    appEl.innerHTML = '';
    window.Screens[screen].render(appEl, ctx, params || {});
  }

  function renderStatus(status) {
    statusBar.hidden = false;
    if (status.online) {
      statusBar.textContent = status.queueLength > 0 ? `Sincronizzazione... ${status.queueLength} in coda` : 'Online';
      statusBar.className = 'online';
    } else {
      statusBar.textContent = `Offline${status.queueLength ? ' · ' + status.queueLength + ' in coda' : ''}`;
      statusBar.className = 'offline';
    }
  }

  function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }

    // Registrata subito, indipendentemente dal fatto che la configurazione esista
    // già: se manca, sarà la schermata di setup ad avviare la sync una volta
    // salvata la configurazione, e questo listener deve già essere pronto.
    window.Sync.onStatusChange(renderStatus);

    const cfg = window.Api.getConfig();
    if (!cfg) {
      statusBar.hidden = true;
      navigate('setup');
      return;
    }

    window.Sync.start();

    const pinOk = sessionStorage.getItem('sciclub-pin-ok') === '1';
    navigate(pinOk ? 'home' : 'pin');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
