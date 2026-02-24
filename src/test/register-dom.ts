// Register happy-dom before any other imports to ensure @testing-library/react finds the DOM
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GlobalRegistrator } = require("@happy-dom/global-registrator");
    GlobalRegistrator.register();
} catch (e) {
    // happy-dom not installed or not found
    console.warn("Happy DOM not found, skipping registration. UI tests may fail.", e);
}
