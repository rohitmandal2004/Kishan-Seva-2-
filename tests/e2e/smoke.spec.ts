import { test, expect } from '@playwright/test';

test('Farmer can access login page', async ({ page }) => {
  await page.goto('/farmer/login');
  
  // Expect the page to have the login form
  await expect(page.getByText('Farmer Login')).toBeVisible();
  await expect(page.getByPlaceholder('Email or Mobile Number')).toBeVisible();
  await expect(page.getByPlaceholder('Enter 6-digit PIN / OTP')).toBeVisible();
});

test('Landing page has correct title and elements', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Kishan Seva/i);
  
  // Expect the hero section to be visible
  await expect(page.getByText('Direct Benefit Transfer')).toBeVisible();
});
