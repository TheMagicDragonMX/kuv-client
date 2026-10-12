/**
 * LAYER: geometry.
 *
 * Answers one question: "if an object steps this way, where does it end up?". It knows how
 * the five faces connect, so nothing else has to think about edges, corners or rotations.
 *
 * The cube is modeled as two surfaces:
 *
 *   strip  the four sides (FRONT, RIGHT, BACK, LEFT) as one 256x64 band that wraps around
 *   top    the top face, 64x64, stored as seen from above with FRONT at the bottom
 *
 * Every object has a Pose: a surface, a cell and a heading. The heading is the direction the
 * object's own "up" points. Steps (up/right/down/left) are relative to it, and crossing an
 * edge between a side and the top rotates the heading, so an object that keeps "going up"
 * keeps going the same way. The full explanation, with the edge table, is in
 * CUBE_DESIGN.md (sections 4 and 5).
 *
 * Pure logic: no Angular, no three.js, no state. Everything here is a function of its inputs.
 */

import { FACE_RESOLUTION, Face } from '../state/cube-state';

/**
 * Direction on a surface, as seen from outside the cube. The values are quarter
 * turns clockwise from north, so adding a number rotates a direction.
 */
export enum Heading {
	NORTH = 0,
	EAST = 1,
	SOUTH = 2,
	WEST = 3,
}

/**
 * A move relative to the heading of the object: "up" goes where the object's up points.
 */
export type Step = 'up' | 'right' | 'down' | 'left';

/**
 * Where a relative step points, in quarter turns clockwise from the heading.
 */
const STEP_TURNS: Record<Step, number> = {
	up: 0,
	right: 1,
	down: 2,
	left: 3,
};

/**
 * The four side faces in the order they appear going right around the cube. Together
 * they form the strip.
 */
export const SIDES: readonly Face[] = [ Face.FRONT, Face.RIGHT, Face.BACK, Face.LEFT ];

/**
 * Width of the strip, in cells.
 */
export const STRIP_WIDTH = SIDES.length * FACE_RESOLUTION;

/**
 * Surface an object lives on: the wrapping strip of the four sides, or the top face.
 */
export type Surface = 'strip' | 'top';

/**
 * Where an object is and which way it faces.
 *
 * On the strip, x runs 0..STRIP_WIDTH-1 (wrapping) and y grows downward from the top row.
 * On the top face the coordinates are the ones stored in the cube state: seen from above
 * with the front at the bottom. Headings are directions on the screen of that surface.
 */
export interface Pose {
	surface: Surface;
	x: number;
	y: number;
	heading: Heading;
}

/**
 * Where a user puts a new object. For a side face, x and y are local to that face. For
 * the top face they follow the configured top anchor (see GeometryConfig.topAnchor), and
 * so does the heading.
 */
export interface Placement {
	face: Face;
	x: number;
	y: number;
	heading?: Heading;
}

/**
 * A pixel of the cube state.
 */
export interface FacePixel {
	face: Face;
	x: number;
	y: number;
}

/**
 * Settings of the geometry. Both are optional.
 */
export interface GeometryConfig {

	/**
	 * Last row objects can reach on the sides. Rows below the last visible one exist but
	 * are not drawn. Defaults to the last visible row.
	 */
	floor?: number;

	/**
	 * Side that is at the bottom of the top face when placing objects on it, and whose
	 * opposite is where a north-facing object on the top face heads to. It only decides
	 * how the top face is addressed and never changes how objects move. Defaults to FRONT.
	 */
	topAnchor?: Face;
}

/**
 * Screen offset of one cell in each direction, indexed by Heading.
 */
const OFFSETS: readonly (readonly [ number, number ])[] = [
	[ 0, -1 ],
	[ 1, 0 ],
	[ 0, 1 ],
	[ -1, 0 ],
];

/**
 * Direction, on the top face as stored, in which each side lies.
 */
const SIDE_DIRECTION_ON_TOP: Partial<Record<Face, Heading>> = {
	[Face.FRONT]: Heading.SOUTH,
	[Face.RIGHT]: Heading.EAST,
	[Face.BACK]: Heading.NORTH,
	[Face.LEFT]: Heading.WEST,
};

/**
 * Rotates a direction by quarter turns clockwise.
 */
export function turn (heading: Heading, quarterTurns: number): Heading {
	return (((heading + quarterTurns) % 4) + 4) % 4;
}

/**
 * Rotates a cell of the top face by quarter turns clockwise around the face center.
 */
function rotateCell (x: number, y: number, quarterTurns: number): [ number, number ] {
	let rotatedX = x;
	let rotatedY = y;

	for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i += 1)
		[ rotatedX, rotatedY ] = [ FACE_RESOLUTION - 1 - rotatedY, rotatedX ];


	return [ rotatedX, rotatedY ];
}

/**
 * Knows how the surfaces of the cube connect: moves objects across the edges of the
 * strip and the top face, keeping their sense of "up", and maps them to cube state pixels.
 */
export class CubeGeometry {

	/**
	 * Last row objects can reach on the sides.
	 */
	readonly floor: number;

	/**
	 * Side at the bottom of the top face when addressing it.
	 */
	readonly topAnchor: Face;

	/**
	 * Quarter turns clockwise from the addressed top face to the stored one.
	 */
	private readonly anchorTurns: number;

	constructor (config: GeometryConfig = {}) {
		const floor = config.floor ?? FACE_RESOLUTION - 1;
		const topAnchor = config.topAnchor ?? Face.FRONT;

		if (!Number.isInteger(floor) || 0 > floor)
			throw new RangeError(`The floor must be a row number, got ${floor}`);

		if (!SIDES.includes(topAnchor))
			throw new RangeError('The top anchor must be a side face');

		this.floor = floor;
		this.topAnchor = topAnchor;
		this.anchorTurns = turn(SIDE_DIRECTION_ON_TOP[topAnchor]!, -Heading.SOUTH);
	}

	/**
	 * Turns a placement into a pose. The heading defaults to north.
	 */
	place (placement: Placement): Pose {
		const { face, x, y } = placement;
		const heading = placement.heading ?? Heading.NORTH;
		const isCell = Number.isInteger(x) && Number.isInteger(y) && 0 <= x && x < FACE_RESOLUTION && 0 <= y;

		if (face === Face.TOP) {
			if (!isCell || y >= FACE_RESOLUTION)
				throw new RangeError(`Cell (${x}, ${y}) is outside the top face`);

			const [ storedX, storedY ] = rotateCell(x, y, this.anchorTurns);

			return {
				surface: 'top',
				x: storedX,
				y: storedY,
				heading: turn(heading, this.anchorTurns),
			};
		}

		const sideIndex = SIDES.indexOf(face);
		if (0 > sideIndex)
			throw new RangeError(`Unknown face ${face}`);

		if (!isCell || y > this.floor)
			throw new RangeError(`Cell (${x}, ${y}) is outside the side face`);


		return { surface: 'strip', x: sideIndex * FACE_RESOLUTION + x, y, heading };
	}

	/**
	 * Moves a pose a number of cells in a direction relative to its heading, one cell at a
	 * time. Crossing an edge keeps the object facing the way it was going, so the heading
	 * changes with respect to the screen. The move stops early at the floor.
	 */
	move (pose: Pose, step: Step, count = 1): Pose {
		if (!Number.isInteger(count) || 0 > count)
			throw new RangeError(`The number of cells must be a non-negative integer, got ${count}`);

		const turns = STEP_TURNS[step];
		let current = pose;

		for (let i = 0; i < count; i += 1) {
			const next = this.advance(current, turn(current.heading, turns));
			if (!next)
				break;

			current = next;
		}

		return current;
	}

	/**
	 * Finds the pose of the cell `dx` cells to the right and `dy` cells down from a pose, in
	 * the frame of the pose: a negative `dx` is to the left and a negative `dy` is up. The
	 * walk goes sideways first and then vertically, crossing edges like `move` does, so the
	 * result is the cell a shape pixel at that offset covers. Returns null if the walk is
	 * blocked by the floor.
	 */
	offset (pose: Pose, dx: number, dy: number): Pose | null {
		if (!Number.isInteger(dx) || !Number.isInteger(dy))
			throw new RangeError(`The offset must be whole numbers, got (${dx}, ${dy})`);

		if ('strip' === pose.surface) {
			// On the strip, the walk only needs to follow the edges when it goes over the top.
			// Anywhere else the answer is plain arithmetic on the cell.
			const [ sideX, sideY ] = OFFSETS[turn(pose.heading, 0 < dx ? STEP_TURNS.right : STEP_TURNS.left)];
			const [ downX, downY ] = OFFSETS[turn(pose.heading, 0 < dy ? STEP_TURNS.down : STEP_TURNS.up)];
			const x = pose.x + sideX * Math.abs(dx) + downX * Math.abs(dy);
			const y = pose.y + sideY * Math.abs(dx) + downY * Math.abs(dy);

			if (y > this.floor)
				return null;

			if (0 <= y)
				return { ...pose, x: ((x % STRIP_WIDTH) + STRIP_WIDTH) % STRIP_WIDTH, y };
		}

		const sideways = this.walk(pose, 0 < dx ? 'right' : 'left', Math.abs(dx));

		return sideways && this.walk(sideways, 0 < dy ? 'down' : 'up', Math.abs(dy));
	}

	/**
	 * Finds the cube state pixel that the cell `dx` right and `dy` down from a pose is drawn
	 * on, or null if there is none. It is `toPixel(offset(pose, dx, dy))` without making the
	 * pose in between, because the renderer asks this for every pixel of every shape.
	 */
	pixelAt (pose: Pose, dx: number, dy: number): FacePixel | null {
		if ('strip' === pose.surface) {
			const [ sideX, sideY ] = OFFSETS[turn(pose.heading, 0 < dx ? STEP_TURNS.right : STEP_TURNS.left)];
			const [ downX, downY ] = OFFSETS[turn(pose.heading, 0 < dy ? STEP_TURNS.down : STEP_TURNS.up)];
			const y = pose.y + sideY * Math.abs(dx) + downY * Math.abs(dy);

			if (0 <= y && y < FACE_RESOLUTION && y <= this.floor) {
				const x = pose.x + sideX * Math.abs(dx) + downX * Math.abs(dy);
				const column = ((x % STRIP_WIDTH) + STRIP_WIDTH) % STRIP_WIDTH;

				return { face: SIDES[Math.floor(column / FACE_RESOLUTION)], x: column % FACE_RESOLUTION, y };
			}
		}

		const moved = this.offset(pose, dx, dy);

		return moved && this.toPixel(moved);
	}

	/**
	 * Resets the heading of a pose to "up" as the user sees it. On the strip that is north.
	 * On the top face it is north of the addressed top face, which depends on the top anchor.
	 */
	pointUp (pose: Pose): Pose {
		const heading = 'top' === pose.surface
			? turn(Heading.NORTH, this.anchorTurns)
			: Heading.NORTH;

		return { ...pose, heading };
	}

	/**
	 * Finds the cube state pixel a pose is drawn on, or null if it is below the visible rows.
	 */
	toPixel (pose: Pose): FacePixel | null {
		if ('top' === pose.surface)
			return { face: Face.TOP, x: pose.x, y: pose.y };

		if (pose.y >= FACE_RESOLUTION)
			return null;


		return {
			face: SIDES[Math.floor(pose.x / FACE_RESOLUTION)],
			x: pose.x % FACE_RESOLUTION,
			y: pose.y,
		};
	}

	/**
	 * Like `move`, but returns null instead of stopping early when the floor is in the way.
	 */
	private walk (pose: Pose, step: Step, count: number): Pose | null {
		let current: Pose | null = pose;

		for (let i = 0; current && i < count; i += 1)
			current = this.advance(current, turn(current.heading, STEP_TURNS[step]));

		return current;
	}

	/**
	 * Moves a pose one cell towards a direction of the screen, or returns null if blocked.
	 */
	private advance (pose: Pose, direction: Heading): Pose | null {
		const [ dx, dy ] = OFFSETS[direction];
		const x = pose.x + dx;
		const y = pose.y + dy;

		if ('strip' === pose.surface) {
			if (y > this.floor)
				return null;

			if (0 > y)
				return this.enterTop(pose, direction);


			return { ...pose, x: (x + STRIP_WIDTH) % STRIP_WIDTH, y };
		}

		if (0 > x || x >= FACE_RESOLUTION || 0 > y || y >= FACE_RESOLUTION)
			return this.leaveTop(pose, direction);


		return { ...pose, x, y };
	}

	/**
	 * Crosses from the top row of a side onto the top face, going north.
	 */
	private enterTop (pose: Pose, direction: Heading): Pose {
		const last = FACE_RESOLUTION - 1;
		const sideIndex = Math.floor(pose.x / FACE_RESOLUTION);
		const column = pose.x % FACE_RESOLUTION;
		let cell: [ number, number ];
		let arriving: Heading;

		switch (SIDES[sideIndex]) {
			case Face.FRONT:
				cell = [ column, last ];
				arriving = Heading.NORTH;
				break;
			case Face.RIGHT:
				cell = [ last, last - column ];
				arriving = Heading.WEST;
				break;
			case Face.BACK:
				cell = [ last - column, 0 ];
				arriving = Heading.SOUTH;
				break;
			default:
				cell = [ 0, column ];
				arriving = Heading.EAST;
				break;
		}

		return {
			surface: 'top',
			x: cell[0],
			y: cell[1],
			heading: turn(pose.heading, arriving - direction),
		};
	}

	/**
	 * Crosses from an edge of the top face down onto the side that lies there, going south.
	 */
	private leaveTop (pose: Pose, direction: Heading): Pose {
		const last = FACE_RESOLUTION - 1;
		let stripX: number;

		switch (direction) {
			case Heading.NORTH:
				stripX = SIDES.indexOf(Face.BACK) * FACE_RESOLUTION + last - pose.x;
				break;
			case Heading.EAST:
				stripX = SIDES.indexOf(Face.RIGHT) * FACE_RESOLUTION + last - pose.y;
				break;
			case Heading.SOUTH:
				stripX = SIDES.indexOf(Face.FRONT) * FACE_RESOLUTION + pose.x;
				break;
			default:
				stripX = SIDES.indexOf(Face.LEFT) * FACE_RESOLUTION + pose.y;
				break;
		}

		return {
			surface: 'strip',
			x: stripX,
			y: 0,
			heading: turn(pose.heading, Heading.SOUTH - direction),
		};
	}
}
