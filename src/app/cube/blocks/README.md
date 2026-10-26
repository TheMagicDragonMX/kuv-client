# `src/app/cube/blocks/`: the blocks a user can program with

Every block lives in its own file, inside the folder of its category. Open the file of a block to see **everything** about it: its shape in the JSON program, which fields it has, and what it does.

```
blocks/
├── index.ts              joins the categories; the rest of the engine only talks to this
├── block-definition.ts   what every block file must provide (schema, apply)
├── fields.ts             kinds of field value (color, face, count...) and ready-made fields
│
├── object/               change the objects of the world
│   ├── create.ts  move.ts  move-to.ts  set-color.ts
│   ├── show.ts  hide.ts  delete.ts  point-up.ts
│   └── index.ts
└── control/              decide when other blocks run
    ├── wait.ts  repeat.ts  forever.ts
    └── index.ts
```

## The blocks

| Category | Block (`op`) | Fields | What it does |
| --- | --- | --- | --- |
| object | `create` | `name, face, x, y, color, heading?, pixels?` | Creates a visible object (one pixel unless `pixels` gives a shape) |
| | `move` | `target, step, count?` | Moves an object relative to its heading (one cell by default) |
| | `moveTo` | `target, face, x, y, heading?` | Puts an object on a cell of a face |
| | `setColor` | `target, color` | Changes the color of an object |
| | `show` | `target` | Makes an object visible |
| | `hide` | `target` | Hides an object without removing it |
| | `delete` | `target` | Removes an object |
| | `pointUp` | `target` | Resets the heading so "up" is the up of the screen |
| control | `wait` | `seconds` | Pauses the script |
| | `repeat` | `times, body` | Runs `body` a fixed number of times |
| | `forever` | `body` | Runs `body` until the program stops |

`?` marks an optional field. Scripts are started by a *trigger* (`start`, `every`), which is not a block: it lives in [program/program.ts](../program/program.ts).

## Anatomy of a block file

Each file exports two things: the **type** of the block, and its **definition**. Take [object/set-color.ts](object/set-color.ts):

```ts
export interface SetColorCommand {          // 1. the shape in the JSON program
	op: 'setColor';
	target: string;
	color: ColorValue;
}

export const setColorBlock: CommandDefinition<SetColorCommand> = {
	schema: {                               // 2. which fields, and what kind of value each takes
		target: FIELD.text,
		color: FIELD.color,
	},

	apply (world, command) {                // 3. what it does to the world
		...
	},
};
```

| Part | Required | Used by |
| --- | --- | --- |
| `schema` | always | The validator (`program/validate-program.ts`), and whoever builds the Blockly block: it is the list of that block's inputs |
| `apply` | commands | The commands layer (`commands/apply-command.ts`). Control blocks have none |

The compiler keeps you honest: `schema` must have exactly the fields of the interface (a missing or extra field does not compile), and `optional(...)` in the schema should match `?` in the interface.

## Add a block

Example: a `turn` block in the `object` category.

1. **Create the file** `object/turn.ts`, following the anatomy above. Copy a similar block (`point-up.ts` is the smallest) and change it. Name the type `TurnCommand` and the definition `turnBlock`.
2. **Register it** in `object/index.ts`: add `TurnCommand` to the `ObjectCommand` union, and `turn: turnBlock` to the `OBJECT_BLOCKS` table. Forgetting either one is a compile error.
3. **Test it** in `commands/commands.spec.ts` (what it does) and `program/validate-program.spec.ts` (what it accepts and rejects).
4. **Document it**: add a row to the table above and to the block tables in [ENGINE_MANUAL.md](../../../../ENGINE_MANUAL.md#6-what-a-block-actually-does).

Nothing else changes: the validator, the dispatcher and the program types all read the registry. A **control** block is the same, except it has no `apply`; the interpreter (`runtime/interpreter.ts`) must also learn what it means, and its `switch` fails to compile until it does.

If the block needs a new kind of value (say `angle`), add it to `FieldKind` and `FIELD` in [fields.ts](fields.ts), and teach `validateField` in `program/validate-program.ts` to check it.

## Add a category

Example: `sound/`.

1. Create the folder `sound/` with its block files.
2. Create `sound/index.ts` like the existing ones: a union of the commands (`SoundCommand`) and a table (`SOUND_BLOCKS`) typed `{ [K in SoundCommand['op']]: CommandDefinition<...> }`.
3. In `blocks/index.ts`, add `SoundCommand` to the `Command` union and spread `...SOUND_BLOCKS` into `COMMAND_BLOCKS`.
4. Add it to the folder tree and table in this file.

## Rules

- **One block per file**, named after its `op` in kebab-case (`moveTo` → `move-to.ts`). The definition is `<op>Block`; `delete` is `deleteBlock` because `delete` is a reserved word.
- **A block file never imports another block.** If two blocks share logic, the logic belongs in a lower layer (`geometry/`, `drawing/`, `world/`).
- **Blocks never compute edges, rotations or pixels themselves.** They call the geometry or the drawing primitives, like the existing ones.
- **No block writes to the world's background layer.** That layer belongs to the environment (the pictures the user puts on the faces), so objects, which blocks create and move, always draw over it and never change it.
- **A command that changes nothing must not touch the world**, so the world's `version` stays still and the renderer can skip the frame.
- **Outside this folder, import from `blocks/index.ts`**, never from a block file.
- Every file starts with a comment saying what the block is and does.
