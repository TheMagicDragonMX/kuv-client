# `src/app/pages/editor/`: the editor page

The cube on one side, and on the other a side panel with three tabs. The page ([editor.component.ts](editor.component.ts)) only connects them to the cube: it never decides what a program means.

| Tab | Component | What it does |
| --- | --- | --- |
| Blocks | [blocks-tab.component.ts](blocks-tab.component.ts) | Build a program out of visual blocks. Emits a program on `run` |
| Program | [program-area.component.ts](program-area.component.ts) | The same kind of program, written as JSON. Emits whatever is in the text box on `run` |
| Background | [background-panel.component.ts](background-panel.component.ts) | Pick a picture, crop it, choose the faces. Edits the *environment* the cube starts from |

All three stay alive when you switch tabs (the others are only hidden), so nothing is lost: the stack of blocks, the JSON text, a picture half way through cropping.

The Blocks and Program tabs are two ways to make the same thing, a program the cube runs. The Background tab is different: it does not make a program, it sets the stage the program starts on (see [ENGINE_MANUAL.md](../../../../ENGINE_MANUAL.md), section 9.1).

## The Blocks tab

The blocks are **only a picture of a program**. They run nothing. The tab shows them as rounded cards one under the other, inside a container, with a plus button below the last one. The plus opens a popup with the blocks that can be added; the new block goes at the end. Cards can be moved up and down and removed. "Repeat forever" wraps the whole stack in a `forever`.

When the user presses Run, the stack is turned into the same JSON program the cube already runs (`compileBlocks` in [visual-blocks.ts](visual-blocks.ts)). The tab will not run while a block is unfinished (no image chosen, no face selected, an object that does not exist yet): the block says what is missing in red.

When Blockly arrives it replaces the tab and `visual-blocks.ts`, and the page and the cube do not change.

### The blocks

| Category | Block | Becomes |
| --- | --- | --- |
| Background | Change background image | `setBackgroundImage` |
| | Change background color | `setBackgroundColor` |
| Objects | Create object | `create` |
| | Move object | `move` |
| | Change object color | `setColor` |
| Time | Wait | `wait` |

**Change background image** is the one that *contains* something. The user presses "Choose image", picks a photo in a popup, crops it to a square, and the block keeps the result: the photo already shrunk to the 64 × 64 pixels of a face, the way the Raspberry Pi library does it (see `pixelate` in [cube/environment/](../../cube/environment/)). The block shows that thumbnail. When the block runs, the faces it names change to that picture. The pixels travel inside the compiled block, so the program alone is all the cube (or the Pi) needs.

### Add a block

A block is one entry of `VISUAL_BLOCKS` in [visual-blocks.ts](visual-blocks.ts):

- `type`, `label`, `category`, `description`: how it is listed in the picker.
- `fields`: what the card shows. Each has a kind (`faces`, `face`, `color`, `number`, `text`, `choice`, `object`, `image`) and the tab draws the right control for it. A new kind needs a `@case` in [blocks-tab.component.html](blocks-tab.component.html).
- `defaults`: the values a new block starts with.
- `problem` (optional): what is missing, besides what the kinds already check (a number must be a number, faces cannot be empty).
- `compile`: the engine blocks it becomes. If it needs an engine block that does not exist yet, add that first (see [cube/blocks/README.md](../../cube/blocks/README.md)).

Add a test next to the others in [visual-blocks.spec.ts](visual-blocks.spec.ts): the spec checks that every block starts with values that make a valid program.

## Other files

| File | What it is |
| --- | --- |
| [image-cropper.component.ts](image-cropper.component.ts), [crop.ts](crop.ts) | The square cropper (drag, wheel or slider to zoom, arrow keys) and its math, used by the Background tab and by the image block |
| [pixel-preview.component.ts](pixel-preview.component.ts) | Shows the 64 × 64 pixels of a face as the LEDs will, used for thumbnails |
| [faces.ts](faces.ts) | The faces as the editor lists them |
