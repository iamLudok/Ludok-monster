import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen } from '../src/ui/Screen'
import { Txt } from '../src/ui/Text'
import { Button } from '../src/ui/Button'
import { Field } from '../src/ui/Field'
import { Chips } from '../src/ui/Chips'
import { space } from '../src/ui/theme'
import { TopBar } from '../src/components/TopBar'
import { useCompras } from '../src/hooks/useLatas'
import { useSettings } from '../src/hooks/useSettings'
import { lataPorSlug } from '../src/lib/catalogo'
import { nuevaCompra, editarCompra, borrarCompra } from '../src/lib/latas'
import { MONEDAS, precioParaEditar } from '../src/lib/precio'

const OPCIONES_MONEDA = MONEDAS.map((m) => ({ key: m, label: m }))

/** Añadir (sin `id`) o editar (con `id`) una compra de la lata `slug`. */
export default function CompraScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id?: string }>()
  const router = useRouter()
  const settings = useSettings()
  const { data: compras, ready } = useCompras()
  const lata = lataPorSlug(slug)
  const existente = id ? compras.find((c) => c.id === id) : undefined

  const [precio, setPrecio] = useState('')
  const [moneda, setMoneda] = useState<string>(settings.moneda)
  const [pais, setPais] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [cargado, setCargado] = useState(!id)
  const [guardando, setGuardando] = useState(false)

  // Al editar, los campos se rellenan una vez cuando llega la consulta (no en cada repintado,
  // que pisaría lo que se está escribiendo).
  useEffect(() => {
    if (!cargado && existente) {
      setPrecio(precioParaEditar(existente.precioCentimos, existente.moneda))
      setMoneda(existente.moneda)
      setPais(existente.pais ?? '')
      setCiudad(existente.ciudad ?? '')
      setCargado(true)
    }
  }, [cargado, existente])

  // Una compra nueva propone el último país usado: lo normal es comprar siempre en el mismo.
  useEffect(() => {
    if (!id && ready && !pais && compras.length) setPais(compras[compras.length - 1]?.pais ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const guardar = async () => {
    setGuardando(true)
    try {
      const datos = { slug, precio, moneda, pais, ciudad }
      if (id) await editarCompra(id, datos)
      else await nuevaCompra(datos)
      router.back()
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = () =>
    Alert.alert('Borrar compra', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          if (id) borrarCompra(id).then(() => router.back())
        },
      },
    ])

  return (
    <Screen padded={false}>
      <TopBar title={id ? 'Editar compra' : 'Nueva compra'} />
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Txt variant="title">{lata?.nombre ?? slug}</Txt>
        <View style={styles.campo}>
          <Txt variant="label" tone="muted">
            Precio
          </Txt>
          <Field value={precio} onChangeText={setPrecio} placeholder="1,99" keyboardType="decimal-pad" />
          <Chips options={OPCIONES_MONEDA} value={moneda} onChange={setMoneda} />
        </View>
        <View style={styles.campo}>
          <Txt variant="label" tone="muted">
            Dónde
          </Txt>
          <Field value={ciudad} onChangeText={setCiudad} placeholder="Ciudad" autoCapitalize="words" />
          <Field value={pais} onChangeText={setPais} placeholder="País" autoCapitalize="words" />
          <Txt variant="small" tone="faint">
            Con la ciudad y el país, la compra aparece en el mapa.
          </Txt>
        </View>
        <Button title={guardando ? 'Guardando…' : 'Guardar'} kind="primary" onPress={guardar} disabled={guardando || !cargado} />
        {id ? <Button title="Borrar compra" kind="danger" onPress={borrar} /> : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  contenido: { padding: space.lg, paddingBottom: space.xxl, gap: space.xl },
  campo: { gap: space.sm },
})
