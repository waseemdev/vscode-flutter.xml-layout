import { AttributeModel, WidgetModel } from "../models/models";
import { ItemBuilderHandler } from "./item-builder";

export class ItemBuilderPropertyHandler extends ItemBuilderHandler {
    isElement = false;
    valueSnippet = 'item of ${0:ctrl.items}';

    protected resolveValueProperty(widget: WidgetModel, attr: AttributeModel): { grandparentWidget: WidgetModel | null, hasIndex: boolean | null, indexName: string } {
        let grandparentWidget = null;
        let indexName = 'index';
        let hasIndex = false;
        let value = attr.value;
        
        // only resolve value if it is a property (value="item of items") and not a propertyElement
        if (typeof attr.value !== 'string') {
            return { grandparentWidget, hasIndex, indexName };
        }

        // unwrap widget if it was custom
        if (widget.isCustom) {
            // todo search all nested not only the first child
            grandparentWidget = widget;
            widget = widget.wrappedWidgets[0];
        }

        // if the property isn't an property element like <itemBuilder>
        const propertyElementProperties = widget.properties.filter(a => a.dataType !== 'widgetList' && a.dataType !== 'widget');
        const widgetProp = widget.properties.filter(a => a.dataType === 'widgetList' || a.dataType === 'widget')[0];
        const childWidget = (widgetProp ? widgetProp.value as WidgetModel : null) as any;
        
        if (widgetProp) {
            widget.properties.splice(widget.properties.indexOf(widgetProp), 1);
        }

        // add index if not present
        const ofIndex = value.indexOf(' of ');
        const indexIndex = value.indexOf(',');
        hasIndex = indexIndex < ofIndex && indexIndex !== -1;

        if (!hasIndex) {
            value = 'index, ' + value;
        }
        else {
            indexName = value.substring(0, indexIndex).trim();
        }

        (attr.value as any) = {
            dataType: childWidget instanceof Array ? 'widgetList' : 'widget',
            // name: childResult.propertyElement,
            value: childWidget,
            extraData: {
                properties: [
                    ...propertyElementProperties,
                    {
                        dataType: 'object', value: value, name: 'data'
                    }
                ]
            }
        };

        return { grandparentWidget, hasIndex, indexName };
    }
}