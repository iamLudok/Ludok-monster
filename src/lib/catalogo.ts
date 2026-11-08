// Catálogo fijo: las 47 latas y 2 botellas modeladas en el proyecto Monster (Blender).
//
// No se guarda en la base de datos: viene con la app, igual que sus modelos 3D en
// `public/`. Si algún día se modela una lata nueva, se añade aquí y en `public/` y aparece
// en todas las instalaciones sin migrar nada.
//
// Las medidas son APROXIMADAS por formato (las mismas que usa el generador de Blender),
// no medidas de cada lata. El orden de la lista es el de la torre del proyecto Monster,
// de abajo arriba, y es el que usa la torre de la app.

export type Gama =
  | 'Ultra'
  | 'Juiced'
  | 'Punch'
  | 'Rehab'
  | 'Reserve'
  | 'Clásicas'
  | 'Pilotos'
  | 'Café y té'
  | 'Botellas'

/** Tipo de anilla: decide qué modelo 3D se carga (`public/modelos/lata_<anilla>.glb`). */
export type Anilla = 'aro_plateado' | 'aro_negro' | 'negra_lisa' | 'logo_negra'
export type Tapa = 'aluminio' | 'negra' | 'verde' | 'dorada'
export type ColorAnilla = 'negro' | 'naranja' | 'azul' | 'morado'

export interface Lata {
  slug: string
  nombre: string
  gama: Gama
  ml: number
  sinAzucar: boolean
  tapa: Tapa
  anilla: Anilla
  /** Solo para las anillas que no son de aluminio. */
  colorAnilla?: ColorAnilla
  /**
   * Botellas: no usan la lata compartida sino su propio GLB (`public/modelos/<modelo>.glb`),
   * con su forma y texturas dentro. `anilla` y `tapa` no se usan en ellas. No entran en la
   * pirámide de la torre: van a los lados de la base, como en la torre de Blender.
   */
  modelo?: string
  /** Medidas propias (aprox.), cuando no son las de su formato de lata. */
  alto?: number
  diametro?: number
  /** El volumen no se ve en las fotos: es una estimación. */
  mlEstimado?: boolean
  /**
   * Latas añadidas después de la pirámide de 45: van en el suelo a los lados de la base (más
   * cerca que las botellas), como en la torre de Blender, en vez de deshacer la pirámide.
   */
  lateral?: boolean
}

/** Medidas aproximadas por formato (alto × diámetro, mm). */
export const MEDIDAS: Record<number, { alto: number; diametro: number }> = {
  500: { alto: 168, diametro: 66 },
  473: { alto: 157, diametro: 66 },
  444: { alto: 157, diametro: 65 },
  355: { alto: 156, diametro: 58 },
}

export const GAMAS: Gama[] = ['Ultra', 'Juiced', 'Punch', 'Rehab', 'Reserve', 'Clásicas', 'Pilotos', 'Café y té', 'Botellas']

const plata = { tapa: 'aluminio', anilla: 'aro_plateado' } as const
const negra = { tapa: 'negra', anilla: 'aro_negro', colorAnilla: 'negro' } as const
const logo = { tapa: 'aluminio', anilla: 'logo_negra', colorAnilla: 'negro' } as const

export const CATALOGO: Lata[] = [
  // Piso 1
  { slug: 'ultra_white_500ml', nombre: 'Ultra', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_black_500ml', nombre: 'Ultra Black', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_paradise_500ml', nombre: 'Ultra Paradise', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_watermelon_500ml', nombre: 'Ultra Watermelon', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_red_500ml', nombre: 'Ultra Red', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_violet_500ml', nombre: 'Ultra Violet', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_fiesta_mango_500ml', nombre: 'Ultra Fiesta Mango', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_golden_pineapple_500ml', nombre: 'Ultra Golden Pineapple', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_vice_guava_500ml', nombre: 'Ultra Vice Guava', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  // Piso 2
  { slug: 'ultra_rosa_500ml', nombre: 'Ultra Rosá', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_strawberry_dreams_500ml', nombre: 'Ultra Strawberry Dreams', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'rehab_lemonade_500ml', nombre: 'Rehab Lemonade', gama: 'Rehab', ml: 500, sinAzucar: false, ...negra },
  { slug: 'rehab_peach_500ml', nombre: 'Rehab Peach', gama: 'Rehab', ml: 500, sinAzucar: false, ...negra },
  { slug: 'rehab_recover_lemonade_500ml', nombre: 'Rehab Recover Lemonade', gama: 'Rehab', ml: 500, sinAzucar: false, ...negra },
  { slug: 'rehab_recover_peach_500ml', nombre: 'Rehab Recover Peach', gama: 'Rehab', ml: 500, sinAzucar: false, ...negra },
  { slug: 'ultra_peachy_keen_500ml', nombre: 'Ultra Peachy Keen', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  { slug: 'ultra_fantasy_ruby_red_500ml', nombre: 'Ultra Fantasy Ruby Red', gama: 'Ultra', ml: 500, sinAzucar: true, ...plata },
  // Piso 3
  { slug: 'juiced_mango_loco_500ml', nombre: 'Mango Loco', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  { slug: 'juiced_aussie_lemonade_500ml', nombre: 'Aussie Lemonade', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  { slug: 'juiced_bad_apple_500ml', nombre: 'Bad Apple', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  { slug: 'juiced_khaotic_500ml', nombre: 'Khaotic', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  { slug: 'juiced_monarch_500ml', nombre: 'Monarch', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  { slug: 'juiced_ripper_500ml', nombre: 'Ripper', gama: 'Juiced', ml: 500, sinAzucar: false, tapa: 'aluminio', anilla: 'negra_lisa', colorAnilla: 'negro' },
  { slug: 'juiced_viking_berry_500ml', nombre: 'Viking Berry', gama: 'Juiced', ml: 500, sinAzucar: false, ...plata },
  // Piso 4
  { slug: 'punch_pacific_500ml', nombre: 'Pacific Punch', gama: 'Punch', ml: 500, sinAzucar: false, ...plata },
  { slug: 'punch_pipeline_500ml', nombre: 'Pipeline Punch', gama: 'Punch', ml: 500, sinAzucar: false, ...plata },
  { slug: 'reserve_watermelon_500ml', nombre: 'Reserve Watermelon', gama: 'Reserve', ml: 500, sinAzucar: false, ...plata },
  { slug: 'reserve_white_pineapple_500ml', nombre: 'Reserve White Pineapple', gama: 'Reserve', ml: 500, sinAzucar: false, ...plata },
  { slug: 'punch_rio_500ml', nombre: 'Rio Punch', gama: 'Punch', ml: 500, sinAzucar: false, ...plata },
  { slug: 'punch_mixxd_500ml', nombre: 'Mixxd Punch', gama: 'Punch', ml: 500, sinAzucar: false, ...plata },
  // Piso 5
  { slug: 'zero_sugar_azul_500ml', nombre: 'Zero Sugar', gama: 'Clásicas', ml: 500, sinAzucar: true, ...plata },
  { slug: 'nitro_super_dry_500ml', nombre: 'Nitro Super Dry', gama: 'Clásicas', ml: 500, sinAzucar: false, ...negra },
  { slug: 'assault_500ml', nombre: 'Assault', gama: 'Clásicas', ml: 500, sinAzucar: false, ...plata },
  { slug: 'mule_500ml', nombre: 'Mule', gama: 'Clásicas', ml: 500, sinAzucar: false, ...negra },
  { slug: 'original_zero_sugar_500ml', nombre: 'Original Zero Sugar', gama: 'Clásicas', ml: 500, sinAzucar: true, tapa: 'verde', anilla: 'logo_negra', colorAnilla: 'negro' },
  // Piso 6
  { slug: 'lando_norris_500ml', nombre: 'Lando Norris', gama: 'Pilotos', ml: 500, sinAzucar: false, ...negra },
  { slug: 'vr46_500ml', nombre: 'VR46 The Doctor', gama: 'Pilotos', ml: 500, sinAzucar: false, ...negra },
  { slug: 'vr46_zero_sugar_500ml', nombre: 'VR46 Zero Sugar', gama: 'Pilotos', ml: 500, sinAzucar: true, ...negra },
  { slug: 'lewis_hamilton_500ml', nombre: 'Lewis Hamilton', gama: 'Pilotos', ml: 500, sinAzucar: false, ...plata },
  // Piso 7
  { slug: 'dragon_peach_473ml', nombre: 'Dragon Ice Tea Peach', gama: 'Café y té', ml: 473, sinAzucar: false, tapa: 'aluminio', anilla: 'aro_negro', colorAnilla: 'naranja' },
  { slug: 'java_salted_caramel_444ml', nombre: 'Java Salted Caramel', gama: 'Café y té', ml: 444, sinAzucar: false, tapa: 'dorada', anilla: 'logo_negra', colorAnilla: 'negro' },
  { slug: 'ultra_blue_hawaiian_473ml', nombre: 'Ultra Blue Hawaiian', gama: 'Ultra', ml: 473, sinAzucar: true, ...logo },
  // Piso 8
  { slug: 'ultra_fantasy_ruby_red_japon_355ml', nombre: 'Ultra Fantasy Ruby Red (Japón)', gama: 'Ultra', ml: 355, sinAzucar: true, ...logo },
  { slug: 'zero_sugar_japon_355ml', nombre: 'Zero Sugar (Japón)', gama: 'Clásicas', ml: 355, sinAzucar: true, tapa: 'aluminio', anilla: 'logo_negra', colorAnilla: 'azul' },
  // Piso 9
  { slug: 'original_500ml', nombre: 'Original', gama: 'Clásicas', ml: 500, sinAzucar: false, tapa: 'aluminio', anilla: 'negra_lisa', colorAnilla: 'negro' },
  // Añadidas después: a los lados de la base, pegadas a ella
  { slug: 'lando_norris_gold_500ml', nombre: 'Lando Norris Gold', gama: 'Pilotos', ml: 500, sinAzucar: true, ...negra, lateral: true },
  { slug: 'juiced_voodoo_grape_473ml', nombre: 'Voodoo Grape', gama: 'Juiced', ml: 473, sinAzucar: false, tapa: 'aluminio', anilla: 'logo_negra', colorAnilla: 'morado', lateral: true },
  // Botellas, a los lados de la base (medidas aproximadas, del proyecto Monster)
  { slug: '0_botella_grande', nombre: 'Monster Energy (botella, Japón)', gama: 'Botellas', ml: 500, mlEstimado: true, sinAzucar: false, ...plata, modelo: 'botella_0_botella_grande', alto: 203, diametro: 67 },
  { slug: '0_monster_cubico', nombre: 'M3 Extra Strength (Japón)', gama: 'Botellas', ml: 150, sinAzucar: false, ...plata, modelo: 'botella_0_monster_cubico', alto: 140, diametro: 54 },
]

const POR_SLUG = new Map(CATALOGO.map((lata) => [lata.slug, lata]))

export function lataPorSlug(slug: string): Lata | undefined {
  return POR_SLUG.get(slug)
}

export function existeLata(slug: string): boolean {
  return POR_SLUG.has(slug)
}
