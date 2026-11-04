import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SECTIONS } from './home-data';
import { HomePage } from './home.component';

/**
 * Creates the page.
 */
function createPage () {
	TestBed.configureTestingModule({ providers: [ provideRouter([]) ] });

	const fixture = TestBed.createComponent(HomePage);
	fixture.detectChanges();

	return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('HomePage', () => {
	it('has one title, and a row for every section', () => {
		const { element } = createPage();

		expect(element.querySelectorAll('h1')).toHaveLength(1);
		expect(element.querySelectorAll('app-animation-row')).toHaveLength(SECTIONS.length);
	});

	it('leads to the editor to make an animation', () => {
		const { element } = createPage();
		const link = [ ...element.querySelectorAll('main a') ].find((anchor) => anchor.textContent?.includes('Crear animación'));

		expect(link?.getAttribute('href')).toBe('/editor');
	});

	it('shows the header with the navigation', () => {
		const { element } = createPage();

		expect(element.querySelector('app-site-header header')).not.toBeNull();
	});

	it('likes an animation in every row it is in, and takes the like back on the second press', () => {
		const { fixture, element } = createPage();
		const first = SECTIONS[0].animations[0];
		const buttons = (): HTMLButtonElement[] => [ ...element.querySelectorAll('app-animation-card') ]
			.filter((card) => card.textContent?.includes(first.title))
			.map((card) => card.querySelector('button') as HTMLButtonElement);
		const rowsWithIt = SECTIONS.filter((section) => section.animations.some((animation) => first.id === animation.id)).length;

		expect(buttons()).toHaveLength(rowsWithIt);
		expect(rowsWithIt).toBeGreaterThan(1);

		buttons()[0].click();
		fixture.detectChanges();

		expect(buttons().every((button) => 'true' === button.getAttribute('aria-pressed'))).toBe(true);

		buttons()[1].click();
		fixture.detectChanges();

		expect(buttons().every((button) => 'false' === button.getAttribute('aria-pressed'))).toBe(true);
	});
});
