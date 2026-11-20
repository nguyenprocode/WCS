(function () {
    "use strict";

    const CONFIG = {
        width: 1366,
        height: 768,
        delay: 350
    };

    const preview = document.getElementById("preview");
    const viewport = document.getElementById("previewViewport");
    const screen = document.getElementById("previewScreen");
    const section = document.getElementById("previewSection");

    if (!preview || !viewport || !screen) {
        console.error("[WCS Preview] Không tìm thấy iframe hoặc container.");
        return;
    }

    let timer = null;
    let initialized = false;

    let previewPage = null;
    let currentHtml = "";

    let runCounter = 0;

    function announceRun(ready) {
        window.dispatchEvent(new CustomEvent("wcs:previewrun", {
            detail: { run: runCounter, ready: !!ready }
        }));
    }

    function normalizePath(path) {
        const parts = String(path || "")
            .replace(/\\/g, "/")
            .split("/");

        const result = [];

        for (const part of parts) {
            if (!part || part === ".") continue;

            if (part === "..") {
                result.pop();
            } else {
                result.push(part);
            }
        }

        return result.join("/");
    }

    function getFiles() {
        return window.files || {};
    }

    function getFileContent(filename) {
        const file = getFiles()[filename];

        if (typeof file === "string") {
            return file;
        }

        if (file && typeof file.getValue === "function") {
            return file.getValue();
        }

        return "";
    }

    function findFile(path) {
        const normalized = normalizePath(path);

        const files = getFiles();

        if (Object.prototype.hasOwnProperty.call(files, normalized)) {
            return normalized;
        }

        const lower = normalized.toLowerCase();
        const loose = Object.keys(files).filter(name => name.toLowerCase() === lower);

        return loose.length === 1 ? loose[0] : null;
    }

    function isHTML(name) {
        return /\.html?$/i.test(String(name || ""));
    }

    function getMainHTML() {
        const files = getFiles();
        const htmlFiles = Object.keys(files).filter(isHTML);

        if (
            previewPage &&
            Object.prototype.hasOwnProperty.call(files, previewPage)
        ) {
            return previewPage;
        }

        if (files["index.html"] !== undefined) {
            return "index.html";
        }

        return (
            htmlFiles.find(file => file.toLowerCase().endsWith("/index.html")) ||
            htmlFiles[0] ||
            null
        );
    }

    function resolveLocalPath(source, htmlFile) {

        if (!source) return null;

        source = source.trim();

        if (
            /^(https?:)?\/\//i.test(source) ||
            /^(data:|blob:|javascript:|mailto:|tel:)/i.test(source) ||
            source.startsWith("#")
        ) {
            return null;
        }

        const cleanSource = source
            .split("?")[0]
            .split("#")[0];

        if (!cleanSource) return null;

        const htmlDirectory = htmlFile.includes("/")
            ? htmlFile.substring(0, htmlFile.lastIndexOf("/") + 1)
            : "";

        const sources = [cleanSource];

        try {
            const decoded = decodeURIComponent(cleanSource);
            if (decoded !== cleanSource) sources.push(decoded);
        } catch (e) { }

        const candidates = [];

        sources.forEach(item => {
            candidates.push(
                item.startsWith("/")
                    ? normalizePath(item)
                    : normalizePath(htmlDirectory + item),
                normalizePath(item)
            );
        });

        for (const candidate of candidates) {
            const result = findFile(candidate);

            if (result) return result;
        }

        return null;
    }

    function isImageFile(name) {
        return typeof window.isImageFile === "function"
            ? window.isImageFile(name)
            : /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(String(name || ""));
    }

    function imageFileData(file) {
        const data = getFileContent(file);

        if (data.startsWith("data:")) return data;

        if (/\.svg$/i.test(file) && data.trim()) {
            return "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(data).replace(
                    /[!'()*]/g,
                    c => "%" + c.charCodeAt(0).toString(16).toUpperCase()
                );
        }

        return null;
    }

    function resolveImageData(source, baseFile) {
        const file = resolveLocalPath(source, baseFile);

        if (!file || !isImageFile(file)) return null;

        return imageFileData(file);
    }

    const CSS_IMPORT_PATTERN =
        /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*([^;]*);/gi;

    function buildCssFile(file, stack) {
        return inlineCssText(getFileContent(file), file, stack || [file]);
    }

    function inlineCssText(cssText, baseFile, stack) {
        let css = inlineCssUrls(cssText, baseFile);

        css = css.replace(
            CSS_IMPORT_PATTERN,
            (match, q1, urlSource, q2, quotedSource, conditions) => {
                const source = urlSource !== undefined && urlSource !== ""
                    ? urlSource
                    : quotedSource;

                const target = resolveLocalPath(source, baseFile);

                if (!target || !/\.css$/i.test(target)) return match;

                if (/\b(layer|supports)\b/i.test(conditions)) return match;

                if (stack.indexOf(target) !== -1 || stack.length > 20) {
                    return "/* @import vòng: " + target + " */";
                }

                const inner = buildCssFile(target, stack.concat(target));
                const media = conditions.trim();

                return media
                    ? "@media " + media + " {\n" + inner + "\n}\n"
                    : inner + "\n";
            }
        );

        return css;
    }

    function inlineCssUrls(cssText, baseFile) {
        return String(cssText)
            .replace(
                /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
                (match, quote, source) => {
                    const data = resolveImageData(source, baseFile);
                    return data ? `url("${data}")` : match;
                }
            )
            .replace(
                /((?:-webkit-)?image-set)\(((?:[^()]|\([^()]*\))*)\)/gi,
                (match, fn, inner) => fn + "(" + inner.replace(
                    /(['"])([^'"]+)\1/g,
                    (m, quote, source) => {
                        const data = resolveImageData(source, baseFile);
                        return data ? quote + data + quote : m;
                    }
                ) + ")"
            );
    }

    function inlineSrcset(value, baseFile) {
        if (/\bdata:/i.test(value)) return value;

        return value
            .split(",")
            .map(part => {
                const pieces = part.trim().split(/\s+/);
                const data = resolveImageData(pieces[0], baseFile);
                if (data) pieces[0] = data;
                return pieces.join(" ");
            })
            .join(", ");
    }

    function injectImages(doc, htmlFile) {

        const URL_ATTRS = [
            "src", "poster", "background",
            "data-src", "data-original", "data-background", "data-poster"
        ];

        const SRCSET_ATTRS = ["srcset", "imagesrcset", "data-srcset"];

        doc.querySelectorAll("*").forEach(element => {
            const tag = element.tagName.toLowerCase();
            const attrs = URL_ATTRS.slice();

            if (tag === "link" || tag === "image" || tag === "feimage") {
                attrs.push("href", "xlink:href");
            }

            if (tag === "object") attrs.push("data");

            attrs.forEach(attr => {
                if (!element.hasAttribute(attr)) return;

                const data = resolveImageData(element.getAttribute(attr), htmlFile);

                if (data) element.setAttribute(attr, data);
            });

            SRCSET_ATTRS.forEach(attr => {
                if (!element.hasAttribute(attr)) return;

                element.setAttribute(
                    attr,
                    inlineSrcset(element.getAttribute(attr), htmlFile)
                );
            });
        });

        doc.querySelectorAll("style:not([data-wcs-file])").forEach(style => {
            style.textContent = escapeStyleText(
                inlineCssText(style.textContent, htmlFile, [htmlFile])
            );
        });

        doc.querySelectorAll("[style]").forEach(element => {
            element.setAttribute(
                "style",
                inlineCssUrls(element.getAttribute("style"), htmlFile)
            );
        });
    }

    function escapeScriptText(code) {
        return String(code).replace(/<\/(script)/gi, "<\\/$1");
    }

    function escapeStyleText(css) {
        return String(css).replace(/<\/(style)/gi, "\\3C /$1");
    }

    function injectCSS(doc, htmlFile) {

        const links = Array.from(
            doc.querySelectorAll('link[rel~="stylesheet"]')
        );

        links.forEach(link => {

            const href = link.getAttribute("href");

            const file = resolveLocalPath(href, htmlFile);

            if (!file) return;

            const style = doc.createElement("style");

            style.setAttribute("data-wcs-file", file);

            style.textContent = escapeStyleText(buildCssFile(file));

            link.replaceWith(style);
        });
    }

    function injectJS(doc, htmlFile) {

        const scripts = Array.from(
            doc.querySelectorAll("script[src]")
        );

        scripts.forEach(oldScript => {

            const src = oldScript.getAttribute("src");

            const file = resolveLocalPath(src, htmlFile);

            if (!file) return;

            const script = doc.createElement("script");

            script.setAttribute("data-wcs-file", file);

            if (oldScript.type) {
                script.type = oldScript.type;
            }

            if ((oldScript.getAttribute("type") || "").toLowerCase() === "module") {

                registerModule(file);

                script.textContent = 'import "' + MODULE_SCHEME + file + '";';

            } else {

                script.textContent =
                    escapeScriptText(getFileContent(file)) + "\n//# sourceURL=" + file;
            }

            oldScript.replaceWith(script);
        });
    }

    const MODULE_SCHEME = "wcs://root/";

    const IMPORT_SPEC_PATTERNS = [
        /(\bfrom\s*)(["'])([^"'\n]+)\2/g,
        /(\bimport\s*)(["'])([^"'\n]+)\2/g,
        /(\bimport\s*\(\s*)(["'])([^"'\n]+)\2/g
    ];

    let moduleRegistry = new Map();

    function isRelativeSpecifier(spec) {
        return /^(\.\.?\/|\/(?!\/))/.test(spec);
    }

    function isModuleFile(name) {
        return /\.(m?js|json)$/i.test(String(name || ""));
    }

    function resolveModuleSpecifier(spec, fromFile) {
        const clean = spec.split("?")[0].split("#")[0];

        const directory = fromFile.includes("/")
            ? fromFile.substring(0, fromFile.lastIndexOf("/") + 1)
            : "";

        return findFile(
            normalizePath(clean.startsWith("/") ? clean : directory + clean)
        );
    }

    function toDataUrl(mime, text) {
        return "data:" + mime + ";charset=utf-8," + encodeURIComponent(text);
    }

    function rewriteModuleCode(code, fromFile) {
        let output = String(code);

        IMPORT_SPEC_PATTERNS.forEach(pattern => {
            output = output.replace(pattern, (match, before, quote, spec) => {
                if (!isRelativeSpecifier(spec)) return match;

                const target = resolveModuleSpecifier(spec, fromFile);

                if (!target || !isModuleFile(target)) return match;

                registerModule(target);

                return before + quote + MODULE_SCHEME + target + quote;
            });
        });

        return output;
    }

    function registerModule(file) {
        if (moduleRegistry.has(file)) return;

        moduleRegistry.set(file, null);

        const source = getFileContent(file);

        moduleRegistry.set(
            file,
            /\.json$/i.test(file)
                ? toDataUrl("application/json", source)
                : toDataUrl("text/javascript", rewriteModuleCode(source, file))
        );
    }

    function injectModules(doc, htmlFile) {

        doc.querySelectorAll('script[type="module"]:not([src])').forEach(script => {
            script.textContent = escapeScriptText(
                rewriteModuleCode(script.textContent, htmlFile)
            );
        });

        if (moduleRegistry.size === 0) return;

        const imports = {};

        moduleRegistry.forEach((url, file) => {
            imports[MODULE_SCHEME + file] = url;
        });

        const map = doc.createElement("script");
        map.setAttribute("type", "importmap");
        map.setAttribute("data-wcs-importmap", "true");
        map.textContent = safeJson({ imports });

        doc.head.prepend(map);
    }

    const PREVIEW_STORAGE_KEY = "wcs_preview_storage_v1";
    const PREVIEW_STORAGE_LIMIT = 512 * 1024;

    function safeJson(value) {
        return JSON.stringify(value)
            .replace(/</g, "\\u003c")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029");
    }

    function onlyStrings(object) {
        const result = {};

        if (!object || typeof object !== "object" || Array.isArray(object)) {
            return result;
        }

        Object.keys(object).forEach(key => {
            if (typeof object[key] === "string") result[key] = object[key];
        });

        return result;
    }

    function readPreviewStorage() {
        try {
            return onlyStrings(
                JSON.parse(localStorage.getItem(PREVIEW_STORAGE_KEY) || "{}")
            );
        } catch (error) {
            return {};
        }
    }

    function savePreviewStorage(data) {
        const clean = onlyStrings(data);
        const json = JSON.stringify(clean);

        if (json.length > PREVIEW_STORAGE_LIMIT) {
            console.warn("[WCS Preview] localStorage của preview vượt giới hạn, không lưu.");
            return;
        }

        try {
            localStorage.setItem(PREVIEW_STORAGE_KEY, json);
        } catch (error) {
            console.warn("[WCS Preview] Không thể lưu localStorage của preview:", error);
        }
    }

    function wcsRuntime(vfs, base, initialLocal, runId, images) {
        "use strict";

        const has = (path) => Object.prototype.hasOwnProperty.call(vfs, path);

        (function () {
            const MAX_MESSAGES = 2000;
            const MAX_NODES = 1500;
            const MAX_DEPTH = 3;
            const MAX_PROPS = 100;
            let sent = 0;
            let truncated = false;

            function post(payload, force) {
                if (!force) {
                    if (sent >= MAX_MESSAGES) {
                        if (!truncated) {
                            truncated = true;
                            parent.postMessage({ wcsConsole: { run: runId, kind: "log", level: "warn", args: [{ t: "string", v: "Console output truncated (quá nhiều dòng log)." }] } }, "*");
                        }
                        return;
                    }
                    sent++;
                }
                payload.run = runId;
                try { parent.postMessage({ wcsConsole: payload }, "*"); } catch (e) { }
            }

            function className(v) {
                try {
                    const c = v.constructor;
                    return (c && c.name) || (Object.getPrototypeOf(v) === null ? "Object: null prototype" : "Object");
                } catch (e) { return "Object"; }
            }

            function nodePreview(n) {
                if (n.nodeType === 1) {
                    let s = "<" + n.localName;
                    if (n.id) s += ' id="' + n.id + '"';
                    const cls = n.getAttribute && n.getAttribute("class");
                    if (cls) s += ' class="' + cls + '"';
                    return s + ">";
                }
                if (n.nodeType === 3) return '#text "' + String(n.nodeValue).slice(0, 60) + '"';
                if (n.nodeType === 9) return "#document";
                return "#" + String(n.nodeName).toLowerCase();
            }

            function ser(v, depth, stack, budget) {
                const t = typeof v;
                if (v === null) return { t: "null" };
                if (t === "undefined") return { t: "undefined" };
                if (t === "string") return { t: "string", v: v.length > 10000 ? v.slice(0, 10000) + "…" : v };
                if (t === "number") return { t: "number", v: Object.is(v, -0) ? "-0" : String(v) };
                if (t === "boolean") return { t: "boolean", v: String(v) };
                if (t === "bigint") return { t: "bigint", v: String(v) + "n" };
                if (t === "symbol") return { t: "symbol", v: String(v) };

                if (t === "function") {
                    let src = "";
                    try { src = Function.prototype.toString.call(v); } catch (e) { }
                    const isClass = /^class\b/.test(src);
                    const m = src.match(/^(?:async\s+)?(?:function\s*\*?\s*[\w$]*)?\s*\(([^)]*)\)/);
                    return { t: "function", name: v.name || "", isClass: isClass, params: m ? m[1].replace(/\s+/g, " ").trim() : "" };
                }

                if (stack.indexOf(v) !== -1) return { t: "circular" };
                if (budget.n-- <= 0) return { t: "object", cls: "…", props: null, size: null };

                try {
                    if (v instanceof Error) {
                        return { t: "error", name: String(v.name), message: String(v.message), stack: String(v.stack || "") };
                    }
                    if (typeof Node !== "undefined" && v instanceof Node) {
                        let html = "";
                        try { html = v.nodeType === 1 ? v.outerHTML : String(v.textContent || ""); } catch (e) { }
                        return { t: "node", preview: nodePreview(v), html: html.slice(0, 4000) };
                    }
                    if (v instanceof Date) {
                        return { t: "date", v: isNaN(v) ? "Invalid Date" : v.toISOString() };
                    }
                    if (v instanceof RegExp) return { t: "regexp", v: String(v) };

                    const cls = className(v);
                    const nextStack = stack.concat([v]);
                    const out = { t: "object", cls: cls, props: [], more: 0, size: null };
                    const canExpand = depth < MAX_DEPTH;

                    let entries = [];

                    if (Array.isArray(v) || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(v) && !(v instanceof DataView))) {
                        out.isArray = true;
                        out.size = v.length;
                        const n = Math.min(v.length, MAX_PROPS);
                        for (let i = 0; i < n; i++) entries.push([String(i), v[i]]);
                        out.more = v.length - n;
                    } else if (v instanceof Map) {
                        out.size = v.size;
                        out.isMap = true;
                        let i = 0;
                        v.forEach(function (val, key) {
                            if (i++ >= MAX_PROPS) { out.more++; return; }
                            const k = key !== null && (typeof key === "object" || typeof key === "function") ? "Object#" + (i - 1) : (typeof key === "string" ? JSON.stringify(key) : String(key));
                            entries.push([k, val]);
                        });
                    } else if (v instanceof Set) {
                        out.size = v.size;
                        out.isSet = true;
                        let i = 0;
                        v.forEach(function (val) {
                            if (i++ >= MAX_PROPS) { out.more++; return; }
                            entries.push([String(i - 1), val]);
                        });
                    } else if (typeof Promise !== "undefined" && v instanceof Promise) {
                        out.props = null;
                        return out;
                    } else {
                        const keys = Object.keys(v);
                        const n = Math.min(keys.length, MAX_PROPS);
                        out.more = keys.length - n;
                        out.size = null;
                        for (let i = 0; i < n; i++) {
                            const k = keys[i];
                            let desc = null;
                            try { desc = Object.getOwnPropertyDescriptor(v, k); } catch (e) { }
                            if (desc && desc.get && !("value" in desc)) {
                                entries.push([k, { __getter: true }]);
                            } else {
                                let val;
                                try { val = v[k]; } catch (e) { val = "[Thrown: " + e + "]"; }
                                entries.push([k, val]);
                            }
                        }
                    }

                    if (!canExpand) {
                        out.props = entries.slice(0, 5).map(function (e) {
                            return [e[0], e[1] && e[1].__getter ? { t: "getter" } : ser(e[1], depth + 1, nextStack, budget)];
                        });
                        out.more += Math.max(0, entries.length - 5);
                        out.shallow = true;
                        return out;
                    }

                    out.props = entries.map(function (e) {
                        return [e[0], e[1] && e[1].__getter ? { t: "getter" } : ser(e[1], depth + 1, nextStack, budget)];
                    });
                    return out;
                } catch (e) {
                    return { t: "string", v: "[Không thể hiển thị: " + e + "]" };
                }
            }

            function serialize(v) {
                return ser(v, 0, [], { n: MAX_NODES });
            }

            function format(args) {
                if (typeof args[0] !== "string" || args[0].indexOf("%") === -1 || args.length < 2) return args;

                let i = 1;
                const text = args[0].replace(/%([sdifoOjc%])/g, function (match, type) {
                    if (type === "%") return "%";
                    if (i >= args.length) return match;
                    const value = args[i++];
                    switch (type) {
                        case "s": return typeof value === "object" && value !== null ? safeText(value) : String(value);
                        case "d":
                        case "i": return typeof value === "object" ? "NaN" : String(type === "i" ? parseInt(value, 10) : Number(value));
                        case "f": return String(parseFloat(value));
                        case "c": return "";
                        default: return safeText(value);
                    }
                });

                return [text].concat(args.slice(i));
            }

            function safeText(v) {
                try { return typeof v === "string" ? v : JSON.stringify(v); } catch (e) { return String(v); }
            }

            function emit(level, args, extra) {
                const payload = { kind: "log", level: level, args: format(args).map(serialize) };
                if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
                post(payload);
            }

            const counts = Object.create(null);
            const timers = Object.create(null);
            const c = window.console;

            function wrap(name, handler) {
                const original = c[name];
                c[name] = function () {
                    try { handler.apply(null, arguments); } catch (e) { }
                    if (typeof original === "function") {
                        try { return original.apply(c, arguments); } catch (e) { }
                    }
                };
            }

            ["log", "info", "warn", "error", "debug"].forEach(function (name) {
                wrap(name, function () { emit(name, Array.prototype.slice.call(arguments)); });
            });

            wrap("dir", function (v) { emit("log", [v]); });
            wrap("dirxml", function (v) { emit("log", [v]); });
            wrap("trace", function () {
                const stack = String(new Error().stack || "").split("\n").slice(2).join("\n");
                emit("log", Array.prototype.slice.call(arguments).concat(["\n" + stack]));
            });
            wrap("assert", function (cond) {
                if (cond) return;
                const rest = Array.prototype.slice.call(arguments, 1);
                emit("error", ["Assertion failed:"].concat(rest));
            });
            wrap("clear", function () { post({ kind: "clear" }, true); });
            wrap("count", function (label) {
                label = label === undefined ? "default" : String(label);
                counts[label] = (counts[label] || 0) + 1;
                emit("log", [label + ": " + counts[label]]);
            });
            wrap("countReset", function (label) { counts[label === undefined ? "default" : String(label)] = 0; });
            wrap("time", function (label) { timers[label === undefined ? "default" : String(label)] = performance.now(); });
            wrap("timeLog", function (label) {
                label = label === undefined ? "default" : String(label);
                if (!(label in timers)) return emit("warn", ["Timer '" + label + "' không tồn tại"]);
                emit("log", [label + ": " + (performance.now() - timers[label]).toFixed(3) + " ms"].concat(Array.prototype.slice.call(arguments, 1)));
            });
            wrap("timeEnd", function (label) {
                label = label === undefined ? "default" : String(label);
                if (!(label in timers)) return emit("warn", ["Timer '" + label + "' không tồn tại"]);
                emit("log", [label + ": " + (performance.now() - timers[label]).toFixed(3) + " ms"]);
                delete timers[label];
            });
            wrap("group", function () {
                post({ kind: "group", args: format(Array.prototype.slice.call(arguments)).map(serialize) });
            });
            wrap("groupCollapsed", function () {
                post({ kind: "group", args: format(Array.prototype.slice.call(arguments)).map(serialize) });
            });
            wrap("groupEnd", function () { post({ kind: "groupEnd" }); });

            wrap("table", function (data, columns) {
                if (data === null || typeof data !== "object") return emit("log", [data]);

                const rowKeys = [];
                const rows = [];

                if (data instanceof Map) {
                    let i = 0;
                    data.forEach(function (val, key) { rowKeys.push(String(i++)); rows.push({ k: key, v: val, map: true }); });
                } else if (data instanceof Set) {
                    let i = 0;
                    data.forEach(function (val) { rowKeys.push(String(i++)); rows.push(val); });
                } else {
                    Object.keys(data).slice(0, MAX_PROPS).forEach(function (k) { rowKeys.push(k); rows.push(data[k]); });
                }

                const cols = [];
                let hasValue = false;

                const cells = rows.map(function (row) {
                    const cell = {};
                    if (row && row.map === true) {
                        cell["Key"] = row.k; row = row.v;
                        if (cols.indexOf("Key") === -1) cols.push("Key");
                    }
                    if (row !== null && typeof row === "object" && !(row instanceof Date)) {
                        Object.keys(row).forEach(function (k) {
                            if (Array.isArray(columns) && columns.indexOf(k) === -1) return;
                            if (cols.indexOf(k) === -1 && cols.length < 25) cols.push(k);
                            cell[k] = row[k];
                        });
                    } else {
                        hasValue = true;
                        cell["\u0000value"] = row;
                    }
                    return cell;
                });

                post({
                    kind: "table",
                    index: rowKeys,
                    cols: cols,
                    hasValue: hasValue,
                    cells: cells.map(function (cell) {
                        const out = {};
                        Object.keys(cell).forEach(function (k) { out[k] = serialize(cell[k]); });
                        return out;
                    })
                });
            });

            function scriptLine(file, line) {
                try {
                    const nodes = document.querySelectorAll("script[data-wcs-file]");
                    for (let i = 0; i < nodes.length; i++) {
                        if (nodes[i].getAttribute("data-wcs-file") !== file) continue;

                        const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
                        const index = html.indexOf(nodes[i].textContent.slice(0, 200));
                        if (index === -1) return line;

                        const start = (html.slice(0, index).match(/\n/g) || []).length + 1;
                        return line >= start ? line - start + 1 : line;
                    }
                } catch (e) { }

                return line;
            }

            window.addEventListener("error", function (event) {
                const target = event.target;

                if (target && target !== window && target.tagName) {
                    const src = target.currentSrc || target.src || target.href || "";
                    const wrote = target.getAttribute && (target.getAttribute("src") || target.getAttribute("href"));
                    let message = "Failed to load <" + target.tagName.toLowerCase() + "> " + src;

                    if (wrote && String(target.tagName).toLowerCase() === "img" && !/^(data:|blob:|https?:|\/\/)/i.test(wrote)) {
                        const name = String(wrote).split(/[?#]/)[0].split("/").pop().toLowerCase();
                        const similar = Object.keys(images || {}).filter(key => key.split("/").pop().toLowerCase() === name);

                        message = "Không tìm thấy ảnh \"" + wrote + "\" trong project." +
                            (similar.length
                                ? " Có file cùng tên: " + similar.join(", ")
                                : " Hãy kiểm tra đường dẫn / tên file, và ảnh đã được tải lên project chưa.");
                    }

                    post({ kind: "log", level: "error", args: [{ t: "string", v: message }] });
                    return;
                }

                const err = event.error;
                const hasStack = err instanceof Error && /\n\s+at /.test(String(err.stack || ""));

                post({
                    kind: "log",
                    level: "error",
                    uncaught: true,
                    args: [err instanceof Error
                        ? serialize(err)
                        : { t: "string", v: "Uncaught " + (event.message || "Error") }],
                    loc: event.filename && !hasStack
                        ? { file: String(event.filename), line: scriptLine(String(event.filename), event.lineno), col: event.colno }
                        : null
                });
            }, true);

            window.addEventListener("unhandledrejection", function (event) {
                post({
                    kind: "log",
                    level: "error",
                    uncaught: true,
                    args: [{ t: "string", v: "Uncaught (in promise)" }, serialize(event.reason)]
                });
            });

            function runCode(code) {
                const source = String(code).replace(/^(\s*)(?:const|let)\s+(?=[A-Za-z_$\[{])/gm, "$1var ");
                const indirect = eval;

                try {
                    return indirect(source);
                } catch (error) {
                    if (error instanceof SyntaxError && /\bawait\b/.test(source)) {
                        try {
                            return indirect("(async () => (" + source.replace(/;\s*$/, "") + "\n))()");
                        } catch (e1) {
                            return indirect("(async () => {\n" + source + "\n})()");
                        }
                    }
                    throw error;
                }
            }

            window.addEventListener("message", function (event) {
                if (event.source !== parent) return;

                const request = event.data && event.data.wcsEval;
                if (!request || typeof request.code !== "string") return;

                const id = request.id;

                function reply(ok, value) {
                    post({ kind: "result", id: id, ok: ok, value: serialize(value), isPromise: false }, true);
                }

                let result;

                try {
                    result = runCode(request.code);
                } catch (error) {
                    return reply(false, error);
                }

                if (result && typeof result.then === "function" && typeof Promise !== "undefined" && result instanceof Promise) {
                    post({ kind: "result", id: id, ok: true, pending: true, value: { t: "string", v: "Promise {<pending>}" } }, true);
                    result.then(
                        function (value) { post({ kind: "result", id: id, ok: true, resolved: true, value: serialize(value) }, true); },
                        function (error) { post({ kind: "result", id: id, ok: false, resolved: true, value: serialize(error) }, true); }
                    );
                    return;
                }

                reply(true, result);
            });

            post({ kind: "ready" }, true);
        })();

        function localPath(url) {
            url = String(url);

            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.indexOf("//") === 0) return null;

            url = url.split("#")[0].split("?")[0];

            const absolute = url.charAt(0) === "/";
            const parts = ((absolute ? "" : base) + url).split("/");
            const out = [];

            for (const part of parts) {
                if (!part || part === ".") continue;
                if (part === "..") out.pop();
                else out.push(part);
            }

            return out.join("/");
        }

        function mimeOf(path) {
            const ext = path.split(".").pop().toLowerCase();
            return {
                json: "application/json",
                css: "text/css",
                js: "text/javascript",
                mjs: "text/javascript",
                html: "text/html"
            }[ext] || "text/plain";
        }

        const imageKeys = Object.keys(images || {});
        const imageLower = Object.create(null);

        imageKeys.forEach(key => { imageLower[key.toLowerCase()] = key; });

        function lookupImage(url) {
            if (url === null || url === undefined || imageKeys.length === 0) return null;

            const path = localPath(String(url).trim());

            if (!path) return null;

            const tries = [path];

            try { tries.push(decodeURIComponent(path)); } catch (e) { }

            for (const item of tries) {
                if (Object.prototype.hasOwnProperty.call(images, item)) return images[item];

                const loose = imageLower[item.toLowerCase()];

                if (loose) return images[loose];
            }

            return null;
        }

        function rewriteSrc(value) {
            const data = lookupImage(value);
            return data === null ? value : data;
        }

        function rewriteSrcset(value) {
            const text = String(value);

            if (/\bdata:/i.test(text)) return value;

            return text.split(",").map(part => {
                const pieces = part.trim().split(/\s+/);
                const data = lookupImage(pieces[0]);

                if (data) pieces[0] = data;

                return pieces.join(" ");
            }).join(", ");
        }

        function rewriteCss(value) {
            return String(value).replace(
                /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
                (match, quote, source) => {
                    const data = lookupImage(source);
                    return data ? 'url("' + data + '")' : match;
                }
            );
        }

        if (typeof window.fetch === "function") {
            const originalFetch = window.fetch;

            window.fetch = function (input) {
                if (typeof input === "string") {
                    const imageData = lookupImage(input);

                    if (imageData) return originalFetch.call(this, imageData);

                    const path = localPath(input);

                    if (path !== null) {
                        if (has(path)) {
                            return Promise.resolve(new Response(vfs[path], {
                                status: 200,
                                headers: { "Content-Type": mimeOf(path) + "; charset=utf-8" }
                            }));
                        }

                        return Promise.resolve(new Response("Not found: " + path, {
                            status: 404,
                            statusText: "Not Found"
                        }));
                    }
                }

                return originalFetch.apply(this, arguments);
            };
        }

        if (window.XMLHttpRequest) {
            const originalOpen = XMLHttpRequest.prototype.open;

            XMLHttpRequest.prototype.open = function (method, url) {
                const args = Array.prototype.slice.call(arguments);

                if (typeof url === "string") {
                    const path = localPath(url);
                    const imageData = lookupImage(url);

                    if (imageData) {
                        args[1] = imageData;
                    } else if (path !== null && has(path)) {
                        args[1] = "data:" + mimeOf(path) + ";charset=utf-8," + encodeURIComponent(vfs[path]);
                    }
                }

                return originalOpen.apply(this, args);
            };
        }

        if (imageKeys.length > 0) {
            const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

            const URL_ATTRS = {
                "src": 1, "poster": 1, "background": 1,
                "data-src": 1, "data-original": 1, "data-background": 1, "data-poster": 1
            };

            function mapAttr(element, name, value) {
                const attr = String(name).toLowerCase();
                const tag = String(element.localName || "").toLowerCase();

                if (hasOwn(URL_ATTRS, attr)) return rewriteSrc(value);
                if (attr === "data" && tag === "object") return rewriteSrc(value);

                if (attr === "srcset" || attr === "imagesrcset" || attr === "data-srcset") {
                    return rewriteSrcset(value);
                }

                if (
                    (attr === "href" || attr === "xlink:href") &&
                    (tag === "image" || tag === "feimage" || tag === "link")
                ) {
                    return rewriteSrc(value);
                }

                if (attr === "style") return rewriteCss(value);

                return value;
            }

            const originalSetAttribute = Element.prototype.setAttribute;
            const originalSetAttributeNS = Element.prototype.setAttributeNS;

            Element.prototype.setAttribute = function (name, value) {
                try { value = mapAttr(this, name, value); } catch (e) { }
                return originalSetAttribute.call(this, name, value);
            };

            Element.prototype.setAttributeNS = function (ns, name, value) {
                try { value = mapAttr(this, name, value); } catch (e) { }
                return originalSetAttributeNS.call(this, ns, name, value);
            };

            function patchSetter(proto, prop, convert) {
                const desc = proto && Object.getOwnPropertyDescriptor(proto, prop);

                if (!desc || !desc.set || !desc.configurable) return;

                Object.defineProperty(proto, prop, {
                    configurable: true,
                    enumerable: desc.enumerable,
                    get: desc.get,
                    set: function (value) {
                        try { value = convert(value); } catch (e) { }
                        desc.set.call(this, value);
                    }
                });
            }

            patchSetter(window.HTMLImageElement && HTMLImageElement.prototype, "src", rewriteSrc);
            patchSetter(window.HTMLImageElement && HTMLImageElement.prototype, "srcset", rewriteSrcset);
            patchSetter(window.HTMLSourceElement && HTMLSourceElement.prototype, "src", rewriteSrc);
            patchSetter(window.HTMLSourceElement && HTMLSourceElement.prototype, "srcset", rewriteSrcset);
            patchSetter(window.HTMLVideoElement && HTMLVideoElement.prototype, "poster", rewriteSrc);
            patchSetter(window.HTMLInputElement && HTMLInputElement.prototype, "src", rewriteSrc);
            patchSetter(window.HTMLEmbedElement && HTMLEmbedElement.prototype, "src", rewriteSrc);
            patchSetter(window.HTMLObjectElement && HTMLObjectElement.prototype, "data", rewriteSrc);
            patchSetter(window.HTMLLinkElement && HTMLLinkElement.prototype, "href", rewriteSrc);

            if (window.CSSStyleDeclaration) {
                [
                    "background", "backgroundImage", "listStyle", "listStyleImage",
                    "borderImage", "borderImageSource", "maskImage", "webkitMaskImage",
                    "mask", "content", "cssText"
                ].forEach(prop => patchSetter(CSSStyleDeclaration.prototype, prop, rewriteCss));

                const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;

                CSSStyleDeclaration.prototype.setProperty = function (prop, value, priority) {
                    if (typeof value === "string") value = rewriteCss(value);
                    return originalSetProperty.call(this, prop, value, priority);
                };
            }

            if (window.CSSStyleSheet) {
                const originalInsertRule = CSSStyleSheet.prototype.insertRule;

                CSSStyleSheet.prototype.insertRule = function (rule, index) {
                    return originalInsertRule.call(this, rewriteCss(rule), index);
                };

                ["replace", "replaceSync"].forEach(method => {
                    const original = CSSStyleSheet.prototype[method];

                    if (typeof original !== "function") return;

                    CSSStyleSheet.prototype[method] = function (text) {
                        return original.call(this, rewriteCss(text));
                    };
                });
            }

            function fixElement(element) {
                if (!element || element.nodeType !== 1 || !element.attributes) return;

                Array.prototype.slice.call(element.attributes).forEach(attribute => {
                    const next = mapAttr(element, attribute.name, attribute.value);

                    if (next !== attribute.value) {
                        originalSetAttribute.call(element, attribute.name, next);
                    }
                });
            }

            function fixTree(node) {
                if (!node || node.nodeType !== 1) return;

                fixElement(node);

                if (node.querySelectorAll) {
                    node.querySelectorAll("*").forEach(fixElement);
                }
            }

            if (window.MutationObserver) {
                new MutationObserver(records => {
                    records.forEach(record => {
                        if (record.type === "attributes") {
                            fixElement(record.target);
                        } else {
                            record.addedNodes.forEach(fixTree);
                        }
                    });
                }).observe(document, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    attributeFilter: [
                        "src", "srcset", "poster", "background", "style", "href", "xlink:href",
                        "data", "data-src", "data-srcset", "data-original", "data-background"
                    ]
                });
            }
        }

        function createStorage(initial, onChange) {
            const data = Object.create(null);

            Object.keys(initial || {}).forEach(key => { data[key] = String(initial[key]); });

            const api = {
                getItem(key) {
                    key = String(key);
                    return key in data ? data[key] : null;
                },
                setItem(key, value) {
                    data[String(key)] = String(value);
                    onChange(data);
                },
                removeItem(key) {
                    delete data[String(key)];
                    onChange(data);
                },
                clear() {
                    Object.keys(data).forEach(key => { delete data[key]; });
                    onChange(data);
                },
                key(index) {
                    const keys = Object.keys(data);
                    return index >= 0 && index < keys.length ? keys[index] : null;
                }
            };

            return new Proxy(api, {
                get(target, prop) {
                    if (prop === "length") return Object.keys(data).length;
                    if (typeof prop === "string" && prop in data) return data[prop];
                    if (prop in api) return api[prop];
                    return undefined;
                },
                set(target, prop, value) {
                    if (typeof prop === "string") {
                        data[prop] = String(value);
                        onChange(data);
                    }
                    return true;
                },
                deleteProperty(target, prop) {
                    if (typeof prop === "string" && prop in data) {
                        delete data[prop];
                        onChange(data);
                    }
                    return true;
                },
                has(target, prop) {
                    return (typeof prop === "string" && prop in data) || prop in api;
                },
                ownKeys() {
                    return Object.keys(data);
                },
                getOwnPropertyDescriptor(target, prop) {
                    if (typeof prop === "string" && prop in data) {
                        return { value: data[prop], enumerable: true, configurable: true, writable: true };
                    }
                    return undefined;
                }
            });
        }

        let pending = false;

        const local = createStorage(initialLocal, data => {
            if (pending) return;
            pending = true;

            Promise.resolve().then(() => {
                pending = false;
                parent.postMessage({ wcsStorage: Object.assign({}, data) }, "*");
            });
        });

        const session = createStorage({}, () => {});

        try {
            Object.defineProperty(window, "localStorage", { configurable: true, get: () => local });
            Object.defineProperty(window, "sessionStorage", { configurable: true, get: () => session });
        } catch (error) {
            console.warn("[WCS Preview] Không thể giả lập localStorage:", error);
        }
    }

    function injectRuntime(doc, htmlFile) {
        const vfs = {};
        const images = {};
        let imageBytes = 0;

        Object.keys(getFiles()).forEach(name => {
            if (isImageFile(name)) {
                const data = imageFileData(name);

                if (data) {
                    images[name] = data;
                    imageBytes += data.length;
                }

                return;
            }

            vfs[name] = getFileContent(name);
        });

        if (imageBytes > 4 * 1024 * 1024) {
            const source = Object.keys(vfs)
                .filter(name => /\.(m?js|html?)$/i.test(name))
                .map(name => vfs[name])
                .join("\n")
                .toLowerCase();

            Object.keys(images).forEach(name => {
                const fileName = name.split("/").pop().toLowerCase();

                if (!source.includes(fileName)) delete images[name];
            });
        }

        const base = htmlFile.includes("/")
            ? htmlFile.substring(0, htmlFile.lastIndexOf("/") + 1)
            : "";

        const script = doc.createElement("script");
        script.setAttribute("data-wcs-runtime", "true");
        script.textContent =
            "(" + wcsRuntime.toString() + ")(" +
            safeJson(vfs) + "," +
            safeJson(base) + "," +
            safeJson(readPreviewStorage()) + "," +
            safeJson(runCounter) + "," +
            safeJson(images) + ");";

        doc.head.prepend(script);
    }

    function wcsNavigation() {
        "use strict";

        function scrollToHash(hash) {
            var id = String(hash || "").replace(/^#/, "");

            try { id = decodeURIComponent(id); } catch (e) { }

            var target = null;

            if (id) {
                target = document.getElementById(id);

                if (!target) {
                    var named = document.getElementsByName(id);
                    for (var i = 0; i < named.length; i++) {
                        if (named[i].tagName === "A") { target = named[i]; break; }
                    }
                }
            }

            if (target) {
                target.scrollIntoView();
            } else if (!id || id.toLowerCase() === "top") {
                window.scrollTo(0, 0);
            }
        }

        document.addEventListener("click", function (event) {
            if (event.defaultPrevented) return;

            var link = event.target.closest && event.target.closest("a[href], area[href]");
            if (!link) return;

            var href = link.getAttribute("href");
            if (!href) return;

            if (href.charAt(0) === "#") {
                event.preventDefault();
                scrollToHash(href);
                return;
            }

            if (link.hasAttribute("download") && !/^(https?:)?\/\//i.test(href) &&
                !/^(mailto:|tel:|javascript:)/i.test(href)) {
                event.preventDefault();
                parent.postMessage({
                    wcsDownload: href,
                    wcsDownloadName: link.getAttribute("download") || ""
                }, "*");
                return;
            }

            if (/^(https?:)?\/\//i.test(href)) {
                event.preventDefault();
                parent.postMessage({ wcsOpenExternal: href }, "*");
                return;
            }

            if (/^(mailto:|tel:|javascript:|data:|blob:)/i.test(href)) return;

            event.preventDefault();
            parent.postMessage({ wcsNavigate: href }, "*");
        });

        document.addEventListener("submit", function (event) {
            if (!event.defaultPrevented) event.preventDefault();
        });
    }

    function injectNavigation(doc) {
        const script = doc.createElement("script");
        script.setAttribute("data-wcs-navigation", "true");
        script.textContent = "(" + wcsNavigation.toString() + ")();";
        doc.body.appendChild(script);
    }

    const LOCAL_SANDBOX = "allow-scripts allow-forms allow-modals";

    const EXTERNAL_SANDBOX =
        "allow-scripts allow-forms allow-modals allow-same-origin allow-popups allow-popups-to-escape-sandbox";

    function showLocalDocument(html) {
        preview.setAttribute("sandbox", LOCAL_SANDBOX);
        preview.srcdoc = html;
    }

    function openExternalInPreview(url) {
        if (url.origin === window.location.origin) {
            window.open(url.href, "_blank", "noopener,noreferrer");
            return;
        }

        preview.setAttribute("sandbox", EXTERNAL_SANDBOX);
        preview.removeAttribute("srcdoc");
        preview.src = url.href;
        updatePageLabel(url.href);
    }

    window.addEventListener("message", event => {
        if (event.source !== preview.contentWindow) return;

        if (event.data && typeof event.data.wcsStorage === "object") {
            savePreviewStorage(event.data.wcsStorage);
            return;
        }

        const external = event.data && event.data.wcsOpenExternal;

        if (typeof external === "string") {
            try {
                const url = new URL(external.indexOf("//") === 0 ? "https:" + external : external);
                if (url.protocol === "http:" || url.protocol === "https:") {
                    openExternalInPreview(url);
                }
            } catch (e) { }
            return;
        }

        const download = event.data && event.data.wcsDownload;

        if (typeof download === "string") {
            downloadProjectFile(download, event.data.wcsDownloadName);
            return;
        }

        const href = event.data && event.data.wcsNavigate;
        if (typeof href !== "string") return;

        const file = resolveLocalPath(href, currentHtml);

        if (file && isHTML(file)) {
            previewPage = file;
            runPreview();
            return;
        }

        if (file && isImageFile(file)) {
            const data = imageFileData(file);

            if (data) showImageViewer(file, data);
        }
    });

    async function downloadProjectFile(href, suggestedName) {
        let blob;
        let name = String(suggestedName || "").trim();

        try {
            if (/^data:/i.test(href)) {
                blob = await (await fetch(href)).blob();
            } else {
                const file = resolveLocalPath(href, currentHtml);
                if (!file) return;

                const content = getFileContent(file);

                blob = content.startsWith("data:")
                    ? await (await fetch(content)).blob()
                    : new Blob([content], { type: "text/plain;charset=utf-8" });

                if (!name) name = file.split("/").pop();
            }
        } catch (e) {
            console.error("[WCS Download Error]", e);
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = name || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function showImageViewer(file, data) {
        const safeName = String(file).replace(/[&<>"]/g, c =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
        );

        showLocalDocument(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${safeName}</title>
<style>
html,body{margin:0;height:100%;background:#0e0e0e;}
body{display:flex;align-items:center;justify-content:center;}
img{max-width:100%;max-height:100%;object-fit:contain;}
a{position:fixed;top:10px;left:10px;color:#fff;background:#0009;padding:6px 12px;
border-radius:6px;font:14px Arial,sans-serif;text-decoration:none;}
</style></head><body>
<a href="#" onclick="parent.postMessage({wcsNavigate:${JSON.stringify(String(currentHtml || "")).replace(/</g, "\\u003c").replace(/"/g, "&quot;")}},'*');return false;">&larr; Quay lại</a>
<img src="${data}" alt="${safeName}">
</body></html>`);

        updatePageLabel(file);
    }

    function updatePageLabel(htmlFile) {
        const header = section && section.querySelector(".preview-header > span");
        if (!header) return;

        let label = header.querySelector(".preview-page-label");

        if (!label) {
            label = document.createElement("span");
            label.className = "preview-page-label";
            label.style.cssText =
                "margin-left:10px;font-weight:400;letter-spacing:0;" +
                "text-transform:none;opacity:.6;";
            header.appendChild(label);
        }

        label.textContent = htmlFile || "";
    }

    function showMessage(title, description) {

        runCounter++;
        announceRun(false);

        showLocalDocument(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: grid;
                        place-items: center;
                        background: #111827;
                        color: #e5e7eb;
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }

                    h2 {
                        color: #38bdf8;
                    }

                    p {
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
                <div>
                    <h2>${title}</h2>
                    <p>${description}</p>
                </div>
            </body>
            </html>
        `);
    }

    function createPreview() {

        const htmlFile = getMainHTML();

        if (!htmlFile) {
            currentHtml = "";
            previewPage = null;
            updatePageLabel("");
            showMessage(
                "No HTML file found",
                "Hãy tạo file index.html để bắt đầu."
            );
            return;
        }

        currentHtml = htmlFile;
        updatePageLabel(htmlFile);

        const html = getFileContent(htmlFile);

        if (!html.trim()) {
            showMessage(
                "HTML file is empty",
                "File HTML hiện đang trống."
            );
            return;
        }

        const parser = new DOMParser();

        const doc = parser.parseFromString(
            html,
            "text/html"
        );

        if (!doc.querySelector("meta[charset]")) {

            const charset = doc.createElement("meta");

            charset.setAttribute("charset", "UTF-8");

            doc.head.prepend(charset);
        }

        let viewportMeta = doc.querySelector(
            'meta[name="viewport"]'
        );

        if (!viewportMeta) {

            viewportMeta = doc.createElement("meta");

            doc.head.appendChild(viewportMeta);
        }

        viewportMeta.setAttribute(
            "content",
            `width=${CONFIG.width}, initial-scale=1.0`
        );

        const defaults = doc.createElement("style");

        defaults.setAttribute("data-wcs-default", "true");
        defaults.textContent =
            ":where(img,video,picture,canvas){max-width:100%;height:auto;}";

        const charsetMeta = doc.querySelector("meta[charset]");

        if (charsetMeta && charsetMeta.parentNode === doc.head) {
            doc.head.insertBefore(defaults, charsetMeta.nextSibling);
        } else {
            doc.head.prepend(defaults);
        }

        moduleRegistry = new Map();

        runCounter++;
        announceRun(true);

        injectCSS(doc, htmlFile);

        injectJS(doc, htmlFile);

        injectImages(doc, htmlFile);

        injectModules(doc, htmlFile);

        injectRuntime(doc, htmlFile);

        injectNavigation(doc);

        const output =
            "<!DOCTYPE html>\n" +
            doc.documentElement.outerHTML;

        showLocalDocument(output);
    }

    function runPreview() {

        try {
            createPreview();
        } catch (error) {

            console.error("[WCS Preview Error]", error);

            showMessage(
                "Preview Error",
                error.message || "Không thể chạy website."
            );
        }
    }

    function schedulePreview() {

        clearTimeout(timer);

        timer = setTimeout(() => {
            runPreview();
        }, CONFIG.delay);
    }

    function resizePreview() {

        if (
            section &&
            section.classList.contains("preview-hidden")
        ) {
            return;
        }

        const availableWidth = viewport.clientWidth;

        if (!availableWidth) return;

        const scale = Math.min(
            availableWidth / CONFIG.width,
            1
        );

        const scaledHeight = CONFIG.height * scale;

        screen.style.width = CONFIG.width + "px";
        screen.style.height = CONFIG.height + "px";

        screen.style.transformOrigin = "top left";
        screen.style.transform = `scale(${scale})`;

        screen.style.marginLeft =
            Math.max(0, (availableWidth - CONFIG.width * scale) / 2) + "px";

        screen.style.marginRight = "0";

        screen.style.marginBottom =
            (scaledHeight - CONFIG.height) + "px";

        preview.style.width = "100%";
        preview.style.height = "100%";
        preview.style.display = "block";
        preview.style.border = "none";

        viewport.style.overflowX = "hidden";
        viewport.style.overflowY = "auto";
    }

    window.addEventListener("wcs:filechange", event => {
        const name = event.detail && event.detail.filename;

        if (
            name &&
            isHTML(name) &&
            Object.prototype.hasOwnProperty.call(getFiles(), name)
        ) {
            previewPage = name;
        }

        schedulePreview();
    });

    window.addEventListener("projectsLoaded", () => {
        runPreview();
        resizePreview();
    });

    window.addEventListener("resize", resizePreview);

    if ("ResizeObserver" in window) {

        const observer = new ResizeObserver(() => {
            resizePreview();
        });

        observer.observe(viewport);
    }

    function initializePreview() {

        if (initialized) return;

        initialized = true;

        resizePreview();

        runPreview();

        console.log("[WCS Preview] Ready.");
    }

    if (window.editor && window.files) {

        initializePreview();

    } else {

        window.addEventListener(
            "editorReady",
            initializePreview,
            { once: true }
        );
    }

    window.runPreview = runPreview;
    window.updatePreview = runPreview;
    window.schedulePreview = schedulePreview;
    window.resizePreview = resizePreview;

})();
