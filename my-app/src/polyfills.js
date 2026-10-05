// pdf.js bản legacy vẫn gọi thẳng Promise.withResolvers (Safari 17.4+,
// Chrome 119+), core-js bundle trong bản legacy không có polyfill này.
// Import file này ở cả trang chính lẫn trong worker (worker là realm riêng,
// không kế thừa polyfill khai báo trên trang chính).
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
