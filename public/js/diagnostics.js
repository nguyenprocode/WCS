(function () {
    "use strict";

    const OWNER = "wcs-html";
    const MAX_ITEMS = 300;
    const LINT_DELAY = 350;

    const panel = document.getElementById("problemsPanel");
    const listEl = document.getElementById("problemsList");
    const countEl = document.getElementById("problemsCount");
    const filtersEl = document.getElementById("problemsFilters");
    const closeBtn = document.getElementById("problemsCloseBtn");
    const statusBtn = document.getElementById("problemsStatus");

    if (!panel || !listEl || !statusBtn || !window.WCSHtmlLint) return;

    const workspace = panel.parentElement;
    const lintCache = new Map();
    let filter = "all";
    let lintTimer = null;
    let refreshTimer = null;
    let started = false;

    const SEV = { error: 8, warning: 4, info: 2 };

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function projectFiles() {
        return window.files || {};
    }

    function fileSignature(names) {
        const joined = names.join("|");
        let hash = 0;
        for (let i = 0; i < joined.length; i++) hash = (hash * 31 + joined.charCodeAt(i)) | 0;
        return names.length + ":" + hash;
    }

    function sourceLabel(marker) {
        if (marker.source) return marker.source;
        const labels = { "wcs-html": "HTML", javascript: "JS", typescript: "TS", css: "CSS", scss: "CSS", less: "CSS", json: "JSON" };
        return labels[marker.owner] || marker.owner || "";
    }

    function ensureModels() {
        const files = projectFiles();
        if (typeof window.getFileModel !== "function" || typeof window.createModel !== "function") return;

        Object.keys(files).forEach(name => {
            if (window.isImageFile && window.isImageFile(name)) return;
            if (typeof files[name] !== "string") return;
            if (window.getFileModel(name)) return;
            window.createModel(name, files[name]);
        });
    }

    function lintAll() {
        const monacoApi = window.monaco;
        if (!monacoApi) return;

        ensureModels();

        const files = projectFiles();
        const names = Object.keys(files);
        const exists = new Set(names);
        const signature = fileSignature(names);

        lintCache.forEach((value, name) => {
            if (!exists.has(name)) lintCache.delete(name);
        });

        names.forEach(name => {
            if (!/\.html?$/i.test(name)) return;

            const model = window.getFileModel(name);
            if (!model || model.isDisposed()) return;

            const key = model.id + ":" + model.getVersionId() + "|" + signature;
            if (lintCache.get(name) === key) return;
            lintCache.set(name, key);

            let issues = [];
            try {
                issues = window.WCSHtmlLint.lintHtml(model.getValue(), {
                    fileName: name,
                    fileExists: path => exists.has(path)
                });
            } catch (error) {
                console.warn("[WCS] Lint HTML thất bại:", error);
            }

            const markers = issues.map(issue => {
                const start = model.getPositionAt(issue.start);
                const end = model.getPositionAt(issue.end);
                return {
                    severity: issue.severity,
                    message: issue.message,
                    code: issue.code,
                    source: "HTML",
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column
                };
            });

            monacoApi.editor.setModelMarkers(model, OWNER, markers);
        });
    }

    function scheduleLint() {
        clearTimeout(lintTimer);
        lintTimer = setTimeout(lintAll, LINT_DELAY);
    }

    function collectProblems() {
        const monacoApi = window.monaco;
        if (!monacoApi) return [];

        const files = projectFiles();
        const uriToFile = new Map();
        Object.keys(files).forEach(name => {
            const model = window.getFileModel ? window.getFileModel(name) : null;
            if (model && !model.isDisposed()) uriToFile.set(model.uri.toString(), name);
        });

        const items = [];
        monacoApi.editor.getModelMarkers({}).forEach(marker => {
            const file = uriToFile.get(marker.resource.toString());
            if (!file) return;
            if (marker.severity < SEV.info) return;
            items.push({
                file,
                severity: marker.severity,
                message: marker.message,
                source: sourceLabel(marker),
                line: marker.startLineNumber,
                col: marker.startColumn,
                endLine: marker.endLineNumber,
                endCol: marker.endColumn
            });
        });

        items.sort((a, b) =>
            a.file.localeCompare(b.file) ||
            b.severity - a.severity ||
            a.line - b.line ||
            a.col - b.col
        );
        return items;
    }

    function severityClass(severity) {
        if (severity >= SEV.error) return "error";
        if (severity >= SEV.warning) return "warning";
        return "info";
    }

    function severityIcon(severity) {
        if (severity >= SEV.error) return "✕";
        if (severity >= SEV.warning) return "⚠";
        return "ℹ";
    }

    function updateStatus(items) {
        const errors = items.filter(i => i.severity >= SEV.error).length;
        const warnings = items.filter(i => i.severity >= SEV.warning && i.severity < SEV.error).length;

        const errEl = statusBtn.querySelector(".sp-err");
        const warnEl = statusBtn.querySelector(".sp-warn");
        if (errEl) errEl.textContent = "✕ " + errors;
        if (warnEl) warnEl.textContent = "⚠ " + warnings;
        statusBtn.classList.toggle("has-errors", errors > 0);
        statusBtn.classList.toggle("has-warnings", warnings > 0);

        if (countEl) {
            countEl.textContent = items.length ? String(items.length) : "";
            countEl.hidden = !items.length;
        }
    }

    function goTo(item) {
        if (typeof window.switchFile !== "function") return;
        window.switchFile(item.file);

        const ed = window.editor;
        if (ed && ed.getModel && ed.getModel()) {
            const range = {
                startLineNumber: item.line,
                startColumn: item.col,
                endLineNumber: item.endLine,
                endColumn: item.endCol
            };
            ed.setSelection(range);
            ed.revealRangeInCenter(range);
            ed.focus();
        }
    }

    function renderList(items) {
        listEl.textContent = "";

        const visible = items.filter(item => {
            if (filter === "error") return item.severity >= SEV.error;
            if (filter === "warning") return item.severity >= SEV.warning && item.severity < SEV.error;
            return true;
        });

        if (!visible.length) {
            const empty = el("div", "problems-empty",
                items.length ? "Không có mục nào khớp bộ lọc." : "✓ Không phát hiện sự cố nào trong project.");
            listEl.appendChild(empty);
            return;
        }

        const groups = new Map();
        visible.slice(0, MAX_ITEMS).forEach(item => {
            if (!groups.has(item.file)) groups.set(item.file, []);
            groups.get(item.file).push(item);
        });

        groups.forEach((groupItems, file) => {
            const header = el("div", "problem-file");
            header.title = file;

            if (typeof window.getFileIcon === "function") {
                const icon = el("span", "problem-file-icon");
                icon.innerHTML = window.getFileIcon(file);
                header.appendChild(icon);
            }

            const slash = file.lastIndexOf("/");
            header.appendChild(el("span", "problem-file-name", file.slice(slash + 1)));
            if (slash !== -1) header.appendChild(el("span", "problem-file-dir", file.slice(0, slash)));
            header.appendChild(el("span", "problem-file-count", String(groupItems.length)));
            listEl.appendChild(header);

            groupItems.forEach(item => {
                const row = el("button", "problem-item");
                row.type = "button";
                row.setAttribute("role", "listitem");
                row.title = item.file + ":" + item.line;

                const icon = el("span", "problem-icon sev-" + severityClass(item.severity), severityIcon(item.severity));
                icon.setAttribute("aria-hidden", "true");

                row.append(
                    icon,
                    el("span", "problem-msg", item.message),
                    el("span", "problem-src", item.source),
                    el("span", "problem-loc", "[Ln " + item.line + ", Col " + item.col + "]")
                );
                row.addEventListener("click", () => goTo(item));
                listEl.appendChild(row);
            });
        });

        if (visible.length > MAX_ITEMS) {
            listEl.appendChild(el("div", "problems-empty", "Chỉ hiển thị " + MAX_ITEMS + " mục đầu tiên."));
        }
    }

    function refresh() {
        const items = collectProblems();
        updateStatus(items);
        if (!panel.hidden) renderList(items);
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 150);
    }

    function isOpen() {
        return !panel.hidden;
    }

    function setOpen(open) {
        panel.hidden = !open;
        if (workspace) workspace.classList.toggle("problems-open", open);
        statusBtn.setAttribute("aria-pressed", open ? "true" : "false");
        if (open) {
            lintAll();
            refresh();
        }
    }

    window.wcsProblems = {
        open: () => setOpen(true),
        close: () => setOpen(false),
        toggle: () => setOpen(!isOpen()),
        isOpen,
        refresh
    };

    function start() {
        if (started || !window.monaco || !window.editor) return;
        started = true;

        const monacoApi = window.monaco;

        monacoApi.editor.onDidChangeMarkers(scheduleRefresh);
        monacoApi.editor.onDidCreateModel(model => {
            model.onDidChangeContent(scheduleLint);
            scheduleLint();
        });
        monacoApi.editor.getModels().forEach(model => model.onDidChangeContent(scheduleLint));

        lintAll();
        refresh();
    }

    statusBtn.addEventListener("click", () => setOpen(!isOpen()));
    if (closeBtn) closeBtn.addEventListener("click", () => setOpen(false));

    if (filtersEl) {
        filtersEl.addEventListener("click", event => {
            const button = event.target.closest("button[data-filter]");
            if (!button) return;
            filter = button.dataset.filter;
            filtersEl.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));
            refresh();
        });
    }

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === "m") {
            event.preventDefault();
            setOpen(!isOpen());
        }
    }, true);

    window.addEventListener("wcs:filechange", () => { if (started) scheduleLint(); });
    window.addEventListener("projectsLoaded", () => { start(); scheduleLint(); });
    window.addEventListener("editorReady", () => { start(); scheduleLint(); });

    start();
})();
