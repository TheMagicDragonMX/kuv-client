/**
 * BLOCK: nextBackground (background).
 *
 * Switches to the background that comes after the one on the cube, in the order of the
 * Background tab; after the last one comes the first again. In a loop it cycles through them.
 */

import { EngineError } from '../../errors';
import { CommandDefinition } from '../block-definition';
import { showBackground } from './set-background';

/**
 * Shows the next background.
 */
export type NextBackgroundCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'nextBackground';
};

/**
 * The shape of the command, and how it moves to the next background.
 */
export const nextBackgroundBlock: CommandDefinition<NextBackgroundCommand> = {
	schema: {},

	/**
	 * Shows the background after the current one (the first, when none of them is on the cube),
	 * or fails when there are no backgrounds.
	 */
	apply (world) {
		const backgrounds = world.backgrounds;

		if (0 === backgrounds.length)
			throw new EngineError('There are no backgrounds to switch to. Add some in the Background tab.');

		const current = backgrounds.findIndex((background) => world.currentBackground === background.name);

		showBackground(world, backgrounds[(current + 1) % backgrounds.length]);
	},
};
