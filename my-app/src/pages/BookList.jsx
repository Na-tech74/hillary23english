import { useMemo, useState } from 'react'
import {
  Container,
  Card,
  Table,
  Form,
  Row,
  Col,
  Button,
  InputGroup,
  Pagination,
  Spinner,
  Alert,
} from 'react-bootstrap'
import { FaBookOpen, FaEdit, FaTrash } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import BookCover from '../components/BookCover.jsx'
import BookForm from '../components/BookForm.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import EmptyState from '../components/EmptyState.jsx'
import IconButton from '../components/IconButton.jsx'
import useBooks from '../hooks/useBooks.js'
import useCategories from '../hooks/useCategories.js'

const PAGE_SIZE = 8

export default function BookList() {
  const { books, loading, error, saving, deleting, save, remove, clearError } = useBooks()
  const { categories } = useCategories()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tất cả')
  const [sortBy, setSortBy] = useState('title')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingBook, setDeletingBook] = useState(null)

  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((c) => c.name))
    books.forEach((b) => b.category && names.add(b.category))
    return [...names].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [categories, books])

  const filtered = useMemo(() => {
    let result = [...books]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((b) => [b.title, b.author].some((field) => (field ?? '').toLowerCase().includes(q)))
    }

    if (category !== 'Tất cả') {
      result = result.filter((b) => b.category === category)
    }

    result.sort((a, b) => {
      if (sortBy === 'author') return a.author.localeCompare(b.author, 'vi')
      if (sortBy === 'year') return (b.year ?? 0) - (a.year ?? 0)
      if (sortBy === 'recent') return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      return a.title.localeCompare(b.title, 'vi')
    })

    return result
  }, [books, search, category, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilter = !!search.trim() || category !== 'Tất cả' || sortBy !== 'title'

  function resetFilters() {
    setSearch('')
    setCategory('Tất cả')
    setSortBy('title')
    setPage(1)
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(book) {
    setEditing(book)
    setFormOpen(true)
  }

  async function handleSave(values) {
    await save({ ...values, id: editing?.id })
    setFormOpen(false)
    setEditing(null)
  }

  async function handleDelete() {
    try {
      await remove(deletingBook.id)
    } catch {
      // Lỗi đã được hook đưa vào Alert ở đầu trang.
    } finally {
      setDeletingBook(null)
    }
  }

  return (
    <Container className="py-4">
      <PageHeader
        title="Danh sách sách"
        subtitle={
          <>
            Tổng cộng <strong>{books.length}</strong> cuốn sách
            {hasFilter && (
              <>
                {' '}
                · khớp bộ lọc: <strong>{filtered.length}</strong>
              </>
            )}
          </>
        }
      >
        <Button variant="primary" onClick={openAdd}>
          Thêm sách
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="danger" dismissible onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Bộ lọc: không bọc Card, nằm cùng mặt phẳng với bảng */}
      <Row className="g-2 align-items-center mb-4">
        <Col md={5}>
          <InputGroup>
            <Form.Control
                placeholder="Tìm tên hoặc tác giả…"
              value={search}
              aria-label="Tìm kiếm sách"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select
            aria-label="Lọc theo thể loại"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="Tất cả">Tất cả thể loại</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            aria-label="Sắp xếp"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(1)
            }}
          >
            <option value="title">Tên sách</option>
            <option value="author">Tác giả</option>
            <option value="year">Năm (mới nhất)</option>
            <option value="recent">Mới thêm</option>
          </Form.Select>
        </Col>
        <Col md={2} className="text-md-end">
          <Button
            variant="link"
            size="sm"
            className="text-muted text-decoration-none px-0"
            disabled={!hasFilter}
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5" role="status">
              <Spinner animation="border" />
              <p className="mt-2 text-muted small mb-0">Đang tải…</p>
            </div>
          ) : books.length === 0 ? (
            <EmptyState text="Chưa có sách nào. Chọn “Thêm sách” để nhập cuốn đầu tiên." />
          ) : filtered.length === 0 ? (
            <EmptyState text="Không có kết quả khớp bộ lọc — thử đổi từ khóa hoặc bỏ bớt điều kiện." />
          ) : (
            <Table responsive size="sm" hover className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: 50 }} className="text-center">
                    #
                  </th>
                  <th style={{ width: '45%' }}>Sách</th>
                  <th style={{ width: '18%' }}>Thể loại</th>
                  <th style={{ width: 96 }} className="text-center">
                    Số cuốn
                  </th>
                  <th style={{ width: 108 }} className="text-end">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((book, idx) => (
                  <tr key={book.id}>
                    <td className="text-muted text-center">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <BookCover src={book.coverUrl} title={book.title} size={36} />
                        <div className="min-w-0">
                          <div className="fw-semibold text-truncate">{book.title}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            {book.author} • {book.year ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{book.category || '—'}</td>
                    <td className="text-center">{book.quantity}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <IconButton label="Đọc" tone="read" onClick={() => navigate(`/books/${book.id}`)}>
                          <FaBookOpen size={12} />
                        </IconButton>
                        <IconButton label="Sửa" tone="edit" onClick={() => openEdit(book)}>
                          <FaEdit size={12} />
                        </IconButton>
                        <IconButton label="Xóa" tone="danger" onClick={() => setDeletingBook(book)}>
                          <FaTrash size={12} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {!loading && filtered.length > 0 && totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="text-muted small">
              Trang {currentPage} / {totalPages}
            </span>
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item
                  key={p}
                  active={p === currentPage}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Pagination.Item>
              ))}
              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>

      {formOpen && (
        <BookForm
          book={editing}
          categories={categories}
          saving={saving}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSubmit={handleSave}
        />
      )}

      <ConfirmDelete
        show={!!deletingBook}
        title="Xác nhận xóa sách"
        message={
          <>
            Bạn có chắc muốn xóa <strong>“{deletingBook?.title}”</strong>?
          </>
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeletingBook(null)}
      />
    </Container>
  )
}
