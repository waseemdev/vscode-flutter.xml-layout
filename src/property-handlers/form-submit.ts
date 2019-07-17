import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, AttributeModel } from '../models/models';
import { WrapperDisablePropertyHandler } from "./wrapper-disable-property";
import { FormGroupHandler } from "./form-group";
import { PropertyResolver } from "../resolvers/property-resolver";

export class FormSubmitHandler extends CustomPropertyHandler {
    priority = 9000 - 1; // less than Disable
    
    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        const formGroupName = 'ctrl.' + (attr.value || FormGroupHandler.getFormGroup(element) || 'formGroup');
        const disableWidget = new WrapperDisablePropertyHandler(this.propertyResolver);
        const resolveResult = disableWidget.resolve(
            element, {
                name: ':disable',
                value: `!(${formGroupName}.submitEnabledStream | stream:${formGroupName}.submitEnabled)`
            },
            widget
        );

        const targetWidget = this.getTargetWidget(element.name, widget);
        targetWidget.properties.push({
            dataType: 'object', name: 'onPressed', value: `${formGroupName}.submit`
        });

        return resolveResult;
    }

    private getTargetWidget(name: string, widget: WidgetModel): WidgetModel {
        if (name === widget.type) {
            return widget;
        }
        return this.getTargetWidget(name, widget.wrappedWidgets[0]);
    }
}