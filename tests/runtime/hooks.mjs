// Module hooks for tests/answer.test.js: main.js imports the Herdr runtime ("herdr") and
// gpui-kit / gpui-base, which only exist inside the app. Resolve them to the stand-ins here.
const STANDINS = { "gpui-kit": "gpui.mjs", "gpui-base": "gpui.mjs", "herdr": "herdr.mjs" };
export async function resolve(specifier, context, next) {
  const file = STANDINS[specifier];
  return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : next(specifier, context);
}
