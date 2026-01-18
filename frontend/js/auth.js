function saveSession(t, r) {
  localStorage.setItem("token", t);
  localStorage.setItem("role", r);
}

function logout() {
  localStorage.clear();
  location.href = "login";
}

function requireAuth(role=null) {
  const t = localStorage.token;
  const r = localStorage.role;
  if (!t || (role && role !== r)) location.href = "login";
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// Global login function (used by login.html)
window.login = async function() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const codeInput = document.getElementById("code");
  const otpContainer = document.getElementById("otp-container");
  const msg = document.getElementById("msg");
  const loginBtn = document.getElementById("loginBtn");

  const username = usernameInput.value;
  const password = passwordInput.value;
  const code = codeInput.value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username: username,
      password: password,
      otp: code
    })
  });

  const data = await res.json();
  if (!res.ok) {
      console.error("Login failed:", res.status, data);
      msg.innerText = `${data.detail} (Status: ${res.status})`;
      msg.className = "error";
      return;
  }
  
  if (data.status === "2fa_required") {
      msg.innerText = "Credentials verified. Please enter 2FA code.";
      msg.className = "success";
      
      // Hide credential inputs and show OTP input
      usernameInput.style.display = "none";
      passwordInput.style.display = "none";
      otpContainer.style.display = "block";
      
      loginBtn.innerText = "Verify 2FA";
      return;
  }

  if (!data.access_token) {
      msg.innerText = "Error: No access token received from server.";
      msg.className = "error";
      console.error("Login missing token:", data);
      return;
  }

  saveSession(data.access_token, data.role);
  location.href = "dashboard";
}

// Global register function (used by register.html)
window.register = async function() {
  const username = document.getElementById("r_username").value;
  const password = document.getElementById("r_password").value;
  const msg = document.getElementById("r_msg");
  const qr = document.getElementById("qr");

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username: username,
      password: password
    })
  });

  const data = await res.json();
  if (!res.ok) {
    msg.innerText = data.detail;
    msg.className = "error";
    return;
  }

  msg.innerText = "Success! Scan QR with Authenticator App";
  msg.className = "success";
  
  qr.src = data.qr;
  qr.classList.remove("hidden");
}
