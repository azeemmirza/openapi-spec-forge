# openapi-spec-forge

Generate fast, static API docs from an OpenAPI 3.x spec. Zero dependencies, single HTML output.

## Requirements

- Python 3.11+
- [uv](https://github.com/astral-sh/uv)

## Setup

```bash
uv venv
source .venv/bin/activate
```

## Usage

```bash
./bin/build -i openapi.json
./bin/build -i openapi.json -o docs/index.html -t "My API"
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-i, --input` | — | Path to OpenAPI 3.x JSON file (required) |
| `-o, --output` | `api-docs.html` | Output HTML file |
| `-t, --title` | from spec | Page title override |
| `--base-url` | from spec | Override server base URL |
| `--no-embed-data` | — | Write spec as a separate `.data.json` file |
| `--no-inline-js` | — | Write JS/CSS as separate files |

### Generate example specs

```bash
./bin/generate_specs
```

Writes `examples/example-one.json` (Banking), `examples/example-two.json` (E-Commerce), and `examples/large.json` (Healthcare).

## License

MIT — Azeem Mirza
