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
export interface MoveCommand {
	op: 'move';
	target: string;
	step: Step;
	count?: number;
}

export const moveBlock: CommandDefinition<MoveCommand> = {
	schema: {
		target: FIELD.text,
		step: FIELD.step,
		count: optional(FIELD.count),
	},

	apply (world, command) {
		const object = world.get(command.target);
		const pose = world.geometry.move(object.pose, command.step, command.count ?? 1);

		if (pose !== object.pose)
			world.update(command.target, { pose });
	},
};
