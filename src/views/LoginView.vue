<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuth } from '../components/useAuth';

const username = ref('');
const password = ref('');
const { login, isLoading, authError } = useAuth();
const router = useRouter();
const route = useRoute();

const handleLogin = async () => {
  console.log('LoginView: Attempting login...');
  const success = await login(username.value, password.value);
  console.log('LoginView: Login success status:', success);

  if (success) {
    const redirectPath = route.query.redirect || { name: 'home' }; // CHANGE DEFAULT REDIRECT
    console.log('LoginView: Login successful, attempting redirect to:', redirectPath);
    try {
      await router.push(redirectPath); // Redirect to original destination or home
      console.log('LoginView: Redirect attempt finished.');
    } catch (error) {
      console.error('LoginView: Error during router push after login:', error);
    }
  } else {
    console.log('LoginView: Login failed, no redirect.');
  }
};
</script>

<template>
   <div class="flex items-center justify-center min-h-[calc(100vh-150px)]">
    <div class="card w-full max-w-sm">
      <h1 class="text-2xl font-bold text-primary text-center mb-6">Sign In</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
          <input v-model="username" type="text" id="username" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input v-model="password" type="password" id="password" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
        </div>
        <div v-if="authError" class="text-red-600 text-sm text-center bg-red-100 p-2 rounded">{{ authError }}</div>
        <div>
          <button type="submit" class="btn w-full" :disabled="isLoading">{{ isLoading ? 'Signing In...' : 'Sign In' }}</button>
        </div>
        <div class="text-center text-sm mt-4">
          <span class="text-gray-600">Don't have an account?</span>
          <RouterLink to="/register" class="ml-1 font-medium text-primary hover:underline">Register here</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>