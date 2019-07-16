import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';
import { extractForLoopParams, makeTabs, sortProperties } from "../until";
import { PropertyResolver } from "../resolvers/property-resolver";

export class BuilderHandler extends CustomPropertyHandler {
    priority = -100000; // lowest priority

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }

    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;

        // retreive all builder(s) inside the widget
        let propertyValue = (attr.value as any);
        let builders = [propertyValue];
        if (propertyValue instanceof Array) {
            builders = [...propertyValue];
        }

        // const use = element.attributes.use;
        const buildersData: any[] = [];

        const contentWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'function',
                    name: 'builder',
                    value: ''
                }
            ],
            type: widget.type,
            tempData: { buildersData },
            wrappedWidgets: [widget],
            onResolved: []
        };

        builders.forEach(builder => {
            const result = this.resolveBuilder(element, attr, builder, wrapperWidget, contentWidget);
            if (result) {
                wrapperWidget = result.wrapperWidget;
                buildersData.push(result.tempData);
            }
        });

        return { extraData, wrapperWidget, value: null as any, handled: true };
    }

    private resolveBuilder(element: parseXml.Element, attr: AttributeModel, builderData: any, wrapperWidget: WidgetModel | null, contentWidget: WidgetModel): { tempData: any, wrapperWidget: WidgetModel | null } | null {
        let childWidget = builderData.value;
        let arrayOfIfWidgets = null;
        if (!childWidget) {
            return null;
        }

        if (childWidget instanceof Array) {
            // get (if) widgets
            arrayOfIfWidgets = childWidget.filter(a => a.type === ':if');
            // if there are no (if) widgets, get first widget anyway
            if (arrayOfIfWidgets.length) {
                childWidget = null;
            }
            else {
                const hasArrayProp = builderData.extraData.properties.filter((a: any) => a.name === 'array').length > 0;
                if (!hasArrayProp) {
                    childWidget = childWidget[0];
                }
            }
            contentWidget.wrappedWidgets.push(...arrayOfIfWidgets);
        }
        else if (childWidget) {
            contentWidget.wrappedWidgets.push(childWidget);
        }
        
        const properties: any[] = builderData.extraData.properties;
        const builderName = properties.filter(a => a.name === 'name').map(a => a.value)[0];
        const value = properties.filter(a => a.name === 'data').map(a => a.value)[0] || '';
        let params = properties.filter(a => a.name === 'params').map(a => a.value)[0];
        
        const { listName, indexName, itemName } = extractForLoopParams(value);
        const listNameWithPipes = value.substr(value.indexOf(listName));
        const tempData: any = { listName, indexName, itemName, builderName, params, childWidget: childWidget, arrayOfIfWidgets };
        // contentWidget.properties[1].value = childWidget; // todo review

        
        const result = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, listNameWithPipes, wrapperWidget || contentWidget);
        wrapperWidget = result.wrapperWidget || wrapperWidget || contentWidget;
        tempData.listValueVariableName = result.wrapperWidget ? result.value : tempData.listName;


        // if the childWidget is the same as the result.wrapperWidget that means they are StreamBuilder
        // and we need to unwrap the original child widget then make it a child
        // in other words: replace the StreamBuilder with its child (that wrapped by this StreamBuilder)

        // This is intended to prevent code-generating the StreamBuilder twice
        // one from the hierarchy, and the other in the generate(...) method below
        // which generating the tempData.childWidget as a child of each 'builder'
        
        if (result.wrapperWidget && tempData.childWidget && 
            tempData.childWidget.tempData === result.wrapperWidget.tempData &&
            !!result.wrapperWidget.tempData) {
            tempData.childWidget = tempData.childWidget.wrappedWidgets[0];
        }

        return { tempData, wrapperWidget };
    }

    canGenerate(widget: WidgetModel): boolean {
        const builderProp = widget.properties.filter(a => a.name === 'builder')[0];
        if (builderProp && builderProp.extraData) {
            return false;
        }

        // because the StreamBuilder also has a 'builder' property
        const widgetsThatHaveItsOwnBuilderProperty = ['StreamBuilder', 'FutureBuilder'];
        return widgetsThatHaveItsOwnBuilderProperty
            .filter(a => a === widget.type).length === 0;
    }

    generate(widget: WidgetModel, tabsLevel: number, 
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        const tempData: any = widget.tempData;
        const originalWidget = widget.wrappedWidgets[0];
        const buildersData: any[] = tempData.buildersData;
        let code = '';

        // generate other user-defined properties
        originalWidget.properties.sort(sortProperties)
            .filter(a => !a.skipGeneratingCode && ['children', 'builder'].indexOf(a.name) === -1)
            .forEach(p => {
                code += generatePropertyCode(originalWidget, p, tabsLevel) + `,\n`;
            });
        
        // generate builders code
        let codes = buildersData.map(data => this.generateBuilderCode(data, generateChildWidgetCode, tabsLevel));
        code += codes.join(',\n');
        
        return code;
    }

    private generateBuilderCode(data: any, generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string, tabsLevel: number): string {
        const tabs = makeTabs(tabsLevel);
        let childWidget = data.childWidget as WidgetModel;
        let ifWidgets = data.arrayOfIfWidgets as WidgetModel[];
        const isChildWidgetArray = (childWidget as any) instanceof Array;
        const hasItemList = data.listValueVariableName && data.itemName;
        const indexName = data.indexName || 'index';
        
        // generate itemBuilder function
        let code = `${tabs}${data.builderName ? data.builderName + ': ' : ''}(${data.params || 'BuildContext context'}${data.params ? '' : (hasItemList ? `, ${indexName}` : '')}) {`;

        // if (hasItemList && (!data.params || data.indexName)) {
        if (hasItemList) {
            code += `
${tabs}  final ${data.itemName} = ${data.listValueVariableName} == null || ${data.listValueVariableName}.length <= ${indexName} || ${data.listValueVariableName}.length == 0 ? null : ${data.listValueVariableName}[${indexName}];`;
        }

        if (ifWidgets && ifWidgets.length) {
            code += '\n' + this.generateIfWidgetsCode(ifWidgets, tabsLevel + 1, generateChildWidgetCode);
            return code + `\n${tabs}}`;
        }

        let childWidgetCode = '';
        if (isChildWidgetArray) {
            childWidgetCode = `[\n${tabs}${(childWidget as any).map((child: WidgetModel) => '    ' + generateChildWidgetCode(child, tabsLevel + 2)).join(',\n' + tabs)}\n${tabs}  ]`;
        }
        else {
            if (childWidget.type === 'builder') {
                childWidget = childWidget.properties.filter(a => a.name === 'child' || a.name === 'children')[0].value as any;
            }
            childWidgetCode = childWidget ? generateChildWidgetCode(childWidget, tabsLevel + 1) : 'Container(width: 0, height: 0)';
        }

        if (childWidgetCode.startsWith('...')) {
            childWidgetCode = childWidgetCode.substring(3);
        }

        code += `
${tabs}  return ${childWidgetCode};
${tabs}}`;

        return code;
    }

    private generateIfWidgetsCode(ifWidgets: WidgetModel[], tabsLevel: number, generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string): string {
        const tabs = makeTabs(tabsLevel);
        const code = ifWidgets
            .filter(w => w.wrappedWidgets[0])
            .map(w => {
                const child = w.wrappedWidgets[0];
                let code = `${tabs}if (${w.tempData.condition}) {\n`;
                code += `${tabs}  return ${generateChildWidgetCode(child, tabsLevel + 1)};\n`;
                code += `${tabs}}`;
                return code;
            }).join('\n');

        return code;
    }
}
