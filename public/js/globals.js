// public/js/globals.js

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
let currentFolderMgrType = ''; 
let draggedTodoFolderId = null;
let draggedNoteFolderId = null;

const guideLabel = document.getElementById('drag-guide-label');

// --- [공통 API 함수] ---
const api = async (url, method='GET', body=null) => {
    const headers = { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('user_id') };
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401) { logout(); return; }
    return res.json();
};

// --- [날짜 및 모달 유틸리티] ---
function getLocalDateStr(d = new Date()) {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- [팝업 헬퍼] ---
function alertPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.add('hidden'); document.getElementById('dialog-cancel').classList.add('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-ok').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(true);}; }); }
function confirmPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.add('hidden'); document.getElementById('dialog-cancel').classList.remove('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-ok').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(true);}; document.getElementById('dialog-cancel').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(false);}; }); }
function promptPop(msg) { return new Promise(res => { document.getElementById('dialog-msg').innerText=msg; document.getElementById('dialog-input-box').classList.remove('hidden'); document.getElementById('dialog-input-val').value=''; document.getElementById('dialog-cancel').classList.remove('hidden'); document.getElementById('custom-dialog').classList.remove('hidden'); document.getElementById('dialog-input-val').focus(); document.getElementById('dialog-ok').onclick=()=>{const v=document.getElementById('dialog-input-val').value; document.getElementById('custom-dialog').classList.add('hidden'); res(v);}; document.getElementById('dialog-cancel').onclick=()=>{document.getElementById('custom-dialog').classList.add('hidden'); res(null);}; }); }

// --- [공휴일 데이터] ---
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
