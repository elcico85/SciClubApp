// Client verso il backend Google Apps Script legato al foglio Google.
//
// Apps Script Web App non risponde con gli header CORS (Access-Control-Allow-Origin)
// necessari a fetch() per leggere la risposta da un'origine diversa (il nostro sito
// su GitHub Pages): ogni chiamata, quindi, passa tramite JSONP (un tag <script>
// iniettato dinamicamente), che non è soggetto a CORS. Per questo anche le scritture
// (consumo, nuovoAbbonamento) sono richieste GET con i dati nella query string invece
// che POST con body JSON.
(function () {
  const CONFIG_KEY = 'sciclub-config'; // { url, secret }
  let jsonpCounter = 0;

  function builtInUrl() {
    const url = window.AppConfig && window.AppConfig.APPS_SCRIPT_URL;
    return url && !url.includes('INSERIRE_URL_DEPLOYMENT') ? url : null;
  }

  // Se il codice ha già l'URL del deployment incorporato, all'operatore serve
  // inserire solo la chiave/PIN. In assenza (es. sviluppo locale prima di
  // configurarlo), l'app chiede anche l'URL, come schermata di ripiego.
  function needsUrlPrompt() {
    return !builtInUrl();
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const stored = raw ? JSON.parse(raw) : null;
      const url = builtInUrl() || (stored && stored.url);
      const secret = stored && stored.secret;
      if (!url || !secret) return null;
      return { url, secret };
    } catch (e) {
      return null;
    }
  }

  function setConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: cfg.url, secret: cfg.secret }));
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

  function jsonpRequest(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const callbackName = `sciclubJsonp${Date.now()}_${jsonpCounter++}`;
      const script = document.createElement('script');
      let done = false;
      let timer = null;

      function cleanup() {
        delete window[callbackName];
        script.remove();
        if (timer) clearTimeout(timer);
      }

      window[callbackName] = (data) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(data);
      };

      timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('timeout'));
      }, timeoutMs || 15000);

      script.onerror = () => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('errore di rete'));
      };
      script.src = `${url}&callback=${callbackName}`;
      document.head.appendChild(script);
    });
  }

  // Un GET leggero, senza scaricare tutto il foglio, solo per sapere se il backend risponde.
  async function ping() {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const url = `${cfg.url}?key=${encodeURIComponent(cfg.secret)}&action=ping`;
    const data = await jsonpRequest(url);
    return !data.error;
  }

  async function fetchSnapshot() {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const url = `${cfg.url}?key=${encodeURIComponent(cfg.secret)}`;
    const data = await jsonpRequest(url);
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function pushOperation(op) {
    const cfg = getConfig();
    if (!cfg) throw new Error('non configurato');
    const url =
      `${cfg.url}?key=${encodeURIComponent(cfg.secret)}` +
      `&action=${encodeURIComponent(op.type)}` +
      `&payload=${encodeURIComponent(JSON.stringify(op.payload))}`;
    return jsonpRequest(url);
  }

  window.Api = {
    getConfig,
    setConfig,
    clearConfig,
    needsUrlPrompt,
    builtInUrl,
    ping,
    fetchSnapshot,
    pushOperation,
    mapAbbonamentoFromSheet,
    mapUtilizzoFromSheet,
  };
})();
