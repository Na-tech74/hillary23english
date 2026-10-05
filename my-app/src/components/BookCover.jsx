import { useState } from 'react'
import { FaBook } from 'react-icons/fa'

// Ảnh bìa sách. `src` nhận:
// - chuỗi '#xxxxxx' → ô màu có chữ cái đầu (dùng khi chưa có ảnh thật)
// - URL ảnh         → hiển thị ảnh, lỗi thì tự chuyển sang biểu tượng
// - rỗng            → biểu tượng sách màu xám
export default function BookCover({ src, title = '', size = 44 }) {
  const [broken, setBroken] = useState(false)

  const boxStyle = {
    width: size,
    height: size,
    fontSize: Math.round(size / 2.6),
  }
  const label = `Bìa sách ${title}`.trim()

  if (src && !broken) {
    if (src.startsWith('#')) {
      return (
        <span
          className="book-cover"
          style={{ ...boxStyle, background: src }}
          role="img"
          aria-label={label}
        >
          {title.trim().charAt(0).toUpperCase()}
        </span>
      )
    }
    return (
      <span className="book-cover" style={boxStyle} role="img" aria-label={label}>
        <img src={src} alt="" onError={() => setBroken(true)} />
      </span>
    )
  }

  return (
    <span className="book-cover" style={boxStyle} role="img" aria-label={label}>
      <FaBook size={Math.round(size * 0.4)} />
    </span>
  )
}
