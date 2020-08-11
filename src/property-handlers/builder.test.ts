import { generateWidget, assertEqual } from '../test/shared';

suite("Builder Tests", function () {

    test("PopupMenuButton itemBuilder", function() {
        const xml = `
    <PopupMenuButton>
        <builder name="itemBuilder">
            <PopupMenuItem>
                <Text text="'text'" />
            </PopupMenuItem>
        </builder>
    </PopupMenuButton>
`;
        
        const expected = `
        PopupMenuButton(
          itemBuilder: (BuildContext context) {
            return PopupMenuItem(
              child: Text(
                'text',
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView itemBuilder", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" params="context, index">
            <PopupMenuItem>
                <Text text="'text'" />
            </PopupMenuItem>
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (context, index) {
            return PopupMenuItem(
              child: Text(
                'text',
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView itemBuilder with (if)", function() {
        const xml = `
    <ListView :use="builder" :if="trueValue">
        <builder name="itemBuilder" params="context, index">
            <PopupMenuItem>
                <Text text="'text'" />
            </PopupMenuItem>
        </builder>
    </ListView>
`;
        
        const expected = `
        WidgetHelpers.ifTrue(trueValue,
          () => ListView.builder(
            itemBuilder: (context, index) {
              return PopupMenuItem(
                child: Text(
                  'text',
                ),
              );
            },
          ),
          () => Container(width: 0, height: 0)
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder with WrapperProperty like (margin)", function() {
        const xml = `
    <Disable value="trueStream" event="component.login" :margin="4">
        <builder name="builder" params="context, event">
            <RaisedButton onPressed="event">
                <Text text="'Login'" />
            </RaisedButton>
        </builder>
    </Disable>
`;
        
        const expected = `
        Padding(
          padding: const EdgeInsets.all(4),
          child: Disable(
            event: component.login,
            value: trueStream,
            builder: (context, event) {
              return RaisedButton(
                onPressed: event,
                child: Text(
                  'Login',
                ),
              );
            },
          ),
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder with a property that has a stream", function() {
        const xml = `
    <Disable value="trueStream | stream" event="component.login">
        <builder name="builder" params="context, event">
            <RaisedButton onPressed="event">
                <Text text="'Login'" />
            </RaisedButton>
        </builder>
    </Disable>
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: trueStream,
          builder: (BuildContext context, trueStreamSnapshot) {
            final trueStreamValue = trueStreamSnapshot.data;
            if (trueStreamValue == null) {
              return Container(width: 0, height: 0);
            }
            return Disable(
              event: component.login,
              value: trueStreamValue,
              builder: (context, event) {
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
    

    test("ListView itemBuilder with items", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="myIndex, item of items" params="context, myIndex">
            <PopupMenuItem>
                <Text text="'text'" />
            </PopupMenuItem>
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (context, myIndex) {
            final item = items == null || items.length <= myIndex || items.length == 0 ? null : items[myIndex];
            return PopupMenuItem(
              child: Text(
                'text',
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView itemBuilder with items and stream", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="index, item of itemsStream | stream" params="context, index">
            <PopupMenuItem>
                <Text text="'text'" />
            </PopupMenuItem>
        </builder>
    </ListView>
`;
        
        const expected = `
        StreamBuilder(
          initialData: null,
          stream: itemsStream,
          builder: (BuildContext context, itemsStreamSnapshot) {
            final itemsStreamValue = itemsStreamSnapshot.data;
            if (itemsStreamValue == null) {
              return Container(width: 0, height: 0);
            }
            return ListView.builder(
              itemBuilder: (context, index) {
                final item = itemsStreamValue == null || itemsStreamValue.length <= index || itemsStreamValue.length == 0 ? null : itemsStreamValue[index];
                return PopupMenuItem(
                  child: Text(
                    'text',
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
    

    test("ListView.separated (multiple builder)", function() {
        const xml = `
    <ListView :use="separated" itemCount="component.items.length">
        <builder name="itemBuilder" params="context, index" data="index, item of component.items">
            <Text text="item.title" />
        </builder>
        <builder name="separatorBuilder" params="context, index" data="index, item of component.items">
            <Divider />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.separated(
          itemCount: component.items.length,
          itemBuilder: (context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Text(
              item.title,
            );
          },
          separatorBuilder: (context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Divider(
    
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView.separated (multiple builder) with stream for first builder", function() {
        const xml = `
    <ListView :use="separated" itemCount="component.items.length">
        <builder name="itemBuilder" params="context, index" data="index, item of component.items | stream">
            <Text text="item.title" />
        </builder>
        <builder name="separatorBuilder" params="context, index" data="index, item of component.items">
            <Divider />
        </builder>
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
            return ListView.separated(
              itemCount: component.items.length,
              itemBuilder: (context, index) {
                final item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Text(
                  item.title,
                );
              },
              separatorBuilder: (context, index) {
                final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
                return Divider(
    
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView.separated (multiple builder) with stream for second builder", function() {
        const xml = `
    <ListView :use="separated" itemCount="component.items.length">
        <builder name="itemBuilder" params="context, index" data="index, item of component.items">
            <Text text="item.title" />
        </builder>
        <builder name="separatorBuilder" params="context, index" data="index, item of component.items | stream">
            <Divider />
        </builder>
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
            return ListView.separated(
              itemCount: component.items.length,
              itemBuilder: (context, index) {
                final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
                return Text(
                  item.title,
                );
              },
              separatorBuilder: (context, index) {
                final item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Divider(
    
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("ListView.separated (multiple builder) with streams for both builders", function() {
        const xml = `
    <ListView :use="separated" itemCount="component.items.length">
        <builder name="itemBuilder" params="context, index" data="index, ItemModel item of component.items | stream">
            <Text text="item.title" />
        </builder>
        <builder name="separatorBuilder" params="context, index" data="index, item of component.items | stream">
            <Divider />
        </builder>
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
            return ListView.separated(
              itemCount: component.items.length,
              itemBuilder: (context, index) {
                final ItemModel item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Text(
                  item.title,
                );
              },
              separatorBuilder: (context, index) {
                final item = componentItemsValue == null || componentItemsValue.length <= index || componentItemsValue.length == 0 ? null : componentItemsValue[index];
                return Divider(
    
                );
              },
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder with (if) widgets as childs", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="index, item of component.items" params="context, index">
            <Text :if="item != null" :margin="11" text="item.title" />
            <Text :if="item != null" :margin="11" text="item.title" />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            if (item != null) {
              return Padding(
                padding: const EdgeInsets.all(11),
                child: Text(
                  item.title,
                ),
              );
            }
            if (item != null) {
              return Padding(
                padding: const EdgeInsets.all(11),
                child: Text(
                  item.title,
                ),
              );
            }
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder with multiple childs (returns one widget)", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="index, item of component.items" params="context, index">
            <Text :margin="11" text="item.title2" />
            <Text :margin="11" text="item.title1" />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Padding(
              padding: const EdgeInsets.all(11),
              child: Text(
                item.title2,
              ),
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder with multiple childs (returns array)", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="index, item of component.items" params="context, index" array>
            <Text :margin="11" text="item.title2" />
            <Text :margin="11" text="item.title1" />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return [
              Padding(
                padding: const EdgeInsets.all(11),
                child: Text(
                  item.title2,
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(11),
                child: Text(
                  item.title1,
                ),
              )
            ];
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder without index param but there is items list (should add index param in the generated builder method)", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder" data="item of component.items">
            <Text text="item.title" />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (BuildContext context, index) {
            final item = component.items == null || component.items.length <= index || component.items.length == 0 ? null : component.items[index];
            return Text(
              item.title,
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

    test("builder without index param and without items list (shouldn't add index param in the generated builder method)", function() {
        const xml = `
    <ListView :use="builder">
        <builder name="itemBuilder">
            <Text text="item.title" />
        </builder>
    </ListView>
`;
        
        const expected = `
        ListView.builder(
          itemBuilder: (BuildContext context) {
            return Text(
              item.title,
            );
          },
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});