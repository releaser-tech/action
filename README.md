# Releaser Publish Action

Upload release assets to [Releaser](https://releaser.tech) from GitHub Actions.

## Usage

```yaml
- uses: releaser-tech/action@v1
  with:
    api-key: ${{ secrets.RELEASER_API_KEY }}
    tenant: acme
    app: acme-desktop
    tag: ${{ github.ref_name }}
    channel: stable
    files: |
      dist/*.dmg
      dist/*.exe
      dist/*.AppImage
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | Yes | | Releaser API key (starts with `rlsr_`) |
| `tenant` | Yes | | Organization slug |
| `app` | Yes | | App slug |
| `tag` | Yes | | Version tag (e.g. `v1.0.0`) |
| `channel` | No | `stable` | Release channel (`stable`, `beta`, `alpha`) |
| `files` | Yes | | Glob patterns for files to upload (one per line) |

## Outputs

| Output | Description |
|--------|-------------|
| `version-id` | The ID of the created/updated version |
| `asset-count` | Number of assets uploaded |

## Platform Detection

The action automatically detects platform and architecture from filenames:

- `.dmg`, `.pkg` → macOS
- `.exe`, `.msi`, `.msix` → Windows
- `.AppImage`, `.deb`, `.rpm`, `.snap`, `.flatpak` → Linux
- `arm64`, `aarch64` → ARM64
- `x64`, `x86_64`, `amd64` → x64

## Full Example

```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.os }}
          path: dist/

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: dist
          merge-multiple: true
      - uses: releaser-tech/action@v1
        with:
          api-key: ${{ secrets.RELEASER_API_KEY }}
          tenant: acme
          app: acme-desktop
          tag: ${{ github.ref_name }}
          channel: stable
          files: |
            dist/*.dmg
            dist/*.exe
            dist/*.AppImage
```
