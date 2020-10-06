import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel, PropertyModel } from '../models/models';
import { makeTabs } from "../utils";
import { PropertyResolver } from "../resolvers/property-resolver";

export class SwitchHandler extends CustomPropertyHandler {
    priority = -100000; // lowest priority

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;
        
        const { casesParentWidget, casesProperty } = this.getSwitchCasesAndParent(widget);
        const tempData: any = {
            casesWidgets: JSON.parse(JSON.stringify(casesProperty.value)) // copy them
        };

        const switchWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [],
            type: ':switch',
            tempData: tempData,
            wrappedWidgets: [], //[widget]
            onResolved: []
        };

        // remove cases from original widget to replace the new one
        const casesWidgets = casesProperty.value as WidgetModel[];
        for (let index = 0; index < casesWidgets.length; index++) {
            const a = casesWidgets[index];
            const hasSwitchCase = (a.properties as any[]).filter(p => p.name === ':switchCase').length === 1;
            if (hasSwitchCase) {
                casesWidgets.splice(casesWidgets.findIndex(t => a === t), 1);
                index--;
            }
        }

        // put switch widget inside the widget that has child or children contains cases
        casesProperty.value = switchWidget;
        casesProperty.name = 'child';
        casesProperty.dataType = 'widget';

        const result = this.propertyResolver.pipeValueResolver.resolve(element, attr.name, attr.value, casesParentWidget, true);
        wrapperWidget = result.wrapperWidget || casesParentWidget;

        // update switch value after apply binding
        tempData.switchValue = result.value;

        return { extraData, wrapperWidget, value: attr.value, handled: true };
    }

    private getSwitchCasesAndParent(widget: WidgetModel): { casesProperty: PropertyModel, casesParentWidget: WidgetModel } {
        const childrenWidgets = widget.properties.filter(a => a.dataType === 'widgetList');
        const childWidget = widget.properties.filter(a => a.dataType === 'widget');
        if (childWidget.length) {
            childrenWidgets.push(childWidget[0]);
        }
        if (childrenWidgets.length) {
            return { casesProperty: childrenWidgets[0], casesParentWidget: widget };
        }

        if (widget.wrappedWidgets) {
            for (const w of widget.wrappedWidgets) {
                const result = this.getSwitchCasesAndParent(w);
                if (result.casesParentWidget) {
                    if (result.casesProperty) {
                        return result;
                    }
                    return this.getSwitchCasesAndParent(w);
                }
            }
        }

        return { casesProperty: null as any, casesParentWidget: null as any };
    }
    
    canGenerate(widget: WidgetModel): boolean {
        return true;
    }

    generate(widget: WidgetModel, tabsLevel: number,
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        const tabs = makeTabs(tabsLevel);
        const tempData = widget.tempData;
        const casesWidgets = (tempData.casesWidgets instanceof Array ? tempData.casesWidgets : [tempData.casesWidgets]) as WidgetModel[];
        const defaultWidget = 'Container(width: 0, height: 0)';
        let cases = '';
        let code = '';

        if (casesWidgets) {
            casesWidgets.filter(a => !!a).forEach(w => {
                const caseProp = w.properties.filter(a => a.name === ':switchCase')[0];
                if (caseProp) {
                    cases += `\n${tabs}    new SwitchCase(${caseProp.value}, \n${tabs}      () => ${generateChildWidgetCode(w, tabsLevel + 3)}\n${tabs}    ),`;
                }
            });
        }

        code += `WidgetHelpers.switchValue(\n${tabs}  ${tempData.switchValue},\n${tabs}  () => ${defaultWidget},\n${tabs}  [${cases}\n${tabs}  ]\n${tabs})`;
        return code;
    }
}