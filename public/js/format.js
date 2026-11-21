(function () {
    "use strict";

    const btn = document.getElementById("formatCodeBtn");
    if (!btn) return;

    function hasTextModel() {
        const ed = window.editor;
        return !!(ed && typeof ed.getModel === "function" && ed.getModel());
    }

    function sync() {
        btn.disabled = !hasTextModel();
    }

    function toast(message, isError) {
        const el = document.getElementById("toast");
        if (!el) return;
        el.textContent = message;
        el.className = "toast show" + (isError ? " error" : "");
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
    }

    async function formatCode() {
        if (!hasTextModel()) return;

        const ed = window.editor;
        const selection = ed.getSelection();
        const hasSelection = !!selection && !selection.isEmpty();

        const action = ed.getAction(
            hasSelection ? "editor.action.formatSelection" : "editor.action.formatDocument"
        );

        if (!action || !action.isSupported()) {
            toast("File này chưa hỗ trợ định dạng code", true);
            return;
        }

        const before = ed.getValue();

        try {
            ed.focus();
            await action.run();
        } catch (error) {
            console.warn("Format code thất bại:", error);
            toast("Không thể định dạng code", true);
            return;
        }

        toast(ed.getValue() === before ? "Code đã gọn gàng sẵn" : "Đã định dạng code");
    }

    btn.addEventListener("click", formatCode);

    window.addEventListener("wcs:filechange", sync);
    window.addEventListener("projectsLoaded", sync);
    window.addEventListener("editorReady", sync);
    sync();
})();
