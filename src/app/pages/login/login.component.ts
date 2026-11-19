import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CubeLogoComponent } from '../../components/cube-logo/cube-logo.component';
import { GoogleButtonComponent } from '../../components/google-button/google-button.component';
import { MascotMood } from '../../components/kuv-mascot/kuv-mascot.component';
import { CubePace, LedCubeBackdropComponent } from '../../components/led-cube-backdrop/led-cube-backdrop.component';
import { MascotSaysComponent } from '../../components/mascot-says/mascot-says.component';
import { SoundToggleComponent } from '../../components/sound-toggle/sound-toggle.component';
import { TokenResponse } from '../../models';
import { returnPath } from '../../services/auth.guard';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { MenuSoundService } from '../../services/menu-sound.service';
import { SessionService } from '../../services/middle/session.service';
import { PixelWipeService } from '../../services/pixel-wipe.service';
import { SnackbarService } from '../../services/snackbar.service';

/**
 * Where the button of the form is: waiting, sending, or done (the session is open).
 */
type Stage = 'idle' | 'loading' | 'done';

/**
 * A problem shown above the button: what it says, and whether it is the user's (wrong data) or the
 * connection's.
 */
type Problem = {
	/**
	 * What went wrong and what to do.
	 */
	text: string;

	/**
	 * `error` for wrong data, `warning` for a connection that failed.
	 */
	kind: 'error' | 'warning';
};

/**
 * What the page says when the API turns the credentials down without a reason of its own.
 */
const WRONG_CREDENTIALS = 'Ese usuario y esa contraseña no coinciden. Revísalos e inténtalo otra vez.';

/**
 * What the page says when the API cannot be reached.
 */
const NO_CONNECTION = 'No pudimos conectar con el servidor. Revisa tu internet e inténtalo de nuevo.';

/**
 * Milliseconds the card glitches after a wrong password.
 */
const GLITCH_TIME = 520;

/**
 * Milliseconds between a good login and the pixel wipe, so the button and the mascot can celebrate
 * while the camera flies into the cube.
 */
const DIVE_TIME = 560;

/**
 * The login page: asks for a username (or email) and a password, or offers to continue with Google,
 * keeps the session the API answers with and goes back to the page that asked for it (the home page,
 * when none did). It looks like the menu of a game: the big LED cube turns behind, the mascot says
 * hello, an arrow points at the option chosen (the up and down keys move it too) and every step has a
 * sound; a wrong password glitches the card, and a good one flies into the cube.
 */
@Component({
	selector: 'app-login',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink, CubeLogoComponent, GoogleButtonComponent, LedCubeBackdropComponent, MascotSaysComponent, SoundToggleComponent ],
	templateUrl: './login.component.html',
	styleUrl: './login.component.css',
})
export class LoginComponent {
	/**
	 * Builds the form.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * Logs in through the API.
	 */
	private readonly sessionService = inject(SessionService);

	/**
	 * Keeps the tokens of the session.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Goes to the page after signing in.
	 */
	private readonly router = inject(Router);

	/**
	 * Covers the change of page with pixels.
	 */
	private readonly wipe = inject(PixelWipeService);

	/**
	 * Says that a feature is not ready yet.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * The sounds of the menu, and the button that turns them off.
	 */
	protected readonly sound = inject(MenuSoundService);

	/**
	 * The page to go back to, from the address (`?returnUrl=`), or null.
	 */
	protected readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

	/**
	 * True when signing in with Google is set up, so its button and the "or" under it are shown.
	 */
	protected readonly googleEnabled = inject(GoogleIdentityService).enabled;

	/**
	 * Where the button of the form is.
	 */
	protected readonly stage = signal<Stage>('idle');

	/**
	 * Why the username is not valid, or an empty string.
	 */
	protected readonly usernameError = signal('');

	/**
	 * Why the password is not valid, or an empty string.
	 */
	protected readonly passwordError = signal('');

	/**
	 * True after the API turned the credentials down, until the user types again; both fields are
	 * marked.
	 */
	protected readonly rejected = signal(false);

	/**
	 * The problem shown above the button, or null.
	 */
	protected readonly problem = signal<Problem | null>(null);

	/**
	 * True while the password is shown as text.
	 */
	protected readonly showPassword = signal(false);

	/**
	 * How the mascot feels.
	 */
	protected readonly mood = signal<MascotMood>('calm');

	/**
	 * How the cube behind moves.
	 */
	protected readonly cubePace = signal<CubePace>('idle');

	/**
	 * How close the camera is to the cube, as a part of its resting distance.
	 */
	protected readonly cubeZoom = signal(1);

	/**
	 * The login form: username and password, both required.
	 */
	protected readonly form = this.formBuilder.nonNullable.group({
		username: [ '', Validators.required ],
		password: [ '', Validators.required ],
	});

	/**
	 * The card of the form, where the arrow moves.
	 */
	private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

	/**
	 * The arrow that points at the option chosen.
	 */
	private readonly cursor = viewChild.required<ElementRef<HTMLElement>>('cursor');

	/**
	 * The drawing of the arrow, which slides in and shakes.
	 */
	private readonly arrow = viewChild.required<ElementRef<Element>>('arrow');

	/**
	 * The frame of the password field.
	 */
	private readonly passwordFrame = viewChild.required<ElementRef<HTMLElement>>('passwordFrame');

	/**
	 * The button that sends the form.
	 */
	private readonly submitButton = viewChild.required<ElementRef<HTMLButtonElement>>('submitButton');

	/**
	 * The cube behind, to make it glitch.
	 */
	private readonly cube = viewChild.required(LedCubeBackdropComponent);

	/**
	 * The option the arrow points at, or null while it is hidden.
	 */
	private pointed: Element | null = null;

	/**
	 * The timers still pending, cleared when the page goes away.
	 */
	private readonly timers = new Set<ReturnType<typeof setTimeout>>();

	/**
	 * Clears the pending timers when the page goes away.
	 */
	constructor () {
		inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
	}

	/**
	 * Sends the credentials, or marks the fields that are missing.
	 */
	protected submit (): void {
		if ('idle' !== this.stage())
			return;

		const { username, password } = this.form.getRawValue();
		const named = '' !== username.trim();
		this.usernameError.set(named ? '' : 'Escribe tu correo o tu nombre de usuario.');
		this.passwordError.set(password ? '' : 'Escribe tu contraseña.');

		if (!named || !password) {
			this.form.markAllAsTouched();
			const first = this.card().nativeElement.querySelector<HTMLInputElement>(named ? '#login-password' : '#login-username');
			first?.focus();
			this.refuse(first?.closest('[data-cursor]') ?? null);
			return;
		}

		this.problem.set(null);
		this.rejected.set(false);
		this.stage.set('loading');
		this.cubePace.set('loading');
		this.cubeZoom.set(0.8);
		this.sound.start();

		this.sessionService.login({ username, password }).subscribe({
			next: (tokens) => this.arrive(tokens),
			error: (error: HttpErrorResponse) => this.fail(error),
		});
	}

	/**
	 * Clears the marks of a field when the user types in it again.
	 */
	protected typed (field: 'username' | 'password'): void {
		this.rejected.set(false);
		('username' === field ? this.usernameError : this.passwordError).set('');
	}

	/**
	 * Shows or hides the password.
	 */
	protected togglePassword (): void {
		this.showPassword.update((shown) => !shown);
		this.sound.move();
	}

	/**
	 * Says that recovering the password is not ready yet.
	 */
	protected forgot (): void {
		this.sound.move();
		this.snackbar.info('Pronto podrás recuperar tu contraseña desde aquí.');
	}

	/**
	 * Shows why signing in with Google failed.
	 */
	protected googleFailed (text: string): void {
		this.problem.set({ text, kind: 'error' });
		this.mood.set('sad');
		this.later(() => this.mood.set('calm'), 1800);
	}

	/**
	 * Moves the arrow to the option that got the focus, or hides it.
	 */
	protected focused (event: FocusEvent): void {
		this.point((event.target as Element | null)?.closest('[data-cursor]') ?? null);
	}

	/**
	 * Hides the arrow when the focus leaves the card.
	 */
	protected blurred (event: FocusEvent): void {
		if (!this.card().nativeElement.contains(event.relatedTarget as Node | null))
			this.point(null);
	}

	/**
	 * Walks the options with the up and down keys, like the menu of a game.
	 */
	protected walk (event: KeyboardEvent): void {
		if ('ArrowDown' !== event.key && 'ArrowUp' !== event.key)
			return;

		const stops = [ ...this.card().nativeElement.querySelectorAll<HTMLElement>('[data-cursor]') ]
			.map((option) => (option.matches('button') ? option : option.querySelector<HTMLElement>('input')))
			.filter((option): option is HTMLElement => !!option);
		const now = stops.indexOf(document.activeElement as HTMLElement);

		if (-1 === now)
			return;

		event.preventDefault();
		stops[(now + ('ArrowDown' === event.key ? 1 : stops.length - 1)) % stops.length].focus();
	}

	/**
	 * Keeps the session and flies into the cube before going to the next page.
	 */
	private arrive (tokens: TokenResponse): void {
		this.session.save(tokens);
		this.stage.set('done');
		this.mood.set('happy');
		this.cubePace.set('dive');
		this.cubeZoom.set(0.2);
		this.sound.confirm();
		this.later(() => void this.wipe.run(() => this.router.navigateByUrl(returnPath(this.returnUrl))), DIVE_TIME);
	}

	/**
	 * Tells what went wrong: a glitch when the credentials are wrong, a warning when the API cannot
	 * be reached.
	 */
	private fail (error: HttpErrorResponse): void {
		this.stage.set('idle');
		this.cubePace.set('idle');
		this.cubeZoom.set(1);

		if (401 !== error.status) {
			this.problem.set({ text: NO_CONNECTION, kind: 'warning' });
			this.submitButton().nativeElement.focus();
			this.refuse(this.submitButton().nativeElement);
			return;
		}

		/**
		 * The API explains itself when the account has no password because it was made with Google.
		 */
		const reason = (error.error as { message?: string } | null)?.message;

		this.problem.set({ text: reason ?? WRONG_CREDENTIALS, kind: 'error' });
		this.rejected.set(true);
		this.mood.set('sad');
		this.later(() => this.mood.set('calm'), 1800);
		this.glitch();

		const password = this.passwordFrame().nativeElement.querySelector('input');
		password?.focus();
		password?.select();
		this.refuse(this.passwordFrame().nativeElement);
	}

	/**
	 * Makes the card and the cube glitch, with its noise.
	 */
	private glitch (): void {
		const card = this.card().nativeElement;
		card.classList.remove('glitch');
		void card.offsetWidth;
		card.classList.add('glitch');
		this.later(() => card.classList.remove('glitch'), GLITCH_TIME);
		this.cube().glitch();
		this.sound.glitch();
	}

	/**
	 * Puts the arrow next to an option, sliding in from the left with a sound when it changes, or
	 * hides it.
	 */
	private point (option: Element | null, quiet = false): void {
		const cursor = this.cursor().nativeElement;

		if (!option) {
			cursor.classList.remove('on');
			this.pointed = null;
			return;
		}

		const card = this.card().nativeElement.getBoundingClientRect();
		const place = option.getBoundingClientRect();
		cursor.style.setProperty('--cy', `${place.top - card.top + place.height / 2}px`);
		cursor.classList.add('on');

		if (option === this.pointed)
			return;

		this.pointed = option;
		this.replay('enter');

		if (!quiet)
			this.sound.move();
	}

	/**
	 * Shakes the arrow like a blocked option of a game, on the option given if any.
	 */
	private refuse (option: Element | null): void {
		if (option)
			this.point(option, true);

		this.replay('denied');
		this.sound.deny();
	}

	/**
	 * Starts an animation of the arrow from its beginning.
	 */
	private replay (name: 'enter' | 'denied'): void {
		const arrow = this.arrow().nativeElement;
		arrow.classList.remove('enter', 'denied');
		void arrow.getBoundingClientRect();
		arrow.classList.add(name);
	}

	/**
	 * Runs something after a while, unless the page goes away first.
	 */
	private later (task: () => void, delay: number): void {
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			task();
		}, delay);

		this.timers.add(timer);
	}
}
