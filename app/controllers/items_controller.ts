// import type { HttpContext } from '@adonisjs/core/http'

import ItemService from '#services/item_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ItemsController {
  constructor(protected itemService: ItemService) {}

  async all(request: HttpContext) {
    return this.itemService.all(request)
  }

  async create(request: HttpContext) {
    return this.itemService.create(request)
  }

  async index() {
    return this.itemService.index()
  }

  async delete(request: HttpContext) {
    const id = request.request.param('id')
    return this.itemService.delete(id, request)
  }

  async byId(request: HttpContext) {
    const id = request.request.param('id')
    return this.itemService.byId(id, request)
  }

  async updateCount(request: HttpContext) {
    return this.itemService.updateCount(request)
  }

  async updatePrice(request: HttpContext) {
    return this.itemService.updatePrice(request)
  }

  async autocomplete(request: HttpContext) {
    return this.itemService.getAutocompleteItems(request)
  }
}
