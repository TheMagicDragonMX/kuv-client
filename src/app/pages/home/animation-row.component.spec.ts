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
		const pressed = [ ...element.querySelectorAll('li') ].map((item) => item.querySelector('button')?.getAttribute('aria-pressed'));

		expect(pressed).toEqual([ 'false', 'true', 'false' ]);
	});

	it('tells which animation was seen, saved or added to the favorites', () => {
		const { fixture, element } = createRow();
		const events: string[] = [];
		fixture.componentInstance.viewed.subscribe((id) => events.push(`view ${id}`));
		fixture.componentInstance.saveToggled.subscribe((id) => events.push(`save ${id}`));
		fixture.componentInstance.favoriteToggled.subscribe((id) => events.push(`favorite ${id}`));
		const card = element.querySelectorAll('li')[1];

		for (const name of [ 'Visualizar', 'Guardar', 'Favorito' ])
			(card.querySelector(`button[aria-label^="${name}"]`) as HTMLButtonElement).click();

		expect(events).toEqual([ `view ${COMMUNITY[1].id}`, `save ${COMMUNITY[1].id}`, `favorite ${COMMUNITY[1].id}` ]);
	});

	it('marks the cards the user saved or made favorite', () => {
		TestBed.configureTestingModule({ providers: [ provideRouter([]) ] });
		const fixture = TestBed.createComponent(AnimationRowComponent);
		fixture.componentRef.setInput('id', 'hoy');
		fixture.componentRef.setInput('title', 'Más gustadas hoy');
		fixture.componentRef.setInput('animations', COMMUNITY.slice(0, 2));
		fixture.componentRef.setInput('saved', new Set([ COMMUNITY[0].id ]));
		fixture.componentRef.setInput('favorites', new Set([ COMMUNITY[1].id ]));
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		const pressed = (name: string) => [ ...element.querySelectorAll(`button[aria-label^="${name}"]`) ].map((button) => button.getAttribute('aria-pressed'));

		expect(pressed('Guardar')).toEqual([ 'true', 'false' ]);
		expect(pressed('Favorito')).toEqual([ 'false', 'true' ]);
	});

	it('tells which animation was liked', () => {
		const { fixture, element } = createRow();
		const ids: string[] = [];
		fixture.componentInstance.toggled.subscribe((id) => ids.push(id));

		(element.querySelectorAll('li')[2].querySelector('button') as HTMLButtonElement).click();

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

	it('puts the arrows at the sides of the row as tall rounded buttons in the middle, with a pixel-art chevron, hidden until the pointer is over it, and hides the scroll bar', () => {
		const { element } = createRow();
		const list = element.querySelector('ul') as HTMLElement;
		const arrows = [ ...(list.parentElement as HTMLElement).querySelectorAll(':scope > button') ] as HTMLButtonElement[];

		expect(arrows.map((arrow) => arrow.getAttribute('aria-label'))).toEqual([ 'Anteriores: Más gustadas hoy', 'Siguientes: Más gustadas hoy' ]);

		for (const arrow of arrows) {
			expect(arrow.classList.contains('opacity-0')).toBe(true);
			expect(arrow.classList.contains('group-hover/row:enabled:opacity-100')).toBe(true);
			expect(arrow.classList.contains('group-focus-within/row:enabled:opacity-100')).toBe(true);
			expect(arrow.classList.contains('pointer-fine:grid')).toBe(true);

			// They fade, they do not switch: a visible/hidden switch would make them vanish at once.
			expect(arrow.classList.contains('duration-300')).toBe(true);
			expect(arrow.classList.contains('transition-[opacity,background-color]')).toBe(true);
			expect(arrow.classList.contains('disabled:pointer-events-none')).toBe(true);
			expect(arrow.classList.contains('disabled:invisible')).toBe(false);
		}

		expect(arrows[0].classList.contains('left-0.5')).toBe(true);
		expect(arrows[1].classList.contains('right-0.5')).toBe(true);

		for (const arrow of arrows)
			expect([ 'top-1/2', '-translate-y-1/2', 'h-16', 'w-9', 'rounded-full', 'border' ].every((name) => arrow.classList.contains(name)), arrow.className).toBe(true);

		for (const arrow of arrows) {
			const icon = arrow.querySelector('svg') as SVGElement;

			expect(icon.getAttribute('shape-rendering')).toBe('crispEdges');
			expect(icon.getAttribute('viewBox')).toBe('0 0 6 9');
			expect(arrow.querySelectorAll('path')).toHaveLength(1);
		}

		expect(list.classList.contains('[scrollbar-width:none]')).toBe(true);
	});
});
