// Lo que el visor 3D necesita de cada lata. Separado del visor porque el visor es un DOM
// Component (corre en un WebView) y solo recibe datos serializables: nada de importar el
// catálogo ni la base de datos desde allí.
import { MEDIDAS, type Lata } from './catalogo'

/** Lo que recibe el visor por cada lata. Solo datos serializables (cruza al WebView). */
export interface LataVisor {
  slug: string
  anilla: 'aro_plateado' | 'aro_negro' | 'negra_lisa' | 'logo_negra'
  tapa: 'aluminio' | 'negra' | 'verde' | 'dorada'
  colorAnilla?: 'negro' | 'naranja' | 'azul' | 'morado'
  alto: number
  diametro: number
  /** Posición en mm (torre). 0,0 para una lata sola. */
  x: number
  y: number
  /** Sin probar: se pinta apagada, en la torre completa. */
  apagada?: boolean
  /** Botellas: GLB propio, ya con forma, tamaño y texturas. */
  modelo?: string
}

export function paraVisor(lata: Lata, x = 0, y = 0, apagada = false): LataVisor {
  const alto = lata.alto ?? MEDIDAS[lata.ml].alto
  const diametro = lata.diametro ?? MEDIDAS[lata.ml].diametro
  return { slug: lata.slug, anilla: lata.anilla, tapa: lata.tapa, colorAnilla: lata.colorAnilla, alto, diametro, x, y, apagada, modelo: lata.modelo }
}
