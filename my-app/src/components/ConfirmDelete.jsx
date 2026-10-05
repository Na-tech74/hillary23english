import { Modal, Button, Alert, Spinner } from 'react-bootstrap'

// Hộp xác nhận cho hành động phá hủy (xóa).
// - warning: cảnh báo trong hộp.
// - confirmDisabled: khóa nút khi không được phép xóa.
export default function ConfirmDelete({
  show,
  title = 'Xác nhận xóa',
  message,
  warning,
  confirmLabel = 'Xóa',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message}
        {warning && (
          <Alert variant="warning" className="mt-3 mb-0 small">
            {warning}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="link" className="text-muted" onClick={onClose} disabled={busy}>
          Hủy
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy || confirmDisabled}>
          {busy ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" /> Đang xóa…
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
