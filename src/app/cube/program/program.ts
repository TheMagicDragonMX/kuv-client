/**
 * LAYER: program format (types).
 *
 * A program is plain data, the same JSON that Blockly will produce and that the Raspberry Pi
 * engine will read. This file only describes its shape; it contains no behavior.
 *
 *   Program
 *    ├─ config    optional engine settings (top anchor, floor)
 *    ├─ objects   optional objects that exist from the start, before any script runs
 *    └─ scripts   each one is a trigger plus a list of blocks
 *                  └─ blocks  commands (do something now) and control blocks (wait, repeat, forever);
 *                             every block has its own file in `blocks/`
 *
 * Names are readable strings ('FRONT', 'NORTH', '#ff0000') so programs can be read and written
 * by people. `names.ts` converts them to the engine's internal values.
 */

import { Block, CreateCommand } from '../blocks';

/**
 * Name of a face of the cube.
 */
export type FaceName = 'FRONT' | 'RIGHT' | 'BACK' | 'LEFT' | 'TOP';

/**
 * Name of a side face (every face but the top).
 */
export type SideName = Exclude<FaceName, 'TOP'>;

/**
 * Name of a direction on the screen of a surface.
 */
export type HeadingName = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

/**
 * A color written as `#RRGGBB`.
 */
export type ColorValue = string;

/**
 * Engine settings a program can carry. See `GeometryConfig` for what each one does.
 */
export type ProgramConfig = {
	/**
	 * The side face the top face is lined up with.
	 */
	topAnchor?: SideName;

	/**
	 * Row of the floor objects cannot go below.
	 */
	floor?: number;
};

/**
 * One pixel of an object's shape: `dx` cells to the right and `dy` cells down from the
 * center of the object, as seen when it faces north (the shape turns with the object).
 * Without a color it takes the color of the object.
 */
export type ShapePixelDefinition = {
	/**
	 * Cells to the right of the center, when the object faces north.
	 */
	dx: number;

	/**
	 * Cells down from the center, when the object faces north.
	 */
	dy: number;

	/**
	 * Color of this pixel. The object's own color when omitted.
	 */
	color?: ColorValue;
};

/**
 * --------------------------------------------------------------------------------------- Scripts
 * and programs
 * ---------------------------------------------------------------------------------------
 */

/**
 * The event that starts a script.
 *
 *   start  runs once, as soon as the program starts
 *   every  runs again every `seconds`; a run that is still going when the next one is due is skipped
 */
export type Trigger =
	| { type: 'start' }
	| { type: 'every'; seconds: number };

/**
 * A stack of blocks and the event that starts it.
 */
export type Script = {
	/**
	 * The event that starts the script.
	 */
	trigger: Trigger;

	/**
	 * The blocks the script runs, in order.
	 */
	blocks: Block[];
};

/**
 * A complete program.
 */
export type Program = {
	/**
	 * Version of the program format.
	 */
	version: 1;

	/**
	 * Engine settings for this program.
	 */
	config?: ProgramConfig;

	/**
	 * Objects that exist when the program starts, created in this order before any script runs.
	 * They are `create` blocks, with names that are not repeated. Scripts act on them by name.
	 */
	objects?: CreateCommand[];

	/**
	 * The scripts of the program.
	 */
	scripts: Script[];
};
