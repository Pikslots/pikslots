import { NOTIFICATION_ENDPOINTS } from '@pikslots/shared';
import type { BaseErrorResponse, MarkNotificationAsReadResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { mutationOptions } from '@tanstack/svelte-query';
import type { AxiosError } from 'axios';
import type { PikslotResponse } from '../common/common-models';

export const markNotificationAsRead = async (
	notificationId: string
): Promise<MarkNotificationAsReadResponse> => {
	const url = NOTIFICATION_ENDPOINTS.MARK_AS_READ.replace(':notificationId', notificationId);
	const { data } = await apiClient.patch<PikslotResponse<MarkNotificationAsReadResponse>>(url);
	return data.data;
};

export const markNotificationAsReadMutationOptions = () =>
	mutationOptions<MarkNotificationAsReadResponse, AxiosError<BaseErrorResponse>, string>({
		mutationKey: ['mark-notification-as-read'],
		mutationFn: markNotificationAsRead
	});
