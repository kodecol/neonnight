# ADR 0007 — Biblioteca de medios por producto con usos asignables

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Amplía:** ADR 0004 y 0005

## Contexto

El panel solo editaba la foto frontal, la trasera y la galería. El fondo del hero, la imagen final (banda al cierre de la ficha) y los videos venían del seed y no se podían cambiar. Al guardar, una pieza sin banda propia recibía la foto frontal ampliada como banda. El resultado era una ficha inconsistente: 6 relojes repetían su recorte al final, el Sky-Dweller mostraba un Day-Date y 14 piezas no tenían imagen final.

## Decisión

- **Una biblioteca por pieza** (`ProductMedia.library`): todas sus fotos, en el orden que elige el panel. Se suben una vez, varias a la vez.
- **Usos que apuntan a fotos de la biblioteca** por `src`: portada (`front`), segunda vista (`back`), fondo del hero (`hero`), imagen final (`band`) y galería. Cada uso tiene una sola foto, pero una foto puede tener varios usos (por ejemplo, la misma foto de ambiente como hero e imagen final). Asignar un uso a otra foto se lo quita a la anterior.
- **El almacenamiento no cambia de forma**: la tienda sigue leyendo `front`, `back`, `hero`, `band` y `gallery`, que se desnormalizan desde la biblioteca al guardar (`domain/services/media-library.ts: assignMedia`). Los documentos anteriores no traen `library`: se deriva al leerlos (`withLibrary`), sin migración.
- **Validación en el borde** (`AdminMediaInputSchema`): sin fotos repetidas, y cada uso o foto de galería debe existir en la biblioteca. El valor `"video"` en `hero` conserva el video que ya tiene la pieza; los videos no se suben desde el panel.
- **Nada se rellena solo**: sin imagen final asignada, la ficha no muestra la banda.
- **Interfaz**: arriba, cuatro casillas con lo que ocupa cada lugar de la ficha (se toca una y luego la foto); abajo, la biblioteca con insignias de uso; al elegir una foto, un inspector para asignar usos, la galería, el texto alternativo, el orden o quitarla. Las operaciones del borrador son funciones puras (`presentation/lib/media-draft.ts`).
- **Datos existentes**: `scripts/fill-product-bands.mjs` (idempotente, `--dry-run`) deja a cada pieza con imagen final (conserva la propia, usa la del hero o la foto de ambiente del repo) y guarda la biblioteca; luego `sync-catalog-media.mjs` sube las fotos nuevas a Cloudinary.

## Consecuencias

- Agregar un uso nuevo (por ejemplo, una foto para redes) es sumar una clave a `MEDIA_ROLE_KEYS`, a `ProductMedia` y una casilla en el panel.
- La página de inicio usa una biblioteca propia con la misma idea (ADR 0008).
