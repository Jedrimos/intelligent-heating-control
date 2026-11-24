// HTML-escape guard for the panel sources (HACS review 2026-11-24).
// Finds data interpolations in HTML-producing template literals (incl. nested templates and
// IIFEs) that are not escaped. A value counts as safe when it is wrapped in _esc()/ihcEsc(),
// a number/maths call, or a variable/call that itself produces IHC-built HTML.
// usage: node check_html_escape.js <src-dir> [--fix]   (needs acorn + acorn-walk)
// exit code 1 when something is left to wrap.
const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");

const dir = process.argv[2];  // a src directory (method fragments) or standalone .js files
const FIX = process.argv.includes("--fix");
const PREFIX = "class __X__ {\n";
const TAG = /<[a-zA-Z\/]/;
// calls whose result is HTML built by IHC (inner data is escaped where it is built) or a safe number
const HTML_FUNCS = /^(row|activeBadge|domainBadge|stateLabel|_render\w*|_sparkline|_renderPresenceCheckboxes|_costStr|_tileClass|_cardClass|_ventilationSubline|_weatherIcon|_tempBar|_badge\w*)$/;
const NUM_FUNCS = /^(toFixed|round|floor|ceil|max|min|abs|_kwh|parseInt|parseFloat|Number|toLocaleTimeString|toLocaleDateString|padStart|getHours|getMinutes|getDay|demColor|_fmt|_tempColor|_demandColor|prefOffset|xOf|yOf)$/;
const SAFE_FUNCS = /^(_esc|ihcEsc|encodeURIComponent)$/;

const report = [];
let totalFixes = 0;

const targets = fs.statSync(dir).isDirectory()
  ? fs.readdirSync(dir).filter(f => /^0[2-8].*\.js$/.test(f)).sort().map(f => [path.join(dir, f), true])
  : process.argv.slice(2).filter(a => a.endsWith(".js")).map(f => [f, false]);
for (const [filePath, isFragment] of targets) {
  const file = path.basename(filePath);
  const src = fs.readFileSync(filePath, "utf8");
  const prefix = isFragment ? PREFIX : "";
  const code = isFragment ? PREFIX + src + "\n}" : src;
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 2022, locations: true, sourceType: isFragment ? "script" : "module" }); }
  catch (e) { console.error(file, "parse error", e.message); process.exit(1); }

  // variable declarations: name -> list of init nodes (all scopes, conservative)
  const decls = {};
  walk.full(ast, n => {
    if (n.type === "VariableDeclarator" && n.id.type === "Identifier" && n.init) (decls[n.id.name] ||= []).push(n.init);
    if (n.type === "AssignmentExpression" && n.left.type === "Identifier") (decls[n.left.name] ||= []).push(n.right);
  });
  const producesHtml = (node, depth = 0) => {
    if (!node || depth > 4) return false;
    let html = false;
    walk.full(node, n => {
      if (n.type === "TemplateLiteral" && TAG.test(n.quasis.map(q => q.value.cooked).join(""))) html = true;
      if (n.type === "Literal" && typeof n.value === "string" && TAG.test(n.value)) html = true;
      if (n.type === "CallExpression") {
        const name = n.callee.type === "MemberExpression" ? n.callee.property.name : n.callee.name;
        if (name && HTML_FUNCS.test(name)) html = true;
      }
    });
    return html;
  };
  const alreadyEscaped = (node) => {
    let esc = false;
    walk.full(node, n => {
      if (n.type === "CallExpression") {
        const name = n.callee.type === "MemberExpression" ? n.callee.property.name : n.callee.name;
        if (name && SAFE_FUNCS.test(name)) esc = true;
      }
    });
    return esc;
  };
  const isHtmlVar = (name) => (decls[name] || []).some(init => producesHtml(init) || alreadyEscaped(init));

  const htmlTemplates = new Set();
  const edits = [];
  const unknown = [];
  const params = [];

  const markHtml = (tpl) => {
    if (htmlTemplates.has(tpl)) return;
    htmlTemplates.add(tpl);
    for (const e of tpl.expressions) handleExpr(e);
  };
  // wrap data parts of an expression that is inserted into HTML
  const handleExpr = (n) => {
    switch (n.type) {
      case "Literal": return;
      case "TemplateLiteral": return markHtml(n);
      case "ConditionalExpression": handleExpr(n.consequent); handleExpr(n.alternate); return;
      case "LogicalExpression":
        if (n.operator === "&&") return handleExpr(n.right);
        // x ?? "fallback" / x || 3: escape the whole thing, else the fallback never applies
        if (n.right.type === "Literal" || n.right.type === "UnaryExpression" || n.right.type === "Identifier" || n.right.type === "MemberExpression") {
          if (n.left.type === "Identifier" && isHtmlVar(n.left.name)) return;
          return wrap(n);
        }
        handleExpr(n.left); handleExpr(n.right); return;
      case "BinaryExpression":
        if (n.operator === "+") {
          const isStr = x => (x.type === "Literal" && typeof x.value === "string") || x.type === "TemplateLiteral"
            || (x.type === "BinaryExpression" && x.operator === "+" && (isStr(x.left) || isStr(x.right)));
          if (isStr(n.left) || isStr(n.right)) { handleExpr(n.left); handleExpr(n.right); }
          else wrap(n);   // arithmetic (i + 1) - escape the result, keep the maths intact
        }
        return; // other arithmetic/comparison → number/bool
      case "UnaryExpression": case "UpdateExpression": return;
      case "ArrowFunctionExpression": case "FunctionExpression": return;
      case "CallExpression": {
        const callee = n.callee;
        const name = callee.type === "MemberExpression" ? callee.property.name : callee.name;
        if (name && (SAFE_FUNCS.test(name) || NUM_FUNCS.test(name) || HTML_FUNCS.test(name))) {
          // .map(cb).join() → templates returned by the callback are HTML context
          return;
        }
        if (name === "stringify") return wrap(n);   // JSON into an attribute/textarea
        if (callee.type === "ArrowFunctionExpression" || callee.type === "FunctionExpression") {
          // IIFE: whatever it returns is inserted into the HTML
          walk.simple(callee.body, { ReturnStatement(r) { if (r.argument) handleExpr(r.argument); } });
          return;
        }
        if (name === "join" || name === "map" || name === "filter" || name === "concat") {
          walk.full(n, m => { if (m.type === "TemplateLiteral") markHtml(m); });
          return;
        }
        unknown.push(code.slice(n.start, n.end).slice(0, 90) + "  @" + (n.loc.start.line - 1));
        return;
      }
      case "Identifier":
        if (isHtmlVar(n.name)) return;
        if (!decls[n.name]) { params.push(n.name + "  @" + (n.loc.start.line - 1)); return; }
        return wrap(n);
      case "MemberExpression": case "ChainExpression": return wrap(n);
      default:
        unknown.push(n.type + ": " + code.slice(n.start, n.end).slice(0, 90) + "  @" + (n.loc.start.line - 1));
    }
  };
  const wrap = (n) => edits.push([n.start, n.end]);

  walk.full(ast, n => {
    if (n.type === "TemplateLiteral" && TAG.test(n.quasis.map(q => q.value.cooked).join(""))) markHtml(n);
  });
  // templates nested in HTML templates were marked while walking; walk again until stable
  walk.full(ast, n => { if (n.type === "TemplateLiteral" && htmlTemplates.has(n)) for (const e of n.expressions) handleExpr(e); });

  // dedupe + apply from the end
  const uniq = [...new Map(edits.map(e => [e.join(":"), e])).values()].sort((a, b) => b[0] - a[0]);
  report.push(`${file}: ${uniq.length} to wrap, ${unknown.length} unknown calls`);
  [...new Set(unknown)].forEach(u => report.push("   ? " + u));
  [...new Set(params)].forEach(u => report.push("   param " + u));
  if (FIX && uniq.length) {
    let out = code;
    for (const [s, e] of uniq) out = out.slice(0, s) + "ihcEsc(" + out.slice(s, e) + ")" + out.slice(e);
    fs.writeFileSync(filePath, isFragment ? out.slice(PREFIX.length, -2) : out);
  }
  totalFixes += uniq.length;
}
console.log(report.join("\n"));
console.log("total", totalFixes);
if (!FIX && totalFixes) process.exit(1);
