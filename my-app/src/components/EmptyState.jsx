// Trạng thái rỗng: một dòng chữ xám, không icon, không hình vẽ.
export default function EmptyState({ text }) {
  return <p className="text-muted small text-center py-5 mb-0">{text}</p>
}
