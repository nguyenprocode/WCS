(function () {
    "use strict";

    const KEY = "wcs_editor_settings_v1";

    function load() {
        try {
            const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function save(patch) {
        try {
            localStorage.setItem(KEY, JSON.stringify(Object.assign(load(), patch)));
        } catch (e) {  }
    }

    function setup() {
        const ed = window.editor;
        const monaco = window.monaco;
        if (!ed || !monaco || setup.done) return;
        setup.done = true;

        const O = monaco.editor.EditorOption;
        const saved = load();
        const patch = {};

        if (saved.wordWrap === "on" || saved.wordWrap === "off") patch.wordWrap = saved.wordWrap;
        if (typeof saved.minimap === "boolean") patch.minimap = { enabled: saved.minimap };
        if (Object.keys(patch).length) ed.updateOptions(patch);

        ed.onDidChangeConfiguration(event => {
            const next = {};
            if (event.hasChanged(O.wordWrap)) next.wordWrap = ed.getOption(O.wordWrap);
            if (event.hasChanged(O.minimap)) next.minimap = !!ed.getOption(O.minimap).enabled;
            if (Object.keys(next).length) save(next);
        });
    }

    if (window.editor && window.monaco) {
        setup();
    } else {
        window.addEventListener("editorReady", setup, { once: true });
    }
})();
