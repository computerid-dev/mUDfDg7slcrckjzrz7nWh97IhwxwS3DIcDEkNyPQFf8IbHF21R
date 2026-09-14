(function () {
  "use strict";

  var els = {};

  function cacheEls() {
    els.code = document.getElementById("h2v-code");
    els.iframe = document.getElementById("h2v-iframe");
    els.width = document.getElementById("h2v-width");
    els.height = document.getElementById("h2v-height");
    els.duration = document.getElementById("h2v-duration");
    els.fps = document.getElementById("h2v-fps");
    els.generateBtn = document.getElementById("h2v-generate");
    els.resetBtn = document.getElementById("h2v-reset");
    els.status = document.getElementById("h2v-status");
    els.statusText = document.getElementById("h2v-status-text");
    els.progressTrack = document.getElementById("h2v-progress-track");
    els.progressFill = document.getElementById("h2v-progress-fill");
    els.videoBox = document.getElementById("h2v-video-box");
    els.video = document.getElementById("h2v-video");
    els.download = document.getElementById("h2v-download");
  }

  var DEFAULT_CODE =
    '<!doctype html>\n<html>\n<head>\n<style>\n  body {\n    margin: 0;\n    height: 100vh;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: linear-gradient(135deg, #1d2233, #3a2f6b);\n    font-family: system-ui, sans-serif;\n  }\n  .box {\n    width: 120px;\n    height: 120px;\n    border-radius: 16px;\n    background: #818cf8;\n    animation: spin 3s linear infinite;\n  }\n  @keyframes spin {\n    from { transform: rotate(0deg); }\n    to { transform: rotate(360deg); }\n  }\n</style>\n</head>\n<body>\n  <div class="box"></div>\n</body>\n</html>\n';

  var htmlCanvasLoaded = false;
  var htmlCanvasLoading = null;

  function loadHtml2Canvas() {
    if (htmlCanvasLoaded) return Promise.resolve();
    if (htmlCanvasLoading) return htmlCanvasLoading;
    htmlCanvasLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = function () {
        htmlCanvasLoaded = true;
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Gagal memuat html2canvas dari CDN."));
      };
      document.head.appendChild(s);
    });
    return htmlCanvasLoading;
  }

  function setStatus(mode, text) {
    els.status.className = "h2v-status" + (mode ? " " + mode : "");
    els.statusText.textContent = text;
  }

  function updatePreview() {
    els.iframe.srcdoc = els.code.value;
  }

  function waitForIframeLoad(iframe) {
    return new Promise(function (resolve) {
      var handled = false;
      iframe.addEventListener(
        "load",
        function onLoad() {
          if (handled) return;
          handled = true;
          setTimeout(resolve, 60);
        },
        { once: true }
      );
    });
  }

  function pickMimeType() {
    var candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return "";
  }

  function resetOutput() {
    els.videoBox.style.display = "none";
    if (els.video.src) {
      URL.revokeObjectURL(els.video.src);
      els.video.removeAttribute("src");
    }
    els.progressFill.style.width = "0%";
    setStatus("", "Siap membuat video.");
  }

  function generateVideo() {
    if (!window.MediaRecorder) {
      setStatus("", "Browser ini tidak mendukung MediaRecorder. Gunakan Chrome/Edge terbaru.");
      return;
    }

    var width = Math.max(160, parseInt(els.width.value, 10) || 800);
    var height = Math.max(120, parseInt(els.height.value, 10) || 600);
    var duration = Math.min(60, Math.max(1, parseFloat(els.duration.value) || 5));
    var fps = Math.min(30, Math.max(5, parseInt(els.fps.value, 10) || 15));

    els.generateBtn.disabled = true;
    els.videoBox.style.display = "none";
    setStatus("", "Memuat mesin render...");

    loadHtml2Canvas()
      .then(function () {
        updatePreview();
        setStatus("", "Menyiapkan pratinjau...");
        return waitForIframeLoad(els.iframe);
      })
      .then(function () {
        return startRecording(width, height, duration, fps);
      })
      .catch(function (err) {
        setStatus("", "Gagal: " + err.message);
      })
      .finally(function () {
        els.generateBtn.disabled = false;
      });
  }

  function startRecording(width, height, duration, fps) {
    return new Promise(function (resolve, reject) {
      var recCanvas = document.createElement("canvas");
      recCanvas.width = width;
      recCanvas.height = height;
      var ctx = recCanvas.getContext("2d");

      var mimeType = pickMimeType();
      var stream = recCanvas.captureStream(fps);
      var recorder;
      try {
        recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType: mimeType, videoBitsPerSecond: 4_000_000 } : {}
        );
      } catch (e) {
        reject(new Error("MediaRecorder tidak bisa dijalankan: " + e.message));
        return;
      }

      var chunks = [];
      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = function () {
        clearInterval(captureTimer);
        var blob = new Blob(chunks, { type: mimeType || "video/webm" });
        var url = URL.createObjectURL(blob);
        els.video.src = url;
        els.download.href = url;
        els.download.download = "html2video-" + Date.now() + ".webm";
        els.videoBox.style.display = "block";
        setStatus("done", "Video siap. Total " + (blob.size / 1024 / 1024).toFixed(2) + " MB.");
        resolve();
      };

      var target = els.iframe.contentDocument.documentElement;
      var totalFrames = Math.round(duration * fps);
      var frameCount = 0;
      var frameInterval = 1000 / fps;

      setStatus("recording", "Merekam 0 / " + totalFrames + " frame...");
      recorder.start();

      var captureTimer = setInterval(function () {
        if (frameCount >= totalFrames) {
          clearInterval(captureTimer);
          recorder.stop();
          return;
        }
        window
          .html2canvas(target, {
            width: width,
            height: height,
            windowWidth: width,
            windowHeight: height,
            backgroundColor: null,
            scale: 1,
            logging: false,
          })
          .then(function (frameCanvas) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(frameCanvas, 0, 0, width, height);
            frameCount++;
            var pct = Math.round((frameCount / totalFrames) * 100);
            els.progressFill.style.width = pct + "%";
            setStatus("recording", "Merekam " + frameCount + " / " + totalFrames + " frame...");
          })
          .catch(function (err) {
            clearInterval(captureTimer);
            recorder.stop();
            reject(err);
          });
      }, frameInterval);
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function init() {
    cacheEls();
    els.code.value = DEFAULT_CODE;
    updatePreview();
    resetOutput();

    els.code.addEventListener("input", debounce(updatePreview, 500));
    els.generateBtn.addEventListener("click", generateVideo);
    els.resetBtn.addEventListener("click", function () {
      els.code.value = "";
      updatePreview();
      resetOutput();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
