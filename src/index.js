// 日程管理系统主入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由处理
    if (path === '/' || path === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    if (path === '/api/schedules') {
      return handleSchedules(request, env);
    }

    if (path.startsWith('/api/schedules/')) {
      const id = path.split('/')[3];
      return handleScheduleById(request, env, id);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// 处理日程列表API
async function handleSchedules(request, env) {
  const method = request.method;

  try {
    switch (method) {
      case 'GET':
        return await getSchedules(env);
      case 'POST':
        return await createSchedule(request, env);
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理单个日程API
async function handleScheduleById(request, env, id) {
  const method = request.method;

  try {
    switch (method) {
      case 'PUT':
        return await updateSchedule(request, env, id);
      case 'DELETE':
        return await deleteSchedule(env, id);
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取所有日程
async function getSchedules(env) {
  const schedules = await env.SCHEDULE_KV.get('schedules');
  const data = schedules ? JSON.parse(schedules) : [];
  
  return new Response(JSON.stringify(data), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 创建新日程
async function createSchedule(request, env) {
  const body = await request.json();
  const { title, description, date, time, priority = 'medium' } = body;

  // 验证必需字段
  if (!title || !date || !time) {
    return new Response(JSON.stringify({ 
      error: '标题、日期和时间为必填项' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 生成唯一ID
  const id = crypto.randomUUID();
  const schedule = {
    id,
    title,
    description: description || '',
    date,
    time,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 获取现有日程并添加新日程
  const existing = await env.SCHEDULE_KV.get('schedules');
  const schedules = existing ? JSON.parse(existing) : [];
  schedules.push(schedule);

  // 按日期时间排序
  schedules.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  await env.SCHEDULE_KV.put('schedules', JSON.stringify(schedules));

  return new Response(JSON.stringify(schedule), {
    status: 201,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 更新日程
async function updateSchedule(request, env, id) {
  const body = await request.json();
  const existing = await env.SCHEDULE_KV.get('schedules');
  const schedules = existing ? JSON.parse(existing) : [];

  const index = schedules.findIndex(s => s.id === id);
  if (index === -1) {
    return new Response(JSON.stringify({ error: '日程不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 更新日程
  schedules[index] = {
    ...schedules[index],
    ...body,
    updatedAt: new Date().toISOString()
  };

  // 重新排序
  schedules.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  await env.SCHEDULE_KV.put('schedules', JSON.stringify(schedules));

  return new Response(JSON.stringify(schedules[index]), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 删除日程
async function deleteSchedule(env, id) {
  const existing = await env.SCHEDULE_KV.get('schedules');
  const schedules = existing ? JSON.parse(existing) : [];

  const filteredSchedules = schedules.filter(s => s.id !== id);
  
  if (filteredSchedules.length === schedules.length) {
    return new Response(JSON.stringify({ error: '日程不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.SCHEDULE_KV.put('schedules', JSON.stringify(filteredSchedules));

  return new Response(JSON.stringify({ message: '删除成功' }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 完整的HTML前端界面
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>日程管理系统</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        .main-content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 0;
            min-height: 600px;
        }

        .form-section {
            background: #f8f9fa;
            padding: 30px;
            border-right: 1px solid #e9ecef;
        }

        .schedule-section {
            padding: 30px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
        }

        .form-group textarea {
            height: 80px;
            resize: vertical;
        }

        .btn {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(79, 172, 254, 0.3);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn-secondary {
            background: #6c757d;
        }

        .btn-danger {
            background: #dc3545;
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 14px;
            width: auto;
            margin: 0 4px;
        }

        .schedule-list {
            max-height: 500px;
            overflow-y: auto;
        }

        .schedule-item {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            position: relative;
        }

        .schedule-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .schedule-item.completed {
            opacity: 0.7;
            background: #f8f9fa;
        }

        .schedule-item.completed .schedule-title {
            text-decoration: line-through;
        }

        .schedule-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .schedule-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }

        .schedule-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            font-size: 14px;
            color: #666;
        }

        .schedule-description {
            color: #666;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .schedule-actions {
            display: flex;
            gap: 8px;
        }

        .priority-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .priority-high {
            background: #fee;
            color: #d63384;
        }

        .priority-medium {
            background: #fff3cd;
            color: #f57c00;
        }

        .priority-low {
            background: #d1ecf1;
            color: #0c5460;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .empty-state h3 {
            margin-bottom: 10px;
            font-size: 1.5rem;
        }

        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .form-section {
                border-right: none;
                border-bottom: 1px solid #e9ecef;
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 日程管理系统</h1>
            <p>高效管理您的时间，让每一天都充实有序</p>
        </div>
        
        <div class="main-content">
            <div class="form-section">
                <h2 style="margin-bottom: 20px; color: #333;">添加新日程</h2>
                <form id="scheduleForm">
                    <div class="form-group">
                        <label for="title">标题 *</label>
                        <input type="text" id="title" name="title" required placeholder="输入日程标题">
                    </div>
                    
                    <div class="form-group">
                        <label for="date">日期 *</label>
                        <input type="date" id="date" name="date" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="time">时间 *</label>
                        <input type="time" id="time" name="time" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="priority">优先级</label>
                        <select id="priority" name="priority">
                            <option value="low">低</option>
                            <option value="medium" selected>中</option>
                            <option value="high">高</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">描述</label>
                        <textarea id="description" name="description" placeholder="添加详细描述（可选）"></textarea>
                    </div>
                    
                    <button type="submit" class="btn" id="submitBtn">
                        <span id="submitText">添加日程</span>
                    </button>
                </form>
            </div>
            
            <div class="schedule-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #333;">我的日程</h2>
                    <button class="btn btn-secondary btn-small" onclick="loadSchedules()">🔄 刷新</button>
                </div>
                
                <div id="scheduleList" class="schedule-list">
                    <div class="loading">
                        <p>正在加载日程...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 日程管理JavaScript代码
        let schedules = [];
        let editingId = null;

        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', function() {
            initializePage();
            loadSchedules();
        });

        // 初始化页面
        function initializePage() {
            // 设置默认日期为今天
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            
            // 绑定表单提交事件
            document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);
        }

        // 处理表单提交
        async function handleFormSubmit(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const submitText = document.getElementById('submitText');
            const originalText = submitText.textContent;
            
            // 显示加载状态
            submitBtn.disabled = true;
            submitText.textContent = editingId ? '更新中...' : '添加中...';
            
            try {
                const formData = new FormData(e.target);
                const scheduleData = {
                    title: formData.get('title'),
                    date: formData.get('date'),
                    time: formData.get('time'),
                    priority: formData.get('priority'),
                    description: formData.get('description')
                };

                let response;
                if (editingId) {
                    // 更新现有日程
                    response = await fetch(\`/api/schedules/\${editingId}\`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(scheduleData)
                    });
                } else {
                    // 创建新日程
                    response = await fetch('/api/schedules', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(scheduleData)
                    });
                }

                if (response.ok) {
                    // 重置表单
                    e.target.reset();
                    document.getElementById('date').value = new Date().toISOString().split('T')[0];
                    editingId = null;
                    submitText.textContent = '添加日程';
                    
                    // 重新加载日程列表
                    await loadSchedules();
                } else {
                    const error = await response.json();
                    alert('操作失败: ' + error.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('网络错误，请重试');
            } finally {
                submitBtn.disabled = false;
                if (!editingId) {
                    submitText.textContent = originalText;
                }
            }
        }

        // 加载日程列表
        async function loadSchedules() {
            try {
                const response = await fetch('/api/schedules');
                schedules = await response.json();
                renderSchedules();
            } catch (error) {
                console.error('Error loading schedules:', error);
                document.getElementById('scheduleList').innerHTML = 
                    '<div class="loading"><p>加载失败，请刷新重试</p></div>';
            }
        }
        // 渲染日程列表
        function renderSchedules() {
            const container = document.getElementById('scheduleList');
            
            if (schedules.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>📝 暂无日程</h3>
                        <p>添加您的第一个日程安排吧！</p>
                    </div>
                `;
                return;
            }

            const now = new Date();
            const today = now.toISOString().split('T')[0];
            
            // 按日期分组并排序
            const groupedSchedules = groupSchedulesByDate(schedules);
            
            let html = '';
            for (const [date, dateSchedules] of Object.entries(groupedSchedules)) {
                const isToday = date === today;
                const isPast = date < today;
                
                html += `
                    <div class="date-group">
                        <h3 style="color: #666; margin: 20px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e9ecef;">
                            ${formatDateHeader(date, isToday, isPast)}
                        </h3>
                `;
                
                dateSchedules.forEach(schedule => {
                    const isOverdue = isPast && !schedule.completed;
                    html += renderScheduleItem(schedule, isOverdue);
                });
                
                html += '</div>';
            }
            
            container.innerHTML = html;
        }

        // 按日期分组日程
        function groupSchedulesByDate(schedules) {
            const grouped = {};
            schedules.forEach(schedule => {
                const date = schedule.date;
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(schedule);
            });
            
            // 对每个日期的日程按时间排序
            Object.keys(grouped).forEach(date => {
                grouped[date].sort((a, b) => a.time.localeCompare(b.time));
            });
            
            return grouped;
        }

        // 格式化日期标题
        function formatDateHeader(date, isToday, isPast) {
            const dateObj = new Date(date + 'T00:00:00');
            const options = { month: 'long', day: 'numeric', weekday: 'long' };
            const formatted = dateObj.toLocaleDateString('zh-CN', options);
            
            if (isToday) {
                return `🌟 今天 - ${formatted}`;
            } else if (isPast) {
                return `⏰ ${formatted} (已过期)`;
            } else {
                return `📅 ${formatted}`;
            }
        }

        // 渲染单个日程项
        function renderScheduleItem(schedule, isOverdue) {
            const priorityClass = `priority-${schedule.priority}`;
            const priorityText = {
                'high': '高',
                'medium': '中', 
                'low': '低'
            }[schedule.priority];
            
            const completedClass = schedule.completed ? 'completed' : '';
            const overdueStyle = isOverdue ? 'border-left: 4px solid #dc3545;' : '';
            
            return `
                <div class="schedule-item ${completedClass}" style="${overdueStyle}">
                    <div class="schedule-header">
                        <div>
                            <div class="schedule-title">${escapeHtml(schedule.title)}</div>
                            <div class="schedule-meta">
                                <span>⏰ ${schedule.time}</span>
                                <span class="priority-badge ${priorityClass}">
                                    ${priorityText}优先级
                                </span>
                                ${isOverdue ? '<span style="color: #dc3545; font-weight: 600;">⚠️ 已逾期</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${schedule.description ? `
                        <div class="schedule-description">
                            ${escapeHtml(schedule.description)}
                        </div>
                    ` : ''}
                    
                    <div class="schedule-actions">
                        <button class="btn btn-small ${schedule.completed ? 'btn-secondary' : ''}" 
                                onclick="toggleComplete('${schedule.id}')">
                            ${schedule.completed ? '↩️ 取消完成' : '✅ 标记完成'}
                        </button>
                        <button class="btn btn-secondary btn-small" 
                                onclick="editSchedule('${schedule.id}')">
                            ✏️ 编辑
                        </button>
                        <button class="btn btn-danger btn-small" 
                                onclick="deleteSchedule('${schedule.id}')">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }

        // HTML转义函数
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 切换完成状态
        async function toggleComplete(id) {
            const schedule = schedules.find(s => s.id === id);
            if (!schedule) return;

            try {
                const response = await fetch(`/api/schedules/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...schedule,
                        completed: !schedule.completed
                    })
                });

                if (response.ok) {
                    await loadSchedules();
                } else {
                    const error = await response.json();
                    alert('操作失败: ' + error.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('网络错误，请重试');
            }
        }

        // 编辑日程
        function editSchedule(id) {
            const schedule = schedules.find(s => s.id === id);
            if (!schedule) return;

            // 填充表单
            document.getElementById('title').value = schedule.title;
            document.getElementById('date').value = schedule.date;
            document.getElementById('time').value = schedule.time;
            document.getElementById('priority').value = schedule.priority;
            document.getElementById('description').value = schedule.description || '';

            // 更新按钮状态
            editingId = id;
            document.getElementById('submitText').textContent = '更新日程';
            
            // 滚动到表单顶部
            document.querySelector('.form-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }

        // 删除日程
        async function deleteSchedule(id) {
            const schedule = schedules.find(s => s.id === id);
            if (!schedule) return;

            if (!confirm(`确定要删除日程"${schedule.title}"吗？`)) {
                return;
            }

            try {
                const response = await fetch(`/api/schedules/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await loadSchedules();
                } else {
                    const error = await response.json();
                    alert('删除失败: ' + error.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('网络错误，请重试');
            }
        }

        // 取消编辑
        function cancelEdit() {
            editingId = null;
            document.getElementById('scheduleForm').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            document.getElementById('submitText').textContent = '添加日程';
        }

        // 键盘快捷键支持
        document.addEventListener('keydown', function(e) {
            // Escape键取消编辑
            if (e.key === 'Escape' && editingId) {
                cancelEdit();
            }
            
            // Ctrl+R刷新日程列表
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                loadSchedules();
            }
        });

        // 自动刷新 (每30秒)
        setInterval(loadSchedules, 30000);
    </script>
</body>
</html>
`;
