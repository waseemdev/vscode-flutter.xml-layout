import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';
import { extractForLoopParams, makeTabs, spaceAfter } from "../utils";
import { PropertyResolver } from "../resolvers/property-resolver";

export class RepeatHandler extends CustomPropertyHandler {
    priority = 1000000; // top priority
    valueSnippet = 'item of ${0:items}';

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
        const tempData: any = { listName, indexName, itemName, typeName, widget };
        const listNameWithPipes = attr.value.substr(attr.value.indexOf(listName));
        const contentWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'function',
                    name: ':repeat',
                    value: ''
                },
                {
                    dataType: 'widget',
                    name: 'child',
                    value: widget,
                    skipGeneratingCode: true
                }
            ],
            type: '', // empty type to generate properties only and skip generating widget constractor e.g.: Container(...)
            tempData: tempData,
            wrappedWidgets: [], // don't add the widget
            onResolved: []
        };

        // the user must not use 'stream' or 'future' pipes wth repeat
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
        const tabs = makeTabs(tabsLevel - 1);
        const data = widget.tempData;
        const originalWidget = data.widget as WidgetModel;

        const code = 
`...WidgetHelpers.mapToWidgetList(${data.listValueVariableName}, (${spaceAfter(data.typeName)}${data.itemName || 'item'}, ${data.indexName || 'index'}) {
${tabs}    return ${generateChildWidgetCode(originalWidget, tabsLevel + 1)};
${tabs}  }
${tabs})`;

        return code;
    }
}