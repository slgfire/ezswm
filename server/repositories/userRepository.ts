import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { User } from '../../types/user'

const FILE_NAME = 'users.json'

export const userRepository = {
  list(): User[] {
    return readJson<User[]>(FILE_NAME)
  },

  getById(id: string): User | null {
    const users = this.list()
    return users.find(u => u.id === id) || null
  },

  getByUsername(username: string): User | null {
    const users = this.list()
    return users.find(u => u.username === username) || null
  },

  create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const users = this.list()

    if (users.some(u => u.username === data.username)) {
      throw createError({ statusCode: 409, message: `Username '${data.username}' already exists` })
    }

    const now = new Date().toISOString()
    const user: User = {
      id: nanoid(),
      ...data,
      created_at: now,
      updated_at: now
    }

    users.push(user)
    writeJson(FILE_NAME, users)
    return user
  },

  update(id: string, data: Partial<Omit<User, 'id' | 'created_at'>>): User {
    const users = this.list()
    const index = users.findIndex(u => u.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    users[index] = {
      ...users[index],
      ...data,
      updated_at: new Date().toISOString()
    }

    writeJson(FILE_NAME, users)
    return users[index]
  },

  delete(id: string): boolean {
    const users = this.list()
    const index = users.findIndex(u => u.id === id)
    if (index === -1) return false

    users.splice(index, 1)
    writeJson(FILE_NAME, users)
    return true
  }
}
