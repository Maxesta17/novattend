import { describe, it, expect } from 'vitest'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'

describe('buildTeachersHierarchy', () => {

  it('retorna array vacio si profesores es vacio', () => {
    expect(buildTeachersHierarchy([], [])).toEqual([])
  })

  it('mapea un profesor con un grupo y un alumno correctamente', () => {
    const profesores = [{ id: 'prof-1', nombre: 'Samuel' }]
    const resumen = [
      { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana', semanal: 90, quincenal: 85, mensual: 88 },
    ]

    const result = buildTeachersHierarchy(profesores, resumen)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Samuel')
    expect(result[0].initial).toBe('S')
    expect(result[0].id).toBe('prof-1')
    expect(result[0].groups).toHaveLength(1)
    expect(result[0].groups[0].number).toBe(1)
    expect(result[0].groups[0].students).toHaveLength(1)
    expect(result[0].groups[0].students[0].monthly).toBe(88)
  })

  it('extrae la inicial del nombre en mayuscula', () => {
    const profesores = [{ id: 'prof-1', nombre: 'maria' }]
    const result = buildTeachersHierarchy(profesores, [])
    expect(result[0].initial).toBe('M')
  })

  it('extrae el numero del grupo correctamente (G1 -> 1, G4 -> 4)', () => {
    const profesores = [{ id: 'prof-1', nombre: 'Samuel' }]
    const resumen = [
      { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana', semanal: 80, quincenal: 80, mensual: 80 },
      { profesor_id: 'prof-1', grupo: 'G4', alumno_id: 'a2', nombre: 'Luis', semanal: 70, quincenal: 70, mensual: 70 },
    ]

    const result = buildTeachersHierarchy(profesores, resumen)
    const numbers = result[0].groups.map(g => g.number)
    expect(numbers).toContain(1)
    expect(numbers).toContain(4)
  })

  it('dos profesores con multiples grupos producen jerarquia completa', () => {
    const profesores = [
      { id: 'prof-1', nombre: 'Samuel' },
      { id: 'prof-2', nombre: 'Maria' },
    ]
    const resumen = [
      { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana', semanal: 90, quincenal: 85, mensual: 88 },
      { profesor_id: 'prof-1', grupo: 'G2', alumno_id: 'a2', nombre: 'Luis', semanal: 70, quincenal: 65, mensual: 68 },
      { profesor_id: 'prof-2', grupo: 'G1', alumno_id: 'a3', nombre: 'Carlos', semanal: 80, quincenal: 75, mensual: 78 },
    ]

    const result = buildTeachersHierarchy(profesores, resumen)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Samuel')
    expect(result[0].groups).toHaveLength(2)
    expect(result[1].name).toBe('Maria')
    expect(result[1].groups).toHaveLength(1)
    expect(result[1].groups[0].students[0].name).toBe('Carlos')
  })

  it('profesor sin registros en resumen produce groups vacio', () => {
    const profesores = [{ id: 'prof-1', nombre: 'Samuel' }]
    const result = buildTeachersHierarchy(profesores, [])

    expect(result[0].groups).toHaveLength(0)
  })

  it('campos null usan fallback a 0 via operador ??', () => {
    const profesores = [{ id: 'prof-1', nombre: 'Samuel' }]
    const resumen = [
      { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana', semanal: null, quincenal: null, mensual: null },
    ]

    const result = buildTeachersHierarchy(profesores, resumen)
    const student = result[0].groups[0].students[0]

    expect(student.weekly).toBe(0)
    expect(student.biweekly).toBe(0)
    expect(student.monthly).toBe(0)
  })

  it('campos undefined usan fallback a 0 via operador ??', () => {
    const profesores = [{ id: 'prof-1', nombre: 'Samuel' }]
    const resumen = [
      { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana' },
    ]

    const result = buildTeachersHierarchy(profesores, resumen)
    const student = result[0].groups[0].students[0]

    expect(student.weekly).toBe(0)
    expect(student.biweekly).toBe(0)
    expect(student.monthly).toBe(0)
  })

})
