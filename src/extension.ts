import * as vscode from 'vscode';
import Manager from './manager';
import * as fs from 'fs';
import { denodeify } from 'q';
import { Config } from './models/config';
import { extensions, languages } from 'vscode';
import { DartReferenceProvider } from './dart/extension/providers/dart_reference_provider';
import { DartHoverProvider } from './dart/extension/providers/dart_hover_provider';
import { DartCompletionItemProvider } from './dart/extension/providers/dart_completion_item_provider';
import { FixCodeActionProvider } from './dart/extension/providers/fix_code_action_provider';
import { RankingCodeActionProvider } from './dart/extension/providers/ranking_code_action_provider';
import { DartDiagnosticProvider } from './dart/extension/providers/dart_diagnostic_provider';

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
	
	// 
	// dart specific code
	// 
	const ext = extensions.getExtension('Dart-Code.dart-code');
	if (!ext || !ext.exports._privateApi.completionItemProvider ||
		!ext.exports._privateApi.completionItemProvider.analyzer ||
		!ext.exports._privateApi.logger) {
		return;
	}
	const activeFileFilters = [{ language: "xml", scheme: "file" }];
	const triggerCharacters = "<\"' /:.".split("");
	const dartAnalyzer = ext.exports._privateApi.completionItemProvider.analyzer;
	const logger = ext.exports._privateApi.logger;
	const completionItemProvider = new DartCompletionItemProvider(logger, dartAnalyzer, manager.propertyHandlersProvider);
	const hoverProvider = new DartHoverProvider(logger, dartAnalyzer);
	const referenceProvider = new DartReferenceProvider(dartAnalyzer);
	const fixCodeActionProvider = new FixCodeActionProvider(logger, activeFileFilters, dartAnalyzer);
	
	// This is registered with VS Code further down, so it's metadata can be collected from all
	// registered providers.
	const rankingCodeActionProvider = new RankingCodeActionProvider();
	rankingCodeActionProvider.registerProvider(fixCodeActionProvider);

	context.subscriptions.push(languages.registerCompletionItemProvider(activeFileFilters, completionItemProvider, ...triggerCharacters));
	context.subscriptions.push(languages.registerHoverProvider(activeFileFilters, hoverProvider));
	context.subscriptions.push(languages.registerDefinitionProvider(activeFileFilters, referenceProvider));
	context.subscriptions.push(languages.registerReferenceProvider(activeFileFilters, referenceProvider));

	// Register the ranking provider from VS Code now that it has all of its delegates.
	context.subscriptions.push(languages.registerCodeActionsProvider(activeFileFilters, rankingCodeActionProvider, rankingCodeActionProvider.metadata));
	

	// Set up diagnostics.
	const diagnostics = languages.createDiagnosticCollection('XML_LAYOUT_FOR_FLUTTER');
	context.subscriptions.push(diagnostics);
	const diagnosticsProvider = new DartDiagnosticProvider(dartAnalyzer, diagnostics);
}

export function deactivate(isRestart: boolean = false) {
}
