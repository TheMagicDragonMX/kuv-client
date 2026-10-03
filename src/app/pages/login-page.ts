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
			<nav class="corner-nav" aria-label="Navegación principal">
				<a routerLink="/login" class="nav-button active">Login</a>
				<a routerLink="/register" class="nav-button">Register</a>
				<a routerLink="/test-cube" class="nav-button">Cube</a>
			</nav>
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
	styles: [
		`
			:host {
				display: block;
				height: 100vh;
				width: 100vw;
				background: #0b0f14;
				color: #e5eef7;
			}

			.auth-page {
				position: relative;
				display: grid;
				place-items: center;
				height: 100%;
				padding: 2rem;
				background:
					radial-gradient(circle at top, rgba(96, 165, 250, 0.12), transparent 38%),
					linear-gradient(180deg, #111922 0%, #090c10 100%);
			}

			.corner-nav {
				position: absolute;
				top: 1.1rem;
				left: 1.1rem;
				display: flex;
				gap: 0.5rem;
				padding: 0.4rem;
				border: 1px solid rgba(148, 163, 184, 0.2);
				border-radius: 999px;
				background: rgba(10, 13, 18, 0.78);
				backdrop-filter: blur(6px);
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
				z-index: 10;
			}

			.nav-button {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: 0.5rem 0.9rem;
				border-radius: 999px;
				color: #dfeaf6;
				text-decoration: none;
				font-size: 0.78rem;
				font-weight: 600;
				letter-spacing: 0.04em;
				text-transform: uppercase;
				opacity: 0.8;
				transition: 160ms ease;
			}

			.nav-button:hover,
			.nav-button.active {
				opacity: 1;
				background: rgba(148, 163, 184, 0.14);
				box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
			}
		`],
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
