// Generates ./sample-library covering every artifact type + tags, so discovery,
// the HTML qualifier, rendered views, and Chops-style skills/agents all show.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sample-library');
const w = (rel, content) => {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};
fs.rmSync(root, { recursive: true, force: true });

// --- Prompts (with tags) -----------------------------------------------------
w('prompts/code-review.md', `---
name: Code Review Assistant
description: Reviews a diff for bugs, security, and style.
model: claude-opus-4
tags: engineering, review, quality
---
# Code Review Assistant
You are a meticulous senior engineer. Review the following diff and flag:

- **Correctness** bugs
- **Security** issues
- **Style** nits

Return findings as a bulleted list.`);
w('prompts/summarize.prompt', `Summarize the input text in exactly three bullet points.`);
w('prompts/meeting-notes.md', `---
name: Meeting Facilitator
description: Runs a retro and captures action items.
tags: productivity, meetings
---
Guide a retrospective and capture action items.`);

// --- Standalone HTML documents ----------------------------------------------
w('sites/landing.html', `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>Acme Launch</title>
<meta name="description" content="A self-contained marketing landing page.">
<meta name="keywords" content="marketing, launch">
<style>body{font-family:sans-serif;padding:40px}h1{color:#4f46e5}</style></head>
<body><h1>Welcome to Acme</h1><p>Inline styles, no bundle. A true document.</p></body></html>`);
w('reports/q3-report.html', `<!doctype html><html><head><title>Q3 Report</title>
<style>.k{font-weight:bold;color:#0e7c5a}</style></head><body><h1>Q3 Results</h1>
<p class="k">Revenue up 20%.</p></body></html>`);

// --- Embedded HTML -----------------------------------------------------------
w('my-webapp/package.json', `{"name":"my-webapp","version":"1.0.0"}`);
w('my-webapp/dist/index.html', `<!doctype html><html><head><title>App</title>
<script src="/assets/index.a3f9c1.js"></script></head>
<body><div id="root"></div></body></html>`);
w('my-webapp/templates/email.html', `<html><body>
<h1>Hello {{ user.name }}</h1>
{% if order %}<p>Order #{{ order.id }}</p>{% endif %}
</body></html>`);
w('my-webapp/views/_card.html', `<div class="card"><h3>{{ title }}</h3><slot></slot></div>`);
w('my-webapp/vendor/widget/demo.html', `<!doctype html><html><head><title>Widget Demo</title>
<script src="widget.bundle.js"></script></head><body><div id="app"></div></body></html>`);

// --- Components (.jsx / .tsx) ------------------------------------------------
w('my-webapp/src/Button.tsx', `/**
 * Primary button with variants.
 */
import React from 'react';
export function Button({ variant = 'primary', children }) {
  const [hover, setHover] = React.useState(false);
  return <button className={variant} onMouseEnter={() => setHover(true)}>{children}</button>;
}`);
w('my-webapp/src/UserCard.jsx', `// Displays a user's avatar and name.
import { useState, useEffect } from 'react';
export default function UserCard({ user }) {
  const [online, setOnline] = useState(false);
  useEffect(() => {}, []);
  return <div className="user-card">{user.name}</div>;
}`);

// --- Chops-style project skills & agents ------------------------------------
w('my-webapp/.claude/skills/pdf-export/SKILL.md', `---
name: PDF Export
description: Export the current report to a styled PDF.
tags: export, pdf
---
# PDF Export
Steps to render a report to PDF...`);
w('my-webapp/.claude/agents/reviewer.md', `---
name: Reviewer Agent
description: Autonomous PR reviewer.
tags: review
---
You are an autonomous reviewer agent.`);
w('my-webapp/.cursor/rules/style.mdc', `---
name: Style Rules
description: House style conventions for this repo.
tags: style
---
Always use 2-space indentation.`);

console.log('Seeded sample-library at', root);
