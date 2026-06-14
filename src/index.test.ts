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
