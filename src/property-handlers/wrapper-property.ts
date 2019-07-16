import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, AttributeModel, PropertyModel } from '../models/models';
import { ConfigHandlerAndPropertyModel } from '../models/config';
import { PipeValueResolver } from "../resolvers/pipe-value-resolver";
import { ValueTransformersProvider } from "../providers/value-transformers-provider";
import { PropertyResolver } from "../resolvers/property-resolver";

export class WrapperPropertyHandler extends CustomPropertyHandler {
    protected getProperty(handler: string): ConfigHandlerAndPropertyModel {
        const property = this.properties.filter(a => a.handler === handler)[0];
        if (property) {
            return property;
        }
        return { handler: '', targetProperty: '' };
    }

    constructor(
        protected propertyResolver: PropertyResolver,
        protected properties: ConfigHandlerAndPropertyModel[],
        protected targetWidgetType: string,
        protected defaults?: { [name: string]: string },
        priority: number = 100) {
        super();
        this.priority = priority;
    }

    getRelatedProperties(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): string[] {
        return this.properties.map(a => a.handler);
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        const property = this.getProperty(attr.name);
        attr.value = property.value !== null && property.value !== undefined ? property.value : attr.value;
        const value = property.targetProperty ? ValueTransformersProvider.transform(attr.value, property.targetProperty, this.targetWidgetType) : attr.value;
        
        // if we have a custom property like (:if) we have to unwrap it
        // then make the (:if) as grandparent of the new widget (which is created in this method)
        // then make the original widget (widget) as a child of the new widget.
        // so in the next few lines we hold the grandparent (:if) 
        // and the first non-custom widget for the last step below.

        let grandparentWidget: WidgetModel = null as any;
        let lastCustomParent: WidgetModel = null as any;
        if (widget.isCustom) {
            const getFirstNonCustomWidget = (w: WidgetModel): { customParent: WidgetModel, nonCustomChild: WidgetModel } => {
                if (w.wrappedWidgets && w.wrappedWidgets[0]) {
                    if (w.isCustom && !w.wrappedWidgets[0].isCustom) {
                        return { customParent: w, nonCustomChild: w.wrappedWidgets[0] };
                    }
                    else {
                        return getFirstNonCustomWidget(w.wrappedWidgets[0]);
                    }
                }
                return null as any;
            };
            grandparentWidget = widget;
            const result = getFirstNonCustomWidget(widget);
            widget = result.nonCustomChild;
            lastCustomParent = result.customParent;
        }

        const onWrapped: ((wrapper: WidgetModel) => void)[] = [];

        // create the new wrapper widget
        const creationResult = this.createWrapperWidget(widget, property.targetProperty, value, onWrapped);
        let wrapperWidget: WidgetModel = creationResult.wrapperWidget;

        // add related properties
        const relatedProperties = this.createRelatedProperties(element.attributes, property.targetProperty);
        creationResult.wrapperWidget.properties.push(...relatedProperties);

        // add properties' default values
        const defaultValues = this.createPropertiesDefaultValues();
        creationResult.wrapperWidget.properties.push(...defaultValues);

        // apply binding on related properties
        for (const prop of relatedProperties) {
            const resolveResult = this.propertyResolver.pipeValueResolver.resolve(element, prop.name, prop.value as any, wrapperWidget, true);
            wrapperWidget = resolveResult.wrapperWidget || wrapperWidget;
            prop.value = resolveResult.value;
        }
        
        // resolve data-binding for current property
        if (typeof value === 'string') {
            const resolveResult = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, value, wrapperWidget, true);

            if (creationResult.propertyToUpdateAfterBinding) {
                creationResult.propertyToUpdateAfterBinding.value = resolveResult.value; // update property value
            }
            
            if (resolveResult.wrapperWidget) {
                wrapperWidget = resolveResult.wrapperWidget || wrapperWidget;
                onWrapped.forEach(a => a && a(resolveResult.wrapperWidget as any));
            }
        }

        
        // if we have a grandparent (which is ':if' in our example) then return it as a root
        // then add the new widget as a child of the last custom widget
        // (it could be the same (':if') or another nested custom)

        if (grandparentWidget) {
            lastCustomParent.wrappedWidgets = [wrapperWidget];
            wrapperWidget = grandparentWidget;
        }
        
        return { extraData: null, wrapperWidget, value: attr.value, handled: true };
    }

    protected createRelatedProperties(attributes: any, targetProperty: string): PropertyModel[] {
        const related: PropertyModel[] = this.properties
            .filter(prop => prop.targetProperty !== targetProperty && prop.handler in attributes)
            .map(prop => {
                const value = ValueTransformersProvider.transform(attributes[prop.handler], prop.handler, this.targetWidgetType);
                return {
                    value, name: prop.targetProperty, dataType: 'object'
                } as PropertyModel;
            });
        return related;
    }

    protected createWrapperWidget(widget: WidgetModel, targetProperty: string, value: string, onWrapped: ((wrapper: WidgetModel) => void)[]): { wrapperWidget: WidgetModel, propertyToUpdateAfterBinding: PropertyModel | null } {
        const propertyName = this.propertyResolver.isUnNamedParamaeter(targetProperty, this.targetWidgetType) ? '' : targetProperty;
        
        const wrapperWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'object', name: propertyName, value: value
                },
                {
                    dataType: 'widget', name: 'child', value: widget
                }
            ],
            type: this.targetWidgetType,
            wrappedWidgets: [widget],
            onResolved: []
        };

        return { wrapperWidget, propertyToUpdateAfterBinding: wrapperWidget.properties[0] };
    }

    protected createPropertiesDefaultValues(): PropertyModel[] {
        const defaults = this.defaults || { };
        return Object.keys(defaults).map(k => {
            return {
                name: k,
                value: defaults[k],
                dataType: 'object'
            } as PropertyModel;
        });
    }
}