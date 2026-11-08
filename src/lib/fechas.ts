// Fechas en castellano sin depender de `Intl`: el motor de React Native en Android no siempre
// trae los datos de idioma completos, y un «Oct 8, 2026» en una app en castellano chirría.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/** 1759900000000 → «8 oct 2025». */
export function formatFecha(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
