import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, AttributeModel, PropertyModel } from '../models/models';

export class SwitchCaseHandler extends CustomPropertyHandler {

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        return {
            extraData: null,
            wrapperWidget: widget,
            value: attr.value, 
            handled: false // keep it as property to be used in SwitchResolver
        };
    }
    
    canGenerate(widget: WidgetModel): boolean {
        return true;
    }

    generate(widget: WidgetModel, tabsLevel: number,
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        return ''; // don't generate code for this property as it is custom
    }
}