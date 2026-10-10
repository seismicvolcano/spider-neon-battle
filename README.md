# Spider Neon Battle — V0.3

Combate local para una o dos personas en la caverna procedural original, con telarañas físicas, espada/pistola, efectos electrónicos originales y **Neon Earthquake**. P1 es cyan, P2 magenta y la IA naranja. Cada combatiente conserva su cuerpo Matter, arma, telaraña, corazones, puntuación, controlador y carga sísmica independientes.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+ y npm.

```bash
npm install
npm run dev
npm test
npm run build
```

Abre la URL que imprime Vite, normalmente http://127.0.0.1:5173. `npm run preview` sirve el build de `dist/`. El juego no descarga assets ni sonidos.

## Modalidades y dispositivos

El menú permite elegir **P1 vs IA**, **P1 vs P2**, **P1 + P2 vs IA** o **P1 vs P2 vs IA**. Usa LS/D-pad arriba/abajo para la modalidad, izquierda/derecha para dispositivos y A para confirmar. También puedes usar flechas + Enter o hacer clic en una modalidad.

- **Auto:** dos mandos estándar se asignan a P1/P2 por sus índices de Gamepad API; con uno, P1 usa el mando y P2 teclado/mouse. En solitario sin mando, P1 usa teclado/mouse.
- **Two gamepads:** reserva una plaza distinta para cada mando. La partida espera si falta un dispositivo.
- **P1 gamepad + P2 keyboard/mouse:** asignación explícita; un segundo mando no toma el teclado de P2.
- Dos personas requieren dos mandos o un mando más teclado/mouse. Un único teclado/mouse controla una sola araña.

Conecta los mandos Xbox USB/Bluetooth, da foco al navegador y pulsa un botón en cada uno para que Gamepad API los exponga. Se aceptan dispositivos con `mapping: 'standard'`, como los Xbox en Chrome/Edge. Cada plaza conserva `Gamepad.index` e identidad durante la partida. Una desconexión libera telarañas, limpia entradas y pausa; el otro mando conserva su jugador. Reconecta, suelta sticks/botones y pulsa Menu/Esc para reanudar. Si el navegador asigna otro índice o necesitas cambiar dispositivos, vuelve a MAIN MENU y elige la configuración de nuevo.

Hay cuenta regresiva **3–2–1–GO** antes de cada partida y revancha. La primera persona en conseguir tres eliminaciones gana. En cooperativo se suman los puntos de P1 y P2, ambos comparten victoria y el daño aliado está deshabilitado por defecto. En todos contra todos, los tres son rivales. A/Enter/R o REMATCH inicia otra partida en el mismo modo. Menu/Esc pausa todo, incluyendo IA, proyectiles, respawn, rocas y cuenta regresiva; perder foco también pausa. MAIN MENU está disponible durante pausa, espera y victoria.

## Controles Xbox estándar

| Entrada | Índice / acción |
| --- | --- |
| LS horizontal | Eje 0: movimiento y balanceo, deadzone 0.20 |
| RS | Ejes 2/3: dirección normalizada de aim, deadzone 0.23 |
| **RB** | **5: salto por flanco**, coyote time y jump buffer |
| LT | 6: lanzar/mantener telaraña; soltar conserva momentum |
| RT | 7: atacar; mantener repite según cooldown del arma |
| **LB** | **4: Neon Earthquake**, una activación por respawn |
| A | 0: confirmar menú / revancha; no salta |
| Menu | 9: pausa / reanudar |
| D-pad / LS en menú | Elegir modo y dispositivos |

RB + LT + RT + LS + RS pueden usarse simultáneamente. LB no cambia armas ni RB ataca. X/B/Y/clicks de sticks no tienen acciones. Las armas se recogen automáticamente al tocarlas cuando no llevas otra.

## Teclado y mouse

| Entrada | Acción |
| --- | --- |
| A / D | Mover y balancear |
| W / Space | Saltar |
| Mouse | Apuntar en coordenadas del mundo |
| RMB | Telaraña; soltar conserva velocidad |
| LMB | Atacar |
| Q | Terremoto |
| Esc | Pausa / reanudar |
| Enter / R | Revancha; R también reinicia una partida activa |
| Flechas + Enter / Space en menú | Selección y confirmación |
| M | Mute |
| F1 | Debug de cuerpos, raycast, cuerda, velocidad y aim |

Al volver del foco, pausa o reconexión hay que soltar los controles una vez para evitar acciones atascadas. El teclado/mouse se asigna a P2 en una partida mixta y a P1 en solitario sin mando.

## Neon Earthquake

LB/Q consume una carga, suena un retumbo y la cámara tiembla ligeramente. Columnas y marcas neón anuncian los lugares de caída. Después de **700 ms**, hasta **8 rocas** se desprenden de techos/plataformas sobre las zonas rivales, escalonadas durante **2.5 s**. El aviso permanece hasta que cae cada roca. Cada impacto válido quita un corazón y produce knockback; el punto de una eliminación pertenece al ejecutor.

El ejecutor y sus aliados cooperativos siempre son inmunes a sus rocas. Los rivales pueden esquivar las columnas. Los puntos de aparición se mantienen lejos de combatientes vivos; el respawn tiene protección temporal. Cada roca sólo intenta un impacto por objetivo y desaparece al tocar geometría, expirar o salir del mundo. La capacidad global es **24 rocas/avisos** entre todos los poderes. Si no hay espacio o zonas válidas, la carga se conserva. No se crean cuerpos Matter: se usan contactos barridos de círculo contra combatientes en movimiento y rayos barridos contra geometría. No se alteran plataformas ni superficies del raycast de telaraña. El respawn devuelve tres corazones y una carga. El HUD indica READY/USED.

La IA fácil intenta usar el poder a partir de 8.5 s y después como máximo cada 12 s, con probabilidad del 30 %, siempre limitada por su carga. Selecciona un rival vivo; nunca elige a un miembro de su equipo.

## Combate, apuntado y cámara

- Espada: swing de 180 ms, cooldown 520 ms, alcance 91 px, un contacto por objetivo y swing, knockback con aporte de velocidad relativa.
- Pistola: diez disparos, cooldown 340 ms, velocidad 1150 px/s, raycast continuo que respeta paredes y elimina el proyectil al primer contacto rival. Los disparos atraviesan aliados cuando friendly fire está apagado.
- Daño: chispas, pulso, sonido, knockback y 900 ms de invulnerabilidad. Muerte: punto, liberación de telaraña, pérdida de arma, respawn tras 1.1 s con 1.2 s de protección. El río rebota sin daño.
- Aim: línea tenue de 28 px, sin flecha ni círculo. El menú permite apagarla; `WEB.aimIndicatorMode` admite `'minimal'` o `'off'`. El stick recuerda la dirección. Ocultar la línea no afecta disparos, aim assist ni raycast. Debug conserva el rayo completo.
- Cámara: encuadra el conjunto de combatientes vivos con seguimiento/zoom suaves, límites 0.48–1.15 y límites del mundo. Indicadores discretos identifican combatientes fuera de pantalla cuando el zoom mínimo no basta. No hay pantalla dividida.
- IA: Easy por defecto, Normal seleccionable; busca armas, rodea obstáculos locales, salta ante bordes y usa telaraña. Sigue el mismo ActionState y las mismas físicas que las personas.

## Audio original

`AudioSystem.js` centraliza 18 patches procedurales con osciladores Web Audio: recogida, activación/impacto de espada, disparo/acierto, salto, lanzamiento/enganche/liberación de telaraña, daño, muerte, río, terremoto, caída/impacto de roca, victoria y navegación/confirmación. No hay muestras de obras externas. Los efectos son breves, con envolvente, volumen general, mute, máximo de diez voces y límite de repetición por evento.

El contexto se crea/reanuda tras interacción. Si el navegador bloquea audio iniciado con gamepad, haz clic o pulsa una tecla para habilitarlo. El juego funciona con audio silenciado o API no disponible. El menú ofrece volumen y mute; M alterna mute durante la partida. No hay música en esta versión.

## Arquitectura y configuración

Se conserva `GameScene.js` para arena, simulación fija a 60 Hz, cámara y partida; `Spider.js` para locomoción y cuerpo parametrizado; `WebSystem.js` por araña; `InputSystem.js`/`actions.js` para ActionState; `EnemyAI.js` y `CombatSystem.js` compartidos. Se añaden `DeviceAssignments.js` (reservas exclusivas), `matchRules.js` (modos/equipos/puntos), `EarthquakeSystem.js` y `AudioSystem.js`.

Se mantienen la aceleración, control aéreo, coyote time, jump buffer, impulso tangencial, límite de velocidad, momentum al liberar y rebote originales. La cuerda sólo tira cuando está tensa y el próximo movimiento no la afloja: saltar hacia el ancla al pulsar RB y LT juntos conserva el impulso del salto. `raycast.js` y la selección de aim assist se mantienen: rayo exacto primero, luego pequeñas correcciones hasta ±10°, sin saltarse paredes ni exceder alcance.

`src/config.js` centraliza botones y dispositivo por defecto, aim, audio, cuenta regresiva, fuego aliado, carga, número/límite/avisos/duración/dispersión/daño/knockback de rocas, cámara, dificultad de IA y puntos para ganar. Velocidades de locomoción: unidades Matter por tick; proyectiles y rocas: px/s.

## Validación

`npm test` mantiene las pruebas originales y añade RB/A/LB, dos ActionState, asignación exclusiva/desconexión, modos/equipos, inmunidades, daño y puntuación, carga por respawn, límites/expiración de rocas y audio silencioso. `npm run build` genera producción.

Para integración opcional con Chrome y Playwright instalado fuera de las dependencias del juego:

```bash
npm run dev
npm run test:browser
```

`GAME_URL` permite otro puerto; `PLAYWRIGHT_MODULE` puede apuntar a una URL file del módulo instalado. `scripts/playtest.mjs` conserva el circuito V0.2, actualizado a RB, y simula dos mandos de índices 2 y 7 sobre Phaser/Matter reales. Comprueba salto/balanceo/aim/ataque simultáneos, reserva/reconexión, cuenta regresiva, pausa, cooperativo, FFA, rocas, revancha, aim oculto y teclado/mouse exclusivo. Guarda `.playtest/v03-validated.png` y exige consola sin errores. La referencia `window.__spiderGame` sólo existe en desarrollo.

Consulta [docs/validation-v0.3.md](docs/validation-v0.3.md) para resultados, comandos y limitaciones verificadas. No se probaron dos mandos físicos en este entorno; la compatibilidad USB/Bluetooth y comodidad de los controles requieren validación en hardware.

## Límites

IA con navegación local, sin pathfinding global; puede tardar en llegar a plataformas lejanas. Cámara compartida con alejamiento acotado, sin garantía de encuadrar toda la arena en ventanas pequeñas. Cuerda sin wrapping alrededor de obstáculos. Sólo dos humanos, sin online, niveles nuevos, destrucción permanente, bombas, inventario complejo, progresión ni cuentas. Phaser y Vite siguen siendo las únicas dependencias del juego.
