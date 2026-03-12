export interface CrudRepository<T extends { id: string }> {
  list(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  create(payload: Omit<T, 'id'> & { id?: string }): Promise<T>
  update(id: string, payload: Partial<T>): Promise<T | undefined>
  delete(id: string): Promise<boolean>
}
