import { ParseXml } from "../parser/parser";
import { WidgetResolver } from "../resolvers/widget-resolver";
import { PropertyHandlerProvider } from "../providers/property-handler-provider";
import assert = require("assert");
import { ValueTransformersProvider } from "../providers/value-transformers-provider";
import { WidgetCodeGenerator } from "../generators/widget-generator";
import { Config } from "../models/config";
import { registerBuiltInValueTransformers, registerBuiltInPropertyHandlers } from "../builtin-handlers";
import { WrapperPropertyHandler } from "../property-handlers/wrapper-property";
import { PipeValueResolver } from "../resolvers/pipe-value-resolver";
import { PropertyResolver } from "../resolvers/property-resolver";

const config: Config = {};
const pipeValueResolver = new PipeValueResolver();
const propertyHandlersProvider = new PropertyHandlerProvider();
const propertyResolver = new PropertyResolver(config, propertyHandlersProvider, pipeValueResolver);
const valueTransformersProvider = new ValueTransformersProvider();
const resolver = new WidgetResolver(config, propertyHandlersProvider, propertyResolver);
const widgetCodeGenerator = new WidgetCodeGenerator(propertyHandlersProvider);
const parser: ParseXml = new ParseXml();


registerBuiltInPropertyHandlers(propertyHandlersProvider, propertyResolver);
registerBuiltInValueTransformers(valueTransformersProvider);


propertyHandlersProvider.register(':topCenter', new WrapperPropertyHandler(propertyResolver, [{ handler: ':topCenter', targetProperty: 'alignment', value: 'Alignment.topCenter' }], 'Align'));
propertyHandlersProvider.register(':testText', new WrapperPropertyHandler(propertyResolver, [{ handler: ':testText', targetProperty: '' }], 'Text'));
propertyHandlersProvider.register(':topPriority', new WrapperPropertyHandler(propertyResolver, [{ handler: ':topPriority', targetProperty: '' }], 'TopPriorityWidget', undefined, 1000));
propertyHandlersProvider.register(':middlePriority', new WrapperPropertyHandler(propertyResolver, [{ handler: ':middlePriority', targetProperty: '' }], 'MiddlePriorityWidget', undefined, 500));
propertyHandlersProvider.register(':bottomPriority', new WrapperPropertyHandler(propertyResolver, [{ handler: ':bottomPriority', targetProperty: '' }], 'BottomPriorityWidget', undefined, 10));



export function generateWidget(xml: string): string {
    xml = `<StatefulWidget name="TestPage" controller="TestController">${xml}</StatefulWidget>`;
    const xmlDoc = parser.parse(xml);
    const resolvedWidget = resolver.resolve(xmlDoc);
    const layoutDart = widgetCodeGenerator.generateWidgetCode(resolvedWidget.rootChild, 0);
    return layoutDart;
}


export function assertEqual(actual: string, expected: string) {
    expected = expected.replace(/\s/ig, '');
    actual = actual.replace(/\s/ig, '');
    assert.equal(actual, expected);
}
