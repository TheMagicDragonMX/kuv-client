/**
 * BLOCK: setCostume (object).
 *
 * Changes the look of an object to one of its costumes, by name: it takes the costume's shape and
 * color and keeps its place. Switching costumes one after another, with waits between them,
 * animates a single object.
 */

import { EngineError } from '../../errors';
import { Costume } from '../../world/cube-object';
import { World } from '../../world/world';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Makes `target` wear the costume called `name`.
 */
export type SetCostumeCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'setCostume';

	/**
	 * Name of the object.
	 */
	target: string;

	/**
	 * Name of the costume.
	 */
	name: string;
};

/**
 * Makes an object wear a costume.
 */
export function wearCostume (world: World, target: string, costume: Costume): void {
	world.update(target, { shape: costume.shape, color: costume.color, costume: costume.name });
}

/**
 * The shape of the command, its fields, and how it changes the costume.
 */
export const setCostumeBlock: CommandDefinition<SetCostumeCommand> = {
	schema: {
		target: FIELD.text,
		name: FIELD.text,
	},

	/**
	 * Puts the costume on the object, or fails when the object has no costume with that name.
	 */
	apply (world, command) {
		const costume = world.get(command.target).costumes?.find((candidate) => command.name === candidate.name);

		if (!costume)
			throw new EngineError(`The object "${command.target}" has no costume called "${command.name}"`);

		wearCostume(world, command.target, costume);
	},
};
