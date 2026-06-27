declare module 'h3' {
  interface H3EventContext {
    auth: {
      userId: string
      username?: string
      role?: string
    }
  }
}

export {}
