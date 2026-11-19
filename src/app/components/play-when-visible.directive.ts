import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Part of the video that has to be on screen for it to play.
 */
const VISIBLE_SHARE = 0.25;

/**
 * Plays a muted, looping video only while it is on screen, and pauses it when it scrolls away.
 * A list of cards with a video each would otherwise decode every one of them at the same time,
 * also the ones nobody sees. It replaces the `autoplay` attribute; the video should have `muted`
 * and `loop`. Without IntersectionObserver it just plays, as `autoplay` would.
 */
@Directive({
	selector: 'video[appPlayWhenVisible]',
	standalone: true,
	host: { preload: 'metadata' },
})
export class PlayWhenVisibleDirective {
	/**
	 * Watches the video once it is on the page, and stops watching when it goes away.
	 */
	constructor () {
		const video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
		const destroyRef = inject(DestroyRef);

		afterNextRender(() => {

			/**
			 * Browsers only let a video play by itself when it is muted, and the attribute alone is
			 * not always enough once Angular created the element.
			 */
			video.muted = true;

			if ('undefined' === typeof IntersectionObserver) {
				video.play()?.catch(() => undefined);
				return;
			}

			const observer = new IntersectionObserver(([ entry ]) => {
				if (entry?.isIntersecting)
					video.play()?.catch(() => undefined);

				else
					video.pause();
			}, { threshold: VISIBLE_SHARE });

			observer.observe(video);
			destroyRef.onDestroy(() => observer.disconnect());
		});
	}
}
