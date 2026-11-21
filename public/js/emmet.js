(function () {
    "use strict";

    const Engine = window.WCSEmmetEngine;
    if (!Engine) {
        console.warn("WCS Emmet: thiếu emmet-engine.js");
        return;
    }

    let registered = false;

    function detectSyntax(model, position) {
        const language = model.getLanguageId();
        if (language === "css") return { syntax: "css", cssStart: 0 };
        if (language !== "html") return null;

        const before = model.getValueInRange({
            startLineNumber: 1, startColumn: 1,
            endLineNumber: position.lineNumber, endColumn: position.column
        });

        const re = /<(\/?)(style|script)\b[^>]*?(\/?)>/gi;
        let raw = null;
        let rawStart = 0;
        let match;
        while ((match = re.exec(before))) {
            if (match[1]) raw = null;
            else if (!match[3]) {
                raw = match[2].toLowerCase();
                rawStart = match.index + match[0].length;
            }
        }

        if (raw === "script") return null;
        if (raw === "style") return { syntax: "css", cssStart: rawStart, offsetBase: true };

        const lastOpen = before.lastIndexOf("<");
        const lastClose = before.lastIndexOf(">");
        if (lastOpen > lastClose) return null;

        const commentOpen = before.lastIndexOf("<!--");
        if (commentOpen !== -1 && before.indexOf("-->", commentOpen) === -1) return null;

        return { syntax: "html" };
    }

    function looksLikeTagEnd(textUpToAndIncludingGt) {
        if (/-->$/.test(textUpToAndIncludingGt)) return true;
        return /<\/?[A-Za-z][\w:.-]*(?:\s[^<>]*)?\/?>$/.test(textUpToAndIncludingGt);
    }

    function findMarkupStart(line) {
        let i = line.length;
        let square = 0;
        let curly = 0;
        let paren = 0;

        while (i > 0) {
            const ch = line[i - 1];

            if (ch === "]") square++;
            else if (ch === "[") { if (square === 0) break; square--; }
            else if (ch === "}") curly++;
            else if (ch === "{") { if (curly === 0) break; curly--; }
            else if (ch === ")") paren++;
            else if (ch === "(") { if (paren === 0) break; paren--; }
            else if (square > 0 || curly > 0) { }
            else if (/\s/.test(ch)) break;
            else if (ch === ">") { if (looksLikeTagEnd(line.slice(0, i))) break; }
            else if (!/[A-Za-z0-9\-_:$#@!.*+^|/]/.test(ch)) break;

            i--;
        }
        return i;
    }

    function findCssStart(line) {
        let i = line.length;
        while (i > 0 && /[A-Za-z0-9\-_:#.%!+@$]/.test(line[i - 1])) i--;
        return i;
    }

    function cssBlockDepth(text) {
        const clean = text.replace(/\/\*[\s\S]*?\*\//g, "");
        let depth = 0;
        for (let i = 0; i < clean.length; i++) {
            if (clean[i] === "{") depth++;
            else if (clean[i] === "}") depth--;
        }
        return depth;
    }

    function analyze(model, position, forCompletion) {
        const context = detectSyntax(model, position);
        if (!context) return null;

        const lineText = model.getLineContent(position.lineNumber);
        const before = lineText.slice(0, position.column - 1);
        const after = lineText.slice(position.column - 1);

        if (/^[A-Za-z0-9_-]/.test(after)) return null;
        if (!before.trim()) return null;

        if (context.syntax === "css") {
            const start = findCssStart(before);
            const abbr = before.slice(start);
            if (!abbr) return null;

            const prefixLine = before.slice(0, start).trim();
            if (prefixLine && !/[{};]$/.test(prefixLine)) return null;

            const blockText = model.getValueInRange({
                startLineNumber: 1, startColumn: 1,
                endLineNumber: position.lineNumber, endColumn: start + 1
            });
            const fromOffset = context.cssStart || 0;
            const offsetOfBlockText = blockText.length;
            if (cssBlockDepth(blockText.slice(Math.min(fromOffset, offsetOfBlockText))) < 1 && abbr[0] !== "@") {
                return null;
            }

            const result = Engine.expandCss(abbr);
            if (!result) return null;

            if (forCompletion && /^[a-z-]+$/.test(abbr) && result.plain.indexOf(abbr + ":") === 0) return null;

            return { abbr: abbr, result: result, syntax: "css" };
        }

        const start = findMarkupStart(before);
        const full = before.slice(start);
        if (!full) return null;

        for (let skip = 0; skip < Math.min(full.length, 60); skip++) {
            const abbr = full.slice(skip);
            if (!/^[A-Za-z!.#\[{(]/.test(abbr)) continue;
            const result = Engine.expandMarkup(abbr);
            if (!result) continue;
            if (!Engine.isWorthMarkup(abbr)) return null;
            return { abbr: abbr, result: result, syntax: "html" };
        }
        return null;
    }

    function insertSnippet(editor, snippet, plain, overwriteBefore) {
        const controller = editor.getContribution("snippetController2");
        if (controller && typeof controller.insert === "function") {
            try {
                controller.insert(snippet, { overwriteBefore: overwriteBefore || 0 });
                return;
            } catch (error) {
                console.warn("WCS Emmet: snippet controller lỗi, dùng chèn thường.", error);
            }
        }

        const position = editor.getPosition();
        const model = editor.getModel();
        const tabSize = model.getOptions().tabSize;
        const useSpaces = model.getOptions().insertSpaces;
        const lineText = model.getLineContent(position.lineNumber);
        const baseIndent = (lineText.match(/^\s*/) || [""])[0];
        const unit = useSpaces ? " ".repeat(tabSize) : "\t";
        const text = plain.split("\n").map(function (line, index) {
            const converted = line.replace(/^\t+/, function (tabs) { return unit.repeat(tabs.length); });
            return index === 0 ? converted : baseIndent + converted;
        }).join("\n");

        editor.executeEdits("emmet", [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - (overwriteBefore || 0),
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: text,
            forceMoveMarkers: true
        }]);
    }

    function onTab(editor) {
        const model = editor.getModel();
        const position = editor.getPosition();

        if (model && position) {
            let found = null;
            try {
                found = analyze(model, position, false);
            } catch (error) {
                console.warn("WCS Emmet:", error);
            }
            if (found) {
                insertSnippet(editor, found.result.snippet, found.result.plain, found.abbr.length);
                return;
            }
        }
        editor.trigger("emmet", "tab", null);
    }

    function completionProvider() {
        return {
            triggerCharacters: [">", "+", "*", "^", "$", "#", "]", "}", ")"],
            provideCompletionItems(model, position) {
                const found = analyze(model, position, true);
                if (!found) return { suggestions: [] };

                if (found.syntax === "html" && /^[A-Za-z][\w-]*$/.test(found.abbr) &&
                    Engine.KNOWN_TAGS.has(found.abbr) && !Engine.HTML_SNIPPETS[found.abbr]) {
                    return { suggestions: [] };
                }

                const language = found.syntax === "css" ? "css" : "html";
                return {
                    incomplete: true,
                    suggestions: [{
                        label: found.abbr,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        detail: "Emmet Abbreviation",
                        documentation: {
                            value: "```" + language + "\n" + found.result.plain.replace(/\t/g, "  ") + "\n```"
                        },
                        insertText: found.result.snippet,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column - found.abbr.length,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        },
                        filterText: found.abbr,
                        sortText: "0",
                        preselect: true
                    }]
                };
            }
        };
    }

    function injectPromptStyles() {
        if (document.getElementById("wcsEmmetStyles")) return;
        const style = document.createElement("style");
        style.id = "wcsEmmetStyles";
        style.textContent = `
            .wcs-emmet-prompt{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:60;
                width:min(460px,calc(100% - 24px));background:#111;border:1px solid #303030;border-radius:8px;
                box-shadow:0 8px 28px rgba(0,0,0,.55);padding:10px 12px;color:#e5e5e5;font:13px/1.4 system-ui,sans-serif}
            .wcs-emmet-prompt label{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#8a8a8a;margin-bottom:6px}
            .wcs-emmet-prompt input{width:100%;box-sizing:border-box;background:#050505;color:#e5e5e5;border:1px solid #303030;
                border-radius:6px;padding:8px 10px;font:14px Consolas,Menlo,monospace;outline:none}
            .wcs-emmet-prompt input:focus{border-color:#666}
            .wcs-emmet-prompt.invalid input{border-color:#b45454}
            .wcs-emmet-prompt pre{margin:8px 0 0;max-height:150px;overflow:auto;font:12px Consolas,Menlo,monospace;color:#a3a3a3;white-space:pre-wrap}
        `;
        document.head.appendChild(style);
    }

    function askAbbreviation(editor, title, preview) {
        injectPromptStyles();
        return new Promise(function (resolve) {
            const host = editor.getDomNode();
            if (!host) { resolve(null); return; }

            const box = document.createElement("div");
            box.className = "wcs-emmet-prompt";
            box.innerHTML = "<label></label><input type=\"text\" spellcheck=\"false\" autocomplete=\"off\" autocapitalize=\"off\"><pre></pre>";
            box.querySelector("label").textContent = title;
            const input = box.querySelector("input");
            const pre = box.querySelector("pre");
            host.appendChild(box);

            let finished = false;
            function finish(value) {
                if (finished) return;
                finished = true;
                box.remove();
                editor.focus();
                resolve(value);
            }

            input.addEventListener("input", function () {
                const text = preview(input.value.trim());
                box.classList.toggle("invalid", !!input.value.trim() && text === null);
                pre.textContent = text || "";
            });
            input.addEventListener("keydown", function (event) {
                event.stopPropagation();
                if (event.key === "Enter") {
                    event.preventDefault();
                    const value = input.value.trim();
                    finish(value && preview(value) !== null ? value : null);
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                }
            });
            input.addEventListener("blur", function () { setTimeout(function () { finish(null); }, 120); });
            setTimeout(function () { input.focus(); }, 0);
        });
    }

    function dedent(lines) {
        let min = Infinity;
        lines.forEach(function (line) {
            if (!line.trim()) return;
            const n = line.match(/^[ \t]*/)[0].length;
            if (n < min) min = n;
        });
        if (!isFinite(min)) min = 0;
        return lines.map(function (line) { return line.slice(min).replace(/\s+$/, ""); });
    }

    async function wrapWithAbbreviation(editor) {
        const model = editor.getModel();
        if (!model || model.getLanguageId() !== "html") return;

        let selection = editor.getSelection();
        if (selection.isEmpty()) {
            const line = model.getLineContent(selection.startLineNumber);
            const first = line.search(/\S/);
            if (first === -1) return;
            selection = new monaco.Selection(
                selection.startLineNumber, first + 1,
                selection.startLineNumber, line.replace(/\s+$/, "").length + 1
            );
        }

        const lines = dedent(model.getValueInRange(selection).split(/\r?\n/));
        while (lines.length && !lines[0].trim()) lines.shift();
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        if (!lines.length) return;

        const abbr = await askAbbreviation(
            editor,
            "Wrap with Abbreviation (Enter: áp dụng, Esc: hủy)",
            function (value) {
                if (!value) return "";
                const result = Engine.expandMarkup(value, { wrap: { lines: lines } });
                return result ? result.plain.replace(/\t/g, "  ") : null;
            }
        );
        if (!abbr) return;

        const result = Engine.expandMarkup(abbr, { wrap: { lines: lines } });
        if (!result) return;

        editor.setSelection(selection);
        insertSnippet(editor, result.snippet, result.plain, 0);
    }

    function evaluateMath(source) {
        const text = source.replace(/\s+/g, "").replace(/\\/g, "/");
        let pos = 0;

        function parseExpression() {
            let value = parseTerm();
            while (text[pos] === "+" || text[pos] === "-") {
                const op = text[pos++];
                const right = parseTerm();
                value = op === "+" ? value + right : value - right;
            }
            return value;
        }
        function parseTerm() {
            let value = parseFactor();
            while (text[pos] === "*" || text[pos] === "/") {
                const op = text[pos++];
                const right = parseFactor();
                value = op === "*" ? value * right : value / right;
            }
            return value;
        }
        function parseFactor() {
            if (text[pos] === "-") { pos++; return -parseFactor(); }
            if (text[pos] === "+") { pos++; return parseFactor(); }
            if (text[pos] === "(") {
                pos++;
                const value = parseExpression();
                if (text[pos] !== ")") throw new Error("Thiếu )");
                pos++;
                return value;
            }
            const m = text.slice(pos).match(/^\d*\.?\d+/);
            if (!m) throw new Error("Không phải số");
            pos += m[0].length;
            return parseFloat(m[0]);
        }

        const value = parseExpression();
        if (pos !== text.length || !isFinite(value)) throw new Error("Biểu thức không hợp lệ");
        return Math.round(value * 10000) / 10000;
    }

    function evaluateMathAtCursor(editor) {
        const model = editor.getModel();
        if (!model) return;

        let range = editor.getSelection();
        if (range.isEmpty()) {
            const position = editor.getPosition();
            const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
            const m = before.match(/[\d.+\-*/\\()\s]+$/);
            if (!m) return;
            const expr = m[0].replace(/^\s+/, "");
            if (!/[+\-*/\\]/.test(expr.replace(/^-/, ""))) return;
            range = new monaco.Range(
                position.lineNumber, position.column - expr.length,
                position.lineNumber, position.column
            );
        }

        try {
            const result = evaluateMath(model.getValueInRange(range));
            editor.executeEdits("emmet-math", [{ range: range, text: String(result), forceMoveMarkers: true }]);
        } catch (error) {
        }
    }

    function register() {
        if (registered || !window.monaco || !window.editor) return;
        registered = true;

        const editor = window.editor;

        editor.addCommand(
            monaco.KeyCode.Tab,
            function () { onTab(editor); },
            "editorTextFocus && !editorReadonly && !editorHasSelection && !hasMultipleSelections && " +
            "!suggestWidgetVisible && !inSnippetMode && !editorTabMovesFocus && !inlineSuggestionVisible"
        );

        monaco.languages.registerCompletionItemProvider("html", completionProvider());
        monaco.languages.registerCompletionItemProvider("css", completionProvider());

        editor.addAction({
            id: "wcs.emmet.wrap",
            label: "Emmet: Wrap with Abbreviation",
            keybindings: [monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyW],
            precondition: "!editorReadonly",
            contextMenuGroupId: "9_emmet",
            contextMenuOrder: 1,
            run: function () { return wrapWithAbbreviation(editor); }
        });

        editor.addAction({
            id: "wcs.emmet.math",
            label: "Emmet: Evaluate Math Expression",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyY],
            precondition: "!editorReadonly",
            contextMenuGroupId: "9_emmet",
            contextMenuOrder: 2,
            run: function () { evaluateMathAtCursor(editor); }
        });

        console.log("WCS: Emmet đã sẵn sàng! (Tab để bung, Alt+Shift+W để Wrap)");
    }

    window.addEventListener("editorReady", register);
    if (window.monaco && window.editor) register();

    window.WCSEmmet = { analyze: analyze, evaluateMath: evaluateMath };
})();
