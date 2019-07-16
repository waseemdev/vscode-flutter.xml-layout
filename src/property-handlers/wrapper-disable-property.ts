import { WidgetModel, PropertyModel } from '../models/models';
import { WrapperPropertyHandler } from "./wrapper-property";
import { makeVariableName } from "../until";
import { PropertyResolver } from '../resolvers/property-resolver';

export class WrapperDisablePropertyHandler extends WrapperPropertyHandler {
    constructor(propertyResolver: PropertyResolver) {
        super(propertyResolver,[{ handler: ':disable', targetProperty: 'value' }], 'Disable', undefined, 9000); // greater than other wrappers and less than consumer & stream
    }

    protected createWrapperWidget(widget: WidgetModel, targetProperty: string, value: string, onWrapped: ((wrapper: WidgetModel) => void)[]): { wrapperWidget: WidgetModel, propertyToUpdateAfterBinding: PropertyModel | null } {
        const wrapperWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'object', value: value, name: 'value'
                },
                {
                    dataType: 'object', value: 'eventFunction', name: 'event'
                },
                {
                    dataType: 'function',
                    name: 'builder',
                    value: '',
                    extraData: {
                        parameters: [
                            { name: 'context', type: 'BuildContext' },
                            { name: `event`, type: '' }
                        ],
                        addReturn: true
                    }
                }
            ],
            type: this.targetWidgetType,
            wrappedWidgets: [widget],
            onResolved: []
        };

        widget.onResolved.push((w) => {
            const firstEvent = this.getfirstEvent(w);
            if (firstEvent) {
                wrapperWidget.properties[1].value = firstEvent.value;
                firstEvent.value = 'event';
            }
        });

        onWrapped.push((wrapper) => {
            // remove (:if) statement from the body of builder is StreamBuilder
            // so Disable will be returned regardless of the result of snapshot
            if (wrapper.type === 'StreamBuilder') {
                (wrapper.properties[2].extraData as any).logic = [(wrapper.properties[2].extraData as any).logic[0]];
            }
        });

        return { wrapperWidget, propertyToUpdateAfterBinding: wrapperWidget.properties[0] };
    }

    private getfirstEvent(w: WidgetModel): any {
        // const event = w.properties.filter(a => a.isEvent)[0];
        const event = w.properties.filter(a => /^on[A-Z].*$/g.test(a.name))[0];
        if (event) {
            return event;
        }
        if (w.wrappedWidgets[0]) {
            return this.getfirstEvent(w.wrappedWidgets[0]);
        }
        return null;
    }
}