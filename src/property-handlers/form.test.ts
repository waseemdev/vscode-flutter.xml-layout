import { generateWidget, assertEqual } from '../test/shared';

suite("If custom property", function () {

    test(":formSubmit", function() {
        const xml = `
<ProgressButton :formSubmit="loginFormGroup">
  <Text text="'Login'" />
</ProgressButton>
`;
        
        const expected = `
        StreamBuilder(
          initialData: ctrl.loginFormGroup.status,
          stream: ctrl.loginFormGroup.statusStream,
          builder: (BuildContext context, ctrlLoginFormGroupStatusStreamSnapshot) {
            final ctrlLoginFormGroupStatusStreamValue = ctrlLoginFormGroupStatusStreamSnapshot.data;
            return Disable(
              event: ctrl.loginFormGroup.submit,
              value: (ctrlLoginFormGroupStatusStreamValue) != ControlStatus.valid,
              builder: (BuildContext context, event) {
                return ProgressButton(
                  onPressed: event,
                  child: Text(
                    'Login'
                  )
                );
              }
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test(":formSubmit with another stream & :margin", function() {
        const xml = `
<ProgressButton :margin="0" :formSubmit="loginFormGroup"
        buttonState="ctrl.statusStream | behavior">
  <Text text="'Login'" />
</ProgressButton>
`;
        
        const expected = `
        StreamBuilder(
          initialData: ctrl.statusStream.value,
          stream: ctrl.statusStream,
          builder: (BuildContext context, ctrlStatusStreamSnapshot) {
            final ctrlStatusStreamValue = ctrlStatusStreamSnapshot.data;
            if (ctrlStatusStreamValue == null) {
              return Container(width: 0, height: 0);
            }
            return StreamBuilder(
              initialData: ctrl.loginFormGroup.status,
              stream: ctrl.loginFormGroup.statusStream,
              builder: (BuildContext context, ctrlLoginFormGroupStatusStreamSnapshot) {
                final ctrlLoginFormGroupStatusStreamValue = ctrlLoginFormGroupStatusStreamSnapshot.data;
                return Disable(
                  event: ctrl.loginFormGroup.submit,
                  value: (ctrlLoginFormGroupStatusStreamValue) != ControlStatus.valid,
                  builder: (BuildContext context, event) {
                    return Padding(
                      padding: const EdgeInsets.all(0),
                      child: ProgressButton(
                        buttonState: ctrlStatusStreamValue,
                        onPressed: event,
                        child: Text(
                          'Login'
                        )
                      )
                    );
                  }
                );
              }
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});