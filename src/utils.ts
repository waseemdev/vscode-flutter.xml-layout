import { PropertyModel, WidgetModel } from "./models/models";


export function extractForLoopParams(value: string) {
    const statements = value.split(',');
    const indexName = statements.length > 1 ? statements[0].trim() : '';
    const segments = (statements.length > 1 ? statements[1] : statements[0]).trim().split(' of ');
    const { itemName, typeName } = extractVarAndType(segments[0]);
    const listName = segments[1];
    return { listName, indexName, itemName, typeName };
}

export function extractVarAndType(value: string): { itemName: string, typeName: string } {
    const statements = value.split(' ');
    if (statements.length === 2) {
        return { itemName: statements[1], typeName: statements[0] };
    }
    else {
        return { itemName: statements[0], typeName: '' };
    }
}

export function spaceAfter(text: string) {
    return text ? text + ' ' : '';
}

export function makeTabs(tabsLevel: number) {
    return [...new Array(tabsLevel + 2)].map(_ => '  ').join('');
}

export function makeVariableName(name: string, value: string) {
    // changing this will break most of the tests

    const res = value
        // replace all non-alphnumeric with underscore
        .replace(/[^a-zA-Z0-9_]/ig, '_')
        // replace multiple underscores with one
        .replace(/__+/g, '_')
        // uppercase first char after underscore
        .replace(/_([a-z])/g, g => g[1].toUpperCase())
        // remove all underscores
        .replace(/_/g, '');
    // lowercase first char
    return res[0].toLowerCase() + res.substring(1);
}

export function makePipeUniqueName(data: { pipes: any[], value: string }) {
    // changing this will not break any tests

    const names = (data.pipes as any[]).map(a => a.name).join('_');

    const res = data.value
        // replace all non-alphnumeric with underscore
        .replace(/[^a-zA-Z0-9_]/ig, '_');
        
    return names + res;
}

export function sortProperties(a: PropertyModel, b: PropertyModel) {
    // changing this will break most of the tests
    
    // un-named will be first
    if (!a.name && b.name) {
        return -1;
    }
    else if (a.name && !b.name) {
        return 1;
    }

    // then widgets (alphabetaclly)
    const aIsWidget = ['widget', 'widgetList', 'function', 'propertyElement'].filter(t => t === a.dataType).length === 1;
    const bIsWidget = ['widget', 'widgetList', 'function', 'propertyElement'].filter(t => t === b.dataType).length === 1;
    if (!aIsWidget && bIsWidget) {
        return -1;
    }
    else if (aIsWidget && !bIsWidget) {
        return 1;
    }

    // then non-widget (alphabetaclly)
    if (a.name > b.name) {
        return 1;
    }
    else if (a.name < b.name) {
        return -1;
    }

    return 0;
}

export function getUniqueBy(array: any[], key: (val: any) => any) {
    return [
        ...new Map(
          array.map(x => [key(x), x])
        ).values()
    ];
}


export function findWidgetByName(name: string, widget: WidgetModel): WidgetModel {
    if (name === widget.type) {
        return widget;
    }
    return findWidgetByName(name, widget.wrappedWidgets[0]);
}