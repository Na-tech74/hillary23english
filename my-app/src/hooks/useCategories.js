import { useCallback, useEffect, useState } from 'react'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/api.js'

// Quản lý thể loại: đọc danh sách (kèm số sách) + thêm/sửa/xóa.
export default function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Tải dữ liệu: mọi setState nằm trong callback của promise nên không chạy
  // đồng bộ trong useEffect.
  const reload = useCallback(() => {
    listCategories()
      .then((data) => {
        setCategories(data)
        setError('')
      })
      .catch((err) => {
        setError(err?.message || 'Không tải được danh sách thể loại.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const create = useCallback(async (values) => {
    setSaving(true)
    setError('')
    try {
      const created = await createCategory(values)
      setCategories((prev) => [...prev, created])
      return created
    } catch (err) {
      throw new Error(err?.message || 'Không thêm được thể loại.', { cause: err })
    } finally {
      setSaving(false)
    }
  }, [])

  const update = useCallback(async (id, values) => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateCategory(id, values)
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    } catch (err) {
      throw new Error(err?.message || 'Không cập nhật được thể loại.', { cause: err })
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (id) => {
    setDeleting(true)
    setError('')
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err?.message || 'Không xóa được thể loại.')
      throw err
    } finally {
      setDeleting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return {
    categories,
    loading,
    error,
    saving,
    deleting,
    reload,
    create,
    update,
    remove,
    clearError,
  }
}
