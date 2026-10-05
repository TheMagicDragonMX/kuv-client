import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api';

@Component({
	selector: 'app-register-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './register-page.html',
})
export class RegisterPage {
	private readonly formBuilder = inject(FormBuilder);
	private readonly sessionApi = inject(SessionApi);
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal('');
	protected readonly successMessage = signal('');
	protected readonly form = this.formBuilder.nonNullable.group({
		username: [ '', [ Validators.required, Validators.minLength(3), Validators.maxLength(50) ] ],
		email: [ '', [ Validators.required, Validators.email ] ],
		age: [ 18, [ Validators.required, Validators.min(0), Validators.max(150) ] ],
		password: [ '', [ Validators.required, Validators.minLength(8) ] ],
	});

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
