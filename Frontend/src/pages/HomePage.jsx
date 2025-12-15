import React, { useState, useEffect, useCallback, useMemo } from 'react';
// 确保导入所有需要的图标
import { Menu, X, Send, Clock, Edit3, MessageSquare, Target, Hash, FileText, Loader2, BookOpen, LogOut, Upload } from 'lucide-react';


// 历史记录数据
const initialHistory = [
    { id: '1', title: '我的第一篇 AI 评分作文', timestamp: Date.now() - 86400000 },
    { id: '2', title: '关于未来科技的畅想', timestamp: Date.now() - 3600000 },
];

// 作文数据
const getMockEssay = (id) => ({
    id: id,
    topic: "描述你最喜欢的一件艺术品及其对你的意义，要求结构完整，主题明确。",
    title: id === 'new' ? '新作文' : (id === '1' ? initialHistory[0].title : initialHistory[1].title),
    originalContent: "无作文内容",
    score: 0, // 评分 (满分 60)
    feedback: [
        { "type": "优点", "detail": "无" },
        { "type": "不足", "detail": "无" },
        { "type": "建议", "detail": "无" }
    ],
    revisedContent: "无",
    timestamp: 0,
});


const callApi = async (endpoint, method = 'GET', data = null) => {
    // 使用 Vite 代理，直接使用相对路径（会自动代理到 http://localhost:5000）
    const url = endpoint;
    
    console.log(`[API CALL] Sending ${method} request to ${url} with data:`, data);

    try {
        // 对于所有 API 调用，尝试先调用真实后端
        const fetchOptions = { method };
        if (method === 'POST' && data !== null) {
            if (data instanceof FormData) {
                fetchOptions.body = data;
            } else {
                fetchOptions.headers = {
                    'Content-Type': 'application/json',
                };
                fetchOptions.body = JSON.stringify(data);
            }
        }
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
                // 如果后端返回非 2xx 状态码
            let errorBody;
            try {
                errorBody = await response.json();
            } catch {
                errorBody = { error: `HTTP error! status: ${response.status}` };
            }
            throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
         }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`[API ERROR] Error calling ${method} ${url}:`, error);
        
        // 如果后端不可用，使用模拟数据作为后备
        if (endpoint === '/api/v1/history' && method === 'GET') {
            console.warn('[FALLBACK] Using mock history data');
            await new Promise(resolve => setTimeout(resolve, 300));
            return initialHistory;
        }

        if (endpoint.startsWith('/api/v1/essay/') && method === 'GET') {
            console.warn('[FALLBACK] Using mock essay data');
            await new Promise(resolve => setTimeout(resolve, 500));
            const id = endpoint.split('/').pop();
            return getMockEssay(id);
        }

        if (endpoint === '/api/v1/score' && method === 'POST') {
            console.warn('[FALLBACK] Using mock scoring');
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newId = (initialHistory.length + 1).toString();
            const newEssay = {
                ...getMockEssay('new'),
                id: newId,
                title: data.title || '无标题作文',
                topic: data.topic,
                originalContent: data.content,
                timestamp: Date.now()
            };
            initialHistory.unshift({ id: newId, title: newEssay.title, timestamp: newEssay.timestamp });
            return newEssay;
        }

        // 如果无法处理，重新抛出错误
        throw error;
    }
};
// --- UTILITY COMPONENTS---

const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
);

const FeedbackCard = ({ type, detail, icon: Icon, color }) => (
    <div className={`p-4 rounded-xl shadow-lg border-l-4 ${color.border} bg-white transition-all duration-300 hover:shadow-xl`}>
        <div className="flex items-start">
            <Icon className={`w-5 h-5 mt-1 ${color.text} flex-shrink-0`} />
             <div className="ml-3">
                <p className={`font-semibold ${color.text} text-sm`}>{type}</p>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">{detail}</p>
            </div>
        </div>
    </div>
);

// --- SIDEBAR COMPONENT---

const Sidebar = ({ history, onSelectEssay, currentEssayId, onClose }) => (
    <div className="w-64 bg-white h-full overflow-y-auto shadow-2xl p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                历史记录
            </h2>
            <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-indigo-600 p-1 rounded-full transition duration-150">
                <X className="w-6 h-6" />
            </button>
        </div>

        <button
            onClick={() => onSelectEssay('home')}
            className={`w-full text-left py-3 px-3 rounded-xl flex items-center transition duration-150 mb-4 font-semibold shadow-md ${currentEssayId === 'home'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                }`}
        >
            <Edit3 className="w-5 h-5 mr-3" />
            开始新评分
        </button>

        <ul className="space-y-2 flex-grow">
            {history.length === 0 ? (
                <p className="text-gray-500 text-sm pt-4">暂无评分历史。</p>
            ) : (
                history.map((essay) => (
                    <li key={essay.id}>
                        <button
                            onClick={() => onSelectEssay(essay.id)}
                            className={`w-full text-left py-3 px-3 rounded-lg transition duration-150 truncate ${currentEssayId === essay.id
                                    ? 'bg-indigo-100 text-indigo-700 font-medium border-l-4 border-indigo-500 shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            title={essay.title}
                        >
                            <span className="text-sm block truncate">{essay.title}</span>
                            <span className="text-xs text-gray-400 block mt-0.5">
                                {new Date(essay.timestamp).toLocaleDateString('zh-CN')}
                            </span>
                        </button>
                    </li>
                ))
            )}
        </ul>
    </div>
);

// --- RESULT PAGE COMPONENT---

const ResultPage = ({ essay, onBack, isSaving }) => {
    const feedbackConfig = {
        '优点': { icon: Target, color: { border: 'border-green-500', text: 'text-green-700' } },
        '不足': { icon: X, color: { border: 'border-red-500', text: 'text-red-700' } },
        '建议': { icon: MessageSquare, color: { border: 'border-blue-500', text: 'text-blue-700' } },
    };

    if (!essay) {
        return <div className="p-8 text-center text-gray-500">加载失败或找不到作文记录。</div>;
    }

    const maxScore = 60;
    const scorePercentage = (essay.score / maxScore) * 100;
    const scoreColor = scorePercentage >= 90 ? 'text-green-600' : (scorePercentage >= 70 ? 'text-yellow-600' : 'text-red-600');

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <button
                onClick={onBack}
                className="mb-6 inline-flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 font-medium bg-white p-2 rounded-lg shadow-sm"
            >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                返回主页
            </button>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl mb-8">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">{essay.title}</h1>
                <p className="text-indigo-600 font-medium mb-6 flex items-center bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <BookOpen className="w-4 h-4 mr-2" />
                    题目要求: {essay.topic}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧：原始作文内容 */}
                    <div className="lg:col-span-2 p-6 bg-indigo-50 rounded-xl shadow-inner border border-indigo-200">
                        <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2" /> 原始作文
                        </h2>
                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {essay.originalContent}
                        </div>
                    </div>

                    {/* 右侧：评分卡片 */}
                    <div className="lg:col-span-1 p-6 bg-white rounded-xl shadow-2xl border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">最终评分</h2>
                        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-gray-300 rounded-xl bg-gray-50 mb-6">
                            <p className="text-sm text-gray-500 font-semibold">满分 {maxScore} 分</p>
                            <p className={`text-7xl font-extrabold ${scoreColor} mt-2`}>{essay.score}</p>
                        </div>

                        <h3 className="text-lg font-bold text-gray-700 mb-4">阅卷建议</h3>
                        <div className="space-y-4">
                            {essay.feedback.map((item, index) => (
                                <FeedbackCard
                                    key={index}
                                    type={item.type}
                                    detail={item.detail}
                                    icon={feedbackConfig[item.type].icon}
                                    color={feedbackConfig[item.type].color}
                                />
                            ))}
                        </div>
                        {isSaving && (
                            <div className="mt-4 text-center text-sm text-indigo-500 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                正在保存结果...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 下半部分：修改后的作文 */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl">
                <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center">
                    <Edit3 className="w-6 h-6 mr-2" />
                    大模型修改后的文章 (润色和纠错)
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap leading-loose border-t pt-4">
                    {essay.revisedContent}
                </div>
            </div>
        </div>
    );
};

// --- HOME PAGE COMPONENT  ---

const HomeView = ({ username, isLoading, onSubmit, setNotification}) => {
    const [topic, setTopic] = useState('描述你最喜欢的一件艺术品及其对你的意义，要求结构完整，主题明确。');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState(null);
    const [topic_ocr_isLoading, topic_ocr_setIsLoading] = useState(false);
    const [title_ocr_isLoading, title_ocr_setIsLoading] = useState(false);
    const [essay_ocr_isLoading, essay_ocr_setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        if (!topic.trim() || !content.trim()) {
            setError("请填写作文题目描述和作文主体内容！");
            return;
        }
        onSubmit({ username, topic, title, content });
    };

    const handleTopicChange = useCallback(async (e) => {
        // 文件读取和 OCR
        const file = e.target.files[0];
        if (!file) {
            console.warn("用户取消了文件选择。");
            return;
        }

        if (file.size === 0) {
            setNotification({ type: 'error', message: '文件为空，请选择有效文件。' });
            return;
        }

        topic_ocr_setIsLoading(true);
        setNotification({ type: 'info', message: `正在上传和识别文件: ${file.name}...` });

        try {
            // **使用 await 调用异步 API**
            const formData = new FormData();
            formData.append('file', file);
            const data = await callApi('/api/v1/ocr', 'POST', formData); 
            // **将 API 返回的实际数据设置到 content 状态**
            setTopic(data.content); 

            setNotification({ 
                type: 'success', 
                message: `文件 ${file.name} 处理成功，内容已填充。` 
            });

        } catch (error) {
            console.error("文件上传失败:", error);
            setNotification({ 
                type: 'error', 
                message: `处理失败: ${error.message}` 
            });
            setTopic(''); // 失败时清空内容
        } finally {
            topic_ocr_setIsLoading(false);
            // 清除文件选择，允许再次选择相同文件
            e.target.value = null; 
        }
    }, []);

    const handleTitleChange = useCallback(async (e) => {
        // 文件读取和 OCR
        const file = e.target.files[0];
        if (!file) {
            console.warn("用户取消了文件选择。");
            return;
        }

        if (file.size === 0) {
            setNotification({ type: 'error', message: '文件为空，请选择有效文件。' });
            return;
        }

        title_ocr_setIsLoading(true);
        setNotification({ type: 'info', message: `正在上传和识别文件: ${file.name}...` });

        try {
            // **使用 await 调用异步 API**
            const formData = new FormData();
            formData.append('file', file);
            const data = await callApi('/api/v1/ocr', 'POST', formData); 
            // **将 API 返回的实际数据设置到 content 状态**
            setTitle(data.content); 

            setNotification({ 
                type: 'success', 
                message: `文件 ${file.name} 处理成功，内容已填充。` 
            });

        } catch (error) {
            console.error("文件上传失败:", error);
            setNotification({ 
                type: 'error', 
                message: `处理失败: ${error.message}` 
            });
            setTitle(''); // 失败时清空内容
        } finally {
            title_ocr_setIsLoading(false);
            // 清除文件选择，允许再次选择相同文件
            e.target.value = null; 
        }
    }, []);

    const handleEssayChange = useCallback(async (e) => {
        // 文件读取和 OCR
        const file = e.target.files[0];
        if (!file) {
            console.warn("用户取消了文件选择。");
            return;
        }

        if (file.size === 0) {
            setNotification({ type: 'error', message: '文件为空，请选择有效文件。' });
            return;
        }

        essay_ocr_setIsLoading(true);
        setNotification({ type: 'info', message: `正在上传和识别文件: ${file.name}...` });

        try {
            // **使用 await 调用异步 API**
            const formData = new FormData();
            formData.append('file', file);
            const data = await callApi('/api/v1/ocr', 'POST', formData); 
            // **将 API 返回的实际数据设置到 content 状态**
            setContent(data.content); 

            setNotification({ 
                type: 'success', 
                message: `文件 ${file.name} 处理成功，内容已填充。` 
            });

        } catch (error) {
            console.error("文件上传失败:", error);
            setNotification({ 
                type: 'error', 
                message: `处理失败: ${error.message}` 
            });
            setContent(''); // 失败时清空内容
        } finally {
            essay_ocr_setIsLoading(false);
            // 清除文件选择，允许再次选择相同文件
            e.target.value = null; 
        }
    }, []);

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-8 text-center">
                AI 作文智能评分与润色
            </h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-6" role="alert">
                    <strong className="font-bold">错误: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. 作文题目描述 */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-indigo-600">
                    <label className="block text-lg font-semibold text-gray-700 mb-2 flex items-center">
                        <Hash className="w-5 h-5 mr-2 text-indigo-500" />
                        题目描述 / 写作要求 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows="3"
                        placeholder="请输入作文的题目要求、字数限制等描述..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 resize-none"
                        required
                    />

                    {/* 文件上传/OCR 区域 */}
                    <div className="mt-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 items-center">
                        <label
                            className={`
                                w-full md:w-auto font-medium py-2 px-4 rounded-lg text-center transition duration-150 whitespace-nowrap flex items-center justify-center space-x-2
                                ${topic_ocr_isLoading
                                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed' // 禁用状态
                                    : 'cursor-pointer bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100' // 正常状态
                                }
                            `}
                        >
                            <input
                                type="file" 
                                accept=".txt,image/*" 
                                onChange={handleTopicChange} 
                                className="hidden"
                                disabled={topic_ocr_isLoading}
                            />
                            {topic_ocr_isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>文件处理中...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 mr-1" />
                                    <span>上传文件 / 文字识别</span>
                                </>
                            )}
                        </label>
                        <span className="text-sm text-gray-500 italic flex-grow text-center md:text-left">
                            支持文本文件或图片，内容将自动填充到上方文本框。
                        </span>
                    </div>
                </div>

                {/* 2. 作文标题 */}
                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    <label className="block text-lg font-semibold text-gray-700 mb-2 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                        作文标题
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="请输入作文标题（可选）"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />

                    {/* 文件上传/OCR 区域 */}
                    <div className="mt-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 items-center">
                        <label
                            className={`
                                w-full md:w-auto font-medium py-2 px-4 rounded-lg text-center transition duration-150 whitespace-nowrap flex items-center justify-center space-x-2
                                ${title_ocr_isLoading
                                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed' // 禁用状态
                                    : 'cursor-pointer bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100' // 正常状态
                                }
                            `}
                        >
                            <input
                                type="file" 
                                accept=".txt,image/*" 
                                onChange={handleTitleChange} 
                                className="hidden"
                                disabled={title_ocr_isLoading}
                            />
                            {title_ocr_isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>文件处理中...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 mr-1" />
                                    <span>上传文件 / 文字识别</span>
                                </>
                            )}
                        </label>
                        <span className="text-sm text-gray-500 italic flex-grow text-center md:text-left">
                            支持文本文件或图片，内容将自动填充到上方文本框。
                        </span>
                    </div>
                </div>

                {/* 3. 作文主体 */}
                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    <label className="block text-lg font-semibold text-gray-700 mb-2 flex items-center">
                        <Edit3 className="w-5 h-5 mr-2 text-indigo-500" />
                        作文主体内容 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows="15"
                        placeholder="请在此处输入您的作文内容..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 resize-none"
                        required
                    />

                    {/* 文件上传/OCR 区域 */}
                    <div className="mt-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 items-center">
                        <label
                            className={`
                                w-full md:w-auto font-medium py-2 px-4 rounded-lg text-center transition duration-150 whitespace-nowrap flex items-center justify-center space-x-2
                                ${essay_ocr_isLoading
                                    ? 'bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed' // 禁用状态
                                    : 'cursor-pointer bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100' // 正常状态
                                }
                            `}
                        >
                            <input
                                type="file" 
                                accept=".txt,image/*" 
                                onChange={handleEssayChange} 
                                className="hidden"
                                disabled={essay_ocr_isLoading}
                            />
                            {essay_ocr_isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>文件处理中...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 mr-1" />
                                    <span>上传文件 / 文字识别</span>
                                </>
                            )}
                        </label>
                        <span className="text-sm text-gray-500 italic flex-grow text-center md:text-left">
                            支持文本文件或图片，内容将自动填充到上方文本框。
                        </span>
                    </div>
                </div>

                {/* 提交按钮 */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-6 bg-indigo-600 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-[1.01] active:scale-[0.99]"
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinner />
                            <span className="ml-3">大模型正在评分中，请稍候...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-6 h-6 mr-3" />
                            提交作文，获取AI评分与润色
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const HomePage = ({ username, onLogout }) => {
    const [currentView, setCurrentView] = useState('home'); // 'home' 或 essay ID
    const [history, setHistory] = useState(initialHistory);
    const [currentEssay, setCurrentEssay] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 提示状态，用于替换 alert()
    const [notification, setNotification] = useState(null);

    // 加载历史记录
    const loadHistory = useCallback(async () => {
        try {
            const data = await callApi(`/api/v1/history/${username}`);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history:", error);
            setNotification({ type: 'error', message: '加载历史记录失败。' });
        }
    }, [username]);

    // 加载单篇作文详情
    const loadEssayDetails = useCallback(async (essayId) => {
        if (essayId === 'home') {
            setCurrentEssay(null);
            setCurrentView('home');
            setIsSidebarOpen(false);
            return;
        }

        setIsLoading(true);
        setCurrentView(essayId); // 先切换视图，再加载数据
        setIsSidebarOpen(false);

        try {
            const data = await callApi(`/api/v1/essay/${essayId}`);
            setCurrentEssay(data);
        } catch (error) {
            console.error(`Failed to load essay ${essayId}:`, error);
            setCurrentEssay(null);
            setNotification({ type: 'error', message: '加载作文详情失败。' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 提交评分
    const handleSubmitScoring = useCallback(async (formData) => {
        setIsLoading(true);
        setCurrentEssay(null);
        setNotification(null); // 清除旧的通知

        try {
            // 1. 调用评分 API
            const result = await callApi('/api/v1/score', 'POST', formData);

            // 2. 更新历史记录和当前视图
            // 在生产环境中，API 成功返回后，只需要重新调用 loadHistory 即可
            await loadHistory();
            setCurrentEssay(result);
            setCurrentView(result.id);
            setNotification({ type: 'success', message: '作文评分成功完成！' });

        } catch (error) {
            console.error("Scoring failed:", error.message);
            // 使用自定义通知替换 alert()
            setNotification({ type: 'error', message: `评分失败: ${error.message || '请检查后端服务是否运行正常。'}` });
            setCurrentView('home');
        } finally {
            setIsLoading(false);
        }
    }, [loadHistory]);

    // 初始化加载历史记录
    useEffect(() => {
        loadHistory().then(() => setIsInitialLoad(false));
    }, [loadHistory]);

    // 根据当前视图渲染主体内容
    const renderContent = useMemo(() => {
        if (isInitialLoad || (isLoading && currentView !== 'home' && !currentEssay)) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <LoadingSpinner />
                    <span className="ml-4 text-gray-600 text-lg">正在加载历史记录...</span>
                </div>
            );
        }
        if (currentView === 'home') {
            return (
                <HomeView 
                    username={username} 
                    onSubmit={handleSubmitScoring}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    setNotification={setNotification} />);
        }
        if (currentEssay && currentEssay.id === currentView) {
            return <ResultPage essay={currentEssay} onBack={() => loadEssayDetails('home')} isSaving={isLoading} />;
        }
        // 如果视图ID存在但数据未加载完成（比如从历史记录点击后加载中）
        if (currentView !== 'home' && isLoading) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <LoadingSpinner />
                    <span className="ml-4 text-gray-600 text-lg">正在加载评价结果...</span>
                </div>
            );
        }

        return <div className="p-8 text-center text-gray-500">选择一篇历史作文或开始新的评分。</div>;
    }, [currentView, isLoading, currentEssay, handleSubmitScoring, isInitialLoad, loadEssayDetails]);

    return (
        <div className="min-h-screen flex bg-gray-100 font-sans antialiased">
            {/* 侧边栏 (桌面端) */}
            <div className="hidden lg:block flex-shrink-0">
                <Sidebar
                    history={history}
                    onSelectEssay={loadEssayDetails}
                    currentEssayId={currentView}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>

            {/* 侧边栏 (移动端 Overlay) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <div className="absolute left-0 top-0 w-64 max-w-full h-full" onClick={e => e.stopPropagation()}>
                        <Sidebar
                            history={history}
                            onSelectEssay={loadEssayDetails}
                            currentEssayId={currentView}
                            onClose={() => setIsSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* 主内容区域 */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
                {/* 顶部导航栏 (用于移动端侧边栏开关 和 登出按钮) */}
                <header className="sticky top-0 bg-white shadow-lg p-4 flex items-center justify-between z-30">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-indigo-600 p-2 rounded-full transition duration-150 mr-3">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center">
                            <Edit3 className="w-5 h-5 mr-2 text-indigo-500" />
                            AI 作文助手
                        </h1>
                    </div>

                    {/* 登出按钮 */}
                    <button
                        onClick={onLogout}
                        className="flex items-center bg-red-500 text-white font-medium py-2 px-4 rounded-full shadow-md hover:bg-red-600 transition duration-150 text-sm"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        登出
                    </button>
                </header>

                {/* 浮动通知区域 */}
                {notification && (
                    <div
                        className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl transition-all duration-500 transform ${notification.type === 'success'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}
                        style={{ minWidth: '300px' }}
                    >
                        <div className="flex justify-between items-center">
                            <span>{notification.message}</span>
                            <button onClick={() => setNotification(null)} className="ml-4 text-white opacity-75 hover:opacity-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}


                {/* 内容区域 */}
                <div className="pt-0">{renderContent}</div>
            </main>
        </div>
    );
};

export default HomePage;