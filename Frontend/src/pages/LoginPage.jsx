// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { LogIn, User, Lock, Loader2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 真实的登录 API 调用函数
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<object>} - 包含认证令牌 (token) 和用户数据的 Promise
 */
const callLoginApi = async (username, password) => {
    // 假设你的 Flask 后端运行在同一域名下的 /api/v1/login
    const url = '/api/v1/login';

    // 准备发送到后端的 payload
    const payload = {
        username: username,
        password: password
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                // 告诉服务器我们发送的是 JSON 数据
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload), // 将 JavaScript 对象转换为 JSON 字符串
        });

        // 检查 HTTP 状态码是否在 200-299 范围内（成功）
        if (response.ok) {
            // 假设后端成功时返回 { access_token: "...", user: {...} }
            const result = await response.json();

            // 验证关键数据是否存在
            if (result.access_token && result.user) {
                // 成功返回 token 和 user 数据
                return {
                    success: true,
                    token: result.access_token,
                    user: result.user
                };
            } else {
                // 后端响应成功，但数据格式不正确
                throw new Error('登录成功但服务器返回数据格式错误。');
            }
        } else {
            // 处理非 2xx 状态码 (例如 401 Unauthorized, 400 Bad Request)

            // 尝试解析后端返回的错误信息
            const errorData = await response.json();

            // 抛出后端返回的具体错误信息，或使用默认错误信息
            throw new Error(errorData.message || '用户名或密码错误。');
        }
    } catch (error) {
        // 捕获网络错误、JSON 解析错误或上面抛出的错误
        console.error("API Error during login:", error);

        // 确保返回一个易于理解的错误信息
        throw new Error(error.message || '网络连接失败，请检查您的连接。');
    }
};

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await callLoginApi(username, password);
            if (result.success) {
                // 存储 Token 以便后续 API 请求使用
                localStorage.setItem('authToken', result.token);
                // 登录成功，更新父组件/全局状态
                onLogin(result.user.username);
                navigate('/'); // 导航到主页
            }
        } catch (err) {
            setError(err.message || '登录失败，请重试。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 bg-white shadow-lg p-4 flex items-center justify-between z-30 w-full">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <Edit3 className="w-5 h-5 mr-2 text-indigo-500" />
                        AI 作文助手
                    </h1>
                </div>
            </header>
            <div className="flex flex-grow items-center justify-center bg-gray-100 p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-indigo-600">
                    <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6 flex items-center justify-center">
                        <LogIn className="w-7 h-7 mr-3 text-indigo-600" />
                        用户登录
                    </h2>
                    <p className="text-center text-sm text-gray-500 mb-8">使用账号密码登录 AI 作文助手。</p>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6">
                            <span className="block">{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <User className="w-4 h-4 mr-2" /> 用户名
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="输入用户名"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Lock className="w-4 h-4 mr-2" /> 密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="输入密码"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 正在登录...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5 mr-2" /> 登录
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        还没有账号？
                        <button
                            onClick={() => navigate('/register')}
                            className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 transition duration-150"
                            disabled={isLoading}
                        >
                            立即注册
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;