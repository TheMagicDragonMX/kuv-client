import { MAX_ZOOM, centerOf, cropOf } from './crop';

describe('cropOf', () => {
	it('at zoom 1 takes the short side of the picture', () => {
		expect(cropOf(400, 200, 1, 200, 100)).toEqual({ x: 100, y: 0, side: 200 });
		expect(cropOf(200, 400, 1, 100, 200)).toEqual({ x: 0, y: 100, side: 200 });
	});

	it('gets smaller as the zoom goes up, around the center', () => {
		expect(cropOf(400, 400, 2, 200, 200)).toEqual({ x: 100, y: 100, side: 200 });
	});

	it('moves back inside the picture when the center is too close to a border', () => {
		expect(cropOf(400, 400, 4, 0, 0)).toEqual({ x: 0, y: 0, side: 100 });
		expect(cropOf(400, 400, 4, 400, 400)).toEqual({ x: 300, y: 300, side: 100 });
	});

	it('keeps the zoom between 1 and the maximum', () => {
		expect(cropOf(400, 400, 0.2, 200, 200).side).toBe(400);
		expect(cropOf(400, 400, 100, 200, 200).side).toBe(400 / MAX_ZOOM);
	});

	it('gives back the center it was made from', () => {
		expect(centerOf(cropOf(400, 400, 2, 150, 250))).toEqual({ x: 150, y: 250 });
	});
});
