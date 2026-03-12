// @ts-check
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const pluginSecurity = require("eslint-plugin-security");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "eslint.config.js"],
  },
  ...tsPlugin.configs["flat/recommended"],
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      security: pluginSecurity,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "warn",
    },
  },
];
