
Imagine that you can do this :
```XML
<Container width="50 | widthPercent"
           height="50 | heightPercent"
           color="blue"
           :text="'Hello world!'"
           :opacity=".9"
           :center
           :if="ctrl.textVisible | behavior" />
```
Instead of this:
```dart
    final size = MediaQuery.of(context).size;
    final widget = StreamBuilder(
      initialData: ctrl.textVisible.value,
      stream: ctrl.textVisible,
      builder: (BuildContext context, snapshot) {
        if (snapshot.data) {
          return Opacity(
            opacity: .9,
            child: Center(
              child: Container(
                color: Colors.blue,
                height: (size.height * 50) / 100.0,
                width: (size.width * 50) / 100.0,
                child: Text(
                  'Hello world!'
                )
              )
            )
          );
        }
        else {
          return Container(width: 0, height: 0);
        }
      }
    );
    return widget;
```
Which is about 20 lines of code, and if you just updated the `:text` property to use a stream variable `:text="ctrl.myTextStream | stream"` that will add another 4 lines of code for the StreamBuilder.


Extension features:
--------
* Separates UI code (widget and widget's state) from the business logic.
* Brings some Angular's features like pipes, conditionals...
* Provides built-in properties & pipes to make the coding much easier.
* Generates localization code depending on json files.
* Forms & animation made easy.
* Customizable! so developers can add their own properties and modify some features.
* Supports Code completion, hover information, Go to Definition, diagnostics and code actions.

# Get Started

1. Install the extension from [vscode marketplace](https://marketplace.visualstudio.com/items?itemName=WaseemDev.flutter-xml-layout)
2. Create a new flutter project
3. Install prerequisites packages:
    * [flutter_xmllayout_helpers](https://pub.dartlang.org/packages/flutter_xmllayout_helpers)
    * [provider](https://pub.dartlang.org/packages/provider)
    * flutter_localizations
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  provider: ^3.0.0+1
  flutter_xmllayout_helpers: ^0.0.6
```
4. Apply one of the following steps:
    * Clear all `main.dart` content then use `fxml_app` snippet to create the app.
    * Modify `main.dart` to use `MultiProvider` from `provider` package:
        - Register `PipeProvider` (from `flutter_xmllayout_helpers` package) as a provider.
        - Register `RouteObserver<Route>` as a provider (only if you want to use RouteAware events in your widgets' controllers).

## Localization:
1. Create `i18n` folder inside `lib` folder and add JSON files named with locale codes e.g. `en.json`.
2. Import `i18n/gen/delegate.dart` in the main file.
3. Register `AppLocalizationsDelegate()` in `localizationsDelegates` parameter of the `MaterialApp`.
4. To use localized text in the UI see [Pipes](./docs/pipes.md) docs.

## XML layout:
1. Create a new folder and name it as your page/widget name e.g. `home`.
2. Then create home.xml file inside `home` folder.
3. Use `fxml_widget` snippet to create the starter layout, modify it as you want then save it. the extension will generate a file named `home.xml.dart` which contains UI code, and `home.ctrl.dart` file (if not exists) that contains the controller class which is the place you should put your code in (will be generated only if you added `controller` property).

Example:
```XML
<HomePage controller="HomeController" routeAware
    xmlns:cupertino="package:flutter/cupertino.dart">

  <Scaffold>

    <appBar>
      <AppBar>
        <title>
          <Text text="'Home'" />
        </title>
      </AppBar>
    </appBar>

    <body>
      <Column mainAxisAlignment="center" crossAxisAlignment="center">
        <Image :use="asset" source="'assets/my_logo.png'" />
        <Text text="'Hello world!'" />
        <Icon icon="CupertinoIcons.home" />
      </Column>
    </body>
  </Scaffold>
</HomePage>
```

`HomePage` (root element) the name of your widget.
`controller` an optional property, the controller name you want to generate.
`routeAware` an optional property, which generates navigation events (`didPush()`, `didPop()`, `didPushNext()` and `didPopNext()`).
`xmlns:*` an optional property(s) used to import packges and files to be used in HomePage class. (in this example we imported cupertino.dart to use CupertinoIcons).


## Controller:
If you added a `controller` property to your widget then will be generated (if not exists), the file looks like this:
```dart
import 'package:flutter/widgets.dart';
import 'home.xml.dart';

class HomeController extends HomeControllerBase {

  //
  // here you can add you own logic and call the variables and methods
  // within the XML file. e.g. <Text text="ctrl.myText" />
  //

  @override
  void didLoad(BuildContext context) {
  }

  @override
  void onBuild(BuildContext context) {
  }

  @override
  void afterFirstBuild(BuildContext context) {
  }

  @override
  void dispose() {
    super.dispose();
  }
}
```

# Features documentation

### 1. [Wrapper properties](./docs/wrapper-properties.md)
### 2. [Pipes](./docs/pipes.md)
### 3. [Custom properties](./docs/custom-properties.md)
### 4. [Injecting providers](./docs/providers.md)
### 5. [Parameters](./docs/parameters.md)
### 6. [Adding controllers to widgets](./docs/controllers.md)
### 7. [Adding mixin to widget's states](./docs/mixins.md)
### 8. [Localization](./docs/localization.md)
### 9. [Developer customization](./docs/customization.md)

