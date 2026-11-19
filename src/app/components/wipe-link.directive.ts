import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MenuSoundService } from '../services/menu-sound.service';
import { PixelWipeService } from '../services/pixel-wipe.service';

/**
 * A link inside the app that changes page behind the pixel wipe, with the sound of the menu. It
 * keeps a real `href`, so opening it in a new tab (with the middle button or a modifier key) still
 * works like any link; only a plain click goes through the wipe. A click on the page that is
 * already open does nothing.
 */
@Directive({
	selector: 'a[appWipeLink]',
	standalone: true,
	host: {
		'[attr.href]': 'appWipeLink()',
		'(click)': 'follow($event)',
	},
})
export class WipeLinkDirective {
	/**
	 * Where the link goes, as an address of the app.
	 */
	readonly appWipeLink = input.required<string>();

	/**
	 * Changes the page.
	 */
	private readonly router = inject(Router);

	/**
	 * Covers the change of page with pixels.
	 */
	private readonly wipe = inject(PixelWipeService);

	/**
	 * The sounds of the menus.
	 */
	private readonly sound = inject(MenuSoundService);

	/**
	 * Goes to the page through the wipe, unless the browser should handle the click itself.
	 */
	protected follow (event: MouseEvent): void {
		if (0 !== event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
			return;

		event.preventDefault();

		const target = this.appWipeLink();

		if (this.router.url === target)
			return;

		this.sound.move();
		void this.wipe.run(() => this.router.navigateByUrl(target));
	}
}
