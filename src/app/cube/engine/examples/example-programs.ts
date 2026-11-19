/**
 * Example programs.
 *
 * Small, ready-to-run programs used by the demo screens and as a starting point in the
 * editor. They are also a handy reference of what a program looks like, and they are checked
 * by the tests, so they always stay valid.
 */

import { formatColor, parseColor } from '../program/names';
import { Block } from '../blocks';
import { ColorValue, Program, Script, ShapePixelDefinition, SideName } from '../program/program';

/**
 * A program with a name and a description for showing in a menu.
 */
export type ExampleProgram = {
	/**
	 * Identifier used to pick the example.
	 */
	id: string;

	/**
	 * Name shown in the menu.
	 */
	name: string;

	/**
	 * One sentence saying what the example does.
	 */
	description: string;

	/**
	 * The program that runs when the example is picked.
	 */
	program: Program;
};

/**
 * One falling pixel for the rain example: where it falls, how fast, and when it starts.
 */
type Drop = {
	/**
	 * The face the drop falls on.
	 */
	face: SideName;

	/**
	 * The column the drop falls along.
	 */
	x: number;

	/**
	 * The drop's color.
	 */
	color: ColorValue;

	/**
	 * Seconds before the drop starts falling.
	 */
	delay: number;

	/**
	 * Seconds between one step down and the next.
	 */
	pace: number;
};

/**
 * The drops of the plain rain example.
 */
const RAIN_DROPS: Drop[] = [
	{ face: 'FRONT', x: 6, color: '#7dd3fc', delay: 0, pace: 0.03 },
	{ face: 'FRONT', x: 21, color: '#38bdf8', delay: 0.7, pace: 0.05 },
	{ face: 'FRONT', x: 40, color: '#bae6fd', delay: 0.3, pace: 0.04 },
	{ face: 'FRONT', x: 57, color: '#0ea5e9', delay: 1.1, pace: 0.06 },
	{ face: 'RIGHT', x: 10, color: '#38bdf8', delay: 0.5, pace: 0.04 },
	{ face: 'RIGHT', x: 27, color: '#bae6fd', delay: 0, pace: 0.06 },
	{ face: 'RIGHT', x: 45, color: '#7dd3fc', delay: 0.9, pace: 0.03 },
	{ face: 'BACK', x: 4, color: '#0ea5e9', delay: 0.2, pace: 0.05 },
	{ face: 'BACK', x: 24, color: '#7dd3fc', delay: 1.3, pace: 0.03 },
	{ face: 'BACK', x: 38, color: '#38bdf8', delay: 0.6, pace: 0.06 },
	{ face: 'BACK', x: 55, color: '#bae6fd', delay: 0, pace: 0.04 },
	{ face: 'LEFT', x: 13, color: '#bae6fd', delay: 0.8, pace: 0.05 },
	{ face: 'LEFT', x: 31, color: '#0ea5e9', delay: 0.1, pace: 0.03 },
	{ face: 'LEFT', x: 50, color: '#7dd3fc', delay: 1.0, pace: 0.04 },
];

/**
 * One script per drop. Each drop starts at the top row, steps down to the floor and starts
 * over. Going down never reaches the top face, so the rain falls on the four sides only.
 */
const RAIN_SCRIPTS: Script[] = RAIN_DROPS.map((drop, index) => ({
	trigger: { type: 'start' },
	blocks: [
		{ op: 'create', name: `drop${index}`, face: drop.face, x: drop.x, y: 0, color: drop.color },
		{ op: 'wait', seconds: drop.delay },
		{
			op: 'forever',
			body: [
				{ op: 'moveTo', target: `drop${index}`, face: drop.face, x: drop.x, y: 0 },
				{
					op: 'repeat',
					times: 63,
					body: [
						{ op: 'move', target: `drop${index}`, step: 'down' },
						{ op: 'wait', seconds: drop.pace },
					],
				},
			],
		},
	],
}));

/**
 * The shape of a raindrop, around its center: a pointed tip on top that widens into a round
 * belly, with a light spot on the belly.
 *
 *     . X .   dy -2
 *     . X .   dy -1
 *     X X X   dy  0   (the left one is the highlight)
 *     X X X   dy  1
 *     . X .   dy  2
 */
const DROP_SHAPE: ShapePixelDefinition[] = [
	{ dx: 0, dy: -2 },
	{ dx: 0, dy: -1 },
	{ dx: -1, dy: 0, color: '#f0f9ff' },
	{ dx: 0, dy: 0 },
	{ dx: 1, dy: 0 },
	{ dx: -1, dy: 1 },
	{ dx: 0, dy: 1 },
	{ dx: 1, dy: 1 },
	{ dx: 0, dy: 2 },
];

/**
 * The drops of the rain example with shaped objects.
 */
const SHAPED_DROPS: Drop[] = [
	{ face: 'FRONT', x: 8, color: '#38bdf8', delay: 0, pace: 0.05 },
	{ face: 'FRONT', x: 30, color: '#0ea5e9', delay: 0.9, pace: 0.07 },
	{ face: 'FRONT', x: 52, color: '#7dd3fc', delay: 0.4, pace: 0.04 },
	{ face: 'RIGHT', x: 14, color: '#0ea5e9', delay: 0.6, pace: 0.06 },
	{ face: 'RIGHT', x: 36, color: '#7dd3fc', delay: 0, pace: 0.04 },
	{ face: 'RIGHT', x: 56, color: '#38bdf8', delay: 1.2, pace: 0.07 },
	{ face: 'BACK', x: 6, color: '#7dd3fc', delay: 0.3, pace: 0.07 },
	{ face: 'BACK', x: 27, color: '#38bdf8', delay: 1.0, pace: 0.04 },
	{ face: 'BACK', x: 48, color: '#0ea5e9', delay: 0.1, pace: 0.05 },
	{ face: 'LEFT', x: 10, color: '#38bdf8', delay: 0.8, pace: 0.06 },
	{ face: 'LEFT', x: 33, color: '#7dd3fc', delay: 0.2, pace: 0.07 },
	{ face: 'LEFT', x: 55, color: '#0ea5e9', delay: 1.1, pace: 0.04 },
];

/**
 * One script per drop. A drop starts two rows down, so its tip is on the first row and not on
 * the top face, and falls until it has slid out below the last visible row (see `floor` in
 * the program config).
 */
const SHAPED_RAIN_SCRIPTS: Script[] = SHAPED_DROPS.map((drop, index) => ({
	trigger: { type: 'start' },
	blocks: [
		{ op: 'create', name: `drop${index}`, face: drop.face, x: drop.x, y: 2, color: drop.color, pixels: DROP_SHAPE },
		{ op: 'hide', target: `drop${index}` },
		{ op: 'wait', seconds: drop.delay },
		{ op: 'show', target: `drop${index}` },
		{
			op: 'forever',
			body: [
				{ op: 'moveTo', target: `drop${index}`, face: drop.face, x: drop.x, y: 2 },
				{
					op: 'repeat',
					times: 63,
					body: [
						{ op: 'move', target: `drop${index}`, step: 'down' },
						{ op: 'wait', seconds: drop.pace },
					],
				},
			],
		},
	],
}));

/**
 * Colors the belt goes through: red, yellow, green, cyan, blue and magenta.
 */
const BELT_COLORS: ColorValue[] = [ '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff' ];

/**
 * Every step recolors the belt object (see `beltProgram`) and waits, so the color changes
 * once per `BELT_SECONDS`.
 */
const BELT_SECONDS = 1;

/**
 * The blocks that cycle the belt through its colors, waiting a second on each.
 */
const BELT_STEPS: Block[] = BELT_COLORS.flatMap((color): Block[] => [
	{ op: 'setColor', target: 'belt', color },
	{ op: 'wait', seconds: BELT_SECONDS },
]);

/**
 * Number of in-between colors from one belt color to the next, and the time each one lasts.
 * A full turn of the color wheel takes 6 * FADE_STEPS * FADE_SECONDS seconds.
 */
const FADE_STEPS = 20;

/**
 * Seconds each in-between color lasts.
 */
const FADE_SECONDS = 0.05;

/**
 * Mixes two `#RRGGBB` colors; `amount` goes from 0 (all `from`) to 1 (all `to`).
 */
function mixColors (from: ColorValue, to: ColorValue, amount: number): ColorValue {
	const channels = [ 16, 8, 0 ].map((shift) => {
		const start = (parseColor(from) >> shift) & 0xff;
		const end = (parseColor(to) >> shift) & 0xff;

		return Math.round(start + (end - start) * amount);
	});

	return formatColor((channels[0] << 16) | (channels[1] << 8) | channels[2]);
}

/**
 * The belt colors with `FADE_STEPS` colors between each pair, ending back at the first so
 * the loop has no jump.
 */
const FADE_COLORS: ColorValue[] = BELT_COLORS.flatMap((color, index) => {
	const next = BELT_COLORS[(index + 1) % BELT_COLORS.length];

	return Array.from({ length: FADE_STEPS }, (_, step) => mixColors(color, next, step / FADE_STEPS));
});

/**
 * The blocks that fade the belt through the color wheel.
 */
const FADE_BELT_STEPS: Block[] = FADE_COLORS.flatMap((color): Block[] => [
	{ op: 'setColor', target: 'belt', color },
	{ op: 'wait', seconds: FADE_SECONDS },
]);

/**
 * A band across the four sides as a single object: `height` rows tall, as wide as the whole
 * strip (256 columns), with no colors of its own so it takes the color of the object.
 */
function beltShape (height: number): ShapePixelDefinition[] {
	return Array.from({ length: 4 * 64 }, (_, column) =>
		Array.from({ length: height }, (_, dy) => ({ dx: column - 128, dy }))).flat();
}

/**
 * A program where the belt, a band of rows across each side, is recolored forever by `steps`.
 * The top face is never touched.
 */
function beltProgram (steps: Block[]): Program {
	return {
		version: 1,
		scripts: [
			{
				trigger: { type: 'start' },
				blocks: [
					{ op: 'create', name: 'belt', face: 'BACK', x: 0, y: 28, color: BELT_COLORS[0], pixels: beltShape(8) },
					{ op: 'forever', body: steps },
				],
			},
		],
	};
}

/**
 * Colors of the traveling belt, one for each of the 256 columns around the cube: the belt
 * colors fading into each other and back to the first, so the ends of the strip meet.
 */
const WAVE_COLORS: ColorValue[] = Array.from({ length: 4 * 64 }, (_, column) => {
	const position = column / (4 * 64) * BELT_COLORS.length;
	const index = Math.floor(position);

	return mixColors(BELT_COLORS[index], BELT_COLORS[(index + 1) % BELT_COLORS.length], position - index);
});

/**
 * The traveling belt as the pixels of one object: `height` rows tall and as wide as the
 * whole strip, with the center in the middle column, so `dx` goes from -128 to 127 and `dy`
 * from 0 to height - 1 (the object is created on the first row of the belt). Every column
 * has its own color.
 */
function wavePixels (height: number): ShapePixelDefinition[] {
	return WAVE_COLORS.flatMap((color, column) =>
		Array.from({ length: height }, (_, dy) => ({ dx: column - 128, dy, color })));
}

/**
 * Converts an ASCII art grid into `ShapePixelDefinition` entries centered around `(cx, cy)`.
 * Spaces and `.` are transparent.
 */
function pixelArt (
	rows: string[],
	palette: Record<string, ColorValue>,
	cx = Math.floor(rows[0].length / 2),
	cy = Math.floor(rows.length / 2),
): ShapePixelDefinition[] {
	const pixels: ShapePixelDefinition[] = [];

	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x++) {
			const ch = row[x];

			if (' ' === ch || '.' === ch)
				continue;

			const color = palette[ch];

			if (color !== undefined)
				pixels.push({ dx: x - cx, dy: y - cy, color });
		}
	});

	return pixels;
}

/**
 * A cute pixel-art hare facing right.
 */
const HARE_PIXELS = pixelArt(
	[
		'..W.W..',
		'..W.W..',
		'.PPPP..',
		'PPPPPW.',
		'.PPPP..',
		'.P..P..',
	],
	{ P: '#f9a8d4', W: '#fdf2f8' },
);

/**
 * A cute pixel-art tortoise facing right.
 */
const TORTOISE_PIXELS = pixelArt(
	[
		'.GGGG..',
		'GGGGGG.',
		'LLLLLLG',
		'.L..L..',
	],
	{ G: '#4ade80', L: '#86efac' },
);

/**
 * A glowing 5x5 orb for the over-the-top example.
 */
const ORB_PIXELS = pixelArt(
	[
		'.AAA.',
		'AWWWA',
		'AWWWA',
		'AWWWA',
		'.AAA.',
	],
	{ A: '#818cf8', W: '#e0e7ff' },
);

/**
 * A 5x5 beacon star for the blinking lights example.
 */
const BEACON_PIXELS = pixelArt(
	[
		'..X..',
		'.XXX.',
		'XXXXX',
		'.XXX.',
		'..X..',
	],
	{ X: '#f87171' },
);

/**
 * Detailed 7x7 crystal snowflake.
 */
const SNOWFLAKE_LARGE = pixelArt(
	[
		'I..W..I',
		'.I.W.I.',
		'..IWI..',
		'WWWWWWW',
		'..IWI..',
		'.I.W.I.',
		'I..W..I',
	],
	{ W: '#ffffff', I: '#bae6fd' },
);

/**
 * Small 3x3 twinkling snowflake.
 */
const SNOWFLAKE_SMALL = pixelArt(
	[
		'.I.',
		'IWI',
		'.I.',
	],
	{ W: '#ffffff', I: '#e0f2fe' },
);

/**
 * Two-row snowy ground strip wrapping around all four sides of the cube.
 */
const SNOW_GROUND_PIXELS: ShapePixelDefinition[] = Array.from({ length: 4 * 64 }, (_, column) => [
	{ dx: column - 128, dy: 0, color: 0 === column % 3 ? '#ffffff' : '#e0f2fe' },
	{ dx: column - 128, dy: 1, color: '#bae6fd' },
]).flat();

/**
 * Falling snowflakes distributed across the four side faces.
 */
const CHRISTMAS_FLAKES: Array<{ face: SideName; x: number; delay: number; pace: number; large: boolean }> = [
	{ face: 'FRONT', x: 8, delay: 0, pace: 0.06, large: true },
	{ face: 'FRONT', x: 23, delay: 0.9, pace: 0.04, large: false },
	{ face: 'FRONT', x: 39, delay: 0.4, pace: 0.07, large: true },
	{ face: 'FRONT', x: 54, delay: 1.3, pace: 0.05, large: false },
	{ face: 'RIGHT', x: 11, delay: 0.5, pace: 0.05, large: false },
	{ face: 'RIGHT', x: 28, delay: 0.1, pace: 0.07, large: true },
	{ face: 'RIGHT', x: 44, delay: 1.1, pace: 0.04, large: false },
	{ face: 'RIGHT', x: 58, delay: 0.7, pace: 0.06, large: true },
	{ face: 'BACK', x: 6, delay: 0.2, pace: 0.07, large: true },
	{ face: 'BACK', x: 21, delay: 1.0, pace: 0.04, large: false },
	{ face: 'BACK', x: 37, delay: 0.6, pace: 0.06, large: true },
	{ face: 'BACK', x: 53, delay: 0, pace: 0.05, large: false },
	{ face: 'LEFT', x: 10, delay: 0.8, pace: 0.05, large: false },
	{ face: 'LEFT', x: 26, delay: 0.3, pace: 0.07, large: true },
	{ face: 'LEFT', x: 43, delay: 1.2, pace: 0.04, large: false },
	{ face: 'LEFT', x: 56, delay: 0.1, pace: 0.06, large: true },
];

/**
 * Scripts for the falling Christmas snowflakes.
 */
const CHRISTMAS_SNOW_SCRIPTS: Script[] = [
	{
		trigger: { type: 'start' },
		blocks: [
			{ op: 'create', name: 'snowGround', face: 'BACK', x: 0, y: 62, color: '#e0f2fe', pixels: SNOW_GROUND_PIXELS },
			{ op: 'setBackgroundColor', faces: [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ], color: '#061028' },
		],
	},
	...CHRISTMAS_FLAKES.map((flake, index): Script => ({
		trigger: { type: 'start' },
		blocks: [
			{
				op: 'create',
				name: `flake${index}`,
				face: flake.face,
				x: flake.x,
				y: 3,
				color: '#ffffff',
				pixels: flake.large ? SNOWFLAKE_LARGE : SNOWFLAKE_SMALL,
			},
			{ op: 'hide', target: `flake${index}` },
			{ op: 'wait', seconds: flake.delay },
			{ op: 'show', target: `flake${index}` },
			{
				op: 'forever',
				body: [
					{ op: 'moveTo', target: `flake${index}`, face: flake.face, x: flake.x, y: 3 },
					{
						op: 'repeat',
						times: 64,
						body: [
							{ op: 'move', target: `flake${index}`, step: 'down' },
							{ op: 'wait', seconds: flake.pace },
						],
					},
				],
			},
		],
	})),
];

/**
 * Scalloped evergreen garland wire wrapping around all four sides.
 */
const GARLAND_PIXELS: ShapePixelDefinition[] = Array.from({ length: 4 * 64 }, (_, column) => {
	const sag = Math.round(Math.sin((column % 32) / 32 * Math.PI) * 3);

	return [
		{ dx: column - 128, dy: sag, color: '#14532d' },
		{ dx: column - 128, dy: sag + 1, color: '#166534' },
	];
}).flat();

/**
 * Creates a bright and a dim costume for a 3x4 Christmas bulb.
 */
function bulbCostumes (bright: ColorValue, dim: ColorValue) {
	const shape = (main: ColorValue, tip: ColorValue) => pixelArt(
		[
			'.G.',
			'TMT',
			'MMM',
			'.M.',
		],
		{ G: '#475569', M: main, T: tip },
		1,
		1,
	);

	return [
		{ name: 'on', color: bright, pixels: shape(bright, '#ffffff') },
		{ name: 'off', color: dim, pixels: shape(dim, dim) },
	];
}

const BULB_PALETTE: Array<{ bright: ColorValue; dim: ColorValue }> = [
	{ bright: '#ef4444', dim: '#450a0a' },
	{ bright: '#facc15', dim: '#422006' },
	{ bright: '#22c55e', dim: '#052e16' },
	{ bright: '#38bdf8', dim: '#082f49' },
	{ bright: '#e879f9', dim: '#4a044e' },
];

/**
 * Positions of the twinkling Christmas bulbs along the upper and lower garlands.
 */
const CHRISTMAS_BULBS: Array<{ face: SideName; x: number; y: number; paletteIndex: number; odd: boolean }> = [
	{ face: 'FRONT', x: 10, y: 18, paletteIndex: 0, odd: false },
	{ face: 'FRONT', x: 26, y: 18, paletteIndex: 1, odd: true },
	{ face: 'FRONT', x: 42, y: 18, paletteIndex: 2, odd: false },
	{ face: 'FRONT', x: 56, y: 18, paletteIndex: 3, odd: true },
	{ face: 'FRONT', x: 16, y: 44, paletteIndex: 4, odd: true },
	{ face: 'FRONT', x: 48, y: 44, paletteIndex: 1, odd: false },
	{ face: 'RIGHT', x: 12, y: 18, paletteIndex: 2, odd: false },
	{ face: 'RIGHT', x: 32, y: 18, paletteIndex: 0, odd: true },
	{ face: 'RIGHT', x: 52, y: 18, paletteIndex: 3, odd: false },
	{ face: 'RIGHT', x: 24, y: 44, paletteIndex: 1, odd: true },
	{ face: 'RIGHT', x: 46, y: 44, paletteIndex: 4, odd: false },
	{ face: 'BACK', x: 10, y: 18, paletteIndex: 3, odd: false },
	{ face: 'BACK', x: 28, y: 18, paletteIndex: 1, odd: true },
	{ face: 'BACK', x: 48, y: 18, paletteIndex: 0, odd: false },
	{ face: 'BACK', x: 18, y: 44, paletteIndex: 2, odd: true },
	{ face: 'BACK', x: 44, y: 44, paletteIndex: 4, odd: false },
	{ face: 'LEFT', x: 14, y: 18, paletteIndex: 4, odd: false },
	{ face: 'LEFT', x: 34, y: 18, paletteIndex: 2, odd: true },
	{ face: 'LEFT', x: 52, y: 18, paletteIndex: 1, odd: false },
	{ face: 'LEFT', x: 22, y: 44, paletteIndex: 0, odd: true },
	{ face: 'LEFT', x: 46, y: 44, paletteIndex: 3, odd: false },
];

const CHRISTMAS_LIGHTS_SCRIPTS: Script[] = [
	{
		trigger: { type: 'start' },
		blocks: [
			{ op: 'create', name: 'garlandTop', face: 'BACK', x: 0, y: 14, color: '#14532d', pixels: GARLAND_PIXELS },
			{ op: 'create', name: 'garlandBottom', face: 'BACK', x: 0, y: 40, color: '#14532d', pixels: GARLAND_PIXELS },
			{ op: 'setBackgroundColor', faces: [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ], color: '#05140e' },
		],
	},
	...CHRISTMAS_BULBS.map((bulb, index): Script => {
		const colors = BULB_PALETTE[bulb.paletteIndex];
		const costumes = bulbCostumes(colors.bright, colors.dim);

		return {
			trigger: { type: 'start' },
			blocks: [
				{
					op: 'create',
					name: `bulb${index}`,
					face: bulb.face,
					x: bulb.x,
					y: bulb.y,
					color: colors.bright,
					pixels: costumes[0].pixels,
					costumes,
				},
				...(bulb.odd ? [ { op: 'nextCostume' as const, target: `bulb${index}` } ] : []),
				{
					op: 'forever',
					body: [
						{ op: 'wait', seconds: 0.45 },
						{ op: 'nextCostume', target: `bulb${index}` },
					],
				},
			],
		};
	}),
];

/**
 * Grass ground strip for the puppy animation.
 */
const GRASS_PIXELS: ShapePixelDefinition[] = Array.from({ length: 4 * 64 }, (_, column) => [
	{ dx: column - 128, dy: 0, color: 0 === column % 2 ? '#22c55e' : '#16a34a' },
	{ dx: column - 128, dy: 1, color: '#15803d' },
	{ dx: column - 128, dy: 2, color: '#166534' },
]).flat();

/**
 * Pixel-art puppy palette and 4 animation frames (trotting + tail wagging + happy blink).
 */
const PUPPY_PALETTE: Record<string, ColorValue> = {
	F: '#f59e0b',
	D: '#b45309',
	E: '#111827',
	W: '#ffffff',
	C: '#fef3c7',
	R: '#ef4444',
	G: '#facc15',
};

const PUPPY_COSTUMES = [
	{
		name: 'walk1',
		color: '#f59e0b',
		pixels: pixelArt(
			[
				'........FFF....',
				'.......FFDFF...',
				'..F....FFEWFE..',
				'.F.....FFFFCC..',
				'F.FFFFFFRRRF...',
				'FFFFFFFFGF.....',
				'.FFFFFFFC......',
				'.FF...FF.......',
				'F.......F......',
			],
			PUPPY_PALETTE,
		),
	},
	{
		name: 'walk2',
		color: '#f59e0b',
		pixels: pixelArt(
			[
				'........FFF....',
				'.......FFDFF...',
				'.......FFEWFE..',
				'.FF....FFFFCC..',
				'F.FFFFFFRRRF...',
				'FFFFFFFFGF.....',
				'.FFFFFFFC......',
				'.FF...FF.......',
				'.F.....F.......',
			],
			PUPPY_PALETTE,
		),
	},
	{
		name: 'walk3',
		color: '#f59e0b',
		pixels: pixelArt(
			[
				'........FFF....',
				'.......FFDFF...',
				'.......FFEWFE..',
				'..FF...FFFFCC..',
				'.FFFFFFFRRRF...',
				'FFFFFFFFGF.....',
				'.FFFFFFFC......',
				'..FF..FF.......',
				'..F....F.......',
			],
			PUPPY_PALETTE,
		),
	},
	{
		name: 'blink',
		color: '#f59e0b',
		pixels: pixelArt(
			[
				'........FFF....',
				'.......FFDFF...',
				'..F....FFDDDE..',
				'.F.....FFFFCC..',
				'F.FFFFFFRRRF...',
				'FFFFFFFFGF.....',
				'.FFFFFFFC......',
				'.FF...FF.......',
				'.F.....F.......',
			],
			PUPPY_PALETTE,
		),
	},
];

/**
 * Pixel-art Christmas tree with 3 twinkling ornament/star frames.
 */
const TREE_PALETTE: Record<string, ColorValue> = {
	Y: '#facc15',
	W: '#fef08a',
	G: '#16a34a',
	L: '#22c55e',
	D: '#15803d',
	R: '#ef4444',
	B: '#38bdf8',
	M: '#e879f9',
	T: '#78350f',
};

function treeFrame (ornaments: { a: string; b: string; c: string; star: string }): ShapePixelDefinition[] {
	return pixelArt(
		[
			'.....S.....',
			'....SSS....',
			'.....G.....',
			'....GLG....',
			'...GGAGG...',
			'....GLG....',
			'...GGBGG...',
			'..GGGLGGG..',
			'.GGCGGAGGD.',
			'...GGLGG...',
			'..GGBGCGG..',
			'.GGGGLGGGG.',
			'GGGGAGGGDGG',
			'....TTT....',
			'....TTT....',
		],
		{
			...TREE_PALETTE,
			S: ornaments.star,
			A: ornaments.a,
			B: ornaments.b,
			C: ornaments.c,
		},
	);
}

const TREE_COSTUMES = [
	{ name: 'twinkle1', color: '#16a34a', pixels: treeFrame({ a: '#ef4444', b: '#38bdf8', c: '#facc15', star: '#facc15' }) },
	{ name: 'twinkle2', color: '#16a34a', pixels: treeFrame({ a: '#facc15', b: '#e879f9', c: '#ef4444', star: '#fef08a' }) },
	{ name: 'twinkle3', color: '#16a34a', pixels: treeFrame({ a: '#38bdf8', b: '#facc15', c: '#e879f9', star: '#fde047' }) },
];

/**
 * Retro space rocket with 3 animated thruster flame costumes.
 */
const ROCKET_PALETTE: Record<string, ColorValue> = {
	R: '#ef4444',
	W: '#f8fafc',
	S: '#cbd5e1',
	C: '#38bdf8',
	O: '#f97316',
	Y: '#facc15',
};

function rocketFrame (flameRows: string[]): ShapePixelDefinition[] {
	return pixelArt(
		[
			'...R...',
			'..RRR..',
			'..WWW..',
			'..WCW..',
			'..WWS..',
			'.RWWSR.',
			'RRWWWRR',
			'R..S..R',
			...flameRows,
		],
		ROCKET_PALETTE,
	);
}

const ROCKET_COSTUMES = [
	{ name: 'thrust1', color: '#f8fafc', pixels: rocketFrame([ '..OYO..', '...O...' ]) },
	{ name: 'thrust2', color: '#f8fafc', pixels: rocketFrame([ '..YYY..', '..OYO..', '...Y...' ]) },
	{ name: 'thrust3', color: '#f8fafc', pixels: rocketFrame([ '..O.O..', '...Y...' ]) },
];

/**
 * A program with one belt object that moves one column to the right every `seconds`.
 */
function waveProgram (y: number, height: number, seconds: number): Program {
	return {
		version: 1,
		scripts: [
			{
				trigger: { type: 'start' },
				blocks: [
					{ op: 'create', name: 'belt', face: 'BACK', x: 0, y, color: '#ffffff', pixels: wavePixels(height) },
					{
						op: 'forever',
						body: [
							{ op: 'move', target: 'belt', step: 'right' },
							{ op: 'wait', seconds },
						],
					},
				],
			},
		],
	};
}

/**
 * Every example the app offers.
 */
export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
	{
		id: 'around',
		name: 'Around the cube',
		description: 'A pixel hare and tortoise chase each other around the four sides. The strip wraps, so they never stop.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'hare', face: 'FRONT', x: 10, y: 20, color: '#f9a8d4', pixels: HARE_PIXELS },
						{ op: 'create', name: 'tortoise', face: 'FRONT', x: 4, y: 34, color: '#4ade80', pixels: TORTOISE_PIXELS },
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'hare', step: 'right', count: 2 },
								{ op: 'wait', seconds: 0.05 },
							],
						},
					],
				},
				{
					trigger: { type: 'start' },
					blocks: [
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'tortoise', step: 'right' },
								{ op: 'wait', seconds: 0.05 },
							],
						},
					],
				},
			],
		},
	},
	{
		id: 'over-the-top',
		name: 'Over the top',
		description: 'A glowing orb keeps going up: over the top face and down the opposite side, where "up" now points down.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 61, color: '#818cf8', pixels: ORB_PIXELS },
						{
							op: 'forever',
							body: [
								{ op: 'moveTo', target: 'ball', face: 'FRONT', x: 32, y: 61 },
								{
									op: 'repeat',
									times: 187,
									body: [
										{ op: 'move', target: 'ball', step: 'up' },
										{ op: 'wait', seconds: 0.02 },
									],
								},
								{ op: 'wait', seconds: 0.5 },
							],
						},
					],
				},
			],
		},
	},
	{
		id: 'christmas-snow',
		name: 'Christmas snowfall',
		description: 'Crystal snowflakes of different sizes drift gently down the four sides onto a snowy winter ground.',
		program: {
			version: 1,
			config: { floor: 68 },
			scripts: CHRISTMAS_SNOW_SCRIPTS,
		},
	},
	{
		id: 'christmas-lights',
		name: 'Christmas lights',
		description: 'Evergreen garlands draped around all four sides with colorful bulbs twinkling in alternating patterns.',
		program: {
			version: 1,
			scripts: CHRISTMAS_LIGHTS_SCRIPTS,
		},
	},
	{
		id: 'little-dog',
		name: 'Playful puppy',
		description: 'A pixel-art puppy trots happily across the grass around all four sides, wagging its tail and blinking.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'grass', face: 'BACK', x: 0, y: 61, color: '#22c55e', pixels: GRASS_PIXELS },
						{
							op: 'create',
							name: 'puppy',
							face: 'FRONT',
							x: 20,
							y: 56,
							color: '#f59e0b',
							pixels: PUPPY_COSTUMES[0].pixels,
							costumes: PUPPY_COSTUMES,
						},
						{ op: 'setBackgroundColor', faces: [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ], color: '#0b192c' },
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'puppy', step: 'right' },
								{ op: 'nextCostume', target: 'puppy' },
								{ op: 'wait', seconds: 0.14 },
							],
						},
					],
				},
			],
		},
	},
	{
		id: 'christmas-tree',
		name: 'Christmas tree',
		description: 'A pixel-art Christmas tree with a shimmering star and twinkling ornaments, surrounded by falling snow.',
		program: {
			version: 1,
			config: { floor: 66 },
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{
							op: 'create',
							name: 'tree',
							face: 'FRONT',
							x: 32,
							y: 44,
							color: '#16a34a',
							pixels: TREE_COSTUMES[0].pixels,
							costumes: TREE_COSTUMES,
						},
						{ op: 'setBackgroundColor', faces: [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ], color: '#071124' },
						{
							op: 'forever',
							body: [
								{ op: 'nextCostume', target: 'tree' },
								{ op: 'wait', seconds: 0.4 },
							],
						},
					],
				},
				...CHRISTMAS_FLAKES.slice(0, 8).map((flake, index): Script => ({
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: `snow${index}`, face: flake.face, x: flake.x, y: 2, color: '#e0f2fe', pixels: SNOWFLAKE_SMALL },
						{ op: 'hide', target: `snow${index}` },
						{ op: 'wait', seconds: flake.delay },
						{ op: 'show', target: `snow${index}` },
						{
							op: 'forever',
							body: [
								{ op: 'moveTo', target: `snow${index}`, face: flake.face, x: flake.x, y: 2 },
								{
									op: 'repeat',
									times: 63,
									body: [
										{ op: 'move', target: `snow${index}`, step: 'down' },
										{ op: 'wait', seconds: flake.pace },
									],
								},
							],
						},
					],
				})),
			],
		},
	},
	{
		id: 'space-rocket',
		name: 'Space rocket',
		description: 'A retro rocket with flickering thrusters blasts up and over the top of the cube among twinkling stars.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{
							op: 'create',
							name: 'rocket',
							face: 'FRONT',
							x: 32,
							y: 55,
							color: '#f8fafc',
							pixels: ROCKET_COSTUMES[0].pixels,
							costumes: ROCKET_COSTUMES,
						},
						{ op: 'setBackgroundColor', faces: [ 'FRONT', 'RIGHT', 'BACK', 'LEFT', 'TOP' ], color: '#030712' },
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'rocket', step: 'up' },
								{ op: 'nextCostume', target: 'rocket' },
								{ op: 'wait', seconds: 0.04 },
							],
						},
					],
				},
				...(
					[
						{ face: 'FRONT' as const, x: 10, y: 14 },
						{ face: 'FRONT' as const, x: 52, y: 26 },
						{ face: 'TOP' as const, x: 14, y: 16 },
						{ face: 'TOP' as const, x: 48, y: 48 },
						{ face: 'BACK' as const, x: 14, y: 20 },
						{ face: 'BACK' as const, x: 50, y: 42 },
					]
				).map((star, index): Script => ({
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: `star${index}`, face: star.face, x: star.x, y: star.y, color: '#fef08a' },
						{ op: 'wait', seconds: index * 0.25 },
						{
							op: 'forever',
							body: [
								{ op: 'setColor', target: `star${index}`, color: '#fef08a' },
								{ op: 'wait', seconds: 0.5 },
								{ op: 'setColor', target: `star${index}`, color: '#334155' },
								{ op: 'wait', seconds: 0.5 },
							],
						},
					],
				})),
			],
		},
	},
	{
		id: 'rain',
		name: 'Rain',
		description: 'Pixels fall from the top to the bottom of the four sides, each at its own speed. The top face stays dry.',
		program: {
			version: 1,
			scripts: RAIN_SCRIPTS,
		},
	},
	{
		id: 'raindrops',
		name: 'Raindrops',
		description: 'Drop-shaped rain: every drop is a nine-pixel object that falls down the four sides and slides out at the bottom.',
		program: {
			version: 1,
			config: { floor: 65 },
			scripts: SHAPED_RAIN_SCRIPTS,
		},
	},
	{
		id: 'belt',
		name: 'RGB belt',
		description: 'A band around the four sides that changes color every second: red, yellow, green, cyan, blue, magenta.',
		program: beltProgram(BELT_STEPS),
	},
	{
		id: 'smooth-belt',
		name: 'Smooth RGB belt',
		description: 'The same belt, but it fades from one color to the next like an LED strip instead of jumping.',
		program: beltProgram(FADE_BELT_STEPS),
	},
	{
		id: 'wave-belt',
		name: 'Traveling RGB belt',
		description: 'A rainbow belt whose colors travel around the four sides, so each column is a little behind its neighbor.',
		program: waveProgram(28, 4, 0.03),
	},
	{
		id: 'wave-wall',
		name: 'Full-height RGB belt',
		description: 'The traveling rainbow, but covering the whole height of the cube. It is 16,384 pixels, so the source is long.',
		program: waveProgram(0, 64, 0.03),
	},
	{
		id: 'plus',
		name: 'Plus sign',
		description: 'An object made of five pixels. It climbs over the top face and the whole shape turns with it.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{
							op: 'create', name: 'plus', face: 'FRONT', x: 32, y: 40, color: '#fb7185',
							pixels: [
								{ dx: 0, dy: 0, color: '#fde047' },
								{ dx: 0, dy: -1 },
								{ dx: 1, dy: 0 },
								{ dx: 0, dy: 1 },
								{ dx: -1, dy: 0 },
							],
						},
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'plus', step: 'up' },
								{ op: 'wait', seconds: 0.05 },
							],
						},
					],
				},
			],
		},
	},
	{
		id: 'blink',
		name: 'Blinking lights',
		description: 'A glowing pixel beacon that cycles colors in a loop while another script blinks it every second.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'light', face: 'RIGHT', x: 32, y: 32, color: '#f87171', pixels: BEACON_PIXELS },
						{
							op: 'forever',
							body: [
								{ op: 'setColor', target: 'light', color: '#f87171' },
								{ op: 'wait', seconds: 0.4 },
								{ op: 'setColor', target: 'light', color: '#facc15' },
								{ op: 'wait', seconds: 0.4 },
								{ op: 'setColor', target: 'light', color: '#4ade80' },
								{ op: 'wait', seconds: 0.4 },
								{ op: 'setColor', target: 'light', color: '#38bdf8' },
								{ op: 'wait', seconds: 0.4 },
							],
						},
					],
				},
				{
					trigger: { type: 'every', seconds: 1 },
					blocks: [
						{ op: 'hide', target: 'light' },
						{ op: 'wait', seconds: 0.1 },
						{ op: 'show', target: 'light' },
					],
				},
			],
		},
	},
];
