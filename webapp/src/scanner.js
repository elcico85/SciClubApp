// Scansione da fotocamera di QR (tessera club) e Code 39 (Tessera Sanitaria) tramite
// @zxing/library: stessa libreria per entrambi i formati, sempre usata (mai l'API nativa
// BarcodeDetector) perché Safari/iOS non la implementa.
(function () {
  let controls = null;

  function supportedFormats() {
    return [ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.CODE_39];
  }

  function extractCodiceFiscale(raw) {
    // Alcune tessere sanitarie includono caratteri extra attorno al codice fiscale:
    // isoliamo le 16 lettere/cifre del CF ovunque si trovino nel testo decodificato.
    const match = raw.toUpperCase().match(/[A-Z0-9]{16}/);
    return match ? match[0] : raw.trim().toUpperCase();
  }

  async function start(videoElement, onDetect, onError) {
    stop();
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, supportedFormats());
    // TRY_HARDER: passaggi di decodifica più approfonditi, necessari per un
    // codice piccolo e stampato come quello sul retro della Tessera Sanitaria
    // (a differenza di un QR grande, con la scansione "rapida" spesso non basta).
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    const reader = new ZXing.BrowserMultiFormatReader(hints);
    let detected = false;
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };
    try {
      controls = await reader.decodeFromConstraints(constraints, videoElement, (result) => {
        if (result && !detected) {
          detected = true;
          onDetect(extractCodiceFiscale(result.getText()));
        }
      });
    } catch (e) {
      if (onError) onError(e);
    }
  }

  function stop() {
    if (controls) {
      controls.stop();
      controls = null;
    }
  }

  window.Scanner = { start, stop };
})();
