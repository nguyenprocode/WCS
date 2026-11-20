(function () {
    "use strict";

    const cssProperties = [
        "display", "position", "top", "right", "bottom", "left", "z-index",
        "float", "clear", "overflow", "overflow-x", "overflow-y",
        "visibility", "opacity",

        "flex", "flex-direction", "flex-wrap", "flex-flow",
        "justify-content", "align-items", "align-content", "align-self",
        "order", "flex-grow", "flex-shrink", "flex-basis", "gap",
        "row-gap", "column-gap",

        "grid", "grid-template-columns", "grid-template-rows",
        "grid-template-areas", "grid-template", "grid-column", "grid-row",
        "grid-area", "grid-auto-columns", "grid-auto-rows", "grid-auto-flow",
        "grid-gap", "place-items", "place-content", "place-self",

        "width", "height", "min-width", "max-width", "min-height", "max-height",
        "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
        "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
        "border", "border-width", "border-style", "border-color",
        "border-top", "border-right", "border-bottom", "border-left",
        "border-radius", "border-top-left-radius", "border-top-right-radius",
        "border-bottom-left-radius", "border-bottom-right-radius",
        "box-sizing", "outline", "outline-offset",

        "background", "background-color", "background-image",
        "background-size", "background-position", "background-repeat",
        "background-attachment", "background-origin", "background-clip",
        "background-blend-mode",

        "color", "font", "font-size", "font-family", "font-weight",
        "font-style", "font-variant", "line-height", "letter-spacing",
        "word-spacing", "text-align", "text-decoration", "text-transform",
        "text-indent", "text-shadow", "text-overflow", "white-space",
        "word-break", "word-wrap", "overflow-wrap", "vertical-align",
        "direction", "unicode-bidi",

        "box-shadow", "filter", "backdrop-filter", "mix-blend-mode",
        "opacity", "cursor", "pointer-events", "user-select",
        "resize", "object-fit", "object-position",

        "transform", "transform-origin", "transform-style",
        "transition", "transition-property", "transition-duration",
        "transition-timing-function", "transition-delay",
        "animation", "animation-name", "animation-duration",
        "animation-timing-function", "animation-delay",
        "animation-iteration-count", "animation-direction",
        "animation-fill-mode", "animation-play-state",

        "list-style", "list-style-type", "list-style-position", "list-style-image",
        "border-collapse", "border-spacing", "table-layout", "caption-side",
        "empty-cells",

        "content", "quotes", "counter-reset", "counter-increment",
        "clip-path", "mask", "isolation", "will-change",
        "scroll-behavior", "scroll-snap-type", "scroll-margin", "scroll-padding",
        "aspect-ratio", "accent-color", "caret-color", "appearance"
    ];

    const cssValues = {
        "display": ["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "none", "table", "table-cell", "table-row", "contents", "list-item", "flow-root"],
        "position": ["static", "relative", "absolute", "fixed", "sticky"],
        "overflow": ["visible", "hidden", "scroll", "auto", "clip"],
        "overflow-x": ["visible", "hidden", "scroll", "auto", "clip"],
        "overflow-y": ["visible", "hidden", "scroll", "auto", "clip"],
        "visibility": ["visible", "hidden", "collapse"],
        "cursor": ["auto", "default", "pointer", "move", "text", "wait", "help", "not-allowed", "grab", "grabbing", "crosshair", "zoom-in", "zoom-out", "none"],
        "text-align": ["left", "right", "center", "justify", "start", "end"],
        "text-decoration": ["none", "underline", "overline", "line-through"],
        "text-transform": ["none", "uppercase", "lowercase", "capitalize"],
        "font-weight": ["normal", "bold", "lighter", "bolder", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
        "font-style": ["normal", "italic", "oblique"],
        "white-space": ["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"],
        "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
        "flex-wrap": ["nowrap", "wrap", "wrap-reverse"],
        "justify-content": ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "start", "end"],
        "align-items": ["stretch", "flex-start", "flex-end", "center", "baseline", "start", "end"],
        "align-content": ["stretch", "flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly", "start", "end"],
        "align-self": ["auto", "stretch", "flex-start", "flex-end", "center", "baseline", "start", "end"],
        "object-fit": ["fill", "contain", "cover", "none", "scale-down"],
        "background-size": ["auto", "cover", "contain"],
        "background-repeat": ["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"],
        "background-position": ["top", "bottom", "left", "right", "center"],
        "background-attachment": ["scroll", "fixed", "local"],
        "border-style": ["none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "hidden"],
        "box-sizing": ["content-box", "border-box"],
        "pointer-events": ["auto", "none"],
        "user-select": ["auto", "none", "text", "all"],
        "resize": ["none", "both", "horizontal", "vertical"],
        "list-style-type": ["disc", "circle", "square", "decimal", "none", "disclosure-open", "disclosure-closed"],
        "list-style-position": ["inside", "outside"],
        "table-layout": ["auto", "fixed"],
        "border-collapse": ["collapse", "separate"],
        "caption-side": ["top", "bottom"],
        "empty-cells": ["show", "hide"],
        "word-break": ["normal", "break-all", "keep-all", "break-word"],
        "overflow-wrap": ["normal", "break-word", "anywhere"],
        "vertical-align": ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super"],
        "direction": ["ltr", "rtl"],
        "float": ["left", "right", "none"],
        "clear": ["left", "right", "both", "none"],
        "color": ["red", "blue", "green", "black", "white", "yellow", "orange", "purple", "pink", "gray", "grey", "transparent", "currentColor", "inherit"],
        "background-color": ["red", "blue", "green", "black", "white", "yellow", "orange", "purple", "pink", "gray", "grey", "transparent", "currentColor", "inherit"]
    };


    const cssColors = [
        "transparent", "currentColor", "black", "white", "red", "green", "blue", "yellow", "orange", "purple",
        "pink", "gray", "grey", "brown", "cyan", "magenta", "lime", "maroon", "navy", "olive", "teal", "silver",
        "aqua", "fuchsia", "gold", "indigo", "violet", "coral", "salmon", "tomato", "crimson", "khaki", "orchid",
        "plum", "tan", "turquoise", "beige", "ivory", "lavender", "linen", "mintcream", "snow", "azure",
        "aliceblue", "antiquewhite", "aquamarine", "bisque", "blueviolet", "burlywood", "cadetblue", "chartreuse",
        "chocolate", "cornflowerblue", "cornsilk", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen",
        "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon",
        "darkseagreen", "darkslateblue", "darkslategray", "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
        "dimgray", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "gainsboro", "ghostwhite", "goldenrod",
        "greenyellow", "honeydew", "hotpink", "indianred", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
        "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink", "lightsalmon", "lightseagreen",
        "lightskyblue", "lightslategray", "lightsteelblue", "lightyellow", "limegreen", "mediumaquamarine",
        "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen",
        "mediumturquoise", "mediumvioletred", "midnightblue", "mistyrose", "moccasin", "navajowhite", "oldlace",
        "olivedrab", "orangered", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip",
        "peachpuff", "peru", "powderblue", "rosybrown", "royalblue", "saddlebrown", "sandybrown", "seagreen",
        "seashell", "sienna", "skyblue", "slateblue", "slategray", "springgreen", "steelblue", "thistle",
        "wheat", "whitesmoke", "yellowgreen", "rebeccapurple"
    ];

    const cssColorFunctions = ["rgb()", "rgba()", "hsl()", "hsla()", "var()", "color-mix()"];
    const cssLengths = ["0", "auto", "100%", "50%", "1rem", "1.5rem", "2rem", "1em", "10px", "16px", "20px", "100vh", "100vw", "calc()", "var()"];
    const cssSizes = ["auto", "100%", "50%", "100vw", "100vh", "fit-content", "min-content", "max-content", "0", "1rem", "10px", "calc()", "var()"];
    const cssLineStyles = ["none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"];
    const cssBorderWidths = ["thin", "medium", "thick", "0", "1px", "2px", "3px"];
    const cssGradients = ["linear-gradient()", "radial-gradient()", "conic-gradient()", "url()"];
    const cssTimings = ["ease", "ease-in", "ease-out", "ease-in-out", "linear", "cubic-bezier()", "steps()"];
    const cssFontFamilies = [
        "Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond",
        "Courier New", "Brush Script MT", "Segoe UI", "Roboto", "Open Sans", "Inter", "Poppins", "Montserrat",
        "sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif",
        "ui-monospace", "-apple-system", "BlinkMacSystemFont"
    ];

    function extendCssValues(properties, values) {
        properties.forEach(property => {
            const current = cssValues[property] || [];
            cssValues[property] = [...new Set([...current, ...values])];
        });
    }

    extendCssValues(
        ["color", "background-color", "border-color", "border-top-color", "border-right-color",
         "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color",
         "caret-color", "accent-color", "fill", "stroke", "column-rule-color", "text-emphasis-color"],
        [...cssColors, ...cssColorFunctions, "inherit", "initial", "unset"]
    );
    extendCssValues(["background"], [...cssColors, ...cssColorFunctions, ...cssGradients,
        "no-repeat", "repeat", "repeat-x", "repeat-y", "cover", "contain", "center", "fixed", "scroll", "none"]);
    extendCssValues(["background-image"], [...cssGradients, "none"]);
    extendCssValues(["border", "border-top", "border-right", "border-bottom", "border-left", "outline", "column-rule"],
        [...cssLineStyles, ...cssBorderWidths, ...cssColors, ...cssColorFunctions]);
    extendCssValues(["border-width", "border-top-width", "border-right-width", "border-bottom-width",
        "border-left-width", "outline-width"], cssBorderWidths);
    extendCssValues(["border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
        "outline-style", "text-decoration-style", "column-rule-style"], [...cssLineStyles, "wavy"]);
    extendCssValues(["border-radius", "border-top-left-radius", "border-top-right-radius",
        "border-bottom-left-radius", "border-bottom-right-radius"], ["0", "50%", "100%", "4px", "8px", "12px", "16px", "9999px", "1rem"]);
    extendCssValues(["width", "height", "min-width", "min-height", "max-width", "max-height", "flex-basis",
        "inline-size", "block-size"], cssSizes);
    extendCssValues(["margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding",
        "padding-top", "padding-right", "padding-bottom", "padding-left", "gap", "row-gap", "column-gap",
        "top", "right", "bottom", "left", "inset", "text-indent", "letter-spacing", "word-spacing",
        "border-spacing", "outline-offset"], cssLengths);
    extendCssValues(["font-size"], ["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large",
        "smaller", "larger", "12px", "14px", "16px", "18px", "24px", "1rem", "1.25rem", "1.5rem", "2rem", "calc()", "clamp()"]);
    extendCssValues(["font-family"], cssFontFamilies);
    extendCssValues(["font"], ["normal", "italic", "bold", ...cssFontFamilies]);
    extendCssValues(["line-height"], ["normal", "1", "1.2", "1.4", "1.5", "1.6", "2", "100%", "1.5rem"]);
    extendCssValues(["box-shadow"], ["none", "inset", ...cssColors, ...cssColorFunctions, "0 2px 4px", "0 4px 12px", "0 0 0 1px"]);
    extendCssValues(["text-shadow"], ["none", ...cssColors, ...cssColorFunctions, "1px 1px 2px", "0 2px 4px"]);
    extendCssValues(["filter", "backdrop-filter"], ["none", "blur()", "brightness()", "contrast()", "drop-shadow()",
        "grayscale()", "hue-rotate()", "invert()", "opacity()", "saturate()", "sepia()"]);
    extendCssValues(["transform"], ["none", "translate()", "translateX()", "translateY()", "rotate()",
        "scale()", "scaleX()", "scaleY()", "skew()", "matrix()", "perspective()"]);
    extendCssValues(["transform-origin"], ["center", "top", "bottom", "left", "right", "50% 50%", "0 0"]);
    extendCssValues(["transition", "animation"], ["all", "none", "0.2s", "0.3s", "0.5s", "1s", "infinite",
        "forwards", "alternate", ...cssTimings]);
    extendCssValues(["transition-property"], ["all", "none", "opacity", "transform", "color", "background-color", "width", "height"]);
    extendCssValues(["transition-timing-function", "animation-timing-function"], cssTimings);
    extendCssValues(["transition-duration", "transition-delay", "animation-duration", "animation-delay"],
        ["0s", "0.2s", "0.3s", "0.5s", "1s", "2s"]);
    extendCssValues(["animation-iteration-count"], ["infinite", "1", "2", "3"]);
    extendCssValues(["animation-direction"], ["normal", "reverse", "alternate", "alternate-reverse"]);
    extendCssValues(["animation-fill-mode"], ["none", "forwards", "backwards", "both"]);
    extendCssValues(["animation-play-state"], ["running", "paused"]);
    extendCssValues(["opacity"], ["0", "0.25", "0.5", "0.75", "1"]);
    extendCssValues(["z-index"], ["-1", "0", "1", "10", "100", "999", "9999"]);
    extendCssValues(["flex"], ["1", "0 0 auto", "1 1 0%", "auto", "none", "initial"]);
    extendCssValues(["flex-grow", "flex-shrink", "order"], ["0", "1", "2", "-1"]);
    extendCssValues(["flex-flow"], ["row", "column", "wrap", "nowrap", "row wrap", "column wrap"]);
    extendCssValues(["grid-template-columns", "grid-template-rows"], ["none", "repeat()", "minmax()", "1fr",
        "auto", "repeat(2, 1fr)", "repeat(3, 1fr)", "repeat(auto-fit, minmax(200px, 1fr))", "subgrid"]);
    extendCssValues(["grid-auto-flow"], ["row", "column", "dense", "row dense", "column dense"]);
    extendCssValues(["grid-auto-columns", "grid-auto-rows"], ["auto", "1fr", "min-content", "max-content", "minmax()"]);
    extendCssValues(["grid-column", "grid-row", "grid-column-start", "grid-column-end", "grid-row-start",
        "grid-row-end"], ["auto", "1", "2", "span 2", "span 3", "1 / -1"]);
    extendCssValues(["place-items", "place-content", "place-self", "justify-items", "justify-self"],
        ["center", "start", "end", "stretch", "space-between", "space-around", "space-evenly"]);
    extendCssValues(["content"], ['""', "none", "normal", "attr()", "counter()", "open-quote", "close-quote"]);
    extendCssValues(["text-overflow"], ["clip", "ellipsis"]);
    extendCssValues(["text-decoration-line"], ["none", "underline", "overline", "line-through"]);
    extendCssValues(["font-variant"], ["normal", "small-caps"]);
    extendCssValues(["font-stretch"], ["normal", "condensed", "expanded"]);
    extendCssValues(["writing-mode"], ["horizontal-tb", "vertical-rl", "vertical-lr"]);
    extendCssValues(["word-wrap"], ["normal", "break-word"]);
    extendCssValues(["object-position"], ["center", "top", "bottom", "left", "right"]);
    extendCssValues(["mix-blend-mode"], ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"]);
    extendCssValues(["scroll-behavior"], ["auto", "smooth"]);
    extendCssValues(["overscroll-behavior"], ["auto", "contain", "none"]);
    extendCssValues(["clip-path"], ["none", "circle()", "ellipse()", "inset()", "polygon()"]);
    extendCssValues(["will-change"], ["auto", "transform", "opacity", "scroll-position"]);
    extendCssValues(["touch-action"], ["auto", "none", "pan-x", "pan-y", "manipulation"]);
    extendCssValues(["backface-visibility"], ["visible", "hidden"]);
    extendCssValues(["appearance"], ["none", "auto"]);
    extendCssValues(["aspect-ratio"], ["auto", "1 / 1", "16 / 9", "4 / 3", "3 / 2"]);
    extendCssValues(["list-style"], ["none", "disc", "circle", "square", "decimal", "inside", "outside"]);
    extendCssValues(["list-style-image"], ["none", "url()"]);
    extendCssValues(["background-clip", "background-origin"], ["border-box", "padding-box", "content-box", "text"]);
    extendCssValues(["background-blend-mode"], ["normal", "multiply", "screen", "overlay", "darken", "lighten"]);
    extendCssValues(["outline-style"], cssLineStyles);

    extendCssValues(["grid-template-areas"], ["none", '"header header" "sidebar main"']);
    extendCssValues(["grid-template"], ["none", "auto", "repeat()", "minmax()", "1fr", "subgrid"]);
    extendCssValues(["grid"], ["none", "auto", "repeat()", "minmax()", "1fr", "auto-flow", "dense", "subgrid"]);
    extendCssValues(["grid-area"], ["auto", "1", "span 2", "1 / 1 / 2 / 2"]);
    extendCssValues(["grid-gap"], cssLengths);
    extendCssValues(["unicode-bidi"], ["normal", "embed", "bidi-override", "isolate", "isolate-override", "plaintext"]);
    extendCssValues(["transform-style"], ["flat", "preserve-3d"]);
    extendCssValues(["animation-name"], ["none"]);
    extendCssValues(["quotes"], ["none", "auto", '"\\201C" "\\201D"']);
    extendCssValues(["counter-reset", "counter-increment"], ["none"]);
    extendCssValues(["mask"], ["none", ...cssGradients, "no-repeat", "center", "cover", "contain"]);
    extendCssValues(["isolation"], ["auto", "isolate"]);
    extendCssValues(["scroll-snap-type"], ["none", "x", "y", "block", "inline", "both", "mandatory", "proximity",
        "x mandatory", "y mandatory", "x proximity", "y proximity"]);
    extendCssValues(["scroll-margin", "scroll-padding"], cssLengths);
    extendCssValues(["scroll-snap-align"], ["none", "start", "end", "center"]);
    extendCssValues(["text-align-last"], ["auto", "left", "right", "center", "justify", "start", "end"]);
    extendCssValues(["text-decoration-thickness"], ["auto", "from-font", "1px", "2px", "0.1em"]);
    extendCssValues(["text-underline-offset"], ["auto", "1px", "2px", "0.1em"]);
    extendCssValues(["line-break"], ["auto", "loose", "normal", "strict", "anywhere"]);
    extendCssValues(["hyphens"], ["none", "manual", "auto"]);
    extendCssValues(["tab-size"], ["4", "2", "8"]);
    extendCssValues(["user-drag", "-webkit-user-drag"], ["auto", "none", "element"]);
    extendCssValues(["contain"], ["none", "strict", "content", "size", "layout", "style", "paint"]);
    extendCssValues(["content-visibility"], ["visible", "auto", "hidden"]);
    extendCssValues(["justify-items", "justify-self"], ["auto", "normal", "stretch", "baseline", "left", "right", "flex-start", "flex-end", "self-start", "self-end", "safe", "unsafe"]);
    extendCssValues(["align-items", "align-self"], ["normal", "self-start", "self-end", "safe", "unsafe"]);
    extendCssValues(["align-content", "justify-content"], ["normal", "left", "right", "safe", "unsafe"]);
    extendCssValues(["font-weight"], ["bolder", "lighter"]);
    extendCssValues(["font-variant"], ["all-small-caps", "petite-caps", "unicase", "titling-caps"]);
    extendCssValues(["text-decoration"], ["underline overline", "dotted", "dashed", "wavy", "double", "solid", ...cssColors]);
    extendCssValues(["cursor"], ["alias", "all-scroll", "cell", "col-resize", "row-resize", "context-menu", "copy",
        "e-resize", "n-resize", "ne-resize", "nw-resize", "s-resize", "se-resize", "sw-resize", "w-resize",
        "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "no-drop", "progress", "vertical-text", "url()"]);
    extendCssValues(["display"], ["inline-table", "table-row-group", "table-header-group", "table-footer-group",
        "table-column", "table-column-group", "table-caption", "run-in", "ruby", "math"]);
    extendCssValues(["overflow", "overflow-x", "overflow-y"], ["overlay"]);
    extendCssValues(["mix-blend-mode"], ["color-dodge", "color-burn", "hard-light", "soft-light", "exclusion",
        "hue", "saturation", "color", "luminosity", "plus-lighter"]);
    extendCssValues(["background-blend-mode"], ["color-dodge", "color-burn", "hard-light", "soft-light",
        "difference", "exclusion", "hue", "saturation", "color", "luminosity"]);
    extendCssValues(["background-position"], ["0 0", "50% 50%", "left top", "left center", "left bottom",
        "right top", "right center", "right bottom", "center top", "center bottom"]);
    extendCssValues(["background-size"], ["100%", "50%", "100% 100%", "auto 100%", "100% auto"]);
    extendCssValues(["object-fit"], ["fill", "contain", "cover", "none", "scale-down"]);
    extendCssValues(["resize"], ["block", "inline"]);
    extendCssValues(["user-select"], ["contain"]);
    extendCssValues(["pointer-events"], ["visiblePainted", "visibleFill", "visibleStroke", "visible", "painted", "fill", "stroke", "all"]);
    extendCssValues(["vertical-align"], ["0", "10px", "-10px", "50%"]);
    extendCssValues(["white-space"], ["pre-wrap", "break-spaces"]);
    extendCssValues(["word-break"], ["break-word"]);
    extendCssValues(["transition-property"], ["margin", "padding", "border", "border-color", "box-shadow", "filter",
        "visibility", "top", "left", "right", "bottom", "font-size", "line-height", "background"]);
    extendCssValues(["will-change"], ["contents", "scroll-position", "left", "top"]);
    extendCssValues(["clip-path"], ["path()", "url()", "margin-box", "border-box", "padding-box", "content-box"]);
    extendCssValues(["backdrop-filter"], ["blur(10px)", "blur(4px)"]);
    extendCssValues(["filter"], ["blur(4px)", "brightness(1.2)", "contrast(1.2)", "grayscale(100%)", "drop-shadow(0 2px 4px #000)"]);
    extendCssValues(["transform"], ["translate(-50%, -50%)", "rotate(45deg)", "scale(1.1)", "translateX(10px)", "translateY(10px)",
        "translate3d()", "scale3d()", "rotateX()", "rotateY()", "rotateZ()", "rotate3d()", "skewX()", "skewY()", "matrix3d()"]);

    const globalCssKeywords = ["inherit", "initial", "unset", "revert", "revert-layer"];

    const commonValues = [
        ...globalCssKeywords,
        "auto", "none", "normal", "0", "100%", "50%", "100vh", "100vw", "100dvh", "100dvw",
        "fit-content", "min-content", "max-content", "1fr", "repeat()", "minmax()"
    ];

    const jsKeywords = [
        "break", "case", "catch", "class", "const", "continue", "debugger",
        "default", "delete", "do", "else", "export", "extends", "false",
        "finally", "for", "function", "if", "import", "in", "instanceof",
        "let", "new", "null", "return", "super", "switch", "this", "throw",
        "true", "try", "typeof", "var", "void", "while", "with", "yield",
        "async", "await", "of", "static", "get", "set"
    ];

    const jsBuiltins = [
        "console", "log", "error", "warn", "info", "table", "clear", "dir",
        "document", "window", "navigator", "location", "history", "screen",
        "localStorage", "sessionStorage", "fetch", "Promise", "JSON",
        "parse", "stringify", "Math", "Date", "Array", "Object", "String",
        "Number", "Boolean", "Map", "Set", "WeakMap", "WeakSet",
        "addEventListener", "removeEventListener", "querySelector",
        "querySelectorAll", "getElementById", "getElementsByClassName",
        "getElementsByTagName", "createElement", "appendChild", "removeChild",
        "classList", "add", "remove", "toggle", "contains", "setAttribute",
        "getAttribute", "removeAttribute", "style", "innerHTML", "textContent",
        "value", "checked", "disabled", "focus", "blur", "click",
        "preventDefault", "stopPropagation", "target", "currentTarget",
        "setTimeout", "setInterval", "clearTimeout", "clearInterval",
        "requestAnimationFrame", "cancelAnimationFrame",
        "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent",
        "decodeURIComponent", "btoa", "atob"
    ];

    const triggerSuggestCommand = { id: "editor.action.triggerSuggest", title: "Suggest" };

    function getWordRange(model, position) {
        const word = model.getWordUntilPosition(position);
        return {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: position.column
        };
    }

    function makeSuggestion(label, insertText, kind, range, detail, documentation) {
        return {
            label,
            insertText,
            kind,
            range,
            detail: detail || "",
            documentation: documentation || "",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        };
    }

    function getCssSuggestions(source, range, appendSemicolon = true) {
        const suggestions = [];
        const parts = source.split(/[;{}]/);
        const currentPart = (parts[parts.length - 1] || "").trimStart();

        const valueMatch = currentPart.match(/^([\w-]+)\s*:\s*([^;{}]*)$/);

        if (valueMatch) {
            const property = valueMatch[1].toLowerCase();
            const valueText = valueMatch[2];
            const prefixMatch = valueText.match(/[\w%-]*$/);
            const prefix = prefixMatch ? prefixMatch[0].toLowerCase() : "";

            const values = [...new Set([
                ...(cssValues[property] || []),
                ...((cssValues[property] && cssValues[property].length) ? globalCssKeywords : commonValues)
            ])];

            const needsSpace = valueText === "" && !/\s$/.test(currentPart);

            const valueRange = {
                startLineNumber: range.startLineNumber,
                endLineNumber: range.endLineNumber,
                startColumn: range.endColumn - prefix.length,
                endColumn: range.endColumn
            };

            values.forEach(value => {
                if (prefix && !value.toLowerCase().startsWith(prefix)) return;

                const semi = appendSemicolon ? ";" : "";
                const isFunction = /\(\)$/.test(value);
                const isColor = cssColors.includes(value);

                suggestions.push({
                    label: value,
                    insertText: (needsSpace ? " " : "") + (isFunction
                        ? value.slice(0, -1) + "$1)" + semi + "$0"
                        : value.replace(/[$}\\]/g, "\\$&") + semi),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: isColor
                        ? monaco.languages.CompletionItemKind.Color
                        : isFunction
                            ? monaco.languages.CompletionItemKind.Function
                            : monaco.languages.CompletionItemKind.Value,
                    range: valueRange,
                    detail: "CSS value (" + property + ")",
                    sortText: String(suggestions.length).padStart(4, "0")
                });
            });

            return suggestions;
        }

        const propertyMatch = currentPart.match(/^([\w-]*)$/);

        if (propertyMatch) {
            const prefix = propertyMatch[1].toLowerCase();

            cssProperties.forEach(property => {
                if (prefix && !property.startsWith(prefix)) return;

                suggestions.push({
                    label: property,
                    insertText: property + ": $0",
                    kind: monaco.languages.CompletionItemKind.Property,
                    range,
                    detail: "CSS property",
                    command: triggerSuggestCommand,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                });
            });
        }

        return suggestions;
    }

    const HTML_DATA = window.WCS_HTML_DATA || {
        GLOBAL: [], EVENTS: [], ARIA: [], ROLES: [], VALUES: {}, TAG_VALUES: {}, TAGS: {}
    };

    const tagLookup = new Map();
    Object.keys(HTML_DATA.TAGS).forEach(name => tagLookup.set(name.toLowerCase(), name));

    function getTagInfo(name) {
        const key = tagLookup.get(String(name || "").toLowerCase());
        return key ? { name: key, ...HTML_DATA.TAGS[key] } : null;
    }

    function isVoidTag(name) {
        const info = getTagInfo(name);
        return !!(info && info.v);
    }

    const specCache = new Map();

    function parseSpec(spec) {
        if (specCache.has(spec)) return specCache.get(spec);

        let name = spec;
        let type = "text";
        let values = null;

        if (spec.endsWith("?")) {
            name = spec.slice(0, -1);
            type = "bool";
        } else if (spec.includes("=")) {
            const index = spec.indexOf("=");
            name = spec.slice(0, index);
            values = spec.slice(index + 1).split("|");
            type = "enum";
        }

        const parsed = { name, type, values };
        specCache.set(spec, parsed);
        return parsed;
    }

    function escapeSnippet(text) {
        return String(text).replace(/[\\$}]/g, "\\$&");
    }

    const MULTI_VALUE_ATTRS = new Set([
        "rel", "sandbox", "role", "autocomplete", "aria-relevant",
        "headers", "for", "itemprop", "class"
    ]);

    function getAttributesForTag(tagName) {
        const info = getTagInfo(tagName);
        const seen = new Set();
        const result = [];

        function add(spec, group) {
            const parsed = parseSpec(spec);
            if (seen.has(parsed.name)) return;
            seen.add(parsed.name);
            result.push({ ...parsed, group });
        }

        if (info) info.a.forEach(spec => add(spec, 0));
        HTML_DATA.GLOBAL.forEach(spec => add(spec, 1));
        HTML_DATA.ARIA.forEach(spec => add(spec, 2));
        HTML_DATA.EVENTS.forEach(name => add(name, 3));

        return result;
    }

    function getAttributeValues(tagName, attrName, spec) {
        const info = getTagInfo(tagName);
        const tag = info ? info.name : String(tagName || "").toLowerCase();
        const lower = attrName.toLowerCase();

        if (spec && spec.values) return spec.values;
        if (HTML_DATA.TAG_VALUES[tag + "." + lower]) return HTML_DATA.TAG_VALUES[tag + "." + lower];
        return HTML_DATA.VALUES[lower] || [];
    }

    function relativePath(fromFile, toFile) {
        const from = fromFile ? fromFile.split("/").slice(0, -1) : [];
        const to = toFile.split("/");
        let i = 0;
        while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
        return "../".repeat(from.length - i) + to.slice(i).join("/");
    }

    function getFileValues(tagName, attrName) {
        const tag = String(tagName || "").toLowerCase();
        const attr = attrName.toLowerCase();
        let pattern = null;

        if (tag === "link" && attr === "href") pattern = /\.css$/i;
        else if (tag === "script" && attr === "src") pattern = /\.js$/i;
        else if (["a", "area"].includes(tag) && attr === "href") {
            pattern = /\.(html?|svg|png|jpe?g|gif|webp|ico|bmp|avif)$/i;
        } else if (
            (tag === "iframe" && attr === "src") ||
            (tag === "form" && attr === "action")
        ) pattern = /\.html?$/i;
        else if (
            (["img", "source", "video", "audio", "track", "embed", "input", "image", "use"].includes(tag) && attr === "src") ||
            (["image", "use"].includes(tag) && attr === "href") ||
            (tag === "object" && attr === "data")
        ) pattern = /\.(json|svg|png|jpe?g|gif|webp|ico|bmp|avif)$/i;

        if (!pattern || !window.getAllFiles) return [];

        const current = window.currentFile || "";

        return window.getAllFiles()
            .filter(file => pattern.test(file) && file !== current)
            .sort()
            .map(file => relativePath(current, file));
    }

    function rawTextTag(lower) {
        for (const tag of ["script", "style"]) {
            const open = lower.lastIndexOf("<" + tag);
            if (open === -1) continue;
            const next = lower.charAt(open + tag.length + 1);
            if (next && !/[\s>]/.test(next)) continue;
            if (lower.lastIndexOf("</" + tag) > open) continue;
            if (lower.indexOf(">", open) !== -1) return tag;
        }
        return null;
    }

    function analyzeContext(text) {
        const lt = text.lastIndexOf("<");
        if (lt === -1) return { type: "text" };

        const frag = text.slice(lt);
        const lowerText = text.toLowerCase();

        if (lowerText.lastIndexOf("<!--") > lowerText.lastIndexOf("-->")) {
            return { type: "comment" };
        }

        const raw = rawTextTag(lowerText);

        if (raw) {
            const closing = frag.match(/^<\/([a-zA-Z]*)$/);
            if (closing) return { type: "tagname", prefix: closing[1], closing: true, raw };
            return { type: "raw" };
        }

        const bang = frag.match(/^<!([a-zA-Z-]*)$/);
        if (bang) return { type: "bang", prefix: bang[1] };

        let i = 1;
        let closing = false;

        if (frag.charAt(i) === "/") {
            closing = true;
            i++;
        }

        let name = "";
        while (i < frag.length && /[\w:-]/.test(frag.charAt(i))) name += frag.charAt(i++);

        if (i >= frag.length) return { type: "tagname", prefix: name, closing };
        if (closing || !name) return { type: "text" };

        const used = new Set();

        while (i < frag.length) {
            while (i < frag.length && /\s/.test(frag.charAt(i))) i++;
            if (i >= frag.length) return { type: "attrname", tag: name, prefix: "", used };

            const ch = frag.charAt(i);
            if (ch === ">") return { type: "text" };
            if (ch === "/") { i++; continue; }

            let attr = "";
            while (i < frag.length && !/[\s=>\/"']/.test(frag.charAt(i))) attr += frag.charAt(i++);

            if (!attr) { i++; continue; }
            if (i >= frag.length) return { type: "attrname", tag: name, prefix: attr, used };

            let j = i;
            while (j < frag.length && /\s/.test(frag.charAt(j))) j++;

            if (frag.charAt(j) === "=") {
                j++;
                while (j < frag.length && /\s/.test(frag.charAt(j))) j++;

                if (j >= frag.length) {
                    return { type: "attrvalue", tag: name, attr, prefix: "", quote: "", used };
                }

                const quote = frag.charAt(j);

                if (quote === '"' || quote === "'") {
                    const end = frag.indexOf(quote, j + 1);
                    if (end === -1) {
                        return { type: "attrvalue", tag: name, attr, prefix: frag.slice(j + 1), quote, used };
                    }
                    i = end + 1;
                } else {
                    let k = j;
                    while (k < frag.length && !/[\s>]/.test(frag.charAt(k))) k++;
                    if (k >= frag.length) {
                        return { type: "attrvalue", tag: name, attr, prefix: frag.slice(j), quote: "", used };
                    }
                    i = k;
                }

                used.add(attr.toLowerCase());
            } else {
                used.add(attr.toLowerCase());
                i = j;
            }
        }

        return { type: "attrname", tag: name, prefix: "", used };
    }

    function getOpenTagStack(text) {
        const stack = [];
        const regex = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
        let lowerText = null;
        let match;

        while ((match = regex.exec(text))) {
            if (match[1]) {
                const target = match[1].toLowerCase();
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i].toLowerCase() === target) {
                        stack.length = i;
                        break;
                    }
                }
                continue;
            }

            if (!match[2]) continue;

            const name = match[2];
            const lower = name.toLowerCase();

            if (isVoidTag(lower) || /\/\s*$/.test(match[3])) continue;

            if (lower === "script" || lower === "style") {
                if (lowerText === null) lowerText = text.toLowerCase();
                const close = lowerText.indexOf("</" + lower, regex.lastIndex);
                if (close === -1) {
                    stack.push(name);
                    break;
                }
                regex.lastIndex = close;
                continue;
            }

            stack.push(name);
        }

        return stack;
    }

    function rangeBefore(position, length) {
        return {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: Math.max(1, position.column - length),
            endColumn: position.column
        };
    }

    function tagSuggestions(prefixLength, position, hasBracket) {
        const range = rangeBefore(position, prefixLength);
        const opening = hasBracket ? "" : "<";
        const kind = monaco.languages.CompletionItemKind;

        return Object.keys(HTML_DATA.TAGS).map(name => {
            const info = HTML_DATA.TAGS[name];

            let insertText;
            if (info.s) insertText = opening + info.s;
            else if (info.v) insertText = `${opening}${name}>`;
            else insertText = `${opening}${name}>$0</${name}>`;

            const item = makeSuggestion(
                name,
                insertText,
                kind.Class,
                range,
                (info.svg ? "SVG element" : info.v ? "Void element" : "HTML element"),
                info.d
            );
            item.filterText = name;
            item.sortText = (info.svg ? "1" : "0") + name;
            return item;
        });
    }

    function closingTagSuggestions(text, prefixLength, position) {
        const range = rangeBefore(position, prefixLength);
        const kind = monaco.languages.CompletionItemKind;
        const open = getOpenTagStack(text);
        const suggestions = [];
        const seen = new Set();

        for (let i = open.length - 1; i >= 0; i--) {
            const name = open[i];
            if (seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());

            const item = makeSuggestion(
                name, name + ">", kind.Class, range,
                i === open.length - 1 ? "Close nearest open tag" : "Close tag"
            );
            item.sortText = "0" + String(open.length - i).padStart(3, "0");
            item.preselect = i === open.length - 1;
            suggestions.push(item);
        }

        Object.keys(HTML_DATA.TAGS).forEach(name => {
            if (HTML_DATA.TAGS[name].v || seen.has(name.toLowerCase())) return;
            const item = makeSuggestion(name, name + ">", kind.Class, range, "Close tag");
            item.sortText = "9" + name;
            suggestions.push(item);
        });

        return suggestions;
    }

    function attributeSuggestions(context, position) {
        const range = rangeBefore(position, context.prefix.length);
        const kind = monaco.languages.CompletionItemKind;
        const groupLabel = ["Attribute", "Global attribute", "ARIA attribute", "Event handler"];
        const suggestions = [];

        getAttributesForTag(context.tag).forEach(attr => {
            if (context.used.has(attr.name.toLowerCase())) return;

            let insertText;
            let command;

            if (attr.type === "bool") {
                insertText = attr.name;
            } else {
                insertText = `${attr.name}="$0"`;

                const hasValues =
                    getAttributeValues(context.tag, attr.name, attr).length > 0 ||
                    getFileValues(context.tag, attr.name).length > 0;

                if (hasValues || attr.name.toLowerCase() === "style") command = triggerSuggestCommand;
            }

            const item = makeSuggestion(
                attr.name, insertText, kind.Property, range, groupLabel[attr.group]
            );
            item.sortText = attr.group + attr.name;
            item.filterText = attr.name;
            if (command) item.command = command;
            suggestions.push(item);
        });

        const data = makeSuggestion(
            "data-*", 'data-$1="$0"', kind.Property, range,
            "Custom data attribute", "Custom data attribute, e.g. data-id"
        );
        data.filterText = "data-";
        data.sortText = "1data-";
        suggestions.push(data);

        return suggestions;
    }

    function valueSuggestions(context, position) {
        const kind = monaco.languages.CompletionItemKind;

        const multi = MULTI_VALUE_ATTRS.has(context.attr.toLowerCase());
        const typed = multi ? context.prefix.split(/\s+/).pop() : context.prefix;

        if (!context.quote && context.prefix) return [];

        const range = rangeBefore(position, typed.length);
        const wrap = value => context.quote ? escapeSnippet(value) : `"${escapeSnippet(value)}"`;

        const attrSpec = getAttributesForTag(context.tag)
            .find(attr => attr.name.toLowerCase() === context.attr.toLowerCase());

        const suggestions = [];
        const taken = new Set(
            multi ? context.prefix.split(/\s+/).slice(0, -1) : []
        );

        getAttributeValues(context.tag, context.attr, attrSpec).forEach(value => {
            if (taken.has(value)) return;
            const item = makeSuggestion(value, wrap(value), kind.Value, range, "Value");
            item.filterText = value;
            suggestions.push(item);
        });

        getFileValues(context.tag, context.attr).forEach(file => {
            const text = typed.startsWith("./") && !file.startsWith("../")
                ? "./" + file
                : file;
            const item = makeSuggestion(text, wrap(text), kind.File, range, "Project file");
            item.filterText = text;
            item.sortText = "0" + file;
            suggestions.push(item);
        });

        return suggestions;
    }

    function htmlProvider() {
        return {
            triggerCharacters: ["<", " ", "=", "\"", "'", "/", "!", "\n"],

            provideCompletionItems(model, position, completionContext) {
                const line = model.getLineContent(position.lineNumber);
                const before = line.substring(0, position.column - 1);
                const range = getWordRange(model, position);

                const bangTyped = before.match(/^\s*(!{1,3})$/);
                if (bangTyped) {
                    const fullText = model.getValue();
                    const lineStart = model.getOffsetAt({ lineNumber: position.lineNumber, column: 1 });
                    const beforeText = fullText.substring(0, lineStart);
                    const lastOpen = beforeText.lastIndexOf("<");
                    const lastClose = beforeText.lastIndexOf(">");
                    if (lastOpen <= lastClose) {
                        const boilerplate = [
                            "<!DOCTYPE html>",
                            "<html lang=\"en\">",
                            "<head>",
                            "    <meta charset=\"UTF-8\">",
                            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
                            "    <title>Document</title>",
                            "</head>",
                            "<body>",
                            "    $0",
                            "</body>",
                            "</html>"
                        ].join("\n");
                        const item = makeSuggestion(
                            "!", boilerplate, monaco.languages.CompletionItemKind.Property,
                            rangeBefore(position, bangTyped[1].length),
                            "Emmet Abbreviation",
                            "Khung HTML5 cơ bản. Nhấn Enter để chèn."
                        );
                        item.filterText = bangTyped[1];
                        item.sortText = "0";
                        item.preselect = true;

                        const doctypeOnly = makeSuggestion(
                            "!!!", "<!DOCTYPE html>", monaco.languages.CompletionItemKind.Property,
                            rangeBefore(position, bangTyped[1].length),
                            "Emmet Abbreviation",
                            "<!DOCTYPE html>"
                        );
                        doctypeOnly.filterText = bangTyped[1];
                        doctypeOnly.sortText = "1";

                        return { suggestions: [item, doctypeOnly] };
                    }
                }

                const styleMatch = before.match(/style\s*=\s*(["'])([^"']*)$/i);
                if (styleMatch) {
                    return {
                        suggestions: getCssSuggestions(
                            styleMatch[2],
                            range,
                            !line.substring(position.column - 1).trimStart().startsWith(";")
                        )
                    };
                }

                const text = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const context = analyzeContext(text);
                const kind = monaco.languages.CompletionItemKind;

                switch (context.type) {

                    case "attrname":
                        return { suggestions: attributeSuggestions(context, position) };

                    case "attrvalue":
                        return { suggestions: valueSuggestions(context, position) };

                    case "tagname":
                        if (context.closing && context.raw) {
                            const rawRange = rangeBefore(position, context.prefix.length);
                            return {
                                suggestions: [
                                    makeSuggestion(
                                        context.raw, context.raw + ">", kind.Class, rawRange, "Close tag"
                                    )
                                ]
                            };
                        }

                        if (context.closing) {
                            return {
                                suggestions: closingTagSuggestions(text, context.prefix.length, position)
                            };
                        }
                        return { suggestions: tagSuggestions(context.prefix.length, position, true) };

                    case "bang": {
                        const bangRange = rangeBefore(position, context.prefix.length + 1);
                        const doctype = makeSuggestion(
                            "<!DOCTYPE html>", "<!DOCTYPE html>", kind.Keyword, bangRange,
                            "Document type", "HTML5 document type declaration"
                        );
                        const comment = makeSuggestion(
                            "<!-- comment -->", "<!-- $0 -->", kind.Snippet, bangRange,
                            "HTML comment"
                        );
                        doctype.filterText = comment.filterText = "<!" + context.prefix;
                        return { suggestions: [doctype, comment] };
                    }

                    case "text": {
                        const wordMatch = before.match(/([a-zA-Z][\w-]*)$/);
                        const prefix = wordMatch ? wordMatch[1] : "";
                        const triggeredByCharacter =
                            completionContext && completionContext.triggerKind === 1;

                        if (!prefix && triggeredByCharacter) return { suggestions: [] };

                        return { suggestions: tagSuggestions(prefix.length, position, false) };
                    }

                    default:
                        return { suggestions: [] };
                }
            }
        };
    }

    function cssProvider() {
        return {
            triggerCharacters: [":", "-", " "],

            provideCompletionItems(model, position) {
                const textBefore = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const lastComment = textBefore.lastIndexOf("/*");
                const lastEndComment = textBefore.lastIndexOf("*/");
                if (lastComment > lastEndComment) {
                    return { suggestions: [] };
                }

                const openBraces = (textBefore.match(/{/g) || []).length;
                const closeBraces = (textBefore.match(/}/g) || []).length;

                if (openBraces <= closeBraces) {
                    return { suggestions: [] };
                }

                return {
                    suggestions: getCssSuggestions(
                        textBefore,
                        getWordRange(model, position),
                        !model.getLineContent(position.lineNumber)
                            .substring(position.column - 1)
                            .trimStart()
                            .startsWith(";")
                    )
                };
            }
        };
    }

    function javascriptProvider() {
        return {
            triggerCharacters: [".", " "],

            provideCompletionItems(model, position) {
                const range = getWordRange(model, position);
                const word = model.getWordUntilPosition(position).word.toLowerCase();
                const suggestions = [];

                jsKeywords.forEach(kw => {
                    if (word && !kw.startsWith(word)) return;
                    suggestions.push(
                        makeSuggestion(
                            kw,
                            kw,
                            monaco.languages.CompletionItemKind.Keyword,
                            range,
                            "JavaScript keyword"
                        )
                    );
                });

                jsBuiltins.forEach(item => {
                    if (word && !item.toLowerCase().startsWith(word)) return;
                    suggestions.push(
                        makeSuggestion(
                            item,
                            item,
                            monaco.languages.CompletionItemKind.Function,
                            range,
                            "Built-in"
                        )
                    );
                });

                if (!word || "function".startsWith(word)) {
                    suggestions.push(
                        makeSuggestion(
                            "function",
                            "function ${1:name}(${2:params}) {\n\t$0\n}",
                            monaco.languages.CompletionItemKind.Snippet,
                            range,
                            "Function snippet"
                        )
                    );
                }

                if (!word || "arrow".startsWith(word) || "const".startsWith(word)) {
                    suggestions.push(
                        makeSuggestion(
                            "arrow function",
                            "const ${1:name} = (${2:params}) => {\n\t$0\n}",
                            monaco.languages.CompletionItemKind.Snippet,
                            range,
                            "Arrow function"
                        )
                    );
                }

                if (!word || "log".startsWith(word) || "console".startsWith(word)) {
                    suggestions.push(
                        makeSuggestion(
                            "console.log",
                            "console.log($0);",
                            monaco.languages.CompletionItemKind.Snippet,
                            range,
                            "Console log"
                        )
                    );
                }

                if (!word || "addEventListener".startsWith(word)) {
                    suggestions.push(
                        makeSuggestion(
                            "addEventListener",
                            "addEventListener('${1:click}', (${2:event}) => {\n\t$0\n});",
                            monaco.languages.CompletionItemKind.Snippet,
                            range,
                            "Event listener"
                        )
                    );
                }

                if (!word || "querySelector".startsWith(word)) {
                    suggestions.push(
                        makeSuggestion(
                            "querySelector",
                            "document.querySelector('${1:selector}')",
                            monaco.languages.CompletionItemKind.Snippet,
                            range,
                            "Query selector"
                        )
                    );
                }

                return { suggestions };
            }
        };
    }

    function installSuggestFileIcons() {
        const editorElement = document.getElementById("editor");
        if (!editorElement) return;

        const hasFileIcons = typeof window.getFileIcon === "function";

        function getSwatchKind(value) {
            const lower = value.toLowerCase();
            if (lower === "transparent") return "transparent";
            const supported = typeof CSS !== "undefined" && typeof CSS.supports === "function"
                ? CSS.supports("color", value)
                : true;
            return supported ? "color" : null;
        }

        let scheduled = false;

        function clearIcon(element) {
            if (element.querySelector("svg")) element.innerHTML = "";
            element.removeAttribute("data-wcs-icon");
            element.removeAttribute("data-wcs-swatch");
            element.style.removeProperty("--wcs-color");
        }

        function applyIcons() {
            scheduled = false;

            editorElement.querySelectorAll(".suggest-widget .monaco-list-row").forEach(row => {
                const fileIcon = hasFileIcons ? row.querySelector('[class*="symbol-file"]') : null;
                const colorIcon = row.querySelector('[class*="symbol-color"]');
                const targetIcon = fileIcon || colorIcon;
                const wcsIcon = row.querySelector("[data-wcs-icon]");

                if (!targetIcon) {
                    if (wcsIcon) clearIcon(wcsIcon);
                    return;
                }

                const labelElement = row.querySelector(".label-name") || row;
                const label = (labelElement.textContent || "").trim().split(/\s+/)[0];
                if (!label) return;

                const type = fileIcon ? "file" : "color";
                const key = type + ":" + label;

                if (targetIcon.dataset.wcsIcon === key) return;

                if (type === "file") {
                    targetIcon.removeAttribute("data-wcs-swatch");
                    targetIcon.style.removeProperty("--wcs-color");
                    targetIcon.innerHTML = window.getFileIcon(label);
                } else {
                    const kind = getSwatchKind(label);
                    if (!kind) {
                        clearIcon(targetIcon);
                        return;
                    }
                    targetIcon.setAttribute("data-wcs-swatch", kind);
                    targetIcon.style.setProperty("--wcs-color", label);
                }
                targetIcon.dataset.wcsIcon = key;
            });
        }

        const observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(applyIcons);
        });

        observer.observe(editorElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["class"]
        });
    }

    const colorNameSet = new Set(
        cssColors.filter(name => name !== "transparent" && name !== "currentColor").map(name => name.toLowerCase())
    );
    const colorNameRegex = new RegExp(
        "(?<![\\w-])(" + [...colorNameSet].join("|") + ")(?![\\w-])", "gi"
    );
    const colorFuncRegex = /(?<![\w-])(?:rgba?|hsla?)\([^()]*\)/gi;
    const colorHexRegex = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi;

    let colorContext = null;

    function parseCssColor(value) {
        if (!colorContext) {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            colorContext = canvas.getContext("2d");
        }
        const ctx = colorContext;
        if (!ctx) return null;

        ctx.fillStyle = "#010203";
        ctx.fillStyle = value;
        const first = ctx.fillStyle;
        ctx.fillStyle = "#040506";
        ctx.fillStyle = value;
        if (first !== ctx.fillStyle) return null;

        const result = ctx.fillStyle;
        let match = result.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (match) {
            return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16), a: 1 };
        }
        match = result.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i);
        if (match) {
            return { r: +match[1], g: +match[2], b: +match[3], a: parseFloat(match[4]) };
        }
        return null;
    }

    function maskCssNoise(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, m => " ".repeat(m.length))
            .replace(/url\([^)]*\)/gi, m => " ".repeat(m.length))
            .replace(/"[^"\n]*"|'[^'\n]*'/g, m => " ".repeat(m.length));
    }

    function collectCssColors(css, offset, out) {
        const masked = maskCssNoise(css);
        const declarationRegex = /([\w-]+)\s*:\s*([^;{}]*)/g;
        let declaration;

        while ((declaration = declarationRegex.exec(masked))) {
            const value = declaration[2];
            const valueStart = declaration.index + declaration[0].length - value.length;
            const taken = [];

            [colorFuncRegex, colorHexRegex, colorNameRegex].forEach(regex => {
                regex.lastIndex = 0;
                let found;
                while ((found = regex.exec(value))) {
                    const start = valueStart + found.index;
                    const end = start + found[0].length;
                    if (taken.some(range => start < range[1] && end > range[0])) continue;

                    const color = parseCssColor(found[0]);
                    if (!color) continue;

                    taken.push([start, end]);
                    out.push({ start: offset + start, end: offset + end, ...color });
                }
            });
        }
    }

    function findHtmlColors(text) {
        const out = [];
        let match;

        const styleBlockRegex = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
        while ((match = styleBlockRegex.exec(text))) {
            const contentStart = match.index + match[0].indexOf(match[1], match[0].indexOf(">"));
            collectCssColors(match[1], contentStart, out);
        }

        const styleAttrRegex = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
        while ((match = styleAttrRegex.exec(text))) {
            const content = match[1] !== undefined ? match[1] : match[2];
            const contentStart = match.index + match[0].length - 1 - content.length;
            collectCssColors(content, contentStart, out);
        }

        return out.sort((a, b) => a.start - b.start);
    }

    window.wcsFindHtmlColors = findHtmlColors;

    function toHex2(n) {
        return Math.round(n).toString(16).padStart(2, "0");
    }

    function htmlColorProvider() {
        return {
            provideDocumentColors(model) {
                return findHtmlColors(model.getValue()).map(item => {
                    const from = model.getPositionAt(item.start);
                    const to = model.getPositionAt(item.end);
                    return {
                        color: { red: item.r / 255, green: item.g / 255, blue: item.b / 255, alpha: item.a },
                        range: {
                            startLineNumber: from.lineNumber,
                            startColumn: from.column,
                            endLineNumber: to.lineNumber,
                            endColumn: to.column
                        }
                    };
                });
            },

            provideColorPresentations(model, colorInfo) {
                const { red, green, blue, alpha } = colorInfo.color;
                const r = Math.round(red * 255);
                const g = Math.round(green * 255);
                const b = Math.round(blue * 255);
                const a = Math.round(alpha * 100) / 100;

                return [
                    { label: alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})` },
                    { label: "#" + toHex2(r) + toHex2(g) + toHex2(b) + (alpha < 1 ? toHex2(alpha * 255) : "") }
                ];
            }
        };
    }

    function registerAutocomplete() {
        if (window.wcsAutocompleteRegistered || !window.monaco || !window.editor) {
            return;
        }

        window.wcsAutocompleteRegistered = true;

        try {
            const htmlDefaults = monaco.languages.html && monaco.languages.html.htmlDefaults;
            if (htmlDefaults && typeof htmlDefaults.setOptions === "function") {
                htmlDefaults.setOptions({ suggest: { html5: false } });
            }
        } catch (error) {
            console.warn("WCS: không thể tắt gợi ý HTML mặc định.", error);
        }

        try {
            const cssDefaults = monaco.languages.css && monaco.languages.css.cssDefaults;
            if (cssDefaults && typeof cssDefaults.setModeConfiguration === "function") {
                cssDefaults.setModeConfiguration({
                    ...cssDefaults.modeConfiguration,
                    completionItems: false,
                    colors: true
                });
            }
        } catch (error) {
            console.warn("WCS: không thể tắt gợi ý CSS mặc định.", error);
        }

        try {
            const htmlDefaults = monaco.languages.html && monaco.languages.html.htmlDefaults;
            if (htmlDefaults && typeof htmlDefaults.setModeConfiguration === "function") {
                htmlDefaults.setModeConfiguration({
                    ...htmlDefaults.modeConfiguration,
                    colors: false
                });
            }
        } catch (error) {
            console.warn("WCS: không thể cấu hình ô màu HTML mặc định.", error);
        }

        monaco.languages.registerColorProvider("html", htmlColorProvider());

        installSuggestFileIcons();

        monaco.languages.registerCompletionItemProvider("html", htmlProvider());
        monaco.languages.registerCompletionItemProvider("css", cssProvider());
        monaco.languages.registerCompletionItemProvider("javascript", javascriptProvider());

        monaco.languages.registerCompletionItemProvider("json", {
            provideCompletionItems() {
                return { suggestions: [] };
            }
        });

        console.log("WCS: IntelliSense đã sẵn sàng! (HTML + CSS + JS)");
    }

    window.addEventListener("editorReady", registerAutocomplete);

    if (window.monaco && window.editor) {
        registerAutocomplete();
    }

})();
