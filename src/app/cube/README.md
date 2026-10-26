# `src/app/cube/`: the cube

Everything about how the cube works lives in this folder, and nothing outside it knows. If you are looking for how something about the cube works, find its layer below and open that file.

Design and reasoning: [CUBE_DESIGN.md](../../../CUBE_DESIGN.md). To understand how it all works, step by step, read [ENGINE_MANUAL.md](../../../ENGINE_MANUAL.md). This file is the map of the code.

## Using the cube

On any page, put the component in the template, give it a size, give it a program, run it:

```html
<app-cube #cube class="block h-96 w-96" [program]="program" [autoplay]="true" />
```

```ts
import { CubeComponent } from '../../cube';   // always import from the folder, never from inside it
```

To put pictures on the faces, give it an environment (shown at once, and kept through runs and resets):

```html
<app-cube #cube [environment]="{ background: { FRONT: pixels } }" />   <!-- pixels: 64 * 64 colors, from pixelate() -->
```

Anything else is on the template reference: `cube.run(program)`, `cube.stop()`, `cube.reset()`, `cube.showFace(face)`, `cube.spin()`, and the signals `cube.running()`, `cube.problem()` and `cube.camera()`. The full list is at the top of [component/cube.component.ts](component/cube.component.ts).

The editor page does exactly this, plus a side panel with two tabs next to the cube ([pages/editor/](../pages/editor/)): the program area, and the background panel, where the user picks a picture, crops it to a square and chooses the faces it goes on.

## The layers

Each layer does one thing and only uses the layers above it in this table. The data flows down:

```
program (JSON) ──▶ interpreter + scheduler ──▶ world ──▶ renderer ──▶ state ──▶ 3D view
                         │                       ▲
                         └──── commands ─────────┘
                                   │
                                 blocks (what each block is and does)

environment (pictures on the faces) ──painted onto the world's background by the engine
```

| Folder | File | The one thing it does |
| --- | --- | --- |
| `state/` | `cube-state.ts` | The pixel buffer: one 64×64 grid of colors per face. The meeting point between the engine and whatever shows it |
| `geometry/` | `geometry.ts` | Answers "if an object steps this way, where does it end up?": the strip, the top face, headings, edges, the floor |
| `drawing/` | `pixel.ts`, `shapes.ts`, `bitmap.ts` | Draws pixels, lines, rectangles, circles and pictures on one face of a state |
| `world/` | `cube-object.ts`, `world.ts` | Stores what exists: the objects and the background layer |
| `blocks/` | `object/`, `background/`, `control/` | **One file per block**, in the folder of its category: its type, its fields and what it does. See [blocks/README.md](blocks/README.md) |
| | `index.ts` | Joins the categories: the `Block` types and the definition of a block by its `op` |
| | `block-definition.ts`, `fields.ts` | What every block file must provide, and the kinds of field value |
| `program/` | `program.ts` | The shape of a program: scripts, triggers and config (the JSON contract with Blockly and the Pi) |
| | `names.ts` | Converts readable names (`'FRONT'`, `'#ff0000'`) to engine values |
| | `validate-program.ts` | Checks that something really is a program, with errors that say where. Reads each block's schema from `blocks/` |
| `commands/` | `apply-command.ts` | Looks up a command in `blocks/` and applies it to the world |
| `runtime/` | `interpreter.ts` | Runs the blocks of one script, pausing at `wait` and between loop iterations |
| | `scheduler.ts` | Decides when each script gets its turn |
| `environment/` | `environment.ts` | The stage a program runs on: the picture of each face. Painted onto the background by the engine, and kept through runs and resets |
| | `pixelate.ts` | Shrinks a picture (raw RGBA bytes) to the 64×64 of a face the way the Raspberry Pi library does (box filter) |
| `renderer/` | `renderer.ts` | Turns the world into pixels |
| `engine/` | `cube-engine.ts` | Puts the layers together; pure, takes the time as an argument |
| | `run-loop.ts` | A timer that ticks at a steady rate |
| | `cube-player.ts` | Engine plus a real clock: `play(program)` and it runs |
| `view/` | `cube-view.ts` | Shows a state as a 3D cube in an element |
| | `cube-model.ts`, `stage.ts`, `camera-rig.ts`, `view-settings.ts` | The cube model, the lights and pedestal, the camera, and the measures |
| `component/` | `cube.component.ts` | `<app-cube>`: the player and the view as one Angular component |
| `examples/` | `example-programs.ts` | Sample programs for demos and as a starting point |
| (root) | `index.ts` | The public surface of the folder |
| | `errors.ts` | `ProgramError` (the program is wrong) and `EngineError` (it broke while running) |

Rules that keep it this way:

- **Everything up to `engine/` is plain TypeScript.** No Angular, no three.js, no DOM. That is what lets the same logic be written in Python for the Raspberry Pi.
- **Only `view/` knows three.js. Only `component/` knows Angular.**
- **The engine never reads a clock.** The time is always passed in.
- Every file starts with a comment saying what its layer does and does not do.

## Common changes

**Add a block** (for example `turn`): create its file in the folder of its category in `blocks/` and register it in that folder's `index.ts`. Nothing else changes. Step by step in [blocks/README.md](blocks/README.md#add-a-block).

**Change what the editor offers for the background:** `pages/editor/background-panel.component.ts` (the steps) and `image-cropper.component.ts` (the square cropper, whose math is in `crop.ts`). To add another way to handle the background (a color, a pattern), add a mode to the panel and put whatever it produces in the `Environment` type (`environment/environment.ts`).

**Change how faces connect, headings or the floor:** `geometry/geometry.ts`. Nothing else computes edges.

**Change when scripts run:** `runtime/scheduler.ts`. **Change what a loop or wait means:** `runtime/interpreter.ts`.

**Change how things are drawn on the cube:** `renderer/renderer.ts`. **How the 3D cube looks:** `view/`.

## Tests

Every layer has a `*.spec.ts` next to it, and they run without a browser: `npm test`. The 3D view and the component need WebGL and are not covered by tests.
