<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="space-y-4">
    <h1 class="ml-3 text-2xl font-bold text-primary">Dashboard</h1>
    <div class="grid grid-cols-2 gap-4">
      <RouterLink to="/properties" class="card hover:shadow-lg">
        <h2 class="text-lg font-semibold text-primary">Property Management</h2>
        <p class="text-sm text-gray-600">Manage your properties</p>
      </RouterLink>

      <RouterLink to="/tenants" class="card hover:shadow-lg">
        <h2 class="text-lg font-semibold text-primary">Tenant Management</h2>
        <p class="text-sm text-gray-600">Manage your tenants</p>
      </RouterLink>

      <RouterLink to="/rent-tracking" class="card hover:shadow-lg">
        <h2 class="text-lg font-semibold text-primary">Rent Tracking</h2>
        <p class="text-sm text-gray-600">Track rental payments</p>
      </RouterLink>

      <RouterLink to="/alertstodo" class="card hover:shadow-lg">
        <h2 class="text-lg font-semibold text-primary">Alerts & Todo</h2>
        <p class="text-sm text-gray-600">View important updates</p>
      </RouterLink>

    </div>
  </div>
</template>