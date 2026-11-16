import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { returnPath } from '../../services/auth.guard';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleSignupService } from '../../services/google-signup.service';
import { SessionService } from '../../services/middle/session.service';
import { SnackbarService } from '../../services/snackbar.service';

/**
 * The steps of the page: first the age, then the username.
 */
type Step = 'age' | 'username';

/**
 * What is known about the username in the box.
 */
type UsernameStatus = 'empty' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown';

/**
 * The answer of the API about a username.
 */
type Checked = {
	/**
	 * The username that was asked about, with no spaces around it.
	 */
	name: string;

	/**
	 * Whether it is free, or null when the API could not say.
	 */
	available: boolean | null;
};

/**
 * Youngest age on the slider.
 */
const MIN_AGE = 3;

/**
 * Oldest age on the slider.
 */
const MAX_AGE = 100;

/**
 * Age the slider starts on.
 */
const DEFAULT_AGE = 18;

/**
 * Shortest username the API accepts, in characters.
 */
const MIN_USERNAME = 3;

/**
 * Longest username the API accepts, in characters.
 */
const MAX_USERNAME = 50;

/**
 * Milliseconds the user must stop typing before the username is looked up.
 */
const CHECK_DELAY = 350;

/**
 * What to say under the username box for each status.
 */
const USERNAME_HINTS: Record<UsernameStatus, string> = {
	empty: `Entre ${MIN_USERNAME} y ${MAX_USERNAME} caracteres. Nadie más puede tener el mismo.`,
	invalid: `Entre ${MIN_USERNAME} y ${MAX_USERNAME} caracteres.`,
	checking: 'Comprobando si está libre…',
	available: 'Está libre.',
	taken: 'Ese nombre ya está en uso. Prueba con otro.',
	unknown: 'No pudimos comprobarlo ahora. Si ya está en uso, te lo diremos al continuar.',
};

/**
 * The page that finishes the account of someone who signed in with Google for the first time. It asks for what
 * Google does not tell, one thing per step: the age (on a slider) and then a unique username. It only opens
 * while a Google signup is in progress (`googleSignupGuard`).
 */
@Component({
	selector: 'app-google-signup',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ReactiveFormsModule, AuthShellComponent ],
	templateUrl: './google-signup.component.html',
})
export class GoogleSignupPage {
	/**
	 * Builds the form.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * Creates the account and asks whether a username is free.
	 */
	private readonly sessionService = inject(SessionService);

	/**
	 * Keeps the tokens of the session.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Holds the signup in progress.
	 */
	private readonly signup = inject(GoogleSignupService);

	/**
	 * Goes to the next page.
	 */
	private readonly router = inject(Router);

	/**
	 * Welcomes the new user.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * The email of the Google account being used. It is read once: the signup is forgotten as soon as the
	 * account is created, while the page is still on screen.
	 */
	protected readonly email = this.signup.pending()?.email ?? '';

	/**
	 * The limits of the slider.
	 */
	protected readonly ages = { min: MIN_AGE, max: MAX_AGE };

	/**
	 * The step the user is in.
	 */
	protected readonly step = signal<Step>('age');

	/**
	 * True while the account is being created, so the button cannot be pressed twice.
	 */
	protected readonly isSubmitting = signal(false);

	/**
	 * Why the last attempt failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * The two answers: the age and the username.
	 */
	protected readonly form = this.formBuilder.nonNullable.group({
		age: [ DEFAULT_AGE, [ Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE) ] ],
		username: [ '', [ Validators.required, Validators.minLength(MIN_USERNAME), Validators.maxLength(MAX_USERNAME) ] ],
	});

	/**
	 * What the user has typed as a username, without the spaces around it.
	 */
	private readonly typed = toSignal(
		this.form.controls.username.valueChanges.pipe(map((value) => value.trim())),
		{ initialValue: '' },
	);

	/**
	 * What the API last said about a username.
	 */
	private readonly checked = signal<Checked | null>(null);

	/**
	 * What is known about the username in the box. An answer only counts for the name it was about, so
	 * an old answer never describes what is typed now.
	 */
	protected readonly status = computed<UsernameStatus>(() => {
		const name = this.typed();
		const checked = this.checked();

		if (!name)
			return 'empty';

		if (name.length < MIN_USERNAME || name.length > MAX_USERNAME)
			return 'invalid';

		if (!checked || checked.name.toLowerCase() !== name.toLowerCase())
			return 'checking';

		if (null === checked.available)
			return 'unknown';

		return checked.available ? 'available' : 'taken';
	});

	/**
	 * What to say under the username box.
	 */
	protected readonly hint = computed(() => USERNAME_HINTS[this.status()]);

	/**
	 * True when the account can be created: the username is free (or the API could not say, and then it
	 * has the last word).
	 */
	protected readonly canCreate = computed(() => 'available' === this.status() || 'unknown' === this.status());

	/**
	 * Looks the username up once the user stops typing.
	 */
	constructor () {
		this.form.controls.username.valueChanges.pipe(
			map((value) => value.trim()),
			distinctUntilChanged(),
			filter((name) => name.length >= MIN_USERNAME && name.length <= MAX_USERNAME),
			debounceTime(CHECK_DELAY),
			switchMap((name) => this.sessionService.usernameAvailable({ username: name }).pipe(
				map((answer): Checked => ({ name, available: answer.available })),
				catchError(() => of<Checked>({ name, available: null })),
			)),
			takeUntilDestroyed(),
		).subscribe((checked) => this.checked.set(checked));
	}

	/**
	 * Moves to the username step.
	 */
	protected next (): void {
		if (this.form.controls.age.invalid)
			return;

		this.step.set('username');
	}

	/**
	 * Goes back to the age step.
	 */
	protected back (): void {
		this.errorMessage.set('');
		this.step.set('age');
	}

	/**
	 * Gives up on the signup and goes back to the login page.
	 */
	protected cancel (): void {
		this.signup.clear();
		void this.router.navigateByUrl('/login');
	}

	/**
	 * Creates the account with the age and username chosen and signs in with it.
	 */
	protected submit (): void {
		const pending = this.signup.pending();

		if (!pending || !this.canCreate() || this.isSubmitting())
			return;

		this.errorMessage.set('');
		this.isSubmitting.set(true);
		const { age, username } = this.form.getRawValue();
		const { signupToken, returnUrl } = pending;

		this.sessionService.completeGoogle({ signupToken, age, username }).subscribe({
			next: (tokens) => {
				this.session.save(tokens);
				this.signup.clear();
				this.snackbar.success(`Cuenta creada. ¡Bienvenido, ${username.trim()}!`);
				void this.router.navigateByUrl(returnPath(returnUrl));
			},
			error: (error: HttpErrorResponse) => this.fail(error, username.trim()),
		});
	}

	/**
	 * Says what went wrong. A signup that expired (or an account that already exists) cannot go on, so it
	 * sends the user to log in again.
	 */
	private fail (error: HttpErrorResponse, username: string): void {
		const message = (error.error as { message?: string } | null)?.message;

		this.isSubmitting.set(false);

		if (401 === error.status) {
			this.signup.clear();
			this.snackbar.error(message ?? 'Tu sesión de Google expiró. Vuelve a elegir tu cuenta.');
			void this.router.navigateByUrl('/login');
			return;
		}

		if (409 === error.status && message?.includes('nombre de usuario'))
			this.checked.set({ name: username, available: false });

		this.errorMessage.set(message ?? 'No se pudo conectar con el servidor.');
	}
}
