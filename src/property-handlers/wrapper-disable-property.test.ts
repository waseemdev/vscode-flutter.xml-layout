import { generateWidget, assertEqual } from '../test/shared';

suite("Wrapper Disable Property Tests", function () {

    test("basic", function() {
        const xml = `
    <RaisedButton onPressed="component.login" :disable="component.formGroup.status">
        <Text text="'Login'" />
    </RaisedButton>
`;
        
        const expected = `
        Disable(
          event: component.login,
          value: component.formGroup.status,
          builder: (BuildContext context, event) {
    
            return RaisedButton(
              onPressed: event,
              child: Text(
                'Login',
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with stream", function() {
        const xml = `
    <RaisedButton onPressed="component.login" :disable="component.formGroup.statusStream | stream">
        <Text text="'Login'" />
    </RaisedButton>
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: component.formGroup.statusStream,
          builder: (BuildContext context, componentFormGroupStatusStreamSnapshot) {
            final componentFormGroupStatusStreamValue = componentFormGroupStatusStreamSnapshot.data;
            return Disable(
              event: component.login,
              value: componentFormGroupStatusStreamValue,
              builder: (BuildContext context, event) {
                return RaisedButton(
                  onPressed: event,
                  child: Text(
                    'Login',
                  ),
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with another wrapper property like (margin)", function() {
        const xml = `
    <RaisedButton onPressed="component.login" :margin="4" :disable="component.formGroup.status">
        <Text text="'Login'" />
    </RaisedButton>
`;
        
        const expected = `
        Disable(
          event: component.login,
          value: component.formGroup.status,
          builder: (BuildContext context, event) {
            return Padding(
              padding: const EdgeInsets.all(4),
              child: RaisedButton(
                onPressed: event,
                child: Text(
                  'Login',
                ),
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with ChildWrapperProperty like (padding)", function() {
        const xml = `
    <RaisedButton onPressed="component.login" :disable="component.formGroup.status" :padding="4">
        <Text text="'Login'" />
    </RaisedButton>
`;
        
        const expected = `
        Disable(
          event: component.login,
          value: component.formGroup.status,
          builder: (BuildContext context, event) {
    
            return RaisedButton(
              onPressed: event,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Text(
                  'Login',
                ),
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});