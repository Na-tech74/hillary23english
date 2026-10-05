import { useState } from 'react'
import { Modal, Form, Row, Col, Button, Spinner } from 'react-bootstrap'
import {
  MAX_FILE_SIZE,
  fileExt,
  uploadBookFile,
  uploadCover,
  validateBookFile,
} from '../services/storage.js'
import { loadPdfjs, PDF_ASSETS } from '../services/pdfjs.js'

// Render trang 1 của file PDF thành blob ảnh — dùng làm ảnh bìa tự động.
async function renderPdfCover(file) {
  const pdfjsLib = await loadPdfjs()

  // pdfjs v6: destroy() nằm trên loading task, không còn trên PDFDocumentProxy.
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer(), ...PDF_ASSETS })
  const doc = await loadingTask.promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: 400 / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error('Không tạo được ảnh bìa từ PDF.')
    return blob
  } finally {
    await loadingTask.destroy()
  }
}

// Giá trị mặc định cho form: sách mới hoặc dữ liệu đang sửa.
function toFormValues(book) {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    category: book?.category ?? '',
    publisher: book?.publisher ?? '',
    year: book?.year != null ? String(book.year) : '',
    quantity: book?.quantity != null ? String(book.quantity) : '1',
    note: book?.note ?? '',
  }
}

function validate(form) {
  const errors = {}
  if (form.title.trim().length < 2) errors.title = 'Nhập tên sách, ít nhất 2 ký tự.'
  if (form.author.trim().length < 2) errors.author = 'Nhập tác giả, ít nhất 2 ký tự.'

  const year = form.year.trim()
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1000 || Number(year) > 2100)) {
    errors.year = 'Năm phải là số 4 chữ từ 1000 đến 2100.'
  }

  const quantity = Number(form.quantity)
  if (!form.quantity.trim() || !Number.isInteger(quantity) || quantity < 1) {
    errors.quantity = 'Số cuốn phải từ 1.'
  }
  return errors
}

// Một trường trong form: label liên kết đúng input, có ô báo lỗi riêng.
function Field({ id, label, required, error, children }) {
  return (
    <Form.Group controlId={id}>
      <Form.Label className="fw-medium">
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      {children}
      {error && (
        <div className="text-danger small mt-1" role="alert">
          {error}
        </div>
      )}
    </Form.Group>
  )
}

// Form thêm/sửa một cuốn sách. Chỉ mount khi đang mở (cha render có điều kiện)
// nên state luôn khởi tạo đúng từ props — không cần effect reset.
// Đóng bằng nút "Hủy" hoặc phím Esc, focus tự vào ô tên sách.
export default function BookForm({ book, categories = [], saving = false, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormValues(book))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  // Ảnh bìa: chỉ có từ PDF (coverUrl xem trước, coverBlob là ảnh tải lên).
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl ?? '')
  const [coverBlob, setCoverBlob] = useState(null)
  const [coverLoading, setCoverLoading] = useState(false)

  // File Word/PDF: bookFile là file mới chọn, fileRemoved = gỡ file cũ.
  const [bookFile, setBookFile] = useState(null)
  const [fileRemoved, setFileRemoved] = useState(false)
  const [fileError, setFileError] = useState('')
  const [working, setWorking] = useState(false)
  // % upload tổng hợp (0–100), null khi không đang tải lên.
  const [progress, setProgress] = useState(null)

  const currentFileName = bookFile?.name ?? (fileRemoved ? '' : book?.fileName ?? '')

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateBookFile(file)
    } catch (err) {
      setFileError(err?.message || 'File không hợp lệ.')
      event.target.value = ''
      return
    }
    setFileError('')
    setFileRemoved(false)
    setBookFile(file)

    // Chọn file PDF → tự lấy trang 1 làm ảnh bìa (Word giữ bìa hiện tại).
    if (fileExt(file.name) === 'pdf') {
      setCoverLoading(true)
      renderPdfCover(file)
        .then((blob) => {
          setCoverBlob(blob)
          setCoverUrl(URL.createObjectURL(blob))
        })
        .catch((err) => {
          setFileError(
            err?.message ||
              'Không đọc được trang đầu của PDF — vẫn tải file lên được, có thể chọn ảnh bìa thủ công.'
          )
        })
        .finally(() => {
          setCoverLoading(false)
        })
    }
  }

  function removeCurrentFile() {
    if (!bookFile) setFileRemoved(true)
    setBookFile(null)
    setFileError('')
    const input = document.getElementById('bookFile')
    if (input) input.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setFormError('')
    setWorking(true)
    try {
      const next = { ...form }

      // Các trường tính đồng bộ trước (metadata không cần upload).
      if (bookFile) {
        next.fileName = bookFile.name
        next.fileType = fileExt(bookFile.name)
      } else if (fileRemoved) {
        next.fileUrl = ''
        next.fileName = ''
        next.fileType = ''
        next.filePath = ''
      } else {
        next.fileUrl = book?.fileUrl ?? ''
        next.fileName = book?.fileName ?? ''
        next.fileType = book?.fileType ?? ''
        next.filePath = book?.filePath ?? ''
      }
      if (!coverBlob && !coverUrl) {
        next.coverUrl = ''
        next.coverPath = ''
      } else if (!coverBlob) {
        next.coverUrl = coverUrl
        next.coverPath = book?.coverPath ?? ''
      }

      // File sách và ảnh bìa tải lên CÙNG LÚC; % tổng = trung bình các luồng đang chạy.
      const shares = {}
      const report = (key) => (value) => {
        shares[key] = value
        const list = Object.values(shares)
        setProgress(Math.round(list.reduce((sum, p) => sum + p, 0) / list.length))
      }

      const jobs = []
      if (bookFile) {
        jobs.push(
          uploadBookFile(bookFile, report('file')).then((up) => {
            next.fileUrl = up.url
            next.filePath = up.path
          })
        )
      }
      if (coverBlob) {
        jobs.push(
          uploadCover(coverBlob, report('cover')).then((up) => {
            next.coverUrl = up.url
            next.coverPath = up.path
          })
        )
      }
      if (jobs.length > 0) setProgress(0)
      await Promise.all(jobs)

      await onSubmit(next)
    } catch (err) {
      setFormError(err?.message || 'Không lưu được sách, vui lòng thử lại.')
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  // Gợi ý thể loại đã có; nếu sách đang giữ thể loại không còn trong danh sách
  // thì vẫn giữ trong danh sách chọn để không mất dữ liệu.
  const categoryOptions = categories.map((c) => c.name)
  if (form.category && !categoryOptions.includes(form.category)) {
    categoryOptions.push(form.category)
  }

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">
          {book?.id ? 'Sửa sách' : 'Thêm sách mới'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Body>
          {formError && (
            <div className="text-danger small mb-2" role="alert">
              {formError}
            </div>
          )}

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Field id="bookTitle" label="Tên sách" required error={errors.title}>
                <Form.Control
                  type="text"
                  autoFocus
                  maxLength={200}
                  placeholder="Tên sách"
                  value={form.title}
                  isInvalid={!!errors.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </Field>
            </Col>
            <Col md={6}>
              <Field id="bookAuthor" label="Tác giả" required error={errors.author}>
                <Form.Control
                  type="text"
                  maxLength={120}
                  placeholder="Tác giả"
                  value={form.author}
                  isInvalid={!!errors.author}
                  onChange={(e) => setField('author', e.target.value)}
                />
              </Field>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Field id="bookCategory" label="Thể loại">
                <Form.Select
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                >
                  <option value="">Chưa chọn</option>
                  {categoryOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Form.Select>
              </Field>
            </Col>
            <Col md={3}>
              <Field id="bookYear" label="Năm" error={errors.year}>
                <Form.Control
                  type="number"
                  min={1000}
                  max={2100}
                  placeholder="2020"
                  value={form.year}
                  isInvalid={!!errors.year}
                  onChange={(e) => setField('year', e.target.value)}
                />
              </Field>
            </Col>
            <Col md={3}>
              <Field id="bookQuantity" label="Số cuốn" required error={errors.quantity}>
                <Form.Control
                  type="number"
                  min={1}
                  step={1}
                  value={form.quantity}
                  isInvalid={!!errors.quantity}
                  onChange={(e) => setField('quantity', e.target.value)}
                />
              </Field>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={12}>
              <Field id="bookPublisher" label="Nhà xuất bản">
                <Form.Control
                  type="text"
                  maxLength={120}
                  value={form.publisher}
                  onChange={(e) => setField('publisher', e.target.value)}
                />
              </Field>
            </Col>
          </Row>

          <div className="mb-3">
            <Field id="bookNote" label="Ghi chú">
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={500}
                value={form.note}
                onChange={(e) => setField('note', e.target.value)}
              />
            </Field>
          </div>

          <div className="mb-3">
            <Form.Label htmlFor="bookFile" className="fw-medium">
              Tải file lên (Word/PDF)
            </Form.Label>
            <Form.Control
              id="bookFile"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={handleFileChange}
              disabled={working}
            />
            <Form.Text className="text-muted">
              Chỉ nhận .pdf, .doc, .docx — tối đa {Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB. Chọn
              PDF sẽ tự lấy trang đầu làm ảnh bìa.
            </Form.Text>
            {fileError && (
              <div className="text-danger small mt-1" role="alert">
                {fileError}
              </div>
            )}
            {currentFileName && (
              <div className="d-flex align-items-center gap-2 mt-1 small">
                <span className="text-truncate" style={{ maxWidth: 320 }}>
                  {currentFileName}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-danger"
                  onClick={removeCurrentFile}
                  disabled={working}
                >
                  Gỡ file
                </Button>
              </div>
            )}
            {coverLoading && (
              <div className="d-flex align-items-center gap-2 small text-muted mt-1">
                <Spinner animation="border" size="sm" /> Đang lấy bìa từ trang đầu PDF…
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="link" className="text-muted" onClick={onClose} disabled={saving || working}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saving || working}>
            {saving || working ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {progress != null ? `Đang tải lên… ${progress}%` : 'Đang lưu…'}
              </>
            ) : (
              'Lưu sách'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
