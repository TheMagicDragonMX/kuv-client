import { TestBed } from '@angular/core/testing';
import { BackgroundPanelComponent } from './background-panel.component';

/**
 * The protected members the template uses, so the steps of the panel can be driven without a
 * browser (picking a file and cropping need real canvases, which the test environment lacks).
 */
type PanelInternals = {
	/**
	 * The picture, as if already cropped.
	 */
	pixels: { set(value: Uint32Array | null): void };

	/**
	 * The faces chosen.
	 */
	selected: () => ReadonlySet<string>;

	/**
	 * True when every face is chosen.
	 */
	allSelected: () => boolean;

	/**
	 * Chooses or unchooses a face.
	 */
	toggle(name: string): void;

	/**
	 * Chooses every face, or none.
	 */
	toggleAll(): void;

	/**
	 * Puts the picture on the chosen faces.
	 */
	apply(): void;

	/**
	 * Takes the picture off the chosen faces.
	 */
	remove(): void;

	/**
	 * True when the face has a picture.
	 */
	hasImage(name: string): boolean;

	/**
	 * The intensity of the background or the objects, as a percentage.
	 */
	percent(id: 'background' | 'objects'): number;

	/**
	 * Sets the intensity of the background or the objects, from a percentage.
	 */
	setLevel(id: 'background' | 'objects', percent: number): void;

	/**
	 * Goes back to the usual intensities.
	 */
	resetLevels(): void;
};

/**
 * Creates the panel and gives access to its internals.
 */
function createPanel () {
	const fixture = TestBed.createComponent(BackgroundPanelComponent);
	const panel = fixture.componentInstance;

	return { panel, internals: panel as unknown as PanelInternals };
}

describe('BackgroundPanelComponent', () => {
	const picture = new Uint32Array(64 * 64).fill(0x336699);

	it('puts the picture on the faces that are selected, and only those', () => {
		const { panel, internals } = createPanel();
		internals.pixels.set(picture);

		internals.toggle('FRONT');
		internals.toggle('LEFT');
		internals.apply();

		expect(Object.keys(panel.environment().background ?? {}).sort()).toEqual([ 'FRONT', 'LEFT' ]);
		expect(panel.environment().background?.FRONT).toBe(picture);
	});

	it('puts it on every face with "all", and "all" again unselects them', () => {
		const { panel, internals } = createPanel();
		internals.pixels.set(picture);

		internals.toggleAll();
		expect(internals.allSelected()).toBe(true);
		internals.apply();
		expect(Object.keys(panel.environment().background ?? {})).toHaveLength(5);

		internals.toggleAll();
		expect(internals.selected().size).toBe(0);
	});

	it('does nothing when no face is selected', () => {
		const { panel, internals } = createPanel();
		internals.pixels.set(picture);

		internals.apply();

		expect(panel.environment().background).toBeUndefined();
	});

	it('keeps the pictures of the other faces when another picture is applied', () => {
		const { panel, internals } = createPanel();
		const other = new Uint32Array(64 * 64).fill(0xff0000);
		internals.pixels.set(picture);
		internals.toggle('FRONT');
		internals.apply();

		internals.pixels.set(other);
		internals.toggle('FRONT');
		internals.toggle('TOP');
		internals.apply();

		expect(panel.environment().background?.FRONT).toBe(picture);
		expect(panel.environment().background?.TOP).toBe(other);
	});

	it('removes the picture from the selected faces only', () => {
		const { panel, internals } = createPanel();
		internals.pixels.set(picture);
		internals.toggleAll();
		internals.apply();

		internals.toggleAll();
		internals.toggle('BACK');
		internals.remove();

		expect(internals.hasImage('BACK')).toBe(false);
		expect(internals.hasImage('FRONT')).toBe(true);
		expect(Object.keys(panel.environment().background ?? {})).toHaveLength(4);
	});

	it('hands out a new environment each time, so the page notices the change', () => {
		const { panel, internals } = createPanel();
		internals.pixels.set(picture);
		internals.toggle('FRONT');
		const before = panel.environment();

		internals.apply();

		expect(panel.environment()).not.toBe(before);
		expect(before.background).toBeUndefined();
	});

	describe('brightness', () => {
		it('shows full intensity when the environment sets none', () => {
			const { internals } = createPanel();

			expect(internals.percent('background')).toBe(100);
			expect(internals.percent('objects')).toBe(100);
		});

		it('sets each intensity in the environment, between 0 and 100', () => {
			const { panel, internals } = createPanel();

			internals.setLevel('background', 30);
			internals.setLevel('objects', 250);

			expect(panel.environment().brightness).toEqual({ background: 0.3, objects: 1 });
			expect(internals.percent('background')).toBe(30);
		});

		it('goes back to the usual: objects at full and the background softer', () => {
			const { panel, internals } = createPanel();
			internals.setLevel('background', 100);

			internals.resetLevels();

			expect(panel.environment().brightness).toEqual({ background: 0.4, objects: 1 });
		});
	});
});
