(function () {
    "use strict";

    const ICONS = {
        file: '<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 14.5h-4a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5H9l3.5 3.5V7"/><path d="M9 1.5V5h3.5"/><path d="M12 9.5v5M9.5 12h5"/></svg>',
        folder: '<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 13.5h-6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h4.2L7 3.8h6.5a.5.5 0 0 1 .5.5V7"/><path d="M12 9.5v5M9.5 12h5"/></svg>',
        upload: '<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10V2"/><path d="m4.8 5.2 3.2-3.2 3.2 3.2"/><path d="M2.5 11v2.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V11"/></svg>'
    };

    const ACTIONS = [
        { id: "newFileBtn", icon: ICONS.file, label: "New File", hint: "HTML, CSS, JS, JSON" },
        { id: "newFolderBtn", icon: ICONS.folder, label: "New Folder", hint: "Use / for subfolders" },
        { id: "uploadFileBtn", icon: ICONS.upload, label: "Upload Files", hint: "Images, .html, .css, .js, .json" }
    ];

    let root = null;
    let ready = false;

    function build() {
        const container = document.querySelector(".editor-container");
        if (!container) return null;

        const el = document.createElement("div");
        el.id = "emptyState";
        el.className = "empty-state";
        el.hidden = true;

        const inner = document.createElement("div");
        inner.className = "empty-state-inner";

        const title = document.createElement("h2");
        title.className = "empty-state-title";
        title.textContent = "No file is open";

        const sub = document.createElement("p");
        sub.className = "empty-state-sub";
        sub.id = "emptyStateSub";

        const actions = document.createElement("div");
        actions.className = "empty-state-actions";

        for (const action of ACTIONS) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "empty-state-btn";
            btn.dataset.target = action.id;
            btn.innerHTML =
                '<span class="empty-state-btn-icon">' + action.icon + "</span>" +
                '<span class="empty-state-btn-text"><strong>' + action.label + "</strong>" +
                "<small>" + action.hint + "</small></span>";

            btn.addEventListener("click", () => {
                const target = document.getElementById(action.id);
                if (target) target.click();
            });

            actions.appendChild(btn);
        }

        inner.append(title, sub, actions);
        el.appendChild(inner);
        container.appendChild(el);
        return el;
    }

    function sync() {
        if (!ready) return;
        if (!root) root = build();
        if (!root) return;

        const hasFile = !!window.currentFile;
        root.hidden = hasFile;

        if (!hasFile) {
            const total = typeof window.getAllFiles === "function" ? window.getAllFiles().length : 0;
            const sub = document.getElementById("emptyStateSub");
            if (sub) {
                sub.textContent = total === 0
                    ? "Create your first file or folder to start coding."
                    : "Open a file from the Explorer, or create a new one.";
            }
        }
    }

    function init() {
        ready = true;
        sync();

        window.addEventListener("wcs:filechange", sync);

        const tabs = document.getElementById("tabs");
        if (tabs) new MutationObserver(sync).observe(tabs, { childList: true });
    }

    window.addEventListener("projectsLoaded", init, { once: true });
})();
