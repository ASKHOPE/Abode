<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import type { RentPayment, Tenant, Property } from '../types';
import { db } from '../services/db';

const payments = ref<RentPayment[]>([]);
const tenants = ref<Tenant[]>([]);
const properties = ref<Property[]>([]);
const showAddModal = ref(false);

const isEditingPayment = ref(false);
const editingPaymentId = ref<string | null>(null);

const newPayment = ref<Partial<RentPayment>>({
  tenantId: '',
  amount: 0,
  status: 'paid',
  date: new Date().toISOString().split('T')[0],
  month: new Date().toLocaleString('default', { month: 'long' }),
  archive: false // Note: This individual flag on payment isn't used by hierarchy, but kept for potential direct payment archiving
});

// --- Helper Function to get Property Status ---
const getPropertyArchivedStatus = (propertyId: string): boolean => {
  const property = properties.value.find(p => p.id === propertyId);
  return property?.archive ?? false; // Return true if property is archived, false otherwise or if not found
};

// --- Helper Function to determine Tenant Archived Status ---
const isTenantEffectivelyArchived = (tenant: Tenant | undefined): boolean => {
  if (!tenant) return true; // Treat non-existent tenant as archived for safety
  return tenant.archive || getPropertyArchivedStatus(tenant.propertyId);
};


onMounted(async () => {
  // Load properties first as tenant/payment logic might depend on it
  properties.value = await db.getProperties();
  tenants.value = await db.getTenants();
  payments.value = await db.getPayments();
});

// Watch tenant selection in modal
watch(() => newPayment.value.tenantId, (tenantId) => {
  if (!tenantId) {
    newPayment.value.amount = 0;
    return;
  }
  // Find the selected tenant from the *full* tenants list
  const tenant = tenants.value.find(t => t.id === tenantId);
   // This check is more strongly enforced by filtering the dropdown (`activeTenantsForSelect`).
  if (tenant) {
    if (isTenantEffectivelyArchived(tenant)) {
        console.warn(`Selected tenant ${tenant.name} is effectively archived.`);
        // Optionally reset selection if an archived tenant is somehow selected
        // newPayment.value.tenantId = '';
        // newPayment.value.amount = 0;
        // alert("Cannot record payment for an archived tenant.");
    } else {
        newPayment.value.amount = tenant.rent;
    }
  } else {
    newPayment.value.amount = 0; // Tenant not found
  }
});


const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Compute detailed payment list, incorporating effective archive status
const paymentsWithDetails = computed(() => {
  return payments.value.map(payment => {
    const tenant = tenants.value.find(t => t.id === payment.tenantId);
    let remainingAmount: number | null = null;
    let tenantName = 'Unknown Tenant';
    let propertyName = 'Unknown Property';
    let tenantInfo = 'Unknown Tenant';
    const tenantRent = tenant ? tenant.rent : 0;

    // Determine effective archived status
    const tenantIsEffectivelyArchived = isTenantEffectivelyArchived(tenant);
    // Payment is archived if itself is marked, or its tenant/property is archived
    const isEffectivelyArchived = payment.archive || tenantIsEffectivelyArchived;

    if (tenant) {
      tenantName = tenant.name;
      propertyName = getPropertyName(tenant.propertyId); // Uses local helper
      const propertyStatus = getPropertyArchivedStatus(tenant.propertyId) ? '[Property Archived]' : '';
      const tenantStatus = tenant.archive ? '[Tenant Archived]' : '';
      tenantInfo = `${tenant.name} - ${propertyName} (Floor ${tenant.floor}, ${tenant.room}) ${propertyStatus} ${tenantStatus}`.trim();

      if (payment.status === 'partial' && tenantRent > 0) {
        remainingAmount = Math.max(0, tenantRent - payment.amount);
      }
    } else {
        tenantInfo = `Unknown Tenant (ID: ${payment.tenantId})`; // More info if tenant deleted
    }


    return {
      ...payment,
      tenantName,
      propertyName,
      tenantInfo,
      remainingAmount,
      tenantRent,
      isEffectivelyArchived // Use this flag for display/logic
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
});

// Compute active tenants (not effectively archived) for the dropdown
const activeTenantsForSelect = computed(() => {
    return tenants.value.filter(tenant => !isTenantEffectivelyArchived(tenant));
});

// Compute tenants list for the modal, including the currently selected one if editing, even if archived
const tenantsForModal = computed(() => {
    const activeTenants = tenants.value.filter(tenant => !isTenantEffectivelyArchived(tenant));
    if (isEditingPayment.value && newPayment.value.tenantId) {
        const currentTenant = tenants.value.find(t => t.id === newPayment.value.tenantId);
        // If the current tenant exists and is *not* already in the active list (meaning they are archived)
        if (currentTenant && !activeTenants.some(at => at.id === currentTenant.id)) {
            // Add the current (archived) tenant to the list for display purposes during edit
             return [...activeTenants, currentTenant];
        }
    }
    return activeTenants; // Otherwise, just return active tenants
});


async function addOrUpdatePayment() {
  if (!newPayment.value.tenantId || newPayment.value.amount == null || !newPayment.value.date || !newPayment.value.status || !newPayment.value.month) {
    alert('Please fill in all payment details.');
    return;
  }

  const selectedTenant = tenants.value.find(t => t.id === newPayment.value.tenantId);
   // Crucial check: Prevent adding/updating payment for an effectively archived tenant
   if (!selectedTenant || isTenantEffectivelyArchived(selectedTenant)) {
       alert('Cannot record or update payment for an archived tenant or a tenant in an archived property.');
       return;
   }

  // Prevent partial payment amount equal to or exceeding full rent
  if (newPayment.value.status === 'partial' && newPayment.value.amount >= selectedTenant.rent) {
    alert(`Partial payment amount ($${newPayment.value.amount}) cannot be equal to or exceed the full rent ($${selectedTenant.rent}). Please use 'Paid' status or adjust the amount.`);
    return;
  }
  // Confirm if paid amount differs from tenant rent
  if(newPayment.value.status === 'paid' && newPayment.value.amount !== selectedTenant.rent) {
    const confirmPaid = confirm(`The amount entered ($${newPayment.value.amount}) differs from the tenant's rent ($${selectedTenant.rent}). Do you want to record it as 'Paid' anyway?`);
    if (!confirmPaid) return;
  }

  // Archiving display is handled by computed `paymentsWithDetails`.
  // The payment's own `archived` flag could be used for specific payment archiving if needed later.
  const payment: RentPayment = {
    id: isEditingPayment.value && editingPaymentId.value ? editingPaymentId.value : crypto.randomUUID(),
    tenantId: newPayment.value.tenantId!,
    amount: newPayment.value.amount,
    date: newPayment.value.date,
    status: newPayment.value.status!,
    month: newPayment.value.month!,
    archive: newPayment.value.archive || false // Persist the flag from the form if set (though maybe it shouldn't be editable)
  };

  try {
      if (isEditingPayment.value) {
        await db.updatePayment(payment);
      } else {
        await db.addPayment(payment);
      }
      // Refresh lists
      payments.value = await db.getPayments();
      // No need to refresh tenants/properties unless an action here modifies them
      resetPaymentModal();
  } catch (error) {
      console.error("Error adding/updating payment:", error);
      alert(`Failed to ${isEditingPayment.value ? 'update' : 'add'} payment. See console.`);
  }
}

function resetPaymentModal() {
  showAddModal.value = false;
  isEditingPayment.value = false;
  editingPaymentId.value = null;
  newPayment.value = {
    tenantId: '',
    amount: 0,
    status: 'paid',
    date: new Date().toISOString().split('T')[0],
    month: new Date().toLocaleString('default', { month: 'long' }),
    archive: false
  };
}

async function deletePayment(id: string) {
   // Optional: Add confirmation
   const confirmDelete = confirm("Are you sure you want to delete this payment record?");
   if (!confirmDelete) return;

   try {
       await db.deletePayment(id);
       payments.value = await db.getPayments(); // Refresh list
   } catch (error) {
       console.error("Error deleting payment:", error);
       alert("Failed to delete payment. See console.");
   }
}

function editPayment(payment: ReturnType<typeof paymentsWithDetails.value>[0]) {
   // Check if the payment is effectively archived BEFORE opening the modal
   if (payment.isEffectivelyArchived) {
       alert("Cannot edit an archived payment record.");
       return;
   }

  // Prefill modal with selected payment details (use the original payment data, not the computed one)
  const originalPayment = payments.value.find(p => p.id === payment.id);
  if (!originalPayment) {
      alert("Original payment record not found.");
      return;
  }
  newPayment.value = { ...originalPayment }; // Copy original data
  editingPaymentId.value = payment.id;
  isEditingPayment.value = true;
  showAddModal.value = true;
}

function getPropertyName(propertyId: string): string {
  const property = properties.value.find(p => p.id === propertyId);
  return property ? property.name : 'Unknown Property';
}

// Format tenant option for dropdown, indicating archived status if applicable
function formatTenantOption(tenant: Tenant): string {
  const propertyName = getPropertyName(tenant.propertyId);
  const rentInfo = `(Rent: $${tenant.rent})`;
  const baseInfo = `${tenant.name} - ${propertyName} ${rentInfo}`;
   // Append archived status directly in the option text if needed
   if (isTenantEffectivelyArchived(tenant)) {
       return `${baseInfo} [ARCHIVED]`;
   }
  return baseInfo;
}

// Get CSS class for payment status badges
function getStatusClass(status: string | null): Record<string, boolean> {
    status = status?.toLowerCase() ?? 'n/a';
    return {
        'capitalize text-xs px-2 py-0.5 rounded whitespace-nowrap font-medium': true, // Adjusted styling slightly
        'bg-green-100 text-green-800': status === 'paid',
        'bg-yellow-100 text-yellow-800': status === 'partial',
        'bg-red-100 text-red-800': status === 'pending',
        'bg-orange-100 text-orange-800': status === 'due',
        'bg-purple-100 text-purple-800': status === 'overdue',
        'bg-gray-100 text-gray-500': status === 'n/a',
    };
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="ml-3 text-2xl font-bold text-primary">Rent Tracking</h1>
      <!-- Disable Add button if there are no active tenants -->
      <button
        @click="showAddModal = true"
        class="btn"
        :disabled="activeTenantsForSelect.length === 0 && tenants.length > 0"
        :title="activeTenantsForSelect.length === 0 && tenants.length > 0 ? 'All tenants are archived' : 'Record a new payment'"
      >
        Record Payment
      </button>
    </div>

    <!-- Message when no tenants exist -->
    <div v-if="tenants.length === 0" class="card text-center py-8">
      <p class="text-gray-500">No tenants found. Please add tenants first.</p>
    </div>

    <!-- Message when tenants exist, but all are archived -->
     <div v-else-if="activeTenantsForSelect.length === 0 && paymentsWithDetails.filter(p => !p.isEffectivelyArchived).length === 0" class="card text-center py-8">
        <p class="text-gray-500">All tenants are currently archived. No active payments to display or record.</p>
     </div>

    <!-- Message when tenants exist, but no payments recorded yet -->
    <div v-else-if="paymentsWithDetails.length === 0 && tenants.length > 0" class="card text-center py-8">
      <p class="text-gray-500">No payments recorded yet</p>
      <button
        @click="showAddModal = true"
        class="btn mt-4"
        :disabled="activeTenantsForSelect.length === 0"
         :title="activeTenantsForSelect.length === 0 ? 'All tenants are archived' : 'Record first payment'"
      >
        Record Your First Payment
      </button>
    </div>


    <!-- Payment List -->
    <div v-else class="space-y-4">
      <div
          v-for="payment in paymentsWithDetails"
          :key="payment.id"
          class="card transition-colors duration-200 ease-in-out"
          :class="{'bg-gray-100 border-gray-300 text-gray-500 opacity-70': payment.isEffectivelyArchived, 'bg-white border-gray-200': !payment.isEffectivelyArchived}"
      >
        <div class="flex justify-between items-start">
          <div>
             <!-- Display Amount -->
             <span class="text-lg font-semibold" :class="payment.isEffectivelyArchived ? 'text-gray-600' : 'text-primary'">
                 ${{ payment.amount.toFixed(2) }}
                  <span v-if="payment.isEffectivelyArchived" class="text-xs align-middle ml-1">(Archived)</span>
             </span>
             <!-- Tenant/Property Info -->
             <p class="text-sm mt-1" :class="payment.isEffectivelyArchived ? 'text-gray-500' : 'text-gray-600'">
                 {{ payment.tenantInfo }}
             </p>
             <!-- Date/Month -->
             <p class="text-sm mt-1" :class="payment.isEffectivelyArchived ? 'text-gray-500' : 'text-gray-600'">
                 Date: {{ new Date(payment.date).toLocaleDateString() }} | Month: {{ payment.month }}
            </p>
          </div>
          <div class="flex flex-col items-end space-y-1 flex-shrink-0 ml-4">
             <!-- Status Badge & Action Buttons -->
             <div class="flex items-center space-x-1">
                <span class="capitalize text-xs px-2 py-0.5 rounded whitespace-nowrap font-medium" :class="getStatusClass(payment.status)">
                    {{ payment.status }}
                </span>
                 <!-- Edit/Delete Buttons: Disabled if archived -->
                <button
                    @click="editPayment(payment)"
                    class="text-blue-600 hover:text-blue-800 text-xs p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="payment.isEffectivelyArchived"
                    title="Edit Payment"
                >
                    Edit
                </button>
                <button
                    @click="deletePayment(payment.id)"
                    class="text-red-600 hover:text-red-800 text-xs p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="payment.isEffectivelyArchived"
                     title="Delete Payment"
               >
                    Delete
                </button>
             </div>
             <!-- Remaining Amount -->
             <p v-if="payment.status === 'partial' && payment.remainingAmount !== null && !payment.isEffectivelyArchived" class="text-xs text-yellow-700 font-medium text-right">
                 (${{ payment.remainingAmount.toFixed(2) }} remaining)
             </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Payment Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div class="bg-white p-6 rounded-lg w-full max-w-md mx-auto shadow-xl">
        <h2 class="text-xl font-bold mb-5 text-center">{{ isEditingPayment ? 'Edit Payment' : 'Record New Payment' }}</h2>
        <!-- Use a form for better semantics and potential submit handling -->
        <form @submit.prevent="addOrUpdatePayment" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
             <!-- Use tenantsForModal computed property -->
            <select
                v-model="newPayment.tenantId"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                :disabled="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))"
             >
              <option disabled value="">Select Tenant</option>
               <!-- Iterate over the potentially filtered list -->
               <option v-for="tenant in tenantsForModal" :key="tenant.id" :value="tenant.id" :disabled="isTenantEffectivelyArchived(tenant) && tenant.id !== newPayment.tenantId">
                   {{ formatTenantOption(tenant) }}
               </option>
            </select>
             <p v-if="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))" class="text-xs text-red-600 mt-1">
                 This tenant is archived. You cannot change the tenant for this payment.
             </p>
             <p v-else-if="activeTenantsForSelect.length === 0 && !isEditingPayment" class="text-xs text-red-600 mt-1">
                 No active tenants available to select.
             </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
            <input
                v-model.number="newPayment.amount"
                required
                type="number"
                min="0"
                step="any"
                placeholder="Amount Paid"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                :disabled="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))"
            >
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                    v-model="newPayment.date"
                    required type="date"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                    :disabled="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">For Month *</label>
                <select
                    v-model="newPayment.month"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                    :disabled="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))"
                >
                  <option disabled value="">Select Month</option>
                  <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
                v-model="newPayment.status"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                :disabled="isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))"
             >
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

         

          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-5">
            <button type="button" @click="resetPaymentModal" class="px-4 py-2 text-gray-600 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button
                type="submit"
                class="btn disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="(isEditingPayment && isTenantEffectivelyArchived(tenants.find(t => t.id === newPayment.tenantId))) || (!isEditingPayment && activeTenantsForSelect.length === 0)"
             >
                {{ isEditingPayment ? 'Update Payment' : 'Record Payment' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>