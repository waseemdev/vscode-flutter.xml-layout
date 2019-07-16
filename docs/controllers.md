
# Adding controllers to widgets
The controllers could be defined with more than way and be accessed directly from the controller class or from the XML file.

The simple way is by specifying the type and the name, and the extension will instantiate it for you:
```XML
<TextField controller="TextEditingController myTextEditingController" />
```
Or
```XML
<TextField controller="myTextEditingController = TextEditingController()" />
```

Another way is to define it within the controller class:
```dart
  final myTextEditingController = new TextEditingController();
```

Sometimes you might need to access the instance of the State, for example, For AnimationControler to work properly, the current State (which inherets from `SingleTickerProviderStateMixin` [mixin](./mixin.md)) must be passed as parameter: `AnimationController(vsync: this)`. for this case you can define it as a `<var />` in the XML file as follow:
```XML
<MyPage controller="MyController">
  <var name="animationController" type="AnimationController" value="AnimationController(vsync: this, duration: Duration(milliseconds: 300))" />
  
  <!-- Or without `type` -->
  <var name="animationController" value="AnimationController(vsync: this, duration: Duration(milliseconds: 300))" />
  ...
</MyPage>
```

***NOTE*** The controllers defined using `<var />` can be accessed within the controller **after** `didLoad()`, not in the constructor:
```dart
  @override
  void didLoad() {
    animationController.forward();
  }
```
