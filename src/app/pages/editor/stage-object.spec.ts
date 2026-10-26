import { CreateCommand } from '../../cube';
import { CENTER, GRID, drawingFromObject, freeObjectName, nameProblem, newDrawing, objectFromDrawing, pictureOfObject } from './stage-object';

const PINK = 0xf9a8d4;

describe('objects from drawings', () => {
	it('start with only the center painted', () => {
		const drawing = newDrawing(PINK);

		expect(drawing).toHaveLength(GRID * GRID);
		expect(drawing.filter((cell) => null !== cell)).toEqual([ PINK ]);
		expect(drawing[CENTER * GRID + CENTER]).toBe(PINK);
	});

	it('are a single pixel when only the center is painted, on the front face', () => {
		expect(objectFromDrawing(' ball ', newDrawing(PINK))).toEqual({
			op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 32, color: '#f9a8d4',
		});
	});

	it('list every painted cell, around the center, when there are more', () => {
		const drawing = newDrawing(PINK);
		drawing[(CENTER - 1) * GRID + CENTER] = 0x00ff00;
		drawing[CENTER * GRID + CENTER + 2] = 0x0000ff;

		const object = objectFromDrawing('a', drawing);

		expect(object.pixels).toEqual([
			{ dx: 0, dy: -1, color: '#00ff00' },
			{ dx: 0, dy: 0, color: '#f9a8d4' },
			{ dx: 2, dy: 0, color: '#0000ff' },
		]);
		expect(object.color).toBe('#f9a8d4');
	});

	it('come back as the same drawing', () => {
		const drawing = newDrawing(PINK);
		drawing[0] = 0x111111;
		drawing[GRID * GRID - 1] = 0x222222;

		expect(drawingFromObject(objectFromDrawing('a', drawing))).toEqual(drawing);
	});

	it('use the color of the object for pixels without one', () => {
		const object: CreateCommand = { op: 'create', name: 'a', face: 'FRONT', x: 32, y: 32, color: '#ff0000', pixels: [ { dx: 1, dy: 0 } ] };

		const drawing = drawingFromObject(object)!;

		expect(drawing[CENTER * GRID + CENTER + 1]).toBe(0xff0000);
		expect(drawing[CENTER * GRID + CENTER]).toBe(0xff0000);
	});

	it('cannot be drawn when they do not fit the grid', () => {
		const wide: CreateCommand = { op: 'create', name: 'a', face: 'FRONT', x: 0, y: 28, color: '#ff0000', pixels: [ { dx: -128, dy: 0 }, { dx: 127, dy: 0 } ] };

		expect(drawingFromObject(wide)).toBeNull();
	});
});

describe('pictureOfObject', () => {
	it('is one cell for a single pixel', () => {
		expect(pictureOfObject({ op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ff0000' })).toEqual({ width: 1, height: 1, colors: [ 0xff0000 ] });
	});

	it('is cropped to the cells the shape uses, with holes left empty', () => {
		const picture = pictureOfObject({
			op: 'create', name: 'a', face: 'FRONT', x: 0, y: 0, color: '#ff0000',
			pixels: [ { dx: -1, dy: -1 }, { dx: 1, dy: 0, color: '#00ff00' } ],
		});

		expect(picture.width).toBe(3);
		expect(picture.height).toBe(2);
		expect(picture.colors).toEqual([ 0xff0000, null, null, null, null, 0x00ff00 ]);
	});
});

describe('names', () => {
	it('must be there and new', () => {
		expect(nameProblem('  ', [])).toBe('Give the object a name.');
		expect(nameProblem('a', [ 'a' ])).toContain('already an object');
		expect(nameProblem('b', [ 'a' ])).toBeNull();
	});

	it('are suggested: the first object<number> nobody uses', () => {
		expect(freeObjectName([])).toBe('object1');
		expect(freeObjectName([ 'object1', 'object3' ])).toBe('object2');
	});
});
