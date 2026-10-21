// Genera brand.schema.json (JSON Schema 2020-12) desde BrandConfigSchema
// (src/application/dto/brand-config.dto.ts): el contrato que consume Kode.
// Uso: npm run brand:schema   ·   --check: falla si el archivo no está al día (CI).
import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const CHECK = process.argv.includes("--check");
const OUT = "brand.schema.json";

const bundle = await build({
  stdin: {
    contents: `import { z } from "zod"; import { BrandConfigSchema } from "./src/application/dto/brand-config.dto"; export const schema = z.toJSONSchema(BrandConfigSchema, { io: "input", target: "draft-2020-12" });`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  tsconfig: "tsconfig.json",
  logLevel: "error",
});
const { schema } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const doc = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/kodecol/neonnight/blob/main/brand.schema.json",
  title: "brand.json de la plantilla jewelry-store",
  description: "Marca de una instancia: identidad, colores, tipografía, empresa y redes. Lo aplica `lifecycle.mjs brand:apply`. Además del esquema, se exige contraste WCAG AA y fondo oscuro.",
  ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== "$schema")),
};
const text = `${JSON.stringify(doc, null, 2)}\n`;
if (CHECK) {
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (current !== text) {
    console.error(`${OUT} no está al día: corre npm run brand:schema.`);
    process.exit(1);
  }
  console.log(`${OUT} al día.`);
} else {
  await writeFile(OUT, text);
  console.log(`${OUT} generado.`);
}
