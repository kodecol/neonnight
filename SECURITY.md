# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Repórtala en privado en
[Security → Report a vulnerability](https://github.com/kodecol/neonnight/security/advisories/new).

Incluye:
- qué componente afecta (tienda, checkout, webhook de Bold, panel `/admin`, despliegue);
- cómo reproducirla;
- el impacto que estimas.

Respondemos en un máximo de 5 días hábiles y avisamos cuando haya corrección.

## Alcance

- Código de este repositorio y el sitio https://neonightonline.com.
- Fuera de alcance: servicios de terceros (Bold, MongoDB Atlas, Cloudinary, GitHub) y pruebas de denegación de servicio.

## Buenas prácticas del proyecto

- Los secretos nunca se versionan: van en `.env` (permisos 600) en el servidor y en los secretos de GitHub Actions.
- Si un secreto se publica por error, se considera comprometido: se **rota** de inmediato. Borrarlo del historial no basta.
