import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { GoogleSessionResponse } from '../../models';
import { returnPath } from '../../services/auth.guard';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GoogleSignupService } from '../../services/google-signup.service';
import { SessionService } from '../../services/middle/session.service';
import { ThemeService } from '../../services/theme.service';

/**
 * Narrowest and widest the button of Google can be, in pixels.
 */
const BUTTON_WIDTH = { min: 200, max: 400 };

/**
 * The "Continue with Google" button of the login and register pages. It is Google's own button; when the
 * user chooses an account it sends the ID token to the API and then either signs in (going back to the page
 * that asked for it, or home) or, if the account is new, moves on to the page that asks for the age and
 * username. It draws nothing while the project has no Google client ID.
 */
@Component({
	selector: 'app-google-button',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (google.enabled) {
			<div #host class="flex min-h-11 justify-center"></div>
		}
	`,
})
export class GoogleButtonComponent {
	/**
	 * The page to go to after signing in, from the address (`?returnUrl=`), or null.
	 */
	readonly returnUrl = input<string | null>(null);

	/**
	 * Says why signing in failed, so the page can show it.
	 */
	readonly failed = output<string>();

	/**
	 * Draws the button and gives the ID tokens of the accounts chosen.
	 */
	protected readonly google = inject(GoogleIdentityService);

	/**
	 * The element Google draws its button in. It is missing while Google is not set up.
	 */
	private readonly host = viewChild<ElementRef<HTMLElement>>('host');

	/**
	 * Sends the ID token to the API.
	 */
	private readonly sessionService = inject(SessionService);

	/**
	 * Keeps the tokens of the session.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Remembers the signup that goes on in the next page.
	 */
	private readonly signup = inject(GoogleSignupService);

	/**
	 * Goes to the next page.
	 */
	private readonly router = inject(Router);

	/**
	 * The theme, to draw the button dark or light.
	 */
	private readonly theme = inject(ThemeService);

	/**
	 * Draws the button (again when the theme changes) and signs in with every account the user chooses.
	 */
	constructor () {
		effect(() => {
			const host = this.host()?.nativeElement;
			const theme = this.theme.theme();

			if (host)
				void this.draw(host, theme);
		});

		this.google.credential$.pipe(takeUntilDestroyed()).subscribe((idToken) => this.signIn(idToken));
	}

	/**
	 * Asks Google to draw its button as wide as the element, within the limits it accepts.
	 */
	private async draw (host: HTMLElement, theme: 'dark' | 'light'): Promise<void> {
		const width = Math.min(BUTTON_WIDTH.max, Math.max(BUTTON_WIDTH.min, host.clientWidth));

		try {
			await this.google.renderButton(host, { theme: 'dark' === theme ? 'filled_black' : 'outline', width });
		}

		catch {
			this.failed.emit('No se pudo cargar el acceso con Google. Revisa tu conexión e inténtalo de nuevo.');
		}
	}

	/**
	 * Sends the ID token to the API and acts on the answer.
	 */
	private signIn (idToken: string): void {
		this.sessionService.google({ idToken }).subscribe({
			next: (answer) => this.arrive(answer),
			error: (error: HttpErrorResponse) => this.failed.emit(
				(error.error as { message?: string } | null)?.message ?? 'No se pudo conectar con el servidor.',
			),
		});
	}

	/**
	 * Keeps the session of a user the API knows, or starts the signup of one it does not.
	 */
	private arrive (answer: GoogleSessionResponse): void {
		if ('signedIn' === answer.status) {
			this.session.save(answer.tokens);
			void this.router.navigateByUrl(returnPath(this.returnUrl()));
			return;
		}

		this.signup.start({ signupToken: answer.signupToken, email: answer.email, returnUrl: this.returnUrl() });
		void this.router.navigateByUrl('/google-signup');
	}
}
