(function () {
    "use strict";

    const splash = document.getElementById("splash");
    if (!splash) return;

    const MIN_SHOW_MS = 1100;
    const DONE_HOLD_MS = 380;
    const LEAVE_MS = 600;
    const SAFETY_MS = 45000;

    const startedAt = performance.now();
    const done = { load: false, fonts: false, editor: false, projects: false };
    let failed = !!window.__wcsEditorFailed;
    let finishing = false;
    let finished = false;

    if (document.readyState === "complete") done.load = true;
    else window.addEventListener("load", () => { done.load = true; check(); }, { once: true });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { done.fonts = true; check(); }, () => { done.fonts = true; check(); });
    } else {
        done.fonts = true;
    }

    if (window.editor && window.monaco) done.editor = true;
    window.addEventListener("editorReady", () => { done.editor = true; check(); }, { once: true });
    window.addEventListener("projectsLoaded", () => { done.projects = true; check(); }, { once: true });
    window.addEventListener("editorLoadFailed", () => { failed = true; check(); }, { once: true });

    function allReady() {
        return failed || (done.load && done.fonts && done.editor && done.projects);
    }

    function leave() {
        if (finished) return;
        finished = true;
        splash.classList.add("is-leaving");
        document.documentElement.classList.remove("sp-active");
        setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, LEAVE_MS + 80);
    }

    function check() {
        if (finishing || finished || !allReady()) return;
        finishing = true;
        const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - startedAt));
        setTimeout(() => {
            splash.classList.add("is-done");
            setTimeout(leave, DONE_HOLD_MS);
        }, wait);
    }

    document.documentElement.classList.add("sp-active");
    check();

    setTimeout(() => { failed = true; check(); }, SAFETY_MS);
})();
