import { useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

import {
  ScanText, Upload, Camera, FileText, Clock3, Copy, Download, Trash2,
  Search, Check, LoaderCircle, Image as ImageIcon, X, ShieldCheck,
  ScanLine, Menu, PanelLeftClose
} from 'lucide-react'
type ScanRecord = { id: string; name: string; text: string; date: string; preview: string }
const STORAGE_KEY = 'clearscan-history-v1'

function readHistory(): ScanRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ScanRecord[] }
  catch { return [] }
}

export default function App() {
  const [image, setImage] = useState<string>('')
  const [fileName, setFileName] = useState('')
  const [recognizedText, setRecognizedText] = useState('')
  const [history, setHistory] = useState<ScanRecord[]>(readHistory)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Ready to scan')
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner')
  const [notice, setNotice] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)) }, [history])
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()) }, [])

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  function selectImage(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { showNotice('Please select an image file.'); return }
    if (file.size > 15 * 1024 * 1024) { showNotice('Image must be smaller than 15 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result || ''))
      setFileName(file.name)
      setRecognizedText('')
      setProgress(0)
      setStatus('Image ready to scan')
      setActiveTab('scanner')
    }
    reader.onerror = () => showNotice('Could not read this image. Please try another file.')
    reader.readAsDataURL(file)
  }

  async function startScan() {
    if (!image || busy) return
    setBusy(true); setProgress(0); setRecognizedText(''); setStatus('Preparing OCR engine...')
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined
    try {
      worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status) setStatus(message.status === 'recognizing text' ? 'Recognizing text...' : message.status)
          if (message.status === 'recognizing text' && message.progress !== undefined) setProgress(Math.round(message.progress * 100))
        },
      })
      const result = await worker.recognize(image)
      const text = result.data.text.trim()
      setRecognizedText(text)
      setProgress(100)
      setStatus(text ? 'Scan completed' : 'No text found')
      if (text) {
        const record: ScanRecord = {
          id: crypto.randomUUID(), name: fileName || 'Scanned image', text,
          date: new Date().toISOString(), preview: image,
        }
        setHistory(current => [record, ...current].slice(0, 50))
      }
    } catch (error) {
      console.error(error)
      setStatus('Scan failed')
      showNotice('OCR could not process this image. Try a clearer picture.')
    } finally {
      if (worker) await worker.terminate()
      setBusy(false)
    }
  }

  async function openCamera() {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera access is unavailable. Use HTTPS or localhost, or upload an image.'); setCameraOpen(true); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
    } catch {
      setCameraError('Camera permission was denied or no camera was found. You can upload an image instead.')
      setCameraOpen(true)
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setImage(canvas.toDataURL('image/png'))
    setFileName(`camera-scan-${new Date().toLocaleDateString()}.png`)
    setRecognizedText(''); setStatus('Photo captured - ready to scan')
    closeCamera(); setActiveTab('scanner')
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null; setCameraOpen(false)
  }

  async function copyText(text = recognizedText) {
    if (!text.trim()) return
    try { await navigator.clipboard.writeText(text); showNotice('Text copied to clipboard.') }
    catch { showNotice('Clipboard access is unavailable in this browser.') }
  }

  function downloadText(text = recognizedText, name = fileName || 'clearscan-result') {
    if (!text.trim()) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url
    link.download = `${name.replace(/\.[^/.]+$/, '')}-text.txt`; link.click()
    URL.revokeObjectURL(url)
  }

  function removeRecord(id: string) { setHistory(items => items.filter(item => item.id !== id)); showNotice('Scan removed.') }
  function loadRecord(record: ScanRecord) {
    setImage(record.preview); setFileName(record.name); setRecognizedText(record.text)
    setStatus('Previous scan loaded'); setActiveTab('scanner')
  }

  const filteredHistory = history.filter(item => `${item.name} ${item.text}`.toLowerCase().includes(query.toLowerCase()))
  const wordCount = recognizedText.trim() ? recognizedText.trim().split(/\s+/).length : 0

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-icon"><ScanText size={23}/></div><div><strong>ClearScan</strong><span>OCR WORKSPACE</span></div><button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><PanelLeftClose size={19}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${activeTab === 'scanner' ? 'active' : ''}`} onClick={() => {setActiveTab('scanner');setMobileMenu(false)}}><ScanLine size={18}/> <span>Text scanner</span></button>
      <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => {setActiveTab('history');setMobileMenu(false)}}><Clock3 size={18}/> <span>Scan history</span><span className="nav-count">{history.length}</span></button>
      <div className="sidebar-bottom"><div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={18}/></div><strong>Your files stay private</strong><p>Images are processed in your browser and are not uploaded to a ClearScan server.</p></div><div className="version">CLEARSCAN OCR <span>v1.0.0</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{activeTab === 'scanner' ? 'Text scanner' : 'Scan history'}</b></div><div className="topbar-right"><span className="status-dot"/> All systems operational</div></header>
      <div className="page-content">
        {activeTab === 'scanner' ? <>
          <div className="page-heading"><div><div className="eyebrow">DOCUMENT TO TEXT</div><h1>Text scanner</h1><p>Turn pictures and documents into editable text in seconds.</p></div><div className="heading-mark"><ScanText size={25}/></div></div>
          <div className="workspace-grid">
            <section className="panel upload-panel">
              <div className="panel-heading"><div><h2><span className="step-number">1</span> Add your image</h2><p>Upload a picture or use your camera.</p></div><span className="optional-tag">STEP 01</span></div>
              <div className={`drop-zone ${image ? 'has-image' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();selectImage(event.dataTransfer.files?.[0])}}>
                {image ? <><img className="preview-image" src={image} alt="Selected document preview"/><div className="image-overlay"><span><ImageIcon size={15}/> {fileName}</span><button onClick={() => {setImage('');setFileName('');setRecognizedText('');setStatus('Ready to scan')}} aria-label="Remove image"><X size={16}/></button></div></> : <div className="upload-empty"><div className="upload-icon"><Upload size={24}/></div><strong>Drop your image here</strong><p>or choose a file from your computer</p><button className="primary-button small" onClick={() => inputRef.current?.click()}><Upload size={16}/> Browse image</button><span className="file-hint">PNG, JPG, JPEG, WEBP · MAX 15 MB</span></div>}
              </div>
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={event => selectImage(event.target.files?.[0])}/>
              <div className="upload-actions"><button className="secondary-button" onClick={() => inputRef.current?.click()}><ImageIcon size={17}/> Upload image</button><button className="secondary-button" onClick={openCamera}><Camera size={17}/> Open camera</button></div>
              <div className="scan-divider"><span>READY WHEN YOU ARE</span></div>
              <button className="primary-button scan-button" disabled={!image || busy} onClick={startScan}>{busy ? <><LoaderCircle className="spin" size={18}/> Processing image...</> : <><ScanText size={18}/> Extract text from image</>}</button>
              {busy && <div className="progress-wrap"><div className="progress-label"><span>{status}</span><b>{progress}%</b></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div></div>}
              <div className="supported-note"><ShieldCheck size={15}/> Your image is processed privately in your browser.</div>
            </section>

            <section className="panel result-panel">
              <div className="panel-heading"><div><h2><span className="step-number">2</span> Recognized text</h2><p>Review, edit, and export your extracted text.</p></div><span className="optional-tag">STEP 02</span></div>
              <div className="result-toolbar"><div className="result-status"><span className={`status-indicator ${recognizedText ? 'complete' : busy ? 'working' : ''}`}/>{recognizedText ? 'Recognition complete' : busy ? 'Recognizing text' : 'Waiting for scan'}</div><div className="result-actions"><button className="tool-button" title="Copy text" disabled={!recognizedText.trim()} onClick={() => copyText()}><Copy size={16}/><span>Copy</span></button><button className="tool-button" title="Download text" disabled={!recognizedText.trim()} onClick={() => downloadText()}><Download size={16}/><span>Export</span></button></div></div>
              <textarea className="text-output" value={recognizedText} onChange={event => setRecognizedText(event.target.value)} placeholder="Your extracted text will appear here...&#10;&#10;1. Upload an image or open your camera.&#10;2. Click 'Extract text from image'.&#10;3. Your recognized text will appear here." spellCheck={false}/>
              <div className="result-footer"><span><FileText size={14}/> {recognizedText.length} characters</span><span>{wordCount} words</span><span className="editable-label"><span/> Editable text</span></div>
            </section>
          </div>
          <div className="tips-row"><div className="tip-icon"><ImageIcon size={18}/></div><div><strong>Tips for better results</strong><p>Use a clear, well-lit image. Keep the document straight and make sure the text is easy to read.</p></div></div>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">YOUR PREVIOUS SCANS</div><h1>Scan history</h1><p>View and manage your previously recognized documents.</p></div><div className="heading-mark"><Clock3 size={25}/></div></div>
          <section className="panel history-panel"><div className="history-top"><div><h2>Saved scans <span className="history-total">{history.length}</span></h2><p>Your scan records are saved on this device.</p></div><div className="search-box"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search scans..."/></div></div>
            {filteredHistory.length ? <div className="history-list">{filteredHistory.map(record => <div className="history-item" key={record.id}><img src={record.preview} alt=""/><div className="history-info"><strong>{record.name}</strong><span>{new Date(record.date).toLocaleString()}</span><p>{record.text.slice(0,110).replace(/\s+/g,' ')}{record.text.length > 110 ? '...' : ''}</p></div><div className="history-item-actions"><button className="tool-button" onClick={() => loadRecord(record)}><FileText size={16}/> Open</button><button className="icon-button danger" onClick={() => removeRecord(record.id)} aria-label="Delete scan"><Trash2 size={16}/></button></div></div>)}</div> : <div className="history-empty"><div className="upload-icon"><Clock3 size={24}/></div><strong>{query ? 'No matching scans' : 'No scans saved yet'}</strong><p>{query ? 'Try another search term.' : 'Your completed scans will appear here.'}</p><button className="secondary-button" onClick={() => {setActiveTab('scanner');setQuery('')}}>Go to text scanner</button></div>}
          </section>
        </>}
        <footer className="footer"><span>© {new Date().getFullYear()} ClearScan OCR</span><span>Simple. Fast. Private.</span></footer>
      </div>
    </main>

    {cameraOpen && <div className="modal-backdrop" onClick={closeCamera}><div className="camera-modal" onClick={event => event.stopPropagation()}><div className="modal-heading"><div><h2>Capture document</h2><p>Position your document inside the camera view.</p></div><button className="icon-button" onClick={closeCamera}><X size={19}/></button></div>{cameraError ? <div className="camera-error"><Camera size={27}/><p>{cameraError}</p></div> : <video ref={videoRef} autoPlay playsInline muted className="camera-video"/>}<div className="camera-controls"><button className="secondary-button" onClick={closeCamera}>Cancel</button><button className="primary-button" disabled={!!cameraError} onClick={capturePhoto}><Camera size={17}/> Capture photo</button></div></div></div>}
    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
  </div>
}
