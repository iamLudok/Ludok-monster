// Reglas de lo que hace cada persona con las latas: marcarlas como probadas, valorarlas y
// apuntar dónde y por cuánto las compró. Pide la base a `getDb()`, nunca a `db.ts`, para
// poder ejecutarse en el escritorio desde `verify/library.ts`.
import { eq, isNull } from 'drizzle-orm'
import { getDb } from './dbRef'
import { probadas as probadasTable, compras as comprasTable } from './schema'
import { rowToProbada, probadaToRow, rowToCompra, compraToRow } from './rows'
import { existeLata } from './catalogo'
import { parsePrecio, normalizaMoneda } from './precio'
import { newId } from './ids'
import type { Compra, Probada } from '../types'

function asegurarLata(slug: string): void {
  if (!existeLata(slug)) throw new Error(`No existe la lata «${slug}».`)
}

async function leerProbada(slug: string): Promise<Probada | undefined> {
  const rows = await getDb().select().from(probadasTable).where(eq(probadasTable.slug, slug)).limit(1)
  return rows[0] ? rowToProbada(rows[0]) : undefined
}

async function guardarProbada(p: Probada): Promise<void> {
  const row = probadaToRow(p)
  await getDb().insert(probadasTable).values(row).onConflictDoUpdate({ target: probadasTable.slug, set: row })
}

/** La marca como probada. Si ya lo estaba no cambia nada: conserva su fecha y su valoración. */
export async function marcarProbada(slug: string, ahora = Date.now()): Promise<void> {
  asegurarLata(slug)
  if (await leerProbada(slug)) return
  await guardarProbada({ slug, probadaAt: ahora, updatedAt: ahora })
}

/**
 * Quita la marca de probada, y con ella la valoración y la nota (sin probar no hay nada que
 * valorar). Las compras NO se tocan: comprar una lata y no haberla probado es posible.
 */
export async function desmarcarProbada(slug: string): Promise<void> {
  await getDb().delete(probadasTable).where(eq(probadasTable.slug, slug))
}

/**
 * Valoración de 1 a 10, o `undefined` para quitarla. Valorar una lata la marca como
 * probada: no tiene sentido puntuar algo que no has probado, y obligar a marcarlo antes
 * sería un paso de más.
 */
export async function valorar(slug: string, valoracion: number | undefined, ahora = Date.now()): Promise<void> {
  asegurarLata(slug)
  if (valoracion !== undefined && (!Number.isInteger(valoracion) || valoracion < 1 || valoracion > 10)) {
    throw new Error('La valoración va de 1 a 10.')
  }
  const actual = await leerProbada(slug)
  await guardarProbada({ ...(actual ?? { slug, probadaAt: ahora }), valoracion, updatedAt: ahora })
}

/** Nota libre. Escribirla también marca la lata como probada, por lo mismo que valorar. */
export async function guardarNota(slug: string, nota: string, ahora = Date.now()): Promise<void> {
  asegurarLata(slug)
  const limpia = nota.trim() || undefined
  const actual = await leerProbada(slug)
  if (!actual && !limpia) return
  await guardarProbada({ ...(actual ?? { slug, probadaAt: ahora }), nota: limpia, updatedAt: ahora })
}

export interface DatosCompra {
  slug: string
  /** Tal cual se escribe en el formulario: «1,99». */
  precio: string
  moneda: string
  pais: string
  ciudad: string
}

function validarCompra(datos: DatosCompra): Pick<Compra, 'precioCentimos' | 'moneda' | 'pais' | 'ciudad'> {
  asegurarLata(datos.slug)
  const precioCentimos = parsePrecio(datos.precio)
  const pais = datos.pais.trim() || undefined
  const ciudad = datos.ciudad.trim() || undefined
  if (precioCentimos === undefined && !pais && !ciudad) {
    throw new Error('Apunta al menos el precio o dónde la compraste.')
  }
  return { precioCentimos, moneda: normalizaMoneda(datos.moneda), pais, ciudad }
}

export async function nuevaCompra(datos: DatosCompra, ahora = Date.now()): Promise<string> {
  const compra: Compra = { id: newId(), slug: datos.slug, ...validarCompra(datos), addedAt: ahora, updatedAt: ahora }
  await getDb().insert(comprasTable).values(compraToRow(compra))
  return compra.id
}

export async function editarCompra(id: string, datos: DatosCompra, ahora = Date.now()): Promise<void> {
  const rows = await getDb().select().from(comprasTable).where(eq(comprasTable.id, id)).limit(1)
  if (!rows[0]) throw new Error('Esa compra ya no existe.')
  const antes = rowToCompra(rows[0])
  // La lata de una compra no cambia al editarla: se valida contra la suya, no contra la del formulario.
  const nueva = { ...antes, ...validarCompra({ ...datos, slug: antes.slug }), updatedAt: ahora }
  // Si cambia el sitio, las coordenadas guardadas ya no valen: el mapa la volverá a situar.
  if (lugarClave(antes) !== lugarClave(nueva)) {
    nueva.lat = undefined
    nueva.lng = undefined
  }
  await getDb().update(comprasTable).set(compraToRow(nueva)).where(eq(comprasTable.id, id))
}

export async function borrarCompra(id: string): Promise<void> {
  await getDb().delete(comprasTable).where(eq(comprasTable.id, id))
}

/**
 * Clave de un lugar para agrupar compras en el mapa: «bilbao|españa». Sin mayúsculas ni
 * espacios sobrantes, para que «Bilbao» y «bilbao » sean el mismo sitio. `undefined` si la
 * compra no dice dónde fue.
 */
export function lugarClave(c: Pick<Compra, 'ciudad' | 'pais'>): string | undefined {
  const ciudad = c.ciudad?.trim().toLowerCase() ?? ''
  const pais = c.pais?.trim().toLowerCase() ?? ''
  if (!ciudad && !pais) return undefined
  return `${ciudad}|${pais}`
}

/**
 * Guarda las coordenadas de un lugar en TODAS las compras de ese lugar que aún no las
 * tienen: así se pide a Nominatim una vez por ciudad, no una vez por compra.
 */
export async function guardarCoordenadas(clave: string, lat: number, lng: number): Promise<number> {
  const sinCoordenadas = await getDb().select().from(comprasTable).where(isNull(comprasTable.lat))
  const ids = sinCoordenadas.map(rowToCompra).filter((c) => lugarClave(c) === clave).map((c) => c.id)
  for (const id of ids) {
    await getDb().update(comprasTable).set({ lat, lng }).where(eq(comprasTable.id, id))
  }
  return ids.length
}

/**
 * Marca como probadas todas las latas del catálogo que aún no lo estén. Para quien instala la
 * app con la colección ya hecha: 45 toques uno a uno serían absurdos. Las ya marcadas no se
 * tocan (conservan su fecha y su nota).
 */
export async function marcarTodas(ahora = Date.now()): Promise<number> {
  const { CATALOGO } = await import('./catalogo')
  const ya = new Set((await getDb().select().from(probadasTable)).map((r) => r.slug))
  const nuevas = CATALOGO.filter((l) => !ya.has(l.slug))
  for (const l of nuevas) await guardarProbada({ slug: l.slug, probadaAt: ahora, updatedAt: ahora })
  return nuevas.length
}
