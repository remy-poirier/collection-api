// import type { HttpContext } from '@adonisjs/core/http'

import StatisticsService from '#services/statistic_service'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class StatisticsController {
  constructor(protected statisticsService: StatisticsService) {}

  async get(request: HttpContext) {
    return this.statisticsService.get(request)
  }
}
