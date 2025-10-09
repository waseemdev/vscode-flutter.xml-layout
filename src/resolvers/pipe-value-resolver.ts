import * as Syntax from '../parser/syntax';
import * as parseXml from '../parser/types';

import { ExtraDataModel, WidgetModel } from "../models/models";
import { makePipeUniqueName, makeVariableName } from "../utils";

import { scan } from "../parser/parser";

export class PipeValueResolver {

    resolve(element: parseXml.Element, name: string, value: string, widget: WidgetModel, addReturn = true): { wrapperWidget: WidgetModel | null, extraData: ExtraDataModel | null, value: string } {
        let wrapperWidget: WidgetModel | null = null;
        let extraData: ExtraDataModel | null = null;

        value = this.prepareValue(value);
        const pipesResult = this.resolvePipes(value);
        const groupedPipesValues: any = {};

        if (pipesResult.groupedPipes) {
            // apply grouped pipes (all pipes that are between braces)
            pipesResult.groupedPipes.forEach(groupedPipe => {
                ({ value, wrapperWidget } = this.applyPipes(value, groupedPipe, wrapperWidget, widget, name, addReturn));
                const pipesNames = makePipeUniqueName(groupedPipe);
                // store pipe actual values
                groupedPipesValues[pipesNames] = value;
            });
        }

        // apply not-grouped pipes
        ({ value, wrapperWidget } = this.applyPipes(value, pipesResult, wrapperWidget, widget, name, addReturn));
        
        // replace pipe values' placeholders with their actual values
        if (pipesResult.groupedPipes) {
            pipesResult.groupedPipes.forEach(groupedPipe => {
                const pipesNames = makePipeUniqueName(groupedPipe);
                const placeholder = '_placeholder_for_' + pipesNames + '_pipes';
                value = value.replace(placeholder, groupedPipesValues[pipesNames]);
                if (wrapperWidget) {
                    wrapperWidget.properties.filter(p => typeof p.value === 'string').forEach(prop => {
                        prop.value = (prop.value as String).replace(placeholder, groupedPipesValues[pipesNames]);
                    });
                }
            });
        }

        return { wrapperWidget, extraData, value };
    }

    private isBoundValue(value: any): boolean {
        return !!value && typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}');
    }

    private prepareValue(value: string): string {
        if (this.isBoundValue(value)) {
            return value.substring(2, value.length - 2);
        }
        return value;
    }


    //
    // stream & future builders
    //

    createStreamBuilder(value: string, initialValue: any, 
        resultVarName: string, widget: WidgetModel, propertyName: string, 
        addReturn: boolean, addNullChecking = true, addLocalVar = true) {
        return this.createCustomBuilder('StreamBuilder', 'stream', value, initialValue, resultVarName, widget, propertyName, addReturn, addNullChecking, addLocalVar);
    }

    createStreamBuilderWithInitialValue(value: string, 
        resultVarName: string, widget: WidgetModel, propertyName: string, 
        addReturn: boolean, addNullChecking = true, addLocalVar = true) {
        return this.createCustomBuilder('StreamBuilder', 'stream', value, `${value}.value`, resultVarName, widget, propertyName, addReturn, addNullChecking, addLocalVar);
    }

    createFutureBuilder(value: string, initialValue: any, 
        resultVarName: string, widget: WidgetModel, propertyName: string, 
        addReturn: boolean, addNullChecking = true, addLocalVar = true) {
        return this.createCustomBuilder('FutureBuilder', 'future', value, initialValue, resultVarName, widget, propertyName, addReturn, addNullChecking, addLocalVar);
    }
    
    createCustomBuilder(builderWidgetName: string, builderPropertyName: string, value: string, initialValue: any, 
        resultVarName: string, widget: WidgetModel, propertyName: string, 
        addReturn: boolean, addNullChecking = true, addLocalVar = true) {
        const parameterNamePrefix = makeVariableName(propertyName, value);
        const snapshotVarName = parameterNamePrefix + 'Snapshot';
        resultVarName = resultVarName || `${parameterNamePrefix}Value`;

        let streamBuilderWidget: WidgetModel = {
            controllers: [],
            vars: [],
            formControls: [],
            properties: [
                {
                    dataType: 'object', value: `${value}`, name: builderPropertyName
                },
                {
                    dataType: 'object', value: `${initialValue ? initialValue : 'null'}`, name: 'initialData'
                },
                {
                    dataType: 'function',
                    name: 'builder',
                    value: '',
                    extraData: {
                        parameters: [
                            { name: 'context', type: 'BuildContext' },
                            { name: `${snapshotVarName}`, type: 'dynamic' }
                        ],
                        logic: [
                            ...(addLocalVar ? [`final ${resultVarName} = ${snapshotVarName}.data;`] : []),
                            ...(addNullChecking ? [
                                `if (${resultVarName} == null) {`,
                                '  return Container(width: 0, height: 0);',
                                '}'
                            ] : [])
                        ],
                        addReturn: addReturn
                    }
                }
            ],
            type: builderWidgetName,
            wrappedWidgets: [widget],
            id: Math.random() * 1000,
            onResolved: [],
            isCustom: true
        };

        // set property value from local variable
        value = `${resultVarName}`;

        return { wrapperWidget: streamBuilderWidget, value };
    }

    //
    // pipes
    //
    
    private applyPipes(value: string,
            pipesResult: { value: string; pipes: { name: string; args: any[]; }[]; groupedPipes: any[]; },
            wrapperWidget: WidgetModel | null,
            widget: WidgetModel,
            name: string,
            addReturn: boolean): { value: string, wrapperWidget: WidgetModel | null } {
        value = pipesResult.value;
        let remainingPipes = pipesResult.pipes;

        // todo add ability to resolve multi-chained stream/future e.g. (streamVar | stream | somePipe | stream).
        
        const streamPipIndex = pipesResult.pipes.findIndex(a => a.name === 'stream');
        const futurePipIndex = pipesResult.pipes.findIndex(a => a.name === 'future');
        const streamWithInitialValuePipIndex = pipesResult.pipes.findIndex(a => a.name === 'behavior'); // this shortcut for (stream:varName.value)
        const hasStream = streamPipIndex > -1;
        const hasFuture = futurePipIndex > -1;
        const hasStreamWithInitialValue = streamWithInitialValuePipIndex > -1;

        if (hasStream) {
            const streamPipe = pipesResult.pipes[streamPipIndex];
            const pipeValue = this.resolvePipeValue(pipesResult.value, pipesResult.pipes.slice(0, streamPipIndex).reverse());
            ({ wrapperWidget, value } = this.createStreamBuilder(pipeValue, streamPipe.args[0], streamPipe.args[1], wrapperWidget || widget, name, addReturn, true, true));
            // remove 'stream' from pipes
            remainingPipes = pipesResult.pipes.slice(streamPipIndex + 1);
        }
        else if (hasStreamWithInitialValue) {
            const streamWithInitialValuePipe = pipesResult.pipes[streamWithInitialValuePipIndex];
            const pipeValue = this.resolvePipeValue(pipesResult.value, pipesResult.pipes.slice(0, streamWithInitialValuePipIndex).reverse());
            ({ wrapperWidget, value } = this.createStreamBuilderWithInitialValue(pipeValue, streamWithInitialValuePipe.args[0], wrapperWidget || widget, name, addReturn, true, true));
            // remove 'stream' from pipes
            remainingPipes = pipesResult.pipes.slice(streamWithInitialValuePipIndex + 1);
        }
        else if (hasFuture) {
            const futurePipe = pipesResult.pipes[futurePipIndex];
            const pipeValue = this.resolvePipeValue(pipesResult.value, pipesResult.pipes.slice(0, futurePipIndex).reverse());
            ({ wrapperWidget, value } = this.createFutureBuilder(pipeValue, futurePipe.args[0], futurePipe.args[1], wrapperWidget || widget, name, addReturn, true, true));
            // remove 'future' from pipes
            remainingPipes = pipesResult.pipes.slice(futurePipIndex + 1);
        }

        // apply remaining pipes to the 'value'
        value = this.resolvePipeValue(value, remainingPipes.reverse());

        return { value, wrapperWidget };
    }

    private resolvePipeValue(value: string, pipes: { name: string, args: any[] }[], index = 0): string {
        if (index >= pipes.length) {
            return value.trim();
        }

        const pipe = pipes[index];
        value = (pipes.length > index + 1 ? this.resolvePipeValue(value, pipes, index + 1) : value).trim();
        return `_pipeProvider.transform(context, "${pipe.name}", ${value}, [${pipe.args.join(', ')}])`;
    }

    private resolvePipes(value: string): { value: string, pipes: { name: string, args: any[] }[], groupedPipes: any[] } {
        // prepare grouped pipes (pipes that are between braces).
        const groupedPipes: { value: string, pipes:{ name: string, args: any[] }[] }[] = [];
        const { groups, output } = this.resolveGroupedPipes(value);
        const result = this.extractPipes(output);
        return { ...result, groupedPipes: groups };
    }

    private resolveGroupedPipes(input: string): { groups: any[], output: string } {
        const stack: { index: number, exp: string }[] = [];
        const groupedPipes: any[] = [];
        let quotedWith = '';
        let hasInterpolation = false;

        const resolvePipes = (start: { index: number, exp: string }, index: number, groupStart: string, groupEnd: string): number => {
            const group = input.substring(start.index + 1, index).trim();
            if (group) {
                const result = this.extractPipes(group);
                if (result.pipes.length) {
                    groupedPipes.push(result);
                    const pipesNames = makePipeUniqueName(result);
                    const placeholder = groupStart + '_placeholder_for_' + pipesNames + '_pipes' + groupEnd;
                    const originalLength = input.length;
                    input = this.replaceAt(input, placeholder, start.index, index);
                    index -= originalLength - input.length;
                }
            }
            return index;
        };

        for (let index = 0; index < input.length; index++) {
            const c = input[index];
            
            // start of ${}
            if (c === '$' && input.length > index && input[index + 1] === '{') {
                stack.push({ exp: c, index });
                hasInterpolation = true;
            }
            // end of ${}
            else if (c === '}') {
                hasInterpolation = false;
                const start = stack.pop();
                if (start) {
                    index = resolvePipes(start, index, '${', '}');
                }
            }
            // if quoted
            else if (quotedWith && !hasInterpolation) {
                // end of quote
                if (quotedWith === c) {
                    quotedWith = '';
                }
            }
            // start of quote
            else if (c === '"' || c === "'") {
                quotedWith = c;
            }
            // start of brace
            else if (c === '(') {
                stack.push({ exp: c, index });
            }
            // end of brace
            else if (c === ')') {
                const start = stack.pop();
                if (start) {
                    index = resolvePipes(start, index, '(', ')');
                }
            }
        }
        return { groups: groupedPipes, output: input };
    }

    private replaceAt(input: string, replace: string, startsAt: number, endsAt: number = -1) {
        const first = input.substring(0, startsAt);
        const second = input.substring((endsAt === -1 ? startsAt : endsAt) + 1);
        return first + replace + second;
    }
    
    private extractPipes(value: string) {
        const pipesReduced = value
            .split(/([^"'\|]+)|("[^"]*")|('[^']*')/g)
            // .split(/([^"\|]+)|("[^"]*")/g)
            .filter(a => a && a.trim())
            .reduce((arr: any[], item) => {
                if (item === '|') {
                    arr.push([true]); // true: there is pipe
                }
                else {
                    arr.length > 1 ? arr[arr.length - 1].push(item) : arr.push([false, item]); // false: no pipes
                }
                return arr;
            }, []);
        
        const hasPipes = pipesReduced.filter(a => a[0]).length > 0;
        if (hasPipes) {
            // concat all items that aren't pipes
            value = pipesReduced.filter(a => !a[0]).map(a => a.slice(1).join('')).join('');
        }

        const pipes = pipesReduced
            .filter(a => a[0]) // get pipes only
            .map(a => {
                const pipeText = a.slice(1).join('');
                const args = this.resolvePipeArgs(pipeText).map(a => a.trim());
                return {
                    name: args[0],
                    args: args.slice(1)
                };
            });
        
        // if (hasPipes) {
        //     // get the 'value' and remove it from pipes
        //     const firstItem = pipes.splice(0, 1)[0];
        //     if (firstItem) {
        //         value = firstItem.name;
        //     }
        // }

        return { value, pipes: hasPipes ? pipes : [] };
    }

    private resolvePipeArgs(args: string): any[] {
        const matches = scan({ xml: args, pos: 0 }, Syntax.Global.PipeArgs);
        return matches;
    }
}
