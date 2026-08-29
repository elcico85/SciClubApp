// Rilevamento connettività reale + sincronizzazione automatica in background.
// Nessuna azione manuale: online lavora sui dati live, offline mette in coda,
// alla riconnessione svuota la coda e riallinea il mirror locale da solo.
(function () {
  let online = false;
  let syncing = false;
  let queueLength = 0;
  let intervalId = null;
  const listeners = [];

  function onStatusChange(fn) {
    listeners.push(fn);
  }

  function notify() {
    const status = { online, queueLength };
    listeners.forEach((fn) => fn(status));
  }

  function getStatus() {
    return { online, queueLength };
  }

  async function refreshQueueLength() {
    const q = await window.Store.getQueue();
    queueLength = q.length;
  }

  async function checkConnectivity() {
    try {
      return await window.Api.ping();
    } catch (e) {
      return false;
    }
  }

  async function syncNow() {
    if (syncing) return;
    syncing = true;
    try {
      online = await checkConnectivity();
      if (!online) {
        await refreshQueueLength();
        notify();
        return;
      }

      const queue = await window.Store.getQueue();
      for (const op of queue) {
        try {
          const res = await window.Api.pushOperation(op);
          if (res && res.ok) {
            await window.Store.dequeue(op.id);
          } else {
            break; // errore applicativo (es. non autorizzato): riprova al prossimo giro
          }
        } catch (e) {
          online = false; // probabilmente la rete è caduta a metà invio
          break;
        }
      }

      if (online) {
        try {
          const snapshot = await window.Api.fetchSnapshot();
          await window.Store.replaceAllAbbonamenti(snapshot.abbonamenti.map(window.Api.mapAbbonamentoFromSheet));
          await window.Store.replaceAllUtilizzi(snapshot.utilizzi.map(window.Api.mapUtilizzoFromSheet));

          // Le operazioni ancora in coda (es. una nuova appena creata offline pochi
          // istanti fa) non sono ancora nello snapshot server: le riapplichiamo sopra
          // per non farle sparire dalla vista finché non verranno sincronizzate.
          const remaining = await window.Store.getQueue();
          for (const op of remaining) {
            if (op.type === 'nuovoAbbonamento') await window.Store.upsertAbbonamento(op.payload);
            if (op.type === 'consumo') await window.Store.upsertUtilizzo(op.payload);
          }
          localStorage.setItem('sciclub-last-sync', new Date().toISOString());
        } catch (e) {
          online = false;
        }
      }

      await refreshQueueLength();
      notify();
    } finally {
      syncing = false;
    }
  }

  function start() {
    syncNow();
    if (!intervalId) intervalId = setInterval(syncNow, 20000);
    window.addEventListener('online', syncNow);
  }

  window.Sync = { start, syncNow, onStatusChange, getStatus };
})();
