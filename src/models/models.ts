
export interface RootWidgetModel {
    // name: string;
    stateful: boolean;
    type: string;
    controller: string;
    controllerPath: string;
    rootChild: WidgetModel;
    params: ParamModel[];
    mixins: string[];
    providers: VariableModel[];
    vars: VariableModel[];
    imports: ImportModel[];
    routeAware: boolean;
}

export interface ImportModel {
    // name: string;
    path: string;
}

export interface ParamModel {
    name: string;
    type: string;
    value: string;
    required: boolean;
}

export interface WidgetModel {
    type: string;
    
    controllers: VariableModel[];
    vars: VariableModel[];
    formControls: FormControlModel[];

    properties: PropertyModel[];
    
    wrappedWidgets: WidgetModel[];

    mixins?: string[];
    comments?: string[];

    /**
     * Determines whether the element is a property of the parent widget or not.
     * e.g. title in AppBar is a PropertyElement: <AppBar> <title> ... <title> <AppBar>
     */
    isPropertyElement?: boolean;

    /**
     * Called when the widget and its properties have been resolved.
     */
    onResolved: ((widget: WidgetModel) => void)[];
    
    /**
     * tempDate used only to transfer data from resolve() to generate() in the PropertyHandler.
     */
    tempData?: any;
    
    id?: any;

    /**
     * Determines whether the widget is created by a property handler or not.
     */
    isCustom?: boolean;
}

export interface VariableModel {
    name: string;
    type: string;
    isPrivate?: boolean;
    value?: string;
    skipGenerate?: boolean;
}

export interface FormControlModel {
    name: string;
    type: string;
    controller: string;
}

export interface PropertyModel {
    name: string;
    value: string | WidgetModel | WidgetModel[];
    dataType: 'string' | 'object' | 'widget' | 'widgetList' | 'function' | 'propertyElement';
    skipGeneratingCode?: boolean;
    controller?: VariableModel;
    // isEvent?: boolean;
    // isBound?: boolean;
    extraData?: ExtraDataModel | null;
    generateCodeDelegate?: (widget: WidgetModel, property: PropertyModel, tabsLevel: number) => string;
}

export interface ExtraDataModel {
    //widget?: WidgetModel;
    parameters?: { name: string, type: string }[];
    // variables?: { name: string, type: string, value: string }[];
    [name: string]: any;
}

export interface AttributeModel {
    name: string;
    value: string;
    // isEvent?: boolean;
    // isBound?: boolean;
}
