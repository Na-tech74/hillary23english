import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../config/firebase.js'

// ============================================================
// Nguồn dữ liệu duy nhất của app:
// - Firestore: metadata sách và thể loại, mỗi user một nhánh riêng:
//     users/{uid}/books/{bookId}
//     users/{uid}/categories/{categoryId}
//   → đường dẫn đã thể hiện chủ sở hữu, không cần trường ownerId;
//     rules Firestore chỉ cho phép đọc/ghi dưới nhánh của chính mình
//     (xem firestore.rules).
// - Cloudinary: file Word/PDF và ảnh bìa (xem storage.js)
// Component chỉ gọi các hàm này, không đọc/ghi trực tiếp.
// ============================================================

const booksCol = (uid) => collection(db, 'users', uid, 'books')
const categoriesCol = (uid) => collection(db, 'users', uid, 'categories')

const trim = (value) => (value ?? '').toString().trim()

function toIntOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? Math.trunc(num) : null
}

function fail(message) {
  const err = new Error(message)
  err.reason = 'validation'
  return err
}

function requireDb() {
  if (!db) throw fail('Thiếu cấu hình Firebase — kiểm tra biến VITE_FIREBASE_* trong file .env.')
}

// uid của phiên đăng nhập hiện tại. Mọi trang đều đi qua RequireAuth nên
// khi gọi các hàm này user đã đăng nhập; nếu chưa thì báo lỗi rõ ràng.
function requireUid() {
  requireDb()
  const uid = auth?.currentUser?.uid
  if (!uid) throw fail('Phiên đăng nhập chưa sẵn sàng — hãy đăng nhập lại.')
  return uid
}

// Dịch lỗi Firebase sang tiếng Việt (hiện trong Alert của trang).
function friendly(err, fallback) {
  if (err?.reason === 'validation') return err
  const code = err?.code ?? ''
  if (code === 'permission-denied') {
    return new Error('Không có quyền truy cập — hãy đăng nhập lại hoặc kiểm tra rules Firestore.')
  }
  if (code === 'unauthenticated') return new Error('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.')
  if (code === 'unavailable') return new Error('Không kết nối được máy chủ, vui lòng thử lại sau.')
  if (code.startsWith('firestore/')) return new Error(`Lỗi Firestore (${code}).`)
  return new Error(err?.message || fallback)
}

// ===== Kiểm tra dữ liệu (API tự chặn, không chỉ form) =====
function validateBook(input) {
  if (trim(input.title).length < 2) throw fail('Tên sách phải có ít nhất 2 ký tự.')
  if (trim(input.author).length < 2) throw fail('Tác giả phải có ít nhất 2 ký tự.')

  const year = toIntOrNull(input.year)
  if (year !== null && (year < 1000 || year > 2100)) {
    throw fail('Năm xuất bản phải nằm trong khoảng 1000–2100.')
  }

  const quantity = toIntOrNull(input.quantity)
  if (quantity === null || quantity < 1) throw fail('Số cuốn phải từ 1 trở lên.')
}

function validateName(name) {
  const trimmed = trim(name)
  if (trimmed.length < 2) throw fail('Tên thể loại phải có ít nhất 2 ký tự.')
  if (trimmed.length > 50) throw fail('Tên thể loại tối đa 50 ký tự.')
  return trimmed
}

function normalizeBook(input) {
  return {
    title: trim(input.title),
    author: trim(input.author),
    category: trim(input.category),
    publisher: trim(input.publisher),
    year: toIntOrNull(input.year),
    quantity: toIntOrNull(input.quantity) ?? 1,
    note: trim(input.note),
    coverUrl: trim(input.coverUrl),
    coverPath: trim(input.coverPath),
    fileUrl: trim(input.fileUrl),
    fileName: trim(input.fileName),
    fileType: trim(input.fileType),
    filePath: trim(input.filePath),
  }
}

// ===== SÁCH =====
export async function listBooks() {
  const uid = requireUid()
  try {
    const snap = await getDocs(query(booksCol(uid), orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    throw friendly(err, 'Không tải được danh sách sách.')
  }
}

export async function getBook(id) {
  const uid = requireUid()
  try {
    const snap = await getDoc(doc(booksCol(uid), id))
    if (!snap.exists()) throw fail('Không tìm thấy cuốn sách này.')
    return { id: snap.id, ...snap.data() }
  } catch (err) {
    throw friendly(err, 'Không tải được thông tin sách.')
  }
}

export async function saveBook(input) {
  const uid = requireUid()
  validateBook(input)
  const record = normalizeBook(input)
  try {
    if (input.id) {
      const bookRef = doc(booksCol(uid), input.id)
      const snap = await getDoc(bookRef)
      if (!snap.exists()) throw fail('Không tìm thấy cuốn sách cần cập nhật.')
      const updatedAt = Date.now()
      await updateDoc(bookRef, { ...record, updatedAt })
      return { id: input.id, createdAt: snap.data().createdAt ?? updatedAt, ...record, updatedAt }
    }
    const createdAt = Date.now()
    const created = { ...record, createdAt, updatedAt: createdAt }
    const bookRef = await addDoc(booksCol(uid), created)
    return { id: bookRef.id, ...created }
  } catch (err) {
    throw friendly(err, 'Không lưu được cuốn sách.')
  }
}

export async function deleteBook(id) {
  const uid = requireUid()
  try {
    const bookRef = doc(booksCol(uid), id)
    const snap = await getDoc(bookRef)
    if (!snap.exists()) throw fail('Không tìm thấy cuốn sách cần xóa.')
    await deleteDoc(bookRef)
  } catch (err) {
    throw friendly(err, 'Không xóa được cuốn sách.')
  }
}

// ===== THỐNG KÊ (trang Tổng quan) =====
export async function getStats() {
  const uid = requireUid()
  try {
    const [bookSnap, catSnap] = await Promise.all([
      getDocs(booksCol(uid)),
      getDocs(categoriesCol(uid)),
    ])
    const books = bookSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const counts = new Map()
    for (const book of books) {
      const key = book.category || 'Chưa phân loại'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const breakdown = [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const recentBooks = [...books]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 5)

    return {
      totalBooks: books.length,
      totalCopies: books.reduce((sum, b) => sum + (b.quantity ?? 0), 0),
      totalCategories: catSnap.size,
      breakdown,
      recentBooks,
    }
  } catch (err) {
    throw friendly(err, 'Không tải được số liệu thống kê.')
  }
}

// ===== THỂ LOẠI =====
export async function listCategories() {
  const uid = requireUid()
  try {
    const [catSnap, bookSnap] = await Promise.all([
      getDocs(query(categoriesCol(uid), orderBy('name'))),
      getDocs(booksCol(uid)),
    ])
    const counts = new Map()
    for (const d of bookSnap.docs) {
      const name = trim(d.data().category)
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return catSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      bookCount: counts.get(d.data().name) ?? 0,
    }))
  } catch (err) {
    throw friendly(err, 'Không tải được danh sách thể loại.')
  }
}

export async function createCategory({ name, description }) {
  const uid = requireUid()
  const trimmed = validateName(name)
  try {
    const snap = await getDocs(categoriesCol(uid))
    const duplicate = snap.docs.some(
      (d) => trim(d.data().name).toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) throw fail(`Thể loại "${trimmed}" đã tồn tại.`)

    const created = { name: trimmed, description: trim(description), createdAt: Date.now() }
    const catRef = await addDoc(categoriesCol(uid), created)
    return { id: catRef.id, ...created, bookCount: 0 }
  } catch (err) {
    throw friendly(err, 'Không thêm được thể loại.')
  }
}

export async function updateCategory(id, { name, description }) {
  const uid = requireUid()
  const trimmed = validateName(name)
  try {
    const [catSnap, bookSnap] = await Promise.all([
      getDocs(categoriesCol(uid)),
      getDocs(booksCol(uid)),
    ])
    const target = catSnap.docs.find((d) => d.id === id)
    if (!target) throw fail('Không tìm thấy thể loại cần cập nhật.')

    const oldName = trim(target.data().name)
    const duplicate = catSnap.docs.some(
      (d) => d.id !== id && trim(d.data().name).toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) throw fail(`Thể loại "${trimmed}" đã tồn tại.`)

    // Đổi tên thì đồng bộ luôn sách đang gán tên cũ (cùng một batch).
    const renamed = oldName !== trimmed
    const affected = renamed
      ? bookSnap.docs.filter((d) => trim(d.data().category) === oldName)
      : []
    const alreadyHas = bookSnap.docs.filter((d) => trim(d.data().category) === trimmed).length

    const batch = writeBatch(db)
    batch.update(doc(categoriesCol(uid), id), {
      name: trimmed,
      description: trim(description),
      updatedAt: Date.now(),
    })
    for (const bookDoc of affected) {
      batch.update(bookDoc.ref, { category: trimmed, updatedAt: Date.now() })
    }
    await batch.commit()

    return { id, name: trimmed, description: trim(description), bookCount: alreadyHas + affected.length }
  } catch (err) {
    throw friendly(err, 'Không cập nhật được thể loại.')
  }
}

export async function deleteCategory(id) {
  const uid = requireUid()
  try {
    const [catSnap, bookSnap] = await Promise.all([
      getDocs(categoriesCol(uid)),
      getDocs(booksCol(uid)),
    ])
    const target = catSnap.docs.find((d) => d.id === id)
    if (!target) throw fail('Không tìm thấy thể loại cần xóa.')

    const name = trim(target.data().name)
    const used = bookSnap.docs.filter((d) => trim(d.data().category) === name).length
    if (used > 0) {
      throw fail(
        `Không thể xóa thể loại "${name}" vì đang có ${used} cuốn sách. Hãy chuyển sách sang thể loại khác trước.`
      )
    }
    await deleteDoc(doc(categoriesCol(uid), id))
  } catch (err) {
    throw friendly(err, 'Không xóa được thể loại.')
  }
}

// ===== MIGRATION: chuyển dữ liệu cũ vào nhánh của user =====
// Chạy MỘT LẦN khi deploy code này, trong lúc rules Firestore vẫn còn ở
// chế độ mở: đăng nhập bằng tài khoản của BẠN, toàn bộ sách/thể loại ở
// collection cũ (books/categories) sẽ được chuyển vào
// users/{uid}/books và users/{uid}/categories (giữ nguyên id).
// Xong mới deploy rules chặt (firestore.rules) — sau đó hàm này bị rules
// từ chối và tự bỏ qua.
export async function migrateLegacyData(uid) {
  if (!uid || !db) return
  const move = async (name) => {
    const legacySnap = await getDocs(collection(db, name))
    if (legacySnap.empty) return 0
    const target = collection(db, 'users', uid, name)
    for (const d of legacySnap.docs) {
      const data = d.data()
      delete data.ownerId
      await setDoc(doc(target, d.id), data)
      await deleteDoc(d.ref)
    }
    return legacySnap.size
  }
  try {
    const [books, categories] = await Promise.all([move('books'), move('categories')])
    if (books + categories > 0) {
      console.info(
        `[firestore] Đã chuyển ${books} sách, ${categories} thể loại vào users/${uid}/`
      )
    }
  } catch (err) {
    // permission-denied = rules chặt đã áp dụng hoặc đã migrate xong.
    if (err?.code !== 'permission-denied') {
      console.warn('[firestore] Không chuyển được dữ liệu cũ:', err?.message)
    }
  }
}
