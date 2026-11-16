import { TestBed } from '@angular/core/testing';
import { CropPicture, PhotoCropperComponent } from './photo-cropper.component';
import { Crop } from './profile-photo';

/**
 * A picture twice as wide as it is tall.
 */
const PICTURE = { width: 400, height: 200 } as CropPicture;

/**
 * Creates the cropper for the picture, with a frame 200 screen pixels wide.
 */
function createCropper () {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);

	const fixture = TestBed.createComponent(PhotoCropperComponent);
	fixture.componentRef.setInput('picture', PICTURE);
	fixture.detectChanges();

	const element = fixture.nativeElement as HTMLElement;
	const frame = element.querySelector('[role="group"]') as HTMLElement;
	const crops: Crop[] = [];

	frame.getBoundingClientRect = () => ({ width: 200, height: 200 }) as DOMRect;
	fixture.componentInstance.cropped.subscribe((crop) => crops.push(crop));

	/**
	 * Presses "Guardar foto" and gives the square the cropper hands out.
	 */
	function saved (): Crop {
		(Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar foto')) as HTMLButtonElement).click();

		return crops[crops.length - 1];
	}

	return { fixture, element, frame, saved };
}

/**
 * A pointer event, which jsdom does not have.
 */
function pointer (type: string, x: number, y: number): Event {
	return Object.assign(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }), { pointerId: 1, pointerType: 'mouse' });
}

describe('PhotoCropperComponent', () => {
	afterEach(() => vi.restoreAllMocks());

	it('starts on the middle of the picture, not zoomed in', () => {
		const { saved } = createCropper();

		expect(saved()).toEqual({ x: 100, y: 0, side: 200 });
	});

	it('zooms in with the slider', () => {
		const { fixture, element, saved } = createCropper();
		const slider = element.querySelector('input[type="range"]') as HTMLInputElement;

		slider.value = '2';
		slider.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(saved()).toEqual({ x: 150, y: 50, side: 100 });
	});

	it('moves the picture with the pointer dragging it, but not off the circle', () => {
		const { frame, saved } = createCropper();

		frame.dispatchEvent(pointer('pointerdown', 100, 100));
		frame.dispatchEvent(pointer('pointermove', 50, 100));
		frame.dispatchEvent(pointer('pointerup', 50, 100));

		expect(saved()).toEqual({ x: 150, y: 0, side: 200 });

		frame.dispatchEvent(pointer('pointerdown', 100, 100));
		frame.dispatchEvent(pointer('pointermove', -900, 100));
		frame.dispatchEvent(pointer('pointerup', -900, 100));

		expect(saved()).toEqual({ x: 200, y: 0, side: 200 });
	});

	it('does not move the picture once the pointer lets go', () => {
		const { frame, saved } = createCropper();

		frame.dispatchEvent(pointer('pointerdown', 100, 100));
		frame.dispatchEvent(pointer('pointerup', 100, 100));
		frame.dispatchEvent(pointer('pointermove', 0, 100));

		expect(saved()).toEqual({ x: 100, y: 0, side: 200 });
	});

	it('moves with the arrow keys and zooms with + and −', () => {
		const { frame, saved } = createCropper();

		frame.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

		expect(saved()).toEqual({ x: 110, y: 0, side: 200 });

		frame.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));

		expect(saved().side).toBeCloseTo(200 / 1.15);

		frame.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));

		expect(saved().side).toBeCloseTo(200);
	});

	it('says when the user gives up, and waits while the photo is saved', () => {
		const { fixture, element } = createCropper();
		const cancelled = vi.fn();
		fixture.componentInstance.cancelled.subscribe(cancelled);

		(Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.includes('Cancelar')) as HTMLButtonElement).click();

		expect(cancelled).toHaveBeenCalled();

		fixture.componentRef.setInput('busy', true);
		fixture.componentRef.setInput('problem', 'No se pudo guardar el cambio.');
		fixture.detectChanges();

		expect(element.textContent).toContain('Guardando…');
		expect(element.querySelector('[role="alert"]')?.textContent).toContain('No se pudo guardar el cambio.');
	});
});
