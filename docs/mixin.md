
# Adding mixin to widget's states
In the previous example we created [AnimationController](./controllers.md) and passed `this` (which is the State with `SingleTickerProviderStateMixin` mixin) to the controller, but how to add this mixin to the widget?
This is done through the `<with />` tag:
```XML
<MyPage controller="MyController">
  <with mixin="SingleTickerProviderStateMixin" />
  ...
</MyPage>
```
