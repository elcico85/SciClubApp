(function () {
  function render(container, ctx) {
    const builtInUrl = ctx.Api.builtInUrl();
    const showUrlField = ctx.Api.needsUrlPrompt();

    container.innerHTML = `
      <div class="screen">
        <h1>Primo avvio</h1>
        <p class="muted small">Inserisci una sola volta la chiave/PIN del direttivo: resta salvata solo su questo dispositivo, mai nel codice pubblico.</p>
        <label>Chiave / PIN del direttivo
          <input id="setup-secret" type="password" placeholder="Chiave condivisa" />
        </label>
        ${
          showUrlField
            ? `<label>Indirizzo Apps Script (URL)
                <input id="setup-url" type="url" placeholder="https://script.google.com/macros/s/.../exec" />
              </label>`
            : `<button type="button" id="setup-advanced-toggle" class="back-btn" style="align-self:flex-start">Impostazioni avanzate</button>
              <label id="setup-url-wrap" hidden>Indirizzo Apps Script (URL)
                <input id="setup-url" type="url" value="${ctx.Util.escapeHtml(builtInUrl || '')}" />
              </label>`
        }
        <p class="error" id="setup-error" hidden></p>
        <button id="setup-submit" class="primary">Salva e continua</button>
      </div>`;

    const advancedToggle = container.querySelector('#setup-advanced-toggle');
    if (advancedToggle) {
      advancedToggle.addEventListener('click', () => {
        container.querySelector('#setup-url-wrap').hidden = false;
        advancedToggle.hidden = true;
      });
    }

    container.querySelector('#setup-submit').addEventListener('click', () => {
      const secret = container.querySelector('#setup-secret').value.trim();
      const urlInput = container.querySelector('#setup-url');
      const url = (urlInput ? urlInput.value.trim() : '') || builtInUrl;
      const errorEl = container.querySelector('#setup-error');
      if (!url || !secret) {
        errorEl.textContent = "Inserisci la chiave (e l'indirizzo, se richiesto).";
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
