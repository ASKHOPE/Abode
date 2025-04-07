<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useAuth } from '../components/useAuth';
import { useRouter } from 'vue-router';

const { currentUser, updateProfile, logout, isLoading, authError, isFetchingInitialUser } = useAuth();
const router = useRouter();

// Form state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const displayName = ref('');
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Pre-fill name when user data loads
watchEffect(() => {
  if (currentUser.value) {
    displayName.value = currentUser.value.name || '';
  }
});

const handleProfileUpdate = async () => {
  statusMessage.value = null; // Clear previous messages
  if (!currentUser.value) return; // Should not happen if view is protected

  const updates: { name?: string; currentPassword?: string; newPassword?: string } = {};

  // Check if name changed
  if (displayName.value !== (currentUser.value.name || '')) {
    updates.name = displayName.value;
  }

  // Check if password change is intended
  if (newPassword.value) {
    if (newPassword.value !== confirmPassword.value) {
      statusMessage.value = { type: 'error', text: 'New passwords do not match.' };
      return;
    }
    if (!currentPassword.value) {
       statusMessage.value = { type: 'error', text: 'Current password is required to set a new one.' };
      return;
    }
    updates.currentPassword = currentPassword.value;
    updates.newPassword = newPassword.value;
  }

  // Only call update if there are actual changes
  if (Object.keys(updates).length === 0) {
     statusMessage.value = { type: 'success', text: 'No changes detected.' }; // Or just do nothing
     return;
  }

  // Call the update function from useAuth
  const result = await updateProfile(updates);

  if (result.success) {
    statusMessage.value = { type: 'success', text: result.message || 'Profile updated successfully!' };
    // Clear password fields on success
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } else {
    statusMessage.value = { type: 'error', text: result.message || 'Failed to update profile.' };
  }
};

const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
        logout();
    }
}

</script>

<template>
  <div>
    <h1 class="ml-3 text-2xl font-bold text-primary mb-6">User Profile</h1>

    <div v-if="isFetchingInitialUser" class="card text-center">
        Loading profile...
    </div>
    <div v-else-if="!currentUser" class="card text-center text-red-600">
        Error: User data not available. Please try logging in again.
    </div>

    <div v-else class="space-y-8 max-w-lg mx-auto">
        <div class="card">
            <h2 class="text-lg font-semibold mb-3 text-gray-700">Account Information</h2>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Username:</span>
                    <span class="font-medium text-gray-800">{{ currentUser.username }}</span>
                </div>
                 <div class="flex justify-between">
                    <span class="text-gray-600">User ID:</span>
                    <span class="font-mono text-xs text-gray-500">{{ currentUser.id }}</span>
                </div>
            </div>
        </div>

        <div v-if="statusMessage"
             :class="[
                'p-3 rounded text-sm text-center',
                statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
             ]">
             {{ statusMessage.text }}
        </div>

        <form @submit.prevent="handleProfileUpdate" class="card space-y-4">
            <h2 class="text-lg font-semibold mb-3 text-gray-700">Update Profile</h2>
             <div>
               <label for="displayName" class="block text-sm font-medium text-gray-700">Display Name</label>
               <input
                 v-model="displayName"
                 type="text"
                 id="displayName"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                 placeholder="Your display name"
               />
             </div>

            <hr class="my-4">  

            <p class="text-sm text-gray-600">Change Password (optional):</p>
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                v-model="currentPassword"
                type="password"
                id="currentPassword"
                autocomplete="current-password"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="Required to change password"
              />
            </div>
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700">New Password</label>
              <input
                v-model="newPassword"
                type="password"
                id="newPassword"
                 minlength="6"
                 autocomplete="new-password"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="Leave blank to keep current"
              />
            </div>
             <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                v-model="confirmPassword"
                type="password"
                id="confirmPassword"
                autocomplete="new-password"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="Confirm new password"
                :disabled="!newPassword"  
              />
            </div>

            <div class="pt-2">
              <button type="submit" class="btn w-full" :disabled="isLoading">
                {{ isLoading ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
        </form>

         <div class="card text-center">
              <button @click="handleLogout" class="btn btn-danger">  
                  Log Out
              </button>
         </div>

    </div>
  </div>
</template>

<style scoped>
 .btn-danger {
     @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
 }
</style>