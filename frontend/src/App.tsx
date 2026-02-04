import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import LogoutButton from './components/LogoutButton';
import GlobalErrorModal from './components/GlobalErrorModal';
import AvailableCourses from './pages/AvailableCourses';
import MyCourses from './pages/MyCourses';
import CourseLearn from './pages/CourseLearn';
import LessonLearn from './pages/LessonLearn';
import Profile from './pages/Profile';
import ParentInvite from './pages/ParentInvite';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCourses from './pages/admin/AdminCourses';
import CourseEditor from './pages/admin/CourseEditor';
import ModuleEditor from './pages/admin/ModuleEditor';
import LessonEditor from './pages/admin/LessonEditor';
import { useAuth } from './context/AuthContext';

const App: FC = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();

  const rightSlot = user ? (
    <LogoutButton />
  ) : (
    <button
      type="button"
      onClick={() => setAuthOpen(true)}
      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-xs sm:text-sm font-semibold shadow-tg-md transition-all duration-200 text-white active:scale-95 shrink-0"
    >
      <span>Авторизация</span>
    </button>
  );


  return (
    <>
      <GlobalErrorModal />
      <Routes>
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:id/edit" element={<CourseEditor />} />
          <Route path="modules/:id/edit" element={<ModuleEditor />} />
          <Route path="lessons/:id/edit" element={<LessonEditor />} />
        </Route>

        <Route
          path="/*"
          element={
            <Layout rightSlot={rightSlot}>
              <Routes>
                <Route path="/" element={<AvailableCourses />} />
                <Route
                  path="/my-courses"
                  element={
                    user ? (
                      <MyCourses />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-tg-muted">Необходима авторизация</p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/profile"
                  element={
                    user ? (
                      <Profile />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-tg-muted">Необходима авторизация</p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/courses/:courseId/learn"
                  element={
                    user ? (
                      <CourseLearn />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-tg-muted">Необходима авторизация</p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/courses/:courseId/lessons/:lessonId"
                  element={
                    user ? (
                      <LessonLearn />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-tg-muted">Необходима авторизация</p>
                      </div>
                    )
                  }
                />
                <Route path="/parent-invite/:token" element={<ParentInvite />} />
              </Routes>

              <AnimatePresence>
                {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
              </AnimatePresence>
            </Layout>
          }
        />
      </Routes>
    </>
  );
};

export default App;

