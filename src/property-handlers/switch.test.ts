import { generateWidget, assertEqual } from '../test/shared';

suite("Switch Tests", function () {

    test("basic", function() {
        const xml = `
    <Container :switch="component.selectedTab">
        <Text :switchCase="0" text="'one'"></Text>
        <Text :switchCase="1" text="'two'"></Text>
        <Text :switchCase="2" text="'three'"></Text>
    </Container>
`;

        const expected = `
        Container(
            child: WidgetHelpers.switchValue(
              component.selectedTab,
              () => Container(width: 0, height: 0),
              [
                new SwitchCase(0, 
                  () => Text(
                    'one'
                  )
                ),
                new SwitchCase(1, 
                  () => Text(
                    'two'
                  )
                ),
                new SwitchCase(2, 
                  () => Text(
                    'three'
                  )
                ),
              ]
            )
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with wrapper :margin", function() {
        const xml = `
    <Container :switch="component.selectedTab" :margin="5">
        <Text :switchCase="0" text="'one'"></Text>
        <Text :switchCase="1" text="'two'"></Text>
        <Text :switchCase="2" text="'three'"></Text>
    </Container>
`;

        const expected = `
        Padding(
          padding: const EdgeInsets.all(5),
          child: Container(
            child: WidgetHelpers.switchValue(
              component.selectedTab,
              () => Container(width: 0, height: 0),
              [
                new SwitchCase(0, 
                  () => Text(
                    'one'
                  )
                ),
                new SwitchCase(1, 
                  () => Text(
                    'two'
                  )
                ),
                new SwitchCase(2, 
                  () => Text(
                    'three'
                  )
                ),
              ]
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with child wrapper :padding", function() {
        const xml = `
    <Container :switch="component.selectedTab" :padding="5">
        <Text :switchCase="0" text="'one'"></Text>
        <Text :switchCase="1" text="'two'"></Text>
        <Text :switchCase="2" text="'three'"></Text>
    </Container>
`;

        const expected = `
        Container(
          child: Padding(
            padding: const EdgeInsets.all(5),
            child: WidgetHelpers.switchValue(
              component.selectedTab,
              () => Container(width: 0, height: 0),
              [
                new SwitchCase(0, 
                  () => Text(
                    'one'
                  )
                ),
                new SwitchCase(1, 
                  () => Text(
                    'two'
                  )
                ),
                new SwitchCase(2, 
                  () => Text(
                    'three'
                  )
                ),
              ]
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("basic with stream pipe", function() {
        const xml = `
    <Container :switch="component.selectedTab | stream">
        <Text :switchCase="0" text="'one'"></Text>
        <Text :switchCase="1" text="'two'"></Text>
        <Text :switchCase="2" text="'three'"></Text>
    </Container>
`;

        const expected = `
        StreamBuilder(
          initialData: null,
          stream: component.selectedTab,
          builder: (BuildContext context, componentSelectedTabSnapshot) {
            final componentSelectedTabValue = componentSelectedTabSnapshot.data;
            if (componentSelectedTabValue == null) {
              return Container(width: 0, height: 0);
            }
            return Container(
              child: WidgetHelpers.switchValue(
                componentSelectedTabValue,
                () => Container(width: 0, height: 0),
                [
                  new SwitchCase(0, 
                    () => Text(
                      'one'
                    )
                  ),
                  new SwitchCase(1, 
                    () => Text(
                      'two'
                    )
                  ),
                  new SwitchCase(2, 
                    () => Text(
                      'three'
                    )
                  ),
                ]
              )
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with property-element", function() {
        const xml = `
    <Container>
        <child :switch="component.selectedTab">
            <Text :switchCase="0" text="'one'"></Text>
            <Text :switchCase="1" text="'two'"></Text>
            <Text :switchCase="2" text="'three'"></Text>
        </child>
    </Container>
`;

        const expected = `
        Container(
            child: WidgetHelpers.switchValue(
              component.selectedTab,
              () => Container(width: 0, height: 0),
              [
                new SwitchCase(0, 
                  () => Text(
                    'one'
                  )
                ),
                new SwitchCase(1, 
                  () => Text(
                    'two'
                  )
                ),
                new SwitchCase(2, 
                  () => Text(
                    'three'
                  )
                ),
              ]
            )
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with property-element and stream pipe", function() {
        const xml = `
    <Container>
        <child :switch="component.selectedTab | stream">
            <Text :switchCase="0" text="'one'"></Text>
            <Text :switchCase="1" text="'two'"></Text>
            <Text :switchCase="2" text="'three'"></Text>
        </child>
    </Container>
`;

        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: component.selectedTab,
            builder: (BuildContext context, componentSelectedTabSnapshot) {
              final componentSelectedTabValue = componentSelectedTabSnapshot.data;
              if (componentSelectedTabValue == null) {
                return Container(width: 0, height: 0);
              }
              return WidgetHelpers.switchValue(
                componentSelectedTabValue,
                () => Container(width: 0, height: 0),
                [
                  new SwitchCase(0, 
                    () => Text(
                      'one'
                    )
                  ),
                  new SwitchCase(1, 
                    () => Text(
                      'two'
                    )
                  ),
                  new SwitchCase(2, 
                    () => Text(
                      'three'
                    )
                  ),
                ]
              );
            }
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("will generate [if] that wraps Container then switch", function() {
        const xml = `
    <Container :if="condition" :switch="component.selectedTab">
        <Text :switchCase="0" text="'one'"></Text>
        <Text :switchCase="1" text="'two'"></Text>
        <Text :switchCase="2" text="'three'"></Text>
    </Container>
`;

        const expected = `
        WidgetHelpers.ifTrue(condition,
          () => Container(
            child: WidgetHelpers.switchValue(
              component.selectedTab,
              () => Container(width: 0, height: 0),
              [
                new SwitchCase(0, 
                  () => Text(
                    'one'
                  )
                ),
                new SwitchCase(1, 
                  () => Text(
                    'two'
                  )
                ),
                new SwitchCase(2, 
                  () => Text(
                    'three'
                  )
                ),
              ]
            )
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});