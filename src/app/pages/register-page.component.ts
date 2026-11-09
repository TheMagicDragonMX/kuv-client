import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { returnPath } from '../services/auth.guard';
import { AuthSession } from '../services/auth-session.service';
import { SessionHttpService } from '../services/session.http.service';
import { SnackbarService } from '../services/snackbar.service';

/**
 * The names of the fields of the registration form.
 */
type RegisterField = 'username' | 'email' | 'age' | 'password';

/**
 * The tip of each field: the limits the API enforces. It is always shown under the field and turns
 * red when the value breaks it.
 */
const FIELD_TIPS: Record<RegisterField, string> = {
	username: 'Entre 3 y 50 caracteres.',
	email: 'Un correo válido, como nombre@ejemplo.com.',
	age: 'Un número entre 0 y 150.',
	password: 'Al menos 8 caracteres.',
};

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
	 * Shows the message when the account is created.
	 */
	private readonly snackbar = inject(SnackbarService);

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
	 * The tip of a field.
	 */
	protected tip (field: RegisterField): string {
		return FIELD_TIPS[field];
	}

	/**
	 * True when the user touched a field and its value breaks the tip.
	 */
	protected isInvalid (field: RegisterField): boolean {
		const control = this.form.controls[field];

		return control.invalid && (control.touched || control.dirty);
	}

	/**
	 * What to say under a field: the tip, or that the field is required when it is empty.
	 */
	protected hint (field: RegisterField): string {
		return this.isInvalid(field) && this.form.controls[field].hasError('required')
			? 'Este campo es obligatorio.'
			: FIELD_TIPS[field];
	}

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

		this.sessionHttp.register(account).pipe(
			tap(() => this.snackbar.success(`Cuenta creada. ¡Bienvenido, ${account.username.trim()}!`)),
			switchMap(() => this.sessionHttp.login(account.username.trim(), account.password)),
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
