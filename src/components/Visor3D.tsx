'use dom'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { LataVisor } from '../lib/visor'

/**
 * Visor 3D de las latas (three.js) dentro de un DOM Component de Expo: corre en un WebView de
 * verdad, con WebGL, sin librerías nativas de 3D que mantener.
 *
 * Los ficheros vienen de `public/` (se copian dentro del APK): funciona sin conexión. Las 45
 * latas comparten la geometría, así que solo hay 4 modelos (uno por tipo de anilla) y aquí se
 * le pone a cada copia su etiqueta, sus colores y su escala. Los colores y materiales son los
 * mismos que usa el generador de Blender del proyecto Monster (crear_monster.py), en lineal.
 */

interface Props {
  latas: LataVisor[]
  modo: 'lata' | 'torre'
  /** Color de fondo, del tema de la app. */
  fondo: string
  onTocar?: (slug: string) => Promise<void>
  dom?: import('expo/dom').DOMProps
}

/**
 * Dónde están los ficheros de `public/`.
 *
 * Dentro del APK la página del visor se abre desde `file:///android_asset/www.bundle/` y
 * `public/` está copiado AHÍ MISMO, así que se piden con rutas relativas a la página. Con una
 * ruta absoluta («/modelos/…», lo que salía de `EXPO_BASE_URL` vacío) se buscaban en la raíz
 * del sistema de ficheros y no se cargaba ninguna lata. En el navegador y en desarrollo sí se
 * sirven desde la raíz del servidor.
 */
const BASE = location.protocol === 'file:' ? '' : (process.env.EXPO_BASE_URL || '/').replace(/\/?$/, '/')

/**
 * Lee un fichero como bytes con XMLHttpRequest y no con `fetch`: el WebView de Android no deja
 * hacer `fetch` a `file://` (y el cargador de three.js usa `fetch`), pero XHR sí funciona, porque
 * Expo abre sus DOM Components con `allowFileAccessFromFileURLs`.
 */
function leerBytes(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'arraybuffer'
    // En file:// el estado de una lectura correcta es 0, no 200.
    xhr.onload = () => (xhr.status === 200 || xhr.status === 0) && xhr.response ? resolve(xhr.response as ArrayBuffer) : reject(new Error(`No se pudo leer ${url}`))
    xhr.onerror = () => reject(new Error(`No se pudo leer ${url}`))
    xhr.send()
  })
}

const lineal = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace)

// Por las dos caras: el fondo de la lata y varias piezas de la tapa son superficies sueltas
// (en Blender se ven por ambos lados). Con la cara única de three.js, el fondo cóncavo se veía
// desde abajo como un agujero.
const AMBAS = THREE.DoubleSide

function metal(color: THREE.Color, rugosidad: number) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rugosidad, side: AMBAS })
}

/** Laca negra: sin metal y con poco brillo; como metal, vista de canto parecía plateada. */
function laca(color: THREE.Color, rugosidad: number) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: rugosidad, specularIntensity: 0.15, side: AMBAS })
}

// Materiales comunes, creados una vez: compartirlos entre las 45 latas ahorra memoria.
const ALUMINIO = metal(lineal(0.62, 0.66, 0.7), 0.27)
const PULIDO = metal(lineal(0.72, 0.76, 0.8), 0.19)
const TAPAS = {
  aluminio: { panel: ALUMINIO, reborde: PULIDO },
  // Laca negra: dieléctrica y poco especular, igual que en Blender; si fuera metálica, el
  // reflejo del entorno la volvería gris.
  negra: { panel: laca(lineal(0.004, 0.0045, 0.005), 0.4), reborde: laca(lineal(0.005, 0.0055, 0.006), 0.32) },
  verde: { panel: metal(lineal(0.1, 0.3, 0), 0.24), reborde: metal(lineal(0.12, 0.34, 0), 0.18) },
  dorada: { panel: metal(lineal(0.36, 0.22, 0.05), 0.26), reborde: metal(lineal(0.42, 0.27, 0.07), 0.2) },
} as const
const COLOR_ANILLA = { negro: lineal(0.0013, 0.0018, 0.0015), naranja: lineal(0.38, 0.06, 0), azul: lineal(0, 0.05, 0.38), morado: lineal(0.08, 0.012, 0.3) }

const cargador = new GLTFLoader()
const texturas = new THREE.TextureLoader()
const modelos = new Map<string, Promise<THREE.Group>>()

/** Un GLB de `public/modelos/`, cargado una sola vez y compartido (se clona por cada copia). */
function modelo(nombre: string): Promise<THREE.Group> {
  let p = modelos.get(nombre)
  if (!p) {
    p = leerBytes(`${BASE}modelos/${nombre}.glb`)
      .then((bytes) => cargador.parseAsync(bytes, BASE))
      .then((g) => g.scene)
    // Si falla, que el siguiente intento vuelva a leer en vez de heredar el error para siempre.
    p.catch(() => modelos.delete(nombre))
    modelos.set(nombre, p)
  }
  return p
}

// Dentro del vidrio, three.js no ve otros objetos transparentes (su pase de transmisión solo
// pinta los opacos): un líquido transparente como el de Blender quedaría invisible. Aquí se
// hace opaco y brillante, que a través del vidrio verde se lee como bebida.
const BEBIDA = new THREE.MeshStandardMaterial({ color: lineal(0.42, 0.62, 0.06), metalness: 0, roughness: 0.15 })

/** Las botellas traen su forma, su etiqueta y sus materiales en su propio GLB. */
async function montarBotella(lata: LataVisor & { modelo: string }) {
  const grupo = (await modelo(lata.modelo)).clone(true)
  grupo.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.userData.slug = lata.slug
    if (pieza(o).startsWith('Bebida')) o.material = BEBIDA
    if (lata.apagada) {
      // Copia del material: el GLB se comparte entre la ficha y la torre.
      const m = (o.material as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color(0.18, 0.18, 0.2)
      m.transparent = true
      m.opacity = 0.45
      o.material = m
    }
  })
  // El modelo ya viene en metros y con su tamaño (aprox.) desde Blender: no se escala.
  grupo.position.set(lata.x / 1000, lata.y / 1000, 0)
  grupo.userData.slug = lata.slug
  return grupo
}

function textura(ruta: string, anisotropia: number): Promise<THREE.Texture> {
  return texturas.loadAsync(`${BASE}${ruta}`).then((t) => {
    // Convención glTF: las UV del modelo ya vienen con el origen arriba, así que la imagen
    // NO se voltea (con el flipY por defecto de three, la etiqueta saldría del revés).
    t.flipY = false
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = anisotropia
    return t
  })
}

/** Nombre de la pieza en Blender («Cuerpo | …»), subiendo hasta el nodo que lo lleve. */
function pieza(obj: THREE.Object3D): string {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) {
    if (/^(Cuerpo|Tapa|Tapón|Anilla|Base|Cuello|Bebida|Etiqueta)/.test(o.name)) return o.name
  }
  return ''
}

async function montarLata(lata: LataVisor, modo: 'lata' | 'torre', anisotropia: number, onHd: (t: THREE.Texture) => void) {
  if (lata.modelo) return montarBotella({ ...lata, modelo: lata.modelo })
  const hd = modo === 'lata'
  const base = await modelo(`lata_${lata.anilla}`)
  const grupo = base.clone(true)
  // En la torre van 45 latas a la vez: con la etiqueta de 1024 px cada una, la memoria gráfica
  // de un móvil normal se queda corta. La de 512 basta para el tamaño al que se ven ahí.
  const etiqueta = await textura(modo === 'torre' ? `etiquetas/${lata.slug}_torre.jpg` : `etiquetas/${lata.slug}.jpg`, anisotropia)
  const papel = new THREE.MeshStandardMaterial({ map: etiqueta, metalness: 0.15, roughness: 0.4, side: AMBAS })
  if (lata.apagada) {
    papel.color = new THREE.Color(0.18, 0.18, 0.2)
    papel.transparent = true
    papel.opacity = 0.45
  }
  const tapa = TAPAS[lata.tapa]
  const colorAnilla = COLOR_ANILLA[lata.colorAnilla ?? 'negro']
  const anillaMat = lata.anilla === 'aro_plateado' ? ALUMINIO : (lata.colorAnilla ?? 'negro') === 'negro' ? laca(colorAnilla, 0.35) : metal(colorAnilla, 0.3)
  let emblema: THREE.MeshStandardMaterial | undefined
  if (lata.anilla === 'logo_negra') {
    const mapa = await textura(`modelos/emblema_${lata.colorAnilla ?? 'negro'}.png`, anisotropia)
    // Fuera del grabado la imagen repite su borde (del color de la anilla): equivale al
    // «CLIP» del material de Blender.
    mapa.wrapS = mapa.wrapT = THREE.ClampToEdgeWrapping
    emblema = new THREE.MeshStandardMaterial({ map: mapa, metalness: 1, roughness: 0.3, side: AMBAS })
  }

  grupo.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const nombre = pieza(o)
    o.userData.slug = lata.slug
    if (nombre.startsWith('Cuerpo')) o.material = papel
    // El remache es parte de la tapa: del color de la tapa (en las negras salía plateado).
    else if (nombre.includes('remache_central')) o.material = lata.tapa === 'aluminio' ? PULIDO : tapa.reborde
    else if (nombre.startsWith('Anilla')) o.material = emblema && nombre.includes('logo') ? emblema : anillaMat
    else if (nombre.includes('doble_cierre')) o.material = tapa.reborde
    else if (nombre.startsWith('Tapa') || nombre.startsWith('Cuello')) o.material = tapa.panel
    else if (nombre.includes('aro_de_apoyo')) o.material = PULIDO
    else o.material = ALUMINIO
  })
  // El generador escala la lata de 500 ml (66 × 168 mm) por diámetro y altura; aquí igual.
  grupo.scale.set(lata.diametro / 66, lata.alto / 168, lata.diametro / 66)
  grupo.position.set(lata.x / 1000, lata.y / 1000, 0)
  grupo.userData.slug = lata.slug

  if (hd) {
    textura(`etiquetas/${lata.slug}_hd.jpg`, anisotropia)
      .then((t) => {
        papel.map = t
        papel.needsUpdate = true
        etiqueta.dispose()
        onHd(t)
      })
      .catch(() => {
        // Sin HD se queda la normal: se ve algo menos nítida, pero se ve.
      })
  }
  return grupo
}

export default function Visor3D({ latas, modo, fondo, onTocar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const tocarRef = useRef(onTocar)
  tocarRef.current = onTocar
  const clave = JSON.stringify(latas)

  useEffect(() => {
    const div = contenedor.current
    if (!div) return
    let vivo = true

    // Aviso en pantalla (cargando / error): si algo falla en el móvil, al menos se ve qué.
    const aviso = document.createElement('div')
    aviso.style.cssText = 'position:absolute;left:0;right:0;top:45%;text-align:center;font:14px sans-serif;color:#85838d;pointer-events:none'
    aviso.textContent = 'Cargando…'
    div.appendChild(aviso)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      aviso.textContent = 'Este móvil no deja usar el 3D (WebGL).'
      return () => aviso.remove()
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, modo === 'torre' ? 1.5 : 2))
    // El WebView puede medir 0 × 0 al montar (la vista nativa aún no tiene su tamaño): con un
    // tamaño 0 la proporción de la cámara sale NaN y el encuadre se rompe para siempre. Se usa
    // 1 × 1 de momento y el ResizeObserver de abajo pone el tamaño real en cuanto existe.
    renderer.setSize(Math.max(div.clientWidth, 1), Math.max(div.clientHeight, 1))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    div.appendChild(renderer.domElement)

    const escena = new THREE.Scene()
    escena.background = new THREE.Color(fondo)
    // Entorno de estudio para los reflejos del aluminio: sin él, un metal sale negro.
    const pmrem = new THREE.PMREMGenerator(renderer)
    escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const luz = new THREE.DirectionalLight(0xffffff, 1.2)
    luz.position.set(-1.5, 2, 2.5)
    escena.add(luz)

    const camara = new THREE.PerspectiveCamera(30, Math.max(div.clientWidth, 1) / Math.max(div.clientHeight, 1), 0.01, 50)
    const controles = new OrbitControls(camara, renderer.domElement)
    controles.enableDamping = true
    controles.enablePan = modo === 'torre'
    controles.autoRotate = modo === 'lata'
    controles.autoRotateSpeed = 1.5
    // Mientras nadie toque, el encuadre se rehace si cambia el tamaño; después, se respeta lo
    // que haya hecho el usuario.
    let tocado = false
    controles.addEventListener('start', () => {
      controles.autoRotate = false
      tocado = true
    })

    const anisotropia = renderer.capabilities.getMaxAnisotropy()
    const texturasHd: THREE.Texture[] = []
    const raiz = new THREE.Group()
    escena.add(raiz)

    let cargado = false
    const encuadrar = () => {
      if (!cargado || tocado || raiz.children.length === 0 || div.clientHeight < 2) return
      // Encuadre: que quepa todo con un poco de aire, visto de frente y algo desde arriba.
      const caja = new THREE.Box3().setFromObject(raiz)
      const centro = caja.getCenter(new THREE.Vector3())
      const tam = caja.getSize(new THREE.Vector3())
      const vertical = THREE.MathUtils.degToRad(camara.fov)
      const ajusteAlto = tam.y / 2 / Math.tan(vertical / 2)
      const ajusteAncho = tam.x / 2 / Math.tan(vertical / 2) / camara.aspect
      const distancia = Math.max(ajusteAlto, ajusteAncho) * (modo === 'lata' ? 1.35 : 1.12) + tam.z
      controles.target.copy(centro)
      camara.position.set(centro.x + distancia * 0.25, centro.y + distancia * 0.18, centro.z + distancia)
      controles.minDistance = distancia * 0.25
      controles.maxDistance = distancia * 2.5
      controles.update()
    }

    // allSettled y no all: si una lata falla, se ven las demás en vez de una pantalla vacía.
    Promise.allSettled(latas.map((l) => montarLata(l, modo, anisotropia, (t) => texturasHd.push(t)))).then((resultados) => {
      if (!vivo) return
      let fallos = 0
      let motivo = ''
      for (const r of resultados) {
        if (r.status === 'fulfilled') raiz.add(r.value)
        else {
          fallos++
          motivo ||= r.reason instanceof Error ? r.reason.message : String(r.reason)
        }
      }
      cargado = true
      // Con el motivo a la vista: si algo falla en un móvil concreto, se puede contar qué pone.
      aviso.textContent = fallos === resultados.length ? `No se han podido cargar las latas (${motivo}).` : fallos ? `No se han podido cargar ${fallos} latas (${motivo}).` : ''
      encuadrar()
    })

    // Tocar una lata (en la torre): un toque, no un arrastre para girar.
    const rayo = new THREE.Raycaster()
    let inicio: { x: number; y: number } | null = null
    const abajo = (e: PointerEvent) => {
      inicio = { x: e.clientX, y: e.clientY }
    }
    const arriba = (e: PointerEvent) => {
      if (!inicio || !tocarRef.current) return
      const movido = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y)
      inicio = null
      if (movido > 8) return
      const r = renderer.domElement.getBoundingClientRect()
      rayo.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara)
      const golpe = rayo.intersectObject(raiz, true)[0]
      const slug = golpe?.object.userData.slug as string | undefined
      if (slug) tocarRef.current(slug)
    }
    renderer.domElement.addEventListener('pointerdown', abajo)
    renderer.domElement.addEventListener('pointerup', arriba)

    const redimensionar = () => {
      const w = div.clientWidth
      const h = div.clientHeight
      if (w < 2 || h < 2) return
      renderer.setSize(w, h)
      camara.aspect = w / h
      camara.updateProjectionMatrix()
      encuadrar()
    }
    window.addEventListener('resize', redimensionar)
    const observador = new ResizeObserver(redimensionar)
    observador.observe(div)

    renderer.setAnimationLoop(() => {
      controles.update()
      renderer.render(escena, camara)
    })

    return () => {
      vivo = false
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', redimensionar)
      observador.disconnect()
      aviso.remove()
      controles.dispose()
      raiz.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material as THREE.MeshStandardMaterial
          if (m.map) m.map.dispose()
        }
      })
      texturasHd.forEach((t) => t.dispose())
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
    // `clave` resume `latas`: el array llega nuevo en cada render desde el lado nativo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, modo, fondo])

  // `position: fixed` por lo mismo que el mapa de Ludok Wallet: el contenedor del DOM
  // Component no tiene altura explícita y un 100% se quedaría en 0.
  return <div ref={contenedor} style={{ position: 'fixed', inset: 0, touchAction: 'none' }} />
}
