import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api.service';

/**
 * The register page: asks for the data of a new account and creates it through the API.
 */
@Component({
	selector: 'app-register-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './register-page.component.html',
})
export class RegisterPage {
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
	 * Confirmation shown after a successful registration, or an empty string.
	 */
	protected readonly successMessage = signal('');

	/**
	 * The registration form with the limits the API enforces.
	 */
	protected readonly form = this.formBuilder.nonNullable.group({
		username: [ '', [ Validators.required, Validators.minLength(3), Validators.maxLength(50) ] ],
		email: [ '', [ Validators.required, Validators.email ] ],
		age: [ 18, [ Validators.required, Validators.min(0), Validators.max(150) ] ],
		password: [ '', [ Validators.required, Validators.minLength(8) ] ],
	});

	/**
	 * Sends the new account, or marks the fields when the form is invalid.
	 */
	protected submit (): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.errorMessage.set('');
		this.successMessage.set('');
		this.isSubmitting.set(true);
		this.sessionApi.register(this.form.getRawValue()).subscribe({
			next: () => {
				this.successMessage.set('Cuenta creada. Ya puedes iniciar sesión.');
				this.form.reset({ username: '', email: '', age: 18, password: '' });
				this.isSubmitting.set(false);
			},
			error: (error: HttpErrorResponse) => {
				this.errorMessage.set(409 === error.status
					? 'Ese nombre de usuario o correo ya está registrado.'
					: 400 === error.status
						? 'Revisa los datos: la contraseña debe tener al menos 8 caracteres.'
						: 'No se pudo conectar con el servidor.');
				this.isSubmitting.set(false);
			},
		});
	}
}
