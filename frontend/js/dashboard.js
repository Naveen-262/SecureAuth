const API_URL = "/api/auth";

// Check authentication token
const token = localStorage.getItem("token");

// Redirect if token is missing
if (!token) {
    localStorage.removeItem("user");
    window.location.replace("login.html");
} else {
    loadDashboard();
}


// ======================================
// LOAD USER DASHBOARD
// ======================================

async function loadDashboard() {

    try {

        const response = await fetch(`${API_URL}/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        // Authentication error
        if (response.status === 401 || response.status === 403) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.replace("login.html");
            return;
        }

        // Other server errors
        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load dashboard"
            );
        }

        // Get user information
        const user = data.user || data;

        // Update dashboard safely
        const userName = document.getElementById("userName");
        const profileName = document.getElementById("profileName");
        const profileEmail = document.getElementById("profileEmail");
        const createdAt = document.getElementById("createdAt");

        if (userName) {
            userName.textContent = user.name || "User";
        }

        if (profileName) {
            profileName.textContent = user.name || "Not available";
        }

        if (profileEmail) {
            profileEmail.textContent = user.email || "Not available";
        }

        // Format account creation date
        let formattedDate = "Not available";

        if (user.createdAt) {

            const date = new Date(user.createdAt);

            if (!Number.isNaN(date.getTime())) {

                formattedDate = date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });

            }
        }

        if (createdAt) {
            createdAt.textContent = formattedDate;
        }

        // Save updated user information
        localStorage.setItem("user", JSON.stringify(user));

        console.log("Dashboard loaded successfully");

    } catch (error) {

        console.error("Dashboard Error:", error);

        const userName = document.getElementById("userName");
        const profileName = document.getElementById("profileName");

        if (userName) {
            userName.textContent = "Unable to load profile";
        }

        if (profileName) {
            profileName.textContent = "Please try again later";
        }

    }

}


// ======================================
// LOGOUT FUNCTIONALITY
// ======================================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        // Clear authentication data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        console.log("User logged out successfully");

        // Redirect to login page
        window.location.replace("login.html");

    });

}