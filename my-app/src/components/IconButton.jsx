// Nút icon dùng trong bảng: chỉ icon. Tích (Lưu) = xanh lá, Đọc = xanh accent,
// Sửa = vàng, Xóa/Hủy = đỏ, còn lại xám trung tính.
export default function IconButton({ label, tone = 'muted', onClick, children }) {
  const cls = ['icon-btn', tone !== 'muted' && `icon-btn--${tone}`].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}
