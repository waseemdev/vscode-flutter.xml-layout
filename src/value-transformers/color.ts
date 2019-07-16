import { IValueTransformer, ValueTransformResult } from "../providers/value-transformers-provider";


export class ColorValueTransformer implements IValueTransformer {
    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult {
        let value;
        let handled = false;
        
        if (originalValue.startsWith('#')) {
            const r = originalValue.substr(1, 2);
            const g = originalValue.substr(3, 2);
            const b = originalValue.substr(5, 2);
            let a = originalValue.substr(7, 2);
            if (!a && a !== '0') {
                a = 'ff';
            }
            value = `Color.fromARGB(${parseInt(a, 16)}, ${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`;
            handled = true;
        }
        else if (!originalValue.startsWith('Colors.') && /^[a-zA-Z0-9\.\s*]+$/ig.test(originalValue)) {
            value = `Colors.${originalValue}`;
            handled = true;
        }
        else {
            value = originalValue;
        }

        return {
            handled: handled,
            propertyType: 'object',
            value: value
        };
    }
}