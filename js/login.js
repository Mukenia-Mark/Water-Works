import {checkAuth, login, register } from "./auth.js";

document.addEventListener("DOMContentLoaded", function() {
    // Add a small delay to ensure any pending logout cleanup completes
    setTimeout(() => {
      if (checkAuth()) {
        window.location.href="customer-management.html";
      }
    }, 200);

    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const switchToRegister = document.getElementById("switchToRegister");
    const switchToLogin = document.getElementById("switchToLogin");
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");

    // Switch between login and register forms
    if (switchToRegister) {
        switchToRegister.addEventListener("click", function (e) {
            e.preventDefault();
            loginSection.style.display = "none";
            registerSection.style.display = "block";
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener("click", function (e) {
            e.preventDefault();
            registerSection.style.display = "none";
            loginSection.style.display = "block";
        });
    }

    // Login form submission
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (email && password) {
            const result = await login(email, password);

            if (result && result.success) {
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href="customer-management.html";
                }, 1000);
            } else {
                showMessage(result?.error || 'Login failed', 'error');
            }
        } else {
            showMessage('Please enter email and password', 'error');
        }
    });

    // Register form submission
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const username = document.getElementById("regUsername").value;
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;

            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }

            if (username && email && password) {
                const result = await register(email, password, username);

                if (result.success) {
                    showMessage(result.message, 'success');
                    // Switch back to log-in after successful registration
                    setTimeout(() => {
                        registerSection.style.display = "none";
                        loginSection.style.display = "block";
                        registerForm.reset();
                    }, 3000);
                } else {
                    showMessage(result.error, 'error');
                }
            } else {
                showMessage('Please fill in all the fields', 'error');
            }
        });
    }

    function showMessage(message, type) {
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = "block";
            errorMsg.className = `message ${type}`

            setTimeout(() => {
                errorMsg.style.display = "none";
            }, 5000);
        }
    }
});