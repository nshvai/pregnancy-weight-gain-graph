# Gestational weight curve

A small interactive web app for visualising pregnancy weight curves based on:

**Santos et al.** *Gestational weight gain charts for different body mass index groups for women in Europe, North America, and Oceania.*  
**BMC Medicine** (2018), 16:201.  DOI: 10.1186/s12916-018-1189-1

## What it does

- takes **height** and **pre-pregnancy weight**
- computes the corresponding **BMI group**
- displays the paper-based reference curve:
  - **P10–P90**
  - **P25–P75**
  - **P50**
- lets users optionally add:
  - a **current measurement**
  - **past measurements**
- shows **weight gain** and an approximate **percentile** on hover

## Data source

The app is based on the supplementary week-specific centile tables from the paper (Tables S4–S9).

## Tech

Plain static site:
- `index.html`
- `style.css`
- `app.js`
- `data/centiles.json`

## Run locally

Because the app loads `data/centiles.json`, run it through a local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Deploy

This project can be deployed directly with **GitHub Pages**.

## Notes

- This tool is **informational only** and **not medical advice**.
- Created by [Nadiya Shvai](https://nshvai.github.io/).
