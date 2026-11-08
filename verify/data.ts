/**
 * Ida y vuelta de la copia de seguridad con el código real (`backupCore.ts`) contra un
 * SQLite de escritorio: exportar → importar en una base limpia → comparar campo a campo.
 */
import { freshDb, freshDbAsCurrent, check, eq, finish } from './harness'
import { exportAll, importAll, readSettings, writeSettings, DEFAULT_SETTINGS } from '../src/lib/backupCore'
import { marcarProbada, valorar, guardarNota, nuevaCompra } from '../src/lib/latas'
import { SCHEMA_VERSION } from '../src/lib/version'
import type { BackupFile } from '../src/types'

async function main() {
  console.log('\n=== 1. Exportar e importar conserva todo ===')
  const origen = await freshDbAsCurrent()
  await marcarProbada('original_500ml', 1000)
  await valorar('juiced_mango_loco_500ml', 9, 2000)
  await guardarNota('juiced_mango_loco_500ml', '  La mejor  ', 2500)
  await valorar('ultra_white_500ml', 10, 3000)
  await nuevaCompra({ slug: 'juiced_mango_loco_500ml', precio: '1,99', moneda: 'eur', pais: 'España', ciudad: 'Bilbao' }, 4000)
  await nuevaCompra({ slug: 'zero_sugar_japon_355ml', precio: '150', moneda: 'JPY', pais: 'Japón', ciudad: '' }, 5000)
  await nuevaCompra({ slug: 'original_500ml', precio: '', moneda: 'EUR', pais: '', ciudad: 'Donostia' }, 6000)
  await writeSettings(origen, { ...DEFAULT_SETTINGS, moneda: 'EUR', nextcloudUrl: 'http://nube', nextcloudUser: 'luken', nextcloudPassword: 'secreta', autoBackup: true })

  const copia = await exportAll(origen)
  eq('formato de la app', copia.app, 'ludok-monster')
  eq('versión del formato', copia.schemaVersion, SCHEMA_VERSION)
  eq('3 latas probadas', copia.probadas.length, 3)
  eq('3 compras', copia.compras.length, 3)
  check('la contraseña de Nextcloud NO viaja en la copia', !JSON.stringify(copia).includes('secreta'))
  check('sin ningún null en el fichero', !JSON.stringify(copia).includes('null'))

  const destino = await freshDb()
  await writeSettings(destino, { ...DEFAULT_SETTINGS, nextcloudPassword: 'la-de-este-movil' })
  const res = await importAll(destino, JSON.stringify(copia))
  eq('importadas 3 probadas', res.probadas, 3)
  eq('importadas 3 compras', res.compras, 3)
  eq('ninguna lata desconocida', res.desconocidas, 0)

  const vuelta = await exportAll(destino)
  const ordenar = <T extends { slug: string }>(xs: T[]) => [...xs].sort((a, b) => a.slug.localeCompare(b.slug))
  eq('probadas idénticas tras la vuelta', JSON.stringify(ordenar(vuelta.probadas)), JSON.stringify(ordenar(copia.probadas)))
  const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id))
  eq('compras idénticas tras la vuelta', JSON.stringify(porId(vuelta.compras)), JSON.stringify(porId(copia.compras)))
  const ajustes = await readSettings(destino)
  eq('la contraseña de este móvil se conserva', ajustes.nextcloudPassword, 'la-de-este-movil')
  eq('el servidor sí se restaura', ajustes.nextcloudUrl, 'http://nube')

  const mango = vuelta.probadas.find((p) => p.slug === 'juiced_mango_loco_500ml')
  eq('valoración', mango?.valoracion, 9)
  eq('nota sin espacios sobrantes', mango?.nota, 'La mejor')
  const yen = vuelta.compras.find((c) => c.moneda === 'JPY')
  eq('150 ¥ se guardan como 15000', yen?.precioCentimos, 15000)
  const sinPrecio = vuelta.compras.find((c) => c.ciudad === 'Donostia')
  check('una compra sin precio vuelve sin precio, no a 0', sinPrecio !== undefined && sinPrecio.precioCentimos === undefined)

  console.log('\n=== 2. Importar REEMPLAZA, no mezcla ===')
  const vacia: BackupFile = { ...copia, probadas: [], compras: [] }
  await importAll(destino, JSON.stringify(vacia))
  const tras = await exportAll(destino)
  eq('sin probadas', tras.probadas.length, 0)
  eq('sin compras', tras.compras.length, 0)

  console.log('\n=== 3. Lo que hay que rechazar, se rechaza sin tocar nada ===')
  await importAll(destino, JSON.stringify(copia))
  const rechaza = async (label: string, raw: string) => {
    let fallo = false
    try {
      await importAll(destino, raw)
    } catch {
      fallo = true
    }
    check(label, fallo)
  }
  await rechaza('JSON roto', '{no es json')
  await rechaza('copia de otra app', JSON.stringify({ ...copia, app: 'ludok-wallet' }))
  await rechaza('copia de una versión más nueva', JSON.stringify({ ...copia, schemaVersion: SCHEMA_VERSION + 1 }))
  eq('tras los rechazos los datos siguen intactos', (await exportAll(destino)).probadas.length, 3)

  console.log('\n=== 4. Latas que esta versión no conoce: se guardan, no se pierden ===')
  const futura = { ...copia, probadas: [...copia.probadas, { slug: 'monster_del_futuro_500ml', probadaAt: 1, updatedAt: 1 }] }
  const r4 = await importAll(destino, JSON.stringify(futura))
  eq('avisa de 1 desconocida', r4.desconocidas, 1)
  eq('y la conserva para la próxima copia', (await exportAll(destino)).probadas.length, 4)

  console.log('\n=== 5. Volumen: todo el catálogo con varias compras cada una ===')
  const grande = await freshDbAsCurrent()
  const { CATALOGO } = await import('../src/lib/catalogo')
  for (const [i, lata] of CATALOGO.entries()) {
    await valorar(lata.slug, (i % 10) + 1, i)
    for (let k = 0; k < 4; k++) {
      await nuevaCompra({ slug: lata.slug, precio: `${k + 1},${String(i).padStart(2, '0')}`, moneda: 'EUR', pais: 'España', ciudad: `Ciudad ${k}` }, i * 10 + k)
    }
  }
  const copiaGrande = await exportAll(grande)
  const destinoGrande = await freshDb()
  await importAll(destinoGrande, JSON.stringify(copiaGrande))
  const vueltaGrande = await exportAll(destinoGrande)
  eq('todas probadas', vueltaGrande.probadas.length, CATALOGO.length)
  eq('4 compras por cada una', vueltaGrande.compras.length, CATALOGO.length * 4)
  const suma = (b: BackupFile) => b.compras.reduce((s, c) => s + (c.precioCentimos ?? 0), 0)
  eq('el gasto total coincide al céntimo', suma(vueltaGrande), suma(copiaGrande))

  finish('copia de seguridad')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
