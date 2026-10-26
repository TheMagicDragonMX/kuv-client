# How the cube engine works

A guided tour for understanding the engine from the ground up. It is written as a chain of problems: each chapter starts with something that is hard or missing, then shows the idea that fixes it, how it works, and which file holds it. By the end, every file in [src/app/cube/](src/app/cube/) should feel like an obvious answer to a question you already asked.

You do not need to read the code first. Read this top to bottom once, then open the files as you go. Each chapter ends with **Where**, the files to open.

## Contents

0. [The big picture](#0-the-big-picture)
1. [Somewhere to put the colors](#1-somewhere-to-put-the-colors)
2. [A cube is not flat](#2-a-cube-is-not-flat)
3. [Remembering what exists](#3-remembering-what-exists)
4. [Drawing shapes](#4-drawing-shapes)
5. [Telling the cube what to do](#5-telling-the-cube-what-to-do)
6. [What a block actually does](#6-what-a-block-actually-does)
7. [Things happen over time](#7-things-happen-over-time)
8. [Many things at once](#8-many-things-at-once)
9. [Turning the world into pixels](#9-turning-the-world-into-pixels)
10. [Putting it all together](#10-putting-it-all-together)
11. [Showing it on screen](#11-showing-it-on-screen)
12. [Using it in a page](#12-using-it-in-a-page)
13. [One click, from start to finish](#13-one-click-from-start-to-finish)
14. [Why it is split this way](#14-why-it-is-split-this-way)
15. [Cheat sheets](#15-cheat-sheets)

---

## 0. The big picture

**The situation.** You have a physical cube covered in LEDs. At first, the way to use it was to turn individual LEDs on and off: "set this pixel red", "draw a line here". That is how a computer screen works, and it is far too low-level for a student learning to think algorithmically.

**What we want instead.** The Scratch way: the student creates *things* ("a ball"), gives them a place and a color, and tells *them* what to do ("move up", "change color", "wait a second", "do it forever"). The student never mentions an LED.

That one change creates a list of problems, and the engine is the list of answers:

| Problem | Answer | Chapter |
| --- | --- | --- |
| Where do the LED colors live? | A pixel buffer | 1 |
| How does "move up" work when the cube has edges and a top? | Geometry | 2 |
| Where is "the ball" remembered? | The world | 3 |
| How do shapes get drawn? | Drawing primitives | 4 |
| How does the student's program get in, safely? | A program format and a validator | 5 |
| What does each block do? | Commands | 6 |
| "Forever" would freeze everything | An interpreter built on generators | 7 |
| Several scripts must run together | A scheduler | 8 |
| Objects must become colored LEDs | A renderer | 9 |
| All of it must be easy to start | An engine, a player and a clock | 10 |
| People must *see* it | A 3D view | 11 |
| Pages must use it in one line | An Angular component | 12 |

The whole thing in one picture:

```
 what the student wrote
        │
        ▼
 ┌──────────────┐   is it a valid program?
 │   program    │   (chapter 5)
 └──────┬───────┘
        ▼
 ┌──────────────┐   runs scripts over time
 │ interpreter  │   (7)   and a scheduler (8)
 │ + scheduler  │
 └──────┬───────┘
        │ each block becomes a command (6)
        ▼
 ┌──────────────┐   what exists: objects + background
 │    world     │   (3)   uses geometry to move things (2)
 └──────┬───────┘
        ▼
 ┌──────────────┐   world → pixels (9)
 │   renderer   │
 └──────┬───────┘
        ▼
 ┌──────────────┐   the grid of LED colors (1)
 │  cube state  │
 └──────┬───────┘
        ├──▶ the 3D cube in the browser (11)
        └──▶ the real cube on the Raspberry Pi (later)
```

Two ideas hold the whole design together, and they come back in every chapter:

1. **Every layer does exactly one thing** and only knows about the layers below it. That is why each is a separate file, and why you can read one without the others.
2. **Programs are data, not code.** A program is a list of plain objects ("create this", "move that"). Nothing the student writes is ever executed as JavaScript. That makes it safe, storable, sendable to the Pi, and the same on both platforms.

---

## 1. Somewhere to put the colors

**The problem.** Something has to hold "what color is every LED right now". Both the 3D cube on screen and the real cube need to read it, and neither should care how it got there.

**The idea.** A plain grid of numbers. Nothing smart. A *meeting point*: the engine writes into it, and anything that displays the cube reads from it.

**How it works.**

The cube has 5 faces and each is 64×64 LEDs. That is 5 × 64 × 64 = **20,480 pixels**. They are stored in one flat array, face after face, row after row:

```
index of a pixel = (face * 64 + y) * 64 + x
```

A color is a single number written `0xRRGGBB` (`0xff0000` is red). `0x000000` is black, which means "LED off".

Each face has a number, so a face can also be used as a position in the array:

| Face | Number |
| --- | --- |
| FRONT | 0 |
| RIGHT | 1 |
| LEFT | 2 |
| BACK | 3 |
| TOP | 4 |

Coordinates are per face, as seen from *outside* the cube: `x` grows to the right, `y` grows downward, and `(0, 0)` is the top-left corner.

Three small details matter later:

- **Writing outside a face is ignored.** `set(face, 70, 3, color)` does nothing. That means shapes can overflow the edge of a face without any special checks.
- **A `version` number goes up on every write.** This is how readers cheaply ask "did anything change since I last looked?" without comparing 20,480 pixels. You will see it used in chapters 9 and 11.
- **`copyFrom(other)`** copies a whole state into this one in a single operation. The renderer uses it (chapter 9).

**Where.** [state/cube-state.ts](src/app/cube/state/cube-state.ts)

---

## 2. A cube is not flat

**The problem.** The student says "move the ball up". On a flat screen that means "y minus one". On a cube:

- What happens when the ball reaches the top edge of the front face? It should continue onto the top face.
- What does "up" even mean on the top face? There is no up on a flat roof.
- If the ball goes up, over the top, and down the opposite side, what should "up" mean now?

We need a part of the engine whose only job is to answer: **"if this object takes a step in this direction, where does it end up?"** Nothing else should ever think about edges.

This chapter is the most important one, so it goes slowly.

### 2.1 Unfold the cube into two flat surfaces

Four of the faces (FRONT, RIGHT, BACK, LEFT) are connected side by side all the way around. Cut the cube along one vertical edge and unroll them, and you get one long band that wraps around. We call it the **strip**: 4 × 64 = **256 cells wide**, 64 tall.

```
┌───────┬───────┬───────┬───────┐
│ FRONT │ RIGHT │ BACK  │ LEFT  │ ← and then it wraps back to FRONT
└───────┴───────┴───────┴───────┘
 x: 0..63  64..127  128..191  192..255
```

Moving right is trivial: `x + 1`, and past 255 you wrap to 0. Going around the cube costs nothing. We checked that this order is right against how the 3D model places the faces: the right edge of FRONT really does touch the left edge of RIGHT.

The fifth face, **TOP**, stays on its own as a separate 64×64 square, stored as seen from above with FRONT at the bottom:

```
            y = 0   (touches BACK)
      ┌──────────────┐
 x=0  │              │  x=63
(LEFT)│     TOP      │ (RIGHT)
      │              │
      └──────────────┘
            y = 63  (touches FRONT)
```

So every object is on one of two surfaces: the `strip` or the `top`.

### 2.2 Edges: moving between a side and the top

Going up from the top row of any side lands on the TOP edge that touches that side. Each side meets TOP differently, and the cell numbers have to be converted. This is the whole "edge table" (`c` is the column on the side, 0 to 63):

| Going up off the top row of | Lands on TOP at | Now traveling |
| --- | --- | --- |
| FRONT | `(c, 63)` | north |
| RIGHT | `(63, 63 − c)` | west |
| BACK | `(63 − c, 0)` | south |
| LEFT | `(0, c)` | east |

And the reverse, leaving TOP over each edge, lands on row 0 of the matching side, traveling south.

You do not need to memorize this. The point is that **it is written down once**, in one place, and every other part of the engine just calls `move()`.

### 2.3 "Up" must travel with the object: the heading

Now the hard question. A ball goes up the front, over the top, and arrives on the opposite side (BACK). The student keeps saying "move up". What should it do?

Picture an ant walking over the cube. It does not have a global "up". It has a *forward*. If it keeps walking forward, it walks over the top and then **down** the back. From the point of view of someone looking at the back face, the ant is moving down the screen. But from the ant's point of view, nothing changed: it is still going forward.

That is exactly the behavior we want: *"keep pressing up" means "keep going the same way"*. So each object stores, besides its position, a **heading**: which screen direction its own "up" currently points.

Headings are one of four directions: `NORTH`, `EAST`, `SOUTH`, `WEST`, numbered 0 to 3 clockwise. That numbering is deliberate: adding to a number rotates it. The student's steps (`up`, `right`, `down`, `left`) are measured **relative to the heading**:

```
absolute direction = heading rotated by the step
                     (up = +0, right = +1, down = +2, left = +3 quarter turns)
```

The rule for crossing an edge is the key insight:

> When an object crosses an edge, its direction of travel changes (for example from "north" to "west"). Rotate the heading by the **same amount**.

That keeps the object facing the way it was going. Follow the ball:

```
FRONT (heading N) ──up──▶ TOP (heading N) ──up──▶ BACK (heading S)

On the screen of BACK the ball is moving down.
Up now means down.  Right now means left.
```

Nobody wrote a special rule for "controls are swapped on the opposite side". It *falls out* of rotating the heading.

### 2.4 The floor

There is no bottom face (the cube stands on a base). So what happens when an object moves down past the last row? We decided: the sides behave as if they kept going down until a **floor**, and moves past the floor are ignored. The floor is the last visible row (`y = 63`) by default, and it is a setting, so it can later be made deeper to let objects hide *below* the cube.

### 2.5 Addressing the top face: the anchor

When a student places an object *directly* on the top face ("put it at x=10, y=20 on TOP"), those numbers need a meaning. By default: as seen from above with FRONT at the bottom. But we did not want that to be a fixed rule, so there is a setting, `topAnchor`: which side is at the bottom of the top face when you address it. Setting it to LEFT rotates the addressing so LEFT is at the bottom.

Important: the anchor only changes how TOP is **addressed** (where `x, y` and the default heading point). It never changes how things move. Internally everything is still stored the one fixed way, and the anchor is just a rotation applied on the way in.

### 2.6 What this layer looks like

An object's whereabouts is called a **pose**:

```ts
{ surface: 'strip' | 'top', x, y, heading }
```

and the layer has a handful of operations:

- `place(...)` turns "face, x, y, heading" from the user into a pose.
- `move(pose, step, count)` walks one cell at a time, crossing edges and rotating the heading. It stops at the floor. If nothing changed, it returns the *same object it was given*, which later lets callers detect "no change" with a simple `===`.
- `pointUp(pose)` resets the heading.
- `toPixel(pose)` says which pixel of the cube state to light (or `null` if the pose is below the visible rows).

Inside, moving one cell is a small procedure:

```
advance(pose, direction):
    next cell = pose + one step in that direction
    if on the strip:
        below the floor?        → blocked (stay)
        above row 0?            → cross onto TOP
        otherwise               → wrap x around 256, keep going
    if on TOP:
        off an edge?            → cross onto the matching side
        otherwise               → keep going
```

### 2.7 A thing to know: heading drifts

Walk around the corner of the top face and you come back facing a different way. For example, starting at the top-right cell of FRONT: step `right`, then `up`, then `left` brings you back to the *same cell*, but now facing west instead of north. This is real geometry, not a bug: it is the same reason a cube's corner "adds up" to less than a full turn. We keep a `pointUp` block so students can reset it.

**Where.** [geometry/geometry.ts](src/app/cube/geometry/geometry.ts), with all of the cases above as tests in [geometry.spec.ts](src/app/cube/geometry/geometry.spec.ts). The file is pure functions: no state, no framework.

---

## 3. Remembering what exists

**The problem.** The student said "create a ball at the front". A moment later they say "move the ball". Something must remember that the ball exists, where it is, and what color it is. And separately, the student might paint a pixel on the background and expect it to *stay*.

**The idea.** A **world**: a container that stores two things.

1. **Objects**: the things that can move.
2. **A background layer**: a pixel buffer for painted pixels that are not objects.

**How it works.**

An object is just data:

```ts
{ name, shape: 'pixel', pose, color, visible }
```

It has no methods. It does not move itself; commands change it (chapter 6) and the renderer reads it (chapter 9). Today every object is a single pixel. `shape` exists so rectangles, circles and sprites can be added later without changing how objects are stored.

The world keeps objects in a `Map` by name, which gives two nice properties:

- Looking up "ball" is direct.
- A `Map` remembers insertion order, so objects are drawn in the order they were created: later objects appear on top.

Some rules the world enforces:

- Two objects cannot share a name. Creating a duplicate fails with a clear message.
- Asking for an object that does not exist fails with `There is no object called "ghost"`. This is the message a student would see when they mistype a name.
- Updating an object replaces it with a modified copy but keeps its place in the drawing order.

**Why a background layer?** Here is a trap. The renderer (chapter 9) redraws the whole cube from scratch every frame. If a student paints a pixel directly on the cube, the next frame would wipe it. So painted pixels go in a separate buffer, the background, and every frame *starts* from a copy of it. That is why painted pixels stay. It also gives a free feature: a trail effect, if you paint wherever an object has been.

**The version number.** Like the pixel buffer, the world has a `version` that rises whenever objects or the background change. The renderer uses it to skip work when nothing happened.

**Where.** [world/cube-object.ts](src/app/cube/world/cube-object.ts) and [world/world.ts](src/app/cube/world/world.ts). The world also owns the geometry settings (floor and anchor), because an object's pose only makes sense under the settings it was created with, so they are fixed for the life of that world.

---

## 4. Drawing shapes

**The problem.** The advanced tier lets students (and the renderer) draw lines, rectangles and circles, not just single pixels.

**The idea.** A small toolbox of functions that each draw one thing onto one face of a pixel buffer.

**How it works.** `setPixel`, `drawLine` (the classic Bresenham algorithm), `drawRect` and `fillRect`, `drawCircle` and `fillCircle` (the midpoint algorithm), and `drawBitmap` for copying a small picture. They all call the pixel buffer's `set`, and since `set` ignores writes outside the face (chapter 1), shapes are clipped at the face edge for free.

Right now they work **per face**: a circle that hangs over the edge of FRONT is cut off at that edge instead of continuing onto RIGHT. Making shapes aware of the strip (so they wrap around a corner) is a planned improvement. Those same functions will be reused; only the surface they draw on will change.

**Where.** [drawing/](src/app/cube/drawing/): `pixel.ts`, `shapes.ts`, `bitmap.ts`. They were written before the engine existed and are still used, now as internal tools.

---

## 5. Telling the cube what to do

**The problem.** Programs have to come from somewhere: today a text box, tomorrow Blockly, in the future the network. We must run them on a browser *and* on a Raspberry Pi, in two different programming languages. And whatever arrives could be malformed or wrong.

**The idea.** Define a **program format**: a description of a program as plain data (JSON). It is the contract between the editor and the engine, and between the TypeScript engine and the Python one.

**How it works.** A program looks like this:

```json
{
  "version": 1,
  "config": { "topAnchor": "FRONT", "floor": 63 },
  "scripts": [
    {
      "trigger": { "type": "start" },
      "blocks": [
        { "op": "create", "name": "ball", "face": "FRONT", "x": 32, "y": 30, "color": "#ff0000" },
        { "op": "forever", "body": [
            { "op": "move", "target": "ball", "step": "up" },
            { "op": "wait", "seconds": 0.1 }
        ] }
      ]
    }
  ]
}
```

Read it as a recipe: "when the program starts, create a red ball in front, then forever: move it up, wait a tenth of a second".

- A program has **scripts**. Each script has a **trigger** (when it starts: `start`, or `every N seconds`) and a list of **blocks**.
- A **block** is a plain object with an `op` ("operation") plus its arguments. `forever` and `repeat` blocks contain other blocks in a `body`.
- There are three kinds of blocks:

| Kind | Blocks | What they are |
| --- | --- | --- |
| Object commands | `create`, `move`, `moveTo`, `setColor`, `show`, `hide`, `delete`, `pointUp` | Change the objects |
| Background commands (advanced) | `clearBackground`, `setPixel`, `drawLine`, `drawRect`, `fillRect`, `drawCircle`, `fillCircle`, `drawBitmap` | Paint the background |
| Control blocks | `wait`, `repeat`, `forever` | Decide *when* and *how many times* |

**Why data and not code?** Because "a list of plain objects" can be saved, sent over the network to the Pi, shown in a UI, checked for mistakes before running, and interpreted by *any* language. If students wrote JavaScript, none of that would be true, and it would also be unsafe to run.

### 5.1 Names, not numbers

Inside the engine, faces are numbers and colors are `0xRRGGBB`. In programs they are readable: `"FRONT"`, `"NORTH"`, `"#ff0000"`. A small file holds the two-way conversion so the rest of the engine never has to know both vocabularies.

### 5.2 Validation: never trust a program

Because a program can come from anywhere, we check it before it runs. The validator walks the whole program and reports problems with their exact location:

```
scripts[0].blocks[2].count: must be a whole number, zero or more
```

It deliberately **rejects unknown fields**. Without that, a typo such as `"cont": 5` instead of `"count": 5` would be silently ignored and the block would do the wrong thing with no explanation.

The rules for each block are not hard-coded in the validator. Each block's file in [blocks/](src/app/cube/blocks/) has a **schema**: which fields exist and what kind of value each takes (plus, when needed, a rule between several fields). The validator just looks the block up by its `op` and reads it. That schema is also exactly what you will consult when you build a Blockly block, because it is the list of that block's inputs.

TypeScript helps too: a block's schema must have exactly the fields of its type, and the registry fails to compile if a block type exists without a definition.

**Where.** [program/](src/app/cube/program/) and [blocks/](src/app/cube/blocks/):

| File | Role |
| --- | --- |
| `program/program.ts` | The types: what a program, a script and a trigger are |
| `program/names.ts` | Readable names ⇄ engine values |
| `program/validate-program.ts` | The checker |
| `blocks/<category>/<block>.ts` | One block: its type, its schema, what it does |

[examples/example-programs.ts](src/app/cube/examples/example-programs.ts) has four complete, valid programs to read.

---

## 6. What a block actually does

**The problem.** A validated program says `{ "op": "move", "target": "ball", "step": "up" }`. Something has to turn that into a change in the world.

**The idea.** A **commands** layer: one small function per block, each taking the world and the block and doing exactly what the block says.

**How it works.** Take `move`. In plain steps:

1. Find the object called `target` in the world (this throws a clear error if it does not exist).
2. Ask the geometry (chapter 2) where its pose ends up after that step.
3. If the pose changed, store the new pose in the world.

That is the whole function. Notice what is *not* there: no edge calculations, no wrapping, no rotation. The geometry did all of that. The commands layer is intentionally boring glue.

A small but valuable detail: if a command changes nothing, it does not touch the world at all (it checks that `move` returned the same pose object, or that the color is already that color). That keeps the world's `version` still, which lets the renderer skip the frame (chapter 9). A ball pushed against the floor, "moving down" forever, costs nothing.

Each function lives in the file of its block, in the folder of its category under [blocks/](src/app/cube/blocks/):

- **Object blocks:** what `create`, `move`, `moveTo`, `setColor`, `show`, `hide`, `delete` and `pointUp` do.
- **Background blocks:** what each painting block does: convert the names, call a drawing primitive from chapter 4, aim it at the world's background layer.
- **The dispatcher (`applyCommand`):** looks the command up by `op` in the blocks registry and runs its `apply`. It has no logic of its own, and adding a block does not change it. The registry is typed so that a block type without a definition does not compile.

Control blocks (`wait`, `repeat`, `forever`) are not commands. They do not change the world; they decide *when* other blocks run, which is the next chapter's problem.

**Where.** [blocks/](src/app/cube/blocks/) (the blocks) and [commands/](src/app/cube/commands/) (the dispatcher)

---

## 7. Things happen over time

**The problem.** This is the subtle one. Consider:

```
forever:
    move the ball up
    wait 0.1 seconds
```

How do you *run* that?

The naive way:

```js
while (true) {
    move(ball);
    sleep(100);
}
```

In a browser this **freezes the whole page**. JavaScript has one thread. A loop that never ends never gives control back, so nothing else, including the screen, can run. And it gets worse: the student can write `forever { move }` with no `wait` at all. That would spin at full speed and lock the browser solid. Also, a student can write *several* scripts that should run "at the same time", but one thread can only do one thing at a time.

So we need a way to run a script **a little bit, then pause it, let others run, and resume it later exactly where it left off.**

**The idea.** JavaScript (and Python) have exactly this feature: **generators**. A generator is a function that can pause in the middle with `yield` and be continued later from the same spot, with all its variables intact.

A tiny example, unrelated to the cube:

```ts
function* count() {
    console.log('one');
    yield;               // pause here
    console.log('two');
    yield;               // pause here
    console.log('three');
}

const run = count();
run.next();   // prints "one"   and pauses
run.next();   // prints "two"   and pauses
run.next();   // prints "three" and finishes
```

Between those `next()` calls, the program is free to do anything else. That is the whole trick. **A script becomes a generator.** Each time we call `next()`, it runs until its next pause and then hands control back.

**How it works.** The interpreter walks a script's blocks in order:

- A command (chapter 6): apply it and keep going.
- `wait`: **yield**, saying "wake me after this many milliseconds".
- `repeat N`: run the body N times.
- `forever`: run the body again and again.

A script can pause for two reasons, called a **pause**:

| Pause | Meaning |
| --- | --- |
| `wait` | Resume after this many milliseconds |
| `tick` | Resume on the next tick (just "give someone else a turn") |

**The safety rule that prevents the freeze:**

> A loop pauses at least once per iteration.

If an iteration of a `forever` or `repeat` body does not contain a `wait`, the interpreter adds a `tick` pause at the end of it. So `forever { move }` does not run away: it moves once, pauses, and moves once more on the next tick. It becomes an animation that advances one step per tick instead of a freeze.

There is one refinement. If the iteration already paused by itself (it had a `wait`), we do **not** add the extra pause. Otherwise `forever { move; wait 0.1 }` would take 0.1 seconds *plus* one more tick every loop, and wouldn't be the 0.1 the student asked for. To do this, `runBlocks` returns a yes/no: "did I pause at least once?", and loops check it.

Why `yield*`? When a loop's body contains more blocks, the interpreter calls itself on that body and uses `yield*`, which means "everything that inner generator pauses on, I pause on too". That is how a `wait` buried three loops deep correctly pauses the whole script.

Notice what the interpreter does *not* know: what time it is, or when to resume. It only says "pause, and here is why". Someone else decides.

**Where.** [runtime/interpreter.ts](src/app/cube/runtime/interpreter.ts). Its tests ([interpreter.spec.ts](src/app/cube/runtime/interpreter.spec.ts)) read like a specification of the loop rule: an empty `forever` still pauses, a loop with a `wait` does not get an extra pause, and so on.

---

## 8. Many things at once

**The problem.** A program may have several scripts: one animating a ball, another blinking a light every second. Each is a paused generator now (chapter 7). Someone has to decide whose turn it is, and when a sleeping script should wake.

**The idea.** A **scheduler**. It owns every running script and a clock. On every **tick** (a regular beat, 30 times a second by default) it looks at each script and gives it one turn if it is ready.

**How it works.** A tick does two things, in this order:

```
tick(now):
    1. for each "every N seconds" script that is due:
           start a new run of it (unless the previous run is still going)
    2. for each running script whose wake-up time has arrived:
           resume it once; it runs until its next pause
```

Each script is tracked as a small record: its generator, and when it may be resumed (`wakeAt`).

Four design points make this robust:

**(1) It never reads the clock itself.** `now` is passed in. The scheduler is just a function of "what time is it". That makes tests trivial (you can drive it with made-up times) and keeps it independent of any browser.

**(2) At most one resume per script per tick.** Even if a script has ten loops, it gets one slice per tick. A runaway script cannot starve the others or the screen. This is the second line of defense after the interpreter's loop rule.

**(3) Waits are measured from when the script was *supposed* to wake, not when it actually did.** This is subtle, so here is the problem it solves. Ticks are about 33 ms apart. Say a script does `wait 0.1`, which is 100 ms. At 33 ms ticks, ticks land at 0, 33, 66, 99, 132. The script's wake time is 100, but the first tick after that is 132. If the next wait started counting from 132, the loop would take 132 ms, then 232 later, drifting slower every cycle. Instead the next wait counts from the *scheduled* time 100, so the rhythm stays at 100 ms on average:

| Tick time | What happens |
| --- | --- |
| 0 | Script runs: moves, then `wait 0.1`. Scheduled wake: 100 |
| 33, 66, 99 | Asleep (100 has not arrived) |
| 132 | Wakes (≥ 100). Counts the next wait from 100 → scheduled wake: 200 |
| 165, 198 | Asleep |
| 231 | Wakes (≥ 200). Counts from 200 → scheduled wake: 300 |
| 330 | Wakes (≥ 300). And so on |

Over time the moves happen every 100 ms on average, instead of drifting. There is a test for exactly this.

**(4) Catching up is capped.** What if the browser tab is hidden for a minute and timers stop? When it comes back, `now` is 60,000 ms later. Counting from the *scheduled* time would make a `wait 0.1` loop try to "catch up" hundreds of iterations. So the correction is limited to 100 ms: after a long freeze the script just carries on, rather than rushing.

**The `every N seconds` trigger.** The scheduler keeps a timer per such script. When one is due it starts a new run of that script, *unless* the previous run is still going, in which case that run is skipped (a slow script cannot pile up). If several whole intervals were missed, they are skipped too, instead of all firing at once.

**When a script breaks.** If a block throws (for example it moves an object that does not exist), the scheduler catches the error, removes only *that* script, and reports `{ script, message }` to whoever is listening. The other scripts continue.

**Is anything running?** `active` is true while any script is mid-way or any `every` timer exists. The player uses it to know when the program is over.

**Where.** [runtime/scheduler.ts](src/app/cube/runtime/scheduler.ts), with timing tests in [scheduler.spec.ts](src/app/cube/runtime/scheduler.spec.ts).

---

## 9. Turning the world into pixels

**The problem.** The world knows "a red ball is at FRONT (32, 30)". The LEDs only understand "pixel 32,30 on face 0 is 0xff0000". Something has to translate, every time anything changes.

**The idea.** A **renderer**. Its only job is to read the world and write the cube state (chapter 1).

**How it works.** Each frame is built the same way:

1. **Start from the background.** One bulk copy of the background layer into the output.
2. **Draw each visible object on top**, in the order they were created. For each, ask the geometry (`toPixel`) which pixel its pose maps to, and write its color there. Objects hidden or below the visible rows are skipped.

Notice there is no "erase the old position" step. Because every frame *starts over from the background*, an object that moved is simply not drawn where it used to be. Drawing the whole picture fresh is simpler and cannot leave stray pixels behind. And at 20,480 pixels it costs microseconds, so there is no need to be clever.

**Skipping work.** The renderer remembers the world `version` it last drew. If it has not changed, `render()` does nothing and returns `false`. A cube where nothing is moving costs nothing per tick. And since the output state's own version also only rises when something is drawn, the 3D view (chapter 11) is spared too.

**Where.** [renderer/renderer.ts](src/app/cube/renderer/renderer.ts)

---

## 10. Putting it all together

**The problem.** We now have eight parts. Nobody wants to wire up validator, world, scheduler and renderer by hand every time they want to run a program.

**The idea.** A **facade**: one class with a handful of obvious methods, hiding how the parts fit together.

### 10.1 `CubeEngine`: the logic, with no clock

```ts
const engine = new CubeEngine();
engine.load(program);     // validates; throws ProgramError if it is wrong
engine.start(0);          // clean cube, scripts begin
engine.tick(33);          // time passes: scripts run, picture updates
engine.tick(66);
engine.state              // the pixel buffer, always the same object
```

What each does:

- `load(program)`: validate and remember it. If invalid it throws and the engine stays exactly as it was.
- `start(now)`: build a fresh world, renderer and scheduler, start the scripts, run a first tick.
- `tick(now)`: scheduler runs the ready scripts, then the renderer redraws if anything changed.
- `stop()`: forget the scripts; what is on the cube stays.
- `reset()`: stop and blank the cube.
- `running`: is anything still running or scheduled?
- `setDefaults(...)`: the settings to use when a program does not set its own.

**Every run starts clean.** Internally, `start` and `reset` call one private function that creates a **new world, a new renderer and a new scheduler**. That is the entire mechanism for "starting from scratch": all the state that changes during a run lives in those three, so replacing them is a complete reset. It is also why pressing Run twice does not fail with "there is already an object called ball".

**Settings.** The geometry settings (`topAnchor`, `floor`) come from the program's `config`, falling back to the engine's defaults, and are applied when the world is built.

**The engine never reads the time.** You hand it `now`. That is the same shape the Python engine will have, and it is why the engine is fully testable without waiting for real seconds.

### 10.2 `RunLoop`: a timer

The simplest part: call a function 30 times a second and give it the current time (`performance.now()`). Nothing else. Starting again replaces the callback; stopping stops it.

### 10.3 `CubePlayer`: the engine with a real clock

This is what a screen actually uses.

```ts
const player = new CubePlayer();
player.play(program);    // runs on its own
player.state             // the picture
player.stop();           // stop scripts, keep the picture
player.reset();          // stop and blank
player.dispose();
```

`play` loads the program, starts the engine, and starts the timer; each timer beat ticks the engine. After every beat it checks whether the program is over (`engine.running` is false); if so it **stops its own timer**, so a finished program costs nothing. It also reports changes ("started running", "stopped running") to a callback so a button can reflect them.

**Where.** [engine/](src/app/cube/engine/): `cube-engine.ts`, `run-loop.ts`, `cube-player.ts`. Tests in the matching `.spec.ts` files run whole programs end to end, including an object going over the top and appearing on the other side.

---

## 11. Showing it on screen

**The problem.** The pixel buffer is just numbers. A person needs to *see* a cube.

**The idea.** A **3D view** that reads the pixel buffer and draws a model of the LED cube with three.js. It only reads: it never changes the state. Everything about the 3D picture lives in `view/`, and nothing outside it imports three.js.

**How it works.** The view is a few small parts:

| Part | Job |
| --- | --- |
| `CubeModel` | Builds the five faces (frame, dark panel, LEDs) and copies colors from the state to the LEDs |
| `Stage` | The scene around the cube: fog, lights and the pedestal |
| `CameraRig` | The camera: mouse/touch orbit, slow auto-spin, and the animated turn to look at a face |
| `view-settings` | All the measures and colors in one place |
| `CubeView` | Puts the others together, owns the WebGL renderer and the frame loop |

Two things worth understanding:

**Instanced meshes.** One face has 4,096 LEDs. Drawing 4,096 separate objects per face would be slow. Instead each face is a single *instanced mesh*: the GPU draws all 4,096 boxes in one call, and the only thing that differs per LED is its color. So "update the picture" means "write 4,096 colors".

**The frame loop with a version check.** Every browser frame, the view does three things:

```
1. model.syncIfChanged()   only copy colors if the pixel buffer's version changed
2. rig.update()            move the camera, and say whether it moved
3. renderer.render(...)    draw the scene, only if the LEDs changed, the camera moved or the canvas was resized
```

Step 1 is why the version number from chapter 1 matters: if nothing changed, the 20,480-color copy is skipped. Step 3 goes one further: a still picture seen from a still camera (looking at one face, program finished) is not drawn again at all, so it costs the GPU nothing.

The copy in step 1 is the hottest loop of the view, so it is careful: it reads each face in bulk, converts colors with a 256-entry lookup table instead of `THREE.Color` (which would compute a `Math.pow` per channel per LED), and only writes the LEDs whose color changed. A face where nothing changed is not even sent to the GPU again.

The view also watches its container with a `ResizeObserver`, so the canvas follows if the page layout changes.

**Where.** [view/](src/app/cube/view/). The visuals are the same as before the rewrite; the old single large file was split by responsibility.

---

## 12. Using it in a page

**The problem.** A page author should not need to know about any of this. They want to say: *show a cube here, with this program, run it.*

**The idea.** An Angular **component**, `<app-cube>`. It owns a `CubePlayer` and a `CubeView` and connects them: the view displays `player.state`.

```html
<app-cube #cube class="block h-96 w-96" [program]="program" [autoplay]="true" />
<button (click)="cube.run()">Run</button>
```

**How it works.**

- It fills whatever box its parent gives it. Give it a size with CSS like any block element.
- Three inputs: `program` (what to run), `autoplay` (run it whenever it changes), `config` (default engine settings).
- Methods on the template reference: `run(program?)`, `stop()`, `reset()`, `showFace(face)`, `spin()`.
- Signals you can read: `running()`, `problem()`, `camera()`.
- `run` catches an invalid program and turns it into the `problem()` message (for example `scripts[0].blocks[2].count: must be…`) instead of crashing. A script that stops while running also sets `problem()`, as `Script 2 stopped: There is no object called "ghost"`.
- Two small effects keep it reactive: one passes `config` to the engine; the other runs the program when `autoplay` is on and `program` changes.

On the **editor page** the logic is the same, with one extra piece: a **program area** next to the cube. The page only connects them: whatever the program area emits is passed to `cube.run(...)`. Today the program area is a text box with JSON. When Blockly arrives, only that component is replaced.

**Where.** [component/cube.component.ts](src/app/cube/component/cube.component.ts), [pages/test-cube/](src/app/pages/test-cube/) (the simplest use) and [pages/editor/](src/app/pages/editor/).

---

## 13. One click, from start to finish

Let us follow one click of **Run** on the editor with the program from chapter 5, all the way to a lit LED. Every step names the chapter it came from.

```
 1. The student clicks Run.
    The program area parses its text as JSON and emits it.              (12)
 2. The page calls cube.run(program).                                   (12)
 3. The component calls player.play(program).                           (10)
 4. The engine validates the program.                                   (5)
       invalid? → ProgramError → shown as `problem()`, nothing changes.
 5. The engine builds a fresh World, Renderer and Scheduler.            (10)
    The cube is blanked.
 6. The scheduler registers the script (trigger: start).                (8)
    The engine runs a first tick(now).
 7. The scheduler resumes the script:                                   (8)
       the interpreter runs `create ball`                               (7)
          → the create command asks geometry to place the pose          (6, 2)
          → the world stores the ball.                                  (3)
       then `forever` starts its body:
          `move up`  → geometry moves the pose one cell;                (6, 2)
                       the world stores the new pose.
          `wait 0.1` → the interpreter pauses: "wake me in 100 ms".     (7)
    The scheduler notes the wake time and moves on.
 8. The renderer sees the world's version changed.                      (9)
       copies the background, then draws the ball's pixel
       (geometry's toPixel gives face 0, x 32, y 29).                   (2)
 9. The player starts its timer: 30 beats a second.                     (10)
10. Every beat: scheduler.tick(now).
       Most beats the script is asleep. Nothing changes; the renderer
       does nothing, and returns false.                                 (8, 9)
       At the 100 ms mark: the script wakes, moves again, sleeps again,
       the renderer draws the ball one cell higher.
11. Every browser frame, the view checks the state's version.           (11)
       changed → copy 20,480 colors to the LEDs.
       unchanged → skip the copy.
    Then it draws the 3D scene.
12. The student watches a red LED climb the front of the cube.
```

If the ball reaches the top edge, nothing in steps 7 to 12 changes. Step 7's `move up` just asks the geometry, which crosses onto the top face, rotates the heading, and returns a pose on the top surface. The renderer maps it to face 4. The rest of the pipeline never noticed.

---

## 14. Why it is split this way

You asked for a design where everything lives on its own and you can treat it as modules. Here are the rules that make that true, and what each buys you.

**Each layer has one job, and uses only the layers below it.**

```
state ← geometry ← world ← commands ← interpreter ← scheduler ← engine ← player ← component
                      ▲                                 
                  renderer
```

- Open `renderer.ts` to learn how pixels are produced. You will not find scheduling or validation there.
- Open `scheduler.ts` to learn when scripts run. You will not find geometry there.

**Everything up to the engine is plain TypeScript.** No Angular, no three.js, no browser APIs. That is not an accident: it is what lets you rewrite the same logic in Python for the Raspberry Pi, and what lets 142 tests run in a couple of seconds with no browser.

**Only two places know frameworks.** `view/` knows three.js. `component/` knows Angular.

**Nothing reads the clock except the loop.** Time is always handed in. So tests are deterministic and the engine behaves the same everywhere.

**Programs are data.** The JSON format is the one thing both engines must agree on. When the Python engine exists, "does it behave the same?" is answered by running the same programs through both and comparing pixels.

**One public door.** Everything outside the folder imports from [index.ts](src/app/cube/index.ts) and nothing else. If it is not exported there, it is an internal detail.

**Compiler guard rails.** Adding a block and forgetting its schema, or forgetting its case in the dispatcher, fails the build instead of failing silently at runtime.

### What is not built yet

- **Blockly.** The program area is a JSON text box. Blockly will produce the same JSON.
- **The Python engine** for the Raspberry Pi, and the shared tests that prove it behaves like the TypeScript one.
- **Strip-aware shapes.** A circle that crosses a face edge is currently cut off.
- **More object shapes** (rectangle, circle, sprite), size, velocity, collisions.
- **More triggers** (a key press, a button, motion).

---

## 15. Cheat sheets

### Where do I look to…

| I want to understand or change… | Open |
| --- | --- |
| How faces connect, headings, the floor, the top anchor | `geometry/geometry.ts` |
| What an object is | `world/cube-object.ts` |
| How objects and the background are stored | `world/world.ts` |
| What a block does, what fields it has | `blocks/<category>/<block>.ts` (see `blocks/README.md`) |
| What blocks exist, how to add one | `blocks/README.md`, `blocks/index.ts` |
| What a program, script and trigger are | `program/program.ts` |
| Why a program is rejected | `program/validate-program.ts` |
| What `wait`, `repeat`, `forever` mean | `runtime/interpreter.ts` |
| When and in what order scripts run | `runtime/scheduler.ts` |
| How the world becomes pixels | `renderer/renderer.ts` |
| How to run a program from code | `engine/cube-engine.ts`, `engine/cube-player.ts` |
| How the 3D cube looks | `view/` |
| How a page uses the cube | `component/cube.component.ts` |

### Glossary

| Word | Meaning |
| --- | --- |
| **Face** | One of the five 64×64 sides of the cube: FRONT, RIGHT, LEFT, BACK, TOP |
| **Strip** | The four side faces joined into one wrapping 256×64 band |
| **Pose** | An object's surface, cell and heading |
| **Heading** | Which screen direction the object's own "up" points |
| **Step** | A move relative to the heading: up, right, down, left |
| **Anchor** | Which side is at the bottom of the TOP face when you address it |
| **Floor** | The lowest row objects can reach on the sides |
| **Object** | A named thing in the world with a pose, a color and a visibility |
| **Background** | The layer of painted pixels that sits under the objects |
| **World** | All the objects plus the background |
| **Program** | JSON: scripts made of blocks |
| **Script** | A trigger plus a list of blocks |
| **Block** | One instruction: a command or a control block |
| **Command** | A block with an immediate effect on the world |
| **Control block** | `wait`, `repeat` or `forever`: decides when blocks run |
| **Generator** | A function that can pause with `yield` and resume later |
| **Pause** | Why a script stopped for now: a `wait`, or a `tick` |
| **Tick** | One beat of the scheduler (30 per second by default) |
| **Version** | A counter that goes up on every change, so readers can skip work |
| **State** | The pixel buffer: the colors of all LEDs |

### The rules in one list

1. A loop pauses at least once per iteration.
2. A script is resumed at most once per tick.
3. Waits count from the scheduled wake-up time (with a capped catch-up).
4. A command that changes nothing leaves the world's version alone.
5. Every frame is drawn from scratch: background first, then objects.
6. Every run starts from a new world.
7. The engine never reads the clock.
8. Programs are data, validated before they run, and unknown fields are errors.
