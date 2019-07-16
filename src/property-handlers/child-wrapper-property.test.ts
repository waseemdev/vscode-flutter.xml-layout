import { generateWidget, assertEqual } from '../test/shared';

suite("Child Wrapper Properties Tests", function () {

    test("basic", function() {
        const xml = `<Container :padding="4">
          <Text text="'hello!'" />
        </Container>`;
        
        const expected = `
        Container(
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Text(
              'hello!'
            )
          )
        )`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("with stream", function() {
        const xml = `<Container :padding="paddingStream | stream">
        <Text text="'hello!'" />
      </Container>`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: paddingStream,
          builder: (BuildContext context, paddingStreamSnapshot) {
            final paddingStreamValue = paddingStreamSnapshot.data;
            if (paddingStreamValue == null) {
              return Container(width: 0, height: 0);
            }
            return Container(
              child: Padding(
                padding: paddingStreamValue,
                child: Text(
                  'hello!'
                )
              )
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("test 2", function() {
        const xml = `
        <RaisedButton :text="'hello!'">
        </RaisedButton>
      `;
        
        const expected = `
        RaisedButton(
          child: Text(
            'hello!'
          )
        )`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});