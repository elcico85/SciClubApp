(function () {
  function render(container, ctx) {
    container.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <span class="title">Verifica</span>
          <button id="home-new" class="icon-btn" aria-label="Nuovo abbonamento">+</button>
        </div>
        <div class="scan-area">
          <video id="scan-video" playsinline muted autoplay></video>
          <p class="muted small" id="scan-hint">Inquadra il QR club o la tessera sanitaria</p>
        </div>
        <div class="manual-search">
          <input id="manual-cf" type="text" placeholder="Cerca per codice fiscale o nome" />
          <button id="manual-search-btn">Cerca</button>
        </div>
        <p class="error" id="home-error" hidden></p>
      </div>`;

    const video = container.querySelector('#scan-video');
    const errorEl = container.querySelector('#home-error');
    const hintEl = container.querySelector('#scan-hint');

    async function goToResult(codiceFiscale) {
      ctx.Scanner.stop();
      const ab = await ctx.Store.findAbbonamentoByCodiceFiscale(codiceFiscale);
      if (!ab) {
        errorEl.textContent = `Nessun abbonamento trovato per ${codiceFiscale}.`;
        errorEl.hidden = false;
        return;
      }
      ctx.navigate('result', { abbonamento: ab });
    }

    ctx.Scanner.start(video, goToResult, (err) => {
      const motivo = err && err.name ? ` (${err.name})` : '';
      hintEl.textContent = `Fotocamera non disponibile${motivo}: usa la ricerca manuale qui sotto.`;
    }).then(() => {
      if (ctx.Scanner.engine) {
        hintEl.textContent = `Inquadra il QR club o la tessera sanitaria (lettore: ${ctx.Scanner.engine})`;
      }
    });

    container.querySelector('#home-new').addEventListener('click', () => {
      ctx.navigate('newSubscription');
    });

    container.querySelector('#manual-search-btn').addEventListener('click', async () => {
      const q = container.querySelector('#manual-cf').value.trim();
      if (!q) return;
      const all = await ctx.Store.getAllAbbonamenti();
      const needle = q.toLowerCase();
      const found = all.find(
        (a) => a.codiceFiscale === q.toUpperCase() || a.nominativo.toLowerCase().includes(needle)
      );
      if (!found) {
        errorEl.textContent = `Nessun abbonamento trovato per "${q}".`;
        errorEl.hidden = false;
        return;
      }
      ctx.navigate('result', { abbonamento: found });
    });
  }

  window.Screens = window.Screens || {};
  window.Screens.home = { render };
})();
