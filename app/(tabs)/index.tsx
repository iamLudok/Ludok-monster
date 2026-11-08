import { useMemo, useState } from 'react'
import { FlatList, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Chips } from '../../src/ui/Chips'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius, space } from '../../src/ui/theme'
import BackupBanner from '../../src/components/BackupBanner'
import { useProbadas } from '../../src/hooks/useLatas'
import { CATALOGO, GAMAS, type Gama } from '../../src/lib/catalogo'
import { MINIATURAS } from '../../src/lib/miniaturas'

type Estado = 'todas' | 'probadas' | 'pendientes'
const ESTADOS = [
  { key: 'todas' as const, label: 'Todas' },
  { key: 'probadas' as const, label: 'Probadas' },
  { key: 'pendientes' as const, label: 'Sin probar' },
]
const FILTRO_GAMAS = [{ key: 'todas' as const, label: 'Todas las gamas' }, ...GAMAS.map((g) => ({ key: g, label: g }))]
const COLUMNAS = 3
/** Proporción de la miniatura (el frente de la etiqueta): alta y estrecha, como una lata. */
const PROPORCION = 312 / 144

export default function LatasScreen() {
  const router = useRouter()
  const palette = usePalette()
  const { width } = useWindowDimensions()
  const { porSlug, ready } = useProbadas()
  const [estado, setEstado] = useState<Estado>('todas')
  const [gama, setGama] = useState<Gama | 'todas'>('todas')

  const latas = useMemo(() => {
    // Por gamas y nombre: el orden de la torre es bueno para la torre, pero en una lista se
    // busca una lata concreta, y ahí ayuda más tenerlas agrupadas.
    const orden = new Map(GAMAS.map((g, i) => [g, i]))
    return CATALOGO.filter((l) => gama === 'todas' || l.gama === gama)
      .filter((l) => estado === 'todas' || (estado === 'probadas') === porSlug.has(l.slug))
      .sort((a, b) => (orden.get(a.gama) ?? 0) - (orden.get(b.gama) ?? 0) || a.nombre.localeCompare(b.nombre))
  }, [gama, estado, porSlug])

  const ancho = (width - space.lg * 2 - space.md * (COLUMNAS - 1)) / COLUMNAS
  const probadas = CATALOGO.filter((l) => porSlug.has(l.slug)).length

  return (
    <Screen
      title="Latas"
      padded={false}
      right={
        ready ? (
          <Txt variant="data" tone="muted">
            {probadas} de {CATALOGO.length}
          </Txt>
        ) : null
      }
    >
      <View style={styles.filtros}>
        <Chips options={ESTADOS} value={estado} onChange={setEstado} />
        <Chips options={FILTRO_GAMAS} value={gama} onChange={setGama} />
      </View>
      <FlatList
        data={ready ? latas : []}
        key={COLUMNAS}
        numColumns={COLUMNAS}
        keyExtractor={(l) => l.slug}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={<BackupBanner />}
        ListEmptyComponent={
          ready ? (
            <Txt variant="body" tone="muted" style={styles.vacio}>
              {estado === 'probadas' ? 'Aún no has marcado ninguna como probada.' : 'No hay latas con este filtro.'}
            </Txt>
          ) : null
        }
        renderItem={({ item }) => {
          const probada = porSlug.get(item.slug)
          return (
            <Pressable
              onPress={() => router.push(`/lata/${item.slug}`)}
              style={({ pressed }) => [{ width: ancho, opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}${probada ? ', probada' : ''}`}
            >
              <View style={[styles.marco, { backgroundColor: palette.surface2 }]}>
                <Image
                  source={MINIATURAS[item.slug]}
                  // Sin probar se ve apagada: la colección se lee de un vistazo, como la torre.
                  style={{ width: ancho, height: ancho * PROPORCION, opacity: probada ? 1 : 0.3 }}
                  resizeMode="cover"
                />
                {probada?.valoracion !== undefined && (
                  <View style={[styles.nota, { backgroundColor: palette.fg }]}>
                    <Txt variant="data" style={{ color: palette.onFg, fontWeight: '700' }}>
                      {probada.valoracion}
                    </Txt>
                  </View>
                )}
              </View>
              <Txt variant="small" numberOfLines={2} tone={probada ? 'fg' : 'muted'} style={styles.nombre}>
                {item.nombre}
              </Txt>
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  filtros: { gap: space.sm, paddingLeft: space.lg, paddingBottom: space.md },
  lista: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  marco: { borderRadius: radius.lg, overflow: 'hidden' },
  nota: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    minWidth: 24,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  nombre: { marginTop: space.xs },
  vacio: { textAlign: 'center', marginTop: space.xxl },
})
