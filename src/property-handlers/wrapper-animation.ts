import { WidgetModel, PropertyModel, VariableModel } from '../models/models';
import { WrapperPropertyHandler } from "./wrapper-property";
import { makeTabs } from '../utils';
import { PropertyResolver } from '../resolvers/property-resolver';

export class WrapperAnimationHandler extends WrapperPropertyHandler {
    isElement = true;
    elementAttributes: string[] = ['name', 'duration', 'cycles', 'repeats', 'autoTrigger', 'curve'];

    constructor(propertyResolver: PropertyResolver) {
        super(propertyResolver, [{ handler: 'animation', targetProperty: 'animation' }], 'AnimationBuilder');
    }

    protected createWrapperWidget(widget: WidgetModel, targetProperty: string, value: string, onWrapped: ((wrapper: WidgetModel) => void)[]): { wrapperWidget: WidgetModel, propertyToUpdateAfterBinding: PropertyModel | null } {
        if (typeof value === 'string') {
            return null as any;
        }

        let properties: PropertyModel[] = (value as any).extraData.properties;
        const tweenResult = this.getTweens(properties, widget);
        const vars: VariableModel[] = [];
        
        const nameProp = properties.filter(a => a.name === 'name')[0];
        if (nameProp) {
            const animationControllerName = nameProp.value;
            properties.push({
                name: 'key',
                value: `ctrl._${animationControllerName}Key`,
                dataType: 'object'
            });
            vars.push({
                name:`_${animationControllerName}Key`,
                type: 'GlobalKey<AnimationBuilderState>',
                value:`GlobalKey<AnimationBuilderState>()`
            });
            vars.push({
                name:`AnimationBuilderStateMixin get ${animationControllerName} => _${animationControllerName}Key.currentState;`,
                type: '',
                value:``
            });
        }

        properties = properties.filter(a => a.dataType === 'object' && a.name !== 'name');
        properties.forEach(p => {
            switch (p.name) {
                case 'duration':
                    p.value = p.value.toString().indexOf(':') > -1 && p.value.toString().indexOf('(') === -1 ? `Duration(${p.value})` : p.value;
                    break;
                case 'autoTrigger':
                    p.value = p.value === 'true' || p.value !== 'false' ? 'true' : 'false';
                    break;
                case 'curve':
                    p.value = (p.value as string).indexOf('.') > -1 ? p.value : `Curves.${p.value}`;
                    break;
            }
        });

        properties.push({
            dataType: 'function',
            name: 'builderMap',
            value: '',
            extraData: {
                parameters: [
                    { name: 'animations', type: 'Map<String, Animation>' },
                    { name: `child`, type: 'Widget' }
                ],
                addReturn: true
            }
        });

        tweenResult.values.forEach(v => {
            const prop = widget.properties.filter(a => a.name === v.propertyName)[0];
            if (prop) {
                prop.value = v.propertyValue;
            }
            else {
                widget.properties.push({ dataType: 'object', name: v.propertyName, value: v.propertyValue });
            }
        });

        const wrapperWidget: WidgetModel = {
            controllers: [],
            vars: vars,
            formControls: [],
            properties: [
                tweenResult.tweenMap,
                ...properties
            ],
            type: this.targetWidgetType,
            wrappedWidgets: [widget],
            onResolved: [],
            mixins: ['TickerProviderStateMixin']
        };
        return { wrapperWidget, propertyToUpdateAfterBinding: null };
    }

    private getTweens(properties: PropertyModel[], widget: WidgetModel): { tweenMap: PropertyModel, values: { propertyName: string, propertyValue: string}[] } {
        const tweens = properties
            .filter(a => a.dataType === 'propertyElement')
            .map(a => {
                let props = [];
                if ((a.value as any).extraData) {
                    props = ((a.value as any).extraData.properties as any[]);
                }
                return this.createTween(a.name, props);
            })
            .filter(Boolean);
        
        const isTransitionWidget = widget.type.endsWith('Transition');
        const tweenMap: PropertyModel = {
            dataType: 'object',
            value: tweens,
            name: 'tweenMap',
            generateCodeDelegate: this.generateTweensCodeDelegate
        };

        const values = tweens.map(t => {
            return {
                propertyName: t.property,
                propertyValue: `animations["${t.property}"]${isTransitionWidget ? '' : '.value'}`
            };
        });

        return {
            tweenMap, values
        };
    }

    private createTween(name: string, properties: PropertyModel[]): any {
        const begin = properties.filter(a => a.name === 'begin')[0];
        const end = properties.filter(a => a.name === 'end')[0];
        const type = properties.filter(a => a.name === 'type')[0];
        
        if (!type) {
            return null;
        }

        return {
            property: name,
            begin: begin.value,
            end: end.value,
            type: this.getTweenType(type.value as string)
        };
    }

    private getTweenType(type: string) {
        let result = type;
        const knownTypes = ['int', 'double', 'offset'];
        let normalizedType = type[0].toUpperCase() + (type.length > 1 ? type.substring(1) : '');

        if (knownTypes.filter(a => a === type.toLowerCase()).length > 0) {
            if (type === 'offset') {
                result = `Tween<${normalizedType}>`;
            }
            else {
                result = `Tween<${type}>`;
            }
        }
        else {
            result = `${normalizedType}Tween`;
        }

        return result;
    }

    private generateTweensCodeDelegate(widget: WidgetModel, property: PropertyModel, tabsLevel: number): string {
        const tweens = property.value as any[];
        const tabs = makeTabs(tabsLevel);
        const code = tweens
            .map(a => {
                return `${tabs}  "${a.property}": ${a.type}(begin: ${a.begin}, end: ${a.end})`;
            })
            .join(',\n');
        return `${tabs}tweenMap: {\n${code}\n${tabs}}`;
    }
}