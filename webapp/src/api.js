// Client verso il backend Google Apps Script legato al foglio Google.
(function () {
  const CONFIG_KEY = 'sciclub-config'; // { url, secret }

  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function clearConfig() {
    localStorage.removeItem(CONFIG_KEY);
  }

  function mapAbbonamentoFromSheet(row) {
    return {
      id: String(row.ID),
      codiceFiscale: String(row.CodiceFiscale || '').toUpperCase(),
      nominativo: row.Nominativo,
      tipo: row.Tipo,
      numeroPersone: row.NumeroPersone || null,
      stagione: row.Stagione,
      dataEmissione: row.DataEmissione,
      viaggiTotali: Number(row.ViaggiTotali),
    };
  }

  function mapUtilizzoFromSheet(row) {
    return {
      id: String(row.ID),
      idAbbonamento: String(row.IDAbbonamento),
      dataConsumo: row.DataConsumo,
    };
  }

  // Un GET leggero, senza scaricare tutto il foglio, solo per sapere se il backend risponde.
  async function ping() {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const url = `${cfg.url}?key=${encodeURIComponent(cfg.secret)}&action=ping`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return !data.error;
  }

  async function fetchSnapshot() {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const url = `${cfg.url}?key=${encodeURIComponent(cfg.secret)}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Content-Type text/plain per evitare la preflight CORS: Apps Script non gestisce
  // le richieste OPTIONS, quindi una richiesta "semplice" è l'unico modo per chiamarlo
  // da un'origine diversa (il nostro sito su GitHub Pages).
  async function pushOperation(op) {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: cfg.secret, type: op.type, payload: op.payload }),
    });
    return res.json();
  }

  window.Api = {
    getConfig,
    setConfig,
    clearConfig,
    ping,
    fetchSnapshot,
    pushOperation,
    mapAbbonamentoFromSheet,
    mapUtilizzoFromSheet,
  };
})();
