import { TestBed } from '@angular/core/testing';
import { SnackbarService } from '../../services/snackbar.service';
import { SnackbarComponent } from './snackbar.component';

/**
 * Creates the snackbar on screen.
 */
function createSnackbar () {
	const fixture = TestBed.createComponent(SnackbarComponent);
	const snackbar = TestBed.inject(SnackbarService);

	fixture.detectChanges();

	return { fixture, snackbar, element: fixture.nativeElement as HTMLElement };
}

describe('SnackbarComponent', () => {
	beforeEach(() => vi.useFakeTimers());

	afterEach(() => vi.useRealTimers());

	it('shows nothing until there is a message', () => {
		const { element } = createSnackbar();

		expect(element.querySelector('p')).toBeNull();
	});

	it('shows each message with the pixel icon of its kind', () => {
		const { fixture, snackbar, element } = createSnackbar();

		snackbar.success('Guardado');
		snackbar.error('No se pudo guardar');
		fixture.detectChanges();

		const texts = Array.from(element.querySelectorAll('p')).map((text) => text.textContent?.trim());
		const icons = Array.from(element.querySelectorAll('svg[role="img"]')).map((icon) => icon.getAttribute('aria-label'));

		expect(texts).toEqual([ 'Guardado', 'No se pudo guardar' ]);
		expect(icons).toEqual([ 'Éxito', 'Error' ]);
		expect(element.querySelector('svg[role="img"]')?.getAttribute('shape-rendering')).toBe('crispEdges');
		expect(element.querySelector('svg path')?.getAttribute('d')).toContain('M');
	});

	it('announces errors as alerts and the rest as status', () => {
		const { fixture, snackbar, element } = createSnackbar();

		snackbar.error('Mal');
		snackbar.info('Ojo');
		fixture.detectChanges();

		const roles = Array.from(element.querySelectorAll('[role="alert"], [role="status"]')).map((box) => box.getAttribute('role'));

		expect(roles).toEqual([ 'alert', 'status' ]);
	});

	it('hides a message with its close button', () => {
		const { fixture, snackbar, element } = createSnackbar();

		snackbar.info('Uno');
		snackbar.info('Dos');
		fixture.detectChanges();
		(element.querySelector('button') as HTMLButtonElement).click();
		fixture.detectChanges();

		expect(Array.from(element.querySelectorAll('p')).map((text) => text.textContent?.trim())).toEqual([ 'Dos' ]);
	});
});
