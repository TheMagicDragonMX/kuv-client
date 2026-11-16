import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@environment';
import { SignupService } from '../../services/signup.service';
import { RegisterComponent } from './register.component';

/**
 * Where the API answers whether an email is free.
 */
const EMAIL_AVAILABLE = `${environment.apiUrl}/session/email-available`;

/**
 * Creates the register page.
 */
function createPage () {
	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting() ] });

	const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
	const fixture = TestBed.createComponent(RegisterComponent);
	fixture.detectChanges();

	const element = fixture.nativeElement as HTMLElement;

	return {
		fixture,
		element,
		navigate,
		server: TestBed.inject(HttpTestingController),
		signup: TestBed.inject(SignupService),

		/**
		 * The text of the page.
		 */
		text: () => element.textContent?.replace(/\s+/g, ' ') ?? '',

		/**
		 * Types in a field.
		 */
		fill (field: string, value: string) {
			const input = element.querySelector(`input[formControlName="${field}"]`) as HTMLInputElement;

			input.value = value;
			input.dispatchEvent(new Event('input'));
			fixture.detectChanges();
		},

		/**
		 * Sends the form.
		 */
		send () {
			(element.querySelector('button[type="submit"]') as HTMLButtonElement).click();
			fixture.detectChanges();
		},
	};
}

describe('RegisterComponent', () => {
	it('only asks for the email and the password twice: the age and the username come later', () => {
		const { element } = createPage();
		const fields = [ ...element.querySelectorAll('input') ].map((input) => input.getAttribute('formControlName'));

		expect(fields).toEqual([ 'email', 'password', 'confirmPassword' ]);
	});

	it('does not go on while the passwords differ', () => {
		const { fill, send, text, server, navigate } = createPage();

		fill('email', 'pablo@example.com');
		fill('password', 'secret123');
		fill('confirmPassword', 'secret124');
		send();

		expect(text()).toContain('Las contraseñas no coinciden.');
		server.expectNone((request) => request.url === EMAIL_AVAILABLE);
		expect(navigate).not.toHaveBeenCalled();
	});

	it('marks the empty fields when sent empty', () => {
		const { send, text, server } = createPage();

		send();

		expect(text()).toContain('Este campo es obligatorio.');
		server.expectNone((request) => request.url === EMAIL_AVAILABLE);
	});

	it('checks that the email is free and moves on to the age and the username', () => {
		const { fill, send, server, signup, navigate } = createPage();

		fill('email', '  pablo@example.com ');
		fill('password', 'secret123');
		fill('confirmPassword', 'secret123');
		send();

		const check = server.expectOne((request) => request.url === EMAIL_AVAILABLE);
		expect(check.request.params.get('email')).toBe('pablo@example.com');
		check.flush({ available: true });

		expect(signup.pending()).toEqual({ kind: 'password', email: 'pablo@example.com', password: 'secret123', returnUrl: null });
		expect(navigate).toHaveBeenCalledWith('/signup');
	});

	it('says so when the email is already registered, and stays', () => {
		const { fill, send, server, signup, navigate, text, fixture } = createPage();

		fill('email', 'ana@example.com');
		fill('password', 'secret123');
		fill('confirmPassword', 'secret123');
		send();
		server.expectOne((request) => request.url === EMAIL_AVAILABLE).flush({ available: false });
		fixture.detectChanges();

		expect(text()).toContain('Ese correo ya está registrado.');
		expect(signup.pending()).toBeNull();
		expect(navigate).not.toHaveBeenCalled();
	});
});
