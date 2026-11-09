/**
 * The costumes of an object in the Objects tab: several drawings of the same object, each with a
 * name. The object starts with the first one, and the blocks "Change costume to" and "Next
 * costume" switch between them while the program runs, which animates a single object.
 *
 * The editor keeps them as drawings; this file turns them into the `create` block of the object
 * and back. An object with one costume is saved as before, without the list. This file has no UI.
 */

import { CostumeDefinition, CreateCommand } from '../../cube';
import { Drawing, drawingFromObject, objectFromDrawing } from './stage-object';

/**
 * A costume while it is being drawn.
 */
export type CostumeDraft = {
	/**
	 * What the blocks call it.
	 */
	name: string;

	/**
	 * The colors of its cells.
	 */
	drawing: Drawing;
};

/**
 * Name the costumes get, followed by a number.
 */
const NAME = 'Costume';

/**
 * A name no costume has yet: Costume 1, Costume 2...
 */
export function freeCostumeName (taken: string[]): string {
	for (let number = 1; ; number += 1)
		if (!taken.includes(`${NAME} ${number}`))
			return `${NAME} ${number}`;
}

/**
 * The costumes of an object to edit them, or one costume with `drawing` for a new object. A
 * costume too big for the grid is left out.
 */
export function costumesOfObject (object: CreateCommand | null, drawing: Drawing): CostumeDraft[] {
	const costumes = (object?.costumes ?? [])
		.map((costume) => ({ name: costume.name, drawing: drawingFromObject({ ...object as CreateCommand, color: costume.color, pixels: costume.pixels }) }))
		.filter((costume): costume is CostumeDraft => null !== costume.drawing);

	return 0 < costumes.length ? costumes : [ { name: freeCostumeName([]), drawing } ];
}

/**
 * Why a costume cannot get a name, or null when it can. `index` is the costume being renamed.
 */
export function costumeNameProblem (costumes: CostumeDraft[], index: number, name: string): string | null {
	if (!name.trim())
		return 'Give the costume a name.';

	return costumes.some((costume, at) => at !== index && name.trim() === costume.name)
		? `There is already a costume called "${name.trim()}".`
		: null;
}

/**
 * The object the costumes make: it starts with the first one, and lists them all when there is
 * more than one.
 */
export function objectFromCostumes (name: string, costumes: CostumeDraft[]): CreateCommand {
	const object = objectFromDrawing(name, costumes[0].drawing);

	if (2 > costumes.length)
		return object;

	return {
		...object,
		costumes: costumes.map((costume): CostumeDefinition => {
			const look = objectFromDrawing(name, costume.drawing);

			return { name: costume.name, color: look.color, ...look.pixels ? { pixels: look.pixels } : {} };
		}),
	};
}

/**
 * The costumes with one moved one place to the left (-1) or right (1). The first one is the one
 * the object starts with.
 */
export function moveCostume (costumes: CostumeDraft[], index: number, direction: 1 | -1): CostumeDraft[] {
	const to = index + direction;

	if (0 > to || to >= costumes.length)
		return costumes;

	const moved = [ ...costumes ];
	[ moved[index], moved[to] ] = [ moved[to], moved[index] ];

	return moved;
}
