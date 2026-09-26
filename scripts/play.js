window.addEventListener("error", (event) => {
  appendLog("error", `Global Error: ${event.message} (${event.filename}:${event.lineno})`);
});

window.addEventListener("unhandledrejection", (event) => {
  appendLog("error", `Unhandled Promise Rejection: ${event.reason}`);
});


    let xfscss = null;
try {
  const mod = await import("https://cdn.jsdelivr.net/npm/fscss@1.2.4/esm.min.js");
  xfscss = mod.default || mod;
  window.xfscss = xfscss;
} catch (e) {
  console.error("Failed to import FSCSS module:", e);
}


    const FSCSS_MONARCH = {
      defaultToken: "",
      tokenPostfix: ".fscss",
      brackets: [
        { open: "{", close: "}", token: "delimiter.bracket" },
        { open: "(", close: ")", token: "delimiter.parenthesis" },
        { open: "[", close: "]", token: "delimiter.square" }
      ],
      tokenizer: {
        root: [
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
          [/`/, "string", "@backtick"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string_double"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/'/, "string", "@string_single"],
          // Literal @ must be written as @@ in Monarch (otherwise @name is an attribute ref)
          [/@@define\s+[a-zA-Z_][\w-]*/, "keyword"],
          [/@@arr\s+[a-zA-Z_][\w-]*/, "keyword"],
          [/@@obj\s+[a-zA-Z_][\w-]*/, "keyword"],
          [/@@event\s+[a-zA-Z_][\w-]*/, "keyword"],
          [/@@(?:arr|event|obj)\.[a-zA-Z_][\w-]*/, "keyword"],
          [/@@(?:import|use|random|ext|fun|match|define|arr|obj|event)\b/, "keyword"],
          [/@@[a-zA-Z_][\w-]*(?=\s*\()/, "entity.name.function"],
          [/@@[a-zA-Z-]+\b/, "keyword"],
          [/\$\/?[a-zA-Z_][\w-]*!?/, "variable"],
          [/--[a-zA-Z_][\w-]*/, "variable"],
          [/\bpattern(?=\s*\()/, "keyword"],
          [/%[0-9]+(?=\()/, "number"],
          [/\.[a-zA-Z_][\w-]*(?=\s*[{,])/, "entity.name.class"],
          [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, "number.hex"],
          [/-?\d+(?:\.\d+)?(px|em|rem|ex|ch|pt|pc|vw|vh|vmin|vmax|%|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx|fr)\b/, "number"],
          [/-?\d+(?:\.\d+)?\b/, "number"],
          [/\.(length|last|reverse|first|list|indices|randint|segment|map|sum|unique|sort|shuffle|min|max|obj|xfscss)\b/, "entity.name.function"],
          [/\b(cos|cin|inline|exec|find|pick|length|count|copy|str|re|store|join|prefix|surround|unit|block|num|rpt|mx|mxs|linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient|conic-gradient|repeating-conic-gradient|var|calc|min|max|clamp|rgb|rgba|hsl|hsla|hwb|lch|lab|color-mix|color|url|attr|counter|counters|element|image-set|fit-content|minmax|repeat|steps|cubic-bezier|matrix|translate|translateX|translateY|translateZ|scale|scaleX|scaleY|scaleZ|rotate|rotateX|rotateY|rotateZ|skew|skewX|skewY|perspective)(?=\s*\()/, "support.function"],
          [/\b(_init|if|el-if|el|return|_log|_warn|_info|_error|from|as|to|default|export)\b/, "keyword"],
          [/[a-zA-Z_-][\w-]*(?=\s*:)/, "support.type.property-name"],
          [/!important\b/, "keyword"],
          [/\|\|/, "keyword"],
          [/[{}()\[\]]/, "@brackets"],
          [/[;:,.]/, "delimiter"],
          [/[ \t\r\n]+/, "white"]
        ],
        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"]
        ],
        string_double: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"]
        ],
        string_single: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"]
        ],
        backtick: [
          [/[^\\`]+/, "string"],
          [/\\./, "string.escape"],
          [/`/, "string", "@pop"]
        ]
      }
    };

    const EXAMPLES = {
      basic: `@define center(elem){\`
  @use(elem){
    display: flex;
    justify-content: center;
    align-items: center;
  }
\`}

@center(.box)

.box {
  width: 200px;
  height: 120px;
  background: #1E2783;
  color: white;
  border-radius: 12px;
}`,
      vars: `$primary: #0BCEAE;
$radius: 8px;

@arr palette[#1E2783, #8C29B2, #C41348, #0098d0]

.card {
  background: @random(@arr.palette);
  color: white;
  padding: 16px 24px;
  border-radius: $radius!;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.btn {
  background: $primary!;
  color: #111;
  padding: 10px 20px;
  border-radius: $radius!;
  border: none;
  font-weight: 600;
}`,
      pattern: `pattern(0.6: "rounded primary button with color: white, bg: red", \`
  background: @match(bg:?\\s([#\\w\\d-_]+)) @match(background:?\\s([#\\w\\d-_]+));
  color: @match(color:?\\s([#\\w\\d-_]+));
  border-radius: 25px;
  padding: 10px 20px;
  font-weight: 700;
  border: 2px solid;
\`)

.primary {
  rounded primary button with color: #0BCEAE, background: midnightblue
}`,
      import: `/* Example import */
@import((*) from flex-control)

@arr colors[#1E2783, #8C29B2, #C41348]

.container {
  display: flex;
  gap: 12px;
  background: @random(@arr.colors);
  padding: 24px;
  border-radius: 12px;
  color: white;
}`,
      debug: `exec(_log, 'Hello from FSCSS compiler')
exec(_warn, 'This is a compile-time warning')
exec(_info, 'Info message from pipeline')

$debug-color: #f0c14b;

.box {
  background: $debug-color!;
  padding: 20px;
  border-radius: 8px;
  color: #111;
}`
    };

    const DEFAULT_JS = `// Optional: call xfscss.process yourself
async function updateButton(btn) {
  if (!window.xfscss) return;
  const style = await xfscss.process(
    "@arr colors[#1E2783, #8C29B2, #C41348]\\n@btn-style(@arr.colors!.randint)"
  );
  btn.setAttribute("style", style);
}
`;

    const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FSCSS Preview</title>
  <style id="fscss-out">/* compiled CSS injected here */</style>
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0f0f12;color:#eee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;">
  <div class="box card container primary">Hello from FSCSS preview</div>
</body>
</html>`;

    const logsEl = document.getElementById("logs");
    const statusEl = document.getElementById("status");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const btnMenu = document.getElementById("btn-menu");
    const btnClose = document.getElementById("btn-close-sidebar");

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function appendLog(level, ...args) {
      const empty = logsEl.querySelector(".log-empty");
      if (empty) empty.remove();
      const line = document.createElement("div");
      line.className = "log-line";
      line.dataset.level = level;
      const ts = new Date().toLocaleTimeString();
      const msg = args.map((a) => {
        if (typeof a === "string") return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(" ");
      line.innerHTML =
        `<span class="ts">${ts}</span><span class="lvl">[${level}]</span> ${escapeHtml(msg)}`;
      logsEl.appendChild(line);
      logsEl.scrollTop = logsEl.scrollHeight;
    }

    function clearLogs() {
      logsEl.innerHTML = '<p class="log-empty">Logs cleared.</p>';
    }

    const originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      error: console.error.bind(console)
    };

    function installConsoleIntercept() {
      console.log = (...a) => { originalConsole.log(...a); appendLog("log", ...a); };
      console.warn = (...a) => { originalConsole.warn(...a); appendLog("warn", ...a); };
      console.info = (...a) => { originalConsole.info(...a); appendLog("info", ...a); };
      console.error = (...a) => { originalConsole.error(...a); appendLog("error", ...a); };
    }

    function restoreConsole() {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      console.error = originalConsole.error;
    }

    let lastFocus = null;

    function openSidebar() {
      lastFocus = document.activeElement;
      sidebar.hidden = false;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      btnMenu.setAttribute("aria-expanded", "true");
      btnClose.focus();
      document.addEventListener("keydown", onSidebarKeydown);
    }

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      btnMenu.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onSidebarKeydown);
      window.setTimeout(() => {
        if (!sidebar.classList.contains("is-open")) sidebar.hidden = true;
      }, 220);
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function onSidebarKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSidebar();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = sidebar.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter((el) => !el.disabled);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    btnMenu.addEventListener("click", () => {
      if (sidebar.classList.contains("is-open")) closeSidebar();
      else openSidebar();
    });
    btnClose.addEventListener("click", closeSidebar);
    backdrop.addEventListener("click", closeSidebar);

    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

    function setActivePanel(name) {
      const panels = document.querySelectorAll(".panel");
      const tabs = document.querySelectorAll('[role="tab"]');

      if (isDesktop()) {
        panels.forEach((p) => {
          const id = p.dataset.panel;
          p.classList.remove("is-active", "is-hidden-desktop");
          p.removeAttribute("hidden");
          if (id === "html") {
            if (name === "html") {
              p.classList.add("is-active");
              p.style.display = "flex";
            } else {
              p.classList.add("is-hidden-desktop");
              p.style.display = "none";
            }
          } else {
            p.classList.add("is-active");
            p.style.display = "flex";
          }
        });
      } else {
        panels.forEach((p) => {
          const on = p.dataset.panel === name;
          p.classList.toggle("is-active", on);
          if (on) {
            p.removeAttribute("hidden");
            p.style.display = "flex";
          } else {
            p.hidden = true;
            p.style.display = "none";
          }
        });
      }

      tabs.forEach((t) => {
        const on = t.dataset.panel === name;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });

      document.querySelectorAll("[data-go-panel]").forEach((btn) => {
        btn.setAttribute("aria-current", btn.dataset.goPanel === name ? "true" : "false");
      });

      window.dispatchEvent(new Event("resize"));
    }

    document.querySelectorAll('[role="tab"]').forEach((tab) => {
      tab.addEventListener("click", () => setActivePanel(tab.dataset.panel));
      tab.addEventListener("keydown", (e) => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const i = tabs.indexOf(tab);
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          setActivePanel(next.dataset.panel);
        }
      });
    });

    document.querySelectorAll("[data-go-panel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActivePanel(btn.dataset.goPanel);
        closeSidebar();
      });
    });

    window.addEventListener("resize", () => {
      const selected = document.querySelector('[role="tab"][aria-selected="true"]');
      if (selected) setActivePanel(selected.dataset.panel);
    });

    const bottom = document.getElementById("bottom");
    const handle = document.getElementById("resize-handle");
    let resizing = false;

    function setBottomHeight(px) {
      const min = 100;
      const max = Math.min(window.innerHeight * 0.55, 500);
      const h = Math.max(min, Math.min(max, px));
      bottom.style.height = h + "px";
      handle.setAttribute("aria-valuenow", String(Math.round(h)));
      window.dispatchEvent(new Event("resize"));
    }

    handle.addEventListener("pointerdown", (e) => {
      resizing = true;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!resizing) return;
      setBottomHeight(window.innerHeight - e.clientY);
    });
    handle.addEventListener("pointerup", () => { resizing = false; });
    handle.addEventListener("pointercancel", () => { resizing = false; });
    handle.addEventListener("keydown", (e) => {
      const cur = parseInt(handle.getAttribute("aria-valuenow") || "160", 10);
      if (e.key === "ArrowUp") { e.preventDefault(); setBottomHeight(cur + 20); }
      if (e.key === "ArrowDown") { e.preventDefault(); setBottomHeight(cur - 20); }
    });

    require.config({
      paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" }
    });

    require(
  ["vs/editor/editor.main"], 
  function () {
    try {
      monaco.languages.register({
        id: "fscss",
        extensions: [".fscss", ".xfscss"],
        aliases: ["FSCSS", "fscss"]
      });
      monaco.languages.setMonarchTokensProvider("fscss", FSCSS_MONARCH);
      monaco.languages.setLanguageConfiguration("fscss", {
        comments: { lineComment: "//", blockComment: ["/*", "*/"] },
        brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
        autoClosingPairs: [
          { open: "{", close: "}" },
          { open: "[", close: "]" },
          { open: "(", close: ")" },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: "`", close: "`" }
        ]
      });

      monaco.editor.defineTheme("fscss-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "C586C0" },
          { token: "entity.name.function", foreground: "DCDCAA" },
          { token: "support.function", foreground: "DCDCAA" },
          { token: "variable", foreground: "9CDCFE" },
          { token: "number", foreground: "B5CEA8" },
          { token: "number.hex", foreground: "B5CEA8" },
          { token: "string", foreground: "CE9178" },
          { token: "comment", foreground: "6A9955" },
          { token: "support.type.property-name", foreground: "9CDCFE" },
          { token: "entity.name.class", foreground: "4EC9B0" }
        ],
        colors: {
          "editor.background": "#1e1e1e",
          "editor.foreground": "#e8e8e8"
        }
      });
      monaco.editor.setTheme("fscss-dark");

      const common = {
        theme: "fscss-dark",
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "ui-monospace, Cascadia Code, Fira Code, Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        renderLineHighlight: "line",
        padding: { top: 8 },
        accessibilitySupport: "on"
      };

      const editorFscss = monaco.editor.create(document.getElementById("editor-fscss"), {
        ...common,
        language: "fscss",
        value: EXAMPLES.basic,
        ariaLabel: "FSCSS source editor"
      });

      const editorCss = monaco.editor.create(document.getElementById("editor-css"), {
        ...common,
        language: "css",
        value: "/* Compiled CSS appears here */",
        readOnly: true,
        ariaLabel: "Compiled CSS (read only)"
      });

      const editorJs = monaco.editor.create(document.getElementById("editor-js"), {
        ...common,
        language: "javascript",
        value: DEFAULT_JS,
        ariaLabel: "JavaScript editor"
      });

      monaco.languages.registerCompletionItemProvider("fscss", {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };
          const S = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          const K = monaco.languages.CompletionItemKind.Snippet;
          return {
            suggestions: [
              { label: "def", kind: K, insertText: "@define ${1:name}(${2:args}){\n  ${3}\n}", insertTextRules: S, documentation: "@define function", range },
              { label: "use", kind: K, insertText: "@use(${1:arg})", insertTextRules: S, documentation: "@use selector", range },
              { label: "var", kind: K, insertText: "\\$${1:name}: ${2:value};", insertTextRules: S, documentation: "Variable", range },
              { label: "arr", kind: K, insertText: "@arr ${1:name}[${2:val1, val2}]", insertTextRules: S, documentation: "Array", range },
              { label: "exe", kind: K, insertText: "exec(_log, '${1:message}')", insertTextRules: S, documentation: "Console log", range },
              { label: "exew", kind: K, insertText: "exec(_warn, '${1:message}')", insertTextRules: S, documentation: "Console warn", range },
              { label: "imp", kind: K, insertText: "@import((${1:module}) from ${2:lib})", insertTextRules: S, documentation: "Import", range },
              { label: "impw", kind: K, insertText: "@import((*) from ${1:lib})", insertTextRules: S, documentation: "Wildcard import", range },
              { label: "pattern", kind: K, insertText: "pattern(${1:0.5}: \"${2:description}\", \\`\n  ${3}\n\\`)", insertTextRules: S, documentation: "Pattern", range },
              { label: "num", kind: K, insertText: "num(${1:expr})", insertTextRules: S, documentation: "Math", range },
              { label: "obj", kind: K, insertText: "@obj ${1:name}{ ${2} }", insertTextRules: S, documentation: "Object", range },
              { label: "fun", kind: K, insertText: "@fun(${1:name}){\n  ${2}\n}", insertTextRules: S, documentation: "@fun", range }
            ]
          };
        }
      });

      async function compile({ preview = false } = {}) {
        if (!xfscss || typeof xfscss.process !== "function") {
          statusEl.textContent = "Compiler unavailable";
          statusEl.dataset.state = "err";
          appendLog("error", "xfscss.process is not available. Check network / CDN.");
          return;
        }
        const source = editorFscss.getValue();
        statusEl.textContent = "Compiling…";
        statusEl.dataset.state = "";
        installConsoleIntercept();
        appendLog("system", "Running xfscss.process…");
        try {
          const t0 = performance.now();
          const css = await xfscss.process(source);
          const ms = (performance.now() - t0).toFixed(1);
          editorCss.setValue(css || "/* (empty) */");
          statusEl.textContent = "OK · " + ms + " ms";
          statusEl.dataset.state = "ok";
          appendLog("system", "Compiled in " + ms + " ms");
          if (preview) injectPreview(css);
        } catch (err) {
          statusEl.textContent = "Error";
          statusEl.dataset.state = "err";
          appendLog("error", err && err.message ? err.message : String(err));
          if (err && err.stack) appendLog("error", err.stack);
        } finally {
          restoreConsole();
        }
      }

      function injectPreview(css) {
        const frame = document.getElementById("preview-frame");
        const safeCss = String(css).split("</" + "style>").join("<\\/" + "style>");
        const js = editorJs.getValue().split("</" + "script>").join("<\\/" + "script>");
        let html = DEFAULT_HTML.replace("/* compiled CSS injected here */", safeCss);
        const openScript = "<" + "script type=\"module\">";
        const closeScript = "<" + "/script>";
        html = html.replace("</body>", openScript + "\n" + js + "\n" + closeScript + "</body>");
        frame.srcdoc = html;
        setActivePanel("html");
        appendLog("system", "Preview updated");
      }

      document.getElementById("btn-compile").addEventListener("click", () => compile({ preview: false }));
      document.getElementById("btn-preview").addEventListener("click", () => compile({ preview: true }));
      document.getElementById("btn-clear-logs").addEventListener("click", clearLogs);
      document.getElementById("btn-clear-logs-2").addEventListener("click", clearLogs);

      document.querySelectorAll("[data-example]").forEach((el) => {
        el.addEventListener("click", () => {
          const key = el.dataset.example;
          if (EXAMPLES[key]) {
            editorFscss.setValue(EXAMPLES[key]);
            setActivePanel("fscss");
            appendLog("system", "Loaded example: " + key);
            closeSidebar();
          }
        });
      });

      document.querySelectorAll("[data-lib]").forEach((el) => {
        el.addEventListener("click", () => {
          const name = el.dataset.lib;
          editorFscss.executeEdits("lib", [{
            range: new monaco.Range(1, 1, 1, 1),
            text: "@import((*) from " + name + ")\n\n"
          }]);
          setActivePanel("fscss");
          appendLog("info", 'Inserted import for "' + name + '".');
          closeSidebar();
        });
      });

      editorFscss.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => compile({ preview: false }));

      setActivePanel("fscss");
      appendLog("system", "FSCSS Monaco Playground ready.");
      appendLog("system", xfscss ? "xfscss.process loaded (CDN v1.2.4)." : "Warning: xfscss not loaded.");
      appendLog("info", "Menu opens examples & imports. Tabs switch panels. Ctrl/Cmd+Enter compiles.");

      compile({ preview: false });
    } catch (err) {
      console.error("Monaco initialization error:", err);
    }
    },
    function(err) {
      console.error("Failed to load Monaco editor worker/modules:", err);
    }
    );
