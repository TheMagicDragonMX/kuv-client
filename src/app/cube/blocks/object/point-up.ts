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
export type PointUpCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'pointUp';

	/**
	 * Name of the object to turn.
	 */
	target: string;
};

/**
 * The shape of the command, its fields, and how it turns the object.
 */
export const pointUpBlock: CommandDefinition<PointUpCommand> = {
	schema: {
		target: FIELD.text,
	},

	/**
	 * Turns the object to face up.
	 */
	apply (world, command) {
		const object = world.get(command.target);
		const pose = world.geometry.pointUp(object.pose);

		if (pose.heading !== object.pose.heading)
			world.update(command.target, { pose });
	},
};
