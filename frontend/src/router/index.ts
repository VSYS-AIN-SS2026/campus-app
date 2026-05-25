import { createRouter, createWebHistory } from 'vue-router'
import TeamsView from '../views/TeamsView.vue'
import TeamDetailView from '../views/TeamDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/teams', component: TeamsView },
    { path: '/teams/:id', component: TeamDetailView },
  ],
})

export default router
