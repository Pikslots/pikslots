import { SESSION_ENDPOINTS } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { queryOptions } from '@tanstack/svelte-query';
import type { SessionModel } from './models/session-model';
import type { PikslotResponse } from '../common/common-models';

export const getCurrentSession = async (): Promise<SessionModel> => {
	const { data } = await apiClient.get<PikslotResponse<SessionModel>>(SESSION_ENDPOINTS.ME);
	return data.data;
};

export const getCurrentSessionQueryOptions = () =>
	queryOptions({
		queryKey: ['session', 'current'],
		queryFn: getCurrentSession
	});
