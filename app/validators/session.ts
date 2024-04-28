import vine from '@vinejs/vine'

/**
 * Validates user credentials are present
 */

export const credentialsValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
  })
)
