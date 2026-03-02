// public/js/calendar.js

function renderCalendar() {
    const mode = document.getElementById('cal-view-mode').value;
    const grid = document.getElementById('large-cal-grid'); grid.innerHTML = '';
    const y = calDate.getFullYear(), m = calDate.getMonth(), d = calDate.getDate();
    
    grid.style.gridTemplateColumns = mode === 'day' ? '1fr' : 'repeat(7, 1fr)';
    
    if (mode === 'month') document.getElementById('cal-title').innerText = `${y}년 ${m+1}월`;
    else if (mode === 'week') {
        const ws = new Date(y, m, d - calDate.getDay());
        const we = new Date(ws.getTime() + 6 * 24*60*60*1000);
        document.getElementById('cal-title').innerText = `${ws.getMonth()+1}월 ${ws.getDate()}일 ~ ${we.getMonth()+1}월 ${we.getDate()}일`;
    } else {
        document.getElementById('cal-title').innerText = `${y}년 ${m+1}월 ${d}일`;
    }

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

    let cur = new Date(loopStart);
    while(cur <= loopEnd) {
        const ds = getLocalDateStr(cur); 
        const dayEvs = events.filter(e => isEventOnDate(e, ds));
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
            return `<div class="event-badge" draggable="true" style="background:${c.color}15; color:${c.color}; border-left:4px solid ${c.color}" ondragstart="evDragStart(event, ${e.id}, '${e.startDate}')" onclick="editEv(event, ${e.id})" onmousemove="showEvTooltip(event, ${e.id})" onmouseleave="hideEvTooltip()">${e.isAllDay?'':'['+e.startTime+'] '}${e.title}</div>`;
        }).join('');
        
        grid.innerHTML += `<div class="large-cal-box" style="${boxStyle}" onmousedown="dragStartStr='${ds}'" onmouseup="endCalDrag('${ds}')" ondragover="event.preventDefault()" ondrop="evDrop(event, '${ds}')">${dateHtml}${evsHtml}</div>`;
        cur.setDate(cur.getDate() + 1);
    }
}

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
    
    // 반복 초기화
    document.getElementById('ev-recur').value = 'none';
    document.getElementById('ev-recur-end').value = '';
    toggleEvRecurEnd();

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

function showEvTooltip(e, id) {
    const ev = events.find(x => x.id === id);
    if (!ev || !ev.note) return;
    const tt = document.getElementById('custom-tooltip');
    tt.innerHTML = `<b style="color:#ffd700;">📝 상세 메모</b><br>` + ev.note.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    tt.style.left = (e.clientX + 15) + 'px';
    tt.style.top = (e.clientY + 15) + 'px';
    tt.classList.remove('hidden');
}
function hideEvTooltip() { document.getElementById('custom-tooltip').classList.add('hidden'); }
function isEventOnDate(e, ds) {
    // 1. 원본 일정 기간 안에 속하면 무조건 표시
    if (ds >= e.startDate && ds <= e.endDate) return true;
    
    // 2. 반복이 없으면 더 볼 필요 없음
    if (!e.recurrence || e.recurrence === 'none') return false;
    
    // 3. 원래 시작일 이전이거나, 반복 종료일 이후면 제외
    if (ds < e.startDate) return false;
    if (e.recurrenceEndDate && ds > e.recurrenceEndDate) return false;

    // 4. 반복 주기 계산 로직
    const eStart = new Date(e.startDate);
    const curDate = new Date(ds);
    
    // 원래 일정이 며칠 동안 이어지는지 계산 (duration)
    const durationMs = new Date(e.endDate) - eStart;
    
    if (e.recurrence === 'daily') {
        return true; 
    } else if (e.recurrence === 'weekly') {
        // 일수 차이가 7의 배수인지 확인하여 다중 일수 이벤트도 깔끔하게 지원
        const diffDays = Math.floor((curDate - eStart) / (1000 * 60 * 60 * 24));
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
        const rem = diffDays % 7;
        return rem >= 0 && rem <= durationDays;
    } else if (e.recurrence === 'monthly') {
        const tempStart = new Date(curDate.getFullYear(), curDate.getMonth(), eStart.getDate());
        const tempEnd = new Date(tempStart.getTime() + durationMs);
        return curDate >= tempStart && curDate <= tempEnd;
    } else if (e.recurrence === 'yearly') {
        const tempStart = new Date(curDate.getFullYear(), eStart.getMonth(), eStart.getDate());
        const tempEnd = new Date(tempStart.getTime() + durationMs);
        return curDate >= tempStart && curDate <= tempEnd;
    }
    return false;
}
function toggleEvRecurEnd() {
    const recur = document.getElementById('ev-recur').value;
    document.getElementById('ev-recur-end-box').classList.toggle('hidden', recur === 'none');
}
function editEv(e, id) { 
    e.stopPropagation(); const ev = events.find(x => x.id === id); 
    document.getElementById('ev-id').value = ev.id; 
    document.getElementById('ev-title').value = ev.title; 
    document.getElementById('ev-sd').value = ev.startDate; 
    document.getElementById('ev-ed').value = ev.endDate; 
    document.getElementById('ev-st').value = ev.startTime; 
    document.getElementById('ev-et').value = ev.endTime; 
    document.getElementById('ev-allday').checked = ev.isAllDay===1; 
    document.getElementById('ev-cat').value = ev.category; 
    
    // 반복 불러오기
    document.getElementById('ev-recur').value = ev.recurrence || 'none';
    document.getElementById('ev-recur-end').value = ev.recurrenceEndDate || '';
    toggleEvRecurEnd();

    toggleEvTime(); document.getElementById('ev-del-btn').classList.remove('hidden'); document.getElementById('event-modal').classList.remove('hidden'); 
}

async function saveEvent() {
    const id = document.getElementById('ev-id').value;
    const payload = { 
        title: document.getElementById('ev-title').value, 
        startDate: document.getElementById('ev-sd').value, 
        endDate: document.getElementById('ev-ed').value, 
        startTime: document.getElementById('ev-st').value, 
        endTime: document.getElementById('ev-et').value, 
        isAllDay: document.getElementById('ev-allday').checked?1:0, 
        category: document.getElementById('ev-cat').value, 
        note: document.getElementById('ev-note').value,
        recurrence: document.getElementById('ev-recur').value,
        recurrenceEndDate: document.getElementById('ev-recur-end').value
    };
    if(!payload.title) return alertPop("제목을 입력해 줘!");
    await api(id ? `/api/events/${id}` : '/api/events', id ? 'PUT' : 'POST', payload);
    closeModal('event-modal'); loadAll();
}
