// Datos mock de profesores, grupos y alumnos para el Dashboard CEO

// Genera fechas de inasistencia mock basadas en el % de asistencia
const generateAbsences = (attendancePct) => {
  const totalDays = 20 // dias lectivos del mes
  const absenceCount = Math.round(totalDays * (1 - attendancePct / 100))
  if (absenceCount === 0) return []
  const dates = []
  const today = new Date()
  for (let i = 1; dates.length < absenceCount && i <= totalDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().split('T')[0])
    }
  }
  return dates
}

export const TEACHERS_DATA = [
  {
    id: 1,
    name: 'Samuel',
    initial: 'S',
    groups: [
      {
        id: 'G1S',
        number: 1,
        students: [
          { id: 's1', name: 'Laura García', weekly: 95, biweekly: 92, monthly: 90 },
          { id: 's2', name: 'Carlos Ruiz', weekly: 78, biweekly: 75, monthly: 72 },
          { id: 's3', name: 'María López', weekly: 88, biweekly: 86, monthly: 84 },
          { id: 's4', name: 'Pedro Sánchez', weekly: 92, biweekly: 90, monthly: 88 },
          { id: 's5', name: 'Ana Martín', weekly: 100, biweekly: 100, monthly: 98 },
          { id: 's6', name: 'David Fernández', weekly: 65, biweekly: 62, monthly: 60 },
          { id: 's7', name: 'Elena Torres', weekly: 85, biweekly: 83, monthly: 81 },
          { id: 's8', name: 'Jorge Navarro', weekly: 90, biweekly: 88, monthly: 86 },
          { id: 's9', name: 'Lucía Romero', weekly: 75, biweekly: 73, monthly: 70 },
          { id: 's10', name: 'Pablo Jiménez', weekly: 82, biweekly: 80, monthly: 78 },
          { id: 's11', name: 'Sofía Álvarez', weekly: 98, biweekly: 96, monthly: 94 },
          { id: 's12', name: 'Hugo Moreno', weekly: 55, biweekly: 52, monthly: 50 },
        ],
      },
      {
        id: 'G2S',
        number: 2,
        students: [
          { id: 's13', name: 'Valentina Cruz', weekly: 92, biweekly: 90, monthly: 88 },
          { id: 's14', name: 'Mateo Herrera', weekly: 68, biweekly: 65, monthly: 63 },
          { id: 's15', name: 'Isabella Díaz', weekly: 88, biweekly: 86, monthly: 85 },
          { id: 's16', name: 'Sebastián Ortiz', weekly: 95, biweekly: 93, monthly: 91 },
          { id: 's17', name: 'Camila Reyes', weekly: 85, biweekly: 83, monthly: 81 },
          { id: 's18', name: 'Nicolás Vargas', weekly: 72, biweekly: 70, monthly: 68 },
          { id: 's19', name: 'Martina Castro', weekly: 90, biweekly: 88, monthly: 86 },
          { id: 's20', name: 'Emiliano Ramos', weekly: 80, biweekly: 78, monthly: 76 },
          { id: 's21', name: 'Renata Flores', weekly: 98, biweekly: 96, monthly: 94 },
          { id: 's22', name: 'Tomás Mendoza', weekly: 60, biweekly: 58, monthly: 56 },
          { id: 's23', name: 'Antonella Peña', weekly: 87, biweekly: 85, monthly: 83 },
          { id: 's24', name: 'Alejandro Silva', weekly: 75, biweekly: 73, monthly: 71 },
        ],
      },
      {
        id: 'G3S',
        number: 3,
        students: Array.from({ length: 12 }, (_, i) => ({
          id: `s${25 + i}`, name: `Alumno G3-${i + 1}`,
          weekly: Math.floor(Math.random() * 50) + 50,
          biweekly: Math.floor(Math.random() * 50) + 50,
          monthly: Math.floor(Math.random() * 50) + 50,
        })),
      },
      {
        id: 'G4S',
        number: 4,
        students: Array.from({ length: 12 }, (_, i) => ({
          id: `s${37 + i}`, name: `Alumno G4-${i + 1}`,
          weekly: Math.floor(Math.random() * 50) + 50,
          biweekly: Math.floor(Math.random() * 50) + 50,
          monthly: Math.floor(Math.random() * 50) + 50,
        })),
      },
    ],
  },
  {
    id: 2, name: 'Maria Wolf', initial: 'M',
    groups: [
      { id: 'G1M', number: 1, students: Array.from({ length: 12 }, (_, i) => ({ id: `m1${i}`, name: `Alumno G1-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G2M', number: 2, students: Array.from({ length: 12 }, (_, i) => ({ id: `m2${i}`, name: `Alumno G2-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G3M', number: 3, students: Array.from({ length: 12 }, (_, i) => ({ id: `m3${i}`, name: `Alumno G3-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G4M', number: 4, students: Array.from({ length: 12 }, (_, i) => ({ id: `m4${i}`, name: `Alumno G4-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
    ],
  },
  {
    id: 3, name: 'Nadine', initial: 'N',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}N`, number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `n${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 4, name: 'Marta Battistella', initial: 'B',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}B`, number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `b${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 5, name: 'Elisabeth Shick', initial: 'E',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}E`, number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `e${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 6, name: 'Myriam Marcia', initial: 'Y',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}Y`, number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `y${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 7, name: 'Sonja', initial: 'S',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}X`, number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `x${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
]

// Inyectar fechas de inasistencia a todos los alumnos
TEACHERS_DATA.forEach(teacher => {
  teacher.groups.forEach(group => {
    group.students.forEach(student => {
      student.absences = generateAbsences(student.monthly)
    })
  })
})

/** Devuelve clases Tailwind segun el porcentaje de asistencia */
export const getAttendanceScheme = (pct) => {
  if (pct >= 80) return { text: 'text-success', bg: 'bg-success-soft', status: 'Asistencia regular' }
  if (pct >= 60) return { text: 'text-warning', bg: 'bg-warning-soft', status: 'Requiere atencion' }
  return { text: 'text-error', bg: 'bg-error-soft', status: 'Alerta — contactar alumno' }
}
