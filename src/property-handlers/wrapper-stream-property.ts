import { WidgetModel, PropertyModel } from '../models/models';
import { WrapperPropertyHandler } from "./wrapper-property";
import { makeVariableName } from "../until";
import { PropertyResolver } from '../resolvers/property-resolver';

export class WrapperStreamPropertyHandler extends WrapperPropertyHandler {
    constructor(propertyResolver: PropertyResolver) {
        super(propertyResolver,[{ handler: ':stream', targetProperty: 'stream' }], 'StreamBuilder', undefined, 9999); // top priority but less than Consumer
    }

    protected createWrapperWidget(widget: WidgetModel, targetProperty: string, value: string, onWrapped: ((wrapper: WidgetModel) => void)[]): { wrapperWidget: WidgetModel, propertyToUpdateAfterBinding: PropertyModel | null } {
        const parts = value.split(':');
        const streamName = parts[0];
        const initialValue = parts[1];
        let resultVarName = parts[2];
        const parameterNamePrefix = makeVariableName('', streamName);
        const snapshotVarName = parameterNamePrefix + 'Snapshot';
        resultVarName = resultVarName || `${parameterNamePrefix}Value`;

        const wrapperWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'object', value: `${streamName}`, name: 'stream'
                },
                {
                    dataType: 'object', value: `${initialValue ? initialValue : 'null'}`, name: 'initialData'
                },
                {
                    dataType: 'function',
                    name: 'builder',
                    value: '',
                    extraData: {
                        parameters: [
                            { name: 'context', type: 'BuildContext' },
                            { name: `${snapshotVarName}`, type: '' }
                        ],
                        logic: [
                            `final ${resultVarName} = ${snapshotVarName}.data;`
                        ],
                        addReturn: true
                    }
                }
            ],
            type: this.targetWidgetType,
            wrappedWidgets: [widget],
            onResolved: []
        };
        return { wrapperWidget, propertyToUpdateAfterBinding: null };
    }
}