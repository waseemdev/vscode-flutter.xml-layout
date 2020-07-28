import { generateWidget, assertEqual } from '../test/shared';

suite("Forms", function () {

    test(":formSubmit", function() {
        const xml = `
<ProgressButton :formSubmit="loginFormGroup">
  <Text text="'Login'" />
</ProgressButton>
`;
        
        const expected = `
        StreamBuilder(
          initialData: ctrl.loginFormGroup.submitEnabled,
          stream: ctrl.loginFormGroup.submitEnabledStream,
          builder: (BuildContext context, ctrlLoginFormGroupSubmitEnabledStreamSnapshot) {
            final ctrlLoginFormGroupSubmitEnabledStreamValue = ctrlLoginFormGroupSubmitEnabledStreamSnapshot.data;
            return Disable(
              event: ctrl.loginFormGroup.submit,
              value: !(ctrlLoginFormGroupSubmitEnabledStreamValue),
              builder: (BuildContext context, event) {
                return ProgressButton(
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
              initialData: ctrl.loginFormGroup.submitEnabled,
              stream: ctrl.loginFormGroup.submitEnabledStream,
              builder: (BuildContext context, ctrlLoginFormGroupSubmitEnabledStreamSnapshot) {
                final ctrlLoginFormGroupSubmitEnabledStreamValue = ctrlLoginFormGroupSubmitEnabledStreamSnapshot.data;
                return Disable(
                  event: ctrl.loginFormGroup.submit,
                  value: !(ctrlLoginFormGroupSubmitEnabledStreamValue),
                  builder: (BuildContext context, event) {
                    return Padding(
                      padding: const EdgeInsets.all(0),
                      child: ProgressButton(
                        buttonState: ctrlStatusStreamValue,
                        onPressed: event,
                        child: Text(
                          'Login',
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test(":formControl with :width wrapper", function() {
        const xml = `
<TextField :formControl="'quantity'" :width="80" />
`;
        
        const expected = `
        StreamBuilder(
          initialData: ctrl.formGroup.get('quantity').value,
          stream: ctrl.formGroup.get('quantity').valueStream,
          builder: (BuildContext context, ctrlFormGroupGetQuantityValueStreamSnapshot) {
            return SizedBox(
              width: 80,
              child: TextField(
                controller: ctrl._attachController(ctrl.formGroup, 'quantity', () => TextEditingController()),
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});