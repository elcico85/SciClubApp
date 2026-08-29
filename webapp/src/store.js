// Mirror locale in IndexedDB (via idb-keyval) di Abbonamenti, Utilizzi e coda di sync.
// Ogni store è un database IndexedDB separato: idb-keyval non gestisce bene più
// object-store nello stesso database aperti con createStore() in momenti diversi.
(function () {
  const abbonamentiStore = idbKeyval.createStore('sciclub-abbonamenti', 'kv');
  const utilizziStore = idbKeyval.createStore('sciclub-utilizzi', 'kv');
  const queueStore = idbKeyval.createStore('sciclub-queue', 'kv');

  function getAllAbbonamenti() {
    return idbKeyval.values(abbonamentiStore);
  }

  function upsertAbbonamento(ab) {
    return idbKeyval.set(ab.id, ab, abbonamentiStore);
  }

  async function replaceAllAbbonamenti(list) {
    await idbKeyval.clear(abbonamentiStore);
    for (const ab of list) await idbKeyval.set(ab.id, ab, abbonamentiStore);
  }

  function getAllUtilizzi() {
    return idbKeyval.values(utilizziStore);
  }

  function upsertUtilizzo(u) {
    return idbKeyval.set(u.id, u, utilizziStore);
  }

  async function replaceAllUtilizzi(list) {
    await idbKeyval.clear(utilizziStore);
    for (const u of list) await idbKeyval.set(u.id, u, utilizziStore);
  }

  async function findAbbonamentoByCodiceFiscale(cf) {
    const all = await getAllAbbonamenti();
    const needle = (cf || '').toUpperCase();
    return all.find((a) => a.codiceFiscale.toUpperCase() === needle) || null;
  }

  async function viaggiResidui(abbonamento) {
    const utilizzi = await getAllUtilizzi();
    const usati = utilizzi.filter((u) => u.idAbbonamento === abbonamento.id).length;
    return abbonamento.viaggiTotali - usati;
  }

  function enqueue(op) {
    return idbKeyval.set(op.id, op, queueStore);
  }

  function dequeue(id) {
    return idbKeyval.del(id, queueStore);
  }

  function getQueue() {
    return idbKeyval.values(queueStore);
  }

  window.Store = {
    getAllAbbonamenti,
    upsertAbbonamento,
    replaceAllAbbonamenti,
    getAllUtilizzi,
    upsertUtilizzo,
    replaceAllUtilizzi,
    findAbbonamentoByCodiceFiscale,
    viaggiResidui,
    enqueue,
    dequeue,
    getQueue,
  };
})();
