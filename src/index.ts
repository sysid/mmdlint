import { JSDOM } from "jsdom";

export interface MermaidBlock {
	/** 1-based position among the mermaid blocks in the document. */
	index: number;
	/** 1-based line of the opening ``` ```mermaid ``` fence. */
	startLine: number;
	/** The diagram source, without the fences. */
	code: string;
}

export interface BlockResult extends MermaidBlock {
	ok: boolean;
	/** Mermaid parser error message when ok is false. */
	error?: string;
}

// Fenced ```mermaid blocks. `m` flag so ^/$ match line boundaries for the closing fence.
const MERMAID_FENCE = /^[ \t]*```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

/** Extract every fenced mermaid block from Markdown, with its 1-based start line. */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
	const blocks: MermaidBlock[] = [];
	let index = 0;
	for (const match of markdown.matchAll(MERMAID_FENCE)) {
		const startLine = markdown.slice(0, match.index).split("\n").length;
		blocks.push({ index: ++index, startLine, code: match[1] });
	}
	return blocks;
}

interface MermaidApi {
	parse(text: string): Promise<unknown>;
	initialize(config: Record<string, unknown>): void;
}

let mermaidLoad: Promise<MermaidApi> | null = null;

// Mermaid's parse() pulls in DOMPurify, which needs a DOM. mmdc supplies one via a real browser (Chromium),
// which is unavailable in headless/sandboxed CI; jsdom supplies the same DOM in-process. Loaded once, lazily,
// because the globals must be set before mermaid is imported.
async function loadMermaid(): Promise<MermaidApi> {
	if (mermaidLoad === null) {
		mermaidLoad = (async () => {
			const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
			for (const key of ["window", "document", "DOMParser", "Node", "HTMLElement", "SVGElement"]) {
				try {
					(globalThis as Record<string, unknown>)[key] = (dom.window as unknown as Record<string, unknown>)[key];
				} catch {
					// Some globals (e.g. navigator) are read-only in newer Node; mermaid does not need them for parsing.
				}
			}
			const mermaid = (await import("mermaid")).default as unknown as MermaidApi;
			mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
			return mermaid;
		})();
	}
	return mermaidLoad;
}

/** Validate a single diagram body. Returns ok=false with the parser message on a syntax error. */
export async function validateMermaid(code: string): Promise<{ ok: boolean; error?: string }> {
	const mermaid = await loadMermaid();
	try {
		await mermaid.parse(code);
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** Validate every mermaid block in a Markdown document, in order. */
export async function validateMarkdown(markdown: string): Promise<BlockResult[]> {
	const results: BlockResult[] = [];
	for (const block of extractMermaidBlocks(markdown)) {
		const { ok, error } = await validateMermaid(block.code);
		results.push({ ...block, ok, error });
	}
	return results;
}
