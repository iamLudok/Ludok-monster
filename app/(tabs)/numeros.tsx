import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Card } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Button } from '../../src/ui/Button'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius, space } from '../../src/ui/theme'
import { useProbadas, useCompras } from '../../src/hooks/useLatas'
import { calcularEstadisticas } from '../../src/lib/estadisticas'
import { lataPorSlug } from '../../src/lib/catalogo'
import { formatPrecio } from '../../src/lib/precio'

export default function NumerosScreen() {
  const router = useRouter()
  const { data: probadas, ready: r1 } = useProbadas()
  const { data: compras, ready: r2 } = useCompras()
  const est = useMemo(() => calcularEstadisticas(probadas, compras), [probadas, compras])
  const nombre = (slug: string) => lataPorSlug(slug)?.nombre ?? slug

  if (!r1 || !r2) return <Screen title="Números">{null}</Screen>

  return (
    <Screen title="Números" padded={false}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Card>
          <View style={styles.grande}>
            <Txt variant="display">
              {est.probadas}
              <Txt variant="title" tone="muted">
                {' '}
                de {est.total}
              </Txt>
            </Txt>
            <Txt variant="small" tone="muted">
              latas probadas
            </Txt>
          </View>
          <Barra valor={est.probadas} total={est.total} />
        </Card>

        <Card>
          <Txt variant="title">Por gama</Txt>
          {est.porGama.map((g) => (
            <View key={g.gama} style={styles.gama}>
              <View style={styles.filaTexto}>
                <Txt variant="body">{g.gama}</Txt>
                <Txt variant="data" tone={g.probadas === g.total ? 'fg' : 'muted'}>
                  {g.probadas} / {g.total}
                </Txt>
              </View>
              <Barra valor={g.probadas} total={g.total} />
            </View>
          ))}
        </Card>

        <Card>
          <Txt variant="title">Tus notas</Txt>
          {est.valoradas === 0 ? (
            <Txt variant="small" tone="muted">
              Aún no has puntuado ninguna. Ponle nota desde su ficha.
            </Txt>
          ) : (
            <>
              <Fila etiqueta="Nota media" valor={`${String(est.mediaValoracion).replace('.', ',')} / 10`} />
              <Fila etiqueta="Latas puntuadas" valor={String(est.valoradas)} />
              <Txt variant="label" tone="muted" style={styles.subtitulo}>
                Tus favoritas
              </Txt>
              {est.ranking.slice(0, 5).map((p, i) => (
                <Pressable key={p.slug} onPress={() => router.push(`/lata/${p.slug}`)} style={({ pressed }) => [styles.filaTexto, { opacity: pressed ? 0.6 : 1 }]}>
                  <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                    {i + 1}. {nombre(p.slug)}
                  </Txt>
                  <Txt variant="data">{p.valoracion}</Txt>
                </Pressable>
              ))}
            </>
          )}
        </Card>

        <Card>
          <Txt variant="title">Compras</Txt>
          {est.compras === 0 ? (
            <Txt variant="small" tone="muted">
              Apunta dónde y por cuánto compras cada lata desde su ficha.
            </Txt>
          ) : (
            <>
              <Fila etiqueta="Compras apuntadas" valor={String(est.compras)} />
              <Fila etiqueta="Lugares distintos" valor={String(est.lugares)} />
              {est.porMoneda
                .filter((m) => m.conPrecio > 0)
                .map((m) => (
                  <View key={m.moneda} style={styles.moneda}>
                    {est.porMoneda.filter((x) => x.conPrecio > 0).length > 1 && (
                      <Txt variant="label" tone="muted">
                        En {m.moneda}
                      </Txt>
                    )}
                    <Fila etiqueta="Gastado" valor={formatPrecio(m.totalCentimos, m.moneda)} />
                    {m.mediaCentimos !== undefined && <Fila etiqueta="Precio medio" valor={formatPrecio(m.mediaCentimos, m.moneda)} />}
                    {m.masCara && <Fila etiqueta={`Más cara · ${nombre(m.masCara.slug)}`} valor={formatPrecio(m.masCara.centimos, m.moneda)} />}
                    {m.masBarata && m.conPrecio > 1 && (
                      <Fila etiqueta={`Más barata · ${nombre(m.masBarata.slug)}`} valor={formatPrecio(m.masBarata.centimos, m.moneda)} />
                    )}
                  </View>
                ))}
              {est.porPais.length > 0 && (
                <>
                  <Txt variant="label" tone="muted" style={styles.subtitulo}>
                    Países
                  </Txt>
                  {est.porPais.map((p) => (
                    <Fila key={p.pais} etiqueta={p.pais} valor={`${p.compras} ${p.compras === 1 ? 'compra' : 'compras'}`} />
                  ))}
                </>
              )}
              <Button title="Ver mapa de compras" onPress={() => router.push('/mapa')} disabled={est.lugares === 0} />
            </>
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.filaTexto}>
      <Txt variant="small" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
        {etiqueta}
      </Txt>
      <Txt variant="data">{valor}</Txt>
    </View>
  )
}

function Barra({ valor, total }: { valor: number; total: number }) {
  const palette = usePalette()
  return (
    <View style={[styles.pista, { backgroundColor: palette.surface2 }]}>
      <View style={[styles.relleno, { backgroundColor: palette.fg, width: `${total ? (valor / total) * 100 : 0}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  contenido: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  grande: { gap: space.xs },
  gama: { gap: space.xs },
  filaTexto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  subtitulo: { marginTop: space.sm },
  moneda: { gap: space.xs },
  pista: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: radius.pill },
})
