# Virtual Cube Command API

The virtual cube is the **source of truth** for both the physical Raspberry Pi LED cube and the web-based visualization and control interface. Renderers are only outputs.

## Contents

1. [Purpose](#1-purpose)
2. [Design principle](#2-design-principle)
3. [Core command categories](#3-core-command-categories)
4. [2D drawing operations](#4-2d-drawing-operations)
5. [Cube-aware operations](#5-cube-aware-operations)
6. [What should not be part of the virtual cube](#6-what-should-not-be-part-of-the-virtual-cube)
7. [Physical panel identity vs. cube face](#7-physical-panel-identity-vs-cube-face)
8. [Initial API](#8-initial-api)
9. [Rendering architecture](#9-rendering-architecture)
10. [Initial implementation goal](#10-initial-implementation-goal)
11. [Core philosophy](#11-core-philosophy)
12. [Objects, movement and execution model](#12-objects-movement-and-execution-model)

---

## 1. Purpose

The virtual cube must not know anything about HUB75, Raspberry Pi GPIO, panel wiring, or `rpi-rgb-led-matrix`. Its job is to represent the cube, its surfaces, pixels, objects, and drawing operations.

```
VIRTUAL WORLD
     │
     ▼
CUBE GEOMETRY
     │
     ▼
PANEL MAPPING
     │
     ▼
HARDWARE RENDERER
     │
     ▼
rpi-rgb-led-matrix
     │
     ▼
HUB75
     │
     ▼
PHYSICAL CUBE
```

The web renderer follows the same virtual-world concepts but does not need to know anything about the physical hardware.

## 2. Design principle

The virtual cube exposes drawing and world-level commands, never Raspberry Pi-specific ones.

```ts
cube.setPixel(...)
cube.drawLine(...)
cube.fillRect(...)
```

- The **Raspberry Pi renderer** converts the resulting virtual representation into the physical LED-panel layout.
- The **browser renderer** converts the same representation into a visual web representation.

This means application logic can be shared between both environments.

## 3. Core command categories

The API is organized into levels.

### Level 1: pixel operations

The lowest-level operations.

| Command | Description | Example |
| --- | --- | --- |
| `clear(color)` | Sets the entire virtual cube surface to a color. | `cube.clear(BLACK)` |
| `setPixel(x, y, z, color)` | Changes one virtual pixel. | `cube.setPixel(x, y, z, RED)` |
| `getPixel(x, y, z)` | Returns the current color of a virtual pixel. | `color = cube.getPixel(x, y, z)` |

> The exact coordinate representation may evolve (the current implementation addresses a pixel as `face, x, y`). The important point is that the caller works with the virtual cube, not with a physical panel.

## 4. 2D drawing operations

Each visible cube face is fundamentally a 64×64 surface, so the virtual cube provides familiar 2D drawing primitives:

```ts
drawLine(...)
drawRect(...)
fillRect(...)
drawCircle(...)
fillCircle(...)
drawText(...)
drawBitmap(...)
```

These commands operate on the virtual surface. The caller does not need to know which physical panel represents that surface.

## 5. Cube-aware operations

This is where the virtual cube becomes more powerful than a normal LED matrix. The system understands that the five visible faces are connected.

```ts
drawOnFace(face, ...)
drawAcrossEdge(...)
```

An object reaching the edge of one face can continue onto another face.

```
             FRONT
        ┌──────────────┐
        │          ●───┼──────┐
        │              │      │
        └──────────────┘      │
                         RIGHT│
                         ┌────┴───────┐
                         │●           │
                         └────────────┘
```

The application never calculates the new coordinates by hand. The cube geometry and mapping layer performs that transformation, so an object can simply keep moving and the virtual cube works out which face and coordinates represent it. See [section 12](#12-objects-movement-and-execution-model) for how this works.

## 6. What should not be part of the virtual cube

Raspberry Pi and `rpi-rgb-led-matrix` configuration belongs to the hardware renderer. The virtual API must **not** contain things such as:

```
--led-gpio-mapping
--led-slowdown-gpio
--led-chain
--led-row-addr-type
```

These are hardware and display-backend concerns. The separation stays as follows:

```
Virtual Cube
    │  drawing / world commands
    ▼
Cube Mapper
    │  virtual → physical coordinates
    ▼
Panel Mapper
    │  face → panel → chain position
    ▼
rpi-rgb-led-matrix
    │
    ▼
HUB75
```

This preserves the independence of the virtual world.

## 7. Physical panel identity vs. cube face

The virtual cube also stays independent of the physical panel numbering. Physical panels have permanent identities (`#1` to `#5`), but those identities are not hardcoded to cube faces.

| Face | Configuration A | Configuration B |
| --- | --- | --- |
| TOP | #4 | #3 |
| FRONT | #5 | #5 |
| RIGHT | #2 | #2 |
| BACK | #1 | #1 |
| LEFT | #3 | #4 |

The virtual cube remains unchanged between configurations. Only the mapping configuration changes. The same applies to the HUB75 chain order. These are three independent concepts:

| Concept | Values |
| --- | --- |
| Panel identity | `#1` `#2` `#3` `#4` `#5` |
| Cube face assignment | `TOP` `FRONT` `RIGHT` `BACK` `LEFT` |
| HUB75 chain position | `0` `1` `2` `3` `4` |

## 8. Initial API

The first implementation stays intentionally small.

| Group | Commands |
| --- | --- |
| Core | `clear()`, `setPixel()`, `getPixel()` |
| Drawing | `drawLine()`, `drawRect()`, `fillRect()`, `drawCircle()`, `fillCircle()`, `drawText()`, `drawBitmap()` |
| Cube | `drawOnFace()`, `drawAcrossEdge()` |
| Future | `Sprite`, `Object`, `Animation`, `Transform` |

Not everything needs to be implemented immediately. The first important milestone is establishing the virtual coordinate system and making basic drawing operations work correctly across the cube's connected surfaces.

## 9. Rendering architecture

The same virtual-world state can be rendered by different targets.

```
        APPLICATION
             │
             ▼
       VIRTUAL CUBE
             │
   ┌─────────┴─────────┐
   ▼                   ▼
Raspberry Pi       Web Browser
 Renderer           Renderer
   │                   │
   ▼                   ▼
Panel Mapping    Web Visualization
   │
   ▼
rpi-rgb-led-matrix
   │
   ▼
HUB75
   │
   ▼
Physical Cube
```

> **The virtual cube is the source of truth. Renderers are outputs.**

This allows cube behavior to be developed and tested without the physical cube connected.

## 10. Initial implementation goal

The first version of the virtual cube focuses on:

1. Defining the cube coordinate system.
2. Representing its five visible faces.
3. Defining how the faces connect at their edges.
4. Implementing pixel operations.
5. Implementing basic 2D drawing primitives.
6. Creating the mapping from virtual pixels to physical panels.
7. Rendering the same virtual state to both the Raspberry Pi and the web.

Once those foundations work, higher-level features such as sprites, animations, games, physics, and interactive objects are built on top of them.

## 11. Core philosophy

`rpi-rgb-led-matrix` is treated primarily as a hardware and display backend, not as the cube engine itself. The cube engine is hardware-independent.

```
Virtual World
     ↓
Cube Geometry
     ↓
Rendering / Mapping
     ↓
Output Device
```

This separation lets the physical cube and the web visualization share the same standardized virtual-world system.

---

## 12. Objects, movement and execution model

Design decisions for the object-based environment that users program with Blockly. Users create objects and give them commands, instead of switching LEDs on and off.

### 12.1 Layers

```
Blockly workspace
      │  serialized as a JSON program (the contract between engines)
      ▼
Interpreter + scheduler      scripts run as resumable tasks
      │  mutates
      ▼
World                        objects + persistent background layer
      │  read by
      ▼
Renderer                     background copy, then objects on top
      │
      ▼
CubeState  →  3D cube / Raspberry Pi
```

The engine exists **twice**: TypeScript (browser) and Python (Raspberry Pi), so the Pi can run programs on its own. The JSON program format is the contract between them, and both implementations must pass the same golden tests (a program plus the expected pixels after N ticks).

### 12.2 Surfaces

The four side faces form one wrapping **strip** of 256×64 cells, in the order `FRONT, RIGHT, BACK, LEFT`. Going right on the strip goes right around the cube, and the last side wraps to the first. `x` grows to the right as seen from outside, `y` grows downward, and `y = 0` is the top row. **TOP** is a separate 64×64 surface.

```
┌───────┬───────┬───────┬───────┐
│ FRONT │ RIGHT │ BACK  │ LEFT  │ ← wraps around
└───────┴───────┴───────┴───────┘
   x: 0..63  64..127  128..191  192..255
```

TOP is stored the way the cube state and the 3D view store it: seen from above with FRONT at the bottom.

```
              y = 0  (touches BACK)
        ┌──────────────┐
x = 0   │              │   x = 63
(LEFT)  │     TOP      │   (RIGHT)
        │              │
        └──────────────┘
              y = 63 (touches FRONT)
```

**Edge table.** It gives the coordinates on TOP as stored (`c` is the column of the object on the side, `0..63`), and the direction of travel after crossing.

| Side | Side top row → TOP | TOP → side top row | Travel onto TOP | Travel onto the side |
| --- | --- | --- | --- | --- |
| FRONT | `(c, 63)` | `x = c` | north | south |
| RIGHT | `(63, 63 − c)` | `c = 63 − y` | west | south |
| BACK | `(63 − c, 0)` | `c = 63 − x` | south | south |
| LEFT | `(0, c)` | `c = y` | east | south |

### 12.3 Objects and heading

An object stores a **pose**:

| Field | Meaning |
| --- | --- |
| `surface` | `strip` or `top` |
| `x`, `y` | Cell on that surface |
| `heading` | `north`, `east`, `south` or `west`: where the object's own "up" points on the screen of its surface |

Movement commands (`up`, `right`, `down`, `left`) are **relative to the heading**. When an object crosses an edge, its heading rotates by the same amount the direction of travel rotated, so the object keeps going the way it was going. For example, an object that goes up from the front, over TOP, onto the back face:

```
FRONT (heading N) ──up──▶ TOP (heading N) ──up──▶ BACK (heading S)
                                                      │
              on the screen of BACK:  up → moves down, right → moves left
```

Things worth knowing:

- Walking around a TOP corner rotates the heading by 90°. This is a property of the cube, not a bug. A "point up" command resets the heading.
- Different objects can have different headings, so "move up" is relative to each object.
- The heading is internal. The UI can show it behind a toggle later.

### 12.4 Spawning and addressing TOP

An object is created with a face, `x`, `y` and an optional heading, which defaults to north.

For TOP, coordinates and headings are **logical**. By default FRONT is at the bottom of the TOP view and north points away from it. This is configurable with `topAnchor`: the engine can be set so that any side is at the bottom of the TOP view, and TOP coordinates and headings are rotated accordingly.

| Setting | Effect |
| --- | --- |
| `topAnchor = FRONT` (default) | TOP is addressed as stored: FRONT at the bottom, north points to BACK |
| `topAnchor = LEFT` | LEFT is at the bottom of the addressed TOP, north points to RIGHT |

> The anchor only affects how TOP is **addressed**. It never changes how objects move.

### 12.5 Floor

The sides behave as if they continued downward until a floor row. Moves past the floor are ignored, so the object stops there.

- The floor is the last visible row (`y = 63`) by default.
- It is a configuration value (`floor`), so it can be made deeper later. Cells below row 63 exist but are not drawn, which lets users animate things below the cube.

### 12.6 Commands that act on objects

All commands are plain data, so a program can be stored, sent to the Pi and replayed anywhere.

| Command | Description |
| --- | --- |
| `create` | Creates an object with a name, face, `x`, `y`, color and optional heading |
| `move` | Moves an object a number of cells up, right, down or left (relative to its heading) |
| `moveTo` | Puts an object on a given face and cell |
| `setColor` | Changes the color of an object |
| `show` / `hide` | Toggles whether the object is drawn |
| `delete` | Removes an object |

Objects are single pixels for now. Size, velocity and other shapes (rectangle, circle, sprite) come later.

### 12.7 Execution loop

A **program** is a list of **scripts**, each started by an event (when started, every N seconds, and so on). Scripts look like they run at the same time, but a **scheduler** gives each one a turn:

```
every tick (fixed rate, for example 30 Hz):
    for each running script:
        run its blocks until it reaches a wait,
        or finishes one iteration of a loop, then suspend it
    render the world into the cube state
```

Example timeline of `forever { move ball right; wait 0.1s }`:

```
t = 0.00s   script runs: move, hits wait(0.1) → sleeps until t = 0.10
t = 0.03s   tick: script is asleep, only render
t = 0.07s   tick: script is asleep, only render
t = 0.10s   tick: script wakes: move, hits wait → sleeps until t = 0.20
```

Rules:

1. A script **must yield at least once per loop iteration**, so a loop can never block the cube.
2. Waits use **real time**, not tick counts, so animations run at the same speed on any device.
3. Scripts are written as generators in both engines (`function*` in TypeScript, `yield` in Python).

### 12.8 Drawing commands

The pixel and shape commands (`setPixel`, `drawLine`, `fillRect`, `drawCircle`, `drawBitmap`, text) have two roles:

- **Internal:** the renderer uses them to draw objects (a circle object calls `fillCircle`, a sprite calls `drawBitmap`).
- **Not exposed to users for now.** An advanced tier of blocks that painted on a persistent **background layer** was dropped to focus on the block scripts. The background layer remains, and now holds the pictures the user puts on the faces (the environment). Every frame the renderer copies the background and draws the objects on top.

Making the primitives strip-aware, so a circle wraps around a corner, comes in a later milestone.

### 12.9 Status

| Part | State |
| --- | --- |
| Geometry (strip, TOP, heading, floor, anchor) | Done: `src/app/cube/geometry/geometry.ts`, with tests |
| World, background layer, renderer | Planned |
| Program format, interpreter, scheduler | Planned |
| Blockly integration | Planned |
| Python engine on the Raspberry Pi | Planned, after the TypeScript engine is stable |
