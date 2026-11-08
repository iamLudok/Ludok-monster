import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Empty } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Button } from '../../src/ui/Button'
import { Field } from '../../src/ui/Field'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius, space } from '../../src/ui/theme'
import { TopBar } from '../../src/components/TopBar'
import Visor3D from '../../src/components/Visor3D'
import { useProbadas, useCompras } from '../../src/hooks/useLatas'
import { lataPorSlug } from '../../src/lib/catalogo'
import { paraVisor } from '../../src/lib/visor'
import { marcarProbada, desmarcarProbada, valorar, guardarNota } from '../../src/lib/latas'
import { formatPrecio } from '../../src/lib/precio'
import { formatFecha } from '../../src/lib/fechas'

const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function LataScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const palette = usePalette()
  const { height } = useWindowDimensions()
  const lata = lataPorSlug(slug)
  const { porSlug, ready } = useProbadas()
  const { data: todas } = useCompras()
  const probada = porSlug.get(slug)
  const compras = useMemo(() => todas.filter((c) => c.slug === slug), [todas, slug])
  const visor = useMemo(() => (lata ? [paraVisor(lata)] : []), [lata])

  const [nota, setNota] = useState('')
  // La nota se carga al llegar la consulta y luego es del usuario: si se reescribiera en cada
  // cambio de `probada`, lo que está tecleando se le borraría al guardarse la valoración.
  const [notaCargada, setNotaCargada] = useState(false)
  useEffect(() => {
    if (ready && !notaCargada) {
      setNota(probada?.nota ?? '')
      setNotaCargada(true)
    }
  }, [ready, notaCargada, probada?.nota])

  if (!lata) {
    return (
      <Screen padded={false}>
        <TopBar />
        <Empty text="Esta lata no está en el catálogo." />
      </Screen>
    )
  }

  const avisar = (e: unknown) => Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error desconocido')

  const quitar = () =>
    Alert.alert('Quitar de probadas', 'Se borrarán también tu nota y tu comentario. Las compras se quedan.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          desmarcarProbada(lata.slug).catch(avisar)
          setNota('')
        },
      },
    ])

  const detalles = [lata.gama, `${lata.mlEstimado ? '≈' : ''}${lata.ml} ml`, lata.sinAzucar ? 'Sin azúcar' : null].filter(Boolean).join(' · ')

  return (
    <Screen padded={false}>
      <TopBar />
      {/* El visor va fuera del ScrollView: dentro, girar la lata y desplazar la página se pelean por el mismo gesto. */}
      <View style={{ height: height * 0.42 }}>
        <Visor3D latas={visor} modo="lata" fondo={palette.bg} dom={{ style: { flex: 1 }, scrollEnabled: false }} />
      </View>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View>
          <Txt variant="display">{lata.nombre}</Txt>
          <Txt variant="small" tone="muted">
            {detalles}
          </Txt>
        </View>

        {!ready ? null : probada ? (
          <View style={styles.fila}>
            <Txt variant="small" tone="muted" style={{ flex: 1 }}>
              Probada el {formatFecha(probada.probadaAt)}
            </Txt>
            <Button title="Quitar" kind="ghost" small onPress={quitar} />
          </View>
        ) : (
          <Button title="La he probado" kind="primary" onPress={() => marcarProbada(lata.slug).catch(avisar)} />
        )}

        <View style={styles.bloque}>
          <Txt variant="label" tone="muted">
            Tu nota
          </Txt>
          <View style={styles.notas}>
            {NOTAS.map((n) => {
              const on = probada?.valoracion === n
              return (
                <Pressable
                  key={n}
                  // Tocar la nota que ya está puesta la quita: así no hace falta otro botón.
                  onPress={() => valorar(lata.slug, on ? undefined : n).catch(avisar)}
                  accessibilityRole="button"
                  accessibilityLabel={`Nota ${n}`}
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    styles.nota,
                    { borderColor: on ? palette.fg : palette.line, backgroundColor: on ? palette.fg : 'transparent', opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Txt variant="data" style={{ color: on ? palette.onFg : palette.fg, fontWeight: '700' }}>
                    {n}
                  </Txt>
                </Pressable>
              )
            })}
          </View>
          <Field
            value={nota}
            onChangeText={setNota}
            onEndEditing={() => guardarNota(lata.slug, nota).catch(avisar)}
            placeholder="Un comentario (opcional)"
            multiline
          />
        </View>

        <View style={styles.bloque}>
          <Txt variant="label" tone="muted">
            Compras
          </Txt>
          {compras.length === 0 && (
            <Txt variant="small" tone="faint">
              Aún no has apuntado dónde la compraste.
            </Txt>
          )}
          {compras.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/compra', params: { slug: lata.slug, id: c.id } })}
              style={({ pressed }) => [styles.compra, { borderColor: palette.line, opacity: pressed ? 0.6 : 1 }]}
            >
              <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {[c.ciudad, c.pais].filter(Boolean).join(', ') || 'Sin lugar'}
              </Txt>
              <Txt variant="data" tone={c.precioCentimos === undefined ? 'faint' : 'fg'}>
                {c.precioCentimos === undefined ? 'sin precio' : formatPrecio(c.precioCentimos, c.moneda)}
              </Txt>
            </Pressable>
          ))}
          <Button title="Añadir compra" onPress={() => router.push({ pathname: '/compra', params: { slug: lata.slug } })} />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  contenido: { padding: space.lg, paddingBottom: space.xxl, gap: space.xl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bloque: { gap: space.md },
  // Las diez en una fila, repartiendo el ancho: en dos filas no se lee como una escala.
  notas: { flexDirection: 'row', gap: space.xs },
  nota: { flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  compra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
  },
})
