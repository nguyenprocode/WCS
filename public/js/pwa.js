(function () {
    "use strict";

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js").catch(error => {
                console.warn("[WCS PWA] Không đăng ký được service worker:", error);
            });
        });
    }

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredPrompt = event;
    });

    window.addEventListener("appinstalled", () => { deferredPrompt = null; });

    window.wcsInstallApp = async function () {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) { }
        deferredPrompt = null;
        return true;
    };
    window.wcsCanInstall = () => !!deferredPrompt;
})();
