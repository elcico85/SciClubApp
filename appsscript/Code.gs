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

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    if (!e.parameter.key || e.parameter.key !== getSecret_()) {
      return jsonOutput_({ error: 'unauthorized' });
    }
    if (e.parameter.action === 'ping') {
      return jsonOutput_({ ok: true, serverTime: new Date().toISOString() });
    }
    return jsonOutput_(buildSnapshot_());
  } catch (err) {
    return jsonOutput_({ error: String(err) });
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

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.key || data.key !== getSecret_()) {
      return jsonOutput_({ error: 'unauthorized' });
    }
    if (data.type === 'consumo') return jsonOutput_(handleConsumo_(data.payload));
    if (data.type === 'nuovoAbbonamento') return jsonOutput_(handleNuovoAbbonamento_(data.payload));
    return jsonOutput_({ error: 'tipo operazione sconosciuto: ' + data.type });
  } catch (err) {
    return jsonOutput_({ error: String(err) });
  }
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
