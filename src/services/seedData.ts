// src/services/seedData.ts
import type { User, Property, Tenant, RentPayment, TodoItem } from '../types';

// --- Seed Users ---
// WARNING: Storing plaintext passwords like this is insecure! Only for demo/dev.
export const seedUsers: User[] = [
 
  {
    id: crypto.randomUUID(),
    username: 'testuser',
    password: 'password123', // INSECURE
    name: 'Test User',
  },
];

// --- Seed Properties ---
export const seedProperties: Property[] = [

  {
    id: 'prop-001',
    name: 'Ocean View Condo',
    address: '456 Beach Rd, Coast City',
    floors: 1,
    rooms: 1,
    // tenants: [],
    archive: false,
  }
  
];

// --- Seed Tenants (link to properties) ---
export const seedTenants: Tenant[] = [
   { // Example tenant in archived property (will also be effectively archived)
    id: "1",
    name: 'Diana Prince',
    rent: 950,
    leaseStart: new Date(2023, 1, 1).toISOString(),
    leaseEnd: new Date(2024, 0, 31).toISOString(),
    rentStatus: 'contract expired',
    propertyId: 'prop-001', // Link to Old Mill House
    floor: 1,
    room: 1,
    archive: false, // Even if false, will be treated as archived due to property
  },
];

// --- Seed Payments (link to tenants) ---
export const seedPayments: RentPayment[] = [
    // Example payment history for Alice
    {
        id: crypto.randomUUID(),
        tenantId: "1", // Alice
        amount: 1200,
        date: new Date(new Date().getFullYear(), new Date().getMonth() -1, 5).toISOString(), // Last month
        status: 'paid',
        month: new Date(new Date().getFullYear(), new Date().getMonth() -1, 5).toLocaleString('default', { month: 'long' }),
        archive: false,
    },
  

];

// --- Seed Todos ---
export const seedTodos: TodoItem[] = [

  {
    id: crypto.randomUUID(),
    text: 'Prepare new property for new tenants.',
    completed: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
];