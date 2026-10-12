/**
 * Example programs.
 *
 * Small, ready-to-run programs used by the demo screens and as a starting point in the
 * editor. They are also a handy reference of what a program looks like, and they are checked
 * by the tests, so they always stay valid.
 */

import { ColorValue, Program, Script, SideName } from '../program/program';

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
