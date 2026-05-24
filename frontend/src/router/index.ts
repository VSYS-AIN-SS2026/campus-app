import { createRouter, createWebHistory } from 'vue-router'
import TeamListView from '../views/TeamListView.vue'
import TeamDetailView from '../views/TeamDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/teams',
      name: 'teams',
      component: TeamListView,
    },
    {
      path: '/teams/:id',
      name: 'team-detail',
      component: TeamDetailView,
    },
  ],
})

export default router
