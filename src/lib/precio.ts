// Precios: se escriben como texto en el móvil («1,99», «2», «1.5») y se guardan en céntimos.
// Puro y sin dependencias, para comprobarlo en `verify/library.ts`: un fallo aquí no daría
// un error, daría gastos mal sumados en las estadísticas.

/** Monedas que se ofrecen al elegir. Cualquier otro código ISO de tres letras también vale. */
export const MONEDAS = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'MXN'] as const

const SIMBOLOS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF', MXN: '$' }

/** El yen no tiene céntimos: escribir «150» son 150 ¥, y se guardan como 15000 «céntimos». */
const SIN_DECIMALES = new Set(['JPY'])

/**
 * «1,99» → 199. Vacío → undefined. Lanza un error legible si no es un precio.
 *
 * Acepta coma o punto como separador decimal porque el teclado numérico de Android pone uno
 * u otro según el idioma del móvil, y quien escribe no debería tener que saber cuál toca.
 */
export function parsePrecio(texto: string): number | undefined {
  const limpio = texto.trim().replace(/\s/g, '').replace(/[€$£¥]/g, '')
  if (!limpio) return undefined
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(limpio)) {
    throw new Error('El precio tiene que ser un número, como 1,99.')
  }
  const [entero, decimales = ''] = limpio.replace(',', '.').split('.')
  return Number(entero) * 100 + Number(decimales.padEnd(2, '0'))
}

/** 199, 'EUR' → «1,99 €». */
export function formatPrecio(centimos: number, moneda: string): string {
  const simbolo = SIMBOLOS[moneda] ?? moneda
  if (SIN_DECIMALES.has(moneda)) return `${Math.round(centimos / 100)} ${simbolo}`
  const euros = Math.floor(Math.abs(centimos) / 100)
  const resto = String(Math.abs(centimos) % 100).padStart(2, '0')
  return `${centimos < 0 ? '-' : ''}${euros},${resto} ${simbolo}`
}

/** Texto para el campo de edición: 199 → «1,99». */
export function precioParaEditar(centimos: number | undefined, moneda: string): string {
  if (centimos === undefined) return ''
  if (SIN_DECIMALES.has(moneda)) return String(Math.round(centimos / 100))
  return `${Math.floor(centimos / 100)},${String(centimos % 100).padStart(2, '0')}`
}

/** Normaliza un código de moneda («eur» → «EUR»). Lanza si no tiene pinta de código ISO. */
export function normalizaMoneda(texto: string): string {
  const m = texto.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(m)) throw new Error('La moneda tiene que ser un código de tres letras, como EUR.')
  return m
}
