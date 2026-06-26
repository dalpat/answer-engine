/** Shell UI state (sidebar collapse), persisted to localStorage. */

const KEY = 'ae:sidebar-collapsed';

function initial(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(KEY) === '1';
}

export const ui = $state({ collapsed: initial() });

export function toggleSidebar() {
	ui.collapsed = !ui.collapsed;
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, ui.collapsed ? '1' : '0');
}
