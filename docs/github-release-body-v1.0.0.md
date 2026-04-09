# GitHub Release 正文（v1.0.0）

以下内容可直接复制到 GitHub Release 正文中。

---

# v1.0.0 · First public release

A modern RuoYi admin rebuilt with Vue 3, shadcn-vue, Tailwind CSS v4, and a NestJS + Prisma backend.

## Overview

This is the first public release of **RuoYi Modern Admin**.

The project keeps the familiar RuoYi information architecture, permissions workflow, and backend contract, but rebuilds the frontend with a modern Vue 3 stack and provides a matching NestJS backend for local development, integration, and secondary development.

## Highlights

### Frontend

- Rebuilt with `Vue 3 + TypeScript + shadcn-vue + Tailwind CSS v4`
- Dynamic menus, permissions, breadcrumb, TagsView, theme system, and layout settings
- Shared admin components for table, actions, query panel, dialog, date picker, rich text, and avatar cropper
- Mobile adaptation, hidden scrollbars, dialog overflow handling, and top tags scrolling

### Backend

- Matching `NestJS + Prisma` backend aligned to the RuoYi-style API contract
- Covers auth, system modules, monitor modules, tool modules, upload, export, Swagger, and Druid-compatible diagnostics page
- Supports `Prisma-first + mock fallback` mode for easier local integration
- Real file upload and real export file streaming

### Delivery & Open Source Readiness

- Database initialization, seed data, Docker, PM2, and Nginx deployment docs
- CI workflow included
- README, contributing guide, security policy, code of conduct, PR template, and issue templates included

## Covered Modules

### System

- User
- Role
- Menu
- Department
- Post
- Dict / Dict Data
- Config
- Notice
- Profile
- Assign Role / Assign User

### Monitor

- Online Users
- Login Log
- Operation Log
- Scheduled Jobs
- Job Log
- Cache Monitor / Cache List
- Server Monitor
- Druid-compatible diagnostics page

### Tool

- Code Generator
- Code Generator Editor
- Swagger
- Form Builder

## Default Accounts

- `admin / admin123`
- `ry / 123456`

## Known Boundaries

- `tool/build` is an enhanced local form designer, not a strict 1:1 clone of the original RuoYi implementation
- `monitor/druid` is a NestJS-compatible diagnostics page, not the original Druid console
- The current backend is suitable for integration and secondary development; production rollout should still complete final database, deployment, and monitoring hardening

## Quick Links

- README: `README.md`
- Deployment init: `docs/deployment-initialization-guide.md`
- Deployment runtime: `docs/deployment-runtime-guide.md`
- Release checklist: `docs/release-checklist.md`

---

If you use this project as a base for your own admin system, please keep the license and attribution information intact.