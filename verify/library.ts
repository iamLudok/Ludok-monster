/**
 * Las reglas del dominio, una a una, con el código real contra un SQLite de escritorio.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { eq as igual } from 'drizzle-orm'
import { freshDbAsCurrent, check, eq, finish } from './harness'
import { CATALOGO, MEDIDAS, GAMAS, lataPorSlug } from '../src/lib/catalogo'
import { parsePrecio, formatPrecio, precioParaEditar, normalizaMoneda } from '../src/lib/precio'
import { marcarProbada, desmarcarProbada, valorar, guardarNota, nuevaCompra, editarCompra, borrarCompra, guardarCoordenadas, lugarClave, marcarTodas } from '../src/lib/latas'
import { exportAll } from '../src/lib/backupCore'
import { compras as comprasTable } from '../src/lib/schema'
import { calcularEstadisticas } from '../src/lib/estadisticas'
import { disponerTorre, PASO_MM } from '../src/lib/torre'

async function lanza(label: string, fn: () => unknown) {
  let fallo = false
  try {
    await fn()
  } catch {
    fallo = true
  }
  check(label, fallo)
}

async function main() {
  console.log('\n=== Catálogo ===')
  const latas = CATALOGO.filter((l) => !l.modelo)
  const botellas = CATALOGO.filter((l) => l.modelo)
  eq('47 latas', latas.length, 47)
  eq('2 latas a los lados de la base', latas.filter((l) => l.lateral).length, 2)
  eq('2 botellas', botellas.length, 2)
  eq('sin slugs repetidos', new Set(CATALOGO.map((l) => l.slug)).size, CATALOGO.length)
  check('cada lata tiene medidas para su formato', latas.every((l) => MEDIDAS[l.ml] !== undefined))
  check('cada botella trae sus propias medidas', botellas.every((l) => l.alto !== undefined && l.diametro !== undefined))
  check('el slug de cada lata acaba en su volumen', latas.every((l) => l.slug.endsWith(`_${l.ml}ml`)))
  check('cada lata está en una gama conocida', CATALOGO.every((l) => GAMAS.includes(l.gama)))
  check('las anillas que no son de aluminio dicen su color', CATALOGO.every((l) => l.anilla === 'aro_plateado' || l.colorAnilla !== undefined))
  const publico = join(__dirname, '..', 'public')
  const faltanBotellas = botellas.map((l) => `modelos/${l.modelo}.glb`).filter((f) => !existsSync(join(publico, f)))
  check('existe el modelo de cada botella', faltanBotellas.length === 0, faltanBotellas.join(', '))
  const faltan = latas.flatMap((l) => [`etiquetas/${l.slug}.jpg`, `etiquetas/${l.slug}_hd.jpg`, `etiquetas/${l.slug}_torre.jpg`, `modelos/lata_${l.anilla}.glb`]).filter((f) => !existsSync(join(publico, f)))
  check('existen la etiqueta, la HD y el modelo de cada lata', faltan.length === 0, faltan.slice(0, 3).join(', '))
  const emblemas = latas.filter((l) => l.anilla === 'logo_negra').map((l) => `modelos/emblema_${l.colorAnilla}.png`)
  check('existe el emblema de cada anilla con logo', emblemas.every((f) => existsSync(join(publico, f))))

  console.log('\n=== Precios ===')
  eq('«1,99» → 199', parsePrecio('1,99'), 199)
  eq('«1.99» → 199', parsePrecio('1.99'), 199)
  eq('«2» → 200', parsePrecio('2'), 200)
  eq('«1,5» → 150 (no 105)', parsePrecio('1,5'), 150)
  eq('« 2,30 € » → 230', parsePrecio(' 2,30 € '), 230)
  eq('vacío → sin precio', parsePrecio('   '), undefined)
  await lanza('«abc» se rechaza', () => parsePrecio('abc'))
  await lanza('«1,999» se rechaza', () => parsePrecio('1,999'))
  await lanza('negativo se rechaza', () => parsePrecio('-1'))
  eq('formato euros', formatPrecio(199, 'EUR'), '1,99 €')
  eq('formato yenes sin decimales', formatPrecio(15000, 'JPY'), '150 ¥')
  eq('formato con céntimos de un dígito', formatPrecio(205, 'EUR'), '2,05 €')
  eq('para editar', precioParaEditar(205, 'EUR'), '2,05')
  eq('para editar en yenes', precioParaEditar(15000, 'JPY'), '150')
  eq('moneda en mayúsculas', normalizaMoneda(' usd '), 'USD')
  await lanza('moneda inválida se rechaza', () => normalizaMoneda('euros'))

  console.log('\n=== Probadas y valoraciones ===')
  const db = await freshDbAsCurrent()
  await marcarProbada('original_500ml', 100)
  await marcarProbada('original_500ml', 999)
  let copia = await exportAll(db)
  eq('marcar dos veces no duplica', copia.probadas.length, 1)
  eq('y conserva la primera fecha', copia.probadas[0]?.probadaAt, 100)
  await lanza('una lata que no existe se rechaza', () => marcarProbada('no_existe_500ml'))
  await valorar('juiced_khaotic_500ml', 8, 200)
  copia = await exportAll(db)
  check('valorar marca como probada', copia.probadas.some((p) => p.slug === 'juiced_khaotic_500ml' && p.valoracion === 8))
  await lanza('valoración 0 se rechaza', () => valorar('juiced_khaotic_500ml', 0))
  await lanza('valoración 11 se rechaza', () => valorar('juiced_khaotic_500ml', 11))
  await lanza('valoración 7,5 se rechaza', () => valorar('juiced_khaotic_500ml', 7.5))
  await valorar('original_500ml', 6, 300)
  copia = await exportAll(db)
  eq('valorar una ya probada conserva su fecha', copia.probadas.find((p) => p.slug === 'original_500ml')?.probadaAt, 100)
  await valorar('original_500ml', undefined, 400)
  copia = await exportAll(db)
  const original = copia.probadas.find((p) => p.slug === 'original_500ml')
  check('quitar la valoración la deja probada sin nota', original !== undefined && original.valoracion === undefined)
  await guardarNota('ultra_red_500ml', '   ')
  copia = await exportAll(db)
  check('una nota vacía NO marca como probada', !copia.probadas.some((p) => p.slug === 'ultra_red_500ml'))
  await guardarNota('ultra_red_500ml', 'Muy ácida')
  copia = await exportAll(db)
  check('una nota con texto sí la marca', copia.probadas.some((p) => p.slug === 'ultra_red_500ml' && p.nota === 'Muy ácida'))

  console.log('\n=== Compras ===')
  const id = await nuevaCompra({ slug: 'original_500ml', precio: '1,50', moneda: 'EUR', pais: 'España', ciudad: 'Bilbao' })
  await nuevaCompra({ slug: 'juiced_khaotic_500ml', precio: '2', moneda: 'EUR', pais: 'españa ', ciudad: ' bilbao' })
  await lanza('una compra sin nada se rechaza', () => nuevaCompra({ slug: 'original_500ml', precio: '', moneda: 'EUR', pais: ' ', ciudad: '' }))
  await lanza('una compra de una lata que no existe se rechaza', () => nuevaCompra({ slug: 'x_500ml', precio: '1', moneda: 'EUR', pais: '', ciudad: '' }))
  eq('«Bilbao, España» y «bilbao, españa» son el mismo lugar', lugarClave({ ciudad: 'Bilbao', pais: 'España' }), lugarClave({ ciudad: ' bilbao', pais: 'españa ' }))
  eq('sin ciudad ni país no hay lugar', lugarClave({}), undefined)
  eq('las coordenadas se guardan en las 2 compras del lugar', await guardarCoordenadas('bilbao|españa', 43.26, -2.93), 2)
  await editarCompra(id, { slug: 'ignorado_500ml', precio: '1,60', moneda: 'EUR', pais: 'España', ciudad: 'Bilbao' })
  let fila = (await db.select().from(comprasTable).where(igual(comprasTable.id, id)))[0]
  check('editar el precio sin cambiar de sitio conserva las coordenadas', fila?.lat === 43.26 && fila?.precioCentimos === 160)
  eq('editar no cambia la lata de la compra', fila?.slug, 'original_500ml')
  await editarCompra(id, { slug: 'original_500ml', precio: '1,60', moneda: 'EUR', pais: 'Francia', ciudad: 'París' })
  fila = (await db.select().from(comprasTable).where(igual(comprasTable.id, id)))[0]
  check('cambiar de sitio borra las coordenadas viejas', fila?.lat === null && fila?.lng === null)
  await desmarcarProbada('original_500ml')
  copia = await exportAll(db)
  check('desmarcar quita la lata de probadas…', !copia.probadas.some((p) => p.slug === 'original_500ml'))
  check('…pero NO borra sus compras', copia.compras.some((c) => c.slug === 'original_500ml'))
  await borrarCompra(id)
  eq('borrar una compra', (await exportAll(db)).compras.length, 1)

  console.log('\n=== Marcar todas ===')
  await valorar('mule_500ml', 7, 50)
  const antes = (await exportAll(db)).probadas.length
  const marcadas = await marcarTodas(9999)
  copia = await exportAll(db)
  eq('todo el catálogo queda probado', copia.probadas.length, CATALOGO.length)
  eq('solo marca las que faltaban', marcadas, CATALOGO.length - antes)
  check('las ya probadas conservan su nota y su fecha', copia.probadas.some((p) => p.slug === 'mule_500ml' && p.valoracion === 7 && p.probadaAt === 50))
  eq('repetirlo no marca ninguna más', await marcarTodas(), 0)

  console.log('\n=== Estadísticas ===')
  const est = calcularEstadisticas(
    [
      { slug: 'juiced_mango_loco_500ml', probadaAt: 1, valoracion: 9, updatedAt: 1 },
      { slug: 'juiced_khaotic_500ml', probadaAt: 1, valoracion: 6, updatedAt: 1 },
      { slug: 'ultra_white_500ml', probadaAt: 1, updatedAt: 1 },
      { slug: 'lata_del_futuro_500ml', probadaAt: 1, valoracion: 10, updatedAt: 1 },
    ],
    [
      { id: 'a', slug: 'juiced_mango_loco_500ml', precioCentimos: 199, moneda: 'EUR', pais: 'España', addedAt: 1, updatedAt: 1 },
      { id: 'b', slug: 'juiced_khaotic_500ml', precioCentimos: 250, moneda: 'EUR', pais: 'españa', addedAt: 1, updatedAt: 1 },
      { id: 'c', slug: 'ultra_white_500ml', moneda: 'EUR', ciudad: 'Bilbao', addedAt: 1, updatedAt: 1 },
      { id: 'd', slug: 'zero_sugar_japon_355ml', precioCentimos: 15000, moneda: 'JPY', pais: 'Japón', addedAt: 1, updatedAt: 1 },
    ],
  )
  eq('3 probadas (la desconocida no cuenta)', est.probadas, 3)
  eq('de 49 (47 latas y 2 botellas)', est.total, 49)
  const juiced = est.porGama.find((g) => g.gama === 'Juiced')
  check('Juiced: 2 de 8', juiced?.probadas === 2 && juiced?.total === 8)
  eq('las gamas suman el catálogo entero', est.porGama.reduce((s, g) => s + g.total, 0), CATALOGO.length)
  eq('media de valoración (9 y 6)', est.mediaValoracion, 7.5)
  eq('ranking: primero la de 9', est.ranking[0]?.slug, 'juiced_mango_loco_500ml')
  const eur = est.porMoneda.find((m) => m.moneda === 'EUR')
  check('EUR: 3 compras, 2 con precio, total 4,49', eur?.compras === 3 && eur?.conPrecio === 2 && eur?.totalCentimos === 449)
  eq('media EUR solo con las que tienen precio', eur?.mediaCentimos, 225)
  eq('la más cara en EUR', eur?.masCara?.slug, 'juiced_khaotic_500ml')
  check('los yenes no se mezclan con los euros', est.porMoneda.find((m) => m.moneda === 'JPY')?.totalCentimos === 15000)
  check('«España» y «españa» cuentan como un país', est.porPais[0]?.compras === 2 && est.porPais.length === 2)
  eq('3 lugares distintos', est.lugares, 3)
  const vacia = calcularEstadisticas([], [])
  check('sin datos: media indefinida y 0 probadas', vacia.mediaValoracion === undefined && vacia.probadas === 0)

  console.log('\n=== Torre ===')
  const completa = disponerTorre(CATALOGO.map((l) => l.slug))
  eq('las 49 en la torre', completa.length, 49)
  const porPiso = (h: ReturnType<typeof disponerTorre>) => {
    const sinBotellas = h.filter((x) => !lataPorSlug(x.slug)?.modelo && !lataPorSlug(x.slug)?.lateral)
    return [...new Set(sinBotellas.map((x) => x.piso))].map((p) => sinBotellas.filter((x) => x.piso === p).length)
  }
  eq('pisos de 9 a 1', porPiso(completa).join(','), '9,8,7,6,5,4,3,2,1')
  const grande = completa.find((h) => h.slug === '0_botella_grande')
  const m3 = completa.find((h) => h.slug === '0_monster_cubico')
  const bordeBase = 4 * PASO_MM + 33
  check('botella grande en el suelo, a la izquierda y fuera de la base', grande?.y === 0 && (grande?.x ?? 0) < -bordeBase - 33)
  check('M3 en el suelo, a la derecha y fuera de la base', m3?.y === 0 && (m3?.x ?? 0) > bordeBase + 27)
  eq('una botella sola va en el centro', disponerTorre(['0_monster_cubico'])[0]?.x, 0)
  const gold = completa.find((h) => h.slug === 'lando_norris_gold_500ml')
  const voodoo = completa.find((h) => h.slug === 'juiced_voodoo_grape_473ml')
  check('Lando Gold pegada a la base por la izquierda', gold?.y === 0 && Math.abs((gold?.x ?? 0) + bordeBase + 2 + 33) < 1e-6)
  check('Voodoo Grape pegada a la base por la derecha', voodoo?.y === 0 && Math.abs((voodoo?.x ?? 0) - bordeBase - 2 - 33) < 1e-6)
  check('las botellas quedan más afuera que las latas laterales', (grande?.x ?? 0) < (gold?.x ?? 0) && (m3?.x ?? 0) > (voodoo?.x ?? 0))
  eq('arriba la Original', completa.find((h) => h.piso === 9)?.slug, 'original_500ml')
  check('cada piso centrado en x=0', [1, 2, 3, 9].every((p) => Math.abs(completa.filter((h) => h.piso === p && !lataPorSlug(h.slug)?.modelo && !lataPorSlug(h.slug)?.lateral).reduce((s, h) => s + h.x, 0)) < 1e-6))
  eq('separación entre latas', Math.abs((completa[1]?.x ?? 0) - (completa[0]?.x ?? 0)), PASO_MM)
  check('cada piso más alto que el anterior', [...Array(8)].every((_, i) => completa.find((h) => h.piso === i + 2)!.y > completa.find((h) => h.piso === i + 1)!.y))
  eq('10 latas: pirámide de 4 pisos', porPiso(disponerTorre(CATALOGO.slice(0, 10).map((l) => l.slug))).join(','), '4,3,2,1')
  eq('12 latas: base de 5, último piso a medias', porPiso(disponerTorre(CATALOGO.slice(0, 12).map((l) => l.slug))).join(','), '5,4,3')
  eq('una sola lata', disponerTorre(['mule_500ml']).length, 1)
  eq('ninguna lata', disponerTorre([]).length, 0)
  eq('ignora slugs desconocidos', disponerTorre(['no_existe_500ml', 'mule_500ml']).length, 1)
  check('la torre sigue el orden del catálogo', disponerTorre(['original_500ml', 'ultra_white_500ml'])[0]?.slug === 'ultra_white_500ml')
  check('una lata del catálogo se encuentra por slug', lataPorSlug('mule_500ml')?.nombre === 'Mule')

  finish('reglas')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
