/**
 * Notification category codes emitted by the API.
 */
export type NotificationType =
	| 'comment'
	| 'comment_reply'
	| 'mention'
	| 'comment_like'
	| 'follow'
	| 'followed_creation'
	| 'popularity_milestone'
	| 'trending_creation'
	| 'report_status'
	| 'moderation_notice'
	| 'cube_chat';

/**
 * A single notification item returned by the API.
 */
export type NotificationItem = {
	id: number;
	type: NotificationType | string;
	title: string;
	message: string;
	actorId: number | null;
	actorUsername: string | null;
	actorPhoto: string | null;
	targetType: string | null;
	targetId: number | null;
	link: string | null;
	isRead: boolean;
	createdAt: string;
};

/**
 * Summary response containing unread count and notification list.
 */
export type NotificationsSummary = {
	unreadCount: number;
	items: NotificationItem[];
};

/**
 * Unread count response.
 */
export type UnreadCountResponse = {
	unreadCount: number;
};

/**
 * Payload for recording a cube-chat notification or mention.
 */
export type CubeChatNotificationPayload = {
	message: string;
	cubeId?: string;
};
