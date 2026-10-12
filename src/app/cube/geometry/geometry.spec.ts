import { FACE_RESOLUTION, Face } from '../state/cube-state';
import { CubeGeometry, Heading, Pose, STRIP_WIDTH, SIDES } from './geometry';

/**
 * Builds a pose on the strip.
 */
function strip (x: number, y: number, heading = Heading.NORTH): Pose {
	return { surface: 'strip', x, y, heading };
}

/**
 * Builds a pose on the top face as stored.
 */
function top (x: number, y: number, heading = Heading.NORTH): Pose {
	return { surface: 'top', x, y, heading };
}

describe('CubeGeometry', () => {
	const geometry = new CubeGeometry();

	describe('placing', () => {
		it('places on a side with a north heading by default', () => {
			expect(geometry.place({ face: Face.BACK, x: 5, y: 7 }))
				.toEqual(strip(2 * FACE_RESOLUTION + 5, 7, Heading.NORTH));
		});

		it('keeps the given heading', () => {
			expect(geometry.place({ face: Face.FRONT, x: 0, y: 0, heading: Heading.EAST }).heading)
				.toBe(Heading.EAST);
		});

		it('places on the top face as stored when the front is the anchor', () => {
			expect(geometry.place({ face: Face.TOP, x: 10, y: 20 })).toEqual(top(10, 20));
		});

		it('rejects cells outside the faces', () => {
			expect(() => geometry.place({ face: Face.FRONT, x: 64, y: 0 })).toThrow(RangeError);
			expect(() => geometry.place({ face: Face.FRONT, x: 0, y: 64 })).toThrow(RangeError);
			expect(() => geometry.place({ face: Face.TOP, x: 0, y: -1 })).toThrow(RangeError);
		});
	});

	describe('moving around the strip', () => {
		it('moves inside a face', () => {
			expect(geometry.move(strip(10, 10), 'right', 3)).toEqual(strip(13, 10));
			expect(geometry.move(strip(10, 10), 'down', 2)).toEqual(strip(10, 12));
		});

		it('continues onto the next side without changing the heading', () => {
			expect(geometry.move(strip(63, 5), 'right')).toEqual(strip(64, 5));
		});

		it('wraps from the last side to the first', () => {
			expect(geometry.move(strip(STRIP_WIDTH - 1, 5), 'right')).toEqual(strip(0, 5));
			expect(geometry.move(strip(0, 5), 'left')).toEqual(strip(STRIP_WIDTH - 1, 5));
		});

		it('follows the heading for relative steps', () => {
			expect(geometry.move(strip(10, 10, Heading.EAST), 'up', 2)).toEqual(strip(12, 10, Heading.EAST));
			expect(geometry.move(strip(10, 10, Heading.SOUTH), 'right')).toEqual(strip(9, 10, Heading.SOUTH));
		});
	});

	describe('floor', () => {
		it('stops at the last visible row', () => {
			expect(geometry.move(strip(10, 60), 'down', 10)).toEqual(strip(10, 63));
		});

		it('can be set deeper, and then is not drawn below the visible rows', () => {
			const deep = new CubeGeometry({ floor: 70 });
			const pose = deep.move(strip(10, 60), 'down', 20);

			expect(pose).toEqual(strip(10, 70));
			expect(deep.toPixel(pose)).toBeNull();
			expect(deep.toPixel(strip(10, 63))).toEqual({ face: Face.FRONT, x: 10, y: 63 });
		});

		it('rejects a floor that is not a row', () => {
			expect(() => new CubeGeometry({ floor: -1 })).toThrow(RangeError);
		});
	});

	describe('crossing to the top face', () => {
		it.each([
			[ 'FRONT', Face.FRONT, top(10, 63, Heading.NORTH) ],
			[ 'RIGHT', Face.RIGHT, top(63, 53, Heading.WEST) ],
			[ 'BACK', Face.BACK, top(53, 0, Heading.SOUTH) ],
			[ 'LEFT', Face.LEFT, top(0, 10, Heading.EAST) ],
		])('enters from %s', (_name, face, expected) => {
			const start = geometry.place({ face, x: 10, y: 0 });

			expect(geometry.move(start, 'up')).toEqual(expected);
		});

		it.each([
			[ 'north', top(10, 0), Heading.NORTH, strip(2 * 64 + 53, 0, Heading.SOUTH) ],
			[ 'east', top(63, 20), Heading.EAST, strip(64 + 43, 0, Heading.SOUTH) ],
			[ 'south', top(10, 63), Heading.SOUTH, strip(10, 0, Heading.SOUTH) ],
			[ 'west', top(0, 20), Heading.WEST, strip(3 * 64 + 20, 0, Heading.SOUTH) ],
		])('leaves towards the %s', (_name, start, heading, expected) => {
			expect(geometry.move({ ...start, heading }, 'up')).toEqual(expected);
		});

		it('comes back to the same cell after going out and returning', () => {
			for (let x = 0; x < STRIP_WIDTH; x += 1) {
				const start = strip(x, 0);
				const there = geometry.move(start, 'up');

				expect(there.surface).toBe('top');
				expect(geometry.move(there, 'down')).toEqual(start);
			}
		});
	});

	describe('keeping a sense of up across the top face', () => {
		it('goes over the top to the opposite side and swaps left and right and up and down', () => {
			let pose = geometry.place({ face: Face.FRONT, x: 32, y: 30 });

			pose = geometry.move(pose, 'up', 31);
			expect(pose).toEqual(top(32, 63, Heading.NORTH));

			pose = geometry.move(pose, 'up', 63);
			expect(pose).toEqual(top(32, 0, Heading.NORTH));

			pose = geometry.move(pose, 'up');
			expect(pose).toEqual(strip(2 * 64 + 31, 0, Heading.SOUTH));
			expect(geometry.toPixel(pose)).toEqual({ face: Face.BACK, x: 31, y: 0 });

			// On the screen of the back face "up" now goes down and "right" goes left.
			expect(geometry.move(pose, 'up').y).toBe(1);
			expect(geometry.move(pose, 'right').x).toBe(pose.x - 1);
		});

		it('turns the heading a quarter when walking around a corner of the top face', () => {
			let pose = strip(63, 0);

			pose = geometry.move(pose, 'right');
			pose = geometry.move(pose, 'up');
			pose = geometry.move(pose, 'left');

			expect(pose).toEqual(strip(63, 0, Heading.WEST));
		});
	});

	describe('top anchor', () => {
		it('rejects the top face as an anchor', () => {
			expect(() => new CubeGeometry({ topAnchor: Face.TOP })).toThrow(RangeError);
		});

		it('rotates the addressed top face so the anchor is at the bottom', () => {
			const anchored = new CubeGeometry({ topAnchor: Face.LEFT });
			const pose = anchored.place({ face: Face.TOP, x: 32, y: 63 });

			// The bottom edge of the addressed top face is the one touching the left side.
			expect(pose).toEqual(top(0, 32, Heading.EAST));
			// Going down on it leaves to the left side, walking backwards so its up points away from it.
			expect(anchored.move(pose, 'down')).toEqual(strip(3 * 64 + 32, 0, Heading.NORTH));
		});

		it('keeps north pointing away from the anchor', () => {
			for (const anchor of SIDES) {
				const anchored = new CubeGeometry({ topAnchor: anchor });
				const pose = anchored.place({ face: Face.TOP, x: 32, y: 63 });
				const left = anchored.move(pose, 'down');

				expect(anchored.toPixel(left)!.face).toBe(anchor);
			}
		});

		it('does not change how the sides work', () => {
			const anchored = new CubeGeometry({ topAnchor: Face.BACK });

			expect(anchored.place({ face: Face.RIGHT, x: 3, y: 4 })).toEqual(strip(64 + 3, 4));
			expect(anchored.move(strip(10, 0), 'up')).toEqual(geometry.move(strip(10, 0), 'up'));
		});
	});

	describe('pointing up', () => {
		it('resets the heading to north on the strip', () => {
			expect(geometry.pointUp(strip(5, 5, Heading.WEST))).toEqual(strip(5, 5, Heading.NORTH));
		});

		it('resets the heading to the addressed north on the top face', () => {
			const anchored = new CubeGeometry({ topAnchor: Face.LEFT });

			expect(geometry.pointUp(top(5, 5, Heading.WEST))).toEqual(top(5, 5, Heading.NORTH));
			expect(anchored.pointUp(top(5, 5, Heading.WEST)).heading)
				.toBe(anchored.place({ face: Face.TOP, x: 5, y: 5 }).heading);
		});
	});

	describe('offsets', () => {
		it('finds cells right of and below a pose', () => {
			expect(geometry.offset(strip(10, 10), 2, 3)).toEqual(strip(12, 13));
		});

		it('follows the heading of the pose', () => {
			expect(geometry.offset(strip(10, 10, Heading.EAST), 0, -1)).toEqual(strip(11, 10, Heading.EAST));
			expect(geometry.offset(strip(10, 10, Heading.EAST), 1, 0)).toEqual(strip(10, 11, Heading.EAST));
		});

		it('wraps around the strip', () => {
			expect(geometry.offset(strip(0, 5), -1, 0)).toEqual(strip(STRIP_WIDTH - 1, 5));
		});

		it('crosses onto the top face', () => {
			expect(geometry.offset(strip(10, 0), 0, -1)).toEqual(top(10, 63, Heading.NORTH));
		});

		it('returns null where the floor blocks it', () => {
			expect(geometry.offset(strip(10, 63), 0, 1)).toBeNull();
		});

		it('gives the same cell as walking step by step', () => {
			for (const heading of [ Heading.NORTH, Heading.EAST, Heading.SOUTH, Heading.WEST ])
				for (const [ dx, dy ] of [ [ 5, 3 ], [ -7, 2 ], [ 130, -4 ], [ -200, 9 ], [ 0, 6 ] ]) {
					const start = strip(250, 20, heading);
					const walked = geometry.move(geometry.move(start, 0 < dx ? 'right' : 'left', Math.abs(dx)), 0 < dy ? 'down' : 'up', Math.abs(dy));

					const found = geometry.offset(start, dx, dy);

					// A walk blocked by the floor gives null here, but `move` just stops early.
					if (found)
						expect(found).toEqual(walked);
					else
						expect(walked.y).toBe(geometry.floor);
				}
		});

		it('finds the same pixel as offset followed by toPixel', () => {
			const tall = new CubeGeometry({ floor: 70 });
			const poses = [ strip(250, 20, Heading.EAST), strip(3, 0), strip(10, 66, Heading.SOUTH), top(5, 5, Heading.WEST) ];

			for (const pose of poses)
				for (const [ dx, dy ] of [ [ 0, 0 ], [ 5, 3 ], [ -7, -2 ], [ 130, -4 ], [ -2, 9 ], [ 0, -3 ] ]) {
					const moved = tall.offset(pose, dx, dy);

					expect(tall.pixelAt(pose, dx, dy)).toEqual(moved && tall.toPixel(moved));
				}
		});

		it('rejects offsets that are not whole numbers', () => {
			expect(() => geometry.offset(strip(10, 10), 0.5, 0)).toThrow(RangeError);
		});
	});

	describe('drawing', () => {
		it('maps strip poses to side faces', () => {
			expect(geometry.toPixel(strip(64 + 3, 4))).toEqual({ face: Face.RIGHT, x: 3, y: 4 });
			expect(geometry.toPixel(strip(3 * 64 + 63, 63))).toEqual({ face: Face.LEFT, x: 63, y: 63 });
		});

		it('maps top poses to the top face', () => {
			expect(geometry.toPixel(top(7, 9))).toEqual({ face: Face.TOP, x: 7, y: 9 });
		});
	});
});
