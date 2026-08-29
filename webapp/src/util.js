(function () {
  function genId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Stagione sciistica: da settembre in poi si considera già iniziata la stagione N/N+1.
  function stagioneCorrente(date) {
    const now = date || new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('it-IT');
    } catch (e) {
      return iso;
    }
  }

  function initials(name) {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  function tipoLabel(ab) {
    if (ab.tipo === 'PERSONALE') return '5 viaggi personale';
    if (ab.tipo === 'FAMIGLIA') {
      return `1 viaggio famiglia${ab.numeroPersone ? ' - ' + ab.numeroPersone + ' persone' : ''}`;
    }
    return ab.tipo;
  }

  window.Util = { genId, stagioneCorrente, escapeHtml, formatDate, initials, tipoLabel };
})();
