/**
 * Backend Apps Script legato al foglio Google (Abbonamenti / Utilizzi).
 * Deploy come Web App: Esegui come "Io", accesso "Chiunque".
 * Vedi README.md nella root del repository per le istruzioni di deploy.
 */

var SEASON_START_MONTH = 9; // da settembre inizia la nuova stagione sciistica

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SECRET');
}

/** Da eseguire una tantum dall'editor Apps Script per impostare la chiave/PIN. */
function impostaChiaveSegreta() {
  var chiave = Browser.inputBox('Imposta la chiave/PIN del direttivo (usata anche come API key)');
  if (chiave && chiave !== 'cancel') {
    PropertiesService.getScriptProperties().setProperty('SECRET', chiave);
  }
}

/** Da eseguire una tantum per creare i due fogli con le intestazioni corrette. */
function creaFogliSeNonEsistono() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('Abbonamenti')) {
    var abbonamenti = ss.insertSheet('Abbonamenti');
    abbonamenti
      .getRange(1, 1, 1, 8)
      .setValues([['ID', 'CodiceFiscale', 'Nominativo', 'Tipo', 'NumeroPersone', 'Stagione', 'DataEmissione', 'ViaggiTotali']]);
  }
  if (!ss.getSheetByName('Utilizzi')) {
    var utilizzi = ss.insertSheet('Utilizzi');
    utilizzi.getRange(1, 1, 1, 3).setValues([['ID', 'IDAbbonamento', 'DataConsumo']]);
  }
}

function stagioneCorrente_() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  return m >= SEASON_START_MONTH ? y + '/' + (y + 1) : (y - 1) + '/' + y;
}

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function readSheetAsObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();
  return values
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== '';
      });
    })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        obj[h] = row[i];
      });
      return obj;
    });
}

// Apps Script Web App non manda gli header CORS richiesti da fetch() per leggere
// la risposta da un'altra origine (il sito su GitHub Pages), quindi il frontend
// chiama tutto - anche le scritture - in JSONP (un tag <script>, non soggetto a
// CORS): se arriva ?callback=..., la risposta è avvolta in quella funzione JS
// invece di essere JSON puro.
function output_(obj, callbackName) {
  if (callbackName) {
    var js = callbackName + '(' + JSON.stringify(obj) + ');';
    return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var callback = e.parameter.callback;
  try {
    if (!e.parameter.key || e.parameter.key !== getSecret_()) {
      return output_({ error: 'unauthorized' }, callback);
    }
    var action = e.parameter.action;
    if (action === 'ping') {
      return output_({ ok: true, serverTime: new Date().toISOString() }, callback);
    }
    if (action === 'consumo') {
      return output_(handleConsumo_(JSON.parse(e.parameter.payload)), callback);
    }
    if (action === 'nuovoAbbonamento') {
      return output_(handleNuovoAbbonamento_(JSON.parse(e.parameter.payload)), callback);
    }
    return output_(buildSnapshot_(), callback);
  } catch (err) {
    return output_({ error: String(err) }, callback);
  }
}

function buildSnapshot_() {
  return {
    abbonamenti: readSheetAsObjects_(sheet_('Abbonamenti')),
    utilizzi: readSheetAsObjects_(sheet_('Utilizzi')),
    stagioneCorrente: stagioneCorrente_(),
    serverTime: new Date().toISOString(),
  };
}

/** ID generato lato client: funge anche da chiave di deduplicazione se la richiesta arriva due volte. */
function handleConsumo_(payload) {
  var sheet = sheet_('Utilizzi');
  var existing = readSheetAsObjects_(sheet);
  var giaPresente = existing.some(function (r) {
    return String(r.ID) === String(payload.id);
  });
  if (!giaPresente) {
    sheet.appendRow([payload.id, payload.idAbbonamento, payload.dataConsumo]);
  }
  return { ok: true, residuo: calcolaResiduo_(payload.idAbbonamento), duplicato: giaPresente };
}

function calcolaResiduo_(idAbbonamento) {
  var abbonamenti = readSheetAsObjects_(sheet_('Abbonamenti'));
  var ab = abbonamenti.filter(function (a) {
    return String(a.ID) === String(idAbbonamento);
  })[0];
  if (!ab) return null;
  var utilizzi = readSheetAsObjects_(sheet_('Utilizzi'));
  var usati = utilizzi.filter(function (u) {
    return String(u.IDAbbonamento) === String(idAbbonamento);
  }).length;
  return ab.ViaggiTotali - usati;
}

function handleNuovoAbbonamento_(payload) {
  var sheet = sheet_('Abbonamenti');
  var existing = readSheetAsObjects_(sheet);
  var giaPresente = existing.some(function (r) {
    return String(r.ID) === String(payload.id);
  });
  if (!giaPresente) {
    sheet.appendRow([
      payload.id,
      payload.codiceFiscale,
      payload.nominativo,
      payload.tipo,
      payload.numeroPersone || '',
      payload.stagione,
      payload.dataEmissione,
      payload.viaggiTotali,
    ]);
  }
  return { ok: true, duplicato: giaPresente };
}
