import { generateWidget, assertEqual } from '../test/shared';

suite("If Element", function () {

    test("basic", function() {
        const xml = `
<Container>
  <if value="ifCondition">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: WidgetHelpers.ifElseChain([
              SwitchCase(
                ifCondition,
                () => Text(
                  'if',
                )
              ),
              SwitchCase(
                ifElseCondition,
                () => Text(
                  'elseIf',
                )
              ),
            ],
            () => Text(
              'else',
            )
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with child wrapper (padding)", function() {
        const xml = `
<Container :padding="4">
  <if value="ifCondition">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: WidgetHelpers.ifElseChain([
                SwitchCase(
                  ifCondition,
                  () => Text(
                    'if',
                  )
                ),
                SwitchCase(
                  ifElseCondition,
                  () => Text(
                    'elseIf',
                  )
                ),
              ],
              () => Text(
                'else',
              )
            ),
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("<if> with stream pipe", function() {
        const xml = `
<Container>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
Container(
      child: StreamBuilder(
        initialData: null,
        stream: ifCondition,
        builder: (BuildContext context, ifConditionSnapshot) {
          final ifConditionValue = ifConditionSnapshot.data;
          if (ifConditionValue == null) {
            return Container(width: 0, height: 0);
          }
          return WidgetHelpers.ifElseChain([
              SwitchCase(
                ifConditionValue,
                () => Text(
                  'if',
                )
              ),
              SwitchCase(
                ifElseCondition,
                () => Text(
                  'elseIf',
                )
              ),
            ],
            () => Text(
              'else',
            )
          );
        },
      ),
    )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("<elseIf> with stream pipe", function() {
        const xml = `
<Container>
  <if value="ifCondition">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition | stream">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: ifElseCondition,
            builder: (BuildContext context, ifElseConditionSnapshot) {
              final ifElseConditionValue = ifElseConditionSnapshot.data;
              if (ifElseConditionValue == null) {
                return Container(width: 0, height: 0);
              }
              return WidgetHelpers.ifElseChain([
                  SwitchCase(
                    ifCondition,
                    () => Text(
                      'if',
                    )
                  ),
                  SwitchCase(
                    ifElseConditionValue,
                    () => Text(
                      'elseIf',
                    )
                  ),
                ],
                () => Text(
                  'else',
                )
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("with multiple stream pipes", function() {
        const xml = `
<Container>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition | stream">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: ifCondition,
            builder: (BuildContext context, ifConditionSnapshot) {
              final ifConditionValue = ifConditionSnapshot.data;
              if (ifConditionValue == null) {
                return Container(width: 0, height: 0);
              }
              return StreamBuilder(
                initialData: null,
                stream: ifElseCondition,
                builder: (BuildContext context, ifElseConditionSnapshot) {
                  final ifElseConditionValue = ifElseConditionSnapshot.data;
                  if (ifElseConditionValue == null) {
                    return Container(width: 0, height: 0);
                  }
                  return WidgetHelpers.ifElseChain([
                      SwitchCase(
                        ifConditionValue,
                        () => Text(
                          'if',
                        )
                      ),
                      SwitchCase(
                        ifElseConditionValue,
                        () => Text(
                          'elseIf',
                        )
                      ),
                    ],
                    () => Text(
                      'else',
                    )
                  );
                },
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("mutiple elseIf with multiple stream pipes", function() {
        const xml = `
<Container>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElse1Condition | stream">
    <Text text="'elseIf'" />
  </elseIf>
  <elseIf value="ifElse2Condition | stream">
    <Text text="'elseIf'" />
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: ifCondition,
            builder: (BuildContext context, ifConditionSnapshot) {
              final ifConditionValue = ifConditionSnapshot.data;
              if (ifConditionValue == null) {
                return Container(width: 0, height: 0);
              }
              return StreamBuilder(
                initialData: null,
                stream: ifElse1Condition,
                builder: (BuildContext context, ifElse1ConditionSnapshot) {
                  final ifElse1ConditionValue = ifElse1ConditionSnapshot.data;
                  if (ifElse1ConditionValue == null) {
                    return Container(width: 0, height: 0);
                  }
                  return StreamBuilder(
                    initialData: null,
                    stream: ifElse2Condition,
                    builder: (BuildContext context, ifElse2ConditionSnapshot) {
                      final ifElse2ConditionValue = ifElse2ConditionSnapshot.data;
                      if (ifElse2ConditionValue == null) {
                        return Container(width: 0, height: 0);
                      }
                      return WidgetHelpers.ifElseChain([
                          SwitchCase(
                            ifConditionValue,
                            () => Text(
                              'if',
                            )
                          ),
                          SwitchCase(
                            ifElse1ConditionValue,
                            () => Text(
                              'elseIf',
                            )
                          ),
                          SwitchCase(
                            ifElse2ConditionValue,
                            () => Text(
                              'elseIf',
                            )
                          ),
                        ],
                        () => Text(
                          'else',
                        )
                      );
                    },
                  );
                },
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("multiple stream pipes with chlid that has formControl or controller", function() {
        const xml = `
<Container>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifElseCondition | stream">
    <TextField :formControl="'test'">
    </TextField>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: ifCondition,
            builder: (BuildContext context, ifConditionSnapshot) {
              final ifConditionValue = ifConditionSnapshot.data;
              if (ifConditionValue == null) {
                return Container(width: 0, height: 0);
              }
              return StreamBuilder(
                initialData: null,
                stream: ifElseCondition,
                builder: (BuildContext context, ifElseConditionSnapshot) {
                  final ifElseConditionValue = ifElseConditionSnapshot.data;
                  if (ifElseConditionValue == null) {
                    return Container(width: 0, height: 0);
                  }
                  return WidgetHelpers.ifElseChain([
                      SwitchCase(
                        ifConditionValue,
                        () => Text(
                          'if',
                        )
                      ),
                      SwitchCase(
                        ifElseConditionValue,
                        () => StreamBuilder(
                          initialData: ctrl.formGroup.get('test').value,
                          stream: ctrl.formGroup.get('test').valueStream,
                          builder: (BuildContext context, ctrlFormGroupGetTestValueStreamSnapshot) {
                            return TextField(
                              controller: ctrl._attachController(ctrl.formGroup, 'test', () => TextEditingController()),
                            );
                          },
                        )
                      ),
                    ],
                    () => Text(
                      'else',
                    )
                  );
                },
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("same stream pipe with many calls inside condition value", function() {
        const xml = `
<Container>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifCondition | stream">
    <Text text="'elseIf'">
    </Text>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Container>
`;
        
        const expected = `
        Container(
          child: StreamBuilder(
            initialData: null,
            stream: ifCondition,
            builder: (BuildContext context, ifConditionSnapshot) {
              final ifConditionValue = ifConditionSnapshot.data;
              if (ifConditionValue == null) {
                return Container(width: 0, height: 0);
              }
              return WidgetHelpers.ifElseChain([
                  SwitchCase(
                    ifConditionValue,
                    () => Text(
                      'if',
                    )
                  ),
                  SwitchCase(
                    ifConditionValue,
                    () => Text(
                      'elseIf',
                    )
                  ),
                ],
                () => Text(
                  'else',
                )
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("more than one if-elseIf-else chain", function() {
        const xml = `
<Column>
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifCondition | stream">
    <Text text="'elseIf'">
    </Text>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>

	<Divider />
	
  <if value="ifCondition | stream">
    <Text text="'if'" />
  </if>
  <elseIf value="ifCondition | stream">
    <Text text="'elseIf'">
    </Text>
  </elseIf>
  <else>
    <Text text="'else'" />
  </else>
</Column>
`;
        
        const expected = `
        Column(
          children: [
            StreamBuilder(
              initialData: null,
              stream: ifCondition,
              builder: (BuildContext context, ifConditionSnapshot) {
                final ifConditionValue = ifConditionSnapshot.data;
                if (ifConditionValue == null) {
                  return Container(width: 0, height: 0);
                }
                return WidgetHelpers.ifElseChain([
                    SwitchCase(
                      ifConditionValue,
                      () => Text(
                        'if',
                      )
                    ),
                    SwitchCase(
                      ifConditionValue,
                      () => Text(
                        'elseIf',
                      )
                    ),
                  ],
                  () => Text(
                    'else',
                  )
                );
              },
            ),
            Divider(
    
            ),
            StreamBuilder(
              initialData: null,
              stream: ifCondition,
              builder: (BuildContext context, ifConditionSnapshot) {
                final ifConditionValue = ifConditionSnapshot.data;
                if (ifConditionValue == null) {
                  return Container(width: 0, height: 0);
                }
                return WidgetHelpers.ifElseChain([
                    SwitchCase(
                      ifConditionValue,
                      () => Text(
                        'if',
                      )
                    ),
                    SwitchCase(
                      ifConditionValue,
                      () => Text(
                        'elseIf',
                      )
                    ),
                  ],
                  () => Text(
                    'else',
                  )
                );
              },
            ),
          ],
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("multi-child", function() {
        const xml = `
  <Row>
      <if value="ifCondition">
          <Text text="1" />
          <Text text="2" />
      </if>
      <elseIf value="elseIfCondition">
          <Text text="3" />
          <Text text="4" />
      </elseIf>
      <else>
          <Text text="5" />
          <Text text="6" />
      </else>
  </Row>
`;
        
        const expected = `
        Row(
          children: [
            ...WidgetHelpers.ifElseChainMultiChild([
                SwitchCaseMultiChild(
                  ifCondition,
                  () => [
                    Text(
                      1,
                    ),
                    Text(
                      2,
                    )
                  ]
                ),
                SwitchCaseMultiChild(
                  elseIfCondition,
                  () => [
                    Text(
                      3,
                    ),
                    Text(
                      4,
                    )
                  ]
                ),
              ],
              () => [
                Text(
                  5,
                ),
                Text(
                  6,
                )
              ]
            ),
          ],
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});