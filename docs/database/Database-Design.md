# Atlas Enterprise OS

# Database Design Document

Version: 1.0

Status: Draft

Author: Bathriprasath TK

---

# Table of Contents

1. Database Overview
2. Design Principles
3. Database Technology
4. Entity Overview
5. Core Entities
6. Relationships
7. Indexing Strategy
8. Security
9. Backup & Recovery
10. Future Enhancements

---

# 1. Database Overview

Atlas Enterprise OS uses PostgreSQL as its primary relational database.

The database is designed to support enterprise-scale applications while maintaining data integrity, security, and high performance.

All business modules share a centralized database with strict logical separation using organizational boundaries.

---

# 2. Design Principles

The database is designed using the following principles:

- Normalized Schema (3NF)
- Referential Integrity
- ACID Compliance
- Multi-Tenant Design
- High Performance
- Scalability
- Security by Design
- Auditability

---

# 3. Database Technology

## Primary Database

- PostgreSQL

## Extensions

- pgvector
- UUID Extension

## Supporting Services

- Redis (Caching)
- MinIO (Object Storage)

---

# 4. Entity Overview

The core entities of Atlas Enterprise OS include:

- Organizations
- Departments
- Users
- Roles
- Permissions
- Documents
- Knowledge Articles
- Projects
- Tasks
- Workflows
- Notifications
- AI Conversations
- Audit Logs

---

# 5. Core Entities

Atlas Enterprise OS is designed around a set of core business entities. Each entity represents a major business capability and maintains clear relationships with other entities.

All major entities use UUID as their primary key and include standard audit fields.

Standard Audit Fields

- id (UUID)
- created_at
- updated_at
- created_by
- updated_by
- is_active

## 5.1 Organization

Purpose

Represents a company registered in Atlas Enterprise OS.

Attributes

- id (UUID)
- organization_name
- legal_name
- organization_code
- industry
- email
- phone
- website
- address
- timezone
- subscription_plan
- status

Relationships

- One Organization has many Departments
- One Organization has many Users
- One Organization has many Projects

## 5.2 Department

Purpose

Represents departments inside an organization.

Attributes

- id
- organization_id
- department_name
- department_code
- manager_id

Relationships

- One Organization → Many Departments
- One Department → Many Users

## 5.3 User

Purpose

Represents an authenticated employee.

Attributes

- id
- organization_id
- department_id
- first_name
- last_name
- email
- password_hash
- phone
- designation
- profile_image
- last_login
- status

Relationships

- One User belongs to one Organization
- One User belongs to one Department
- One User creates many Documents
- One User creates many Projects

## 5.4 Roles

Purpose

Defines permission groups.

Examples

- CEO
- HR
- Manager
- Employee
- Administrator

Attributes

- id
- role_name
- description

## 5.5 Permissions

Purpose

Stores fine-grained access permissions.

Examples

- user.read
- user.write
- document.read
- document.write
- project.manage
- admin.manage

Attributes

- id
- permission_name
- description

## 5.6 Documents

Purpose

Stores enterprise documents.

Attributes

- id
- organization_id
- uploaded_by
- file_name
- file_type
- storage_path
- version
- size
- tags

Relationships

- One User uploads many Documents

## 5.7 Knowledge Articles

Purpose

Stores organizational knowledge.

Attributes

- id
- title
- content
- author_id
- category
- tags
- version

## 5.8 Projects

Purpose

Represents business projects.

Attributes

- id
- organization_id
- project_name
- project_manager
- status
- start_date
- end_date

## 5.9 Tasks

Purpose

Represents project tasks.

Attributes

- id
- project_id
- assigned_to
- priority
- due_date
- status

## 5.10 Notifications

Purpose

Stores user notifications.

Attributes

- id
- user_id
- title
- message
- notification_type
- is_read

## 5.11 AI Conversations

Purpose

Stores enterprise AI interactions.

Attributes

- id
- user_id
- prompt
- response
- model
- response_time
- tokens_used

## 5.12 Audit Logs

Purpose

Maintains complete system activity.

Attributes

- id
- user_id
- action
- entity
- entity_id
- ip_address
- timestamp

---

# 6. Relationships

The following relationships define how the core entities of Atlas Enterprise OS interact with one another.

These relationships ensure data consistency, referential integrity, and efficient querying.

## 6.1 Organization Relationships

Organization (1)
│
├── Departments (N)
├── Users (N)
├── Projects (N)
├── Documents (N)
└── Knowledge Articles (N)

## 6.2 Department Relationships

Department (1)
│
└── Users (N)

## 6.3 User Relationships

User (1)

├── Documents (N)
├── Knowledge Articles (N)
├── Projects (N)
├── Tasks (N)
├── Notifications (N)
├── AI Conversations (N)
└── Audit Logs (N)

## 6.4 Project Relationships

Project (1)
│
└── Tasks (N)

## 6.5 Role Relationships

Role (N)
│
└── Permissions (N)

Users (N)
│
└── Roles (N)

## 6.6 Relationship Summary

| Parent | Child | Relationship |
|---------|-------|--------------|
| Organization | Department | One-to-Many |
| Organization | User | One-to-Many |
| Organization | Project | One-to-Many |
| Organization | Document | One-to-Many |
| Department | User | One-to-Many |
| Project | Task | One-to-Many |
| User | Notification | One-to-Many |
| User | AI Conversation | One-to-Many |
| User | Audit Log | One-to-Many |
| User | Role | Many-to-Many |
| Role | Permission | Many-to-Many |

---

# 7. Indexing Strategy

Indexes improve query performance and reduce response time.

The following columns should be indexed:

- organization_id
- department_id
- user_id
- project_id
- role_id
- email
- created_at
- status

Full-text indexes will be created for:

- Knowledge Articles
- Documents

Vector indexes will be created using pgvector for semantic search.

---

# 8. Security

Database security includes:

- UUID Primary Keys
- Password Hashing (Argon2)
- Row-Level Authorization in the application layer
- Encrypted HTTPS communication
- Least Privilege Access
- Audit Logging
- Secure Backup Policies

---

# 9. Backup & Recovery

The database shall support:

- Daily Automated Backups
- Point-in-Time Recovery (PITR)
- Transaction Logging
- Disaster Recovery Procedures
- Backup Verification

---

# 10. Future Enhancements

Future database improvements include:

- Database Sharding
- Read Replicas
- Dedicated Vector Database
- Data Warehouse Integration
- Event Sourcing
- Multi-Region Replication

