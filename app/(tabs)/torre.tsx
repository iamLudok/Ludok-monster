import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Screen, Empty } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Chips } from '../../src/ui/Chips'
import { usePalette } from '../../src/ui/ThemeProvider'
import { space } from '../../src/ui/theme'
import Visor3D from '../../src/components/Visor3D'
import { useProbadas } from '../../src/hooks/useLatas'
import { CATALOGO, lataPorSlug } from '../../src/lib/catalogo'
import { disponerTorre } from '../../src/lib/torre'
import { paraVisor } from '../../src/lib/visor'

type Vista = 'mia' | 'completa'

export default function TorreScreen() {
  const router = useRouter()
  const palette = usePalette()
  const { porSlug, ready } = useProbadas()
  const [vista, setVista] = useState<Vista>('mia')
  // El visor solo existe mientras la pestaña está a la vista: 47 latas y botellas en WebGL gastan memoria
  // y batería aunque nadie las mire, y las pestañas de expo-router no se desmontan solas.
  const [visible, setVisible] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setVisible(true)
      return () => setVisible(false)
    }, []),
  )

  const probadas = CATALOGO.filter((l) => porSlug.has(l.slug)).map((l) => l.slug)
  const latas = useMemo(() => {
    const slugs = vista === 'mia' ? probadas : CATALOGO.map((l) => l.slug)
    return disponerTorre(slugs).map((h) => paraVisor(lataPorSlug(h.slug)!, h.x, h.y, vista === 'completa' && !porSlug.has(h.slug)))
    // `probadas` se recalcula en cada render; lo que cambia de verdad es `porSlug`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, porSlug])

  const opciones = [
    { key: 'mia' as const, label: `Mi torre · ${probadas.length}` },
    { key: 'completa' as const, label: `Colección · ${CATALOGO.length}` },
  ]

  return (
    <Screen title="Torre" padded={false}>
      <View style={styles.filtros}>
        <Chips options={opciones} value={vista} onChange={setVista} />
      </View>
      {!ready ? null : latas.length === 0 ? (
        <Empty text="Tu torre crece con cada lata que pruebas. Marca alguna como probada en Latas." />
      ) : (
        <View style={styles.visor}>
          {visible && (
            <Visor3D
              latas={latas}
              modo="torre"
              fondo={palette.bg}
              onTocar={async (slug) => {
                router.push(`/lata/${slug}`)
              }}
              dom={{ style: { flex: 1 }, scrollEnabled: false }}
            />
          )}
          <Txt variant="small" tone="faint" style={styles.ayuda}>
            Gira con un dedo, acerca con dos. Toca una lata para abrirla.
          </Txt>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  filtros: { paddingLeft: space.lg, paddingBottom: space.sm },
  visor: { flex: 1 },
  ayuda: { textAlign: 'center', paddingVertical: space.sm },
})
