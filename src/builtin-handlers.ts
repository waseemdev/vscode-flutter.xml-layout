import { PropertyHandlerProvider } from "./providers/property-handler-provider";
import { FormControlHandler } from "./property-handlers/form-control";
import { ItemBuilderHandler } from "./property-handlers/item-builder";
import { ChildBuilderHandler } from "./property-handlers/child-builder";
import { IfHandler } from "./property-handlers/if";
import { SwitchHandler } from "./property-handlers/switch";
import { SwitchCaseHandler } from "./property-handlers/switch-case";
import { BuilderHandler } from "./property-handlers/builder";
import { RepeatHandler } from "./property-handlers/repeat";
import { DecorationValueTransformer } from "./value-transformers/decoration";
import { WrapperStreamPropertyHandler } from "./property-handlers/wrapper-stream-property";
import { WrapperDisablePropertyHandler } from "./property-handlers/wrapper-disable-property";
import { WrapperAnimationHandler } from "./property-handlers/wrapper-animation";
import { WrapperPropertyHandler } from "./property-handlers/wrapper-property";
import { ChildWrapperPropertyHandler } from "./property-handlers/child-wrapper-property";
import { ValueTransformersProvider } from "./providers/value-transformers-provider";
import { EdgeInsetsValueTransformer } from "./value-transformers/edge-insets";
import { ColorValueTransformer } from "./value-transformers/color";
import { EnumValueTransformer } from "./value-transformers/enum";
import { IfElementHandler } from "./property-handlers/if-element";
import { WrapperConsumerPropertyHandler } from "./property-handlers/wrapper-consumer-property";
import { ItemBuilderPropertyHandler } from "./property-handlers/item-builder-property";
import { FormGroupHandler } from "./property-handlers/form-group";
import { FormSubmitHandler } from "./property-handlers/form-submit";
import { PropertyResolver } from "./resolvers/property-resolver";


export function registerBuiltInPropertyHandlers(provider: PropertyHandlerProvider, propertyResolver: PropertyResolver) {
    //
    // custom property handlers
    //
    provider.register('builder', new BuilderHandler(propertyResolver));
    provider.register('itemBuilder', new ItemBuilderHandler(propertyResolver));
    provider.register(':itemBuilder', new ItemBuilderPropertyHandler(propertyResolver));
    provider.register(':childBuilder', new ChildBuilderHandler(propertyResolver));  // repeat the content and put them in children property <Column [childBuilder]="item of items">....</Column?
    provider.register(':repeat', new RepeatHandler(propertyResolver)); // repeat the widget itself <Container [repeat]="item of items" />
    provider.register(':if', new IfHandler(propertyResolver));
    provider.register('if', new IfElementHandler(propertyResolver));
    provider.register(':switch', new SwitchHandler(propertyResolver));
    provider.register(':switchCase', new SwitchCaseHandler());
    provider.register(':formControl', new FormControlHandler(propertyResolver));
    provider.register(':formGroup', new FormGroupHandler());
    provider.register(':formSubmit', new FormSubmitHandler(propertyResolver));

    // 
    // child wrappers (the target widget must have a child property)
    //
    provider.register(':padding', new ChildWrapperPropertyHandler(propertyResolver, [{ handler: ':padding', targetProperty: 'padding' }], 'Padding'));
    provider.register(':text', new ChildWrapperPropertyHandler(propertyResolver, [{ handler: ':text', targetProperty: '' }], 'Text', undefined, -1000000)); // must be the lowest priority
    provider.register(':icon', new ChildWrapperPropertyHandler(propertyResolver, [{ handler: ':icon', targetProperty: 'icon' }], 'Icon', undefined, -1000000)); // must be the lowest priority

    //
    // wrapper properties
    //
    provider.register(':margin', new WrapperPropertyHandler(propertyResolver, [{ handler: ':margin', targetProperty: 'padding' }], 'Padding'));
    provider.register(':opacity', new WrapperPropertyHandler(propertyResolver, [{ handler: ':opacity', targetProperty: 'opacity' }], 'Opacity'));
    provider.register(':visible', new WrapperPropertyHandler(propertyResolver, [{ handler: ':visible', targetProperty: 'visible' }], 'Visibility'));
    provider.register(':hero', new WrapperPropertyHandler(propertyResolver, [{ handler: ':hero', targetProperty: 'tag' }], 'Hero'));
    provider.register(':aspectRatio', new WrapperPropertyHandler(propertyResolver, [{ handler: ':aspectRatio', targetProperty: 'aspectRatio' }], 'AspectRatio'));
    provider.register(':center', new WrapperPropertyHandler(propertyResolver, [{ handler: ':center', targetProperty: '' }], 'Center'));
    provider.register(':align', new WrapperPropertyHandler(propertyResolver, [{ handler: ':align', targetProperty: 'alignment' }], 'Align'));
    provider.register(':flex', new WrapperPropertyHandler(propertyResolver, [{ handler: ':flex', targetProperty: 'flex' }], 'Expanded'));
    provider.register([':width', ':height'], new WrapperPropertyHandler(propertyResolver, [{ handler: ':width', targetProperty: 'width' }, { handler: ':height', targetProperty: 'height' }], 'SizedBox'));
    provider.register(':theme', new WrapperPropertyHandler(propertyResolver, [{ handler: ':theme', targetProperty: 'data' }], 'Theme'));
    provider.register(':translate', new WrapperPropertyHandler(propertyResolver, [{ handler: ':translate', targetProperty: 'offset' }], 'Transform.translate'));
    provider.register(':scale', new WrapperPropertyHandler(propertyResolver, [{ handler: ':scale', targetProperty: 'scale' }], 'Transform.scale'));
    provider.register(':rotate', new WrapperPropertyHandler(propertyResolver, [{ handler: ':rotate', targetProperty: 'angle' }], 'Transform.rotate'));
    // provider.register(':textDir', new WrapperPropertyHandler(propertyResolver, [{ handler: ':textDir', targetProperty: 'textDirection' }], 'Directionality'));
    
    
    //
    // custom wrappers
    //
    provider.register(':consumer', new WrapperConsumerPropertyHandler(propertyResolver));
    provider.register(':stream', new WrapperStreamPropertyHandler(propertyResolver));
    provider.register(':disable', new WrapperDisablePropertyHandler(propertyResolver));
    provider.register('apply-animation', new WrapperAnimationHandler(propertyResolver));

    //
    // wrapper events
    //
    provider.register([':onTap', ':onDoubleTap', ':onLongPress'], new WrapperPropertyHandler(propertyResolver, [
            { handler: ':onTap', targetProperty: 'onTap' },
            { handler: ':onDoubleTap', targetProperty: 'onDoubleTap' },
            { handler: ':onLongPress', targetProperty: 'onLongPress' }
        ], 'GestureDetector'));
}

export function registerBuiltInValueTransformers(provider: ValueTransformersProvider) {
    //
    // custom values
    //
    provider.register(['padding', 'margin'], new EdgeInsetsValueTransformer());
    provider.register(['color', 'background', 'backgroundColor', 'decorationColor'], new ColorValueTransformer());
    provider.register(['decoration'], new DecorationValueTransformer());

    //
    // enum and constant values
    //
    provider.register(['fontWeight'], new EnumValueTransformer('FontWeight'));
    provider.register(['textAlign'], new EnumValueTransformer('TextAlign'));
    provider.register(['textBaseline'], new EnumValueTransformer('TextBaseline'));
    provider.register(['textDirection'], new EnumValueTransformer('TextDirection'));
    provider.register(['verticalDirection'], new EnumValueTransformer('VerticalDirection'));
    provider.register(['mainAxisAlignment'], new EnumValueTransformer('MainAxisAlignment'));
    provider.register(['crossAxisAlignment'], new EnumValueTransformer('CrossAxisAlignment'));
    provider.register(['mainAxisSize'], new EnumValueTransformer('MainAxisSize'));
    provider.register(['axis', 'scrollDirection'], new EnumValueTransformer('Axis'));
    provider.register(['icon'], new EnumValueTransformer('Icons'));
}