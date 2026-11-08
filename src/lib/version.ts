/**
 * Versión del FORMATO DE COPIA (lo que valida `importAll`). No es la del esquema de
 * SQLite, que es `DB_VERSION` en `schemaSql.ts`: pueden ir por números distintos.
 *
 * Vive en un módulo propio y sin dependencias para que lo usen tanto los mapeadores de
 * filas como el núcleo de copias sin crear un ciclo de imports.
 */
export const SCHEMA_VERSION = 1
