import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';

export abstract class CustomPropertyHandler {
    priority: number = 100;
    isElement = false;
    elementAttributes: string[];
    
    getRelatedProperties(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): string[] {
        return [];
    }
    
    canResolvePropertyElement(): boolean {
        return false;
    }

    resolvePropertyElement(element: parseXml.Element, widgetResolveResult: WidgetResolveResult, parent: parseXml.Element, parentChildren: parseXml.Element[], resolveWidget: (element: parseXml.Element, parent: parseXml.Element) => WidgetResolveResult): WidgetModel | null {
        return null;
    }
    
    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return false;
    }

    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        return {
            wrapperWidget: null,
            value: attr.value,
            handled: false,
            extraData: null
        };
    }

    canGenerate(widget: WidgetModel): boolean {
        return false;
    }

    generate(widget: WidgetModel, tabsLevel: number,
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        return '';
    }
}

export class PropertyHandlerProvider {
    private readonly handlers: { [name: string]: CustomPropertyHandler } = {};

    register(name: string | string[], handler: CustomPropertyHandler) {
        if (name instanceof Array) {
            name.forEach(n => this.handlers[n] = handler);
        }
        else {
            this.handlers[name] = handler;
        }
    }

    getAll(): { [name: string]: CustomPropertyHandler } {
        return this.handlers;
    }

    get(name: string): CustomPropertyHandler {
        return this.handlers[name];
    }

    remove(name: string | string[]) {
        if (name instanceof Array) {
            name.forEach(n => delete this.handlers[n]);
        }
        else {
            delete this.handlers[name];
        }
    }
}

export interface PropertyResolveResult {
    wrapperWidget: WidgetModel | null;
    extraData: ExtraDataModel | null;
    value: string;
    handled: boolean;
}

export interface WidgetResolveResult {
    widget: WidgetModel;
    isPropertyElement: boolean;
    propertyElement: string;
    propertyElementProperties: any[];
}