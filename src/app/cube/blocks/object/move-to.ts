/**
 * BLOCK: moveTo (object).
 *
 * Puts an object on a cell of a face, with the given heading or north.
 */

import { FACE_BY_NAME, HEADING_BY_NAME } from '../../program/names';
import { FaceName, HeadingName } from '../../program/program';
import { CommandDefinition } from '../block-definition';
import { FIELD, optional } from '../fields';

/**
 * Puts an object on a cell of a face. The heading is reset to the given one, or north.
 */
export type MoveToCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'moveTo';

	/**
	 * Name of the object to move.
	 */
	target: string;

	/**
	 * The face to move it to.
	 */
	face: FaceName;

	/**
	 * Column on that face.
	 */
	x: number;

	/**
	 * Row on that face.
	 */
	y: number;

	/**
	 * Where the object faces afterwards. Keeps its heading when omitted.
	 */
	heading?: HeadingName;
};

/**
 * The shape of the command, its fields, and how it moves the object.
 */
export const moveToBlock: CommandDefinition<MoveToCommand> = {
	schema: {
		target: FIELD.text,
		face: FIELD.face,
		x: FIELD.integer,
		y: FIELD.integer,
		heading: optional(FIELD.heading),
	},

	/**
	 * Puts the object at the new place.
	 */
	apply (world, command) {
		world.get(command.target);

		world.update(command.target, {
			pose: world.geometry.place({
				face: FACE_BY_NAME[command.face],
				x: command.x,
				y: command.y,
				heading: command.heading && HEADING_BY_NAME[command.heading],
			}),
		});
	},
};
