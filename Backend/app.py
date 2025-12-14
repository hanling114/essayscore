import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from uuid import uuid4
from openai import OpenAI
import os
import mysql.connector 
from werkzeug.security import generate_password_hash, check_password_hash
from aip import AipOcr #百度ocr
import math
# --- MySQL 数据库配置 (请根据您的环境修改这些值) ---

MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost') 
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_ROOT_PASSWORD')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'essay_scoring')
try:
    # 客户端初始化，使用环境变量和固定的 DashScope Base URL
    client = OpenAI(
        api_key=os.getenv("DASHSCOPE_API_KEY"),
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )
    LLM_MODEL = "qwen-max" # 使用通义千问系列模型
except Exception as e:
    print(f"OpenAI Client Initialization Failed: {e}")
    client = None 

# JSON 结构定义：指导大模型返回数据格式
LLM_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {
            "type": "integer",
            "description": "作文的评分，必须是 0 到 60 之间的一个整数。"
        },
        "feedback": {
            "type": "object", 
            "description": "结构化反馈，键名必须是'优点'、'不足'、'建议'，值是该类型反馈的列表。",
            "properties": {
                "优点": {
                    "type": "string",
                    "description": "文章的优点，所有内容合并成一个中文段落。"
                },
                "不足": {
                    "type": "string",
                    "description": "文章的不足之处，所有内容合并成一个中文段落。"
                },
                "建议": {
                    "type": "string",
                    "description": "针对文章的修改和改进建议，所有内容合并成一个中文段落。"
                }
            },
            "required": ["优点", "不足", "建议"],
            "additionalProperties": "false"
        },
        "revised_content": {
            "type": "string",
            "description": "经过润色和优化的文章全文。必须返回完整修改后的文章，不包含任何解释性文字。"
        }
    },
    "required": ["score", "feedback", "revised_content"]
}
def get_db_connection():
    """
    建立并返回一个 MySQL 数据库连接对象。
    """
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        # 在生产环境中，这里应该抛出异常或返回错误状态
        return None

def init_db():
    """
    初始化 MySQL 数据库，创建 essays 表。
    """
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            raise Exception("Failed to establish database connection.")
            
        cursor = conn.cursor()
        
        # 使用 MySQL 语法定义表结构
        # feedback 字段使用 JSON 类型存储，MySQL 5.7+ 支持
        #创建 users 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(100) PRIMARY KEY,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS essays (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                topic TEXT NOT NULL,
                title VARCHAR(255),
                original_content LONGTEXT NOT NULL,
                score INTEGER,
                feedback JSON,
                revised_content LONGTEXT,
                timestamp BIGINT,
                FOREIGN KEY (username) REFERENCES users(username)
                ON DELETE CASCADE
            )
        """)
        conn.commit()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

def ai_score_and_refine(topic, content):
    """
    调用阿里云 DashScope API (兼容 OpenAI 模式) 对作文进行评分、结构化反馈和润色。
    """
    if client is None:
        raise Exception("LLM client not initialized. Check DASHSCOPE_API_KEY environment variable.")

    # 构建发送给大模型的 Prompt
    system_prompt = (
        "你是一名专业的中文作文评分和润色专家。你的任务是根据用户提供的作文题目和内容，"
        "进行以下三项操作：1. 评分（满分 60 分）。2. 提供结构化的反馈（优点、不足、建议）。"
        "3. 对原文进行润色和优化，提升其表达和结构。"
        "**【重要格式要求】**"
        "1. **必须**严格按照提供的 JSON 格式输出结果，键名 (Key Names) 必须使用英文：'score', 'feedback', 'revised_content'。"
        "2. **尤其重要：在 'revised_content' 字段中，必须只提供经过修改的纯中文文章内容。**"
        "**严禁在 'revised_content' 中使用任何 Markdown 符号（如 #、*、**、`）、HTML 标签或额外的控制字符（如 \\\\）。**"
        "**请使用自然的中文分段换行，确保输出的文章可以直接供读者阅读和复制。**"
    )
    
    user_prompt = (
        f"请对以下作文进行评分和润色，并严格以 JSON 格式输出结果。\n\n"
        f"作文题目：{topic}\n"
        f"作文内容：\n---\n{content}\n---"
    )

    try:
        # 调用大模型 API，并指定返回格式为 JSON 对象
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object", "schema": LLM_RESPONSE_SCHEMA}
        )
        
        # 解析 JSON 响应
        response_text = response.choices[0].message.content
        result = json.loads(response_text)
        print(result)
        # 提取结果
        score = result['score']
        print(score)
        feedback = [{'type': type_key, 'detail': detail_value} for type_key, detail_value in result['feedback'].items()]
        print(feedback)
        revised_content = result['revised_content']
        #revised_content = result['revised_content'].replace('\n', '<br>')
        print(revised_content)
        return score, feedback, revised_content

    except Exception as e:
        # 记录详细的 API 调用错误并抛出，以便在 Flask 路由中捕获
        print(f"LLM API Call Failed: {e}")
        raise Exception(f"AI评分失败，请检查API Key和网络连接。错误信息: {e}")

# --- Flask 应用配置 ---
app = Flask(__name__)
# 启用 CORS，允许前端（默认运行在不同端口）访问后端
CORS(app) 
init_db()


@app.route('/api/v1/score', methods=['POST'])
def score_essay():
    """
    API 1: 提交作文，进行评分和保存。
    """
    data = request.get_json()
    topic = data.get('topic')
    title = data.get('title', '无标题作文')
    content = data.get('content')
    
    if not topic or not content:
        return jsonify({"error": "缺少作文题目描述或内容"}), 400

    # 1. AI 评分
    try:
        score, feedback, revised_content = ai_score_and_refine(topic, content)
    except Exception as e:
        app.logger.error(f"AI scoring failed: {e}")
        return jsonify({"error": "评分服务调用失败"}), 500

    # 2. 存入数据库
    essay_id = str(uuid4())
    timestamp = int(time.time() * 1000)
    username = data.get('username')
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "数据库连接失败"}), 500

    cursor = conn.cursor()
    try:
        # MySQL 中可以直接存储 JSON 对象，但为了兼容性，我们仍将 Python 列表转为 JSON 字符串
        feedback_json = json.dumps(feedback, ensure_ascii=False)
        
        # 使用 %s 作为 MySQL 的参数占位符
        cursor.execute(
            """
            INSERT INTO essays (id, username, topic, title, original_content, score, feedback, revised_content, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (essay_id, username, topic, title, content, score, feedback_json, revised_content, timestamp)
        )
        conn.commit()
    except mysql.connector.Error as e:
        app.logger.error(f"Database save failed: {e}")
        return jsonify({"error": f"数据保存失败: {e}"}), 500
    finally:
        if conn.is_connected():
            conn.close()

    # 3. 返回结果给前端
    return jsonify({
        "id": essay_id,
        "topic": topic,
        "title": title,
        "originalContent": content,
        "score": score,
        "feedback": feedback, # 返回时仍使用 Python 对象
        "revisedContent": revised_content,
        "timestamp": timestamp
    })

@app.route('/api/v1/history/<username>', methods=['GET'])
def get_history(username):
    """
    API 2: 获取历史作文列表 (侧边栏用)。
    """
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "数据库连接失败"}), 500
        
    cursor = conn.cursor(dictionary=True) # 使用 dictionary=True 让结果以字典形式返回
    
    try:
        # 获取列表所需的字段，按时间倒序
        cursor.execute(
            "SELECT id, title, timestamp FROM essays WHERE username = %s ORDER BY timestamp DESC",
            (username,)
        )
        history_data = cursor.fetchall()
    except mysql.connector.Error as e:
        app.logger.error(f"Database query failed: {e}")
        return jsonify({"error": "历史数据查询失败"}), 500
    finally:
        if conn.is_connected():
            conn.close()
    
    return jsonify(history_data)

@app.route('/api/v1/essay/<essay_id>', methods=['GET'])
def get_essay_detail(essay_id):
    """
    API 3: 根据 ID 获取单篇作文详情 (结果页用)。
    """
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "数据库连接失败"}), 500

    cursor = conn.cursor(dictionary=True) # 使用 dictionary=True 让结果以字典形式返回

    try:
        cursor.execute(
            "SELECT id, topic, title, original_content, score, feedback, revised_content, timestamp FROM essays WHERE id = %s",
            (essay_id,)
        )
        essay = cursor.fetchone()
    except mysql.connector.Error as e:
        app.logger.error(f"Database query failed: {e}")
        return jsonify({"error": "作文详情查询失败"}), 500
    finally:
        if conn.is_connected():
            conn.close()

    if essay:
        # 确保将数据库中的 JSON 字符串反序列化为 Python 对象，以便前端处理
        if essay.get('feedback'):
             try:
                essay['feedback'] = json.loads(essay['feedback'])
             except (json.JSONDecodeError, TypeError):
                 essay['feedback'] = [] # 如果解析失败，返回空列表
        
        # 确保键名与前端使用的 camelCase 保持一致
        response_essay = {
            "id": essay['id'],
            "topic": essay['topic'],
            "title": essay['title'],
            "originalContent": essay['original_content'],
            "score": essay['score'],
            "feedback": essay['feedback'],
            "revisedContent": essay['revised_content'],
            "timestamp": essay['timestamp']
        }
        return jsonify(response_essay)
    
    return jsonify({"error": "作文未找到"}), 404
@app.route('/api/v1/register', methods=['POST'])
def register_user():
    """
    API 4: 用户注册接口。
    """
    data = request.get_json()
    
    # --- 1. 数据验证 ---
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        # 缺少必要字段
        return jsonify({"message": "用户名和密码是必填项"}), 400
    
    # 简单的业务规则验证
    if len(username) < 3 or len(password) < 6:
        return jsonify({"message": "用户名和密码必须满足最低长度要求"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "服务器数据库连接失败"}), 500
        
    cursor = conn.cursor()

    try:
        # --- 2. 检查用户是否已存在 (查重) ---
        # 由于 username 是 PRIMARY KEY，我们可以直接尝试查询
        cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            # HTTP 409 Conflict，前端捕获此信息
            return jsonify({"message": f"用户 '{username}' 已存在，请直接登录。"}), 409

        # --- 3. 密码哈希化 ---
        # 使用 generate_password_hash 安全地哈希密码
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        # --- 4. 插入新用户 ---
        sql = "INSERT INTO users (username, password_hash) VALUES (%s, %s)"
        cursor.execute(sql, (username, hashed_password))
        
        conn.commit()
        
        # --- 5. 注册成功响应 ---
        # 返回 201 Created 状态码，通知前端操作成功
        return jsonify({
            "message": "注册成功",
            "username": username
        }), 201

    except mysql.connector.Error as e:
        app.logger.error(f"Database error during registration: {e}")
        conn.rollback()
        # HTTP 500 Internal Server Error
        return jsonify({"message": "注册过程中发生数据库错误"}), 500
        
    finally:
        # 确保关闭连接
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
@app.route('/api/v1/login', methods=['POST'])
def login_user():
    """
    API 5: 用户登录接口。
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"message": "用户名和密码是必填项"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "服务器数据库连接失败"}), 500
        
    cursor = conn.cursor(dictionary=True) # 使用字典模式方便获取字段名

    try:
        # --- 1. 查询用户及哈希密码 ---
        # 字段名为 password_hash
        cursor.execute("SELECT username, password_hash FROM users WHERE username = %s", (username,))
        user_record = cursor.fetchone()
        
        if user_record is None:
            # 用户名不存在
            # 返回 401 Unauthorized，并给出模糊的错误信息以提高安全性
            return jsonify({"message": "用户名或密码错误。"}), 401

        stored_hash = user_record['password_hash']

        # --- 2. 验证密码 ---
        # 使用 check_password_hash 验证用户输入的密码是否与存储的哈希匹配
        if not check_password_hash(stored_hash, password):
            # 密码不匹配
            return jsonify({"message": "用户名或密码错误。"}), 401

        # --- 3. 登录成功，生成 token ---
        # 简单地使用 UUID 作为模拟的 access_token
        access_token = str(uuid4())
        
        # **注意：在生产环境，这里应该使用 JWT (Flask-JWT-Extended) 来生成和管理 token。**

        # --- 4. 返回成功响应 ---
        return jsonify({
            "access_token": access_token,
            # 前端期望 user 对象，这里只返回 username
            "user": {
                "username": user_record['username'] 
            },
            "message": "登录成功"
        }), 200

    except mysql.connector.Error as e:
        app.logger.error(f"Database error during login: {e}")
        return jsonify({"message": "登录过程中发生数据库错误"}), 500
        
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


# 配置允许的文本和图片扩展名
ALLOWED_TEXT_EXTENSIONS = {'txt'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
def allowed_file(filename, extensions):
    """检查文件扩展名是否在允许列表中"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in extensions

def classify_left_baselines_by_index(left_coords, tolerance):
    """
    尝试从 left 坐标中找出两个主要的基线 (标准左边缘和缩进左边缘)。
    
    Args:
        left_coords: 所有识别块的 left 坐标列表。
        tolerance: 允许坐标值接近的像素容忍度。
        
    Returns:
        Tuple[List[int], List[int]]: (standard_indices, indent_indices) - 
                                     分别包含属于第一类和第二类的行索引列表。
    """
    if not left_coords:
        return [], []
    clusters = [[0], []]
    current_cluster = 0
    min_lefts  = [left_coords[0],9999999999]
    #根据这行与上一行之间的left距离来分类，left距离接近，则这行与上一行为同一类,反之为另一类
    for i in range(1, len(left_coords)):
        current_coord = left_coords[i]
        baseline_coord = left_coords[i-1]
        if abs(current_coord - baseline_coord) <= tolerance:#判断这行与上行的left距离是否接近
            clusters[current_cluster].append(i)
            min_lefts [current_cluster] = min(min_lefts[current_cluster],left_coords[i])
        else:
            current_cluster = 1 - current_cluster  # 在 0 和 1 之间切换
            clusters[current_cluster].append(i)
            min_lefts[current_cluster] = min(min_lefts[current_cluster],left_coords[i])
    if min_lefts[0] > min_lefts[1]:
        return clusters[0]
    else: return clusters[1]
def recognize_handwriting_text(file):
    APP_ID = '121329277'
    API_KEY = os.getenv('OCR_API_KEY')
    SECRET_KEY = os.getenv('OCR_SECRET_KEY')
    client = AipOcr(APP_ID, API_KEY, SECRET_KEY)
    image=file.read()
    options={}
    options["detect_direction"] = "true"
    # 调用 API
    try:
        res_image = client.handwriting(image, options)
    except Exception as e:
        # 错误处理，例如网络错误或认证失败
        print(f"Baidu OCR API call failed: {e}")
        return f"OCR API 调用失败: {e}"

    if 'error_code' in res_image:
        error_msg = res_image.get('error_msg', '未知错误')
        error_code = res_image['error_code']
        print(f"Baidu OCR API Error {error_code}: {error_msg}")
        return f"OCR 识别失败: {error_msg} (代码: {error_code})"

    words_results = res_image.get("words_result", [])
    print(words_results)
    if not words_results:
        return "" # 图片中没有识别到任何文字

     # 2. 识别作文的不同自然段
    structured_lines = []
    all_heights = []
    all_lefts = []
    for item in words_results:
        if 'location' in item and 'words' in item:
            left = item['location']['left']
            height = item['location']['height']
            top = item['location']['top']
            structured_lines.append({
                'words': item['words'],
                'top': top,
                'left': left,
                'height': height
            })
            all_heights.append(height)
            all_lefts.append(left)
    # 平均行高 (H_avg)
    H_avg = sum(all_heights) / len(all_heights)
    # T_indent: 最小有效缩进距离，定义为平均行高的 1.5 倍
    indent_idx = classify_left_baselines_by_index(all_lefts, 1.5*H_avg)
    indent_idx_set = set(indent_idx)
    is_indentation_present = len(indent_idx) > 0
    reconstructed_essay = []
    for idx, current_line in enumerate(structured_lines):
        words = current_line['words']
        print(words)
        prefix = ""
        if is_indentation_present and idx in indent_idx_set:
            prefix = "\n\u3000\u3000"  # 中文段首缩进
        reconstructed_essay.append(prefix + words)
    return "".join(reconstructed_essay)
@app.route('/api/v1/ocr', methods=['POST'])
def ocr_handler():
    """
    处理文件上传，根据文件类型返回文本内容或 OCR 占位符。
    """
    file = request.files.get('file')
    filename = file.filename

    if allowed_file(filename, ALLOWED_TEXT_EXTENSIONS):
        # --- 文本文件处理 (.txt) ---
        try:
            # 读取文件内容 (假设文件编码为 UTF-8)
            text_content = file.read().decode('utf-8')
            
            print(f"File {filename} content read successfully.")
            print(text_content)
            return jsonify({
                'status': 'success',
                'content': text_content
            })
        except UnicodeDecodeError:
            return jsonify({'error': 'Could not decode text file (try UTF-8 encoding)'}), 422
        except Exception as e:
            return jsonify({'error': f'Failed to read text file: {e}'}), 500

    elif allowed_file(filename, ALLOWED_IMAGE_EXTENSIONS):
        # --- 图片文件处理---
        image_content = recognize_handwriting_text(file)
        return jsonify({
            'status': 'success',
            'content': image_content,
        })

    else:
        # --- 不支持的文件类型 ---
        unsupported_extensions = ALLOWED_TEXT_EXTENSIONS.union(ALLOWED_IMAGE_EXTENSIONS)
        return jsonify({
            'error': f"Unsupported file format. Please upload .txt or image files ({', '.join(unsupported_extensions)})."
        }), 415


if __name__ == '__main__':
    # 注意：默认运行在 http://127.0.0.1:5000/
    # 在生产环境中，请不要使用 debug=True
    app.run(debug=True, port=5000)