import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import './index.css';

// ----------------------------------------------------
// 1. 导入 Frontend/src/pages 中创建的页面组件
// ----------------------------------------------------
import HomePage from './src/pages/HomePage.jsx';
import LoginPage from './src/pages/LoginPage.jsx';
import RegisterPage from './src/pages/RegisterPage.jsx';

// ----------------------------------------------------
// 2. 路由守卫组件 (ProtectedRoute)
// ----------------------------------------------------
const ProtectedRoute = ({ children, isAuthenticated }) => {
    if (!isAuthenticated) {
        // If not authenticated, redirect to the login page
        return <Navigate to="/login" replace />;
    }
    return children;
};

// ----------------------------------------------------
// 3. 主应用组件 (App)
// ----------------------------------------------------
const App = () => {
    // State to store the username (string)
    const [user, setUser] = useState(null); 
    const isAuthenticated = !!user;

    // Login callback: expects a username string from LoginPage
    const handleLogin = useCallback((username) => {
        setUser(username);
    }, []);

    // Logout callback: clears user state
    const handleLogout = useCallback(() => {
        setUser(null);
    }, []);

    return (
        <div className="bg-white min-h-screen font-sans">
            <main className="flex-grow"> 
                <Routes>
                    
                    {/* Protected Route: '/' 路径现在是受保护的核心功能页面 */}
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                {/* HomePage 现在接收用户状态和登出回调 */}
                                <HomePage username={user} onLogout={handleLogout} /> 
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* Public Routes */}
                    {/* LoginPage 现在需要传递 handleLogin 方法 */}
                    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* 如果用户已登录并尝试访问 /login，则重定向到 / */}
                    <Route path="/login" element={
                        isAuthenticated 
                            ? <Navigate to="/" replace /> 
                            : <LoginPage onLogin={handleLogin} />
                    } />
                    
                    {/* Catch-all route for 404 Not Found */}
                    <Route path="*" element={
                        <div className="text-center pt-32 max-w-7xl mx-auto"> 
                            <h1 className="text-8xl text-red-500 font-extrabold">404</h1>
                            <p className="text-2xl text-gray-600 mt-4">页面未找到</p>
                        </div>
                    } />
                </Routes>
            </main>
        </div>
    );
};

// ----------------------------------------------------
// 4. 应用启动
// ----------------------------------------------------
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Root element with ID 'root' not found in the HTML.");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);