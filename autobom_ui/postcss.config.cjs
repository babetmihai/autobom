module.exports = {
  plugins: {
    tailwindcss: {},
    "postcss-preset-env": {
      stage: 2,
      browsers: "Chrome >= 61, Safari >= 11",
      features: {
        "color-functional-notation": true,
      },
    },
    autoprefixer: {},
  },
}
