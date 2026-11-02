import { describe, expect, it } from "vitest";
import { extractMermaidBlocks, validateMarkdown } from "./index.js";

describe("extractMermaidBlocks", () => {
	it("finds a fenced mermaid block and reports its 1-based start line", () => {
		const markdown = "# Title\n\n```mermaid\nflowchart TD\n  A --> B\n```\n\nprose\n";

		const blocks = extractMermaidBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startLine).toBe(3);
		expect(blocks[0].code).toContain("flowchart TD");
	});

	it("ignores non-mermaid code fences", () => {
		expect(extractMermaidBlocks("```js\nconst x = 1;\n```\n")).toHaveLength(0);
	});

	it("finds multiple blocks and numbers them", () => {
		const markdown = "```mermaid\nflowchart TD\n A-->B\n```\n```mermaid\nsequenceDiagram\n A->>B: hi\n```\n";

		const blocks = extractMermaidBlocks(markdown);

		expect(blocks.map((block) => block.index)).toEqual([1, 2]);
	});
});

describe("validateMarkdown", () => {
	it("passes a syntactically valid diagram", async () => {
		const markdown = "```mermaid\nflowchart TD\n  A --> B\n```\n";

		const [result] = await validateMarkdown(markdown);

		expect(result.ok).toBe(true);
	});

	it("flags a semicolon in a sequence message (the classic mmdc failure)", async () => {
		const markdown = "```mermaid\nsequenceDiagram\n  A->>B: do x; do y\n```\n";

		const [result] = await validateMarkdown(markdown);

		expect(result.ok).toBe(false);
		expect(result.error).toBeTruthy();
	});
});

describe("validateMarkdown error message", () => {
	it("returns Mermaid's parser message verbatim: its line numbers count lines inside the diagram", async () => {
		const markdown = [
			"# Title", // Markdown line 1
			"", // 2
			"```mermaid", // 3
			"sequenceDiagram", // 4, diagram line 1
			"  A->>B: do x; do y", // 5, diagram line 2  <- error
			"```",
		].join("\n");

		const [result] = await validateMarkdown(markdown);

		expect(result.error).toMatch(/^Parse error on line 2:/);
	});

	it("keeps the full parser message: excerpt, caret and expected tokens", async () => {
		const markdown = "```mermaid\nsequenceDiagram\n  A->>B: do x; do y\n```\n";

		const [result] = await validateMarkdown(markdown);

		const lines = (result.error ?? "").split("\n");
		expect(lines).toHaveLength(4);
		expect(lines[1]).toContain("A->>B: do x; do y");
		expect(lines[2]).toMatch(/^-+\^$/);
		expect(lines[3]).toMatch(/got 'NEWLINE'$/);
	});

	it("does not rewrite diagram text that mermaid echoes back in the excerpt", async () => {
		const markdown = "```mermaid\nflowchart LR\n  A[fail on line 1]-->(B\n```\n";

		const [result] = await validateMarkdown(markdown);

		expect(result.ok).toBe(false);
		expect(result.error).toContain("fail on line 1");
	});

	it("reports no error line of its own; the block's location is its startLine", async () => {
		const markdown = "\n```mermaid\nflowchart LR\n  A-->(B\n```\n";

		const [result] = await validateMarkdown(markdown);

		expect(result.startLine).toBe(2);
		expect(result).not.toHaveProperty("errorLine");
	});
});
