import { useState } from 'react'
import { ScrollView, View, StyleSheet, Alert } from 'react-native'
import { Screen, Card } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Button } from '../../src/ui/Button'
import { Chips } from '../../src/ui/Chips'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius, space } from '../../src/ui/theme'
import { useSettings } from '../../src/hooks/useSettings'
import { useProbadas, useCompras } from '../../src/hooks/useLatas'
import { updateSettings } from '../../src/lib/settings'
import { shareBackup, pickJsonFile, importAll, daysSinceBackup } from '../../src/lib/backup'
import { marcarTodas } from '../../src/lib/latas'
import { MONEDAS } from '../../src/lib/precio'
import { CATALOGO } from '../../src/lib/catalogo'
import { NextcloudSettings } from '../../src/components/NextcloudSettings'

const THEMES = [
  { key: 'system' as const, label: 'Sistema' },
  { key: 'dark' as const, label: 'Oscuro' },
  { key: 'light' as const, label: 'Claro' },
]
const OPCIONES_MONEDA = MONEDAS.map((m) => ({ key: m, label: m }))

export default function AjustesScreen() {
  const settings = useSettings()
  const palette = usePalette()
  const { data: probadas } = useProbadas()
  const { data: compras } = useCompras()
  const [busy, setBusy] = useState(false)

  const days = daysSinceBackup(settings.lastBackup)
  const lastBackupText = days === null ? 'nunca' : days === 0 ? 'hoy' : `hace ${days} ${days === 1 ? 'día' : 'días'}`

  const doExport = async () => {
    setBusy(true)
    try {
      await shareBackup()
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const doImport = async () => {
    setBusy(true)
    try {
      const raw = await pickJsonFile()
      if (!raw) return
      // Se pregunta DESPUÉS de elegir el fichero, para decidir sabiendo ya qué copia es.
      Alert.alert('Importar copia', 'Esto reemplaza todo lo que tienes apuntado ahora.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar', style: 'destructive', onPress: () => runImport(raw) },
      ])
    } catch (e) {
      Alert.alert('No se pudo leer', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (raw: string) => {
    setBusy(true)
    try {
      const res = await importAll(raw)
      const extra = res.desconocidas ? `\n\n${res.desconocidas} latas son de una versión más nueva de la app: se guardan y aparecerán al actualizar.` : ''
      Alert.alert('Importado', `${res.probadas} latas probadas y ${res.compras} compras.${extra}`)
    } catch (e) {
      Alert.alert('Error al importar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const doMarcarTodas = () =>
    Alert.alert('Marcar todas como probadas', `Las ${CATALOGO.length} latas quedarán como probadas. Las que ya lo estaban no cambian.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar',
        onPress: () =>
          marcarTodas()
            .then((n) => Alert.alert('Hecho', n ? `${n} latas marcadas.` : 'Ya estaban todas.'))
            .catch((e: unknown) => Alert.alert('No se pudo', e instanceof Error ? e.message : 'Error desconocido')),
      },
    ])

  return (
    <Screen title="Ajustes" padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Txt variant="title">Copia de seguridad</Txt>
          <Txt variant="small" tone="muted">
            Lo que apuntas vive solo en este móvil. Exporta a menudo y guarda el fichero donde quieras.
          </Txt>
          <View style={[styles.stat, { borderColor: palette.line }]}>
            <Row label="Latas probadas" value={String(probadas.length)} />
            <Row label="Compras" value={String(compras.length)} />
            <Row label="Última copia" value={lastBackupText} />
          </View>
          <Button title="Exportar copia" kind="primary" onPress={doExport} disabled={busy} />
          <Button title="Importar copia" onPress={doImport} disabled={busy} />
        </Card>

        <NextcloudSettings />

        <Card>
          <Txt variant="title">Moneda</Txt>
          <Txt variant="small" tone="muted">
            La que se propone al apuntar una compra. Cada compra guarda la suya, y los números no mezclan monedas.
          </Txt>
          <Chips options={OPCIONES_MONEDA} value={settings.moneda} onChange={(moneda) => updateSettings({ moneda })} />
        </Card>

        <Card>
          <Txt variant="title">Tema</Txt>
          <Chips options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
        </Card>

        <Card>
          <Txt variant="title">Colección</Txt>
          <Txt variant="small" tone="muted">
            Si ya las has probado todas, márcalas de una vez en vez de una a una.
          </Txt>
          <Button title="Marcar todas como probadas" onPress={doMarcarTodas} disabled={probadas.length >= CATALOGO.length} />
        </Card>

        <Txt variant="small" tone="faint" style={{ textAlign: 'center' }}>
          Ludok Monster · {CATALOGO.length} latas modeladas en 3D a partir de fotos reales. Las medidas son aproximadas.
        </Txt>
      </ScrollView>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Txt variant="small" tone="muted">
        {label}
      </Txt>
      <Txt variant="data">{value}</Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  stat: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
})
