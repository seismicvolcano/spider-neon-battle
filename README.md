# Spider Neon Battle — V0.1

Prototipo de locomoción 2D: una araña, una caverna neón y una telaraña física. Sin enemigos, daño, puntuación ni assets externos.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+ y npm.

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente http://127.0.0.1:5173). `npm run build` genera `dist/`; `npm run preview` sirve ese build.

## Controles

| Entrada | Acción |
| --- | --- |
| A / D | Correr, control aéreo, impulsar el balanceo |
| W / Space | Saltar; coyote time y pequeño buffer, sin doble salto |
| Mouse | Apuntar; cursor cyan si hay una superficie alcanzable |
| Mantener botón derecho | Lanzar y mantener la telaraña |
| Soltar botón derecho | Soltar conservando la velocidad actual |
| R | Volver al inicio y eliminar la telaraña |
| F1 | Alternar cuerpos, raycast, anclaje, constraint y velocidad |

El botón izquierdo está reservado y no hace nada. Si un disparo falla, suelta y pulsa de nuevo. La dirección del cursor se prolonga hasta el alcance máximo. La telaraña no se enrolla alrededor de obstáculos en esta versión. La zona inferior impulsa hacia arriba sin daño. Perder foco suelta la cuerda y limpia el movimiento para evitar entradas atascadas.

## Arquitectura

- `src/GameScene.js`: arena procedural de 3000 × 1900 px, cristal sólido, cámara, río de energía, HUD debug y simulación Matter a 60 Hz independiente del refresco.
- `src/Spider.js`: cuerpo circular Matter, suelo detectado por sondas sobre superficies con normal válida, movimiento arcade, salto y dibujo procedural de ocho patas.
- `src/WebSystem.js`: apuntado en coordenadas del mundo, anclaje exacto, constraint que tira cuando está tenso y liberación sin cambiar la velocidad.
- `src/raycast.js`: primera intersección del segmento con los polígonos físicos; incluye pendientes y partes de cuerpos compuestos.
- `src/main.js`: inicio de Phaser 3 con Matter Physics.

## Parámetros

Edita `GAMEPLAY` en `src/config.js`: aceleración, velocidad, salto, control aéreo, coyote time, alcance, rigidez, damping, fuerza de balanceo, velocidad de seguridad, rebote y cámara. Velocidades expresadas en unidades Matter (px por tick de 1/60 s); fuerzas aplicadas por tick fijo. El límite terrestre no recorta el momentum aéreo de la cuerda.

## Validación

```bash
npm test
npm run build
```

Las pruebas verifican impactos exactos y la superficie más cercana, pendientes, alcance y exclusión de sensores. Para probar el game feel: desde la plataforma inicial corre con D, salta, apunta al bloque superior, mantén botón derecho, acelera con A/D siguiendo el arco, suelta para volar y vuelve a engancharte. Prueba también el cristal central, el rebote inferior, R y F1.
