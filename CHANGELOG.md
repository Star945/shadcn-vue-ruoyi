# Changelog

All notable changes to this project will be documented in this file.

The format is based on a simplified Keep a Changelog style.

## [1.0.0] - 2026-04-09

### Added

- Rebuilt the RuoYi admin frontend with `Vue 3 + TypeScript + shadcn-vue + Tailwind CSS v4`
- Added a matching `NestJS + Prisma` backend in `apps/server`
- Added dynamic menu, permissions, breadcrumb, TagsView, layout settings, and theme customization
- Added shared admin components for data table, action bar, query panel, dialog, date picker, rich text editor, and avatar cropper
- Added mobile adaptation, hidden scrollbars, dialog overflow handling, and top tags scrolling
- Added system modules: user, role, menu, department, post, dict, config, notice, profile, assign role, assign user
- Added monitor modules: online user, login log, operlog, scheduled jobs, job log, cache monitor, cache list, server monitor, Druid-compatible diagnostics page
- Added tool modules: code generator, code generator editor, Swagger, form builder
- Added real upload, export, seed data, Docker, PM2, and Nginx deployment support
- Added CI workflow, contribution guide, issue templates, PR template, security policy, and code of conduct

### Changed

- Replaced the original Element-style frontend look with a modern theme system based on design tokens and shared UI primitives
- Reorganized pages into real business views instead of a single page renderer architecture
- Unified table action rendering into a shared maintenance-friendly component model
- Switched dialogs, rich text editing, date picking, and avatar editing to reusable shared components
- Aligned frontend and backend contracts to the RuoYi-style API semantics while keeping modern implementation details

### Fixed

- Fixed multiple old-route compatibility issues from RuoYi and RuoYi-Vue3 style menu trees
- Fixed mobile layout issues for query panels, tree sidebars, CRUD pages, monitor pages, and tool pages
- Fixed upload path handling for local network access and frontend proxy usage
- Fixed export endpoints to return real file streams instead of placeholder responses
- Fixed action column rendering regressions by stabilizing shared data-table behavior
- Fixed dialog scroll behavior and replaced rough native scrollbars with project-wide themed scrollbar behavior

### Docs

- Added design requirements, development guide, deployment guides, release checklist, acceptance checklist, release notes, and publishing docs
- Added repository setup suggestions, GitHub release body template, and release runbook

### Known Boundaries

- `tool/build` is an enhanced local form designer rather than a strict 1:1 clone of the original RuoYi builder
- `monitor/druid` is implemented as a diagnostics-compatible page in the NestJS backend, not the original Druid console
- The backend is ready for integration and secondary development, but production rollout should still complete final database and environment hardening