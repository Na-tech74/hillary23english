// Worker riêng cho pdf.js: polyfill phải chạy trước khi worker của pdf.js
// được dùng (Promise.withResolvers nằm trong class field / method khi chạy).
import '../polyfills.js'
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
