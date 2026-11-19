declare module 'better-sqlite3' {
  export default class Database {
    constructor(filename: string, options: { readonly: boolean, fileMustExist: boolean })
    backup(filename: string, options: { progress: () => number }): Promise<unknown>
    close(): void
  }
}
