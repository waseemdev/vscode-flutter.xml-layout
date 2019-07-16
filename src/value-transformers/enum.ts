import { IValueTransformer, ValueTransformResult } from "../providers/value-transformers-provider";


export class EnumValueTransformer implements IValueTransformer {
    enumName: string;

    constructor(enumName: string) {
        this.enumName = enumName;
    }

    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult {
        const value = this.resolveEnumValue(this.enumName, originalValue);
        return {
            handled: true,
            propertyType: 'object',
            value: value
        };
    }

    private resolveEnumValue(enumName: string, value: string): string {
        if (/^[a-zA-Z0-9_]+$/.test(value)) {
            return `${enumName}.${value}`;
        }
        return value;
    }
}