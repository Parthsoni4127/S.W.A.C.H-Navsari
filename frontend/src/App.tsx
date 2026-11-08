import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'

type Role = 'Citizen' | 'Sanitation Worker' | 'Municipal Admin'
type Report = { id: string; category: string; area: string; details: string; status: string; date: string; image?: string; afterImage?: string; source?: string; location?: string; voiceNoteName?: string; voiceNoteData?: string }
type Modal = 'login' | 'report' | 'track' | 'activity' | 'assistant' | 'feedback' | null
type QrDetector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector

const roleOptions: Role[] = ['Citizen', 'Sanitation Worker', 'Municipal Admin']
const storageKey = 'swach-navsari-demo-reports'
const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '')
const initialReports: Report[] = [
  { id: 'SW-2048', category: 'Overflowing bin', area: 'Lunsikui', details: 'Community report · example record', status: 'Crew assigned', date: 'Today, 9:40 AM' },
  { id: 'SW-2052', category: 'Street litter', area: 'Lunsikui', details: 'Community report · example record', status: 'Received (demo)', date: 'Today, 8:10 AM' },
  { id: 'SW-2055', category: 'Missed collection', area: 'Lunsikui', details: 'Community report · example record', status: 'In progress', date: 'Today, 7:35 AM' },
  { id: 'SW-2039', category: 'Street litter', area: 'Grid Road', details: 'Community report · example record', status: 'In progress', date: 'Yesterday, 4:15 PM' },
  { id: 'SW-2041', category: 'Overflowing bin', area: 'Grid Road', details: 'Community report · example record', status: 'Received (demo)', date: 'Yesterday, 2:05 PM' },
  { id: 'SW-2026', category: 'Missed collection', area: 'Dandi Road', details: 'Community report · example record', status: 'Resolved', date: 'Nov 05, 11:20 AM' },
]

const nmcImages = {
  lake: 'https://navsaricity.in/media/image?docId=0fe64801abf769ff81e81f3c980c718f&fileName=Navsari_Gallery_20260109055713.jpg',
  clock: 'https://navsaricity.in/media/image?docId=0fe64801abf769ff81e81f3c980b217d&fileName=Navsari_Carousel_20260108051445.jpg',
}

function readReports(): Report[] {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? [...JSON.parse(saved) as Report[], ...initialReports] : initialReports
  } catch { return initialReports }
}

function optimizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const source = URL.createObjectURL(file)
    image.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) { URL.revokeObjectURL(source); reject(new Error('Image preview unavailable')); return }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(source)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error('Could not read this image')) }
    image.src = source
  })
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file'))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/></>,
    report: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 16v4h14v-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.8M18 15c2 .6 3 2.2 3 4"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    camera: <><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></>,
  }
  return <svg {...common}>{paths[name] ?? paths.arrow}</svg>
}

function App() {
  const [section, setSection] = useState('home')
  const [modal, setModal] = useState<Modal>(null)
  const [reports, setReports] = useState<Report[]>(readReports)
  const [role, setRole] = useState<Role>('Citizen')
  const [user, setUser] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Street litter')
  const [area, setArea] = useState('Lunsikui')
  const [details, setDetails] = useState('')
  const [photo, setPhoto] = useState('')
  const [location, setLocation] = useState('')
  const [joined, setJoined] = useState<string[]>([])
  const [activeHotspot, setActiveHotspot] = useState('Lunsikui')
  const [mapStatusFilter, setMapStatusFilter] = useState<'All statuses' | 'Open' | 'Resolved'>('All statuses')
  const [activityName, setActivityName] = useState('')
  const [language, setLanguage] = useState<'English' | 'ગુજરાતી' | 'हिन्दी'>('English')
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [feedbackItems, setFeedbackItems] = useState<{ reportId: string; rating: number; note: string; createdAt: string }[]>([])
  const [voiceNoteName, setVoiceNoteName] = useState('')
  const [voiceNoteData, setVoiceNoteData] = useState('')
  const [voicePlayback, setVoicePlayback] = useState<Record<string, string>>({})
  const [qrSource, setQrSource] = useState(false)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrScanMessage, setQrScanMessage] = useState('')
  const [proofPhotoNames, setProofPhotoNames] = useState<Record<string, string>>({})
  const [apiConnected, setApiConnected] = useState(false)
  const qrVideoRef = useRef<HTMLVideoElement>(null)
  const qrStreamRef = useRef<MediaStream | null>(null)
  const qrTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(reports.filter((report) => !initialReports.some((seed) => seed.id === report.id)))) } catch { setMessage('Browser storage is full. Please use a smaller photo or clear old demo reports.') } }, [reports])

  useEffect(() => {
    if (!apiBase) return
    let active = true
    fetch(`${apiBase}/reports`).then((response) => { if (!response.ok) throw new Error('Backend unavailable'); return response.json() as Promise<Report[]> }).then((serverReports) => {
      if (!active) return
      setApiConnected(true)
      const localReports = readReports().filter((report) => !initialReports.some((seed) => seed.id === report.id))
      const serverIds = new Set(serverReports.map((report) => report.id))
      setReports([...localReports.filter((report) => !serverIds.has(report.id)), ...serverReports])
    }).catch(() => { if (active) setApiConnected(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (role !== 'Municipal Admin' || !apiBase) return
    let active = true
    fetch(`${apiBase}/feedback`).then((response) => { if (!response.ok) throw new Error('Feedback service unavailable'); return response.json() as Promise<{ reportId: string; rating: number; note: string; createdAt: string }[]> }).then((items) => { if (active) setFeedbackItems(items) }).catch(() => { if (active) setFeedbackItems([]) })
    return () => { active = false }
  }, [role])

  useEffect(() => () => {
    if (qrTimerRef.current !== undefined) window.clearInterval(qrTimerRef.current)
    qrStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const tracked = useMemo(() => reports.find((report) => report.id.toLowerCase() === query.trim().toLowerCase()), [reports, query])

  function openModal(next: Modal) { setMessage(''); if (next !== 'report') stopQrScan(); if (next === 'feedback') setFeedbackSaved(false); setModal(next) }
  function closeModal() { stopQrScan(); setModal(null) }
  function stopQrScan() {
    if (qrTimerRef.current !== undefined) window.clearInterval(qrTimerRef.current)
    qrTimerRef.current = undefined
    qrStreamRef.current?.getTracks().forEach((track) => track.stop())
    qrStreamRef.current = null
    setQrScanning(false)
  }
  async function startQrScan() {
    const Detector = (window as Window & { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector
    if (!Detector) { setQrScanMessage('This browser does not support camera QR scanning. Choose the area manually.'); return }
    if (!navigator.mediaDevices?.getUserMedia) { setQrScanMessage('Camera access is unavailable. Choose the area manually.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      qrStreamRef.current = stream
      setQrScanning(true); setQrScanMessage('Point the camera at a QR code. Recognized area names can preselect the area.')
      const video = qrVideoRef.current
      if (!video) { stopQrScan(); return }
      video.srcObject = stream
      await video.play()
      const detector = new Detector({ formats: ['qr_code'] })
      let checking = false
      qrTimerRef.current = window.setInterval(async () => {
        if (checking || !video.videoWidth) return
        checking = true
        try {
          const result = await detector.detect(video)
          const code = result[0]?.rawValue
          if (code) {
            const knownArea = ['Lunsikui', 'Grid Road', 'Dandi Road', 'Station Road', 'Other area'].find((place) => code.toLowerCase().includes(place.toLowerCase()))
            if (knownArea) { setArea(knownArea); setQrScanMessage(`QR scanned. Area selected: ${knownArea}.`) }
            else setQrScanMessage('QR scanned. No matching sample area found; please choose an area manually.')
            setQrSource(true); stopQrScan()
          }
        } catch { setQrScanMessage('Could not read this QR code. Keep it in view or choose the area manually.') }
        finally { checking = false }
      }, 500)
    } catch { setQrScanMessage('Camera permission was not granted. You can still choose the area manually.') }
  }
  function goTo(id: string) { setSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  function locateMe() {
    if (!navigator.geolocation) { setLocation('Location is not available in this browser. Choose an area instead.'); return }
    setLocation('Requesting your location…')
    navigator.geolocation.getCurrentPosition((position) => setLocation(`Location captured (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}) — demo only`), () => setLocation('Location permission was not granted. Choose an area instead.'), { timeout: 8000 })
  }
  async function choosePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return }
    if (file.size > 8 * 1024 * 1024) { setMessage('Choose an image smaller than 8 MB.'); return }
    try { setPhoto(await optimizePhoto(file)); setMessage('Photo ready. AI image verification is not connected in this demo.') } catch { setMessage('Could not prepare that image. Please try another photo.') }
  }
  async function chooseVoiceNote(file?: File) {
    if (!file) return
    if (!file.type.startsWith('audio/')) { setMessage('Please choose an audio file.'); return }
    if (file.size > 1024 * 1024) { setMessage('Choose an audio file smaller than 1 MB for this local demo.'); return }
    try { setVoiceNoteData(await readDataUrl(file)); setVoiceNoteName(file.name); setMessage('Audio note attached to this demo report. Transcription is not connected.') }
    catch { setMessage('Could not read that audio file. Please try another one.') }
  }
  function suggestCategory() {
    const note = details.toLowerCase()
    const suggestion = /overflow|full bin|bin full/.test(note) ? 'Overflowing bin'
      : /missed|not collected|collection/.test(note) ? 'Missed collection'
        : /dump|illegal waste/.test(note) ? 'Illegal dumping'
          : /litter|plastic|trash|garbage|waste/.test(note) ? 'Street litter' : ''
    if (suggestion) { setCategory(suggestion); setMessage(`Keyword-based category suggestion: ${suggestion}. Please review it; AI is not connected.`) }
    else setMessage('No sample keyword matched. Choose the category manually.')
  }
  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    stopQrScan()
    const payload = { category, area, details, location: location || null, image: photo || null, source: qrSource ? 'QR tag (demo)' : 'Web form', voiceNoteName: voiceNoteName || null, voiceNoteData: voiceNoteData || null }
    let report: Report
    try {
      if (!apiBase) throw new Error('Online demo uses browser storage')
      const response = await fetch(`${apiBase}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('Could not save to local API')
      report = { ...await response.json() as Report, voiceNoteData: voiceNoteData || undefined }
      setApiConnected(true)
      setMessage(`Saved in the local demo database. Reference: ${report.id}`)
    } catch {
      report = { id: `SW-${Math.floor(3000 + Math.random() * 6999)}`, ...payload, details: payload.details, location: payload.location ?? undefined, image: payload.image ?? undefined, voiceNoteName: payload.voiceNoteName ?? undefined, voiceNoteData: payload.voiceNoteData ?? undefined, source: payload.source, status: 'Received (demo)', date: 'Just now' }
      setApiConnected(false)
      setMessage(`Backend unavailable; saved in this browser only. Reference: ${report.id}`)
    }
    setReports((current) => [report, ...current.filter((item) => item.id !== report.id)]); setQuery(report.id); setModal('track'); setDetails(''); setPhoto(''); setLocation(''); setVoiceNoteName(''); setVoiceNoteData(''); setQrSource(false)
  }
  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setUser(String(data.get('email')).split('@')[0] || role); setMessage(`Demo ${role.toLowerCase()} session started on this device.`)
    window.setTimeout(() => { setModal(null); setMessage(''); goTo('dashboard') }, 700)
  }

  async function updateReportStatus(id: string, status: string) {
    setReports((current) => current.map((report) => report.id === id ? { ...report, status } : report))
    if (!apiBase) { setApiConnected(false); setMessage(`${id} updated in this browser only. No online demo API is configured.`); return }
    try {
      const response = await fetch(`${apiBase}/reports/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!response.ok) throw new Error('Local API update failed')
      const updated = await response.json() as Report
      setReports((current) => current.map((report) => report.id === id ? updated : report))
      setApiConnected(true); setMessage(`${id} updated in the local demo database.`)
    } catch { setApiConnected(false); setMessage(`${id} updated in this browser only. Start the local backend to save it there.`) }
  }

  async function addCompletionProof(id: string, file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image for the completion proof.'); return }
    if (file.size > 8 * 1024 * 1024) { setMessage('Choose an image smaller than 8 MB.'); return }
    let afterImage: string
    try { afterImage = await optimizePhoto(file) } catch { setMessage('Could not read that completion photo.'); return }
    setProofPhotoNames((current) => ({ ...current, [id]: file.name }))
    setReports((current) => current.map((report) => report.id === id ? { ...report, status: 'Resolved', afterImage } : report))
    if (!apiBase) { setApiConnected(false); setMessage(`Completion photo saved in this browser only for ${id}.`); return }
    try {
      const response = await fetch(`${apiBase}/reports/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Resolved', afterImage }) })
      if (!response.ok) throw new Error('Local API update failed')
      const updated = await response.json() as Report
      setReports((current) => current.map((report) => report.id === id ? updated : report))
      setApiConnected(true); setMessage(`Completion photo and status saved in the local demo database for ${id}.`)
    } catch { setApiConnected(false); setMessage(`Completion photo saved in this browser only for ${id}; local API did not respond.`) }
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!feedbackRating) { setMessage('Choose a rating from 1 to 5 stars first.'); return }
    try {
      const key = 'swach-navsari-demo-feedback'
      const saved = JSON.parse(localStorage.getItem(key) ?? '[]') as { report: string; rating: number; note: string }[]
      localStorage.setItem(key, JSON.stringify([{ report: query || 'General suggestion', rating: feedbackRating, note: feedbackNote }, ...saved].slice(0, 30)))
      if (!apiBase) { setFeedbackSaved(true); setApiConnected(false); setMessage('Thanks. Feedback saved in this browser only; no online demo API is connected.'); return }
      try {
        const response = await fetch(`${apiBase}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: query || 'General suggestion', rating: feedbackRating, note: feedbackNote }) })
        if (!response.ok) throw new Error('Local API unavailable')
        setApiConnected(true); setFeedbackSaved(true); setMessage('Thanks. Feedback saved in the local demo database, not sent to the city.')
      } catch { setApiConnected(false); setFeedbackSaved(true); setMessage('Thanks. Feedback saved in this browser only; local API did not respond.') }
    } catch { setMessage('Could not save feedback in this browser. Please try again.') }
  }

  async function loadVoiceNote(report: Report) {
    if (report.voiceNoteData) { setVoicePlayback((current) => ({ ...current, [report.id]: report.voiceNoteData as string })); return }
    if (!apiBase) { setMessage('This online demo has no connected API for stored voice notes.'); return }
    try {
      const response = await fetch(`${apiBase}/reports/${encodeURIComponent(report.id)}/voice-note`)
      if (!response.ok) throw new Error('Voice note unavailable')
      const result = await response.json() as { dataUrl: string }
      setVoicePlayback((current) => ({ ...current, [report.id]: result.dataUrl }))
    } catch { setMessage('Could not load this audio note from the local API.') }
  }

  const openReports = reports.filter((report) => report.status !== 'Resolved' && report.status !== 'Verified (demo)')
  const suggestedAreas = [...new Set(openReports.map((report) => report.area))].sort((a, b) => openReports.filter((report) => report.area === b).length - openReports.filter((report) => report.area === a).length)
  const areaSnapshot = ['Lunsikui', 'Grid Road', 'Dandi Road', 'Station Road'].map((areaName) => ({ areaName, reports: reports.filter((report) => report.area === areaName).length })).sort((a, b) => b.reports - a.reports)
  const hotspotReports = reports.filter((report) => report.area === activeHotspot && (mapStatusFilter === 'All statuses' || (mapStatusFilter === 'Resolved' ? report.status === 'Resolved' || report.status === 'Verified (demo)' : report.status !== 'Resolved' && report.status !== 'Verified (demo)')))
  const reportCopy = language === 'ગુજરાતી'
      ? { title: 'સફાઈની સમસ્યા નોંધાવો.', intro: 'આ ડેમો report સ્થાનિક demo API અથવા browserમાં save થશે.', category: 'શું ધ્યાનમાં આવ્યું?', area: 'નજીકનો વિસ્તાર', note: 'ટૂંકી નોંધ', photo: 'ફોટો ઉમેરો', submit: 'ડેમો report save કરો', gps: 'મારું location લો' }
    : language === 'हिन्दी'
      ? { title: 'सफाई की समस्या दर्ज करें।', intro: 'यह डेमो रिपोर्ट स्थानीय डेमो API या ब्राउज़र में सहेजी जाएगी।', category: 'क्या समस्या है?', area: 'नज़दीकी इलाका', note: 'छोटा विवरण', photo: 'फ़ोटो जोड़ें', submit: 'डेमो रिपोर्ट सहेजें', gps: 'मेरी लोकेशन लें' }
      : { title: 'Report a concern.', intro: 'This sample report saves to the local demo API or this browser and gets a reference number.', category: 'WHAT NEEDS ATTENTION?', area: 'NEAREST AREA', note: 'ADD A SHORT NOTE', photo: 'ADD A PHOTO', submit: 'Save demo report', gps: 'Use my location' }

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'dashboard', label: 'City pulse', icon: 'chart' },
    { id: 'city-map', label: 'Cleanliness map', icon: 'map' },
    { id: 'platform', label: 'Features', icon: 'chart' },
    { id: 'report', label: 'Report an issue', icon: 'report' },
    { id: 'track', label: 'Track a report', icon: 'clock' },
    { id: 'community', label: 'Community', icon: 'people' },
  ]

  return <main className="app-shell">
    <div className="page-glow glow-a"/><div className="page-glow glow-b"/>
    <header className="topbar glass">
      <button className="brand" onClick={() => goTo('home')} aria-label="S.W.A.C.H. home"><span className="brand-icon">S<span>.</span></span><span><b>S.W.A.C.H.</b><small>NAVSARI · GUJARAT</small></span></button>
      <nav className="desktop-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={section === item.id ? 'current' : ''} onClick={() => item.id === 'report' ? openModal('report') : item.id === 'track' ? openModal('track') : goTo(item.id)}>{item.label}</button>)}</nav>
      <div className="top-actions"><span className="live-pill"><i/> {apiConnected ? 'DEMO · LOCAL API' : 'DEMO MODE · BROWSER'}</span>{user ? <button className="user-chip" onClick={() => { setUser(''); setMessage('Signed out of the local demo.') }}>{user} <span>↗</span></button> : <button className="login-btn" onClick={() => openModal('login')}>Sign in <Icon name="arrow"/></button>}<button className="mobile-menu" onClick={() => document.getElementById('mobile-nav')?.classList.toggle('is-open')} aria-label="Toggle menu">☰</button></div>
    </header>
    <nav className="mobile-nav glass" id="mobile-nav">{navItems.map((item) => <button key={item.id} onClick={() => { document.getElementById('mobile-nav')?.classList.remove('is-open'); item.id === 'report' ? openModal('report') : item.id === 'track' ? openModal('track') : goTo(item.id) }}>{item.label}</button>)}</nav>

    <section className="hero-section" id="home">
      <div className="hero-photo" role="img" aria-label="Drone video of Navsari city"><video className="hero-video" autoPlay muted playsInline preload="metadata" onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 6.2) event.currentTarget.currentTime = 0 }}><source src="/navsari-drone-view.mp4" type="video/mp4"/></video></div><div className="hero-shade"/>
    </section>

    <section className="hero-message section-wrap"><div><span className="section-label">SMART WASTE ACTION & CLEANLINESS HUB</span><h1>Let’s make Navsari <em>shine.</em></h1><p>Notice something? Take a photo, tell us where it is, and help your neighbours care for the city we share.</p></div><div className="hero-message-actions"><button className="button-primary" onClick={() => openModal('report')}><Icon name="report"/> Report a concern <Icon name="arrow"/></button><button className="button-glass" onClick={() => goTo('dashboard')}>Explore the city pulse <span>↓</span></button></div></section>

    <section className="intro-strip" id="dashboard"><div><span className="section-label">NAVSARI AT A GLANCE</span><h2>See the bigger picture.</h2><p>A community dashboard concept, using clearly marked sample information.</p></div><div className="metric-card glass"><span className="metric-symbol">◉</span><span><small>Reports in this demo</small><strong>{reports.length.toString().padStart(2, '0')}</strong></span><i>LOCAL</i></div><div className="metric-card glass"><span className="metric-symbol orange">⌁</span><span><small>Sample areas to explore</small><strong>04</strong></span><i>DEMO</i></div><div className="metric-card glass"><span className="metric-symbol green">↗</span><span><small>Ways to take part</small><strong>03</strong></span><i>OPEN</i></div></section>

    {user && <section className="role-dashboard section-wrap" aria-label={`${role} demo dashboard`}>
      <div className="section-heading"><div><span className="section-label">SIGNED IN AS {role.toUpperCase()}</span><h2>{role === 'Citizen' ? `Welcome, ${user}.` : role === 'Sanitation Worker' ? 'Your neighbourhood worklist.' : 'City operations overview.'}</h2><p>Role-based preview · saved in the local demo API when connected, otherwise this browser.</p></div><span className="sample-badge"><i/> LOCAL DEMO</span></div>
      <div className="role-summary-grid"><article className="role-summary glass"><small>{role === 'Citizen' ? 'COMMUNITY REPORTS' : 'OPEN ITEMS'}</small><strong>{role === 'Citizen' ? reports.length : openReports.length}</strong><span>{role === 'Citizen' ? 'Example and locally submitted reports' : 'Sample items awaiting attention'}</span></article><article className="role-summary glass"><small>RESOLVED IN THIS PREVIEW</small><strong>{reports.filter((report) => report.status === 'Resolved').length}</strong><span>Demo status changes only</span></article><article className="role-summary glass role-action"><small>TAKE ACTION</small><div>{role === 'Citizen' ? <button className="button-primary" onClick={() => openModal('report')}>Create a report <Icon name="arrow"/></button> : <button className="button-primary" onClick={() => goTo('city-map')}>{role === 'Sanitation Worker' ? 'View neighbourhood map' : 'Review city map'} <Icon name="arrow"/></button>}</div></article></div>
      <div className="role-worklist glass"><div className="card-heading"><div><span className="micro-label">{role === 'Citizen' ? 'REPORT ACTIVITY' : role === 'Sanitation Worker' ? 'WORKER TASK PREVIEW' : 'ADMIN REVIEW QUEUE'}</span><h3>{role === 'Citizen' ? 'Recent community reports' : role === 'Sanitation Worker' ? 'Items to review' : 'All sample reports'}</h3></div><button className="subtle-button" onClick={() => openModal('track')}>Track by ID <Icon name="arrow"/></button></div>
        <div className="role-report-list">{(role === 'Citizen' ? reports.slice(0, 5) : role === 'Sanitation Worker' ? openReports.slice(0, 5) : reports.slice(0, 7)).map((report) => <article className="role-report-row" key={report.id}><span className="role-report-mark"><Icon name="pin"/></span><span className="role-report-main"><b>{report.category}</b><small>{report.id} · {report.area} · {report.date}{proofPhotoNames[report.id] ? ` · Proof: ${proofPhotoNames[report.id]}` : ''}</small></span><span className="role-report-status">{report.status}</span>{role === 'Citizen' ? <button className="row-action" onClick={() => { setQuery(report.id); openModal('track') }}>Details <Icon name="arrow"/></button> : role === 'Sanitation Worker' ? <label className="proof-upload">{proofPhotoNames[report.id] ? 'Proof added ✓' : 'Resolve + photo'}<input type="file" accept="image/*" onChange={(event) => addCompletionProof(report.id, event.target.files?.[0])}/></label> : <select aria-label={`Update status for ${report.id}`} value={report.status === 'Received (demo)' ? 'Received (demo)' : report.status} onChange={(event) => updateReportStatus(report.id, event.target.value)}><option>Received (demo)</option><option>Crew assigned</option><option>In progress</option><option>Resolved</option><option value="Verified (demo)" disabled={!report.afterImage}>Verified (demo) · needs after-photo</option></select>}</article>)}</div>
        {role === 'Sanitation Worker' && <div className="route-preview"><span className="micro-label">SUGGESTED VISIT ORDER · SAMPLE PRIORITY</span><div>{suggestedAreas.slice(0, 4).map((place, index) => <span key={place}><b>{String(index + 1).padStart(2, '0')}</b>{place}</span>)}</div><small>Prioritised by pending sample report count, not road distance. No route optimization service is connected.</small></div>}
        {role === 'Municipal Admin' && <><div className="ward-board"><div><span className="micro-label">AREA ACTIVITY · SAMPLE RANKING</span><small>Counts show example reports by area; no official 13-ward dataset is connected.</small></div>{areaSnapshot.map((item, index) => <div className="ward-row" key={item.areaName}><b>0{index + 1}</b><span>{item.areaName}<i style={{ width: `${Math.max(4, Math.min(100, item.reports * 16))}%` }}/></span><strong>{item.reports}</strong></div>)}</div><div className="feedback-review"><div className="card-heading"><div><span className="micro-label">SUGGESTIONS DESK · LOCAL API</span><h3>Recent citizen feedback</h3></div><button className="subtle-button" onClick={() => fetch(`${apiBase}/feedback`).then((response) => response.json()).then((items: { reportId: string; rating: number; note: string; createdAt: string }[]) => setFeedbackItems(items)).catch(() => setMessage('Could not refresh feedback; local API is unavailable.'))}>Refresh <Icon name="arrow"/></button></div>{feedbackItems.filter((item) => item.note.trim()).length ? feedbackItems.filter((item) => item.note.trim()).slice(0, 5).map((item, index) => <div className="feedback-row" key={`${item.reportId}-${item.createdAt}-${index}`}><span>{'★'.repeat(item.rating)}<small>{item.reportId}</small></span><p>{item.note}</p></div>) : <p className="empty-note">No sample suggestions received yet.</p>}<small className="role-note">Feedback is saved in this local demo database and is not sent to a municipal office.</small></div></>}
        {role === 'Citizen' && <button className="feedback-cta" onClick={() => openModal('feedback')}>Rate a resolved report or leave a suggestion <Icon name="arrow"/></button>}
        <p className="role-note">Status edits are a prototype saved locally. They do not notify workers or update any municipal system.</p>
      </div>
    </section>}

    <section className="dashboard-section section-wrap"><div className="section-heading"><div><span className="section-label">THE NEIGHBOURHOOD VIEW</span><h2>A city that looks out for itself.</h2><p>Explore the sample map and see the kinds of details a real city dashboard could bring together.</p></div><span className="sample-badge"><i/> ILLUSTRATIVE SAMPLE DATA</span></div>
      <div className="dashboard-grid"><article className="map-card glass" id="city-map"><div className="card-heading"><div><span className="micro-label">REAL STREET MAP · OPENSTREETMAP</span><h3>Navsari and nearby roads</h3></div><a className="icon-button map-open" href="https://www.openstreetmap.org/#map=17/20.94237/72.92467" target="_blank" rel="noreferrer" aria-label="Open full map in OpenStreetMap">↗</a></div><div className="map-canvas real-map"><iframe title="Interactive street map of Navsari" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=72.9202%2C20.9394%2C72.9292%2C20.9454&amp;layer=mapnik&amp;marker=20.94237%2C72.92467"/><a className="map-watermark" href="https://www.openstreetmap.org/#map=17/20.94237/72.92467" target="_blank" rel="noreferrer">OPENSTREETMAP · NAVSARI</a></div><div className="map-footer"><span><i className="legend-dot mint"/> Zoom in for small lanes &amp; mapped shops</span><a className="map-full-link" href="https://www.openstreetmap.org/#map=17/20.94237/72.92467" target="_blank" rel="noreferrer">Open full map <Icon name="arrow"/></a></div><div className="map-area-list"><span>SAMPLE AREA FILTERS</span>{['Lunsikui', 'Grid Road', 'Dandi Road', 'Station Road'].map((place) => <button key={place} className={activeHotspot === place ? 'active' : ''} onClick={() => setActiveHotspot(place)}>{place}<small>{reports.filter((report) => report.area === place).length.toString().padStart(2, '0')}</small></button>)}</div></article>
      <article className="hotspot-card glass"><div className="card-heading"><div><span className="micro-label">SAMPLE REPORTS · {activeHotspot.toUpperCase()}</span><h3>{activeHotspot}</h3></div><span className="status-chip"><i/> DEMO DATA</span></div><p className="hotspot-copy">The street map is real; reports are sample summaries and are not pinned to actual complaint coordinates.</p><div className="map-status-filters"><span>STATUS FILTER</span>{(['All statuses', 'Open', 'Resolved'] as const).map((filter) => <button key={filter} className={mapStatusFilter === filter ? 'active' : ''} aria-pressed={mapStatusFilter === filter} onClick={() => setMapStatusFilter(filter)}>{filter}</button>)}</div><div className="hotspot-count"><span className="count-ring">{hotspotReports.length.toString().padStart(2, '0')}</span><span><b>Matching sample reports</b><small>Area · {mapStatusFilter.toLowerCase()}</small></span></div><div className="divider"/><div className="mini-list">{hotspotReports.slice(0, 4).map((report) => <button key={report.id} onClick={() => { setQuery(report.id); openModal('track') }}><span className="mini-bullet"/><span><b>{report.category}</b><small>{report.id} · {report.status}</small></span><Icon name="arrow"/></button>)}{!hotspotReports.length && <p className="empty-note">No sample reports match this area and status filter.</p>}</div></article></div>
    </section>

    <section className="feature-band"><div className="section-wrap feature-inner"><div className="feature-copy"><span className="section-label">A CLEARER PICTURE</span><h2>From a street photo<br/>to a shared response.</h2><p>Make it easy to share what needs attention. Add a photo, a nearby area, and a short note. Your demo submission gets a reference number you can use to follow it here.</p><button className="button-primary" onClick={() => openModal('report')}>Start a report <Icon name="arrow"/></button></div><div className="feature-photo-card glass"><img src={nmcImages.clock} alt="Navsari Clock Tower and surrounding street" loading="lazy"/><div className="feature-photo-overlay"><span>NAVSARI LANDMARK</span><b>Our city, seen by the people who live here.</b></div><div className="glass-scan"><span className="scan-icon"><Icon name="camera"/></span><span><b>Photo review</b><small>Image checks preview · AI not connected</small></span><i>PREVIEW</i></div></div><div className="photo-credit-small">CLOCK TOWER · NAVSARI <span>PHOTO: NAVSARI MUNICIPAL CORPORATION</span></div></div></section>

    <section className="deck-features section-wrap" id="platform"><div className="section-heading"><div><span className="section-label">THE SWACH REPORTING LOOP</span><h2>One clear path from report to review.</h2><p>Explore the capabilities proposed in the project deck. Connected AI, WhatsApp and municipal workflows are represented as a local prototype only.</p></div><span className="sample-badge"><i/> PROTOTYPE FEATURES</span></div><div className="deck-feature-grid"><article className="deck-feature-card glass"><span className="deck-feature-icon">01</span><span className="micro-label">TRILINGUAL · GUIDED INTAKE</span><h3>Speak the way you’re comfortable.</h3><p>Choose Gujarati, Hindi or English in the guided report. Add a photo, note, browser location, or an audio note file.</p><button onClick={() => { setLanguage('ગુજરાતી'); setQrSource(false); openModal('report') }}>Try Gujarati report <Icon name="arrow"/></button></article><article className="deck-feature-card glass"><span className="deck-feature-icon cyan">02</span><span className="micro-label">PUBLIC LOCATION · QR SCAN</span><h3>Start from a tagged location.</h3><p>Scan standard QR codes on supported browsers; an area name can preselect the report area. The municipal public-bin tag directory is not connected yet.</p><button onClick={() => { setQrScanMessage(''); setQrSource(true); setArea('Station Road'); openModal('report') }}>Try QR-tag report <Icon name="arrow"/></button></article><article className="deck-feature-card glass"><span className="deck-feature-icon violet">03</span><span className="micro-label">AI · HUMAN REVIEW</span><h3>Keep evidence with the task.</h3><p>Workers can attach an after-photo while resolving a sample task. AI comparison and official verification require external services and authorized reviewers.</p><button onClick={() => { setRole('Sanitation Worker'); user ? goTo('dashboard') : openModal('login') }}>Preview worker flow <Icon name="arrow"/></button></article><article className="deck-feature-card glass"><span className="deck-feature-icon amber">04</span><span className="micro-label">WARD · FEEDBACK · ROUTES</span><h3>See patterns, listen and respond.</h3><p>Role dashboards show sample area pulse, grouped visit suggestions, report statuses and a feedback entry point.</p><button onClick={() => { setRole('Municipal Admin'); user ? goTo('dashboard') : openModal('login') }}>Preview admin flow <Icon name="arrow"/></button></article></div><div className="integration-note glass"><span>WHATSAPP-FIRST CONCEPT</span><p>The deck proposes WhatsApp Cloud API, Supabase, AI services and official municipal approval. This browser demo does not send WhatsApp messages, call AI, authenticate accounts or update municipal records.</p><button onClick={() => openModal('login')}>Choose a demo role <Icon name="arrow"/></button></div></section>

    <section className="workflow-section section-wrap" id="report"><div className="section-heading centered"><div><span className="section-label">THREE SIMPLE STEPS</span><h2>Care, made easier.</h2></div></div><div className="workflow-grid"><button className="workflow-card glass" onClick={() => openModal('report')}><span className="step-no">01</span><span className="workflow-icon"><Icon name="camera"/></span><strong>Share what you see</strong><small>Add a photo and note what needs attention.</small><span className="workflow-go">Open report form <Icon name="arrow"/></span></button><button className="workflow-card glass" onClick={() => openModal('track')}><span className="step-no">02</span><span className="workflow-icon amber"><Icon name="clock"/></span><strong>Keep track</strong><small>Look up a demo report by its reference number.</small><span className="workflow-go">Track a report <Icon name="arrow"/></span></button><button className="workflow-card glass" onClick={() => goTo('community')}><span className="step-no">03</span><span className="workflow-icon blue"><Icon name="people"/></span><strong>Show up together</strong><small>Find a local activity and mark your interest.</small><span className="workflow-go">Meet the community <Icon name="arrow"/></span></button></div></section>

    <section className="tracking-section" id="track"><div className="section-wrap track-inner"><div><span className="section-label">YOUR REPORT, YOUR REFERENCE</span><h2>Wondering what happened next?</h2><p>Enter a reference from this demo or open a report to see its sample progress.</p></div><form className="track-search glass" onSubmit={(event) => { event.preventDefault(); openModal('track') }}><Icon name="clock"/><input aria-label="Report reference" placeholder="Try SW-2048" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="button-primary" type="submit">Find report <Icon name="arrow"/></button></form><div className="track-hint"><span>EXAMPLE REFERENCES</span>{initialReports.map((report) => <button key={report.id} onClick={() => { setQuery(report.id); openModal('track') }}>{report.id}</button>)}</div></div></section>

    <section className="community-section section-wrap" id="community"><div className="section-heading"><div><span className="section-label">GOOD THINGS HAPPEN TOGETHER</span><h2>Meet the neighbourhood.</h2><p>Sample activities to show how a community corner could work.</p></div><button className="subtle-button" onClick={() => openModal('activity')}>Suggest an activity <Icon name="arrow"/></button></div><div className="community-grid"><article className="community-photo glass"><img src={nmcImages.lake} alt="Doli Talav public promenade in Navsari" loading="lazy"/><div className="community-photo-shade"/><div className="community-photo-caption"><span>OUR SHARED SPACES</span><h3>Every corner<br/>can feel cared for.</h3><button onClick={() => openModal('report')}>Help care for yours <Icon name="arrow"/></button></div></article><article className="activity-card glass"><div className="activity-head"><span className="activity-icon">✳</span><span className="status-chip">SAMPLE ACTIVITY</span></div><span className="activity-date">SATURDAY · 8:00 AM</span><h3>Neighbourhood clean-up</h3><p>A friendly morning walk to spot litter and share ideas for keeping the lane tidy.</p><div className="activity-meta"><span><Icon name="pin"/> Lunsikui · example</span><span>{joined.includes('cleanup') ? 'You’re interested' : 'Community preview'}</span></div><button className={joined.includes('cleanup') ? 'join-button joined' : 'join-button'} onClick={() => setJoined((items) => items.includes('cleanup') ? items.filter((item) => item !== 'cleanup') : [...items, 'cleanup'])}>{joined.includes('cleanup') ? '✓ Interested · undo' : 'I’m interested'} <Icon name="arrow"/></button></article><article className="activity-card glass alternate"><div className="activity-head"><span className="activity-icon amber">⌁</span><span className="status-chip">SAMPLE ACTIVITY</span></div><span className="activity-date">SUNDAY · 5:30 PM</span><h3>Ideas for a greener street</h3><p>Meet neighbours, trade small ideas, and imagine a more welcoming public space.</p><div className="activity-meta"><span><Icon name="pin"/> Dandi Road · example</span><span>{joined.includes('ideas') ? 'You’re interested' : 'Community preview'}</span></div><button className={joined.includes('ideas') ? 'join-button joined' : 'join-button'} onClick={() => setJoined((items) => items.includes('ideas') ? items.filter((item) => item !== 'ideas') : [...items, 'ideas'])}>{joined.includes('ideas') ? '✓ Interested · undo' : 'I’m interested'} <Icon name="arrow"/></button></article></div></section>

    <section className="closing-cta"><div className="closing-backdrop" style={{ backgroundImage: `url("${nmcImages.clock}")` }}/><div className="closing-content"><span className="section-label">ONE CITY. MANY SMALL ACTS.</span><h2>There’s a place for<br/><em>you in this story.</em></h2><p>Start with a concern, a good idea, or simply showing up.</p><button className="button-primary" onClick={() => openModal('report')}>Take your first step <Icon name="arrow"/></button></div></section>

    <footer className="footer"><button className="brand footer-brand" onClick={() => goTo('home')}><span className="brand-icon">S<span>.</span></span><span><b>S.W.A.C.H.</b><small>NAVSARI · GUJARAT</small></span></button><p>Community experience concept · Sample data only · Not connected to a municipal service.</p><div><button onClick={() => openModal('login')}>Sign in</button><button onClick={() => goTo('home')}>Back to top ↑</button></div></footer>

    {modal && <div className="modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}><section className="dialog glass" role="dialog" aria-modal="true" aria-label={modal === 'report' ? 'Report a concern' : modal === 'track' ? 'Track report' : modal === 'login' ? 'Sign in' : modal === 'feedback' ? 'Rate a report or leave a suggestion' : modal === 'assistant' ? 'Guided reporting preview' : 'Suggest an activity'}><button className="dialog-close" onClick={closeModal} aria-label="Close"><Icon name="close"/></button>
      {modal === 'login' && <><div className="dialog-heading"><span className="section-label">WELCOME TO S.W.A.C.H.</span><h2>{user ? 'You’re signed in.' : 'Step into the community.'}</h2><p>Sign-in is a local demo. No account or municipal service is connected.</p></div><div className="role-picker"><span className="field-caption">CHOOSE YOUR DEMO ROLE</span>{roleOptions.map((option) => <button key={option} className={role === option ? 'chosen' : ''} onClick={() => setRole(option)}>{option}</button>)}</div><form className="dialog-form" onSubmit={signIn}><label className="field-caption" htmlFor="signin-email">EMAIL</label><input id="signin-email" name="email" type="email" placeholder="you@example.com" required/><label className="field-caption" htmlFor="signin-password">PASSWORD</label><input id="signin-password" name="password" type="password" minLength={8} placeholder="At least 8 characters" required/><button className="button-primary full" type="submit">Continue as {role} <Icon name="arrow"/></button></form>{message && <p className="inline-success">{message}</p>}</>}
      {modal === 'report' && <><div className="dialog-heading"><span className="section-label">CITIZEN EXPERIENCE · DEMO</span><h2>{reportCopy.title}</h2><p>{reportCopy.intro}</p></div><div className="language-picker" aria-label="Report language">{(['English', 'ગુજરાતી', 'हिन्दी'] as const).map((item) => <button type="button" key={item} className={language === item ? 'chosen' : ''} onClick={() => setLanguage(item)}>{item}</button>)}</div>{qrSource && <div className="qr-preview"><b>QR-tag reporting · prototype</b><small>Scanned content can choose an area. The city's bin-tag directory is not connected.</small><button type="button" className="location-button" onClick={qrScanning ? stopQrScan : startQrScan}>{qrScanning ? 'Stop camera scan' : 'Scan QR with camera'}</button><video className="qr-camera-preview" ref={qrVideoRef} autoPlay playsInline muted hidden={!qrScanning}/>{qrScanMessage && <small className="voice-ready">{qrScanMessage}</small>}</div>}<form className="dialog-form report-form" onSubmit={submitReport}><label className="field-caption" htmlFor="issue-category">{reportCopy.category}</label><select id="issue-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>Street litter</option><option>Overflowing bin</option><option>Missed collection</option><option>Illegal dumping</option><option>Other cleanliness concern</option></select><label className="field-caption" htmlFor="issue-area">{reportCopy.area}</label><select id="issue-area" value={area} onChange={(event) => setArea(event.target.value)}><option>Lunsikui</option><option>Grid Road</option><option>Dandi Road</option><option>Station Road</option><option>Other area</option></select><div className="location-row"><button type="button" className="location-button" onClick={locateMe}><Icon name="pin"/> {reportCopy.gps}</button><span>{location || 'Optional · browser location permission required'}</span></div><label className="field-caption" htmlFor="issue-details">{reportCopy.note}</label><textarea id="issue-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What did you notice? / તમે શું જોયું?" rows={3} required/><button type="button" className="category-suggest" onClick={suggestCategory}>Suggest a category from keywords <Icon name="arrow"/></button><label className="field-caption" htmlFor="issue-photo">{reportCopy.photo} <small>Optional · image up to 8 MB</small></label><label className="upload-box" htmlFor="issue-photo">{photo ? <img src={photo} alt="Selected report preview"/> : <><span><Icon name="camera"/></span><b>Choose a photo</b><small>Image checks are a preview; AI is not connected.</small></>}<input id="issue-photo" type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])}/></label><label className="field-caption" htmlFor="voice-note">VOICE NOTE <small>Optional · audio up to 1 MB; speech transcription is not connected</small></label><input id="voice-note" className="audio-input" type="file" accept="audio/*" onChange={(event) => chooseVoiceNote(event.target.files?.[0])}/>{voiceNoteName && <small className="voice-ready">Audio ready for upload: {voiceNoteName}</small>}{message && <p className="inline-success">{message}</p>}<button className="button-primary full" type="submit">{reportCopy.submit} <Icon name="arrow"/></button></form></>}
      {modal === 'track' && <><div className="dialog-heading"><span className="section-label">REPORT FOLLOW-UP · DEMO</span><h2>Track a report.</h2><p>Try SW-2048, SW-2039, SW-2026, or a reference created in this browser.</p></div><form className="track-dialog-form" onSubmit={(event) => event.preventDefault()}><input aria-label="Report reference number" placeholder="Enter reference, e.g. SW-2048" value={query} onChange={(event) => setQuery(event.target.value)}/><button className="button-primary" type="submit">Search <Icon name="arrow"/></button></form>{tracked ? <div className="report-result"><div className="result-top"><span>{tracked.id}</span><span className="status-chip"><i/>{tracked.status}</span></div><h3>{tracked.category}</h3><p>{tracked.area} · {tracked.date}{tracked.source ? ` · ${tracked.source}` : ''}</p>{(tracked.image || tracked.afterImage) && <div className="evidence-pair">{tracked.image && <figure><img className="tracked-photo" src={tracked.image} alt="Before photo attached to demo report"/><figcaption>BEFORE · CITIZEN PHOTO</figcaption></figure>}{tracked.afterImage && <figure><img className="tracked-photo" src={tracked.afterImage} alt="After photo attached as demo completion proof"/><figcaption>AFTER · WORKER PHOTO</figcaption></figure>}</div>}<div className="progress-line"><i className="done"/><i className={tracked.status === 'Received (demo)' ? '' : 'done'}/><i className={tracked.status === 'Resolved' || tracked.status === 'Verified (demo)' ? 'done' : ''}/></div><div className="progress-labels"><span>Received</span><span>In progress</span><span>Resolved</span></div>{(tracked.status === 'Resolved' || tracked.status === 'Verified (demo)') && <button className="feedback-cta" onClick={() => openModal('feedback')}>Rate this report <Icon name="arrow"/></button>}<small className="demo-disclaimer">Example status only. There is no live municipal complaint connection.</small></div> : <div className="not-found"><span>⌕</span><b>{query ? 'No report with that reference.' : 'Enter a report reference to begin.'}</b><small>{query ? 'Check the number or try one of the sample references.' : 'New demo reports appear here after you submit the form.'}</small></div>}{message && <p className="inline-success">{message}</p>}</>}
      {modal === 'track' && tracked?.location && <p className="track-location-note">Optional location captured: {tracked.location}</p>}
      {modal === 'track' && tracked?.voiceNoteName && <div className="voice-track"><span><b>Voice note saved</b><small>{tracked.voiceNoteName} · transcription unavailable</small></span><button type="button" className="location-button" onClick={() => tracked && loadVoiceNote(tracked)}>Load audio</button>{voicePlayback[tracked.id] && <audio controls src={voicePlayback[tracked.id]}/>}</div>}
      {modal === 'activity' && <><div className="dialog-heading"><span className="section-label">COMMUNITY IDEAS · DEMO</span><h2>Suggest an activity.</h2><p>This local preview stores nothing publicly; share a sample idea to see the confirmation state.</p></div><form className="dialog-form" onSubmit={(event) => { event.preventDefault(); setMessage(`“${activityName}” is saved as a local demo suggestion.`) }}><label className="field-caption" htmlFor="activity-name">ACTIVITY IDEA</label><input id="activity-name" value={activityName} onChange={(event) => setActivityName(event.target.value)} placeholder="e.g. A cleaner lane together" required/><label className="field-caption" htmlFor="activity-area">AREA</label><select id="activity-area"><option>Lunsikui</option><option>Grid Road</option><option>Dandi Road</option><option>Station Road</option></select><button className="button-primary full" type="submit">Save sample idea <Icon name="arrow"/></button></form>{message && <p className="inline-success">{message}</p>}</>}
      {modal === 'feedback' && <><div className="dialog-heading"><span className="section-label">CITIZEN FEEDBACK · DEMO</span><h2>How did we do?</h2><p>Rate a sample report or leave a suggestion for this concept. Saved in the local demo API or this browser.</p></div><form className="dialog-form" onSubmit={saveFeedback}><label className="field-caption" htmlFor="feedback-report">REPORT REFERENCE</label><select id="feedback-report" value={query} onChange={(event) => setQuery(event.target.value)}><option value="">General suggestion</option>{reports.map((report) => <option key={report.id} value={report.id}>{report.id} · {report.category}</option>)}</select><span className="field-caption">SATISFACTION RATING</span><div className="rating-stars" role="group" aria-label="Select a rating from one to five">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} star${star > 1 ? 's' : ''}`} aria-pressed={feedbackRating === star} className={feedbackRating >= star ? 'selected' : ''} onClick={() => setFeedbackRating(star)}>★</button>)}</div><label className="field-caption" htmlFor="feedback-note">SUGGESTION OR COMMENT</label><textarea id="feedback-note" value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} rows={3} placeholder="What could work better?"/><button className="button-primary full" type="submit">Save demo feedback <Icon name="arrow"/></button></form>{feedbackSaved && <p className="inline-success">Feedback saved locally. No municipal team has received it.</p>}{message && <p className="inline-success">{message}</p>}</>}
    </section></div>}
    {message && !modal && <button className="toast" onClick={() => setMessage('')}>{message}<Icon name="close"/></button>}
  </main>
}

export default App
