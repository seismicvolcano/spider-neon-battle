# Validación V0.3

Validado el 10 de octubre de 2026 (America/Santiago), Windows, Chrome headless, Node 24.19.0, Phaser 3.90.0 y Vite 6.4.4.

## Base y alcance

PR #2 estaba MERGED en GitHub, integrado en `origin/main` mediante `bf7de43`. Se creó `codex/v0.3-local-multiplayer` desde esa referencia; el PR V0.3 tiene base `main`. No se modificó directamente main ni se hizo merge de ningún PR.

La arena, raycast, aim assist, aceleración, control aéreo y combate V0.2 se mantienen. Se comparte la misma implementación por araña. Se corrigió una interacción física detectada por la nueva prueba: RB + LT al mismo tiempo podía cancelar el salto cuando el constraint se activaba al largo exacto. `WebSystem.beforeStep()` comprueba también la distancia del siguiente movimiento y deja la cuerda floja al moverse hacia el ancla. El momentum al liberar sigue siendo exactamente el mismo.

## Resultados

- `npm test`: **30/30**, incluyendo los tests originales de raycast/aim assist/armas y los controles actualizados a RB. Nuevos casos: A confirma sin saltar; LB por flanco; mappers separados; índices escasos/reservas/desconexión; modos/equipos/inmunidades; puntuación individual/cooperativa; daño letal atribuido a ejecutor; respawn con carga; cantidad/avisos/expiración/contacto barrido de rocas; audio silenciado/no disponible; conservación exacta de momentum y cuerda que no cancela el salto hacia el ancla.
- `npm run build`: correcto. Sin dependencias nuevas; Phaser/Vite conservan sus versiones. El bundle principal es aproximadamente 1.53 MB / 357 kB gzip, dominado por Phaser.
- `npm run dev -- --port 5175`: Vite inicia y sirve `http://127.0.0.1:5175/`.
- `npm run test:browser`: **70 comprobaciones** con Phaser/Matter reales y Gamepad API simulada; **sin errores de consola**.
- `npm run preview -- --port 4175`: smoke de producción correcto: tres combatientes cooperativos, cuenta regresiva, activación/render del terremoto, pausa, regreso al menú con A de P2 y ausencia de `window.__spiderGame`. Sin errores de consola.
- Revisión visual de menú, pantalla cooperativa, HUD de tres combatientes y advertencias de terremoto. Capturas locales ignoradas: `.playtest/v03-validated.png`, `.playtest/v03-coop.png`, `.playtest/v03-production-quake.png`.

El npm executable no está en PATH en este entorno. Los comandos se ejecutaron con `node .playtest/npm-tools/node_modules/npm/bin/npm-cli.js`, herramienta ya disponible en el directorio ignorado. Playwright se usó desde el runtime del entorno, sin añadirlo a package.json ni al lockfile.

## Circuito de navegador

El script conserva las 38 comprobaciones V0.2, con RB en los saltos y el nuevo comportamiento seguro de desconexión. Incluye recogida de armas, último aim, coyote time, buffer, cuerda tensa/floja, velocidad de lanzamiento exacta, espada con un impacto por swing, proyectiles bloqueados por plataformas, muerte/respawn de ambos bandos, río, victoria, revancha y un minuto de simulación de IA con semilla fija. Para ese circuito histórico se conserva el spawn cercano de IA de V0.2 dentro de la prueba; la partida normal V0.3 usa los spawns configurados.

Las comprobaciones V0.3 añaden:

1. Seleccionar P1 vs P2 y confirmar desde mandos simulados.
2. Dos dispositivos de índices **2 y 7**, asignaciones exclusivas y cuenta regresiva sin avance de física.
3. A no salta; P1 usa **RB + LT + RT + LS + RS** mientras P2 se mueve/apunta/dispara con otro estado de acción.
4. Desconectar P1, soltar la cuerda, pausar, conservar el mando de P2 y bloquear controles mantenidos al reconectar. P2 puede reanudar después de neutralizar ambos dispositivos.
5. LB consume exactamente una carga, no repite al mantenerlo y respeta los 700 ms de aviso. Rocas/avisos permanecen dentro del límite global y desaparecen. Respawn devuelve una carga y tres corazones.
6. Cooperativo: equipo compartido, bloqueo de daño aliado, rocas reales que no dañan ejecutor/aliado y sí al rival, un intento por objetivo, punto atribuido al ejecutor y victoria conjunta con puntos 2+1.
7. Revancha cooperativa con A de P2; modo y dispositivos se conservan y se reinicia la cuenta regresiva.
8. FFA: rocas dañan a los otros dos; aim off deja los gráficos vacíos y permite disparar/acertar con RS.
9. Mute sin errores, debug con tres arañas, modo mixto con propiedad exclusiva del teclado para P2.
10. **Eventos reales de teclado/mouse:** P2 mueve, salta con W, engancha/libera con RMB, apunta con cursor y dispara con LMB, mientras P1 mantiene su plaza de gamepad.
11. **AudioContext real** en estado running tras interacción; pausa detiene las voces y el tiempo simulado. Tecla D mantenida durante pausa no rearma el teclado hasta el keyup físico.
12. A desde pausa regresa a selección de modos.

## Referencias de plataforma

La reserva de dispositivos utiliza [Gamepad.index](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/index). La capa de sonido maneja la promesa de [AudioContext.resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), incluyendo rechazo; una interacción real puede reintentar la reanudación si un intento desde polling del mando quedó suspendido.

## Limitaciones verificadas

No hay dos mandos físicos disponibles para estas pruebas. **No se probó hardware Xbox USB/Bluetooth**: los dos dispositivos son objetos Gamepad API simulados con índices diferentes. La ergonomía, reconocimiento del navegador y compatibilidad física deben comprobarse en Windows con los mandos reales.

El estado running y los eventos de audio fueron comprobados, pero no se realizó una evaluación auditiva humana de la mezcla. Algunos navegadores pueden exigir click/tecla para habilitar audio aunque el juego se maneje con gamepad.

La IA tiene navegación local, sin pathfinding global; puede tardar en llegar a áreas lejanas. La cámara tiene zoom mínimo y puede dejar combatientes fuera de pantalla en extremos de arena; hay indicadores. La cuerda no hace wrapping. Si el navegador cambia el índice de un mando al reconectar, MAIN MENU permite asignarlo de nuevo. Los controles retenidos deben soltarse tras pausa/foco/reconexión. Las rocas usan detección barrida y no cuerpos Matter, por lo que no empujan ni alteran físicamente la geometría de la caverna.

## Prueba física pendiente

Conectar dos Xbox, activar cada dispositivo y elegir P1 vs P2. Cada persona prueba LS → RB → RS → LT → balanceo → soltar LT → recoger arma → RT; repetir RB + LT + RT + ambos sticks simultáneamente. Probar LB/avisos/esquiva, desconectar/reconectar un mando y reanudar desde el otro. Repetir cooperativo y FFA; después elegir la configuración mixta y verificar que mouse/teclado sólo afecta a P2. Revisar el volumen y comodidad de los sticks antes de ajustar INPUT/AI/EARTHQUAKE.
