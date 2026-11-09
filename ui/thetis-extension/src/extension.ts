import * as vscode from 'vscode';
import { registerThetisViews } from './workbench/views';
export { registerThetisViews, openThetisPanel } from './workbench/views';
export function activate(context: vscode.ExtensionContext) { return registerThetisViews(context); }
