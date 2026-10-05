// ============================================================
// CLOUDINARY — lưu file Word/PDF và ảnh bìa (upload unsigned).
// Chỉ cần cloud name + tên preset; KHÔNG chứa API key/secret.
// ============================================================
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const missingCloudinaryKeys = [
  ['VITE_CLOUDINARY_CLOUD_NAME', cloudName],
  ['VITE_CLOUDINARY_UPLOAD_PRESET', uploadPreset],
]
  .filter(([, value]) => !value)
  .map(([key]) => key)

export const isCloudinaryConfigured = missingCloudinaryKeys.length === 0

if (!isCloudinaryConfigured) {
  console.error(`[cloudinary] Thiếu cấu hình: ${missingCloudinaryKeys.join(', ')}. `)
}

// resourceType: 'image' cho ảnh bìa, 'auto' để Cloudinary tự nhận diện
// .pdf (image) hay .doc/.docx (raw).
export const cloudinaryUploadUrl = (resourceType = 'auto') =>
  `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

// Ghi chú: tài khoản đang bật Strict Transformations (Console → Security) nên
// KHÔNG dùng transform trên-the-fly (vd a_0, w_200) — chỉ URL gốc là giao được.

export { cloudName, uploadPreset }
