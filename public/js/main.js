// public/js/main.js

window.onload = () => {
    const uid = localStorage.getItem('user_id');
    if(uid) {
        document.getElementById('auth-section').classList.add('hidden');
        if(uid === 'admin') showAdmin();
        else { document.getElementById('app-section').classList.remove('hidden'); document.getElementById('top-nav').classList.remove('hidden'); loadAll(); }
    }
};

async function loadAll() {
    const [e, t, f, c, n, nf] = await Promise.all([api('/api/events'), api('/api/todos'), api('/api/folders'), api('/api/event-categories'), api('/api/notes'), api('/api/note-folders')]);
    events=e; todos=t; folders=f; categories=c; notes=n; nFolders=nf;
    renderAll();
}

function renderAll() {
    if(currentTab === 'calendar') renderCalendar();
    else if(currentTab === 'todo') { renderTodoFolders(); renderTodos(); }
    else if(currentTab === 'notes') renderNoteTree();
    populateSelects();
}

function switchTab(t) {
    currentTab = t;
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-'+t).classList.add('active');
    ['tab-calendar', 'tab-todo', 'tab-notes'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('tab-'+t).classList.remove('hidden');
    renderAll();
}

function populateSelects() {
    const ec = document.getElementById('ev-cat'); if(ec) ec.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    const nfs = document.getElementById('note-folder-sel'); if(nfs) nfs.innerHTML = nFolders.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
    const tfs = document.getElementById('todo-folder-sel-modal'); if(tfs) tfs.innerHTML = '<option value="미지정">미지정</option>' + folders.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
}

function openFolderMgr(type) {
    currentFolderMgrType = type;
    const list = type === 'todo' ? folders : nFolders;
    document.getElementById('folder-mgr-list').innerHTML = list.map(f => `
        <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
            <input type="text" value="${f.name}" id="fm-in-${f.id}" style="flex:1; margin:0;">
            <button class="btn-sub" style="padding:10px 15px; margin:0;" onclick="updateFm(${f.id}, '${type}')">수정</button>
            <button class="btn-sub" style="color:red; padding:10px 15px; margin:0;" onclick="delFm(${f.id}, '${type}')">삭제</button>
        </div>
    `).join('');
    
    document.getElementById('new-folder-name').value = ''; 
    document.getElementById('folder-mgr-modal').classList.remove('hidden');
}

async function addNewFolderFromMgr() {
    const name = document.getElementById('new-folder-name').value.trim();
    if (!name) return alertPop("폴더 이름을 입력해 주세요.");
    await api(currentFolderMgrType === 'todo' ? '/api/folders' : '/api/note-folders', 'POST', {name});
    loadAll();
    setTimeout(() => openFolderMgr(currentFolderMgrType), 300); 
}

async function updateFm(id, type) { const name=document.getElementById(`fm-in-${id}`).value; await api((type==='todo'?'/api/folders/':'/api/note-folders/')+id, 'PUT', {name}); loadAll(); setTimeout(()=>openFolderMgr(type), 300); }
async function delFm(id, type) { if(await confirmPop("삭제?")) { await api((type==='todo'?'/api/folders/':'/api/note-folders/')+id, 'DELETE'); loadAll(); setTimeout(()=>openFolderMgr(type), 300); } }
