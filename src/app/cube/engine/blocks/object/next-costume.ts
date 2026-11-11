/**
 * BLOCK: nextCostume (object).
 *
 * Changes the look of an object to the costume after the one it wears; after the last one comes
 * the first again. In a loop with a wait it plays the costumes as an animation. An object with a
 * single look does not change.
 */

import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';
import { wearCostume } from './set-costume';

/**
 * Makes `target` wear its next costume.
 */
export type NextCostumeCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'nextCostume';

	/**
	 * Name of the object.
	 */
	target: string;
};

/**
 * The shape of the command, its fields, and how it moves to the next costume.
 */
export const nextCostumeBlock: CommandDefinition<NextCostumeCommand> = {
	schema: {
		target: FIELD.text,
	},

	/**
	 * Puts the next costume on the object. Fails if there is no such object.
	 */
	apply (world, command) {
		const object = world.get(command.target);
		const costumes = object.costumes ?? [];

		if (2 > costumes.length)
			return;

		const current = costumes.findIndex((costume) => object.costume === costume.name);

		wearCostume(world, command.target, costumes[(current + 1) % costumes.length]);
	},
};
