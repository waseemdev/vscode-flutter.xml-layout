import { WidgetModel, PropertyModel } from "../models/models";


export function removeDuplicatedBuilders(widget: WidgetModel, parent: WidgetModel | WidgetModel[] | null, parentType: 'wrappedWidgets' | 'widget' | 'widgetList', buildersCache: any) {
    // find and remove duplicated StreamBuilder & FutureBuilder that have same value.
    let detach = false;

    if (widget.type === 'StreamBuilder' || widget.type === 'FutureBuilder') {
        const builderValue = widget.properties[0].value as string;
        if (builderValue in buildersCache && buildersCache[builderValue] && 
            buildersCache[builderValue].type === widget.type && 
            buildersCache[builderValue].widget.id !== widget.id &&
            isParentOf(buildersCache[builderValue].widget, widget)) {
            detach = true;
        }
        else {
            // register as visited
            buildersCache[builderValue] = { type: widget.type, widget: widget };
        }
    }

    // visit wrappedWidgets
    for (const child of widget.wrappedWidgets) {
        removeDuplicatedBuilders(child, widget.wrappedWidgets, 'wrappedWidgets', buildersCache);
    }

    // visit child property
    const childWidgetProp = widget.properties.filter(a => a.dataType === 'widget')[0];
    if (childWidgetProp) {
        removeDuplicatedBuilders(childWidgetProp.value as any, widget, 'widget', buildersCache);
    }

    // visit children property
    const childrenWidgetsProp = widget.properties.filter(a => a.dataType === 'widgetList')[0];
    if (childrenWidgetsProp) {
        for (const child of childrenWidgetsProp.value as any[]) {
            removeDuplicatedBuilders(child, widget, 'widgetList', buildersCache);
        }
    }

    // visit propertyElement(s)
    const propertyElementsProps = widget.properties.filter(a => a.dataType === 'propertyElement');
    for (const propertyElementProp of propertyElementsProps) {
        const propertyValue = (propertyElementProp.value as any);
        if (propertyValue) {
            if (propertyValue.dataType === 'widget') {
                removeDuplicatedBuilders(propertyValue.value as any, widget, 'widget', buildersCache);
            }
            else if (propertyValue.dataType === 'widgetList') {
                for (const child of propertyValue.value as any[]) {
                    removeDuplicatedBuilders(child, widget, 'widgetList', buildersCache);
                }
            }
        }
    }

    // detach builder from the hierarchy.
    // this operation should be last step
    if (detach && parent) {
        if (parentType === 'widget') {
            const childWidgetProp = (parent as WidgetModel).properties.filter(a => a.dataType === 'widget')[0];
            if (childWidgetProp) {
                childWidgetProp.value = widget.wrappedWidgets[0];
            }
        }
        else if (parentType === 'widgetList') {
            const childrenWidgetsProp = (parent as WidgetModel).properties.filter(a => a.dataType === 'widgetList')[0];
            if (childrenWidgetsProp) {
                const index = (childrenWidgetsProp.value as any[]).findIndex(a => a === widget);
                (childrenWidgetsProp.value as any[])[index] = widget.wrappedWidgets[0];
            }
        }
        else if (parentType === 'wrappedWidgets' && parent instanceof Array) {
            const index = parent.findIndex(a => a === widget);
            parent[index] = widget.wrappedWidgets[0];
        }
    }
}

function isParentOf(parent: WidgetModel, child: WidgetModel): boolean {
    const res = getStreamBuilderRecursively(parent, child.id);
    return !!res;
}

//
// we check if there is a stream with streamId in its hierarchy, that includes:
// - all properties: widget, widgetList and propertyElement
// - wrapperWidgets
//
function getStreamBuilderRecursively(parentWidget: WidgetModel, streamId: any): PropertyModel /*| WidgetModel[]*/ | null {
    if (parentWidget.id === streamId) {
        return true as any;
    }

    const getThroughWidgets = (widget: WidgetModel | WidgetModel[]): PropertyModel | null => {
        if (widget) {
            if (widget instanceof Array) {
                for (const w of widget) {
                    const prop = getStreamBuilderRecursively(w, streamId);
                    if (prop) {
                        return prop;
                    }
                }
            }
            else {
                const prop = getStreamBuilderRecursively(widget, streamId);
                if (prop) {
                    return prop;
                }
            }
        }
        return null;
    };

    let childProp = parentWidget.properties.filter(a => a.dataType === 'widget' || a.dataType === 'widgetList')[0];
    if (childProp) {
        if ((childProp.value as WidgetModel).id === streamId) {
            return childProp;
        }

        const res = getThroughWidgets(childProp.value as any);
        if (res) {
            if (res as any === true) {
                return res;
            }
            if ((res.value as WidgetModel).id === streamId) {
                return res;
            }
        }
    }
    else {
        const propertyElementProps = parentWidget.properties.filter(a => a.dataType === 'propertyElement');
        for (const p of propertyElementProps) {
            const w = (p.value as any).value as WidgetModel;
            if (w.id === streamId) {
                return p.value as any;
            }

            let prop = getThroughWidgets(w);
            if (prop) {
                return prop;
            }
            // else if (p.extraData && p.extraData.properties) {
            //     prop = this.getStreamBuilderRecursively(p.extraData as any, streamId);
            //     if (prop) {
            //         return prop;
            //     }
            // }
        }
    }

    if (parentWidget.wrappedWidgets) {
        for (const w of parentWidget.wrappedWidgets) {
            if (streamId === w.id) {
                return parentWidget.wrappedWidgets as any;
            }

            const prop = getStreamBuilderRecursively(w, streamId);
            if (prop) {
                return prop;
            }
        }
    }

    return null;
}