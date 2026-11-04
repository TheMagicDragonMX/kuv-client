import { TestBed } from '@angular/core/testing';
import { AnimationCardComponent } from './animation-card.component';
import { CommunityAnimation } from './home-data';

/**
 * An animation to show.
 */
const ANIMATION: CommunityAnimation = { id: 'corazon', title: 'Corazón que late', author: '@lunapixel', likes: 1200, art: 'heart' };

/**
 * Creates a card for the animation.
 */
function createCard (liked = false) {
	const fixture = TestBed.createComponent(AnimationCardComponent);
	fixture.componentRef.setInput('animation', ANIMATION);
	fixture.componentRef.setInput('liked', liked);
	fixture.detectChanges();

	return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('AnimationCardComponent', () => {
	it('shows the name, the author and the likes', () => {
		const { element } = createCard();

		expect(element.textContent).toContain('Corazón que late');
		expect(element.textContent).toContain('@lunapixel');
		expect(element.querySelector('button')?.textContent).toContain('1.2k');
	});

	it('draws the 64 LEDs of the picture and hides them from screen readers', () => {
		const { element } = createCard();
		const picture = element.querySelector('[aria-hidden="true"]') as HTMLElement;

		expect(picture.querySelectorAll('.rounded-full')).toHaveLength(64);
		expect(picture.querySelectorAll('.bg-led-pink').length).toBeGreaterThan(0);
	});

	it('says whether it is liked, and names the animation on the button', () => {
		const { element } = createCard(true);
		const button = element.querySelector('button') as HTMLButtonElement;

		expect(button.getAttribute('aria-pressed')).toBe('true');
		expect(button.getAttribute('aria-label')).toBe('Me gusta: Corazón que late');
	});

	it('counts the like of the user', () => {
		const { fixture } = createCard();
		fixture.componentRef.setInput('animation', { ...ANIMATION, likes: 845 });
		fixture.componentRef.setInput('liked', true);
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('button').textContent).toContain('846');
	});

	it('tells when the like button is pressed', () => {
		const { fixture, element } = createCard();
		let pressed = 0;
		fixture.componentInstance.toggled.subscribe(() => pressed += 1);

		(element.querySelector('button') as HTMLButtonElement).click();

		expect(pressed).toBe(1);
	});
});
