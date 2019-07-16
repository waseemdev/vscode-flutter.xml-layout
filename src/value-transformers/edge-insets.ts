import { IValueTransformer, ValueTransformResult } from "../providers/value-transformers-provider";


export class EdgeInsetsValueTransformer implements IValueTransformer {
    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult {
        let value = originalValue;

        if (/^[0-9\.\s*]*$/ig.test(originalValue)) {
            const segments = originalValue.split(' ');
            
            if (segments.length === 1) {
                value = `all(${originalValue})`;
            }
            else if (segments.length === 2) {
                value = `symmetric(vertical: ${segments[0]}, horizontal: ${segments[1]})`;
            }
            else if (segments.length === 3) {
                value = `fromLTRB(${segments[1]}, ${segments[0]}, ${segments[1]}, ${segments[2]})`;
            }
            else if (segments.length === 4) {
                value = `fromLTRB(${segments[3]}, ${segments[0]}, ${segments[1]}, ${segments[2]})`;
            }
            else {
                value = 'all(0)';
            }
            
            value = 'const EdgeInsets.' + value;
        }

        return {
            handled: true,
            propertyType: 'object',
            value: value
        };
    }
}