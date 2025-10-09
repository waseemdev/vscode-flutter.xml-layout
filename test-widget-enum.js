// Simple test to verify the widget-specific enum functionality
const { EnumValueTransformer } = require('./out/src/value-transformers/enum');

// Test the new widget-specific enum functionality
const transformer = new EnumValueTransformer('DefaultWeight', {
    'MyLabel': 'A7LabelWeight',
    'MyButton': 'A7ButtonWeight'
});

// Test MyLabel widget
const labelResult = transformer.transform('bold', 'weight', 'MyLabel');
console.log('MyLabel result:', labelResult.value); // Should be: A7LabelWeight.bold

// Test MyButton widget
const buttonResult = transformer.transform('heavy', 'weight', 'MyButton');
console.log('MyButton result:', buttonResult.value); // Should be: A7ButtonWeight.heavy

// Test unknown widget (should use default)
const unknownResult = transformer.transform('normal', 'weight', 'UnknownWidget');
console.log('Unknown widget result:', unknownResult.value); // Should be: DefaultWeight.normal

console.log('All tests completed!');