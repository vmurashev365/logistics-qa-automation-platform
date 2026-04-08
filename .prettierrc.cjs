/**
 * Prettier Configuration
 * Code formatting rules for the QA framework
 */
module.exports = {
  // Use semicolons at the end of statements
  semi: true,
  
  // Use single quotes for strings
  singleQuote: true,
  
  // Add trailing commas in ES5 valid locations (objects, arrays)
  trailingComma: 'es5',
  
  // Maximum line length before wrapping
  printWidth: 100,
  
  // Use 2 spaces for indentation
  tabWidth: 2,
  
  // Use spaces instead of tabs
  useTabs: false,
  
  // Put the > of a multi-line JSX element at the end of the last line
  bracketSameLine: false,
  
  // Include spaces inside object braces: { foo: bar }
  bracketSpacing: true,
  
  // Use 'lf' line endings (Unix style)
  endOfLine: 'auto',
  
  // Quote props only when necessary
  quoteProps: 'as-needed',
  
  // Use double quotes in JSX
  jsxSingleQuote: false,
  
  // Format embedded languages in template literals
  embeddedLanguageFormatting: 'auto',
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.feature',
      options: {
        tabWidth: 2,
        printWidth: 120,
      },
    },
    {
      files: '*.json',
      options: {
        tabWidth: 2,
        printWidth: 80,
      },
    },
  ],
};
