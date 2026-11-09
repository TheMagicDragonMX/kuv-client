import { Environment } from '../../cube';
import {
	addBackground,
	backgroundNameProblem,
	backgroundsOf,
	coverOf,
	freeBackgroundName,
	normalizeBackgrounds,
	removeBackground,
	renameBackground,
	selectBackground,
	selectedBackground,
	setSelectedImages,
} from './backgrounds';

/**
 * A picture of one color for a whole face.
 */
function solid (color: number): Uint32Array {
	return new Uint32Array(64 * 64).fill(color);
}

/**
 * Two backgrounds, the second selected.
 */
const TWO: Environment = normalizeBackgrounds({
	backgrounds: [
		{ name: 'day', images: { FRONT: solid(1) } },
		{ name: 'night', images: { TOP: solid(2) } },
	],
	startBackground: 'night',
});

/**
 * The names of the backgrounds of an environment.
 */
function names (environment: Environment): string[] {
	return backgroundsOf(environment).map((background) => background.name);
}

describe('the backgrounds of the Background tab', () => {
	it('turn the pictures of an old environment into a first background', () => {
		const pictures = { FRONT: solid(7) };
		const environment = normalizeBackgrounds({ background: pictures, brightness: { objects: 1 } });

		expect(names(environment)).toEqual([ 'Background 1' ]);
		expect(environment.startBackground).toBe('Background 1');
		expect(environment.background).toEqual(pictures);
		expect(environment.brightness).toEqual({ objects: 1 });
	});

	it('show the selected one on the cube, and the others on the faces it has no picture for', () => {
		expect(TWO.background).toEqual({ FRONT: solid(1), TOP: solid(2) });
		expect(selectedBackground(selectBackground(TWO, 'day')).name).toBe('day');
		expect(selectBackground(TWO, 'day').background).toEqual({ FRONT: solid(1), TOP: solid(2) });
	});

	it('show the selected one over the others where both have a picture', () => {
		const both = setSelectedImages(TWO, { FRONT: solid(9) });

		expect(both.background).toEqual({ FRONT: solid(9) });
		expect(selectBackground(both, 'day').background).toEqual({ FRONT: solid(1) });
	});

	it('add an empty one with a free name, and select it', () => {
		const environment = addBackground(TWO);

		expect(names(environment)).toEqual([ 'day', 'night', 'Background 1' ]);
		expect(environment.startBackground).toBe('Background 1');
		expect(environment.background).toEqual({ FRONT: solid(1), TOP: solid(2) });
		expect(freeBackgroundName([ 'Background 1', 'Background 3' ])).toBe('Background 2');
	});

	it('change the pictures of the selected one only', () => {
		const environment = setSelectedImages(TWO, { LEFT: solid(3) });

		expect(backgroundsOf(environment)[0].images).toEqual({ FRONT: solid(1) });
		expect(backgroundsOf(environment)[1].images).toEqual({ LEFT: solid(3) });
		expect(environment.background).toEqual({ LEFT: solid(3), FRONT: solid(1) });
	});

	it('remove one, selecting another when the selected one goes, but never the last one', () => {
		const environment = removeBackground(TWO, 'night');

		expect(names(environment)).toEqual([ 'day' ]);
		expect(environment.startBackground).toBe('day');
		expect(names(removeBackground(environment, 'day'))).toEqual([ 'day' ]);
		expect(removeBackground(TWO, 'day').startBackground).toBe('night');
	});

	it('rename one, keeping it selected, and refuse an empty or taken name', () => {
		const environment = renameBackground(TWO, 'night', ' stars ');

		expect(names(environment)).toEqual([ 'day', 'stars' ]);
		expect(environment.startBackground).toBe('stars');
		expect(backgroundNameProblem(TWO, 'night', 'day')).toContain('already');
		expect(backgroundNameProblem(TWO, 'night', ' ')).toContain('name');
		expect(backgroundNameProblem(TWO, 'night', 'night')).toBeNull();
		expect(names(renameBackground(TWO, 'night', 'day'))).toEqual([ 'day', 'night' ]);
	});

	it('are shown by the picture of their first face that has one', () => {
		const [ day, night ] = backgroundsOf(TWO);

		expect(coverOf(day)).toEqual(solid(1));
		expect(coverOf(night)).toEqual(solid(2));
		expect(coverOf({ name: 'empty', images: {} })).toBeNull();
	});
});
