import { generateWidget, assertEqual } from '../test/shared';

suite("Wrapper Consumer Property Tests", function () {

    test("basic", function() {
        const xml = `
<Column :consumer="MyProvider myProvider">
  <Text text="myProvider.myVariable" />
</Column>
`;
        
        const expected = `
        Consumer<MyProvider>(
          builder: (BuildContext context, MyProvider myProvider, Widget child) {
            return Column(
              children: [
                Text(
                  myProvider.myVariable,
                ),
              ],
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with another wrapper property like (margin)", function() {
        const xml = `
      <Column :consumer="MyProvider myProvider" :margin="5">
        <Text text="myProvider.myVariable" />
      </Column>
`;
        
        const expected = `
        Consumer<MyProvider>(
          builder: (BuildContext context, MyProvider myProvider, Widget child) {
            return Padding(
              padding: const EdgeInsets.all(5),
              child: Column(
                children: [
                  Text(
                    myProvider.myVariable,
                  ),
                ],
              ),
            );
          },
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});