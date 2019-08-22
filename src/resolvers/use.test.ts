import { generateWidget, assertEqual } from '../test/shared';

suite("Use Tests", function () {

    test("will generate ListView.builder()", function() {
        const xml = `<ListView :use="builder">
    </ListView>`;
        
        const expected = `
        ListView.builder(children:[],)
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});