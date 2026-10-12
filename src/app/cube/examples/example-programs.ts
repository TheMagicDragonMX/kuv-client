/**
 * Example programs.
 *
 * Small, ready-to-run programs used by the demo screens and as a starting point in the
 * editor. They are also a handy reference of what a program looks like, and they are checked
 * by the tests, so they always stay valid.
 */

import { Program } from '../program/program';

/**
 * A program with a name and a description for showing in a menu.
 */
export interface ExampleProgram {
	id: string;
	name: string;
	description: string;
	program: Program;
}

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
