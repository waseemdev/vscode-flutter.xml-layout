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
        else if (!originalValue.startsWith('Colors.') && 
                !originalValue.startsWith('ctrl.') &&
                /^[a-zA-Z0-9\.\s*]+$/ig.test(originalValue) &&
                !originalValue.startsWith('widget.')) {
            const dotsCount = (originalValue.match(/\./g) || []).length;
            if (dotsCount === 1 && (originalValue.indexOf('.shade') > -1 || originalValue.indexOf('.with') > -1 && originalValue.indexOf('(') > -1) ||// e.g. accept red, red.shaded100, red.with*()
                dotsCount === 0) {
                value = `Colors.${originalValue}`;
                handled = true;
            }
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