import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom before any other imports to ensure @testing-library/react finds the DOM
GlobalRegistrator.register();
