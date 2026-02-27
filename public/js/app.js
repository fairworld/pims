        // --- [전역 변수] ---
        let events=[], todos=[], folders=[], categories=[], notes=[], nFolders=[];
        let calDate = new Date();
        let currentTab = 'calendar';
        let activeTodoFolder = '오늘 할 일';
        let activeNoteFolder = '일반';
        let activeNoteId = null;
        let dragStartStr = null;
        let saveTimer = null;
        let draggedItemId = null;
        
        let isSavingNewNote = false; 
        let currentFolderMgrType = ''; // 추가: 모달용 폴더 타입 저장 변수

	let draggedTodoFolderId = null;
        let draggedNoteFolderId = null;

        const guideLabel = document.getElementById('drag-guide-label');

        const api = async (url, method='GET', body=null) => {
            const headers = { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('user_id') };
            const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
            if (res.status === 401) { logout(); return; }
            return res.json();
        };

	 const krHolidays = {
            // 2026년
            '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴', '2026-03-01': '삼일절', '2026-03-02': '대체공휴일', '2026-05-05': '어린이날', '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-03': '지방선거', '2026-06-06': '현충일', '2026-08-15': '광복절', '2026-08-17': '대체공휴일', '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴', '2026-10-03': '개천절', '2026-10-05': '대체공휴일', '2026-10-09': '한글날', '2026-12-25': '기독탄신일',

            // 2027년
            '2027-01-01': '신정', '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴', '2027-02-09': '대체공휴일', '2027-03-01': '삼일절', '2027-03-03': '대통령선거', '2027-05-05': '어린이날', '2027-05-13': '부처님오신날', '2027-06-06': '현충일', '2027-08-15': '광복절', '2027-08-16': '대체공휴일', '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴', '2027-10-03': '개천절', '2027-10-04': '대체공휴일', '2027-10-09': '한글날', '2027-10-11': '대체공휴일', '2027-12-25': '기독탄신일', '2027-12-27': '대체공휴일',

            // 2028년
            '2028-01-01': '신정', '2028-01-26': '설날 연휴', '2028-01-27': '설날', '2028-01-28': '설날 연휴', '2028-03-01': '삼일절', '2028-04-12': '국회의원선거', '2028-05-02': '부처님오신날', '2028-05-05': '어린이날', '2028-06-06': '현충일', '2028-08-15': '광복절', '2028-10-02': '추석 연휴', '2028-10-03': '추석/개천절', '2028-10-04': '추석 연휴', '2028-10-05': '대체공휴일', '2028-10-09': '한글날', '2028-12-25': '기독탄신일',

            // 2029년
            '2029-01-01': '신정', '2029-02-12': '설날 연휴', '2029-02-13': '설날', '2029-02-14': '설날 연휴', '2029-03-01': '삼일절', '2029-05-05': '어린이날', '2029-05-07': '대체공휴일', '2029-05-20': '부처님오신날', '2029-05-21': '대체공휴일', '2029-06-06': '현충일', '2029-08-15': '광복절', '2029-09-21': '추석 연휴', '2029-09-22': '추석', '2029-09-23': '추석 연휴', '2029-09-24': '대체공휴일', '2029-10-03': '개천절', '2029-10-09': '한글날', '2029-12-25': '기독탄신일',

            // 2030년
            '2030-01-01': '신정', '2030-02-02': '설날 연휴', '2030-02-03': '설날', '2030-02-04': '설날 연휴', '2030-02-05': '대체공휴일', '2030-03-01': '삼일절', '2030-05-05': '어린이날', '2030-05-06': '대체공휴일', '2030-05-09': '부처님오신날', '2030-06-06': '현충일', '2030-08-15': '광복절', '2030-09-11': '추석 연휴', '2030-09-12': '추석', '2030-09-13': '추석 연휴', '2030-10-03': '개천절', '2030-10-09': '한글날', '2030-12-25': '기독탄신일'
        };
        // --- [팝업 헬퍼] ---
        function alertPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.add('hidden'); document.getElementById('dialog-cancel').classList.add('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-ok').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(true);}; }); }
        function confirmPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.add('hidden'); document.getElementById('dialog-cancel').classList.remove('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-ok').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(true);}; document.getElementById('dialog-cancel').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(false);}; }); }
        function promptPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.remove('hidden'); document.getElementById('dialog-input-val').value=''; document.getElementById('dialog-cancel').classList.remove('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-input-val').focus(); document.getElementById('dialog-ok').onclick=()=>{const v=document.getElementById('dialog-input-val').value; document.getElementById('custom-dialog').classList.add('hidden'); res(v);}; document.getElementById('dialog-cancel').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(null);}; }); }

        // --- [인증] ---
        function toggleAuth(t) { document.getElementById('login-form').classList.toggle('hidden', t==='signup'); document.getElementById('signup-form').classList.toggle('hidden', t==='login'); }
        function checkPw() { const pw=document.getElementById('signup-pw').value; const regex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/; const isValid=regex.test(pw); document.getElementById('pw-hint').className = 'pw-hint ' + (isValid ? 'valid' : 'invalid'); document.getElementById('signup-btn').disabled=!isValid; }
        async function handleSignup() { const u=document.getElementById('signup-id').value; const p=document.getElementById('signup-pw').value; const res=await fetch('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) }); if(res.ok) { await alertPop("가입 요청 완료! 승인 후 로그인해 줘."); toggleAuth('login'); } else await alertPop("중복된 아이디야."); }
        async function handleLogin() { const u=document.getElementById('login-id').value; const p=document.getElementById('login-pw').value; const res=await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) }); const data=await res.json(); if(res.ok) { localStorage.setItem('user_id', data.userId); if(data.isAdmin) showAdmin(); else location.reload(); } else await alertPop(data.error); }
        function logout() { localStorage.clear(); location.reload(); }

        window.onload = () => {
            const uid = localStorage.getItem('user_id');
            if(uid) {
                document.getElementById('auth-section').classList.add('hidden');
                if(uid === 'admin') showAdmin();
                else { document.getElementById('app-section').classList.remove('hidden'); document.getElementById('top-nav').classList.remove('hidden'); loadAll(); }
            }
        };

        async function showAdmin() {
            document.getElementById('auth-section').classList.add('hidden'); // 로그인창 숨김
            document.getElementById('admin-section').classList.remove('hidden');
            const res = await api('/api/admin/users');
            document.getElementById('admin-user-list').innerHTML = res.map(u => `<tr><td style="padding:15px">${u.id}</td><td>${u.username}</td><td>${u.is_approved?'✅ 승인됨':'⏳ 대기중'}</td><td>${!u.is_approved?`<button onclick="approveUser(${u.id})">승인</button>`:''} <button onclick="delUser(${u.id})">삭제</button></td></tr>`).join('');
        }
        async function approveUser(id) { await api(`/api/admin/users/${id}/approve`, 'PATCH'); showAdmin(); }
        async function delUser(id) { if(await confirmPop("삭제할까?")) { await api(`/api/admin/users/${id}`, 'DELETE'); showAdmin(); } }

        // --- [메인 로드] ---
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

		// [수정됨] 월간/주간/일간 뷰를 모두 지원하는 달력 렌더링
		function renderCalendar() {
		    const mode = document.getElementById('cal-view-mode').value;
		    const grid = document.getElementById('large-cal-grid'); grid.innerHTML = '';
		    const y = calDate.getFullYear(), m = calDate.getMonth(), d = calDate.getDate();
		    
		    // 모드에 따른 그리드 템플릿 및 제목 설정
		    grid.style.gridTemplateColumns = mode === 'day' ? '1fr' : 'repeat(7, 1fr)';
		    
		    if (mode === 'month') document.getElementById('cal-title').innerText = `${y}년 ${m+1}월`;
		    else if (mode === 'week') {
		        const ws = new Date(y, m, d - calDate.getDay());
		        const we = new Date(ws.getTime() + 6 * 24*60*60*1000);
		        document.getElementById('cal-title').innerText = `${ws.getMonth()+1}월 ${ws.getDate()}일 ~ ${we.getMonth()+1}월 ${we.getDate()}일`;
		    } else {
		        document.getElementById('cal-title').innerText = `${y}년 ${m+1}월 ${d}일`;
		    }
		
		    // 요일 헤더 그리기
		    const days = ['일','월','화','수','목','금','토'];
		    if (mode !== 'day') {
		        days.forEach((dayName, idx) => {
		            const colorClass = idx === 0 ? 'text-sun' : (idx === 6 ? 'text-sat' : '');
		            grid.innerHTML += `<div class="large-cal-day-name ${colorClass}">${dayName}</div>`;
		        });
		    } else {
		        const dayIdx = calDate.getDay();
		        const colorClass = dayIdx === 0 ? 'text-sun' : (dayIdx === 6 ? 'text-sat' : '');
		        grid.innerHTML += `<div class="large-cal-day-name ${colorClass}">${days[dayIdx]}요일</div>`;
		    }
		
			const todayStr = getLocalDateStr();
		    let loopStart, loopEnd;
		
		    // 모드별 반복 기간 설정
		    if (mode === 'month') {
		        const first = new Date(y, m, 1).getDay(); const last = new Date(y, m+1, 0).getDate();
		        for(let i=0; i<first; i++) grid.innerHTML += `<div class="large-cal-box empty"></div>`;
		        loopStart = new Date(y, m, 1); loopEnd = new Date(y, m, last);
		    } else if (mode === 'week') {
		        loopStart = new Date(y, m, d - calDate.getDay());
		        loopEnd = new Date(loopStart.getTime() + 6 * 24*60*60*1000);
		    } else {
		        loopStart = new Date(y, m, d); loopEnd = new Date(y, m, d);
		    }
		
		    // 날짜 박스 렌더링
		    let cur = new Date(loopStart);
		    while(cur <= loopEnd) {
		        const ds = getLocalDateStr(cur); // <-- 로컬 시간 변환 함수로 교체!
		        const dayEvs = events.filter(e => ds >= e.startDate && ds <= e.endDate);
		        const isToday = ds === todayStr;
		        const dayOfWeek = cur.getDay();
		        const holidayName = krHolidays[ds];
		        
		        let dateColorClass = '';
		        if (dayOfWeek === 0 || holidayName) dateColorClass = 'text-sun';
		        else if (dayOfWeek === 6) dateColorClass = 'text-sat';
		        
		        const holidayHtml = holidayName ? `<span class="holiday-name">${holidayName}</span>` : '';
		        const boxStyle = mode === 'day' ? 'min-height: 500px;' : (mode === 'week' ? 'min-height: 250px;' : 'min-height: 140px;');
		
		        const dateHtml = `<div class="large-cal-date-row">${holidayHtml}${isToday ? `<div class="today-badge">${cur.getDate()}</div>` : `<div class="large-cal-date ${dateColorClass}">${cur.getDate()}</div>`}</div>`;
		        
		        const evsHtml = dayEvs.map(e => {
		            const c = categories.find(cat => cat.name === e.category) || {color:'#007bff'};
		            const tooltipText = e.note ? `[메모] ${e.note.replace(/"/g, '&quot;')}` : e.title;
		            return `<div class="event-badge" draggable="true" style="background:${c.color}15; color:${c.color}; border-left:4px solid ${c.color}" ondragstart="evDragStart(event, ${e.id}, '${e.startDate}')" onclick="editEv(event, ${e.id})" onmousemove="showEvTooltip(event, ${e.id})" onmouseleave="hideEvTooltip()">${e.isAllDay?'':'['+e.startTime+'] '}${e.title}</div>`;
		        }).join('');
		        
		        grid.innerHTML += `<div class="large-cal-box" style="${boxStyle}" onmousedown="dragStartStr='${ds}'" onmouseup="endCalDrag('${ds}')" ondragover="event.preventDefault()" ondrop="evDrop(event, '${ds}')">${dateHtml}${evsHtml}</div>`;
		        cur.setDate(cur.getDate() + 1);
		    }
		}
		// [수정됨] 뷰 모드에 따른 이전/다음 이동 로직
		function changeMonth(n) { 
		    const mode = document.getElementById('cal-view-mode').value;
		    if (mode === 'month') calDate.setMonth(calDate.getMonth() + n); 
		    else if (mode === 'week') calDate.setDate(calDate.getDate() + (n * 7));
		    else if (mode === 'day') calDate.setDate(calDate.getDate() + n);
		    renderCalendar(); 
		}
        function goToday() { calDate = new Date(); renderCalendar(); }
        function endCalDrag(ds) { if(!dragStartStr) return; let s=dragStartStr, e=ds; if(s>e) [s,e]=[e,s]; openEvModal(s,e); dragStartStr=null; }
        function evDragStart(e, id, sd) { e.stopPropagation(); e.dataTransfer.setData('evId', id); e.dataTransfer.setData('origSd', sd); }
        async function evDrop(e, targetDs) {
            e.preventDefault(); e.stopPropagation();
            const id = e.dataTransfer.getData('evId'); if(!id) return;
            const ev = events.find(x => x.id == id);
            const diffMs = new Date(targetDs) - new Date(e.dataTransfer.getData('origSd'));
            const newSd = new Date(new Date(ev.startDate).getTime() + diffMs).toISOString().split('T')[0];
            const newEd = new Date(new Date(ev.endDate).getTime() + diffMs).toISOString().split('T')[0];
            await api(`/api/events/${id}`, 'PUT', { ...ev, startDate: newSd, endDate: newEd });
            loadAll();
        }
        function openEvModal(s, e) {
            document.getElementById('ev-id').value = ''; document.getElementById('ev-title').value = '';
            document.getElementById('ev-sd').value = s; document.getElementById('ev-ed').value = e;
            const now = new Date(); now.setMinutes(Math.ceil(now.getMinutes()/5)*5);
            document.getElementById('ev-st').value = now.toTimeString().slice(0,5);
            evStartChange(); document.getElementById('ev-allday').checked = false; toggleEvTime();
            document.getElementById('ev-del-btn').classList.add('hidden'); document.getElementById('event-modal').classList.remove('hidden');
        }
        function evStartChange() { const v=document.getElementById('ev-st').value; if(!v) return; const [h,m]=v.split(':').map(Number); const d=new Date(); d.setHours(h+1, m); document.getElementById('ev-et').value=d.toTimeString().slice(0,5); }
        function toggleEvTime() { document.getElementById('ev-time-box').classList.toggle('hidden', document.getElementById('ev-allday').checked); }
        async function saveEvent() {
            const id = document.getElementById('ev-id').value;
            const payload = { title: document.getElementById('ev-title').value, startDate: document.getElementById('ev-sd').value, endDate: document.getElementById('ev-ed').value, startTime: document.getElementById('ev-st').value, endTime: document.getElementById('ev-et').value, isAllDay: document.getElementById('ev-allday').checked?1:0, category: document.getElementById('ev-cat').value, note: document.getElementById('ev-note').value };
            if(!payload.title) return alertPop("제목을 입력해 줘!");
            await api(id ? `/api/events/${id}` : '/api/events', id ? 'PUT' : 'POST', payload);
            closeModal('event-modal'); loadAll();
        }
        function editEv(e, id) { e.stopPropagation(); const ev = events.find(x => x.id === id); document.getElementById('ev-id').value = ev.id; document.getElementById('ev-title').value = ev.title; document.getElementById('ev-sd').value = ev.startDate; document.getElementById('ev-ed').value = ev.endDate; document.getElementById('ev-st').value = ev.startTime; document.getElementById('ev-et').value = ev.endTime; document.getElementById('ev-allday').checked = ev.isAllDay===1; document.getElementById('ev-cat').value = ev.category; toggleEvTime(); document.getElementById('ev-del-btn').classList.remove('hidden'); document.getElementById('event-modal').classList.remove('hidden'); }
        async function delEvent() { if(await confirmPop("삭제할까?")) { await api(`/api/events/${document.getElementById('ev-id').value}`, 'DELETE'); closeModal('event-modal'); loadAll(); } }

        // [수정] 카테고리 관리 함수 UI/UX 개선 반영
        function openCatMgr() { renderCatList(); document.getElementById('cat-modal').classList.remove('hidden'); }
        function renderCatList() { 
            document.getElementById('cat-list').innerHTML = categories.map(c => `
                <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                    <input type="color" value="${c.color}" onchange="updateCat(${c.id}, null, this.value)" style="width:30px; height:30px; padding:0; border-radius:4px;">
                    <input type="text" value="${c.name}" onblur="updateCat(${c.id}, this.value, null)" style="flex:1; margin:0;">
                    <button class="btn-sub" style="color:red; padding:10px 15px; margin:0;" onclick="delCat(${c.id})">삭제</button>
                </div>
            `).join(''); 
        }
        async function addCategory() { const n=document.getElementById('new-cat-name').value; const c=document.getElementById('new-cat-color').value; if(n) { await api('/api/event-categories', 'POST', {name:n, color:c}); loadAll(); setTimeout(renderCatList, 300); } }
        async function updateCat(id, name, color) { const cat=categories.find(x=>x.id===id); await api(`/api/event-categories/${id}`, 'PUT', {name: name||cat.name, color: color||cat.color}); loadAll(); }
        async function delCat(id) { if(await confirmPop("삭제?")) { await api(`/api/event-categories/${id}`, 'DELETE'); loadAll(); setTimeout(renderCatList, 300); } }

        // --- [할일 로직 & 드래그 앤 드롭] ---
        // 1. 할 일 폴더 목록을 그리는 함수 (폴더 드래그 앤 드롭 포함)
        function renderTodoFolders() {
            const list = document.getElementById('todo-folder-list'); list.innerHTML = '';
            const basic = (n, i) => { const li = document.createElement('li'); li.className = `folder-item ${activeTodoFolder===n?'active':''}`; li.innerHTML = `<span>${i}</span> ${n}`; li.onclick = () => { activeTodoFolder=n; renderTodoFolders(); renderTodos(); document.getElementById('todo-folder-title').innerText=n; }; list.appendChild(li); };
            
            basic('오늘 할 일', '📅'); basic('전체보기', '📋');
            
            folders.forEach(f => {
                const li = document.createElement('li'); li.className = `folder-item ${activeTodoFolder===f.name?'active':''}`;
                li.innerHTML = `<span>📁</span> ${f.name}`;
                
                // 폴더 드래그 앤 드롭
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
        
		// [수정됨] '오늘 할 일' 필터링 로직이 완벽하게 개선된 렌더링 함수
		function renderTodos() {
		    const grid = document.getElementById('todo-list'); grid.innerHTML = '';
		    const today = getLocalDateStr(); // 로컬 시간 기준 정확한 오늘 날짜
		    
		    const hideFuture = document.getElementById('hide-future').checked;
		    const hideCompleted = document.getElementById('hide-completed').checked;
		
		    const filtered = todos.filter(t => {
		        // [조건 1] '오늘 할 일' 스마트 폴더 선택 시
		        if (activeTodoFolder === '오늘 할 일') {
		            // 💡 핵심 수정: 마감일이 아예 없거나(!t.dueDate) 미래인 경우 제외합니다.
		            // 즉, "마감일이 오늘과 같거나 과거인 할 일"만 화면에 남습니다.
		            if (!t.dueDate || t.dueDate > today) return false;
		        } 
		        // [조건 2] 특정 일반 폴더 선택 시
		        else if (activeTodoFolder !== '전체보기') {
		            if (t.folder !== activeTodoFolder) return false;
		        }
		
		        // [공통 조건] 완료/미래 숨기기 체크박스 반영
		        if (hideCompleted && t.isCompleted) return false;
		        if (hideFuture && t.dueDate && t.dueDate > today) return false;
		        
		        return true;
		    });
		
		    // 진행 중인 일과 완료된 일을 분리
		    const activeTodos = filtered.filter(t => !t.isCompleted);
		    const completedTodos = filtered.filter(t => t.isCompleted);
		
		    // 트리 구조로 화면에 그리는 헬퍼 함수
		    const renderTree = (list, parentElement) => {
		        list.filter(t => !t.parentId).forEach(p => { 
		            parentElement.appendChild(createTodoEl(p)); 
		            todos.filter(c => c.parentId === p.id).forEach(c => parentElement.appendChild(createTodoEl(c))); 
		        });
		    };
		
		    // 1. 진행 중인 할 일 표시
		    renderTree(activeTodos, grid);
		
		    // 2. 완료된 할 일은 하단에 가로선과 함께 분리해서 표시
		    if (completedTodos.length > 0 && !hideCompleted) {
		        const sep = document.createElement('hr');
		        sep.className = 'completed-separator';
		        grid.appendChild(sep);
		        renderTree(completedTodos, grid);
		    }
		}
        
        // 3. 할 일 HTML 요소를 만드는 함수 (아이콘, 폴더명, 하위 등록 제한 로직 포함)
        function createTodoEl(t) {
            const div = document.createElement('div'); const isSub = !!t.parentId;
            div.className = `todo-item ${isSub?'sub-task':''} ${t.isCompleted?'completed':''}`;
            div.setAttribute('draggable', 'true');
            
            div.ondragstart = () => { draggedItemId = t.id; div.classList.add('dragging'); guideLabel.style.display='block'; };
            div.ondragover = (e) => {
                e.preventDefault(); guideLabel.style.left = (e.clientX+15)+'px'; guideLabel.style.top = (e.clientY+15)+'px';
                const rect = div.getBoundingClientRect();
                if(e.clientY - rect.top > rect.height * 0.7) { div.classList.add('drag-over-bottom'); div.classList.remove('drag-over-top'); guideLabel.innerText='📂 하위로'; }
                else { div.classList.add('drag-over-top'); div.classList.remove('drag-over-bottom'); guideLabel.innerText='↕️ 이동'; }
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
            div.ondragend = () => { div.classList.remove('dragging'); guideLabel.style.display='none'; };
        
            // 폴더명과 반복 아이콘 표시
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

		// [수정됨] 새 할 일 추가 시 현재 보고 있는 폴더 자동 선택
		function openTodoModal() { 
		    document.getElementById('todo-id').value=''; 
		    document.getElementById('todo-title').value=''; 
			document.getElementById('todo-due').value=getLocalDateStr();			
		    
		    // 폴더 자동 지정 로직
		    const sel = document.getElementById('todo-folder-sel-modal');
		    if (activeTodoFolder !== '오늘 할 일' && activeTodoFolder !== '전체보기') {
		        sel.value = activeTodoFolder;
		    } else {
		        sel.value = '미지정';
		    }
		    
		    document.getElementById('todo-modal').classList.remove('hidden'); 
		}		
        function editTodo(id) { const t=todos.find(x=>x.id===id); document.getElementById('todo-id').value=t.id; document.getElementById('todo-title').value=t.title; document.getElementById('todo-due').value=t.dueDate; document.getElementById('todo-folder-sel-modal').value=t.folder; document.getElementById('todo-recur').value=t.recurrence; document.getElementById('todo-modal').classList.remove('hidden'); }
        async function saveTodo() { const id=document.getElementById('todo-id').value; const p={title:document.getElementById('todo-title').value, folder:document.getElementById('todo-folder-sel-modal').value, dueDate:document.getElementById('todo-due').value, recurrence:document.getElementById('todo-recur').value, note:document.getElementById('todo-note').value}; await api(id?`/api/todos/${id}`:'/api/todos', id?'PUT':'POST', p); closeModal('todo-modal'); loadAll(); }
        async function toggleTodo(id, s) { await api(`/api/todos/${id}`, 'PATCH', {isCompleted: s?0:1}); loadAll(); }
        async function delTodo(id) { if(await confirmPop("삭제?")) { await api(`/api/todos/${id}`, 'DELETE'); loadAll(); } }

        // --- [메모 로직 & 드래그 앤 드롭] ---
	function renderNoteTree() {
            const grid = document.getElementById('note-tree'); grid.innerHTML = '';
            nFolders.forEach(f => {
                const h = document.createElement('div'); h.className='tree-folder-header';
                h.innerHTML = `<span>📁 ${f.name}</span> <span onclick="toggleTree(event, ${f.id})">▼</span>`;

                // 메모 폴더 드래그 앤 드롭 설정
                h.setAttribute('draggable', 'true');
                h.ondragstart = (e) => {
                    draggedNoteFolderId = f.id;
                    e.dataTransfer.setData('sourceType', 'folder'); // 폴더 드래그임을 표시
                    h.style.opacity = '0.5';
                };
                h.ondragover = (e) => { e.preventDefault(); h.classList.add('drag-over'); };
                h.ondragleave = () => h.classList.remove('drag-over');
                h.ondrop = async (e) => {
                    e.preventDefault(); h.classList.remove('drag-over');

                    const sourceType = e.dataTransfer.getData('sourceType');
                    const noteId = e.dataTransfer.getData('noteId');

                    // 폴더 순서 변경인 경우
                    if(sourceType === 'folder' && draggedNoteFolderId && draggedNoteFolderId !== f.id) {
                        await api('/api/note-folders/reorder', 'PATCH', { id: draggedNoteFolderId, targetPosition: f.position - 0.01 });
                        loadAll();
                    }
                    // 메모를 이 폴더로 이동하는 경우
                    else if (noteId) {
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
                        e.dataTransfer.setData('sourceType', 'note'); // 메모 드래그임을 표시
                    };
                    item.onclick = () => openNote(n.id);
                    items.appendChild(item);
                });
                grid.appendChild(items);
            });
        }
        function toggleTree(e, id) { e.stopPropagation(); document.getElementById('tree-items-'+id).classList.toggle('hidden'); }
		// [수정됨] 메모 열기
		function openNote(id) { 
		    const n = notes.find(x => x.id === id); 
		    activeNoteId = n.id; 
		    document.getElementById('note-title').value = n.title; 
		    document.getElementById('note-content').value = n.content; 
		    document.getElementById('note-folder-sel').value = n.folder; 
		    
		    // 👇 시간 표시 로직 추가
		    const ct = n.created_at || '기록 없음';
		    const ut = n.updated_at || '기록 없음';
		    document.getElementById('note-timestamps').innerText = `작성일: ${ct} | 마지막 수정: ${ut}`;
		    
		    renderNoteTree(); 
		}
		
		// [수정됨] 새 메모 작성
		function newNote() { 
		    activeNoteId = null; 
		    document.getElementById('note-title').value = ''; 
		    document.getElementById('note-content').value = ''; 
		    
		    // 👇 새 메모 상태 표시
		    document.getElementById('note-timestamps').innerText = '새 메모 작성 중...';
		    document.getElementById('note-title').focus(); 
		}
		
		// [수정됨] 자동 저장 후 시간 업데이트
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
		        
		        // 👇 저장 완료 후 목록을 다시 불러오고 바뀐 시간을 화면에 적용
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

        // [수정] 통합된 폴더 관리 및 추가 함수
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
            
            document.getElementById('new-folder-name').value = ''; // 모달 열때 입력창 비우기
            document.getElementById('folder-mgr-modal').classList.remove('hidden');
        }

        async function addNewFolderFromMgr() {
            const name = document.getElementById('new-folder-name').value.trim();
            if (!name) return alertPop("폴더 이름을 입력해 주세요.");
            
            await api(currentFolderMgrType === 'todo' ? '/api/folders' : '/api/note-folders', 'POST', {name});
            loadAll();
            setTimeout(() => openFolderMgr(currentFolderMgrType), 300); // 갱신된 폴더 목록 띄우기
        }

        async function updateFm(id, type) { const name=document.getElementById(`fm-in-${id}`).value; await api((type==='todo'?'/api/folders/':'/api/note-folders/')+id, 'PUT', {name}); loadAll(); setTimeout(()=>openFolderMgr(type), 300); }
        async function delFm(id, type) { if(await confirmPop("삭제?")) { await api((type==='todo'?'/api/folders/':'/api/note-folders/')+id, 'DELETE'); loadAll(); setTimeout(()=>openFolderMgr(type), 300); } }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
        function showEvTooltip(e, id) {
            const ev = events.find(x => x.id === id);
            if (!ev || !ev.note) return; // 상세 메모가 없으면 띄우지 않음

            const tt = document.getElementById('custom-tooltip');
            // 메모 안의 줄바꿈(\n)을 HTML 줄바꿈(<br>)으로 변환해서 보여줌
            tt.innerHTML = `<b style="color:#ffd700;">📝 상세 메모</b><br>` + ev.note.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

            // 마우스 커서의 우측 하단으로 툴팁 위치 이동 (커서를 따라다님)
            tt.style.left = (e.clientX + 15) + 'px';
            tt.style.top = (e.clientY + 15) + 'px';
            tt.classList.remove('hidden');
        }

        function hideEvTooltip() {
            document.getElementById('custom-tooltip').classList.add('hidden');
        }
        async function delCurrentNote() {
            if (!activeNoteId) {
                await alertPop("삭제할 메모가 선택되지 않았어!");
                return;
            }
            
            if (await confirmPop("정말 이 메모를 삭제할까?")) {
                await api(`/api/notes/${activeNoteId}`, 'DELETE');
                
                // 화면 초기화 (새 메모 상태로 변경)
                activeNoteId = null;
                document.getElementById('note-title').value = '';
                document.getElementById('note-content').value = '';
                document.getElementById('save-status').innerText = '';
                
                loadAll(); // 폴더 트리 새로고침
            }
        }

		// [추가됨] 한국 시간(로컬 타임존) 기준 YYYY-MM-DD 문자열을 반환하는 함수
		function getLocalDateStr(d = new Date()) {
		    const tzOffset = d.getTimezoneOffset() * 60000; // 분 단위를 밀리초로 변환
		    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
		}	
