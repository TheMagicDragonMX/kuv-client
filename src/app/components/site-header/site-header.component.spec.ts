import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CubeLinkService, LinkState } from '../../cube';
import { SiteHeaderComponent } from './site-header.component';

/**
 * Creates the header while the link to the cube is in a state.
 */
function createHeader (state: LinkState) {
	const link = new BehaviorSubject<LinkState>(state);

	TestBed.configureTestingModule({ providers: [ provideRouter([]), { provide: CubeLinkService, useValue: { state$: link } } ] });

	const fixture = TestBed.createComponent(SiteHeaderComponent);
	fixture.detectChanges();

	return { fixture, link, element: fixture.nativeElement as HTMLElement };
}

describe('SiteHeaderComponent', () => {
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
});
