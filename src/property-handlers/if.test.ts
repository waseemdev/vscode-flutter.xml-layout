import { generateWidget, assertEqual } from '../test/shared';

suite("If custom property", function () {

    test("will generate if", function() {
        const xml = `<Text :if="true" />`;
        
        const expected = `
WidgetHelpers.ifTrue(true,
    () => Text(
    ),
    () => null
)`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("will generate if wrapping :disable", function() {
        const xml = `<RasiedButton :if="true" :disable="!enabled" />`;
        
        const expected = `
        WidgetHelpers.ifTrue(true,
          () => Disable(
            event: eventFunction,
            value: !enabled,
            builder: (BuildContext context, event) {
              return RasiedButton(
              );
            },
          ),
          () => null
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("will generate if around a wrapper property like padding", function() {
        const xml = `<Container :if="true" :padding="4">
        <Text text="'hello'" />
    </Container>`;
        
        const expected = `
        WidgetHelpers.ifTrue(true,
          () => Container(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Text(
                  'hello',
                ),
              ),
            ),
            () => null
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});