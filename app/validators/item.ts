import vine from '@vinejs/vine'

/**
 * Validates item creation
 */

export const itemCreationValidator = vine.compile(
  vine.object({
    name: vine.string(),
    image: vine.string(),
    price: vine.number().min(1),
    url: vine.string(),
  })
)
