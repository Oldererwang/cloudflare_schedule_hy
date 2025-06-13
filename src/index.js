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
  
 // ------------ 省略前面的 Worker / API 代码 ------------

// ↓↓↓ 重新给出已修正的 HTML_CONTENT ↓↓↓
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>日程管理系统</title>
<style>
 /* === 样式同前，此处略 === */
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
      <h2 style="margin-bottom:20px;color:#333">添加新日程</h2>
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
          <textarea id="description" name="description"
                    placeholder="添加详细描述（可选）"></textarea>
        </div>

        <button type="submit" class="btn" id="submitBtn">
          <span id="submitText">添加日程</span>
        </button>
      </form>
    </div>

    <div class="schedule-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="color:#333">我的日程</h2>
        <button class="btn btn-secondary btn-small" onclick="loadSchedules()">🔄 刷新</button>
      </div>
      <div id="scheduleList" class="schedule-list">
        <div class="loading"><p>正在加载日程...</p></div>
      </div>
    </div>
  </div>
</div>

<!-- ========= 前端脚本，所有内部模板反引号全部转义 ========= -->
<script>
let schedules = [];
let editingId = null;
document.addEventListener('DOMContentLoaded', ()=>{initializePage();loadSchedules();});

function initializePage(){
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  document.getElementById('scheduleForm').addEventListener('submit',handleFormSubmit);
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
      description:fd.get('description')
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
function renderScheduleItem(s,overdue){
  const priClass='priority-'+s.priority;
  const priText={high:'高',medium:'中',low:'低'}[s.priority];
  const doneClass=s.completed?'completed':'';
  const border=overdue?'border-left:4px solid #dc3545;':'';
  return (
    '<div class="schedule-item '+doneClass+'" style="'+border+'">\\\n'+
    ' <div class="schedule-header">\\\n'+
    '   <div>\\\n'+
    '     <div class="schedule-title">'+esc(s.title)+'</div>\\\n'+
    '     <div class="schedule-meta">\\\n'+
    '       <span>⏰ '+s.time+'</span>\\\n'+
    '       <span class="priority-badge '+priClass+'">'+priText+'优先级</span>\\\n'+
    (overdue? '       <span style="color:#dc3545;font-weight:600;">⚠️ 已逾期</span>\\\n':'')+
    '     </div>\\\n'+
    '   </div>\\\n'+
    ' </div>\\\n'+
    (s.description?
      ' <div class="schedule-description">'+esc(s.description)+'</div>\\\n':'')+
    ' <div class="schedule-actions">\\\n'+
    '   <button class="btn btn-small '+(s.completed?'btn-secondary':'')+'" onclick="toggleComplete(\\\''+s.id+'\\\')">'+
            (s.completed?'↩️ 取消完成':'✅ 标记完成')+'</button>\\\n'+
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
  editingId=id;
  document.getElementById('submitText').textContent='更新日程';
  document.querySelector('.form-section').scrollIntoView({behavior:'smooth'});
}

// 删除
async function deleteSchedule(id){
  const s=schedules.find(x=>x.id===id); if(!s)return;
  if(!confirm('确定删除“'+s.title+'”吗？'))return;
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
</body></html>`;
