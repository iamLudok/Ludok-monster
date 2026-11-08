// Disposición de la torre: qué lata va en qué piso y en qué posición. Puro: el visor 3D solo
// coloca lo que esto le diga, y `verify/library.ts` comprueba las reglas sin pintar nada.
import { CATALOGO, MEDIDAS } from './catalogo'

/** Diámetro máximo (66 mm) + 2 mm de holgura, como en la torre del proyecto Monster. */
export const PASO_MM = 68
/** El aro de la base apoya sobre el reborde superior de las de abajo. */
const APOYO_MM = 0.1

export interface Hueco {
  slug: string
  /** Piso empezando en 1 (abajo). */
  piso: number
  /** Centro de la lata, en mm, con el 0 en el centro de la torre. */
  x: number
  /** Altura de la base de la lata, en mm. */
  y: number
}

/**
 * Pirámide con las latas dadas, en el orden del catálogo (el de la torre de Blender: Ultra
 * abajo, formatos pequeños y la Original arriba).
 *
 * Con N latas se usa la pirámide más pequeña en la que caben: base de k latas con
 * k·(k+1)/2 ≥ N, y se llena de abajo arriba. Así la torre «crece» según se prueban latas: con
 * las 45 sale la pirámide entera de 9 pisos, y con menos queda una pirámide más baja, con el
 * último piso a medias pero centrado.
 */
export function disponerTorre(slugs: Iterable<string>): Hueco[] {
  const elegidas = new Set(slugs)
  const latas = CATALOGO.filter((l) => elegidas.has(l.slug) && !l.modelo && !l.lateral)
  // A los lados: primero las latas añadidas después (pegadas a la base) y más afuera las
  // botellas, alternando izquierda y derecha.
  const botellas = [...CATALOGO.filter((l) => elegidas.has(l.slug) && l.lateral), ...CATALOGO.filter((l) => elegidas.has(l.slug) && l.modelo)]
  const huecos = piramide(latas)
  // Las botellas no apilan: van en el suelo, a los lados de la base y alternando izquierda y
  // derecha, como en la torre de Blender (la grande a la izquierda, la M3 a la derecha).
  const anchoBase = huecos.filter((h) => h.piso === 1).length
  const borde = anchoBase ? ((anchoBase - 1) / 2) * PASO_MM + 33 : 0
  const ocupado = [borde, borde]
  botellas.forEach((b, i) => {
    const lado = i % 2 === 0 ? 0 : 1
    const radio = (b.diametro ?? MEDIDAS[b.ml].diametro) / 2
    // Sin latas y con una sola botella, va en el centro.
    // Holgura con la pieza de dentro: 2 mm entre latas (como en la pirámide) y 30 antes de una botella.
    const holgura = b.modelo ? 30 : 2
    const x = !anchoBase && botellas.length === 1 ? 0 : ocupado[lado] + holgura + radio
    ocupado[lado] = x + radio
    huecos.push({ slug: b.slug, piso: 1, x: lado === 0 ? -x : x, y: 0 })
  })
  return huecos
}

function piramide(latas: typeof CATALOGO): Hueco[] {
  if (!latas.length) return []

  let base = 1
  while ((base * (base + 1)) / 2 < latas.length) base++

  const huecos: Hueco[] = []
  let i = 0
  let y = 0
  for (let ancho = base; ancho >= 1 && i < latas.length; ancho--) {
    const piso = latas.slice(i, i + ancho)
    piso.forEach((lata, j) => {
      huecos.push({ slug: lata.slug, piso: base - ancho + 1, x: (j - (piso.length - 1) / 2) * PASO_MM, y })
    })
    i += piso.length
    y += Math.max(...piso.map((l) => MEDIDAS[l.ml].alto)) - APOYO_MM
  }
  return huecos
}
