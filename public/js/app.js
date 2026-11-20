document.addEventListener("DOMContentLoaded", function () {

    const refreshBtn = document.getElementById("refreshBtn");
    const togglePreviewBtn = document.getElementById("togglePreviewBtn");
    const newFileBtn = document.getElementById("newFileBtn");
    const menuBtn = document.getElementById("menuBtn");

    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const fileList = document.getElementById("fileList");
    const tabsContainer = document.getElementById("tabs");

    const previewSection = document.getElementById("previewSection");
    const serverStatus = document.getElementById("serverStatus");
    const toastEl = document.getElementById("toast");

    let previewHidden = false;
    let isSaving = false;

    function createFileIcon(filename) {

        const icon = document.createElement("span");

        icon.className = "file-icon";

        icon.style.display = "inline-flex";
        icon.style.alignItems = "center";
        icon.style.justifyContent = "center";
        icon.style.width = "20px";
        icon.style.height = "20px";
        icon.style.flexShrink = "0";

        if (typeof window.getFileIcon === "function") {

            icon.innerHTML = window.getFileIcon(filename);

        } else {

            icon.textContent = "📄";
        }

        return icon;
    }

    function showMessage(message, isError = false) {

        if (!toastEl) return;

        toastEl.textContent = message;

        toastEl.className =
            "toast show" + (isError ? " error" : "");

        clearTimeout(window.toastTimer);

        window.toastTimer = setTimeout(() => {
            toastEl.classList.remove("show");
        }, 2800);
    }

    let storageErrorShown = false;

    window.addEventListener("wcs:storage-error", () => {
        if (storageErrorShown) return;
        storageErrorShown = true;
        showMessage("Không thể tự lưu. Bộ nhớ trình duyệt có thể đã đầy.", true);
    });

    window.addEventListener("wcs:storage-saved", () => {
        storageErrorShown = false;
    });

    function openSidebar() {

        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        document.body.classList.add("sidebar-open");
    }

    function closeSidebar() {

        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        document.body.classList.remove("sidebar-open");
    }

    if (menuBtn) {

        menuBtn.addEventListener("click", () => {

            if (sidebar.classList.contains("open")) {
                closeSidebar();
            } else {
                openSidebar();
            }

        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    const NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

    function isValidFileName(name, extensions) {
        const pattern = new RegExp(
            "^[a-zA-Z0-9_][a-zA-Z0-9_.-]*\\.(" + extensions.join("|") + ")$",
            "i"
        );
        return pattern.test(name) && name !== "." && name !== "..";
    }

    let expandedFolders = new Set();
    let selectedFolder = "";
    let dragItem = null;

    function saveExpanded() {}

    function baseName(path) {
        return path.slice(path.lastIndexOf("/") + 1);
    }

    function parentOf(path) {
        const index = path.lastIndexOf("/");
        return index === -1 ? "" : path.slice(0, index);
    }

    function joinPath(folder, name) {
        return folder ? folder + "/" + name : name;
    }

    function hasFile(path) {
        return Object.prototype.hasOwnProperty.call(window.files, path);
    }

    function expandPath(folder) {
        if (!folder) return;
        const parts = folder.split("/");
        for (let i = 1; i <= parts.length; i++) {
            expandedFolders.add(parts.slice(0, i).join("/"));
        }
    }

    function remapPaths(oldPath, newPath) {
        const next = new Set();
        expandedFolders.forEach(path => {
            if (path === oldPath || path.startsWith(oldPath + "/")) {
                next.add(newPath + path.slice(oldPath.length));
            } else {
                next.add(path);
            }
        });
        expandedFolders = next;

        if (selectedFolder === oldPath || selectedFolder.startsWith(oldPath + "/")) {
            selectedFolder = newPath + selectedFolder.slice(oldPath.length);
        }
    }

    function comparePaths(a, b) {
        const x = a.split("/");
        const y = b.split("/");
        for (let i = 0; i < Math.min(x.length, y.length); i++) {
            const result = x[i].localeCompare(y[i]);
            if (result) return result;
        }
        return x.length - y.length;
    }

    const FOLDER_CLOSED_SVG = `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h4.3c.6 0 1.2.25 1.6.7L12 6.5h7.5A2.5 2.5 0 0 1 22 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11Z" fill="#E0A526"/>
            <path d="M2 9.5A2.5 2.5 0 0 1 4.5 7h15A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-8Z" fill="#FFC83D"/>
        </svg>`;

    const FOLDER_OPEN_SVG = `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h4.3c.6 0 1.2.25 1.6.7L12 6.5h6.5A2.5 2.5 0 0 1 21 9v1H2V6.5Z" fill="#E0A526"/>
            <path d="M2 10h20.2a1.2 1.2 0 0 1 1.15 1.55l-2.2 7.2A2.5 2.5 0 0 1 18.75 20H4.5A2.5 2.5 0 0 1 2 17.5V10Z" fill="#FFC83D"/>
        </svg>`;

    const CHEVRON_SVG = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
            <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

    const MENU_ICONS = {
        newFile: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 14.5h-4a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5H9l3.5 3.5V7"/><path d="M9 1.5V5h3.5"/><path d="M12 9.5v5M9.5 12h5"/></svg>',
        newFolder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 13.5h-6a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5h4.2L7 3.8h6.5a.5.5 0 0 1 .5.5V7"/><path d="M12 9.5v5M9.5 12h5"/></svg>',
        rename: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z"/><path d="m10.5 3.5 2 2"/></svg>',
        move: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11"/><path d="m9.5 4.5 3.5 3.5-3.5 3.5"/></svg>',
        download: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v9"/><path d="m4.5 7 3.5 3.5L11.5 7"/><path d="M2.5 11.5v2h11v-2"/></svg>',
        delete: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11"/><path d="M6 2h4"/><path d="m4 4 .6 10h6.8L12 4"/><path d="M6.5 6.5v5M9.5 6.5v5"/></svg>'
    };

    function createFolderIcon(open) {
        const icon = document.createElement("span");
        icon.className = "file-icon folder-icon";
        icon.style.display = "inline-flex";
        icon.style.alignItems = "center";
        icon.style.justifyContent = "center";
        icon.style.width = "20px";
        icon.style.height = "20px";
        icon.style.flexShrink = "0";
        icon.innerHTML = open ? FOLDER_OPEN_SVG : FOLDER_CLOSED_SVG;
        return icon;
    }

    function buildTree() {
        const root = { path: "", folders: new Map(), files: [] };

        function nodeFor(path) {
            let node = root;
            let current = "";
            if (!path) return root;
            path.split("/").forEach(part => {
                current = joinPath(current, part);
                if (!node.folders.has(part)) {
                    node.folders.set(part, { path: current, folders: new Map(), files: [] });
                }
                node = node.folders.get(part);
            });
            return node;
        }

        (window.getAllFolders ? window.getAllFolders() : []).forEach(nodeFor);
        (window.getAllFiles ? window.getAllFiles() : []).forEach(file => {
            nodeFor(parentOf(file)).files.push(file);
        });

        return root;
    }

    function canDrop(item, destFolder) {
        if (!item) return false;
        if (parentOf(item.path) === destFolder) return false;
        if (item.type === "folder" &&
            (destFolder === item.path || destFolder.startsWith(item.path + "/"))) {
            return false;
        }
        return true;
    }

    function clearDropTargets() {
        document.querySelectorAll(".drop-target").forEach(el => el.classList.remove("drop-target"));
    }

    function attachDrag(row, type, path) {
        row.draggable = true;

        row.addEventListener("dragstart", event => {
            dragItem = { type, path };
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", path);
            row.classList.add("dragging");
        });

        row.addEventListener("dragend", () => {
            dragItem = null;
            row.classList.remove("dragging");
            clearDropTargets();
        });
    }

    function attachDropTarget(element, destFolder) {
        element.addEventListener("dragover", event => {
            if (!dragItem) return;
            event.stopPropagation();
            if (!canDrop(dragItem, destFolder)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (!element.classList.contains("drop-target")) {
                clearDropTargets();
                element.classList.add("drop-target");
            }
        });

        element.addEventListener("dragleave", event => {
            if (!element.contains(event.relatedTarget)) {
                element.classList.remove("drop-target");
            }
        });

        element.addEventListener("drop", event => {
            if (!dragItem) return;
            event.stopPropagation();
            element.classList.remove("drop-target");
            if (!canDrop(dragItem, destFolder)) return;
            event.preventDefault();
            const item = dragItem;
            dragItem = null;
            moveEntry(item.type, item.path, destFolder);
        });
    }

    function moveEntry(type, path, destFolder) {
        const newPath = joinPath(destFolder, baseName(path));
        if (newPath === path) return false;

        if (hasFile(newPath) || window.folderExists(newPath)) {
            showMessage("Thư mục đích đã có mục cùng tên: " + baseName(path), true);
            return false;
        }

        expandPath(destFolder);

        if (type === "file") {
            window.renameFile(path, newPath);
        } else {
            remapPaths(path, newPath);
            window.moveFolder(path, newPath);
        }

        saveExpanded();
        window.renderFileList();
        showMessage("Đã chuyển " + baseName(path) + " vào " + (destFolder ? baseName(destFolder) : "thư mục gốc"));
        return true;
    }

    function buildMenu(items) {
        const menuWrap = document.createElement("div");
        menuWrap.className = "file-menu-wrap";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "file-menu-trigger";
        trigger.title = "Tùy chọn";
        trigger.setAttribute("aria-label", "Tùy chọn");
        trigger.textContent = "⋮";

        const menu = document.createElement("div");
        menu.className = "file-context-menu";
        menu.hidden = true;

        items.forEach(({ icon, title, danger, run }) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "file-menu-item" + (danger ? " danger" : "");
            item.innerHTML = `<span class="file-menu-icon">${icon}</span><span>${title}</span>`;
            item.addEventListener("click", event => {
                event.stopPropagation();
                menu.hidden = true;
                run();
            });
            menu.appendChild(item);
        });

        trigger.addEventListener("click", event => {
            event.stopPropagation();
            const shouldOpen = menu.hidden;
            closeFileMenus();
            menu.hidden = !shouldOpen;
        });

        menuWrap.append(trigger, menu);
        return menuWrap;
    }

    function createFolderRow(name, path, depth) {
        const expanded = expandedFolders.has(path);

        const row = document.createElement("div");
        row.className = "file-row folder-row" +
            (expanded ? " expanded" : "") +
            (selectedFolder === path ? " selected-folder" : "");
        row.dataset.folder = path;
        row.style.paddingLeft = (depth * 14) + "px";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "file-open";
        openBtn.title = name;
        openBtn.setAttribute("aria-expanded", expanded ? "true" : "false");

        const nameEl = document.createElement("span");
        nameEl.className = "file-name";

        const chevron = document.createElement("span");
        chevron.className = "folder-chevron";
        chevron.innerHTML = CHEVRON_SVG;

        const label = document.createElement("span");
        label.className = "file-label";
        label.textContent = name;

        nameEl.append(chevron, createFolderIcon(expanded), label);
        openBtn.appendChild(nameEl);

        openBtn.addEventListener("click", () => {
            closeFileMenus();
            if (expandedFolders.has(path)) expandedFolders.delete(path);
            else expandedFolders.add(path);
            selectedFolder = path;
            saveExpanded();
            window.renderFileList();
        });

        const menuWrap = buildMenu([
            { icon: MENU_ICONS.newFile, title: "New File", run: () => openCreateFileDialog(path) },
            { icon: MENU_ICONS.newFolder, title: "New Folder", run: () => openCreateFolderDialog(path) },
            { icon: MENU_ICONS.rename, title: "Rename", run: () => renameFolder(path) },
            { icon: MENU_ICONS.move, title: "Move to...", run: () => openMoveDialog("folder", path) },
            { icon: MENU_ICONS.delete, title: "Delete", danger: true, run: () => deleteFolder(path) }
        ]);

        row.append(openBtn, menuWrap);
        attachDrag(row, "folder", path);
        attachDropTarget(row, path);
        return row;
    }

    function createFileRow(filename, depth) {
        const row = document.createElement("div");
        row.className = "file-row" + (window.currentFile === filename ? " active" : "");
        row.dataset.file = filename;
        row.style.paddingLeft = (depth * 14) + "px";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "file-open";
        openBtn.title = "Mở " + baseName(filename);

        const name = document.createElement("span");
        name.className = "file-name";

        const spacer = document.createElement("span");
        spacer.className = "folder-chevron-spacer";

        const label = document.createElement("span");
        label.className = "file-label";
        label.textContent = baseName(filename);

        name.append(spacer, createFileIcon(filename), label);
        openBtn.appendChild(name);
        openBtn.addEventListener("click", () => {
            closeFileMenus();
            selectedFolder = parentOf(filename);
            window.switchFile(filename);
            closeSidebar();
        });

        const menuWrap = buildMenu([
            { icon: MENU_ICONS.rename, title: "Rename", run: () => renameFile(filename) },
            { icon: MENU_ICONS.move, title: "Move to...", run: () => openMoveDialog("file", filename) },
            { icon: MENU_ICONS.download, title: "Download", run: () => downloadFile(filename) },
            { icon: MENU_ICONS.delete, title: "Delete", danger: true, run: () => deleteFile(filename) }
        ]);

        row.append(openBtn, menuWrap);
        attachDrag(row, "file", filename);
        attachDropTarget(row, parentOf(filename));
        return row;
    }

    function renderNode(node, depth, container) {
        Array.from(node.folders.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([name, child]) => {
                container.appendChild(createFolderRow(name, child.path, depth));
                if (expandedFolders.has(child.path)) {
                    if (child.folders.size === 0 && child.files.length === 0) {
                        const empty = document.createElement("div");
                        empty.className = "folder-empty-hint";
                        empty.style.paddingLeft = ((depth + 1) * 14 + 34) + "px";
                        empty.textContent = "Empty";
                        container.appendChild(empty);
                    } else {
                        renderNode(child, depth + 1, container);
                    }
                }
            });

        node.files
            .slice()
            .sort((a, b) => baseName(a).localeCompare(baseName(b)))
            .forEach(filename => container.appendChild(createFileRow(filename, depth)));
    }

    const projectHeader = document.querySelector(".sidebar .folder");

    window.renderFileList = function () {
        if (!fileList) return;

        fileList.innerHTML = "";
        renderNode(buildTree(), 0, fileList);

        if (projectHeader) {
            projectHeader.classList.toggle("selected-folder", selectedFolder === "");
        }
    };

    if (fileList) attachDropTarget(fileList, "");

    if (projectHeader) {
        attachDropTarget(projectHeader, "");
        projectHeader.addEventListener("click", () => {
            selectedFolder = "";
            window.renderFileList();
        });
    }

    function closeFileMenus() {
        document.querySelectorAll(".file-context-menu").forEach(menu => menu.hidden = true);
    }

    document.addEventListener("click", closeFileMenus);

    function currentContent(filename) {
        const isImage = window.isImageFile && window.isImageFile(filename);
        return filename === window.currentFile && window.editor && !isImage
            ? window.editor.getValue()
            : (window.files[filename] ?? "");
    }

    function dataUrlToBytes(dataUrl) {
        const comma = dataUrl.indexOf(",");
        if (comma === -1) return new Uint8Array(0);

        const meta = dataUrl.slice(0, comma);
        const payload = dataUrl.slice(comma + 1);

        if (/;base64/i.test(meta)) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }

        return new TextEncoder().encode(decodeURIComponent(payload));
    }

    function fileBytes(filename) {
        const content = currentContent(filename);
        return window.isImageFile && window.isImageFile(filename)
            ? dataUrlToBytes(content)
            : new TextEncoder().encode(content);
    }

    function downloadFile(filename) {
        const isImage = window.isImageFile && window.isImageFile(filename);
        const ext = filename.split(".").pop().toLowerCase();
        const mime = isImage && window.IMAGE_MIME_TYPES && window.IMAGE_MIME_TYPES[ext]
            ? window.IMAGE_MIME_TYPES[ext]
            : "application/octet-stream";
        const blob = new Blob([fileBytes(filename)], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename.split("/").pop();
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showMessage("Đang tải " + baseName(filename));
    }

    async function renameFile(oldFilename) {
        const current = baseName(oldFilename);
        const dot = current.lastIndexOf(".");

        const newName = await renameDialog({
            title: "Rename file",
            description: confirmMessage("Enter a new name for ", current, "."),
            label: "File name",
            value: current,
            cursorAt: dot > 0 ? dot : current.length,
            validate(name) {
                if (!name) return "Please enter a file name.";
                const allowed = ["html", "css", "js", "json"].concat(window.IMAGE_EXTENSIONS || []);
                if (!isValidFileName(name, allowed)) {
                    return "Invalid name. Use letters, numbers, _ - . and end with .html, .css, .js, .json or an image extension.";
                }
                if (window.isImageFile(name) !== window.isImageFile(oldFilename)) {
                    return "Cannot change between an image file and a text file.";
                }
                const target = joinPath(parentOf(oldFilename), name);
                if (hasFile(target) || window.folderExists(target)) {
                    return "A file or folder with this name already exists.";
                }
                return "";
            }
        });

        if (!newName) return;

        window.renameFile(oldFilename, joinPath(parentOf(oldFilename), newName));
        showMessage("Renamed to " + newName);
    }

    async function renameFolder(oldPath) {
        const current = baseName(oldPath);

        const newName = await renameDialog({
            title: "Rename folder",
            description: confirmMessage("Enter a new name for the folder ", current, "."),
            label: "Folder name",
            value: current,
            validate(name) {
                if (!name) return "Please enter a folder name.";
                if (!NAME_PATTERN.test(name) || name === "." || name === "..") {
                    return "Invalid name. Use letters, numbers, _ - . only.";
                }
                const target = joinPath(parentOf(oldPath), name);
                if (hasFile(target) || window.folderExists(target)) {
                    return "A file or folder with this name already exists.";
                }
                return "";
            }
        });

        if (!newName) return;

        const newPath = joinPath(parentOf(oldPath), newName);
        remapPaths(oldPath, newPath);
        saveExpanded();
        window.moveFolder(oldPath, newPath);
        showMessage("Renamed folder to " + newName);
    }

    async function deleteFolder(path) {
        const prefix = path + "/";
        const count = window.getAllFiles().filter(file => file.startsWith(prefix)).length;
        const detail = count > 0 ? ` and its ${count} file${count > 1 ? "s" : ""}` : "";
        const confirmed = await confirmDialog({
            title: "Delete folder",
            message: confirmMessage("Are you sure you want to delete the folder ", baseName(path), `${detail}? This action cannot be undone.`),
            confirmText: "Delete"
        });
        if (!confirmed) return;

        window.removeFolder(path);

        expandedFolders.forEach(item => {
            if (item === path || item.startsWith(prefix)) expandedFolders.delete(item);
        });
        if (selectedFolder === path || selectedFolder.startsWith(prefix)) {
            selectedFolder = parentOf(path);
        }
        saveExpanded();
        window.renderFileList();
        showMessage("Deleted folder " + baseName(path));
    }

    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
        return table;
    })();

    function crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    async function deflateRaw(bytes) {
        if (typeof CompressionStream !== "function") return null;
        try {
            const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (error) {
            return null;
        }
    }

    function dosDateTime(date) {
        const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
        const day = (Math.max(date.getFullYear(), 1980) - 1980 << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
        return { time, day };
    }

    async function buildZip(entries) {
        const encoder = new TextEncoder();
        const { time, day } = dosDateTime(new Date());
        const chunks = [];
        const central = [];
        let offset = 0;

        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name);
            const isDir = entry.name.endsWith("/");
            const raw = isDir ? new Uint8Array(0) : entry.data;

            let method = 0;
            let body = raw;
            if (!isDir && raw.length > 0) {
                const packed = await deflateRaw(raw);
                if (packed && packed.length < raw.length) {
                    method = 8;
                    body = packed;
                }
            }

            const crc = isDir ? 0 : crc32(raw);

            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);
            local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true);
            local.setUint16(8, method, true);
            local.setUint16(10, time, true);
            local.setUint16(12, day, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, body.length, true);
            local.setUint32(22, raw.length, true);
            local.setUint16(26, nameBytes.length, true);
            local.setUint16(28, 0, true);

            chunks.push(new Uint8Array(local.buffer), nameBytes, body);

            const header = new DataView(new ArrayBuffer(46));
            header.setUint32(0, 0x02014b50, true);
            header.setUint16(4, 20, true);
            header.setUint16(6, 20, true);
            header.setUint16(8, 0x0800, true);
            header.setUint16(10, method, true);
            header.setUint16(12, time, true);
            header.setUint16(14, day, true);
            header.setUint32(16, crc, true);
            header.setUint32(20, body.length, true);
            header.setUint32(24, raw.length, true);
            header.setUint16(28, nameBytes.length, true);
            header.setUint32(38, isDir ? 0x10 : 0, true);
            header.setUint32(42, offset, true);
            central.push(new Uint8Array(header.buffer), nameBytes);

            offset += 30 + nameBytes.length + body.length;
        }

        const centralSize = central.reduce((sum, part) => sum + part.length, 0);

        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, entries.length, true);
        end.setUint16(10, entries.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);

        return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
    }

    function randomId(length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(bytes, b => (b % 16).toString(16)).join("");
    }

    async function downloadProject() {
        const names = window.getAllFiles ? window.getAllFiles() : [];
        const folderNames = window.getAllFolders ? window.getAllFolders() : [];

        if (names.length === 0 && folderNames.length === 0) {
            showMessage("The project is empty. Nothing to download.", true);
            return;
        }

        const encoder = new TextEncoder();
        const entries = [];

        const zipName = `project-${randomId(6)}.zip`;

        folderNames.slice().sort().forEach(folder => {
            entries.push({ name: folder + "/", data: null });
        });

        names.slice().sort().forEach(name => {
            entries.push({ name, data: fileBytes(name) });
        });

        try {
            const blob = await buildZip(entries);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = zipName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showMessage(`Downloading ${zipName}`);
        } catch (error) {
            console.error("[WCS] Cannot create zip:", error);
            showMessage("Could not create the zip file.", true);
        }
    }

    const downloadProjectBtn = document.getElementById("downloadProjectBtn");
    if (downloadProjectBtn) {
        downloadProjectBtn.addEventListener("click", downloadProject);
    }

    const UPLOAD_TEXT_EXTENSIONS = ["html", "css", "js", "json"];
    const MAX_TEXT_UPLOAD = 1 * 1024 * 1024;
    const MAX_IMAGE_UPLOAD = 2 * 1024 * 1024;

    const uploadFileBtn = document.getElementById("uploadFileBtn");
    const uploadInput = document.getElementById("uploadInput");

    function bytesToBase64(bytes) {
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    function sanitizeUploadName(rawName, ext) {
        const dot = rawName.lastIndexOf(".");
        let base = dot > 0 ? rawName.slice(0, dot) : rawName.replace(/^\.+/, "");

        base = base
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9_.-]/g, "-")
            .replace(/-{2,}/g, "-")
            .replace(/^[.-]+|[.-]+$/g, "");

        return (base || "file") + "." + ext;
    }

    function uniqueUploadPath(folder, filename) {
        const dot = filename.lastIndexOf(".");
        const base = filename.slice(0, dot);
        const ext = filename.slice(dot);

        let candidate = joinPath(folder, filename);
        let n = 1;

        while (hasFile(candidate) || window.folderExists(candidate)) {
            candidate = joinPath(folder, base + "-" + n + ext);
            n++;
        }

        return candidate;
    }

    async function readUploadContent(file, isImage, ext) {
        if (!isImage) return await file.text();

        const bytes = new Uint8Array(await file.arrayBuffer());
        const mime = (window.IMAGE_MIME_TYPES && window.IMAGE_MIME_TYPES[ext]) || "application/octet-stream";
        return "data:" + mime + ";base64," + bytesToBase64(bytes);
    }

    async function uploadFiles(fileListLike) {
        const picked = Array.from(fileListLike || []);
        if (picked.length === 0) return;

        const folder = selectedFolder;
        const added = [];
        const skipped = [];
        let renamed = false;

        for (const file of picked) {
            const ext = (file.name.split(".").pop() || "").toLowerCase();
            const isImage = window.isImageFile(file.name);

            if (!isImage && !UPLOAD_TEXT_EXTENSIONS.includes(ext)) {
                skipped.push(file.name + " (không hỗ trợ)");
                continue;
            }

            const limit = isImage ? MAX_IMAGE_UPLOAD : MAX_TEXT_UPLOAD;
            if (file.size > limit) {
                skipped.push(file.name + " (quá lớn, tối đa " + (limit / 1024 / 1024) + " MB)");
                continue;
            }

            let target;

            try {
                const content = await readUploadContent(file, isImage, ext);
                const safeName = sanitizeUploadName(file.name, ext);
                target = uniqueUploadPath(folder, safeName);

                if (baseName(target) !== file.name) renamed = true;

                window.addFile(target, content);
            } catch (error) {
                console.error("[WCS] Upload failed:", error);
                skipped.push(file.name + " (không đọc được)");
                continue;
            }

            if (!window.persistBrowserFiles()) {
                window.removeFile(target);
                skipped.push(file.name + " (bộ nhớ trình duyệt đã đầy)");
                continue;
            }

            added.push(target);
        }

        if (added.length > 0) {
            expandPath(folder);
            selectedFolder = folder;
            saveExpanded();
            window.renderFileList();
            closeSidebar();
        }

        let message;

        if (added.length === 1) {
            message = "Đã tải lên " + baseName(added[0]) + (renamed ? " (đã đổi tên cho hợp lệ / tránh trùng)" : "");
        } else if (added.length > 1) {
            message = "Đã tải lên " + added.length + " file";
        } else {
            message = "Không tải lên được file nào";
        }

        if (skipped.length > 0) {
            message += ". Bỏ qua: " + skipped.join("; ");
        }

        showMessage(message, added.length === 0);
    }

    if (uploadFileBtn && uploadInput) {
        uploadFileBtn.addEventListener("click", () => uploadInput.click());

        uploadInput.addEventListener("change", async () => {
            const picked = uploadInput.files;
            await uploadFiles(picked);
            uploadInput.value = "";
        });
    }

    const MAX_ZIP_SIZE = 20 * 1024 * 1024;
    const MAX_ZIP_ENTRIES = 5000;

    const importProjectBtn = document.getElementById("importProjectBtn");
    const importProjectInput = document.getElementById("importProjectInput");

    function concatBytes(chunks, total) {
        const out = new Uint8Array(total);
        let offset = 0;
        chunks.forEach(chunk => {
            out.set(chunk, offset);
            offset += chunk.length;
        });
        return out;
    }

    async function inflateRaw(bytes, maxSize) {
        if (typeof DecompressionStream !== "function") {
            throw new Error("This browser cannot decompress zip files.");
        }

        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        const reader = stream.getReader();
        const chunks = [];
        let total = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            if (total > maxSize) {
                await reader.cancel();
                throw new Error("too large");
            }
            chunks.push(value);
        }

        return concatBytes(chunks, total);
    }

    function decodeZipName(bytes, isUtf8) {
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch (error) {
            return new TextDecoder(isUtf8 ? "utf-8" : "windows-1252").decode(bytes);
        }
    }

    function readZipEntries(bytes) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        let eocd = -1;
        const stop = Math.max(0, bytes.length - 22 - 0xFFFF);
        for (let i = bytes.length - 22; i >= stop; i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                eocd = i;
                break;
            }
        }
        if (eocd === -1) throw new Error("This is not a valid zip file.");

        const count = view.getUint16(eocd + 10, true);
        const cdSize = view.getUint32(eocd + 12, true);
        let pos = view.getUint32(eocd + 16, true);

        if (count === 0xFFFF || cdSize === 0xFFFFFFFF || pos === 0xFFFFFFFF) {
            throw new Error("Zip64 archives are not supported.");
        }
        if (count > MAX_ZIP_ENTRIES) throw new Error("The zip contains too many entries.");

        const entries = [];

        for (let i = 0; i < count; i++) {
            if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) {
                throw new Error("The zip file is damaged.");
            }

            const flags = view.getUint16(pos + 8, true);
            const nameLength = view.getUint16(pos + 28, true);
            const extraLength = view.getUint16(pos + 30, true);
            const commentLength = view.getUint16(pos + 32, true);

            entries.push({
                flags,
                method: view.getUint16(pos + 10, true),
                crc: view.getUint32(pos + 16, true),
                compressedSize: view.getUint32(pos + 20, true),
                size: view.getUint32(pos + 24, true),
                localOffset: view.getUint32(pos + 42, true),
                name: decodeZipName(bytes.subarray(pos + 46, pos + 46 + nameLength), (flags & 0x800) !== 0)
            });

            pos += 46 + nameLength + extraLength + commentLength;
        }

        return entries;
    }

    async function readZipEntryData(bytes, entry, maxSize) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const offset = entry.localOffset;

        if (offset + 30 > bytes.length || view.getUint32(offset, true) !== 0x04034b50) {
            throw new Error("damaged");
        }

        const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
        const raw = bytes.subarray(start, start + entry.compressedSize);

        let data;
        if (entry.method === 0) {
            if (raw.length > maxSize) throw new Error("too large");
            data = raw;
        } else if (entry.method === 8) {
            data = await inflateRaw(raw, maxSize);
        } else {
            throw new Error("unsupported compression");
        }

        if (crc32(data) !== entry.crc) throw new Error("damaged");
        return data;
    }

    function sanitizeSegment(raw) {
        const clean = raw
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9_.-]/g, "-")
            .replace(/-{2,}/g, "-")
            .replace(/^[.-]+|[.-]+$/g, "");
        return clean || "folder";
    }

    function zipPathParts(rawName) {
        const parts = rawName.replace(/\\/g, "/").split("/").filter(part => part !== "" && part !== ".");
        if (parts.some(part => part === "..")) return null;
        return parts;
    }

    function isZipJunk(parts) {
        return parts.includes("__MACOSX") ||
            parts[parts.length - 1] === ".DS_Store" ||
            parts[parts.length - 1] === "Thumbs.db";
    }

    async function parseProjectZip(file) {
        if (file.size > MAX_ZIP_SIZE) {
            throw new Error("The zip file is too large (max " + (MAX_ZIP_SIZE / 1024 / 1024) + " MB).");
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        const entries = readZipEntries(bytes);

        const items = [];
        entries.forEach(entry => {
            const parts = zipPathParts(entry.name);
            if (!parts || parts.length === 0 || isZipJunk(parts)) return;
            items.push({ entry, parts, isDir: /\/$|\\$/.test(entry.name) });
        });

        if (items.length > 0 &&
            items.every(item => item.parts.length >= 2 || item.isDir) &&
            items.every(item => item.parts[0] === items[0].parts[0])) {
            items.forEach(item => item.parts.shift());
        }

        const files = {};
        const folders = new Set();
        const removed = [];
        const skipped = [];
        const usedFiles = new Set();

        for (const item of items) {
            if (item.parts.length === 0) continue;

            const dirParts = (item.isDir ? item.parts : item.parts.slice(0, -1)).map(sanitizeSegment);
            const folder = dirParts.join("/");

            if (item.isDir) {
                if (folder) folders.add(folder);
                continue;
            }

            const originalName = item.parts[item.parts.length - 1];
            const displayName = item.parts.join("/");
            const dot = originalName.lastIndexOf(".");
            const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : "";
            const isImage = window.isImageFile(originalName);

            if ((item.entry.flags & 1) !== 0 || (!isImage && !UPLOAD_TEXT_EXTENSIONS.includes(ext))) {
                removed.push(displayName);
                continue;
            }

            const limit = isImage ? MAX_IMAGE_UPLOAD : MAX_TEXT_UPLOAD;

            if (item.entry.size > limit) {
                skipped.push(displayName + " (too large)");
                continue;
            }

            let data;
            try {
                data = await readZipEntryData(bytes, item.entry, limit);
            } catch (error) {
                skipped.push(displayName + (error.message === "too large" ? " (too large)" : " (could not be read)"));
                continue;
            }

            const safeName = sanitizeUploadName(originalName, ext);
            const safeDot = safeName.lastIndexOf(".");
            const base = safeName.slice(0, safeDot);
            const suffix = safeName.slice(safeDot);

            let path = joinPath(folder, safeName);
            let n = 1;
            while (usedFiles.has(path)) {
                path = joinPath(folder, base + "-" + n + suffix);
                n++;
            }
            usedFiles.add(path);

            if (isImage) {
                const mime = (window.IMAGE_MIME_TYPES && window.IMAGE_MIME_TYPES[ext]) || "application/octet-stream";
                files[path] = "data:" + mime + ";base64," + bytesToBase64(data);
            } else {
                files[path] = new TextDecoder("utf-8").decode(data);
            }
        }

        const folderList = Array.from(folders).filter(name => !usedFiles.has(name));

        return { files, folders: folderList, removed, skipped };
    }

    function summarizeNames(names, max = 3) {
        const shown = names.slice(0, max).join(", ");
        return names.length > max ? shown + " and " + (names.length - max) + " more" : shown;
    }

    async function importProject(file) {
        if (!file) return;

        let result;

        try {
            result = await parseProjectZip(file);
        } catch (error) {
            console.error("[WCS] Cannot read zip:", error);
            showMessage(error && error.message ? error.message : "Could not read the zip file.", true);
            return;
        }

        const fileCount = Object.keys(result.files).length;

        if (fileCount === 0 && result.folders.length === 0) {
            const reason = result.removed.length > 0
                ? " All " + result.removed.length + " files in it are unsupported."
                : "";
            showMessage("Nothing to import from " + file.name + "." + reason, true);
            return;
        }

        const hasProject = (window.getAllFiles ? window.getAllFiles().length : 0) > 0 ||
            (window.getAllFolders ? window.getAllFolders().length : 0) > 0;

        if (hasProject) {
            let text = "This will import " + fileCount + (fileCount === 1 ? " file" : " files") +
                " and replace your current project.";
            if (result.removed.length > 0) {
                text += " " + result.removed.length + " unsupported " +
                    (result.removed.length === 1 ? "file" : "files") + " will be removed.";
            }

            const ok = await confirmDialog({
                title: "Import project",
                message: [document.createTextNode(text)],
                confirmText: "Import"
            });
            if (!ok) return;
        }

        if (!window.replaceProject(result.files, result.folders)) {
            showMessage("Browser storage is full. The project was not imported.", true);
            return;
        }

        expandedFolders = new Set();
        selectedFolder = "";
        saveExpanded();
        window.renderFileList();
        closeSidebar();

        let message = "Imported " + fileCount + (fileCount === 1 ? " file" : " files");
        if (result.removed.length > 0) {
            message += ". Removed " + result.removed.length + " unsupported " +
                (result.removed.length === 1 ? "file" : "files") + ": " + summarizeNames(result.removed);
        }
        if (result.skipped.length > 0) {
            message += ". Skipped: " + summarizeNames(result.skipped);
        }

        if (result.removed.length > 0) console.warn("[WCS] Removed unsupported files:", result.removed);
        if (result.skipped.length > 0) console.warn("[WCS] Skipped files:", result.skipped);

        showMessage(message, fileCount === 0 && result.folders.length === 0);
    }

    if (importProjectBtn && importProjectInput) {
        importProjectBtn.addEventListener("click", () => importProjectInput.click());

        importProjectInput.addEventListener("change", async () => {
            const picked = importProjectInput.files && importProjectInput.files[0];
            await importProject(picked);
            importProjectInput.value = "";
        });
    }

    function confirmDialog({ title, message, confirmText = "Delete" }) {
        const dialog = document.getElementById("confirmDialog");
        const titleEl = document.getElementById("confirmTitle");
        const messageEl = document.getElementById("confirmMessage");
        const okBtn = document.getElementById("confirmOk");
        const cancelBtn = document.getElementById("confirmCancel");

        if (!dialog || !okBtn || !cancelBtn) {
            return Promise.resolve(false);
        }

        const previousFocus = document.activeElement;

        titleEl.textContent = title;
        messageEl.replaceChildren(...message);
        okBtn.textContent = confirmText;
        dialog.hidden = false;
        okBtn.focus();

        return new Promise(resolve => {
            function finish(result) {
                dialog.hidden = true;
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                dialog.removeEventListener("mousedown", onBackdrop);
                document.removeEventListener("keydown", onKey, true);
                if (previousFocus && typeof previousFocus.focus === "function") {
                    previousFocus.focus();
                }
                resolve(result);
            }

            const onOk = () => finish(true);
            const onCancel = () => finish(false);
            const onBackdrop = event => { if (event.target === dialog) finish(false); };
            const onKey = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(false);
                } else if (event.key === "Tab") {
                    event.preventDefault();
                    (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
                }
            };

            okBtn.addEventListener("click", onOk);
            cancelBtn.addEventListener("click", onCancel);
            dialog.addEventListener("mousedown", onBackdrop);
            document.addEventListener("keydown", onKey, true);
        });
    }

    window.confirmDialog = confirmDialog;
    window.showMessage = showMessage;

    window.wcsAfterProjectImport = function () {
        expandedFolders = new Set();
        selectedFolder = "";
        saveExpanded();
        window.renderFileList();
        closeSidebar();
    };

    function confirmMessage(before, name, after) {
        const strong = document.createElement("strong");
        strong.textContent = name;
        return [document.createTextNode(before), strong, document.createTextNode(after)];
    }

    function renameDialog({ title, description, label, value, validate, cursorAt }) {
        const dialog = document.getElementById("renameDialog");
        const form = document.getElementById("renameForm");
        const input = document.getElementById("renameInput");
        const errorEl = document.getElementById("renameError");
        const cancelBtn = document.getElementById("renameCancel");

        if (!dialog || !form || !input) return Promise.resolve(null);

        const previousFocus = document.activeElement;

        document.getElementById("renameTitle").textContent = title;
        document.getElementById("renameLabel").textContent = label;
        document.getElementById("renameDescription").replaceChildren(...description);

        input.value = value;
        input.classList.remove("invalid");
        errorEl.hidden = true;
        dialog.hidden = false;
        input.focus();
        const cursor = typeof cursorAt === "number" ? cursorAt : value.length;
        input.setSelectionRange(cursor, cursor);

        return new Promise(resolve => {
            function finish(result) {
                dialog.hidden = true;
                form.removeEventListener("submit", onSubmit);
                cancelBtn.removeEventListener("click", onCancel);
                dialog.removeEventListener("mousedown", onBackdrop);
                input.removeEventListener("input", onInput);
                document.removeEventListener("keydown", onKey, true);
                if (previousFocus && typeof previousFocus.focus === "function") {
                    previousFocus.focus();
                }
                resolve(result);
            }

            function showError(text) {
                errorEl.textContent = text;
                errorEl.hidden = !text;
                input.classList.toggle("invalid", !!text);
            }

            const onSubmit = event => {
                event.preventDefault();
                const name = input.value.trim();
                if (name === value) return finish(null);
                const error = validate ? validate(name) : "";
                if (error) {
                    showError(error);
                    input.focus();
                    return;
                }
                finish(name);
            };
            const onCancel = () => finish(null);
            const onBackdrop = event => { if (event.target === dialog) finish(null); };
            const onInput = () => showError("");
            const onKey = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(null);
                }
            };

            form.addEventListener("submit", onSubmit);
            cancelBtn.addEventListener("click", onCancel);
            dialog.addEventListener("mousedown", onBackdrop);
            input.addEventListener("input", onInput);
            document.addEventListener("keydown", onKey, true);
        });
    }

    const moveDialog = document.getElementById("moveDialog");
    const moveForm = document.getElementById("moveForm");
    const moveDescription = document.getElementById("moveDescription");
    const moveFolderList = document.getElementById("moveFolderList");
    const cancelMove = document.getElementById("cancelMove");

    let moveContext = null;
    let moveTarget = "";

    function closeMoveDialog() {
        if (moveDialog) moveDialog.hidden = true;
        moveContext = null;
    }

    function openMoveDialog(type, path) {
        if (!moveDialog || !moveFolderList) return;

        moveContext = { type, path };
        moveTarget = parentOf(path);
        moveDescription.textContent = `Choose a destination for "${baseName(path)}".`;

        const destinations = [""].concat(
            window.getAllFolders()
                .filter(folder => !(type === "folder" && (folder === path || folder.startsWith(path + "/"))))
                .sort(comparePaths)
        );

        moveFolderList.innerHTML = "";

        destinations.forEach(folder => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "move-option";
            option.dataset.folder = folder;
            const depth = folder ? folder.split("/").length : 0;
            option.style.paddingLeft = (10 + depth * 16) + "px";
            option.setAttribute("role", "radio");

            const icon = createFolderIcon(false);
            const label = document.createElement("span");
            label.className = "move-option-label";
            label.textContent = folder ? baseName(folder) : "PROJECT (root)";
            option.append(icon, label);

            if (folder === parentOf(path)) {
                const current = document.createElement("span");
                current.className = "move-option-current";
                current.textContent = "current";
                option.appendChild(current);
            }

            option.addEventListener("click", () => {
                moveTarget = folder;
                updateMoveSelection();
            });

            moveFolderList.appendChild(option);
        });

        updateMoveSelection();
        moveDialog.hidden = false;
    }

    function updateMoveSelection() {
        moveFolderList.querySelectorAll(".move-option").forEach(option => {
            const selected = option.dataset.folder === moveTarget;
            option.classList.toggle("selected", selected);
            option.setAttribute("aria-checked", selected ? "true" : "false");
        });
    }

    if (moveForm) {
        moveForm.addEventListener("submit", event => {
            event.preventDefault();
            const context = moveContext;
            const target = moveTarget;
            closeMoveDialog();
            if (context && target !== parentOf(context.path)) {
                moveEntry(context.type, context.path, target);
            }
        });
    }

    if (cancelMove) cancelMove.addEventListener("click", closeMoveDialog);

    if (moveDialog) {
        moveDialog.addEventListener("click", event => {
            if (event.target === moveDialog) closeMoveDialog();
        });
    }

    window.renderTabs = function () {

        if (!tabsContainer) return;

        const tabs = window.getOpenTabs
            ? window.getOpenTabs()
            : [];

        tabsContainer.innerHTML = "";

        tabs.forEach(filename => {

            const tab = document.createElement("div");

            tab.className =
                "tab" +
                (window.currentFile === filename ? " active" : "");

            const label = document.createElement("span");

            label.className = "tab-label";

            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "8px";
            label.style.minWidth = "0";

            const icon = createFileIcon(filename);

            const text = document.createElement("span");

            text.className = "tab-filename";
            text.textContent = baseName(filename);
            tab.title = filename;

            text.style.overflow = "hidden";
            text.style.textOverflow = "ellipsis";
            text.style.whiteSpace = "nowrap";

            label.appendChild(icon);
            label.appendChild(text);

            const closeBtn = document.createElement("button");

            closeBtn.className = "tab-close";
            closeBtn.title = "Đóng";
            closeBtn.textContent = "×";

            tab.appendChild(label);
            tab.appendChild(closeBtn);

            tab.addEventListener("click", event => {

                if (event.target.closest(".tab-close")) return;

                window.switchFile(filename);
            });

            closeBtn.addEventListener("click", event => {

                event.stopPropagation();

                window.closeTab(filename);
            });

            tabsContainer.appendChild(tab);

        });

        renderBreadcrumbs();
    };

    const BREADCRUMB_SEPARATOR_SVG = `
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
            <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

    function renderBreadcrumbs() {
        const bar = document.getElementById("breadcrumbs");
        if (!bar) return;

        const current = window.currentFile;
        bar.innerHTML = "";

        if (!current) {
            bar.hidden = true;
            return;
        }

        bar.hidden = false;

        const parts = current.split("/");

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;

            if (index > 0) {
                const sep = document.createElement("span");
                sep.className = "breadcrumb-sep";
                sep.innerHTML = BREADCRUMB_SEPARATOR_SVG;
                bar.appendChild(sep);
            }

            const item = document.createElement("span");
            item.className = "breadcrumb-item" + (isFile ? " breadcrumb-file" : "");
            item.title = parts.slice(0, index + 1).join("/");

            if (isFile) item.appendChild(createFileIcon(part));

            const text = document.createElement("span");
            text.textContent = part;
            item.appendChild(text);

            bar.appendChild(item);
        });
    }

    async function saveCurrentFile() {
        if (!window.editor || !window.currentFile) return;
        if (!window.isImageFile(window.currentFile)) {
            window.files[window.currentFile] = window.editor.getValue();
        }
        const saved = window.persistBrowserFiles ? window.persistBrowserFiles() : false;
        if (saved) showMessage("Đã lưu " + window.currentFile + " vào bộ nhớ trình duyệt!");
        else showMessage("Không thể lưu. Bộ nhớ trình duyệt có thể đã đầy.", true);
    }

    const createFileDialog = document.getElementById("createFileDialog");
    const createFileForm = document.getElementById("createFileForm");
    const createFileName = document.getElementById("createFileName");
    const cancelCreateFile = document.getElementById("cancelCreateFile");

    function closeCreateFileDialog() {
        if (!createFileDialog) return;
        createFileDialog.hidden = true;
        if (createFileForm) createFileForm.reset();
    }

    let createFileTarget = "";

    function openCreateFileDialog(folder = selectedFolder) {
        if (!createFileDialog || !createFileName) return;
        createFileTarget = folder;
        const hint = createFileDialog.querySelector(".dialog-hint");
        if (hint) {
            hint.textContent = folder
                ? "It will be created inside the folder: " + baseName(folder)
                : "for example: index.html or css/style.css";
        }
        createFileDialog.hidden = false;
        createFileName.value = "";
        createFileName.focus();
    }

    if (newFileBtn && createFileDialog && createFileForm && createFileName) {
        newFileBtn.addEventListener("click", () => openCreateFileDialog());

        if (cancelCreateFile) cancelCreateFile.addEventListener("click", closeCreateFileDialog);
        createFileDialog.addEventListener("click", event => {
            if (event.target === createFileDialog) closeCreateFileDialog();
        });

        createFileForm.addEventListener("submit", event => {
            event.preventDefault();
            const name = createFileName.value.trim();
            if (!name) {
                createFileName.focus();
                return;
            }

            const filename = joinPath(createFileTarget, name.replace(/\\/g, "/"));
            const pathParts = filename.split("/");
            const validFolders = pathParts.slice(0, -1).every(part =>
                part && part !== "." && part !== ".." && NAME_PATTERN.test(part)
            );
            const validPath = validFolders &&
                isValidFileName(pathParts[pathParts.length - 1], ["html", "css", "js", "json"]);

            if (!validPath) {
                showMessage("Tên file không hợp lệ! Cần có tên và đuôi .html, .css, .js hoặc .json (vd: index.html).", true);
                createFileName.focus();
                return;
            }

            if (window.folderExists(filename)) {
                showMessage("Đã có thư mục trùng tên!", true);
                createFileName.focus();
                return;
            }

            const parts = filename.split("/");
            for (let i = 1; i < parts.length; i++) {
                if (hasFile(parts.slice(0, i).join("/"))) {
                    showMessage("Không thể tạo thư mục trùng tên file đã có!", true);
                    createFileName.focus();
                    return;
                }
            }

            if (hasFile(filename)) {
                showMessage("File đã tồn tại!", true);
                closeCreateFileDialog();
                window.switchFile(filename);
                return;
            }

            let content = "";
            const extension = filename.split(".").pop().toLowerCase();
            if (extension === "css") {
                content = `/* ${baseName(filename)} */\n`;
            } else if (extension === "js") {
                content = `// ${baseName(filename)}\n`;
            } else if (extension === "json") {
                content = `{\n    \n}`;
            }

            closeCreateFileDialog();

            const folder = parentOf(filename);
            expandPath(folder);
            selectedFolder = folder;
            saveExpanded();

            window.addFile(filename, content);
            closeSidebar();
            showMessage("Đã tạo " + baseName(filename));
        });
    }

    const createFolderDialog = document.getElementById("createFolderDialog");
    const createFolderForm = document.getElementById("createFolderForm");
    const createFolderName = document.getElementById("createFolderName");
    const cancelCreateFolder = document.getElementById("cancelCreateFolder");
    const newFolderBtn = document.getElementById("newFolderBtn");

    function closeCreateFolderDialog() {
        if (!createFolderDialog) return;
        createFolderDialog.hidden = true;
        if (createFolderForm) createFolderForm.reset();
    }

    let createFolderTarget = "";

    function openCreateFolderDialog(folder = selectedFolder) {
        if (!createFolderDialog || !createFolderName) return;
        createFolderTarget = folder;
        const hint = createFolderDialog.querySelector(".dialog-hint");
        if (hint) {
            hint.textContent = folder
                ? "It will be created inside the folder: " + baseName(folder)
                : "for example: assets or assets/images";
        }
        createFolderDialog.hidden = false;
        createFolderName.value = "";
        createFolderName.focus();
    }

    if (newFolderBtn && createFolderDialog && createFolderForm && createFolderName) {
        newFolderBtn.addEventListener("click", () => openCreateFolderDialog());

        if (cancelCreateFolder) cancelCreateFolder.addEventListener("click", closeCreateFolderDialog);
        createFolderDialog.addEventListener("click", event => {
            if (event.target === createFolderDialog) closeCreateFolderDialog();
        });

        createFolderForm.addEventListener("submit", event => {
            event.preventDefault();

            const relative = createFolderName.value
                .trim()
                .replace(/\\/g, "/")
                .replace(/\/+$/, "");

            if (!relative) {
                createFolderName.focus();
                return;
            }

            const path = joinPath(createFolderTarget, relative);

            const parts = path.split("/");
            const validPath = relative.split("/").every(part =>
                part && part !== "." && part !== ".." && NAME_PATTERN.test(part)
            );

            if (!validPath) {
                showMessage("Tên thư mục không hợp lệ! Chỉ dùng chữ, số, _ - . và dấu /.", true);
                createFolderName.focus();
                return;
            }

            for (let i = 1; i <= parts.length; i++) {
                if (hasFile(parts.slice(0, i).join("/"))) {
                    showMessage("Đã có file trùng tên với thư mục!", true);
                    createFolderName.focus();
                    return;
                }
            }

            closeCreateFolderDialog();

            const existed = window.folderExists(path);
            expandPath(path);
            selectedFolder = path;
            saveExpanded();

            if (existed) {
                window.renderFileList();
                showMessage("Thư mục đã tồn tại: " + baseName(path));
                return;
            }

            window.addFolder(path);
            showMessage("Đã tạo thư mục " + baseName(path));
        });
    }

    async function deleteFile(filename) {
        const confirmed = await confirmDialog({
            title: "Delete file",
            message: confirmMessage("Are you sure you want to delete ", baseName(filename), "? This action cannot be undone."),
            confirmText: "Delete"
        });
        if (!confirmed) return;
        window.removeFile(filename);
        if (window.persistBrowserFiles) window.persistBrowserFiles();
        showMessage("Deleted " + baseName(filename));
    }

    function runWebsite() {

        if (typeof window.runPreview === "function") {

            window.runPreview();

            showMessage("Đã cập nhật Live Preview!");

        } else {

            showMessage("Preview chưa sẵn sàng!", true);
        }
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", runWebsite);
    }

    if (togglePreviewBtn) {

        togglePreviewBtn.addEventListener("click", function () {

            previewHidden = !previewHidden;

            if (previewHidden) {

                if (previewSection) {
                    previewSection.classList.add("preview-hidden");
                }

                togglePreviewBtn.setAttribute("aria-pressed", "false");
                togglePreviewBtn.title = "Hiện Preview";

            } else {

                if (previewSection) {
                    previewSection.classList.remove("preview-hidden");
                }

                togglePreviewBtn.setAttribute("aria-pressed", "true");
                togglePreviewBtn.title = "Ẩn Preview";

                requestAnimationFrame(() => {

                    if (typeof window.resizePreview === "function") {
                        window.resizePreview();
                    }

                    if (typeof window.runPreview === "function") {
                        window.runPreview();
                    }

                    if (window.editor) {
                        window.editor.layout();
                    }

                });
            }

        });
    }

    document.addEventListener("keydown", event => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "s"
        ) {

            event.preventDefault();

            saveCurrentFile();
        }

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            runWebsite();
        }

    });

    function setStatus(state, label) {
        if (!serverStatus) return;
        serverStatus.innerHTML = '<span class="status-dot ' + state + '"></span> ' + label;
    }

    function checkServer() {

        if (window.__wcsEditorFailed) return false;

        if (window.editor && typeof window.editor.getValue === "function") {
            setStatus("online", "Ready");
            return true;
        }

        if (navigator.onLine === false) {
            setStatus("offline", "Offline");
        }

        window.addEventListener("editorReady", () => {
            if (!window.__wcsEditorFailed) setStatus("online", "Ready");
        }, { once: true });

        return false;
    }

    async function loadProjects() {
        const savedFiles = window.readBrowserFiles ? window.readBrowserFiles() : {};
        const projectFiles = Object.keys(savedFiles);

        for (const filename of projectFiles) {
            if (typeof savedFiles[filename] !== "string") continue;
            window.loadFile(filename, savedFiles[filename]);
        }

        if (projectFiles.length === 0) {
            showMessage("Bộ soạn thảo đang trống. Nhấn + New để tự tạo file đầu tiên.");
        }

        const allFiles = window.getAllFiles();
        const savedTabs = window.readOpenTabs ? window.readOpenTabs() : null;

        if (savedTabs) {
            window.restoreTabs(savedTabs.tabs, savedTabs.active);
        } else if (allFiles.includes("index.html")) {
            window.switchFile("index.html");
        } else {
            const firstHTML = allFiles.find(file => file.toLowerCase().endsWith(".html"));
            if (firstHTML) window.switchFile(firstHTML);
            else if (allFiles.length > 0) window.switchFile(allFiles[0]);
        }

        if (typeof window.renderFileList === "function") window.renderFileList();
        window.dispatchEvent(new Event("projectsLoaded"));
        console.log("Web Code Studio: Loaded", allFiles.length, "file(s) from browser storage.");
    }

    function waitForEditor(callback) {

        if (window.editor && window.files) {

            callback();

            return;
        }

        window.addEventListener(
            "editorReady",
            callback,
            { once: true }
        );
    }

    checkServer();

    waitForEditor(async () => {

        await loadProjects();

        console.log("Web Code Studio đã sẵn sàng!");

    });

});
