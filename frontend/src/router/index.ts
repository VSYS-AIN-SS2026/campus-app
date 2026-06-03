import { createRouter, createWebHistory } from 'vue-router'
import TeamsView from '../views/TeamsView.vue'
import TeamDetailView from '../views/TeamDetailView.vue'
import TeamMembersView from '../views/TeamMembersView.vue'
import TeamAppointmentSuggestionsView from '../views/TeamAppointmentSuggestionsView.vue'

// The planner ("/") and hidden-schedule ("/schedule/hidden") views are rendered
// directly by App.vue (they share the app-level controller instance), so these
// routes only need a placeholder component to register the paths with the matcher.
const AppShellHost = { render: () => null }

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: AppShellHost },
    { path: '/schedule/hidden', name: 'hidden-schedule', component: AppShellHost },
    { path: '/teams', component: TeamsView },
    {
      path: '/teams/:id',
      component: TeamDetailView,
      children: [
        { path: '', name: 'team-members', component: TeamMembersView },
        {
          path: 'terminvorschlaege',
          name: 'team-appointment-suggestions',
          component: TeamAppointmentSuggestionsView,
        },
      ],
    },
    {
      path: '/organisations',
      component: () => import('../views/OrganisationsView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
  ],
})

export default router
