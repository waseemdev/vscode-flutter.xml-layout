import { generateWidget, assertEqual } from '../test/shared';

suite("Repeat Tests", function () {

    test("basic", function() {
        const xml = `<Text :repeat="item of items" />`;
        
        const expected = `
        ...WidgetHelpers.mapToWidgetList(items, (item, index) {
            return Text(
            );
          }
        )`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with wrapper :margin", function() {
        const xml = `<Text :repeat="item of items" :margin="10" />`;
        
        const expected = `
        ...WidgetHelpers.mapToWidgetList(items, (item, index) {
          return Padding(
            padding: const EdgeInsets.all(10),
            child: Text(
  
            ),
          );
        }
      )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with (if)", function() {
        const xml = `<Text :repeat="item of items" :if="condition" />`;
        
        const expected = `
        ...WidgetHelpers.mapToWidgetList(items, (item, index) {
          return WidgetHelpers.ifTrue(condition,
            () => Text(
  
            ),
            () => null
          );
        }
      )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("inside column", function() {
        const xml = `
        <Column>
          <Text :repeat="item of items" />
        </Column>
        `;
        
        const expected = `
        Column(
          children: [
            ...WidgetHelpers.mapToWidgetList(items, (item, index) {
                return Text(
    
                );
              }),
          ],
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("multiple inside column", function() {
        const xml = `
        <Column>
          <Text :repeat="item of items" />
          <Text :repeat="item of items" />
          <Text :repeat="item of items" />
        </Column>
        `;
        
        const expected = `
        Column(
          children: [
            ...WidgetHelpers.mapToWidgetList(items, (item, index) {
                return Text(
    
                );
              }
            ),
            ...WidgetHelpers.mapToWidgetList(items, (item, index) {
                return Text(
    
                );
              }
            ),
            ...WidgetHelpers.mapToWidgetList(items, (item, index) {
                return Text(
    
                );
              }
            ),
          ],
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("inside builder that returns list of widgets e.g. PopupMenuButton", function() {
        const xml = `
        <PopupMenuButton>
        <builder name="itemBuilder">
            <PopupMenuItem :repeat="menuItem of component.menuItems" value="menuItem">
                <Text text="menuItem.title" />
            </PopupMenuItem>
        </builder>
    </PopupMenuButton>
        `;
        
        const expected = `
        PopupMenuButton(
          itemBuilder: (BuildContext context) {
            return WidgetHelpers.mapToWidgetList(component.menuItems, (menuItem, index) {
                return PopupMenuItem(
                  value: menuItem,
                  child: Text(
                    menuItem.title,
                  ),
                );
              }
            );
          },
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});