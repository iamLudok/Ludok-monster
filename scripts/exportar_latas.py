"""Exporta la geometría de las latas a GLB para la app (se ejecuta DENTRO de Blender).

Las 45 latas del proyecto Monster comparten la misma geometría base (crear_monster.py la escala
por diámetro y altura): solo cambian la etiqueta, los colores de tapa y anilla y el tipo de anilla.
Así que se exporta UN modelo por tipo de anilla, sin etiqueta, y la app le pone a cada lata su
etiqueta, sus colores y su escala. Las etiquetas salen aparte con `preparar_etiquetas.py`.

Abre los .blend en modo lectura: no se guarda nada en el proyecto Monster.

Uso (desde la raíz de la app):
  blender --background --factory-startup --python scripts/exportar_latas.py -- /ruta/al/proyecto/Monster
"""
import sys
from pathlib import Path

import bpy

MONSTER = Path(sys.argv[sys.argv.index('--') + 1])
SALIDA = Path(__file__).resolve().parent.parent / 'public' / 'modelos'
SALIDA.mkdir(parents=True, exist_ok=True)

# Una lata de 500 ml de cada tipo de anilla: en 500 ml la escala del generador es 1:1.
MUESTRAS = {
    'aro_plateado': 'juiced_mango_loco_500ml',
    'aro_negro': 'lando_norris_500ml',
    'negra_lisa': 'juiced_ripper_500ml',
    'logo_negra': 'original_zero_sugar_500ml',
}

for estilo, slug in MUESTRAS.items():
    bpy.ops.wm.open_mainfile(filepath=str(MONSTER / 'latas' / slug / 'modelos' / f'monster_{slug}_cerrada_fotos_v3.blend'))
    piezas = set(bpy.data.collections['LATA | piezas editables'].all_objects)
    for obj in list(bpy.data.objects):
        if obj not in piezas:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in piezas:
        # Los nombres de objeto («Cuerpo | …», «Tapa | …», «Anilla | …») son los que usa la app
        # para decidir qué material lleva cada pieza: se copian a la malla para que lleguen al GLB.
        if obj.type == 'MESH':
            obj.data.name = obj.name
        # Toros y tornos de 256 segmentos: en un móvil sobra resolución. El cuerpo NO se toca,
        # porque sus UV son las de la etiqueta.
        if obj.type == 'MESH' and not obj.name.startswith('Cuerpo') and len(obj.data.vertices) > 1500:
            obj.modifiers.new('Ligero para móvil', 'DECIMATE').ratio = 0.3
    # Sin texturas dentro del GLB: la etiqueta la pone la app, lata a lata.
    for mat in bpy.data.materials:
        if mat.node_tree:
            for node in [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE']:
                mat.node_tree.nodes.remove(node)
    bpy.ops.export_scene.gltf(
        filepath=str(SALIDA / f'lata_{estilo}.glb'),
        export_format='GLB',
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_yup=True,
    )
    print(f'EXPORTADO: {estilo} (de {slug})', flush=True)
