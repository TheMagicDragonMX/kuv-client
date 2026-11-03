import { RawImage } from '../../cube';
import { MAX_PICTURE_BYTES, MAX_PICTURE_PIXELS, WORKING_SIDE, drawingFromImage, fileProblem, pixelsProblem, sizeOfImage, workingSize } from './image-object';
import { CENTER, GRID, drawingFromObject, objectFromDrawing } from './stage-object';

/**
 * A picture made of the given colors, row after row. Each entry is [red, green, blue, alpha],
 * or null for a pixel that is fully see-through.
 */
function picture (width: number, colors: ([ number, number, number, number ] | null)[]): RawImage {
	const data = new Uint8ClampedArray(colors.length * 4);

	colors.forEach((color, index) => data.set(color ?? [ 0, 0, 0, 0 ], index * 4));

	return { width, height: colors.length / width, data };
}

/**
 * The cells of a drawing that have color, as [column, row, color].
 */
function painted (drawing: (number | null)[]): [ number, number, number ][] {
	return drawing.flatMap((color, index) => null === color ? [] : [ [ index % GRID, Math.floor(index / GRID), color ] as [ number, number, number ] ]);
}

const RED: [ number, number, number, number ] = [ 255, 0, 0, 255 ];
const BLUE: [ number, number, number, number ] = [ 0, 0, 255, 255 ];

describe('sizeOfImage', () => {
	it('keeps the proportions, with the chosen size as the longest side', () => {
		const wide = picture(4, new Array(8).fill(RED));

		expect(sizeOfImage(wide, 8)).toEqual({ width: 8, height: 4 });
		expect(sizeOfImage(wide, 2)).toEqual({ width: 2, height: 1 });
	});

	it('is never bigger than the grid, nor smaller than one cell', () => {
		const wide = picture(100, new Array(100).fill(RED));

		expect(sizeOfImage(wide, 999).width).toBe(GRID);
		expect(sizeOfImage(wide, 0)).toEqual({ width: 1, height: 1 });
	});
});

describe('drawingFromImage', () => {
	it('puts the middle of the picture on the middle of the grid', () => {
		const result = drawingFromImage(picture(3, new Array(9).fill(RED)), 3);

		expect(painted(result.drawing).map(([ column, row ]) => [ column, row ])).toContainEqual([ CENTER, CENTER ]);
		expect(result).toMatchObject({ width: 3, height: 3, visible: true });
		expect(result.drawing.filter((cell) => null !== cell)).toHaveLength(9);
	});

	it('leaves see-through parts empty, so a picture without a background has none', () => {
		const result = drawingFromImage(picture(3, [ null, RED, null, RED, RED, RED, null, RED, null ]), 3);

		expect(painted(result.drawing)).toHaveLength(5);
		expect(result.drawing[(CENTER - 1) * GRID + CENTER - 1]).toBeNull();
	});

	it('averages the pixels a cell covers when the picture is shrunk', () => {
		const result = drawingFromImage(picture(2, [ RED, BLUE, RED, BLUE ]), 1);

		expect(painted(result.drawing)).toEqual([ [ CENTER, CENTER, 0x800080 ] ]);
	});

	it('does not darken the color of a cell at a faded edge', () => {
		const faded: [ number, number, number, number ] = [ 255, 0, 0, 200 ];

		expect(painted(drawingFromImage(picture(1, [ faded ]), 1).drawing)).toEqual([ [ CENTER, CENTER, 0xff0000 ] ]);
	});

	it('empties a cell that is mostly see-through', () => {
		const result = drawingFromImage(picture(2, [ RED, null, null, null ]), 1);

		expect(result.visible).toBe(false);
	});

	it('keeps black pixels lit', () => {
		const result = drawingFromImage(picture(1, [ [ 0, 0, 0, 255 ] ]), 1);

		expect(result.drawing[CENTER * GRID + CENTER]).toBe(0x010101);
	});

	it('is not visible when the whole picture is see-through', () => {
		expect(drawingFromImage(picture(2, [ null, null, null, null ]), 2).visible).toBe(false);
	});
});

describe('drawingFromImage with sharp edges', () => {
	it('takes the pixel at the middle of each cell instead of mixing them', () => {
		const stripes = picture(4, [ RED, BLUE, RED, BLUE ]);

		expect(painted(drawingFromImage(stripes, 4, true).drawing).map(([ , , color ]) => color)).toEqual([ 0xff0000, 0x0000ff, 0xff0000, 0x0000ff ]);
		expect(painted(drawingFromImage(stripes, 1, true).drawing)).toHaveLength(1);
	});

	it('leaves see-through pixels empty', () => {
		const result = drawingFromImage(picture(2, [ RED, null, null, RED ]), 2, true);

		expect(painted(result.drawing)).toHaveLength(2);
	});
});

describe('an object made from a picture with a hole in the middle', () => {
	it('is saved without the center and comes back with it empty', () => {
		const ring = drawingFromImage(picture(3, [ RED, RED, RED, RED, null, RED, RED, RED, RED ]), 3);
		const object = objectFromDrawing('ring', ring.drawing);

		expect(object.pixels).toHaveLength(8);
		expect(object.pixels).not.toContainEqual(expect.objectContaining({ dx: 0, dy: 0 }));
		expect(drawingFromObject(object)).toEqual(ring.drawing);
	});

	it('keeps a single pixel that is not the center', () => {
		const drawing = new Array<number | null>(GRID * GRID).fill(null);
		drawing[CENTER * GRID + CENTER + 1] = 0x00ff00;

		const object = objectFromDrawing('dot', drawing);

		expect(object.pixels).toEqual([ { dx: 1, dy: 0, color: '#00ff00' } ]);
		expect(drawingFromObject(object)).toEqual(drawing);
	});
});

describe('the limits of a picture', () => {
	it('accepts a file up to the limit and refuses a bigger one', () => {
		expect(fileProblem(MAX_PICTURE_BYTES)).toBeNull();
		expect(fileProblem(MAX_PICTURE_BYTES + 1)).toContain('too big');
	});

	it('accepts a picture up to the limit of pixels and refuses a bigger one', () => {
		expect(pixelsProblem(MAX_PICTURE_PIXELS, 1)).toBeNull();
		expect(pixelsProblem(MAX_PICTURE_PIXELS, 2)).toContain('too big');
	});

	it('shrinks a picture to the working side, keeping its proportions, and never stretches it', () => {
		expect(workingSize(4096, 2048)).toEqual({ width: WORKING_SIDE, height: WORKING_SIDE / 2 });
		expect(workingSize(1000, 3000)).toEqual({ width: Math.round(WORKING_SIDE / 3), height: WORKING_SIDE });
		expect(workingSize(300, 200)).toEqual({ width: 300, height: 200 });
	});
});
