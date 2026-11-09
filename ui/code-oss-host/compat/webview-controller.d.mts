export const WEBVIEW_CONTROLLER_ADAPTER: string;
export const CLAIM_HANDLER_SOURCE: string;
export function adaptWebviewController(commit: string, input: { html: string; worker: string }): { html: string; worker: string };
