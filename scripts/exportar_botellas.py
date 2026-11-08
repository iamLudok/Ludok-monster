"""Exporta las botellas del proyecto Monster a GLB para la app (se ejecuta DENTRO de Blender).

Al revés que las latas (que comparten 4 modelos y la app les pone la etiqueta), cada botella
tiene su propia forma, así que se exporta entera, con sus texturas dentro, reducidas para el
móvil. Abre los .blend en modo lectura: no se guarda nada en el proyecto Monster.

  public/modelos/botella_<slug>.glb

Uso (desde la raíz de la app):
  blender --background --factory-startup --python scripts/exportar_botellas.py -- /ruta/al/proyecto/Monster
"""
import sys
from pathlib import Path

import bpy

MONSTER = Path(sys.argv[sys.argv.index('--') + 1])
SALIDA = Path(__file__).resolve().parent.parent / 'public' / 'modelos'
SALIDA.mkdir(parents=True, exist_ok=True)

BOTELLAS = {
    '0_botella_grande': 'monster_botella_grande_cerrada_fotos_v1',
    '0_monster_cubico': 'monster_monster_cubico_cerrada_fotos_v1',
}

for carpeta, nombre in BOTELLAS.items():
    bpy.ops.wm.open_mainfile(filepath=str(MONSTER / 'latas' / carpeta / 'modelos' / f'{nombre}.blend'))
    piezas = set(bpy.data.collections['LATA | piezas editables'].all_objects)
    for obj in list(bpy.data.objects):
        if obj not in piezas:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in piezas:
        obj.data.name = obj.name
    for img in bpy.data.images:
        if img.name.startswith('Etiqueta'):
            img.scale(2048, 1024)
        elif img.name.startswith('Tapa'):
            img.scale(512, 512)
    bpy.ops.export_scene.gltf(
        filepath=str(SALIDA / f'botella_{carpeta}.glb'),
        export_format='GLB',
        export_apply=True,
        export_image_format='JPEG',
        export_jpeg_quality=82,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_yup=True,
    )
    print(f'EXPORTADA: {carpeta}', flush=True)
