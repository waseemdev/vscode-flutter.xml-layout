

# Passing parameters to widgets
Parameters are used to pass information from one widget to another, and since you can't modify the widget code (generated file), the XML structure enables you to declare the parameter(s) as follow:
```XML
<MyPage controller="MyController">
  <param type="CategoryModel" name="category" />
  ...
</MyPage>
```

And you can access it directly inside XML:
```XML
  <Text text="category.name" />
```

Or in the controller class **after** `didLoad()`, not in the constructor:
```dart
  @override
  void didLoad() {
    print(category.name);
  }
```
