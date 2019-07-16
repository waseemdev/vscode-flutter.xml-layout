
# Injecting providers
You can inject any provider/service you want in the XML file:
```XML
<MyPage controller="MyController">
  <provider type="DataService" name="dataService" />
  ...
</MyPage>
```

Then can be accessed directly in the same XML file, or in the controller class **after** `didLoad()`, not in the constructor.
```dart
  @override
  void didLoad() {
    dataService.doSomething();
  }
```

And don't forget to add the provider/service to your providers:
```dart
  runApp(
    MultiProvider(
      providers: [
        Provider<DataService>(builder: (_) => DataService())
      ],
      ...
    )
  )
```

***Note*** If the type of the provider is `ChangeNotifierProvider` the whole widget will rebuild when the provider changes, and that is by design, so if you don't want to rebuild the whole widget try using [:consumer](./wrapper-properties.md) for this case.
