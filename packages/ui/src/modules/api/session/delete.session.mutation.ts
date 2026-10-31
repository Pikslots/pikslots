import { SESSION_ENDPOINTS } from '@pikslots/shared';
import type { BaseErrorResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { mutationOptions } from '@tanstack/svelte-query';
import type { AxiosError } from 'axios';

export const deleteSession = async (sessionId: string): Promise<void> => {
	const url = SESSION_ENDPOINTS.DELETE.replace(':id', sessionId);
	await apiClient.delete(url);
};

export const deleteSessionMutationOptions = () =>
	mutationOptions<void, AxiosError<BaseErrorResponse>, string>({
		mutationKey: ['delete-session'],
		mutationFn: deleteSession
	});
