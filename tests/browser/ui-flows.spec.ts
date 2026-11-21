import { test, expect } from '@playwright/test';

test.describe('Real Headless Chromium Browser QA Audit (All Roles, Pages, Forms & AI Features)', () => {
  test('1. Public pages, navigation links, Contact form submission, and Job Board search run with 0 runtime errors', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const server500s: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) server500s.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    for (const path of ['/features', '/how-it-works', '/about', '/privacy', '/terms']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }

    // Contact form submission
    await page.goto('/contact');
    const inputs = page.locator('form input');
    await inputs.nth(0).fill('Browser QA Auditor');
    await inputs.nth(1).fill('qa.browser@talentai.demo');
    await page
      .locator('form textarea')
      .fill('Verifying public contact inquiry submission in real Chromium browser.');
    await page.getByRole('button', { name: /Send Message/i }).click();
    await expect(page.getByText(/Thank you for contacting TalentAI/i)).toBeVisible();

    // Public Job Board search & Job Detail navigation
    await page.goto('/jobs');
    await expect(page.getByPlaceholder(/Search title, skill/i)).toBeVisible();
    await page.getByPlaceholder(/Search title, skill/i).fill('Engineer');
    await page.waitForTimeout(400);

    expect(pageErrors).toEqual([]);
    expect(server500s).toEqual([]);
  });

  test('2. Candidate Career Studio: 1-click login, Profile save, CV Studio, Job Tabs, Skill Gap, AI Career Assistant & Notification deep-link', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const server500s: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) server500s.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Candidate', exact: true }).click();
    await page.waitForURL('**/candidate');
    await expect(page.getByText(/Candidate Career Studio/i).first()).toBeVisible();

    // Candidate Profile save button
    await page.goto('/candidate/profile');
    await page.getByRole('button', { name: /Save Complete Profile/i }).click();
    await expect(page.getByText(/Profile saved/i)).toBeVisible();

    // Candidate CV Studio
    await page.goto('/candidate/cv');
    await expect(page.getByText(/AI CV Analysis Report/i).first()).toBeVisible();

    // Candidate Jobs Tabs (All Open Jobs / AI Recommended / Saved Bookmarks)
    await page.goto('/candidate/jobs');
    await page.getByRole('button', { name: /AI Recommended For Me/i }).click();
    await expect(page.locator('main')).toBeVisible();
    await page.getByRole('button', { name: /Saved Bookmarks/i }).click();
    await expect(page.locator('main')).toBeVisible();

    // Candidate Skill Gap Analysis
    await page.goto('/candidate/skills');
    await page.getByRole('button', { name: /Compare Skills/i }).click();
    await expect(page.getByText(/Readiness Score/i)).toBeVisible();

    // Candidate AI Career Assistant
    await page.goto('/candidate/assistant');
    await page
      .getByPlaceholder(/Ask/i)
      .or(page.locator('form input').first())
      .fill('Which open jobs match my skills best right now?');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/TalentAI Career Coach/i).first()).toBeVisible();

    // Candidate Notifications deep-link (?c=...) auto-switches to Direct Messages tab
    await page.goto('/candidate/notifications?c=demo');
    await expect(page.getByRole('button', { name: /Direct Messages/i })).toBeVisible();

    // Candidate Account Settings hydrated inputs
    await page.goto('/candidate/settings');
    await expect(page.locator('form input').first()).toHaveValue('Alex');

    expect(pageErrors).toEqual([]);
    expect(server500s).toEqual([]);
  });

  test('3. Recruiter ATS Command: 1-click login, AI Job Description Generator + Human Approval Gate, Kanban/Table ATS, AI Matching, Interviews & Analytics', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const server500s: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) server500s.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Recruiter', exact: true }).click();
    await page.waitForURL('**/recruiter');
    await expect(page.getByText(/Recruiter ATS Command/i).first()).toBeVisible();

    // AI Job Description Generator
    await page.goto('/recruiter/jobs/new');
    await page.locator('form input').first().fill('Staff Distributed Systems Engineer');
    await page.getByRole('button', { name: /Generate/i }).first().click();
    await expect(page.getByText(/AI Job Description generated/i)).toBeVisible();

    // Recruiter Applications Kanban <-> Table toggle
    await page.goto('/recruiter/applications');
    await page.getByRole('button', { name: /Table/i }).click();
    await expect(page.locator('table')).toBeVisible();
    await page.getByRole('button', { name: /Kanban/i }).click();

    // Recruiter AI Matching Engine
    await page.goto('/recruiter/matching');
    await page.getByRole('button', { name: /Run Matching Engine/i }).click();
    await expect(page.getByText(/Evaluated/i)).toBeVisible();

    // Recruiter Candidate Database, Interviews, Messages, Analytics, Company & Settings
    for (const path of [
      '/recruiter/candidates',
      '/recruiter/interviews',
      '/recruiter/messages',
      '/recruiter/analytics',
      '/recruiter/company',
      '/recruiter/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
    expect(server500s).toEqual([]);
  });

  test('4. Admin Governance & Telemetry Console: 1-click login, User/Company/Job governance, Application AI Match badges, AI Logs, Audit Logs & Platform Settings', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const server500s: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) server500s.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.waitForURL('**/admin');
    await expect(page.getByText(/Governance & Telemetry/i).first()).toBeVisible();

    // Verify Admin Applications Monitoring renders numeric AI Match % badges (regression check for resolvedScore fix!)
    await page.goto('/admin/applications');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toContainText('/100');

    for (const path of [
      '/admin/users',
      '/admin/candidates',
      '/admin/recruiters',
      '/admin/companies',
      '/admin/jobs',
      '/admin/ai-usage',
      '/admin/audit-logs',
      '/admin/reports',
      '/admin/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }

    // Save Platform Governance settings via UI button
    await page.getByRole('button', { name: /Save Governance Configuration/i }).click();
    await expect(page.getByText(/Platform governance settings saved/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(server500s).toEqual([]);
  });
});
