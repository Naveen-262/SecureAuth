const token = localStorage.getItem("token");

const usersTable = document.getElementById("usersTable");
const statusMessage = document.getElementById("statusMessage");
const searchInput = document.getElementById("searchInput");

let searchTimer;

// API REQUEST
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid server response");
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// CHECK ADMIN ACCESS
async function checkAdmin() {
    if (!token) {
        window.location.replace("login.html");
        return false;
    }

    try {
        const data = await apiRequest("/api/auth/me");
        const user = data.user || data;

        if (user.role !== "admin") {
            alert("Access denied. Admin privileges required.");
            window.location.replace("dashboard.html");
            return false;
        }

        return true;

    } catch (error) {
        localStorage.removeItem("token");
        window.location.replace("login.html");
        return false;
    }
}

// LOAD ANALYTICS
async function loadAnalytics() {
    try {
        const data = await apiRequest("/api/admin/analytics");

        // Matches backend response: { stats: {...} }
        const stats = data.stats || data.analytics || data;

        document.getElementById("totalUsers").textContent =
            stats.totalUsers ?? 0;

        document.getElementById("totalAdmins").textContent =
            stats.totalAdmins ?? 0;

        document.getElementById("regularUsers").textContent =
            stats.regularUsers ?? 0;

    } catch (error) {
        console.error("Analytics error:", error);
        statusMessage.textContent = error.message;
    }
}

// SHOW TABLE MESSAGE
function showTableMessage(message) {
    usersTable.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.textContent = message;

    row.appendChild(cell);
    usersTable.appendChild(row);
}

// LOAD USERS
async function loadUsers(search = "") {
    showTableMessage("Loading users...");

    try {
        const url = `/api/admin/users?search=${encodeURIComponent(search)}`;

        const data = await apiRequest(url);

        const users = Array.isArray(data)
            ? data
            : data.users || [];

        usersTable.replaceChildren();

        if (users.length === 0) {
            showTableMessage("No users found.");
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");

            // NAME
            const name = document.createElement("td");
            name.textContent = user.name || "Unknown";

            // EMAIL
            const email = document.createElement("td");
            email.textContent = user.email || "Unknown";

            // ROLE
            const roleCell = document.createElement("td");
            const role = document.createElement("span");

            role.className = "role";
            role.textContent = user.role || "user";

            roleCell.appendChild(role);

            // JOINED DATE
            const joined = document.createElement("td");

            joined.textContent = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A";

            // ACTION
            const action = document.createElement("td");

            if (user.role !== "admin") {
                const deleteButton = document.createElement("button");

                deleteButton.className = "delete-btn";
                deleteButton.textContent = "Delete";

                deleteButton.addEventListener("click", () => {
                    deleteUser(user._id);
                });

                action.appendChild(deleteButton);

            } else {
                action.textContent = "Protected";
            }

            row.append(
                name,
                email,
                roleCell,
                joined,
                action
            );

            usersTable.appendChild(row);
        });

        statusMessage.textContent = "";

    } catch (error) {
        console.error("Load users error:", error);

        statusMessage.textContent = error.message;

        showTableMessage("Unable to load users.");
    }
}

// DELETE USER
async function deleteUser(userId) {
    if (!userId) {
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this user?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `/api/admin/users/${encodeURIComponent(userId)}`,
            {
                method: "DELETE"
            }
        );

        statusMessage.textContent = "User deleted successfully.";

        await Promise.all([
            loadUsers(searchInput.value.trim()),
            loadAnalytics()
        ]);

    } catch (error) {
        statusMessage.textContent = error.message;
    }
}

// SEARCH USERS
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        loadUsers(searchInput.value.trim());
    }, 300);
});

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.replace("login.html");
});

// START ADMIN DASHBOARD
async function startAdminDashboard() {
    const allowed = await checkAdmin();

    if (allowed) {
        await Promise.all([
            loadAnalytics(),
            loadUsers()
        ]);
    }
}

startAdminDashboard();