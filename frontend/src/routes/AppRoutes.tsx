import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from '../components/feedback/States'
import { AdminLayout } from '../layouts/AdminLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { MainLayout } from '../layouts/MainLayout'
import { AdminRoute } from './AdminRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { UserRoute } from './UserRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })))
const ClassListPage = lazy(() => import('../pages/classes/ClassListPage').then((module) => ({ default: module.ClassListPage })))
const ClassDetailPage = lazy(() => import('../pages/classes/ClassDetailPage').then((module) => ({ default: module.ClassDetailPage })))
const MyClassesPage = lazy(() => import('../pages/enrollments/MyClassesPage').then((module) => ({ default: module.MyClassesPage })))
const AdminClassesPage = lazy(() => import('../pages/admin/AdminClassesPage').then((module) => ({ default: module.AdminClassesPage })))
const ClassFormPage = lazy(() => import('../pages/admin/ClassFormPage').then((module) => ({ default: module.ClassFormPage })))
const StudentsPage = lazy(() => import('../pages/admin/StudentsPage').then((module) => ({ default: module.StudentsPage })))
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

export const AppRoutes = () => <Suspense fallback={<div className="mx-auto max-w-3xl p-10"><LoadingState /></div>}><Routes>
  <Route element={<AuthLayout />}><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /></Route>
  <Route element={<MainLayout />}><Route index element={<Navigate to="/classes" replace />} /><Route path="classes" element={<ClassListPage />} /><Route path="classes/:classId" element={<ClassDetailPage />} /><Route path="forbidden" element={<ForbiddenPage />} />
    <Route element={<ProtectedRoute />}><Route path="change-password" element={<ChangePasswordPage />} /><Route element={<UserRoute />}><Route path="my-classes" element={<MyClassesPage />} /></Route><Route element={<AdminRoute />}><Route element={<AdminLayout />}><Route path="admin/classes" element={<AdminClassesPage />} /><Route path="admin/classes/new" element={<ClassFormPage />} /><Route path="admin/classes/:classId/edit" element={<ClassFormPage />} /><Route path="admin/classes/:classId/students" element={<StudentsPage />} /></Route></Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Routes></Suspense>
