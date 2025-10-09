import { IValueTransformer, ValueTransformResult } from "../providers/value-transformers-provider";


export class EnumValueTransformer implements IValueTransformer {
    enumName: string;
    widgetEnumMap?: { [widgetType: string]: string };

    constructor(enumName: string, widgetEnumMap?: { [widgetType: string]: string }) {
        this.enumName = enumName;
        this.widgetEnumMap = widgetEnumMap;
    }

    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult {
        let enumType = this.enumName;
        
        // If widgetEnumMap is provided, use widget-specific enum type
        if (this.widgetEnumMap && this.widgetEnumMap[widgetType]) {
            enumType = this.widgetEnumMap[widgetType];
        }
        
        const value = this.resolveEnumValue(enumType, originalValue);
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