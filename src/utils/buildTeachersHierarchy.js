/**
 * Transforma la respuesta plana de la API en la jerarquia teacher->group->students.
 * @param {Array} profesores - Lista de profesores de la API
 * @param {Array} resumen - Lista plana de resumen con porcentajes
 * @returns {Array} Estructura compatible con TeacherCard
 */
export default function buildTeachersHierarchy(profesores, resumen) {
  return profesores.map(prof => {
    const profRows = resumen.filter(r => r.profesor_id === prof.id)
    const groupIds = [...new Set(profRows.map(r => r.grupo))]
    const groups = groupIds.map(gId => ({
      id: `${gId}-${prof.id}`,
      number: Number(gId.replace(/\D/g, '')) || gId,
      students: profRows
        .filter(r => r.grupo === gId)
        .map(r => ({
          id: r.alumno_id,
          name: r.nombre,
          weekly: r.semanal ?? 0,
          biweekly: r.quincenal ?? 0,
          monthly: r.mensual ?? 0,
        })),
    }))
    return {
      id: prof.id,
      name: prof.nombre,
      initial: (prof.nombre || '?')[0].toUpperCase(),
      groups,
    }
  })
}
