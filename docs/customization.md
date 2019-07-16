
# Customization
This extension enables you to customize and extend some of its behavior, adding a new wrapper properties or value transfomers...
Add a new file named `fxmllayout.json` in the root level of your project then add your customization as explained in the following documentation:

## 1. Wrapper properties
*****
To create a new wrapper property e.g. `customMargin` add this to the file:
```json
{
  "wrappers": [
    {
      "widget": "Padding",
      "properties":
      [
        {
          "handler": "customMargin",
          "targetProperty": "padding"
        }
      ]
    }
  ]
}
```

Usage in XML:
```XML
<Text customMargin="5" text="'Hello!'" />
```
Result:
```dart
Padding(
  padding: const EdgeInsets.all(5),
  child: Text(
    'Hello!'
  )
)
```

### Wrappers without properties e.g. Center:
If you want to wrap a widget with a parent widget without adding properties, just don't add the `targetProperty` property:
```json
{
  "wrappers": [
    {
      "widget": "Center",
      "properties": [ { "handler": "center" } ]
    }
  ]
}
```

Usage in XML:
```XML
<Text center text="'Hello!'" />
```
Result:
```dart
Center(
  child: Text(
    'Hello!'
  )
)
```

### Wrappers with a named constructor e.g. Transform.translate:

```json
{
  "wrappers": [
    {
      "widget": "Transform.translate",
      "properties": [ { "handler": "translate", "targetProperty": "offset" } ]
    }
  ]
}
```
Usage in XML:
```XML
<Text translate="Offset(10, 20)" text="'Hello!'" />
```
Result:
```dart
Transform.translate(
  offset: Offset(10, 20),
  child: Text(
    'Hello!'
  )
)
```

### Wrappers with properties that have pre-defined values:
```json
{
  "wrappers": [
    {
      "widget": "Align",
      "properties": [ { "handler": "topCenter", "targetProperty": "alignment", "value": "Alignment.topCenter" } ]
    }
  ]
}
```
Usage in XML:
```XML
<Text topCenter text="'Hello!'" />
```
Result:
```dart
Align(
  alignment: Alignment.topCenter,
  child: Text(
    'Hello!'
  )
)
```
In the usage example, even if you provided a value to topCenter will be ignored.

### Wrappers with pre-defined values for other properties:
```json
{
  "wrappers": [
    {
      "widget": "Flexible",
      "properties": [ { "handler": "tightFlex", "targetProperty": "flex" } ],
      "defaults": {
          "fit": "FlexFit.tight"
          ...
      }
    }
  ]
}
```
Usage in XML:
```XML
<Text tightFlex="2" text="'Hello!'" />
```
Result:
```dart
Flexible(
  flex: 2,
  fit: FlexFit.tight,
  child: Text(
    'Hello!'
  )
)
```

### priority
Lets say you created two wrappers properties e.g. `customWidth` and `customMargin` and you expect the result as: `customMargin` -> `customWidth` -> `MyTargetWidget`. so the actual width of the `MyTargetWidget` will be exactly as the value of `customWidth`.
For this to work you should give the priority of `customMargin` a number geater than 100 (default priority), or give the priority of `customWidth` a number less than 100:
```json
{
  "wrappers": [
    {
      "widget": "Container",
      "properties": [ { "handler": "customWidth", "targetProperty": "width" } ],
      "priority": 99 // add this
    },
    {
      "widget": "Padding",
      "properties": [ { "handler": "customMargin", "targetProperty": "padding" } ],
      "priority": 101 // or this or both
    }
  ]
}
```

So the next code:
```XML
<MyTargetWidget customWidth="100" customMargin="10">
    ...
</MyTargetWidget>
```
Will be generated as this:
```dart
Padding(
  padding: const EdgeInsets.all(10),
  child: Container(
    width: 100,
    child: MyTargetWidget(
      ...
    )
  )
)
```

#### Here is the priority table of the built-in proprties:

| Property      | Priority   |
|---------------|------------|
| :repeat       | 1000000    |
| :if           | 100000     |
| :consumer     | 10000      |
| :stream       | 9999       |
| :disable      | 9000       |
| :formControl  | 8000       |
| ***others***  | 100        |
| :childBuilder | -100000    |
| :builder      | -100000    |
| :itemBuilder  | -100000    |
| :switch       | -100000    |
| :text         | -1000000   |
| :icon         | -1000000   |

As a result the `:repeat` will always be the top wrapper if there are another wrappers e.g. `<Text :repeat="..." :if="..." :margin="..." />` the result will be: `repeat each` -> `if` -> `Padding` -> `Text`.


## 2. Child wrapper properties
*****

```json
{
  "childWrappers": [
    {
      "widget": "Padding",
      "properties": [ { "handler": "customPadding", "targetProperty": "padding" } ]
    }
  ]
}
```
Usage:
```XML
<RaisedButton customPadding="8">
    <Icon icon="add" />
</RaisedButton>
```
Result:
```dart
RaisedButton(
  child: Padding(
    padding: const EdgeInsets.all(8),
    child: Icon(Icons.add)
  )
)
```

## 3. Value transformers
*****
Lets say you have a property with some long enum/constant value, for example: `<Row mainAxisAlignment="MainAxisAlignment.center">`. Instead of writting the full name of center enumeration you can create a value transformer for mainAxisAlignment property so you can write this: `<Row mainAxisAlignment="center">`.
The transformer definition should be as follow:
```json
{
  "valueTransformers": [
    {
      "type": "enum",
      "properties": ["mainAxisAlignment"],
      "enumType": "MainAxisAlignment"
    }
  ]
}
```

Also you can still set your own variable without breaking the code: `<Row mainAxisAlignment="ctrl.myMAinAxisAlignment">`.

Current transformer types are:
- enum
- edgeInsets
- color

You can also override the built-in transformers, so if you want to use, for example, `CupertinoIcons` instead of `Icons` can be done by adding this transformer:
```json
{
  "valueTransformers": [
    {
      "type": "enum",
      "properties": ["icon"],
      "enumType": "CupertinoIcons"
    }
  ]
}
```

And you can still use both values by writting the value explicitly:
```XML
 <Icon icon="home" />  <!-- will generate CupertinoIcons.home -->
 <Icon icon="Icons.home" />
 <Icon icon="OtherIcons.home" />
```

## 4. Widgets with the children property
*****
By default, any widget that have more than one child will add the children to `children` property:
```XML
<Column>
    <Text text="'1'" />
    <Text text="'2'" />
    <Text text="'3'" />
</Column>
```
Result:
```dart
Column(
  children: [
    Text('1'),
    Text('2'),
    Text('3')
  ]
)
```

But if you added one child to it, will add the child to `child` property:
```XML
<Column>
    <Text text="'1'" />
</Column>
```
Result:
```dart
Column(
  child: Text('1')
)
```

To solve this problem you have to add the property name explicitly:
```XML
<Column>
  <children>
    <Text text="'1'" />
  </children>
</Column>
```

Instead of doing this everytime, you can add the `Column` widget and its `children` property to `arrayProperties` as follow:
```json
{
  "arrayProperties": {
    "Column": ["children"],
    "Row": ["children"]
    ...
  }
}
```

The type of `children` property will be always considered as an array (hard-coded in this extension), but what about another properties that their type is an array? for example `items` in `DropdownButton`, the same way, if there are more than one child will be considered as an array, but if there is one child only will be added to `child` property of the parent, a simple resolution is to add `array` to the `items`:
```XML
<DropdownButton>
  <items array>
    <DropdownMenuItem ... />
  </items>
</DropdownButton>
```

Another way is to add the `items` to `arrayProperties` so you don't add `array` everytime:
```json
{
  "arrayProperties": {
    "DropdownButton": ["items"],
  }
}
```

## 5. Un-named properties
*****
Some widgets have parameters without names (e.g. Text, Icon), you can add a name for them by specifying the widget and the name you want it as a property:
```json
{
  "unnamedProperties": {
    "Text": "text",
    "Icon": "icon",
    "Image": "source"
  }
}
```
