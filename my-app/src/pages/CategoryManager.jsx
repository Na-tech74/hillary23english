import { useMemo, useState } from 'react'
import {
  Container,
  Card,
  Form,
  Button,
  Table,
  Spinner,
  Alert,
} from 'react-bootstrap'
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import PageHeader from '../components/PageHeader.jsx'
import CategoryForm from '../components/CategoryForm.jsx'
import ConfirmDelete from '../components/ConfirmDelete.jsx'
import EmptyState from '../components/EmptyState.jsx'
import IconButton from '../components/IconButton.jsx'
import useCategories from '../hooks/useCategories.js'

export default function CategoryManager() {
  const { categories, loading, error, saving, deleting, create, update, remove, clearError } =
    useCategories()

  // Thêm: mở modal (nút trên tiêu đề trang, giống luồng "Thêm sách")
  const [formOpen, setFormOpen] = useState(false)

  // Sửa inline: mỗi lần chỉ một dòng đang sửa
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')

  // Xóa (hành động phá hủy → giữ Modal xác nhận)
  const [deletingCategory, setDeletingCategory] = useState(null)

  const [query, setQuery] = useState('')

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [categories, query])

  async function handleAdd(values) {
    await create(values)
    setFormOpen(false)
  }

  function openEdit(category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditDescription(category.description ?? '')
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
  }

  async function handleEditSave() {
    if (saving) return
    setEditError('')
    if (editName.trim().length < 2) {
      setEditError('Tên thể loại phải có ít nhất 2 ký tự.')
      return
    }
    try {
      await update(editingId, { name: editName, description: editDescription })
      cancelEdit()
    } catch (err) {
      setEditError(err?.message || 'Không cập nhật được thể loại.')
    }
  }

  async function handleDelete() {
    try {
      await remove(deletingCategory.id)
    } catch {
      // Lỗi đã được hook đưa vào Alert ở đầu trang.
    } finally {
      setDeletingCategory(null)
    }
  }

  const deleteBlocked = (deletingCategory?.bookCount ?? 0) > 0

  return (
    <Container className="py-4">
      <PageHeader
        title="Quản lý thể loại"
        subtitle={`Tổng cộng ${categories.length} thể loại`}
      >
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          Thêm thể loại
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="danger" dismissible onClose={clearError}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center gap-2">
          <span>Danh sách thể loại</span>
          <Form.Control
            size="sm"
            style={{ maxWidth: 200 }}
            placeholder="Tìm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm thể loại"
          />
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5" role="status">
              <Spinner animation="border" />
              <p className="mt-2 text-muted small mb-0">Đang tải…</p>
            </div>
          ) : categories.length === 0 ? (
            <EmptyState text="Chưa có thể loại nào." />
          ) : visibleCategories.length === 0 ? (
            <EmptyState text="Không tìm thấy thể loại phù hợp." />
          ) : (
            <Table responsive size="sm" hover className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: 44 }} className="text-center">
                    #
                  </th>
                  <th style={{ width: '22%' }}>Tên thể loại</th>
                  <th>Mô tả</th>
                  <th style={{ width: 90 }} className="text-center">
                    Số sách
                  </th>
                  <th style={{ width: 80 }} className="text-end">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((cat, idx) => {
                  const isEditing = editingId === cat.id
                  return (
                    <tr key={cat.id}>
                      <td className="text-muted text-center">{idx + 1}</td>
                      <td>
                        {isEditing ? (
                          <>
                            <Form.Control
                              size="sm"
                              value={editName}
                              maxLength={50}
                              autoFocus
                              aria-label="Tên thể loại"
                              onChange={(e) => {
                                setEditName(e.target.value)
                                if (editError) setEditError('')
                              }}
                            />
                            {editError && (
                              <div className="text-danger small mt-1" role="alert">
                                {editError}
                              </div>
                            )}
                          </>
                        ) : (
                          cat.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <Form.Control
                            size="sm"
                            value={editDescription}
                            maxLength={200}
                            aria-label="Mô tả"
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        ) : (
                          <span className="text-muted">{cat.description || '—'}</span>
                        )}
                      </td>
                      <td className="text-center text-muted">{cat.bookCount}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          {isEditing ? (
                            <>
                              <IconButton label="Lưu" tone="confirm" onClick={handleEditSave}>
                                <FaCheck size={12} />
                              </IconButton>
                              <IconButton label="Hủy" tone="danger" onClick={cancelEdit}>
                                <FaTimes size={12} />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton label="Sửa" tone="edit" onClick={() => openEdit(cat)}>
                                <FaEdit size={12} />
                              </IconButton>
                              <IconButton
                                label="Xóa"
                                tone="danger"
                                onClick={() => setDeletingCategory(cat)}
                              >
                                <FaTrash size={12} />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {formOpen && (
        <CategoryForm
          saving={saving}
          onClose={() => setFormOpen(false)}
          onSubmit={handleAdd}
        />
      )}

      <ConfirmDelete
        show={!!deletingCategory}
        title="Xác nhận xóa thể loại"
        message={
          <>
            Bạn có chắc muốn xóa thể loại <strong>“{deletingCategory?.name}”</strong>?
          </>
        }
        warning={
          deleteBlocked
            ? `Thể loại này đang có ${deletingCategory.bookCount} cuốn sách. Hãy chuyển sách sang thể loại khác trước khi xóa.`
            : null
        }
        confirmDisabled={deleteBlocked}
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeletingCategory(null)}
      />
    </Container>
  )
}
