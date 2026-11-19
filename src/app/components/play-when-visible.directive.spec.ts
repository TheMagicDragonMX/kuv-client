import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PlayWhenVisibleDirective } from './play-when-visible.directive';

/**
 * A page with one video that plays only while it is on screen.
 */
@Component({
	standalone: true,
	imports: [ PlayWhenVisibleDirective ],
	template: `<video appPlayWhenVisible src="clip.mp4" loop muted playsinline></video>`,
})
class HostPage {}

describe('PlayWhenVisibleDirective', () => {
	/**
	 * What the fake observer tells the directive, as the browser would when the video scrolls.
	 */
	let report: (visible: boolean) => void;

	beforeEach(() => {
		vi.stubGlobal('IntersectionObserver', class {
			constructor (callback: (entries: { isIntersecting: boolean }[]) => void) {
				report = (visible) => callback([ { isIntersecting: visible } ]);
			}

			observe (): void {
				/**
				 * The test reports by hand.
				 */
			}

			disconnect (): void {
				/**
				 * Nothing to stop.
				 */
			}
		});
	});

	afterEach(() => vi.unstubAllGlobals());

	it('plays the video while it is on screen and pauses it when it leaves, without autoplay', async () => {
		const fixture = TestBed.createComponent(HostPage);
		fixture.detectChanges();
		await fixture.whenStable();

		const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
		const play = vi.spyOn(video, 'play').mockResolvedValue();
		const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined);

		expect(video.hasAttribute('autoplay')).toBe(false);
		expect(video.getAttribute('preload')).toBe('metadata');

		report(true);
		expect(play).toHaveBeenCalledTimes(1);

		report(false);
		expect(pause).toHaveBeenCalledTimes(1);
	});
});
