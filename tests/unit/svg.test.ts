import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inspectSvg } from "@/application/lib/svg";

const svg = (body: string, attrs = 'viewBox="0 0 200 50"') => `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

/** Todos los .svg de public/, para que la lista blanca no deje fuera los logos reales. */
function publicSvgs(dir = "public"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return publicSvgs(path);
    return e.name.endsWith(".svg") ? [path] : [];
  });
}

describe("inspectSvg: lista blanca", () => {
  it("rechaza lo que la lista negra dejaba pasar", () => {
    for (const bad of [
      // Prefijo de espacio de nombres: `s:script` es un <script> de SVG.
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><s:script>alert(1)</s:script></svg>`,
      // <set> cambia el href a javascript: escrito con entidades.
      svg('<a><set attributeName="href" to="&#106;avascript:alert(1)"/><path d="M0 0h10"/></a>'),
      svg('<path d="M0 0h10" fill="&#117;rl(https://evil.example/x)"/>'),
      // url() sin esquema: `//host` es otro servidor.
      svg('<path d="M0 0h10" style="fill:url(//evil.example/x.svg#a)"/>'),
      svg('<path d="M0 0h10" fill="url(/assets/x.svg#a)"/>'),
      svg("<style>.a{fill:url(//evil.example/x.svg#a)}</style>"),
      svg('<style>.a{background:image-set("https://evil.example/x.png" 1x)}</style>'),
      svg("<animate attributeName=\"fill\" to=\"red\"/>"),
      svg('<text x="0" y="10">Hola</text>'),
      svg('<use href="#a" onclick="alert(1)"/>'),
      svg("<use/>"),
      svg('<g x:href="https://evil.example/x.svg" xmlns:x="http://www.w3.org/1999/xlink"/>'),
      `<svg xmlns="http://www.w3.org/1999/xhtml" viewBox="0 0 10 10"/>`,
      `<?xml-stylesheet href="https://evil.example/x.css"?>${svg("")}`,
      svg("<g>sin cerrar"),
      svg('<path d="M0 0h10" fill=red/>'),
    ])
      expect(inspectSvg(bad).ok, bad).toBe(false);
  });

  it("acepta arte plano: formas, degradados, recortes, máscaras, estilos y referencias #id", () => {
    const art = svg(
      '<title>Logo &amp; marca</title><defs><linearGradient id="g" xlink:href="#h"><stop offset="0" stop-color="#000"/></linearGradient><clipPath id="c"><circle cx="5" cy="5" r="5"/></clipPath><mask id="m"><rect width="10" height="10" fill="#fff"/></mask></defs>' +
        '<style type="text/css"><![CDATA[.a{fill:url(#g)}]]></style><g clip-path="url(#c)" mask="url( \'#m\' )"><path class="a" d="M0 0h10"/><ellipse rx="1" ry="2"/><line x2="1"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 1,0"/></g><use href="#c"/>',
      'viewBox="0 0 200 50" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"',
    );
    expect(inspectSvg(art)).toEqual({ ok: true, ratio: 4 });
  });

  it("todos los SVG del sitio (public/) pasan", () => {
    const files = publicSvgs();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(inspectSvg(readFileSync(file, "utf8")), file).toMatchObject({ ok: true });
  });
});
