import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("mmdlint FAIL report", () => {
	let dir: string;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "mmdlint-"));
	});
	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("points at the block's opening fence and prints Mermaid's full parser message, indented", async () => {
		const file = join(dir, "doc.md");
		writeFileSync(
			file,
			[
				"# Doc", // 1
				"", // 2
				"```mermaid", // 3  <- reported location
				"sequenceDiagram", // diagram line 1
				"  A->>B: do x; do y", // diagram line 2  <- error, as Mermaid numbers it
				"```",
				"",
			].join("\n"),
		);
		const err = vi.spyOn(console, "error").mockImplementation(() => {});
		const log = vi.spyOn(console, "log").mockImplementation(() => {});

		const code = await main([file]);

		expect(code).toBe(1);
		const report = String(err.mock.calls[0][0]).split("\n");
		expect(report[0]).toBe(`FAIL  ${file}:3 #1 [sequenceDiagram]: Parse error on line 2:`);
		expect(report[1]).toMatch(/^ {6}\S.*A->>B: do x; do y$/);
		expect(report[2]).toMatch(/^ {6}-+\^$/);
		expect(report[3]).toMatch(/^ {6}Expecting .*got 'NEWLINE'$/);
		err.mockRestore();
		log.mockRestore();
	});
});
