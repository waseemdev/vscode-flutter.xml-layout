import { PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, AttributeModel, PropertyModel } from '../models/models';
import { ConfigHandlerAndPropertyModel } from '../models/config';
import { WrapperPropertyHandler } from "./wrapper-property";
import { ValueTransformersProvider } from "../providers/value-transformers-provider";
import { PropertyResolver } from "../resolvers/property-resolver";

export class ChildWrapperPropertyHandler extends WrapperPropertyHandler {
    constructor(propertyResolver: PropertyResolver, properties: ConfigHandlerAndPropertyModel[], widgetType: string,
        defaults?: { [name: string]: string }, priority: number = 100) {
        super(propertyResolver, properties, widgetType, defaults, priority);
    }

    getRelatedProperties(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): string[] {
        return this.properties.map(a => a.handler);
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        const property = this.getProperty(attr.name);
        attr.value = property.value !== null && property.value !== undefined ? property.value : attr.value;
        let value = property.targetProperty ? ValueTransformersProvider.transform(attr.value, property.targetProperty, this.targetWidgetType) : attr.value;

        const propertyName = this.propertyResolver.isUnNamedParamaeter(property.targetProperty, this.targetWidgetType) ? '' : property.targetProperty;

        const newChildWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [],
            type: this.targetWidgetType,
            wrappedWidgets: [],
            onResolved: []
        };

        // if the widget was a wrapper for the original widget get the original one.
        if (widget.wrappedWidgets) {
            const wrappedWidget = widget.wrappedWidgets[0];
            if (wrappedWidget) {
                widget = wrappedWidget;
            }
        }

        const onResolve = (widget: WidgetModel) => {
            let child = widget.properties.filter(a => a.name === 'child')[0];
            if (!child) {
                child = {
                    name: 'child',
                    dataType: 'widget',
                    value: null as any
                };
                widget.properties.push(child);
            }

            newChildWidget.properties = [
                {
                    dataType: 'object', name: propertyName, value: value
                },

                // add related properties
                ... this.createRelatedProperties(element.attributes, property.targetProperty),

                // add properties' default values
                ... this.createPropertiesDefaultValues()
            ];

            if (child.value) {
                newChildWidget.properties.push({
                    dataType: 'widget', name: 'child', value: child.value
                });
            }

            // todo apply binding on related properties
            // for (const prop of relatedProperties) {
            //     const resolveResult = this.pipeValueResolver.resolve(element, prop.name, prop.value as any, wrapperWidget, true);
            //     wrapperWidget = resolveResult.wrapperWidget || wrapperWidget;
            //     prop.value = resolveResult.value;
            // }

            child.value = newChildWidget as any;
        };
        widget.onResolved.push(onResolve);
        
        const result = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, attr.value, widget, true);
        const wrapperWidget = result.wrapperWidget;
        if (result.wrapperWidget) {
            value = result.value;
        }

        return { extraData: null, wrapperWidget, value: attr.value, handled: true };
    }
}