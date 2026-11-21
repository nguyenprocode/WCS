(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.WCSEmmetEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const MARK_OPEN = "«";
    const MARK_CLOSE = "»";

    const VOID = new Set(
        "area base br col embed hr img input link meta param source track wbr command keygen basefont".split(" ")
    );

    const INLINE = new Set(
        ("a abbr acronym applet b basefont bdo big br button cite code del dfn em font i iframe img input " +
            "ins kbd label map object q s samp select small span strike strong sub sup textarea tt u var " +
            "audio video").split(" ")
    );

    const BOOLEAN_ATTRS = new Set(
        ("allowfullscreen async autofocus autoplay checked controls default defer disabled formnovalidate " +
            "hidden ismap itemscope loop multiple muted nomodule novalidate open playsinline readonly required " +
            "reversed selected").split(" ")
    );

    const KNOWN_TAGS = new Set(
        ("a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite " +
            "code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption " +
            "figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label " +
            "legend li link main map mark menu meta meter nav noscript object ol optgroup option output p param " +
            "picture pre progress q rp rt ruby s samp script section select slot small source span strong style " +
            "sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var " +
            "video wbr center font marquee").split(" ")
    );

    const IMPLICIT = {
        ul: "li", ol: "li", menu: "li",
        table: "tr", tbody: "tr", thead: "tr", tfoot: "tr", tr: "td",
        select: "option", optgroup: "option", datalist: "option",
        colgroup: "col", dl: "dt", map: "area"
    };

    const EXPANDOS = {
        ul: "li", ol: "li", menu: "li",
        table: "tr>td", tbody: "tr>td", thead: "tr>td", tfoot: "tr>td", tr: "td",
        select: "option", optgroup: "option", datalist: "option",
        dl: "dt+dd", map: "area", colgroup: "col"
    };

    const INPUT_TYPES = [
        "hidden", "text", "search", "email", "url", "password", "datetime", "date", "datetime-local",
        "month", "week", "time", "tel", "number", "color", "checkbox", "radio", "range", "file",
        "submit", "image", "button", "reset"
    ];

    const HTML_SNIPPETS = {
        a: "a[href]",
        "a:blank": "a[href=http:// target=_blank rel='noopener noreferrer']",
        "a:link": "a[href=http://]",
        "a:mail": "a[href='mailto:']",
        "a:tel": "a[href='tel:+']",
        abbr: "abbr[title]",
        acr: "abbr[title]",
        area: "area[shape coords href alt]",
        "area:d": "area[shape=default]",
        "area:c": "area[shape=circle coords href alt]",
        "area:r": "area[shape=rect coords href alt]",
        "area:p": "area[shape=poly coords href alt]",
        adr: "address",
        art: "article",
        "audio:src": "audio[src]",
        base: "base[href]/",
        bdo: "bdo[dir]",
        "bdo:r": "bdo[dir=rtl]",
        "bdo:l": "bdo[dir=ltr]",
        bq: "blockquote",
        btn: "button",
        "btn:b": "button[type=button]",
        "btn:r": "button[type=reset]",
        "btn:s": "button[type=submit]",
        cap: "caption",
        cmd: "command",
        colg: "colgroup",
        doc: "html[lang=en]>(head>meta[charset=UTF-8]+title{Document})+body",
        emb: "embed[src type]",
        fig: "figure",
        figc: "figcaption",
        form: "form[action]",
        "form:get": "form[action method=get]",
        "form:post": "form[action method=post]",
        fset: "fieldset",
        fst: "fieldset",
        ftr: "footer",
        hdr: "header",
        "html:xml": "html[xmlns=http://www.w3.org/1999/xhtml]",
        ifr: "iframe[src frameborder=0]",
        iframe: "iframe[src frameborder=0]",
        img: "img[src alt]",
        "img:s": "img[srcset src alt]",
        "img:z": "img[srcset=«1x,2x» src alt]",
        inp: "input[type=text]",
        input: "input[type=text]",
        label: "label[for]",
        link: "link[rel=stylesheet href]",
        "link:css": "link[rel=stylesheet href=\"«style».css\"]",
        "link:print": "link[rel=stylesheet href=\"«print».css\" media=print]",
        "link:favicon": "link[rel=\"shortcut icon\" type=image/x-icon href=\"«favicon.ico»\"]",
        "link:touch": "link[rel=apple-touch-icon href=\"«favicon.png»\"]",
        "link:mf": "link[rel=manifest href=\"«manifest.json»\"]",
        "link:rss": "link[rel=alternate type=application/rss+xml title=RSS href=\"«rss.xml»\"]",
        "link:atom": "link[rel=alternate type=application/atom+xml title=Atom href=\"«atom.xml»\"]",
        map: "map[name]",
        meta: "meta/",
        "meta:utf": "meta[http-equiv=Content-Type content='text/html;charset=UTF-8']",
        "meta:vp": "meta[name=viewport content='width=device-width, initial-scale=1.0']",
        "meta:compat": "meta[http-equiv=X-UA-Compatible content='IE=7']",
        "meta:edge": "meta[http-equiv=X-UA-Compatible content='ie=edge']",
        "meta:kw": "meta[name=keywords content]",
        "meta:desc": "meta[name=description content]",
        "meta:refresh": "meta[http-equiv=refresh content='«0;url=»']",
        obj: "object",
        opt: "option",
        optg: "optgroup",
        param: "param[name value]",
        pic: "picture",
        prog: "progress",
        script: "script",
        "script:src": "script[src]",
        "script:module": "script[type=module src]",
        sect: "section",
        sel: "select",
        src: "source",
        str: "strong",
        tarea: "textarea[name id cols=30 rows=10]",
        trk: "track",
        "video:src": "video[src]"
    };

    INPUT_TYPES.forEach(function (type) {
        HTML_SNIPPETS["input:" + type] = "input[type=" + type + " name]";
    });
    Object.assign(HTML_SNIPPETS, {
        "input:h": HTML_SNIPPETS["input:hidden"],
        "input:t": HTML_SNIPPETS["input:text"],
        "input:p": HTML_SNIPPETS["input:password"],
        "input:c": "input[type=checkbox]",
        "input:checkbox": "input[type=checkbox]",
        "input:r": "input[type=radio]",
        "input:radio": "input[type=radio]",
        "input:s": "input[type=submit value]",
        "input:submit": "input[type=submit value]",
        "input:i": "input[type=image src alt]",
        "input:image": "input[type=image src alt]",
        "input:b": "input[type=button value]",
        "input:button": "input[type=button value]",
        "input:f": HTML_SNIPPETS["input:file"],
        "input:e": HTML_SNIPPETS["input:email"],
        "input:n": HTML_SNIPPETS["input:number"],
        "input:reset": "input[type=reset value]"
    });

    const LOREM_WORDS = (
        "lorem ipsum dolor sit amet consectetur adipisicing elit maxime mollitia molestiae quasi aliquam " +
        "dignissimos veniam laudantium quos doloribus sapiente tempora porro voluptates saepe incidunt " +
        "reiciendis exercitationem voluptatum quibusdam ratione nobis eaque harum nemo nostrum officia " +
        "perspiciatis placeat quae quidem repellat rerum sed similique sunt totam ullam vitae voluptas " +
        "accusamus aperiam architecto assumenda autem beatae blanditiis commodi corporis culpa debitis " +
        "deleniti deserunt dolore dolorem eius enim eos error esse est eum expedita explicabo facere " +
        "fugiat fugit illum impedit iste itaque iure labore magnam magni minima minus modi natus neque " +
        "nesciunt nihil numquam odio omnis optio pariatur praesentium provident quam quas recusandae " +
        "reprehenderit sequi soluta temporibus tenetur ut velit vero"
    ).split(" ");

    let loremCursor = 0;

    function lorem(count) {
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(LOREM_WORDS[(loremCursor + i) % LOREM_WORDS.length]);
        }
        loremCursor = (loremCursor + count + 3) % LOREM_WORDS.length;
        let out = "";
        let sentenceLen = 0;
        let target = 9;
        words.forEach(function (word, index) {
            const startOfSentence = sentenceLen === 0;
            out += (index ? " " : "") + (startOfSentence ? word[0].toUpperCase() + word.slice(1) : word);
            sentenceLen++;
            const last = index === words.length - 1;
            if (last) {
                out += ".";
            } else if (sentenceLen >= target) {
                out += ".";
                sentenceLen = 0;
                target = 8 + ((index * 7) % 5);
            } else if (sentenceLen === 5 && words.length - index > 4) {
                out += ",";
            }
        });
        return out;
    }

    function fail(message) {
        const error = new Error(message);
        error.emmet = true;
        throw error;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function escapeAttr(text) {
        return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    }

    function mapOutsideMarks(text, fn) {
        return text
            .split(/(«[^»]*»)/)
            .map(function (part, index) { return index % 2 ? part : fn(part); })
            .join("");
    }

    function createParser(source) {
        return { s: source, i: 0 };
    }

    function peek(p) { return p.s[p.i]; }

    function readWhile(p, regex) {
        const start = p.i;
        while (p.i < p.s.length && regex.test(p.s[p.i])) p.i++;
        return p.s.slice(start, p.i);
    }

    function readBalancedText(p) {
        p.i++;
        let depth = 1;
        let out = "";
        while (p.i < p.s.length) {
            const ch = p.s[p.i];
            if (ch === "\\" && p.i + 1 < p.s.length) {
                out += p.s[p.i + 1] === "$" ? "\uE000" : p.s[p.i + 1];
                p.i += 2;
                continue;
            }
            if (ch === "{") depth++;
            if (ch === "}") {
                depth--;
                if (depth === 0) {
                    p.i++;
                    return out;
                }
            }
            out += ch;
            p.i++;
        }
        fail("Thiếu dấu }");
    }

    function parseAttributes(p, el) {
        p.i++;
        for (;;) {
            readWhile(p, /\s/);
            if (p.i >= p.s.length) fail("Thiếu dấu ]");
            if (peek(p) === "]") {
                p.i++;
                return;
            }

            const name = readWhile(p, /[^\s=\]\["'{}]/);
            if (!name) fail("Tên thuộc tính không hợp lệ");

            let value = null;
            if (peek(p) === "=") {
                p.i++;
                const q = peek(p);
                if (q === "\"" || q === "'") {
                    p.i++;
                    const end = p.s.indexOf(q, p.i);
                    if (end === -1) fail("Thiếu dấu nháy");
                    value = p.s.slice(p.i, end);
                    p.i = end + 1;
                } else {
                    value = readWhile(p, /[^\s\]]/);
                }
            }
            setAttr(el, name, value);
        }
    }

    function setAttr(el, name, value) {
        if (name === "class" && value) {
            addClass(el, value);
            return;
        }
        const existing = el.attrs.find(function (a) { return a.name === name; });
        if (existing) existing.value = value;
        else el.attrs.push({ name: name, value: value });
    }

    function addClass(el, cls) {
        const existing = el.attrs.find(function (a) { return a.name === "class"; });
        if (existing) existing.value = (existing.value ? existing.value + " " : "") + cls;
        else el.attrs.push({ name: "class", value: cls });
    }

    function parseElement(p) {
        const el = {
            type: "el", name: null, attrs: [], text: null,
            children: [], selfClosing: false, repeat: 1, hasRepeat: false,
            expando: false, parent: null
        };

        if (/[A-Za-z]/.test(peek(p) || "")) {
            el.name = readWhile(p, /[A-Za-z0-9_:$@-]/).replace(/[-:]+$/, function (tail) {
                p.i -= tail.length;
                return "";
            });
        }

        let consumed = el.name !== null;

        for (;;) {
            const c = peek(p);
            if (c === "#") {
                p.i++;
                const id = readWhile(p, /[\w$@-]/);
                if (!id) fail("Thiếu id");
                setAttr(el, "id", id);
            } else if (c === ".") {
                p.i++;
                const cls = readWhile(p, /[\w$@-]/);
                if (!cls) fail("Thiếu tên class");
                addClass(el, cls);
            } else if (c === "[") {
                parseAttributes(p, el);
            } else if (c === "{") {
                el.text = readBalancedText(p);
            } else if (c === "/") {
                p.i++;
                el.selfClosing = true;
            } else {
                break;
            }
            consumed = true;
        }

        if (!consumed) fail("Không đọc được phần tử");
        return el;
    }

    function parseItem(p) {
        let node;
        const c = peek(p);

        if (c === "(") {
            p.i++;
            const sub = parseSequence(p, ")");
            if (peek(p) !== ")") fail("Thiếu dấu )");
            p.i++;
            node = { type: "group", children: sub.children, repeat: 1, hasRepeat: false, parent: null };
            sub.children.forEach(function (child) { child.parent = node; });
        } else if (c === "{") {
            const text = readBalancedText(p);
            node = { type: "text", text: text, repeat: 1, hasRepeat: false, parent: null };
        } else {
            node = parseElement(p);
        }

        if (peek(p) === "*") {
            p.i++;
            const digits = readWhile(p, /\d/);
            node.hasRepeat = true;
            node.repeat = digits ? parseInt(digits, 10) : -1;
            if (digits && node.repeat > 500) fail("Nhân bản quá lớn");
        }
        return node;
    }

    function parseSequence(p, closing) {
        const root = { type: "root", children: [], parent: null };
        let parent = root;
        let last = null;

        for (;;) {
            const node = parseItem(p);
            node.parent = parent;
            parent.children.push(node);
            last = node;

            const c = peek(p);
            if (c === undefined || (closing && c === closing)) break;

            if (c === ">") {
                p.i++;
                if (last.type === "text") fail("Không thể đặt phần tử con trong text");
                parent = last;
            } else if (c === "+") {
                p.i++;
                const next = peek(p);
                if (next === undefined || (closing && next === closing)) {
                    if (last.type === "el") last.expando = true;
                    break;
                }
            } else if (c === "^") {
                while (peek(p) === "^") {
                    p.i++;
                    if (parent.parent) parent = parent.parent;
                }
            } else {
                fail("Ký tự không hợp lệ: " + c);
            }
        }
        return root;
    }

    function splitFilters(abbr) {
        let depth = 0;
        let quote = null;
        for (let i = 0; i < abbr.length; i++) {
            const ch = abbr[i];
            if (quote) { if (ch === quote) quote = null; continue; }
            if ((ch === "\"" || ch === "'") && depth > 0) { quote = ch; continue; }
            if (ch === "[" || ch === "{") depth++;
            else if (ch === "]" || ch === "}") depth--;
            else if (ch === "|" && depth === 0) {
                return {
                    abbr: abbr.slice(0, i),
                    filters: abbr.slice(i + 1).split("|").map(function (f) { return f.trim(); }).filter(Boolean)
                };
            }
        }
        return { abbr: abbr, filters: [] };
    }

    function parseMarkup(abbr) {
        if (!abbr) fail("Rỗng");
        const p = createParser(abbr);
        const root = parseSequence(p, null);
        if (p.i < p.s.length) fail("Dư ký tự ở vị trí " + p.i);
        return root;
    }

    function applyNumbering(text, rep) {
        if (text === null || text === undefined || text.indexOf("$") === -1) return text;
        const index = rep ? rep.i : 1;
        const total = rep ? rep.total : 1;
        return mapOutsideMarks(text, function (part) {
            return part.replace(/\$+(?:@(-)?(\d+)?)?/g, function (match, reverse, base) {
                const width = match.match(/^\$+/)[0].length;
                const start = base ? parseInt(base, 10) : 1;
                const value = reverse ? start + (total - index) : start + (index - 1);
                return String(value).padStart(width, "0");
            });
        });
    }

    function cloneAttrs(attrs) {
        return attrs.map(function (a) { return { name: a.name, value: a.value }; });
    }

    function mergeAttrs(base, user) {
        const out = cloneAttrs(base);
        user.forEach(function (a) {
            const found = out.find(function (b) { return b.name === a.name; });
            if (!found) {
                out.push({ name: a.name, value: a.value });
            } else if (a.name === "class" && found.value && a.value) {
                found.value = found.value + " " + a.value;
            } else {
                found.value = a.value;
            }
        });
        return out;
    }

    function isLoremName(name) {
        return /^(lorem|lipsum)(\d*)$/i.test(name || "");
    }

    function implicitName(parentName) {
        if (parentName && IMPLICIT[parentName]) return IMPLICIT[parentName];
        if (parentName && (INLINE.has(parentName) || parentName === "p")) return "span";
        return "div";
    }

    function replaceWrapToken(text, ctx, rep) {
        if (!ctx.wrap || text === null || text === undefined || text.indexOf("$#") === -1) return text;
        const value = rep && rep.line !== undefined ? rep.line : ctx.wrap.lines.join("\n");
        ctx.wrapUsed = true;
        return text.split("$#").join(value);
    }

    function prepare(text, ctx, rep) {
        const numbered = applyNumbering(replaceWrapToken(text, ctx, rep), rep);
        return typeof numbered === "string" ? numbered.replace(/\uE000/g, "$") : numbered;
    }

    function deepestLast(node) {
        let current = node;
        while (current.children && current.children.length) {
            const next = current.children[current.children.length - 1];
            if (next.type !== "el") break;
            current = next;
        }
        return current;
    }

    function expandList(nodes, ctx, parentName, rep) {
        const out = [];
        nodes.forEach(function (node) {
            const count = !node.hasRepeat ? 1
                : node.repeat === -1 ? (ctx.wrap ? Math.max(ctx.wrap.lines.length, 1) : 1)
                    : node.repeat;

            for (let n = 1; n <= count; n++) {
                let childRep = rep;
                if (node.hasRepeat) {
                    childRep = { i: n, total: count };
                    if (node.repeat === -1 && ctx.wrap) childRep.line = ctx.wrap.lines[n - 1];
                }

                if (node.type === "group") {
                    expandList(node.children, ctx, parentName, childRep).forEach(function (c) { out.push(c); });
                    if (node.repeat === -1 && ctx.wrap) markWrapTargets(out, childRep.line, ctx);
                } else if (node.type === "text") {
                    out.push({ type: "text", text: prepare(node.text, ctx, childRep) });
                } else {
                    const built = buildElement(node, ctx, parentName, childRep);
                    built.forEach(function (b) { out.push(b); });
                    if (node.repeat === -1 && ctx.wrap && node.hasRepeat) {
                        const target = built[built.length - 1];
                        if (target && target.type === "el" && !ctx.wrapUsedPerLine) {
                            injectWrapText(target, childRep.line, ctx);
                        }
                    }
                }
            }
        });
        return out;
    }

    function markWrapTargets(list, line, ctx) {
        const last = list[list.length - 1];
        if (last && last.type === "el") injectWrapText(last, line, ctx);
    }

    function injectWrapText(el, line, ctx) {
        const leaf = deepestLast(el);
        if (leaf.void) return;
        leaf.children.push({ type: "text", text: line });
        ctx.wrapInjected = true;
    }

    function buildElement(node, ctx, parentName, rep) {
        let name = node.name ? prepare(node.name, ctx, rep) : null;

        if (name && isLoremName(name) && !node.attrs.length) {
            const m = name.match(/^(?:lorem|lipsum)(\d*)$/i);
            const count = m[1] ? parseInt(m[1], 10) : 30;
            return [{ type: "text", text: lorem(count) }];
        }

        let attrs = node.attrs.map(function (a) {
            return { name: prepare(a.name, ctx, rep), value: a.value === null ? null : prepare(a.value, ctx, rep) };
        });
        let text = node.text === null ? null : prepare(node.text, ctx, rep);
        let selfClosing = node.selfClosing;
        let extraChildren = [];

        if (!name) name = implicitName(parentName);

        const snippet = !ctx.noSnippets && HTML_SNIPPETS[name];
        if (snippet) {
            const tpl = parseMarkup(snippet);
            const tplNode = tpl.children[0];
            const innerCtx = Object.assign({}, ctx, { noSnippets: true, wrap: null });
            if (tplNode.type === "el" && tpl.children.length === 1) {
                name = tplNode.name;
                attrs = mergeAttrs(tplNode.attrs, attrs);
                if (tplNode.selfClosing) selfClosing = true;
                if (text === null && tplNode.text !== null) text = tplNode.text;
                extraChildren = expandList(tplNode.children, innerCtx, name, rep);
            } else {
                const nodes = expandList(tpl.children, innerCtx, parentName, rep);
                if (node.children.length) {
                    const target = deepestLast(nodes[nodes.length - 1]);
                    expandList(node.children, ctx, target.name, rep).forEach(function (c) { target.children.push(c); });
                }
                return nodes;
            }
        }

        const el = {
            type: "el",
            name: name,
            attrs: attrs,
            text: text,
            children: [],
            void: VOID.has(name) || selfClosing,
            comment: false
        };

        extraChildren.forEach(function (c) { el.children.push(c); });
        expandList(node.children, ctx, name, rep).forEach(function (c) { el.children.push(c); });

        if (node.expando && !el.children.length && EXPANDOS[name]) {
            const sub = parseMarkup(EXPANDOS[name]);
            expandList(sub.children, Object.assign({}, ctx, { noSnippets: false, wrap: null }), name, rep)
                .forEach(function (c) { el.children.push(c); });
        }

        return [el];
    }

    function indent(level) { return "\t".repeat(level); }

    function isInlineNode(node) {
        if (node.type === "text") return node.text.indexOf("\n") === -1;
        if (node.comment) return false;
        if (!INLINE.has(node.name)) return false;
        return !node.children.some(function (c) { return !isInlineNode(c); });
    }

    function renderAttrs(el) {
        return el.attrs.map(function (a) {
            if (a.value === null || a.value === undefined) {
                return BOOLEAN_ATTRS.has(a.name) ? " " + a.name : " " + a.name + "=\"" + MARK_OPEN + MARK_CLOSE + "\"";
            }
            if (a.value === "") {
                return BOOLEAN_ATTRS.has(a.name) ? " " + a.name : " " + a.name + "=\"" + MARK_OPEN + MARK_CLOSE + "\"";
            }
            return " " + a.name + "=\"" + mapOutsideMarks(a.value, escapeAttr) + "\"";
        }).join("");
    }

    function renderText(text, level) {
        return text.split("\n").join("\n" + indent(level));
    }

    function renderSiblings(nodes, level, options) {
        let out = "";
        nodes.forEach(function (node, index) {
            if (index > 0) {
                const pair = isInlineNode(nodes[index - 1]) && isInlineNode(node);
                out += pair ? "" : "\n" + indent(level);
            }
            out += renderNode(node, level, options);
        });
        return out;
    }

    function commentLabel(el) {
        const id = el.attrs.find(function (a) { return a.name === "id"; });
        const cls = el.attrs.find(function (a) { return a.name === "class"; });
        let label = "";
        if (id && id.value) label += "#" + id.value;
        if (cls && cls.value) label += "." + cls.value.trim().split(/\s+/).join(".");
        return label;
    }

    function renderNode(node, level, options) {
        if (node.type === "text") return renderText(node.text === "" ? MARK_OPEN + MARK_CLOSE : node.text, level);

        const open = "<" + node.name + renderAttrs(node) + ">";
        let out;

        if (node.void) {
            out = open;
        } else {
            const close = "</" + node.name + ">";
            const kids = node.children;
            const head = node.text === null ? "" : (node.text === "" ? MARK_OPEN + MARK_CLOSE : node.text);

            if (!kids.length) {
                out = open + (node.text === null ? MARK_OPEN + MARK_CLOSE : renderText(head, level)) + close;
            } else {
                const breaks = kids.some(function (k) { return !isInlineNode(k); });
                if (!breaks) {
                    out = open + renderText(head, level) + renderSiblings(kids, level, options) + close;
                } else {
                    out = open + "\n" + indent(level + 1) +
                        (head ? renderText(head, level + 1) + "\n" + indent(level + 1) : "") +
                        renderSiblings(kids, level + 1, options) +
                        "\n" + indent(level) + close;
                }
            }
        }

        if (options.comment && node.comment) {
            out += "\n" + indent(level) + "<!-- /" + commentLabel(node) + " -->";
        }
        return out;
    }

    function markComments(nodes) {
        nodes.forEach(function (node) {
            if (node.type !== "el") return;
            if (commentLabel(node)) node.comment = true;
            markComments(node.children);
        });
    }

    const DOC5 = [
        "<!DOCTYPE html>",
        "<html lang=\"en\">",
        "<head>",
        "\t<meta charset=\"UTF-8\">",
        "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
        "\t<title>Document</title>",
        "</head>",
        "<body>",
        "\t" + MARK_OPEN + MARK_CLOSE,
        "</body>",
        "</html>"
    ].join("\n");

    function expandMarkupRaw(input, options) {
        options = options || {};
        const trimmed = String(input).trim();

        if (!options.wrap) {
            if (trimmed === "!" || trimmed === "html:5") return DOC5;
            if (trimmed === "!!!") return "<!DOCTYPE html>";
        }

        loremCursor = 0;
        const split = splitFilters(trimmed);
        const root = parseMarkup(split.abbr);
        const ctx = {
            noSnippets: false,
            wrap: options.wrap || null,
            wrapUsed: false,
            wrapInjected: false
        };

        const nodes = expandList(root.children, ctx, options.parentName || null, null);
        if (!nodes.length) fail("Không có gì để sinh");

        if (ctx.wrap && !ctx.wrapUsed && !ctx.wrapInjected) {
            const target = deepestLast(nodes[nodes.length - 1]);
            if (target.type === "el" && !target.void) {
                target.children.push({ type: "text", text: ctx.wrap.lines.join("\n") });
            } else {
                nodes.push({ type: "text", text: ctx.wrap.lines.join("\n") });
            }
        }

        const filters = split.filters;
        const renderOptions = { comment: filters.indexOf("c") !== -1 };
        if (renderOptions.comment) markComments(nodes);

        let out = renderSiblings(nodes, 0, renderOptions);
        if (filters.indexOf("e") !== -1) out = mapOutsideMarks(out, escapeHtml);
        return out;
    }

    const CSS_SNIPPETS = {
        pos: "position", posa: "position:absolute", posr: "position:relative", posf: "position:fixed",
        poss: "position:static", posst: "position:sticky",
        t: "top", r: "right", b: "bottom", l: "left", z: "z-index",
        fl: "float", fll: "float:left", flr: "float:right", fln: "float:none",
        cl: "clear", cll: "clear:left", clr: "clear:right", clb: "clear:both", cln: "clear:none",
        d: "display", dn: "display:none", db: "display:block", di: "display:inline",
        dib: "display:inline-block", df: "display:flex", dif: "display:inline-flex",
        dg: "display:grid", dtb: "display:table", dtc: "display:table-cell", dc: "display:contents",
        v: "visibility", vh: "visibility:hidden", vv: "visibility:visible", vc: "visibility:collapse",
        ov: "overflow", ovh: "overflow:hidden", ovv: "overflow:visible", ovs: "overflow:scroll",
        ova: "overflow:auto", ovx: "overflow-x", ovy: "overflow-y",
        op: "opacity", cur: "cursor", curp: "cursor:pointer", curd: "cursor:default",
        curm: "cursor:move", curna: "cursor:not-allowed",
        fx: "flex", fxd: "flex-direction", fxdc: "flex-direction:column", fxdr: "flex-direction:row",
        fxw: "flex-wrap", fxww: "flex-wrap:wrap", fxwn: "flex-wrap:nowrap",
        fxg: "flex-grow", fxsh: "flex-shrink", fxb: "flex-basis", fxf: "flex-flow",
        jc: "justify-content", jcc: "justify-content:center", jcsb: "justify-content:space-between",
        jcsa: "justify-content:space-around", jcse: "justify-content:space-evenly",
        jcfs: "justify-content:flex-start", jcfe: "justify-content:flex-end",
        ai: "align-items", aic: "align-items:center", aifs: "align-items:flex-start",
        aife: "align-items:flex-end", ais: "align-items:stretch", aib: "align-items:baseline",
        ac: "align-content", acc: "align-content:center",
        as: "align-self", asc: "align-self:center",
        ord: "order", g: "gap", gap: "gap",
        gtc: "grid-template-columns", gtr: "grid-template-rows", gta: "grid-template-areas",
        gc: "grid-column", gr: "grid-row", ga: "grid-area",
        m: "margin", mt: "margin-top", mr: "margin-right", mb: "margin-bottom", ml: "margin-left",
        ma: "margin:auto", mta: "margin-top:auto", mra: "margin-right:auto", mba: "margin-bottom:auto",
        mla: "margin-left:auto",
        p: "padding", pt: "padding-top", pr: "padding-right", pb: "padding-bottom", pl: "padding-left",
        w: "width", h: "height", maw: "max-width", mah: "max-height", miw: "min-width", mih: "min-height",
        bxz: "box-sizing", bxzb: "box-sizing:border-box", bxzc: "box-sizing:content-box",
        bxsh: "box-shadow", bxs: "box-shadow",
        bd: "border", "bd+": "border:«1px» «solid» «#000»", bdn: "border:none",
        bdt: "border-top", bdr: "border-right", bdb: "border-bottom", bdl: "border-left",
        bdw: "border-width", bds: "border-style", bdc: "border-color",
        bdrs: "border-radius", bdi: "border-image", bdcl: "border-collapse", bdsp: "border-spacing",
        ol: "outline", oln: "outline:none", olo: "outline-offset",
        bg: "background", bgc: "background-color", bgi: "background-image",
        bgr: "background-repeat", bgrn: "background-repeat:no-repeat", bgp: "background-position",
        bgs: "background-size", bgsc: "background-size:cover", bgsct: "background-size:contain",
        bga: "background-attachment", bgo: "background-origin", bgcp: "background-clip",
        c: "color", fz: "font-size", ff: "font-family", fw: "font-weight",
        fwb: "font-weight:bold", fwn: "font-weight:normal", fs: "font-style",
        fsi: "font-style:italic", fsn: "font-style:normal", fv: "font-variant", f: "font",
        lh: "line-height", ls: "letter-spacing",
        ws: "white-space", wsn: "white-space:nowrap", wsp: "white-space:pre",
        ww: "word-wrap", wwb: "word-wrap:break-word", wob: "word-break", wos: "word-spacing",
        ta: "text-align", tac: "text-align:center", tal: "text-align:left", tar: "text-align:right",
        taj: "text-align:justify",
        td: "text-decoration", tdn: "text-decoration:none", tdu: "text-decoration:underline",
        tdl: "text-decoration:line-through",
        tt: "text-transform", ttu: "text-transform:uppercase", ttl: "text-transform:lowercase",
        ttc: "text-transform:capitalize", ttn: "text-transform:none",
        tsh: "text-shadow", to: "text-overflow", toe: "text-overflow:ellipsis", ti: "text-indent",
        va: "vertical-align", vam: "vertical-align:middle", vat: "vertical-align:top",
        vab: "vertical-align:bottom", vabl: "vertical-align:baseline",
        trf: "transform", trfo: "transform-origin", trs: "transition", trsde: "transition-delay",
        trsdu: "transition-duration", trstf: "transition-timing-function", trsp: "transition-property",
        anim: "animation", animdel: "animation-delay", animdur: "animation-duration",
        animn: "animation-name", animtf: "animation-timing-function", animic: "animation-iteration-count",
        cnt: "content:'«»'", q: "quotes", lis: "list-style", lisn: "list-style:none",
        lst: "list-style-type", fil: "filter", bf: "backdrop-filter",
        pe: "pointer-events", pen: "pointer-events:none", us: "user-select", usn: "user-select:none",
        rsz: "resize", rszn: "resize:none", ap: "appearance", apn: "appearance:none",
        obf: "object-fit", obfc: "object-fit:cover", obfct: "object-fit:contain", obp: "object-position",
        ar: "aspect-ratio", cp: "clip-path", tbl: "table-layout", tblf: "table-layout:fixed",
        cnr: "counter-reset", cni: "counter-increment", zoom: "zoom", wc: "will-change"
    };

    const CSS_AT = {
        "@i": "@import url(«»);",
        "@import": "@import url(«»);",
        "@m": "@media «screen» {\n\t«»\n}",
        "@media": "@media «screen» {\n\t«»\n}",
        "@mq": "@media (min-width: «768px») {\n\t«»\n}",
        "@f": "@font-face {\n\tfont-family: «»;\n\tsrc: url(«»);\n}",
        "@ff": "@font-face {\n\tfont-family: «»;\n\tsrc: url(«»);\n}",
        "@k": "@keyframes «identifier» {\n\t«»\n}",
        "@kf": "@keyframes «identifier» {\n\t«»\n}",
        "@c": "@charset \"UTF-8\";",
        "@s": "@supports («») {\n\t«»\n}"
    };

    const CSS_PROPERTIES = (
        "align-content align-items align-self all animation animation-delay animation-direction " +
        "animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state " +
        "animation-timing-function appearance aspect-ratio backdrop-filter backface-visibility background " +
        "background-attachment background-blend-mode background-clip background-color background-image " +
        "background-origin background-position background-repeat background-size border border-bottom " +
        "border-bottom-color border-bottom-left-radius border-bottom-right-radius border-bottom-style " +
        "border-bottom-width border-collapse border-color border-image border-left border-left-color " +
        "border-left-style border-left-width border-radius border-right border-right-color border-right-style " +
        "border-right-width border-spacing border-style border-top border-top-color border-top-left-radius " +
        "border-top-right-radius border-top-style border-top-width border-width bottom box-shadow box-sizing " +
        "caret-color clear clip clip-path color column-count column-gap column-rule column-width columns " +
        "content counter-increment counter-reset cursor direction display empty-cells fill filter flex " +
        "flex-basis flex-direction flex-flow flex-grow flex-shrink flex-wrap float font font-family " +
        "font-feature-settings font-kerning font-size font-size-adjust font-stretch font-style font-variant " +
        "font-weight gap grid grid-area grid-auto-columns grid-auto-flow grid-auto-rows grid-column " +
        "grid-column-end grid-column-gap grid-column-start grid-gap grid-row grid-row-end grid-row-gap " +
        "grid-row-start grid-template grid-template-areas grid-template-columns grid-template-rows " +
        "height hyphens image-rendering inset isolation justify-content justify-items justify-self left " +
        "letter-spacing line-height list-style list-style-image list-style-position list-style-type margin " +
        "margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width " +
        "mix-blend-mode object-fit object-position opacity order orphans outline outline-color " +
        "outline-offset outline-style outline-width overflow overflow-wrap overflow-x overflow-y padding " +
        "padding-bottom padding-left padding-right padding-top page-break-after page-break-before " +
        "page-break-inside perspective perspective-origin place-content place-items place-self " +
        "pointer-events position quotes resize right row-gap scroll-behavior scroll-snap-align " +
        "scroll-snap-type tab-size table-layout text-align text-align-last text-decoration " +
        "text-decoration-color text-decoration-line text-decoration-style text-indent text-justify " +
        "text-overflow text-shadow text-transform top transform transform-origin transform-style " +
        "transition transition-delay transition-duration transition-property transition-timing-function " +
        "unicode-bidi user-select vertical-align visibility white-space widows width will-change " +
        "word-break word-spacing word-wrap writing-mode z-index zoom"
    ).split(" ");

    const UNITLESS = new Set(
        ("z-index line-height opacity font-weight flex flex-grow flex-shrink order orphans widows zoom " +
            "column-count tab-size fill-opacity stroke-opacity aspect-ratio animation-iteration-count " +
            "counter-increment counter-reset").split(" ")
    );

    const GLOBAL_KEYWORDS = (
        "auto none block inline inline-block flex grid absolute relative fixed sticky static center left " +
        "right top bottom solid dashed dotted double hidden visible scroll bold normal italic underline " +
        "uppercase lowercase capitalize nowrap wrap column row space-between space-around space-evenly " +
        "flex-start flex-end stretch baseline pointer default cover contain inherit initial unset " +
        "transparent no-repeat repeat repeat-x repeat-y border-box content-box middle ellipsis pre " +
        "break-word both justify collapse separate ease ease-in ease-out ease-in-out linear infinite"
    ).split(" ");

    const PROP_KEYWORDS = {
        position: ["static", "relative", "absolute", "fixed", "sticky"],
        display: ["none", "block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "table", "table-cell", "contents"],
        "text-align": ["left", "center", "right", "justify", "start", "end"],
        "text-decoration": ["none", "underline", "line-through", "overline"],
        "text-transform": ["none", "uppercase", "lowercase", "capitalize"],
        "font-style": ["normal", "italic", "oblique"],
        "font-weight": ["normal", "bold", "bolder", "lighter"],
        float: ["none", "left", "right"],
        clear: ["none", "left", "right", "both"],
        overflow: ["visible", "hidden", "scroll", "auto"],
        "overflow-x": ["visible", "hidden", "scroll", "auto"],
        "overflow-y": ["visible", "hidden", "scroll", "auto"],
        visibility: ["visible", "hidden", "collapse"],
        cursor: ["auto", "default", "pointer", "move", "text", "wait", "not-allowed", "grab", "crosshair"],
        "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
        "flex-wrap": ["nowrap", "wrap", "wrap-reverse"],
        "justify-content": ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
        "align-items": ["stretch", "flex-start", "flex-end", "center", "baseline"],
        "align-content": ["stretch", "flex-start", "flex-end", "center", "space-between", "space-around"],
        "align-self": ["auto", "stretch", "flex-start", "flex-end", "center", "baseline"],
        "white-space": ["normal", "nowrap", "pre", "pre-wrap", "pre-line"],
        "vertical-align": ["baseline", "top", "middle", "bottom", "text-top", "text-bottom"],
        "box-sizing": ["border-box", "content-box"],
        "background-repeat": ["repeat", "repeat-x", "repeat-y", "no-repeat"],
        "background-size": ["auto", "cover", "contain"],
        "object-fit": ["fill", "contain", "cover", "none", "scale-down"],
        border: ["solid", "dashed", "dotted", "double", "none"],
        "border-style": ["solid", "dashed", "dotted", "double", "none"],
        outline: ["solid", "dashed", "dotted", "none"],
        "pointer-events": ["auto", "none"],
        "user-select": ["auto", "none", "text", "all"],
        resize: ["none", "both", "horizontal", "vertical"],
        "list-style": ["none", "disc", "circle", "square", "decimal"]
    };

    ["border-top", "border-right", "border-bottom", "border-left"].forEach(function (name) {
        PROP_KEYWORDS[name] = PROP_KEYWORDS.border;
    });
    ["border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "outline-style"]
        .forEach(function (name) { PROP_KEYWORDS[name] = PROP_KEYWORDS.border; });
    PROP_KEYWORDS["text-decoration-line"] = PROP_KEYWORDS["text-decoration"];

    const UNIT_ALIASES = { p: "%", e: "em", x: "ex", r: "rem" };

    function subsequenceScore(abbr, text) {
        if (!text || abbr[0] !== text[0]) return -1;
        let score = 0;
        let pos = 0;
        let prevMatched = true;
        for (let i = 0; i < abbr.length; i++) {
            const found = text.indexOf(abbr[i], i === 0 ? 0 : pos);
            if (found === -1) return -1;
            const atBoundary = found === 0 || text[found - 1] === "-";
            score += atBoundary ? 3 : (found === pos && prevMatched ? 2 : 1);
            prevMatched = found === pos;
            pos = found + 1;
        }
        return score * 100 - text.length;
    }

    function fuzzyPick(abbr, list) {
        let best = null;
        let bestScore = -1;
        list.forEach(function (item) {
            const s = subsequenceScore(abbr, item);
            if (s > bestScore) { best = item; bestScore = s; }
        });
        return best;
    }

    function resolveProperty(word) {
        if (Object.prototype.hasOwnProperty.call(CSS_SNIPPETS, word)) {
            const v = CSS_SNIPPETS[word];
            const colon = v.indexOf(":");
            return colon === -1 ? { prop: v, value: null } : { prop: v.slice(0, colon), value: v.slice(colon + 1) };
        }
        if (CSS_PROPERTIES.indexOf(word) !== -1) return { prop: word, value: null };

        if (word.length >= 2) {
            const keys = Object.keys(CSS_SNIPPETS)
                .filter(function (k) { return k.indexOf(word) === 0 && k.indexOf("+") === -1; })
                .sort(function (a, b) { return a.length - b.length; });
            if (keys.length === 1) return resolveProperty(keys[0]);
        }

        if (word.length >= 2) {
            const pick = fuzzyPick(word, CSS_PROPERTIES);
            if (pick) return { prop: pick, value: null };
        }
        return null;
    }

    function resolveKeyword(word, prop) {
        const list = PROP_KEYWORDS[prop] || GLOBAL_KEYWORDS;
        if (list.indexOf(word) !== -1) return word;
        const prefix = list.filter(function (k) { return k.indexOf(word) === 0; })[0];
        if (prefix) return prefix;
        const fuzzy = fuzzyPick(word, list);
        if (fuzzy) return fuzzy;
        if (!PROP_KEYWORDS[prop]) return word;
        const global = fuzzyPick(word, GLOBAL_KEYWORDS);
        return global || word;
    }

    function formatNumber(raw, unit, prop) {
        const value = raw.replace(/^(-?)\./, "$10.").replace(/^(-?)0+(?=\d)/, "$1");
        const isZero = /^-?0*\.?0*$/.test(raw);
        if (unit) {
            return raw + (UNIT_ALIASES[unit] || unit);
        }
        if (UNITLESS.has(prop)) return raw;
        if (isZero) return "0";
        return /\./.test(raw) ? raw + "em" : value + "px";
    }

    function expandColor(hex) {
        const h = hex.slice(1);
        if (h.length === 0) return "#000";
        if (/^[0-9a-fA-F]$/.test(h)) return "#" + h + h + h;
        if (/^[0-9a-fA-F]{2}$/.test(h)) return "#" + h + h + h;
        return "#" + h;
    }

    function parseCssValues(rest, prop) {
        const tokens = [];
        let i = 0;
        while (i < rest.length) {
            const tail = rest.slice(i);
            let m;

            if (/^-[a-zA-Z#]/.test(tail)) {
                i++;
                continue;
            }

            if (tail[0] === "#") {
                m = tail.match(/^#[0-9a-fA-F]*/);
                tokens.push(expandColor(m[0]));
                i += m[0].length;
            } else if ((m = tail.match(/^-?(?:\d+\.?\d*|\.\d+)(%|[a-zA-Z]*)/))) {
                const numberPart = m[0].match(/^-?(?:\d+\.?\d*|\.\d+)/)[0];
                tokens.push(formatNumber(numberPart, m[1], prop));
                i += m[0].length;
            } else if ((m = tail.match(/^[a-zA-Z]+/))) {
                tokens.push(resolveKeyword(m[0], prop));
                i += m[0].length;
            } else {
                return null;
            }

            if (rest[i] === "-" && i < rest.length - 1) i++;
        }
        return tokens;
    }

    function expandCssSingle(part) {
        let abbr = part.trim();
        if (!abbr) return null;

        if (abbr[0] === "@") {
            return Object.prototype.hasOwnProperty.call(CSS_AT, abbr) ? CSS_AT[abbr] : null;
        }

        let prefixes = null;
        if (abbr[0] === "-") {
            const m = abbr.match(/^-([wmso]+)-(.+)$/);
            const map = { w: "-webkit-", m: "-moz-", s: "-ms-", o: "-o-" };
            if (m) {
                prefixes = m[1].split("").map(function (c) { return map[c]; });
                abbr = m[2];
            } else {
                prefixes = ["-webkit-", "-moz-", "-ms-", "-o-"];
                abbr = abbr.slice(1);
            }
        }

        let important = false;
        if (/!$/.test(abbr)) {
            important = true;
            abbr = abbr.slice(0, -1);
        }

        const direct = Object.prototype.hasOwnProperty.call(CSS_SNIPPETS, abbr) ? CSS_SNIPPETS[abbr] : null;

        let prop;
        let valueText;

        const colon = abbr.indexOf(":");
        if (colon > 0) {
            const resolved = resolveProperty(abbr.slice(0, colon));
            if (!resolved) return null;
            prop = resolved.prop;
            const tokens = parseCssValues(abbr.slice(colon + 1), prop);
            if (!tokens) return null;
            valueText = tokens.join(" ");
        } else if (direct && direct.indexOf(MARK_OPEN) !== -1) {
            const c = direct.indexOf(":");
            prop = direct.slice(0, c);
            valueText = direct.slice(c + 1);
        } else {
            const m = abbr.match(/^([a-zA-Z]+)(.*)$/);
            if (!m) return null;
            const resolved = resolveProperty(m[1]);
            if (!resolved) return null;
            prop = resolved.prop;
            if (m[2]) {
                const tokens = parseCssValues(m[2], prop);
                if (!tokens || !tokens.length) return null;
                valueText = tokens.join(" ");
            } else if (resolved.value !== null) {
                valueText = resolved.value;
            } else {
                valueText = MARK_OPEN + MARK_CLOSE;
            }
        }

        if (important) valueText += " !important";

        const lines = [];
        (prefixes || []).forEach(function (pf) {
            lines.push(pf + prop + ": " + valueText + ";");
        });
        lines.push(prop + ": " + valueText + ";");
        return lines.join("\n");
    }

    function expandCssRaw(input) {
        const text = String(input).trim();
        if (!text) fail("Rỗng");
        const whole = text.indexOf("@") === 0 || Object.prototype.hasOwnProperty.call(CSS_SNIPPETS, text);
        const parts = whole ? [text] : text.split("+");
        const out = [];
        parts.forEach(function (part) {
            const r = expandCssSingle(part);
            if (r === null) fail("CSS không hợp lệ: " + part);
            out.push(r);
        });
        return out.join("\n");
    }

    function toSnippet(raw) {
        const markers = raw.match(/«[^»]*»/g) || [];
        const total = markers.length;
        let n = 0;
        return raw.split(/(«[^»]*»)/).map(function (part, index) {
            if (index % 2 === 0) {
                return part.replace(/[\\$}]/g, "\\$&");
            }
            n++;
            const def = part.slice(1, -1).replace(/[\\$}]/g, "\\$&");
            if (n === total && !def) return "$0";
            return def ? "${" + n + ":" + def + "}" : "${" + n + "}";
        }).join("");
    }

    function toPlain(raw) {
        return raw.replace(/«([^»]*)»/g, "$1");
    }

    function run(fn) {
        try {
            const raw = fn();
            return { raw: raw, snippet: toSnippet(raw), plain: toPlain(raw) };
        } catch (error) {
            if (error && error.emmet) return null;
            throw error;
        }
    }

    function expandMarkup(abbr, options) {
        return run(function () { return expandMarkupRaw(abbr, options); });
    }

    function expandCss(abbr) {
        return run(function () { return expandCssRaw(abbr); });
    }

    function isWorthMarkup(abbr) {
        if (abbr === "!" || abbr === "!!!") return true;
        if (/^[A-Za-z][\w-]*$/.test(abbr)) {
            return KNOWN_TAGS.has(abbr) ||
                Object.prototype.hasOwnProperty.call(HTML_SNIPPETS, abbr) ||
                isLoremName(abbr);
        }
        return true;
    }

    return {
        expandMarkup: expandMarkup,
        expandCss: expandCss,
        isWorthMarkup: isWorthMarkup,
        resolveCssProperty: resolveProperty,
        toSnippet: toSnippet,
        toPlain: toPlain,
        KNOWN_TAGS: KNOWN_TAGS,
        HTML_SNIPPETS: HTML_SNIPPETS,
        CSS_SNIPPETS: CSS_SNIPPETS
    };
});
