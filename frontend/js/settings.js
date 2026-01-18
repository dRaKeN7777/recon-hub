async function changePassword() {
    const oldPass = document.getElementById("oldPass").value;
    const newPass = document.getElementById("newPass").value;
    const confirmPass = document.getElementById("confirmPass").value;
    const msg = document.getElementById("msg");

    if (!oldPass || !newPass || !confirmPass) {
        msg.innerText = "All fields are required";
        msg.className = "error";
        return;
    }

    if (newPass !== confirmPass) {
        msg.innerText = "New passwords do not match";
        msg.className = "error";
        return;
    }

    try {
        const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.token 
            },
            body: JSON.stringify({ 
                old_password: oldPass, 
                new_password: newPass 
            })
        });

        if (res.ok) {
            msg.innerText = "Password updated successfully";
            msg.className = "success";
            document.getElementById("oldPass").value = "";
            document.getElementById("newPass").value = "";
            document.getElementById("confirmPass").value = "";
        } else {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "login?expired=1";
                return;
            }
            const data = await res.json();
            msg.innerText = data.detail || "Failed to update password";
            msg.className = "error";
        }
    } catch (e) {
        console.error(e);
        msg.innerText = "An error occurred";
        msg.className = "error";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    requireAuth();
});
