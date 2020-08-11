import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';
import { extractForLoopParams, makeTabs, sortProperties, spaceAfter } from "../utils";
import { PropertyResolver } from "../resolvers/property-resolver";

export class ChildBuilderHandler extends CustomPropertyHandler {
    priority = -100000; // lowest priority
    valueSnippet = '"item of ${0:items}"';

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }


    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;
        
        const { listName, indexName, itemName, typeName } = extractForLoopParams(attr.value);
        const tempData: any = { listName, indexName, itemName, typeName };
        const listNameWithPipes = attr.value.substr(attr.value.indexOf(listName));
        const contentWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'function',
                    name: ':childBuilder',
                    value: ''
                }
            ],
            type: widget.type === 'builder' ? 'YouShouldNotSetChildBuilderPropertyInBuilderTag' : widget.type,
            tempData: tempData,
            wrappedWidgets: [widget],
            onResolved: []
        };

        const result = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, listNameWithPipes, contentWidget);
        wrapperWidget = result.wrapperWidget || contentWidget;
        tempData.listValueVariableName = result.wrapperWidget ? result.value : tempData.listName;

        return { extraData, wrapperWidget, value: result.value, handled: true };
    }
    
    canGenerate(widget: WidgetModel): boolean {
        return true;
    }

    generate(widget: WidgetModel, tabsLevel: number, 
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        const tabs = makeTabs(tabsLevel);
        const data = widget.tempData;
        const originalWidget = widget.wrappedWidgets[0];
        const indexName = data.indexName || 'index';
        let widgetProp = originalWidget.properties.filter(a => a.dataType === 'widget')[0];
        let code = '';

        // generate other user-defined properties
        if (!originalWidget.isPropertyElement) {
            originalWidget.properties.sort(sortProperties)
            .filter(a => !a.skipGeneratingCode && ['children'].indexOf(a.name) === -1 && a !== widgetProp)
            .forEach(p => {
                code += generatePropertyCode(originalWidget as WidgetModel, p, tabsLevel) + `,\n`;
            });
        }
        
        // get child widget from properties
        let childWidget: WidgetModel = widgetProp ? widgetProp.value as WidgetModel : null as any;
        if (!childWidget) {
            const widgetProp = originalWidget.properties.filter(a => a.dataType === 'widgetList')[0];
            childWidget = widgetProp && widgetProp.value ? (widgetProp.value as WidgetModel[])[0] : null as any;
        }

        code += 
`${tabs}children: WidgetHelpers.mapToWidgetList(${data.listValueVariableName}, (${spaceAfter(data.typeName)}${data.itemName || 'item'}, ${data.indexName || 'index'}) {
${tabs}  return ${generateChildWidgetCode(childWidget, tabsLevel + 1)};
${tabs}})`;

        return code;
    }
}