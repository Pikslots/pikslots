export interface DeviceInfo {
	os: string;
	browser: string;
	country: string;
}

const OS_PATTERNS: [RegExp, string][] = [
	[/windows/i, 'Windows'],
	[/mac os|macintosh/i, 'macOS'],
	[/android/i, 'Android'],
	[/iphone|ipad|ipod/i, 'iOS'],
	[/linux/i, 'Linux']
];

const BROWSER_PATTERNS: [RegExp, string][] = [
	[/edg\//i, 'Edge'],
	[/opr\/|opera/i, 'Opera'],
	[/chrome|crios/i, 'Chrome'],
	[/firefox|fxios/i, 'Firefox'],
	[/safari/i, 'Safari']
];

function match(userAgent: string, patterns: [RegExp, string][]): string {
	const found = patterns.find(([pattern]) => pattern.test(userAgent));
	return found ? found[1] : 'Unknown';
}

export function getDeviceInfo(): DeviceInfo {
	if (typeof navigator === 'undefined') {
		return { os: 'Unknown', browser: 'Unknown', country: 'Unknown' };
	}

	const userAgent = navigator.userAgent;
	const locale = Intl.DateTimeFormat().resolvedOptions().locale;
	const country = locale.split('-')[1] ?? 'Unknown';

	return {
		os: match(userAgent, OS_PATTERNS),
		browser: match(userAgent, BROWSER_PATTERNS),
		country
	};
}
