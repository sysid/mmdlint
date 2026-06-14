#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateMarkdown } from "./index.js";

const USAGE = `mmdlint — validate Mermaid diagram syntax in Markdown, headless (no browser).

Usage:
  mmdlint <file.md> [file.md ...]

Options:
  -h, --help     show this help
  -v, --version  print version

Reports each fenced \`\`\`mermaid block as ok/FAIL with the failing line and parser message.
Exit code 0 when every block parses, 1 when any block fails or a file cannot be read.`;

// Read the version from the shipped package.json (one level above this file in both src/ and dist/).
function readVersion(): string {
	return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

export async function main(argv: string[]): Promise<number> {
	if (argv.includes("-h") || argv.includes("--help")) {
		console.log(USAGE);
		return 0;
	}
	if (argv.includes("-v") || argv.includes("--version")) {
		console.log(readVersion());
		return 0;
	}
	const files = argv.filter((arg) => !arg.startsWith("-"));
	if (files.length === 0) {
		console.error(USAGE);
		return 1;
	}

	let okCount = 0;
	let failCount = 0;
	let readErrors = 0;
	for (const file of files) {
		let content: string;
		try {
			content = readFileSync(file, "utf8");
		} catch (error) {
			readErrors++;
			console.error(`error  ${file}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}
		for (const result of await validateMarkdown(content)) {
			const firstLine =
				result.code
					.split("\n")
					.find((line) => line.trim())
					?.trim() ?? "";
			if (result.ok) {
				okCount++;
				console.log(`ok    ${file}:${result.startLine} #${result.index} [${firstLine}]`);
			} else {
				failCount++;
				const message = (result.error ?? "").split("\n")[0];
				console.error(`FAIL  ${file}:${result.startLine} #${result.index} [${firstLine}]: ${message}`);
			}
		}
	}

	const summary = `\n${okCount}/${okCount + failCount} mermaid blocks valid`;
	const suffix = [failCount ? `${failCount} failed` : "", readErrors ? `${readErrors} unreadable file(s)` : ""]
		.filter(Boolean)
		.join(", ");
	console.log(suffix ? `${summary} (${suffix})` : summary);
	return failCount > 0 || readErrors > 0 ? 1 : 0;
}

// Run only when executed as the CLI, not when imported by tests. realpath on both sides so a
// global-bin symlink or `npm link` (argv[1] is the symlink) still matches this module's real path.
function isRunAsScript(): boolean {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
}

if (isRunAsScript()) {
	main(process.argv.slice(2)).then(
		(code) => process.exit(code),
		(error) => {
			console.error(error);
			process.exit(1);
		},
	);
}
