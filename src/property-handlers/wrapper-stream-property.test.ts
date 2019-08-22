import { generateWidget, assertEqual } from '../test/shared';

suite("Wrapper Stream Property Tests", function () {

    test("basic", function() {
        const xml = `
    <Stack :stream="selectedTabStream:1:selectedTabValue">
        <LatestPage :opacity="selectedTabValue == 0 ? 1: 0" />
        <Text :opacity="selectedTabValue == 1 ? 1: 0" text="'Home'" />
        <Text :opacity="selectedTabValue == 2 ? 1: 0" text="'Profile'" />
    </Stack>
`;
        
        const expected = `
        StreamBuilder(
          initialData: 1,
          stream: selectedTabStream,
          builder: (BuildContext context, selectedTabStreamSnapshot) {
            final selectedTabValue = selectedTabStreamSnapshot.data;
            return Stack(
              children: [
                Opacity(
                  opacity: selectedTabValue == 0 ? 1: 0,
                  child: LatestPage(
    
                  ),
                ),
                Opacity(
                  opacity: selectedTabValue == 1 ? 1: 0,
                  child: Text(
                    'Home',
                  ),
                ),
                Opacity(
                  opacity: selectedTabValue == 2 ? 1: 0,
                  child: Text(
                    'Profile',
                  ),
                ),
              ],
            );
          },
      )`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("with another wrapper property like (margin)", function() {
        const xml = `
    <Stack :stream="selectedTabStream:1:selectedTabValue" :margin="4">
        <LatestPage :opacity="selectedTabValue == 0 ? 1: 0" />
        <Text :opacity="selectedTabValue == 1 ? 1: 0" text="'Home'" />
        <Text :opacity="selectedTabValue == 2 ? 1: 0" text="'Profile'" />
    </Stack>
`;
        
        const expected = `
        StreamBuilder(
          initialData: 1,
          stream: selectedTabStream,
          builder: (BuildContext context, selectedTabStreamSnapshot) {
            final selectedTabValue = selectedTabStreamSnapshot.data;
            return Padding(
              padding: const EdgeInsets.all(4),
              child: Stack(
                children: [
                  Opacity(
                    opacity: selectedTabValue == 0 ? 1: 0,
                    child: LatestPage(
    
                    ),
                  ),
                  Opacity(
                    opacity: selectedTabValue == 1 ? 1: 0,
                    child: Text(
                      'Home',
                    ),
                  ),
                  Opacity(
                    opacity: selectedTabValue == 2 ? 1: 0,
                    child: Text(
                      'Profile',
                    ),
                  ),
                ],
              ),
            );
          },
        )
        `;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});