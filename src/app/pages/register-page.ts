import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api';

@Component({
	selector: 'app-register-page',
	imports: [ ReactiveFormsModule, RouterLink ],
	template: `
		<main class="auth-page">
			<section class="auth-panel" aria-labelledby="page-title">
				<p class="brand">Kuv</p>
				<h1 id="page-title">Crear cuenta</h1>
				<p class="auth-intro">Completa tus datos para registrarte.</p>
				<form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
					<label class="field">
						Nombre de usuario
						<input formControlName="username" autocomplete="username" minlength="3" maxlength="50" required />
					</label>
					<label class="field">
						Correo electrónico
						<input type="email" formControlName="email" autocomplete="email" required />
					</label>
					<label class="field">
						Edad
						<input type="number" formControlName="age" min="0" max="150" required />
					</label>
					<label class="field">
						Contraseña
						<input type="password" formControlName="password" autocomplete="new-password" minlength="8" required />
					</label>
					@if (errorMessage()) {
						<p class="form-message error" role="alert">{{ errorMessage() }}</p>
					}
					@if (successMessage()) {
						<p class="form-message success" role="status">{{ successMessage() }}</p>
					}
					<button class="submit-button" type="submit" [disabled]="isSubmitting()">
						{{ isSubmitting() ? 'Registrando...' : 'Registrarme' }}
					</button>
				</form>
				<p class="auth-switch">¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a></p>
			</section>
		</main>
	`,
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