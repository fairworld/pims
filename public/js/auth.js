// public/js/auth.js

function toggleAuth(t) { document.getElementById('login-form').classList.toggle('hidden', t==='signup'); document.getElementById('signup-form').classList.toggle('hidden', t==='login'); }
function checkPw() { const pw=document.getElementById('signup-pw').value; const regex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/; const isValid=regex.test(pw); document.getElementById('pw-hint').className = 'pw-hint ' + (isValid ? 'valid' : 'invalid'); document.getElementById('signup-btn').disabled=!isValid; }
async function handleSignup() { const u=document.getElementById('signup-id').value; const p=document.getElementById('signup-pw').value; const res=await fetch('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) }); if(res.ok) { await alertPop("가입 요청 완료! 승인 후 로그인해 줘."); toggleAuth('login'); } else await alertPop("중복된 아이디야."); }
async function handleLogin() { const u=document.getElementById('login-id').value; const p=document.getElementById('login-pw').value; const res=await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) }); const data=await res.json(); if(res.ok) { localStorage.setItem('user_id', data.userId); if(data.isAdmin) showAdmin(); else location.reload(); } else await alertPop(data.error); }
function logout() { localStorage.clear(); location.reload(); }

async function showAdmin() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('admin-section').classList.remove('hidden');
    const res = await api('/api/admin/users');
    document.getElementById('admin-user-list').innerHTML = res.map(u => `<tr><td style="padding:15px">${u.id}</td><td>${u.username}</td><td>${u.is_approved?'✅ 승인됨':'⏳ 대기중'}</td><td>${!u.is_approved?`<button onclick="approveUser(${u.id})">승인</button>`:''} <button onclick="delUser(${u.id})">삭제</button></td></tr>`).join('');
}
async function approveUser(id) { await api(`/api/admin/users/${id}/approve`, 'PATCH'); showAdmin(); }
async function delUser(id) { if(await confirmPop("삭제할까?")) { await api(`/api/admin/users/${id}`, 'DELETE'); showAdmin(); } }
