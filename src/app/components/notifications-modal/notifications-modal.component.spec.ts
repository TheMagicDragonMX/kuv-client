import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '@environment';
import { NotificationItem } from '../../models';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationsModalComponent } from './notifications-modal.component';

const ITEMS: NotificationItem[] = [
	{
		id: 1,
		type: 'follow',
		title: 'Nuevo seguidor',
		message: '@maria comenzó a seguirte.',
		actorId: 2,
		actorUsername: 'maria',
		actorPhoto: null,
		targetType: 'user',
		targetId: 2,
		link: '/profile/2',
		isRead: false,
		createdAt: new Date().toISOString(),
	},
	{
		id: 2,
		type: 'popularity_milestone',
		title: 'Hito de popularidad',
		message: 'Tu comentario alcanzó 10 me gusta.',
		actorId: null,
		actorUsername: null,
		actorPhoto: null,
		targetType: 'comment',
		targetId: 5,
		link: '/animation/9',
		isRead: true,
		createdAt: new Date(Date.now() - 3600_000).toISOString(),
	},
];

describe('NotificationsModalComponent', () => {
	let server: HttpTestingController;
	let notifications: NotificationsService;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ NotificationsModalComponent ],
			providers: [ provideHttpClient(), provideHttpClientTesting(), provideRouter([]) ],
		}).compileComponents();

		server = TestBed.inject(HttpTestingController);
		notifications = TestBed.inject(NotificationsService);
		router = TestBed.inject(Router);
	});

	afterEach(() => {
		server.verify();
	});

	const createModal = () => {
		const fixture = TestBed.createComponent(NotificationsModalComponent);
		fixture.detectChanges();

		server.expectOne(`${environment.apiUrl}/notifications?unreadOnly=false&limit=50`).flush({
			unreadCount: 1,
			items: ITEMS,
		});
		fixture.detectChanges();

		return { fixture, element: fixture.nativeElement as HTMLElement };
	};

	it('loads notifications on open and filters by unread', async () => {
		const { fixture, element } = createModal();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelectorAll('ul li').length).toBe(2);

		const buttons = Array.from(element.querySelectorAll('button'));
		const unreadTab = buttons.find((button) => button.textContent?.includes('No leídas'));
		unreadTab?.click();
		fixture.detectChanges();

		expect(element.querySelectorAll('ul li').length).toBe(1);
		expect(element.textContent).toContain('Nuevo seguidor');
		expect(element.textContent).not.toContain('Hito de popularidad');
	});

	it('marks all notifications as read when clicking the header action', async () => {
		const { fixture, element } = createModal();
		await fixture.whenStable();
		fixture.detectChanges();

		const markAllButton = Array.from(element.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Marcar todas leídas'),
		);
		expect(markAllButton).toBeTruthy();

		markAllButton?.click();
		server.expectOne(`${environment.apiUrl}/notifications/read-all`).flush(null);
		await fixture.whenStable();
		fixture.detectChanges();

		expect(notifications.unreadCount()).toBe(0);
	});

	it('marks an unread notification as read, closes, and navigates on click', async () => {
		const { fixture, element } = createModal();
		await fixture.whenStable();
		fixture.detectChanges();

		let closed = false;
		fixture.componentInstance.close.subscribe(() => {
			closed = true;
		});

		let navigatedUrl = '';
		router.navigateByUrl = ((url: string) => {
			navigatedUrl = url;
			return Promise.resolve(true);
		}) as unknown as Router['navigateByUrl'];

		const firstNotificationButton = element.querySelector('ul li button') as HTMLButtonElement;
		firstNotificationButton.click();

		server.expectOne(`${environment.apiUrl}/notifications/1/read`).flush(null);
		await fixture.whenStable();

		expect(closed).toBe(true);
		expect(navigatedUrl).toBe('/profile/2');
	});

	it('closes when pressing Escape', () => {
		const { fixture } = createModal();
		let closed = false;
		fixture.componentInstance.close.subscribe(() => {
			closed = true;
		});

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(closed).toBe(true);
	});
});
