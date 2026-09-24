# Sci club - abbonamenti pullman

App PWA offline-first per gestire gli abbonamenti ai viaggi in pullman dello sci club:
- **5 viaggi personale**, **1 viaggio famiglia (3 persone)**, **1 viaggio famiglia (4 persone)**
- Verifica e scala l'abbonamento anche senza connessione (utile sul pullman)
- Identifica il socio scansionando un QR (tessera del club) o il codice a barre della Tessera Sanitaria
- Dati condivisi su un Google Sheet, letti/scritti tramite un backend Google Apps Script gratuito

## 1. Creare il Google Sheet

1. Crea un nuovo Google Sheet.
2. Apri **Estensioni → Apps Script**.
3. Copia il contenuto di [`appsscript/Code.gs`](appsscript/Code.gs) nell'editor (sostituisci `Code.gs` di default).
4. Copia il contenuto di [`appsscript/appsscript.json`](appsscript/appsscript.json) nel file di manifest del progetto (visibile da **Impostazioni progetto → Mostra file manifest "appsscript.json"**).
5. Nell'editor Apps Script, apri il menu funzioni ed esegui **`creaFogliSeNonEsistono`** una volta: crea i fogli `Abbonamenti` e `Utilizzi` con le intestazioni corrette.
6. Esegui **`impostaChiaveSegreta`** una volta: ti chiede una chiave a piacere che funge sia da chiave API sia da PIN di accesso all'app. Tienila al sicuro, la useranno solo i membri del direttivo.

## 2. Deployare l'Apps Script come Web App

1. In alto a destra: **Deploy → Nuovo deployment**.
2. Tipo: **App web**.
3. Esegui come: **Io**. Chi ha accesso: **Chiunque**.
4. Copia l'URL generato (finisce con `/exec`): serve per configurare l'app al primo avvio.

Se in futuro modifichi `Code.gs`, ricordati di creare un **nuovo deployment** (o gestire una versione) perché le modifiche non sono live finché non ridistribuisci.

## 3. Configurare l'app al primo avvio

Apri l'app pubblicata (vedi sotto per l'URL), inserisci:
- **Indirizzo Apps Script**: l'URL `/exec` del passo 2
- **Chiave/PIN**: quella impostata al passo 1.6

Restano salvati solo in locale sul dispositivo (mai nel codice, che è pubblico su GitHub).

**Verifica rapida che il backend sia raggiungibile**: apri in un browser l'URL del passo 2 seguito da `?key=LA_TUA_CHIAVE` (es. `https://script.google.com/macros/s/XXXX/exec?key=1234`).
- Se vedi un JSON con `abbonamenti` e `utilizzi` → tutto ok.
- Se vedi `{"error":"unauthorized"}` → la chiave inserita non corrisponde a quella impostata al passo 1.6.
- Se vedi una pagina di login/permessi Google invece del JSON → il deployment al passo 2.3 non è impostato su "Chiunque": rifai il deployment controllando quel campo.

Se questo test funziona ma l'app continua a segnare "Offline", il problema non è la configurazione: fammelo sapere.

## 4. Icone

Le icone in `webapp/icons/` sono segnaposto (un quadrato blu pieno). Sostituiscile con il logo dello sci club quando disponibile, mantenendo gli stessi nomi file (`icon-192.png`, `icon-512.png`).

## 5. Sviluppo locale

```bash
cd webapp
npx serve .
```

Poi apri l'indirizzo mostrato nel browser. La scansione richiede HTTPS o `localhost` (permessi fotocamera).

## 6. Hosting (GitHub Pages)

Il workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) pubblica automaticamente la cartella `webapp/` su GitHub Pages ad ogni push su `main`. Dopo il primo push, attiva Pages una tantum da **Settings → Pages → Source → GitHub Actions** nel repository.

## Struttura del progetto

- `webapp/` — la PWA (frontend)
  - `src/screens/` — una schermata per file (PIN, home/verifica, risultato scansione, nuovo abbonamento, tessera generata, configurazione)
  - `src/api.js`, `src/store.js`, `src/sync.js`, `src/scanner.js` — moduli di servizio riusabili, separati dalle schermate
  - `vendor/` — librerie di terze parti vendorizzate localmente (necessario per funzionare offline: nessuna dipendenza da CDN a runtime)
- `appsscript/` — sorgente del backend Google Apps Script
