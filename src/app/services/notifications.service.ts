import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationItem } from '../models';
import { NotificationsHttpService } from './http/notifications.http.service';

/**
 * Reactive state store for user notifications and unread badge count.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
	private readonly http = inject(NotificationsHttpService);

	/**
	 * Loaded notification items ordered newest first.
	 */
	readonly items = signal<NotificationItem[]>([]);

	/**
	 * Current unread notification count for the signed-in user.
	 */
	readonly unreadCount = signal(0);

	/**
	 * True while fetching notifications.
	 */
	readonly loading = signal(false);

	/**
	 * Loads the notification list and updates the unread count.
	 */
	async load (unreadOnly = false): Promise<void> {
		this.loading.set(true);

		try {
			const summary = await firstValueFrom(this.http.list(unreadOnly));

			this.items.set(summary.items);
			this.unreadCount.set(summary.unreadCount);
		}
		catch (error) {
			console.error('Error loading notifications', error);
		}
		finally {
			this.loading.set(false);
		}
	}

	/**
	 * Refreshes only the unread counter for the header badge.
	 */
	async refreshUnreadCount (): Promise<void> {
		try {
			const response = await firstValueFrom(this.http.unreadCount());

			this.unreadCount.set(response.unreadCount);
		}
		catch {
			// Ignore transient polling failures
		}
	}

	/**
	 * Marks a notification as read locally and on the server.
	 */
	async markAsRead (id: number): Promise<void> {
		const previousItems = this.items();
		const previousUnread = this.unreadCount();
		const target = previousItems.find((item) => item.id === id);

		if (target && !target.isRead) {
			this.items.update((list) => list.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
			this.unreadCount.update((count) => Math.max(0, count - 1));
		}

		try {
			await firstValueFrom(this.http.markAsRead(id));
		}
		catch (error) {
			this.items.set(previousItems);
			this.unreadCount.set(previousUnread);
			console.error('Error marking notification as read', error);
		}
	}

	/**
	 * Marks all notifications as read locally and on the server.
	 */
	async markAllAsRead (): Promise<void> {
		const previousItems = this.items();
		const previousUnread = this.unreadCount();

		this.items.update((list) => list.map((item) => ({ ...item, isRead: true })));
		this.unreadCount.set(0);

		try {
			await firstValueFrom(this.http.markAllAsRead());
		}
		catch (error) {
			this.items.set(previousItems);
			this.unreadCount.set(previousUnread);
			console.error('Error marking all notifications as read', error);
		}
	}

	/**
	 * Deletes a notification locally and on the server.
	 */
	async remove (id: number): Promise<void> {
		const previousItems = this.items();
		const previousUnread = this.unreadCount();
		const target = previousItems.find((item) => item.id === id);

		this.items.update((list) => list.filter((item) => item.id !== id));

		if (target && !target.isRead)
			this.unreadCount.update((count) => Math.max(0, count - 1));

		try {
			await firstValueFrom(this.http.delete(id));
		}
		catch (error) {
			this.items.set(previousItems);
			this.unreadCount.set(previousUnread);
			console.error('Error deleting notification', error);
		}
	}

	/**
	 * Records a cube-chat notification or mention and updates the unread count.
	 */
	async recordCubeChat (message: string, cubeId?: string): Promise<void> {
		try {
			await firstValueFrom(this.http.recordCubeChat({ message, cubeId }));
			await this.refreshUnreadCount();
		}
		catch {
			// Non-critical: chat delivery continues even if notification fails
		}
	}

	/**
	 * Clears local notification state on sign-out.
	 */
	clear (): void {
		this.items.set([]);
		this.unreadCount.set(0);
	}
}
