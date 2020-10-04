import { generateWidget, assertEqual } from '../test/shared';

suite("Wrapper Animation Property Tests", function () {

    test("test 1", function() {
        const xml = `
<Transform :use="translate">
    <apply-animation curve="easeOut" duration="milliseconds: 300" autoTrigger>
        <offset type="Offset" begin="Offset(-10, 0)" end="Offset(0, 0)" />
    </apply-animation>
    <Container color="red" width="200" height="200" />
</Transform>
`;
        
        const expected = `
        AnimationBuilder(
            autoTrigger: true,
            curve: Curves.easeOut,
            duration: Duration(milliseconds: 300),
            tweenMap: {
              "offset": Tween<Offset>(begin: Offset(-10, 0), end: Offset(0, 0))
            },
            builderMap: (Map<String, Animation> animations, Widget child) {
              return Transform.translate(
                offset: animations["offset"].value,
                child: Container(
                  color: Colors.red,
                  height: 200,
                  width: 200,
                ),
              );
            },
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("test 2", function() {
        const xml = `
<Container>
    <apply-animation duration="milliseconds: 1000" autoTrigger cycles="5">
        <color type="color" begin="Colors.transparent" end="Colors.white" />
        <width type="int" begin="100" end="200" />
        <height type="int" begin="100" end="300" />
    </apply-animation>
</Container>
`;
        
        const expected = `
        AnimationBuilder(
            autoTrigger: true,
            cycles: 5,
            duration: Duration(milliseconds: 1000),
            tweenMap: {
              "color": ColorTween(begin: Colors.transparent, end: Colors.white),
              "width": Tween<int>(begin: 100, end: 200),
              "height": Tween<int>(begin: 100, end: 300)
            },
            builderMap: (Map<String, Animation> animations, Widget child) {
              return Container(
                color: animations["color"].value,
                height: animations["height"].value,
                width: animations["width"].value,
              );
            },
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });

    test("test 3", function() {
        const xml = `
    <Container>
        <apply-animation name="myAnimation" duration="seconds: 1" >
          <color type="color" begin="Colors.blue" end="Colors.red" />
          <width type="double" begin="100" end="200" />
          <height type="double" begin="100" end="300" />
        </apply-animation>
      </Container>
`;
        
        const expected = `
          AnimationBuilder(
            duration: Duration(seconds: 1),
            key: ctrl._myAnimationKey,
            tweenMap: {
              "color": ColorTween(begin: Colors.blue, end: Colors.red),
              "width": Tween<double>(begin: 100, end: 200),
              "height": Tween<double>(begin: 100, end: 300)
            },
            builderMap: (Map<String, Animation> animations, Widget child) {
              return Container(
                color: animations["color"].value,
                height: animations["height"].value,
                width: animations["width"].value,
              );
            },
          )
`;

        const generated = generateWidget(xml);
        assertEqual(generated, expected);
    });
});