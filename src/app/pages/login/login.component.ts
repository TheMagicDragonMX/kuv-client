import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { GoogleButtonComponent } from '../../components/google-button/google-button.component';
import { returnPath } from '../../services/auth.guard';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { SessionService } from '../../services/middle/session.service';

/**
 * The login page: asks for a username (or email) and a password, or offers to continue with Google, keeps the session the API answers with and
 * goes back to the page that asked for it (the home page, when none did).
 */
@Component({
	selector: 'app-login',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink, AuthShellComponent, GoogleButtonComponent ],
	templateUrl: './login.component.html',
})
export class LoginComponent {
	/**
	 * Builds the form.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * Logs in and creates accounts through the API.
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
	 * The page to go back to, from the address (`?returnUrl=`), or null.
	 */
	protected readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

	/**
	 * True when signing in with Google is set up, so its button and the "or" above it are shown.
	 */
	protected readonly googleEnabled = inject(GoogleIdentityService).enabled;

	/**
	 * True while the request is in flight, so the button cannot be pressed twice.
	 */
	protected readonly isSubmitting = signal(false);

	/**
	 * Why the last attempt failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * The login form: username and password, both required.
	 */
	protected readonly form = this.formBuilder.nonNullable.group({
		username: [ '', Validators.required ],
		password: [ '', Validators.required ],
	});

	/**
	 * Sends the credentials, or marks the fields when the form is invalid.
	 */
	protected submit (): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.errorMessage.set('');
		this.isSubmitting.set(true);
		const { username, password } = this.form.getRawValue();

		this.sessionService.login({ username, password }).subscribe({
			next: (tokens) => {
				this.session.save(tokens);
				void this.router.navigateByUrl(returnPath(this.returnUrl));
			},
			error: (error: HttpErrorResponse) => {
				/**
				 * The API explains itself when the account has no password because it was made with Google.
				 */
				const reason = (error.error as { message?: string } | null)?.message;

				this.errorMessage.set(401 === error.status
					? reason ?? 'Usuario o contraseña incorrectos.'
					: 'No se pudo conectar con el servidor.');
				this.isSubmitting.set(false);
			},
		});
	}
}
