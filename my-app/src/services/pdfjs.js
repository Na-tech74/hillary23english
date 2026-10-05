// Nạp pdfjs-dist kèm worker và tài nguyên phụ trợ.
// wasm (giải nén JBIG2/OpenJPEG cho PDF scan), cMap, font chuẩn, ICC
// được copy từ node_modules/pdfjs-dist vào public/pdfjs — không có wasmUrl
// thì PDF scan nén JBIG2 render ra trang trắng.
const base = import.meta.env.BASE_URL

export const PDF_ASSETS = {
  wasmUrl: `${base}pdfjs/wasm/`,
  cMapUrl: `${base}pdfjs/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
  iccUrl: `${base}pdfjs/iccs/`,
}

export async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}
