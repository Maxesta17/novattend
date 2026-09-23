import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import ConvocatoriaSelector from '../components/features/ConvocatoriaSelector.jsx'

// Dos convocatorias con el MISMO nombre. Paso en produccion: la hoja tenia dos
// "septiembre 2026" y el desplegable mostraba dos opciones identicas, asi que
// era imposible saber cual se estaba mirando.
const HOMONIMA_A = {
  id: 'conv-a',
  nombre: 'septiembre 2026',
  fecha_inicio: '2026-08-31',
  fecha_fin: '2026-12-23',
}
const HOMONIMA_B = {
  id: 'conv-b',
  nombre: 'septiembre 2026',
  fecha_inicio: '2026-09-01',
  fecha_fin: '2026-12-20',
}

describe('ConvocatoriaSelector', () => {
  it('no se muestra con menos de 2 convocatorias', () => {
    const { container } = render(
      <ConvocatoriaSelector convocatorias={[HOMONIMA_A]} selectedId="conv-a" onChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('distingue dos convocatorias homonimas mostrando sus fechas', () => {
    render(
      <ConvocatoriaSelector
        convocatorias={[HOMONIMA_A, HOMONIMA_B]}
        selectedId="conv-a"
        onChange={vi.fn()}
      />
    )

    const opciones = screen.getAllByRole('option').map(o => o.textContent)

    expect(opciones).toEqual([
      'septiembre 2026 (31/08/2026 - 23/12/2026)',
      'septiembre 2026 (01/09/2026 - 20/12/2026)',
    ])
    // Lo que de verdad importa: ninguna opcion es indistinguible de otra.
    expect(new Set(opciones).size).toBe(opciones.length)
  })

  it('sin fechas cae al nombre a secas, sin parentesis vacios', () => {
    render(
      <ConvocatoriaSelector
        convocatorias={[{ id: 'a', nombre: 'curso A' }, { id: 'b', nombre: 'curso B' }]}
        selectedId="a"
        onChange={vi.fn()}
      />
    )

    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['curso A', 'curso B'])
  })
})
