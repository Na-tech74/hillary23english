import {
  cloudinaryUploadUrl,
  isCloudinaryConfigured,
  missingCloudinaryKeys,
  uploadPreset,
} from '../config/cloudinary.js'

// ============================================================
// Upload file sách (Word/PDF) và ảnh bìa → Cloudinary (unsigned).
// Path trả về dạng `cloudinary:<resource_type>/<public_id>` lưu trong
// Firestore để biết asset nằm ở đâu (metadata, không xóa từ trình duyệt).
// ============================================================

// Gói Cloudinary Free giới hạn cứng 10 MiB/upload — đặt bằng (hoặc nhỏ hơn)
// để báo lỗi ngay ở client thay vì gửi lên rồi bị từ chối.
export const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['pdf', 'doc', 'docx']

export function fileExt(name) {
  return ((name ?? '').split('.').pop() || '').toLowerCase()
}

function requireCloudinary() {
  if (!isCloudinaryConfigured) {
    throw new Error(
      `Thiếu cấu hình Cloudinary — kiểm tra ${missingCloudinaryKeys.join(', ')} trong file .env.`
    )
  }
}

export function validateBookFile(file) {
  if (!ALLOWED_TYPES.includes(fileExt(file.name))) {
    throw new Error('Chỉ nhận file định dạng .pdf, .doc hoặc .docx.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File lớn hơn ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB. Vui lòng chọn file nhỏ hơn.`
    )
  }
}

// POST multipart tới Cloudinary; onProgress (0–100) báo số % đã gửi.
// Dùng XMLHttpRequest thay vì fetch vì fetch không có sự kiện tiến độ.
function uploadToCloudinary(file, { resourceType, folder, onProgress }) {
  requireCloudinary()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', cloudinaryUploadUrl(resourceType))

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* phản hồi không phải JSON — xử lý nhánh lỗi bên dưới */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
        resolve({
          url: data.secure_url,
          path: `cloudinary:${data.resource_type}/${data.public_id}`,
        })
      } else {
        const reason = data?.error?.message || `HTTP ${xhr.status}`
        reject(new Error(`Tải file lên Cloudinary thất bại (${reason}).`))
      }
    }
    xhr.onerror = () =>
      reject(new Error('Không kết nối được tới Cloudinary. Kiểm tra mạng rồi thử lại.'))
    xhr.onabort = () => reject(new Error('Đã hủy tải lên.'))

    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', uploadPreset)
    body.append('folder', folder)
    xhr.send(body)
  })
}

// Tải file sách (.pdf/.doc/.docx) lên → trả về { url, path } cho document sách.
export async function uploadBookFile(file, onProgress) {
  validateBookFile(file)
  return uploadToCloudinary(file, { resourceType: 'auto', folder: 'books/files', onProgress })
}

// Tải ảnh bìa lên → { url, path } (giữ đúng định dạng JPG/PNG của ảnh gốc).
export async function uploadCover(blob, onProgress) {
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  const named = blob.name ? blob : new File([blob], `cover.${ext}`, { type })
  return uploadToCloudinary(named, {
    resourceType: 'image',
    folder: 'books/covers',
    onProgress,
  })
}
