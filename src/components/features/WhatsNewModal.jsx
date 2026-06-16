import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import {
  WHATSNEW_JUSTIFICAR_KEY,
  hasSeenWhatsNew,
  markWhatsNewSeen,
} from '../../utils/whatsNewStorage.js'

/** Pasos del mini-tutorial. Texto en espanol, identificadores en ingles. */
const TUTORIAL_STEPS = [
  'Toca la fila de un alumno para ver su detalle.',
  'En sus faltas, pulsa «Justificar» en la fecha que quieras.',
  'Elige el motivo y confirma: esa falta deja de contar en su porcentaje.',
]

/**
 * Fila de un paso del tutorial: numerito en circulo + texto corto.
 * @param {object} props
 * @param {number} props.number - Numero del paso (1-based).
 * @param {string} props.text - Texto descriptivo del paso.
 */
function TutorialStep({ number, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 flex items-center justify-center size-7 rounded-full bg-burgundy text-gold font-cinzel text-sm font-bold">
        {number}
      </span>
      <span className="font-montserrat text-sm text-text-body leading-snug pt-0.5">
        {text}
      </span>
    </li>
  )
}

/**
 * Modal de novedad "Justificar faltas". Autocontenido: gestiona su propia
 * visibilidad y la persistencia en localStorage. Solo se muestra una vez por
 * dispositivo y solo cuando `enabled` es true (profesores; el CEO no lo recibe).
 *
 * Mejora futura (no implementada): ilustrar el tutorial con una imagen generada
 * via OpenRouter. Por ahora el tutorial usa solo numeritos/iconos y texto Tailwind.
 *
 * @param {object} props
 * @param {boolean} [props.enabled=false] - Habilita el modal (true solo para teacher).
 */
export default function WhatsNewModal({ enabled = false }) {
  // Lazy initializer: leemos localStorage una sola vez al montar. Solo abrimos
  // si esta habilitado (profesor) y la novedad no se ha visto en este dispositivo.
  const [isOpen, setIsOpen] = useState(
    () => enabled && !hasSeenWhatsNew(WHATSNEW_JUSTIFICAR_KEY)
  )

  const handleClose = () => {
    markWhatsNewSeen(WHATSNEW_JUSTIFICAR_KEY)
    setIsOpen(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="380px"
      ariaLabel="Novedad: justificar faltas"
    >
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <span className="inline-block font-montserrat text-[11px] font-bold uppercase tracking-wide text-gold-dark bg-gold-soft rounded-full px-3 py-1 mb-2">
            Nuevo
          </span>
          <h2 className="font-cinzel text-xl font-bold text-burgundy m-0">
            ¡Nuevo! Justificar faltas
          </h2>
          <p className="font-montserrat text-sm text-text-muted mt-1.5 mb-0">
            Ahora puedes justificar ausencias de tus alumnos y que no cuenten en su porcentaje.
          </p>
        </div>

        <ol className="flex flex-col gap-3 m-0 p-0 list-none">
          {TUTORIAL_STEPS.map((text, idx) => (
            <TutorialStep key={idx} number={idx + 1} text={text} />
          ))}
        </ol>

        <Button variant="primary" fullWidth onClick={handleClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  )
}
