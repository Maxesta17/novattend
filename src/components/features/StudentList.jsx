import { useState } from 'react'
import StudentRow from './StudentRow.jsx'
import StudentDetailPopup from './StudentDetailPopup.jsx'

/**
 * Calcula las iniciales (primeras dos palabras) de un nombre.
 * @param {string} name - Nombre completo del alumno
 * @returns {string}
 */
function getInitials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('')
}

/**
 * Lista de alumnos del grupo con marcado de asistencia y acceso al detalle.
 * Cada fila permite alternar presente/ausente (onToggle) y abrir el popup de
 * detalle (boton info), desde donde el profesor puede justificar faltas.
 *
 * @param {object} props
 * @param {Array<{id?: string, name: string, present: boolean}>} props.students - Alumnos del grupo
 * @param {string} props.selectedGroup - Grupo activo (ej. "G1")
 * @param {function} props.onToggle - Handler (idx) al alternar asistencia
 * @param {object|null} props.convocatoria - Convocatoria activa (aporta el id)
 * @param {string|null} props.profesorId - ID del profesor en sesion
 */
export default function StudentList({
  students,
  selectedGroup,
  onToggle,
  convocatoria,
  profesorId,
}) {
  const [detailStudent, setDetailStudent] = useState(null)

  // El popup espera group como NUMERO (internamente compone `G${group}`).
  const openDetail = (student) => setDetailStudent({
    id: student.id,
    name: student.name,
    group: Number(selectedGroup.replace('G', '')),
    teacherId: profesorId,
  })

  return (
    <>
      {students.map((student, idx) => (
        <StudentRow
          key={`${selectedGroup}-${student.id || idx}`}
          name={student.name}
          initials={getInitials(student.name)}
          isPresent={student.present}
          onToggle={() => onToggle(idx)}
          onInfo={() => openDetail(student)}
          delay={Math.min(idx * 0.015, 0.15)}
        />
      ))}

      <StudentDetailPopup
        student={detailStudent}
        convocatoriaId={convocatoria?.id}
        onClose={() => setDetailStudent(null)}
      />
    </>
  )
}
