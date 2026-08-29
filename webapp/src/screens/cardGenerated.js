(function () {
  function render(container, ctx, { abbonamento }) {
    container.innerHTML = `
      <div class="screen">
        <div class="card card-center printable">
          <div id="qr-holder" class="qr-holder"></div>
          <p class="name">${ctx.Util.escapeHtml(abbonamento.nominativo)}</p>
          <p class="muted small">${abbonamento.codiceFiscale}</p>
          <span class="badge warning no-print">In coda per la sync</span>
        </div>
        <div class="button-row no-print">
          <button id="card-done">Fatto</button>
          <button id="card-print" class="primary">Stampa</button>
        </div>
      </div>`;

    // eslint-disable-next-line no-new
    new QRCode(container.querySelector('#qr-holder'), {
      text: abbonamento.codiceFiscale,
      width: 180,
      height: 180,
      correctLevel: QRCode.CorrectLevel.M,
    });

    container.querySelector('#card-done').addEventListener('click', () => ctx.navigate('home'));
    container.querySelector('#card-print').addEventListener('click', () => window.print());
  }

  window.Screens = window.Screens || {};
  window.Screens.cardGenerated = { render };
})();
