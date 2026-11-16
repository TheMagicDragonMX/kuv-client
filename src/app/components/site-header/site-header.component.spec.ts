import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '@environment';
import { CubeLinkService, LinkState } from '../../cube';
import { Profile } from '../../models';
import { AuthSession } from '../../services/auth-session.service';
import { SiteHeaderComponent } from './site-header.component';

/**
 * The signed-in user.
 */
const ME: Profile = { id: 1, username: 'ana', email: 'ana@example.com', bio: null, photo: '/users/1/photo?v=3', followers: 0, following: 0, followsYou: false, youFollow: false, isYou: true };

/**
 * Creates the header while the link to the cube is in a state, with someone signed in or not.
 */
function createHeader (state: LinkState, signedIn = false) {
	const link = new BehaviorSubject<LinkState>(state);

	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: CubeLinkService, useValue: { state$: link } } ] });

	if (signedIn)
		TestBed.inject(AuthSession).save({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });

	const fixture = TestBed.createComponent(SiteHeaderComponent);
	fixture.detectChanges();

	return { fixture, link, server: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
}

describe('SiteHeaderComponent', () => {
	afterEach(() => {
		localStorage.clear();
		Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
	});

	it('has the navigation twice, for large screens and for the bottom bar of phones, with the same places', () => {
		const { element } = createHeader('closed');
		const navs = [ ...element.querySelectorAll('nav') ];
		const paths = navs.map((nav) => [ ...nav.querySelectorAll('a') ].map((link) => link.getAttribute('href')));

		expect(navs).toHaveLength(2);
		expect(paths[0]).toEqual([ '/inicio', '/editor', '/gallery', '/setup' ]);
		expect(paths[1]).toEqual(paths[0]);
	});

	it('tells whether a cube is connected, and leads to its setup', () => {
		const { fixture, link, element } = createHeader('closed');
		const status = (): HTMLElement => element.querySelector('header > div > a[href="/setup"]') as HTMLElement;

		expect(status().textContent).toContain('Sin cubo');

		link.next('connecting');
		fixture.detectChanges();
		expect(status().textContent).toContain('Conectando');

		link.next('open');
		fixture.detectChanges();
		expect(status().textContent).toContain('Cubo conectado');
	});

	it('leads to the account, and to the home page from the logo', () => {
		const { element } = createHeader('closed');

		expect(element.querySelector('a[aria-label="Iniciar sesión o crear cuenta"]')?.getAttribute('href')).toBe('/perfil');
		expect(element.querySelector('a[aria-label="Kü-V, inicio"]')?.getAttribute('href')).toBe('/inicio');
	});

	it('shows the photo of the signed-in user in the account button, asking for it once', () => {
		const { fixture, server, element } = createHeader('closed', true);

		server.expectOne(`${environment.apiUrl}/users/me`).flush(ME);
		fixture.detectChanges();

		expect(element.querySelector('a[href="/perfil"] app-avatar img')?.getAttribute('src')).toBe(`${environment.apiUrl}/users/1/photo?v=3`);
		server.verify();
	});

	it('shows the plain icon when nobody is signed in, without asking for a profile', () => {
		const { server, element } = createHeader('closed');

		server.expectNone(`${environment.apiUrl}/users/me`);
		expect(element.querySelector('a[href="/perfil"] app-avatar')).toBeNull();
		expect(element.querySelector('a[href="/perfil"] svg')).not.toBeNull();
	});

	it('turns into a floating bubble once the page scrolls, and back into a bar at the top', () => {
		const { fixture, element } = createHeader('closed');
		const header = (): HTMLElement => element.querySelector('header') as HTMLElement;

		expect(header().classList).not.toContain('rounded-full');

		Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
		window.dispatchEvent(new Event('scroll'));
		fixture.detectChanges();
		expect(header().classList).toContain('rounded-full');

		Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
		window.dispatchEvent(new Event('scroll'));
		fixture.detectChanges();
		expect(header().classList).not.toContain('rounded-full');
	});
});
