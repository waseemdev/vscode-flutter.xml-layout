
export interface IValueTransformer {
    transform(originalValue: string, name: string, widgetType: string): ValueTransformResult;
}

export interface ValueTransformResult {
    handled: boolean;
    value: string;
    propertyType: string;
}

export class ValueTransformersProvider {
    private readonly resolvers: { [name: string]: IValueTransformer } = {};
    private static instance: ValueTransformersProvider;

    constructor() {
        ValueTransformersProvider.instance = this;
    }

    register(name: string | string[], resolver: IValueTransformer) {
        if (name instanceof Array) {
            name.forEach(n => this.resolvers[n] = resolver);
        }
        else {
            this.resolvers[name] = resolver;
        }
    }

    get(name: string): IValueTransformer {
        return this.resolvers[name];
    }

    static transform(value: string, name: string, widgetType: string): string {
        const valueTransformer = ValueTransformersProvider.instance.get(name);
        let valueTransformResult: ValueTransformResult = {  } as any;
        if (valueTransformer) {
            valueTransformResult = valueTransformer.transform(value, name, widgetType);
            if (valueTransformResult.handled) {
                return valueTransformResult.value;
            }
        }

        return value;
    }
}