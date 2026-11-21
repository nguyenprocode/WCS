(function () {
    "use strict";

    const MAX_MATCHES = 2000;
    const PREVIEW_BEFORE = 30;
    const PREVIEW_LENGTH = 160;

    const panel = document.getElementById("findPanel");
    const input = document.getElementById("findInput");
    const summary = document.getElementById("findSummary");
    const resultsEl = document.getElementById("findResults");
    const openBtn = document.getElementById("findProjectBtn");
    const sidebar = document.getElementById("sidebar");
    const optCase = document.getElementById("findCase");
    const optWord = document.getElementById("findWord");
    const optRegex = document.getElementById("findRegex");
    const replaceToggle = document.getElementById("findReplaceToggle");
    const replaceRow = document.getElementById("findReplaceRow");
    const replaceInput = document.getElementById("replaceInput");
    const replaceAllBtn = document.getElementById("replaceAllBtn");
    const core = window.WCSReplace;

    if (!panel || !input || !summary || !resultsEl || !core) return;

    const folderHeader = sidebar ? sidebar.querySelector(".folder") : null;
    const fileList = document.getElementById("fileList");

    let flat = [];
    let activeIndex = -1;
    let collapsed = new Set();
    let lastQuery = "";
    let searchTimer = null;

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function isOptionOn(button) {
        return button.getAttribute("aria-pressed") === "true";
    }

    function toggleOption(button) {
        button.setAttribute("aria-pressed", isOptionOn(button) ? "false" : "true");
        runSearch();
    }

    function baseName(path) {
        return path.split("/").pop();
    }

    function dirName(path) {
        const index = path.lastIndexOf("/");
        return index === -1 ? "" : path.slice(0, index);
    }

    function isOpen() {
        return !panel.hidden;
    }

    function setLayout(open) {
        panel.hidden = !open;
        if (folderHeader) folderHeader.hidden = open;
        if (fileList) fileList.hidden = open;
        if (openBtn) openBtn.setAttribute("aria-pressed", open ? "true" : "false");
    }

    function revealSidebarOnMobile() {
        const menuBtn = document.getElementById("menuBtn");
        const isMobile = window.matchMedia("(max-width: 600px)").matches;
        if (isMobile && sidebar && !sidebar.classList.contains("open") && menuBtn) {
            menuBtn.click();
        }
    }

    function openPanel() {
        revealSidebarOnMobile();
        setLayout(true);

        const ed = window.editor;
        if (ed && ed.getModel && ed.getModel()) {
            const selection = ed.getSelection();
            if (selection && !selection.isEmpty() && selection.startLineNumber === selection.endLineNumber) {
                const text = ed.getModel().getValueInRange(selection);
                if (text.trim()) input.value = text;
            }
        }

        input.focus();
        input.select();
        runSearch();
    }

    function closePanel(focusEditor) {
        setLayout(false);
        if (focusEditor && window.editor && window.editor.getModel && window.editor.getModel()) {
            window.editor.focus();
        }
    }

    function openReplacePanel() {
        openPanel();
        if (!isReplaceOpen()) setReplaceOpen(true);
        if (input.value) {
            replaceInput.focus();
            replaceInput.select();
        }
    }

    function togglePanel() {
        if (isOpen()) closePanel(false);
        else openPanel();
    }

    const ICON_REPLACE = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h9"/><path d="m8.5 2.5 2.5 2.5-2.5 2.5"/><path d="M14 11H5"/><path d="m7.5 8.5L5 11l2.5 2.5"/></svg>';

    function isReplaceOpen() {
        return !!replaceRow && !replaceRow.hidden;
    }

    function setReplaceOpen(open) {
        if (!replaceRow) return;
        replaceRow.hidden = !open;
        if (replaceToggle) {
            replaceToggle.setAttribute("aria-pressed", open ? "true" : "false");
            replaceToggle.textContent = open ? "▾" : "▸";
        }
        runSearch();
    }

    function toast(message, isError) {
        const node = document.getElementById("toast");
        if (!node) return;
        node.textContent = message;
        node.className = "toast show" + (isError ? " error" : "");
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
    }

    function makeReplaceButton(title, handler) {
        const button = el("button", "find-replace-btn");
        button.type = "button";
        button.title = title;
        button.setAttribute("aria-label", title);
        button.innerHTML = ICON_REPLACE;
        button.addEventListener("click", event => {
            event.stopPropagation();
            handler();
        });
        return button;
    }

    function textFilesInProject() {
        const files = window.files || {};
        return Object.keys(files)
            .filter(name => !(window.isImageFile && window.isImageFile(name)))
            .filter(name => typeof files[name] === "string" && files[name])
            .sort((a, b) => a.localeCompare(b));
    }

    function applyToFile(name, matches) {
        if (!matches.length) return;

        const model = typeof window.getFileModel === "function" ? window.getFileModel(name) : null;

        if (model && !model.isDisposed()) {
            const edits = matches.map(m => ({
                range: new monaco.Range(m.line, m.column, m.line, m.column + m.length),
                text: m.text
            }));
            model.pushStackElement();
            model.pushEditOperations([], edits, () => null);
            model.pushStackElement();
            window.files[name] = model.getValue();
        } else {
            window.files[name] = core.applyMatchesToText(window.files[name], matches);
        }
    }

    function finishReplace() {
        if (typeof window.persistBrowserFiles === "function") window.persistBrowserFiles();
        window.dispatchEvent(new CustomEvent("wcs:filechange", { detail: { filename: null } }));
        runSearch();
    }

    function currentRegex() {
        try {
            return buildRegex(input.value);
        } catch (error) {
            return null;
        }
    }

    function plan(onlyFile) {
        const regex = currentRegex();
        if (!input.value || !regex) return null;

        const names = onlyFile ? [onlyFile] : textFilesInProject();
        const entries = [];
        let total = 0;

        names.forEach(name => {
            const content = (window.files || {})[name];
            if (typeof content !== "string") return;
            const matches = core.collectMatches(content, regex, replaceInput.value, isOptionOn(optRegex));
            if (matches.length) {
                entries.push({ file: name, matches });
                total += matches.length;
            }
        });

        return { entries, total };
    }

    async function confirmReplace(total, fileCount) {
        const text = "Thay " + total + " kết quả trong " + fileCount + " file bằng \"" +
            replaceInput.value + "\"? Thao tác có thể hoàn tác bằng Ctrl+Z ở các file đang mở.";

        if (typeof window.confirmDialog === "function") {
            return window.confirmDialog({
                title: "Replace All",
                message: [document.createTextNode(text)],
                confirmText: "Replace"
            });
        }
        return window.confirm(text);
    }

    async function replaceAll(onlyFile) {
        const result = plan(onlyFile);
        if (!result) {
            toast("Nhập từ khóa hợp lệ để thay thế", true);
            return;
        }
        if (!result.total) {
            toast("Không có kết quả nào để thay thế", true);
            return;
        }

        if (!(await confirmReplace(result.total, result.entries.length))) return;

        result.entries.forEach(entry => applyToFile(entry.file, entry.matches));
        finishReplace();
        toast("Đã thay " + result.total + " kết quả trong " + result.entries.length + " file");
    }

    function replaceInFile(file) {
        return replaceAll(file);
    }

    function replaceOne(item) {
        const result = plan(item.file);
        const hit = result && result.entries[0] && result.entries[0].matches.find(m =>
            m.line === item.match.line && m.column === item.match.column
        );

        if (!hit) {
            toast("Kết quả đã thay đổi, đang làm mới", true);
            runSearch();
            return false;
        }

        applyToFile(item.file, [hit]);
        finishReplace();
        return true;
    }

    function replaceActive() {
        if (!flat.length) return;
        const index = activeIndex >= 0 ? activeIndex : 0;
        const item = flat[index];
        activeIndex = index;
        if (!replaceOne(item)) return;
        if (flat.length) {
            activeIndex = Math.min(index, flat.length - 1);
            openResult(flat[activeIndex]);
            flat[activeIndex].row.scrollIntoView({ block: "nearest" });
            replaceInput.focus();
        }
    }

    function buildRegex(query) {
        return core.buildSearchRegex(query, {
            regex: isOptionOn(optRegex),
            caseSensitive: isOptionOn(optCase),
            wholeWord: isOptionOn(optWord)
        });
    }

    function searchFiles(regex) {
        const files = window.files || {};
        const names = Object.keys(files)
            .filter(name => !(window.isImageFile && window.isImageFile(name)))
            .sort((a, b) => a.localeCompare(b));

        const groups = [];
        let total = 0;
        let truncated = false;

        for (const name of names) {
            const content = typeof files[name] === "string" ? files[name] : "";
            if (!content) continue;

            const lines = content.split(/\r?\n/);
            const matches = [];

            for (let i = 0; i < lines.length && !truncated; i++) {
                const line = lines[i];
                regex.lastIndex = 0;
                let m;
                while ((m = regex.exec(line)) !== null) {
                    if (m[0].length === 0) {
                        regex.lastIndex++;
                        continue;
                    }
                    matches.push({ line: i + 1, column: m.index + 1, length: m[0].length, text: line });
                    total++;
                    if (total >= MAX_MATCHES) {
                        truncated = true;
                        break;
                    }
                }
            }

            if (matches.length) groups.push({ file: name, matches });
            if (truncated) break;
        }

        return { groups, total, truncated };
    }

    function runSearch() {
        const query = input.value;

        if (query !== lastQuery) collapsed = new Set();
        lastQuery = query;

        if (!query) {
            flat = [];
            activeIndex = -1;
            resultsEl.textContent = "";
            summary.textContent = "";
            return;
        }

        let regex;
        try {
            regex = buildRegex(query);
        } catch (error) {
            flat = [];
            activeIndex = -1;
            resultsEl.textContent = "";
            summary.textContent = "Biểu thức regex không hợp lệ.";
            return;
        }

        const { groups, total, truncated } = searchFiles(regex);
        render(groups, total, truncated);
    }

    function scheduleSearch() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => runSearch(), 180);
    }

    function buildPreview(match) {
        const row = el("span", "find-match-text");
        const start = Math.max(0, match.column - 1 - PREVIEW_BEFORE);
        let slice = match.text.slice(start, start + PREVIEW_LENGTH);
        const offset = match.column - 1 - start;

        const lead = start > 0 ? "…" : "";
        const before = slice.slice(0, offset).replace(/^\s+/, start === 0 ? "" : "$&");
        const hit = slice.slice(offset, offset + match.length);
        const after = slice.slice(offset + match.length);
        const tail = start + PREVIEW_LENGTH < match.text.length ? "…" : "";

        row.append(
            document.createTextNode(lead + before),
            el("mark", "find-hit", hit),
            document.createTextNode(after + tail)
        );
        return row;
    }

    function render(groups, total, truncated) {
        const previousScroll = resultsEl.scrollTop;
        resultsEl.textContent = "";
        flat = [];

        if (!total) {
            activeIndex = -1;
            summary.textContent = "Không tìm thấy kết quả.";
            return;
        }

        summary.textContent = total + (truncated ? "+" : "") + " kết quả trong " + groups.length + " file" +
            (truncated ? " (chỉ hiện " + MAX_MATCHES + " kết quả đầu)" : "");

        groups.forEach(group => {
            const isCollapsed = collapsed.has(group.file);
            const wrapper = el("div", "find-group");

            const header = el("button", "find-file");
            header.type = "button";
            header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
            header.title = group.file;

            const caret = el("span", "find-caret", isCollapsed ? "▸" : "▾");
            caret.setAttribute("aria-hidden", "true");
            const name = el("span", "find-file-name", baseName(group.file));
            const dir = dirName(group.file);
            header.append(caret, name);
            if (dir) header.append(el("span", "find-file-dir", dir));
            header.append(el("span", "find-count", String(group.matches.length)));

            header.addEventListener("click", () => {
                if (collapsed.has(group.file)) collapsed.delete(group.file);
                else collapsed.add(group.file);
                runSearch();
            });

            const headerRow = el("div", "find-row");
            headerRow.appendChild(header);
            if (isReplaceOpen()) {
                headerRow.appendChild(makeReplaceButton("Replace All trong file này", () => replaceInFile(group.file)));
            }
            wrapper.appendChild(headerRow);

            if (!isCollapsed) {
                group.matches.forEach(match => {
                    const row = el("button", "find-match");
                    row.type = "button";
                    row.title = group.file + ":" + match.line;
                    row.append(el("span", "find-line", String(match.line)), buildPreview(match));

                    const item = { file: group.file, match, row };
                    flat.push(item);
                    row.addEventListener("click", () => {
                        activeIndex = flat.indexOf(item);
                        openResult(item);
                    });

                    const matchRow = el("div", "find-row");
                    matchRow.appendChild(row);
                    if (isReplaceOpen()) {
                        matchRow.appendChild(makeReplaceButton("Replace", () => {
                            activeIndex = flat.indexOf(item);
                            replaceOne(item);
                        }));
                    }
                    wrapper.appendChild(matchRow);
                });
            }

            resultsEl.appendChild(wrapper);
        });

        if (activeIndex >= flat.length) activeIndex = -1;
        if (activeIndex >= 0) flat[activeIndex].row.classList.add("active");
        resultsEl.scrollTop = previousScroll;
    }

    function openResult(item) {
        flat.forEach(other => other.row.classList.remove("active"));
        item.row.classList.add("active");

        if (typeof window.switchFile !== "function") return;
        if (!window.files || !Object.prototype.hasOwnProperty.call(window.files, item.file)) return;

        window.switchFile(item.file);

        const ed = window.editor;
        if (ed && ed.getModel && ed.getModel()) {
            const range = {
                startLineNumber: item.match.line,
                startColumn: item.match.column,
                endLineNumber: item.match.line,
                endColumn: item.match.column + item.match.length
            };
            ed.setSelection(range);
            ed.revealRangeInCenter(range);
            ed.focus();
        }

        const overlay = document.getElementById("sidebarOverlay");
        if (overlay && overlay.classList.contains("show")) overlay.click();
    }

    function stepResult(direction) {
        if (!flat.length) return;
        activeIndex = activeIndex === -1
            ? (direction > 0 ? 0 : flat.length - 1)
            : (activeIndex + direction + flat.length) % flat.length;
        const item = flat[activeIndex];
        openResult(item);
        item.row.scrollIntoView({ block: "nearest" });
        input.focus();
    }

    input.addEventListener("input", scheduleSearch);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && event.altKey && isReplaceOpen()) {
            event.preventDefault();
            replaceAll(null);
        } else if (event.key === "Enter") {
            event.preventDefault();
            clearTimeout(searchTimer);
            if (input.value !== lastQuery) runSearch();
            stepResult(event.shiftKey ? -1 : 1);
        } else if (event.key === "Escape") {
            event.preventDefault();
            closePanel(true);
        }
    });

    [optCase, optWord, optRegex].forEach(button => {
        if (button) button.addEventListener("click", () => toggleOption(button));
    });

    if (openBtn) openBtn.addEventListener("click", togglePanel);

    if (replaceToggle) replaceToggle.addEventListener("click", () => setReplaceOpen(!isReplaceOpen()));
    if (replaceAllBtn) replaceAllBtn.addEventListener("click", () => replaceAll(null));

    if (replaceInput) {
        replaceInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                if ((event.ctrlKey || event.metaKey) && event.altKey) replaceAll(null);
                else replaceActive();
            } else if (event.key === "Escape") {
                event.preventDefault();
                closePanel(true);
            }
        });
    }

    window.wcsFind = { open: openPanel, openReplace: openReplacePanel };

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
            event.preventDefault();
            openPanel();
        }
    }, true);

    document.addEventListener("keydown", event => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        if (event.key.toLowerCase() !== "h") return;

        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
            openReplacePanel();
            return;
        }

        const ed = window.editor;
        if (ed && ed.getModel && ed.getModel()) {
            ed.focus();
            ed.trigger("wcs-replace-in-file", "editor.action.startFindReplace", null);
        }
    }, true);

    let refreshTimer = null;
    window.addEventListener("wcs:filechange", () => {
        if (!isOpen() || !input.value) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => runSearch(), 350);
    });

    setLayout(false);
})();

(function () {
    "use strict";

    const btn = document.getElementById("findInFileBtn");
    if (!btn) return;

    function hasTextModel() {
        const ed = window.editor;
        return !!(ed && typeof ed.getModel === "function" && ed.getModel());
    }

    function sync() {
        btn.disabled = !hasTextModel();
    }

    btn.addEventListener("click", () => {
        if (!hasTextModel()) return;
        const ed = window.editor;
        ed.focus();
        ed.trigger("wcs-find-in-file", "actions.find", null);
    });

    window.addEventListener("wcs:filechange", sync);
    window.addEventListener("projectsLoaded", sync);
    sync();
})();
