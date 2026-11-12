import { NOTIFICATION_ENDPOINTS } from '@pikslots/shared';
import type { BaseErrorResponse, MarkAllNotificationsAsReadResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { mutationOptions } from '@tanstack/svelte-query';
import type { AxiosError } from 'axios';
import type { PikslotResponse } from '../common/common-models';

export const markAllNotificationsAsRead = async (): Promise<MarkAllNotificationsAsReadResponse> => {
	const { data } = await apiClient.patch<PikslotResponse<MarkAllNotificationsAsReadResponse>>(
		NOTIFICATION_ENDPOINTS.MARK_ALL_AS_READ
	);
	return data.data;
};

export const markAllNotificationsAsReadMutationOptions = () =>
	mutationOptions<MarkAllNotificationsAsReadResponse, AxiosError<BaseErrorResponse>, void>({
		mutationKey: ['mark-all-notifications-as-read'],
		mutationFn: markAllNotificationsAsRead
	});
