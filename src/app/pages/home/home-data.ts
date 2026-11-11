/**
 * What the home page shows: the animations of the community, as small pictures of LEDs.
 *
 * There is no server for the shared library yet, so the animations are examples. Each one has a
 * picture of 8 × 8 LEDs, drawn here from a rule, and the sections are rankings over the same
 * animations. When the library exists, `COMMUNITY` and `SECTIONS` are what it replaces. This file
 * has no UI.
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
	 * The picture of the author as a data URL, or nothing when they have none (the card then shows
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
 * The animations that were shared.
 */
export const COMMUNITY: CommunityAnimation[] = [
	{ id: 'corazon', title: 'Corazón que late', author: 'lunapixel', likes: 3200, createdAt: '2026-10-28', category: 'Arte', art: 'heart' },
	{ id: 'lluvia', title: 'Lluvia de LEDs', author: 'toño_dev', likes: 2700, createdAt: '2026-10-30', category: 'Naturaleza', art: 'rain' },
	{ id: 'serpiente', title: 'Serpiente que da la vuelta', author: 'mafer.cubo', likes: 11000, createdAt: '2026-09-14', category: 'Juegos', art: 'snake' },
	{ id: 'fuegos', title: 'Fuegos artificiales', author: 'pixelito', likes: 15000, createdAt: '2026-08-02', category: 'Arte', art: 'fire' },
	{ id: 'arcoiris', title: 'Arcoíris diagonal', author: 'diego_bloques', likes: 18000, createdAt: '2026-05-19', category: 'Patrones', art: 'rainbow' },
	{ id: 'fantasma', title: 'Fantasma saltarín', author: 'sofi.led', likes: 12000, createdAt: '2026-07-07', category: 'Personajes', art: 'ghost' },
	{ id: 'ola', title: 'Ola en las 5 caras', author: 'marea', likes: 2500, createdAt: '2026-10-21', category: 'Naturaleza', art: 'wave' },
	{ id: 'espiral', title: 'Espiral hipnótica', author: 'ren', likes: 2800, createdAt: '2026-10-11', category: 'Patrones', art: 'spiral' },
	{ id: 'carita', title: 'Carita feliz', author: 'sofi.led', likes: 9800, createdAt: '2026-06-25', category: 'Personajes', art: 'smile' },
	{ id: 'estrella', title: 'Estrella fugaz', author: 'lunapixel', likes: 9100, createdAt: '2026-09-30', category: 'Arte', art: 'star' },
	{ id: 'tablero', title: 'Tablero que parpadea', author: 'ren', likes: 8400, createdAt: '2026-08-18', category: 'Patrones', art: 'checker' },
	{ id: 'flecha', title: 'Flecha que gira', author: 'toño_dev', likes: 7900, createdAt: '2026-09-03', category: 'Juegos', art: 'arrow' },
];

/**
 * The animations with these ids, in this order.
 */
function pick (ids: string[]): CommunityAnimation[] {
	return ids.map((id) => COMMUNITY.find((animation) => id === animation.id) as CommunityAnimation);
}

/**
 * The sections of the home page.
 */
export const SECTIONS: HomeSection[] = [
	{ id: 'hoy', title: 'Más gustadas hoy', animations: pick([ 'corazon', 'lluvia', 'serpiente', 'fuegos', 'arcoiris', 'fantasma', 'ola', 'espiral' ]) },
	{ id: 'semana', title: 'Más gustadas esta semana', animations: pick([ 'carita', 'estrella', 'tablero', 'flecha', 'espiral', 'corazon', 'ola', 'lluvia' ]) },
	{ id: 'siempre', title: 'Las favoritas de siempre', animations: pick([ 'arcoiris', 'fuegos', 'fantasma', 'serpiente', 'carita', 'estrella', 'tablero', 'flecha' ]) },
];
