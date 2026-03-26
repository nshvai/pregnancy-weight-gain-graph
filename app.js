
const DATA_URL = "data/centiles.json";

const COLORS = {
  line: "rgb(32, 83, 255)",
  bandOuter: "rgba(32, 83, 255, 0.14)",
  bandInner: "rgba(32, 83, 255, 0.28)",
  user: "rgb(214, 66, 66)",
  userLine: "rgba(214, 66, 66, 0.35)",
  start: "rgb(60, 60, 60)"
};

let centiles = null;

function bmiFromInputs(heightCm, prePregWeightKg) {
  const heightM = heightCm / 100;
  return prePregWeightKg / (heightM * heightM);
}

function bmiGroupFromBmi(bmi) {
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity grade 1";
  if (bmi < 40) return "Obesity grade 2";
  return "Obesity grade 3";
}

function parseMeasurements(text) {
  if (!text.trim()) return [];
  const lines = text.split(/\n+/);
  const parsed = [];

  for (const line of lines) {
    const [weekStr, weightStr] = line.split(",").map(x => x && x.trim());
    const week = Number(weekStr);
    const weightKg = Number(weightStr);
    if (Number.isFinite(week) && Number.isFinite(weightKg)) {
      parsed.push({ week, weightKg });
    }
  }
  return parsed.sort((a, b) => a.week - b.week);
}

function buildExpectedWeights(groupData, prePregWeightKg) {
  return {
    weeks: groupData.map(d => d.week),
    p10: groupData.map(d => prePregWeightKg + d.P10),
    p25: groupData.map(d => prePregWeightKg + d.P25),
    p50: groupData.map(d => prePregWeightKg + d.P50),
    p75: groupData.map(d => prePregWeightKg + d.P75),
    p90: groupData.map(d => prePregWeightKg + d.P90),
    gains10: groupData.map(d => d.P10),
    gains25: groupData.map(d => d.P25),
    gains50: groupData.map(d => d.P50),
    gains75: groupData.map(d => d.P75),
    gains90: groupData.map(d => d.P90)
  };
}

function closestRowByWeek(groupData, week) {
  let best = groupData[0];
  let bestDist = Math.abs(groupData[0].week - week);
  for (const row of groupData) {
    const d = Math.abs(row.week - week);
    if (d < bestDist) {
      best = row;
      bestDist = d;
    }
  }
  return best;
}

// Estimate percentile directly from the published percentile columns in the supplementary tables.
// This is more robust for the UI than exposing z-scores and avoids the previous broken values.
function estimatePercentileFromRow(row, gainKg) {
  const percentileKeys = [
    "P1", "P2.3", "P5", "P10", "P16", "P20", "P25",
    "P50", "P75", "P80", "P84", "P90", "P95", "P97.7", "P99"
  ];

  const points = percentileKeys
    .map(key => {
      const p = Number(key.slice(1));
      const value = Number(row[key]);
      return Number.isFinite(p) && Number.isFinite(value) ? { p, value } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.value - b.value);

  if (!points.length || !Number.isFinite(gainKg)) return null;

  if (gainKg <= points[0].value) return points[0].p;
  if (gainKg >= points[points.length - 1].value) return points[points.length - 1].p;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (gainKg >= a.value && gainKg <= b.value) {
      if (Math.abs(b.value - a.value) < 1e-12) return a.p;
      const t = (gainKg - a.value) / (b.value - a.value);
      return a.p + t * (b.p - a.p);
    }
  }

  return null;
}

function formatPercentile(percentile) {
  return Number.isFinite(percentile) ? `${percentile.toFixed(1)}` : "Unavailable";
}

function buildChartData(groupData, prePregWeightKg, currentPoint, measurements) {
  const expected = buildExpectedWeights(groupData, prePregWeightKg);

  const traces = [
    {
      x: expected.weeks,
      y: expected.p90,
      mode: "lines",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false
    },
    {
      x: expected.weeks,
      y: expected.p10,
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: COLORS.bandOuter,
      name: "P10–P90",
      hoverinfo: "skip"
    },
    {
      x: expected.weeks,
      y: expected.p75,
      mode: "lines",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false
    },
    {
      x: expected.weeks,
      y: expected.p25,
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: COLORS.bandInner,
      name: "P25–P75",
      hoverinfo: "skip"
    },
    {
      x: expected.weeks,
      y: expected.p50,
      mode: "lines",
      name: "P50",
      line: { width: 3, color: COLORS.line },
      customdata: expected.gains50.map(g => [g]),
      hovertemplate: "Week %{x}<br>Expected weight %{y:.2f} kg<br>Expected gain %{customdata[0]:.2f} kg<extra></extra>"
    }
  ];

  const allMeasurements = [{ week: 0, weightKg: prePregWeightKg, kind: "start" }]
    .concat(measurements.map(m => ({ ...m, kind: "past" })))
    .concat(currentPoint ? [{ ...currentPoint, kind: "current" }] : [])
    .sort((a, b) => a.week - b.week);

  // A single connecting line through all user-entered and starting weights
  if (allMeasurements.length >= 2) {
    traces.push({
      x: allMeasurements.map(m => m.week),
      y: allMeasurements.map(m => m.weightKg),
      mode: "lines",
      name: "Your trajectory",
      line: { width: 2, color: COLORS.userLine },
      hoverinfo: "skip"
    });
  }

  // Starting weight marker
  traces.push({
    x: [0],
    y: [prePregWeightKg],
    mode: "markers",
    name: "Starting weight",
    marker: { size: 8, color: COLORS.start },
    customdata: [[0, 0]],
    hovertemplate:
      "Week 0<br>" +
      "Starting weight %{y:.2f} kg<br>" +
      "Weight gain %{customdata[0]:.2f} kg<br>" +
      "Percentile %{customdata[1]:.1f}<extra></extra>"
  });

  if (measurements.length) {
    const customdata = measurements.map(m => {
      const gain = m.weightKg - prePregWeightKg;
      const row = closestRowByWeek(groupData, m.week);
      const percentile = estimatePercentileFromRow(row, gain);
      return [gain, percentile];
    });

    traces.push({
      x: measurements.map(m => m.week),
      y: measurements.map(m => m.weightKg),
      mode: "markers",
      name: "Past measurements",
      marker: {
        size: 8,
        color: COLORS.user,
        symbol: "circle"
      },
      customdata,
      hovertemplate:
        "Week %{x}<br>" +
        "Your weight %{y:.2f} kg<br>" +
        "Your gain %{customdata[0]:.2f} kg<br>" +
        "Percentile %{customdata[1]:.1f}<extra></extra>"
    });
  }

  if (currentPoint) {
    const currentGain = currentPoint.weightKg - prePregWeightKg;
    const row = closestRowByWeek(groupData, currentPoint.week);
    const percentile = estimatePercentileFromRow(row, currentGain);

    traces.push({
      x: [currentPoint.week],
      y: [currentPoint.weightKg],
      mode: "markers",
      name: "Current measurement",
      marker: {
        size: 12,
        color: "white",
        line: { width: 2, color: COLORS.user },
        symbol: "circle"
      },
      customdata: [[currentGain, percentile]],
      hovertemplate:
        "Week %{x}<br>" +
        "Your weight %{y:.2f} kg<br>" +
        "Your gain %{customdata[0]:.2f} kg<br>" +
        "Percentile %{customdata[1]:.1f}<extra></extra>"
    });
  }

  return traces;
}

function renderChart(groupData, prePregWeightKg, currentPoint, measurements) {
  const traces = buildChartData(groupData, prePregWeightKg, currentPoint, measurements);

  const layout = {
    margin: { l: 60, r: 20, t: 30, b: 60 },
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    xaxis: {
      title: "Gestational age (weeks)",
      range: [0, 44],
      gridcolor: "rgba(0,0,0,0.08)"
    },
    yaxis: {
      title: "Expected weight (kg)",
      gridcolor: "rgba(0,0,0,0.08)"
    },
    legend: { orientation: "h", y: 1.1 },
    hovermode: "closest"
  };

  Plotly.newPlot("chart", traces, layout, { responsive: true, displaylogo: false });
}

function parseRequiredNumber(id) {
  return Number(document.getElementById(id).value);
}

function readOptionalField(id) {
  return document.getElementById(id).value.trim();
}

function getInputs() {
  const currentWeekRaw = readOptionalField("currentWeek");
  const currentWeightRaw = readOptionalField("currentWeightKg");

  return {
    heightCm: parseRequiredNumber("heightCm"),
    prePregWeightKg: parseRequiredNumber("prePregWeightKg"),
    currentWeekRaw,
    currentWeightRaw,
    currentWeek: currentWeekRaw === "" ? NaN : Number(currentWeekRaw),
    currentWeightKg: currentWeightRaw === "" ? NaN : Number(currentWeightRaw),
    measurementsText: document.getElementById("measurementsInput").value
  };
}

function updateSummary(bmi) {
  document.getElementById("bmiValue").textContent = Number.isFinite(bmi) ? bmi.toFixed(1) : "—";
}

function updateGraph() {
  const {
    heightCm,
    prePregWeightKg,
    currentWeekRaw,
    currentWeightRaw,
    currentWeek,
    currentWeightKg,
    measurementsText
  } = getInputs();

  if (!Number.isFinite(heightCm) || !Number.isFinite(prePregWeightKg) || heightCm <= 0 || prePregWeightKg <= 0) {
    alert("Please enter valid values for height and pre-pregnancy weight.");
    return;
  }

  const bmi = bmiFromInputs(heightCm, prePregWeightKg);
  const groupName = bmiGroupFromBmi(bmi);
  updateSummary(bmi);

  const groupData = centiles[groupName];
  if (!groupData) {
    alert("Could not find the reference data for this BMI group.");
    return;
  }

  const hasCurrentPoint = currentWeekRaw !== "" && currentWeightRaw !== "";
  const currentPoint = hasCurrentPoint && Number.isFinite(currentWeek) && Number.isFinite(currentWeightKg)
    ? { week: currentWeek, weightKg: currentWeightKg }
    : null;

  let measurements = parseMeasurements(measurementsText);

  if (currentPoint) {
    measurements = measurements.filter(
      m => !(Math.abs(m.week - currentPoint.week) < 1e-9 && Math.abs(m.weightKg - currentPoint.weightKg) < 1e-9)
    );
  }

  renderChart(groupData, prePregWeightKg, currentPoint, measurements);
}

async function init() {
  const response = await fetch(DATA_URL);
  centiles = await response.json();

  document.getElementById("plotBtn").addEventListener("click", updateGraph);
  document.getElementById("sampleBtn").addEventListener("click", () => {
    document.getElementById("currentWeek").value = "28";
    document.getElementById("currentWeightKg").value = "68";
    document.getElementById("measurementsInput").value = "12,61.2\n20,64.0\n28,68.0";
    updateGraph();
  });
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("currentWeek").value = "";
    document.getElementById("currentWeightKg").value = "";
    document.getElementById("measurementsInput").value = "";
    updateGraph();
  });

  updateGraph();
}

init().catch(err => {
  console.error(err);
  alert("Failed to load centile data. Make sure data/centiles.json is present.");
});
