/**
 * What the home page shows: the animations of the community, as small pictures of LEDs.
 *
 * Each animation has a picture of 8 × 8 LEDs, drawn here from a rule. The sections are the
 * categories of the feed: the API only has one of them (the newest animations), so the others are
 * empty until it has their endpoint. This file has no UI.
 */

/**
 * The colors an LED of a picture can have. Each one is a theme color (`--color-led-*`).
 */
export type LedColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';

/**
 * One LED of a picture: its color, or null when it is off.
 */
export type Dot = LedColor | null;

/**
 * The pictures there are.
 */
export type ArtName = 'heart' | 'smile' | 'star' | 'arrow' | 'ghost' | 'rainbow' | 'spiral' | 'rain' | 'wave' | 'snake' | 'fire' | 'checker';

/**
 * An animation that someone shared.
 */
export type CommunityAnimation = {
	/**
	 * Identifies the animation, also in the sections.
	 */
	id: string;

	/**
	 * Name of the animation.
	 */
	title: string;

	/**
	 * Who made it: their username, without an @.
	 */
	author: string;

	/**
	 * Address of the picture of the author, or nothing when they have none (the card then shows
	 * the first letter of their name).
	 */
	authorPhoto?: string | null;

	/**
	 * Address of a short video of the animation playing, or nothing when it has none yet (the card
	 * then plays its LEDs instead).
	 */
	video?: string | null;

	/**
	 * How many people liked it.
	 */
	likes: number;

	/**
	 * The day it was shared, as YYYY-MM-DD.
	 */
	createdAt: string;

	/**
	 * What kind of animation it is, like "Patrones" or "Juegos".
	 */
	category: string;

	/**
	 * The picture that stands for it.
	 */
	art: ArtName;
};

/**
 * A list of animations with a title, like "Most liked today".
 */
export type HomeSection = {
	/**
	 * Identifies the section.
	 */
	id: string;

	/**
	 * What the section is called.
	 */
	title: string;

	/**
	 * The animations of the section, in order.
	 */
	animations: CommunityAnimation[];

	/**
	 * True while the animations are still being fetched, so the row says so instead of saying that
	 * there are none.
	 */
	loading?: boolean;
};

/**
 * LEDs along one side of a picture.
 */
export const ART_SIDE = 8;

/**
 * The shape of the pictures that are a drawing: `#` is a LED that is on.
 */
const SHAPES: Partial<Record<ArtName, string[]>> = {
	heart: [ '.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........' ],
	smile: [ '..####..', '.######.', '##.##.##', '########', '#.####.#', '##....##', '.######.', '..####..' ],
	star: [ '...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '##....##' ],
	arrow: [ '...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...' ],
	ghost: [ '..####..', '.######.', '##.##.##', '########', '########', '########', '########', '#.#..#.#' ],
};

/**
 * The color of the pictures that are a drawing.
 */
const SHAPE_COLOR: Partial<Record<ArtName, LedColor>> = {
	heart: 'pink',
	smile: 'yellow',
	star: 'yellow',
	arrow: 'cyan',
	ghost: 'violet',
};

/**
 * The colors of the rainbow, in order.
 */
const RAINBOW: LedColor[] = [ 'red', 'orange', 'yellow', 'green', 'cyan', 'violet' ];

/**
 * The color of the LED at a column and a row of a picture, or null when it is off.
 */
function dotAt (art: ArtName, x: number, y: number): Dot {
	const shape = SHAPES[art];

	if (shape)
		return '#' === shape[y][x] ? SHAPE_COLOR[art] ?? null : null;

	const last = ART_SIDE - 1;

	switch (art) {
		case 'rainbow':
			return RAINBOW[(x + y) % RAINBOW.length];

		case 'spiral':
			return ([ 'violet', 'cyan', 'pink', 'yellow' ] as LedColor[])[Math.min(x, y, last - x, last - y)];

		case 'rain': {
			const drop = (x * 5 + y * 3) % 7;

			return 0 === drop ? 'cyan' : 1 === drop ? 'blue' : null;
		}

		case 'wave': {
			const crest = Math.round(3.5 + 2.5 * Math.sin(x * 0.9));

			return y === crest ? 'cyan' : y > crest ? 'blue' : null;
		}

		case 'snake':
			if (1 === y && 1 <= x && 6 >= x || 6 === x && 1 <= y && 4 >= y || 4 === y && 1 <= x && 6 >= x || 1 === x && 4 <= y && 6 >= y)
				return 1 === x && 6 === y ? 'yellow' : 'green';

			return 6 === x && 6 === y ? 'red' : null;

		case 'fire': {
			const dx = x - 3.5;
			const dy = y - 3.5;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (Math.abs(dx) !== Math.abs(dy) && 0.6 <= Math.abs(dx) && 0.6 <= Math.abs(dy))
				return null;

			return 2 > distance ? 'yellow' : 3.6 > distance ? 'orange' : 'red';
		}

		case 'checker':
			return 1 === (x + y) % 2 ? 'orange' : null;

		default:
			return null;
	}
}

/**
 * The picture of an animation: `ART_SIDE * ART_SIDE` LEDs, row after row.
 */
export function artOf (art: ArtName): Dot[] {
	const dots: Dot[] = [];

	for (let y = 0; y < ART_SIDE; y += 1)
		for (let x = 0; x < ART_SIDE; x += 1)
			dots.push(dotAt(art, x, y));

	return dots;
}

/**
 * A number of likes as it is written on a card: 845, 1.2k, 18k.
 */
export function formatLikes (likes: number): string {
	if (1000 > likes)
		return String(likes);

	const thousands = likes / 1000;

	return `${10 > thousands ? thousands.toFixed(1).replace(/\.0$/, '') : Math.round(thousands)}k`;
}

/**
 * A day written as YYYY-MM-DD, as it is shown on a card: "12 oct 2026". The day is read as it is
 * written, whatever the time zone of the user.
 */
export function formatDate (day: string): string {
	return new Date(`${day}T00:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Every picture there is, in a fixed order.
 */
export const ART_NAMES: ArtName[] = [ 'heart', 'smile', 'star', 'arrow', 'ghost', 'rainbow', 'spiral', 'rain', 'wave', 'snake', 'fire', 'checker' ];

/**
 * The picture that stands for the animation with this id. Animations have no thumbnail yet, so
 * each one gets a picture from this list, always the same for the same id.
 */
export function artFor (id: number): ArtName {
	return ART_NAMES[id % ART_NAMES.length];
}

/**
 * The sections of the home page that have no endpoint in the API yet, so they have no animations.
 */
export const EMPTY_SECTIONS: HomeSection[] = [
	{ id: 'hoy', title: 'Más gustadas hoy', animations: [] },
	{ id: 'semana', title: 'Más gustadas esta semana', animations: [] },
	{ id: 'siempre', title: 'Las favoritas de siempre', animations: [] },
];
