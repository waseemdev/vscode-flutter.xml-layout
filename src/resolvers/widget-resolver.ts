import * as parseXml from '../parser/types';
import { PropertyResolver } from './property-resolver';
import { PropertyHandlerProvider, WidgetResolveResult } from '../providers/property-handler-provider';
import { RootWidgetModel, ImportModel, WidgetModel, PropertyModel, ParamModel, VariableModel } from '../models/models';
import { Config } from '../models/config';
import { removeDuplicatedBuilders } from './util';

export class WidgetResolver {
    constructor(private readonly config: Config, 
        private readonly propertyHandlerProvider: PropertyHandlerProvider,
        private readonly propertyResolver: PropertyResolver) {
    }

    resolve(xmlDoc: parseXml.Document): RootWidgetModel {
        const rootElement = xmlDoc.children[0] as parseXml.Element;
        const rootElementAttrs = JSON.parse(JSON.stringify(rootElement.attributes));
        const rootChild = this.getChildWidget(rootElement);
        const rootChildWidget = this.resolveWidget(rootChild, null);

        removeDuplicatedBuilders(rootChildWidget.widget, null, 'wrappedWidgets', { });
        this.callOnResolved(rootChildWidget.widget);

        const mixins = this.resolveMixins(rootElement);
        const params = this.resolveParams(rootElement);
        const providers = this.resolveProviders(rootElement);
        const vars = this.resolveVars(rootElement);
        const imports = this.resolveImports(rootElementAttrs);
        
        const routeAware = 'routeAware' in rootElementAttrs;
        if (routeAware) {
            const hasRouteAware = mixins.filter(a => a === 'RouteAware').length > 0;
            if (!hasRouteAware) {
                mixins.push('RouteAware');
            }
        }

        const rootWidget: RootWidgetModel = {
            type: rootElement.name,
            stateful: 'stateful' in rootElementAttrs,
            controller: rootElementAttrs.controller,
            // controllerName: rootElementAttrs.controller,
            controllerPath: rootElementAttrs.controllerPath,
            rootChild: rootChildWidget.widget,
            params: params,
            mixins: mixins,
            providers: providers,
            vars: vars,
            imports: imports,
            routeAware: routeAware
        };
        return rootWidget;
    }

    private callOnResolved(widget: WidgetModel) {
        if (!widget) {
            return;
        }

        if (widget.onResolved) {
            widget.onResolved.forEach(a => a && a(widget));
            widget.onResolved = null as any;
        }
        
        if (widget.wrappedWidgets) {
            widget.wrappedWidgets.forEach(w => {
                this.callOnResolved(w);
            });
        }
        widget.properties.forEach(p => {
            let property = p;
            if (p.dataType === 'propertyElement') {
              // unwrap the contained property
              property = p.value as any;
            }
            if (property.dataType === 'widget') {
                this.callOnResolved(property.value as any);
            }
            else if (property.dataType === 'widgetList') {
                (property.value as WidgetModel[]).forEach(w => {
                    this.callOnResolved(w);
                });
            }
        });
    }

    private getChildWidget(rootElement: parseXml.Element) {
        return rootElement.children
            .filter(a => a.type === 'element' && ['var', 'param', 'provider', 'with'].indexOf((a as parseXml.Element).name) === -1)[0] as parseXml.Element;
    }

    private resolveMixins(rootElement: parseXml.Element): string[] {
        const nodes = rootElement.children.filter(a => a.type === 'element' && (a as parseXml.Element).name === 'with') as parseXml.Element[];
        const params: string[] = nodes
            .map(n => {
                return n.attributes['mixin'];
            })
            .filter(a => !!a);

        return params;
    }

    private resolveImports(attrs: any): ImportModel[] {
        const imports: ImportModel[] = [];
        Object.keys(attrs).filter(k => k.startsWith('xmlns')).forEach(k => {
            const name = k.replace('xmlns:', '').replace('xmlns', '');
            const path = attrs[k];
            imports.push({
                // name: name,
                path: path
            });
        });
        return imports;
    }

    private resolveParams(rootElement: parseXml.Element): ParamModel[] {
        const nodes = rootElement.children.filter(a => a.type === 'element' && (a as parseXml.Element).name === 'param') as parseXml.Element[];
        const params: ParamModel[] = nodes.map(n => {
            return {
                type: n.attributes['type'] || 'dynamic',
                name: n.attributes['name'],
                value: n.attributes['value'],
                required: 'required' in n.attributes
            };
        }).filter(a => !!a.name);

        return params;
    }
    
    private resolveProviders(rootElement: parseXml.Element): VariableModel[] {
        const nodes = rootElement.children.filter(a => a.type === 'element' && (a as parseXml.Element).name === 'provider') as parseXml.Element[];
        const params: VariableModel[] = nodes.map(n => {
            return {
                type: n.attributes['type'],
                name: n.attributes['name']
            };
        }).filter(a => !!a.name);

        return params;
    }
    
    private resolveVars(rootElement: parseXml.Element): VariableModel[] {
        const nodes = rootElement.children.filter(a => a.type === 'element' && (a as parseXml.Element).name === 'var') as parseXml.Element[];
        const params: VariableModel[] = nodes.map(n => {
            const value = n.attributes['value'];
            const type = n.attributes['type'];
            const name = n.attributes['name'];
            return {
                type: type ? type : ((value || '').split('(')[0]),
                name: n.attributes['name'],
                value: value
            };
        }).filter(a => !!a.name && !!a.type && !!a.value);

        return params;
    }

    private resolveWidget(element: parseXml.Element, parent: parseXml.Element | null): WidgetResolveResult {
        let widget: WidgetModel = {
            type: element.name,
            controllers: [],
            vars: [],
            formControls: [],
            properties: [],
            wrappedWidgets: [],
            onResolved: []
        };

        // propertyElement
        const propertyElementResult = this.checkIfPropertyElement(element);
        widget.isPropertyElement = propertyElementResult.isPropertyElement;
        const propertyElementProperties: any[] = [];
        
        // *bug: XmlParser doesn't parse comments
        widget.comments = element.children.filter(a => a.type === 'comment').map(a => a as parseXml.Comment).map(a => a.content.trim()).filter(a => !!a);
        
        // children
        this.resolveChildren(element, widget, parent);
        
        // content child
        this.resolveContentChildData(element, widget);
        
        // properties
        const wrapperWidget = this.propertyResolver.resolveProperties(element, widget);

        // controllers
        widget.controllers = [...(widget.controllers || []), ...this.resolveControllers(widget.properties)];

        //
        // property element e.g.: <AppBar.title></AppBar.title> or just <title></title>
        //
        if (propertyElementResult.isPropertyElement) {
            // unwrap widget
            propertyElementProperties.push(...widget.properties.filter(a => a.dataType !== 'widgetList' && a.dataType !== 'widget'));
            const widgetProp = widget.properties.filter(a => a.dataType === 'widgetList' || a.dataType === 'widget')[0];
            const contentWidget = (widgetProp ? widgetProp.value as WidgetModel : null) as any;
            widget = contentWidget;
        }

        // replace widget with the wrap one if there is a wrapper
        if (wrapperWidget) {
            widget = wrapperWidget;
        }

        const result = {
            widget: widget,
            isPropertyElement: propertyElementResult.isPropertyElement,
            propertyElement: propertyElementResult.name,
            propertyElementProperties: propertyElementProperties
        };
        return result;
    }

    private resolveChildren(element: parseXml.Element, widget: WidgetModel, parent: parseXml.Element | null) {
        const childrenWidgets: WidgetModel[] = [];
        const childrenElements = element.children.filter(a => a.type === 'element').map(a => a as parseXml.Element);

        for (const child of childrenElements) {
            const childResult = this.resolveWidget(child, element);
            if (!childResult) {
                continue;
            }
            
            if (childResult.isPropertyElement) {
                // check if we want to treat it as a custom element and not a property <if>...</if>
                const propertyHandler = this.propertyHandlerProvider.get(childResult.propertyElement);
                if (propertyHandler && propertyHandler.canResolvePropertyElement()) {
                    const propertyElementWidget: WidgetModel | null = propertyHandler.resolvePropertyElement(
                        child, childResult, element, childrenElements, 
                        (el, parent) => this.resolveWidget(el, parent));
                    if (propertyElementWidget) {
                        childResult.isPropertyElement = false;
                        childrenWidgets.push(propertyElementWidget);
                    }
                }
                else {
                    // this child is a property element <title>...</title>
                    this.addElementAsAttribute(element, childResult);
                }
            }
            else {
                // append element to children
                childrenWidgets.push(childResult.widget);
            }
        }

        const hasArrayAttribute = 'array' in element.attributes;
        // children & child properties
        if (childrenWidgets.length > 1 || hasArrayAttribute || this.hasChildrenProperty(element.name, parent ? parent.name : '')) {
            widget.properties.push({
                dataType: 'widgetList',
                name: 'children',
                value: childrenWidgets
            });
        }
        else if (childrenWidgets.length === 1) {
            widget.properties.push({
                dataType: 'widget',
                name: 'child',
                value: childrenWidgets[0]
            });
        }
    }
    
    private resolveContentChildData(element: parseXml.Element, widget: WidgetModel) {
        //e.g. <Text>content goes here</Text>

        const contentChild = element.children
            .filter(a => a.type === 'text' && (a as parseXml.Text).text.trimLeft().trimRight())
            .map(a => a as parseXml.Text)[0]; // todo take all node and join them as one.
        
        if (contentChild) {
            const value = contentChild.text ? contentChild.text.trimLeft().trimRight() : '';
            if (value && value !== '') {
                const result = this.propertyResolver.resolveProperty(element, '', value, widget, widget);
                widget.properties.push(result.property);
            }
        }
    }

    private addElementAsAttribute(element: parseXml.Element, childResult: { widget: WidgetModel, propertyElementProperties: any[], propertyElement: string }) {
        const attrValue = {
            dataType: childResult.widget instanceof Array ? 'widgetList' : 'widget',
            // name: childResult.propertyElement,
            value: childResult.widget,
            extraData: { properties: childResult.propertyElementProperties }
        };

        if (element.attributes[childResult.propertyElement]) {
            // if the previous value is not an array, then make it an array.
            if (!(element.attributes[childResult.propertyElement] as any instanceof Array)) {
                element.attributes[childResult.propertyElement] = [element.attributes[childResult.propertyElement]] as any;
            }

            // append the new value to the array.
            (element.attributes[childResult.propertyElement] as any).push(attrValue);
        }
        else {
            element.attributes[childResult.propertyElement] = attrValue as any;
        }
    }

    private hasChildrenProperty(name: string, parentName: string): boolean {
        const elementsHaveChildren = [
            'Column', 'Row', 'ListView', 'GridView', 'Stack', 'Wrap', 
            ...this.getWidgetsWithChildrenProperty()
        ];
        let result = !!elementsHaveChildren.find(a => a === name);

        if (!result) {
            const arrayProperties: any = {
                'DropdownButton': ['items']
            };
            result = arrayProperties[parentName] && arrayProperties[parentName].filter((a: any) => a === name).length === 1 || 
                !!this.config.arrayProperties && this.config.arrayProperties[parentName] && this.config.arrayProperties[parentName].filter(a => a === name).length === 1;
        }

        return result;
    }

    private getWidgetsWithChildrenProperty(): string[] {
        const items = this.config.arrayProperties || {};
        return Object
            .keys(items)
            .filter(k => {
                return items[k].filter(a => a === 'children').length > 0;
            });
    }

    private resolveControllers(properties: PropertyModel[]): VariableModel[] {
        const controllers = properties
            .filter(a => !!a.controller)
            .map(a => a.controller as any);
        return controllers;
    }

    private checkIfPropertyElement(element: parseXml.Element): { name: string, isPropertyElement: boolean } {
        const dotIndex = element.name.indexOf('.');
        let childPropName = '';
        let isPropertyElement = false;
        if (dotIndex > -1) {
            // example: <AppBar.body>
            childPropName = element.name.substring(dotIndex + 1);
            isPropertyElement = true;
        }
        else if (/[a-z]/.test(element.name[0])) {
            // example: <body>
            childPropName = element.name;
            isPropertyElement = true;
        }

        return { name: childPropName, isPropertyElement };
    }
}
