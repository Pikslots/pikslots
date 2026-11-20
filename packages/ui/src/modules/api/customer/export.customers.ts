import { CUSTOMER_ENDPOINTS } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';

function getFileNameFromHeader(header: unknown): string {
	if (typeof header === 'string') {
		const match = /filename="?([^";]+)"?/i.exec(header);
		if (match?.[1]) return match[1];
	}

	return `customers-${new Date().toISOString().slice(0, 10)}.csv`;
}

function downloadBlob(blob: Blob, fileName: string): void {
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = objectUrl;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(objectUrl);
}

export const exportCustomers = async (businessId: string): Promise<void> => {
	const url = CUSTOMER_ENDPOINTS.EXPORT_BY_BUSINESS.replace(':businessId', businessId);

	const response = await apiClient.get<Blob>(url, { responseType: 'blob' });

	downloadBlob(response.data, getFileNameFromHeader(response.headers['content-disposition']));
};
