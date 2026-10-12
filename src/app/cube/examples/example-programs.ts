/**
 * Example programs.
 *
 * Small, ready-to-run programs used by the demo screens and as a starting point in the
 * editor. They are also a handy reference of what a program looks like, and they are checked
 * by the tests, so they always stay valid.
 */

import { formatColor, parseColor } from '../program/names';
import { Block, ColorValue, Program, Script, ShapePixelDefinition, SideName } from '../program/program';

/**
 * A program with a name and a description for showing in a menu.
 */
export interface ExampleProgram {
	id: string;
	name: string;
	description: string;
	program: Program;
}

/**
 * One falling pixel for the rain example: where it falls, how fast, and when it starts.
 */
interface Drop {
	face: SideName;
	x: number;
	color: ColorValue;
	delay: number;
	pace: number;
}

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

const BELT_SIDES: SideName[] = [ 'FRONT', 'RIGHT', 'BACK', 'LEFT' ];

/**
 * Every step paints the belt, a band of rows across each side, one color and then waits, so
 * the color changes once per `BELT_SECONDS`. The belt is background, so it stays on its own
 * between steps, and the top face is never touched.
 */
const BELT_SECONDS = 1;

const BELT_STEPS: Block[] = BELT_COLORS.flatMap((color): Block[] => [
	...BELT_SIDES.map((face): Block => ({ op: 'fillRect', face, x: 0, y: 28, width: 64, height: 8, color })),
	{ op: 'wait', seconds: BELT_SECONDS },
]);

/**
 * Number of in-between colors from one belt color to the next, and the time each one lasts.
 * A full turn of the color wheel takes 6 * FADE_STEPS * FADE_SECONDS seconds.
 */
const FADE_STEPS = 20;
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

const FADE_BELT_STEPS: Block[] = FADE_COLORS.flatMap((color): Block[] => [
	...BELT_SIDES.map((face): Block => ({ op: 'fillRect', face, x: 0, y: 28, width: 64, height: 8, color })),
	{ op: 'wait', seconds: FADE_SECONDS },
]);

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
 * The belt as the pixels of one object: 4 rows tall and as wide as the whole strip, with
 * the center in the middle column, so `dx` goes from -128 to 127. Every column has its own
 * color.
 */
const WAVE_PIXELS: ShapePixelDefinition[] = WAVE_COLORS.flatMap((color, column) =>
	Array.from({ length: 4 }, (_, dy) => ({ dx: column - 128, dy, color })));

export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
	{
		id: 'around',
		name: 'Around the cube',
		description: 'Two objects chase each other around the four sides. The strip wraps, so they never stop.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'hare', face: 'FRONT', x: 10, y: 20, color: '#f9a8d4' },
						{ op: 'create', name: 'tortoise', face: 'FRONT', x: 4, y: 20, color: '#86efac' },
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
		description: 'A ball keeps going up: over the top face and down the opposite side, where "up" now points down.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 63, color: '#a5b4fc' },
						{
							op: 'forever',
							body: [
								{ op: 'moveTo', target: 'ball', face: 'FRONT', x: 32, y: 63 },
								{
									op: 'repeat',
									times: 191,
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
		id: 'background',
		name: 'Painted background',
		description: 'Frames and circles are painted on the background and stay. A pixel walks over them.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'drawRect', face: 'FRONT', x: 4, y: 4, width: 56, height: 56, color: '#334155' },
						{ op: 'fillCircle', face: 'FRONT', cx: 32, cy: 32, radius: 10, color: '#7c3aed' },
						{ op: 'drawRect', face: 'TOP', x: 4, y: 4, width: 56, height: 56, color: '#334155' },
						{ op: 'drawCircle', face: 'TOP', cx: 32, cy: 32, radius: 20, color: '#0ea5e9' },
						{ op: 'create', name: 'spark', face: 'FRONT', x: 0, y: 32, color: '#fde047' },
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'spark', step: 'right' },
								{ op: 'wait', seconds: 0.02 },
							],
						},
					],
				},
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
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [ { op: 'forever', body: BELT_STEPS } ],
				},
			],
		},
	},
	{
		id: 'smooth-belt',
		name: 'Smooth RGB belt',
		description: 'The same belt, but it fades from one color to the next like an LED strip instead of jumping.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [ { op: 'forever', body: FADE_BELT_STEPS } ],
				},
			],
		},
	},
	{
		id: 'wave-belt',
		name: 'Traveling RGB belt',
		description: 'A rainbow belt whose colors travel around the four sides, so each column is a little behind its neighbor.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'belt', face: 'BACK', x: 0, y: 28, color: '#ffffff', pixels: WAVE_PIXELS },
						{
							op: 'forever',
							body: [
								{ op: 'move', target: 'belt', step: 'right' },
								{ op: 'wait', seconds: 0.03 },
							],
						},
					],
				},
			],
		},
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
		description: 'A script that runs every second and a script that changes colors in a loop.',
		program: {
			version: 1,
			scripts: [
				{
					trigger: { type: 'start' },
					blocks: [
						{ op: 'create', name: 'light', face: 'RIGHT', x: 32, y: 32, color: '#f87171' },
						{
							op: 'forever',
							body: [
								{ op: 'setColor', target: 'light', color: '#f87171' },
								{ op: 'wait', seconds: 0.4 },
								{ op: 'setColor', target: 'light', color: '#facc15' },
								{ op: 'wait', seconds: 0.4 },
								{ op: 'setColor', target: 'light', color: '#4ade80' },
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
