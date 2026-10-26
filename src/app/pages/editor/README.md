# `src/app/pages/editor/`: the editor page

The cube on one side, and on the other a side panel with three tabs. The page ([editor.component.ts](editor.component.ts)) only connects them to the cube: it never decides what a program means.

| Tab | Component | What it does |
| --- | --- | --- |
| Blocks | [blocks-tab.component.ts](blocks-tab.component.ts) | Build a program out of visual blocks. **The source of truth.** Emits a program on `run` |
| Program | [program-area.component.ts](program-area.component.ts) | The program the blocks turn into, as JSON. **Read only**, with a Copy button |
| Background | [background-panel.component.ts](background-panel.component.ts) | Pick a picture, crop it, choose the faces. Edits the *environment* the cube starts from |

All three stay alive when you switch tabs (the others are only hidden), so nothing is lost: the blocks, a picture half way through cropping.

The blocks are the only way to make a program: the Program tab shows what they compile to, and nothing flows back from it. The Background tab is different: it does not make a program, it sets the stage the program starts on (see [ENGINE_MANUAL.md](../../../../ENGINE_MANUAL.md), section 9.1).

## The Blocks tab

The blocks are **only a picture of a program**. They run nothing. The container holds one card for each **script**: "When the program starts" or "every N seconds", and under it the blocks, one under the other, as rounded cards. The plus below a script (or inside a Repeat) opens a popup with the blocks that can be added; the new block goes at the end. Cards can be moved up and down and removed. "Add script" adds another script, and "Program settings" holds the engine settings (`floor`, `topAnchor`).

The state is a **workspace** ([workspace.ts](workspace.ts)): scripts, each a tree of blocks (Repeat and Repeat forever hold blocks in a `body`). It is immutable; every edit returns a new one. Two functions connect it to the JSON program:

- `compileWorkspace(workspace)`: the workspace to the program. The Program tab shows it, and Run sends it to the cube. The tab will not run while a block is unfinished (no image chosen, no face selected, an object that does not exist): the block says what is missing in red, and the Program tab asks to finish them.
- `workspaceFromProgram(program, nextId)`: a program back to blocks. This is how the **examples** work: "Load an example…" replaces the blocks with the blocks of the example, and every example comes back to the very same program (`workspace.spec.ts` checks it for all of them).

When Blockly arrives it replaces the tab, `workspace.ts` and `visual-blocks.ts`, and the page and the cube do not change.

### The blocks

| Category | Block | Becomes |
| --- | --- | --- |
| Background | Change background image | `setBackgroundImage` |
| | Change background color | `setBackgroundColor` |
| Objects | Create object | `create` |
| | Move object | `move` |
| | Put object on a cell | `moveTo` |
| | Change object color | `setColor` |
| | Show / Hide / Delete object | `show` / `hide` / `delete` |
| | Point object up | `pointUp` |
| Control | Wait | `wait` |
| | Repeat | `repeat` |
| | Repeat forever | `forever` |

**Change background image** is the one that *contains* something. The user presses "Choose image", picks a photo in a popup, crops it to a square, and the block keeps the result: the photo already shrunk to the 64 × 64 pixels of a face, the way the Raspberry Pi library does it (see `pixelate` in [cube/environment/](../../cube/environment/)). The block shows that thumbnail. When the block runs, the faces it names change to that picture. The pixels travel inside the compiled block, so the program alone is all the cube (or the Pi) needs.

**Create object** carries an optional *shape* (the pixels of an object). There is no shape editor yet: a shape that comes from an example is shown as "N pixels" and kept, and it can be cleared to a single pixel. Objects are global: a script can act on an object another script creates.

### Add a block

A block is one entry of `VISUAL_BLOCKS` in [visual-blocks.ts](visual-blocks.ts):

- `type`, `op`, `label`, `category`, `description`: how it is listed in the picker, and the engine block it stands for.
- `fields`: what the card shows. Each has a kind (`faces`, `face`, `color`, `number`, `text`, `choice`, `object`, `image`, `shape`) and the tab draws the right control for it. A new kind needs a `@case` in [blocks-tab.component.html](blocks-tab.component.html).
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
| [workspace.ts](workspace.ts), [visual-blocks.ts](visual-blocks.ts) | The workspace (scripts of blocks), its edits, and what each block is and compiles to |
| [test-workspace.ts](test-workspace.ts) | Builds workspaces in tests |
| [pixel-preview.component.ts](pixel-preview.component.ts) | Shows the 64 × 64 pixels of a face as the LEDs will, used for thumbnails |
| [faces.ts](faces.ts) | The faces as the editor lists them |
