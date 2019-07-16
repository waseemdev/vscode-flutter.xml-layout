import * as vscode from 'vscode';
import Manager from './manager';
import * as fs from 'fs';
import { denodeify } from 'q';
import { Config } from './models/config';

const readFile = denodeify(fs.readFile);

export async function activate(context: vscode.ExtensionContext) {
	let config: Config = {};
	const configFiles = await vscode.workspace.findFiles('fxmllayout.json');
	if (configFiles.length) {
		const json = await readFile(configFiles[0].fsPath, 'utf8') as string;
		config = JSON.parse(json);
	}

	const manager = new Manager(config);
	
	let disposable = vscode.commands.registerCommand('flutter.xml-layout.regenerate-all', async () => {
		await manager.regenerateAll();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
}
