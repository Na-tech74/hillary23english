import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  ProgressBar,
} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import BookCover from '../components/BookCover.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useStats from '../hooks/useStats.js'

// Mốc thời gian dạng "2 giờ trước".
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return new Date(timestamp).toLocaleDateString('vi-VN')
}

function StatCell({ value, label }) {
  return (
    <div className="stat-cell">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { stats, loading, error } = useStats()

  const totalInBreakdown = (stats?.breakdown ?? []).reduce((sum, c) => sum + c.count, 0)

  return (
    <Container className="py-4">
      <PageHeader title="Tổng quan" subtitle="Thống kê hoạt động thư viện EBook" />

      {error && (
        <div className="text-danger small mb-3" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5" role="status">
          <Spinner animation="border" />
          <p className="mt-2 text-muted small mb-0">Đang tải dữ liệu…</p>
        </div>
      ) : (
        stats && (
          <>
            {/* Ba chỉ số trên một dải, ngăn bằng viền */}
            <div className="stats mb-4">
              <StatCell value={stats.totalBooks.toLocaleString()} label="Đầu sách" />
              <StatCell value={stats.totalCopies.toLocaleString()} label="Tổng số cuốn" />
              <StatCell value={stats.totalCategories.toLocaleString()} label="Thể loại" />
            </div>

            <Row className="g-3">
              <Col lg={7}>
                <Card className="h-100">
                  <Card.Header>Sách theo thể loại</Card.Header>
                  <Card.Body>
                    {totalInBreakdown === 0 ? (
                      <EmptyState text="Chưa có sách để phân loại." />
                    ) : (
                      stats.breakdown.map((cat) => {
                        const percent = Math.round((cat.count / totalInBreakdown) * 100)
                        return (
                          <div key={cat.name} className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                              <span className="small fw-medium">{cat.name}</span>
                              <span className="text-muted" style={{ fontSize: 12 }}>
                                {cat.count} cuốn ({percent}%)
                              </span>
                            </div>
                            <ProgressBar variant="primary" now={percent} style={{ height: 6 }} />
                          </div>
                        )
                      })
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5}>
                <Card className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Sách mới thêm</span>
                    <Link to="/books" className="small text-decoration-none">
                      Xem tất cả
                    </Link>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {stats.recentBooks.length === 0 ? (
                      <EmptyState text="Chưa có sách nào." />
                    ) : (
                      <Table
                        responsive
                        size="sm"
                        hover
                        className="mb-0 table-inset"
                        style={{ tableLayout: 'fixed' }}
                      >
                        <thead>
                          <tr>
                            <th>Sách</th>
                            <th style={{ width: '30%' }}>Thể loại</th>
                            <th style={{ width: 120 }} className="text-end text-nowrap">
                              Thời gian
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentBooks.map((book) => (
                            <tr key={book.id}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <BookCover src={book.coverUrl} title={book.title} size={28} />
                                  <div className="min-w-0 flex-grow-1">
                                    <div className="fw-semibold text-truncate" title={book.title}>
                                      {book.title}
                                    </div>
                                    <div
                                      className="text-muted text-truncate"
                                      style={{ fontSize: 12 }}
                                      title={book.author}
                                    >
                                      {book.author}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-muted">
                                <div className="text-truncate" title={book.category || ''}>
                                  {book.category || '—'}
                                </div>
                              </td>
                              <td
                                className="text-muted text-end text-nowrap"
                                style={{ fontSize: 12 }}
                              >
                                {timeAgo(book.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )
      )}
    </Container>
  )
}
