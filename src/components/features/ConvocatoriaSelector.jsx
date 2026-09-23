/**
 * Pasa una fecha ISO (yyyy-MM-dd) a dd/mm/yyyy para leerla comoda.
 * Se invierte el texto en vez de usar Date: con 'yyyy-MM-dd' el constructor
 * interpreta UTC y puede restar un dia segun la zona horaria.
 * Cualquier otro formato devuelve cadena vacia.
 */
function toDisplayDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')
    ? iso.split('-').reverse().join('/')
    : ''
}

/**
 * Etiqueta de una convocatoria: nombre y, si se conocen, sus fechas.
 * Las fechas son imprescindibles cuando dos convocatorias se llaman igual
 * (paso en produccion con dos "septiembre 2026"): sin ellas el desplegable
 * muestra dos opciones identicas e imposibles de distinguir.
 */
function buildLabel(conv) {
  const inicio = toDisplayDate(conv?.fecha_inicio)
  const fin = toDisplayDate(conv?.fecha_fin)
  if (!inicio && !fin) return conv.nombre
  return `${conv.nombre} (${inicio || '?'} - ${fin || '?'})`
}

/**
 * Selector de convocatoria para el Dashboard CEO.
 * Muestra un dropdown cuando hay 2+ convocatorias activas.
 * @param {object} props
 * @param {Array} props.convocatorias - Lista de convocatorias activas
 * @param {string} props.selectedId - ID de la convocatoria seleccionada
 * @param {function} props.onChange - Callback al cambiar seleccion
 */
export default function ConvocatoriaSelector({ convocatorias, selectedId, onChange }) {
  if (!convocatorias || convocatorias.length < 2) return null

  return (
    <div className="px-5 pb-4 -mt-1">
      <label htmlFor="conv-selector" className="font-montserrat text-[11px] text-white/50 block mb-1.5">
        Convocatoria
      </label>
      <select
        id="conv-selector"
        value={selectedId || ''}
        onChange={(e) => {
          const conv = convocatorias.find(c => c.id === e.target.value)
          if (conv) onChange(conv)
        }}
        className="w-full bg-white/10 text-white font-montserrat text-[13px] rounded-lg px-3 py-2 border border-white/20 outline-none focus:border-gold/60 transition-colors appearance-none cursor-pointer"
      >
        {convocatorias.map(conv => (
          <option
            key={conv.id}
            value={conv.id}
            className="bg-burgundy text-white"
          >
            {buildLabel(conv)}
          </option>
        ))}
      </select>
    </div>
  )
}
