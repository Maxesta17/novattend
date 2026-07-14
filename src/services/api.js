/**
 * Servicio de conexion con el backend de Google Apps Script.
 *
 * Este archivo es un punto de entrada retrocompatible: la implementacion
 * vive fragmentada en ./api/ (errors, http, auth, endpoints) y aqui solo
 * se re-exporta la superficie publica. Los importers existentes
 * (`import { X } from '../services/api'`) siguen funcionando sin cambios.
 *
 * Cuando VITE_API_URL no esta definida, todas las funciones
 * devuelven null y el frontend usa los datos mock locales.
 *
 * @module services/api
 */

export * from './api/index'
