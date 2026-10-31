import axios, { type AxiosError } from 'axios';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { toast } from 'svelte-sonner';
import { SESSION_EXPIRED_MESSAGE, type BaseErrorResponse } from '@pikslots/shared';
import { authStore } from '$stores/auth.svelte';

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	withCredentials: true
});

let redirectingForExpiredSession = false;

apiClient.interceptors.response.use(
	(response) => response,
	(error: AxiosError<BaseErrorResponse>) => {
		const isExpiredSession =
			error.response?.status === 401 && error.response?.data?.message === SESSION_EXPIRED_MESSAGE;

		if (browser && isExpiredSession && authStore.isAuthenticated && !redirectingForExpiredSession) {
			redirectingForExpiredSession = true;
			authStore.clearSession();
			toast.error(SESSION_EXPIRED_MESSAGE);
			goto(resolve('/login')).finally(() => {
				redirectingForExpiredSession = false;
			});
		}

		return Promise.reject(error);
	}
);
