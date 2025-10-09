

export interface ConfigHandlerAndPropertyModel {
    handler: string;
    targetProperty: string;
    value?: string;
}

export interface ConfigWrapper {
    widget: string;
    properties: ConfigHandlerAndPropertyModel[];
    defaults?: { [name: string]: string };
    priority?: number;
}

export interface ConfigValueTransformer {
    properties: string[];
    type: 'enum' | 'color' | 'edgeInsets';
    enumType?: string;
    widgetEnumMap?: { [widgetType: string]: string };
}

export interface Config {
    /**
     * `[ { widget: "Container", properties: [ { handler: ":width", targetProperty: "width" } ] } ]`
     */
    wrappers?: ConfigWrapper[];
    
    /**
     * `[ { widget: "Padding", properties: [ { handler: ":padding", targetProperty: "padding" } ] } ]`
     */
    childWrappers?: ConfigWrapper[];

    /**
     * `[ { properties: ["alignment"], type: "enum", data: "Alignment" } ]`
     */
    valueTransformers?: ConfigValueTransformer[];
    
    /**
     * `{ "Text": "text", "Icon": "icon", "Image": "source" }`
     */
    unnamedProperties?: { [name: string]: string };

    /**
     * `{ "DropdownButton": ["items", "children"] }`
     */
    arrayProperties?: { [name: string]: string[] };

    /**
     * `["items"]`
     */
    controlsWithTextEditingControllers?: string[];
}
