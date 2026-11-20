(function () {
    "use strict";

    const panel = document.getElementById("consolePanel");
    const output = document.getElementById("consoleOutput");
    const input = document.getElementById("consoleInput");
    const form = document.getElementById("consoleForm");
    const toggleBtn = document.getElementById("consoleBtn");
    const closeBtn = document.getElementById("consoleCloseBtn");
    const clearBtn = document.getElementById("consoleClearBtn");
    const badge = document.getElementById("consoleBadge");
    const filters = document.getElementById("consoleFilters");
    const preserve = document.getElementById("consolePreserve");
    const resizer = document.getElementById("consoleResizer");
    const preview = document.getElementById("preview");
    const section = document.getElementById("previewSection");

    if (!panel || !output || !input || !preview) return;

    const MAX_ENTRIES = 1000;
    const EVAL_TIMEOUT = 8000;
    const HISTORY_LIMIT = 100;
    const STORAGE_HEIGHT = "wcs_console_height";
    const STORAGE_HISTORY = "wcs_console_history";

    let currentRun = 0;
    let pageReady = false;
    let groupDepth = 0;
    let filter = "all";
    let errorCount = 0;
    let lastEntry = null;
    let evalId = 0;

    const pending = new Map();

    let history = [];
    let historyIndex = 0;
    let draft = "";

    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { }
    }

    function load(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    const SVG_OPEN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

    const ICONS = {
        error: SVG_OPEN + '<circle cx="8" cy="8" r="6.2" fill="currentColor" stroke="none"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#1e1e1e" stroke-width="1.4"/></svg>',
        warning: SVG_OPEN + '<path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.6v3.2"/><circle cx="8" cy="11.6" r="0.5" fill="currentColor"/></svg>',
        info: SVG_OPEN + '<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v4"/><circle cx="8" cy="5" r="0.55" fill="currentColor"/></svg>',
        "chevron-right": SVG_OPEN + '<path d="M6 3.5L10.5 8 6 12.5"/></svg>',
        "chevron-left": SVG_OPEN + '<path d="M10 3.5L5.5 8 10 12.5"/></svg>',
        "chevron-down": SVG_OPEN + '<path d="M3.5 6L8 10.5 12.5 6"/></svg>'
    };

    function icon(name, className) {
        const span = el("span", "codicon" + (className ? " " + className : ""));
        if (name && ICONS[name]) span.innerHTML = ICONS[name];
        return span;
    }

    function quote(text) {
        const q = text.indexOf("'") === -1 ? "'" : (text.indexOf('"') === -1 ? '"' : "`");
        return q + text.replace(/\n/g, "\\n") + q;
    }

    function functionLabel(d) {
        if (d.isClass) return "class " + (d.name || "(anonymous)");
        return "ƒ " + (d.name || "") + "(" + (d.params || "") + ")";
    }

    function summaryText(d) {
        switch (d.t) {
            case "string": return quote(d.v.length > 60 ? d.v.slice(0, 60) + "…" : d.v);
            case "function": return functionLabel(d);
            case "circular": return "[Circular]";
            case "getter": return "(...)";
            case "error": return d.name + ": " + d.message;
            case "node": return d.preview;
            case "date":
            case "regexp": return d.v;
            case "object":
                if (d.isArray) return d.cls === "Array" ? "Array(" + d.size + ")" : d.cls + "(" + d.size + ")";
                if (d.size !== null && d.size !== undefined) return d.cls + "(" + d.size + ")";
                return d.cls === "Object" ? "{…}" : d.cls;
            default: return d.v !== undefined ? d.v : d.t;
        }
    }

    function valueClass(d) {
        return "cv-" + d.t;
    }

    function previewNode(d) {
        const span = el("span", "cv-preview");

        if (d.t !== "object") return renderValue(d, true);

        if (d.cls === "…") {
            span.textContent = "…";
            return span;
        }

        const items = [];
        const props = d.props || [];

        if (d.isArray || d.isSet) {
            props.slice(0, 6).forEach(entry => items.push({ value: entry[1] }));
        } else if (d.isMap) {
            props.slice(0, 5).forEach(entry => items.push({ key: entry[0], value: entry[1], arrow: true }));
        } else {
            props.slice(0, 5).forEach(entry => items.push({ key: entry[0], value: entry[1] }));
        }

        const more = (props.length > items.length) || d.more > 0;

        let prefix = "";
        if (d.isArray) prefix = (d.cls === "Array" ? "" : d.cls) + "(" + d.size + ") ";
        else if (d.size !== null && d.size !== undefined) prefix = d.cls + "(" + d.size + ") ";
        else if (d.cls !== "Object") prefix = d.cls + " ";

        if (d.cls === "Promise") {
            span.textContent = "Promise {<pending>}";
            return span;
        }

        span.appendChild(document.createTextNode(prefix + (d.isArray ? "[" : "{")));

        items.forEach((item, index) => {
            if (index > 0) span.appendChild(document.createTextNode(", "));

            if (item.key !== undefined) {
                span.appendChild(el("span", "cv-key", item.key));
                span.appendChild(document.createTextNode(item.arrow ? " => " : ": "));
            }

            const v = item.value;
            span.appendChild(
                v.t === "object" || v.t === "error" || v.t === "node"
                    ? el("span", valueClass(v), summaryText(v))
                    : renderValue(v, true)
            );
        });

        if (more) span.appendChild(document.createTextNode(items.length ? ", …" : "…"));

        span.appendChild(document.createTextNode(d.isArray ? "]" : "}"));

        return span;
    }

    function renderValue(d, nested) {
        switch (d.t) {
            case "string":
                return nested
                    ? el("span", "cv-string cv-quoted", quote(d.v))
                    : el("span", "cv-string", d.v);

            case "function":
                return el("span", "cv-function", functionLabel(d));

            case "circular":
                return el("span", "cv-muted", "[Circular]");

            case "getter":
                return el("span", "cv-muted", "(...)");

            case "date":
            case "regexp":
                return el("span", valueClass(d), d.v);

            case "error": {
                if (nested) return el("span", "cv-error-inline", d.name + ": " + d.message);

                const head = d.stack && d.stack.indexOf(d.name) === 0
                    ? d.stack
                    : d.name + ": " + d.message + (d.stack ? "\n" + d.stack : "");

                return el("span", "cv-error", head.replace(/\n+$/, ""));
            }

            case "node": {
                const tree = el("span", "cv-tree");
                const head = el("span", "cv-head");
                head.appendChild(icon("chevron-right", "cv-arrow"));
                head.appendChild(el("span", "cv-node", d.preview));
                tree.appendChild(head);
                tree.appendChild(el("div", "cv-html", d.html));
                head.addEventListener("click", () => tree.classList.toggle("open"));
                return tree;
            }

            case "object":
                return renderObject(d);

            default:
                return el("span", valueClass(d), d.v === undefined ? d.t : d.v);
        }
    }

    function renderObject(d) {
        const tree = el("span", "cv-tree");
        const head = el("span", "cv-head");
        const expandable = d.props && !d.shallow && (d.props.length > 0 || d.more > 0);

        head.appendChild(icon(expandable ? "chevron-right" : null, "cv-arrow"));
        head.appendChild(previewNode(d));
        tree.appendChild(head);

        if (!expandable) return tree;

        let built = false;

        head.addEventListener("click", () => {
            tree.classList.toggle("open");

            if (built) return;
            built = true;

            const children = el("div", "cv-children");

            d.props.forEach(entry => {
                const row = el("div", "cv-prop");
                row.appendChild(el("span", "cv-key", entry[0]));
                row.appendChild(document.createTextNode(": "));
                row.appendChild(renderValue(entry[1], true));
                children.appendChild(row);
            });

            if (d.more > 0) {
                children.appendChild(el("div", "cv-prop cv-muted", "… còn " + d.more + " mục nữa"));
            }

            if (d.size !== null && d.size !== undefined && !d.isArray) {
                const row = el("div", "cv-prop");
                row.appendChild(el("span", "cv-key", "size"));
                row.appendChild(document.createTextNode(": "));
                row.appendChild(el("span", "cv-number", String(d.size)));
                children.insertBefore(row, children.firstChild);
            }

            tree.appendChild(children);
        });

        return tree;
    }

    function renderArgs(args) {
        const body = el("span", "console-body");

        args.forEach(d => {
            body.appendChild(renderValue(d, false));
        });

        return body;
    }

    function renderTable(message) {
        const table = el("table", "console-table");
        const headRow = el("tr");
        const showValue = message.hasValue;

        headRow.appendChild(el("th", null, "(index)"));
        message.cols.forEach(col => headRow.appendChild(el("th", null, col)));
        if (showValue) headRow.appendChild(el("th", null, "Value"));
        table.appendChild(headRow);

        message.cells.forEach((cell, rowIndex) => {
            const tr = el("tr");
            tr.appendChild(el("td", null, message.index[rowIndex]));

            message.cols.forEach(col => {
                const td = el("td");
                if (cell[col] !== undefined) td.appendChild(previewNode(cell[col]));
                tr.appendChild(td);
            });

            if (showValue) {
                const td = el("td");
                if (cell["\u0000value"] !== undefined) td.appendChild(previewNode(cell["\u0000value"]));
                tr.appendChild(td);
            }

            table.appendChild(tr);
        });

        const wrap = el("span", "console-body");
        wrap.appendChild(table);
        return wrap;
    }

    function updateBadge() {
        if (!badge) return;
        badge.hidden = errorCount === 0;
        badge.textContent = errorCount > 99 ? "99+" : String(errorCount);
    }

    function matchesFilter(level, kind) {
        if (kind === "separator") return true;
        if (filter === "all") return true;
        if (filter === "log") return level === "log" || level === "debug";
        return level === filter;
    }

    function applyFilter() {
        output.querySelectorAll(".console-entry[data-level]").forEach(entry => {
            entry.hidden = !matchesFilter(entry.dataset.level, entry.dataset.kind);
        });
    }

    function refreshEmptyState() {
        const hint = output.querySelector(".console-empty");
        if (hint) hint.remove();
    }

    function locationLabel(loc) {
        if (!loc || !loc.line) return "";

        let file = String(loc.file || "");

        if (/^about:srcdoc/.test(file) || /^(blob|data):/.test(file)) file = "preview";
        else file = file.split("/").pop();

        return file + ":" + loc.line + (loc.col ? ":" + loc.col : "");
    }

    function addEntry(options) {
        const nearBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 24;

        const level = options.level || "log";
        const kind = options.kind || "log";

        const hint = output.querySelector(".console-empty");
        if (hint) hint.remove();

        if (options.key && lastEntry && lastEntry.key === options.key && lastEntry.depth === groupDepth && lastEntry.el.isConnected) {
            lastEntry.count++;

            if (!lastEntry.countEl) {
                lastEntry.countEl = el("span", "console-count");
                lastEntry.el.insertBefore(lastEntry.countEl, lastEntry.el.children[1]);
            }

            lastEntry.countEl.textContent = String(lastEntry.count);

            if (level === "error") { errorCount++; updateBadge(); }
            return lastEntry.el;
        }

        const entry = el("div", "console-entry level-" + level + " kind-" + kind);
        entry.dataset.level = level;
        entry.dataset.kind = kind;
        entry.style.paddingLeft = (8 + groupDepth * 14) + "px";
        entry.hidden = !matchesFilter(level, kind);

        const gutter = el("span", "console-gutter");
        if (options.gutter) gutter.appendChild(icon(options.gutter));
        entry.appendChild(gutter);
        entry.appendChild(options.body);

        if (options.loc) {
            const label = locationLabel(options.loc);
            if (label) entry.appendChild(el("span", "console-loc", label));
        }

        output.appendChild(entry);

        lastEntry = options.key
            ? { key: options.key, count: 1, countEl: null, el: entry, depth: groupDepth }
            : null;

        if (level === "error" && kind === "log") {
            errorCount++;
            updateBadge();
        }

        while (output.querySelectorAll(".console-entry").length > MAX_ENTRIES) {
            const first = output.querySelector(".console-entry");
            if (first) first.remove();
        }

        if (nearBottom) output.scrollTop = output.scrollHeight;

        return entry;
    }

    function clearConsole() {
        output.textContent = "";
        errorCount = 0;
        lastEntry = null;
        groupDepth = 0;
        updateBadge();
        refreshEmptyState();
    }

    const GUTTER = { error: "error", warn: "warning", info: "info", debug: "", log: "" };

    function handleMessage(message) {
        switch (message.kind) {
            case "ready":
                pageReady = true;
                break;

            case "clear":
                clearConsole();
                break;

            case "log": {
                if (!message.args || !message.args.length) return;

                let key = null;
                try { key = message.level + "|" + JSON.stringify(message.args) + "|" + (message.loc ? message.loc.line : ""); } catch (e) { key = null; }

                addEntry({
                    level: message.level,
                    gutter: GUTTER[message.level] || "",
                    body: renderArgs(message.args),
                    loc: message.loc,
                    key: key
                });
                break;
            }

            case "group": {
                const body = renderArgs(message.args && message.args.length ? message.args : [{ t: "string", v: "console.group" }]);
                body.classList.add("console-group-label");
                addEntry({ level: "log", gutter: "chevron-down", body: body });
                groupDepth++;
                break;
            }

            case "groupEnd":
                groupDepth = Math.max(0, groupDepth - 1);
                lastEntry = null;
                break;

            case "table":
                addEntry({ level: "log", body: renderTable(message) });
                break;

            case "result":
                handleResult(message);
                break;
        }
    }

    function handleResult(message) {
        const request = pending.get(message.id);

        if (request) {
            clearTimeout(request.timer);
        }

        const body = el("span", "console-body");

        if (message.pending) {
            body.appendChild(el("span", "cv-muted", "Promise {<pending>}"));
            const entry = addEntry({ level: "log", kind: "result", gutter: "chevron-left", body: body });
            pending.set(message.id, { entry: entry, timer: null });
            return;
        }

        if (message.resolved && request && request.entry) {
            const target = request.entry;
            const old = target.querySelector(".console-body");
            const fresh = el("span", "console-body");

            if (message.ok) {
                fresh.appendChild(el("span", "cv-muted", "Promise {<resolved>: "));
                fresh.appendChild(renderValue(message.value, true));
                fresh.appendChild(el("span", "cv-muted", "}"));
            } else {
                fresh.appendChild(el("span", "cv-muted", "Promise {<rejected>: "));
                fresh.appendChild(renderValue(message.value, true));
                fresh.appendChild(el("span", "cv-muted", "}"));
                target.classList.add("is-error");
            }

            if (old) old.replaceWith(fresh);
            pending.delete(message.id);
            return;
        }

        pending.delete(message.id);

        if (message.ok) {
            body.appendChild(renderValue(message.value, false));
            addEntry({ level: "log", kind: "result", gutter: "chevron-left", body: body });
        } else {
            const value = message.value;
            body.appendChild(
                value && value.t === "error"
                    ? el("span", "cv-error", "Uncaught " + value.name + ": " + value.message)
                    : renderValue(value, false)
            );
            const entry = addEntry({ level: "error", kind: "result", gutter: "error", body: body });
            entry.classList.add("is-error");
            errorCount++;
            updateBadge();
        }
    }

    window.addEventListener("message", event => {
        if (event.source !== preview.contentWindow) return;

        const message = event.data && event.data.wcsConsole;
        if (!message || typeof message !== "object") return;

        if (message.run < currentRun) return;

        if (message.run > currentRun) currentRun = message.run;

        handleMessage(message);
    });

    window.addEventListener("wcs:previewrun", event => {
        const detail = event.detail || {};

        currentRun = detail.run;
        pageReady = false;

        pending.forEach(request => clearTimeout(request.timer));
        pending.clear();

        groupDepth = 0;
        lastEntry = null;

        if (preserve && preserve.checked) {
            if (output.querySelector(".console-entry")) {
                addEntry({
                    level: "log",
                    kind: "separator",
                    body: el("span", "console-body", "Preview reloaded")
                });
            }
        } else {
            clearConsole();
        }
    });

    function pushHistory(code) {
        if (history[history.length - 1] !== code) {
            history.push(code);
            if (history.length > HISTORY_LIMIT) history.shift();
            store(STORAGE_HISTORY, JSON.stringify(history));
        }

        historyIndex = history.length;
        draft = "";
    }

    function runCommand(code) {
        const echo = el("span", "console-body");
        echo.appendChild(el("span", "cv-muted", code));
        addEntry({ level: "log", kind: "input", gutter: "chevron-right", body: echo });

        const target = preview.contentWindow;

        if (!pageReady || !target) {
            addEntry({
                level: "error",
                gutter: "error",
                body: el("span", "console-body", "Preview chưa sẵn sàng: hãy tạo file index.html hợp lệ rồi thử lại.")
            });
            return;
        }

        const id = ++evalId;

        const timer = setTimeout(() => {
            pending.delete(id);
            addEntry({
                level: "error",
                gutter: "error",
                body: el("span", "console-body", "Không nhận được phản hồi từ preview (trang có thể đang bị treo hoặc vòng lặp vô hạn). Hãy bấm Refresh.")
            });
        }, EVAL_TIMEOUT);

        pending.set(id, { entry: null, timer: timer });

        target.postMessage({ wcsEval: { id: id, code: code } }, "*");
    }

    function focusInputIfDesktop() {
        if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
        input.focus();
    }

    function autoGrow() {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    }

    function submit() {
        const code = input.value;

        if (!code.trim()) return;

        pushHistory(code);
        input.value = "";
        autoGrow();
        runCommand(code);
    }

    input.addEventListener("input", autoGrow);

    function revealInput() {
        const run = () => {
            if (document.activeElement !== input) return;
            form.scrollIntoView({ block: "end", inline: "nearest" });
            output.scrollTop = output.scrollHeight;
        };

        requestAnimationFrame(run);
        setTimeout(run, 150);
        setTimeout(run, 400);
    }

    input.addEventListener("focus", revealInput);

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", revealInput);
    }

    input.addEventListener("keydown", event => {
        if (event.isComposing) return;

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
            return;
        }

        if (event.key === "ArrowUp" && !event.shiftKey) {
            const beforeCaret = input.value.slice(0, input.selectionStart);

            if (input.selectionStart === input.selectionEnd && beforeCaret.indexOf("\n") === -1 && history.length) {
                event.preventDefault();

                if (historyIndex === history.length) draft = input.value;
                historyIndex = Math.max(0, historyIndex - 1);
                input.value = history[historyIndex];
                autoGrow();
                input.setSelectionRange(input.value.length, input.value.length);
            }
            return;
        }

        if (event.key === "ArrowDown" && !event.shiftKey) {
            const afterCaret = input.value.slice(input.selectionEnd);

            if (input.selectionStart === input.selectionEnd && afterCaret.indexOf("\n") === -1 && historyIndex < history.length) {
                event.preventDefault();

                historyIndex++;
                input.value = historyIndex === history.length ? draft : history[historyIndex];
                autoGrow();
                input.setSelectionRange(input.value.length, input.value.length);
            }
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
            event.preventDefault();
            clearConsole();
            return;
        }

        if (event.key === "Escape") {
            input.blur();
        }
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        submit();
    });

    output.addEventListener("click", event => {
        if (event.target.closest(".cv-head")) return;

        const selection = window.getSelection && window.getSelection();
        if (selection && String(selection).length) return;

        focusInputIfDesktop();
    });

    function setOpen(open, focus) {
        panel.hidden = !open;

        if (section) section.classList.toggle("console-open", open);

        if (toggleBtn) toggleBtn.setAttribute("aria-pressed", open ? "true" : "false");

        if (open) {
            refreshEmptyState();
            output.scrollTop = output.scrollHeight;
            if (focus) focusInputIfDesktop();
        }

        if (typeof window.resizePreview === "function") window.resizePreview();
        if (window.editor && typeof window.editor.layout === "function") window.editor.layout();
    }

    function toggle() {
        setOpen(panel.hidden, false);
    }

    if (toggleBtn) toggleBtn.addEventListener("click", toggle);
    if (closeBtn) closeBtn.addEventListener("click", () => setOpen(false));
    if (clearBtn) clearBtn.addEventListener("click", () => { clearConsole(); focusInputIfDesktop(); });

    if (filters) {
        filters.addEventListener("click", event => {
            const button = event.target.closest("button[data-level]");
            if (!button) return;

            filter = button.dataset.level;

            filters.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));

            applyFilter();
        });
    }

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && (event.key === "`" || event.code === "Backquote")) {
            event.preventDefault();

            if (section && section.classList.contains("preview-hidden")) return;

            toggle();
        }
    });

    if (resizer) {
        resizer.addEventListener("pointerdown", event => {
            event.preventDefault();
            resizer.setPointerCapture(event.pointerId);
            resizer.classList.add("dragging");
        });

        resizer.addEventListener("pointermove", event => {
            if (!resizer.classList.contains("dragging") || !section) return;

            const rect = section.getBoundingClientRect();
            if (!rect.height) return;

            const percent = ((rect.bottom - event.clientY) / rect.height) * 100;
            const clamped = Math.max(20, Math.min(80, percent));

            panel.style.setProperty("--console-h", clamped.toFixed(1) + "%");
        });

        const finish = event => {
            if (!resizer.classList.contains("dragging")) return;

            resizer.classList.remove("dragging");

            try { resizer.releasePointerCapture(event.pointerId); } catch (e) { }

            const value = panel.style.getPropertyValue("--console-h");
            if (value) store(STORAGE_HEIGHT, value);
        };

        resizer.addEventListener("pointerup", finish);
        resizer.addEventListener("pointercancel", finish);
    }

    try {
        const saved = JSON.parse(load(STORAGE_HISTORY) || "[]");
        if (Array.isArray(saved)) history = saved.filter(x => typeof x === "string").slice(-HISTORY_LIMIT);
    } catch (e) {
        history = [];
    }

    historyIndex = history.length;

    const savedHeight = load(STORAGE_HEIGHT);
    if (savedHeight && /^\d+(\.\d+)?%$/.test(savedHeight)) {
        panel.style.setProperty("--console-h", savedHeight);
    }

    try { localStorage.removeItem("wcs_console_open"); } catch (e) { }

    updateBadge();
    refreshEmptyState();

    window.wcsConsole = {
        open: () => setOpen(true, false),
        close: () => setOpen(false),
        toggle: toggle,
        clear: clearConsole
    };

})();
