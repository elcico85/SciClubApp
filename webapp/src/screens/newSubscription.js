(function () {
  // Unica fonte di verità per i tipi di abbonamento vendibili: aggiungerne uno nuovo
  // in futuro significa aggiungere una riga qui, senza toccare sync/storage/backend.
  const TIPI = [
    { value: 'PERSONALE', tipo: 'PERSONALE', numeroPersone: null, label: '5 viaggi personale', viaggiTotali: 5 },
    { value: 'FAMIGLIA-3', tipo: 'FAMIGLIA', numeroPersone: 3, label: '1 viaggio famiglia - 3 persone', viaggiTotali: 1 },
    { value: 'FAMIGLIA-4', tipo: 'FAMIGLIA', numeroPersone: 4, label: '1 viaggio famiglia - 4 persone', viaggiTotali: 1 },
  ];

  function render(container, ctx) {
    const oggi = new Date().toISOString().slice(0, 10);
    const stagione = ctx.Util.stagioneCorrente();

    container.innerHTML = `
      <div class="screen">
        <button class="back-btn" id="new-back">&larr; Indietro</button>
        <h1>Nuovo abbonamento</h1>
        <label>Nominativo
          <input id="new-nominativo" type="text" placeholder="Nome e cognome" />
        </label>
        <label>Codice fiscale
          <input id="new-cf" type="text" placeholder="RSSMRC80A01H501U" style="text-transform:uppercase" maxlength="16" />
        </label>
        <label>Tipo abbonamento
          <select id="new-tipo">
            ${TIPI.map((t) => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </label>
        <label>Data emissione
          <input id="new-data" type="date" value="${oggi}" />
        </label>
        <p class="muted small">Stagione: ${stagione}</p>
        <p class="error" id="new-error" hidden></p>
        <button id="new-submit" class="primary">Crea e genera tessera</button>
      </div>`;

    container.querySelector('#new-back').addEventListener('click', () => ctx.navigate('home'));

    container.querySelector('#new-submit').addEventListener('click', async () => {
      const nominativo = container.querySelector('#new-nominativo').value.trim();
      const cf = container.querySelector('#new-cf').value.trim().toUpperCase();
      const tipoValue = container.querySelector('#new-tipo').value;
      const dataEmissione = container.querySelector('#new-data').value;
      const errorEl = container.querySelector('#new-error');

      if (!nominativo || !/^[A-Z0-9]{16}$/.test(cf) || !dataEmissione) {
        errorEl.textContent = 'Controlla nominativo, codice fiscale (16 caratteri) e data.';
        errorEl.hidden = false;
        return;
      }

      const tipoDef = TIPI.find((t) => t.value === tipoValue);
      const id = ctx.Util.genId();
      const record = {
        id,
        codiceFiscale: cf,
        nominativo,
        tipo: tipoDef.tipo,
        numeroPersone: tipoDef.numeroPersone,
        stagione,
        dataEmissione,
        viaggiTotali: tipoDef.viaggiTotali,
      };

      await ctx.Store.upsertAbbonamento(record);
      await ctx.Store.enqueue({ id, type: 'nuovoAbbonamento', payload: record });
      ctx.Sync.syncNow();
      ctx.navigate('cardGenerated', { abbonamento: record });
    });
  }

  window.Screens = window.Screens || {};
  window.Screens.newSubscription = { render };
})();
