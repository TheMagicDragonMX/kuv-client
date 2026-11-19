import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { Profile, UserSummary } from '../../models';
import { UsersService } from './users.service';

/**
 * A profile as the API gives it, with the picture as a path on the API.
 */
const PROFILE: Profile = { id: 7, username: 'ana', email: null, bio: null, photo: '/users/7/photo?v=5', followers: 0, following: 0, followsYou: false, youFollow: false, isYou: false, isSuperAdmin: false };

/**
 * A user in a list as the API gives it.
 */
const SUMMARY: UserSummary = { id: 7, username: 'ana', bio: null, photo: '/users/7/photo?v=5', followers: 0, followsYou: false, youFollow: false };

/**
 * The whole address of the picture of the user above.
 */
const ADDRESS = `${environment.apiUrl}/users/7/photo?v=5`;

/**
 * Sets up the service over a fake server.
 */
function setup () {
	TestBed.configureTestingModule({ providers: [ provideHttpClient(), provideHttpClientTesting() ] });

	return { service: TestBed.inject(UsersService), server: TestBed.inject(HttpTestingController) };
}

describe('UsersService', () => {
	it('puts the address of the API in front of the picture of every profile it gives', () => {
		const { service, server } = setup();
		const photos: (string | null)[] = [];

		service.me().subscribe((profile) => photos.push(profile.photo));
		service.profile({ id: 7 }).subscribe((profile) => photos.push(profile.photo));
		service.follow({ id: 7 }).subscribe((profile) => photos.push(profile.photo));
		service.unfollow({ id: 7 }).subscribe((profile) => photos.push(profile.photo));
		service.updateMe({ bio: 'Hola' }).subscribe((profile) => photos.push(profile.photo));

		server.expectOne((request) => 'GET' === request.method && request.url === `${environment.apiUrl}/users/me`).flush(PROFILE);
		server.expectOne(`${environment.apiUrl}/users/7`).flush(PROFILE);
		server.expectOne((request) => 'PUT' === request.method && request.url === `${environment.apiUrl}/users/7/follow`).flush(PROFILE);
		server.expectOne((request) => 'DELETE' === request.method && request.url === `${environment.apiUrl}/users/7/follow`).flush(PROFILE);
		server.expectOne((request) => 'PUT' === request.method && request.url === `${environment.apiUrl}/users/me`).flush(PROFILE);

		expect(photos).toEqual([ ADDRESS, ADDRESS, ADDRESS, ADDRESS, ADDRESS ]);
	});

	it('does the same in every list of users', () => {
		const { service, server } = setup();
		const photos: (string | null)[] = [];

		service.followers({ id: 1 }).subscribe((users) => photos.push(...users.map((user) => user.photo)));
		service.following({ id: 1 }).subscribe((users) => photos.push(...users.map((user) => user.photo)));
		service.search({ search: ' an ' }).subscribe((users) => photos.push(...users.map((user) => user.photo)));

		server.expectOne(`${environment.apiUrl}/users/1/followers`).flush([ SUMMARY ]);
		server.expectOne(`${environment.apiUrl}/users/1/following`).flush([ SUMMARY, { ...SUMMARY, id: 8, photo: null } ]);
		server.expectOne((request) => request.url === environment.apiUrl + '/users' && 'an' === request.params.get('search')).flush([ SUMMARY ]);

		expect(photos).toEqual([ ADDRESS, ADDRESS, null, ADDRESS ]);
	});

	it('leaves a user without a picture without one', () => {
		const { service, server } = setup();
		let photo: string | null = 'unset';

		service.profile({ id: 7 }).subscribe((profile) => photo = profile.photo);
		server.expectOne(`${environment.apiUrl}/users/7`).flush({ ...PROFILE, photo: null });

		expect(photo).toBeNull();
	});

	it('uploads a picture as a form with a file named photo, and returns the profile with its address', () => {
		const { service, server } = setup();
		let photo: string | null = null;

		service.updatePhoto({ photo: new Blob([ 'jpeg' ], { type: 'image/jpeg' }) }).subscribe((profile) => photo = profile.photo);

		const upload = server.expectOne(`${environment.apiUrl}/users/me/photo`);
		const form = upload.request.body as FormData;
		expect(upload.request.method).toBe('PUT');
		expect(form).toBeInstanceOf(FormData);
		expect((form.get('photo') as File).name).toBe('photo.jpg');
		expect((form.get('photo') as File).type).toBe('image/jpeg');
		upload.flush(PROFILE);

		expect(photo).toBe(ADDRESS);
	});

	it('removes the picture', () => {
		const { service, server } = setup();
		let photo: string | null = 'unset';

		service.removePhoto().subscribe((profile) => photo = profile.photo);

		const removal = server.expectOne(`${environment.apiUrl}/users/me/photo`);
		expect(removal.request.method).toBe('DELETE');
		removal.flush({ ...PROFILE, photo: null });

		expect(photo).toBeNull();
	});
});
