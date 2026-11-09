import { TestBed } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
	let snackbar: SnackbarService;

	beforeEach(() => {
		vi.useFakeTimers();
		snackbar = TestBed.inject(SnackbarService);
	});

	afterEach(() => vi.useRealTimers());

	it('shows a message and hides it after the duration', () => {
		snackbar.success('Hecho', 1000);
		expect(snackbar.message()).toEqual({ text: 'Hecho', kind: 'success' });

		vi.advanceTimersByTime(1000);
		expect(snackbar.message()).toBeNull();
	});

	it('replaces the message on screen and restarts the timer', () => {
		snackbar.show('uno', 'info', 1000);
		vi.advanceTimersByTime(800);
		snackbar.error('dos', 1000);
		vi.advanceTimersByTime(800);

		expect(snackbar.message()).toEqual({ text: 'dos', kind: 'error' });
	});
});
