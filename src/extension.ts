import * as vscode from 'vscode';
import Manager from './manager';
import * as fs from 'fs';
import { denodeify } from 'q';
import { Config } from './models/config';
import { languages } from 'vscode';
import { DartReferenceProvider } from './language-features/providers/dart_reference_provider';
import { DartHoverProvider } from './language-features/providers/dart_hover_provider';
import { DartCompletionItemProvider } from './language-features/providers/dart_completion_item_provider';
import { FixCodeActionProvider } from './language-features/providers/fix_code_action_provider';
import { RankingCodeActionProvider } from './language-features/providers/ranking_code_action_provider';
import { DartDiagnosticProvider } from './language-features/providers/dart_diagnostic_provider';

const readFile = denodeify(fs.readFile);

export async function activate(context: vscode.ExtensionContext) {
	let config: Config = {};
	const configFiles = await vscode.workspace.findFiles('fxmllayout.json');
	if (configFiles.length) {
		const json = await readFile(configFiles[0].fsPath, 'utf8') as string;
		config = JSON.parse(json);
	}

	const diagnostics = languages.createDiagnosticCollection('XML_LAYOUT_FOR_FLUTTER');
	const manager = new Manager(config, diagnostics);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('flutter.xml-layout.regenerate-all', async () => {
			await manager.regenerateAll();
		})
	);

	//
	// language support features
	//
	
	const activeFileFilters = [{ language: "xml", scheme: "file" }];
	const triggerCharacters = "<\"' /:.".split("");
	
	// code action providers
	const rankingCodeActionProvider = new RankingCodeActionProvider();
	rankingCodeActionProvider.registerProvider(new FixCodeActionProvider(activeFileFilters));

	const completionItemProvider = new DartCompletionItemProvider(manager.propertyHandlersProvider, manager.propertyResolver);
	const hoverProvider = new DartHoverProvider();
	const referenceProvider = new DartReferenceProvider();

	// other providers
	context.subscriptions.push(languages.registerCompletionItemProvider(activeFileFilters, completionItemProvider, ...triggerCharacters));
	context.subscriptions.push(languages.registerHoverProvider(activeFileFilters, hoverProvider));
	context.subscriptions.push(languages.registerDefinitionProvider(activeFileFilters, referenceProvider));
	context.subscriptions.push(languages.registerReferenceProvider(activeFileFilters, referenceProvider));
	context.subscriptions.push(languages.registerCodeActionsProvider(activeFileFilters, rankingCodeActionProvider, rankingCodeActionProvider.metadata));

	// diagnostics
	const diagnosticsProvider = new DartDiagnosticProvider(diagnostics);
	context.subscriptions.push(languages.onDidChangeDiagnostics((e) => diagnosticsProvider.onDidChangeDiagnostics(e)));
	context.subscriptions.push(diagnostics);
}

export function deactivate(isRestart: boolean = false) {
}
