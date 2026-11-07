import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type Role = 'Citizen' | 'Sanitation Worker' | 'Municipal Admin'
type Report = { id: string; category: string; area: string; details: string; status: string; date: string; image?: string }
type Modal = 'login' | 'report' | 'track' | 'activity' | null

const roleOptions: Role[] = ['Citizen', 'Sanitation Worker', 'Municipal Admin']
const storageKey = 'swach-navsari-demo-reports'
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
  const [activityName, setActivityName] = useState('')

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(reports.filter((report) => !initialReports.some((seed) => seed.id === report.id)))) }, [reports])

  const tracked = useMemo(() => reports.find((report) => report.id.toLowerCase() === query.trim().toLowerCase()), [reports, query])

  function openModal(next: Modal) { setMessage(''); setModal(next) }
  function goTo(id: string) { setSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  function locateMe() {
    if (!navigator.geolocation) { setLocation('Location is not available in this browser. Choose an area instead.'); return }
    setLocation('Requesting your location…')
    navigator.geolocation.getCurrentPosition((position) => setLocation(`Location captured (${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}) — demo only`), () => setLocation('Location permission was not granted. Choose an area instead.'), { timeout: 8000 })
  }
  function choosePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return }
    if (file.size > 8 * 1024 * 1024) { setMessage('Choose an image smaller than 8 MB.'); return }
    setPhoto(URL.createObjectURL(file)); setMessage('Photo ready. AI image verification is not connected in this demo.')
  }
  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const report: Report = { id: `SW-${Math.floor(3000 + Math.random() * 6999)}`, category, area, details, status: 'Received (demo)', date: 'Just now', image: photo }
    setReports((current) => [report, ...current]); setQuery(report.id); setMessage(`Demo report saved on this device. Reference: ${report.id}`); setModal('track'); setDetails(''); setPhoto(''); setLocation('')
  }
  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setUser(String(data.get('email')).split('@')[0] || role); setMessage(`Demo ${role.toLowerCase()} session started on this device.`)
    window.setTimeout(() => { setModal(null); setMessage(''); goTo('dashboard') }, 700)
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'dashboard', label: 'City pulse', icon: 'chart' },
    { id: 'city-map', label: 'Cleanliness map', icon: 'map' },
    { id: 'report', label: 'Report an issue', icon: 'report' },
    { id: 'track', label: 'Track a report', icon: 'clock' },
    { id: 'community', label: 'Community', icon: 'people' },
  ]

  return <main className="app-shell">
    <div className="page-glow glow-a"/><div className="page-glow glow-b"/>
    <header className="topbar glass">
      <button className="brand" onClick={() => goTo('home')} aria-label="S.W.A.C.H. home"><span className="brand-icon">S<span>.</span></span><span><b>S.W.A.C.H.</b><small>NAVSARI · GUJARAT</small></span></button>
      <nav className="desktop-nav" aria-label="Main navigation">{navItems.slice(0, 5).map((item) => <button key={item.id} className={section === item.id ? 'current' : ''} onClick={() => item.id === 'report' ? openModal('report') : item.id === 'track' ? openModal('track') : goTo(item.id)}>{item.label}</button>)}</nav>
      <div className="top-actions"><span className="live-pill"><i/> DEMO MODE</span>{user ? <button className="user-chip" onClick={() => { setUser(''); setMessage('Signed out of the local demo.') }}>{user} <span>↗</span></button> : <button className="login-btn" onClick={() => openModal('login')}>Sign in <Icon name="arrow"/></button>}<button className="mobile-menu" onClick={() => document.getElementById('mobile-nav')?.classList.toggle('is-open')} aria-label="Toggle menu">☰</button></div>
    </header>
    <nav className="mobile-nav glass" id="mobile-nav">{navItems.map((item) => <button key={item.id} onClick={() => { document.getElementById('mobile-nav')?.classList.remove('is-open'); item.id === 'report' ? openModal('report') : item.id === 'track' ? openModal('track') : goTo(item.id) }}>{item.label}</button>)}</nav>

    <section className="hero-section" id="home">
      <div className="hero-photo" role="img" aria-label="Doli Talav promenade in Navsari" style={{ backgroundImage: `url("${nmcImages.lake}")` }}/><div className="hero-shade"/>
      <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
      <div className="hero-content"><div className="eyebrow"><span className="eyebrow-line"/> SMART WASTE ACTION & CLEANLINESS HUB</div><h1>Let’s make<br/>Navsari <em>shine.</em></h1><p>Notice something? Take a photo, tell us where it is, and help your neighbours care for the city we share.</p><div className="hero-ctas"><button className="button-primary" onClick={() => openModal('report')}><Icon name="report"/> Report a concern <Icon name="arrow"/></button><button className="button-glass" onClick={() => goTo('dashboard')}>Explore the city pulse <span>↓</span></button></div><div className="hero-trust"><span className="trust-dot"><Icon name="pin"/></span><span><b>Made for Navsari</b><small>Local pride. Shared responsibility.</small></span></div></div>
      <aside className="hero-float glass"><div className="float-top"><span className="float-icon">✳</span><span className="mini-live"><i/> CITY PULSE · SAMPLE</span></div><strong>Small actions<br/>add up.</strong><p>A cleaner corner can inspire a whole neighbourhood.</p><button onClick={() => goTo('community')}>See what’s happening <Icon name="arrow"/></button></aside>
      <div className="photo-credit">DOLI TALAV · NAVSARI <span>PHOTO: NAVSARI MUNICIPAL CORPORATION</span></div>
      <div className="hero-bottom"><span>01 <i/> A SHARED CITY, A SHARED CARE</span><button onClick={() => goTo('dashboard')}>SCROLL TO EXPLORE ↓</button></div>
    </section>

    <section className="intro-strip" id="dashboard"><div><span className="section-label">NAVSARI AT A GLANCE</span><h2>See the bigger picture.</h2><p>A community dashboard concept, using clearly marked sample information.</p></div><div className="metric-card glass"><span className="metric-symbol">◉</span><span><small>Reports in this demo</small><strong>{reports.length.toString().padStart(2, '0')}</strong></span><i>LOCAL</i></div><div className="metric-card glass"><span className="metric-symbol orange">⌁</span><span><small>Sample areas to explore</small><strong>04</strong></span><i>DEMO</i></div><div className="metric-card glass"><span className="metric-symbol green">↗</span><span><small>Ways to take part</small><strong>03</strong></span><i>OPEN</i></div></section>

    <section className="dashboard-section section-wrap"><div className="section-heading"><div><span className="section-label">THE NEIGHBOURHOOD VIEW</span><h2>A city that looks out for itself.</h2><p>Explore the sample map and see the kinds of details a real city dashboard could bring together.</p></div><span className="sample-badge"><i/> ILLUSTRATIVE SAMPLE DATA</span></div>
      <div className="dashboard-grid"><article className="map-card glass" id="city-map"><div className="card-heading"><div><span className="micro-label">REAL STREET MAP · OPENSTREETMAP</span><h3>Navsari and nearby roads</h3></div><a className="icon-button map-open" href="https://www.openstreetmap.org/#map=15/20.94237/72.92467" target="_blank" rel="noreferrer" aria-label="Open full map in OpenStreetMap">↗</a></div><div className="map-canvas real-map"><iframe title="Interactive street map of Navsari" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=72.9000%2C20.9250%2C72.9490%2C20.9610&amp;layer=mapnik&amp;marker=20.94237%2C72.92467"/><a className="map-watermark" href="https://www.openstreetmap.org/#map=15/20.94237/72.92467" target="_blank" rel="noreferrer">OPENSTREETMAP · NAVSARI</a></div><div className="map-footer"><span><i className="legend-dot mint"/> Real streets · pan and zoom inside the map</span><a className="map-full-link" href="https://www.openstreetmap.org/#map=15/20.94237/72.92467" target="_blank" rel="noreferrer">Open full map <Icon name="arrow"/></a></div><div className="map-area-list"><span>DEMO AREA SUMMARIES</span>{['Lunsikui', 'Grid Road', 'Dandi Road'].map((place) => <button key={place} className={activeHotspot === place ? 'active' : ''} onClick={() => setActiveHotspot(place)}>{place}<small>{reports.filter((report) => report.area === place).length.toString().padStart(2, '0')}</small></button>)}</div></article>
      <article className="hotspot-card glass"><div className="card-heading"><div><span className="micro-label">SAMPLE REPORTS · {activeHotspot.toUpperCase()}</span><h3>{activeHotspot}</h3></div><span className="status-chip"><i/> DEMO DATA</span></div><p className="hotspot-copy">The street map is real; these example reports are not placed on the map and do not represent live municipal complaints.</p><div className="hotspot-count"><span className="count-ring">{reports.filter((report) => report.area === activeHotspot).length.toString().padStart(2, '0')}</span><span><b>Example reports</b><small>Local demo records only</small></span></div><div className="divider"/><div className="mini-list">{reports.filter((report) => report.area === activeHotspot).slice(0, 2).map((report) => <button key={report.id} onClick={() => { setQuery(report.id); openModal('track') }}><span className="mini-bullet"/><span><b>{report.category}</b><small>{report.id} · {report.status}</small></span><Icon name="arrow"/></button>)}{!reports.some((report) => report.area === activeHotspot) && <p className="empty-note">No example reports in this area. Try another demo area.</p>}</div></article></div>
    </section>

    <section className="feature-band"><div className="section-wrap feature-inner"><div className="feature-copy"><span className="section-label">A CLEARER PICTURE</span><h2>From a street photo<br/>to a shared response.</h2><p>Make it easy to share what needs attention. Add a photo, a nearby area, and a short note. Your demo submission gets a reference number you can use to follow it here.</p><button className="button-primary" onClick={() => openModal('report')}>Start a report <Icon name="arrow"/></button></div><div className="feature-photo-card glass"><img src={nmcImages.clock} alt="Navsari Clock Tower and surrounding street" loading="lazy"/><div className="feature-photo-overlay"><span>NAVSARI LANDMARK</span><b>Our city, seen by the people who live here.</b></div><div className="glass-scan"><span className="scan-icon"><Icon name="camera"/></span><span><b>Photo review</b><small>Image checks preview · AI not connected</small></span><i>PREVIEW</i></div></div><div className="photo-credit-small">CLOCK TOWER · NAVSARI <span>PHOTO: NAVSARI MUNICIPAL CORPORATION</span></div></div></section>

    <section className="workflow-section section-wrap" id="report"><div className="section-heading centered"><div><span className="section-label">THREE SIMPLE STEPS</span><h2>Care, made easier.</h2></div></div><div className="workflow-grid"><button className="workflow-card glass" onClick={() => openModal('report')}><span className="step-no">01</span><span className="workflow-icon"><Icon name="camera"/></span><strong>Share what you see</strong><small>Add a photo and note what needs attention.</small><span className="workflow-go">Open report form <Icon name="arrow"/></span></button><button className="workflow-card glass" onClick={() => openModal('track')}><span className="step-no">02</span><span className="workflow-icon amber"><Icon name="clock"/></span><strong>Keep track</strong><small>Look up a demo report by its reference number.</small><span className="workflow-go">Track a report <Icon name="arrow"/></span></button><button className="workflow-card glass" onClick={() => goTo('community')}><span className="step-no">03</span><span className="workflow-icon blue"><Icon name="people"/></span><strong>Show up together</strong><small>Find a local activity and mark your interest.</small><span className="workflow-go">Meet the community <Icon name="arrow"/></span></button></div></section>

    <section className="tracking-section" id="track"><div className="section-wrap track-inner"><div><span className="section-label">YOUR REPORT, YOUR REFERENCE</span><h2>Wondering what happened next?</h2><p>Enter a reference from this demo or open a report to see its sample progress.</p></div><form className="track-search glass" onSubmit={(event) => { event.preventDefault(); openModal('track') }}><Icon name="clock"/><input aria-label="Report reference" placeholder="Try SW-2048" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="button-primary" type="submit">Find report <Icon name="arrow"/></button></form><div className="track-hint"><span>EXAMPLE REFERENCES</span>{initialReports.map((report) => <button key={report.id} onClick={() => { setQuery(report.id); openModal('track') }}>{report.id}</button>)}</div></div></section>

    <section className="community-section section-wrap" id="community"><div className="section-heading"><div><span className="section-label">GOOD THINGS HAPPEN TOGETHER</span><h2>Meet the neighbourhood.</h2><p>Sample activities to show how a community corner could work.</p></div><button className="subtle-button" onClick={() => openModal('activity')}>Suggest an activity <Icon name="arrow"/></button></div><div className="community-grid"><article className="community-photo glass"><img src={nmcImages.lake} alt="Doli Talav public promenade in Navsari" loading="lazy"/><div className="community-photo-shade"/><div className="community-photo-caption"><span>OUR SHARED SPACES</span><h3>Every corner<br/>can feel cared for.</h3><button onClick={() => openModal('report')}>Help care for yours <Icon name="arrow"/></button></div></article><article className="activity-card glass"><div className="activity-head"><span className="activity-icon">✳</span><span className="status-chip">SAMPLE ACTIVITY</span></div><span className="activity-date">SATURDAY · 8:00 AM</span><h3>Neighbourhood clean-up</h3><p>A friendly morning walk to spot litter and share ideas for keeping the lane tidy.</p><div className="activity-meta"><span><Icon name="pin"/> Lunsikui · example</span><span>{joined.includes('cleanup') ? 'You’re interested' : 'Community preview'}</span></div><button className={joined.includes('cleanup') ? 'join-button joined' : 'join-button'} onClick={() => setJoined((items) => items.includes('cleanup') ? items.filter((item) => item !== 'cleanup') : [...items, 'cleanup'])}>{joined.includes('cleanup') ? '✓ Interested · undo' : 'I’m interested'} <Icon name="arrow"/></button></article><article className="activity-card glass alternate"><div className="activity-head"><span className="activity-icon amber">⌁</span><span className="status-chip">SAMPLE ACTIVITY</span></div><span className="activity-date">SUNDAY · 5:30 PM</span><h3>Ideas for a greener street</h3><p>Meet neighbours, trade small ideas, and imagine a more welcoming public space.</p><div className="activity-meta"><span><Icon name="pin"/> Dandi Road · example</span><span>{joined.includes('ideas') ? 'You’re interested' : 'Community preview'}</span></div><button className={joined.includes('ideas') ? 'join-button joined' : 'join-button'} onClick={() => setJoined((items) => items.includes('ideas') ? items.filter((item) => item !== 'ideas') : [...items, 'ideas'])}>{joined.includes('ideas') ? '✓ Interested · undo' : 'I’m interested'} <Icon name="arrow"/></button></article></div></section>

    <section className="closing-cta"><div className="closing-backdrop" style={{ backgroundImage: `url("${nmcImages.clock}")` }}/><div className="closing-content"><span className="section-label">ONE CITY. MANY SMALL ACTS.</span><h2>There’s a place for<br/><em>you in this story.</em></h2><p>Start with a concern, a good idea, or simply showing up.</p><button className="button-primary" onClick={() => openModal('report')}>Take your first step <Icon name="arrow"/></button></div></section>

    <footer className="footer"><button className="brand footer-brand" onClick={() => goTo('home')}><span className="brand-icon">S<span>.</span></span><span><b>S.W.A.C.H.</b><small>NAVSARI · GUJARAT</small></span></button><p>Community experience concept · Sample data only · Not connected to a municipal service.</p><div><button onClick={() => openModal('login')}>Sign in</button><button onClick={() => goTo('home')}>Back to top ↑</button></div></footer>

    {modal && <div className="modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="dialog glass" role="dialog" aria-modal="true" aria-label={modal === 'report' ? 'Report a concern' : modal === 'track' ? 'Track report' : modal === 'login' ? 'Sign in' : 'Suggest an activity'}><button className="dialog-close" onClick={() => setModal(null)} aria-label="Close"><Icon name="close"/></button>
      {modal === 'login' && <><div className="dialog-heading"><span className="section-label">WELCOME TO S.W.A.C.H.</span><h2>{user ? 'You’re signed in.' : 'Step into the community.'}</h2><p>Sign-in is a local demo. No account or municipal service is connected.</p></div><div className="role-picker"><span className="field-caption">CHOOSE YOUR DEMO ROLE</span>{roleOptions.map((option) => <button key={option} className={role === option ? 'chosen' : ''} onClick={() => setRole(option)}>{option}</button>)}</div><form className="dialog-form" onSubmit={signIn}><label className="field-caption" htmlFor="signin-email">EMAIL</label><input id="signin-email" name="email" type="email" placeholder="you@example.com" required/><label className="field-caption" htmlFor="signin-password">PASSWORD</label><input id="signin-password" name="password" type="password" minLength={8} placeholder="At least 8 characters" required/><button className="button-primary full" type="submit">Continue as {role} <Icon name="arrow"/></button></form>{message && <p className="inline-success">{message}</p>}</>}
      {modal === 'report' && <><div className="dialog-heading"><span className="section-label">CITIZEN EXPERIENCE · DEMO</span><h2>Report a concern.</h2><p>Share a sample report. It stays in this browser and gets a reference number.</p></div><form className="dialog-form report-form" onSubmit={submitReport}><label className="field-caption" htmlFor="issue-category">WHAT NEEDS ATTENTION?</label><select id="issue-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>Street litter</option><option>Overflowing bin</option><option>Missed collection</option><option>Illegal dumping</option><option>Other cleanliness concern</option></select><label className="field-caption" htmlFor="issue-area">NEAREST AREA</label><select id="issue-area" value={area} onChange={(event) => setArea(event.target.value)}><option>Lunsikui</option><option>Grid Road</option><option>Dandi Road</option><option>Station Road</option><option>Other area</option></select><div className="location-row"><button type="button" className="location-button" onClick={locateMe}><Icon name="pin"/> Use my location</button><span>{location || 'Optional · browser location permission required'}</span></div><label className="field-caption" htmlFor="issue-details">ADD A SHORT NOTE</label><textarea id="issue-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What did you notice?" rows={3} required/><label className="field-caption" htmlFor="issue-photo">ADD A PHOTO <small>Optional · JPG/PNG, up to 8 MB</small></label><label className="upload-box" htmlFor="issue-photo">{photo ? <img src={photo} alt="Selected report preview"/> : <><span><Icon name="camera"/></span><b>Choose a photo</b><small>Photo review is a visual preview; AI is not connected.</small></>}<input id="issue-photo" type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])}/></label>{message && <p className="inline-success">{message}</p>}<button className="button-primary full" type="submit">Save demo report <Icon name="arrow"/></button></form></>}
      {modal === 'track' && <><div className="dialog-heading"><span className="section-label">REPORT FOLLOW-UP · DEMO</span><h2>Track a report.</h2><p>Try SW-2048, SW-2039, SW-2026, or a reference created in this browser.</p></div><form className="track-dialog-form" onSubmit={(event) => event.preventDefault()}><input aria-label="Report reference number" placeholder="Enter reference, e.g. SW-2048" value={query} onChange={(event) => setQuery(event.target.value)}/><button className="button-primary" type="submit">Search <Icon name="arrow"/></button></form>{tracked ? <div className="report-result"><div className="result-top"><span>{tracked.id}</span><span className="status-chip"><i/>{tracked.status}</span></div><h3>{tracked.category}</h3><p>{tracked.area} · {tracked.date}</p>{tracked.image && <img className="tracked-photo" src={tracked.image} alt="Photo attached to demo report"/>}<div className="progress-line"><i className="done"/><i className={tracked.status === 'Received (demo)' ? '' : 'done'}/><i className={tracked.status === 'Resolved' ? 'done' : ''}/></div><div className="progress-labels"><span>Received</span><span>In progress</span><span>Resolved</span></div><small className="demo-disclaimer">Example status only. There is no live municipal complaint connection.</small></div> : <div className="not-found"><span>⌕</span><b>{query ? 'No report with that reference.' : 'Enter a report reference to begin.'}</b><small>{query ? 'Check the number or try one of the sample references.' : 'New demo reports appear here after you submit the form.'}</small></div>}{message && <p className="inline-success">{message}</p>}</>}
      {modal === 'activity' && <><div className="dialog-heading"><span className="section-label">COMMUNITY IDEAS · DEMO</span><h2>Suggest an activity.</h2><p>This local preview stores nothing publicly; share a sample idea to see the confirmation state.</p></div><form className="dialog-form" onSubmit={(event) => { event.preventDefault(); setMessage(`“${activityName}” is saved as a local demo suggestion.`) }}><label className="field-caption" htmlFor="activity-name">ACTIVITY IDEA</label><input id="activity-name" value={activityName} onChange={(event) => setActivityName(event.target.value)} placeholder="e.g. A cleaner lane together" required/><label className="field-caption" htmlFor="activity-area">AREA</label><select id="activity-area"><option>Lunsikui</option><option>Grid Road</option><option>Dandi Road</option><option>Station Road</option></select><button className="button-primary full" type="submit">Save sample idea <Icon name="arrow"/></button></form>{message && <p className="inline-success">{message}</p>}</>}
    </section></div>}
    {message && !modal && <button className="toast" onClick={() => setMessage('')}>{message}<Icon name="close"/></button>}
  </main>
}

export default App
