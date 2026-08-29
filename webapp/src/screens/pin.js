(function () {
  function render(container, ctx) {
    container.innerHTML = `
      <div class="screen screen-center">
        <h1>Sci club</h1>
        <p class="muted">Inserisci il PIN del direttivo</p>
        <input id="pin-input" type="password" inputmode="numeric" autocomplete="off" placeholder="••••" />
        <p class="error" id="pin-error" hidden>PIN errato.</p>
        <button id="pin-submit" class="primary">Entra</button>
      </div>`;

    function submit() {
      const value = container.querySelector('#pin-input').value.trim();
      const cfg = ctx.Api.getConfig();
      if (value && cfg && value === cfg.secret) {
        sessionStorage.setItem('sciclub-pin-ok', '1');
        ctx.navigate('home');
      } else {
        container.querySelector('#pin-error').hidden = false;
      }
    }

    container.querySelector('#pin-submit').addEventListener('click', submit);
    container.querySelector('#pin-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  window.Screens = window.Screens || {};
  window.Screens.pin = { render };
})();
