// Traducción entre las filas de SQLite y el modelo de dominio.
//
// SQLite devuelve `null` en las columnas vacías, pero los tipos de la app (y el formato de
// las copias) usan `undefined`, que `JSON.stringify` elimina. Pasar de uno a otro aquí, en
// un solo sitio, es lo que mantiene los ficheros de copia limpios en vez de llenos de
// `"ciudad": null`, y lo que evita que un campo nuevo se lea bien en un sitio y mal en otro.
import type { ProbadaRow, CompraRow, SettingsRow } from './schema'
import type { Probada, Compra, Settings } from '../types'
import { SCHEMA_VERSION } from './version'

/** null → undefined */
const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v)
/** undefined → null */
const n = <T>(v: T | undefined): T | null => (v === undefined ? null : v)

export function rowToProbada(r: ProbadaRow): Probada {
  return {
    slug: r.slug,
    probadaAt: r.probadaAt,
    valoracion: u(r.valoracion),
    nota: u(r.nota),
    updatedAt: r.updatedAt,
  }
}

export function probadaToRow(p: Probada): ProbadaRow {
  return {
    slug: p.slug,
    probadaAt: p.probadaAt,
    valoracion: n(p.valoracion),
    nota: n(p.nota),
    updatedAt: p.updatedAt,
  }
}

export function rowToCompra(r: CompraRow): Compra {
  return {
    id: r.id,
    slug: r.slug,
    precioCentimos: u(r.precioCentimos),
    moneda: r.moneda,
    pais: u(r.pais),
    ciudad: u(r.ciudad),
    lat: u(r.lat),
    lng: u(r.lng),
    addedAt: r.addedAt,
    updatedAt: r.updatedAt,
  }
}

export function compraToRow(c: Compra): CompraRow {
  return {
    id: c.id,
    slug: c.slug,
    precioCentimos: n(c.precioCentimos),
    moneda: c.moneda,
    pais: n(c.pais),
    ciudad: n(c.ciudad),
    lat: n(c.lat),
    lng: n(c.lng),
    addedAt: c.addedAt,
    updatedAt: c.updatedAt,
  }
}

export function rowToSettings(r: SettingsRow): Settings {
  return {
    id: 'app',
    theme: r.theme,
    lastBackup: r.lastBackup,
    schemaVersion: r.schemaVersion ?? SCHEMA_VERSION,
    moneda: r.moneda,
    nextcloudUrl: u(r.nextcloudUrl),
    nextcloudUser: u(r.nextcloudUser),
    nextcloudPassword: u(r.nextcloudPassword),
    nextcloudFolder: u(r.nextcloudFolder),
    autoBackup: u(r.autoBackup),
    lastAutoBackupAt: u(r.lastAutoBackupAt),
  }
}

export function settingsToRow(s: Settings): SettingsRow {
  return {
    id: 'app',
    theme: s.theme,
    lastBackup: s.lastBackup,
    schemaVersion: s.schemaVersion ?? SCHEMA_VERSION,
    moneda: s.moneda,
    nextcloudUrl: n(s.nextcloudUrl),
    nextcloudUser: n(s.nextcloudUser),
    nextcloudPassword: n(s.nextcloudPassword),
    nextcloudFolder: n(s.nextcloudFolder),
    autoBackup: n(s.autoBackup),
    lastAutoBackupAt: n(s.lastAutoBackupAt),
  }
}
