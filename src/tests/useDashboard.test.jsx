import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import useDashboard from '../hooks/useDashboard.js'

describe('useDashboard', () => {
  it('retorna el objeto con todas las keys esperadas', () => {
    const { result } = renderHook(() => useDashboard())
    const expectedKeys = [
      'convocatorias', 'convocatoria', 'reload',
      'teachers', 'loading', 'error',
      'expandedTeacher', 'searchQuery', 'setSearchQuery',
      'selectedStudent', 'setSelectedStudent', 'showAlertPopup',
      'handleAlertClick', 'handleAlertClose', 'handleStudentClose',
      'handleClear', 'handleTeacherToggle', 'handleConvChange',
      'totalStudents', 'globalAttendance', 'alertStudents', 'searchResults',
    ]
    expectedKeys.forEach(key => {
      expect(result.current).toHaveProperty(key)
    })
  })

  it('loading inicia como true', () => {
    const { result } = renderHook(() => useDashboard())
    expect(result.current.loading).toBe(true)
  })

  it('searchQuery inicia como string vacio', () => {
    const { result } = renderHook(() => useDashboard())
    expect(result.current.searchQuery).toBe('')
  })
})
