// Nạp pdfjs-dist kèm worker và tài nguyên phụ trợ.
// wasm (giải nén JBIG2/OpenJPEG cho PDF scan), cMap, font chuẩn, ICC
// được copy từ node_modules/pdfjs-dist vào public/pdfjs — không có wasmUrl
// thì PDF scan nén JBIG2 render ra trang trắng.
//
// Luôn dùng bản legacy/ (bundle core-js): bản build chuẩn dùng API quá mới
// (Iterator helpers, Map.getOrInsert, Uint8Array.fromBase64, Math.sumPrecise…)
// nên báo "Can't find variable: Iterator" trên Safari < 18.4 / Chrome < 122,
// tức là hầu hết điện thoại.
import '../polyfills.js'
import workerUrl from '../workers/pdfjs.worker.js?worker&url'

const base = import.meta.env.BASE_URL

export const PDF_ASSETS = {
  wasmUrl: `${base}pdfjs/wasm/`,
  cMapUrl: `${base}pdfjs/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
  iccUrl: `${base}pdfjs/iccs/`,
}

export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs
}
