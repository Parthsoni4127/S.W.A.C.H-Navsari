# S.W.A.C.H. Navsari

A React + TypeScript concept website for community cleanliness reporting in Navsari. The app includes a glass-style interface, an OpenStreetMap view, guided sample reports, reference tracking, role-based demo views, feedback, and worker completion evidence.

## Start the backend

Open PowerShell in the project folder. The project uses its existing `.venv`:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi uvicorn
cd backend
uvicorn back:app --host 127.0.0.1 --port 8000
```

Keep this terminal open. The local API docs are at `http://127.0.0.1:8000/docs`.

The API stores demo reports, optional location/audio/image evidence, status changes, and feedback in `backend/swach_demo.db` (SQLite). It keeps the existing welcome and health routes and adds report create/list/status, voice-note retrieval, and feedback routes. The database is local and is not included in Git.

## Start the frontend

Open a second PowerShell terminal in the project folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`. The frontend connects to the local API at `http://127.0.0.1:8000`. If the API is offline, new demo reports and feedback fall back to this browser's local storage.

## Publish the frontend

Import this GitHub repository in Vercel and set the project root directory to `frontend`. Vercel detects Vite; use `npm run build` and `dist` if it asks for build settings. After the GitHub repository is connected, pushes to the production branch deploy the latest frontend automatically. The online preview has no backend configured: reports and feedback are saved in each visitor's browser. To connect a hosted API later, set `VITE_API_BASE_URL` to its `/api` URL in the Vercel project settings.

## Demo limits

- Seeded reports and ward/area counts are examples, not Navsari Municipal Corporation records or the official 13-ward dataset.
- The role picker is a UI preview. There is no real account authentication or role security.
- Category hints use a small keyword rule in the browser; they are not AI-generated.
- Gujarati, Hindi, and English are available for key report labels. Audio files up to 1 MB can be stored and played in the demo; speech-to-text transcription is not connected.
- Optional location is saved with a report when the visitor grants browser permission. Reports are not plotted at those coordinates on the map.
- The QR reader uses the browser's native `BarcodeDetector` where supported and can select a known sample area from the scanned text. The official public-bin tag directory is not connected.
- Worker photo evidence and report status changes are stored in the local demo database. They are not sent to a municipal system; AI comparison and official verification are not connected.
- The route preview groups sample reports by area count. It does not calculate street-distance routes.
- WhatsApp Cloud API, Supabase, AI services, live report map markers, and official municipal approval are not connected.
- Navsari landmark photos are served by the [Navsari Municipal Corporation website](https://navsaricity.in/).

## Map attribution

Map data and tiles are provided by [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
