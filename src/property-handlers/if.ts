import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';
import { makeTabs } from "../utils";
import { PropertyResolver } from "../resolvers/property-resolver";

export class IfHandler extends CustomPropertyHandler {
    priority = 100000;
    valueSnippet = '${0:condition}';

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;
        const tempData: any = { falseWidgetId: '' };
        const ifWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [],
            type: ':if',
            tempData: tempData,
            wrappedWidgets: [widget],
            onResolved: [],
            isCustom: true
        };

        const result = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, attr.value, ifWidget, true);
        wrapperWidget = result.wrapperWidget || ifWidget;
        tempData.condition = result.value;

        return { extraData, wrapperWidget, value: attr.value, handled: true };
    }
    
    canGenerate(widget: WidgetModel): boolean {
        return true;
    }

    generate(widget: WidgetModel, tabsLevel: number,
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        let code = '';
        const tabs = makeTabs(tabsLevel);
        const data = widget.tempData;
        const wrappedWidget = widget.wrappedWidgets[0];
        const elseWidget = widget.wrappedWidgets[1];
        
        if (data && wrappedWidget) {
            code = `WidgetHelpers.ifTrue(${data.condition},
${tabs}  () => ${generateChildWidgetCode(wrappedWidget, tabsLevel + 1)},
${tabs}  () => ${elseWidget ? generateChildWidgetCode(elseWidget, tabsLevel + 1) : 'Container(width: 0, height: 0)'}
${tabs})`;
        }

        return code;
    }
}