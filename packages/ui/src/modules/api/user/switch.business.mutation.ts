import { USER_ENDPOINTS, type SwitchBusinessInput } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import type { SessionModel } from '../session/models/session-model';
import type { PikslotResponse } from '../common/common-models';

export const switchBusiness = async (input: SwitchBusinessInput): Promise<SessionModel> => {
	const { data } = await apiClient.post<PikslotResponse<SessionModel>>(
		USER_ENDPOINTS.SWITCH_BUSINESS,
		input
	);
	return data.data;
};
