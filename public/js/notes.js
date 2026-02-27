// public/js/notes.js

function renderNoteTree() {
    const grid = document.getElementById('note-tree'); grid.innerHTML = '';
    nFolders.forEach(f => {
        const h = document.createElement('div'); h.className='tree-folder-header';
        h.innerHTML = `<span>📁 ${f.name}</span> <span onclick="toggleTree(event, ${f.id})">▼</span>`;

        h.setAttribute('draggable', 'true');
        h.ondragstart = (e) => {
            draggedNoteFolderId = f.id;
            e.dataTransfer.setData('sourceType', 'folder'); 
            h.style.opacity = '0.5';
        };
        h.ondragover = (e) => { e.preventDefault(); h.classList.add('drag-over'); };
        h.ondragleave = () => h.classList.remove('drag-over');
        h.ondrop = async (e) => {
            e.preventDefault(); h.classList.remove('drag-over');
            const sourceType = e.dataTransfer.getData('sourceType');
            const noteId = e.dataTransfer.getData('noteId');

            if(sourceType === 'folder' && draggedNoteFolderId && draggedNoteFolderId !== f.id) {
                await api('/api/note-folders/reorder', 'PATCH', { id: draggedNoteFolderId, targetPosition: f.position - 0.01 });
                loadAll();
            } else if (noteId) {
                const note = notes.find(n => n.id == noteId);
                await api(`/api/notes/${noteId}`, 'PUT', { ...note, folder: f.name });
                loadAll();
            }
        };
        h.ondragend = () => { h.style.opacity = '1'; draggedNoteFolderId = null; };

        grid.appendChild(h);

        const items = document.createElement('div'); items.id = 'tree-items-'+f.id;
        notes.filter(n => n.folder === f.name).forEach(n => {
            const item = document.createElement('div'); item.className=`tree-note-item ${activeNoteId===n.id?'active':''}`;
            item.innerText = '📄 ' + n.title; item.setAttribute('draggable', 'true');
            item.ondragstart = (e) => {
                e.dataTransfer.setData('noteId', n.id);
                e.dataTransfer.setData('sourceType', 'note'); 
            };
            item.onclick = () => openNote(n.id);
            items.appendChild(item);
        });
        grid.appendChild(items);
    });
}
function toggleTree(e, id) { e.stopPropagation(); document.getElementById('tree-items-'+id).classList.toggle('hidden'); }

function openNote(id) { 
    const n = notes.find(x => x.id === id); 
    activeNoteId = n.id; 
    document.getElementById('note-title').value = n.title; 
    document.getElementById('note-content').value = n.content; 
    document.getElementById('note-folder-sel').value = n.folder; 
    
    const ct = n.created_at || '기록 없음';
    const ut = n.updated_at || '기록 없음';
    document.getElementById('note-timestamps').innerText = `작성일: ${ct} | 마지막 수정: ${ut}`;
    
    renderNoteTree(); 
}

function newNote() { 
    activeNoteId = null; 
    document.getElementById('note-title').value = ''; 
    document.getElementById('note-content').value = ''; 
    document.getElementById('note-timestamps').innerText = '새 메모 작성 중...';
    document.getElementById('note-title').focus(); 
}

function autoSave() { 
    clearTimeout(saveTimer); 
    saveTimer = setTimeout(async () => { 
        if (isSavingNewNote) return; 

        const p = {
            title: document.getElementById('note-title').value || "제목없음", 
            content: document.getElementById('note-content').value, 
            folder: document.getElementById('note-folder-sel').value
        }; 
        if (activeNoteId) { 
            await api(`/api/notes/${activeNoteId}`, 'PUT', p); 
        } else { 
            isSavingNewNote = true; 
            const r = await api('/api/notes', 'POST', p); 
            activeNoteId = r.id; 
            isSavingNewNote = false; 
        } 
        
        document.getElementById('save-status').innerText = "저장됨 ✓"; 
        
        loadAll().then(() => {
            if (activeNoteId) {
                const updatedNote = notes.find(n => n.id === activeNoteId);
                if (updatedNote) {
                    const ct = updatedNote.created_at || '기록 없음';
                    const ut = updatedNote.updated_at || '기록 없음';
                    document.getElementById('note-timestamps').innerText = `작성일: ${ct} | 마지막 수정: ${ut}`;
                }
            }
        });
    }, 1000); 
}

async function saveNoteManual() { autoSave(); } // 수동 저장 버튼 연결

async function delCurrentNote() {
    if (!activeNoteId) return alertPop("삭제할 메모가 선택되지 않았어!");
    
    if (await confirmPop("정말 이 메모를 삭제할까?")) {
        await api(`/api/notes/${activeNoteId}`, 'DELETE');
        activeNoteId = null;
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('save-status').innerText = '';
        loadAll(); 
    }
}
