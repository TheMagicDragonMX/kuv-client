import { Command } from '../../cube/command';

/**
 * Kind of input a command parameter needs.
 */
export type FieldType = 'face' | 'number' | 'color';

/**
 * One parameter of a command, as shown in the menu.
 */
export interface FieldSpec {
	/**
	 * Property name in the resulting Command.
	 */
	key: string;

	/**
	 * Text shown next to the input.
	 */
	label: string;

	/**
	 * Which input to render and how to convert its value.
	 */
	type: FieldType;

	/**
	 * Initial value, as the input holds it (hex string for colors).
	 */
	defaultValue: string;
}

/**
 * A command that can be launched from the menu.
 */
export interface CommandSpec {
	/**
	 * The `op` of the Command this spec builds.
	 */
	op: Command['op'];

	/**
	 * Name shown on the menu button.
	 */
	label: string;

	/**
	 * Parameters, in display order.
	 */
	fields: FieldSpec[];
}

const face: FieldSpec = { key: 'face', label: 'Face', type: 'face', defaultValue: '0' };

const color = (defaultValue: string): FieldSpec => ({ key: 'color', label: 'Color', type: 'color', defaultValue });

const num = (key: string, label: string, defaultValue: number): FieldSpec => ({
	key,
	label,
	type: 'number',
	defaultValue: String(defaultValue),
});

/**
 * Commands exposed in the simulation menu (drawBitmap needs pixel data, so it is not listed yet).
 */
export const COMMAND_SPECS: CommandSpec[] = [
	{ op: 'clear', label: 'Clear', fields: [ color('#000000') ] },
	{ op: 'setPixel', label: 'Set pixel', fields: [ face, num('x', 'X', 32), num('y', 'Y', 32), color('#ffffff') ] },
	{
		op: 'drawLine',
		label: 'Line',
		fields: [ face, num('x0', 'X0', 4), num('y0', 'Y0', 4), num('x1', 'X1', 59), num('y1', 'Y1', 59), color('#4cc9f0') ],
	},
	{
		op: 'drawRect',
		label: 'Rect',
		fields: [ face, num('x', 'X', 8), num('y', 'Y', 8), num('width', 'Width', 48), num('height', 'Height', 48), color('#ffd166') ],
	},
	{
		op: 'fillRect',
		label: 'Fill rect',
		fields: [ face, num('x', 'X', 16), num('y', 'Y', 16), num('width', 'Width', 32), num('height', 'Height', 32), color('#06d6a0') ],
	},
	{ op: 'drawCircle', label: 'Circle', fields: [ face, num('cx', 'Center X', 32), num('cy', 'Center Y', 32), num('radius', 'Radius', 20), color('#ff4d6d') ] },
	{ op: 'fillCircle', label: 'Fill circle', fields: [ face, num('cx', 'Center X', 32), num('cy', 'Center Y', 32), num('radius', 'Radius', 12), color('#c77dff') ] },
];

/**
 * Builds a Command from a spec and the raw input values entered for it.
 */
export function buildCommand (spec: CommandSpec, values: Record<string, string>): Command {
	const command: Record<string, unknown> = { op: spec.op };

	for (const field of spec.fields) {
		const raw = values[field.key] ?? field.defaultValue;
		command[field.key] = field.type === 'color'
			? parseInt(raw.replace('#', ''), 16)
			: Number(raw);
	}

	return command as Command;
}
