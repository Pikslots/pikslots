import { USER_ENDPOINTS } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { mutationOptions } from '@tanstack/svelte-query';
import type { AxiosError } from 'axios';
import type { PikslotErrorResponse, PikslotResponse } from '../common/common-models';
import type { SwitchBusinessInput, SwitchBusinessResult } from './models/user-model';

export const switchBusiness = async (input: SwitchBusinessInput): Promise<SwitchBusinessResult> => {
	const { data } = await apiClient.patch<PikslotResponse<SwitchBusinessResult>>(
		USER_ENDPOINTS.SWITCH_BUSINESS,
		input
	);
	return data.data;
};

export const switchBusinessMutationOptions = () =>
	mutationOptions<SwitchBusinessResult, AxiosError<PikslotErrorResponse>, SwitchBusinessInput>({
		mutationKey: ['user', 'business', 'switch'],
		mutationFn: switchBusiness
	});
