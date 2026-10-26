# `src/app/pages/editor/`: the editor page

The cube on one side, and on the other a side panel with four tabs. The page ([editor.component.ts](editor.component.ts)) only connects them to the cube: it never decides what a program means.

| Tab | Component | What it does |
| --- | --- | --- |
| Blocks | [blocks-tab.component.ts](blocks-tab.component.ts) | Build a program out of visual blocks. **The source of truth.** Emits a program on `run` |
| Objects | [objects-panel.component.ts](objects-panel.component.ts) | Make the objects the blocks act on, drawing them in a pixel editor ([object-editor.component.ts](object-editor.component.ts)) |
| Program | [program-area.component.ts](program-area.component.ts) | The program the blocks turn into, as JSON. **Read only**, with a Copy button |
| Background | [background-panel.component.ts](background-panel.component.ts) | Pick a picture, crop it, choose the faces. Edits the *environment* the cube starts from |

All three stay alive when you switch tabs (the others are only hidden), so nothing is lost: the blocks, a picture half way through cropping.

The blocks and the objects are the only things a program is made from: the Program tab shows what they compile to, and nothing flows back from it. The Background tab is different: it does not make a program, it sets the stage the program starts on (see [ENGINE_MANUAL.md](../../../../ENGINE_MANUAL.md), section 9.1).

## The Objects tab

Objects are made here, **before** the blocks use them. "New object" opens a pixel editor: a grid with a highlighted pixel in the middle, which is the object itself (the cell blocks move; the pixels around it follow). The user picks a color, paints cells around the center (drag to paint, Erase to empty a cell, Clear to start over), names the object and presses "Create object". An object with only the center painted is one pixel; otherwise its shape is every painted cell. Objects start in the middle of the front face (`START` in [stage-object.ts](stage-object.ts)); the blocks move them from there. Existing objects can be edited (not renamed, because blocks use the name) or deleted; a block that used a deleted object asks for another one.

The list lives in the page and goes to the Blocks tab, which puts it in the program as `objects` (see [ENGINE_MANUAL.md](../../../../ENGINE_MANUAL.md)); the engine creates them when the program starts, before any script. They show on the cube when the program runs. The grid is 15 × 15, so the editor can only open objects that fit it; the objects of some examples (a belt across all four sides) are bigger, and have no Edit button.

## The Blocks tab

The blocks are **only a picture of a program**. They run nothing. The container holds one card for each **script**: "When the program starts" or "every N seconds", and under it the blocks, one under the other, as rounded cards. The plus below a script (or inside a Repeat) opens a popup with the blocks that can be added; the new block goes at the end. Cards can be moved up and down and removed. "Add script" adds another script, and "Program settings" holds the engine settings (`floor`, `topAnchor`).

The state is a **workspace** ([workspace.ts](workspace.ts)): scripts, each a tree of blocks (Repeat and Repeat forever hold blocks in a `body`). It is immutable; every edit returns a new one. Two functions connect it to the JSON program:

- `compileWorkspace(workspace)`: the workspace to the program. The Program tab shows it, and Run sends it to the cube. The tab will not run while a block is unfinished (no image chosen, no face selected, an object that was not made): the block says what is missing in red, and the Program tab asks to finish them.
- `blocksFromProgram(program, nextId)`: a program back to blocks *and objects*. This is how the **examples** work: "Load an example…" replaces both. The `create` blocks at the start of the scripts of an example become objects of the Objects tab, and what follows becomes blocks. `workspace.spec.ts` checks, for every example, that the result runs exactly like the example.

When Blockly arrives it replaces the tab, `workspace.ts` and `visual-blocks.ts`, and the page and the cube do not change.

### The blocks

| Category | Block | Becomes |
| --- | --- | --- |
| Background | Change background image | `setBackgroundImage` |
| | Change background color | `setBackgroundColor` |
| Objects | Move object | `move` |
| | Put object on a cell | `moveTo` |
| | Change object color | `setColor` |
| | Show / Hide / Delete object | `show` / `hide` / `delete` |
| | Point object up | `pointUp` |
| Control | Wait | `wait` |
| | Repeat | `repeat` |
| | Repeat forever | `forever` |

**Change background image** is the one that *contains* something. The user presses "Choose image", picks a photo in a popup, crops it to a square, and the block keeps the result: the photo already shrunk to the 64 × 64 pixels of a face, the way the Raspberry Pi library does it (see `pixelate` in [cube/environment/](../../cube/environment/)). The block shows that thumbnail. When the block runs, the faces it names change to that picture. The pixels travel inside the compiled block, so the program alone is all the cube (or the Pi) needs.

There is no "Create object" block: objects are made in the Objects tab, and the blocks only handle them. Every block that acts on an object has an Object dropdown with the objects made there.

### Add a block

A block is one entry of `VISUAL_BLOCKS` in [visual-blocks.ts](visual-blocks.ts):

- `type`, `op`, `label`, `category`, `description`: how it is listed in the picker, and the engine block it stands for.
- `fields`: what the card shows. Each has a kind (`faces`, `face`, `color`, `number`, `text`, `choice`, `object`, `image`) and the tab draws the right control for it. A new kind needs a `@case` in [blocks-tab.component.html](blocks-tab.component.html).
- `container` (optional): it holds other blocks, like Repeat.
- `defaults`: the values a new block starts with.
- `problem` (optional): what is missing, besides what the kinds already check (a number must be a number, faces cannot be empty).
- `compile`: the engine block it becomes. Leave out what is on its default (an optional field the user did not set), so a program that was loaded comes back the same.
- `read`: the reverse of `compile`: the values of the block, from the engine block.

If it needs an engine block that does not exist yet, add that first (see [cube/blocks/README.md](../../cube/blocks/README.md)). Add a test in [visual-blocks.spec.ts](visual-blocks.spec.ts): the spec checks that every block starts with values that make a valid program and that `read` undoes `compile`.

## Other files

| File | What it is |
| --- | --- |
| [image-cropper.component.ts](image-cropper.component.ts), [crop.ts](crop.ts) | The square cropper (drag, wheel or slider to zoom, arrow keys) and its math, used by the Background tab and by the image block |
| [stage-object.ts](stage-object.ts), [object-preview.component.ts](object-preview.component.ts) | A drawing and the object it makes (and back), and the thumbnail of an object |
| [workspace.ts](workspace.ts), [visual-blocks.ts](visual-blocks.ts) | The workspace (scripts of blocks), its edits, and what each block is and compiles to |
| [test-workspace.ts](test-workspace.ts) | Builds workspaces in tests |
| [pixel-preview.component.ts](pixel-preview.component.ts) | Shows the 64 × 64 pixels of a face as the LEDs will, used for thumbnails |
| [faces.ts](faces.ts) | The faces as the editor lists them |
