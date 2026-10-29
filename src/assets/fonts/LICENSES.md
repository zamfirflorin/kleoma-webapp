# Font licenses

Self-hosted so the site makes no request to Google (privacy, speed).

- **Inter** (`inter-latin.woff2`, `inter-latin-ext.woff2`): SIL Open Font License 1.1, (c) The Inter Project Authors, https://github.com/rsms/inter
- **Material Symbols Outlined** (`material-symbols.woff2`, a subset with the glyphs listed in `icons.txt`): Apache License 2.0, (c) Google, https://github.com/google/material-design-icons

To add an icon: add its name to `icons.txt`, then re-download the subset from the Google Fonts CSS API with `icon_names=<the list>` (fixed axes: opsz 24, wght 400, FILL 0) and replace `material-symbols.woff2`.
