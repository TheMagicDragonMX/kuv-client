import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
	let snackbar: SnackbarService;

	/**
	 * What is on screen, as kind and text.
	 */
	const onScreen = () => snackbar.messages().map(({ kind, text }) => [ kind, text ]);

	beforeEach(() => {
		vi.useFakeTimers();
		snackbar = TestBed.inject(SnackbarService);
	});

	afterEach(() => vi.useRealTimers());

	it('shows a message and hides it after the duration', () => {
		snackbar.success('Hecho', 1000);
		expect(onScreen()).toEqual([ [ 'success', 'Hecho' ] ]);

		vi.advanceTimersByTime(1000);
		expect(onScreen()).toEqual([]);
	});

	it('has a method for each kind', () => {
		snackbar.success('a');
		snackbar.error('b');
		snackbar.info('c');
		snackbar.warning('d');

		expect(onScreen()).toEqual([ [ 'success', 'a' ], [ 'error', 'b' ], [ 'info', 'c' ], [ 'warning', 'd' ] ]);
	});

	it('piles messages up, each hiding on its own time', () => {
		snackbar.show('uno', 'info', 1000);
		vi.advanceTimersByTime(500);
		snackbar.error('dos', 1000);

		expect(onScreen()).toEqual([ [ 'info', 'uno' ], [ 'error', 'dos' ] ]);

		vi.advanceTimersByTime(500);
		expect(onScreen()).toEqual([ [ 'error', 'dos' ] ]);
	});

	it('keeps errors and warnings longer than the rest by default', () => {
		snackbar.success('ok');
		snackbar.error('mal');
		vi.advanceTimersByTime(4000);

		expect(onScreen()).toEqual([ [ 'error', 'mal' ] ]);

		vi.advanceTimersByTime(2000);
		expect(onScreen()).toEqual([]);
	});

	it('does not pile up the same message, it starts its time again', () => {
		snackbar.info('hola', 1000);
		vi.advanceTimersByTime(800);
		snackbar.info('hola', 1000);
		vi.advanceTimersByTime(800);

		expect(onScreen()).toEqual([ [ 'info', 'hola' ] ]);
	});

	it('drops the oldest message when there are too many', () => {
		for (const text of [ '1', '2', '3', '4', '5' ])
			snackbar.info(text);

		expect(onScreen().map(([ , text ]) => text)).toEqual([ '2', '3', '4', '5' ]);
	});

	it('hides one message, or all of them', () => {
		snackbar.info('a');
		snackbar.info('b');
		snackbar.dismiss({ id: snackbar.messages()[0].id });

		expect(onScreen()).toEqual([ [ 'info', 'b' ] ]);

		snackbar.clear();
		expect(onScreen()).toEqual([]);
	});

	it('says what the API answered when a request fails, or the fallback', () => {
		snackbar.failure(new HttpErrorResponse({ status: 409, error: { message: 'Ese nombre ya está en uso.' } }), 'No se pudo.');
		snackbar.failure(new HttpErrorResponse({ status: 0 }), 'No se pudo conectar.');

		expect(onScreen()).toEqual([ [ 'error', 'Ese nombre ya está en uso.' ], [ 'error', 'No se pudo conectar.' ] ]);
	});
});
