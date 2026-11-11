import type { NotificationResponse } from '@pikslots/shared';
import type { ResolvedPathname } from '$app/types';
import type { NotificationItem } from '../../notifications/data';
import { getNotifications } from '../../api/notification/get.notifications.query';
import { markNotificationAsRead } from '../../api/notification/mark.notification.as.read.mutation';
import { markAllNotificationsAsRead } from '../../api/notification/mark.all.notifications.as.read.mutation';

function createNotificationsStore() {
	let notifications = $state<NotificationItem[]>([]);

	function toNotificationItem(response: NotificationResponse): NotificationItem {
		return {
			id: response.id,
			kind: response.kind,
			title: response.title,
			message: response.message,
			body: response.body,
			createdAt: response.createdAt,
			read: response.isRead,
			href: response.href ? (response.href as ResolvedPathname) : undefined
		};
	}

	async function loadNotifications() {
		const response = await getNotifications();
		notifications = response.map(toNotificationItem);
	}

	function addNotification(item: Omit<NotificationItem, 'read'>) {
		notifications = [{ ...item, read: false }, ...notifications];
	}

	async function markAllAsRead() {
		notifications = notifications.map((notification) => ({ ...notification, read: true }));
		await markAllNotificationsAsRead();
	}

	async function markAsRead(id: string) {
		const target = notifications.find((notification) => notification.id === id);
		if (!target || target.read) return;

		notifications = notifications.map((notification) =>
			notification.id === id ? { ...notification, read: true } : notification
		);
		await markNotificationAsRead(id);
	}

	return {
		get notifications() {
			return notifications;
		},
		get unreadCount(): number {
			return notifications.filter((notification) => !notification.read).length;
		},
		loadNotifications,
		addNotification,
		markAllAsRead,
		markAsRead
	};
}

export const notificationsStore = createNotificationsStore();
