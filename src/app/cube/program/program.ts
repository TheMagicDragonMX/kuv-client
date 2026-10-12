/**
 * LAYER: program format (types).
 *
 * A program is plain data, the same JSON that Blockly will produce and that the Raspberry Pi
 * engine will read. This file only describes its shape; it contains no behavior.
 *
 *   Program
 *    ├─ config    optional engine settings (top anchor, floor)
 *    └─ scripts   each one is a trigger plus a list of blocks
 *                  └─ blocks  commands (do something now) and control blocks (wait, repeat, forever)
 *
 * Names are readable strings ('FRONT', 'NORTH', '#ff0000') so programs can be read and written
 * by people. `names.ts` converts them to the engine's internal values.
 */

import { Step } from '../geometry/geometry';

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
 * A color written as `#rrggbb`.
 */
export type ColorValue = string;

/**
 * Engine settings a program can carry. See `GeometryConfig` for what each one does.
 */
export interface ProgramConfig {
	topAnchor?: SideName;
	floor?: number;
}

// ---------------------------------------------------------------------------------------
// Object commands: change the objects of the world.
// ---------------------------------------------------------------------------------------

/**
 * Creates an object. The name must be new. The heading defaults to north.
 */
export interface CreateCommand {
	op: 'create';
	name: string;
	face: FaceName;
	x: number;
	y: number;
	color: ColorValue;
	heading?: HeadingName;
}

/**
 * Moves an object some cells in a direction relative to its own heading. Defaults to one cell.
 */
export interface MoveCommand {
	op: 'move';
	target: string;
	step: Step;
	count?: number;
}

/**
 * Puts an object on a cell of a face. The heading is reset to the given one, or north.
 */
export interface MoveToCommand {
	op: 'moveTo';
	target: string;
	face: FaceName;
	x: number;
	y: number;
	heading?: HeadingName;
}

/**
 * Changes the color of an object.
 */
export interface SetColorCommand {
	op: 'setColor';
	target: string;
	color: ColorValue;
}

/**
 * Makes an object visible.
 */
export interface ShowCommand {
	op: 'show';
	target: string;
}

/**
 * Hides an object without removing it.
 */
export interface HideCommand {
	op: 'hide';
	target: string;
}

/**
 * Removes an object.
 */
export interface DeleteCommand {
	op: 'delete';
	target: string;
}

/**
 * Resets the heading of an object so its "up" is the up of the screen again.
 */
export interface PointUpCommand {
	op: 'pointUp';
	target: string;
}

/**
 * Every command that acts on an object.
 */
export type ObjectCommand =
	| CreateCommand
	| MoveCommand
	| MoveToCommand
	| SetColorCommand
	| ShowCommand
	| HideCommand
	| DeleteCommand
	| PointUpCommand;

// ---------------------------------------------------------------------------------------
// Background commands (the "advanced" tier): paint pixels that stay on the cube.
// ---------------------------------------------------------------------------------------

/**
 * Paints the whole background one color (black by default). Objects are not affected.
 */
export interface ClearBackgroundCommand {
	op: 'clearBackground';
	color?: ColorValue;
}

/**
 * Paints one pixel of the background.
 */
export interface SetPixelCommand {
	op: 'setPixel';
	face: FaceName;
	x: number;
	y: number;
	color: ColorValue;
}

/**
 * Draws a straight line on the background.
 */
export interface DrawLineCommand {
	op: 'drawLine';
	face: FaceName;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	color: ColorValue;
}

/**
 * Draws the outline of a rectangle on the background.
 */
export interface DrawRectCommand {
	op: 'drawRect';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	color: ColorValue;
}

/**
 * Fills a rectangle on the background.
 */
export interface FillRectCommand {
	op: 'fillRect';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	color: ColorValue;
}

/**
 * Draws the outline of a circle on the background.
 */
export interface DrawCircleCommand {
	op: 'drawCircle';
	face: FaceName;
	cx: number;
	cy: number;
	radius: number;
	color: ColorValue;
}

/**
 * Fills a circle on the background.
 */
export interface FillCircleCommand {
	op: 'fillCircle';
	face: FaceName;
	cx: number;
	cy: number;
	radius: number;
	color: ColorValue;
}

/**
 * Copies a picture onto the background. `pixels` has width * height colors, row after row.
 */
export interface DrawBitmapCommand {
	op: 'drawBitmap';
	face: FaceName;
	x: number;
	y: number;
	width: number;
	height: number;
	pixels: ColorValue[];
}

/**
 * Every command that paints the background.
 */
export type BackgroundCommand =
	| ClearBackgroundCommand
	| SetPixelCommand
	| DrawLineCommand
	| DrawRectCommand
	| FillRectCommand
	| DrawCircleCommand
	| FillCircleCommand
	| DrawBitmapCommand;

/**
 * A block that takes effect immediately. The commands layer knows how to apply these.
 */
export type Command = ObjectCommand | BackgroundCommand;

// ---------------------------------------------------------------------------------------
// Control blocks: decide when and how many times other blocks run. The runtime handles these.
// ---------------------------------------------------------------------------------------

/**
 * Pauses the script for some seconds of real time.
 */
export interface WaitBlock {
	op: 'wait';
	seconds: number;
}

/**
 * Runs its body a fixed number of times.
 */
export interface RepeatBlock {
	op: 'repeat';
	times: number;
	body: Block[];
}

/**
 * Runs its body again and again until the program is stopped.
 */
export interface ForeverBlock {
	op: 'forever';
	body: Block[];
}

/**
 * A block that controls the flow of a script.
 */
export type ControlBlock = WaitBlock | RepeatBlock | ForeverBlock;

/**
 * Any block a script can contain.
 */
export type Block = Command | ControlBlock;

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
	scripts: Script[];
}
