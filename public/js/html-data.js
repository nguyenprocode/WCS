(function () {
    "use strict";

    const GLOBAL = [
        "accesskey", "autocapitalize=off|none|on|sentences|words|characters",
        "autofocus?", "class", "contenteditable=true|false|plaintext-only|inherit",
        "dir=ltr|rtl|auto", "draggable=true|false",
        "enterkeyhint=enter|done|go|next|previous|search|send", "exportparts",
        "hidden?", "id", "inert?",
        "inputmode=none|text|decimal|numeric|tel|search|email|url",
        "is", "itemid", "itemprop", "itemref", "itemscope?", "itemtype",
        "lang", "nonce", "part", "popover=auto|manual|hint", "slot",
        "spellcheck=true|false", "style", "tabindex=0|-1", "title",
        "translate=yes|no", "writingsuggestions=true|false", "role"
    ];

    const EVENTS = (
        "onabort onafterprint onanimationcancel onanimationend onanimationiteration " +
        "onanimationstart onauxclick onbeforeinput onbeforematch onbeforeprint " +
        "onbeforetoggle onbeforeunload onblur oncancel oncanplay oncanplaythrough " +
        "onchange onclick onclose oncontextlost oncontextmenu oncontextrestored " +
        "oncopy oncuechange oncut ondblclick ondrag ondragend ondragenter " +
        "ondragleave ondragover ondragstart ondrop ondurationchange onemptied " +
        "onended onerror onfocus onfocusin onfocusout onformdata onfullscreenchange " +
        "onfullscreenerror ongotpointercapture onhashchange oninput oninvalid " +
        "onkeydown onkeypress onkeyup onlanguagechange onload onloadeddata " +
        "onloadedmetadata onloadstart onlostpointercapture onmessage onmessageerror " +
        "onmousedown onmouseenter onmouseleave onmousemove onmouseout onmouseover " +
        "onmouseup onoffline ononline onpagehide onpageshow onpaste onpause onplay " +
        "onplaying onpointercancel onpointerdown onpointerenter onpointerleave " +
        "onpointermove onpointerout onpointerover onpointerrawupdate onpointerup " +
        "onpopstate onprogress onratechange onrejectionhandled onreset onresize " +
        "onscroll onscrollend onsecuritypolicyviolation onseeked onseeking onselect " +
        "onselectionchange onselectstart onslotchange onstalled onstorage onsubmit " +
        "onsuspend ontimeupdate ontoggle ontouchcancel ontouchend ontouchmove " +
        "ontouchstart ontransitioncancel ontransitionend ontransitionrun " +
        "ontransitionstart onunhandledrejection onunload onvolumechange onwaiting onwheel"
    ).split(" ");

    const BOOL_TRI = "true|false";
    const ARIA = [
        "aria-activedescendant", "aria-atomic=" + BOOL_TRI,
        "aria-autocomplete=none|inline|list|both", "aria-braillelabel",
        "aria-brailleroledescription", "aria-busy=" + BOOL_TRI,
        "aria-checked=true|false|mixed", "aria-colcount", "aria-colindex",
        "aria-colindextext", "aria-colspan", "aria-controls",
        "aria-current=page|step|location|date|time|true|false",
        "aria-describedby", "aria-description", "aria-details",
        "aria-disabled=" + BOOL_TRI, "aria-dropeffect=none|copy|execute|link|move|popup",
        "aria-errormessage", "aria-expanded=true|false|undefined", "aria-flowto",
        "aria-grabbed=true|false|undefined",
        "aria-haspopup=false|true|menu|listbox|tree|grid|dialog",
        "aria-hidden=" + BOOL_TRI, "aria-invalid=false|true|grammar|spelling",
        "aria-keyshortcuts", "aria-label", "aria-labelledby", "aria-level",
        "aria-live=off|polite|assertive", "aria-modal=" + BOOL_TRI,
        "aria-multiline=" + BOOL_TRI, "aria-multiselectable=" + BOOL_TRI,
        "aria-orientation=horizontal|vertical|undefined", "aria-owns",
        "aria-placeholder", "aria-posinset", "aria-pressed=true|false|mixed",
        "aria-readonly=" + BOOL_TRI,
        "aria-relevant=additions|removals|text|all|additions text",
        "aria-required=" + BOOL_TRI, "aria-roledescription", "aria-rowcount",
        "aria-rowindex", "aria-rowindextext", "aria-rowspan",
        "aria-selected=true|false|undefined", "aria-setsize",
        "aria-sort=none|ascending|descending|other", "aria-valuemax",
        "aria-valuemin", "aria-valuenow", "aria-valuetext"
    ];

    const ROLES = (
        "alert alertdialog application article banner blockquote button caption cell " +
        "checkbox code columnheader combobox complementary contentinfo definition " +
        "deletion dialog directory document emphasis feed figure form generic grid " +
        "gridcell group heading img insertion link list listbox listitem log main " +
        "marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter " +
        "navigation none note option paragraph presentation progressbar radio " +
        "radiogroup region row rowgroup rowheader scrollbar search searchbox " +
        "separator slider spinbutton status strong subscript superscript switch tab " +
        "table tablist tabpanel term textbox time timer toolbar tooltip tree " +
        "treegrid treeitem"
    ).split(" ");

    const REFERRER = [
        "no-referrer", "no-referrer-when-downgrade", "origin",
        "origin-when-cross-origin", "same-origin", "strict-origin",
        "strict-origin-when-cross-origin", "unsafe-url"
    ];

    const VALUES = {
        role: ROLES,
        target: ["_self", "_blank", "_parent", "_top"],
        formtarget: ["_self", "_blank", "_parent", "_top"],
        loading: ["lazy", "eager"],
        decoding: ["async", "sync", "auto"],
        fetchpriority: ["high", "low", "auto"],
        crossorigin: ["anonymous", "use-credentials"],
        referrerpolicy: REFERRER,
        preload: ["none", "metadata", "auto"],
        method: ["get", "post", "dialog"],
        formmethod: ["get", "post", "dialog"],
        enctype: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        formenctype: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        wrap: ["soft", "hard"],
        scope: ["row", "col", "rowgroup", "colgroup"],
        shape: ["rect", "circle", "poly", "default"],
        kind: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
        popovertargetaction: ["hide", "show", "toggle"],
        as: ["audio", "document", "embed", "fetch", "font", "image", "object", "script", "style", "track", "video", "worker"],
        sandbox: [
            "allow-downloads", "allow-forms", "allow-modals", "allow-orientation-lock",
            "allow-pointer-lock", "allow-popups", "allow-popups-to-escape-sandbox",
            "allow-presentation", "allow-same-origin", "allow-scripts",
            "allow-storage-access-by-user-activation", "allow-top-navigation",
            "allow-top-navigation-by-user-activation"
        ],
        autocomplete: [
            "on", "off", "name", "honorific-prefix", "given-name", "family-name",
            "nickname", "email", "username", "new-password", "current-password",
            "one-time-code", "organization", "street-address", "address-line1",
            "address-line2", "address-level1", "address-level2", "country",
            "country-name", "postal-code", "cc-name", "cc-number", "cc-exp", "cc-csc",
            "bday", "sex", "tel", "url", "photo"
        ],
        lang: [
            "en", "en-US", "en-GB", "vi", "fr", "de", "es", "it", "pt", "pt-BR",
            "ru", "ja", "ko", "zh", "zh-CN", "zh-TW", "th", "id", "ar", "hi", "tr"
        ],
        charset: ["utf-8"],
        capture: ["user", "environment"],
        dirname: [],
        accept: [
            "image/*", "image/png", "image/jpeg", "audio/*", "video/*",
            "application/pdf", ".pdf", ".doc,.docx", ".csv", ".json", ".txt"
        ],
        shadowrootmode: ["open", "closed"],
        closedby: ["any", "closedowner", "none"],
        "accept-charset": ["utf-8"],
        "http-equiv": [
            "content-security-policy", "content-type", "default-style",
            "refresh", "x-ua-compatible"
        ],
        "xmlns": ["http://www.w3.org/2000/svg"]
    };

    const REL_LINK = [
        "stylesheet", "icon", "shortcut icon", "apple-touch-icon", "manifest",
        "preload", "prefetch", "preconnect", "dns-prefetch", "modulepreload",
        "prerender", "canonical", "alternate", "author", "help", "license",
        "next", "prev", "search", "me", "pingback"
    ];

    const REL_ANCHOR = [
        "noopener", "noreferrer", "nofollow", "external", "author", "bookmark",
        "help", "license", "next", "prev", "search", "tag", "alternate",
        "sponsored", "ugc", "me"
    ];

    const TAG_VALUES = {
        "link.rel": REL_LINK,
        "a.rel": REL_ANCHOR,
        "area.rel": REL_ANCHOR,
        "form.rel": REL_ANCHOR,
        "meta.name": [
            "viewport", "description", "author", "keywords", "robots", "theme-color",
            "color-scheme", "generator", "application-name", "referrer", "googlebot",
            "format-detection", "creator", "publisher"
        ],
        "meta.content": [
            "width=device-width, initial-scale=1.0", "text/html; charset=utf-8",
            "IE=edge", "noindex, nofollow", "index, follow", "light dark", "dark light"
        ],
        "link.type": ["text/css", "image/png", "image/svg+xml", "image/x-icon", "application/manifest+json"],
        "script.type": ["module", "text/javascript", "importmap", "speculationrules"],
        "source.type": ["video/mp4", "video/webm", "video/ogg", "audio/mpeg", "audio/ogg", "audio/wav", "image/webp", "image/avif"],
        "form.autocomplete": ["on", "off"],
        "form.target": ["_self", "_blank", "_parent", "_top"]
    };

    const TAGS = {};

    function T(name, d, a, opts) {
        TAGS[name] = Object.assign({ d, a: a ? a.split(" ") : [] }, opts || {});
    }

    T("html", "Root element of an HTML document", "xmlns", { s: 'html lang="${1:vi}">\n\t$0\n</html>' });
    T("head", "Document metadata container");
    T("title", "Document title shown in the browser tab");
    T("base", "Base URL for relative URLs", "href target", { v: 1 });
    T("link", "External resource link (stylesheet, icon...)",
        "href rel hreflang type media sizes as crossorigin integrity referrerpolicy fetchpriority imagesrcset imagesizes blocking disabled? color title",
        { v: 1, s: 'link rel="stylesheet" href="$0">' });
    T("meta", "Document metadata", "name http-equiv content charset media",
        { v: 1, s: 'meta name="$1" content="$2">' });
    T("style", "Embedded CSS", "media blocking title");

    T("body", "Document body (visible content)");
    T("article", "Self-contained composition");
    T("section", "Generic section of a document");
    T("nav", "Navigation links");
    T("aside", "Content tangential to the main content");
    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((h, i) => T(h, "Heading level " + (i + 1)));
    T("hgroup", "Heading group (heading with subheading)");
    T("header", "Introductory content or navigation");
    T("footer", "Footer of a section or page");
    T("address", "Contact information");
    T("main", "Dominant content of the page");
    T("search", "Search or filtering controls");

    T("p", "Paragraph");
    T("hr", "Thematic break (horizontal rule)", "", { v: 1 });
    T("pre", "Preformatted text");
    T("blockquote", "Block quotation", "cite");
    T("ol", "Ordered list", "reversed? start type=1|a|A|i|I", { s: "ol>\n\t<li>$0</li>\n</ol>" });
    T("ul", "Unordered list", "", { s: "ul>\n\t<li>$0</li>\n</ul>" });
    T("menu", "Toolbar / menu list");
    T("li", "List item", "value");
    T("dl", "Description list");
    T("dt", "Description term");
    T("dd", "Description details");
    T("figure", "Self-contained figure with optional caption");
    T("figcaption", "Caption for a figure");
    T("div", "Generic block container");

    T("a", "Hyperlink", "href target download ping rel hreflang type referrerpolicy",
        { s: 'a href="$1">$0</a>' });
    T("em", "Emphasized text");
    T("strong", "Strong importance");
    T("small", "Side comment / small print");
    T("s", "Text that is no longer accurate (strikethrough)");
    T("cite", "Title of a creative work");
    T("q", "Inline quotation", "cite");
    T("dfn", "Defining instance of a term");
    T("abbr", "Abbreviation or acronym");
    T("ruby", "Ruby annotation (East Asian typography)");
    T("rt", "Ruby text");
    T("rp", "Ruby fallback parenthesis");
    T("data", "Machine-readable value", "value");
    T("time", "Date / time", "datetime");
    T("code", "Inline code");
    T("var", "Variable");
    T("samp", "Sample output");
    T("kbd", "Keyboard input");
    T("sub", "Subscript");
    T("sup", "Superscript");
    T("i", "Alternate voice (italic)");
    T("b", "Attention (bold)");
    T("u", "Unarticulated annotation (underline)");
    T("mark", "Highlighted text");
    T("bdi", "Bidirectional isolate");
    T("bdo", "Bidirectional override");
    T("span", "Generic inline container");
    T("br", "Line break", "", { v: 1 });
    T("wbr", "Line break opportunity", "", { v: 1 });

    T("ins", "Inserted text", "cite datetime");
    T("del", "Deleted text", "cite datetime");

    T("picture", "Container for multiple image sources");
    T("source", "Media source for picture / video / audio",
        "src type srcset sizes media width height", { v: 1 });
    T("img", "Image", "src alt srcset sizes width height loading decoding fetchpriority crossorigin referrerpolicy usemap ismap?",
        { v: 1, s: 'img src="$1" alt="$2">' });
    T("iframe", "Nested browsing context",
        "src srcdoc name sandbox allow allowfullscreen? width height loading referrerpolicy",
        { s: 'iframe src="$1" title="$2">$0</iframe>' });
    T("embed", "External content / plugin", "src type width height", { v: 1 });
    T("object", "External resource", "data type name form width height usemap");
    T("param", "Parameter for object (obsolete)", "name value", { v: 1 });
    T("video", "Video player",
        "src poster preload autoplay? loop? muted? controls? playsinline? width height crossorigin controlslist disablepictureinpicture? disableremoteplayback?");
    T("audio", "Audio player",
        "src preload autoplay? loop? muted? controls? crossorigin controlslist disableremoteplayback?");
    T("track", "Timed text track for media", "default? kind label src srclang", { v: 1 });
    T("map", "Image map", "name");
    T("area", "Image map hotspot", "alt coords shape href target download ping rel referrerpolicy", { v: 1 });
    T("canvas", "Scriptable bitmap canvas", "width height");
    T("math", "MathML root", "xmlns display=block|inline");

    T("table", "Table");
    T("caption", "Table caption");
    T("colgroup", "Group of table columns", "span");
    T("col", "Table column", "span", { v: 1 });
    T("thead", "Table header group");
    T("tbody", "Table body group");
    T("tfoot", "Table footer group");
    T("tr", "Table row");
    T("td", "Table data cell", "colspan rowspan headers");
    T("th", "Table header cell", "colspan rowspan headers scope abbr");

    T("form", "Form", "action method enctype name novalidate? target autocomplete accept-charset rel",
        { s: 'form action="$1" method="${2:post}">\n\t$0\n</form>' });
    T("label", "Label for a form control", "for");
    T("input", "Form input control",
        "type=button|checkbox|color|date|datetime-local|email|file|hidden|image|month|number|password|radio|range|reset|search|submit|tel|text|time|url|week " +
        "name value placeholder required? disabled? readonly? checked? multiple? " +
        "min max step minlength maxlength pattern size list accept alt src width height " +
        "autocomplete capture dirname form formaction formenctype formmethod formnovalidate? formtarget " +
        "popovertarget popovertargetaction webkitdirectory?",
        { v: 1, s: 'input type="${1:text}" name="$2">' });
    T("button", "Button",
        "type=button|submit|reset name value disabled? form formaction formenctype formmethod formnovalidate? formtarget popovertarget popovertargetaction command commandfor");
    T("select", "Drop-down list", "name multiple? size required? disabled? form autocomplete");
    T("datalist", "Predefined options for an input");
    T("optgroup", "Group of options", "label disabled?");
    T("option", "Option in select / datalist", "value label selected? disabled?");
    T("textarea", "Multi-line text input",
        "name rows cols placeholder required? disabled? readonly? maxlength minlength wrap dirname form autocomplete");
    T("output", "Result of a calculation", "for form name");
    T("progress", "Progress indicator", "value max");
    T("meter", "Scalar measurement within a range", "value min max low high optimum");
    T("fieldset", "Group of form controls", "disabled? form name");
    T("legend", "Caption for a fieldset");

    T("details", "Disclosure widget", "open? name");
    T("summary", "Summary / heading for details");
    T("dialog", "Dialog box", "open? closedby");

    T("script", "JavaScript / data block",
        "src type=module|text/javascript|importmap|speculationrules async? defer? nomodule? crossorigin integrity referrerpolicy fetchpriority blocking");
    T("noscript", "Fallback content when scripting is disabled");
    T("template", "Inert HTML template",
        "shadowrootmode shadowrootdelegatesfocus? shadowrootclonable? shadowrootserializable?");
    T("slot", "Web component slot", "name");

    const SVG_PRES = (
        "fill fill-opacity fill-rule=nonzero|evenodd stroke stroke-width " +
        "stroke-linecap=butt|round|square stroke-linejoin=miter|round|bevel " +
        "stroke-dasharray stroke-dashoffset stroke-opacity stroke-miterlimit " +
        "opacity transform clip-path mask filter visibility=visible|hidden|collapse " +
        "display color vector-effect pointer-events cursor"
    );

    const SVG_TEXT = "font-family font-size font-weight font-style text-anchor=start|middle|end dominant-baseline letter-spacing";

    const SVG_FE = "in in2 result x y width height";

    function S(name, d, a, opts) {
        TAGS[name] = Object.assign({ d, a: a.split(" ").filter(Boolean), svg: 1 }, opts || {});
    }

    S("svg", "Inline SVG root", "xmlns viewBox width height x y preserveAspectRatio version " + SVG_PRES,
        { s: 'svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${1:24} ${2:24}">\n\t$0\n</svg>' });
    S("g", "SVG group", SVG_PRES + " " + SVG_TEXT);
    S("defs", "SVG definitions", "");
    S("symbol", "Reusable SVG symbol", "viewBox preserveAspectRatio x y width height refX refY");
    S("use", "Reference to an SVG element", "href x y width height " + SVG_PRES);
    S("path", "SVG path", "d pathLength " + SVG_PRES, { s: 'path d="$1" />' });
    S("circle", "SVG circle", "cx cy r pathLength " + SVG_PRES, { s: 'circle cx="$1" cy="$2" r="$3" />' });
    S("ellipse", "SVG ellipse", "cx cy rx ry pathLength " + SVG_PRES);
    S("rect", "SVG rectangle", "x y width height rx ry pathLength " + SVG_PRES, { s: 'rect x="$1" y="$2" width="$3" height="$4" />' });
    S("line", "SVG line", "x1 y1 x2 y2 pathLength " + SVG_PRES);
    S("polyline", "SVG polyline", "points pathLength " + SVG_PRES);
    S("polygon", "SVG polygon", "points pathLength " + SVG_PRES);
    S("text", "SVG text", "x y dx dy rotate textLength lengthAdjust=spacing|spacingAndGlyphs " + SVG_TEXT + " " + SVG_PRES);
    S("tspan", "SVG text span", "x y dx dy rotate textLength " + SVG_TEXT + " " + SVG_PRES);
    S("textPath", "SVG text on a path", "href startOffset method=align|stretch spacing=auto|exact side=left|right " + SVG_TEXT);
    S("image", "SVG image", "href x y width height preserveAspectRatio crossorigin");
    S("foreignObject", "Embed foreign XML content in SVG", "x y width height");
    S("linearGradient", "SVG linear gradient", "x1 y1 x2 y2 gradientUnits=userSpaceOnUse|objectBoundingBox gradientTransform spreadMethod=pad|reflect|repeat href");
    S("radialGradient", "SVG radial gradient", "cx cy r fx fy fr gradientUnits=userSpaceOnUse|objectBoundingBox gradientTransform spreadMethod=pad|reflect|repeat href");
    S("stop", "SVG gradient stop", "offset stop-color stop-opacity", { v: 0 });
    S("pattern", "SVG pattern", "x y width height patternUnits=userSpaceOnUse|objectBoundingBox patternContentUnits patternTransform viewBox preserveAspectRatio href");
    S("clipPath", "SVG clip path", "clipPathUnits=userSpaceOnUse|objectBoundingBox");
    S("mask", "SVG mask", "x y width height maskUnits=userSpaceOnUse|objectBoundingBox maskContentUnits=userSpaceOnUse|objectBoundingBox");
    S("marker", "SVG marker", "markerWidth markerHeight refX refY orient markerUnits=strokeWidth|userSpaceOnUse viewBox preserveAspectRatio");
    S("filter", "SVG filter", "x y width height filterUnits=userSpaceOnUse|objectBoundingBox primitiveUnits=userSpaceOnUse|objectBoundingBox");
    S("feGaussianBlur", "SVG Gaussian blur filter", SVG_FE + " stdDeviation edgeMode=duplicate|wrap|none");
    S("feOffset", "SVG offset filter", SVG_FE + " dx dy");
    S("feBlend", "SVG blend filter", SVG_FE + " mode=normal|multiply|screen|darken|lighten");
    S("feColorMatrix", "SVG color matrix filter", SVG_FE + " type=matrix|saturate|hueRotate|luminanceToAlpha values");
    S("feComposite", "SVG composite filter", SVG_FE + " operator=over|in|out|atop|xor|lighter|arithmetic k1 k2 k3 k4");
    S("feFlood", "SVG flood filter", SVG_FE + " flood-color flood-opacity");
    S("feMerge", "SVG merge filter", SVG_FE);
    S("feMergeNode", "SVG merge node", "in");
    S("feDropShadow", "SVG drop shadow filter", SVG_FE + " dx dy stdDeviation flood-color flood-opacity");
    S("animate", "SVG animation", "attributeName from to values dur begin end repeatCount repeatDur fill=freeze|remove calcMode=discrete|linear|paced|spline keyTimes keySplines");
    S("animateTransform", "SVG transform animation", "attributeName type=translate|scale|rotate|skewX|skewY from to values dur begin end repeatCount repeatDur fill=freeze|remove");
    S("animateMotion", "SVG motion animation", "path keyPoints rotate dur begin end repeatCount repeatDur fill=freeze|remove");
    S("set", "SVG set attribute over time", "attributeName to begin dur fill=freeze|remove");
    S("switch", "SVG conditional processing", "");
    S("view", "SVG view", "viewBox preserveAspectRatio");
    S("desc", "SVG description", "");
    S("metadata", "SVG metadata", "");

    window.WCS_HTML_DATA = {
        GLOBAL,
        EVENTS,
        ARIA,
        ROLES,
        VALUES,
        TAG_VALUES,
        TAGS
    };
})();
