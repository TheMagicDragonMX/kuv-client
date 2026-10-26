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
export interface ProgramConfig {
	topAnchor?: SideName;
	floor?: number;
}

/**
 * One pixel of an object's shape: `dx` cells to the right and `dy` cells down from the
 * center of the object, as seen when it faces north (the shape turns with the object).
 * Without a color it takes the color of the object.
 */
export interface ShapePixelDefinition {
	dx: number;
	dy: number;
	color?: ColorValue;
}

// ---------------------------------------------------------------------------------------
// Scripts and programs
// ---------------------------------------------------------------------------------------

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
export interface Script {
	trigger: Trigger;
	blocks: Block[];
}

/**
 * A complete program.
 */
export interface Program {
	version: 1;
	config?: ProgramConfig;

	/**
	 * Objects that exist when the program starts, created in this order before any script runs.
	 * They are `create` blocks, with names that are not repeated. Scripts act on them by name.
	 */
	objects?: CreateCommand[];
	scripts: Script[];
}
