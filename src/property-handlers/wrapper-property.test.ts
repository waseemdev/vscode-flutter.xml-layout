import { generateWidget, assertEqual } from '../test/shared';

suite("Wrapper Properties Tests", function () {

    test("basic", function() {
        const xml = `<Text :opacity="0" />`;
        
        const expected = `
        Opacity(
          opacity: 0,
          child: Text(
    
          )
        )`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with default value for property (topCenter)", function() {
        const xml = `<Text text="'test'" :topCenter />`;
        
        const expected = `
        Align(
          alignment: Alignment.topCenter,
          child: Text(
            'test'
          )
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with default value for property (topCenter) with user value (user value should ignored)", function() {
        const xml = `<Text text="'test'" :topCenter="some values" />`;
        
        const expected = `
        Align(
          alignment: Alignment.topCenter,
          child: Text(
            'test'
          )
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("wrapper without property name", function() {
        const xml = `<TestWidget :testText="'test'" />`;
        
        const expected = `
          Text(
            'test',
            child: TestWidget()
          )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("with stream", function() {
        const xml = `<Text :opacity="value | stream" />`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: value,
          builder: (BuildContext context, valueSnapshot) {
            final valueValue = valueSnapshot.data;
            if (valueValue == null) {
              return Container(width: 0, height: 0);
            }
            return Opacity(
              opacity: valueValue,
              child: Text(
    
              )
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("with other pipe", function() {
        const xml = `<Text :opacity="value | somePipe" />`;
        
        const expected = `
        Opacity(
          opacity: _pipeProvider.transform(context, "somePipe", value, []),
          child: Text(
    
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("Related properties :width", function() {
        const xml = `
      <RaisedButton onPressed="event" :width="100">
        <Text text="'Login'" />
      </RaisedButton>
`;
        
        const expected = `
        SizedBox(
          width: 100,
          child: RaisedButton(
            onPressed: event,
            child: Text(
              'Login'
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("Related properties :height", function() {
        const xml = `
      <RaisedButton onPressed="event" :height="200">
        <Text text="'Login'" />
      </RaisedButton>
`;
        
        const expected = `
        SizedBox(
          height: 200,
          child: RaisedButton(
            onPressed: event,
            child: Text(
              'Login'
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("Related properties :width & :height", function() {
        const xml = `
      <RaisedButton onPressed="event" :width="100" :height="200">
        <Text text="'Login'" />
      </RaisedButton>
`;
        
        const expected = `
        SizedBox(
          height: 200,
          width: 100,
          child: RaisedButton(
            onPressed: event,
            child: Text(
              'Login'
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("Related properties :width & :height with stream pipes", function() {
        const xml = `
        <Text text="'Hello'" :width="streamVar | stream" :height="streamVar2 | stream" />
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: streamVar2,
          builder: (BuildContext context, streamVar2Snapshot) {
            final streamVar2Value = streamVar2Snapshot.data;
            if (streamVar2Value == null) {
              return Container(width: 0, height: 0);
            }
            return StreamBuilder(
              initialData: null,
              stream: streamVar,
              builder: (BuildContext context, streamVarSnapshot) {
                final streamVarValue = streamVarSnapshot.data;
                if (streamVarValue == null) {
                  return Container(width: 0, height: 0);
                }
                return SizedBox(
                  height: streamVar2Value,
                  width: streamVarValue,
                  child: Text(
                    'Hello'
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
    

    test("Related properties :width & :height with other pipes", function() {
        const xml = `
        <Text text="'Hello'" :width="'test1' | translate" :height="'test2' | translate" />
`;
        
        const expected = `
        SizedBox(
          height: _pipeProvider.transform(context, "translate", 'test2', []),
          width: _pipeProvider.transform(context, "translate", 'test1', []),
          child: Text(
            'Hello'
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("priority test (should generate :topPriority -> :middlePriority -> :bottomPriority)", function() {
        const xml = `<Text :topPriority="1" :middlePriority="2" :bottomPriority="3" />`;
        
        const expected = `
        TopPriorityWidget(
          1,
          child: MiddlePriorityWidget(
            2,
            child: BottomPriorityWidget(
              3,
              child: Text(
    
              )
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("priority test 2 (should generate :topPriority -> :middlePriority -> :bottomPriority)", function() {
        const xml = `<Text :bottomPriority="3" :topPriority="1" :middlePriority="2" />`;
        
        const expected = `
        TopPriorityWidget(
          1,
          child: MiddlePriorityWidget(
            2,
            child: BottomPriorityWidget(
              3,
              child: Text(
    
              )
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("RaisedButton with :text & :padding)", function() {
        const xml = `
<RaisedButton  :text="'Login'" :padding="5">
</RaisedButton>
        `;
        
        const expected = `
        RaisedButton(
          child: Padding(
            padding: const EdgeInsets.all(5),
            child: Text(
              'Login'
            )
          )
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});