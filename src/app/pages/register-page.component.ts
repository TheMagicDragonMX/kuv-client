import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { returnPath } from '../services/auth.guard';
import { AuthSession } from '../services/auth-session.service';
import { SessionApi } from '../services/session-api.service';

/**
 * The register page: asks for the data of a new account, creates it through the API and signs
 * the user in with it, so they land on the page that asked for it (the profile, when none did).
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
	 * Keeps the tokens of the session.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Goes to the page after signing in.
	 */
	private readonly router = inject(Router);

	/**
	 * The page to go to afterwards, from the address (`?returnUrl=`), or null.
	 */
	private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

	/**
	 * True while the request is in flight, so the button cannot be pressed twice.
	 */
	protected readonly isSubmitting = signal(false);

	/**
	 * Why the last attempt failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

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
	 * Creates the account and signs in with it, or marks the fields when the form is invalid.
	 */
	protected submit (): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.errorMessage.set('');
		this.isSubmitting.set(true);
		const account = this.form.getRawValue();

		this.sessionApi.register(account).pipe(
			switchMap(() => this.sessionApi.login(account.username.trim(), account.password)),
		).subscribe({
			next: (tokens) => {
				this.session.save(tokens);
				void this.router.navigateByUrl(returnPath(this.returnUrl));
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
