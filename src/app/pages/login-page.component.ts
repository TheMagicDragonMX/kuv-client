import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api.service';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './login-page.component.html',
})
export class LoginPage {
	private readonly formBuilder = inject(FormBuilder);
	private readonly sessionApi = inject(SessionApi);
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal('');
	protected readonly successMessage = signal('');
	protected readonly form = this.formBuilder.nonNullable.group({
		username: [ '', Validators.required ],
		password: [ '', Validators.required ],
	});

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
