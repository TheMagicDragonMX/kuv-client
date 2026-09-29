import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionApi } from '../services/session-api';

@Component({
	selector: 'app-login-page',
	imports: [ ReactiveFormsModule, RouterLink ],
	template: `
		<main class="auth-page">
			<section class="auth-panel" aria-labelledby="page-title">
				<p class="brand">Kuv</p>
				<h1 id="page-title">Iniciar sesión</h1>
				<p class="auth-intro">Accede con tu nombre de usuario y contraseña.</p>
				<form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
					<label class="field">
						Nombre de usuario
						<input formControlName="username" autocomplete="username" required />
					</label>
					<label class="field">
						Contraseña
						<input type="password" formControlName="password" autocomplete="current-password" required />
					</label>
					@if (errorMessage()) {
						<p class="form-message error" role="alert">{{ errorMessage() }}</p>
					}
					@if (successMessage()) {
						<p class="form-message success" role="status">{{ successMessage() }}</p>
					}
					<button class="submit-button" type="submit" [disabled]="isSubmitting()">
						{{ isSubmitting() ? 'Ingresando...' : 'Iniciar sesión' }}
					</button>
				</form>
				<p class="auth-switch">¿Aún no tienes cuenta? <a routerLink="/register">Crear cuenta</a></p>
			</section>
		</main>
	`,
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