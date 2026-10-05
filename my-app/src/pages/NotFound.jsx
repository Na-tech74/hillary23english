import { Container, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <Container className="py-5 text-center">
      <h1 className="display-6 fw-semibold mb-2">404</h1>
      <p className="text-muted small mb-4">Không tìm thấy trang bạn yêu cầu.</p>
      <Button as={Link} to="/" variant="primary">
        Về trang chủ
      </Button>
    </Container>
  )
}
