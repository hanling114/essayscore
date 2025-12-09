// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { UserPlus, User, Lock, Loader2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * 注册 API 调用函数
 * @param {object} data - 包含 username,password 的注册数据
 * @returns {Promise<object>} - 包含后端响应的 Promise
 */
const callRegisterApi = async (data) => {
    const url = '/api/v1/register';
    const payload = {
        username: data.username,
        password: data.password,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // 检查 HTTP 状态码是否表示成功 (例如 201 Created 或 200 OK)
        if (response.ok) {
            // 假设后端成功时返回一个 JSON 响应 (例如 {message: "User registered"})
            const result = await response.json();
            return { success: true, message: '注册成功！' };
        } else {
            // 处理非 2xx 状态码（如 400 Bad Request, 409 Conflict）
            const errorData = await response.json();

            // 抛出后端返回的具体错误信息
            throw new Error(errorData.message || '注册失败，服务器返回错误。');
        }
    } catch (error) {
        // 处理网络错误、JSON 解析错误或上面抛出的错误
        console.error("API Error during registration:", error);
        throw new Error(error.message || '网络连接失败，请检查您的连接。');
    }
};

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (formData.password !== formData.confirmPassword) {
            setError('两次输入的密码不一致。');
            return;
        }

        setIsLoading(true);

        try {
            const result = await callRegisterApi(formData);
            if (result.success) {
                setSuccess('注册成功！您将在 3 秒后跳转到登录页面...');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            setError(err.message || '注册失败，请重试。');
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
                        <UserPlus className="w-7 h-7 mr-3 text-indigo-600" />
                        新用户注册
                    </h2>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6">
                            <span className="block">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6">
                            <span className="block">{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <User className="w-4 h-4 mr-2" /> 用户名
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
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
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="设置密码"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Lock className="w-4 h-4 mr-2" /> 确认密码
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                placeholder="再次输入密码"
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
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 正在注册...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5 mr-2" /> 注册
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        已有账号？
                        <button
                            onClick={() => navigate('/login')}
                            className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 transition duration-150"
                            disabled={isLoading}
                        >
                            返回登录
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;