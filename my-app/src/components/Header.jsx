import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import NavOffcanvas from 'react-bootstrap/Offcanvas'
import Button from 'react-bootstrap/Button'
import Dropdown from 'react-bootstrap/Dropdown'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth.jsx'

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'
  const shortName = user?.email?.split('@')[0] ?? ''

  return (
    <Navbar expand="lg" sticky="top" variant="light" className="app-navbar">
      <Container>
        <Navbar.Brand as={NavLink} to="/" className="fw-semibold text-dark">
          Hillary23english
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="border-0" />

        <Navbar.Offcanvas id="main-nav" aria-labelledby="main-nav-label" placement="end">
          <NavOffcanvas.Header closeButton>
            <NavOffcanvas.Title id="main-nav-label" className="fs-6 fw-semibold">
              Menu
            </NavOffcanvas.Title>
          </NavOffcanvas.Header>

          <NavOffcanvas.Body>
            <Nav className="me-auto gap-1">
              <Nav.Link as={NavLink} to="/" end className="px-3">
                Tổng quan
              </Nav.Link>
              <Nav.Link as={NavLink} to="/books" className="px-3">
                Danh sách sách
              </Nav.Link>
              <Nav.Link as={NavLink} to="/categories" className="px-3">
                Thể loại
              </Nav.Link>
            </Nav>

            <Nav className="align-items-lg-center">
              {user && (
                <>
                  {/* Desktop: dropdown tài khoản */}
                  <div className="d-none d-lg-block">
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        as="button"
                        className="btn btn-link text-dark text-decoration-none d-flex align-items-center gap-2 border-0 p-1"
                      >
                        <span className="avatar">{initial}</span>
                        <span className="small">{shortName}</span>
                      </Dropdown.Toggle>

                      <Dropdown.Menu className="mt-2" align="end">
                        <Dropdown.ItemText className="small text-muted text-truncate" style={{ maxWidth: 240 }}>
                          {user.email}
                        </Dropdown.ItemText>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={handleSignOut} className="text-danger small">
                          Đăng xuất
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>

                  {/* Mobile: thông tin + đăng xuất */}
                  <div className="d-lg-none">
                    <div className="d-flex align-items-center gap-2 mb-2 p-2 rounded bg-body-secondary">
                      <span className="avatar">{initial}</span>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="fw-semibold small text-truncate">{shortName}</div>
                        <div className="text-muted text-truncate" style={{ fontSize: 12 }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="w-100"
                      onClick={handleSignOut}
                    >
                      Đăng xuất
                    </Button>
                  </div>
                </>
              )}

              {!user && (
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                  Đăng nhập
                </Button>
              )}
            </Nav>
          </NavOffcanvas.Body>
        </Navbar.Offcanvas>
      </Container>
    </Navbar>
  )
}
