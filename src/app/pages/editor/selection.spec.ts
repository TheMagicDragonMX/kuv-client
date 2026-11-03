import { MIN_SIDE, grabOf, moveRect, rectBetween, resizeRect, wholeImage } from './selection';

/**
 * A picture 100 pixels across and 60 down.
 */
const BOUNDS = { width: 100, height: 60 };

describe('rectBetween', () => {
	it('takes the two points in any order', () => {
		expect(rectBetween({ x: 40, y: 30 }, { x: 10, y: 5 }, BOUNDS)).toEqual({ x: 10, y: 5, width: 30, height: 25 });
	});

	it('stays inside the picture', () => {
		expect(rectBetween({ x: -20, y: -5 }, { x: 150, y: 90 }, BOUNDS)).toEqual(wholeImage(BOUNDS));
	});

	it('is never smaller than the minimum side, even when it starts at the edge', () => {
		const rect = rectBetween({ x: 100, y: 60 }, { x: 100, y: 60 }, BOUNDS);

		expect(rect).toEqual({ x: 100 - MIN_SIDE, y: 60 - MIN_SIDE, width: MIN_SIDE, height: MIN_SIDE });
	});
});

describe('moveRect', () => {
	it('moves the rectangle', () => {
		expect(moveRect({ x: 10, y: 10, width: 20, height: 20 }, 5, -3, BOUNDS)).toEqual({ x: 15, y: 7, width: 20, height: 20 });
	});

	it('stops at the edges and keeps its size', () => {
		expect(moveRect({ x: 10, y: 10, width: 20, height: 20 }, 500, 500, BOUNDS)).toEqual({ x: 80, y: 40, width: 20, height: 20 });
		expect(moveRect({ x: 10, y: 10, width: 20, height: 20 }, -500, -500, BOUNDS)).toEqual({ x: 0, y: 0, width: 20, height: 20 });
	});
});

describe('resizeRect', () => {
	const rect = { x: 20, y: 10, width: 40, height: 30 };

	it('moves the dragged corner and keeps the opposite one', () => {
		expect(resizeRect(rect, 'se', { x: 80, y: 50 }, BOUNDS)).toEqual({ x: 20, y: 10, width: 60, height: 40 });
		expect(resizeRect(rect, 'nw', { x: 0, y: 0 }, BOUNDS)).toEqual({ x: 0, y: 0, width: 60, height: 40 });
	});

	it('turns over when the corner is dragged past the opposite one', () => {
		expect(resizeRect(rect, 'se', { x: 5, y: 2 }, BOUNDS)).toEqual({ x: 5, y: 2, width: 15, height: 8 });
	});
});

describe('grabOf', () => {
	const rect = { x: 20, y: 10, width: 40, height: 30 };

	it('grabs the corner that is near', () => {
		expect(grabOf(rect, { x: 22, y: 12 }, 5)).toBe('nw');
		expect(grabOf(rect, { x: 58, y: 38 }, 5)).toBe('se');
	});

	it('grabs the whole rectangle from inside', () => {
		expect(grabOf(rect, { x: 40, y: 25 }, 5)).toBe('move');
	});

	it('starts a new rectangle from outside', () => {
		expect(grabOf(rect, { x: 90, y: 55 }, 5)).toBe('new');
	});
});
