import { BuilderHandler } from "./builder";
import { AttributeModel, WidgetModel, PropertyModel, AttributeInfo } from "../models/models";
import { PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';

export class ItemBuilderHandler extends BuilderHandler {
    isElement = true;
    elementAttributes: AttributeInfo[] = [
        { name: 'data', snippet: 'item of ${0:items}' },
        { name: 'params' }
    ];

    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {

        let { grandparentWidget, hasIndex, indexName } = this.resolveValueProperty(widget, attr);

        console.log(attr);
        const data = attr.value as any;
        const properties = data.extraData.properties as PropertyModel[];

        const nameIndex = properties.findIndex(a => a.name === 'name');
        if (nameIndex > -1) {
            properties.splice(nameIndex, 1);
        }

        properties.push({
            name: 'name',
            value: 'itemBuilder',
            dataType: 'object'
        });
        // const nameIndex = properties.findIndex(a => a.name === 'name');
        // if (nameIndex === -1) {
        //     properties.push({
        //         name: 'name',
        //         value: 'itemBuilder',
        //         dataType: 'object'
        //     });
        // }

        const hasParams = properties.filter(a => a.name === 'params').length  === 1;
        if (!hasParams) {
            properties.push({
                name: 'params',
                value: 'BuildContext context, int ' + indexName + (widget.type === 'AnimatedList' ? ', Animation animation' : ''),
                dataType: 'object'
            });

            const dataProp = properties.filter(a => a.name === 'data')[0];
            if (dataProp) {
                // add index variable name to data if not present
                const ofIndex = (dataProp.value as string).indexOf(' of ');
                const indexIndex = (dataProp.value as string).indexOf(',');
                hasIndex = indexIndex < ofIndex && indexIndex !== -1;
                if (!hasIndex) {
                    dataProp.value = indexName + ', ' + dataProp.value;
                }
            }
        }

        const resulveResult = super.resolve(element, attr, widget);

        // re-wrap widget if it was custom
        if (grandparentWidget) {
            grandparentWidget.wrappedWidgets = [resulveResult.wrapperWidget as any];
            resulveResult.wrapperWidget = grandparentWidget;
        }

        return resulveResult;
    }

    protected resolveValueProperty(widget: WidgetModel, attr: AttributeModel): { grandparentWidget: WidgetModel | null, hasIndex: boolean | null, indexName: string } {
        let grandparentWidget = null;
        let indexName = 'index';
        let hasIndex = false;
        let value = attr.value;
        
        return { grandparentWidget, hasIndex, indexName };
    }
}