const js = require("@eslint/js")
const globals = require("globals")
const react = require("eslint-plugin-react")
const reactHooks = require("eslint-plugin-react-hooks")

const reactJsxRuntimeRules = react.configs.flat["jsx-runtime"].rules
const reactHooksFlat = reactHooks.configs.flat.recommended

module.exports = [
  { ignores: ["dist/**", "vite.config.js", "eslint.config.js"] },
  {
    files: ["src/**/*.{js,mjs,cjs,jsx}"],
    plugins: {
      ...react.configs.flat.recommended.plugins,
      ...reactHooksFlat.plugins,
    },
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        __FIREBASE_CONFIG__: "readonly"
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...reactJsxRuntimeRules,
      ...reactHooksFlat.rules,
      "react-hooks/set-state-in-effect": "off",
      "react/display-name": "off",
      quotes: ["warn", "double"],
      semi: ["warn", "never"],
      indent: [
        "warn",
        2,
        {
          SwitchCase: 1,
        },
      ],
      "react-hooks/exhaustive-deps": "off",
      "react/jsx-indent": [
        "warn",
        2,
        {
          indentLogicalExpressions: true,
        },
      ],
      "comma-dangle": ["warn", "never"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/generated/*/fragments*",
            "**/generated/*/operations*",
            "**/generated/*/graphql-types*",
          ],
        },
      ],
      "no-multi-spaces": "warn",
      "padded-blocks": "off",
      "object-curly-spacing": [
        "warn",
        "always",
      ],
      "brace-style": "warn",
      "no-unused-vars": [
        "warn",
      ],
      "max-len": [
        "warn",
        160,
        4,
        {
          ignoreComments: true,
        },
      ],
      "react/jsx-max-props-per-line": [
        "warn",
        {
          maximum: { single: 3, multi: 1 },
        },
      ],
      "react/jsx-first-prop-new-line": [
        "warn",
        "multiline-multiprop",
      ],
      "space-infix-ops": "warn",
      "no-trailing-spaces": "warn",
      "linebreak-style": [
        "warn",
        "unix",
      ],
      "no-fallthrough": "warn",
      "no-unneeded-ternary": "warn",
      "no-extra-semi": "off",
      "no-extra-boolean-cast": "warn",
      "no-console": "warn",
      "key-spacing": [
        "warn",
        {
          beforeColon: false,
          afterColon: true,
        },
      ],
      "comma-spacing": [
        "warn",
        {
          before: false,
          after: true,
        },
      ],
      "semi-spacing": [
        "warn",
        {
          before: false,
          after: true,
        },
      ],
      "space-before-function-paren": [
        "warn",
        {
          asyncArrow: "always",
          named: "never",
          anonymous: "never",
        },
      ],
      "space-before-blocks": [
        "warn",
      ],
      "no-multiple-empty-lines": [
        "warn",
        {
          max: 2,
          maxEOF: 1,
          maxBOF: 1,
        },
      ],
      "spaced-comment": [
        "warn",
        "always",
      ],
      "jsx-quotes": [
        "warn",
        "prefer-double",
      ],
      "react/jsx-uses-vars": [
        2,
      ],
      "react/jsx-no-duplicate-props": "warn",
      "keyword-spacing": [
        "warn",
        {
          before: true,
        },
      ],
      "space-in-parens": [
        "warn",
        "never",
      ],
      "arrow-spacing": [
        "warn",
      ],
      "react/jsx-indent-props": [
        "warn",
        2,
      ],
      "react/jsx-closing-bracket-location": "warn",
      "react/jsx-curly-spacing": [
        "warn",
        "never",
      ],
      "react/jsx-key": "warn",
      "react/jsx-tag-spacing": [
        "warn",
        {},
      ],
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": "warn",
      "react/jsx-wrap-multilines": "warn",
      "react/jsx-no-bind": 0,
      "react/jsx-equals-spacing": [
        "warn",
        "never",
      ],
      "react/prop-types": "off",
    },
  },
]
