# openapi-spec-forge

To generate fast, static API docs from your OpenAPI 3.x spec. Zero dependencies, single HTML output, deployable anywhere — S3, CDN, or local. Built to handle big endpoint APIs without the browser-hanging bulk of tools.


## USAGE

```bash
uv venv
source .venv/bin/activate

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


## License

MIT — Azeem Mirza
