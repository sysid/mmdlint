# mmdlint

Validate [Mermaid](https://mermaid.js.org/) diagram syntax inside Markdown — **headless, no browser**.

`mermaid-cli` (`mmdc`) only validates by *rendering*, which launches Chromium and fails in headless or
sandboxed CI. `mmdlint` calls Mermaid's own parser (`mermaid.parse`) against an in-process
[jsdom](https://github.com/jsdom/jsdom) DOM, so it reports the exact same syntax errors `mmdc` would — without
a browser. It validates only; it never rewrites your diagrams.

## Install

```bash
npm install -g @sysid/mmdlint
```

## Usage

```bash
mmdlint docs/PROJECT.md README.md
```

```
ok    docs/PROJECT.md:42 #1 [flowchart LR]
FAIL  docs/PROJECT.md:88 #2 [sequenceDiagram]: Parse error on line 2:
      ...  A->>B: do x; do y
      ----------------------^
      Expecting 'SOLID_ARROW', ..., got 'NEWLINE'

1/2 mermaid blocks valid (1 failed)
```

- Each fenced ` ```mermaid ` block is reported as `ok`/`FAIL` with `file:line #blockIndex`, where `line` is the
  block's opening ` ```mermaid ` fence.
- On `FAIL`, Mermaid's parser message follows verbatim: excerpt, `^` caret, expected tokens. Its `line N` (and, for
  newer diagram types such as `pie`, its `column` and `offset`) is relative to the diagram, not the file:
  - Simple case: the error is on Markdown line *fence line + N*. Above: `88 + 2` → line 90.
  - Mermaid removes frontmatter, `%%{init}%%` directives, `%%` comments and, for some diagram types, blank lines
    before parsing. If any of these precede the error, N undercounts; use the excerpt to find the line.
- Exit code `0` if every block parses, `1` if any block fails or a file cannot be read — wire it into CI or a pre-commit hook.

## Why this exists

Common Mermaid pitfalls render fine on mermaid.live but fail strict parsers (`mmdc`, GitHub server-side): a
`;` is a statement separator (fatal inside sequence messages and node labels), literal `\n` does not line-break
(use `<br/>`), labels with parens/colons/`==` must be quoted, and so on. `mmdlint` catches these in a
red-green loop instead of by eyeballing.

## API

```ts
import { validateMarkdown, extractMermaidBlocks, validateMermaid } from "@sysid/mmdlint";

const results = await validateMarkdown(markdownString);
// [{ index, startLine, code, ok, error? }, ...]  — error is Mermaid's parser message, verbatim
```

## Development

```bash
make install   # npm install
make check     # biome lint + tsc typecheck + vitest
make build     # tsc -> dist/
make all       # check + build
make help      # all targets
```

## License

MIT
