import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from "path";
import * as vscode from "vscode";

import { Config, ConfigValueTransformer } from "./models/config";
import { IValueTransformer, ValueTransformersProvider } from "./providers/value-transformers-provider";
import { registerBuiltInPropertyHandlers, registerBuiltInValueTransformers } from "./builtin-handlers";

import { ChildWrapperPropertyHandler } from "./property-handlers/child-wrapper-property";
import { ClassCodeGenerator } from "./generators/class-generator";
import { ColorValueTransformer } from "./value-transformers/color";
import { EdgeInsetsValueTransformer } from "./value-transformers/edge-insets";
import { EnumValueTransformer } from "./value-transformers/enum";
import { LocalizationGenerator } from "./generators/localization-generator";
import { ParseXml } from "./parser/parser";
import { PipeValueResolver } from "./resolvers/pipe-value-resolver";
import { PropertyHandlerProvider } from "./providers/property-handler-provider";
import { PropertyResolver } from "./resolvers/property-resolver";
import { WidgetCodeGenerator } from "./generators/widget-generator";
import { WidgetResolver } from "./resolvers/widget-resolver";
import { WrapperPropertyHandler } from "./property-handlers/wrapper-property";
import { denodeify } from 'q';
import { insertAutoCloseTag } from "./autoclose/autoclose";

const mkdir = denodeify(mkdirp);
const writeFile = denodeify(fs.writeFile);
const readFile = denodeify(fs.readFile);
const readDir = denodeify(fs.readdir);
// const exists = denodeify(fs.exists);
const existsSync = fs.existsSync;

export default class Manager {
    public readonly propertyResolver: PropertyResolver;
    private readonly pipeValueResolver: PipeValueResolver;
    private readonly resolver: WidgetResolver;
    public readonly propertyHandlersProvider: PropertyHandlerProvider;
    private readonly valueTransformersProvider: ValueTransformersProvider;
    private readonly classGenerator: ClassCodeGenerator;
    private readonly output: vscode.OutputChannel;


    constructor(config: Config, 
                private readonly diagnostics: vscode.DiagnosticCollection) {
        this.pipeValueResolver = new PipeValueResolver();
        this.propertyHandlersProvider = new PropertyHandlerProvider();
        this.propertyResolver = new PropertyResolver(config, this.propertyHandlersProvider, this.pipeValueResolver);
        this.valueTransformersProvider = new ValueTransformersProvider();
        this.resolver = new WidgetResolver(config, this.propertyHandlersProvider, this.propertyResolver);
        const widgetGenerator = new WidgetCodeGenerator(this.propertyHandlersProvider);
        this.classGenerator = new ClassCodeGenerator(widgetGenerator);
        
        registerBuiltInPropertyHandlers(this.propertyHandlersProvider, this.propertyResolver);
        registerBuiltInValueTransformers(this.valueTransformersProvider);
        this.applyConfig(config);

        this.output = vscode.window.createOutputChannel('Flutter XML Layout');

        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (this.isI18nJsonFile(document.languageId)) {
                const isValidOptionsFile = path.join((vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[])[0].uri.fsPath, 'fxmllayout.json') === document.fileName;
                if (isValidOptionsFile) {
                    const newConfig = JSON.parse(document.getText());
                    this.applyConfig(newConfig, config);
                    await this.regenerateAll();
                }
                else {
                    await this.generateLocalizationFiles();
                }
            }
            else if (this.isFxmlFile(document.languageId)) {
                await this.generateWidgetDartFile(document.fileName, document.getText());
            }
        });
        
        // autoclose tags
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isFxmlFile(event.document.languageId)) {
                insertAutoCloseTag(event);
            }
        });
    }

    private applyConfig(config: Config, original?: Config) {
        if (config.wrappers) {
            if (original) {
                if (original.wrappers) {
                    const removed = original.wrappers.filter(a => (config.wrappers as any[]).filter(b => b.name === a.properties[0].handler).length);
                    removed.forEach(a => this.propertyHandlersProvider.remove(a.properties.map(a => a.handler)));
                }
            }
            config.wrappers
                .filter(p => p.properties[0] && p.widget)
                .forEach(p => {
                    this.propertyHandlersProvider.register(
                        p.properties.map(a => a.handler), 
                        new WrapperPropertyHandler(this.propertyResolver, p.properties, p.widget, p.defaults, p.priority !== undefined && p.priority !== null ? p.priority : 100));
                });
        }

        if (config.childWrappers) {
            if (original) {
                if (original.childWrappers) {
                    const removed = original.childWrappers.filter(a => (config.childWrappers as any[]).filter(b => b.name === a.properties[0].handler).length);
                    removed.forEach(a => this.propertyHandlersProvider.remove(a.properties.map(a => a.handler)));
                }
            }
            config.childWrappers
                .filter(p => p.properties[0] && p.widget)
                .forEach(p => {
                    this.propertyHandlersProvider.register(
                        p.properties.map(a => a.handler),
                        new ChildWrapperPropertyHandler(this.propertyResolver, p.properties, p.widget, p.defaults, p.priority !== undefined && p.priority !== null ? p.priority : 100));
                });
        }

        if (config.valueTransformers) {
            if (original) {
                if (original.valueTransformers) {
                    // todo
                    // const removed = original.valueTransformers.filter(a => (config.valueTransformers as any[]).filter(b => b.name === a.name).length);
                    // removed.forEach(a => this.propertyHandlerProvider.remove(a.name));
                }
            }
            config.valueTransformers.filter(p => p.properties && p.properties.length && p.type).forEach(p => {
                const transformer = this.createValueTransformer(p);
                if (transformer) {
                    this.valueTransformersProvider.register(p.properties, transformer);
                }
            });
        }
        if (original) {
            original.unnamedProperties = config.unnamedProperties;
            original.arrayProperties = config.arrayProperties;
            original.childWrappers = config.childWrappers;
            original.valueTransformers = config.valueTransformers;
            original.wrappers = config.wrappers;
        }
    }

    private createValueTransformer(p: ConfigValueTransformer): IValueTransformer | null {
        switch (p.type) {
            case 'enum': 
                if (p.widgetEnumMap) {
                    // Use widget-specific enum mapping
                    return new EnumValueTransformer(p.enumType || '', p.widgetEnumMap);
                } else if (p.enumType) {
                    // Use single enum type for all widgets
                    return new EnumValueTransformer(p.enumType);
                }
                return null;
            case 'color': return new ColorValueTransformer();
            case 'edgeInsets': return new EdgeInsetsValueTransformer();
            default: return null;
        }
    }

    private isFxmlFile(id: string): boolean {
        return /*id === 'fxml' ||*/ id === 'xml';
    }

    async generateWidgetDartFile(docName: string, xml: string, notifyUpdate = true) {
        const rootPath = (vscode.workspace.workspaceFolders as any[])[0].uri.fsPath;
        if (!docName.startsWith(path.join(rootPath, 'lib'))) {
            return;
        }

        const filePath = docName.substring(0, docName.lastIndexOf('.'));
        const controllerFilePath = filePath + '.ctrl.dart';
        const controllerFileName = path.parse(controllerFilePath).base;
        
        let layoutDart, rootWidget;

        const fileUri = vscode.Uri.file(filePath + '.xml');
        this.diagnostics.set(fileUri, []);
        
        try {
            const parser: ParseXml = new ParseXml();
            const xmlDoc = parser.parse(xml);
            rootWidget = this.resolver.resolve(xmlDoc);
            layoutDart = this.classGenerator.generate(rootWidget, controllerFileName);
        }
        catch (ex) {
            const diagnostic = this.getExceptionDiagnostics((ex as any).message);
            if (diagnostic) {
                this.diagnostics.set(fileUri, [diagnostic]);
            }
            const customMessage = this.getCustomErrorMessage((ex as any).message);
            if (customMessage) {
                vscode.window.showErrorMessage(customMessage);
                this.output.appendLine(customMessage);
                return;
            }
            else {
                vscode.window.showErrorMessage('Please check the XML structure.');
                this.output.appendLine('Error parsing XML file.');
                throw ex;
            }
        }

        if (!rootWidget) {
            return;
        }
        
        const layoutFileName = docName + '.dart';
        await writeFile(layoutFileName, layoutDart);
        
        try {
            if (rootWidget.controller && !existsSync(controllerFilePath)) {
                const fileName = path.parse(filePath).base;
                const controllerDart = this.classGenerator.generateControllerFile(fileName, rootWidget);
                if (!!controllerDart) {
                    await writeFile(controllerFilePath, controllerDart);
                }
            }
        }
        catch {
        }

        this.output.appendLine('XML converted to Dart code.');

        if (notifyUpdate) {
            await this.notifyUpdate();
        }
    }
    
    private getExceptionDiagnostics(message: string): vscode.Diagnostic {
        const lineIndex = message.indexOf('line ');
        const colIndex = message.indexOf('column ');
        if (lineIndex !== -1 && colIndex !== -1) {
            const line = +message.substring(lineIndex + 5, message.indexOf(',', lineIndex)) - 1;
            const col = +message.substring(colIndex + 7, message.indexOf(')', colIndex)) - 1;
            const position = new vscode.Position(line, col);
            return new vscode.Diagnostic(
                new vscode.Range(position, position.translate({ characterDelta: 1000 })), 
                message.substring(0, lineIndex - 2));
        }
        return null;
    }

    private getCustomErrorMessage(error: string): string {
        if (error.startsWith('::')) {
            return error.substring(2);
        }
        else if (error.startsWith('Attribute') && error.indexOf(' redefined ') !== -1) {
            return error.replace('^', '');
        }
        return null;
    }

    async generateWidgetDartFiles() {
        const files = await vscode.workspace.findFiles('**/*.xml');
        for (const file of files) {
            const xml = await readFile(file.fsPath, 'utf8') as string;
            await this.generateWidgetDartFile(file.fsPath, xml, false);
        }
        await this.notifyUpdate();
    }

    private async notifyUpdate() {
        if (vscode.debug.activeDebugSession) {
            await vscode.commands.executeCommand('flutter.hotReload');
        }
    }

    private isI18nJsonFile(id: string): boolean {
        return id === 'json';
    }

    async generateLocalizationFiles() {
        const jsonDirPath = path.join((vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[])[0].uri.fsPath, 'lib', 'i18n');
        if (!existsSync(jsonDirPath)) {
            return;
        }
        
        const langs: any = {};

        // read all other lang.json files then add them to langs[langCode] = json;
        let files: any = await readDir(jsonDirPath);
        files = files.filter((f: string) => f.endsWith('.json'));
        for (const file of files) {
            const code = file.substring(0, file.lastIndexOf('.'));
            const json = await readFile(path.join(jsonDirPath, file), 'utf8');
            langs[code] = json;
        }

        // generate files
        const genDirPath = path.join(jsonDirPath, 'gen');
        const localizationFilePath = path.join(genDirPath, 'localizations.dart');
        
        await mkdir(genDirPath);

        const generator = new LocalizationGenerator();
        const localizationCode = generator.generateLocalization(langs);
        await writeFile(localizationFilePath, localizationCode);
        
        // generated if not exists
        const delegateFilePath = path.join(genDirPath, 'delegate.dart');
        // if (!existsSync(delegateFilePath)) {
            const supportedLangs: string[] = Object.keys(langs);
            const delegateCode = generator.generateDelegate(supportedLangs);
            await writeFile(delegateFilePath, delegateCode);
        // }
    }

    async regenerateAll() {
        await this.generateWidgetDartFiles();
		await this.generateLocalizationFiles();
        this.output.appendLine('Re-generate operation succeeded.');
    }
}
