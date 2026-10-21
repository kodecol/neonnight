# Handoff del 2026-10-21: marca blanca `jewelry-store` y la noche de QA

Esto es para Cristian, para revisar en la mañana. Producción (neonightonline.com) **no** tiene nada de la rama `feat/marca-blanca`.

## Lo que quedó en producción esta noche

Lo desplegué con tu autorización y lo certifiqué después de cada despliegue. La versión actual es `996150b`. Antes de cada despliegue saqué un respaldo de Atlas en la máquina de desarrollo.

1. **Hotfix de seguridad** (`3449dec`), con dos fallas críticas que encontraron los agentes de QA:
   - **Webhook de Bold.** Con Bold apagado, como está hoy, cualquiera podía firmar con la llave vacía de pruebas y marcar un pedido como pagado o rechazado. Ahora, sin Bold activo, no se acepta ningún aviso, y solo cambian los pedidos de Bold.
   - **Panel sin sesión.** Con una navegación RSC y la cabecera `next-action`, las páginas del panel se podían leer sin iniciar sesión, con los datos personales de los pedidos y los ajustes de pagos. Ahora cada página verifica la sesión, y un test lo exige.
   - Además:
     - el stock ya no se descuenta dos veces cuando llegan avisos repetidos;
     - un pago que llega a un pedido cancelado o sin stock queda marcado como "por revisar";
     - el checkout acepta 10 pedidos por minuto por IP;
     - el límite global del login frena los intentos sin bloquearte;
     - se agregaron cabeceras de seguridad;
     - ya no se puede inyectar CSS por el logo de una marca.
2. **Endurecimiento del CMS:**
   - los SVG se validan con lista blanca;
   - el formato de las subidas se toma de los bytes del archivo;
   - los enlaces `/\` dejan de funcionar;
   - "volver a fábrica" en Legales publica una versión nueva;
   - los ids de las presentaciones deben ser únicos.
3. **Tienda (PR #34):**
   - el video vertical de 13,6 MB ya no se descarga en móvil hasta que se ve;
   - las páginas legales ya no se desbordan a 390 px;
   - el foco queda dentro de la bolsa y del menú;
   - los errores del checkout son accesibles;
   - se arreglaron la pantalla de carga y el 404.
4. **Marca blanca, QA de expand-catalog (PR #33):** se quitaron los "Neon Night" fijos de los textos de Pagos y Devoluciones.

## Lo que te toca decidir

1. **Aprobar la rama `feat/marca-blanca`** (con su PR) y adoptarla en Neon Night. Pasos para cuando la apruebes:
   1. Respaldo de Atlas.
   2. En el `.env` del VPS, agregar `STORE_SLUG=neonnight` y `STORE_ORDER_PREFIX=NN` (`MONGODB_DB` ya está). Por stdin, nunca impresas.
   3. Desplegar la imagen nueva.
   4. `docker exec neonnight-web node lifecycle.mjs brand:apply --file brands/neonnight/brand.json`. Publica la identidad, la apariencia, la empresa y las redes de Neon Night tal como se ven hoy.
   5. Verificar el título, el isotipo, el pie, las legales, las redes, el favicon y un pedido de prueba (prefijo NN).
   - Mientras el paso 4 no corra, la tienda se vería como "Tu tienda". Por eso van seguidos.
   - **Los testimonios de ejemplo desaparecen:** eran inventados (Ley 1480). Vuelven cuando cargues los reales en Inicio › Testimonios con autorización.
2. **Contraste:** `ink-3` (#515151, 2,64:1) y el blanco sobre #ff006e (3,83:1) no llegan a AA en texto pequeño. ¿Se ajustan los tokens?
3. **Breakpoint `sm`:** no está definido en el tema, así que unas pocas clases `sm:` no hacen nada. ¿Lo definimos (640 px) o las pasamos a `md:`? Activarlo cambia algunos espaciados en producción.
4. **Dónde vive la imagen:** hoy `kodecol/jewelry-store:1.0.0` está solo en esta máquina, y Kode la sube con `docker save`. Conviene publicarla en un registro privado.

## Kode

- La sesión `kodecol-cc` montó la primera instancia de prueba (`aurora-joyeria`) en un servidor de Kodecol, separado del de producción de Neon Night. El enlace está en su informe.
- Usó `examples/brand.example.json` y el seed de joyería.
- Contrato y uso: `docs/MARCA-BLANCA.md` y ADR 0017.

## Pendientes tuyos de antes

- Cambiar la contraseña del panel en **Ajustes › Seguridad**.
- Las llaves de pruebas de Bold y hacer conmigo el pago de prueba. Ahora, con Bold activo en pruebas, el webhook sí se acepta.
- IDs de GA4 y del píxel.
- Un usuario de Atlas con solo `readWrite@neonnight`.
- Darle Admin a `cristian-davela` en el repo.
- Testimonios y fotos reales.
