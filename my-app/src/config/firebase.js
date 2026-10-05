import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ============================================================
// CẤU HÍNH FIREBASE
// Toàn bộ thông tin dự án đọc từ .env.local (tiền tố VITE_ để Vite
// nhúng vào bundle khi build). KHÔNG khai báo apiKey trực tiếp trong code.
// ============================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Trả về danh sách biến môi trường còn trống, kèm tên biến đúng
// (VITE_FIREBASE_...) để biết chính xác chỗ nào phải điền.
export const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`)

const isConfigured = missingConfigKeys.length === 0

if (!isConfigured) {
  console.error(
    `[firebase] Sai cấu hình: ${missingConfigKeys.join(', ')}. `
  )
}

const app = initializeApp(firebaseConfig)
// Chỉ gọi getAuth khi cấu hình đủ: thiếu apiKey sẽ ném
// auth/invalid-api-key ngay lúc khởi tạo làm trắng màn hình.
export const auth = isConfigured ? getAuth(app) : null

// Firestore lưu metadata (sách/thể loại); file Word/PDF và ảnh bìa
// nằm trên Cloudinary (xem services/storage.js).
export const db = isConfigured ? getFirestore(app) : null

// Provider đăng nhập bằng Google, dùng cho signInWithPopup.
export const googleProvider = new GoogleAuthProvider()
