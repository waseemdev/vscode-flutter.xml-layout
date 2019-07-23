
# Custom properties

### 1. :if
Will add/remove the widget from the UI hierarchy according to its value:
```XML
<Text :if="ctrl.showText" text="'Hello world'" />
```
Result:
```dart
WidgetHelpers.ifTrue(ctrl.showText,
  () => Text(
    'Hello world'
  ),
  () => Container(height: 0, width: 0)
);
```

With `stream` [pipe](./pipes.md):
```XML
<Text :if="ctrl.showTextStream | stream" text="'Hello world'" />
```
Result:
```dart
StreamBuilder(
  initialData: null,
  stream: ctrl.showTextStream,
  builder: (BuildContext context, ifSnapshot) {
    final ifValue = ifSnapshot.data;
    if (ifValue == null) {
      return Container(height: 0, width: 0);
    }
    return WidgetHelpers.ifTrue(ifValue,
      () => Text(
        'Hello world'
      ),
      () => Container(height: 0, width: 0)
    );
  }
);
```


### 2. if & elseIf & else
For complex cases you can use if-elseIf-else chaining:
```XML
<Container>
  <if value="(ctrl.status | stream) == Status.success">
    <Icon icon="check" />
  </if>
  <elseIf value="(ctrl.status | stream) == SubscriptionStatus.error">
    <Icon icon="error" />
  </elseIf>
  <else>
    <CircularProgressIndicator />
  </else>
</Container>
```

Result:
```dart
Container(
  child: StreamBuilder(
    initialData: null,
    stream: ctrl.status,
    builder: (BuildContext context, controllerStatusSnapshot) {
      final controllerStatusValue = controllerStatusSnapshot.data;
      if (controllerStatusValue == null) {
        return Container(width: 0, height: 0);
      }
      return WidgetHelpers.ifElseChain([
          SwitchCase(
            (controllerStatusValue) == Status.success,
            () => Icon(
              Icons.check
            )
          ),
          SwitchCase(
            (controllerStatusValue) == SubscriptionStatus.error,
            () => Icon(
              Icons.error
            )
          ),
        ],
        () => CircularProgressIndicator(

        )
      );
    }
  )
)
```

You also can use multiple if-elseIf-else chains:
```XML
<Column>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifCondition | stream">
    <Text text="'elseIf'">
    </Text>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>

	<Divider />
	
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifCondition | stream">
    <Text text="'elseIf'">
    </Text>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Column>
```

### 3. :use
`:use` will create the widget with a named constractor:
```XML
<ListView :use="separated">
    ...
</ListView>
<ListView :use="builder">
    ...
</ListView>
```

Result
```dart
ListView.separated(...),
ListView.builder(...)
```

### 4. builder
Creates a builder function to build the child/children:
```XML
<ListView :use="separated" itemCount="10">
    <builder name="itemBuilder" params="context, index">
        <!-- here you can access (index) param -->
        <Text text="'$index'" />
    </builder>
    <builder name="separatorBuilder" params="context, index">
        <Divider />
    </builder>
</ListView>
```
Result:
```dart
ListView.separated(
  itemCount: 10,
  itemBuilder: (context, index) {
    return Text(
      '$index'
    );
  },
  separatorBuilder: (context, index) {
    return Divider(

    );
  }
);
```

You can use `data` property if you want to loop through a list of items:
```XML
<ListView :use="separated" itemCount="ctrl.items.length">
  <builder name="itemBuilder" params="context, index" data="item of ctrl.items">
    <!-- you can access (index & item) variables -->
    <Text text="item.title" />
  </builder>
  <builder name="separatorBuilder" params="context, index" data="item of ctrl.items">
    <Divider />
  </builder>
</ListView>
```

Result:
```dart
ListView.separated(
  itemCount: ctrl.items.length,
  itemBuilder: (context, index) {
    final item = ctrl.items == null || ctrl.items.length <= index || ctrl.items.length == 0 ? null : ctrl.items[index];
    return Text(
      item.title
    );
  },
  separatorBuilder: (context, index) {
    final item = ctrl.items == null || ctrl.items.length <= index || ctrl.items.length == 0 ? null : ctrl.items[index];
    return Divider(

    );
  }
);
```

***NOTE*** By default, the `builder` will use `index` variable name to determine current item of the list (if `data` is provided), and this name should match the name in the `params`, so if you changed it, for example, `params="context, myIndex"` you must pass it to the data property as well: `data="myIndex, item of ctrl.items"`.
Also, by default, `params` value is `context, index` so you can ignore it, unless the target builder has different parameters.

Another example with `stream` pipe:
```XML
<ListView :use="builder">
    <builder name="itemBuilder" data="item of ctrl.items | stream">
        <Text text="item.title" />
    </builder>
</ListView>
```
Result:
```dart
StreamBuilder(
  initialData: null,
  stream: ctrl.items,
  builder: (BuildContext context, controllerItemsSnapshot) {
    final controllerItemsValue = controllerItemsSnapshot.data;
    if (controllerItemsValue == null) {
      return Container(width: 0, height: 0);
    }
    return ListView.builder(
      itemBuilder: (context, index) {
        final item = controllerItemsValue == null || controllerItemsValue.length <= index || controllerItemsValue.length == 0 ? null : controllerItemsValue[index];
        return Text(
          item.title
        );
      }
    );
  }
);
```

### 5. :itemBuilder
It's a custom `builder` property made specifically for `ListView` and `GridView`. the following code is exactly the same as the previous `builder` example:
```XML
<ListView :itemBuilder="item of ctrl.items | stream">
    <Text text="item.title" />
</ListView>
```


### 6. :childBuilder
Repeats the content child and put them in the `children` property of the target widget:
```XML
<ListView :childBuilder="item of ctrl.items">
    <Text text="item.title" />
</ListView>
```
Result:
```dart
ListView(
  children: WidgetHelpers.mapToWidgetList(ctrl.items, (item, index) {
    return Text(
      item.title
    );
  })
);
```

For large amount of data you should use `itemBuilder` or a custom `builder` instead of `childBuilder`.

***NOTE*** You can't use `childBuilder`, `itemBuilder` or `builder` with each other for the same widget.
Also the content child of `childBuilder`, `itemBuilder` and `builder` must be one widget. Except for `builder` and `itemBuilder` when it has a `switch` or children with `if` condition.


### 7. :repeat
Repeats the widget itself within a widget that has a list property (e.g. `children`):
```XML
<Column>
    <Text :repeat="item of ctrl.titles" text="item.title" />
</Column>
```
Result:
```dart
Column(
  children: [
    ...WidgetHelpers.mapToWidgetList(ctrl.titles, (item, index) {
      return Text(
        item.title
      );
    })
  ]
);
```

In our example the `children` is the default content property of `Column`, so we didn't write it explicitly, but you can specify any list property with `array` tag:
```XML
<MyWidget>
  <headers array>
    <Text :repeat="item of ctrl.headers" text="item.title" />
  </headers>
  <items array>
    <Text :repeat="item of ctrl.items" text="item.title" />
  </items>
</MyWidget>
```

Also you can write more then one `repeat`:
```XML
<Column>
    <Text :repeat="item of ctrl.titles1" text="item.title" />
    <Divider />
    <Text :repeat="item of ctrl.titles2" text="item.title" />
</Column>
```
Result:
```dart
Column(
  children: [
    ...WidgetHelpers.mapToWidgetList(ctrl.titles1, (item, index) {
      return Text(
        item.title
      );
    }),
    Divider(),
    ...WidgetHelpers.mapToWidgetList(ctrl.titles2, (item, index) {
      return Text(
        item.title
      );
    })
  ]
);
```
Another example inside a `builder` that returns a list of widgets:
```XML
<PopupMenuButton>
    <builder name="itemBuilder">
        <PopupMenuItem :repeat="menuItem of ctrl.menuItems" value="menuItem">
            <Text text="menuItem.title" />
        </PopupMenuItem>
    </builder>
</PopupMenuButton>
```
Result:
```dart
PopupMenuButton(
  itemBuilder: (BuildContext context) {
    return WidgetHelpers.mapToWidgetList(ctrl.menuItems, (menuItem, index) {
      return PopupMenuItem(
        value: menuItem,
        child: Text(
          menuItem.title
        )
      );
    });
  }
);
```

***NOTE*** You can't use `stream` or `future` pipes with `:repeat` e.g. `:repeat="item of ctrl.items | stream"`, because the builder function of `StreamBuilder` & `FutureBuilder` returns one widget only.


### 8. :switch & :switchCase
```XML
<AppBar>
    <title :switch="ctrl.selectedTab | stream">
        <Text :switchCase="0" text="'Home'"></Text>
        <Text :switchCase="1" text="Notifications'"></Text>
        <Text :switchCase="2" text="'Profile'"></Text>
    </title>
</AppBar>
```
Result:
```dart
AppBar(
  title: StreamBuilder(
    initialData: null,
    stream: ctrl.selectedTab,
    builder: (BuildContext context, switchSnapshot) {
      final switchValue = switchSnapshot.data;
      if (switchValue == null) {
        return Container(height: 0, width: 0);
      }
      return WidgetHelpers.switchValue(
        switchValue,
        Container(height: 0, width: 0),
        [
          new SwitchCase(0, 
            () => Text(
              'Latest Jobs'
            )
          ),
          new SwitchCase(1, 
            () => Text(
              'Categories'
            )
          ),
          new SwitchCase(2, 
            () => Text(
              'Profile'
            )
          ),
        ]
      );
    }
  )
);
```

The widget that has `:switch` must have a property of Widget type, because the result of `:switch` will return one widget only. So widgets like `Column` can't have a `:switch`.

Also you can't use `:switch` with `:childBuilder` or `:itemBuilder`. for example you can't do this:
```XML
<ListView :switch="item.type" :childBuilder="item of ctrl.items">
    <Text :switchCase="1" text="item.title" />
    <Image :switchCase="0" image="item.imageUrl"></Image>
</ListView>
```
Instead you should do this:
```XML
<ListView :childBuilder="item of ctrl.items">
    <Container :switch="item.type">
        <Text :switchCase="1" text="item.title" />
        <Image :switchCase="0" image="item.imageUrl"></Image>
    </Container>
</ListView>
```

But you can use it with `builder` property:
```XML
<ListView :use="builder">
    <builder name="itemBuilder" :switch="item.type" params="context, index" data="item of ctrl.items">
        <Text :switchCase="1" text="item.title" />
        <Image :switchCase="0" image="item.imageUrl"></Image>
    </builder>
</ListView>
```


### 9. :formControl & :formGroup & :formSubmit
Forms made easy!
`:formControl` handles value changes of the target widget.
`:formGroup` groups multiple `:formControl`s and manage their status.
`:formSubmit` links the button with the formGroup and manage its `disable` property automatically according to the form's status.

Full example:
```XML
<Column :formGroup="loginFormGroup">
  <TextField :formControl="username">
    <decoration>
        <InputDecoration labelText="'username' | translate" errorText="ctrl.loginFormGroup.get('username').firstErrorIfTouched | translate">
        </InputDecoration>
    </decoration>
  </TextField>

  <TextField :formControl="password" obscureText="true">
    <decoration>
        <InputDecoration labelText="'password' | translate" errorText="ctrl.loginFormGroup.get('password').firstErrorIfTouched | translate">
        </InputDecoration>
    </decoration>
  </TextField>

  <RaisedButton :formSubmit="loginFormGroup" :text="'login' | translate" />
  <!-- or manually -->
  <RaisedButton onPressed="ctrl.login" :disable="ctrl.loginFormGroup.submitEnabledStream | stream:ctrl.loginFormGroup.submitEnabled" :text="'login' | translate">
  </RaisedButton>

</Column>
```

Then add the controls in the controller class:
```dart
  MyLoginController() {
    loginFormGroup.addAll([
      FomrControl<String>('username', '', validators: [Validators.required]),
      FomrControl<String>('password', '', validators: [Validators.required])
    ]);
    // add this only if you use :formSubmit
    loginFormGroup.onSubmit(_login);
  }

  Future _login(dynamic data) async {
    final username = data['username'];
    final password = data['password'];
    // login logic goes here...
  }

  // or manually submit
  void login() async {
    await loginFormGroup.validate();
    if (loginFormGroup.valid) {
      final data = formGroup.getValue();
      final username = data['username'];
      final password = data['password'];
      // or
      final username = formGroup.get('username').value;
      final password = formGroup.get('password').value;
      // login logic goes here...
    }
  }
```

- The `:formGroup` is optional, if you didn't add it then the form group will be named as `formGroup`.
- The `:formControl` can be added to `TextField` or any Widget that have `value` property and `onChanged` event like `Switch`, `DropdownButton`:
```XML
  <SwitchListTile :formControl="darkModeEnabled">
    <title>
      <Text text="'Dark mode'" />
    </title>
  </SwitchListTile>

  <DropdownButton :formControl="selectedLocale">
    <items>
      <DropdownMenuItem value="'ar'">
        <Text text="'العربية'" />
      </DropdownMenuItem>
      <DropdownMenuItem value="'en'">
        <Text text="'English'" />
      </DropdownMenuItem>
    </items>
  </DropdownButton>
```

- You can listen to the control changes by passing a callback function to the `changesListener` parameter:
```dart
  @override
  void didLoad(BuildContext context) {
    formGroup.addAll([
      FormControl<bool>('darkModeEnabled', themeChanger.darkModeEnabled, changesListener: _darkModeEnabledChanged),
      FormControl<String>('selectedLocale', localeChanger.localeCode, changesListener: _selectedLocaleChanged),
    ]);
  }

  void _darkModeEnabledChanged(bool value) {
    // change the theme...
  }

  void _selectedLocaleChanged(String value) {
    // change the locale...
  }
```

### 10. animation
`animation` can be applied on any widget easily, it uses a modified version of the [animator](https://github.com/GIfatahTH/animator) but without the usage of the [states_rebuilder](https://pub.dev/packages/states_rebuilder).
`animation` has these properties:
- `curve`: animation curve.
- `duration`: the duration of the animation.
- `autoTrigger`: to determine whether to start the animation at the begining or not.
- `cycles`: the number of forward and backward periods you want your animation to perform before stopping.
- `repeats`: the number of forward periods you want your animation to perform before stopping.

Example:
```XML
<Transform :use="translate">
    <animation curve="easeOut" duration="milliseconds: 300" autoTrigger>
        <offset type="Offset" begin="Offset(0, 0)" end="Offset(50, 200)" />
    </animation>
    <Container color="red" width="200" height="200" />
</Transform>
```
Result:
```dart
AnimationBuilder(
  autoTrigger: true,
  curve: Curves.easeOut,
  duration: Duration(milliseconds: 300),
  tweenMap: {
    "offset": Tween<Offset>(begin: Offset(0, 0), end: Offset(50, 200))
  },
  builderMap: (Map<String, Animation> animations, Widget child) {
    return Transform.translate(
      offset: animations["offset"].value,
      child: Container(
        color: Colors.red,
        height: 200,
        width: 200
      )
    );
  }
);
```

`animation` can be applied on multiple properties as well:
```XML
<Container>
  <animation duration="milliseconds: 1000" autoTrigger cycles="5">
      <color type="color" begin="Colors.blue" end="Colors.red" />
      <width type="double" begin="100" end="200" />
      <height type="double" begin="100" end="300" />
  </animation>
</Container>
```
Result:
```dart
AnimationBuilder(
  autoTrigger: true,
  cycles: 5,
  duration: Duration(milliseconds: 1000),
  tweenMap: {
    "color": ColorTween(begin: Colors.blue, end: Colors.red),
    "width": Tween<double>(begin: 100, end: 200),
    "height": Tween<double>(begin: 100, end: 300)
  },
  builderMap: (Map<String, Animation> animations, Widget child) {
    return Container(
      color: animations["color"].value,
      height: animations["height"].value,
      width: animations["width"].value
    );
  }
);
```

You also can access the `AnimationBuilderState` to trigger the animation manually by specifying the `name` property:
```XML
<Container>
  <animation name="myAnimation" duration="milliseconds: 1000" cycles="5">
      <color type="color" begin="Colors.transparent" end="Colors.red" />
  </animation>
</Container>
```
Then access the variable in the controller class:
```dart
  void trigger() {
    myAnimation.triggerAnimation();
    // or access the AnimationController
    myAnimation.controller.forward();
  }
```
