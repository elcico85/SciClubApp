// URL pubblica del deployment Apps Script: non è un segreto (senza la chiave/PIN
// nessuna richiesta viene accettata, vedi src/api.js), quindi può restare nel
// codice anche se il repository è pubblico. La chiave/PIN resta invece sempre
// inserita dall'operatore la prima volta su ogni dispositivo, mai scritta qui.
//
// Se il deployment cambia (nuovo progetto Apps Script, nuovo Google account),
// aggiorna solo questo valore: gli operatori continueranno a dover inserire
// solo il PIN.
window.AppConfig = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzxcFLQKzYO7T45RhG7GW4NYt0KbE1okEzU1dF5ymNzhr9y4tpxpUkZkQC3nRaM6QGibw/exec',
};
