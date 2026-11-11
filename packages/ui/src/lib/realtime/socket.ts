import { io, type Socket } from 'socket.io-client';
import { notificationsStore } from '$stores/notifications.svelte';
import type { NotificationItem } from '../../modules/notifications/data';

let socket: Socket | null = null;

export function connectSocket(): void {
	if (socket?.connected) return;

	socket = io(import.meta.env.VITE_API_URL, {
		withCredentials: true,
		transports: ['websocket', 'polling']
	});

	socket.on('notification', (payload: Omit<NotificationItem, 'read'>) => {
		alert('this is ' + JSON.stringify(payload));
		notificationsStore.addNotification(payload);
	});
}

export function disconnectSocket(): void {
	socket?.disconnect();
	socket = null;
}
