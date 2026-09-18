const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:4000/api`
  : `${window.location.origin}/api`;

const tabs = document.querySelectorAll('.auth-tab');
const loginSection = document.getElementById('loginSection');
const signupSection = document.getElementById('signupSection');

function showAuthTab(tab) {
  tabs.forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
  loginSection.classList.toggle('hidden', tab !== 'login');
  signupSection.classList.toggle('hidden', tab !== 'signup');
}

tabs.forEach(button => {
  button.addEventListener('click', () => showAuthTab(button.dataset.authTab));
});

function isGmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

async function submitAuth(path, email, password) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');

    window.location.href = 'overview.html';
  } catch (error) {
    alert(`${path === '/login' ? 'Login' : 'Signup'} failed: ${error.message}`);
  }
}

loginSection.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  if (!email || !password) return alert('Fill both fields');
  if (!isGmail(email)) return alert('Enter a valid Gmail address');

  await submitAuth('/login', email, password);
});

signupSection.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.getElementById('signupUser').value.trim();
  const password = document.getElementById('signupPass').value.trim();
  if (!email || !password) return alert('Fill both fields');
  if (!isGmail(email)) return alert('Enter a valid Gmail address');

  await submitAuth('/signup', email, password);
});
