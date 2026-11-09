import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { returnPath } from '../services/auth.guard';
import { AuthSession } from '../services/auth-session.service';
import { SessionHttpService } from '../services/session.http.service';

/**
 * The login page: asks for a username and a password, keeps the session the API answers with and
 * goes back to the page that asked for it (the profile, when none did).
 */
@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './login-page.component.html',
})
export class LoginPage {
	/**
	 * Builds the form.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * Talks to the API's session endpoints.
	 */
	private readonly sessionHttp = inject(SessionHttpService);

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

		this.sessionHttp.login(username, password).subscribe({
			next: (tokens) => {
				this.session.save(tokens);
				void this.router.navigateByUrl(returnPath(this.returnUrl));
			},
			error: (error: HttpErrorResponse) => {
				this.errorMessage.set(401 === error.status
					? 'Usuario o contraseña incorrectos.'
					: 'No se pudo conectar con el servidor.');
				this.isSubmitting.set(false);
			},
		});
	}
}
