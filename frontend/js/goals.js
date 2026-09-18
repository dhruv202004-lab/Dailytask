const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:4000/api`
  : `${window.location.origin}/api`;
const addGoalBtn = document.getElementById('addGoal');
const gTitle = document.getElementById('gTitle');
const gNotes = document.getElementById('gNotes');
const goalsList = document.getElementById('goalsList');
const logoutBtn = document.getElementById('logout');

function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load goals
async function loadGoals(){
  const res = await fetch(`${API}/goals`, {credentials:'include'});
  if(res.ok){
    const data = await res.json();
    goalsList.innerHTML='';
    data.goals.forEach(g=>prependGoal(g));
  } else window.location.href='index.html';
}
loadGoals();

// Add new goal
addGoalBtn.addEventListener('click', async ()=>{
  const title = gTitle.value.trim();
  const notes = gNotes.value.trim();
  if(!title) return alert('Title required');

  try{
    const res = await fetch(`${API}/goals`, {
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({title,notes})
    });
    if(!res.ok) return alert('Error adding goal');
    const data = await res.json();
    gTitle.value=''; gNotes.value='';
    prependGoal(data.goal);
  } catch(err){
    console.error(err);
    alert('Network error');
  }
});

function prependGoal(goal){
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700">${escapeHtml(goal.title)}</div>
        <div class="small">${goal.notes||''}</div>
      </div>
      <div>
        <button data-id="${goal._id}" class="delGoal">Delete</button>
      </div>
    </div>
  `;
  goalsList.prepend(el);
  el.querySelector('.delGoal').addEventListener('click', async e=>{
    const id=e.target.dataset.id;
    await fetch(`${API}/goals/${id}`,{method:'DELETE',credentials:'include'});
    el.remove();
  });
}

// Logout
logoutBtn.addEventListener('click', async ()=>{
  await fetch(`${API}/logout`, {method:'POST', credentials:'include'});
  window.location.href='index.html';
});
