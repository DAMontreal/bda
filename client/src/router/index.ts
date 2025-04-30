// client/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import SignUpView from '../views/SignUpView.vue';
import MessagesView from '../views/MessagesView.vue'; // Create this view component if it doesn't exist

// Assume AboutView exists or use lazy loading
// import AboutView from '../views/AboutView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // BASE_URL is usually '/'
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      // Example using lazy loading (recommended)
       component: () => import('../views/AboutView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignUpView
    },
    {
      path: '/messages', // The route for your messages page
      name: 'messages',
      component: MessagesView // Make sure client/src/views/MessagesView.vue exists
      // Or lazy load it:
      // component: () => import('../views/MessagesView.vue')
    }
  ]
});

export default router;
