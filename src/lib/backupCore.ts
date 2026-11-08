// Núcleo de las copias de seguridad: solo consultas Drizzle, sin nada nativo.
//
// Separado de `backup.ts` a propósito: aquí no se importa expo-file-system ni expo-sqlite,
// así que este código se ejecuta tal cual en Node contra un SQLite de escritorio en
// `verify/`. Recibe la base por parámetro: la prueba ejecuta EXACTAMENTE lo que corre en el
// móvil.
import { eq } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import { probadas as probadasTable, compras as comprasTable, settings as settingsTable } from './schema'
import { rowToProbada, probadaToRow, rowToCompra, compraToRow, rowToSettings, settingsToRow } from './rows'
import { existeLata } from './catalogo'
import { SCHEMA_VERSION } from './version'
import type { BackupFile, Compra, Probada, Settings } from '../types'

export { SCHEMA_VERSION }

/** Cualquier base de datos SQLite de Drizzle (expo-sqlite en el móvil, libsql en las pruebas). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = BaseSQLiteDatabase<any, any, any>

const APP_ID = 'ludok-monster'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  theme: 'system',
  lastBackup: 0,
  schemaVersion: SCHEMA_VERSION,
  moneda: 'EUR',
  autoBackup: false,
}

export async function readSettings(database: AppDb): Promise<Settings> {
  const rows = await database.select().from(settingsTable).where(eq(settingsTable.id, 'app')).limit(1)
  return rows[0] ? rowToSettings(rows[0]) : DEFAULT_SETTINGS
}

export async function writeSettings(database: AppDb, next: Settings): Promise<void> {
  const row = settingsToRow({ ...next, id: 'app' })
  await database.insert(settingsTable).values(row).onConflictDoUpdate({ target: settingsTable.id, set: row })
}

/** Serializa todo lo de esta persona a un objeto de copia. El catálogo no viaja: va con la app. */
export async function exportAll(database: AppDb): Promise<BackupFile> {
  const probadas = (await database.select().from(probadasTable)).map(rowToProbada)
  const compras = (await database.select().from(comprasTable)).map(rowToCompra)
  const settings = await readSettings(database)
  // La contraseña de Nextcloud NO se exporta: ver `Settings.nextcloudPassword` en types.ts.
  const { nextcloudPassword: _omitida, ...seguros } = settings
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    probadas,
    compras,
    settings: seguros,
  }
}

export interface ImportResult {
  probadas: number
  compras: number
  /** Filas de latas que esta versión de la app no conoce: se guardan igual, ver abajo. */
  desconocidas: number
}

function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d.app === APP_ID && typeof d.schemaVersion === 'number' && Array.isArray(d.probadas) && Array.isArray(d.compras)
}

/**
 * Importa una copia, REEMPLAZANDO lo que hay. Valida formato y versión antes de tocar nada,
 * y escribe dentro de una transacción: si algo falla a mitad, la base no queda a medias.
 *
 * Las filas de latas que esta versión no conoce (una copia hecha con una versión más nueva
 * que ya trae más latas, pero con el mismo formato) se guardan igual en vez de descartarse:
 * no se ven hasta actualizar la app, pero tampoco se pierden al volver a exportar.
 */
export async function importAll(database: AppDb, raw: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('El fichero no es un JSON válido.')
  }
  if (!isBackupFile(parsed)) throw new Error('Este fichero no es una copia de Ludok Monster.')
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`La copia es de una versión más nueva (v${parsed.schemaVersion}). Actualiza la app antes de importar.`)
  }
  const probadas: Probada[] = parsed.probadas
  const compras: Compra[] = parsed.compras

  await database.transaction(async (tx: AppDb) => {
    await tx.delete(probadasTable)
    await tx.delete(comprasTable)
    if (probadas.length) await tx.insert(probadasTable).values(probadas.map(probadaToRow))
    if (compras.length) await tx.insert(comprasTable).values(compras.map(compraToRow))
    if (parsed.settings) {
      // La contraseña no viene en la copia: se conserva la que ya hubiera en este móvil.
      const current = await readSettings(tx)
      await writeSettings(tx, {
        ...current,
        ...parsed.settings,
        nextcloudPassword: current.nextcloudPassword,
        id: 'app',
        schemaVersion: SCHEMA_VERSION,
      })
    }
  })

  const slugs = new Set([...probadas.map((p) => p.slug), ...compras.map((c) => c.slug)])
  return {
    probadas: probadas.length,
    compras: compras.length,
    desconocidas: [...slugs].filter((s) => !existeLata(s)).length,
  }
}

/** Días transcurridos desde la última copia. null si nunca se hizo. */
export function daysSinceBackup(lastBackup: number): number | null {
  if (!lastBackup) return null
  return Math.floor((Date.now() - lastBackup) / 86_400_000)
}
