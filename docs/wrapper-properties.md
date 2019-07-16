
# Wrapper properties
Wrapper properties are an easy way to wrap any widget with another one, so instead of writting this:
```XML
<Opacity opacity=".5">
  <Container>
    <Text text="'Hello!'"/>
  </Container>
</Opacity>
```
You write this:
```XML
<Container :opacity=".5">
  <Text text="'Hello!'"/>
</Container>
```
Or even this:
```XML
<Container :opacity=".5" :text="'Hello1'" />
```

All wrapper properties start with `:` to avoid ambiguity with the real properties which might have the same name so you can write the both of previous examples.

#### 1. :margin
-----------
```XML
<Text :margin="4" text="'Hello!'" />
<Text :margin="1 2" text="'Hello!'" />
<Text :margin="1 2 3" text="'Hello!'" />
<Text :margin="1 2 3 4" text="'Hello!'" />
```
Result:
```dart
Padding(
  padding: const EdgeInsets.all(4),
  child: Text('Hello!')
)
Padding(
  padding: const symmetric(vertical: 1, horizontal: 2),
  child: Text('Hello!')
)
Padding(
  padding: const EdgeInsets.fromLTRB(2, 1, 2, 3),
  child: Text('Hello!')
)
Padding(
  padding: const EdgeInsets.fromLTRB(4, 1, 2, 3),
  child: Text('Hello!')
)
```
The value formatting follows Web standards (top right bottom left).

#### 2. :opacity
-----------
```XML
<Text :opacity="0.5" text="'Hello!'" />
```
Result:
```dart
Opacity(
  opacity: 0.5,
  child: Text('Hello!')
)
```

#### 3. :visible
-----------
```XML
<Text text="'Hello world!'" :visible="false" />
```
Result:
```dart
Visibility(
  visible: false,
  child: Text('Hello world!')
)
```

#### 4. :padding
-----------
This is actualy a child-wrapper that wrap the child widget:
```XML
<Card :padding="4">
    <Text text="'Hello!'"/>
</Card>
```
Result:
```dart
Card(
  child: Padding(
    padding: const EdgeInsets.all(4),
    child: Text(
      'Hello!'
    )
  )
);
```
The target widget must have a `child` property. and for this reason the `Text` can't have a `:padding` but can have a `:margin`.


#### 5. :text
-----------
This also behaves as a child-wrapper but doesn't wrap the child, instead it adds a `Text` child to the target widget:
```XML
<RaisedButton :text="'Hello!'" />
```
Result:
```dart
RaisedButton(
  child: Text(
    'Hello!'
  )
);
```

#### 6. :icon
-----------
Its like `:text` but for icons:
```XML
<RaisedButton :icon="home" />
```
Result:
```dart
RaisedButton(
  child: Icon(
    Icons.home
  )
);
```

#### 7. :width & :height
-----------
Adding one or both of these properties will wrap the target widget with SizedBox:
```XML
<Card :width="100">
    <Text text="'Width only'"/>
</Card>
<Card :height="200">
    <Text text="'Height only'"/>
</Card>
<Card :width="100" :height="200">
    <Text text="'Width and height'"/>
</Card>
```
Result:
```dart
SizedBox(
  width: 100,
  child: Card(
    child: Text(
      'Width only'
    )
  )
),
SizedBox(
  height: 200,
  child: Card(
    child: Text(
      'Height only'
    )
  )
),
SizedBox(
  height: 200,
  width: 100,
  child: Card(
    child: Text(
      'Width and height'
    )
  )
)
```

#### 8. :onTap & :onDoubleTap & :onLongPress
-----------
Wraps the target widget with `GestureDetector` and maps each event to its function:
```XML
<Column :onTap="ctrl.doSomthing"></Column>
```
Result:
```dart
GestureDetector(
  onTap: ctrl.doSomthing,
  child: Column(
    children: [
    ]
  )
)
```

#### 9. :theme
-----------
Wraps the target widget with `Theme`:
```XML
<Text text="'Hello'" :theme="ctrl.myTheme" />
```
Result:
```dart
Theme(
  data: ctrl.myTheme,
  child: Text(
    'Hello'
  )
)
```

Or you could create a custom [pipe](./pipes.md) which provides the themes:
```XML
<Text text="'Hello'" :theme="'my_theme_name' | customTheme" />
```
Result:
```dart
Theme(
  data: _pipeProvider.transform(context, 'customTheme', 'my_theme_name', []),
  child: Text(
    'Hello'
  )
)
```


#### 10. :hero
-----------
Wraps the target widget with `Hero`:

```XML
<Image :use="asset" source="'assets/images/image_name.png'" :hero="'image-cover'" />
```
Result:
```dart
Hero(
  tag: 'image-cover',
  child: Image.asset(
    'assets/images/image_name.png'
  )
)
```


#### 11. :aspectRatio
-----------
Wraps the target widget with `AspectRatio`:
```XML
<Image :use="asset" source="'assets/images/image_name.png'" :aspectRatio="16.0/9.0" />
```
Result:
```dart
AspectRatio(
  aspectRatio: 16.0/9.0,
  child: Image.asset(
    'assets/images/image_name.png'
  )
)
```


#### 12. :center
-----------
Wraps the target widget with `Center`:

```XML
<Text text="'Hello'" :center />
```
Result:
```dart
Center(
  child: Text(
    'Hello'
  )
)
```


#### 13. :align
-----------
Wraps the target widget with `Align`:

```XML
<Text text="'Hello'" :align="Alignment.center" />
```
Result:
```dart
Align(
  alignment: Alignment.center,
  child: Text(
    'Hello'
  )
)
```


#### 14. :flex
-----------
Wraps the target widget with `Expanded`:
```XML
<Text text="'Hello'" :flex="2" />
```
Result:
```dart
Expanded(
  flex: 2,
  child: Text(
    'Hello'
  )
)
```


#### 15. :disable
-----------
Wraps any widget has an event handler (e.g.: onPressed, onChange), the target widget will be disabled according to the `:disable`'s value.
```XML
<RaisedButton onPressed="ctrl.login" :disable="statusStream | stream:true">
    <Text text="'Login'" />
</RaisedButton>
```
Result:
```dart
StreamBuilder(
  initialData: true,
  stream: statusStream,
  builder: (BuildContext context, statusStreamSnapshot) {
    final statusStreamValue = statusStreamSnapshot.data;
    return Disable(
      event: ctrl.login,
      value: statusStreamValue,
      builder: (BuildContext context, event) {
        return RaisedButton(
          onPressed: event,
          child: Text(
            'Login'
          )
        );
      }
    );
  }
)
```


#### 16. :consumer
-----------
`:consumer` wraps the target widget with a `Consumer` widget (which is part of `provider` package), this can be used instead of injecting the [provider](./providers.md) at the top level of the current Widget's State to avoid rebuilding the whole widget when the provider changes.
```XML
<MyWidget :consumer="MyProvider myProvider" title="myProvider.title">
  <Text text="myProvider.greatingText" />
</MyWidget>
```
Result:
```dart
Consumer<MyProvider>(
  builder: (BuildContext context, MyProvider myProvider, Widget child) {
    return MyWidget(
      title: myProvider.title,
      child: Text(
        myProvider.greatingText
      )
    );
  }
)
```
