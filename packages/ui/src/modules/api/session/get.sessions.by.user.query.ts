import { SESSION_ENDPOINTS } from '@pikslots/shared';
import type { GetSessionsByUserIdResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { queryOptions } from '@tanstack/svelte-query';
import type { PikslotResponse } from '../common/common-models';

export const getSessionsByUser = async (userId: string): Promise<GetSessionsByUserIdResponse> => {
	const url = SESSION_ENDPOINTS.FIND_BY_USER.replace(':userId', userId);
	const { data } = await apiClient.get<PikslotResponse<GetSessionsByUserIdResponse>>(url);
	return data.data;
};

export const getSessionsByUserQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: ['sessions', 'user', userId],
		queryFn: () => getSessionsByUser(userId),
		enabled: !!userId
	});
