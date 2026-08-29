(function () {
  function render(container, ctx) {
    container.innerHTML = `
      <div class="screen">
        <h1>Configurazione iniziale</h1>
        <p class="muted small">Inserisci una sola volta l'indirizzo dell'Apps Script e la chiave/PIN del direttivo. Restano salvati solo su questo dispositivo, mai nel codice pubblico.</p>
        <label>Indirizzo Apps Script (URL)
          <input id="setup-url" type="url" placeholder="https://script.google.com/macros/s/.../exec" />
        </label>
        <label>Chiave / PIN del direttivo
          <input id="setup-secret" type="password" placeholder="Chiave condivisa" />
        </label>
        <p class="error" id="setup-error" hidden></p>
        <button id="setup-submit" class="primary">Salva e continua</button>
      </div>`;

    container.querySelector('#setup-submit').addEventListener('click', () => {
      const url = container.querySelector('#setup-url').value.trim();
      const secret = container.querySelector('#setup-secret').value.trim();
      const errorEl = container.querySelector('#setup-error');
      if (!url || !secret) {
        errorEl.textContent = "Inserisci sia l'indirizzo che la chiave.";
        errorEl.hidden = false;
        return;
      }
      ctx.Api.setConfig({ url, secret });
      sessionStorage.setItem('sciclub-pin-ok', '1');
      ctx.Sync.start();
      ctx.navigate('home');
    });
  }

  window.Screens = window.Screens || {};
  window.Screens.setup = { render };
})();
