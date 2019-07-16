import { generateWidget, assertEqual } from '../test/shared';

suite("Pipes Tests", function () {

    test("basic translate", function() {
        const xml = `<Text text="text | translate" />`;

        const expected = `
        Text(
            _pipeProvider.transform(context, "translate", text, [])
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("pipe chaining", function() {
        const xml = `<Text text="text | beforeTranslate | translate | afterTranslate" />`;

        const expected = `
        Text(
            _pipeProvider.transform(context, "afterTranslate", _pipeProvider.transform(context, "translate", _pipeProvider.transform(context, "beforeTranslate", text, []), []), [])
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("pipe groups", function() {
        const xml = `<Text text="(firstText | translate) + ' : ' + (secondText | somePipe)" />`;

        const expected = `
        Text(
            (_pipeProvider.transform(context, "translate", firstText, [])) + ' : ' + (_pipeProvider.transform(context, "somePipe", secondText, []))
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("stream pipe", function() {
        const xml = `<Text text="textStream | stream" />`;

        const expected = `
        StreamBuilder(
          initialData: null,
          stream: textStream,
            builder: (BuildContext context, textStreamSnapshot) {
              final textStreamValue = textStreamSnapshot.data;
              if (textStreamValue == null) {
                return Container(width: 0, height: 0);
              }
              return Text(
                textStreamValue
              );
            }
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("behavior pipe", function() {
        const xml = `<Text text="textBehavior | behavior" />`;

        const expected = `
        StreamBuilder(
          initialData: textBehavior.value,
          stream: textBehavior,
            builder: (BuildContext context, textBehaviorSnapshot) {
              final textBehaviorValue = textBehaviorSnapshot.data;
              if (textBehaviorValue == null) {
                return Container(width: 0, height: 0);
              }
              return Text(
                textBehaviorValue
              );
            }
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("pipe chaining with stream", function() {
        const xml = `<Text text="textStream | beforeStream | stream | afterStream" />`;

        const expected = `
        StreamBuilder(
          initialData: null,
          stream: _pipeProvider.transform(context, "beforeStream", textStream, []),
            builder: (BuildContext context, pipeProviderTransformContextBeforeStreamTextStreamSnapshot) {
              final pipeProviderTransformContextBeforeStreamTextStreamValue = pipeProviderTransformContextBeforeStreamTextStreamSnapshot.data;
              if (pipeProviderTransformContextBeforeStreamTextStreamValue == null) {
                return Container(width: 0, height: 0);
              }
              return Text(
                _pipeProvider.transform(context, "afterStream", pipeProviderTransformContextBeforeStreamTextStreamValue, [])
              );
            }
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("pipe groups with stream", function() {
        const xml = `<Text text="(firstTextStream | stream) + ':' + (secondText | translate)" />`;

        const expected = `
        StreamBuilder(
          initialData: null,
          stream: firstTextStream,
            builder: (BuildContext context, firstTextStreamSnapshot) {
              final firstTextStreamValue = firstTextStreamSnapshot.data;
              if (firstTextStreamValue == null) {
                return Container(width: 0, height: 0);
              }
              return Text(
                (firstTextStreamValue) + ':' + (_pipeProvider.transform(context, "translate", secondText, []))
              );
            }
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("mutiple grouped stream", function() {
        const xml = `<Text text="(firstTextStream | stream) + ':' + (secondTextStream | stream)" />`;

        const expected = `
        StreamBuilder(
            initialData: null,
            stream: secondTextStream,
            builder: (BuildContext context, secondTextStreamSnapshot) {
              final secondTextStreamValue = secondTextStreamSnapshot.data;
              if (secondTextStreamValue == null) {
                return Container(width: 0, height: 0);
              }
              return StreamBuilder(
                initialData: null,
                stream: firstTextStream,
                builder: (BuildContext context, firstTextStreamSnapshot) {
                  final firstTextStreamValue = firstTextStreamSnapshot.data;
                  if (firstTextStreamValue == null) {
                    return Container(width: 0, height: 0);
                  }
                  return Text(
                    (firstTextStreamValue) + ':' + (secondTextStreamValue)
                  );
                }
              );
            }
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("stream pipe - mutiple times - same widget (should generate one StreamBuilder)", function() {
        const xml = `
        <Text foregroundColor="(component.menuVisible | stream) ? Colors.lightBlue : Colors.white"
              backgroundColor="(component.menuVisible | stream) ? Colors.white : Colors.lightBlue">
        </Text>
`;

        const expected = `
        StreamBuilder(
          initialData: null,
          stream: component.menuVisible,
          builder: (BuildContext context, componentMenuVisibleSnapshot) {
            final componentMenuVisibleValue = componentMenuVisibleSnapshot.data;
            if (componentMenuVisibleValue == null) {
              return Container(width: 0, height: 0);
            }
            return Text(
              backgroundColor: (componentMenuVisibleValue) ? Colors.white : Colors.lightBlue,
              foregroundColor: (componentMenuVisibleValue) ? Colors.lightBlue : Colors.white
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("stream pipe - mutiple times - same property (should generate one StreamBuilder)", function() {
        const xml = `
<ClipPath clipper="ContainerClipper((component.menuAnimButtonPosition | stream) >= MediaQuery.of(context).size.height * 0.3 ? (MediaQuery.of(context).size.height * 0.3) - ((component.menuAnimButtonPosition | stream) - (MediaQuery.of(context).size.height * 0.3)) : (component.menuAnimButtonPosition | stream))" >
</ClipPath>
`;

        const expected = `
      StreamBuilder(
        initialData: null,
        stream: component.menuAnimButtonPosition,
          builder: (BuildContext context, componentMenuAnimButtonPositionSnapshot) {
            final componentMenuAnimButtonPositionValue = componentMenuAnimButtonPositionSnapshot.data;
            if (componentMenuAnimButtonPositionValue == null) {
              return Container(width: 0, height: 0);
            }
            return ClipPath(
              clipper: ContainerClipper((componentMenuAnimButtonPositionValue) >= MediaQuery.of(context).size.height * 0.3 ? (MediaQuery.of(context).size.height * 0.3) - ((componentMenuAnimButtonPositionValue) - (MediaQuery.of(context).size.height * 0.3)) : (componentMenuAnimButtonPositionValue))
            );
          }
      )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("tests)", function() {
        const xml = `
      <Column>
        <Text text='"someText | translate"'/>  <!-- valid string -->
        <Text text="'someText | translate'"/>  <!-- valid string -->
        <Text text="'\${someText | translate}'"/>  <!-- valid string -->
        <Text text='"(someText | translate)"'/>  <!-- error -->
        <Text text='"\${(someText | translate)}"'/> <!-- valid pipe -->
        <Text text="'\${someText | translate}'"/> <!-- malformed dart code -->
        <Text text="'\${(someText | translate)}'"/> <!-- valid pipe -->
      </Column>
`;

        const expected = `
        Column(
          children: [
            Text(
              "someText | translate"
            ),
            Text(
              'someText | translate'
            ),
            Text(
              '\${someText | translate}'
            ),
            Text(
              "(_pipeProvider.transform(context, "translate", someText, []))"
            ),
            Text(
              "\${(_pipeProvider.transform(context, "translate", someText, []))}"
            ),
            Text(
              '\${someText | translate}'
            ),
            Text(
              '\${(_pipeProvider.transform(context, "translate", someText, []))}'
            ),
          ]
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});