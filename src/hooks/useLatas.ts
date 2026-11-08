import { useMemo } from 'react'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { asc } from 'drizzle-orm'
import { db } from '../lib/db'
import { probadas as probadasTable, compras as comprasTable } from '../lib/schema'
import { rowToProbada, rowToCompra } from '../lib/rows'
import type { Compra, Probada } from '../types'

/**
 * Consultas reactivas. Viven aquí y no en `lib/` porque `useLiveQuery` es de expo-sqlite y
 * solo funciona en el móvil; la lógica de `lib/` sigue siendo comprobable en el escritorio.
 *
 * `ready`: `useLiveQuery` arranca con la lista vacía y lanza la consulta en un efecto, así que
 * «sin filas» y «todavía no ha respondido» son iguales en el primer render. Sin mirarlo, la
 * torre aparecía un instante vacía («aún no has probado ninguna») al abrirla.
 */
export function useProbadas(): { data: Probada[]; porSlug: Map<string, Probada>; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(probadasTable))
  const lista = useMemo(() => (data ?? []).map(rowToProbada), [data])
  const porSlug = useMemo(() => new Map(lista.map((p) => [p.slug, p])), [lista])
  return { data: lista, porSlug, ready: updatedAt !== undefined }
}

export function useCompras(): { data: Compra[]; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(comprasTable).orderBy(asc(comprasTable.addedAt)))
  const lista = useMemo(() => (data ?? []).map(rowToCompra), [data])
  return { data: lista, ready: updatedAt !== undefined }
}
