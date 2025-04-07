// src/composables/useAuth.ts

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { User } from '../types';
import { db } from '../services/db';

// --- State ---
// Update session key and variable names
const sessionKey = 'abode_auth_user_username'; // Changed key
const initialUsername = sessionStorage.getItem(sessionKey); // Changed variable name

const isAuthenticated = ref<boolean>(!!initialUsername);
const currentUser = ref<User | null>(null);
const authError = ref<string | null>(null);
const isLoading = ref<boolean>(false);
const isFetchingInitialUser = ref<boolean>(!!initialUsername); 

// --- Refetch user data if authenticated on load ---
if (initialUsername) {
    isLoading.value = true; // Use general isLoading or specific one
    isFetchingInitialUser.value = true;
    db.getUserByUsername(initialUsername)
      .then(user => {
        if (user) {
            currentUser.value = user; // Store the full user object
        } else {
            console.warn(`Username ${initialUsername} found in session, but no user in DB. Logging out.`);
            sessionStorage.removeItem(sessionKey);
            isAuthenticated.value = false;
        }
      })
      .catch((err) => {
          console.error("Error fetching user data on initial load:", err);
          sessionStorage.removeItem(sessionKey);
          isAuthenticated.value = false;
      })
      .finally(() => {
          isLoading.value = false;
          isFetchingInitialUser.value = false; // Mark initial fetch done
      });
} else {
    isFetchingInitialUser.value = false; // Not fetching initially
}

// --- Composable Function ---
export function useAuth() {
    const router = useRouter();

    // --- Login Logic (Modified) ---
    async function login(username: string, password: string): Promise<boolean> { // Changed param from email to username
        isLoading.value = true;
        authError.value = null;
        try {
            // Use getUserByUsername
            const user = await db.getUserByUsername(username);
            if (user && user.password === password) { // Plain text comparison (INSECURE!)
                currentUser.value = user;
                isAuthenticated.value = true;
                sessionStorage.setItem(sessionKey, user.username); // Store username
                console.log('Login successful for:', user.username); // Log username
                return true;
            } else {
                authError.value = 'Invalid username or password.'; // Updated message
                console.log('Login failed: Invalid credentials');
                return false;
            }
        } catch (e) {
            console.error("Login error:", e);
            authError.value = 'An error occurred during login.';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // --- Register Logic (Modified) ---
    async function register(username: string, name: string, password: string): Promise<boolean> { // Changed param from email to username
        isLoading.value = true;
        authError.value = null;
        try {
            const newUser: User = {
                id: crypto.randomUUID(),
                username: username, // Use username
                name: name,
                password: password, // Storing plaintext (INSECURE!)
            };
            const result = await db.addUser(newUser);
            if (result.success) {
                 console.log('Registration successful for:', username); // Log username
                // Optional: Automatically log the user in after registration
                // await login(username, password);
                return true;
            } else {
                authError.value = result.message || 'Registration failed.';
                 console.log('Registration failed:', authError.value);
                return false;
            }
        } catch (e) {
            console.error("Registration error:", e);
            authError.value = 'An error occurred during registration.';
            return false;
        } finally {
            isLoading.value = false;
        }
    }


     // --- NEW: Update Profile Logic ---
     async function updateProfile(
        updates: { name?: string; currentPassword?: string; newPassword?: string }
    ): Promise<{ success: boolean; message?: string }> {
        // Ensure user is logged in and data is loaded
        if (!currentUser.value || !isAuthenticated.value) {
            return { success: false, message: 'User not authenticated.' };
        }

        isLoading.value = true;
        authError.value = null; // Clear previous errors

        try {
            const userToUpdate = { ...currentUser.value }; // Create a copy to modify
            let passwordChanged = false;

            // --- Password Change Logic ---
            if (updates.newPassword) {
                // Require current password if changing password
                if (!updates.currentPassword) {
                    return { success: false, message: 'Current password is required to set a new password.' };
                }
                // Verify current password (INSECURE plaintext check)
                if (updates.currentPassword !== userToUpdate.password) {
                    return { success: false, message: 'Incorrect current password.' };
                }
                 if (updates.newPassword.length < 6) { // Basic validation
                     return { success: false, message: 'New password must be at least 6 characters long.' };
                 }
                // Update password on the copy
                userToUpdate.password = updates.newPassword;
                passwordChanged = true;
                console.log('useAuth: Password prepared for update.');
            }

            // --- Name Change Logic ---
            if (updates.name !== undefined && updates.name !== userToUpdate.name) {
                 userToUpdate.name = updates.name.trim() || undefined; // Use undefined if name is empty string after trim
                 console.log('useAuth: Name prepared for update.');
            }

            // --- Call DB Update ---
            const result = await db.updateUser(userToUpdate);

            if (result.success) {
                // --- IMPORTANT: Update the local reactive state ---
                currentUser.value = userToUpdate;
                console.log('useAuth: User profile updated successfully.');
                return { success: true, message: passwordChanged ? 'Profile and password updated.' : 'Profile updated.' };
            } else {
                authError.value = result.message || 'Profile update failed.';
                console.log('useAuth: Profile update failed:', authError.value);
                return { success: false, message: authError.value };
            }

        } catch (e) {
            console.error("Update profile error:", e);
            authError.value = 'An error occurred during profile update.';
            return { success: false, message: authError.value };
        } finally {
            isLoading.value = false;
        }
    }

    // --- Logout Logic ---
    function logout() {
        console.log('Logging out user:', currentUser.value?.username); // Log username
        currentUser.value = null;
        isAuthenticated.value = false;
        authError.value = null;
        sessionStorage.removeItem(sessionKey);
        router.push({ name: 'login' });
    }

    // Return the reactive state and methods
    return {
        isAuthenticated,
        currentUser,
        authError,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
    };
}