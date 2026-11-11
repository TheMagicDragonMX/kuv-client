/**
 * BLOCK: setBackground (background).
 *
 * Switches to one of the backgrounds the user made in the Background tab, by its name: the faces
 * it has a picture for show it, and the others keep what they show, so backgrounds on different
 * faces combine. The backgrounds are in the world (the environment puts them there), so the block
 * only carries a name.
 */

import { drawBitmap } from '../../drawing/bitmap';
import { EngineError } from '../../errors';
import { FACE_BY_NAME } from '../../program/names';
import { FaceName } from '../../program/program';
import { FACE_RESOLUTION } from '../../state/cube-state';
import { NamedBackground, World } from '../../world/world';
import { CommandDefinition } from '../block-definition';
import { FIELD } from '../fields';

/**
 * Shows the background called `name`.
 */
export type SetBackgroundCommand = {
	/**
	 * Identifies the command.
	 */
	op: 'setBackground';

	/**
	 * The name of the background.
	 */
	name: string;
};

/**
 * Paints the pictures of a background on the faces it has them for, and remembers it is the last
 * one shown.
 */
export function showBackground (world: World, background: NamedBackground): void {
	for (const [ name, face ] of Object.entries(FACE_BY_NAME) as [ FaceName, number ][]) {
		const pixels = background.images[name];

		if (pixels)
			drawBitmap(world.background, face, 0, 0, FACE_RESOLUTION, FACE_RESOLUTION, pixels);
	}

	world.currentBackground = background.name;
}

/**
 * The shape of the command, its fields, and how it switches the background.
 */
export const setBackgroundBlock: CommandDefinition<SetBackgroundCommand> = {
	schema: {
		name: FIELD.text,
	},

	/**
	 * Shows the background, or fails when there is none with that name.
	 */
	apply (world, command) {
		const background = world.backgrounds.find((candidate) => command.name === candidate.name);

		if (!background)
			throw new EngineError(`There is no background called "${command.name}"`);

		showBackground(world, background);
	},
};
