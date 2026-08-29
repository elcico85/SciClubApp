(function () {
  function render(container, ctx, { abbonamento }) {
    renderView();

    async function renderView() {
      const residui = await ctx.Store.viaggiResidui(abbonamento);
      const stagioneCorrente = ctx.Util.stagioneCorrente();
      const valido = residui > 0 && abbonamento.stagione === stagioneCorrente;
      const utilizzi = (await ctx.Store.getAllUtilizzi())
        .filter((u) => u.idAbbonamento === abbonamento.id)
        .sort((a, b) => (a.dataConsumo < b.dataConsumo ? 1 : -1))
        .slice(0, 5);

      container.innerHTML = `
        <div class="screen">
          <button class="back-btn" id="result-back">&larr; Indietro</button>
          <div class="card">
            <div class="card-header">
              <div class="avatar">${ctx.Util.initials(abbonamento.nominativo)}</div>
              <div>
                <p class="name">${ctx.Util.escapeHtml(abbonamento.nominativo)}</p>
                <p class="muted small">${ctx.Util.tipoLabel(abbonamento)} &middot; stagione ${abbonamento.stagione}</p>
              </div>
              <span class="badge ${valido ? 'success' : 'danger'}">${valido ? 'Valido' : 'Non valido'}</span>
            </div>
            <div class="stat-box">
              <p class="muted small">Viaggi residui</p>
              <p class="stat">${residui} <span class="muted">/ ${abbonamento.viaggiTotali}</span></p>
            </div>
            <div class="history">
              <p class="muted small">Ultimi utilizzi</p>
              ${
                utilizzi.length
                  ? utilizzi.map((u) => `<div class="history-row">Uscita del ${ctx.Util.formatDate(u.dataConsumo)}</div>`).join('')
                  : '<p class="muted small">Nessun utilizzo registrato.</p>'
              }
            </div>
            <button id="result-register" class="primary" ${valido ? '' : 'disabled'}>Registra viaggio</button>
            <p class="error" id="result-error" hidden></p>
          </div>
        </div>`;

      container.querySelector('#result-back').addEventListener('click', () => ctx.navigate('home'));
      const registerBtn = container.querySelector('#result-register');
      if (valido) registerBtn.addEventListener('click', registraViaggio);
    }

    async function registraViaggio() {
      const id = ctx.Util.genId();
      const record = { id, idAbbonamento: abbonamento.id, dataConsumo: new Date().toISOString() };
      await ctx.Store.upsertUtilizzo(record);
      await ctx.Store.enqueue({ id, type: 'consumo', payload: record });
      ctx.Sync.syncNow();
      await renderView();
    }
  }

  window.Screens = window.Screens || {};
  window.Screens.result = { render };
})();
