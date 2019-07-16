import { WidgetModel, PropertyModel } from '../models/models';
import { WrapperPropertyHandler } from "./wrapper-property";
import { PropertyResolver } from '../resolvers/property-resolver';

export class WrapperConsumerPropertyHandler extends WrapperPropertyHandler {
    constructor(propertyResolver: PropertyResolver) {
        super(propertyResolver,[{ handler: ':consumer', targetProperty: 'consumer' }], 'Consumer', undefined, 10000); // top priority but less than if & repeat
    }

    protected createWrapperWidget(widget: WidgetModel, targetProperty: string, value: string, onWrapped: ((wrapper: WidgetModel) => void)[]): { wrapperWidget: WidgetModel, propertyToUpdateAfterBinding: PropertyModel | null } {
        const parts = value.split(' ');
        const providerTypeName = parts[0];
        const providerInstanceName = parts[1];

        const wrapperWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'function',
                    name: 'builder',
                    value: '',
                    extraData: {
                        parameters: [
                            { name: 'context', type: 'BuildContext' },
                            { name: providerInstanceName, type: providerTypeName },
                            { name: 'child', type: 'Widget' }
                        ],
                        addReturn: true
                    }
                }
            ],
            type: `${this.targetWidgetType}<${providerTypeName}>`,
            wrappedWidgets: [widget],
            onResolved: []
        };
        return { wrapperWidget, propertyToUpdateAfterBinding: null };
    }
}