import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { main } from "./cli.js";

const expectedVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

describe("mmdlint --version", () => {
	it("prints the package.json version and exits 0", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});

		const code = await main(["--version"]);

		expect(code).toBe(0);
		expect(log).toHaveBeenCalledWith(expectedVersion);
		log.mockRestore();
	});

	it("accepts the -v short flag", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});

		const code = await main(["-v"]);

		expect(code).toBe(0);
		expect(log).toHaveBeenCalledWith(expectedVersion);
		log.mockRestore();
	});
});
