import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { GoogleButtonComponent } from '../../components/google-button/google-button.component';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { SessionService } from '../../services/middle/session.service';
import { SignupService } from '../../services/signup.service';

/**
 * The names of the fields of the registration form.
 */
type RegisterField = 'email' | 'password' | 'confirmPassword';

/**
 * Shortest password the API accepts, in characters.
 */
const MIN_PASSWORD = 8;

/**
 * The tip of each field. It is always shown under the field and turns red when the value breaks it.
 */
const FIELD_TIPS: Record<RegisterField, string> = {
	email: 'Un correo válido, como nombre@ejemplo.com.',
	password: `Al menos ${MIN_PASSWORD} caracteres.`,
	confirmPassword: 'Escribe la misma contraseña otra vez.',
};

/**
 * Marks the form when the two passwords differ. The error goes on the group, because it is about two fields.
 */
function passwordsMatch (group: AbstractControl): ValidationErrors | null {
	const password = group.get('password')?.value as string;
	const confirmation = group.get('confirmPassword')?.value as string;

	return confirmation && password !== confirmation ? { mismatch: true } : null;
}

/**
 * The register page: asks for an email and a password (twice), checks with the API that the email is free and
 * moves on to the signup page, which asks for the age and the username in the same two steps as a Google signup
 * and then creates the account.
 */
@Component({
	selector: 'app-register',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ReactiveFormsModule, RouterLink, AuthShellComponent, GoogleButtonComponent ],
	templateUrl: './register.component.html',
})
export class RegisterComponent {
	/**
	 * Builds the form.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * Asks the API whether the email is free.
	 */
	private readonly sessionService = inject(SessionService);

	/**
	 * Holds the signup while the next page asks for the age and the username.
	 */
	private readonly signup = inject(SignupService);

	/**
	 * Goes to the next page.
	 */
	private readonly router = inject(Router);

	/**
	 * The page to go to once the account exists, from the address (`?returnUrl=`), or null.
	 */
	protected readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

	/**
	 * True when signing in with Google is set up, so its button and the "or" above it are shown.
	 */
	protected readonly googleEnabled = inject(GoogleIdentityService).enabled;

	/**
	 * True while the email is being checked, so the button cannot be pressed twice.
	 */
	protected readonly isSubmitting = signal(false);

	/**
	 * Why the last attempt failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * The registration form: email, password and the password again.
	 */
	protected readonly form = this.formBuilder.nonNullable.group({
		email: [ '', [ Validators.required, Validators.email ] ],
		password: [ '', [ Validators.required, Validators.minLength(MIN_PASSWORD) ] ],
		confirmPassword: [ '', Validators.required ],
	}, { validators: passwordsMatch });

	/**
	 * True when the user touched a field and its value breaks the tip. The confirmation also breaks it when
	 * it differs from the password.
	 */
	protected isInvalid (field: RegisterField): boolean {
		const control = this.form.controls[field];
		const mismatch = 'confirmPassword' === field && this.form.hasError('mismatch');

		return (control.invalid || mismatch) && (control.touched || control.dirty);
	}

	/**
	 * What to say under a field: the tip, that the field is required, or that the passwords differ.
	 */
	protected hint (field: RegisterField): string {
		if (!this.isInvalid(field))
			return FIELD_TIPS[field];

		if (this.form.controls[field].hasError('required'))
			return 'Este campo es obligatorio.';

		return 'confirmPassword' === field ? 'Las contraseñas no coinciden.' : FIELD_TIPS[field];
	}

	/**
	 * Checks that the email is free and moves on to the age and the username, or marks the fields when the
	 * form is invalid.
	 */
	protected submit (): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.errorMessage.set('');
		this.isSubmitting.set(true);
		const { email, password } = this.form.getRawValue();

		this.sessionService.emailAvailable({ email }).subscribe({
			next: ({ available }) => {
				this.isSubmitting.set(false);

				if (!available) {
					this.errorMessage.set('Ese correo ya está registrado. Inicia sesión con él.');
					return;
				}

				this.signup.start({ kind: 'password', email: email.trim(), password, returnUrl: this.returnUrl });
				void this.router.navigateByUrl('/signup');
			},
			error: (error: HttpErrorResponse) => {
				this.errorMessage.set((error.error as { message?: string } | null)?.message ?? 'No se pudo conectar con el servidor.');
				this.isSubmitting.set(false);
			},
		});
	}
}
