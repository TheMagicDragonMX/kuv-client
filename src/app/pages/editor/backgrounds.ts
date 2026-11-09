/**
 * The backgrounds of the Background tab: a list of named sets of pictures, one of which is the
 * background the program starts with (the selected one). A program switches between them with
 * the blocks "Change background to" and "Next background".
 *
 * They live in the environment: `backgrounds` is the list, `startBackground` the name of the
 * selected one and `background` what the cube shows before running and after a reset. Backgrounds
 * combine face by face: `background` has the pictures of the selected one and, on the faces it
 * has none for, those of the others (the first in the list that has one). So a background on the
 * front and another on the right are both seen. These functions keep the three in agreement, so
 * the panel only calls them. This file has no UI.
 */

import { BackgroundImages, Environment, FaceName, NamedBackground } from '../../cube';

/**
 * Name the backgrounds get, followed by a number.
 */
const NAME = 'Background';

/**
 * The order faces are looked at to pick the picture that stands for a background.
 */
const FACE_ORDER: FaceName[] = [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ];

/**
 * The environment with its backgrounds in order: one selected, and `background` showing it over
 * the others. An environment from before there were several backgrounds becomes one background
 * with its pictures.
 */
export function normalizeBackgrounds (environment: Environment): Environment {
	const backgrounds = environment.backgrounds?.length
		? environment.backgrounds
		: [ { name: `${NAME} 1`, images: { ...environment.background } } ];
	const start = backgrounds.find((background) => environment.startBackground === background.name) ?? backgrounds[0];

	return { ...environment, backgrounds, startBackground: start.name, background: combine(start, backgrounds) };
}

/**
 * The pictures of a background, and on the faces it has none for, those of the first other
 * background that has one.
 */
function combine (first: NamedBackground, backgrounds: NamedBackground[]): BackgroundImages {
	const images: BackgroundImages = {};

	for (const background of [ first, ...backgrounds ])
		for (const face of FACE_ORDER)
			images[face] ??= background.images[face];

	for (const face of FACE_ORDER)
		if (!images[face])
			delete images[face];

	return images;
}

/**
 * The backgrounds of an environment, as `normalizeBackgrounds` leaves them.
 */
export function backgroundsOf (environment: Environment): NamedBackground[] {
	return normalizeBackgrounds(environment).backgrounds as NamedBackground[];
}

/**
 * The selected background of an environment: the one the program starts with.
 */
export function selectedBackground (environment: Environment): NamedBackground {
	const normal = normalizeBackgrounds(environment);

	return (normal.backgrounds as NamedBackground[]).find((background) => normal.startBackground === background.name) as NamedBackground;
}

/**
 * A name no background has yet: Background 1, Background 2...
 */
export function freeBackgroundName (taken: string[]): string {
	for (let number = 1; ; number += 1)
		if (!taken.includes(`${NAME} ${number}`))
			return `${NAME} ${number}`;
}

/**
 * The environment with a new background without pictures at the end of the list, selected.
 */
export function addBackground (environment: Environment): Environment {
	const backgrounds = backgroundsOf(environment);
	const added: NamedBackground = { name: freeBackgroundName(backgrounds.map((background) => background.name)), images: {} };

	return selectBackground({ ...environment, backgrounds: [ ...backgrounds, added ] }, added.name);
}

/**
 * The environment with another background selected, so the cube shows it and the program starts
 * with it.
 */
export function selectBackground (environment: Environment, name: string): Environment {
	return normalizeBackgrounds({ ...environment, backgrounds: backgroundsOf(environment), startBackground: name });
}

/**
 * The environment without a background. The last one cannot be removed: there is always one. If
 * the selected one goes, the one before it (or the new first) is selected.
 */
export function removeBackground (environment: Environment, name: string): Environment {
	const backgrounds = backgroundsOf(environment);
	const index = backgrounds.findIndex((background) => name === background.name);

	if (1 >= backgrounds.length || 0 > index)
		return normalizeBackgrounds(environment);

	const rest = backgrounds.filter((background) => name !== background.name);
	const selected = selectedBackground(environment).name;

	return normalizeBackgrounds({ ...environment, backgrounds: rest, startBackground: name === selected ? rest[Math.max(0, index - 1)].name : selected });
}

/**
 * Why a background cannot get a name, or null when it can. `current` is its name now.
 */
export function backgroundNameProblem (environment: Environment, current: string, name: string): string | null {
	if (!name.trim())
		return 'Give the background a name.';

	return backgroundsOf(environment).some((background) => current !== background.name && name.trim() === background.name)
		? `There is already a background called "${name.trim()}".`
		: null;
}

/**
 * The environment with a background renamed. A name that is empty or taken changes nothing.
 */
export function renameBackground (environment: Environment, current: string, name: string): Environment {
	if (backgroundNameProblem(environment, current, name))
		return normalizeBackgrounds(environment);

	const selected = selectedBackground(environment).name;
	const backgrounds = backgroundsOf(environment).map((background) => current === background.name ? { ...background, name: name.trim() } : background);

	return normalizeBackgrounds({ ...environment, backgrounds, startBackground: current === selected ? name.trim() : selected });
}

/**
 * The environment with new pictures for the selected background.
 */
export function setSelectedImages (environment: Environment, images: BackgroundImages): Environment {
	const selected = selectedBackground(environment).name;
	const backgrounds = backgroundsOf(environment).map((background) => selected === background.name ? { ...background, images } : background);

	return normalizeBackgrounds({ ...environment, backgrounds });
}

/**
 * The picture that stands for a background: the one of its first face that has one, or null.
 */
export function coverOf (background: NamedBackground): Uint32Array | null {
	for (const face of FACE_ORDER) {
		const pixels = background.images[face];

		if (pixels)
			return pixels instanceof Uint32Array ? pixels : Uint32Array.from(pixels);
	}

	return null;
}
