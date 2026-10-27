import type { LoginJwtPayload } from '@pikslots/shared';
import type { SessionModel } from '../../api/session/models/session-model';

function createAuthStore() {
	let session = $state<SessionModel | null>(null);
	let isInitializing = $state(true);

	function setSession(value: SessionModel) {
		session = value;
	}

	function clearSession() {
		session = null;
	}

	function setInitialized() {
		isInitializing = false;
	}

	function getPayloadData(): LoginJwtPayload | null {
		if (!session) return null;
		return { userId: session.userId, role: session.role, businessId: session.businessId };
	}

	return {
		get session() {
			return session;
		},
		get isAuthenticated() {
			return session !== null;
		},
		get isInitializing() {
			return isInitializing;
		},
		setSession,
		clearSession,
		getPayloadData,
		setInitialized
	};
}

export const authStore = createAuthStore();
