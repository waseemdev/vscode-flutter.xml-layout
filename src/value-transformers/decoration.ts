import { IValueTransformer, ValueTransformResult } from "../providers/value-transformers-provider";


export class DecorationValueTransformer implements IValueTransformer {
    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult {
        let value = originalValue;
        let handled = false;
        
        if (widgetType === 'Text') {
            const values = originalValue.split(' ');
            value = `TextDecoration.combine(${values.map(a => 'TextDecoration.' + a).join(', ')}`;
            handled = true;
        }
        else {
        }

        return {
            handled: handled,
            propertyType: 'object',
            value: value
        };
    }
}