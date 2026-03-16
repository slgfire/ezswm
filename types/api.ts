export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  status: number
  message: string
  errors?: ValidationError[]
}

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
