<script setup lang="ts">
import { onMounted, computed } from 'vue'; // Import computed
import { RouterLink, RouterView } from 'vue-router';
import { useAuth } from './components/useAuth'; // Corrected path assuming composables dir
import { db } from './services/db';
import { seedUsers, seedProperties, seedTenants, seedPayments, seedTodos } from './services/seedData';

// Destructure isFetchingInitialUser as well
const { isAuthenticated, currentUser, logout, isFetchingInitialUser } = useAuth();

async function seedDatabaseIfNeeded() {
  console.log('Checking if database seeding is needed...');
  try {
    const existingUsers = await db.getUsers();
    if (existingUsers && existingUsers.length > 0) {
      console.log('Database already contains users. Skipping seeding.');
      return;
    }
    console.log('Database appears empty. Seeding initial data...');
    await Promise.all([
      ...seedUsers.map(user => db.addUser(user).catch(e => console.error(`Error seeding user ${user.username}:`, e))),
      ...seedProperties.map(prop => db.addProperty(prop).catch(e => console.error(`Error seeding property ${prop.name}:`, e))),
      ...seedTenants.map(tenant => db.addTenant(tenant).catch(e => console.error(`Error seeding tenant ${tenant.name}:`, e))),
      ...seedPayments.map(payment => db.addPayment(payment).catch(e => console.error(`Error seeding payment ID ${payment.id}:`, e))),
      ...seedTodos.map(todo => db.addTodo(todo).catch(e => console.error(`Error seeding todo ${todo.text}:`, e))),
    ]);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error during database seeding check or process:', error);
  }
}

onMounted(() => {
  seedDatabaseIfNeeded();
});
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background">

    <header class="bg-surface text-foreground shadow-sm sticky top-0 z-40">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <RouterLink
          to="/"
          class="text-3xl  text-primary  tracking-tight hover:opacity-80 transition-opacity duration-150 ease-in-out"
          >
          Abode
        </RouterLink>

        <div class="flex items-center space-x-4">
           <div v-if="isFetchingInitialUser" class="text-sm text-foreground-muted">Loading...</div>
           <RouterLink
               v-else-if="isAuthenticated && currentUser"
               :to="{ name: 'profile' }"
               class="text-sm text-foreground hover:text-primary transition-colors duration-150 ease-in-out"
               title="Manage your profile"
            >
               {{ currentUser.name || currentUser.username }}!
           </RouterLink>

           <button v-if="isAuthenticated" @click="logout" class="btn btn-sm btn-outline">
               Logout
           </button>
        </div>
       </div>
    </header>


        <main class="relative flex-grow container mx-auto px-4 py-6 w-[320px] min-h-50vh">
  <div class="absolute top-[40vh] left-1/2 -translate-x-1/2 w-[320px] opacity-60">
    <img src="/logo.png" alt="Abode Logo" class="w-full h-auto object-contain" />
  </div>
  <div class="relative z-10">

      <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
              <component :is="Component" />
          </transition>
      </RouterView>
  

   </div>
    </main>
    <footer class="mt-auto  text-foreground-muted">
        <RouterLink
            to="/aboutus" 
            class="block w-full bg-surface py-5 px-4 text-center shadow-inner border-t border-gray-200 transition duration-200 ease-in-out hover:bg-primary group"  
            title="Learn more about Abode"
        >
            <div class="container mx-auto flex items-center justify-center space-x-2 text-foreground-muted">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-foreground-muted group-hover:text-foreground-inverted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-medium text-foreground group-hover:text-foreground-inverted transition-colors">
                    About Abode © {{ new Date().getFullYear() }}
                </span>
            </div>
        </RouterLink>
    </footer>

  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
/* btn-outline uses primary defined in config */
.btn-outline { @apply bg-transparent border border-primary text-primary hover:bg-primary hover:text-foreground-inverted; } /* Updated hover text to inverted */
.btn-sm { @apply px-3 py-1.5 text-xs; }
</style>