// Estadísticas: funciones puras sobre lo que ya está cargado (probadas + compras + catálogo).
// Sin base de datos de por medio, así que `verify/library.ts` las comprueba con datos
// inventados sin montar nada.
import { CATALOGO, GAMAS, lataPorSlug, type Gama } from './catalogo'
import { lugarClave } from './latas'
import type { Compra, Probada } from '../types'

export interface ResumenGama {
  gama: Gama
  probadas: number
  total: number
}

export interface Puesto {
  slug: string
  valoracion: number
}

export interface ResumenMoneda {
  moneda: string
  compras: number
  /** Solo compras con precio: una compra sin precio no cuenta para la media. */
  conPrecio: number
  totalCentimos: number
  mediaCentimos?: number
  masCara?: { slug: string; centimos: number }
  masBarata?: { slug: string; centimos: number }
}

export interface Estadisticas {
  probadas: number
  total: number
  porGama: ResumenGama[]
  valoradas: number
  mediaValoracion?: number
  /** De mayor a menor; a igual nota, por orden del catálogo, para que no baile al repintar. */
  ranking: Puesto[]
  compras: number
  porMoneda: ResumenMoneda[]
  /** Países con compras, de más a menos compras. */
  porPais: { pais: string; compras: number }[]
  lugares: number
}

const ORDEN = new Map(CATALOGO.map((l, i) => [l.slug, i]))

export function calcularEstadisticas(probadas: Probada[], compras: Compra[]): Estadisticas {
  // Solo cuentan las latas del catálogo: una fila de una lata que esta versión no conoce
  // (venida de una copia más nueva) no debe dar un «46 de 45».
  const conocidas = probadas.filter((p) => lataPorSlug(p.slug))
  const probadasSet = new Set(conocidas.map((p) => p.slug))

  const porGama = GAMAS.map((gama) => {
    const delaGama = CATALOGO.filter((l) => l.gama === gama)
    return { gama, total: delaGama.length, probadas: delaGama.filter((l) => probadasSet.has(l.slug)).length }
  })

  const valoradas = conocidas.filter((p): p is Probada & { valoracion: number } => p.valoracion !== undefined)
  const ranking = valoradas
    .map((p) => ({ slug: p.slug, valoracion: p.valoracion }))
    .sort((a, b) => b.valoracion - a.valoracion || (ORDEN.get(a.slug) ?? 0) - (ORDEN.get(b.slug) ?? 0))
  const mediaValoracion = valoradas.length
    ? Math.round((valoradas.reduce((s, p) => s + p.valoracion, 0) / valoradas.length) * 10) / 10
    : undefined

  const monedas = new Map<string, ResumenMoneda>()
  for (const c of compras) {
    const r = monedas.get(c.moneda) ?? { moneda: c.moneda, compras: 0, conPrecio: 0, totalCentimos: 0 }
    r.compras++
    if (c.precioCentimos !== undefined) {
      r.conPrecio++
      r.totalCentimos += c.precioCentimos
      if (!r.masCara || c.precioCentimos > r.masCara.centimos) r.masCara = { slug: c.slug, centimos: c.precioCentimos }
      if (!r.masBarata || c.precioCentimos < r.masBarata.centimos) r.masBarata = { slug: c.slug, centimos: c.precioCentimos }
    }
    monedas.set(c.moneda, r)
  }
  for (const r of monedas.values()) {
    if (r.conPrecio) r.mediaCentimos = Math.round(r.totalCentimos / r.conPrecio)
  }

  const paises = new Map<string, { pais: string; compras: number }>()
  for (const c of compras) {
    const pais = c.pais?.trim()
    if (!pais) continue
    const clave = pais.toLowerCase()
    const r = paises.get(clave) ?? { pais, compras: 0 }
    r.compras++
    paises.set(clave, r)
  }

  return {
    probadas: probadasSet.size,
    total: CATALOGO.length,
    porGama,
    valoradas: valoradas.length,
    mediaValoracion,
    ranking,
    compras: compras.length,
    porMoneda: [...monedas.values()].sort((a, b) => b.compras - a.compras),
    porPais: [...paises.values()].sort((a, b) => b.compras - a.compras || a.pais.localeCompare(b.pais)),
    lugares: new Set(compras.map(lugarClave).filter(Boolean)).size,
  }
}
