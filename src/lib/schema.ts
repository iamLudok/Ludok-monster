// Tablas para Drizzle. Solo describe columnas: las tablas e índices se crean con SQL
// explícito (`schemaSql.ts`), con migraciones a mano por PRAGMA user_version.
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import type { Theme } from '../types'

export const probadas = sqliteTable('probadas', {
  slug: text('slug').primaryKey(),
  probadaAt: integer('probadaAt').notNull(),
  valoracion: integer('valoracion'),
  nota: text('nota'),
  updatedAt: integer('updatedAt').notNull(),
})

export const compras = sqliteTable('compras', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  precioCentimos: integer('precioCentimos'),
  moneda: text('moneda').notNull().default('EUR'),
  pais: text('pais'),
  ciudad: text('ciudad'),
  lat: real('lat'),
  lng: real('lng'),
  addedAt: integer('addedAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
})

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  theme: text('theme').$type<Theme>().notNull().default('system'),
  lastBackup: integer('lastBackup').notNull().default(0),
  schemaVersion: integer('schemaVersion').notNull(),
  moneda: text('moneda').notNull().default('EUR'),
  nextcloudUrl: text('nextcloudUrl'),
  nextcloudUser: text('nextcloudUser'),
  nextcloudPassword: text('nextcloudPassword'),
  nextcloudFolder: text('nextcloudFolder'),
  // SQLite no tiene booleano: se guarda 0/1 y Drizzle lo traduce.
  autoBackup: integer('autoBackup', { mode: 'boolean' }),
  lastAutoBackupAt: integer('lastAutoBackupAt'),
})

export type ProbadaRow = typeof probadas.$inferSelect
export type CompraRow = typeof compras.$inferSelect
export type SettingsRow = typeof settings.$inferSelect
