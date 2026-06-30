/**
 * Fixture de usuarios para tests (SIN passwords reales).
 *
 * El login de produccion ya no valida contra una lista local: autentica contra
 * el backend real (useAuth().login). Este fixture solo cubre necesidades de test
 * que requieran una lista de usuarios de ejemplo, nunca credenciales.
 *
 * @module tests/fixtures/users
 */

export const MOCK_USERS = [
  { username: 'samuel', nombre: 'Samuel', rol: 'teacher', profesor_id: 'prof-samuel' },
  { username: 'admin', nombre: 'CEO', rol: 'ceo', profesor_id: 'prof-admin' },
]
