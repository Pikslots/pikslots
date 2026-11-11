import { NOTIFICATION_ENDPOINTS } from '@pikslots/shared';
import type { FindNotificationsQuery, FindNotificationsResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { queryOptions } from '@tanstack/svelte-query';
import type { PikslotResponse } from '../common/common-models';

export const getNotifications = async (
	filter: FindNotificationsQuery = {}
): Promise<FindNotificationsResponse> => {
	const { data } = await apiClient.get<PikslotResponse<FindNotificationsResponse>>(
		NOTIFICATION_ENDPOINTS.FIND_ALL,
		{ params: filter }
	);
	return data.data;
};

export const getNotificationsQueryOptions = (filter: FindNotificationsQuery = {}) =>
	queryOptions({
		queryKey: ['notifications', filter],
		queryFn: () => getNotifications(filter)
	});
