(function (root) {
    "use strict";

    function isBoundary(text, j) {
        if (j === 0) return true;
        const prev = text[j - 1];
        if ("/._- :".indexOf(prev) !== -1) return true;
        return prev === prev.toLowerCase() && prev !== prev.toUpperCase() &&
            text[j] === text[j].toUpperCase() && text[j] !== text[j].toLowerCase();
    }

    function fuzzyMatch(query, text) {
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        const n = q.length;
        const m = t.length;

        if (!n) return { score: 0, positions: [] };
        if (n > m) return null;

        let qi = 0;
        for (let i = 0; i < m && qi < n; i++) if (t[i] === q[qi]) qi++;
        if (qi < n) return null;

        const NEG = -1e9;
        const GAP = 0.4;
        const score = [];
        const from = [];

        for (let i = 0; i < n; i++) {
            score.push(new Array(m).fill(NEG));
            from.push(new Array(m).fill(-1));
        }

        for (let j = 0; j < m; j++) {
            if (t[j] === q[0]) {
                score[0][j] = 1 + (isBoundary(text, j) ? 8 : 0) + (j === 0 ? 4 : 0) - Math.min(j, 20) * 0.1;
            }
        }

        for (let i = 1; i < n; i++) {
            let bestVal = NEG;
            let bestIdx = -1;

            for (let j = i; j < m; j++) {
                const k = j - 2;
                if (k >= 0 && score[i - 1][k] > NEG / 2) {
                    const val = score[i - 1][k] + GAP * k;
                    if (val > bestVal) { bestVal = val; bestIdx = k; }
                }

                if (t[j] !== q[i]) continue;

                const charScore = 1 + (isBoundary(text, j) ? 8 : 0);
                let best = NEG;
                let bestFrom = -1;

                if (score[i - 1][j - 1] > NEG / 2) {
                    best = score[i - 1][j - 1] + 6;
                    bestFrom = j - 1;
                }
                if (bestIdx !== -1) {
                    const gapped = bestVal - GAP * (j - 1);
                    if (gapped > best) { best = gapped; bestFrom = bestIdx; }
                }

                if (bestFrom !== -1) {
                    score[i][j] = best + charScore;
                    from[i][j] = bestFrom;
                }
            }
        }

        let end = -1;
        let top = NEG;
        for (let j = 0; j < m; j++) {
            if (score[n - 1][j] > top) { top = score[n - 1][j]; end = j; }
        }
        if (end === -1) return null;

        const positions = new Array(n);
        let j = end;
        for (let i = n - 1; i >= 0; i--) {
            positions[i] = j;
            j = from[i][j];
        }

        let total = top;
        const slash = text.lastIndexOf("/");
        const base = t.slice(slash + 1);
        if (base.indexOf(q) !== -1) total += 15;
        if (base.startsWith(q)) total += 10;
        if (positions[0] > slash) total += 5;
        total -= m * 0.05;

        return { score: total, positions };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { fuzzyMatch };
        return;
    }

    if (typeof document === "undefined") return;

    const MAX_ROWS = 80;
    const palette = { open: false, mode: "file", items: [], active: 0, backdrop: null, input: null, list: null, hint: null };
    const recent = [];

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function editorHasModel() {
        const ed = window.editor;
        return !!(ed && typeof ed.getModel === "function" && ed.getModel());
    }

    function touchRecent(name) {
        if (!name) return;
        const i = recent.indexOf(name);
        if (i !== -1) recent.splice(i, 1);
        recent.unshift(name);
        if (recent.length > 50) recent.length = 50;
    }

    function blockingDialogOpen() {
        return !!document.querySelector(".dialog-backdrop:not([hidden])");
    }

    function allFiles() {
        return Object.keys(window.files || {});
    }

    function parseFileQuery(raw) {
        const m = /^(.*?)[:#](\d+)(?::(\d+))?$/.exec(raw);
        if (m && m[1].trim()) {
            return { text: m[1].trim(), line: parseInt(m[2], 10), col: m[3] ? parseInt(m[3], 10) : 1 };
        }
        return { text: raw.trim(), line: 0, col: 1 };
    }

    function openFileAt(name, line, col) {
        if (typeof window.switchFile !== "function") return;
        window.switchFile(name);
        touchRecent(name);

        const ed = window.editor;
        if (line && ed && ed.getModel && ed.getModel()) {
            const total = ed.getModel().getLineCount();
            const target = Math.max(1, Math.min(line, total));
            ed.setPosition({ lineNumber: target, column: col || 1 });
            ed.revealLineInCenter(target);
            ed.focus();
        } else if (ed && ed.getModel && ed.getModel()) {
            ed.focus();
        }

        const overlay = document.getElementById("sidebarOverlay");
        if (overlay && overlay.classList.contains("show")) overlay.click();
    }

    function buildFileItems(raw) {
        const names = allFiles();
        const query = parseFileQuery(raw);
        const tabs = typeof window.getOpenTabs === "function" ? window.getOpenTabs() : [];
        const order = recent.concat(tabs.filter(name => recent.indexOf(name) === -1));
        const rank = new Map(order.map((name, index) => [name, index]));

        if (!names.length) {
            return [{ label: "Project chưa có file nào", disabled: true }];
        }

        let scored;
        if (!query.text) {
            scored = names.map(name => ({ name, score: 0, positions: [] }));
            scored.sort((a, b) => {
                const ra = rank.has(a.name) ? rank.get(a.name) : 1e6;
                const rb = rank.has(b.name) ? rank.get(b.name) : 1e6;
                return ra - rb || a.name.localeCompare(b.name);
            });
        } else {
            scored = [];
            names.forEach(name => {
                const hit = fuzzyMatch(query.text, name);
                if (hit) scored.push({ name, score: hit.score + (rank.has(name) ? 2 : 0), positions: hit.positions });
            });
            scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        }

        if (!scored.length) return [{ label: "Không tìm thấy file nào khớp", disabled: true }];

        return scored.slice(0, MAX_ROWS).map(entry => ({
            kind: "file",
            name: entry.name,
            positions: entry.positions,
            detail: entry.name === window.currentFile ? "đang mở" : "",
            run: () => openFileAt(entry.name, query.line, query.col)
        }));
    }

    function buildLineItems(raw) {
        if (!editorHasModel()) return [{ label: "Hãy mở một file trước khi đi tới dòng", disabled: true }];

        const model = window.editor.getModel();
        const total = model.getLineCount();
        const m = /^\s*(\d+)(?:\s*[:,]\s*(\d+))?\s*$/.exec(raw);

        if (!m) return [{ label: "Nhập số dòng (1 – " + total + ")", disabled: true }];

        const line = Math.max(1, Math.min(parseInt(m[1], 10), total));
        const col = m[2] ? parseInt(m[2], 10) : 1;

        return [{
            kind: "line",
            label: "Đi tới dòng " + line + (col > 1 ? ", cột " + col : ""),
            detail: "trong file hiện tại",
            run: () => {
                const ed = window.editor;
                ed.setPosition({ lineNumber: line, column: col });
                ed.revealLineInCenter(line);
                ed.focus();
            }
        }];
    }

    function click(id) {
        const node = document.getElementById(id);
        if (node && !node.disabled) node.click();
    }

    function editorTrigger(actionId) {
        const ed = window.editor;
        if (!ed || !editorHasModel()) return;
        ed.focus();
        ed.trigger("wcs-palette", actionId, null);
    }

    function fireKey(key, extra) {
        document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
    }

    function tweakFontSize(delta) {
        const ed = window.editor;
        if (!ed || !window.monaco) return;
        const current = ed.getOption(window.monaco.editor.EditorOption.fontSize);
        ed.updateOptions({ fontSize: delta === 0 ? 14 : Math.max(8, Math.min(32, current + delta)) });
    }

    function appCommands() {
        const E = () => window.monaco.editor.EditorOption;
        return [
            { category: "File", label: "Go to File…", keys: "Ctrl+P", stay: true, run: () => setMode("file", "") },
            { category: "File", label: "Go to Line…", keys: "Ctrl+G", stay: true, run: () => setMode("line", "") },
            { category: "File", label: "New File", run: () => click("newFileBtn") },
            { category: "File", label: "New Folder", run: () => click("newFolderBtn") },
            { category: "File", label: "Save File", keys: "Ctrl+S", run: () => fireKey("s", { ctrlKey: true }) },
            { category: "File", label: "Upload Files", run: () => click("uploadFileBtn") },
            { category: "File", label: "Import Project (.zip)", run: () => click("importProjectBtn") },
            { category: "File", label: "Download Project (.zip)", run: () => click("downloadProjectBtn") },
            { category: "File", label: "Share Project (Text)", run: () => click("shareProjectBtn") },
            {
                category: "File", label: "Close Tab", run: () => {
                    if (window.currentFile && typeof window.closeTab === "function") window.closeTab(window.currentFile);
                }
            },
            {
                category: "File", label: "Close All Tabs", run: () => {
                    if (typeof window.closeTab !== "function" || typeof window.getOpenTabs !== "function") return;
                    window.getOpenTabs().slice().forEach(name => window.closeTab(name));
                }
            },
            { category: "Search", label: "Find in File", keys: "Ctrl+F", run: () => editorTrigger("actions.find") },
            { category: "Search", label: "Replace in File", keys: "Ctrl+H", run: () => editorTrigger("editor.action.startFindReplace") },
            {
                category: "Search", label: "Find in Project", keys: "Ctrl+Shift+F", run: () => {
                    if (window.wcsFind) window.wcsFind.open(); else click("findProjectBtn");
                }
            },
            {
                category: "Search", label: "Replace in Project", keys: "Ctrl+Shift+H", run: () => {
                    if (window.wcsFind) window.wcsFind.openReplace();
                }
            },
            { category: "Preview", label: "Run / Refresh Preview", keys: "Ctrl+Enter", run: () => click("refreshBtn") },
            { category: "Preview", label: "Toggle Preview", run: () => click("togglePreviewBtn") },
            { category: "Preview", label: "Toggle Console", keys: "Ctrl+`", run: () => click("consoleBtn") },
            {
                category: "View", label: "Toggle Word Wrap", run: () => {
                    const ed = window.editor;
                    const on = ed.getOption(E().wordWrap) !== "off";
                    ed.updateOptions({ wordWrap: on ? "off" : "on" });
                }
            },
            {
                category: "View", label: "Toggle Minimap", run: () => {
                    const ed = window.editor;
                    ed.updateOptions({ minimap: { enabled: !ed.getOption(E().minimap).enabled } });
                }
            },
            { category: "View", label: "Increase Font Size", run: () => tweakFontSize(1) },
            { category: "View", label: "Decrease Font Size", run: () => tweakFontSize(-1) },
            { category: "View", label: "Reset Font Size", run: () => tweakFontSize(0) },
            { category: "Editor", label: "Format Document", keys: "Shift+Alt+F", run: () => click("formatCodeBtn") }
        ];
    }

    const SKIP_MONACO = new Set([
        "editor.action.quickCommand",
        "editor.action.formatDocument",
        "actions.find",
        "editor.action.startFindReplace"
    ]);

    function monacoCommands() {
        const ed = window.editor;
        if (!ed || !editorHasModel() || typeof ed.getSupportedActions !== "function") return [];

        return ed.getSupportedActions()
            .filter(action => action.label && !SKIP_MONACO.has(action.id))
            .map(action => ({
                category: "Editor",
                label: action.label,
                run: () => {
                    ed.focus();
                    const result = action.run();
                    if (result && typeof result.catch === "function") result.catch(() => { });
                }
            }));
    }

    function buildCommandItems(raw) {
        const query = raw.trim();
        const commands = appCommands().concat(monacoCommands());

        let scored;
        if (!query) {
            scored = commands.map(cmd => ({ cmd, positions: [], score: 0 }));
        } else {
            scored = [];
            commands.forEach(cmd => {
                const full = cmd.category + ": " + cmd.label;
                const hit = fuzzyMatch(query, full);
                if (hit) scored.push({ cmd, positions: hit.positions, score: hit.score });
            });
            scored.sort((a, b) => b.score - a.score);
        }

        if (!scored.length) return [{ label: "Không có lệnh nào khớp", disabled: true }];

        return scored.slice(0, MAX_ROWS).map(entry => ({
            kind: "command",
            label: entry.cmd.category + ": " + entry.cmd.label,
            positions: entry.positions,
            keys: entry.cmd.keys || "",
            stay: !!entry.cmd.stay,
            run: entry.cmd.run
        }));
    }

    function build() {
        if (palette.backdrop) return;

        const backdrop = el("div", "palette-backdrop");
        backdrop.hidden = true;

        const card = el("div", "palette-card");
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");
        card.setAttribute("aria-label", "Command Palette");

        const input = el("input", "palette-input");
        input.type = "text";
        input.spellcheck = false;
        input.autocomplete = "off";
        input.autocapitalize = "off";
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-expanded", "true");
        input.setAttribute("aria-controls", "paletteList");

        const list = el("div", "palette-list");
        list.id = "paletteList";
        list.setAttribute("role", "listbox");

        const hint = el("div", "palette-hint");

        card.append(input, list, hint);
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        backdrop.addEventListener("mousedown", event => {
            if (event.target === backdrop) closePalette(true);
        });

        input.addEventListener("input", onInput);
        input.addEventListener("keydown", onInputKey);

        Object.assign(palette, { backdrop, input, list, hint });
    }

    function modeOf(value) {
        if (value.startsWith(">")) return "command";
        if (value.startsWith(":")) return "line";
        return "file";
    }

    function hintFor(mode) {
        const base = "↑↓ chọn · Enter chạy · Esc đóng";
        if (mode === "command") return base + " · xóa “>” để về danh sách file";
        if (mode === "line") return base + " · gõ số dòng, ví dụ :42";
        return base + " · “>” lệnh · “:” đi tới dòng · tên:dòng";
    }

    function highlight(container, text, positions, offset) {
        const set = new Set((positions || []).map(p => p - offset));
        let buffer = "";
        let marked = false;

        function flush() {
            if (!buffer) return;
            if (marked) container.appendChild(el("span", "palette-hl", buffer));
            else container.appendChild(document.createTextNode(buffer));
            buffer = "";
        }

        for (let i = 0; i < text.length; i++) {
            const isMarked = set.has(i);
            if (isMarked !== marked) { flush(); marked = isMarked; }
            buffer += text[i];
        }
        flush();
    }

    function renderItems() {
        const { list, items } = palette;
        list.textContent = "";

        items.forEach((item, index) => {
            const row = el("div", "palette-item" + (item.disabled ? " disabled" : ""));
            row.setAttribute("role", "option");
            row.dataset.index = String(index);

            if (item.kind === "file") {
                if (typeof window.getFileIcon === "function") {
                    const icon = el("span", "palette-icon");
                    icon.innerHTML = window.getFileIcon(item.name);
                    row.appendChild(icon);
                }

                const slash = item.name.lastIndexOf("/");
                const base = item.name.slice(slash + 1);
                const nameEl = el("span", "palette-label");
                highlight(nameEl, base, item.positions, slash + 1);
                row.appendChild(nameEl);

                if (slash !== -1) {
                    const dirEl = el("span", "palette-detail");
                    highlight(dirEl, item.name.slice(0, slash), item.positions, 0);
                    row.appendChild(dirEl);
                }
                if (item.detail) row.appendChild(el("span", "palette-badge", item.detail));
            } else {
                const labelEl = el("span", "palette-label");
                if (item.positions) highlight(labelEl, item.label, item.positions, 0);
                else labelEl.textContent = item.label;
                row.appendChild(labelEl);

                if (item.detail) row.appendChild(el("span", "palette-detail", item.detail));
                if (item.keys) row.appendChild(el("span", "palette-keys", item.keys));
            }

            if (!item.disabled) {
                row.addEventListener("mousemove", () => setActive(index, false));
                row.addEventListener("click", () => runItem(index));
            }

            list.appendChild(row);
        });

        palette.active = items.findIndex(item => !item.disabled);
        if (palette.active < 0) palette.active = 0;
        paintActive(true);
    }

    function paintActive(scroll) {
        const rows = palette.list.children;
        for (let i = 0; i < rows.length; i++) {
            const on = i === palette.active && !palette.items[i].disabled;
            rows[i].classList.toggle("active", on);
            rows[i].setAttribute("aria-selected", on ? "true" : "false");
        }
        if (scroll && rows[palette.active]) rows[palette.active].scrollIntoView({ block: "nearest" });
    }

    function setActive(index, scroll) {
        if (index === palette.active) return;
        palette.active = index;
        paintActive(scroll);
    }

    function step(direction) {
        const items = palette.items;
        if (!items.some(item => !item.disabled)) return;
        let next = palette.active;
        do {
            next = (next + direction + items.length) % items.length;
        } while (items[next].disabled);
        palette.active = next;
        paintActive(true);
    }

    function refreshItems() {
        const value = palette.input.value;
        const mode = modeOf(value);
        palette.mode = mode;
        palette.hint.textContent = hintFor(mode);
        palette.input.placeholder = mode === "command" ? "Nhập tên lệnh" :
            mode === "line" ? "Nhập số dòng" : "Tìm file theo tên (gõ > để xem lệnh)";

        if (mode === "command") palette.items = buildCommandItems(value.slice(1));
        else if (mode === "line") palette.items = buildLineItems(value.slice(1));
        else palette.items = buildFileItems(value);

        renderItems();
    }

    function onInput() {
        refreshItems();
    }

    function onInputKey(event) {
        switch (event.key) {
            case "ArrowDown": event.preventDefault(); step(1); break;
            case "ArrowUp": event.preventDefault(); step(-1); break;
            case "PageDown": event.preventDefault(); for (let i = 0; i < 6; i++) step(1); break;
            case "PageUp": event.preventDefault(); for (let i = 0; i < 6; i++) step(-1); break;
            case "Enter": event.preventDefault(); runItem(palette.active); break;
            case "Escape": event.preventDefault(); event.stopPropagation(); closePalette(true); break;
            default: break;
        }
    }

    function runItem(index) {
        const item = palette.items[index];
        if (!item || item.disabled || typeof item.run !== "function") return;

        if (item.stay) {
            item.run();
            return;
        }

        closePalette(false);
        setTimeout(() => {
            try {
                item.run();
            } catch (error) {
                console.warn("[WCS] Lệnh thất bại:", error);
            }
        }, 0);
    }

    function setMode(mode, text) {
        const prefix = mode === "command" ? ">" : mode === "line" ? ":" : "";
        palette.input.value = prefix + (text || "");
        refreshItems();
        palette.input.focus();
    }

    function openPalette(initial) {
        build();
        if (palette.open && palette.mode === modeOf(initial)) {
            closePalette(true);
            return;
        }

        if (!palette.open) {
            palette.open = true;
            palette.backdrop.hidden = false;
        }

        palette.input.value = initial;
        refreshItems();
        palette.input.focus();
        const end = palette.input.value.length;
        palette.input.setSelectionRange(end, end);
    }

    function closePalette(restoreFocus) {
        if (!palette.open) return;
        palette.open = false;
        palette.backdrop.hidden = true;
        if (restoreFocus && editorHasModel()) window.editor.focus();
    }

    document.addEventListener("keydown", event => {
        const mod = event.ctrlKey || event.metaKey;
        const key = event.key;

        const isCommand = (mod && event.shiftKey && !event.altKey && key.toLowerCase() === "p") || key === "F1";
        const isQuickOpen = mod && !event.shiftKey && !event.altKey && key.toLowerCase() === "p";
        const isGoToLine = mod && !event.shiftKey && !event.altKey && key.toLowerCase() === "g";

        if (!isCommand && !isQuickOpen && !isGoToLine) return;
        if (blockingDialogOpen()) return;

        event.preventDefault();
        event.stopPropagation();

        if (isCommand) openPalette(">");
        else if (isGoToLine) openPalette(":");
        else openPalette("");
    }, true);

    const openBtn = document.getElementById("paletteBtn");
    if (openBtn) openBtn.addEventListener("click", () => openPalette(">"));

    window.addEventListener("wcs:filechange", event => {
        const name = event.detail && event.detail.filename;
        if (name && Object.prototype.hasOwnProperty.call(window.files || {}, name)) touchRecent(name);
    });

    window.wcsPalette = {
        openFiles: () => openPalette(""),
        openCommands: () => openPalette(">"),
        openGoToLine: () => openPalette(":"),
        close: () => closePalette(true)
    };
})(typeof window !== "undefined" ? window : globalThis);
