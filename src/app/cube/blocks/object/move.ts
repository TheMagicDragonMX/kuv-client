/**
 * BLOCK: move (object).
 *
 * Moves an object relative to its heading. If the move changes nothing (zero cells, or the
 * object is already against the floor) the world is left untouched, so nothing is redrawn.
 */

import { Step } from '../../geometry/geometry';
import { CommandDefinition } from '../block-definition';
import { FIELD, optional } from '../fields';

/**
 * Moves an object some cells in a direction relative to its own heading. Defaults to one cell.
 */
export type MoveCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'move';

	/**
	 * Name of the object to move.
	 */
	target: string;

	/**
	 * The direction to move in, relative to the object's heading.
	 */
	step: Step;

	/**
	 * How many cells to move. Defaults to one.
	 */
	count?: number;
};

/**
 * The shape of the command, its fields, and how it moves the object.
 */
export const moveBlock: CommandDefinition<MoveCommand> = {
	schema: {
		target: FIELD.text,
		step: FIELD.step,
		count: optional(FIELD.count),
	},

	/**
	 * Moves the object, doing nothing when the move changes nothing.
	 */
	apply (world, command) {
		const object = world.get(command.target);
		const pose = world.geometry.move(object.pose, command.step, command.count ?? 1);

		if (pose !== object.pose)
			world.update(command.target, { pose });
	},
};
