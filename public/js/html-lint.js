(function (root) {
    "use strict";

    const SEVERITY = { error: 8, warning: 4, info: 2 };

    const VOID_TAGS = new Set([
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
    ]);

    const OPTIONAL_END = new Set([
        "html", "head", "body", "p", "li", "dt", "dd", "tr", "td", "th",
        "thead", "tbody", "tfoot", "option", "optgroup", "colgroup", "rt", "rp"
    ]);

    const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

    const CLOSES_P = new Set([
        "address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset",
        "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
        "header", "hgroup", "hr", "main", "menu", "nav", "ol", "p", "pre", "section",
        "table", "ul"
    ]);

    const IMPLIED_CLOSE = {
        li: ["li"],
        dt: ["dt", "dd"],
        dd: ["dt", "dd"],
        tr: ["tr", "td", "th"],
        td: ["td", "th"],
        th: ["td", "th"],
        thead: ["thead", "tbody", "tfoot", "tr", "td", "th"],
        tbody: ["thead", "tbody", "tfoot", "tr", "td", "th"],
        tfoot: ["thead", "tbody", "tfoot", "tr", "td", "th"],
        option: ["option"],
        optgroup: ["optgroup", "option"]
    };

    const URL_ATTRS = {
        a: "href", link: "href", script: "src", img: "src",
        source: "src", video: "src", audio: "src", iframe: "src"
    };

    const JS_TYPES = new Set(["", "text/javascript", "application/javascript", "text/ecmascript"]);

    function dirOf(path) {
        const i = path.lastIndexOf("/");
        return i === -1 ? "" : path.slice(0, i);
    }

    function resolveLocalPath(fromFile, rawUrl) {
        let url = String(rawUrl || "").trim();
        if (!url) return null;
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return null;
        if (/[{}<>$]/.test(url)) return null;

        url = url.split("#")[0].split("?")[0];
        if (!url) return null;
        try { url = decodeURIComponent(url); } catch (error) { }

        const parts = (url.startsWith("/") ? [] : dirOf(fromFile).split("/").filter(Boolean));
        for (const seg of url.split("/")) {
            if (seg === "" || seg === ".") continue;
            if (seg === "..") {
                if (!parts.length) return null;
                parts.pop();
            } else {
                parts.push(seg);
            }
        }

        const last = parts[parts.length - 1];
        if (!last || last.indexOf(".") === -1) return null;
        return parts.join("/");
    }

    function parseAttributes(text, i) {
        const attrs = [];
        const n = text.length;
        let selfClosing = false;

        while (i < n) {
            while (i < n && /\s/.test(text[i])) i++;
            if (i >= n) return { attrs, end: -1, selfClosing, problem: "eof" };

            const ch = text[i];
            if (ch === ">") return { attrs, end: i + 1, selfClosing };
            if (ch === "/" && text[i + 1] === ">") return { attrs, end: i + 2, selfClosing: true };
            if (ch === "/") { i++; continue; }

            const nameMatch = /^[^\s"'<>/=]+/.exec(text.slice(i, i + 200));
            if (!nameMatch) { i++; continue; }

            const nameStart = i;
            const name = nameMatch[0];
            i += name.length;

            let probe = i;
            while (probe < n && /\s/.test(text[probe])) probe++;

            const attr = { name: name.toLowerCase(), nameStart, nameEnd: i, value: null, valueStart: -1, valueEnd: -1 };

            if (text[probe] === "=") {
                probe++;
                while (probe < n && /\s/.test(text[probe])) probe++;
                const quote = text[probe];

                if (quote === '"' || quote === "'") {
                    const close = text.indexOf(quote, probe + 1);
                    if (close === -1) {
                        attr.value = text.slice(probe + 1);
                        attr.valueStart = probe + 1;
                        attr.valueEnd = n;
                        attrs.push(attr);
                        return { attrs, end: -1, selfClosing, problem: "quote", quoteAt: probe };
                    }
                    attr.value = text.slice(probe + 1, close);
                    attr.valueStart = probe + 1;
                    attr.valueEnd = close;
                    i = close + 1;
                } else {
                    let end = probe;
                    while (end < n && !/[\s>]/.test(text[end])) end++;
                    attr.value = text.slice(probe, end);
                    attr.valueStart = probe;
                    attr.valueEnd = end;
                    i = end;
                }
            }

            attrs.push(attr);
        }

        return { attrs, end: -1, selfClosing, problem: "eof" };
    }

    function getAttr(attrs, name) {
        for (const a of attrs) if (a.name === name) return a;
        return null;
    }

    function lintHtml(text, options) {
        const opts = options || {};
        const issues = [];
        const n = text.length;
        const stack = [];
        const ids = new Map();
        const scripts = [];
        let hasDoctype = false;
        let hasHtmlOrHead = false;
        let i = 0;

        function add(severity, start, end, message, code) {
            issues.push({ severity: SEVERITY[severity], start, end: Math.max(end, start + 1), message, code });
        }

        function popUnclosed(entry) {
            if (!OPTIONAL_END.has(entry.name)) {
                add("error", entry.start, entry.nameEnd, "Thẻ <" + entry.name + "> chưa được đóng.", "unclosed-tag");
            }
        }

        while (i < n) {
            const lt = text.indexOf("<", i);
            if (lt === -1) break;
            i = lt;

            if (text.startsWith("<!--", i)) {
                const end = text.indexOf("-->", i + 4);
                if (end === -1) {
                    add("error", i, i + 4, "Chú thích <!-- chưa được đóng bằng -->.", "unclosed-comment");
                    break;
                }
                i = end + 3;
                continue;
            }

            if (text.startsWith("<![CDATA[", i)) {
                const end = text.indexOf("]]>", i);
                i = end === -1 ? n : end + 3;
                continue;
            }

            if (text[i + 1] === "!" || text[i + 1] === "?") {
                if (/^<!doctype/i.test(text.slice(i, i + 10))) hasDoctype = true;
                const end = text.indexOf(">", i);
                i = end === -1 ? n : end + 1;
                continue;
            }

            if (text[i + 1] === "/") {
                const m = /^<\/([A-Za-z][^\s>/]*)\s*>?/.exec(text.slice(i, i + 300));
                if (!m) { i += 2; continue; }

                const name = m[1].toLowerCase();
                const nameEnd = i + 2 + m[1].length;
                i += m[0].length;

                if (VOID_TAGS.has(name)) {
                    if (name !== "br") {
                        add("warning", nameEnd - m[1].length - 2, nameEnd, "Thẻ <" + name + "> không có thẻ đóng.", "void-closing");
                    }
                    continue;
                }

                let found = -1;
                for (let k = stack.length - 1; k >= 0; k--) {
                    if (stack[k].name === name) { found = k; break; }
                }

                if (found === -1) {
                    add("error", nameEnd - m[1].length - 2, nameEnd, "Thẻ đóng </" + name + "> không có thẻ mở tương ứng.", "stray-closing");
                } else {
                    while (stack.length - 1 > found) popUnclosed(stack.pop());
                    stack.pop();
                }
                continue;
            }

            const nameMatch = /^<([A-Za-z][A-Za-z0-9:_-]*)/.exec(text.slice(i, i + 200));
            if (!nameMatch) { i++; continue; }

            const rawName = nameMatch[1];
            const name = rawName.toLowerCase();
            const tagStart = i;
            const nameEnd = i + 1 + rawName.length;

            if (name === "html" || name === "head") hasHtmlOrHead = true;

            const parsed = parseAttributes(text, nameEnd);

            if (parsed.end === -1) {
                if (parsed.problem === "quote") {
                    add("error", parsed.quoteAt, parsed.quoteAt + 1, "Dấu nháy của giá trị thuộc tính chưa được đóng.", "unclosed-quote");
                } else {
                    add("error", tagStart, nameEnd, "Thẻ <" + name + "> chưa kết thúc bằng dấu >.", "unterminated-tag");
                }
                break;
            }

            const attrs = parsed.attrs;
            i = parsed.end;

            const seen = new Set();
            for (const a of attrs) {
                if (seen.has(a.name)) {
                    add("warning", a.nameStart, a.nameEnd, 'Thuộc tính "' + a.name + '" bị lặp trong thẻ <' + name + ">.", "duplicate-attribute");
                }
                seen.add(a.name);
            }

            const idAttr = getAttr(attrs, "id");
            if (idAttr && idAttr.value) {
                const key = idAttr.value.trim();
                if (key) {
                    if (ids.has(key)) {
                        add("warning", idAttr.valueStart, idAttr.valueEnd, 'id "' + key + '" bị trùng với một phần tử khác.', "duplicate-id");
                    } else {
                        ids.set(key, true);
                    }
                }
            }

            if (name === "img" && !getAttr(attrs, "alt")) {
                add("warning", tagStart, nameEnd, "Thẻ <img> thiếu thuộc tính alt.", "img-alt");
            }

            const urlAttrName = URL_ATTRS[name];
            if (urlAttrName && typeof opts.fileExists === "function" && opts.fileName) {
                const a = getAttr(attrs, urlAttrName);
                if (a && a.value) {
                    const target = resolveLocalPath(opts.fileName, a.value);
                    if (target && !opts.fileExists(target)) {
                        add("warning", a.valueStart, Math.max(a.valueEnd, a.valueStart + 1),
                            'Không tìm thấy file "' + target + '" trong project.', "missing-file");
                    }
                }
            }

            if (stack.length) {
                const top = stack[stack.length - 1];
                if (top.name === "p" && CLOSES_P.has(name)) {
                    stack.pop();
                } else if (IMPLIED_CLOSE[name]) {
                    while (stack.length && IMPLIED_CLOSE[name].includes(stack[stack.length - 1].name)) {
                        stack.pop();
                    }
                }
            }

            if (VOID_TAGS.has(name)) continue;
            if (parsed.selfClosing) continue;

            if (RAW_TEXT.has(name)) {
                const closeRe = new RegExp("</" + name + "\\s*>", "ig");
                closeRe.lastIndex = i;
                const close = closeRe.exec(text);
                if (!close) {
                    add("error", tagStart, nameEnd, "Thẻ <" + name + "> chưa được đóng.", "unclosed-tag");
                    break;
                }
                if (name === "script" && !getAttr(attrs, "src")) {
                    const typeAttr = getAttr(attrs, "type");
                    const type = typeAttr && typeAttr.value ? typeAttr.value.trim().toLowerCase() : "";
                    if (JS_TYPES.has(type)) {
                        scripts.push({ start: i, end: close.index, tagStart, nameEnd });
                    }
                }
                i = close.index + close[0].length;
                continue;
            }

            stack.push({ name, start: tagStart, nameEnd });
        }

        while (stack.length) popUnclosed(stack.pop());

        if (hasHtmlOrHead && !hasDoctype) {
            add("info", 0, Math.min(n, 15) || 1, "Thiếu khai báo <!DOCTYPE html> ở đầu file.", "missing-doctype");
        }

        if (opts.checkInlineScripts !== false && scripts.length && typeof Function === "function") {
            for (const block of scripts) {
                const code = text.slice(block.start, block.end);
                if (!code.trim()) continue;
                try {
                    new Function(code);
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        add("error", block.tagStart, block.nameEnd,
                            "Lỗi cú pháp trong <script>: " + error.message, "inline-script-syntax");
                    }
                }
            }
        }

        issues.sort((a, b) => a.start - b.start);
        return issues;
    }

    const api = { lintHtml, resolveLocalPath, SEVERITY };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.WCSHtmlLint = api;
})(typeof window !== "undefined" ? window : globalThis);
