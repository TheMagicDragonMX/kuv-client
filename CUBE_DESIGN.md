# Cube Design

How the Kü-V cube works: users program **objects** with Blockly blocks, and an **engine** turns those programs into pixels on the cube. This document is the reference for the engine. The same logic is implemented twice, once in TypeScript for the browser and once in Python for the Raspberry Pi.

The code is laid out in [src/app/cube/](src/app/cube/README.md), one folder per layer. It replaces the architecture described in [VIRTUAL_CUBE_API.md](VIRTUAL_CUBE_API.md), where one virtual cube was the shared source of truth for the browser and the Pi. That is no longer the plan. See [section 2](#2-what-changed).

## Contents

1. [Goals](#1-goals)
2. [What changed](#2-what-changed)
3. [Architecture](#3-architecture)
4. [Surfaces and geometry](#4-surfaces-and-geometry)
5. [Objects and heading](#5-objects-and-heading)
6. [Commands](#6-commands)
7. [Program format](#7-program-format)
8. [Execution model](#8-execution-model)
9. [World and renderer](#9-world-and-renderer)
10. [Two engines, one behavior](#10-two-engines-one-behavior)
11. [Blockly](#11-blockly)
12. [Milestones](#12-milestones)
13. [Decisions and open questions](#13-decisions-and-open-questions)

---

## 1. Goals

- Users **do not switch LEDs on and off**. They create objects, give them a position and a color, and run commands that act on those objects (move, change color, and so on). This is closer to Scratch.
- Programs are built with **Blockly**.
- Moving across the edges of the cube must feel **intuitive**: an object that keeps going in one direction keeps going, even across the top face.
- The **Raspberry Pi runs programs on its own**, without the browser connected.
- Animations must be **efficient** on both devices.
- The old pixel commands (`setPixel`, `drawLine`, and so on) are **not exposed to users for now**: the focus is the block scripts. The drawing primitives stay as internal tools.

## 2. What changed

The earlier design had a single virtual cube that the browser and the Pi both consumed as the source of truth. The conclusion of the design discussion is different:

| | Earlier idea | Now |
| --- | --- | --- |
| Engine | One virtual cube shared by the browser and the Pi | **Two engines**, one per platform, with the same logic |
| Shared between platforms | The cube itself | The **program format** (JSON) and the **behavior** (defined in this document and checked with golden tests) |
| Unit users work with | Pixels and drawing commands | **Objects** and commands that act on them |
| Pixel commands | The main API | Internal drawing tools only (an advanced tier was dropped for now) |

What stays from the earlier design:

- The engine knows nothing about HUB75, GPIO, panel wiring or `rpi-rgb-led-matrix`. Only the Pi's output stage does.
- Physical panel identity, cube face and HUB75 chain position are three independent concepts, and only the Pi's mapping configuration relates them.
- `CubeState` (one 64×64 pixel surface per face) is the pixel buffer both engines render into.

## 3. Architecture

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
      │  writes
      ▼
CubeState                    one 64x64 pixel surface per face
      │
      ├──▶ browser: 3D virtual cube (three.js)
      └──▶ Pi: panel mapping → rpi-rgb-led-matrix → HUB75 → physical cube
```

| Layer | Responsibility |
| --- | --- |
| Program | Data produced by Blockly. Nothing is evaluated as source code |
| Interpreter and scheduler | Run scripts over time (see [section 8](#8-execution-model)) |
| World | Source of truth for *what exists*: objects and the background layer |
| Renderer | Turns the world into pixels |
| `CubeState` | Plain pixel buffer. Knows nothing about three.js, panels or GPIO |

The layers are cheap. The whole cube is 5 × 64 × 64 = 20,480 pixels (about 80 KB). Clearing it and drawing a few dozen objects takes microseconds in TypeScript. The real limits are the LED refresh rate and, in the browser, how many meshes three.js updates per frame. `CubeState.version` lets the 3D view skip frames where nothing changed.

## 4. Surfaces and geometry

Reference implementation: [src/app/cube/geometry/geometry.ts](src/app/cube/geometry/geometry.ts), tests in `geometry.spec.ts`. The Python engine must reproduce this behavior exactly.

### 4.1 The strip and the top face

The four side faces form one **strip** of 256 × 64 cells, in the order `FRONT, RIGHT, BACK, LEFT`. Going right goes right around the cube, and the last side wraps to the first. `x` grows to the right as seen from outside, `y` grows downward, and `y = 0` is the top row.

```
┌───────┬───────┬───────┬───────┐
│ FRONT │ RIGHT │ BACK  │ LEFT  │  ← wraps around
└───────┴───────┴───────┴───────┘
 x: 0..63  64..127  128..191  192..255
```

**TOP** is a separate 64 × 64 surface, stored as seen from above with FRONT at the bottom (this matches the cube state and the 3D view):

```
            y = 0  (touches BACK)
      ┌──────────────┐
x = 0 │              │ x = 63
(LEFT)│     TOP      │ (RIGHT)
      │              │
      └──────────────┘
            y = 63 (touches FRONT)
```

### 4.2 Directions

Directions are quarter turns clockwise on the screen of a surface: `NORTH = 0`, `EAST = 1`, `SOUTH = 2`, `WEST = 3`. Adding a number rotates a direction. Offsets: north `(0, −1)`, east `(+1, 0)`, south `(0, +1)`, west `(−1, 0)`.

### 4.3 Edge table

`c` is the column of the object on the side (`0..63`). Coordinates on TOP are the stored ones.

| Side | Going up off the side's top row lands on TOP at | Arrives traveling | Leaving TOP in that direction lands on the side at strip x |
| --- | --- | --- | --- |
| FRONT | `(c, 63)` | north | `0·64 + x` (leaving south) |
| RIGHT | `(63, 63 − c)` | west | `1·64 + 63 − y` (leaving east) |
| BACK | `(63 − c, 0)` | south | `2·64 + 63 − x` (leaving north) |
| LEFT | `(0, c)` | east | `3·64 + y` (leaving west) |

When leaving TOP, the object always lands on row `y = 0` of the side, traveling south.

### 4.4 Moving one cell

Given an absolute direction `d` (the object's heading plus the relative step):

```
advance(pose, d):
    (x, y) = pose + offset(d)

    if pose is on the strip:
        if y > floor:       return blocked            # the object stays where it is
        if y < 0:           return enterTop(pose, d)  # only possible when d is north
        return { x: (x + 256) mod 256, y, heading unchanged }

    if pose is on TOP:
        if (x, y) is outside 0..63:  return leaveTop(pose, d)
        return { x, y, heading unchanged }

enterTop / leaveTop:
    new position and new direction of travel from the table above
    new heading = heading + (new direction of travel − old direction of travel)
```

A move of `n` cells repeats `advance` `n` times and stops at the first blocked cell.

### 4.5 Floor

The sides behave as if they continued downward until a floor row. A move past it is ignored, so the object stops there.

- The floor defaults to the last visible row (`y = 63`).
- It is the engine setting `floor`, so it can be made deeper. Cells below row 63 exist but are not drawn, which lets users animate things below the cube.

### 4.6 Addressing TOP: `topAnchor`

When a user places an object on TOP, the coordinates and heading are **logical**, relative to a side chosen in the engine configuration:

- The `topAnchor` side is at the **bottom** of the addressed TOP view.
- **North** on TOP points away from that side. This is the default heading for an object placed on TOP.
- The default anchor is `FRONT`, which makes the addressed TOP identical to the stored one.

The logical coordinates are converted to the stored ones by rotating `q` quarter turns clockwise around the center of the face, where `(x, y) → (63 − y, x)` is one quarter turn. The heading is rotated by the same `q`.

| `topAnchor` | `q` |
| --- | --- |
| FRONT | 0 |
| RIGHT | 3 |
| BACK | 2 |
| LEFT | 1 |

The anchor only changes how TOP is **addressed**. It never changes how objects move, and it has no effect on the sides.

## 5. Objects and heading

### 5.1 Pose

An object has a **pose**:

| Field | Meaning |
| --- | --- |
| `surface` | `strip` or `top` |
| `x`, `y` | Cell on that surface |
| `heading` | Where the object's own "up" points on the screen of its surface |

### 5.2 Relative movement

Movement commands (`up`, `right`, `down`, `left`) are relative to the **heading**. When an object crosses an edge, its heading rotates by the same amount its direction of travel rotated. The object keeps going the way it was going, like a creature walking over the cube. An object that goes up from the front, over TOP, onto the back face:

```
FRONT (heading N) ──up──▶ TOP (heading N) ──up──▶ BACK (heading S)
                                                       │
         on the screen of BACK:  up → moves down, right → moves left
```

The "controls are swapped on the opposite side" behavior is not a special rule. It follows from the heading rotating.

### 5.3 What to expect

- Walking around a TOP corner rotates the heading by 90°. This is a property of the cube. For example, `right`, `up`, `left` starting at the top-right cell of FRONT ends at the same cell facing west.
- A "point up" command resets the heading.
- Different objects can have different headings, so "move up" is relative to each object.
- An object that walks backwards ("down") out of TOP arrives with its "up" pointing away from where it travelled.

### 5.4 Heading is internal

The heading is part of every object, but users do not see it. A UI toggle to show it can be added later. Objects can be created with a chosen heading, and the default is north.

### 5.5 Object properties (first version)

| Property | Notes |
| --- | --- |
| `name` | Unique, used by commands to target the object |
| `pose` | See above |
| `color` | `0xRRGGBB`. Black means off |
| `visible` | Hidden objects are not drawn |
| `shape` | `pixel` only at first. Reserved for rectangle, circle and sprite |

Size and velocity are out of scope for now.

## 6. Commands

All commands are plain data, so programs can be stored, sent to the Pi and replayed anywhere.

### 6.1 Object commands (what Blockly blocks map to)

| Command | Description |
| --- | --- |
| `create` | Creates an object: name, face, `x`, `y`, color, optional heading |
| `move` | Moves an object up, right, down or left by a number of cells, relative to its heading |
| `moveTo` | Puts an object on a given face and cell |
| `setColor` | Changes an object's color |
| `show` / `hide` | Toggles whether the object is drawn |
| `delete` | Removes an object |
| `pointUp` | Resets the heading to north |

### 6.2 Control blocks

| Block | Description |
| --- | --- |
| `wait` | Pauses the script for a number of seconds |
| `repeat` | Runs its body a number of times |
| `forever` | Runs its body repeatedly |

### 6.3 Drawing primitives and the background layer

The pixel and shape primitives (`setPixel`, `drawLine`, `drawRect`, `fillRect`, `drawCircle`, `fillCircle`, `drawBitmap`) are **internal tools**. The renderer will use them to draw objects (a circle object calls `fillCircle`, a sprite calls `drawBitmap`). No program block exposes them pixel by pixel: there was an "advanced tier" of blocks that painted on the background, and it was removed to focus on the block scripts.

The **background layer** stays. It holds the **environment**, the pictures the user puts on the faces (see [ENGINE_MANUAL.md](ENGINE_MANUAL.md), section 9.1), and what the **background blocks** paint: `setBackgroundImage` (a picture, already 64×64, inside the block) and `setBackgroundColor`, which use `drawBitmap` and `fillRect` underneath. The renderer redraws every frame, so these live in a layer it starts each frame from. Each frame, the renderer copies the background and draws the objects on top, so objects never change the background. The environment is where the cube starts; a reset brings it back.

The existing primitives work per face today. Making them strip-aware, so a circle wraps around a corner, is a later milestone.

## 7. Program format

The program is the **contract** between Blockly and both engines. This is the proposed shape. It is finalized when the interpreter is implemented.

```json
{
  "version": 1,
  "config": { "topAnchor": "FRONT", "floor": 63 },
  "scripts": [
    {
      "trigger": { "type": "start" },
      "blocks": [
        { "op": "create", "name": "ball", "face": "FRONT", "x": 32, "y": 30, "color": "#ff0000" },
        {
          "op": "forever",
          "body": [
            { "op": "move", "target": "ball", "step": "up", "count": 1 },
            { "op": "wait", "seconds": 0.1 }
          ]
        }
      ]
    }
  ]
}
```

- A program is a list of **scripts**. Each has a trigger (when started, every N seconds, and so on) and a list of blocks.
- Blocks are plain objects with an `op` and its arguments. Control blocks hold nested `body` lists.
- The engine does not `eval` anything. It interprets this data, so the same program runs unchanged in both engines.
- The project guidelines mention compiling Blockly into lightweight command ID sequences to reduce traffic. That can be a compact encoding of this same format later.

## 8. Execution model

### 8.1 Scripts and the scheduler

A **script** is one stack of blocks started by an event. Several scripts can be running. They appear to run at the same time, but a **scheduler** gives each one a turn:

```
every tick (fixed rate, for example 30 Hz):
    for each running script:
        run its blocks until it reaches a wait,
        or finishes one iteration of a loop, then suspend it
    render the world into the cube state
```

Example for `forever { move ball up; wait 0.1s }`:

```
t = 0.00s   script runs: move, hits wait(0.1) → sleeps until t = 0.10
t = 0.03s   tick: script is asleep, only render
t = 0.07s   tick: script is asleep, only render
t = 0.10s   tick: script wakes: move, hits wait → sleeps until t = 0.20
```

### 8.2 Rules

1. A script **must yield at least once per loop iteration**, even with no `wait` in the body. Otherwise a loop could block the cube. This also helps pre-validate infinite loops.
2. Waits use **real time**, not tick counts, so animations run at the same speed on any device.
3. The clock is **injected** into the engine, so tests are deterministic.
4. Scripts are written as **generators** in both languages (`function*` and `yield` in TypeScript, `yield` in Python).
5. The renderer only runs if something changed.

## 9. World and renderer

### 9.1 World

- The set of objects, keyed by name.
- The **background layer**, a `CubeState` that holds the pictures of the environment and what the background blocks paint.
- A version counter that increases on every change.

### 9.2 Renderer

Each frame:

1. Copy the background layer into the output `CubeState`.
2. For each visible object in creation order, convert its pose to a pixel with `toPixel` and write its color. Objects below the visible rows are skipped.
3. The output `CubeState` is read by the 3D view or by the Pi's output stage.

The renderer is the same on both platforms apart from the pixel buffer type.

### 9.3 Pixel buffer

`CubeState` holds five faces of 64 × 64 pixels, with colors packed as `0xRRGGBB`.

| Face | Index |
| --- | --- |
| FRONT | 0 |
| RIGHT | 1 |
| LEFT | 2 |
| BACK | 3 |
| TOP | 4 |

On the Pi, use bulk operations (a numpy array, slice assignment) instead of per-pixel Python loops. At 20,480 pixels and 30 fps, a per-pixel loop costs around 600k operations per second, which is the main performance risk of the Python engine.

## 10. Two engines, one behavior

| | Browser | Raspberry Pi |
| --- | --- | --- |
| Language | TypeScript | Python |
| Location | `kuv-client/src/app/cube/` (see its [README](src/app/cube/README.md)) | `kuv-cube/` |
| Output | `CubeState` → three.js | `CubeState` → panel mapping → `rpi-rgb-led-matrix` |
| Role | Simulator and preview | Runs programs on its own |

Both implement the same modules: geometry, world, interpreter and scheduler, renderer. The **TypeScript engine is written first** and acts as the reference. The Python port starts once it is stable.

To stop the two from drifting apart:

- The program format is the contract.
- A shared set of **golden tests** defines the behavior: each is a program, plus the expected pixels after N ticks, stored as JSON. Both engines must pass all of them.
- The geometry tests (edge crossing, heading, floor, anchor) are specified by section 4 and should be reproduced in Python.

## 11. Blockly

- Blockly is only the editor. Its job is to produce the JSON program. It never generates or runs code.
- Object commands and control blocks map to the blocks listed in [section 6](#6-commands).
- Blockly integration comes after the TypeScript engine works.

## 12. Milestones

| # | Scope | State |
| --- | --- | --- |
| 1a | Geometry: strip, TOP, heading, floor, anchor, with tests | **Done** |
| 1b | World (objects, background layer) and renderer | **Done** |
| 1c | Program format and validator, interpreter, scheduler, with tests | **Done** |
| 1d | `<app-cube>` component, example programs, editor page with a JSON program area | **Done** |
| 2 | Blockly integration | Planned |
| 3 | Python engine on the Pi, golden tests shared | Planned |
| 4 | Strip-aware drawing primitives, more object shapes (rectangle, circle, sprite), size, velocity, events | Later |

Milestone 1 uses pixel objects only, with `create`, `move`, `moveTo`, `setColor`, `show`, `hide`, `delete`, `wait`, `repeat` and `forever`.

## 13. Decisions and open questions

### Decided

| Topic | Decision |
| --- | --- |
| Engines | One per platform (TypeScript and Python), same logic. Pi engine written second |
| Contract between engines | JSON program format and golden tests |
| Coordinate model | Wrapping strip of the four sides, plus TOP |
| Movement | Relative to a per-object heading, which rotates when crossing edges |
| Spawn heading | North by default, can be chosen |
| Heading visibility | Internal. UI toggle later |
| Bottom edge | A floor stops objects. Last visible row by default, configurable and can be deeper |
| TOP addressing | Configurable with `topAnchor`. Default FRONT at the bottom of the TOP view |
| Object shape | Pixel only at first. No size or velocity |
| Background layer | Persistent layer under the objects, written by the environment (pictures on the faces) and the background blocks |
| Execution | Generator-based scripts, one turn per tick, real-time waits, a loop yields at least once per iteration |
| Editor | Blockly |

### Open

- **Where the golden tests live.** `kuv-client` and `kuv-cube` are separate repositories. Options: one holds them and the other copies them, or a third small repository.
- **How the Pi receives programs.** Through `kuv-api` or directly from the browser, and what happens when the Pi is offline. The API and protocol are not designed yet.
- **Final JSON program shape** (color format, trigger types, how objects are targeted).
- **Triggers.** Which events exist beyond "when started" and "every N seconds" (keys, buttons, IMU, gestures).
- **A heading display** in the UI, and whether turn blocks are exposed to users.
- **Collisions** between objects, and the draw order of overlapping objects.
- **Deeper floor.** How users reach the cells below the visible rows.
- **Hardware mapping on the Pi.** Face to panel to chain position configuration, and the physical meaning of the TOP orientation.
- **Pi performance.** Whether pure Python is fast enough for heavy animations, to be measured once the engine exists.
