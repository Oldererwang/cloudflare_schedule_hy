// 日程管理系统主入口
export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
  
      // 添加CORS预检处理
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      }
  
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
  
      if (path === '/api/notify') {
        return handleNotification(request, env);
      }
  
      return new Response('Not Found', { status: 404 });
    }
  };
  
  // API处理函数保持不变
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
  
  async function createSchedule(request, env) {
    const body = await request.json();
    const { title, description, date, time, priority = 'medium' } = body;
  
    if (!title || !date || !time) {
      return new Response(JSON.stringify({ 
        error: '标题、日期和时间为必填项' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  
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
  
    const existing = await env.SCHEDULE_KV.get('schedules');
    const schedules = existing ? JSON.parse(existing) : [];
    schedules.push(schedule);
  
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
  
    schedules[index] = {
      ...schedules[index],
      ...body,
      updatedAt: new Date().toISOString()
    };
  
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
  
  // 添加通知处理函数
  async function handleNotification(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    
    try {
      const body = await request.json();
      const { apiKey, scheduleId } = body;
      
      if (!apiKey || !scheduleId) {
        return new Response(JSON.stringify({ 
          error: 'API Key和日程ID为必填项' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const schedules = await getSchedulesData(env);
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) {
        return new Response(JSON.stringify({ 
          error: '日程不存在' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 构造通知数据
      const notificationData = {
        title: `日程提醒: ${schedule.title}`,
        content: schedule.description || '您的日程时间已到',
        description: `时间: ${schedule.date} ${schedule.time}, 优先级: ${getPriorityText(schedule.priority)}`
      };
      
      // 发送通知
      const notifyResponse = await fetch(`https://www.notifyx.cn/api/v1/send/${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      
      if (!notifyResponse.ok) {
        const errorText = await notifyResponse.text();
        return new Response(JSON.stringify({ 
          error: `通知发送失败: ${errorText}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 更新日程的通知状态
      schedule.notified = true;
      await updateScheduleData(schedule, env);
      
      return new Response(JSON.stringify({ 
        message: '通知发送成功' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: `处理通知请求失败: ${error.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 辅助函数 - 获取优先级文本
  function getPriorityText(priority) {
    const map = {high: '高', medium: '中', low: '低'};
    return map[priority] || '中';
  }
  
  // 辅助函数 - 获取日程数据
  async function getSchedulesData(env) {
    const schedules = await env.SCHEDULE_KV.get('schedules');
    return schedules ? JSON.parse(schedules) : [];
  }
  
  // 辅助函数 - 更新单个日程
  async function updateScheduleData(updatedSchedule, env) {
    const schedules = await getSchedulesData(env);
    const index = schedules.findIndex(s => s.id === updatedSchedule.id);
    
    if (index === -1) return false;
    
    schedules[index] = {
      ...schedules[index],
      ...updatedSchedule,
      updatedAt: new Date().toISOString()
    };
    
    await env.SCHEDULE_KV.put('schedules', JSON.stringify(schedules));
    return true;
  }
  
 // ------------ 省略前面的 Worker / API 代码 ------------

// ↓↓↓ 重新给出已修正的 HTML_CONTENT ↓↓↓
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>日程管理系统</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f7f9fc;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 15px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px 0;
  background: linear-gradient(120deg, #3a7bd5, #00d2ff);
  color: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 25px;
}

@media (max-width: 992px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

.form-section {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 20px;
  align-self: start;
}

.form-section h2 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #3a7bd5;
  border-bottom: 2px solid #e6f0ff;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e1e5eb;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input:focus, select:focus, textarea:focus {
  border-color: #3a7bd5;
  box-shadow: 0 0 0 3px rgba(58, 123, 213, 0.15);
  outline: none;
}

textarea {
  height: 100px;
  resize: vertical;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  background-color: #3a7bd5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  text-align: center;
}

.btn:hover {
  background-color: #2a6ac5;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

#submitBtn {
  width: 100%;
  margin-top: 10px;
}

.schedule-section {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.schedule-section h2 {
  font-size: 1.5rem;
  color: #3a7bd5;
  border-bottom: 2px solid #e6f0ff;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.date-group {
  margin-bottom: 25px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.date-group h3 {
  margin: 15px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  color: #3a7bd5;
  font-size: 1.2rem;
}

.schedule-list {
  margin-top: 20px;
}

.schedule-item {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #3a7bd5;
  transition: all 0.3s ease;
}

.schedule-item:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
}

.schedule-item.completed {
  border-left-color: #28a745;
  background-color: #f8fff9;
  opacity: 0.85;
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
  margin-bottom: 8px;
  color: #444;
}

.completed .schedule-title {
  text-decoration: line-through;
  color: #6c757d;
}

.schedule-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 0.9rem;
}

.schedule-meta span {
  display: inline-flex;
  align-items: center;
  color: #6c757d;
}

.priority-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-high {
  background-color: #fff2f0;
  color: #dc3545 !important;
}

.priority-medium {
  background-color: #fff8e6;
  color: #fd7e14 !important;
}

.priority-low {
  background-color: #e8f5e9;
  color: #28a745 !important;
}

.schedule-description {
  margin: 15px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 0.95rem;
  color: #666;
  white-space: pre-line;
}

.schedule-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.empty-state {
  text-align: center;
  padding: 50px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: #3a7bd5;
}

.loading {
  text-align: center;
  padding: 30px;
  color: #6c757d;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .header {
    padding: 20px 0;
  }
  
  .header h1 {
    font-size: 1.8rem;
  }
  
  .form-section, .schedule-section {
    padding: 20px;
  }
  
  .schedule-actions {
    flex-direction: column;
  }
  
  .schedule-actions button {
    width: 100%;
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
      <h2>添加新日程</h2>
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

        <div class="form-group">
          <label class="checkbox-container">
            <input type="checkbox" id="enableNotification" name="enableNotification" checked>
            <span class="checkmark"></span>
            启用到期提醒
          </label>
        </div>

        <button type="submit" class="btn" id="submitBtn">
          <span id="submitText">添加日程</span>
        </button>
      </form>
    </div>

    <div class="schedule-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2>我的日程</h2>
        <button class="btn btn-secondary btn-small" onclick="loadSchedules()">🔄 刷新</button>
      </div>
      <div id="scheduleList" class="schedule-list">
        <div class="loading"><p>正在加载日程...</p></div>
      </div>
    </div>
  </div>

  <div id="notificationSettings" class="notification-settings">
    <h3>通知设置</h3>
    <div class="form-group">
      <label for="notificationApiKey">API Key</label>
      <input type="text" id="notificationApiKey" placeholder="输入您的 NotifyX API Key">
      <p class="help-text">通知将使用 NotifyX 服务发送，请输入您的 API Key</p>
    </div>
    <button class="btn btn-secondary" onclick="saveNotificationSettings()">保存设置</button>
  </div>
</div>

<!-- ========= 前端脚本，所有内部模板反引号全部转义 ========= -->
<script>
let schedules = [];
let editingId = null;
document.addEventListener('DOMContentLoaded', ()=>{
  initializePage();
  loadSchedules();
  initNotificationCheck();
});

function initializePage(){
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  document.getElementById('scheduleForm').addEventListener('submit',handleFormSubmit);
  
  // 加载通知设置
  const apiKey = localStorage.getItem('notificationApiKey');
  if (apiKey) {
    document.getElementById('notificationApiKey').value = apiKey;
  }
}

// 初始化通知检查
function initNotificationCheck() {
  // 每分钟检查一次是否有需要通知的日程
  setInterval(checkScheduleNotifications, 60000);
  // 页面加载时立即检查一次
  checkScheduleNotifications();
}

// 检查日程通知
async function checkScheduleNotifications() {
  const apiKey = localStorage.getItem('notificationApiKey');
  if (!apiKey) return; // 没有设置API Key，不发送通知
  
  if (!schedules || !schedules.length) return;
  
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 检查所有今天的未完成日程
  schedules.forEach(schedule => {
    if (schedule.completed) return; // 已完成的不通知
    if (schedule.notified) return; // 已通知的不重复通知
    
    if (schedule.date === currentDate) {
      const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
      
      // 如果时间相同或刚过（5分钟内），发送通知
      const timeDiffMinutes = (currentHour - scheduleHour) * 60 + (currentMinute - scheduleMinute);
      if (timeDiffMinutes >= 0 && timeDiffMinutes <= 5) {
        sendNotification(schedule);
        // 标记为已通知，避免重复通知
        markScheduleNotified(schedule.id);
      }
    }
  });
}

// 标记日程已通知
async function markScheduleNotified(id) {
  try {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    
    schedule.notified = true;
    
    await fetch(\`/api/schedules/\${id}\`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ notified: true })
    });
  } catch (err) {
    console.error('标记通知状态失败:', err);
  }
}

// 修改发送通知的函数
async function sendNotification(schedule) {
  const apiKey = localStorage.getItem('notificationApiKey');
  if (!apiKey || !schedule.enableNotification) return;
  
  try {
    // 使用服务端API发送通知
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        apiKey: apiKey,
        scheduleId: schedule.id
      })
    });
    
    if (response.ok) {
      console.log('通知发送成功:', schedule.title);
      // 更新本地状态
      const index = schedules.findIndex(s => s.id === schedule.id);
      if (index !== -1) {
        schedules[index].notified = true;
      }
    } else {
      const errorData = await response.json();
      console.error('通知发送失败:', errorData.error);
    }
  } catch (err) {
    console.error('通知发送异常:', err);
  }
}

// 手动发送通知
async function manualSendNotification(id) {
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return;
  
  await sendNotification(schedule);
  alert('通知已发送');
}

function getPriorityText(priority) {
  const map = {high: '高', medium: '中', low: '低'};
  return map[priority] || '中';
}

// 保存通知设置
function saveNotificationSettings() {
  const apiKey = document.getElementById('notificationApiKey').value.trim();
  if (apiKey) {
    localStorage.setItem('notificationApiKey', apiKey);
    alert('通知设置已保存');
  } else {
    localStorage.removeItem('notificationApiKey');
    alert('通知已禁用');
  }
}

// 表单提交（新增 / 更新）
async function handleFormSubmit(e){
  e.preventDefault();
  const btn=document.getElementById('submitBtn');
  const txt=document.getElementById('submitText');
  const origin=txt.textContent;
  btn.disabled=true;
  txt.textContent=editingId?'更新中...':'添加中...';

  try{
    const fd=new FormData(e.target);
    const data={
      title:fd.get('title'),
      date:fd.get('date'),
      time:fd.get('time'),
      priority:fd.get('priority'),
      description:fd.get('description'),
      enableNotification: !!document.getElementById('enableNotification').checked,
      notified: false // 初始状态为未通知
    };
    const url=editingId? \`/api/schedules/\${editingId}\` : '/api/schedules';
    const method=editingId?'PUT':'POST';

    const resp=await fetch(url,{method,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)});
    if(!resp.ok){alert('操作失败:'+ (await resp.text()));return;}
    // 成功
    e.target.reset();
    document.getElementById('date').value=new Date().toISOString().split('T')[0];
    document.getElementById('enableNotification').checked = true;
    editingId=null;
    txt.textContent='添加日程';
    await loadSchedules();
  }catch(err){console.error(err);alert('网络错误');}
  finally{btn.disabled=false;txt.textContent=origin;}
}

// 加载日程
async function loadSchedules(){
  try{
    const res=await fetch('/api/schedules');
    schedules=await res.json();
    renderSchedules();
  }catch(e){
    console.error(e);
    document.getElementById('scheduleList').innerHTML=
      '<div class="loading"><p>加载失败，请刷新重试</p></div>';
  }
}

// 渲染
function renderSchedules(){
  const box=document.getElementById('scheduleList');
  if(!schedules.length){
    box.innerHTML=
      '<div class="empty-state">\\\n' +
      '  <h3>📝 暂无日程</h3>\\\n' +
      '  <p>添加您的第一个日程安排吧！</p>\\\n' +
      '</div>';
    return;
  }
  const today=(new Date()).toISOString().split('T')[0];
  const grouped={};
  schedules.forEach(s=>{(grouped[s.date]=grouped[s.date]||[]).push(s);});
  Object.keys(grouped).forEach(d=>grouped[d].sort((a,b)=>a.time.localeCompare(b.time)));

  let html='';
  for(const date of Object.keys(grouped).sort()){
    const isToday=date===today;
    const isPast=date<today;
    html+=
      '<div class="date-group">\\\n'+
      '  <h3>'+ formatDateHeader(date,isToday,isPast) +'</h3>\\\n';

    grouped[date].forEach(s=>{
      html+= renderScheduleItem(s, isPast && !s.completed);
    });
    html+='</div>';
  }
  box.innerHTML=html;
}

// 日期标题
function formatDateHeader(date,isToday,isPast){
  const opts={month:'long',day:'numeric',weekday:'long'};
  const text=new Date(date+'T00:00:00').toLocaleDateString('zh-CN',opts);
  if(isToday) return '🌟 今天 - '+text;
  if(isPast)  return '⏰ '+text+' (已过期)';
  return '📅 '+text;
}

// 单条
function renderScheduleItem(s, overdue){
  const priClass='priority-'+s.priority;
  const priText={high:'高',medium:'中',low:'低'}[s.priority];
  const doneClass=s.completed?'completed':'';
  const border=overdue?'border-left:4px solid #dc3545;':'';
  
  const notifyButton = s.enableNotification && !s.notified && !s.completed ? 
    '<button class="btn btn-secondary btn-small tooltip" data-tooltip="立即发送通知" onclick="manualSendNotification(\\\''+s.id+'\\\')">🔔 提醒</button>\\\n' : '';
    
  return (
    '<div class="schedule-item '+doneClass+'" style="'+border+'">\\\n'+
    ' <div class="schedule-header">\\\n'+
    '   <div>\\\n'+
    '     <div class="schedule-title">'+esc(s.title)+'</div>\\\n'+
    '     <div class="schedule-meta">\\\n'+
    '       <span>⏰ '+s.time+'</span>\\\n'+
    '       <span class="priority-badge '+priClass+'">'+priText+'优先级</span>\\\n'+
    (overdue? '       <span style="color:#dc3545;font-weight:600;">⚠️ 已逾期</span>\\\n':'')+
    (s.notified? '    <span class="notification-badge">🔔 已通知</span>\\\n':'')+
    '     </div>\\\n'+
    '   </div>\\\n'+
    ' </div>\\\n'+
    (s.description?
      ' <div class="schedule-description">'+esc(s.description)+'</div>\\\n':'')+
    ' <div class="schedule-actions">\\\n'+
    '   <button class="btn btn-small '+(s.completed?'btn-secondary':'')+'" onclick="toggleComplete(\\\''+s.id+'\\\')">'+
            (s.completed?'↩️ 取消完成':'✅ 标记完成')+'</button>\\\n'+
    notifyButton+
    '   <button class="btn btn-secondary btn-small" onclick="editSchedule(\\\''+s.id+'\\\')">✏️ 编辑</button>\\\n'+
    '   <button class="btn btn-danger btn-small" onclick="deleteSchedule(\\\''+s.id+'\\\')">🗑️ 删除</button>\\\n'+
    ' </div>\\\n'+
    '</div>'
  );
}

// HTML 转义
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}

// 切换完成
async function toggleComplete(id){
  const s=schedules.find(x=>x.id===id); if(!s)return;
  await fetch('/api/schedules/'+id,{method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...s,completed:!s.completed})});
  loadSchedules();
}

// 编辑
function editSchedule(id){
  const s=schedules.find(x=>x.id===id); if(!s)return;
  document.getElementById('title').value=s.title;
  document.getElementById('date').value=s.date;
  document.getElementById('time').value=s.time;
  document.getElementById('priority').value=s.priority;
  document.getElementById('description').value=s.description||'';
  document.getElementById('enableNotification').checked = s.enableNotification !== false;
  editingId=id;
  document.getElementById('submitText').textContent='更新日程';
  document.querySelector('.form-section').scrollIntoView({behavior:'smooth'});
}

// 删除
async function deleteSchedule(id){
  const s=schedules.find(x=>x.id===id); if(!s)return;
  if(!confirm('确定删除"'+s.title+'"吗？'))return;
  await fetch('/api/schedules/'+id,{method:'DELETE'});
  loadSchedules();
}

// 取消编辑 (ESC)
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&editingId){editingId=null;document.getElementById('scheduleForm').reset();
    document.getElementById('submitText').textContent='添加日程';}
  if(e.ctrlKey&&e.key==='r'){e.preventDefault();loadSchedules();}
});

// 自动刷新
setInterval(loadSchedules,30000);
</script>
<style>
/* 额外添加的样式 */
.notification-settings {
  margin-top: 30px;
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.notification-settings h3 {
  font-size: 1.3rem;
  margin-bottom: 20px;
  color: #3a7bd5;
  border-bottom: 2px solid #e6f0ff;
  padding-bottom: 10px;
}

.help-text {
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 5px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-container input {
  width: auto;
  margin-right: 8px;
}

/* 确保复选框保持正常大小 */
input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.notification-badge {
  background-color: #e3f2fd;
  color: #0d6efd !important;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tooltip {
  position: relative;
}

.tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 10;
}
</style>
</body></html>`;
