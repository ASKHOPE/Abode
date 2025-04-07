<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Property, Tenant } from '../types';
import { db } from '../services/db';

const properties = ref<Property[]>([]);
const tenants = ref<Tenant[]>([]);
const showAddModal = ref(false);

// Flags for edit mode
const isEditingProperty = ref(false);
const editingPropertyId = ref<string | null>(null);

// newProperty includes the archived flag
const newProperty = ref<Partial<Property>>({
  name: '',
  address: '',
  rooms: 0,
  floors: 0,
  archive: false
});

// Store room counts per floor when floors > 1
const floorRooms = ref<Record<number, number>>({});

function calculateTotalRooms() {
  newProperty.value.rooms = Object.values(floorRooms.value).reduce((sum, val) => sum + val, 0);
}

onMounted(async () => {
  properties.value = await db.getProperties();
  tenants.value = await db.getTenants();
});

async function addOrUpdateProperty() {
  if (!newProperty.value.name || !newProperty.value.address) return;

  if (isEditingProperty.value && editingPropertyId.value) {
    // Update existing property
    const updatedProperty: Property = {
      id: editingPropertyId.value,
      name: newProperty.value.name,
      address: newProperty.value.address,
      rooms: newProperty.value.rooms || 0,
      floors: newProperty.value.floors || 0,
      archive: newProperty.value.archive || false
    };
    await db.updateProperty(updatedProperty);
  } else {
    // Create new property
    const property: Property = {
      id: crypto.randomUUID(),
      name: newProperty.value.name,
      address: newProperty.value.address,
      rooms: newProperty.value.rooms || 0,
      floors: newProperty.value.floors || 0,
      archive: newProperty.value.archive || false
    };
    await db.addProperty(property);
  }
  
  properties.value = await db.getProperties();
  resetPropertyModal();
}

function resetPropertyModal() {
  showAddModal.value = false;
  isEditingProperty.value = false;
  editingPropertyId.value = null;
  newProperty.value = { name: '', address: '', rooms: 0, floors: 0, archive: false };
  floorRooms.value = {};
}

async function deleteProperty(id: string) {
  await db.deleteProperty(id);
  properties.value = await db.getProperties();
}

function editProperty(property: Property) {
  newProperty.value = { ...property };
  editingPropertyId.value = property.id;
  isEditingProperty.value = true;
  showAddModal.value = true;
  // Optionally, prefill floorRooms if you store that information
  floorRooms.value = {};
}

async function toggleArchiveProperty(property: Property) {
  const newArchivedState = !property.archive;
  const updatedProperty: Property = {
    ...property,
    archive: newArchivedState,
  };
  console.log('Updated Property before updateProperty call:', updatedProperty);
  await db.updateProperty(updatedProperty);
  properties.value = await db.getProperties();
  console.log('Properties after getProperties call:', properties.value);
}

// Compute tenant count based on the global tenant list
function getTenantCount(propertyId: string): number {
  return tenants.value.filter(t => t.propertyId === propertyId).length;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="ml-3 text-2xl font-bold text-primary">Properties</h1>
      <button @click="showAddModal = true" class="btn">Add Property</button>
    </div>
    
    <div v-if="properties.length === 0" class="card text-center py-8">
      <p class="text-gray-500">No properties added yet</p>
      <button @click="showAddModal = true" class="btn mt-4">Add Your First Property</button>
    </div>
    
    <div v-else class="space-y-4">
      <div 
        v-for="property in properties" 
        :key="property.id" 
        class="card"
        :class="{'bg-gray-200 text-gray-500': property.archive}"
      >
        <div class="flex justify-between">
          <h2 class="text-lg font-semibold text-primary">{{ property.name }}</h2>
          <div class="flex space-x-2">
            <button @click="editProperty(property)" class="text-blue-600 text-sm">Edit</button>
            <button 
              @click="toggleArchiveProperty(property)" 
              class="text-indigo-600 text-sm"
            >
              {{ property.archive ? 'Unarchive' : 'Archive' }}
            </button>
            <button @click="deleteProperty(property.id)" class="text-red-600 text-sm">Delete</button>
          </div>
        </div>
        <p class="text-sm text-gray-600">{{ property.address }}</p>
        <div class="mt-2 flex justify-between text-sm">
          <span>Floors: {{ property.floors }}</span>
          <span>Rooms: {{ property.rooms }}</span>
          <span>Tenants: {{ getTenantCount(property.id) }}</span>
        </div>
      </div>
    </div>

    <!-- Add/Edit Property Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg w-full max-w-md mx-4">
        <h2 class="text-xl font-bold mb-4">
          {{ isEditingProperty ? 'Edit Property' : 'Add New Property' }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input 
              v-model="newProperty.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Address</label>
            <input 
              v-model="newProperty.address" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-opacity-50"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Floors</label>
            <input 
              v-model.number="newProperty.floors" 
              type="number" 
              min="1"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              @input="floorRooms = {}; calculateTotalRooms()"
            >
          </div>

          <!-- Scrollable rooms per floor section when floors > 1 -->
          <div v-if="newProperty.floors > 1" class="space-y-2">
            <div class="max-h-64 overflow-y-auto">
              <div 
                v-for="floor in newProperty.floors" 
                :key="floor"
                class="flex items-center space-x-2 py-1"
              >
                <label class="text-sm font-medium text-gray-700 w-1/2">Rooms on Floor {{ floor }}</label>
                <input
                  type="number"
                  min="0"
                  class="block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  v-model.number="floorRooms[floor]"
                  @input="calculateTotalRooms"
                >
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Total Rooms</label>
              <input 
                :value="newProperty.rooms" 
                type="number" 
                readonly 
                class="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm"
              >
            </div>
          </div>

          <!-- Simple rooms input when floors is 1 or not specified -->
          <div v-else>
            <label class="block text-sm font-medium text-gray-700">Rooms</label>
            <input 
              v-model.number="newProperty.rooms" 
              type="number" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>

          <div class="flex justify-end space-x-2">
            <button @click="resetPropertyModal" class="px-4 py-2 text-gray-600">Cancel</button>
            <button @click="addOrUpdateProperty" class="btn">
              {{ isEditingProperty ? 'Update Property' : 'Add Property' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>