# AI.md

# AI Architecture

> This document defines how Artificial Intelligence integrates into OpsMap. AI is an enhancement layer that improves workflows. It is never the foundation of the platform.

---

# AI Philosophy

OpsMap is a software platform first.

AI exists to help users:

- understand information
- discover patterns
- automate repetitive work
- retrieve knowledge
- interact naturally with data

The application must remain fully functional even if every AI service is disabled.

---

# Core Principle

Traditional software should solve deterministic problems.

AI should solve probabilistic problems.

Examples

Deterministic

- Authentication
- CRUD
- Permissions
- Status calculation
- Remaining balance
- Search filters
- Reports

AI

- Summaries
- Recommendations
- Natural language
- Document understanding
- Comparisons
- Classification

Never replace deterministic logic with AI.

---

# AI Layer

```
                     User

                      │

              Next.js Frontend

                      │

              Server Actions / API

                      │

               AI Orchestrator
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      │               │               │
    LLM API       Vector DB      MCP Tools
      │               │               │
      └───────────────┼───────────────┘
                      │
                Application Services
```

The AI layer never talks directly to the database.

Everything flows through application services.

---

# AI Principles

## AI Never Owns Business Logic

Business logic belongs inside services.

AI may explain decisions.

AI may recommend actions.

AI never decides critical business rules.

---

## AI Never Bypasses Permissions

If a user cannot access something normally,

AI cannot access it either.

Permission checks happen before AI receives context.

---

## AI Uses Existing Services

Instead of querying databases directly,

AI should call application services.

Example

```
AI

↓

search_assets()

↓

Asset Service

↓

Database

↓

Results

↓

AI
```

This guarantees consistent behavior.

---

## AI Must Be Explainable

If AI recommends something,

the user should understand why.

Example

Good

"This property is recommended because it shares the same location, price range and availability."

Poor

"I think this one looks good."

---

# LLM Provider

The platform should remain provider-independent.

Possible providers

- OpenAI
- Anthropic
- Google Gemini

Switching providers should require minimal code changes.

---

# LangChain

LangChain is the orchestration layer.

Its responsibilities include:

- Prompt templates
- Tool calling
- RAG pipelines
- Conversation memory
- Agent workflows

LangChain should not contain business logic.

Business logic remains inside backend services.

---

# Prompt Principles

Prompts should be:

- deterministic
- modular
- reusable
- version controlled

Avoid giant prompts.

Instead compose prompts from smaller templates.

Example

```
System Prompt

+

Project Context

+

User Request

+

Retrieved Knowledge

↓

LLM
```

---

# Context Strategy

Always provide the smallest useful context.

Avoid sending:

Entire projects

Entire databases

Entire conversations

Instead retrieve only relevant information.

Smaller context

↓

Lower cost

↓

Better answers

↓

Faster responses

---

# AI Features

---

## Natural Language Search

Example

User

> Show available villas with pools under construction.

AI

↓

Understands intent

↓

Calls search service

↓

Returns matching assets

---

## Property Summaries

Examples

Summarize

- project
- asset
- customer
- document

The summary should always be generated from real data.

---

## Comparison

Example

Compare

Asset A

Asset B

Compare

- price
- status
- size
- documents
- timeline

AI presents differences clearly.

---

## Recommendations

Examples

- Similar assets
- Similar projects
- Related documents
- Similar maintenance schedules

Initially

Rule-based

Later

Embedding-based

---

## Report Generation

Examples

Weekly report

Daily report

Executive summary

Construction progress

Payment summary

AI converts structured data into readable language.

---

# RAG

Retrieval-Augmented Generation should only be introduced when document understanding becomes necessary.

Examples

- Contracts
- Builder brochures
- HOA rules
- Inspection reports
- Maintenance manuals
- Internal SOPs

---

# RAG Pipeline

```
Upload Document

↓

Extract Text

↓

Chunk

↓

Generate Embeddings

↓

Store Vector

↓

Question

↓

Embed Question

↓

Similarity Search

↓

Relevant Chunks

↓

Prompt

↓

LLM

↓

Answer
```

The LLM never receives the entire document.

Only relevant sections.

---

# Vector Database

The vector database exists for semantic retrieval.

Not storage.

Primary use cases

- Similar assets
- Semantic search
- Document retrieval
- Recommendations
- AI memory (future)

Possible providers

- Supabase pgvector
- Pinecone
- Qdrant Cloud

Selection should remain abstracted behind a service.

---

# Embeddings

Embeddings represent meaning.

They should never replace structured database queries.

Good use

"What properties are similar?"

Bad use

"What is Property ID 482?"

Use SQL whenever exact answers exist.

---

# MCP

Model Context Protocol allows AI to interact with the application using tools.

Instead of generating answers,

the AI performs actions.

---

# MCP Philosophy

The AI should behave like an experienced operator.

It observes.

It reasons.

It calls tools.

It reports results.

It does not invent information.

---

# Example Tools

Asset Tools

```
search_assets()

get_asset()

create_asset()

update_asset()

archive_asset()
```

Project Tools

```
list_projects()

get_project()

update_project()
```

Document Tools

```
upload_document()

list_documents()

summarize_document()
```

Task Tools

```
create_task()

assign_task()

complete_task()
```

Reporting

```
generate_report()

export_csv()

export_pdf()
```

Notification

```
send_email()

notify_user()
```

Calendar

```
schedule_visit()

schedule_meeting()
```

---

# AI Decision Flow

```
User Request

↓

Understand Intent

↓

Determine Required Tools

↓

Execute Tools

↓

Collect Results

↓

Reason

↓

Generate Response
```

The LLM should reason over real data,

not imagination.

---

# Memory

Conversation history should not become permanent memory.

Future memory should be:

- explicit
- searchable
- permission-aware
- user-controlled

Graph-based memory systems may be introduced later for developer tooling or advanced assistants, but application data remains the primary source of truth.

---

# Hallucination Policy

AI must never fabricate:

- asset IDs
- payment amounts
- ownership
- project status
- dates
- employee assignments
- documents

If information is unavailable,

the AI should say so.

---

# AI Safety

The AI must:

Respect permissions

Validate tool responses

Avoid destructive actions without confirmation

Never execute irreversible operations automatically

Require confirmation for:

- deleting assets
- changing ownership
- bulk updates
- document removal
- project archival

---

# Cost Strategy

Optimize AI usage.

Rules

Retrieve before generating.

Prefer SQL over AI.

Prefer rules over AI.

Cache repeated requests where appropriate.

Only call the LLM when it adds value.

---

# Future AI Roadmap

Phase 1

- Summaries
- Comparisons
- Description generation

Phase 2

- Natural language search
- Recommendations
- Report generation

Phase 3

- RAG
- Vector search
- Document Q&A

Phase 4

- MCP
- Tool calling
- Workflow automation

Phase 5

- Multi-step AI assistants
- Cross-project reasoning
- Predictive insights

---

# Definition of Success

AI is considered successful when it:

Reduces user effort

Improves decision making

Provides trustworthy answers

Uses real application data

Never replaces deterministic systems

Feels like a knowledgeable assistant rather than an unpredictable chatbot

---

# Final Principle

AI should make OpsMap more intelligent, not more complicated.

The best AI experience is one where users trust the answers because they are grounded in real data, executed through real tools, and constrained by the same business rules that govern the rest of the platform.
