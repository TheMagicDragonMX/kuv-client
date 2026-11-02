import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api.service';

/**
 * The login page: asks for a username and a password and keeps the tokens the API answers with.
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
	private readonly sessionApi = inject(SessionApi);

	/**
	 * True while the request is in flight, so the button cannot be pressed twice.
	 */
	protected readonly isSubmitting = signal(false);

	/**
	 * Why the last attempt failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * Confirmation shown after a successful login, or an empty string.
	 */
	protected readonly successMessage = signal('');

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
		this.successMessage.set('');
		this.isSubmitting.set(true);
		const { username, password } = this.form.getRawValue();

		this.sessionApi.login(username, password).subscribe({
			next: (tokens) => {
				localStorage.setItem('accessToken', tokens.accessToken);
				localStorage.setItem('refreshToken', tokens.refreshToken);
				this.successMessage.set('Sesión iniciada correctamente.');
				this.isSubmitting.set(false);
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
