## [0.0.25] - 2020-06-18
- Add item data type for builder, itemBuilder, childBuilder and repeat.

## [0.0.18] - 2020-06-18
New features:
- `<param>` now has anew `superParamName` attribute which will pass the parameter to super class constructor.
Breaking changes:
- `<if>` will now return a null (instead of Container(width: 0, height: 0)) in the else statement, if there is no `<else>` provided.
Fixes:
- Fix goto definition bug in the new vscode release.

## [0.0.10] - 2019-08-15
Breaking changes:
  - :formControl now accept both a variable and a string value, so current usge will break and all you need to do is to convert this :formControl="MyControlName" to :formControl="'MyControlName'".

## [0.0.8] - 2019-07-27
- Added language features:
  - Code completion
  - Hover information
  - Go to definition

## [0.0.4] - 2019-07-17
- Update :submitForm

## [0.0.1] - 2019-07-16
- Initial release
