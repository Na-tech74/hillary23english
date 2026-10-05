import { useCallback, useEffect, useState } from 'react'
import { getStats } from '../services/api.js'

// Số liệu cho trang Tổng quan: đếm sách, bản, thể loại và danh sách mới thêm.
export default function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Tải dữ liệu: mọi setState nằm trong callback của promise nên không chạy
  // đồng bộ trong useEffect.
  const reload = useCallback(() => {
    getStats()
      .then((data) => {
        setStats(data)
        setError('')
      })
      .catch((err) => {
        setError(err?.message || 'Không tải được số liệu thống kê.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { stats, loading, error, reload }
}
