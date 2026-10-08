// Scansione da fotocamera di QR (tessera club) e Code 39 (Tessera Sanitaria).
//
// Se il browser ha il BarcodeDetector nativo (Chrome/Android), lo usiamo: è molto più
// affidabile di ZXing su codici piccoli, lucidi o leggermente sfocati come quello
// della Tessera Sanitaria. Altrimenti (es. Safari/iOS) ripieghiamo su @zxing/library.
(function () {
  let stop_ = null;

  function extractCodiceFiscale(raw) {
    // Alcune tessere sanitarie includono caratteri extra attorno al codice fiscale:
    // isoliamo le 16 lettere/cifre del CF ovunque si trovino nel testo decodificato.
    const match = raw.toUpperCase().match(/[A-Z0-9]{16}/);
    return match ? match[0] : raw.trim().toUpperCase();
  }

  const VIDEO_CONSTRAINTS = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  async function nativeSupported() {
    if (!('BarcodeDetector' in window)) return false;
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      return formats.includes('code_39') && formats.includes('qr_code');
    } catch (e) {
      return false;
    }
  }

  async function startNative(videoElement, onDetect) {
    const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    videoElement.srcObject = stream;
    await videoElement.play();

    // Messa a fuoco continua, se il dispositivo la supporta.
    const track = stream.getVideoTracks()[0];
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
      }
    } catch (e) {
      /* non critico */
    }

    const detector = new window.BarcodeDetector({ formats: ['code_39', 'qr_code'] });
    let running = true;
    let busy = false;
    const timer = setInterval(async () => {
      if (!running || busy || videoElement.readyState < 2) return;
      busy = true;
      try {
        const codes = await detector.detect(videoElement);
        if (running && codes.length) {
          running = false;
          onDetect(extractCodiceFiscale(codes[0].rawValue));
        }
      } catch (e) {
        /* frame non decodificabile: riprova al prossimo giro */
      } finally {
        busy = false;
      }
    }, 120);

    return () => {
      running = false;
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      videoElement.srcObject = null;
    };
  }

  async function startZxing(videoElement, onDetect) {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.CODE_39]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    const reader = new ZXing.BrowserMultiFormatReader(hints);
    reader.timeBetweenDecodingAttempts = 120;
    let detected = false;
    const controls = await reader.decodeFromConstraints(VIDEO_CONSTRAINTS, videoElement, (result) => {
      if (result && !detected) {
        detected = true;
        onDetect(extractCodiceFiscale(result.getText()));
      }
    });
    return () => controls.stop();
  }

  async function start(videoElement, onDetect, onError) {
    stop();
    window.Scanner.engine = null;
    try {
      const useNative = await nativeSupported();
      stop_ = useNative
        ? await startNative(videoElement, onDetect)
        : await startZxing(videoElement, onDetect);
      window.Scanner.engine = useNative ? 'nativo' : 'zxing';
    } catch (e) {
      if (onError) onError(e);
    }
  }

  function stop() {
    if (stop_) {
      stop_();
      stop_ = null;
    }
  }

  window.Scanner = { start, stop, engine: null };
})();
