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
          // Campos viejos (compatibilidad temporal)
          weekly: r.semanal ?? 0,
          biweekly: r.quincenal ?? 0,
          monthly: r.mensual ?? 0,
          // Campos nuevos (faltas absolutas + tendencia)
          faltasSemana: r.faltas_semana_actual ?? 0,
          clasesSemana: r.clases_semana_actual ?? 0,
          faltasMes: r.faltas_mes ?? 0,
          clasesMes: r.clases_mes ?? 0,
          faltasTotal: r.faltas_total ?? 0,
          clasesTotal: r.clases_total ?? 0,
          rachaFaltas: r.racha_faltas ?? 0,
          ultimas8: r.ultimas_8 ?? [],
          historicoSemanas: r.historico_semanas ?? [],
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
