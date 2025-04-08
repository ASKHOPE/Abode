<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Tenant, Property, RentPayment, TodoItem } from '../types';
import { db } from '../services/db';

// --- State ---
const tenants = ref<Tenant[]>([]);
const properties = ref<Property[]>([]);
const payments = ref<RentPayment[]>([]);
const todos = ref<TodoItem[]>([]);

const isLoading = ref(true);
const errorLoading = ref<string | null>(null);
const newTodoText = ref('');

// --- Lifecycle ---
onMounted(async () => {
  // ... (onMounted remains the same - fetching all data) ...
  console.log('ActionCenter: Mounting...');
  isLoading.value = true;
  errorLoading.value = null;
  try {
    const results = await Promise.all([
      db.getProperties(), db.getTenants(), db.getPayments(), db.getTodos()
    ]);
    properties.value = results[0];
    tenants.value = results[1];
    payments.value = results[2];
    todos.value = results[3];
    console.log('ActionCenter: Data fetched successfully.', { /* counts */ });
  } catch (error) {
    console.error("ActionCenter: Error fetching data:", error);
    errorLoading.value = "Failed to load data.";
  } finally {
    isLoading.value = false;
    console.log('ActionCenter: Loading finished.');
  }
});

// --- Helper Functions ---
// ... (Keep existing helpers: getPropertyName, getPropertyArchivedStatus, isTenantEffectivelyArchived, getLatestPaymentStatus) ...
const getPropertyName = (propertyId: string): string => {
    if (!properties.value || properties.value.length === 0) return 'Loading...';
    const property = properties.value.find(p => p.id === propertyId);
    return property ? property.name : 'Unknown Property';
};
const getPropertyArchivedStatus = (propertyId: string): boolean => {
    if (!properties.value || properties.value.length === 0) return false;
    const property = properties.value.find(p => p.id === propertyId);
    return !!(property && property.archive);
};
const isTenantEffectivelyArchived = (tenant: Tenant | undefined): boolean => {
    if (!tenant) return true;
    return !!tenant.archive || getPropertyArchivedStatus(tenant.propertyId);
};
const getLatestPaymentStatus = (tenantId: string): string | null => {
    if (!payments.value || payments.value.length === 0) return null;
    const tenantPayments = payments.value
        .filter(p => p.tenantId === tenantId)
        .filter(p => p.date && !isNaN(new Date(p.date).getTime()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (tenantPayments.length > 0 && tenantPayments[0].status) {
        return tenantPayments[0].status.toLowerCase();
    }
    return null;
};

// --- Computed Properties for Alerts & Todos ---

const expiringLeases = computed(() => {
  // ... (keep expiringLeases as is) ...
  if (isLoading.value || errorLoading.value || tenants.value.length === 0) return [];
  const today = new Date(); today.setHours(0,0,0,0);
  const threeMonthsFromNow = new Date(today); threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  return tenants.value.filter(tenant => {
    if (isTenantEffectivelyArchived(tenant) || !tenant.leaseEnd) return false;
    try { const leaseEndDate = new Date(tenant.leaseEnd); if (isNaN(leaseEndDate.getTime())) return false; return leaseEndDate >= today && leaseEndDate <= threeMonthsFromNow; } catch { return false; }
  }).sort((a, b) => { try { return new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime(); } catch { return 0; } });
});

const overdueTenants = computed(() => {
  // ... (keep overdueTenants as is) ...
   if (isLoading.value || errorLoading.value || tenants.value.length === 0) return [];
   return tenants.value.filter(tenant => {
    if (isTenantEffectivelyArchived(tenant)) return false;
    const latestStatus = getLatestPaymentStatus(tenant.id);
    return latestStatus === 'overdue';
  });
});

const allTodosSorted = computed(() => {
  // ... (keep allTodosSorted as is) ...
  if (isLoading.value || errorLoading.value) return [];
  return [...todos.value].sort((a, b) => { if (a.completed === b.completed) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); } else { return a.completed ? 1 : -1; } });
});

// --- NEW: Computed Property for Monthly Rent Status ---
const monthlyRentStatus = computed(() => {
    if (isLoading.value || errorLoading.value || tenants.value.length === 0) {
        return {
            activeTenantsCount: 0,
            paidTenantsCount: 0,
            totalExpectedRent: 0,
            totalCollectedThisMonth: 0,
        };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 for Jan, 11 for Dec)
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Day 0 of next month = last day of current month
    endOfMonth.setHours(23, 59, 59, 999); // Include the whole last day

    let activeTenantsCount = 0;
    let paidTenantsCount = 0;
    let totalExpectedRent = 0;
    let totalCollectedThisMonth = 0;

    // 1. Active tenants and total expected rent
    const activeTenants = tenants.value.filter(tenant =>
        !isTenantEffectivelyArchived(tenant) && tenant.rent > 0
    );
    activeTenantsCount = activeTenants.length;
    totalExpectedRent = activeTenants.reduce((sum, tenant) => sum + (tenant.rent || 0), 0);

    // 2. Payments made within the current calendar month
    const paymentsThisMonth = payments.value.filter(p => {
        try {
            const paymentDate = new Date(p.date);
            return !isNaN(paymentDate.getTime()) && paymentDate >= startOfMonth && paymentDate <= endOfMonth;
        } catch {
            return false;
        }
    });

    // 3. Calculate total collected this month
    totalCollectedThisMonth = paymentsThisMonth.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Count how many active tenants paid *at least* their rent amount this month
    activeTenants.forEach(tenant => {
        const tenantPaymentsThisMonth = paymentsThisMonth
            .filter(p => p.tenantId === tenant.id);

        const sumPaidByTenantThisMonth = tenantPaymentsThisMonth
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Count as 'paid' if the sum of payments this month meets or exceeds their rent
        if (sumPaidByTenantThisMonth >= tenant.rent) {
            paidTenantsCount++;
        }
     
    });

    return {
        activeTenantsCount,
        paidTenantsCount,
        totalExpectedRent,
        totalCollectedThisMonth,
        currentMonthName: now.toLocaleString('default', { month: 'long' }), // For display
        currentYear: currentYear // For display
    };
});


// --- Todo Methods (using db service) ---
// ... (Keep addTodo, toggleComplete, deleteTodo methods as they are) ...
async function addTodo() {
  const text = newTodoText.value.trim(); if (!text) return;
  const newTodo: TodoItem = { id: crypto.randomUUID(), text: text, completed: false, createdAt: new Date().toISOString() };
  try { await db.addTodo(newTodo); todos.value = await db.getTodos(); newTodoText.value = ''; } catch (error) { console.error("ActionCenter: Failed to add todo to DB:", error); alert("Error saving task."); }
}
async function toggleComplete(todo: TodoItem) {
  const updatedTodo = { ...todo, completed: !todo.completed };
  try { await db.updateTodo(updatedTodo); todos.value = await db.getTodos(); } catch (error) { console.error(`ActionCenter: Failed to update todo completion for ID ${todo.id}:`, error); alert("Error updating task status."); }
}
async function deleteTodo(id: string) {
  try { await db.deleteTodo(id); todos.value = await db.getTodos(); } catch (error) { console.error(`ActionCenter: Failed to delete todo ID ${id}:`, error); alert("Error deleting task."); }
}

// --- Helper to format currency ---
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
}

</script>

<template>
  <section class="space-y-6">
    <h2 class="text-xl font-semibold text-primary mb-0">Alerts & Todo</h2>

    <!-- Loading / Error State -->
    <div v-if="isLoading" class="card text-center text-gray-500 py-4">
      Loading Actions & Alerts...
    </div>
    <div v-else-if="errorLoading" class="card text-center text-red-600 py-4">
      {{ errorLoading }}
    </div>

    <!-- Content -->
    <div v-else>
        <!-- Alerts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Lease Expiry Alerts -->
             <div class="card h-full flex flex-col">
                 <h3 class="text-lg font-semibold mb-3 text-orange-600 flex items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     Expiring Leases (3 Mo.)
                 </h3>
                 <div class="flex-grow space-y-3 overflow-y-auto max-h-60 pr-2 custom-scrollbar">
                     <div v-if="expiringLeases.length > 0">
                         <div v-for="tenant in expiringLeases" :key="tenant.id" class="text-sm border-b border-gray-100 pb-2 last:border-b-0">
                             <p class="font-medium text-gray-800">{{ tenant.name }}</p>
                             <p class="text-gray-600 text-xs">{{ getPropertyName(tenant.propertyId) }}</p>
                             <p class="text-orange-700 font-semibold">Expires: {{ new Date(tenant.leaseEnd).toLocaleDateString() }}</p>
                         </div>
                     </div>
                     <p v-else class="text-sm text-gray-500 italic mt-2">No active leases expiring soon.</p>
                 </div>
             </div>
             <!-- Overdue Rent Reminders -->
             <div class="card h-full flex flex-col">
                 <h3 class="text-lg font-semibold mb-3 text-red-600 flex items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     Overdue Rent
                 </h3>
                 <div class="flex-grow space-y-3 overflow-y-auto max-h-60 pr-2 custom-scrollbar">
                     <div v-if="overdueTenants.length > 0">
                         <div v-for="tenant in overdueTenants" :key="tenant.id" class="text-sm border-b border-gray-100 pb-2 last:border-b-0">
                             <p class="font-medium text-gray-800">{{ tenant.name }}</p>
                             <p class="text-gray-600 text-xs">{{ getPropertyName(tenant.propertyId) }}</p>
                             <p class="text-red-700 font-semibold">Status: Overdue</p>
                         </div>
                     </div>
                     <p v-else class="text-sm text-gray-500 italic mt-2">No tenants currently marked as overdue.</p>
                 </div>
             </div>
        </div> <!-- End Alerts Grid -->

        <!-- Full Width To-Do List -->
        <div class="card mb-6">
            <h3 class="text-lg font-semibold mb-3 text-blue-600 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                To-Do List
            </h3>
            <form @submit.prevent="addTodo" class="flex space-x-2 mb-3">
                <input type="text" v-model="newTodoText" placeholder="Add a task..." required class="flex-grow block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm" />
                <button type="submit" class="btn btn-sm flex-shrink-0">Add</button>
            </form>
            <div id="todo-list-container" class="space-y-2 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
                <div v-if="allTodosSorted.length > 0">
                     <div v-for="todo in allTodosSorted" :key="todo.id" class="flex items-center justify-between group p-1.5 hover:bg-gray-50 rounded transition-colors duration-150 ease-in-out">
                         <div class="flex items-center space-x-2 mr-2 overflow-hidden">
                             <input type="checkbox" :checked="todo.completed" @change="toggleComplete(todo)" class="rounded border-gray-400 text-primary shadow-sm focus:ring-primary h-4 w-4 flex-shrink-0 cursor-pointer" title="Mark as complete/incomplete" />
                             <span class="text-sm truncate cursor-default" :class="{ 'line-through text-gray-500': todo.completed }" :title="todo.text">{{ todo.text }}</span>
                         </div>
                         <button @click="deleteTodo(todo.id)" title="Delete Task" class="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                     </div>
                </div>
                <p v-else class="text-sm text-gray-500 italic mt-2 text-center py-4">No tasks added yet.</p>
            </div>
        </div> <!-- End Todo Card -->

        <!--Monthly Rent Status Card -->
        <div class="card">
            <h3 class="text-lg font-semibold mb-3 text-green-600 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 Rent Status ({{ monthlyRentStatus.currentMonthName }} {{ monthlyRentStatus.currentYear }})
            </h3>
            <div v-if="monthlyRentStatus.activeTenantsCount > 0" class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                    <span class="text-gray-600">Active Tenants Paying Rent:</span>
                    <span class="font-semibold">{{ monthlyRentStatus.activeTenantsCount }}</span>
                </div>
                 <div class="flex justify-between items-center">
                     <span class="text-gray-600">Tenants Paid This Month:</span>
                     <span class="font-semibold">{{ monthlyRentStatus.paidTenantsCount }}
                         <span class="text-xs text-gray-500">({{ ((monthlyRentStatus.paidTenantsCount / monthlyRentStatus.activeTenantsCount) * 100).toFixed(0) }}%)</span>
                     </span>
                 </div>
                 <div class="flex justify-between items-center">
                     <span class="text-gray-600">Total Expected Rent:</span>
                     <span class="font-semibold">{{ formatCurrency(monthlyRentStatus.totalExpectedRent) }}</span>
                 </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-600">Total Collected This Month:</span>
                    <span class="font-semibold text-green-700">{{ formatCurrency(monthlyRentStatus.totalCollectedThisMonth) }}</span>
                </div>
                 <!-- Optional Progress Bar -->
                 <div class="pt-2">
                     <div class="bg-gray-200 rounded-full h-2.5 overflow-hidden">
                         <div
                             class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                             :style="{ width: `${Math.min(100, (monthlyRentStatus.totalCollectedThisMonth / (monthlyRentStatus.totalExpectedRent || 1)) * 100)}%` }"
                         ></div>
                     </div>
                 </div>
            </div>
            <p v-else class="text-sm text-gray-500 italic mt-2">
                No active tenants with rent due found.
            </p>
        </div> <!-- End Monthly Rent Status Card -->

    </div> <!-- End v-else for Content -->
  </section>
</template>

<style scoped>
/* ... (keep existing styles .btn-sm, .custom-scrollbar) ... */
.btn-sm { @apply px-3 py-1.5 text-xs; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: #ccc #f1f1f1; }
</style>