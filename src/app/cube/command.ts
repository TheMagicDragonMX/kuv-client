import { Color, CubeState, Face } from './cube-state';
import { clear, setPixel } from './commands/pixel';
import { drawCircle, drawLine, drawRect, fillCircle, fillRect } from './commands/shapes';
import { drawBitmap } from './commands/text';

/**
 * A single cube action expressed as plain data, so a program (a list of
 * commands) can be stored, sent to the Raspberry Pi and replayed anywhere.
 */
export type Command =
	| { op: 'clear'; color?: Color }
	| { op: 'setPixel'; face: Face; x: number; y: number; color: Color }
	| { op: 'drawLine'; face: Face; x0: number; y0: number; x1: number; y1: number; color: Color }
	| { op: 'drawRect'; face: Face; x: number; y: number; width: number; height: number; color: Color }
	| { op: 'fillRect'; face: Face; x: number; y: number; width: number; height: number; color: Color }
	| { op: 'drawCircle'; face: Face; cx: number; cy: number; radius: number; color: Color }
	| { op: 'fillCircle'; face: Face; cx: number; cy: number; radius: number; color: Color }
	| { op: 'drawBitmap'; face: Face; x: number; y: number; width: number; height: number; pixels: Color[] };

/**
 * Applies one command to the cube state.
 */
export function executeCommand (state: CubeState, command: Command): void {
	switch (command.op) {
		case 'clear':
			return clear(state, command.color);
		case 'setPixel':
			return setPixel(state, command.face, command.x, command.y, command.color);
		case 'drawLine':
			return drawLine(state, command.face, command.x0, command.y0, command.x1, command.y1, command.color);
		case 'drawRect':
			return drawRect(state, command.face, command.x, command.y, command.width, command.height, command.color);
		case 'fillRect':
			return fillRect(state, command.face, command.x, command.y, command.width, command.height, command.color);
		case 'drawCircle':
			return drawCircle(state, command.face, command.cx, command.cy, command.radius, command.color);
		case 'fillCircle':
			return fillCircle(state, command.face, command.cx, command.cy, command.radius, command.color);
		case 'drawBitmap':
			return drawBitmap(state, command.face, command.x, command.y, command.width, command.height, command.pixels);
	}
}

/**
 * Applies a whole program, in order.
 */
export function executeProgram (state: CubeState, program: Command[]): void {
	for (const command of program) {
		executeCommand(state, command);
	}
}
