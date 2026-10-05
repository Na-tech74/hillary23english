// Khung tiêu đề dùng chung: tiêu đề nhỏ (fs-5) + mô tả phụ xám,
// hành động chính của trang nằm bên phải.
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <h1 className="fs-5 fw-semibold mb-1">{title}</h1>
        {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
      </div>
      {children && (
        <div className="d-flex align-items-center gap-2 flex-wrap">{children}</div>
      )}
    </div>
  )
}
