import { TestBed } from '@angular/core/testing';
import { BackgroundPanelComponent } from './background-panel.component';

/**
 * The protected members the template uses, so the steps of the panel can be driven without a
 * browser (picking a file and cropping need real canvases, which the test environment lacks).
 */
interface PanelInternals {
	media: { set(value: Uint32Array | { frames: Uint32Array[]; fps: number } | null): void };
	selected: () => ReadonlySet<string>;
	allSelected: () => boolean;
	toggle(name: string): void;
	toggleAll(): void;
	apply(): void;
	remove(): void;
	kindOf(name: string): 'plain' | 'picture' | 'video';
}

function createPanel () {
	const fixture = TestBed.createComponent(BackgroundPanelComponent);
	const panel = fixture.componentInstance;

	return { panel, internals: panel as unknown as PanelInternals };
}

describe('BackgroundPanelComponent', () => {
	const picture = new Uint32Array(64 * 64).fill(0x336699);

	it('puts the picture on the faces that are selected, and only those', () => {
		const { panel, internals } = createPanel();
		internals.media.set(picture);

		internals.toggle('FRONT');
		internals.toggle('LEFT');
		internals.apply();

		expect(Object.keys(panel.environment().background ?? {}).sort()).toEqual([ 'FRONT', 'LEFT' ]);
		expect(panel.environment().background?.FRONT).toBe(picture);
	});

	it('puts it on every face with "all", and "all" again unselects them', () => {
		const { panel, internals } = createPanel();
		internals.media.set(picture);

		internals.toggleAll();
		expect(internals.allSelected()).toBe(true);
		internals.apply();
		expect(Object.keys(panel.environment().background ?? {})).toHaveLength(5);

		internals.toggleAll();
		expect(internals.selected().size).toBe(0);
	});

	it('does nothing when no face is selected', () => {
		const { panel, internals } = createPanel();
		internals.media.set(picture);

		internals.apply();

		expect(panel.environment().background).toBeUndefined();
	});

	it('keeps the pictures of the other faces when another picture is applied', () => {
		const { panel, internals } = createPanel();
		const other = new Uint32Array(64 * 64).fill(0xff0000);
		internals.media.set(picture);
		internals.toggle('FRONT');
		internals.apply();

		internals.media.set(other);
		internals.toggle('FRONT');
		internals.toggle('TOP');
		internals.apply();

		expect(panel.environment().background?.FRONT).toBe(picture);
		expect(panel.environment().background?.TOP).toBe(other);
	});

	it('removes the picture from the selected faces only', () => {
		const { panel, internals } = createPanel();
		internals.media.set(picture);
		internals.toggleAll();
		internals.apply();

		internals.toggleAll();
		internals.toggle('BACK');
		internals.remove();

		expect(internals.kindOf('BACK')).toBe('plain');
		expect(internals.kindOf('FRONT')).toBe('picture');
		expect(Object.keys(panel.environment().background ?? {})).toHaveLength(4);
	});

	it('hands out a new environment each time, so the page notices the change', () => {
		const { panel, internals } = createPanel();
		internals.media.set(picture);
		internals.toggle('FRONT');
		const before = panel.environment();

		internals.apply();

		expect(panel.environment()).not.toBe(before);
		expect(before.background).toBeUndefined();
	});

	it('puts a video on the selected faces, sharing its frames, and tells it apart from a picture', () => {
		const { panel, internals } = createPanel();
		const video = { fps: 15, frames: [ picture, new Uint32Array(64 * 64).fill(1) ] };
		internals.media.set(video);
		internals.toggle('RIGHT');
		internals.toggle('TOP');
		internals.apply();

		expect(panel.environment().background?.RIGHT).toBe(video);
		expect(panel.environment().background?.TOP).toBe(video);
		expect(internals.kindOf('RIGHT')).toBe('video');
		expect(internals.kindOf('FRONT')).toBe('plain');
	});
});
