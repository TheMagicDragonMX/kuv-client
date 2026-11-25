import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { NotificationItem } from '../models';
import { NotificationsService } from './notifications.service';

const makeNotification = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
	id: 1,
	type: 'comment_reply',
	title: 'Respuesta a tu comentario',
	message: '@ana respondió a tu comentario',
	actorId: 2,
	actorUsername: 'ana',
	actorPhoto: null,
	targetType: 'comment',
	targetId: 10,
	link: '/animation/5',
	isRead: false,
	createdAt: '2026-11-24T10:00:00Z',
	...overrides,
});

describe('NotificationsService', () => {
	let service: NotificationsService;
	let server: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ provideHttpClient(), provideHttpClientTesting() ],
		});
		service = TestBed.inject(NotificationsService);
		server = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		server.verify();
	});

	it('loads notifications and updates unreadCount', async () => {
		const item = makeNotification();
		const loadPromise = service.load();

		expect(service.loading()).toBe(true);

		const req = server.expectOne(`${environment.apiUrl}/notifications?unreadOnly=false&limit=50`);
		expect(req.request.method).toBe('GET');
		req.flush({ unreadCount: 1, items: [ item ] });

		await loadPromise;

		expect(service.loading()).toBe(false);
		expect(service.unreadCount()).toBe(1);
		expect(service.items()).toEqual([ item ]);
	});

	it('refreshes unreadCount and ignores transient errors', async () => {
		const refreshPromise = service.refreshUnreadCount();
		server.expectOne(`${environment.apiUrl}/notifications/unread-count`).flush({ unreadCount: 4 });
		await refreshPromise;

		expect(service.unreadCount()).toBe(4);

		const failedPromise = service.refreshUnreadCount();
		server.expectOne(`${environment.apiUrl}/notifications/unread-count`).flush('fail', { status: 500, statusText: 'Error' });
		await failedPromise;

		expect(service.unreadCount()).toBe(4);
	});

	it('marks a notification as read optimistically and rolls back on failure', async () => {
		service.items.set([ makeNotification({ id: 1, isRead: false }), makeNotification({ id: 2, isRead: false }) ]);
		service.unreadCount.set(2);

		const okPromise = service.markAsRead(1);
		expect(service.unreadCount()).toBe(1);
		expect(service.items()[0].isRead).toBe(true);

		const okReq = server.expectOne(`${environment.apiUrl}/notifications/1/read`);
		expect(okReq.request.method).toBe('POST');
		okReq.flush(null);
		await okPromise;

		expect(service.unreadCount()).toBe(1);

		const failPromise = service.markAsRead(2);
		expect(service.unreadCount()).toBe(0);
		expect(service.items()[1].isRead).toBe(true);

		server.expectOne(`${environment.apiUrl}/notifications/2/read`).flush('fail', { status: 500, statusText: 'Error' });
		await failPromise;

		expect(service.unreadCount()).toBe(1);
		expect(service.items()[1].isRead).toBe(false);
	});

	it('marks all notifications as read and rolls back on failure', async () => {
		service.items.set([ makeNotification({ id: 1, isRead: false }), makeNotification({ id: 2, isRead: false }) ]);
		service.unreadCount.set(2);

		const okPromise = service.markAllAsRead();
		expect(service.unreadCount()).toBe(0);
		expect(service.items().every((item) => item.isRead)).toBe(true);

		server.expectOne(`${environment.apiUrl}/notifications/read-all`).flush(null);
		await okPromise;

		service.items.set([ makeNotification({ id: 3, isRead: false }) ]);
		service.unreadCount.set(1);

		const failPromise = service.markAllAsRead();
		server.expectOne(`${environment.apiUrl}/notifications/read-all`).flush('fail', { status: 500, statusText: 'Error' });
		await failPromise;

		expect(service.unreadCount()).toBe(1);
		expect(service.items()[0].isRead).toBe(false);
	});

	it('removes a notification and rolls back on failure', async () => {
		service.items.set([ makeNotification({ id: 1, isRead: false }), makeNotification({ id: 2, isRead: true }) ]);
		service.unreadCount.set(1);

		const removeUnread = service.remove(1);
		expect(service.items().map((item) => item.id)).toEqual([ 2 ]);
		expect(service.unreadCount()).toBe(0);

		const delReq = server.expectOne(`${environment.apiUrl}/notifications/1`);
		expect(delReq.request.method).toBe('DELETE');
		delReq.flush(null);
		await removeUnread;

		const failRemove = service.remove(2);
		expect(service.items()).toEqual([]);

		server.expectOne(`${environment.apiUrl}/notifications/2`).flush('fail', { status: 500, statusText: 'Error' });
		await failRemove;

		expect(service.items().map((item) => item.id)).toEqual([ 2 ]);
	});

	it('records cube-chat notifications and refreshes unreadCount', async () => {
		const promise = service.recordCubeChat('Hola @admin', 'cube-1');

		const postReq = server.expectOne(`${environment.apiUrl}/notifications/cube-chat`);
		expect(postReq.request.method).toBe('POST');
		expect(postReq.request.body).toEqual({ message: 'Hola @admin', cubeId: 'cube-1' });
		postReq.flush(null);

		await Promise.resolve();
		server.expectOne(`${environment.apiUrl}/notifications/unread-count`).flush({ unreadCount: 3 });
		await promise;

		expect(service.unreadCount()).toBe(3);
	});

	it('clears state on sign-out', () => {
		service.items.set([ makeNotification() ]);
		service.unreadCount.set(5);

		service.clear();

		expect(service.items()).toEqual([]);
		expect(service.unreadCount()).toBe(0);
	});
});
