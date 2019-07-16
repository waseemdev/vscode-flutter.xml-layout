import { WidgetModel, PropertyModel, ExtraDataModel, VariableModel } from "../models/models";
import * as parseXml from '../parser/types';
import { PipeValueResolver } from "./pipe-value-resolver";
import { PropertyHandlerProvider } from "../providers/property-handler-provider";
import { ValueTransformersProvider, ValueTransformResult } from "../providers/value-transformers-provider";
import { Config } from "../models/config";


export class PropertyResolver {
    constructor(
        private readonly config: Config,
        private readonly propertyHandlerProvider: PropertyHandlerProvider,
        public readonly pipeValueResolver: PipeValueResolver) {
    }

    resolveProperties(element: parseXml.Element, widget: WidgetModel): WidgetModel | null {
        if (!element.attributes) {
            return null;
        }

        let wrapperWidget: WidgetModel | null = null;

        // don't copy attributes, will loose function callback like onResolved.
        // element.attributes = JSON.parse(JSON.stringify(element.attributes));
        let propertiesNames = Object.keys(element.attributes);

        // get related properties so we can ignore them
        const propertiesToIgnore: string[] = this.getRelatedProperties(element, propertiesNames, widget);
        propertiesNames = propertiesNames.filter(a => propertiesToIgnore.indexOf(a) === -1);

        const priorities = this.getPropertiesPriorities(element, propertiesNames, widget);

        // its important to sort properties so PropertyElement(s) (e.g.: builder) to be resolved first
        // then sort by priority if provided.
        propertiesNames = propertiesNames
            .sort((a, b) => typeof element.attributes[a] === 'object' ? -1 : (typeof element.attributes[b] === 'object' ? 1 : (priorities[a] > priorities[b] ? 1 : -1)))
            // .sort((a, b) => typeof element.attributes[a] === 'object' ? -1 : 1)
            .filter(a => a !== ':use');

        // set the (use) property if provided
        const usePropertyValue = element.attributes[':use'];
        if (usePropertyValue) {
            widget.type += '.' + usePropertyValue;
        }
        
        // loop over properties
        for (const propertyName of propertiesNames) {
            const propertyValue = element.attributes[propertyName] as any;
            const propertyResult = this.resolveProperty(element, propertyName, propertyValue, wrapperWidget || widget, widget);

            if (propertyResult.wrapperWidget) {
                wrapperWidget = propertyResult.wrapperWidget;
            }

            // only add property if not handled
            if (!propertyResult.handled) {
                widget.properties.push(propertyResult.property);
            }
        }

        return wrapperWidget;
    }
    
    private getRelatedProperties(element: parseXml.Element, propertiesNames: string[], widget: WidgetModel) {
        // related properties:
        //
        // lets say we want to wrap a widget with a SizedBox by adding width property to widget
        // e.g. <RaisedButton width="100"> but we also want to add the height, which is another property
        // of SizedBox, instead of adding another WrapperProperty for height and creating another SizedBox,
        // we have to mark the height as a related property to skip the resolve() operation later to avoid 
        // generate another widget.
        // otherwise the height will be add to the RaisedButton instead of the parent SizedBox.
        //
        // related properties applied to both Properties & PropertyElements (e.g. <if> <elseIf> <else>)

        const propertiesToIgnore: string[] = [];

        for (const propertyName of propertiesNames) {
            if (propertiesToIgnore.indexOf(propertyName) > -1) {
                continue;
            }
            
            const propertyHandler = this.propertyHandlerProvider.get(propertyName);
            if (propertyHandler && propertyHandler.canResolve(element, propertyName, widget)) {
                // ignore all except current propertyName
                const related = propertyHandler
                    .getRelatedProperties(element, propertyName, widget)
                    .filter(a => a !== propertyName);
                propertiesToIgnore.push(...related);
            }
        }

        return propertiesToIgnore;
    }
    
    private getPropertiesPriorities(element: parseXml.Element, propertiesNames: string[], widget: WidgetModel): { [name: string]: number } {
        const priorities: { [name: string]: number } = {};

        for (const propertyName of propertiesNames) {
            let priority = 100;
            const propertyHandler = this.propertyHandlerProvider.get(propertyName);
            if (propertyHandler && propertyHandler.canResolve(element, propertyName, widget)) {
                priority = propertyHandler.priority;
            }
            priorities[propertyName] = priority;
        }

        return priorities;
    }

    resolveProperty(element: parseXml.Element, propertyName: string, propertyValue: string, widget: WidgetModel, ownerWidget: WidgetModel): { property: PropertyModel, wrapperWidget: WidgetModel | null, handled: boolean } {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;
        let value = propertyValue;
        let dataType: any = typeof value === 'object' ? ('propertyElement') : 'object';
        let handled = false;

        const propertyHandler = this.propertyHandlerProvider.get(propertyName);
        if (propertyHandler && propertyHandler.canResolve(element, propertyName, widget)) {
            const attr = { name: propertyName, value };
            const customPropertyResolveResult = propertyHandler.resolve(element, attr, widget);
            extraData = customPropertyResolveResult.extraData;
            wrapperWidget = customPropertyResolveResult.wrapperWidget;
            value = customPropertyResolveResult.value; // needed?!
            handled = customPropertyResolveResult.handled;
        }
        
        // don't apply binding for properties of propertyElement widgets
        // because, for example, [value] in <if> will be proccesed twice
        // one here and another in <if> property resolver
        if (!widget.isPropertyElement && !propertyHandler && typeof value === 'string') {
            const boundResult = this.pipeValueResolver.resolve(element, propertyName, value, widget);
            extraData = boundResult.extraData;
            wrapperWidget = boundResult.wrapperWidget;
            value = boundResult.value;
        }
        
        if (dataType !== 'propertyElement') {
            value = ValueTransformersProvider.transform(value, propertyName, widget.type);
        }

        if (this.isUnNamedParamaeter(propertyName, ownerWidget.type)) {
            propertyName = '';
        }

        const property: PropertyModel = {
            dataType,
            extraData,
            name: propertyName,
            value
        };

        if (propertyName === 'controller') {
            property.controller = this.createController(propertyValue);
            property.value = 'ctrl.' + property.controller.name;
            property.name = 'controller';
        }

        return { property, wrapperWidget, handled };
    }

    private createController(propertyValue: string): VariableModel {
        const eqSegments = propertyValue.split('=');

        // e.g. controller="ScrollController myController"
        let name = eqSegments[0].split(' ')[1];
        let type = eqSegments[0].split(' ')[0];
        let value;

        // there is a name with out type e.g. controller="myController"
        if (!name) {
            name = type;
            type = '';
        }

        // controller="TabController myController = TabController(initialIndex: 0, length: 4, vsync: this)"
        if (eqSegments.length === 2) {
            value = eqSegments[1];
            if (!type) {
                type = value.substring(0, value.indexOf('('));
            }
        }

        if (type) {
            type = type.trim();
        }
        if (name) {
            name = name.trim();
        }
        if (value) {
            value = value.trim();
        }

        return { type, name, value, skipGenerate: !type && !value };
    }

    isUnNamedParamaeter(name: string, widgetType: string): boolean {
        widgetType = widgetType.split('.')[0];
        
        let unnamed: any = {
            Text: 'text',
            Icon: 'icon',
            Image: 'source'
        };

        if (this.config.unnamedProperties) {
            unnamed = Object.assign(unnamed, this.config.unnamedProperties);
        }

        let result = unnamed[widgetType] === name;
        return result;
    }
}