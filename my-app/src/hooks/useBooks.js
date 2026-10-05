import { useCallback, useEffect, useState } from 'react'
import { listBooks, saveBook, deleteBook } from '../services/api.js'

// Nguồn dữ liệu sách cho mọi trang: tải một lần, các thao tác cập nhật
// thẳng vào state nên giao diện không phải tải lại toàn bộ sau mỗi lần lưu.
export default function useBooks() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Tải dữ liệu: mọi setState nằm trong callback của promise nên không chạy
  // đồng bộ trong useEffect.
  const reload = useCallback(() => {
    listBooks()
      .then((data) => {
        setBooks(data)
        setError('')
      })
      .catch((err) => {
        setError(err?.message || 'Không tải được danh sách sách.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Thêm mới (không có id) hoặc cập nhật (có id). Ném lỗi để form tự hiển thị.
  const save = useCallback(async (book) => {
    setSaving(true)
    try {
      const saved = await saveBook(book)
      setBooks((prev) => {
        const exists = prev.some((b) => b.id === saved.id)
        return exists
          ? prev.map((b) => (b.id === saved.id ? saved : b))
          : [saved, ...prev]
      })
      return saved
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (id) => {
    setDeleting(true)
    setError('')
    try {
      await deleteBook(id)
      setBooks((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      setError(err?.message || 'Không xóa được cuốn sách.')
      throw err
    } finally {
      setDeleting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return { books, loading, error, saving, deleting, reload, save, remove, clearError }
}
