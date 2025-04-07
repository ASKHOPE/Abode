import { get, set, del } from 'idb-keyval';
// Make sure TodoItem is imported
import type { Property, Tenant, RentPayment, TodoItem, User } from '../types';

const dbName = 'abode-db';
// --- INCREMENT VERSION ---
const dbVersion = 3; // <-- You MUST increment this

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
        console.error("Database error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
    };
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      console.log(`Upgrading DB to version ${dbVersion}`);
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('properties')) {
        db.createObjectStore('properties'); // idb-keyval might ignore this for default get/set
        console.log('Created properties store (native)');
      }
      if (!db.objectStoreNames.contains('tenants')) {
        db.createObjectStore('tenants'); // idb-keyval might ignore this for default get/set
         console.log('Created tenants store (native)');
      }
      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments'); // idb-keyval might ignore this for default get/set
         console.log('Created payments store (native)');
      }
       // --- ADD TODOS STORE (for completeness, though maybe unused by default get/set) ---
       if (!db.objectStoreNames.contains('todos')) {
         db.createObjectStore('todos');
          console.log('Created todos store (native)');
       }
       // --------------------------------------------------------------------
    };
  });
}

// Initialize the database - ensures it's tried once on module load
let dbPromise = openDB().catch(err => {
    console.error("Failed to initialize database on load:", err);
    // Return a Promise that stays pending or rejects, so subsequent awaits fail clearly
    return Promise.reject(err);
});

// Helper to ensure DB is ready before operations
async function ensureDbReady() {
    try {
        await dbPromise; // Wait for the initial open attempt
    } catch (err) {
        console.error("Database is not available.");
        // Re-throw the error to stop the operation that depends on the DB
        throw new Error("Database connection failed.");
    }
}


export const db = {

  //Users
  async getUsers(): Promise<User[]> {
    await ensureDbReady();
    try {
        const users = await get('users') || [];
        return Array.isArray(users) ? users : [];
    } catch (e) { console.error("Error getting users:", e); return []; }
  },

  async addUser(user: User): Promise<{ success: boolean; message?: string }> {
    await ensureDbReady();
    try {
        const users = await this.getUsers();
        // Check for username uniqueness (case-insensitive)
        const existingUser = users.find(u => u.username.toLowerCase() === user.username.toLowerCase());
        if (existingUser) {
            return { success: false, message: 'Username is already taken.' }; // Updated message
        }
        users.push(user);
        await set('users', users);
        return { success: true };
    } catch (e) {
        console.error("Error adding user:", e);
        return { success: false, message: 'An error occurred during registration.' };
    }
  },
   // Renamed and modified function
   async getUserByUsername(username: string): Promise<User | undefined> {
    await ensureDbReady();
    try {
        const users = await this.getUsers();
        // Find user by username (case-insensitive)
        return users.find(u => u.username.toLowerCase() === username.toLowerCase());
    } catch (e) {
        console.error("Error getting user by username:", e);
        return undefined;
    }
  },

   // Update User
   async updateUser(updatedUser: User): Promise<{ success: boolean; message?: string }> {
    await ensureDbReady();
    try {
      const users = await this.getUsers();
      const index = users.findIndex(u => u.id === updatedUser.id); // Find by ID

      if (index === -1) {
        return { success: false, message: 'User not found.' };
      }
      users[index] = updatedUser;
      await set('users', users); // Save the entire updated array
      return { success: true };

    } catch (e) {
      console.error("Error updating user:", e);
      return { success: false, message: 'An error occurred while updating user details.' };
    }
  },

  // Property operations
  async getProperties(): Promise<Property[]> {
    await ensureDbReady();
    try {
        const properties = await get('properties') || [];
        return Array.isArray(properties) ? properties : []; // Ensure it's an array
    } catch (e) { console.error("Error getting properties:", e); return []; }
  },
  async addProperty(property: Property): Promise<void> {
    await ensureDbReady();
    try {
        const properties = await this.getProperties();
        properties.push(property);
        await set('properties', properties);
    } catch (e) { console.error("Error adding property:", e); throw e; }
  },
  async updateProperty(property: Property): Promise<void> {
    await ensureDbReady();
     try {
        const properties = await this.getProperties();
        const index = properties.findIndex(p => p.id === property.id);
        if (index !== -1) {
          properties[index] = property;
          await set('properties', properties);
        } else {
            console.warn(`Property with ID ${property.id} not found for update.`);
        }
     } catch (e) { console.error("Error updating property:", e); throw e; }
  },
  async deleteProperty(id: string): Promise<void> {
    await ensureDbReady();
     try {
        const properties = await this.getProperties();
        const initialLength = properties.length;
        const filtered = properties.filter(p => p.id !== id);
        if (filtered.length < initialLength) {
            await set('properties', filtered);
        } else {
             console.warn(`Property with ID ${id} not found for deletion.`);
        }
     } catch (e) { console.error("Error deleting property:", e); throw e; }
  },

  // Tenant operations (add try/catch and validation like above)
  async getTenants(): Promise<Tenant[]> {
     await ensureDbReady();
     try {
         const tenants = await get('tenants') || [];
         return Array.isArray(tenants) ? tenants : [];
     } catch (e) { console.error("Error getting tenants:", e); return []; }
  },
  async addTenant(tenant: Tenant): Promise<void> {
    await ensureDbReady();
     try {
        const tenants = await this.getTenants();
        tenants.push(tenant);
        await set('tenants', tenants);
     } catch (e) { console.error("Error adding tenant:", e); throw e; }
  },
  async updateTenant(tenant: Tenant): Promise<void> {
     await ensureDbReady();
     try {
        const tenants = await this.getTenants();
        const index = tenants.findIndex(t => t.id === tenant.id);
        if (index !== -1) {
          tenants[index] = tenant;
          await set('tenants', tenants);
        } else {
            console.warn(`Tenant with ID ${tenant.id} not found for update.`);
        }
     } catch (e) { console.error("Error updating tenant:", e); throw e; }
  },
  async deleteTenant(id: string): Promise<void> {
     await ensureDbReady();
      try {
        const tenants = await this.getTenants();
        const initialLength = tenants.length;
        const filtered = tenants.filter(t => t.id !== id);
         if (filtered.length < initialLength) {
            await set('tenants', filtered);
         } else {
             console.warn(`Tenant with ID ${id} not found for deletion.`);
         }
      } catch (e) { console.error("Error deleting tenant:", e); throw e; }
  },

  // Payment operations (add try/catch and validation like above)
  async getPayments(): Promise<RentPayment[]> {
     await ensureDbReady();
     try {
        const payments = await get('payments') || [];
        return Array.isArray(payments) ? payments : [];
     } catch (e) { console.error("Error getting payments:", e); return []; }
  },
  async addPayment(payment: RentPayment): Promise<void> {
    await ensureDbReady();
     try {
        const payments = await this.getPayments();
        payments.push(payment);
        await set('payments', payments);
     } catch (e) { console.error("Error adding payment:", e); throw e; }
  },
  async updatePayment(payment: RentPayment): Promise<void> {
     await ensureDbReady();
      try {
        const payments = await this.getPayments();
        const index = payments.findIndex(p => p.id === payment.id);
        if (index !== -1) {
          payments[index] = payment;
          await set('payments', payments);
        } else {
             console.warn(`Payment with ID ${payment.id} not found for update.`);
        }
      } catch (e) { console.error("Error updating payment:", e); throw e; }
  },
  async deletePayment(id: string): Promise<void> {
    await ensureDbReady();
    try {
        const payments = await this.getPayments();
         const initialLength = payments.length;
        const filtered = payments.filter(p => p.id !== id);
        if (filtered.length < initialLength) {
            await set('payments', filtered);
        } else {
             console.warn(`Payment with ID ${id} not found for deletion.`);
        }
    } catch (e) { console.error("Error deleting payment:", e); throw e; }
  },

  // --- ADD TODO OPERATIONS ---
  async getTodos(): Promise<TodoItem[]> {
    await ensureDbReady();
    try {
        const todos = await get('todos') || []; // Use 'todos' key
        return Array.isArray(todos) ? todos : [];
    } catch (e) { console.error("Error getting todos:", e); return []; }
  },

  async addTodo(todo: TodoItem): Promise<void> {
    await ensureDbReady();
    try {
        const todos = await this.getTodos();
        todos.push(todo);
        await set('todos', todos); // Use 'todos' key
    } catch (e) { console.error("Error adding todo:", e); throw e; }
  },

  async updateTodo(todo: TodoItem): Promise<void> {
    await ensureDbReady();
    try {
        const todos = await this.getTodos();
        const index = todos.findIndex(t => t.id === todo.id);
        if (index !== -1) {
          todos[index] = todo;
          await set('todos', todos); // Use 'todos' key
        } else {
             console.warn(`Todo with ID ${todo.id} not found for update.`);
        }
    } catch (e) { console.error("Error updating todo:", e); throw e; }
  },

  async deleteTodo(id: string): Promise<void> {
    await ensureDbReady();
    try {
        const todos = await this.getTodos();
        const initialLength = todos.length;
        const filtered = todos.filter(t => t.id !== id);
        if (filtered.length < initialLength) {
            await set('todos', filtered); // Use 'todos' key
        } else {
            console.warn(`Todo with ID ${id} not found for deletion.`);
        }
    } catch (e) { console.error("Error deleting todo:", e); throw e; }
  }
  // --- END TODO OPERATIONS ---
};