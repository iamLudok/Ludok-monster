#!/usr/bin/env python3
"""
Genera los iconos de la app a partir de una sola figura dibujada aquí.

Son varios tamaños de lo mismo: tenerlos como ficheros sueltos hechos a mano se desincroniza
en cuanto se retoca uno. Monocromo a propósito, como en todas las apps Ludok («Sala oscura»).

La figura es una pirámide de tres latas, la torre de la app. No se usa el logotipo de Monster:
es una marca registrada, y la app se reparte a amigos.

    python3 scripts/gen-assets.py

Los PNG resultantes SÍ se versionan: para compilar no hace falta Python ni Pillow.
"""
from PIL import Image, ImageDraw

BG = (10, 10, 12, 255)      # palette.bg
FG = (243, 241, 236, 255)   # palette.fg
TRANSPARENT = (0, 0, 0, 0)


def lata(d: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, unit: float) -> None:
    """Una lata de frente: cuerpo con borde, tapa más estrecha y una banda de etiqueta."""
    stroke = max(1, int(5 * unit))
    d.rounded_rectangle((x, y + 4 * unit, x + w, y + h), radius=6 * unit, outline=FG, width=stroke)
    d.rounded_rectangle((x + 4 * unit, y, x + w - 4 * unit, y + 6 * unit), radius=2 * unit, fill=FG)
    d.rounded_rectangle((x + 8 * unit, y + h * 0.42, x + w - 8 * unit, y + h * 0.58), radius=2 * unit, fill=FG)


def draw_glyph(size: int) -> Image.Image:
    # Se dibuja al cuádruple y se reduce: bordes suaves sin antialias a mano.
    s = size * 4
    img = Image.new('RGBA', (s, s), TRANSPARENT)
    d = ImageDraw.Draw(img)
    u = s / 100.0
    w, h = 30 * u, 42 * u
    lata(d, 35 * u, 8 * u, w, h, u)           # arriba
    lata(d, 18 * u, 52 * u, w, h, u)          # abajo izquierda
    lata(d, 52 * u, 52 * u, w, h, u)          # abajo derecha
    return img.resize((size, size), Image.LANCZOS)


def write(path: str, size: int, background, scale: float) -> None:
    canvas = Image.new('RGBA', (size, size), background)
    inner = int(size * scale)
    glyph = draw_glyph(inner)
    offset = (size - inner) // 2
    canvas.alpha_composite(glyph, (offset, offset))
    canvas.save(path)
    print(f'  {path}  {size}×{size}')


if __name__ == '__main__':
    print('Generando iconos…')
    write('assets/icon.png', 1024, BG, 0.8)
    # Adaptativo de Android: el sistema recorta un círculo, la figura tiene que caber en el
    # ~66 % central o se come los bordes.
    write('assets/android-icon-foreground.png', 1024, TRANSPARENT, 0.6)
    write('assets/splash-icon.png', 512, TRANSPARENT, 0.9)
    print('Listo.')
