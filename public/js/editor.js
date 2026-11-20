let editor;
let currentFile = null;

const files = {};
const models = {};
const openTabs = [];
const WCS_STORAGE_KEY = "wcs_browser_files_v1";
const WCS_FOLDERS_KEY = "wcs_browser_folders_v1";
const WCS_ASSETS_KEY = "wcs_browser_assets_v1";
let lastAssetsSignature = null;
const WCS_TABS_KEY = "wcs_open_tabs_v1";
let lastTabsJson = null;
let persistenceTimer = null;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"];

const IMAGE_MIME_TYPES = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    avif: "image/avif"
};

function getExtension(filename) {
    const name = String(filename || "");
    const dot = name.lastIndexOf(".");
    return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function isImageFile(filename) {
    return IMAGE_EXTENSIONS.includes(getExtension(filename));
}

const folders = new Set(readBrowserFolders());

function dirname(path) {
    const index = path.lastIndexOf("/");
    return index === -1 ? "" : path.slice(0, index);
}

function ensureFolder(path) {
    if (!path) return;
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
        folders.add(parts.slice(0, i).join("/"));
    }
}

function persistBrowserFiles() {
    try {
        const textFiles = {};
        const assetFiles = {};
        Object.keys(files).forEach(name => {
            (isImageFile(name) ? assetFiles : textFiles)[name] = files[name];
        });

        localStorage.setItem(WCS_STORAGE_KEY, JSON.stringify(textFiles));
        localStorage.setItem(WCS_FOLDERS_KEY, JSON.stringify(Array.from(folders)));

        const signature = Object.keys(assetFiles).sort()
            .map(name => name + ":" + assetFiles[name].length).join("|");
        if (signature !== lastAssetsSignature) {
            localStorage.setItem(WCS_ASSETS_KEY, JSON.stringify(assetFiles));
            lastAssetsSignature = signature;
        }
        window.dispatchEvent(new Event("wcs:storage-saved"));
        return true;
    } catch (error) {
        console.error("[WCS Storage] Không thể lưu dữ liệu trình duyệt:", error);
        window.dispatchEvent(new CustomEvent("wcs:storage-error", { detail: { error } }));
        return false;
    }
}

function readStoredFileMap(key, accept) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.fromEntries(Object.entries(parsed).filter(([name, content]) =>
            typeof name === "string" && typeof content === "string" && accept(name, content)
        ));
    } catch (error) {
        console.error("[WCS Storage] Không thể đọc dữ liệu trình duyệt:", error);
        return {};
    }
}

function readBrowserFiles() {
    const text = readStoredFileMap(WCS_STORAGE_KEY, () => true);
    const assets = readStoredFileMap(WCS_ASSETS_KEY,
        (name, content) => isImageFile(name) && content.startsWith("data:"));
    return Object.assign({}, text, assets);
}

function readBrowserFolders() {
    try {
        const raw = localStorage.getItem(WCS_FOLDERS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(name => typeof name === "string" && name);
    } catch (error) {
        console.error("[WCS Storage] Không thể đọc thư mục:", error);
        return [];
    }
}

const DEFAULT_FILES = {};

function getLanguage(filename) {
    const ext = filename.split(".").pop().toLowerCase();

    const languages = {
        html: "html",
        htm: "html",
        css: "css",
        js: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        json: "json",
        ts: "typescript",
        tsx: "typescript",
        jsx: "javascript",
        xml: "xml",
        md: "markdown",
        scss: "scss",
        less: "less",
        py: "python",
        php: "php",
        java: "java",
        cpp: "cpp",
        c: "c",
        sql: "sql",
        yaml: "yaml",
        yml: "yaml"
    };

    return languages[ext] || "plaintext";
}

function getLanguageLabel(filename) {
    if (isImageFile(filename)) return "IMG";

    const language = getLanguage(filename);

    const labels = {
        javascript: "JS",
        typescript: "TS",
        markdown: "MD",
        python: "PY",
        plaintext: "TXT"
    };

    return labels[language] || language.toUpperCase();
}

function getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();

    const icons = {

        html: `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path fill="#E44D26" d="M4 2h16l-1.5 17L12 22l-6.5-3L4 2z"/>
            <path fill="#F16529" d="M12 3.5v16.4l5.2-2.3L18.5 3.5H12z"/>
            <path fill="#fff" d="M7.5 6h9l-.3 2H9.8l.2 2h6.1l-.8 6-3.3 1.5-3.3-1.5-.2-2.8h2l.1 1.5 1.4.6 1.4-.6.3-2.8H8.5L7.5 6z"/>
        </svg>`,

        css: `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path fill="#1572B6" d="M4 2h16l-1.5 17L12 22l-6.5-3L4 2z"/>
            <path fill="#33A9DC" d="M12 3.5v16.4l5.2-2.3L18.5 3.5H12z"/>
            <path fill="#fff" d="M7.5 6h9l-.3 2H9.8l.2 2h6.1l-.8 6-3.3 1.5-3.3-1.5-.2-2.8h2l.1 1.5 1.4.6 1.4-.6.3-2.8H8.5L7.5 6z"/>
        </svg>`,

        js: `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="1" y="1" width="22" height="22" rx="2.5" fill="#F0B400"/>
            <path fill="#1E1E1E" transform="translate(1 1) scale(.9167)" d="M22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
        </svg>`,

        json: `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M8 3H6C5 3 5 4 5 5v3c0 2-1 3-2 4 1 1 2 2 2 4v3c0 1 0 2 1 2h2M16 3h2c1 0 1 1 1 2v3c0 2 1 3 2 4-1 1-2 2-2 4v3c0 1 0 2-1 2h-2" stroke="#EAB308" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="1.5" fill="#EAB308"/>
            <circle cx="12" cy="16" r="1.5" fill="#EAB308"/>
        </svg>`,

        ts: `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="2" y="2" width="20" height="20" rx="2" fill="#3178C6"/>
            <path fill="#fff" d="M5 9h9v2h-3.5v8H8.5v-8H5V9zm10 7.5c.5.8 1.2 1.2 2.2 1.2.8 0 1.3-.3 1.3-.8 0-.6-.5-.8-1.5-1.2l-.5-.2c-1.5-.6-2.4-1.3-2.4-2.8 0-1.4 1.1-2.4 2.8-2.4 1.2 0 2.1.4 2.8 1.5l-1.5 1c-.4-.6-.7-.9-1.3-.9-.5 0-.8.3-.8.7 0 .5.4.7 1.1 1l.5.2c1.7.7 2.6 1.4 2.6 3 0 1.7-1.3 2.6-3.1 2.6-1.7 0-2.8-.8-3.4-1.9l1.7-1z"/>
        </svg>`,

        jsx: `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="2" y="2" width="20" height="20" rx="3" fill="#61DAFB"/>
            <g fill="none" stroke="#20232a" stroke-width="1.1">
                <ellipse cx="12" cy="12" rx="9" ry="3.5"/>
                <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/>
                <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)"/>
            </g>
            <circle cx="12" cy="12" r="1.7" fill="#20232a"/>
        </svg>`,

        py: `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#3776AB" d="M12 2C7 2 7 4 7 6v3h6v1H5c-3 0-3 4-3 6s1 4 4 4h3v-4c0-2 2-4 4-4h5c2 0 4-2 4-4V6c0-3-3-4-10-4z"/>
            <path fill="#FFD43B" d="M12 22c5 0 5-2 5-4v-3h-6v-1h8c3 0 3-4 3-6s-1-4-4-4h-3v4c0 2-2 4-4 4H6c-2 0-4 2-4 4v2c0 3 3 4 10 4z"/>
            <circle cx="10" cy="5" r="1" fill="#fff"/>
            <circle cx="14" cy="19" r="1" fill="#fff"/>
        </svg>`,

        md: `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="2" y="4" width="20" height="16" rx="2" fill="#64748B"/>
            <path d="M5 16V8l3 4 3-4v8M15 13l2 3 2-3m-2 3V8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    };

    if (IMAGE_EXTENSIONS.includes(ext)) {
        return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="#A78BFA" stroke-width="1.6"/>
        <circle cx="8.5" cy="9.5" r="1.7" fill="#A78BFA"/>
        <path d="M4 18l5-5 3.5 3.5L15 14l5 5" stroke="#A78BFA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    }

    return icons[ext] || `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M5 2h9l5 5v15H5V2z" stroke="#94A3B8" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M14 2v5h5M8 12h8M8 16h8" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}

let imageViewer = null;

function getImageViewer() {
    if (imageViewer) return imageViewer;

    const container = document.querySelector(".editor-container");
    if (!container) return null;

    const root = document.createElement("div");
    root.id = "imageViewer";
    root.className = "image-viewer";
    root.hidden = true;

    const stage = document.createElement("div");
    stage.className = "image-viewer-stage";

    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    stage.appendChild(img);

    const info = document.createElement("div");
    info.className = "image-viewer-info";

    root.append(stage, info);
    container.appendChild(root);

    img.addEventListener("load", () => {
        const name = root.dataset.file || "";
        info.textContent = `${name.split("/").pop()}  ·  ${img.naturalWidth} × ${img.naturalHeight}  ·  ${formatBytes(dataUrlSize(files[name] || ""))}`;
    });

    img.addEventListener("error", () => {
        info.textContent = "Không thể hiển thị ảnh này.";
    });

    imageViewer = { root, img, info };
    return imageViewer;
}

function dataUrlSize(dataUrl) {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return 0;
    const b64 = dataUrl.slice(comma + 1);
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor(b64.length * 3 / 4) - padding);
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function syncImageViewer() {
    const showImage = currentFile && isImageFile(currentFile) &&
        Object.prototype.hasOwnProperty.call(files, currentFile);

    if (!showImage && !imageViewer) return;

    const viewer = getImageViewer();
    if (!viewer) return;

    if (showImage) {
        if (viewer.root.dataset.file !== currentFile || viewer.img.getAttribute("src") !== files[currentFile]) {
            viewer.root.dataset.file = currentFile;
            viewer.info.textContent = "";
            viewer.img.src = files[currentFile];
        }
        viewer.root.hidden = false;
    } else {
        viewer.root.hidden = true;
        viewer.img.removeAttribute("src");
        delete viewer.root.dataset.file;
    }
}

function persistOpenTabs() {
    try {
        const json = JSON.stringify({ tabs: openTabs.slice(), active: currentFile });
        if (json === lastTabsJson) return;
        localStorage.setItem(WCS_TABS_KEY, json);
        lastTabsJson = json;
    } catch (error) {
        console.error("[WCS Storage] Không thể lưu danh sách tab:", error);
    }
}

function readOpenTabs() {
    try {
        const raw = localStorage.getItem(WCS_TABS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.tabs)) return null;
        return {
            tabs: parsed.tabs.filter(name => typeof name === "string"),
            active: typeof parsed.active === "string" ? parsed.active : null
        };
    } catch (error) {
        return null;
    }
}

function notifyFileChange(filename) {
    syncImageViewer();
    persistOpenTabs();

    window.dispatchEvent(
        new CustomEvent("wcs:filechange", {
            detail: { filename }
        })
    );
}

function reportEditorLoadFailure(reason) {
    if (window.__wcsEditorFailed) return;
    window.__wcsEditorFailed = true;

    console.error("[WCS] Không tải được Monaco Editor:", reason);

    const status = document.getElementById("serverStatus");
    if (status) {
        status.innerHTML = '<span class="status-dot offline"></span> Offline';
    }

    window.dispatchEvent(new CustomEvent("editorLoadFailed", { detail: { reason } }));
}

function startMonaco() {
    if (typeof window.require !== "function" || typeof window.require.config !== "function") {
        reportEditorLoadFailure("loader.min.js không được nạp");
        return;
    }

    window.require.config({
        waitSeconds: 20,
        paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
        }
    });

    window.require(
        ["vs/editor/editor.main"],
        onMonacoLoaded,
        reportEditorLoadFailure
    );
}

function onMonacoLoaded() {

        monaco.editor.defineTheme("wcs-premium", {
            base: "vs-dark",
            inherit: true,

            rules: [
                { token: "tag", foreground: "7dd3fc" },
                { token: "attribute.name", foreground: "a5b4fc" },
                { token: "attribute.value", foreground: "fbbf24" },
                { token: "string", foreground: "86efac" },
                { token: "keyword", foreground: "c084fc" },
                { token: "comment", foreground: "64748b" },
                { token: "number", foreground: "f472b6" }
            ],

            colors: {
                "editor.background": "#050505",
                "editor.foreground": "#e5e5e5",
                "editorLineNumber.foreground": "#626262",
                "editorLineNumber.activeForeground": "#d4d4d4",
                "editorCursor.foreground": "#ffffff",
                "editor.selectionBackground": "#383838",
                "editor.inactiveSelectionBackground": "#262626",
                "editor.lineHighlightBackground": "#111111",
                "editorWidget.background": "#111111",
                "editorWidget.border": "#303030",
                "editorSuggestWidget.background": "#111111",
                "editorSuggestWidget.border": "#303030",
                "editorSuggestWidget.selectedBackground": "#292929",
                "editorHoverWidget.background": "#111111",
                "editorHoverWidget.border": "#303030",
                "editorIndentGuide.background": "#252525",
                "editorIndentGuide.activeBackground": "#454545",
                "editorBracketMatch.background": "#252525",
                "editorBracketMatch.border": "#666666"
            }
        });

        editor = monaco.editor.create(
            document.getElementById("editor"),
            {
                theme: "wcs-premium",

                model: null,

                automaticLayout: true,

                fontSize: 14,
                fontFamily: "Consolas, Menlo, Monaco, 'Droid Sans Mono', 'Courier New', monospace",
                fontLigatures: false,

                minimap: {
                    enabled: window.innerWidth > 900
                },

                lineNumbers: "on",
                roundedSelection: true,
                scrollBeyondLastLine: false,
                wordWrap: "on",

                tabSize: 4,
                insertSpaces: true,

                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoClosingTags: true,

                suggestOnTriggerCharacters: true,

                colorDecorators: true,
                colorDecoratorsLimit: 500,

                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: true
                },

                acceptSuggestionOnEnter: "on",
                formatOnPaste: true,
                formatOnType: true,

                bracketPairColorization: {
                    enabled: true
                },

                padding: {
                    top: 14,
                    bottom: 14
                },

                scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false
                },

                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on"
            }
        );

        editor.onDidChangeModelContent(() => {

            if (!currentFile || isImageFile(currentFile)) return;

            files[currentFile] = editor.getValue();

            notifyFileChange(currentFile);
        });

        editor.onDidChangeCursorPosition(event => {

            const status = document.getElementById("cursorStatus");

            if (status) {
                status.textContent =
                    `Ln ${event.position.lineNumber}, Col ${event.position.column}`;
            }
        });

        window.createModel = function (filename, content = "") {

            if (models[filename]) {
                models[filename].dispose();
                delete models[filename];
            }

            if (isImageFile(filename)) {
                files[filename] = content;
                return null;
            }

            const model = monaco.editor.createModel(
                content,
                getLanguage(filename)
            );

            models[filename] = model;
            files[filename] = content;

            model.onDidChangeContent(() => {
                files[filename] = model.getValue();
                clearTimeout(persistenceTimer);
                persistenceTimer = setTimeout(() => {
                    if (!persistBrowserFiles()) {
                        console.warn("Không thể tự lưu. Dung lượng lưu trữ trình duyệt có thể đã đầy.");
                    }
                }, 250);
            });

            return model;
        };

        window.switchFile = function (filename) {

            if (!Object.prototype.hasOwnProperty.call(files, filename)) {
                return;
            }

            if (currentFile && !isImageFile(currentFile) && editor.getModel()) {
                files[currentFile] = editor.getValue();
            }

            if (isImageFile(filename)) {
                currentFile = filename;
                editor.setModel(null);

                const cursorStatus = document.getElementById("cursorStatus");
                if (cursorStatus) cursorStatus.textContent = "";
            } else {
                if (!models[filename]) {
                    window.createModel(filename, files[filename]);
                }

                currentFile = filename;

                editor.setModel(models[filename]);
            }

            const languageStatus =
                document.getElementById("languageStatus");

            if (languageStatus) {
                languageStatus.textContent =
                    getLanguageLabel(filename);
            }

            if (!openTabs.includes(filename)) {
                openTabs.push(filename);
            }

            if (typeof window.renderTabs === "function") {
                window.renderTabs();
            }

            if (typeof window.renderFileList === "function") {
                window.renderFileList();
            }

            notifyFileChange(filename);
        };

        window.closeTab = function (filename) {

            const index = openTabs.indexOf(filename);

            if (index === -1) return;

            openTabs.splice(index, 1);

            if (currentFile === filename) {

                if (openTabs.length > 0) {

                    const nextIndex = Math.max(
                        0,
                        Math.min(index - 1, openTabs.length - 1)
                    );

                    window.switchFile(openTabs[nextIndex]);

                } else {

                    currentFile = null;
                    editor.setModel(null);

                    const languageStatus =
                        document.getElementById("languageStatus");

                    if (languageStatus) {
                        languageStatus.textContent = "";
                    }

                    notifyFileChange(null);
                }
            }

            if (typeof window.renderTabs === "function") {
                window.renderTabs();
            }

            if (typeof window.renderFileList === "function") {
                window.renderFileList();
            }
        };

        window.loadFile = function (filename, content = "") {
            files[filename] = content;
            ensureFolder(dirname(filename));
        };

        window.restoreTabs = function (tabs, active) {
            const valid = tabs.filter(name =>
                Object.prototype.hasOwnProperty.call(files, name) && !openTabs.includes(name)
            );
            openTabs.push(...valid);

            const target = active && openTabs.includes(active)
                ? active
                : openTabs[openTabs.length - 1];

            if (target) {
                window.switchFile(target);
            } else {
                if (typeof window.renderTabs === "function") window.renderTabs();
                notifyFileChange(null);
            }

            return openTabs.length > 0;
        };

        window.readOpenTabs = readOpenTabs;

        window.addFile = function (filename, content = "") {

            if (models[filename]) {
                models[filename].dispose();
            }

            files[filename] = content;
            ensureFolder(dirname(filename));

            window.createModel(filename, content);

            if (!openTabs.includes(filename)) {
                openTabs.push(filename);
            }

            window.switchFile(filename);
            persistBrowserFiles();
            notifyFileChange(filename);
        };

        window.removeFile = function (filename) {

            if (!Object.prototype.hasOwnProperty.call(files, filename)) {
                return;
            }

            const wasCurrent = currentFile === filename;

            if (wasCurrent && !isImageFile(filename) && editor.getModel()) {
                files[filename] = editor.getValue();
            }

            delete files[filename];

            if (models[filename]) {
                models[filename].dispose();
                delete models[filename];
            }

            const index = openTabs.indexOf(filename);

            if (index !== -1) {
                openTabs.splice(index, 1);
            }

            if (wasCurrent) {

                currentFile = null;

                if (openTabs.length > 0) {
                    const nextIndex = Math.min(
                        Math.max(index, 0),
                        openTabs.length - 1
                    );

                    window.switchFile(openTabs[nextIndex]);

                } else {
                    editor.setModel(null);

                    const languageStatus =
                        document.getElementById("languageStatus");

                    if (languageStatus) {
                        languageStatus.textContent = "";
                    }
                }
            }

            if (typeof window.renderTabs === "function") {
                window.renderTabs();
            }

            if (typeof window.renderFileList === "function") {
                window.renderFileList();
            }

            persistBrowserFiles();
            notifyFileChange(filename);
        };

        window.renameFile = function (oldFilename, newFilename) {
            if (!Object.prototype.hasOwnProperty.call(files, oldFilename)) return;
            if (currentFile === oldFilename && !isImageFile(oldFilename) && editor.getModel()) {
                files[oldFilename] = editor.getValue();
            }
            const content = files[oldFilename];
            const wasOpen = openTabs.includes(oldFilename);
            const wasCurrent = currentFile === oldFilename;
            if (models[oldFilename]) {
                models[oldFilename].dispose();
                delete models[oldFilename];
            }
            delete files[oldFilename];
            files[newFilename] = content;
            ensureFolder(dirname(newFilename));
            if (wasOpen) {
                const tabIndex = openTabs.indexOf(oldFilename);
                if (tabIndex !== -1) openTabs[tabIndex] = newFilename;
            }
            window.createModel(newFilename, content);
            if (wasCurrent) {
                currentFile = newFilename;
                editor.setModel(models[newFilename] || null);
                const languageStatus = document.getElementById("languageStatus");
                if (languageStatus) languageStatus.textContent = getLanguageLabel(newFilename);
            }
            if (typeof window.renderTabs === "function") window.renderTabs();
            if (typeof window.renderFileList === "function") window.renderFileList();
            persistBrowserFiles();
            notifyFileChange(newFilename);
        };

        function refreshExplorer() {
            if (typeof window.renderTabs === "function") window.renderTabs();
            if (typeof window.renderFileList === "function") window.renderFileList();
        }

        window.getAllFolders = () => Array.from(folders);

        window.folderExists = function (path) {
            if (folders.has(path)) return true;
            const prefix = path + "/";
            return Object.keys(files).some(name => name.startsWith(prefix));
        };

        window.addFolder = function (path) {
            ensureFolder(path);
            persistBrowserFiles();
            refreshExplorer();
        };

        window.removeFolder = function (path) {
            const prefix = path + "/";
            Object.keys(files)
                .filter(name => name.startsWith(prefix))
                .forEach(name => window.removeFile(name));
            Array.from(folders)
                .filter(name => name === path || name.startsWith(prefix))
                .forEach(name => folders.delete(name));
            persistBrowserFiles();
            refreshExplorer();
        };

        window.moveFolder = function (oldPath, newPath) {
            const oldPrefix = oldPath + "/";
            Object.keys(files)
                .filter(name => name.startsWith(oldPrefix))
                .forEach(name => window.renameFile(name, newPath + "/" + name.slice(oldPrefix.length)));
            const moved = Array.from(folders)
                .filter(name => name === oldPath || name.startsWith(oldPrefix));
            moved.forEach(name => folders.delete(name));
            moved.forEach(name => folders.add(newPath + name.slice(oldPath.length)));
            ensureFolder(newPath);
            persistBrowserFiles();
            refreshExplorer();
        };

        window.replaceProject = function (newFiles, newFolders) {

            if (currentFile && !isImageFile(currentFile) && editor.getModel()) {
                files[currentFile] = editor.getValue();
            }

            const backupFiles = Object.assign({}, files);
            const backupFolders = Array.from(folders);

            function reset() {
                editor.setModel(null);
                Object.keys(models).forEach(name => {
                    models[name].dispose();
                    delete models[name];
                });
                Object.keys(files).forEach(name => delete files[name]);
                folders.clear();
                openTabs.length = 0;
                currentFile = null;
            }

            reset();

            Object.keys(newFiles).forEach(name => {
                files[name] = newFiles[name];
                ensureFolder(dirname(name));
            });
            (newFolders || []).forEach(ensureFolder);

            let saved = persistBrowserFiles();

            if (!saved) {
                reset();
                Object.keys(backupFiles).forEach(name => { files[name] = backupFiles[name]; });
                backupFolders.forEach(name => folders.add(name));
                persistBrowserFiles();
            }

            const names = Object.keys(files);
            const target = names.includes("index.html")
                ? "index.html"
                : (names.filter(name => getExtension(name) === "html").sort()[0] || names.sort()[0]);

            if (target) {
                window.switchFile(target);
            } else {
                languageStatusReset();
                refreshExplorer();
                notifyFileChange(null);
            }

            return saved;
        };

        function languageStatusReset() {
            const languageStatus = document.getElementById("languageStatus");
            if (languageStatus) languageStatus.textContent = "";
            const cursorStatus = document.getElementById("cursorStatus");
            if (cursorStatus) cursorStatus.textContent = "";
        }

        window.editor = editor;
        window.files = files;

        window.getOpenTabs = () => openTabs;
        window.getAllFiles = () => Object.keys(files);
        window.getFileModel = filename => models[filename] || null;
        window.persistBrowserFiles = persistBrowserFiles;
        window.readBrowserFiles = readBrowserFiles;

        window.getFileIcon = getFileIcon;
        window.isImageFile = isImageFile;
        window.IMAGE_EXTENSIONS = IMAGE_EXTENSIONS;
        window.IMAGE_MIME_TYPES = IMAGE_MIME_TYPES;

        window.DEFAULT_FILES = DEFAULT_FILES;

        Object.defineProperty(window, "currentFile", {
            get: () => currentFile,
            configurable: true
        });

        window.dispatchEvent(
            new Event("editorReady")
        );

        console.log(
            "Web Code Studio: Monaco Editor initialized."
        );

}

startMonaco();
