# S.W.A.C.H. Navsari

A community cleanliness website concept for Navsari. The frontend includes a dark emerald glass interface, a real OpenStreetMap view, a local demo report flow, reference tracking, role selection, and sample community activities.

## Run the frontend

Open a terminal in `frontend` and run:

```sh
npm install
npm run dev
```

Open the local address Vite prints in the terminal.

## Run the starter API (optional)

From the project root, create and activate a Python environment, then install FastAPI and Uvicorn:

```sh
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi uvicorn
cd backend
uvicorn back:app --reload --port 8000
```

The API currently provides only welcome and health endpoints; the frontend demo does not send reports to it.

## Demo limits

- Report submissions and activity interests are local browser demo data, not municipal records.
- Sign-in and the three role options are a UI preview, not working user accounts.
- AI photo verification and live cleanliness analytics are not connected.
- The Navsari street map uses OpenStreetMap. Sample report summaries are not mapped to real complaint locations.
- Navsari landmark photos are served by the [Navsari Municipal Corporation website](https://navsaricity.in/).

## Map attribution

Map data and tiles are provided by [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
