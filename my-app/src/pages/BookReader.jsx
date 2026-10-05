import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { FaArrowLeft, FaDownload, FaBookOpen } from 'react-icons/fa'
import PageHeader from '../components/PageHeader.jsx'
import BookCover from '../components/BookCover.jsx'
import PdfViewer from '../components/PdfViewer.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getBook } from '../services/api.js'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom small">
      <span className="text-muted text-nowrap">{label}</span>
      <span className="text-end">{value}</span>
    </div>
  )
}

// Trang chi tiết + đọc sách: thông tin sách bên trái, khung đọc PDF bên phải.
export default function BookReader() {
  const { id } = useParams()
  // state gắn với id đang tải: id khác → coi như đang tải (không cần setState trong effect).
  const [state, setState] = useState({ id: null, book: null, error: '' })

  useEffect(() => {
    let cancelled = false
    getBook(id)
      .then((b) => {
        if (!cancelled) setState({ id, book: b, error: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ id, book: null, error: err?.message || 'Không tải được thông tin sách.' })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const loading = state.id !== id
  const book = state.id === id ? state.book : null
  const error = state.id === id ? state.error : ''

  const isPdf =
    book != null &&
    (String(book.fileType || '').toLowerCase() === 'pdf' || /\.pdf(\?|$)/i.test(book.fileUrl || ''))
  const rawUrl = book?.fileUrl || ''
  const canRead = Boolean(rawUrl && isPdf)

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" className="text-muted" />
      </Container>
    )
  }

  if (error || !book) {
    return (
      <Container className="py-4">
        <PageHeader title="Không tải được sách" />
        <Alert variant="danger">{error || 'Không tìm thấy cuốn sách này.'}</Alert>
        <Button as={Link} to="/books" variant="outline-secondary" size="sm">
          <FaArrowLeft className="me-2" />
          Quay lại danh sách
        </Button>
      </Container>
    )
  }

  return (
    <Container className="py-4">
      <PageHeader
        title={book.title}
        subtitle={[book.author, book.year ? book.year : null].filter(Boolean).join(' • ')}
      >
        <Button as={Link} to="/books" variant="outline-secondary" size="sm">
          <FaArrowLeft className="me-2" />
          Quay lại
        </Button>
        {rawUrl && (
          <Button href={rawUrl} target="_blank" rel="noreferrer" variant="primary" size="sm">
            <FaDownload className="me-2" />
            Tải xuống
          </Button>
        )}
      </PageHeader>

      <Row className="g-3">
        <Col lg={4}>
          <Card className="h-100">
            <Card.Body className="d-flex gap-3">
              <BookCover src={book.coverUrl} title={book.title} size={72} />
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate" title={book.title}>
                  {book.title}
                </div>
                <div className="small text-muted text-truncate">{book.author}</div>
              </div>
            </Card.Body>
            <Card.Body className="pt-0">
              <InfoRow label="Thể loại" value={book.category} />
              <InfoRow label="Nhà xuất bản" value={book.publisher} />
              <InfoRow label="Năm xuất bản" value={book.year} />
              <InfoRow label="Số bản" value={book.quantity} />
              <InfoRow label="Tệp đính kèm" value={book.fileName} />
              {!book.fileName && (
                <p className="small text-muted py-2 mb-0">Sách chưa có tệp đính kèm.</p>
              )}
            </Card.Body>
            {book.note && (
              <Card.Body className="pt-0">
                <div className="small text-muted">{book.note}</div>
              </Card.Body>
            )}
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="d-flex align-items-center gap-2">
              <FaBookOpen />
              <span>Đọc sách</span>
            </Card.Header>
            <Card.Body className={canRead ? 'p-0' : ''}>
              {canRead ? (
                <PdfViewer key={rawUrl} url={rawUrl} />
              ) : (
                <EmptyState
                  text={
                    rawUrl
                      ? 'Chỉ file PDF đọc trực tiếp trên web. Hãy tải file về để mở bằng Word.'
                      : 'Sách này chưa có tệp để đọc.'
                  }
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
