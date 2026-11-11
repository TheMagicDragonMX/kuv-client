import { CubeState, FACE_RESOLUTION, Face, scaleColor } from './cube-state';

describe('CubeState', () => {
	it('starts blank', () => {
		expect(new CubeState().get(Face.FRONT, 0, 0)).toBe(0);
	});

	it('stores a pixel per face', () => {
		const state = new CubeState();

		state.set(Face.TOP, 3, 4, 0xff0000);

		expect(state.get(Face.TOP, 3, 4)).toBe(0xff0000);
		expect(state.get(Face.FRONT, 3, 4)).toBe(0);
	});

	it('ignores writes outside a face and reads them as black', () => {
		const state = new CubeState();
		const version = state.version;

		state.set(Face.FRONT, FACE_RESOLUTION, 0, 0xffffff);
		state.set(Face.FRONT, 0, -1, 0xffffff);

		expect(state.version).toBe(version);
		expect(state.get(Face.FRONT, FACE_RESOLUTION, 0)).toBe(0);
	});

	it('raises the version on every change', () => {
		const state = new CubeState();
		const version = state.version;

		state.set(Face.FRONT, 0, 0, 1);
		expect(state.version).toBeGreaterThan(version);
	});

	it('copies every pixel from another state', () => {
		const source = new CubeState();
		const target = new CubeState();
		source.set(Face.BACK, 10, 11, 0x00ff00);
		target.set(Face.FRONT, 1, 1, 0x123456);

		target.copyFrom(source);

		expect(target.get(Face.BACK, 10, 11)).toBe(0x00ff00);
		expect(target.get(Face.FRONT, 1, 1)).toBe(0);
	});

	it('dims a color keeping its hue, and leaves it alone at full intensity', () => {
		expect(scaleColor(0xff8040, 0.5)).toBe(0x804020);
		expect(scaleColor(0xff8040, 1)).toBe(0xff8040);
		expect(scaleColor(0xff8040, 0)).toBe(0);
	});

	it('dims every pixel of one face and leaves the others', () => {
		const state = new CubeState();
		state.set(Face.FRONT, 1, 1, 0xff0000);
		state.set(Face.TOP, 2, 2, 0x00ff00);

		state.dimFace(Face.FRONT, 0.5);

		expect(state.get(Face.FRONT, 1, 1)).toBe(0x800000);
		expect(state.get(Face.TOP, 2, 2)).toBe(0x00ff00);
	});
});
