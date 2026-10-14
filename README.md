# Climate Hazard Trend Analyzer

A full-stack climate intelligence web application designed to analyze long-term climate hazard trends across India. Users can select any coordinate on an interactive Leaflet map or choose predefined climate zones, configure historical date periods (1940 to present), and examine empirical trends for **Heatwaves** and **Meteorological Drought** backed by Open-Meteo ERA5 historical reanalysis data, cached incrementally in MongoDB.

---

## 1. Data Sources & Quality Assurance

- **Provider:** [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (powered by ECMWF ERA5 reanalysis).
- **Spatial Resolution:** $0.25^\circ \times 0.25^\circ$ grid cells (approx. $28\,\text{km} \times 28\,\text{km}$ over India).
- **Temporal Coverage:** Daily observations from **1940-01-01** to **present** (aligned to `Asia/Kolkata` timezone).
- **Variables Utilized:**
  - `temperature_2m_max` (°C): Daily maximum 2-meter air temperature.
  - `precipitation_sum` (mm): Daily total precipitation.

### Quality Control & Safeguards
1. **Physical Boundary Checks (`data_quality.py`):**
   - Temperatures flagged if $> 55^\circ\text{C}$ or $< -20^\circ\text{C}$ (India extremes).
   - Precipitation flagged if $< 0\,\text{mm}$ or $> 600\,\text{mm/day}$.
   - Flagged observations are logged in the API response metadata without silent modification.
2. **Missing Value Integrity:** Missing/null values are tracked, counted, and reported as data coverage percentages. They are **never silently coerced to zero** (which would corrupt precipitation and temperature baselines).
3. **Contiguity & Sequence Enforcement:** Strict validation ensures continuous date sequences with zero duplicate days or timestamp discontinuities.
4. **Archival Latency Auto-Recovery:** ERA5 data operates on a ~5–7 day processing lag. When requests specify current dates, the client detects upstream HTTP 400 responses and automatically clamps `end_date` to the latest available reanalysis date.

---

## 2. Climate Hazard Logic

### A. Heatwave Detection Logic (`heatwave.py`)
- **Reference Baseline:** **1991–2020** (World Meteorological Organization standard 30-year climatological normal).
- **Threshold Formulation:** 95th percentile ($P_{95}$) of the baseline period's daily maximum temperatures, computed via linear interpolation (`numpy.percentile`).
- **Event Definition:** An extreme heat period requiring **$\ge 3$ consecutive days** with $T_{\max} \ge P_{95}$. Single-day and 2-day spikes are categorized as isolated hot days, not heatwaves.
- **Year-Boundary Rule:** Multi-day events crossing calendar year boundaries (e.g., Dec 30 to Jan 2) are attributed entirely to the **starting calendar year** to prevent double-counting.
- **Zero-Event Preservation:** Years with zero heatwave occurrences are explicitly preserved in the time series (assigned a value of `0`), preventing false positive trend inflation.

### B. Meteorological Drought Logic (`drought.py`)
- **Aggregation:** Daily precipitation is accumulated into monthly totals ($P_{\text{month}}$).
- **Baseline Calibration:** Evaluates historical distribution for each calendar month (e.g., all historical Julys from 1991 to 2020).
- **Classification Threshold:** A calendar month is designated as **"Dry"** if its monthly total rainfall falls below the **20th percentile** ($P_{20}$) for that specific calendar month.
- **Deficit Calculation:** Deficit is measured against the historical median monthly rainfall:
  $$\text{Deficit} = \max(0, \text{Median}_{\text{month}} - P_{\text{month}})$$
- **Reliability Guard:** If $> 20\%$ of daily observations in any month are missing, the month is flagged as unreliable and excluded from drought classification.
- **Scientific Caveat:** Transparently documented in the UI that this measures **meteorological drought** (precipitation anomaly), rather than hydrological or agricultural drought (which requires soil moisture, evapotranspiration, and temperature interactions via SPI/SPEI).

### C. Scientific Trend Estimation (`trend.py`)
- **Methodology:** Ordinary Least Squares (OLS) linear regression via `scipy.stats.linregress`.
- **Sample Size Guard:** Enforces a minimum of **10 years** of continuous data for statistical trend regression (and a minimum of 48 months for yearly aggregations in the UI). Shorter spans return `insufficient_data` to prevent spurious claims.
- **Statistical Significance:** Assessed at **$p < 0.05$** (two-tailed $t$-test on slope).
- **Reported Metrics:** Rate of change per decade ($\text{slope} \times 10$), coefficient of determination ($R^2$), and 95% confidence intervals on slope.
- **Human-Readable Interpretation:** Generates plain-English narrative summaries distinguishing statistically proven long-term climate shifts from natural year-to-year weather fluctuations.

---

## 3. Key Assumptions

1. **Grid-Cell Uniformity:** Coordinates snapped to ERA5 $0.25^\circ$ resolution assume climate conditions within the grid box ($\approx 28\,\text{km}$) are representative of the requested coordinate point, smoothing localized microclimates and urban heat islands.
2. **Reanalysis as Proxy for Observation:** ERA5 reanalysis combines physical models with satellite and station observations; while globally validated, mountain valleys and high-relief terrains (e.g., Himalayas) may exhibit elevation biases compared to surface weather stations.
3. **Meteorological vs. Agricultural Drought:** Drought impact on crops is driven by evapotranspiration and soil moisture; precipitation percentile analysis serves strictly as a meteorological moisture shortfall indicator.
4. **Geographical Domain:** Geofenced to the Indian Subcontinent ($6.0^\circ\text{N} \le \text{lat} \le 38.0^\circ\text{N}$, $68.0^\circ\text{E} \le \text{lon} \le 98.0^\circ\text{E}$) with strict HTTP 422 input rejection for coordinates outside this boundary.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Leaflet, `react-leaflet`, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, HTTPX, NumPy, SciPy |
| **Database** | MongoDB with PyMongo (Collections: `max_temperature`, `precipitation`) |
| **External API** | Open-Meteo Historical Archive API (ERA5 Reanalysis) |

---

## 5. Directory Structure

```
Climate Hazard Trend Analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application, CORS & lifespan hooks
│   │   ├── config.py               # Pydantic Settings & environment variables
│   │   ├── database.py             # PyMongo connection & collection indexing
│   │   ├── models/
│   │   │   └── schemas.py          # Request & Response Pydantic models
│   │   ├── routers/
│   │   │   └── analysis.py         # POST /api/analysis router & slice engine
│   │   ├── services/
│   │   │   ├── cache.py            # MongoDB location-keyed cache & incremental delta sync
│   │   │   ├── weather.py          # HTTPX Open-Meteo client, backoff & QC validation
│   │   │   ├── heatwave.py         # WMO 95th percentile heatwave detector
│   │   │   ├── drought.py          # Meteorological drought & rainfall deficit analyzer
│   │   │   └── trend.py            # OLS linear regression, 95% CI & p-value testing
│   │   └── utils/
│   │       ├── data_quality.py     # QC rules & physical limit checks
│   │       ├── grid.py             # 0.25° ERA5 coordinate snapping
│   │       └── validation.py       # India bounding box & date range validators
│   ├── requirements.txt            # Python dependencies (fastapi, pymongo, etc.)
│   ├── pyproject.toml              # Build & package configuration
│   └── .env.example                # Sample environment variables
├── docs/
│   └── architecture.svg            # System architecture vector diagram
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── analysisApi.ts      # Fetch API client with VITE_API_BASE_URL support
│   │   ├── components/
│   │   │   ├── AppleLocationSelect.tsx # City dropdown with coordinate jump
│   │   │   ├── InteractiveMapTray.tsx  # Leaflet map with pins & grid visualizer
│   │   │   ├── AppleSegmentedSwitch.tsx# Apple-style draggable glass capsule switch
│   │   │   ├── AppleDateRangePicker.tsx# Month-year selection popover
│   │   │   ├── ConfigurationBar.tsx    # Header toolbar with circling fade action button
│   │   │   ├── AnalysisPanel.tsx       # KPI stat cards, charts & empty states
│   │   │   ├── YearlyDataTable.tsx     # Full tabular view with CSV export
│   │   │   └── charts/
│   │   │       └── AnnualMetricsChart.tsx # Recharts visualization with trendline overlay
│   │   ├── data/
│   │   │   ├── india_boundary.json # GeoJSON boundary polygon for India
│   │   │   └── presetLocations.ts  # Predefined Indian metropolitan coordinates
│   │   ├── types/
│   │   │   └── analysis.ts         # TypeScript interfaces & API types
│   │   ├── App.tsx                 # Root application & auto-sleeping scrollbar hook
│   │   ├── index.css               # Apple liquid glass design tokens & animations
│   │   └── main.tsx                # React 19 application entry point
│   ├── vite.config.ts              # Vite + Tailwind CSS v4 bundler config
│   ├── package.json                # Frontend dependencies & scripts
│   └── index.html                  # HTML5 shell
├── .gitignore
└── README.md
```

---

## 6. Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- **MongoDB** running locally on port `27017` (or MongoDB Atlas connection string)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows PowerShell
# source venv/bin/activate    # Linux / macOS

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation is interactively available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser. All `/api/*` calls are automatically proxied to `http://127.0.0.1:8000`.
