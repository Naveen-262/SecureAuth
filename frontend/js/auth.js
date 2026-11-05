const API_URL = "/api/auth";

// Redirect based on user role
function redirectUser(user) {
    if (user && user.role === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

// Display error messages safely
function showMessage(messageElement, text, color = "red") {
    if (!messageElement) return;

    messageElement.textContent = text;
    messageElement.style.color = color;
}

// REGISTRATION
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");
        const button = document.getElementById("registerBtn");

        showMessage(message, "");

        button.disabled = true;
        button.textContent = "Creating account...";

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.errors?.[0]?.msg ||
                    "Registration failed"
                );
            }

            if (data.token) {
                localStorage.setItem("token", data.token);

                if (data.user) {
                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    );
                }

                redirectUser(data.user);
            } else {
                showMessage(
                    message,
                    "Registration successful! Please login.",
                    "green"
                );

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            }

        } catch (error) {
            showMessage(message, error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}


// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");
        const button = document.getElementById("loginBtn");

        showMessage(message, "");

        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.errors?.[0]?.msg ||
                    "Invalid email or password"
                );
            }

            if (!data.token) {
                throw new Error(
                    "Login response did not contain a token."
                );
            }

            // Save JWT token
            localStorage.setItem("token", data.token);

            // Save user information
            if (data.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            // Redirect based on role
            redirectUser(data.user);

        } catch (error) {
            showMessage(message, error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Login";
        }
    });
}