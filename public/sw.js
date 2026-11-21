const VERSION = "wcs-v1.0.0";
const APP_CACHE = "app-" + VERSION;
const CDN_CACHE = "cdn-monaco-0.52.2";

const APP_SHELL = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "favicon.svg",
    "css/style.css",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "js/editor.js",
    "js/html-data.js",
    "js/autocomplete.js",
    "js/emmet-engine.js",
    "js/emmet.js",
    "js/preview.js",
    "js/console.js",
    "js/app.js",
    "js/empty-state.js",
    "js/replace-core.js",
    "js/find.js",
    "js/format.js",
    "js/share.js",
    "js/explorer-menu.js",
    "js/palette.js",
    "js/settings.js",
    "js/pwa.js",
    "js/splash.js",
    "js/diagnostics.js",
    "js/html-lint.js"
];

const CDN_HOST = "cdnjs.cloudflare.com";
const CDN_PATH = "/ajax/libs/monaco-editor/";

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== APP_CACHE && key !== CDN_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request) {
    const cache = await caches.open(APP_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
            const shell = await cache.match("index.html");
            if (shell) return shell;
        }
        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CDN_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.hostname === CDN_HOST && url.pathname.startsWith(CDN_PATH)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirst(request));
    }
});
