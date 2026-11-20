(function () {
    "use strict";

    const btn = document.getElementById("explorerMenuBtn");
    const menu = document.getElementById("explorerMenu");
    if (!btn || !menu) return;

    function isOpen() { return menu.classList.contains("open"); }

    function setOpen(open) {
        menu.classList.toggle("open", open);
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", event => {
        event.stopPropagation();
        setOpen(!isOpen());
    });

    menu.addEventListener("click", event => {
        if (event.target.closest("button")) setOpen(false);
    });

    document.addEventListener("mousedown", event => {
        if (isOpen() && !menu.contains(event.target) && !btn.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen()) {
            setOpen(false);
            btn.focus();
        }
    });
})();
