
const DATA_URL = "data/centiles.json";

const COLORS = {
  line: "rgb(32, 83, 255)",
  bandOuter: "rgba(32, 83, 255, 0.14)",
  bandInner: "rgba(32, 83, 255, 0.28)",
  user: "rgb(214, 66, 66)",
  userLine: "rgba(214, 66, 66, 0.35)"
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

function buildChartData(groupData, prePregWeightKg, singlePoint, measurements) {
  const expected = buildExpectedWeights(groupData, prePregWeightKg);

  const traces = [
    {
      x: expected.weeks,
      y: expected.p90,
      mode: "lines",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false,
      customdata: expected.gains90.map(g => [g])
    },
    {
      x: expected.weeks,
      y: expected.p10,
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: COLORS.bandOuter,
      name: "P10–P90",
      hoverinfo: "skip",
      customdata: expected.gains10.map(g => [g])
    },
    {
      x: expected.weeks,
      y: expected.p75,
      mode: "lines",
      line: { width: 0 },
      hoverinfo: "skip",
      showlegend: false,
      customdata: expected.gains75.map(g => [g])
    },
    {
      x: expected.weeks,
      y: expected.p25,
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: COLORS.bandInner,
      name: "P25–P75",
      hoverinfo: "skip",
      customdata: expected.gains25.map(g => [g])
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

  if (singlePoint) {
    traces.push({
      x: [singlePoint.week],
      y: [singlePoint.weightKg],
      mode: "markers",
      name: "Current point",
      marker: { size: 10, color: COLORS.user },
      customdata: [[singlePoint.weightKg - prePregWeightKg]],
      hovertemplate: "Week %{x}<br>Your weight %{y:.2f} kg<br>Your gain %{customdata[0]:.2f} kg<extra></extra>"
    });
  }

  if (measurements.length) {
    traces.push({
      x: measurements.map(m => m.week),
      y: measurements.map(m => m.weightKg),
      mode: "lines+markers",
      name: "Your measurements",
      line: { width: 2, color: COLORS.userLine },
      marker: { size: 8, color: COLORS.user },
      customdata: measurements.map(m => [m.weightKg - prePregWeightKg]),
      hovertemplate: "Week %{x}<br>Your weight %{y:.2f} kg<br>Your gain %{customdata[0]:.2f} kg<extra></extra>"
    });
  }

  return traces;
}

function renderChart(groupData, prePregWeightKg, singlePoint, measurements) {
  const traces = buildChartData(groupData, prePregWeightKg, singlePoint, measurements);

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
    hovermode: "x unified"
  };

  Plotly.newPlot("chart", traces, layout, { responsive: true, displaylogo: false });
}

function getInputs() {
  return {
    heightCm: Number(document.getElementById("heightCm").value),
    prePregWeightKg: Number(document.getElementById("prePregWeightKg").value),
    currentWeek: Number(document.getElementById("currentWeek").value),
    currentWeightKg: Number(document.getElementById("currentWeightKg").value),
    measurementsText: document.getElementById("measurementsInput").value
  };
}

function updateSummary(bmi) {
  document.getElementById("bmiValue").textContent = Number.isFinite(bmi) ? bmi.toFixed(1) : "—";
}

function updateGraph() {
  const { heightCm, prePregWeightKg, currentWeek, currentWeightKg, measurementsText } = getInputs();

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

  const singlePoint = Number.isFinite(currentWeek) && Number.isFinite(currentWeightKg)
    ? { week: currentWeek, weightKg: currentWeightKg }
    : null;

  const measurements = parseMeasurements(measurementsText);
  renderChart(groupData, prePregWeightKg, singlePoint, measurements);
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
