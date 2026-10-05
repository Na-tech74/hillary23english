import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AuthProvider, RequireAuth, RedirectIfAuthed } from './auth/auth.jsx'
import Header from './components/Header.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BookList from './pages/BookList.jsx'
import BookReader from './pages/BookReader.jsx'
import CategoryManager from './pages/CategoryManager.jsx'
import NotFound from './pages/NotFound.jsx'

// Cấu hình route (react-router v7, khai báo bằng object thay vì <Routes>).
// - /login: chỉ dành cho người chưa đăng nhập (RedirectIfAuthed).
// - /: yêu cầu đăng nhập (RequireAuth), có Header + vùng <Outlet> cho trang con.
const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <>
          <Header />
          <main>
            <Outlet />
          </main>
        </>
      </RequireAuth>
    ),
    // Route con render trong <Outlet/>.
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'books', element: <BookList /> },
      { path: 'books/:id', element: <BookReader /> },
      { path: 'categories', element: <CategoryManager /> },
      // Bắt mọi đường dẫn không khớp → trang 404.
      { path: '*', element: <NotFound /> },
    ],
  },
])

// AuthProvider phải bọc ngoài RouterProvider để mọi route đều đọc được
// trạng thái đăng nhập.
export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
