/**
 * BLOCK: pointUp (object).
 *
 * Resets the heading of an object so its "up" is the up of the screen again. Nothing is
 * touched if it already points up.
 */

import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Resets the heading of an object so its "up" is the up of the screen again.
 */
export interface PointUpCommand {
	op: 'pointUp';
	target: string;
}

export const pointUpBlock: CommandDefinition<PointUpCommand> = {
	schema: {
		target: FIELD.text,
	},

	apply (world, command) {
		const object = world.get(command.target);
		const pose = world.geometry.pointUp(object.pose);

		if (pose.heading !== object.pose.heading)
			world.update(command.target, { pose });
	},
};
