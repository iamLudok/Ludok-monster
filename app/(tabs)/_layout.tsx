import { Tabs } from 'expo-router'
import { View, StyleSheet, type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from '../../src/ui/ThemeProvider'

type Shape = 'latas' | 'torre' | 'numeros' | 'ajustes'

/**
 * Iconos hechos con formas geométricas en vez de emojis: en «Sala oscura» la interfaz es
 * monocroma, y un emoji a color rompería justo eso. Una lata (con su tapa), una pirámide de
 * tres latas, unas barras y el anillo de ajustes de todas las apps Ludok.
 */
function Icon({ shape, color }: { shape: Shape; color: ColorValue }) {
  if (shape === 'latas') {
    return (
      <View style={styles.box}>
        <View style={[styles.lid, { backgroundColor: color }]} />
        <View style={[styles.can, { borderColor: color }]} />
      </View>
    )
  }
  if (shape === 'torre') {
    return (
      <View style={styles.box}>
        <View style={[styles.mini, { borderColor: color, top: 0, left: 6 }]} />
        <View style={[styles.mini, { borderColor: color, bottom: 0, left: 1 }]} />
        <View style={[styles.mini, { borderColor: color, bottom: 0, right: 1 }]} />
      </View>
    )
  }
  if (shape === 'numeros') {
    return (
      <View style={[styles.box, styles.bars]}>
        {[8, 16, 12].map((h, i) => (
          <View key={i} style={[styles.bar, { height: h, backgroundColor: color }]} />
        ))}
      </View>
    )
  }
  return (
    <View style={styles.box}>
      <View style={[styles.ring, { borderColor: color }]} />
    </View>
  )
}

export default function TabsLayout() {
  const palette = usePalette()
  // La barra de gestos del sistema se come el texto de las pestañas si no se deja hueco.
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.bg },
        tabBarActiveTintColor: palette.fg,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopColor: palette.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Latas', tabBarIcon: ({ color }) => <Icon shape="latas" color={color} /> }} />
      <Tabs.Screen name="torre" options={{ title: 'Torre', tabBarIcon: ({ color }) => <Icon shape="torre" color={color} /> }} />
      <Tabs.Screen name="numeros" options={{ title: 'Números', tabBarIcon: ({ color }) => <Icon shape="numeros" color={color} /> }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <Icon shape="ajustes" color={color} /> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  box: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  lid: { position: 'absolute', top: 0, width: 8, height: 2, borderRadius: 1 },
  can: { position: 'absolute', bottom: 0, width: 11, height: 17, borderRadius: 3, borderWidth: 2 },
  mini: { position: 'absolute', width: 8, height: 10, borderRadius: 2, borderWidth: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 4, borderRadius: 1 },
  ring: { width: 17, height: 17, borderRadius: 999, borderWidth: 3 },
})
