import { TestBed } from '@angular/core/testing';
import { AnimationCardComponent } from './animation-card.component';
import { CommunityAnimation } from './home-data';

/**
 * An animation to show.
 */
const ANIMATION: CommunityAnimation = { id: 'corazon', title: 'Corazón que late', author: 'lunapixel', likes: 1200, createdAt: '2026-10-28', category: 'Arte', art: 'heart' };

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
		expect(element.textContent).toContain('lunapixel');
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

	it('shows the author without an @, with a small picture of them before the name', () => {
		const { element } = createCard();
		const author = element.querySelector('app-avatar') as HTMLElement;

		expect(element.textContent).not.toContain('@');
		expect(author.textContent?.trim()).toBe('L');
		expect(author.nextElementSibling?.textContent?.trim()).toBe('lunapixel');
		expect(author.classList.contains('size-5')).toBe(true);
	});

	it('shows the photo of the author when they have one', () => {
		const { fixture, element } = createCard();
		fixture.componentRef.setInput('animation', { ...ANIMATION, authorPhoto: 'data:image/png;base64,AAAA' });
		fixture.detectChanges();

		expect(element.querySelector('app-avatar img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
	});

	it('draws the heart in pixels, always full: gray when not liked and in the color of the likes when liked', () => {
		const notLiked = createCard(false).element.querySelector('button') as HTMLButtonElement;
		const liked = createCard(true).element.querySelector('button') as HTMLButtonElement;

		for (const button of [ notLiked, liked ]) {
			const heart = button.querySelector('svg') as SVGElement;

			expect(heart.getAttribute('viewBox')).toBe('0 0 7 6');
			expect(heart.getAttribute('shape-rendering')).toBe('crispEdges');
			expect(heart.getAttribute('fill')).toBe('currentColor');
			expect(heart.querySelector('path')?.getAttribute('d')).toContain('M0 2h7v1H0z');
		}

		expect(notLiked.classList.contains('text-slate-400')).toBe(true);
		expect(notLiked.classList.contains('text-like')).toBe(false);
		expect(liked.classList.contains('text-like')).toBe(true);
		expect(liked.classList.contains('text-slate-400')).toBe(false);
	});

	describe('expanded', () => {
		/**
		 * The rectangle the card expands into.
		 */
		function panelOf (element: HTMLElement): HTMLElement {
			return element.querySelector('[role="group"]') as HTMLElement;
		}

		/**
		 * The button of the expanded card whose label starts with a name.
		 */
		function buttonOf (element: HTMLElement, name: string): HTMLButtonElement {
			return panelOf(element).querySelector(`button[aria-label^="${name}"]`) as HTMLButtonElement;
		}

		it('is a dark screen as tall as the card: the animation as background, a gradient, the details and the actions', () => {
			const { element } = createCard();
			const panel = panelOf(element);
			const [ background, gradient, details, actions ] = [ ...panel.children ] as HTMLElement[];

			expect(panel.classList.contains('h-full')).toBe(true);
			expect(background).toBe(buttonOf(element, 'Visualizar'));
			expect(background.classList.contains('inset-0')).toBe(true);
			expect(gradient.classList.contains('bg-linear-to-r')).toBe(true);
			expect(gradient.classList.contains('from-black/90')).toBe(true);
			expect(gradient.classList.contains('pointer-events-none')).toBe(true);
			expect(details.querySelector('h3')?.textContent).toContain('Corazón que late');
			expect(actions.getAttribute('aria-label')).toBe('Acciones');
		});

		it('fades the animation in as background once it has opened, and opens the animation when it is pressed', () => {
			const { fixture, element } = createCard();
			const background = buttonOf(element, 'Visualizar');
			let viewed = 0;
			fixture.componentInstance.viewed.subscribe(() => viewed += 1);

			for (const name of [ 'opacity-0', 'group-hover/card:opacity-100', 'group-hover/card:delay-500', 'duration-700' ])
				expect(background.classList.contains(name), name).toBe(true);

			background.click();

			expect(viewed).toBe(1);
		});

		it('plays the LEDs, large, as a wave while it has no video, and only while the card is open', () => {
			const { element } = createCard();
			const background = buttonOf(element, 'Visualizar');
			const leds = [ ...background.querySelectorAll('.rounded-full') ] as HTMLElement[];

			expect(background.querySelector('video')).toBeNull();
			expect(leds).toHaveLength(64);
			expect(leds[0].style.animationDelay).toBe('0ms');
			expect(leds[1].style.animationDelay).toBe('90ms');
			expect(leds[9].style.animationDelay).toBe('180ms');
			expect(leds[0].classList.contains('motion-safe:group-hover/card:animate-led-wave')).toBe(true);
			expect(leds[0].classList.contains('animate-led-wave')).toBe(false);
		});

		it('plays the video of the animation while the card is open, from the start each time', () => {
			const { fixture, element } = createCard();
			fixture.componentRef.setInput('animation', { ...ANIMATION, video: 'corazon.webm' });
			fixture.detectChanges();

			const video = buttonOf(element, 'Visualizar').querySelector('video') as HTMLVideoElement;
			let playing = false;
			Object.defineProperty(video, 'paused', { get: () => !playing });
			video.play = () => {
				playing = true;

				return Promise.resolve();
			};
			video.pause = () => {
				playing = false;
			};

			expect(video.getAttribute('src')).toBe('corazon.webm');
			expect(video.muted).toBe(true);
			expect(video.loop).toBe(true);
			expect(buttonOf(element, 'Visualizar').querySelectorAll('.rounded-full')).toHaveLength(0);

			element.dispatchEvent(new PointerEvent('pointerenter'));
			expect(playing).toBe(true);

			video.currentTime = 3;
			element.dispatchEvent(new PointerEvent('pointerleave'));
			expect(playing).toBe(false);
			expect(video.currentTime).toBe(0);
		});

		it('shows the name, the author, the day and the category on the left, in white over the gradient', () => {
			const { element } = createCard();
			const details = panelOf(element).children[2] as HTMLElement;

			expect(details.classList.contains('left-0')).toBe(true);
			expect(details.classList.contains('text-white')).toBe(true);
			expect(details.classList.contains('pointer-events-none')).toBe(true);
			expect(details.textContent).toContain('lunapixel');
			expect(details.textContent).not.toContain('@');
			expect(details.querySelector('app-avatar')).not.toBeNull();
			expect(details.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-28');
			expect(details.querySelector('time')?.textContent?.trim()).toMatch(/^28 oct\.? 2026$/);
			expect(details.querySelector('dl')?.textContent).toContain('Arte');
		});

		it('puts like, save and favorite in the bottom right corner', () => {
			const { element } = createCard(true);
			const like = buttonOf(element, 'Me gusta');
			const save = buttonOf(element, 'Guardar');
			const favorite = buttonOf(element, 'Favorito');
			const actions = like.parentElement as HTMLElement;

			expect(panelOf(element).querySelectorAll('button')).toHaveLength(4);
			expect([ ...actions.querySelectorAll('button') ]).toEqual([ like, save, favorite ]);
			expect(actions.classList.contains('right-3')).toBe(true);
			expect(actions.classList.contains('bottom-3')).toBe(true);
			expect(like.getAttribute('aria-pressed')).toBe('true');

			for (const button of [ like, save, favorite ]) {
				expect(button.classList.contains('h-11'), button.getAttribute('aria-label') ?? '').toBe(true);
				expect(button.querySelector('svg')?.getAttribute('shape-rendering')).toBe('crispEdges');
			}

			for (const button of [ save, favorite ])
				expect(button.textContent?.trim()).toBe('');
		});

		it('tells when like, see, save or favorite is pressed in it', () => {
			const { fixture, element } = createCard();
			const pressed: string[] = [];
			fixture.componentInstance.toggled.subscribe(() => pressed.push('like'));
			fixture.componentInstance.viewed.subscribe(() => pressed.push('view'));
			fixture.componentInstance.saveToggled.subscribe(() => pressed.push('save'));
			fixture.componentInstance.favoriteToggled.subscribe(() => pressed.push('favorite'));

			for (const name of [ 'Me gusta', 'Visualizar', 'Guardar', 'Favorito' ])
				buttonOf(element, name).click();

			expect(pressed).toEqual([ 'like', 'view', 'save', 'favorite' ]);
		});

		it('lights like, save and favorite in the color of their LED when they are on, and leaves them dark when not', () => {
			const { fixture, element } = createCard();
			const like = buttonOf(element, 'Me gusta');
			const save = buttonOf(element, 'Guardar');
			const favorite = buttonOf(element, 'Favorito');

			for (const button of [ like, save, favorite ])
				expect(button.classList.contains('bg-black/45')).toBe(true);

			fixture.componentRef.setInput('liked', true);
			fixture.componentRef.setInput('saved', true);
			fixture.componentRef.setInput('favorite', true);
			fixture.detectChanges();

			expect(like.classList.contains('text-led-pink')).toBe(true);
			expect(save.getAttribute('aria-pressed')).toBe('true');
			expect(save.classList.contains('text-led-cyan')).toBe(true);
			expect(favorite.getAttribute('aria-pressed')).toBe('true');
			expect(favorite.classList.contains('text-led-yellow')).toBe(true);
		});

		it('leaves its like button out of the Tab order, where the one of the card already is', () => {
			const { element } = createCard();

			expect(buttonOf(element, 'Me gusta').getAttribute('tabindex')).toBe('-1');

			for (const name of [ 'Visualizar', 'Guardar', 'Favorito' ])
				expect(buttonOf(element, name).hasAttribute('tabindex'), name).toBe(false);
		});

		it('is hidden until the pointer rests on the card or one of its buttons has the keyboard focus', () => {
			const panel = panelOf(createCard().element);

			for (const name of [ 'invisible', 'opacity-0', 'w-full', 'group-hover/card:visible', 'group-hover/card:w-[30rem]', 'group-hover/card:delay-300', 'group-has-[:focus-visible]/card:visible' ])
				expect(panel.classList.contains(name), name).toBe(true);
		});

		it('grows to the left when the row has no room for it on the right', () => {
			const { fixture, element } = createCard();
			const list = document.createElement('ul');
			list.setAttribute('role', 'list');
			list.appendChild(element);
			document.body.appendChild(list);
			list.getBoundingClientRect = () => ({ left: 0, right: 1000 }) as DOMRect;

			element.getBoundingClientRect = () => ({ left: 100, right: 308 }) as DOMRect;
			element.dispatchEvent(new PointerEvent('pointerenter'));
			fixture.detectChanges();
			expect(panelOf(element).classList.contains('left-0')).toBe(true);

			element.getBoundingClientRect = () => ({ left: 700, right: 908 }) as DOMRect;
			element.dispatchEvent(new PointerEvent('pointerenter'));
			fixture.detectChanges();
			expect(panelOf(element).classList.contains('right-0')).toBe(true);

			list.remove();
		});
	});
});
