/**
 * Bloque de alertas de la semana en curso para el dashboard CEO.
 * Muestra dos secciones: alumnos con 2+ faltas en la semana actual y
 * alumnos con racha activa (2+ faltas en sus ultimas clases).
 *
 * @param {object} props
 * @param {Array} props.weekStudents - Alumnos con 2+ faltas en la semana actual
 * @param {Array} props.streakStudents - Alumnos con racha activa (2+ faltas seguidas)
 * @param {function} props.onStudentClick - Handler al pulsar un alumno
 */
export default function WeekAlerts({ weekStudents = [], streakStudents = [], onStudentClick }) {
  const hasWeek = weekStudents.length > 0
  const hasStreak = streakStudents.length > 0

  if (!hasWeek && !hasStreak) {
    return (
      <section className="px-4 mt-4">
        <div className="bg-success-soft border border-success rounded-[10px] p-3">
          <p className="font-montserrat text-xs text-success font-medium m-0 text-center">
            Sin alertas esta semana
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 mt-4">
      <h3 className="font-cinzel text-[15px] font-semibold text-text-dark mb-3 text-balance">
        Alertas de la semana
      </h3>

      {hasWeek && (
        <AlertGroup
          variant="error"
          title="2+ faltas esta semana"
          count={weekStudents.length}
          students={weekStudents}
          onStudentClick={onStudentClick}
          renderMeta={(s) => `${s.faltasSemana} faltas / ${s.clasesSemana} clases`}
        />
      )}

      {hasStreak && (
        <AlertGroup
          variant="warning"
          title="Racha activa (2+ faltas seguidas)"
          count={streakStudents.length}
          students={streakStudents}
          onStudentClick={onStudentClick}
          renderMeta={(s) => `${s.rachaFaltas} faltas seguidas`}
        />
      )}
    </section>
  )
}

function AlertGroup({ variant, title, count, students, onStudentClick, renderMeta }) {
  const colors = variant === 'error'
    ? { border: 'border-error', text: 'text-error', hover: 'hover:bg-error-soft', badge: 'bg-error' }
    : { border: 'border-warning', text: 'text-warning', hover: 'hover:bg-warning-soft', badge: 'bg-warning' }

  return (
    <div className={`mb-4 bg-white border ${colors.border} rounded-[12px] overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2 ${colors.text}`}>
        <span className="font-cinzel text-[13px] font-semibold">{title}</span>
        <span className={`${colors.badge} text-white px-2 py-0.5 rounded font-cinzel text-[10px] font-semibold`}>
          {count}
        </span>
      </div>
      <ul className="divide-y divide-border-light">
        {students.map(s => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onStudentClick(s)}
              className={`w-full text-left px-3 py-2.5 transition-colors duration-200 ${colors.hover}`}
            >
              <div className="font-montserrat text-[13px] font-medium text-text-dark">
                {s.name}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-montserrat text-[11px] text-text-muted">
                  {s.teacher} · Grupo {s.group}
                </span>
                <span className={`font-montserrat text-[11px] font-semibold ${colors.text}`}>
                  {renderMeta(s)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
