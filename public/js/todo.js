// public/js/todo.js

function renderTodoFolders() {
    const list = document.getElementById('todo-folder-list'); list.innerHTML = '';
    const basic = (n, i) => { const li = document.createElement('li'); li.className = `folder-item ${activeTodoFolder===n?'active':''}`; li.innerHTML = `<span>${i}</span> ${n}`; li.onclick = () => { activeTodoFolder=n; renderTodoFolders(); renderTodos(); document.getElementById('todo-folder-title').innerText=n; }; list.appendChild(li); };
    
    basic('오늘 할 일', '📅'); basic('전체보기', '📋');
    
    folders.forEach(f => {
        const li = document.createElement('li'); li.className = `folder-item ${activeTodoFolder===f.name?'active':''}`;
        li.innerHTML = `<span>📁</span> ${f.name}`;
        
        li.setAttribute('draggable', 'true');
        li.ondragstart = () => { draggedTodoFolderId = f.id; li.style.opacity = '0.5'; };
        li.ondragover = (e) => { e.preventDefault(); li.style.borderTop = '2px solid #007bff'; }; 
        li.ondragleave = () => { li.style.borderTop = ''; };
        li.ondrop = async (e) => {
            e.preventDefault(); li.style.borderTop = '';
            if(!draggedTodoFolderId || draggedTodoFolderId === f.id) return;
            await api('/api/folders/reorder', 'PATCH', { id: draggedTodoFolderId, targetPosition: f.position - 0.01 });
            loadAll();
        };
        li.ondragend = () => { li.style.opacity = '1'; draggedTodoFolderId = null; };
        
        li.onclick = () => { activeTodoFolder=f.name; renderTodoFolders(); renderTodos(); document.getElementById('todo-folder-title').innerText=f.name; };
        list.appendChild(li);
    });
}

function renderTodos() {
    const grid = document.getElementById('todo-list'); grid.innerHTML = '';
    const today = getLocalDateStr(); 
    
    const hideFuture = document.getElementById('hide-future').checked;
    const hideCompleted = document.getElementById('hide-completed').checked;

    const filtered = todos.filter(t => {
        if (activeTodoFolder === '오늘 할 일') {
            if (!t.dueDate || t.dueDate > today) return false;
        } else if (activeTodoFolder !== '전체보기') {
            if (t.folder !== activeTodoFolder) return false;
        }
        if (hideCompleted && t.isCompleted) return false;
        if (hideFuture && t.dueDate && t.dueDate > today) return false;
        return true;
    });

    const activeTodos = filtered.filter(t => !t.isCompleted);
    const completedTodos = filtered.filter(t => t.isCompleted);

    const renderTree = (list, parentElement) => {
        list.filter(t => !t.parentId).forEach(p => { 
            parentElement.appendChild(createTodoEl(p)); 
            todos.filter(c => c.parentId === p.id).forEach(c => parentElement.appendChild(createTodoEl(c))); 
        });
    };

    renderTree(activeTodos, grid);

    if (completedTodos.length > 0 && !hideCompleted) {
        const sep = document.createElement('hr');
        sep.className = 'completed-separator';
        grid.appendChild(sep);
        renderTree(completedTodos, grid);
    }
}

function createTodoEl(t) {
    const div = document.createElement('div'); const isSub = !!t.parentId;
    div.className = `todo-item ${isSub?'sub-task':''} ${t.isCompleted?'completed':''}`;
    div.setAttribute('draggable', 'true');
    
    div.ondragstart = () => { draggedItemId = t.id; div.classList.add('dragging'); if(guideLabel) guideLabel.style.display='block'; };
    div.ondragover = (e) => {
        e.preventDefault(); 
        if(guideLabel) { guideLabel.style.left = (e.clientX+15)+'px'; guideLabel.style.top = (e.clientY+15)+'px'; }
        const rect = div.getBoundingClientRect();
        if(e.clientY - rect.top > rect.height * 0.7) { div.classList.add('drag-over-bottom'); div.classList.remove('drag-over-top'); if(guideLabel) guideLabel.innerText='📂 하위로'; }
        else { div.classList.add('drag-over-top'); div.classList.remove('drag-over-bottom'); if(guideLabel) guideLabel.innerText='↕️ 이동'; }
    };
    div.ondrop = async (e) => {
        e.preventDefault(); div.classList.remove('drag-over-top', 'drag-over-bottom');
        const draggedTodo = todos.find(x => x.id === draggedItemId);
        if(!draggedTodo) return;

        const pId = (e.clientY - div.getBoundingClientRect().top > div.getBoundingClientRect().height * 0.7) ? t.id : null;
        
        if(pId) {
            if(isSub) { alertPop("1단계 하위까지만 등록 가능해!"); return; }
            if(draggedTodo.folder !== t.folder) { alertPop("같은 폴더 안에서만 하위 할 일로 묶을 수 있어!"); return; }
        }

        await api('/api/todos/reorder', 'PATCH', { id: draggedItemId, parentId: pId, targetPosition: t.position - 0.01 });
        loadAll();
    };
    div.ondragend = () => { div.classList.remove('dragging'); if(guideLabel) guideLabel.style.display='none'; };

    const folderPrefix = (t.folder && t.folder !== '미지정') ? `<span style="color:#007bff; margin-right:6px; font-weight:bold;">[${t.folder}]</span>` : '';
    const recurIcon = (t.recurrence && t.recurrence !== 'none') ? `<span title="반복 할 일" style="color:#28a745; margin-left:10px; font-size:1.2em;">🔄</span>` : '';

    div.innerHTML = `
        <input type="checkbox" ${t.isCompleted?'checked':''} onchange="toggleTodo(${t.id}, ${t.isCompleted})">
        <div style="flex:1; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="editTodo(${t.id})">
            <div>
                <b class="todo-title-text">${folderPrefix}${t.title}</b><br>
                <small>${t.dueDate||'없음'}</small>
            </div>
            ${recurIcon}
        </div>
        <button onclick="delTodo(${t.id})" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
    `;
    return div;
}

function openTodoModal() { 
    document.getElementById('todo-id').value=''; 
    document.getElementById('todo-title').value=''; 
    document.getElementById('todo-due').value=getLocalDateStr();			
    
    const sel = document.getElementById('todo-folder-sel-modal');
    if (activeTodoFolder !== '오늘 할 일' && activeTodoFolder !== '전체보기') sel.value = activeTodoFolder;
    else sel.value = '미지정';
    
    document.getElementById('todo-modal').classList.remove('hidden'); 
}		
function editTodo(id) { const t=todos.find(x=>x.id===id); document.getElementById('todo-id').value=t.id; document.getElementById('todo-title').value=t.title; document.getElementById('todo-due').value=t.dueDate; document.getElementById('todo-folder-sel-modal').value=t.folder; document.getElementById('todo-recur').value=t.recurrence; document.getElementById('todo-modal').classList.remove('hidden'); }
async function saveTodo() { const id=document.getElementById('todo-id').value; const p={title:document.getElementById('todo-title').value, folder:document.getElementById('todo-folder-sel-modal').value, dueDate:document.getElementById('todo-due').value, recurrence:document.getElementById('todo-recur').value, note:document.getElementById('todo-note').value}; await api(id?`/api/todos/${id}`:'/api/todos', id?'PUT':'POST', p); closeModal('todo-modal'); loadAll(); }
async function toggleTodo(id, s) { await api(`/api/todos/${id}`, 'PATCH', {isCompleted: s?0:1}); loadAll(); }
async function delTodo(id) { if(await confirmPop("삭제?")) { await api(`/api/todos/${id}`, 'DELETE'); loadAll(); } }
