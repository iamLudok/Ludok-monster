"""Prepara las texturas de la app a partir del proyecto Monster (Python con Pillow).

  public/etiquetas/<slug>.jpg      etiqueta de 1024 × 512 (torre y miniaturas)
  public/etiquetas/<slug>_hd.jpg   etiqueta de 2048 × 1024 (ficha de una lata)
  public/etiquetas/<slug>_torre.jpg  etiqueta de 512 × 256 (torre: 45 a la vez)
  public/modelos/emblema_<color>.png  garras de la anilla ya teñidas sobre el color de la anilla
  assets/miniaturas/<slug>.jpg     el frente de la etiqueta (±42°), para las listas
  src/lib/miniaturas.ts            los `require` de esas miniaturas (generado, no se edita)

Las miniaturas van en `assets/` y no en `public/` porque las pinta React Native, no el visor
3D: lo de `public/` solo lo ve el WebView.

No modifica nada del proyecto Monster: solo lee sus etiquetas v3.

Uso (desde la raíz de la app):
  /ruta/Monster/.venv/bin/python scripts/preparar_etiquetas.py /ruta/al/proyecto/Monster
"""
import sys
from pathlib import Path

from PIL import Image

MONSTER = Path(sys.argv[1])
APP = Path(__file__).resolve().parent.parent
ETIQUETAS = APP / 'public' / 'etiquetas'
MODELOS = APP / 'public' / 'modelos'
MINIATURAS = APP / 'assets' / 'miniaturas'
ETIQUETAS.mkdir(parents=True, exist_ok=True)
MINIATURAS.mkdir(parents=True, exist_ok=True)
slugs = []

for carpeta in sorted(p for p in (MONSTER / 'latas').iterdir() if p.is_dir()):
    # Botellas (carpetas 0_*): su etiqueta va dentro de su GLB (scripts/exportar_botellas.py);
    # aquí solo hace falta la miniatura para las listas.
    botella = carpeta.name.startswith('0_')
    origen = carpeta / 'texturas' / ('etiqueta_botella_v1.png' if botella else 'etiqueta_fotografica_v3.png')
    imagen = Image.open(origen).convert('RGB')
    if botella:
        ancho = round(imagen.width * 84 / 360)
        izquierda = (imagen.width - ancho) // 2
        imagen.crop((izquierda, 0, izquierda + ancho, imagen.height)).resize((144, 312), Image.LANCZOS).save(
            MINIATURAS / f'{carpeta.name}.jpg', quality=82, optimize=True)
        slugs.append(carpeta.name)
        print(f'MINIATURA DE BOTELLA: {carpeta.name}')
        continue
    imagen.resize((2048, 1024), Image.LANCZOS).save(ETIQUETAS / f'{carpeta.name}_hd.jpg', quality=80, optimize=True)
    imagen.resize((1024, 512), Image.LANCZOS).save(ETIQUETAS / f'{carpeta.name}.jpg', quality=80, optimize=True)
    imagen.resize((512, 256), Image.LANCZOS).save(ETIQUETAS / f'{carpeta.name}_torre.jpg', quality=82, optimize=True)
    # El frente de la lata está en el centro de la etiqueta (u = 0,5).
    ancho = round(imagen.width * 84 / 360)
    izquierda = (imagen.width - ancho) // 2
    frente = imagen.crop((izquierda, 0, izquierda + ancho, imagen.height))
    frente.resize((144, 312), Image.LANCZOS).save(MINIATURAS / f'{carpeta.name}.jpg', quality=82, optimize=True)
    slugs.append(carpeta.name)
    print(f'ETIQUETA: {carpeta.name}')

lineas = [f"  '{s}': require('../../assets/miniaturas/{s}.jpg')," for s in slugs]
(APP / 'src' / 'lib' / 'miniaturas.ts').write_text(
    '// GENERADO por scripts/preparar_etiquetas.py: no editar a mano.\n'
    '// El frente de cada etiqueta, para las listas (lo pinta React Native, no el visor 3D).\n'
    'export const MINIATURAS: Record<string, number> = {\n' + '\n'.join(lineas) + '\n}\n'
)


def srgb(lineal):
    """Los colores de crear_monster.py son lineales (Blender); una imagen se guarda en sRGB."""
    c = max(0.0, min(1.0, lineal))
    v = c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return round(v * 255)


# Mismos valores que crear_monster.py (TAB_COLORS y el color claro del grabado).
COLORES_ANILLA = {'negro': (0.0013, 0.0018, 0.0015), 'azul': (0.0, 0.05, 0.38), 'naranja': (0.38, 0.06, 0.0), 'morado': (0.08, 0.012, 0.30)}
GRABADO = (0.50, 0.54, 0.49)
mascara = Image.open(MONSTER / 'latas' / 'original_500ml' / 'texturas' / 'emblema_anilla.png').convert('L')
for nombre, color in COLORES_ANILLA.items():
    fondo = Image.new('RGB', mascara.size, tuple(srgb(c) for c in color))
    claro = Image.new('RGB', mascara.size, tuple(srgb(c) for c in GRABADO))
    Image.composite(claro, fondo, mascara).save(MODELOS / f'emblema_{nombre}.png', optimize=True)
    print(f'EMBLEMA: {nombre}')
