# PROJECT OVERVIEW

## Project Name

**AssetFlow – Enterprise Asset & Resource Management System**

---

## Vision

AssetFlow is a modern Enterprise Resource Planning (ERP) platform focused on helping organizations efficiently manage physical assets, shared resources, employees, departments, maintenance, audits, and operational workflows.

The goal is to replace spreadsheets and manual tracking with a centralized, secure, scalable platform.

The system is designed to be industry-independent and can be used by:

* Companies
* Universities
* Hospitals
* Government organizations
* Manufacturing plants
* Warehouses
* NGOs
* Corporate offices

AssetFlow is **not** an accounting or finance ERP.

Its primary focus is operational asset management.

---

# PROJECT GOAL

The objective is to build a production-quality backend demonstrating enterprise software engineering practices.

The project should showcase:

* Clean Architecture
* Scalable Module Design
* Enterprise Security
* Role Based Access Control
* Production Ready APIs
* Proper Database Design
* High Code Quality
* Maintainability
* Extensibility

The codebase should resemble software built by experienced backend engineers rather than a tutorial application.

---

# CORE FUNCTIONALITY

The system revolves around managing the complete lifecycle of organizational assets.

Core capabilities include:

---

## Organization Management

Administrators can manage:

* Departments
* Department hierarchy
* Department heads
* Employee directory
* Roles
* Asset categories

Departments may have parent-child relationships.

Only administrators can assign privileged roles.

---

## Employee Management

Employees can:

* Login
* View assigned assets
* Book shared resources
* Request transfers
* Raise maintenance requests
* View notifications

Employees cannot promote themselves.

---

## Role Based Access Control

Supported roles:

ADMIN

ASSET_MANAGER

DEPARTMENT_HEAD

EMPLOYEE

Each role has clearly defined permissions.

Permission checks must always occur on the backend.

Never trust the frontend.

---

## Asset Management

Assets contain information such as:

* Asset Tag
* Serial Number
* Category
* Department
* Location
* Purchase Date
* Purchase Cost
* Warranty
* Condition
* Current Status
* Bookable Flag
* QR Code
* Attachments

Every asset has a unique asset tag.

Every asset has a lifecycle.

Supported states include:

* Available
* Allocated
* Reserved
* Under Maintenance
* Lost
* Retired
* Disposed

Assets maintain complete history.

History must never be overwritten.

---

## Asset Allocation

Assets can be allocated to:

* Employees
* Departments

Only one active allocation is allowed.

Duplicate allocations must be prevented.

History must be preserved.

Support:

* Allocation
* Return
* Transfer

Returns record condition notes.

Transfers require approval.

---

## Transfer Workflow

Workflow:

Employee

↓

Transfer Request

↓

Approval

↓

Allocation Updated

↓

History Updated

Transfers should never directly overwrite allocations.

---

## Resource Booking

Shared resources include:

* Meeting Rooms
* Company Vehicles
* Shared Equipment
* Conference Halls

Booking rules:

* No overlapping bookings
* Calendar based
* Cancel
* Reschedule
* Reminder notifications

Booking lifecycle:

Upcoming

↓

Ongoing

↓

Completed

↓

Cancelled

---

## Maintenance Workflow

Employees can report asset issues.

Workflow:

Pending

↓

Approved

↓

Technician Assigned

↓

In Progress

↓

Resolved

↓

Asset Available

Rejected requests terminate the workflow.

Maintenance history must be preserved.

---

## Asset Audit

Support structured audit cycles.

Workflow:

Create Audit

↓

Assign Auditors

↓

Verify Assets

↓

Generate Discrepancy Report

↓

Close Audit

Auditors can mark assets:

* Verified
* Missing
* Damaged

Confirmed missing assets may automatically transition to Lost.

---

## Notifications

Notify users about:

* Asset Assigned
* Transfer Approved
* Booking Reminder
* Booking Cancelled
* Maintenance Approved
* Maintenance Rejected
* Overdue Return
* Audit Assigned
* Audit Completed

Notifications are user specific.

---

## Activity Logs

Record every important operation.

Examples:

* Login
* Allocation
* Transfer
* Booking
* Maintenance
* Approval
* Role Change

Logs must be immutable.

Logs should never be deleted.

---

## Reports

Generate operational reports including:

* Asset Utilization
* Department Allocation
* Maintenance Frequency
* Booking Heatmap
* Idle Assets
* Assets Near Retirement
* Overdue Returns

Reports should be optimized using database queries rather than application-side processing whenever possible.

---

# BUSINESS RULES

The following rules must always be enforced.

* Email addresses are unique.
* Asset Tags are unique.
* Serial Numbers are unique.
* Only one active allocation exists per asset.
* Bookings cannot overlap.
* Signup always creates an EMPLOYEE.
* Users cannot assign themselves privileged roles.
* Assets under maintenance cannot be allocated.
* Lost assets cannot be transferred.
* Retired assets cannot be allocated.
* Disposed assets become read-only.
* Department Heads manage only their own departments.
* Employees cannot approve their own maintenance requests.
* History records are append-only.

---

# PROJECT QUALITY GOALS

The final project should demonstrate:

* Enterprise architecture
* Production-ready APIs
* Secure authentication
* Refresh token rotation
* Repository pattern
* DTO pattern
* Validation middleware
* Clean module separation
* Proper database normalization
* High-quality Prisma schema
* PostgreSQL optimization
* Strong TypeScript typing
* SOLID principles
* Clean Code
* Scalable design

The backend should be suitable for deployment and capable of supporting future features without major architectural changes.

---

# DEVELOPMENT PHILOSOPHY

This project is intentionally being built as if it were developed by a backend team at a modern product company.

The priority order is:

1. Correct architecture
2. Security
3. Maintainability
4. Scalability
5. Code quality
6. Performance
7. Developer experience

Never sacrifice architecture for short-term convenience.

Always prefer long-term maintainability over writing the least amount of code.
