import { generateWidget, assertEqual } from '../test/shared';

suite("Child Builder Tests", function () {

    test("ListView basic", function() {
        const xml = `
    <ListView :childBuilder="item of component.items">
      <Text text="item.title" />
    </ListView>
`;
        
        const expected = `
        ListView(
          children: WidgetHelpers.mapToWidgetList(component.items, (item, index) {
            return Text(
              item.title
            );
          })
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("ListView with stream", function() {
        const xml = `
    <ListView :childBuilder="item of component.items | stream">
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
            return ListView(
              children: WidgetHelpers.mapToWidgetList(componentItemsValue, (item, index) {
                return Text(
                  item.title
                );
              })
            );
          }
        )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
    

//     test("ListView itemBuilder with items", function() {
//         const xml = `
//     <ListView :use="builder">
//         <builder name="itemBuilder" data="index, item of items" params="context, index">
//             <PopupMenuItem>
//                 <Text text="text" />
//             </PopupMenuItem>
//         </builder>
//     </ListView>
// `;
        
//         const expected = `
//         ListView.builder(
//           itemBuilder: (context, index) {
//             if (items.length == 0) {
//               return null;
//             }
    
//             final item = items[index];
//             return PopupMenuItem(
//               child: Text(
//                 "text"
//               )
//             );
//           }
//         )
// `;

//         const generated = generateWidget(xml);
//         assertEqual(generated, expected);
//     });
    

//     test("ListView itemBuilder with items and stream", function() {
//         const xml = `
//     <ListView :use="builder">
//         <builder name="itemBuilder" data="index, item of itemsStream | stream" params="context, index">
//             <PopupMenuItem>
//                 <Text text="text" />
//             </PopupMenuItem>
//         </builder>
//     </ListView>
// `;
        
//         const expected = `
//         StreamBuilder(
//           builder: (BuildContext context, itemsStreamSnapshot) {
//             final itemsStreamValue = itemsStreamSnapshot.data;
//             if (itemsStreamValue == null) {
//               return Container(width: 0, height: 0);
//             }
//             return ListView.builder(
//               itemBuilder: (context, index) {
//                 if (itemsStreamValue.length == 0) {
//                   return null;
//                 }

//                 final item = itemsStreamValue[index];
//                 return PopupMenuItem(
//                   child: Text(
//                     "text"
//                   )
//                 );
//               }
//             );
//           },
//           initialData: null,
//           stream: itemsStream
//         )
// `;

//         const generated = generateWidget(xml);
//         assertEqual(generated, expected);
//     });
});