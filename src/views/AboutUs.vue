<script setup lang="ts">
</script>
<template>
  <div class="space-y-6 card max-w-3xl mx-auto">
    <h1 class="ml-3 text-2xl font-bold text-primary border-b pb-2">About Abode</h1>

    <div class="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none px-3">
      <p>
        Welcome to Abode, your simple and efficient solution for managing rental properties, tenants, and payments, right in your browser.
      </p>
      <h2 class="text-xl font-semibold text-primary mt-8">Features</h2>
      <ul>
        <li>Manage Properties</li>
        <li>Tenant Tracking</li>
        <li>Rent Payment Logging</li>
        <li>Alerts & Tasks Dashboard</li>
        <li>Simple User Authentication</li>
        <li>Offline Capable (Browser Storage)</li>
      </ul>

      <h2 class="text-xl font-semibold text-primary mt-8">How to Use Abode</h2>
      <ol>
        <li>
          <strong>Register/Login:</strong> Create an account or sign in using your username and password. Your session stays active until you close the browser tab or log out.
        </li>
        <li>
          <strong>Add Properties:</strong> Go to the "Properties" section (you might need to navigate there via a menu or dashboard link - *adjust this instruction based on your UI*) and add details about your rental units (name, address, floors, rooms).
        </li>
        <li>
          <strong>Add Tenants:</strong> In the "Tenants" section, add your tenants. Link each tenant to one of your properties, set their rent amount, and record their lease start/end dates.
        </li>
        <li>
          <strong>Track Rent Payments:</strong> Use the "Rent Tracking" section to log payments received from tenants. Select the tenant, enter the amount, date, month it's for, and mark the status (Paid, Partial, etc.).
        </li>
        <li>
          <strong>Stay Informed (Action Center):</strong> Check the "Action Center" (or similar section) regularly. It shows:
          <ul>
            <li>Leases expiring soon.</li>
            <li>Tenants whose rent status is 'Overdue'.</li>
            <li>A simple To-Do list for your own tasks.</li>
            <li>A summary of rent collected for the current month.</li>
          </ul>
        </li>
         <li>
           <strong>Manage Your Profile:</strong> Click your username in the header to update your display name or change your password.
         </li>
        <li>
          <strong>Manage Data:</strong> Use the "Edit", "Archive", and "Delete" options within each section (Properties, Tenants, Payments, Todos) to keep your information up-to-date. Remember, archiving helps hide old records without deleting payment history.
        </li>
      </ol>
      <p class="mt-4 text-sm">
          Since Abode stores data locally in your browser (using IndexedDB), your information is private but **only available on the specific browser you used**. Clearing your browser's site data will erase all stored information.
      </p>

 

    </div>
  </div>
</template>

<style scoped>
/* Ensure lists inside prose have appropriate styling if needed */
.prose ol, .prose ul {
    padding-left: 1.5em; /* Adjust indentation */
}
.prose li {
    margin-bottom: 0.5em; /* Space between list items */
}
.prose ul ul {
    margin-top: 0.25em; /* Space before nested lists */
}
</style>