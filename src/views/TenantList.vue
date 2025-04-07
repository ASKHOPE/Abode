<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Tenant, Property, RentPayment } from '../types';
import { db } from '../services/db';
import { useRouter } from 'vue-router';

const tenants = ref<Tenant[]>([]);
const properties = ref<Property[]>([]);
const payments = ref<RentPayment[]>([]);
const showAddModal = ref(false);
const selectedProperty = ref<Property | null>(null);
const isEditing = ref(false);
const editingTenantId = ref<string | null>(null);

const newTenant = ref<Partial<Tenant>>({
  name: '',
  rent: 0,
  leaseStart: '',
  leaseEnd: '',
  rentStatus: 'advance paid',
  propertyId: '',
  floor: 1,
  room: 'All Rooms',
  archive: false,
});

const router = useRouter();

// --- Helper Function to get Property Status ---
const getPropertyArchivedStatus = (propertyId: string): boolean => {
  const property = properties.value.find(p => p.id === propertyId);
  return property?.archive ?? false; // Return true if property is archived, false otherwise or if not found
};

// --- Helper Function to determine EFFECTIVE Tenant Archived Status ---
const isEffectivelyArchived = (tenant: Tenant): boolean => {
  // A tenant is effectively archived if they are individually archived
  // OR if their associated property is archived.
  return tenant.archive || getPropertyArchivedStatus(tenant.propertyId);
};

onMounted(async () => {
  // It's important that properties are loaded BEFORE tenants if relying on property status
  properties.value = await db.getProperties();
  tenants.value = await db.getTenants();
  payments.value = await db.getPayments();
});

watch(() => newTenant.value.propertyId, (id) => {
  selectedProperty.value = properties.value.find(p => p.id === id) || null;
  // Prevent selecting an archived property in the modal
  if (selectedProperty.value?.archive) {
      alert('This property is archived. Please unarchive the property first or select a different one.');
      newTenant.value.propertyId = ''; // Reset selection
      selectedProperty.value = null;
      return; // Stop further processing
  }
  if (selectedProperty.value) {
    newTenant.value.floor = 1;
    newTenant.value.room = generateDefaultRoomOption(selectedProperty.value);
  } else {
    newTenant.value.floor = 1;
    newTenant.value.room = 'All Rooms';
  }
});

const availableFloors = computed(() => {
  // Filter out archived properties from selection if needed (already handled in watch)
  if (!selectedProperty.value) return [];
  return Array.from({ length: selectedProperty.value.floors }, (_, i) => i + 1);
});

const generateDefaultRoomOption = (property: Property | null): string => {
    // ... (no changes needed here)
  if (!property || !property.floors || !property.rooms || property.floors <= 0 || property.rooms <= 0) {
    return 'All Rooms'; // Default fallback
  }
  const roomsPerFloor = Math.max(1, Math.floor(property.rooms / property.floors));
  // Ensure room count isn't nonsensical if rooms < floors
  const displayRooms = roomsPerFloor > 0 ? roomsPerFloor : 1;
  return `${displayRooms} (All Rooms)`;
};


const availableRooms = computed(() => {
    // ... (no changes needed here)
  if (!selectedProperty.value || !newTenant.value.floor || selectedProperty.value.floors <= 0 || selectedProperty.value.rooms <= 0) {
    return ['All Rooms'];
  }
  const roomsPerFloor = Math.max(1, Math.floor(selectedProperty.value.rooms / selectedProperty.value.floors));
  const roomList = Array.from({ length: roomsPerFloor }, (_, i) => `Room ${i + 1}`);
  const allRoomsText = generateDefaultRoomOption(selectedProperty.value);
  return [allRoomsText, ...roomList];
});


watch(selectedProperty, (newVal) => {
  // This watch might trigger unnecessarily if property selection is reset due to archived status
  // Ensure newVal exists before proceeding
  if (newVal) {
    newTenant.value.room = generateDefaultRoomOption(newVal);
  } else {
    newTenant.value.room = 'All Rooms';
  }
}, { immediate: false });

async function addOrUpdateTenant() {
  if (!newTenant.value.name || !newTenant.value.propertyId || !newTenant.value.floor || !newTenant.value.room) {
    alert('Please fill in all required tenant details.');
    return;
  }

  // Double-check property status before adding/updating
  const property = properties.value.find(p => p.id === newTenant.value.propertyId);
  if (property && property.archive) {
    alert('Cannot add or assign tenants to an archived property.');
    
    return;
  }

  const leaseStartDate = newTenant.value.leaseStart ? new Date(newTenant.value.leaseStart).toISOString() : new Date().toISOString();
  const leaseEndDate = newTenant.value.leaseEnd ? new Date(newTenant.value.leaseEnd).toISOString() : new Date().toISOString();

  const tenant: Tenant = {
    id: isEditing.value && editingTenantId.value ? editingTenantId.value : crypto.randomUUID(),
    name: newTenant.value.name,
    rent: newTenant.value.rent || 0,
    leaseStart: leaseStartDate,
    leaseEnd: leaseEndDate,
    // Keep the explicit rentStatus from the form
    rentStatus: newTenant.value.rentStatus || 'advance paid',
    propertyId: newTenant.value.propertyId,
    floor: newTenant.value.floor,
    room: newTenant.value.room,
    // Set the tenant's *individual* archived status based on the form/edit state
    // Do NOT automatically set it based on property here. That's handled elsewhere.
    archive: isEditing.value ? newTenant.value.archive || false : false,
  };

  try {
    if (isEditing.value) {
      await db.updateTenant(tenant);
    } else {
      await db.addTenant(tenant);
    }
    // Refresh properties just in case, then tenants and payments
    properties.value = await db.getProperties();
    tenants.value = await db.getTenants();
    payments.value = await db.getPayments();
    resetModal();
  } catch (error) {
    console.error("Error adding/updating tenant:", error);
    alert(`Failed to ${isEditing.value ? 'update' : 'add'} tenant. See console for details.`);
  }
}


function resetModal() {
  showAddModal.value = false;
  isEditing.value = false;
  editingTenantId.value = null;
  newTenant.value = {
    name: '',
    rent: 0,
    leaseStart: '',
    leaseEnd: '',
    rentStatus: 'advance paid',
    propertyId: '',
    floor: 1,
    room: 'All Rooms',
    archive: false, // Reset individual archived status
  };
  selectedProperty.value = null;
}

async function deleteTenant(id: string) {
  const tenantToDelete = tenants.value.find(t => t.id === id);
  if (!tenantToDelete) return;

  const associatedPayments = payments.value.filter(p => p.tenantId === id);
  const tenantName = tenantToDelete.name || '';

  // Warn about payment deletion regardless of archive status
  if (associatedPayments.length > 0) {
    const confirmDelete = confirm(`Deleting tenant "${tenantName}" will also delete ${associatedPayments.length} associated payment record(s). Are you sure?`);
    if (!confirmDelete) return;
    for (const payment of associatedPayments) {
      await db.deletePayment(payment.id);
    }
  } else {
    const confirmDelete = confirm(`Are you sure you want to delete tenant "${tenantName}"?`);
    if (!confirmDelete) return;
  }

  await db.deleteTenant(id);
  tenants.value = await db.getTenants(); // Re-fetch tenants
  payments.value = await db.getPayments(); // Re-fetch payments
}


function editTenant(tenant: Tenant) {
  // Check if the tenant's property is archived BEFORE opening the modal for editing
  if (getPropertyArchivedStatus(tenant.propertyId)) {
      alert(`Tenant "${tenant.name}" cannot be edited because their property "${getPropertyName(tenant.propertyId)}" is archived. Please unarchive the property first.`);
      return;
  }

  newTenant.value = { ...tenant }; // Copy all details, including individual 'archived' status
  editingTenantId.value = tenant.id;
  selectedProperty.value = properties.value.find(p => p.id === tenant.propertyId) || null;
  isEditing.value = true;
  showAddModal.value = true;
}

// This function now ONLY toggles the *individual* tenant's archived flag.
async function toggleArchiveTenant(tenant: Tenant) {
   // Prevent individual archiving/unarchiving if the property itself is archived.
   // The tenant's state is dictated by the property in this case.
   if (getPropertyArchivedStatus(tenant.propertyId)) {
     alert(`Cannot change archive status for "${tenant.name}" because the property "${getPropertyName(tenant.propertyId)}" is archived.`);
     return;
   }

  // Toggle the individual archived flag and update the tenant record
  const updatedTenant = { ...tenant, archive: !tenant.archive };
  await db.updateTenant(updatedTenant);
  // Re-fetch tenants to reflect the change
  tenants.value = await db.getTenants();
}

function getPropertyName(propertyId: string): string {
  const property = properties.value.find(p => p.id === propertyId);
  return property ? property.name : 'Unknown Property';
}

// Use the isEffectivelyArchived helper here
function getLatestRentStatus(tenantId: string): string {
  const tenantObj = tenants.value.find(t => t.id === tenantId);
  if (!tenantObj) return 'n/a'; // Handle tenant not found

  // Check effective archived status FIRST
  if (isEffectivelyArchived(tenantObj)) {
    return 'archive'; // Display 'archived' if tenant or property is archived
  }

  // --- Original payment status logic ---
  const tenantPayments = payments.value
    .filter(p => p.tenantId === tenantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (tenantPayments.length > 0) {
    // Consider returning the tenant's explicit 'rentStatus' if no payments exist yet?
    // Or based on lease dates vs today? For now, stick to payment status or default.
     return tenantPayments[0].status; // Return latest payment status
  }

  // If no payments, maybe return the tenant's 'rentStatus' (contract status)?
  // return tenantObj.rentStatus || 'no payments'; // Or just 'no payments'
   return 'no payments'; // Default if no payments and not archived
}


function getRentStatusClass(status: string | null): Record<string, boolean> {
  status = status?.toLowerCase() ?? 'n/a';
  return {
    'px-2 py-0.5 rounded text-xs inline-block font-medium': true,
    'bg-green-100 text-green-800': status === 'paid' || status === 'advance paid' || status === 'contract active' || status === 'contract renewed',
    'bg-yellow-100 text-yellow-800': status === 'partial' || status === 'notice period',
    'bg-red-100 text-red-800': status === 'pending' || status === 'contract breach',
    'bg-orange-100 text-orange-800': status === 'due',
    'bg-purple-100 text-purple-800': status === 'overdue' || status === 'contract expired',
    'bg-gray-100 text-gray-500': status === 'no payments' || status === 'n/a',
    'bg-gray-400 text-white': status === 'archived', // Class for archived status
  };
}

// Computed property for filtered properties (excluding archived ones) for the dropdown
const activeProperties = computed(() => {
    return properties.value.filter(p => !p.archive);
});

</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="ml-3 text-2xl font-bold text-primary">Tenants</h1>
      <button @click="showAddModal = true" class="btn">Add Tenant</button>
    </div>

    <div v-if="tenants.length === 0" class="card text-center py-8">
      <!-- ... no changes ... -->
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="tenant in tenants"
        :key="tenant.id"
        class="card"
        :class="{'bg-gray-200 text-gray-500 opacity-70': isEffectivelyArchived(tenant)}"  
    
      >
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-lg font-semibold text-primary">{{ tenant.name }} <span v-if="isEffectivelyArchived(tenant)" class="text-xs text-gray-500">(Archived)</span></h2>
            <p class="text-sm text-gray-600">Property: {{ getPropertyName(tenant.propertyId) }} <span v-if="getPropertyArchivedStatus(tenant.propertyId)" class="text-xs text-red-600">[Property Archived]</span></p>
            <p class="text-sm text-gray-600">Floor: {{ tenant.floor }} / Room: {{ tenant.room }}</p>
          </div>
          <div class="flex space-x-2">
            <!-- Disable Edit/Delete/Archive if EFFECTIVELY archived -->
            <button
              @click="editTenant(tenant)"
              class="text-blue-500 hover:text-blue-700 text-xs font-medium p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isEffectivelyArchived(tenant)"
            >
              Edit
            </button>
            <!-- Toggle button: text depends on *individual* status, action toggles individual status, disabled if PROPERTY is archived -->
             <button
              @click="toggleArchiveTenant(tenant)"
              class="text-indigo-500 hover:text-indigo-700 text-xs font-medium p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="getPropertyArchivedStatus(tenant.propertyId)" 
            >
              {{ tenant.archive ? 'Unarchive Tenant' : 'Archive Tenant' }}
            </button>
            <button
              @click="deleteTenant(tenant.id)"
              class="text-red-500 hover:text-red-700 text-xs font-medium p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isEffectivelyArchived(tenant)"
            >
              Delete
            </button>
          </div>
        </div>

        <div class="mt-3 border-t pt-3 space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="font-medium text-gray-700">Rent Amount:</span>
            <span>${{ tenant.rent.toFixed(2) }}</span>
          </div>
          <!-- Display Contract Status based on tenant.rentStatus unless effectively archived -->
           <div class="flex justify-between items-center text-sm">
            <span class="font-medium text-gray-700">Contract Status:</span>
            <span
              v-if="!isEffectivelyArchived(tenant)"
              class="capitalize font-semibold"
              :class="getRentStatusClass(tenant.rentStatus)"
            >
              {{ tenant.rentStatus }}
            </span>
             <span v-else :class="getRentStatusClass('archived')" class="capitalize">
                Archived
             </span>
          </div>
          <!-- Display Latest Rent Payment Status using the helper -->
          <div class="flex justify-between items-center text-sm">
            <span class="font-medium text-gray-700">Latest Rent Payment:</span>
            <span :class="getRentStatusClass(getLatestRentStatus(tenant.id))" class="capitalize">
              {{ getLatestRentStatus(tenant.id) }}
            </span>
          </div>
          <div class="text-sm text-gray-600">
            <div>Lease Start: {{ new Date(tenant.leaseStart).toLocaleDateString() }}</div>
            <div>Lease End: {{ new Date(tenant.leaseEnd).toLocaleDateString() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Tenant Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-10">
      <div class="bg-white p-6 rounded-lg w-full max-w-lg mx-4">
        <h2 class="text-xl font-bold mb-6 text-center">{{ isEditing ? 'Edit Tenant' : 'Add New Tenant' }}</h2>
        <form @submit.prevent="addOrUpdateTenant" class="space-y-4"> 
          <div>
            <label class="block text-sm font-medium text-gray-700">Name *</label>
            <input v-model="newTenant.name" required type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Rent Amount ($) *</label>
            <input v-model.number="newTenant.rent" required type="number" min="0" step="any" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Lease Start *</label>
              <input v-model="newTenant.leaseStart" required type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Lease End *</label>
              <input v-model="newTenant.leaseEnd" required type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
            </div>
          </div>
          <div>
             <label class="block text-sm font-medium text-gray-700">Contract Status *</label>
             <select v-model="newTenant.rentStatus" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                 <option value="advance paid">Advance Paid</option>
                 <option value="contract active">Contract Active</option>
                 <option value="contract renewed">Contract Renewed</option>
                 <option value="contract breach">Contract Breach</option>
                 <option value="contract expired">Contract Expired</option>
                 <option value="notice period">Notice Period</option>
             </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Property *</label>
           
            <select
              v-if="activeProperties.length > 0 || isEditing" 
              v-model="newTenant.propertyId"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              :disabled="isEditing && getPropertyArchivedStatus(newTenant.propertyId!)" 
            >
              <option disabled value="">Select Property</option>
              <!-- Show selected property even if archived when editing -->
               <option
                  v-if="isEditing && getPropertyArchivedStatus(newTenant.propertyId!)"
                  :value="newTenant.propertyId"
                >
                  {{ getPropertyName(newTenant.propertyId!) }} [Archived]
               </option>
              <!-- Show active properties -->
              <option
                v-for="property in activeProperties"
                :key="property.id"
                :value="property.id"
              >
                {{ property.name }}
              </option>
            </select>
             <div v-else class="mt-1">
                 <p class="text-sm text-red-600">No active properties available.</p>
                 <button
                   type="button"
                   @click="router.push('/properties')"
                   class="btn-link text-sm mt-1"
                 >
                   Add or Unarchive Properties
                 </button>
             </div>
          </div>
          <!-- Floor/Room selection logic remains largely the same, but ensure they appear correctly if property is selected -->
           <div v-if="newTenant.propertyId && selectedProperty" class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label class="block text-sm font-medium text-gray-700">Floor *</label>
               <select v-model.number="newTenant.floor" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" :disabled="getPropertyArchivedStatus(newTenant.propertyId)">
                 <option v-if="availableFloors.length === 0" disabled value="">N/A</option>
                 <option v-for="floor in availableFloors" :key="floor" :value="floor">
                   Floor {{ floor }}
                 </option>
               </select>
             </div>
             <div>
               <label class="block text-sm font-medium text-gray-700">Room/Unit *</label>
               <select v-model="newTenant.room" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" :disabled="getPropertyArchivedStatus(newTenant.propertyId)">
                 <option v-if="availableRooms.length === 0" disabled value="">N/A</option>
                 <option v-for="room in availableRooms" :key="room" :value="room">{{ room }}</option>
               </select>
             </div>
           </div>

           <div v-if="isEditing">
               <label class="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     v-model="newTenant.archive"
                     class="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                     :disabled="getPropertyArchivedStatus(newTenant.propertyId!)" 
                   />
                   <span class="text-sm font-medium text-gray-700">Archive this Tenant individually</span>
               </label>
                <p v-if="getPropertyArchivedStatus(newTenant.propertyId!)" class="text-xs text-red-600 mt-1">Tenant archiving is controlled by the property's archived status.</p>
           </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="resetModal" class="px-4 py-2 text-gray-600 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button type="submit" class="btn" :disabled="getPropertyArchivedStatus(newTenant.propertyId!)">{{ isEditing ? 'Update Tenant' : 'Add Tenant' }}</button>
          </div>
        </form> 
      </div>
    </div>
  </div>
</template>