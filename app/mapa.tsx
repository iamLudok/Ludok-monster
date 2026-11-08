import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Screen, Empty } from '../src/ui/Screen'
import { Txt } from '../src/ui/Text'
import { usePalette } from '../src/ui/ThemeProvider'
import { space } from '../src/ui/theme'
import { TopBar } from '../src/components/TopBar'
import MapaComprasDom from '../src/components/MapaComprasDom'
import { useCompras } from '../src/hooks/useLatas'
import { geocodeAddress } from '../src/lib/geocode'
import { guardarCoordenadas, lugarClave } from '../src/lib/latas'
import { lataPorSlug } from '../src/lib/catalogo'
import type { Compra } from '../src/types'

// Política de Nominatim: como mucho una petición por segundo.
const ESPERA_MS = 1100

interface Lugar {
  clave: string
  nombre: string
  compras: Compra[]
  lat?: number
  lng?: number
}

export default function MapaScreen() {
  const palette = usePalette()
  const { data: compras, ready } = useCompras()
  const [situando, setSituando] = useState(false)
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 })
  // Lugares ya intentados en ESTA visita: uno que Nominatim no sabe situar no se reintenta en
  // bucle en cada repintado, se deja para la próxima vez que se abra el mapa.
  const intentados = useRef(new Set<string>())

  // Una chincheta por lugar (ciudad + país), no por compra: comprar diez latas en la misma
  // tienda no tiene por qué llenar el mapa de chinchetas encima unas de otras.
  const lugares = useMemo(() => {
    const porClave = new Map<string, Lugar>()
    for (const c of compras) {
      const clave = lugarClave(c)
      if (!clave) continue
      const l = porClave.get(clave) ?? { clave, nombre: [c.ciudad, c.pais].filter(Boolean).join(', '), compras: [] }
      l.compras.push(c)
      if (c.lat !== undefined && c.lng !== undefined) {
        l.lat = c.lat
        l.lng = c.lng
      }
      porClave.set(clave, l)
    }
    return [...porClave.values()]
  }, [compras])

  useEffect(() => {
    if (!ready) return
    // Si alguna compra de un lugar ya tiene coordenadas, el resto las hereda sin preguntar a nadie.
    for (const l of lugares) {
      if (l.lat !== undefined && l.lng !== undefined && l.compras.some((c) => c.lat === undefined)) {
        guardarCoordenadas(l.clave, l.lat, l.lng).catch(() => {})
      }
    }
    const pendientes = lugares.filter((l) => l.lat === undefined && !intentados.current.has(l.clave))
    if (!pendientes.length) return
    let cancelado = false
    const run = async () => {
      setSituando(true)
      setProgreso({ hechos: 0, total: pendientes.length })
      for (const [i, l] of pendientes.entries()) {
        if (cancelado) break
        intentados.current.add(l.clave)
        try {
          const punto = await geocodeAddress(l.nombre)
          if (punto) await guardarCoordenadas(l.clave, punto.lat, punto.lng)
        } catch {
          // Sin red ahora mismo: se queda sin chincheta hoy y se reintenta otro día.
        }
        if (!cancelado) setProgreso({ hechos: i + 1, total: pendientes.length })
        if (i < pendientes.length - 1) await new Promise((r) => setTimeout(r, ESPERA_MS))
      }
      if (!cancelado) setSituando(false)
    }
    run()
    return () => {
      cancelado = true
    }
    // Solo al entrar o si aparecen lugares nuevos: nuestros propios guardados de coordenadas
    // cambian `compras` y no deben relanzar el bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lugares.length])

  const puntos = useMemo(
    () =>
      lugares
        .filter((l): l is Lugar & { lat: number; lng: number } => l.lat !== undefined && l.lng !== undefined)
        .map((l) => {
          const nombres = [...new Set(l.compras.map((c) => lataPorSlug(c.slug)?.nombre ?? c.slug))]
          const total = l.compras.length
          return { id: l.clave, name: l.nombre, detail: `${total} ${total === 1 ? 'compra' : 'compras'}: ${nombres.join(', ')}`, lat: l.lat, lng: l.lng }
        }),
    [lugares],
  )

  return (
    <Screen padded={false}>
      <TopBar title="Mapa de compras" />
      {situando && (
        <View style={[styles.progreso, { borderColor: palette.line }]}>
          <ActivityIndicator size="small" color={palette.muted} />
          <Txt variant="small" tone="muted">
            Situando lugares… {progreso.hechos}/{progreso.total}
          </Txt>
        </View>
      )}
      {!ready ? null : puntos.length === 0 ? (
        <Empty
          text={
            situando
              ? 'Situando los lugares de tus compras…'
              : lugares.length
                ? 'No se ha podido situar ningún lugar todavía. Hace falta conexión la primera vez.'
                : 'Ninguna compra dice dónde fue. Añade la ciudad y el país desde la ficha de una lata.'
          }
        />
      ) : (
        <MapaComprasDom points={puntos} dom={{ style: { flex: 1 } }} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  progreso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
