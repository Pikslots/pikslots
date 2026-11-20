let open = $state(false);
let mobileOpen = $state(false);

export const settingsStore = {
	get open() {
		return open;
	},
	set open(v: boolean) {
		open = v;
	},
	// Phones show the settings menu as a sheet instead of an inline column
	get mobileOpen() {
		return mobileOpen;
	},
	set mobileOpen(v: boolean) {
		mobileOpen = v;
	},
	toggle() {
		open = !open;
	},
	close() {
		open = false;
	},
	makeOpen() {
		open = true;
	}
};
