import { CustomPropertyHandler, PropertyResolveResult } from "../providers/property-handler-provider";
import * as parseXml from '../parser/types';
import { WidgetModel, ExtraDataModel, AttributeModel } from '../models/models';
import { FormGroupHandler } from "./form-group";
import { PropertyResolver } from "../resolvers/property-resolver";

export class FormControlHandler extends CustomPropertyHandler {
    priority = 8000; // less than :disable

    constructor(private readonly propertyResolver: PropertyResolver) {
        super();
    }

    canResolve(element: parseXml.Element, handlerProperty: string, widget: WidgetModel): boolean {
        return true;
    }
    
    resolve(element: parseXml.Element, attr: AttributeModel, widget: WidgetModel): PropertyResolveResult {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;
        
        const formGroupName = FormGroupHandler.getFormGroup(element) || 'formGroup';
        widget.vars.push({
            name: formGroupName,
            type: 'FormGroup'
        });
        
        const formControlName = `${formGroupName}.get('${attr.value}')`;
        // const formControlName = `${attr.value}FormControl`;
        // widget.vars.push({
        //     name: `FormControl get ${attr.value}FormControl => ${formGroupName}.get('${attr.value}');`,
        //     type: ''
        // });

        let addLocalVar = true;

        if (['TextField', 'TextFormField'].filter(a => a === widget.type).length === 1) {
            addLocalVar = false;
            const controllerName = element.attributes['controller'] ? element.attributes['controller'].split(' ')[1] : '';
            const privateControllerName = `${formGroupName}${attr.value[0].toUpperCase()}${attr.value.length > 1 ? attr.value.substring(1) : ''}Controller`;

            if (!controllerName) {
                // only add controller if there is no one present
                widget.properties.push({
                    dataType: 'object',
                    controller: {
                        name: privateControllerName,
                        type: 'TextEditingController',
                        isPrivate: true
                    },
                    value: privateControllerName,
                    name: 'controller'
                });
            }
            widget.formControls.push({
                name: formControlName,
                controller: controllerName || privateControllerName,
                type: ''
            });
        }
        else {
            widget.properties.push({
                dataType: 'object',
                name: 'value',
                value: `${attr.value}Snapshot.data`
            });
            widget.properties.push({
                dataType: 'object',
                name: 'onChanged',
                value: `(value) => ctrl.${formControlName}.value = value`
            });
        }
        
        const streamBuilder = this.propertyResolver.pipeValueResolver.createStreamBuilder(
            `ctrl.${formControlName}.valueStream`, 
            `ctrl.${formControlName}.value`, 
            '',
            widget, attr.value, true, false, addLocalVar);
        
        attr.value = streamBuilder.value;
        wrapperWidget = streamBuilder.wrapperWidget;

        const valueProp = widget.properties.filter(a => a.name === 'value')[0];
        if (valueProp) {
            valueProp.value = attr.value;
        }

        return { extraData, wrapperWidget, value: attr.value, handled: true };
    }
}