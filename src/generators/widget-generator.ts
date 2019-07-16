import { RootWidgetModel, WidgetModel, PropertyModel, VariableModel, FormControlModel } from "../models/models";
import { makeTabs, sortProperties } from "../until";
import { PropertyHandlerProvider } from "../providers/property-handler-provider";


export class WidgetCodeGenerator {
    private readonly propertyHandlerProvider: PropertyHandlerProvider;

    constructor(propertyHandlerProvider: PropertyHandlerProvider) {
        this.propertyHandlerProvider = propertyHandlerProvider;
    }

    generateWidgetCode(widget: WidgetModel, tabsLevel: number): string {
        if (!widget) {
            return '';
        }

        // custom generated code for custom widgets e.g. (if)
        const customGenerator = this.propertyHandlerProvider.get(widget.type);
        if (customGenerator && customGenerator.canGenerate(widget)) {
            return customGenerator.generate(widget, tabsLevel, (w, l) => this.generateWidgetCode(w, l), (w, p, l) => this.generatePropertyCode(w, p, l));
        }
        
        let props: string[] = [];
        const tabs = makeTabs(tabsLevel);

        const properties = widget.properties.sort(sortProperties).filter(a => !a.skipGeneratingCode);

        for (const prop of properties) {
            let propCode = this.generatePropertyCode(widget, prop, tabsLevel + (widget.isPropertyElement ? 0: 1));
            if (propCode) {
                props.push(propCode);
            }
        }
        
        let code = '';

        if (widget.comments && widget.comments.length) {
            code = widget.comments.map(a => a.trim()).filter(a => !!a).join('\n' + tabs) + '\n';
        }

        const propsCode = props.filter(a => a.trim()).join(',\n');
        if (!widget.isPropertyElement && widget.type) {
            code += `${widget.type}(\n${propsCode}\n${tabs})`;
        }
        else {
            code += propsCode;
        }
        return code;
    }

    private generatePropertyCode(widget: WidgetModel, prop: PropertyModel, tabsLevel: number, addTabsAtStart = true): string {
        const customGenerator = this.propertyHandlerProvider.get(prop.name);
        if (customGenerator && customGenerator.canGenerate(widget)) {
            return customGenerator.generate(widget, tabsLevel, (w, l) => this.generateWidgetCode(w, l), (w, p, l) => this.generatePropertyCode(w, p, l));
        }

        if (prop.generateCodeDelegate) {
            return prop.generateCodeDelegate(widget, prop, tabsLevel);
        }

        if (!prop.value && (prop.dataType === 'widget' || prop.dataType === 'widgetList')) {
            return '';
        }

        const tabs = makeTabs(tabsLevel);
        let code = addTabsAtStart && !widget.isPropertyElement ? tabs : '';

        if (prop.name && !widget.isPropertyElement) {
            code += `${prop.name}: `;
        }
        
        switch (prop.dataType) {
            case 'string':
            case 'object':
                code += `${prop.value}`;
                break;
            
            case 'propertyElement':
                code += `${this.generatePropertyCode(widget, prop.value as any, tabsLevel, false)}`;
                break;
        
            case 'widget':
                code += this.generateWidgetCode(prop.value as WidgetModel, tabsLevel);
                break;
        
            case 'widgetList':
                code += `[\n${tabs}  `;
                (prop.value as WidgetModel[]).forEach((widget, i) => {
                    code += this.generateWidgetCode(widget, tabsLevel + 1) + `,\n${tabs}`;
                    if (i + 1 < (prop.value as WidgetModel[]).length) {
                        code += '  ';
                    }
                });
                code += `]`;
                break;
        
            case 'function':
                {
                    const contentTabs = makeTabs(tabsLevel + 1);
                    const data = prop.extraData || {};
                    const params = data.parameters || [];
                    code += `(${params.map(a => `${a.type ? a.type + ' ' : ''}${a.name}`).join(', ')}) {`;
                    
                    // const vars = data.variables || [];
                    // code += `${vars.map(a => `${contentTabs}final ${a.type ? a.type + ' ' : ''}${a.name} = ${a.value};`).join('\n')}`;
                    
                    const logic: string[] = data.logic || [];
                    code += `${logic.length ? '\n' : ''}${logic.map(a => `${contentTabs}${a}`).join('\n')}`;

                    const childWidget = widget.wrappedWidgets[0];
                    if (childWidget) {
                        const content = this.generateWidgetCode(childWidget, tabsLevel + 1);
                        code += `\n${contentTabs}${data.addReturn ? 'return ' : ''}${content}${data.addReturn ? ';' : ''}\n`;
                    }

                    code += `${tabs}}`;
                }
                break;
        }

        return code;
    }
}