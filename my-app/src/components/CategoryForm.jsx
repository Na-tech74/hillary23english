import { useState } from 'react'
import { Modal, Form, Button, Spinner } from 'react-bootstrap'

// Một trường trong form: label liên kết đúng input, có ô báo lỗi riêng.
function Field({ id, label, required, error, children }) {
  return (
    <Form.Group controlId={id} className="mb-3">
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

// Modal thêm thể loại — mở bằng nút "Thêm thể loại" trên tiêu đề trang,
// khớp luồng modal của form sách. Mount có điều kiện nên state luôn khởi tạo mới.
export default function CategoryForm({ saving = false, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    if (form.name.trim().length < 2) found.name = 'Tên thể loại phải có ít nhất 2 ký tự.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setFormError('')
    try {
      await onSubmit({ name: form.name.trim(), description: form.description.trim() })
    } catch (err) {
      setFormError(err?.message || 'Không thêm được thể loại, vui lòng thử lại.')
    }
  }

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">Thêm thể loại mới</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Body>
          {formError && (
            <div className="text-danger small mb-2" role="alert">
              {formError}
            </div>
          )}

          <Field id="catName" label="Tên thể loại" required error={errors.name}>
            <Form.Control
              type="text"
              autoFocus
              maxLength={50}
              placeholder="Tên thể loại"
              value={form.name}
              isInvalid={!!errors.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </Field>

          <Field id="catDesc" label="Mô tả">
            <Form.Control
              type="text"
              maxLength={200}
              placeholder="Mô tả"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="link" className="text-muted" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" /> Đang lưu…
              </>
            ) : (
              'Lưu thể loại'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
