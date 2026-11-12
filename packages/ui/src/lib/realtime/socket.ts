import { io, type Socket } from 'socket.io-client';
import { toast } from 'svelte-sonner';
import { notificationsStore } from '$stores/notifications.svelte';
import NotificationToast from '../../modules/notifications/notification-toast.svelte';
import type { NotificationItem } from '../../modules/notifications/data';

let socket: Socket | null = null;

export function connectSocket(): void {
	if (socket?.connected) return;

	socket = io(import.meta.env.VITE_API_URL, {
		withCredentials: true,
		transports: ['websocket', 'polling']
	});

	socket.on('notification', (payload: Omit<NotificationItem, 'read'>) => {
		const added = notificationsStore.addNotification(payload);
		if (!added) return;
		console.log('aya');
		toast.custom(NotificationToast, {
			id: payload.id,
			componentProps: {
				notification: { ...payload, read: false }
			},
			duration: 10_000
		});
	});
}

export function disconnectSocket(): void {
	socket?.disconnect();
	socket = null;
}
