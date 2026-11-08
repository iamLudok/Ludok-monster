/**
 * Que crear el esquema es idempotente y que las columnas que lee la app existen.
 *
 * Con MIGRATIONS vacío (el esquema nace en v1) es fino de momento, pero es la red de
 * seguridad que hace falta tener puesta ANTES del primer paso real de migración, como en las
 * demás apps Ludok: el día que se añada uno, aquí va el caso «base vieja → base nueva».
 */
import { createClient } from '@libsql/client'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { CREATE_SQL, MIGRATIONS, DB_VERSION } from '../src/lib/schemaSql'
import { check, eq, finish } from './harness'

async function main() {
  const path = join(tmpdir(), `ludok-monster-migration-${process.pid}.db`)
  rmSync(path, { force: true })
  const client = createClient({ url: `file:${path}` })

  console.log('\n=== 1. Crear el esquema en una base nueva ===')
  await client.executeMultiple(CREATE_SQL)
  await client.execute('INSERT INTO probadas (slug, probadaAt, updatedAt) VALUES (?, ?, ?)', ['original_500ml', 1, 1])
  await client.execute('INSERT INTO compras (id, slug, addedAt, updatedAt) VALUES (?, ?, ?, ?)', ['c1', 'original_500ml', 1, 1])
  const moneda = await client.execute('SELECT moneda FROM compras')
  eq('una compra sin moneda toma EUR por defecto', String(moneda.rows[0]?.moneda), 'EUR')

  console.log('\n=== 2. Re-ejecutar CREATE_SQL no destruye datos (IF NOT EXISTS) ===')
  await client.executeMultiple(CREATE_SQL)
  eq('la lata probada sigue ahí', (await client.execute('SELECT * FROM probadas')).rows.length, 1)
  eq('y la compra también', (await client.execute('SELECT * FROM compras')).rows.length, 1)

  console.log('\n=== 3. DB_VERSION coincide con MIGRATIONS.length + 1 ===')
  eq('DB_VERSION', DB_VERSION, MIGRATIONS.length + 1)

  console.log('\n=== 4. user_version se puede fijar y volver a leer ===')
  await client.execute(`PRAGMA user_version = ${DB_VERSION}`)
  const uv = await client.execute('PRAGMA user_version')
  eq('user_version guardado', Number(uv.rows[0]?.user_version ?? -1), DB_VERSION)

  console.log('\n=== 5. Las consultas que usa la app no fallan ===')
  await client.execute('SELECT * FROM compras WHERE slug = ? ORDER BY addedAt', ['original_500ml'])
  await client.execute('SELECT * FROM compras WHERE lat IS NULL')
  check('consultas con el índice de compras', true)

  client.close()
  for (const s of ['', '-wal', '-shm']) rmSync(path + s, { force: true })
  finish('migración')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
