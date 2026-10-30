import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
const roots = [
  "src/lib/leads.ts",
  "src/lib/website-discovery.ts",
  "src/server/leads",
  "src/components/leads",
  "src/app/(hub)/leads",
  "src/app/lead-actions.ts",
  "src/app/website-actions.ts",
  "src/app/api/leads",
];
function files(p) {
  return fs.statSync(p).isDirectory()
    ? fs.readdirSync(p).flatMap((n) => files(path.join(p, n)))
    : /\.tsx?$/.test(p)
      ? [p]
      : [];
}
const values = new Set();
for (const p of roots.flatMap(files)) {
  const source = ts.createSourceFile(
    p,
    fs.readFileSync(p, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(n) {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n) ||
      ts.isJsxText(n)
    ) {
      const value = n.text.replace(/\s+/g, " ").trim();
      const attr = n.parent;
      if (
        ts.isJsxAttribute(attr) &&
        [
          "className",
          "name",
          "type",
          "href",
          "id",
          "value",
          "method",
          "action",
          "target",
          "rel",
        ].includes(attr.name.getText(source))
      )
        return;
      if (
        (value && !/^(?:[a-zA-Z0-9_.$:/#@?=+\\-]+|[0-9]+)$/.test(value)) ||
        /[æøåÆØÅ]/.test(value)
      )
        values.add(value);
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(
  "test-results/lead-text.json",
  JSON.stringify([...values].sort(), null, 2),
);
console.log(values.size + " strings: test-results/lead-text.json");
