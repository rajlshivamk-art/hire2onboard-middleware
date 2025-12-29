# Final Database Schema

This document outlines the complete database schema for the Recruitment Software.
The architecture is designed to support **Users** (RBAC), **Jobs** (Lifecycle), and **Candidates** (Application Tracking).

## Architecture Overview
- **Primary Database**: MongoDB (Recommended for flexibility and nested data like Feedback).
- **Document Storage**: AWS S3 / Google Cloud Storage (For resumes and photos).
- **Authentication**: JWT based, storing hashed passwords in `Users` collection.

---

## 1. Collections (MongoDB)

### `users` Collection
Stores internal employees (HR, Interviewers, Managers).

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `email` | String | Unique index, required |
| `passwordHash` | String | Bcrypt hash |
| `name` | String | Full name |
| `role` | String | Enum: `['HR', 'Tech Interviewer', 'Manager', 'Recruiter']` |
| `permissions` | Object | Fine-grained access control |
| `permissions.canViewSalary` | Boolean | |
| `permissions.canMoveCandidate` | Boolean | |
| `permissions.canEditJob` | Boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `jobs` Collection
Stores job postings and their metadata.

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `title` | String | Job Title |
| `department` | String | e.g., 'Engineering', 'Product' |
| `location` | String | e.g., 'Remote', 'New York' |
| `type` | String | Enum: `['Full-time', 'Part-time', 'Contract']` |
| `description` | String | HTML/Text content |
| `requirements` | Array[String] | List of bullet points |
| `salaryRange` | Object | |
| `salaryRange.min` | Number | |
| `salaryRange.max` | Number | |
| `status` | String | Enum: `['Open', 'Closed', 'On Hold', 'Active']` |
| `openings` | Number | Target number of hires |
| `postedDate` | Date | When it was published |
| `startDate` | Date | (Optional) Visibility start |
| `endDate` | Date | (Optional) Auto-close date |
| `postingChannels` | Array[String] | e.g., `['LinkedIn', 'Indeed']` |

### `candidates` Collection
Stores all applicant data. Uses **Embedding** for Feedback to ensure atomic updates and fast retrieval.

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `jobId` | ObjectId | Reference to `jobs` |
| `name` | String | |
| `email` | String | |
| `phone` | String | 10-digit normalized |
| `resumeUrl` | String | **URL from S3** (Do not store file) |
| `photoUrl` | String | (Optional) URL from S3 |
| `linkedIn` | String | URL |
| `portfolio` | String | URL |
| `stage` | String | Enum: `['Applied', 'Screening', 'Round 1', 'Offer', ...]` |
| `source` | String | e.g., 'LinkedIn', 'Referral' |
| `appliedDate` | Date | |
| `yearsOfExperience` | Number | |
| `currentSalary` | Number | |
| `expectedSalary` | Number | |
| `offeredSalary` | Number | (Optional) populated at Offer stage |
| `rejectionReason` | String | (Optional) |
| `onboardingTasks` | Array[Object] | List of tasks (created when moved to Onboarding) |
| `onboardingTasks[].task` | String | |
| `onboardingTasks[].completed` | Boolean | |
| **`feedback`** | **Array[Object]** | **Embedded reviews** |

#### Embedded `feedback` Object Structure
Inside `candidates` collection:
```json
{
  "reviewerId": "ObjectId (Ref: users)",
  "reviewerName": "String",
  "reviewerRole": "String",
  "stage": "String (e.g., 'Round 1')",
  "rating": "Number (1-5)",
  "decision": "String ('Advance', 'Reject', 'Hold')",
  "comments": "String",
  "submittedAt": "Date"
}
```

---

## 2. Relationships (ER Reference)

虽然 MongoDB is document-oriented, conceptually these relationships exist:

1.  **One-to-Many**: `Jobs` -> `Candidates` (A generic job has many applicants).
2.  **One-to-Many**: `Users` -> `Feedback` (A user writes many reviews).
3.  **One-to-Many**: `Candidates` -> `Feedback` (A candidate receives many reviews).

## 3. Storage Strategy

| Asset Type | Storage Location | Database Reference |
| :--- | :--- | :--- |
| Resumes (.pdf, .doc) | AWS S3 Bucket `/resumes` | Stores **URL** string |
| Profile Photos (.jpg) | AWS S3 Bucket `/photos` | Stores **URL** string |

> **Best Practice**: Use Signed URLs for private access if resumes contain sensitive PII.
