

# Passing parameters to widgets
Parameters are used to pass data from one widget to another, and since you can't modify the widget code (generated file), the XML structure enables you to declare the parameter(s) as follow:
```XML
<MyPage controller="MyController">
  <param type="CategoryModel" name="category" />

  <param type="int" name="index" required="true" />
  <!-- 
    final int index;
    MyPage({@required this.index})
  -->
  
  <param type="UniqueKey" name="key" superParamName="key" />
  <!-- 
    final UniqueKey key;
    MyPage({this.key}) : super(key: key);
  -->
  
  <param type="UniqueKey" superParamName="key" />
  <!-- MyPage({UniqueKey key}) : super(key: key) -->
  ...
</MyPage>
```

And you can access it directly in the XML file:
```XML
  <Text text="ctrl.category.name" />
```

Or in the controller class **after** `didLoad()`, not in the constructor:
```dart
  @override
  void didLoad() {
    print(category.name);
  }
```

Then, from another widget, pass parameter's value as usual:
```xml
<MyWidget category="...value...">
</MyWidget>
```
