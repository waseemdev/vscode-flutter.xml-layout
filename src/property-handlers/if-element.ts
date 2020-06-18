import { CustomPropertyHandler, WidgetResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, PropertyModel, AttributeInfo } from '../models/models';
import { makeTabs } from "../utils";
import { PropertyResolver } from "../resolvers/property-resolver";

interface IfModel {
    condition: any;
    childWidget: WidgetModel[];
}

export class IfElementHandler extends CustomPropertyHandler {
    isElement = true;
    elementAttributes: AttributeInfo[] = [
        { name: 'value' }
    ];
    valueSnippet = 'value="${0:condition}"';

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolvePropertyElement(): boolean {
        return true;
    }

    resolvePropertyElement(ifElement: parseXml.Element, widgetResolveResult: WidgetResolveResult, parent: parseXml.Element, parentChildren: parseXml.Element[], resolveWidget: (element: parseXml.Element, parent: parseXml.Element) => WidgetResolveResult): WidgetModel {
        const ifChains: IfModel[] = [];
        const wrappers: WidgetModel[] = [];
        const multipleChild = widgetResolveResult.widget instanceof Array;
        
        // apply binding for <if> element
        const ifBoundResult = this.propertyResolver.pipeValueResolver.resolve(ifElement, 'value', widgetResolveResult.propertyElementProperties.filter(a => a.name === 'value')[0].value, widgetResolveResult.widget);
        if (ifBoundResult.wrapperWidget && multipleChild) {
            throw new Error("::You can't use behavior or stream pipe on <if> element that has more than one child. Instead wrap the children with Column or Row.");
        }

        const ifConditionValue = ifBoundResult.value;
        const childWidget: any[] = multipleChild ? (widgetResolveResult.widget as any) : [widgetResolveResult.widget];
        wrappers.push(ifBoundResult.wrapperWidget as any);
        ifChains.push({
            condition: ifConditionValue,
            childWidget: [...childWidget]
        });


        //
        let elseWidget = null;
        const ifChildIndex = parentChildren.indexOf(ifElement);
        const children = [...parentChildren.filter((a, i) => i >= ifChildIndex && a.type === 'element').map(a => a as parseXml.Element)];
        let handleChild = false;

        for (const child of children) {
            if (handleChild) {
                if (child.name === 'elseIf' || child.name === 'else') {
                    const childrenWidgets = this.resolveWidgets(child.children.filter(a => a.type === 'element') as parseXml.Element[], parent, resolveWidget);
                    const i = parentChildren.indexOf(child);
                    parentChildren.splice(i, 1);
                    
                    if (child.name === 'else') {
                        elseWidget = childrenWidgets;
                        break;
                    }
                    else {
                        // apply binding for <elseIf> element
                        const elseIfBoundResult = this.propertyResolver.pipeValueResolver.resolve(child, 'value', child.attributes['value'], widgetResolveResult.widget);
                        const elseIfConditionValue = elseIfBoundResult.value;
                        wrappers.push(elseIfBoundResult.wrapperWidget as any);
                        ifChains.push({
                            condition: elseIfConditionValue,
                            childWidget: childrenWidgets
                        });
                    }
                }
                else {
                    break;
                }
            }
            else if (child === ifElement) {
                handleChild = true;
            }
        }

        const ifElementWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [],
            type: 'if',
            tempData: { ifChains, elseWidget },
            wrappedWidgets: [],
            onResolved: [],
            isCustom: true
        };

        let wrapperWidget: WidgetModel | null = this.createWrapperWidget(ifChains, wrappers, ifElementWidget);

        // add ifChains widgets to wrappedWidgets so can be visited lated (e.g. searching controllers)
        ifChains.forEach(a => ifElementWidget.wrappedWidgets.push(...a.childWidget));

        return wrapperWidget || ifElementWidget;
    }

    private resolveWidgets(elements: parseXml.Element[], parent: parseXml.Element, resolveWidget: (element: parseXml.Element, parent: parseXml.Element) => WidgetResolveResult): WidgetModel[] {
        const results = [];
        for (const el of elements) {
            results.push(resolveWidget(el, parent).widget);
        }
        return results;
    }
    
    private createWrapperWidget(ifChains: IfModel[], wrappers: WidgetModel[], ifElementWidget: WidgetModel) {
        const ifChainWidgets: WidgetModel[] = [];
        ifChains.forEach(a => ifChainWidgets.push(...a.childWidget));
        const findIfChainWidget = (w: WidgetModel) => ifChainWidgets.filter(a => a === w).length === 1;
        
        // find and get the parent of first ifChain (if, elseIf) widget
        const getIfWidgetAndItsParent = (w: WidgetModel): WidgetModel => {
            if (w.wrappedWidgets && w.wrappedWidgets[0]) {
                if (!findIfChainWidget(w) && findIfChainWidget(w.wrappedWidgets[0])) {
                    return w;
                }
                else {
                    return getIfWidgetAndItsParent(w.wrappedWidgets[0]);
                }
            }
            return null as any;
        };

        let wrapperWidget: WidgetModel | null = null;
        let lastIfChainWidget: WidgetModel = null as any;

        // link wrappers if any.
        const reversedWrappers = wrappers.filter(a => !!a).reverse();
        for (const wrapper of reversedWrappers) {
            const ifChainParentWidget = getIfWidgetAndItsParent(wrapper);

            // here we detach the ifChain from its parent
            // then attach it to last ifChain
            // then link the parent with wrapperWidget hierarchy

            if (wrapperWidget) {
                lastIfChainWidget.wrappedWidgets = ifChainParentWidget.wrappedWidgets;
                ifChainParentWidget.wrappedWidgets = [wrapperWidget];
                // lastWrappedWidget = result.ifChainWidget;
            }
            else {
                ifElementWidget.wrappedWidgets = ifChainParentWidget.wrappedWidgets;
                ifChainParentWidget.wrappedWidgets = [ifElementWidget];
                lastIfChainWidget = ifElementWidget;
            }
            wrapperWidget = ifChainParentWidget;
        }

        return wrapperWidget;
    }

    canGenerate(widget: WidgetModel): boolean {
        return true;
    }

    generate(widget: WidgetModel, tabsLevel: number,
        generateChildWidgetCode: (widget: WidgetModel, tabsLevel: number) => string,
        generatePropertyCode: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string): string {
        const tabs = makeTabs(tabsLevel);
        const itemTabs = tabs + '      ';
        const elseItemsTabs = tabs + '  ';
        const ifChains: IfModel[] = widget.tempData.ifChains;
        const hasMultipleChild = ifChains.filter(a => a.childWidget.length > 1).length > 0 || widget.tempData.elseWidget && widget.tempData.elseWidget.length > 1;
        const elseWidget: WidgetModel[] = widget.tempData.elseWidget;
        const defaultElseWidget = 'null'; //'Container(width: 0, height: 0)';
        const elseCode = elseWidget ? elseWidget.map(c => generateChildWidgetCode(c, tabsLevel + 1 + (hasMultipleChild ? 1 : 0))).join(`,\n${elseItemsTabs}  `) : defaultElseWidget;

        let code = `${hasMultipleChild ? '...' : ''}WidgetHelpers.ifElseChain${hasMultipleChild ? 'MultiChild' : ''}([\n${tabs}    `;
        code += ifChains.map(a => {
            return `SwitchCase${hasMultipleChild ? 'MultiChild' : ''}(
${tabs}      ${a.condition},
${tabs}      () => ${hasMultipleChild ? `[\n${itemTabs}  ` : ''}${a.childWidget.map(c => generateChildWidgetCode(c, tabsLevel + 3 + (hasMultipleChild ? 1 : 0))).join(`,\n${itemTabs}  `) || 'null'}${hasMultipleChild ? `\n${itemTabs}]` : ''}
${tabs}    ),`;
        }).join(`\n${tabs}    `);

        code += `
${tabs}  ],
${tabs}  () => ${hasMultipleChild ? `[\n${elseItemsTabs}  ` : ''}${elseCode || 'null'}${hasMultipleChild ? `\n${elseItemsTabs}]` : ''}
${tabs})`;

        return code;
    }
}