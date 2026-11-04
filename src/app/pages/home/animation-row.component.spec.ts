import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnimationRowComponent } from './animation-row.component';
import { COMMUNITY } from './home-data';

/**
 * Creates a row with the first animations.
 */
function createRow (liked: ReadonlySet<string> = new Set()) {
	TestBed.configureTestingModule({ providers: [ provideRouter([]) ] });

	const fixture = TestBed.createComponent(AnimationRowComponent);
	fixture.componentRef.setInput('id', 'hoy');
	fixture.componentRef.setInput('title', 'Más gustadas hoy');
	fixture.componentRef.setInput('animations', COMMUNITY.slice(0, 3));
	fixture.componentRef.setInput('liked', liked);
	fixture.detectChanges();

	return { fixture, element: fixture.nativeElement as HTMLElement, row: fixture.componentInstance as unknown as { scroll(direction: 1 | -1): void } };
}

describe('AnimationRowComponent', () => {
	it('is a region named by its title, with each card once', () => {
		const { element } = createRow();
		const region = element.querySelector('section') as HTMLElement;

		expect(region.getAttribute('aria-labelledby')).toBe('row-hoy');
		expect(element.querySelector('#row-hoy')?.textContent).toContain('Más gustadas hoy');
		expect(element.querySelectorAll('li')).toHaveLength(3);
	});

	it('has a link to see everything that says which row it is of', () => {
		const { element } = createRow();
		const link = element.querySelector('a') as HTMLAnchorElement;

		expect(link.getAttribute('href')).toBe('/gallery');
		expect(link.textContent).toContain('Ver todo');
		expect(link.textContent).toContain('Más gustadas hoy');
	});

	it('marks the cards the user liked', () => {
		const { element } = createRow(new Set([ COMMUNITY[1].id ]));
		const pressed = [ ...element.querySelectorAll('li button') ].map((button) => button.getAttribute('aria-pressed'));

		expect(pressed).toEqual([ 'false', 'true', 'false' ]);
	});

	it('tells which animation was liked', () => {
		const { fixture, element } = createRow();
		const ids: string[] = [];
		fixture.componentInstance.toggled.subscribe((id) => ids.push(id));

		(element.querySelectorAll('li button')[2] as HTMLButtonElement).click();

		expect(ids).toEqual([ COMMUNITY[2].id ]);
	});

	it('scrolls by most of its width with the arrows, without animating if the user asked for less motion', () => {
		const { element, row } = createRow();
		const list = element.querySelector('ul') as HTMLElement;
		const scrolls: ScrollToOptions[] = [];
		Object.defineProperty(list, 'clientWidth', { value: 500 });
		list.scrollBy = ((options: ScrollToOptions) => scrolls.push(options)) as typeof list.scrollBy;
		window.matchMedia = ((query: string) => ({ matches: query.includes('reduce') })) as typeof window.matchMedia;

		row.scroll(1);
		row.scroll(-1);

		expect(scrolls).toEqual([ { left: 400, behavior: 'auto' }, { left: -400, behavior: 'auto' } ]);
	});

	it('disables the arrow that has nowhere to go', () => {
		const { fixture, element } = createRow();
		const [ back, next ] = [ ...element.querySelectorAll('section button[aria-label]') ] as HTMLButtonElement[];
		const list = element.querySelector('ul') as HTMLElement;
		Object.defineProperty(list, 'clientWidth', { value: 300 });
		Object.defineProperty(list, 'scrollWidth', { value: 900 });

		list.scrollLeft = 0;
		list.dispatchEvent(new Event('scroll'));
		fixture.detectChanges();

		expect(back.disabled).toBe(true);
		expect(next.disabled).toBe(false);

		list.scrollLeft = 600;
		list.dispatchEvent(new Event('scroll'));
		fixture.detectChanges();

		expect(back.disabled).toBe(false);
		expect(next.disabled).toBe(true);
	});
});
