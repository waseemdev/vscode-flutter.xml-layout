import { generateWidget, assertEqual } from '../test/shared';

suite("ItemBuilder Tests", function () {

    test("basic", function() {
        const xml = `
    <ListView :use="builder" :itemBuilder="int item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (BuildContext context, int index) {
            final int item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Text(
              item.title,
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });


    test("with specified index", function() {
        const xml = `
    <ListView :use="builder" :itemBuilder="myIndex, ItemModel item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (BuildContext context, int myIndex) {
            final ItemModel item = component.items == null || component.items.length <= myIndex || component.items.length == 0 ? null : component.items[myIndex];
            return Text(
              item.title,
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with stream", function() {
        const xml = `
    <ListView :use="builder" :itemBuilder="ItemModel item of component.items | stream">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: component.items,
          builder: (BuildContext context, componentItemsSnapshot) {
            final componentItemsValue = componentItemsSnapshot.data;
            if (componentItemsValue == null) {
              return Container(width: 0, height: 0);
            }
            return ListView.builder(
              itemBuilder: (BuildContext context, int index) {
                final ItemModel item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Text(
                  item.title,
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with stream 2", function() {
        const xml = `
    <ListView :use="builder" itemCount="(component.items | stream).length" :itemBuilder="ItemModel item of component.items | stream">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: component.items,
          builder: (BuildContext context, componentItemsSnapshot) {
            final componentItemsValue = componentItemsSnapshot.data;
            if (componentItemsValue == null) {
              return Container(width: 0, height: 0);
            }
            return ListView.builder(
              itemCount: (componentItemsValue).length,
              itemBuilder: (BuildContext context, int index) {
                final ItemModel item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Text(
                  item.title,
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with wrapper property (margin)", function() {
        const xml = `
    <ListView :use="builder" :margin="5" :itemBuilder="item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        Padding(
          padding: const EdgeInsets.all(5),
          child: ListView.builder(
            itemBuilder: (BuildContext context, int index) {
              final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
              return Text(
                item.title,
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with (if)", function() {
        const xml = `
    <ListView :use="builder" :if="trueValue" :itemBuilder="item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        WidgetHelpers.ifTrue(trueValue,
          () => ListView.builder(
            itemBuilder: (BuildContext context, int index) {
              final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
              return Text(
                item.title,
              );
            },
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with (if) and (margin)", function() {
        const xml = `
    <ListView :use="builder" :margin="5" :if="trueValue" :itemBuilder="item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        WidgetHelpers.ifTrue(trueValue,
          () => Padding(
            padding: const EdgeInsets.all(5),
            child: ListView.builder(
              itemBuilder: (BuildContext context, int index) {
                final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
                return Text(
                  item.title,
                );
              },
            ),
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with wrapper property (margin) and custom property (if)", function() {
        const xml = `
    <ListView :use="builder" :if="trueValue" :margin="5" :itemBuilder="item of component.items">
        <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        WidgetHelpers.ifTrue(trueValue,
          () => Padding(
            padding: const EdgeInsets.all(5),
            child: ListView.builder(
              itemBuilder: (BuildContext context, int index) {
                final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
                return Text(
                  item.title,
                );
              },
            ),
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("itemBuilder element", function() {
        const xml = `
    <ListView :use="builder">
      <itemBuilder data="ItemModel item of component.items">
        <Text text="item.title" />
      </itemBuilder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (BuildContext context, int index) {
            final ItemModel item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Text(
              item.title,
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("itemBuilder element with :margin & :if", function() {
        const xml = `
    <ListView :use="builder" :if="trueValue" :margin="5">
      <itemBuilder data="item of component.items">
        <Text text="item.title" />
      </itemBuilder>
    </ListView>
`;
        
        const expected = `
        WidgetHelpers.ifTrue(trueValue,
          () => Padding(
            padding: const EdgeInsets.all(5),
            child: ListView.builder(
              itemBuilder: (BuildContext context, int index) {
                final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
                return Text(
                  item.title,
                );
              },
            ),
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});