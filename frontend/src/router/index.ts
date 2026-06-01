import { createRouter, createWebHistory } from 'vue-router'
import TeamsView from '../views/TeamsView.vue'
import TeamDetailView from '../views/TeamDetailView.vue'
import TeamMembersView from '../views/TeamMembersView.vue'
import TeamAppointmentSuggestionsView from '../views/TeamAppointmentSuggestionsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
  ],
})

export default router
