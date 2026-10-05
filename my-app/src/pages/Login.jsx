import { useState } from 'react'
import { Container, Card, Button, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../auth/auth.jsx'

export default function Login() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSignIn() {
    setError('')
    setLoading(true)
    try {
      await signIn()
      navigate('/', { replace: true })
    } catch (err) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setError('Bạn đã đóng hộp thoại đăng nhập.')
      } else if (err?.code === 'app/not-configured') {
        setError(
          'Chưa cấu hình Firebase. Điền các biến VITE_FIREBASE_* vào file .env.local rồi chạy lại.',
        )
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError('Domain này chưa được thêm vào Firebase Authorized domains.')
      } else {
        setError('Không thể đăng nhập, hãy thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card className="login-card">
          <Card.Body className="p-4">
            <h1 className="fs-5 text-center mb-1">Hillary23english</h1>
            <p className="text-center text-muted small mb-4">
              Đăng nhập để tra cứu và quản lý sách.
            </p>

            {error && (
              <div className="text-danger small mb-3" role="alert">
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-100"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  <span className="ms-2">Đang xử lý…</span>
                </>
              ) : (
                <>
                  <FcGoogle size={20} className="me-2" aria-hidden="true" />
                  Đăng nhập với Google
                </>
              )}
            </Button>
          </Card.Body>
        </Card>
      </Container>
    </div>
  )
}
