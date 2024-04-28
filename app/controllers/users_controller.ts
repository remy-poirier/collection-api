import UserService from '#services/user_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
// import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class UsersController {
  constructor(protected userService: UserService) {}

  async byId(request: HttpContext) {
    return this.userService.getById(request)
  }
}
