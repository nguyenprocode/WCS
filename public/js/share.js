(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const dialog = $("shareDialog");
    const openBtn = $("shareProjectBtn");
    if (!dialog || !openBtn) return;

    const tabExport = $("shareTabExport");
    const tabImport = $("shareTabImport");
    const paneExport = $("sharePaneExport");
    const paneImport = $("sharePaneImport");
    const output = $("shareOutput");
    const info = $("shareInfo");
    const input = $("shareInput");
    const errorEl = $("shareError");
    const fileInput = $("shareFileInput");

    const MAX_UNPACKED = 24 * 1024 * 1024;
    const MAX_TEXT_FILE = 1 * 1024 * 1024;
    const MAX_IMAGE_FILE = 2 * 1024 * 1024;
    const TEXT_EXT = ["html", "css", "js", "json"];

    let previousFocus = null;

    function toast(message, isError) {
        if (typeof window.showMessage === "function") window.showMessage(message, !!isError);
    }

    function formatSize(chars) {
        if (chars < 1024) return chars + " B";
        if (chars < 1024 * 1024) return (chars / 1024).toFixed(1) + " KB";
        return (chars / 1024 / 1024).toFixed(2) + " MB";
    }

    function bytesToBase64Url(bytes) {
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function base64UrlToBytes(text) {
        let b64 = text.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    async function pipeBytes(bytes, stream, limit) {
        const writer = stream.writable.getWriter();
        writer.write(bytes).catch(() => { });
        writer.close().catch(() => { });

        const reader = stream.readable.getReader();
        const parts = [];
        let total = 0;
        for (; ;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            if (limit && total > limit) {
                reader.cancel().catch(() => { });
                throw new Error("The shared text is too large.");
            }
            parts.push(value);
        }
        const result = new Uint8Array(total);
        let offset = 0;
        parts.forEach(part => { result.set(part, offset); offset += part.length; });
        return result;
    }

    const canCompress = typeof CompressionStream === "function" && typeof DecompressionStream === "function";

    async function encodeProject(payload) {
        const raw = new TextEncoder().encode(JSON.stringify(payload));
        if (canCompress) {
            try {
                const packed = await pipeBytes(raw, new CompressionStream("deflate-raw"));
                return "WCS1:" + bytesToBase64Url(packed);
            } catch (error) {
                console.warn("[WCS] Nén thất bại, dùng dạng không nén:", error);
            }
        }
        return "WCS0:" + bytesToBase64Url(raw);
    }

    async function decodeProject(text) {
        const match = /WCS([01]):([A-Za-z0-9_\-\s]+)/.exec(text || "");
        if (!match) throw new Error("This text is not a Web Code Studio project.");

        let bytes;
        try {
            bytes = base64UrlToBytes(match[2].replace(/\s+/g, ""));
        } catch (error) {
            throw new Error("The project text is damaged or incomplete. Copy it again in full.");
        }

        if (match[1] === "1") {
            if (!canCompress) throw new Error("This browser cannot open compressed projects. Please use a newer browser.");
            try {
                bytes = await pipeBytes(bytes, new DecompressionStream("deflate-raw"), MAX_UNPACKED);
            } catch (error) {
                if (error && /too large/.test(error.message)) throw error;
                throw new Error("The project text is damaged or incomplete. Copy it again in full.");
            }
        } else if (bytes.length > MAX_UNPACKED) {
            throw new Error("The shared text is too large.");
        }

        let data;
        try {
            data = JSON.parse(new TextDecoder("utf-8").decode(bytes));
        } catch (error) {
            throw new Error("The project text is damaged or incomplete. Copy it again in full.");
        }
        return validatePayload(data);
    }

    function validatePayload(data) {
        if (!data || typeof data !== "object" || !data.f || typeof data.f !== "object" || Array.isArray(data.f)) {
            throw new Error("This text is not a Web Code Studio project.");
        }

        const files = {};
        const folders = new Set();
        const skipped = [];

        function safePath(raw) {
            if (typeof raw !== "string") return null;
            const parts = raw.replace(/\\/g, "/").split("/").filter(part => part !== "" && part !== ".");
            if (!parts.length || parts.some(part => part === ".." || /[\u0000-\u001f<>:"|?*]/.test(part))) return null;
            return parts.join("/");
        }

        Object.keys(data.f).forEach(rawName => {
            const content = data.f[rawName];
            const path = safePath(rawName);
            if (!path || typeof content !== "string") { skipped.push(String(rawName)); return; }

            const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
            const isImage = window.isImageFile && window.isImageFile(path);

            if (isImage) {
                if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(content) || content.length > MAX_IMAGE_FILE * 1.4) {
                    skipped.push(path); return;
                }
            } else if (!TEXT_EXT.includes(ext) || content.length > MAX_TEXT_FILE) {
                skipped.push(path); return;
            }

            files[path] = content;
            const slash = path.lastIndexOf("/");
            if (slash !== -1) folders.add(path.slice(0, slash));
        });

        if (Array.isArray(data.d)) {
            data.d.forEach(raw => {
                const path = safePath(raw);
                if (path && !Object.prototype.hasOwnProperty.call(files, path)) folders.add(path);
            });
        }

        return { files, folders: Array.from(folders), skipped };
    }

    function currentProject() {
        const files = Object.assign({}, window.files || {});
        const current = window.currentFile;
        if (current && window.editor && window.editor.getModel && window.editor.getModel() &&
            !(window.isImageFile && window.isImageFile(current)) && current in files) {
            files[current] = window.editor.getValue();
        }
        return { v: 1, f: files, d: window.getAllFolders ? window.getAllFolders() : [] };
    }

    async function buildExport() {
        const project = currentProject();
        const count = Object.keys(project.f).length;

        if (count === 0 && project.d.length === 0) {
            output.value = "";
            info.textContent = "The project is empty. Nothing to share.";
            return;
        }

        output.value = "Preparing…";
        try {
            const text = await encodeProject(project);
            output.value = text;
            info.textContent = count + (count === 1 ? " file" : " files") + " · " + formatSize(text.length) + " of text";
        } catch (error) {
            console.error("[WCS] Cannot create share text:", error);
            output.value = "";
            info.textContent = "Could not create the share text.";
        }
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            output.focus();
            output.select();
            try { return document.execCommand("copy"); } catch (e) { return false; }
        }
    }

    $("shareCopyBtn").addEventListener("click", async () => {
        if (!/^WCS[01]:/.test(output.value)) return;
        const ok = await copyText(output.value);
        toast(ok ? "Project text copied. Send it to anyone." : "Could not copy. Select the text and copy it manually.", !ok);
    });

    $("shareDownloadBtn").addEventListener("click", () => {
        if (!/^WCS[01]:/.test(output.value)) return;
        const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "project-share.txt";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    output.addEventListener("focus", () => { if (/^WCS[01]:/.test(output.value)) output.select(); });

    function showError(message) {
        errorEl.textContent = message || "";
        errorEl.hidden = !message;
    }

    async function doImport() {
        showError("");
        const text = input.value.trim();
        if (!text) { showError("Paste the project text first."); return; }

        let result;
        try {
            result = await decodeProject(text);
        } catch (error) {
            showError(error.message || "Could not read the project text.");
            return;
        }

        const count = Object.keys(result.files).length;
        if (count === 0 && result.folders.length === 0) {
            showError("There is nothing to import in this text.");
            return;
        }

        const hasProject = (window.getAllFiles ? window.getAllFiles().length : 0) > 0 ||
            (window.getAllFolders ? window.getAllFolders().length : 0) > 0;

        if (hasProject && typeof window.confirmDialog === "function") {
            const ok = await window.confirmDialog({
                title: "Import project",
                message: [document.createTextNode("This will import " + count + (count === 1 ? " file" : " files") +
                    " and replace your current project.")],
                confirmText: "Import"
            });
            if (!ok) return;
        }

        if (!window.replaceProject(result.files, result.folders)) {
            showError("Browser storage is full. The project was not imported.");
            return;
        }

        if (typeof window.wcsAfterProjectImport === "function") window.wcsAfterProjectImport();

        let message = "Imported " + count + (count === 1 ? " file" : " files");
        if (result.skipped.length) message += ". Skipped " + result.skipped.length + " unsupported or invalid";
        toast(message, false);
        input.value = "";
        close();
    }

    $("shareImportBtn").addEventListener("click", doImport);

    $("shareLoadBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        if (file.size > MAX_UNPACKED) { showError("The file is too large."); return; }
        input.value = await file.text();
        showError("");
    });

    function setTab(tab) {
        const isExport = tab === "export";
        tabExport.classList.toggle("active", isExport);
        tabImport.classList.toggle("active", !isExport);
        tabExport.setAttribute("aria-selected", String(isExport));
        tabImport.setAttribute("aria-selected", String(!isExport));
        paneExport.hidden = !isExport;
        paneImport.hidden = isExport;
        if (isExport) buildExport();
        else { showError(""); input.focus(); }
    }

    function open(tab) {
        previousFocus = document.activeElement;
        dialog.hidden = false;
        setTab(tab || "export");
    }

    function close() {
        dialog.hidden = true;
        output.value = "";
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    }

    tabExport.addEventListener("click", () => setTab("export"));
    tabImport.addEventListener("click", () => setTab("import"));
    openBtn.addEventListener("click", () => open("export"));
    $("shareCloseBtn").addEventListener("click", close);
    dialog.addEventListener("mousedown", event => { if (event.target === dialog) close(); });

    document.addEventListener("keydown", event => {
        if (dialog.hidden) return;
        const confirmOpen = $("confirmDialog") && !$("confirmDialog").hidden;
        if (event.key === "Escape" && !confirmOpen) {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }, true);

    window.wcsShare = { open, close, encodeProject, decodeProject };
})();
