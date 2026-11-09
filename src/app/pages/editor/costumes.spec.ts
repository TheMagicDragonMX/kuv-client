import { CreateCommand } from '../../cube';
import { costumeNameProblem, costumesOfObject, freeCostumeName, moveCostume, objectFromCostumes } from './costumes';
import { CENTER, GRID, newDrawing } from './stage-object';

/**
 * Index of the center cell of the grid.
 */
const CENTER_CELL = CENTER * GRID + CENTER;

/**
 * A drawing with the center and one more cell painted.
 */
function drawingWith (color: number, cell: number) {
	const drawing = newDrawing(color);
	drawing[cell] = color;

	return drawing;
}

describe('the costumes of the Objects tab', () => {
	const up = { name: 'up', drawing: drawingWith(0xff0000, CENTER_CELL - GRID) };
	const down = { name: 'down', drawing: drawingWith(0x00ff00, CENTER_CELL + GRID) };

	it('save an object with one costume as before, without a list', () => {
		const object = objectFromCostumes('bird', [ up ]);

		expect(object.costumes).toBeUndefined();
		expect(object.pixels).toHaveLength(2);
	});

	it('save every costume, the object starting with the first', () => {
		const object = objectFromCostumes('bird', [ up, down ]);

		expect(object.color).toBe('#ff0000');
		expect(object.costumes?.map((costume) => costume.name)).toEqual([ 'up', 'down' ]);
		expect(object.costumes?.[1]).toMatchObject({ color: '#00ff00', pixels: [ { dx: 0, dy: 0 }, { dx: 0, dy: 1 } ] });
	});

	it('read the costumes of an object back, or make one for an object without them', () => {
		const object = objectFromCostumes('bird', [ up, down ]);

		expect(costumesOfObject(object, newDrawing(1))).toEqual([ up, down ]);
		expect(costumesOfObject({ ...object, costumes: undefined } as CreateCommand, up.drawing)).toEqual([ { name: 'Costume 1', drawing: up.drawing } ]);
		expect(costumesOfObject(null, down.drawing)).toEqual([ { name: 'Costume 1', drawing: down.drawing } ]);
	});

	it('get names that are free and not empty', () => {
		expect(freeCostumeName([ 'Costume 1' ])).toBe('Costume 2');
		expect(costumeNameProblem([ up, down ], 1, 'up')).toContain('already');
		expect(costumeNameProblem([ up, down ], 1, ' ')).toContain('name');
		expect(costumeNameProblem([ up, down ], 1, 'down')).toBeNull();
	});

	it('move left and right, not past the ends', () => {
		expect(moveCostume([ up, down ], 1, -1)).toEqual([ down, up ]);
		expect(moveCostume([ up, down ], 0, -1)).toEqual([ up, down ]);
	});
});
