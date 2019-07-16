import { generateWidget, assertEqual } from '../test/shared';

suite("PropertyElement Tests", function () {

    test("will generate a property for lowercase-element", function() {
        const xml = `
    <Container>
        <child>
            <Column />
        </child>
    </Container>`;

        const expected = `
        Container(
            child: Column(
              children: [
                ]
            )
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("lowercase-element with owner widget type", function() {
        const xml = `
    <Container>
        <Container.child>
            <Column />
        </Container.child>
    </Container>`;

        const expected = `
        Container(
            child: Column(
              children: [
                ]
            )
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});