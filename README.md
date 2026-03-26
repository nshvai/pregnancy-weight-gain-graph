# Pregnancy weight gain chart

A plain static HTML/CSS/JavaScript app for GitHub Pages, based on the week-specific supplementary centile tables from:

**Santos et al. (2018). Gestational weight gain charts for different body mass index groups for women in Europe, North America, and Oceania. _BMC Medicine_.**

## Files

- `index.html` — page layout
- `style.css` — styling
- `app.js` — BMI logic, data loading, and Plotly chart
- `data/centiles.json` — extracted from supplementary Tables S4–S9

## What it does

- User enters:
  - height
  - pre-pregnancy weight
- The app computes BMI and maps it to one of six groups:
  - Underweight
  - Normal weight
  - Overweight
  - Obesity grade 1
  - Obesity grade 2
  - Obesity grade 3
- The app then renders the corresponding reference curves as expected absolute weight:
  - P10–P90 band
  - P25–P75 band
  - P50 line
  - weight gain visible on hover
- Optional:
  - current week + current weight
  - multiple measurements in `week,weightKg` format

## GitHub Pages deployment

1. Create a new **public** GitHub repository, for example:
   `pregnancy-weight-gain-chart`

2. Upload these files to the root of the repository:
   - `index.html`
   - `style.css`
   - `app.js`
   - `data/centiles.json`

3. Commit and push to the `main` branch.

4. In GitHub:
   - open the repository
   - go to **Settings**
   - go to **Pages**
   - under **Build and deployment**
     - Source: **Deploy from a branch**
     - Branch: **main**
     - Folder: **/ (root)**

5. Save.

6. Your site will be published at:
   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`

For example, if your repo is called `pregnancy-weight-gain-chart` under `nshvai`, the URL will be:

`https://nshvai.github.io/pregnancy-weight-gain-chart/`

## Linking from your personal site

Recommended approach:
- keep this app in a separate repository
- add a link to it from your personal website

That keeps your academic homepage separate from the interactive tool.

## Local preview

Because the app fetches `data/centiles.json`, it is best previewed through a local server.

If you have Python installed:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Notes

- The JSON includes the model parameters (`Mu`, `Sigma`, `Lambda`, `Tau`) and the selected percentiles from the supplementary tables.
- Current rendering uses the published percentile columns directly rather than recomputing them from the BCT parameters. The chart shows absolute expected weight; weight gain is visible in hover tooltips.
- Informational only; not medical advice.
