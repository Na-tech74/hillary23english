import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, ButtonGroup, Spinner } from 'react-bootstrap'
import { FaCompress, FaExpand, FaMinus, FaPlus } from 'react-icons/fa'
import { loadPdfjs, PDF_ASSETS } from '../services/pdfjs.js'

const MIN_SCALE = 0.4
const MAX_SCALE = 3
// Dùng khi khung chưa có kích thước (không vừa khung được).
const DEFAULT_SCALE = 1.5
const clamp = (n) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n))
// Vừa khung theo chiều ngang nhưng giới hạn tối đa 150% (mặc định đẹp mắt).
const fitScale = (stageWidth, pageWidth) =>
  clamp(Math.round((Math.min(1.5, (stageWidth - 32) / pageWidth)) * 10) / 10)
// Lề quét quanh khung: trang ngoài lề này sẽ được giải phóng bộ nhớ.
const OBSERVER_MARGIN = '400px 0px'

// Trình đọc PDF cuộn liên tục chạy hoàn toàn trên trình duyệt bằng pdfjs-dist.
// - Tải file từ `url` (Cloudinary cho phép CORS), render các trang lên <canvas>.
// - Chỉ render trang trong khung nhìn (cộng lề 400px); trang ra ngoài khung
//   bị co canvas về 1x1 để giải phóng RAM → cuộn mượt với PDF dài.
// - Đổi trang bằng cách cuộn; giữ nút thu/phóng và toàn màn hình.
export default function PdfViewer({ url }) {
  const [doc, setDoc] = useState(null)
  // Kích thước trang ở scale 1 (trang 1) — dùng làm khung giữ chỗ cho mọi trang.
  const [pageSize, setPageSize] = useState(null)
  const [scale, setScale] = useState(1)
  const [error, setError] = useState('')
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)

  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const taskRef = useRef(null)
  // num → RenderTask đang chạy / scale đã render / trang trong khung nhìn /
  // số phiên render (chống render cũ ghi đè render mới khi đổi zoom).
  const tasksRef = useRef(new Map())
  const renderedRef = useRef(new Map())
  const visibleRef = useRef(new Set())
  const versionRef = useRef(new Map())
  const scrollRafRef = useRef(0)
  const baseWidthRef = useRef(0)

  // Tải toàn bộ PDF → pdfjs; hủy và destroy khi unmount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        if (cancelled) return

        const res = await fetch(url)
        if (res.status === 401) {
          throw new Error(
            'Cloudinary chặn giao file PDF trên gói Free. Hãy bật “Allow delivery of PDF and ZIP files” trong Console → Settings → Security.'
          )
        }
        if (!res.ok) throw new Error(`Không tải được tệp (HTTP ${res.status}).`)
        const buffer = await res.arrayBuffer()

        const task = pdfjs.getDocument({ data: buffer, ...PDF_ASSETS })
        taskRef.current = task
        const pdf = await task.promise
        if (cancelled) {
          task.destroy().catch(() => {})
          return
        }

        // Vừa khung theo chiều ngang (tối đa 150%); khung chưa có kích thước
        // thì dùng zoom mặc định.
        const first = await pdf.getPage(1)
        const base = first.getViewport({ scale: 1 })
        if (cancelled) return

        baseWidthRef.current = base.width
        const width = stageRef.current?.clientWidth
        setPageSize({ width: base.width, height: base.height })
        setScale(width ? fitScale(width, base.width) : clamp(DEFAULT_SCALE))
        setDoc(pdf)
        setLoadingDoc(false)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Không đọc được file PDF.')
          setLoadingDoc(false)
        }
      }
    })()

    return () => {
      cancelled = true
      const task = taskRef.current
      taskRef.current = null
      if (task) task.destroy().catch(() => {})
    }
  }, [url])

  const getPageEl = useCallback(
    (num) => stageRef.current?.querySelector(`[data-page="${num}"]`) || null,
    []
  )

  // Render một trang (chỉ khi nó trong khung nhìn và chưa đúng scale).
  const renderPage = useCallback(
    async (num) => {
      const pdf = doc
      if (!pdf) return
      const s = scale
      if (renderedRef.current.get(num) === s) return

      // Đánh dấu phiên render: nếu có lời gọi mới hơn (đổi zoom, quay lại
      // khung) thì lời gọi cũ tự hủy sau mọi điểm chờ.
      const version = (versionRef.current.get(num) ?? 0) + 1
      versionRef.current.set(num, version)
      const stale = () => versionRef.current.get(num) !== version

      // Chờ render trước của trang này dừng hẳn trước khi vẽ lên lại canvas
      // (tránh lỗi "same canvas during multiple render() operations").
      const prev = tasksRef.current.get(num)
      if (prev) {
        prev.cancel()
        try {
          await prev.promise
        } catch {
          /* render cũ bị hủy là bình thường */
        }
        if (stale() || !visibleRef.current.has(num)) return
      }

      const canvas = getPageEl(num)?.querySelector('canvas')
      if (!canvas) return
      let task = null
      try {
        const page = await pdf.getPage(num)
        if (stale() || !visibleRef.current.has(num)) return

        const dpr = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: s })
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        task = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        })
        tasksRef.current.set(num, task)
        setRendering(true)
        await task.promise
        if (!stale()) renderedRef.current.set(num, s)
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          setError(err?.message || 'Không hiển thị được trang này.')
        }
      } finally {
        // Chỉ dọn task của chính mình; lớp render mới hơn có thể đã thay thế.
        if (task && tasksRef.current.get(num) === task) {
          tasksRef.current.delete(num)
          if (tasksRef.current.size === 0) setRendering(false)
        }
      }
    },
    [doc, scale, getPageEl]
  )

  // Trang ra khỏi khung nhìn: hủy render (nếu có) và co canvas về 1x1 để
  // trình duyệt giải phóng bộ nhớ; sẽ render lại khi cuộn vào khung.
  const clearPage = useCallback(
    (num) => {
      tasksRef.current.get(num)?.cancel()
      renderedRef.current.delete(num)
      const canvas = getPageEl(num)?.querySelector('canvas')
      if (!canvas || (canvas.width === 1 && canvas.height === 1)) return
      canvas.width = 1
      canvas.height = 1
      canvas.style.width = ''
      canvas.style.height = ''
    },
    [getPageEl]
  )

  // Quét khung nhìn: render trang vào vùng nhìn, dọn trang ra ngoài.
  // Chạy lại khi đổi scale (renderPage đổi) → các trang trong khung tự vẽ lại.
  useEffect(() => {
    const stage = stageRef.current
    if (!doc || !stage) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const num = Number(entry.target.dataset.page)
          if (entry.isIntersecting) {
            visibleRef.current.add(num)
            renderPage(num)
          } else {
            visibleRef.current.delete(num)
            clearPage(num)
          }
        }
      },
      { root: stage, rootMargin: OBSERVER_MARGIN }
    )
    stage.querySelectorAll('[data-page]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [doc, renderPage, clearPage])

  // Cập nhật "Trang x / y" theo vị trí cuộn (throttle bằng rAF).
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      let current = 0
      stage.querySelectorAll('[data-page]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= center && r.bottom >= center) current = Number(el.dataset.page)
      })
      if (current) setCurrentPage(current)
    })
  }, [])

  // Dọn render dang dở và rAF khi unmount.
  useEffect(
    () => () => {
      cancelAnimationFrame(scrollRafRef.current)
      for (const task of tasksRef.current.values()) task.cancel()
    },
    []
  )

  // Theo dõi toàn màn hình; vào/ra đều vừa lại khung theo kích thước mới.
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === rootRef.current
      setFullscreen(active)
      const width = stageRef.current?.clientWidth
      const base = baseWidthRef.current
      if (width && base) setScale(fitScale(width, base))
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    } else {
      root.requestFullscreen?.().catch(() => {})
    }
  }

  const zoom = (step) => setScale((s) => clamp(Math.round((s + step) * 10) / 10))

  return (
    <div className="reader" ref={rootRef}>
      <div className="reader-toolbar d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span className="reader-page-indicator">
          {doc ? `Trang ${currentPage} / ${doc.numPages}` : 'Đang tải…'}
        </span>

        <ButtonGroup size="sm">
          <Button variant="outline-secondary" disabled={!doc} onClick={() => zoom(-0.1)} aria-label="Thu nhỏ">
            <FaMinus />
          </Button>
          <Button variant="outline-secondary" disabled title="Mức zoom">
            {Math.round(scale * 100)}%
          </Button>
          <Button variant="outline-secondary" disabled={!doc} onClick={() => zoom(0.1)} aria-label="Phóng to">
            <FaPlus />
          </Button>
          <Button
            variant="outline-secondary"
            disabled={!doc}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}
            title={fullscreen ? 'Thoát toàn màn hình (Esc)' : 'Xem toàn màn hình'}
          >
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
        </ButtonGroup>
      </div>

      <div className="reader-stage" ref={stageRef} tabIndex={0} onScroll={handleScroll}>
        {error && <Alert variant="danger" className="m-3">{error}</Alert>}
        {!error && loadingDoc && (
          <div className="reader-center text-muted small">
            <Spinner size="sm" className="me-2" />
            Đang tải tài liệu…
          </div>
        )}
        {!error && rendering && <span className="reader-badge">Đang tải trang…</span>}
        {!error && doc && pageSize && (
          <div className="reader-pages">
            {Array.from({ length: doc.numPages }, (_, i) => i + 1).map((num) => (
              <div
                key={num}
                className="reader-page"
                data-page={num}
                style={{
                  minWidth: Math.floor(pageSize.width * scale),
                  minHeight: Math.floor(pageSize.height * scale),
                }}
              >
                <canvas />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="reader-hint text-muted small">
        Cuộn chuột hoặc phím để đọc trang; nút ⛶ để xem toàn màn hình (Esc để thoát).
      </div>
    </div>
  )
}
