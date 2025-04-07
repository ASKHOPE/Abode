<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../components/useAuth';

const name = ref('');
const username = ref(''); // Changed from email
const password = ref('');
const { register, isLoading, authError } = useAuth();
const router = useRouter();

const handleRegister = async () => {
  // Pass username instead of email
  const success = await register(username.value, name.value, password.value);
  if (success) {
    alert('Registration successful! Please sign in.');
    router.push('/login');
  }
};
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-150px)]">
    <div class="card w-full max-w-sm">
      <h1 class="text-2xl font-bold text-primary text-center mb-6">Register</h1>
      <form @submit.prevent="handleRegister" class="space-y-4">
         <div>
           <label for="name" class="block text-sm font-medium text-gray-700">Name </label>
           <input
             v-model="name"
             type="text"
             id="name"
             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
           />
         </div>
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
          <input
            v-model="username"
            type="text"  
            id="username"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            v-model="password"
            type="password"
            id="password"
            required
             minlength="6"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

         <div v-if="authError" class="text-red-600 text-sm text-center bg-red-100 p-2 rounded">
           {{ authError }}
         </div>

        <div>
          <button type="submit" class="btn w-full" :disabled="isLoading">
            {{ isLoading ? 'Registering...' : 'Register' }}
          </button>
        </div>

         <div class="text-center text-sm mt-4">
           <span class="text-gray-600">Already have an account?</span>
           <RouterLink to="/login" class="ml-1 font-medium text-primary hover:underline">
             Sign in here
           </RouterLink>
         </div>
      </form>
    </div>
  </div>
</template>