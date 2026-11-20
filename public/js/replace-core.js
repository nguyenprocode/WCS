(function (root) {
    "use strict";

    function escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function buildSearchRegex(query, options) {
        const opts = options || {};
        let source = opts.regex ? query : escapeRegExp(query);
        if (opts.wholeWord) {
            source = "(?<![A-Za-z0-9_])(?:" + source + ")(?![A-Za-z0-9_])";
        }
        return new RegExp(source, opts.caseSensitive ? "g" : "gi");
    }

    function unescapeTemplate(template) {
        return template.replace(/\\([nt\\])/g, (all, ch) => {
            if (ch === "n") return "\n";
            if (ch === "t") return "\t";
            return "\\";
        });
    }

    function expandReplacement(template, match) {
        return template.replace(/\$(\$|&|`|'|\d{1,2}|<[^>]*>)/g, (all, token) => {
            if (token === "$") return "$";
            if (token === "&") return match[0];
            if (token === "`") return match.input.slice(0, match.index);
            if (token === "'") return match.input.slice(match.index + match[0].length);

            if (token[0] === "<") {
                if (!match.groups) return all;
                const value = match.groups[token.slice(1, -1)];
                return value === undefined ? "" : value;
            }

            const n = parseInt(token, 10);

            if (token.length === 2 && (n === 0 || n >= match.length)) {
                const first = parseInt(token[0], 10);
                if (first >= 1 && first < match.length) {
                    return (match[first] === undefined ? "" : match[first]) + token[1];
                }
                return all;
            }

            if (n >= 1 && n < match.length) {
                return match[n] === undefined ? "" : match[n];
            }
            return all;
        });
    }

    function collectMatches(content, regex, replacement, isRegex) {
        const lines = String(content).split(/\r?\n/);
        const template = isRegex ? unescapeTemplate(replacement) : replacement;
        const matches = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            regex.lastIndex = 0;
            let m;
            while ((m = regex.exec(line)) !== null) {
                if (m[0].length === 0) {
                    regex.lastIndex++;
                    continue;
                }
                matches.push({
                    line: i + 1,
                    column: m.index + 1,
                    length: m[0].length,
                    text: isRegex ? expandReplacement(template, m) : replacement
                });
            }
        }

        return matches;
    }

    function applyMatchesToText(content, matches) {
        const text = String(content);
        const lineStarts = [0];
        for (let i = 0; i < text.length; i++) {
            if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);
        }

        let result = text;
        for (let k = matches.length - 1; k >= 0; k--) {
            const m = matches[k];
            const start = lineStarts[m.line - 1] + m.column - 1;
            result = result.slice(0, start) + m.text + result.slice(start + m.length);
        }
        return result;
    }

    const api = {
        escapeRegExp,
        buildSearchRegex,
        unescapeTemplate,
        expandReplacement,
        collectMatches,
        applyMatchesToText
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.WCSReplace = api;
})(typeof window !== "undefined" ? window : globalThis);
