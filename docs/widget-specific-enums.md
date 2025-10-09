# Widget-Specific Enum Value Transformers

This feature allows you to configure different enum types for the same property name based on the widget type. This is useful when you have multiple widgets that share the same property name but use different enum types.

## Problem

Consider the scenario where you have `MyLabel` and `MyButton` widgets, both with a `weight` property, but they use different enum types:
- `MyLabel` uses `A7LabelWeight` enum
- `MyButton` uses `A7ButtonWeight` enum

With the standard enum value transformer, you could only configure one enum type for the `weight` property, which would be applied to all widgets.

## Solution

The new `widgetEnumMap` configuration allows you to specify different enum types for different widget types.

## Configuration

Add the following to your `fxmllayout.json` file:

```json
{
  "valueTransformers": [
    {
      "type": "enum",
      "properties": ["weight"],
      "widgetEnumMap": {
        "MyLabel": "A7LabelWeight",
        "MyButton": "A7ButtonWeight"
      }
    }
  ]
}
```

## Usage

With this configuration, you can use the same property name with different widgets:

```xml
<!-- This will generate: MyLabel(weight: A7LabelWeight.bold) -->
<MyLabel weight="bold" text="'Hello World'" />

<!-- This will generate: MyButton(weight: A7ButtonWeight.heavy) -->
<MyButton weight="heavy" text="'Click Me'" />
```

## Fallback Behavior

If a widget type is not found in the `widgetEnumMap`, the transformer will:
1. Use the `enumType` value if provided
2. Return the original value unchanged if no `enumType` is specified

## Example with Fallback

```json
{
  "valueTransformers": [
    {
      "type": "enum",
      "properties": ["weight"],
      "enumType": "DefaultWeight",
      "widgetEnumMap": {
        "MyLabel": "A7LabelWeight",
        "MyButton": "A7ButtonWeight"
      }
    }
  ]
}
```

With this configuration:
- `MyLabel` will use `A7LabelWeight`
- `MyButton` will use `A7ButtonWeight`
- Any other widget will use `DefaultWeight`

## Backward Compatibility

This feature is fully backward compatible. Existing configurations using only `enumType` will continue to work as before.