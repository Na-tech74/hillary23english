import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, googleProvider, missingConfigKeys } from '../config/firebase.js'
import { migrateLegacyData } from '../services/api.js'

// ============================================================
// 1. ĐĂNG NHẬP / ĐĂNG XUẤT
// Chỉ giữ 4 trường cần thiết, tránh đẩy cả object User của Firebase
// vào context (gây re-render không cần thiết).
// ============================================================
function toUser(firebaseUser) {
  if (!firebaseUser) return null
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  }
}

// Mở popup chọn tài khoản Google. Ném lỗi có mã `app/not-configured`
// khi chưa điền .env.local để trang Login hiển thị thông báo dễ hiểu.
async function signIn() {
  if (!auth) {
    const err = new Error(`Thiếu cấu hình Firebase: ${missingConfigKeys.join(', ')}`)
    err.code = 'app/not-configured'
    throw err
  }
  const credential = await signInWithPopup(auth, googleProvider)
  return toUser(credential.user)
}

async function signOut() {
  if (auth) await firebaseSignOut(auth)
}

// ============================================================
// 2. CONTEXT
// ============================================================
const AuthContext = createContext(null)

// Hook duy nhất để đọc trạng thái đăng nhập từ component con.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  return ctx
}

// ============================================================
// 3. PROVIDER
// Nguồn sự thật duy nhất của `user`. Đăng nhập bằng Firebase nên
// phiên được giữ trong IndexedDB — không cần lưu localStorage.
// ============================================================
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Chưa xác định xong phiên (Firebase đang đọc IndexedDB) thì quay loading,
  // tránh RequireAuth redirect nhầm về /login rồi nhảy ngược lại.
  const [ready, setReady] = useState(() => !auth)

  useEffect(() => {
    if (!auth) return
    // onAuthStateChanged phát ngay khi có phiên: null nếu chưa đăng nhập,
    // object user nếu đã đăng nhập từ lần mở trước. Hàm trả về là unsubscribe.
    return onAuthStateChanged(auth, async (firebaseUser) => {
      // Chuyển dữ liệu cũ (collection books/categories) vào users/{uid}/...
      // — chỉ có tác dụng khi rules Firestore còn mở (xem migrateLegacyData).
      if (firebaseUser) await migrateLegacyData(firebaseUser.uid)
      setUser(toUser(firebaseUser))
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status" aria-hidden="true" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================
// 4. GUARD ROUTE
// ============================================================
// Chặn trang yêu cầu đăng nhập: chưa đăng nhập → đẩy về /login.
export function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Ngược lại: đã đăng nhập thì không cho ở lại trang /login.
export function RedirectIfAuthed({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}
