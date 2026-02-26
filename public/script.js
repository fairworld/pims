let currentTodos = []; let currentFolders = []; let activeFolder = '오늘 할 일';
let calCurrentDate = new Date(); let selectedDateStr = '';
let draggedItemId = null;
const guideLabel = document.getElementById('drag-guide-label');

window.onload = () => {
    if (localStorage.getItem('toodledo_token')) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('todo-section').classList.remove('hidden');
        renderCalendar(); loadData();
    }
};

async function login(isOtpStep = false) {
    const res = await fetch('/api/login', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            otpToken: isOtpStep ? document.getElementById('otpTokenInput').value : null
        })
    });
    const data = await res.json();
    if (data.requireOtp) {
        document.getElementById('login-step-1').classList.add('hidden');
        document.getElementById('login-step-2').classList.remove('hidden');
    } else if (data.success) {
        localStorage.setItem('toodledo_token', 'ok');
        location.reload();
    } else alert("실패");
}

function logout() { localStorage.removeItem('toodledo_token'); location.reload(); }

async function loadData() {
    const [tRes, fRes] = await Promise.all([fetch('/api/todos'), fetch('/api/folders')]);
    currentTodos = await tRes.json();
    currentFolders = await fRes.json();
    renderFolders(); renderTodos();
}

function renderFolders() {
    const list = document.getElementById('folder-list'); list.innerHTML = '';
    const fs = document.getElementById('folderSelect'); fs.innerHTML = '';
    ['오늘 할 일', '전체보기'].forEach(name => {
        const li = document.createElement('li');
        li.className = `folder-item ${activeFolder === name ? 'active' : ''}`;
        li.innerText = name;
        li.onclick = () => { activeFolder = name; selectedDateStr = ''; renderFolders(); renderTodos(); };
        list.appendChild(li);
    });
    currentFolders.forEach(f => {
        const li = document.createElement('li'); li.innerText = f.name;
        li.onclick = () => { activeFolder = f.name; selectedDateStr = ''; renderFolders(); renderTodos(); };
        list.appendChild(li);
        const opt = document.createElement('option'); opt.value = f.name; opt.innerText = f.name; fs.appendChild(opt);
    });
}

function renderTodos() {
    const listDiv = document.getElementById('todo-list'); listDiv.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    const search = document.getElementById('searchInput').value.toLowerCase();
    const hideFuture = document.getElementById('hideFuture').checked;
    const hideCompleted = document.getElementById('hideCompleted').checked;

    const filtered = currentTodos.filter(t => {
        let pass = false;
        if (activeFolder === '선택한 날짜') pass = t.dueDate === selectedDateStr;
        else if (activeFolder === '오늘 할 일') pass = t.dueDate && t.dueDate <= today;
        else if (activeFolder === '전체보기') pass = true;
        else pass = t.folder === activeFolder;
        
        if (hideCompleted && t.isCompleted) pass = false;
        if (hideFuture && t.dueDate > today) pass = false;
        if (search) pass = pass && t.title.toLowerCase().includes(search);
        return pass;
    });

    filtered.filter(t => !t.parentId).forEach(p => {
        listDiv.appendChild(createTodoElement(p));
        currentTodos.filter(c => c.parentId === p.id).forEach(c => listDiv.appendChild(createTodoElement(c)));
    });
}

function createTodoElement(todo) {
    const div = document.createElement('div');
    div.className = `todo-item ${todo.parentId ? 'sub-task' : ''} ${todo.isCompleted ? 'completed' : ''}`;
    div.setAttribute('draggable', 'true');
    div.dataset.id = todo.id; div.dataset.position = todo.position;

    div.addEventListener('dragstart', function(e) {
        draggedItemId = this.dataset.id;
        this.classList.add('dragging');
        guideLabel.style.display = 'block';
    });
    div.addEventListener('dragover', function(e) {
        e.preventDefault();
        guideLabel.style.left = (e.clientX + 15) + 'px';
        guideLabel.style.top = (e.clientY + 15) + 'px';
        const rect = this.getBoundingClientRect();
        if (e.clientY - rect.top > rect.height * 0.7) {
            this.classList.add('drag-over-bottom'); this.classList.remove('drag-over-top');
            guideLabel.innerText = '📂 하위로 넣기'; guideLabel.style.background = '#28a745';
        } else {
            this.classList.add('drag-over-top'); this.classList.remove('drag-over-bottom');
            guideLabel.innerText = '↕️ 순서 조정'; guideLabel.style.background = '#007bff';
        }
    });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); guideLabel.style.display = 'none'; });
    div.addEventListener('drop', async function(e) {
        e.preventDefault();
        const rect = this.getBoundingClientRect();
        const parentId = (e.clientY - rect.top > rect.height * 0.7) ? this.dataset.id : null;
        await fetch('/api/todos/reorder', {
            method: 'PATCH', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: draggedItemId, parentId, targetPosition: parseFloat(this.dataset.position) })
        });
        loadData();
    });

    div.innerHTML = `<input type="checkbox" ${todo.isCompleted ? 'checked' : ''} onchange="toggleTodo(${todo.id}, ${todo.isCompleted})">
                     <div style="flex:1"><strong>${todo.title}</strong><div style="font-size:0.8em">${todo.dueDate || ''}</div></div>`;
    return div;
}

// 달력 로직 및 나머지 기능 생략 없이 동일 적용
function renderCalendar() {
    const grid = document.getElementById('cal-grid'); grid.innerHTML = '';
    document.getElementById('cal-month-year').innerText = `${calCurrentDate.getFullYear()}년 ${calCurrentDate.getMonth()+1}월`;
    for(let i=1; i<=31; i++) {
        const d = document.createElement('div'); d.className = 'cal-day'; d.innerText = i;
        const ds = `${calCurrentDate.getFullYear()}-${String(calCurrentDate.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        if(ds === selectedDateStr) d.classList.add('selected');
        d.onclick = () => { selectedDateStr = ds; activeFolder = '선택한 날짜'; renderCalendar(); renderTodos(); };
        grid.appendChild(d);
    }
}
function changeMonth(n) { calCurrentDate.setMonth(calCurrentDate.getMonth() + n); renderCalendar(); }
function openModal() { document.getElementById('todo-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('todo-modal').classList.add('hidden'); }
async function toggleTodo(id, s) { await fetch(`/api/todos/${id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({isCompleted: !s}) }); loadData(); }
async function saveTodo() {
    await fetch('/api/todos', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
        title: document.getElementById('title').value,
        folder: document.getElementById('folderSelect').value,
        dueDate: document.getElementById('dueDate').value,
        recurrence: document.getElementById('recurrence').value
    })});
    closeModal(); loadData();
}
async function createNewFolder() {
    const name = prompt("이름");
    await fetch('/api/folders', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
    loadData();
}
async function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    const res = await fetch('/api/otp/status'); const d = await res.json();
    document.getElementById('otp-status-section').innerHTML = d.enabled ? 'ON' : '<button onclick="startOtpSetup()">OTP 설정</button>';
}
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }
async function startOtpSetup() {
    const res = await fetch('/api/otp/setup'); const d = await res.json();
    document.getElementById('otp-status-section').innerHTML = `<img src="${d.qrCodeUrl}"><br><input id="otpT"><button onclick="enableOtp('${d.secret}')">인증</button>`;
}
async function enableOtp(secret) {
    await fetch('/api/otp/enable', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret, token: document.getElementById('otpT').value}) });
    openSettings();
}
