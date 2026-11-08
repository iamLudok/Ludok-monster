/**
 * DDL del esquema local. Vive aparte de `db.ts` (que importa expo-sqlite, y por
 * tanto solo funciona en el móvil) para que las pruebas de escritorio puedan
 * crear EXACTAMENTE el mismo esquema que crea la app. Si esto estuviera
 * duplicado en el test, el test validaría un esquema que no es el real.
 */
export const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS probadas (
  slug TEXT PRIMARY KEY NOT NULL,
  probadaAt INTEGER NOT NULL,
  valoracion INTEGER,
  nota TEXT,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS compras (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  precioCentimos INTEGER,
  moneda TEXT NOT NULL DEFAULT 'EUR',
  pais TEXT,
  ciudad TEXT,
  lat REAL,
  lng REAL,
  addedAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system',
  lastBackup INTEGER NOT NULL DEFAULT 0,
  schemaVersion INTEGER NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'EUR',
  nextcloudUrl TEXT,
  nextcloudUser TEXT,
  nextcloudPassword TEXT,
  nextcloudFolder TEXT,
  autoBackup INTEGER,
  lastAutoBackupAt INTEGER
);

CREATE INDEX IF NOT EXISTS compras_slug_idx ON compras (slug);
`

/**
 * Cambios de esquema sobre bases ya creadas, en orden. El índice del array + 1
 * es la versión a la que lleva cada paso (`PRAGMA user_version`).
 *
 * `CREATE_SQL` de arriba siempre describe el esquema COMPLETO y actual, así que
 * una instalación nueva no ejecuta ninguno de estos pasos: son solo para bases
 * que ya existían antes del cambio.
 *
 * ⚠️ Añadir una columna a CREATE_SQL SIN añadir aquí su ALTER deja rotas todas
 * las instalaciones que ya existen.
 */
export const MIGRATIONS: string[] = []

/** Versión del esquema de SQLite. NO es la del formato de copia (`version.ts`). */
export const DB_VERSION = MIGRATIONS.length + 1
