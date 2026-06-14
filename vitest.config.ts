import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Mermaid loads lazily on first parse; allow headroom for the one-time import.
		testTimeout: 30000,
	},
});
