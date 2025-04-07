import { createRouter, createWebHistory } from 'vue-router';
import { nextTick } from 'vue';
import HomeView from '../views/HomeView.vue';
import PropertiesView from '../views/PropertyList.vue';
import TenantsView from '../views/TenantList.vue';
import RentTrackingView from '../views/RentTracking.vue';
import AlertsTodo from '../views/AlertsTodo.vue';
import AboutUs from '../views/AboutUs.vue';
import LoginView from '../views/LoginView.vue'; // 
import RegisterView from '../views/RegisterView.vue';  
import ProfileView from '../views/ProfileView.vue';

const checkAuth = () => !!sessionStorage.getItem('abode_auth_user_username');

const BASE_TITLE = 'Abode';

const routes = [
    // Public routes
    { path: '/login', name: 'login', component: LoginView ,meta: { title: 'Sign In' }},
    { path: '/register', name: 'register', component: RegisterView ,meta: { title: 'Register' }},
    { path: '/aboutus', name: 'aboutus', component: AboutUs ,meta: { title: 'About Us' } },  

    // Protected routes
    {
      path: '/profile',
      name: 'profile', // Use this name in RouterLink
      component: ProfileView,
      meta: { requiresAuth: true , title: "My Profile" } // Must be logged in to see profile
  },
    {
        path: '/', name: 'home', component: HomeView,
        meta: { requiresAuth: true, title: 'Home' } // Mark as requiring auth
    },
    {
        path: '/properties', name: 'properties', component: PropertiesView,
        meta: { requiresAuth: true , title:"Properties" }
    },
    {
        path: '/tenants', name: 'tenants', component: TenantsView,
        meta: { requiresAuth: true , title : "Tenants"}
    },
    {
        path: '/rent-tracking', name: 'rent-tracking', component: RentTrackingView,
        meta: { requiresAuth: true , title : "Rent Tracking"}
    },
    {
      path: '/alertstodo', name: 'alertstodo', component: AlertsTodo,
      meta: { requiresAuth: true , title : "Alets & Todo"}
  },
 
  
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation Guard (uses the updated checkAuth)
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isAuthenticated = checkAuth(); // Uses the updated key check

  if (requiresAuth && !isAuthenticated) {
    console.log(`Navigation blocked: ${to.fullPath} requires auth.`);
    next({ name: 'login' });
  } else if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    console.log(`Redirecting authenticated user from ${to.name} to home.`);
    next({ name: 'home' });
  } else {
    next();
  }
});

// --- Dynamic Title for Pages
router.afterEach((to, from) => {
  // Use nextTick to ensure the DOM update occurs after Vue has finalized the navigation
  nextTick(() => {
    // Get the title from the route meta, fallback to base title
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
    // Set the document title (e.g., "Properties - Abode" or just "Abode")
    document.title = nearestWithTitle ? `${nearestWithTitle.meta.title} - ${BASE_TITLE}` : BASE_TITLE;
  });
});


export default router;