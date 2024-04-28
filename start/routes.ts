/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Session routes
router.post('signup', '#controllers/session_controller.signup')
router.post('signin', '#controllers/session_controller.signin')
router
  .post('signout', async ({ auth, response }) => {
    await auth.use('web').logout()
    return response.json(true)
  })
  .use(middleware.auth())

router.get('auth', async ({ auth }) => {
  const isAuthenticated = await auth.check()
  return isAuthenticated
    ? { state: 'authenticated', user: auth.user }
    : { state: 'unauthenticated' }
})

// Items
router
  .group(() => {
    router.get('', '#controllers/items_controller.all')
    router.put('create', '#controllers/items_controller.create')
    router.get(':id', '#controllers/items_controller.byId')
  })
  .prefix('collection')
  .use(middleware.auth())

router.get('statistics', '#controllers/statistics_controller.get').use(middleware.auth())

router
  .group(() => {
    router.get('items', '#controllers/items_controller.index')
    router.delete('items/:id', '#controllers/items_controller.delete')
  })
  .prefix('admin')
  .use(middleware.admin())

router.get('/users', '#controllers/users_controller.byId')
