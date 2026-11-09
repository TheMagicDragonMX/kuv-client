import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments';
import { Profile, UserSummary } from '../../services/users.http.service';
import { FollowSectionComponent, followLabel, relationOf } from './follow-section.component';

/**
 * The signed-in user.
 */
const ME: Profile = { id: 1, username: 'ana', email: 'ana@example.com', description: null, photo: null, followers: 2, following: 1, followsYou: false, youFollow: false, isYou: true };

/**
 * A user in a list.
 */
function user (id: number, username: string, followsYou: boolean, youFollow: boolean): UserSummary {
	return { id, username, description: null, photo: null, followers: 3, followsYou, youFollow };
}

/**
 * Creates the section, answers its first requests and gives access to its internals.
 */
function createSection () {
	TestBed.configureTestingModule({ providers: [ provideHttpClient(), provideHttpClientTesting() ] });

	const fixture = TestBed.createComponent(FollowSectionComponent);
	fixture.componentRef.setInput('me', ME);
	fixture.detectChanges();

	const server = TestBed.inject(HttpTestingController);
	server.expectOne(`${environment.apiUrl}/users/1/following`).flush([ user(2, 'beto', true, true) ]);
	server.expectOne(`${environment.apiUrl}/users/1/followers`).flush([ user(2, 'beto', true, true), user(3, 'caro', true, false) ]);
	fixture.detectChanges();

	return {
		fixture,
		server,
		element: fixture.nativeElement as HTMLElement,
		section: fixture.componentInstance as unknown as {
			show(list: 'following' | 'followers'): void;
			search(text: string): void;
			toggleFollow(user: UserSummary): void;
			picked(): UserSummary | null;
		},
	};
}

/**
 * The names in the rows of the lists.
 */
function names (element: HTMLElement): string[] {
	return [ ...element.querySelectorAll('li button .truncate') ].map((name) => name.textContent?.trim() ?? '');
}

describe('relationOf and followLabel', () => {
	it('say how two users relate and what the button does', () => {
		expect(relationOf({ followsYou: true, youFollow: true })).toBe('Se siguen');
		expect(relationOf({ followsYou: false, youFollow: true })).toBe('Siguiendo');
		expect(relationOf({ followsYou: true, youFollow: false })).toBe('Te sigue');
		expect(relationOf({ followsYou: false, youFollow: false })).toBeNull();

		expect(followLabel({ followsYou: true, youFollow: false })).toBe('Seguir también');
		expect(followLabel({ followsYou: false, youFollow: false })).toBe('Seguir');
		expect(followLabel({ followsYou: true, youFollow: true })).toBe('Dejar de seguir');
	});
});

describe('FollowSectionComponent', () => {
	it('shows who the user follows, and who follows them', () => {
		const { fixture, element, section } = createSection();

		expect(names(element)).toEqual([ '@beto' ]);
		expect(element.textContent).toContain('Se siguen');

		section.show('followers');
		fixture.detectChanges();

		expect(names(element)).toEqual([ '@beto', '@caro' ]);
		expect(element.textContent).toContain('Te sigue');
	});

	it('shows the first person of the list, with the button to follow them back', () => {
		const { fixture, element, section } = createSection();
		section.show('followers');
		section.search('caro');
		fixture.detectChanges();

		expect(section.picked()?.username).toBe('caro');
		expect(element.querySelector('section h3')?.textContent).toContain('@caro');
		expect([ ...element.querySelectorAll('section button') ].map((button) => button.textContent?.trim())).toContain('Seguir también');
	});

	it('filters the list by name, and finds other people on the server', () => {
		vi.useFakeTimers();

		try {
			const { fixture, element, server, section } = createSection();

			section.search('be');
			fixture.detectChanges();
			expect(names(element)).toEqual([ '@beto' ]);

			vi.advanceTimersByTime(300);
			server.expectOne(`${environment.apiUrl}/users?search=be`).flush([ user(2, 'beto', true, true), user(4, 'bere', false, false) ]);
			fixture.detectChanges();

			expect(element.textContent).toContain('Otras personas');
			expect(names(element)).toEqual([ '@beto', '@bere' ]);
		}

		finally {
			vi.useRealTimers();
		}
	});

	it('follows someone, then loads the lists again and tells the profile', () => {
		const { fixture, server, section } = createSection();
		let changed = 0;
		fixture.componentInstance.changed.subscribe(() => changed += 1);

		section.toggleFollow(user(3, 'caro', true, false));

		const follow = server.expectOne(`${environment.apiUrl}/users/3/follow`);
		expect(follow.request.method).toBe('PUT');
		follow.flush({ ...ME, id: 3, username: 'caro', followsYou: true, youFollow: true, isYou: false });

		server.expectOne(`${environment.apiUrl}/users/1/following`).flush([]);
		server.expectOne(`${environment.apiUrl}/users/1/followers`).flush([]);

		expect(changed).toBe(1);
	});

	it('stops following someone it follows', () => {
		const { server, section } = createSection();

		section.toggleFollow(user(2, 'beto', true, true));

		expect(server.expectOne(`${environment.apiUrl}/users/2/follow`).request.method).toBe('DELETE');
	});
});
