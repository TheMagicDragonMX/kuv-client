import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@environment';
import { FeedCreation } from '../../models';
import { SnackbarService } from '../../services/snackbar.service';
import { EMPTY_SECTIONS } from './home-data';
import { HomePage } from './home.component';

/**
 * Two creations as the API answers them: the first has a video and an author with a picture.
 */
const CREATIONS: FeedCreation[] = [
	{ id: 7, title: 'Corazón que late', authorId: 1, authorUsername: 'lunapixel', authorPhoto: '/users/1/photo?v=1', hasVideo: true, createdAt: '2026-10-28T10:00:00Z' },
	{ id: 6, title: 'Lluvia de LEDs', authorId: 2, authorUsername: 'toño_dev', authorPhoto: null, hasVideo: false, createdAt: '2026-10-27T10:00:00Z' },
];

/**
 * Creates the page, and answers the request for the newest animations with the creations (or does
 * not answer it when none are given).
 */
function createPage (creations?: FeedCreation[]) {
	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting() ] });

	const fixture = TestBed.createComponent(HomePage);
	const http = TestBed.inject(HttpTestingController);
	fixture.detectChanges();

	const request = http.expectOne((candidate) => candidate.url === `${environment.apiUrl}/feed/new`);

	if (creations) {
		request.flush(creations);
		fixture.detectChanges();
	}

	return { fixture, http, request, element: fixture.nativeElement as HTMLElement };
}

describe('HomePage', () => {
	afterEach(() => TestBed.inject(HttpTestingController).verify());

	it('has one title, and a row for the new animations and one for each other section', () => {
		const { element } = createPage(CREATIONS);

		expect(element.querySelectorAll('h1')).toHaveLength(1);
		expect(element.querySelectorAll('app-animation-row')).toHaveLength(1 + EMPTY_SECTIONS.length);
		expect(element.querySelector('app-animation-row h2')?.textContent).toContain('Nuevas animaciones');
	});

	it('asks the API for the newest animations and shows them in the first row, with the other rows empty', () => {
		const { element, request } = createPage(CREATIONS);
		const rows = [ ...element.querySelectorAll('app-animation-row') ];

		expect(request.request.params.get('limit')).toBe('20');
		expect(rows[0].querySelectorAll('app-animation-card')).toHaveLength(2);
		expect(rows[0].querySelector('app-animation-card')?.textContent).toContain('lunapixel');

		for (const row of rows.slice(1)) {
			expect(row.querySelectorAll('app-animation-card')).toHaveLength(0);
			expect(row.querySelectorAll('app-animation-empty-card')).toHaveLength(1);
		}
	});

	it('gives the video only to the animations that have one', () => {
		const { element } = createPage(CREATIONS);
		const videos = [ ...element.querySelectorAll('app-animation-row:first-of-type app-animation-card') ].map((card) => card.querySelector('video')?.getAttribute('src') ?? null);

		expect(videos[0]).toContain('/creations/7/video');
		expect(videos[1]).toBeNull();
	});

	it('gives the thumbnail only to the animations that have a video, since it is recorded with it', () => {
		const { element } = createPage(CREATIONS);
		const thumbnails = [ ...element.querySelectorAll('app-animation-row:first-of-type app-animation-card') ].map((card) => card.querySelector('article img')?.getAttribute('src') ?? null);

		expect(thumbnails[0]).toContain('/creations/7/thumbnail');
		expect(thumbnails[1]).toBeNull();
	});

	it('says it is loading until the animations arrive, and then that there are none if there are none', () => {
		const { fixture, request, element } = createPage();
		const first = (): string => element.querySelector('app-animation-row app-animation-empty-card')?.textContent ?? '';

		expect(first()).toContain('Cargando');

		request.flush([]);
		fixture.detectChanges();

		expect(first()).toContain('Aún no hay animaciones');
	});

	it('says the animations could not be loaded when the request fails', () => {
		const { fixture, request, element } = createPage();
		const snackbar = TestBed.inject(SnackbarService);

		request.flush(null, { status: 500, statusText: 'Server Error' });
		fixture.detectChanges();

		expect(snackbar.messages()[0]?.text).toContain('No se pudieron cargar');
		expect(element.querySelector('app-animation-empty-card')?.textContent).toContain('Aún no hay animaciones');
		snackbar.clear();
	});

	it('leads to the editor to make an animation', () => {
		const { element } = createPage(CREATIONS);
		const link = [ ...element.querySelectorAll('main a') ].find((anchor) => anchor.textContent?.includes('Crear animación'));

		expect(link?.getAttribute('href')).toBe('/editor');
	});

	it('brings no header of its own: the layout around it has it', () => {
		const { element } = createPage(CREATIONS);

		expect(element.querySelector('app-site-header')).toBeNull();
	});

	it('likes an animation and takes the like back on the second press', () => {
		const { fixture, element } = createPage(CREATIONS);
		const button = (): HTMLButtonElement => element.querySelector('app-animation-card button') as HTMLButtonElement;

		button().click();
		fixture.detectChanges();

		expect(button().getAttribute('aria-pressed')).toBe('true');

		button().click();
		fixture.detectChanges();

		expect(button().getAttribute('aria-pressed')).toBe('false');
	});

	it('says an animation cannot be seen yet', () => {
		const { element } = createPage(CREATIONS);
		const snackbar = TestBed.inject(SnackbarService);

		(element.querySelector('app-animation-card button[aria-label^="Visualizar"]') as HTMLButtonElement).click();

		expect(snackbar.messages()[0]?.text).toContain('Corazón que late');
		expect(snackbar.messages()[0]?.text).toContain('todavía no se puede visualizar');
		snackbar.clear();
	});

	it('saves an animation and adds it to the favorites, and takes them back', () => {
		const { fixture, element } = createPage(CREATIONS);
		const button = (name: string): HTMLButtonElement => element.querySelector(`app-animation-card button[aria-label^="${name}"]`) as HTMLButtonElement;

		for (const name of [ 'Guardar', 'Favorito' ]) {
			button(name).click();
			fixture.detectChanges();
			expect(button(name).getAttribute('aria-pressed'), name).toBe('true');

			button(name).click();
			fixture.detectChanges();
			expect(button(name).getAttribute('aria-pressed'), name).toBe('false');
		}
	});
});
