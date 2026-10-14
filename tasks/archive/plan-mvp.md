# Implementation Plan: Backend MVP

## Overview

Convertir el prototipo visual en el MVP con puntos: identidad, playgrounds,
ledger, piques, participación, resolución y actividad. Next.js permanece como
único consumidor y PostgreSQL concentra las transacciones.

## Architecture Decisions

- Supabase Auth con cookies SSR y `getClaims()`; sin API Express.
- Las mutaciones de negocio son funciones SQL transaccionales con `auth.uid()`.
- RLS autoriza las lecturas y PostgreSQL impide escrituras directas.
- Las reglas de votación y reparto tienen una implementación pura testeable.
- Las Server Actions validan la forma de la entrada y delegan el efecto.
- Los puntos son enteros. El ledger es inmutable.

Plan archivado el 14 de octubre de 2026. El trabajo nuevo está en `tasks/plan.md`.
