import { defineConfig } from '@adonisjs/cors'
import app from '@adonisjs/core/services/app'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: app.inProduction ? ['https://money-manager.tech'] : ['http://localhost:5173'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  //  credentials: true,
  maxAge: 90,
})

export default corsConfig
