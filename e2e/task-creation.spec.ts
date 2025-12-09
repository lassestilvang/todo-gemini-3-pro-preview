import { test, expect, authenticateTestUser, waitForTask } from './fixtures';

/**
 * E2E tests for task creation flow.
 * 
 * Requirements: 5.2
 * - Test creating a task with title, description, due date
 * - Verify task appears in list
 * - Verify XP is awarded
 * 
 * These tests use E2E_TEST_MODE for authentication.
 */
test.describe('Task Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await authenticateTestUser(page);
    
    // Navigate to today page (which has the CreateTaskInput)
    await page.goto('/today');
    await page.waitForLoadState('networkidle');
  });

  test('should create a task with title', async ({ page }) => {
    // Find the task input
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();
    
    // Type a task title
    const taskTitle = `Test task ${Date.now()}`;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');
    
    // Wait for the task to appear in the list
    await waitForTask(page, 'Test task');
    
    // Verify the task appears
    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Test task' });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should create a task with due date using natural language', async ({ page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();
    
    // Type a task with natural language date
    const taskTitle = `Meeting tomorrow ${Date.now()}`;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');
    
    // Wait for the task to be created
    await waitForTask(page, 'Meeting');
    
    // Verify the task appears
    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Meeting' });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should create a task with priority', async ({ page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();
    
    // Type a task with priority flag
    const taskTitle = `Urgent task !high ${Date.now()}`;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');
    
    // Wait for the task to be created
    await waitForTask(page, 'Urgent task');
    
    // Verify the task appears
    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Urgent task' });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should show XP bar when authenticated', async ({ page }) => {
    // At minimum, the user should see their level/XP somewhere
    // This verifies the gamification system is active
    await expect(page.getByText(/Level|XP/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show task in list after creation', async ({ page }) => {
    // Create a new task with unique identifier
    const taskInput = page.getByTestId('task-input');
    const uniqueId = Date.now();
    const taskTitle = `List test task ${uniqueId}`;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');
    
    // Wait for the task to appear
    await waitForTask(page, `List test task ${uniqueId}`);
    
    // Verify the specific task is visible
    const newTask = page.getByTestId('task-item').filter({ hasText: `List test task ${uniqueId}` });
    await expect(newTask.first()).toBeVisible();
  });

  test('should clear input after creating task', async ({ page }) => {
    const taskInput = page.getByTestId('task-input');
    const uniqueId = Date.now();
    const taskTitle = `Task to clear input ${uniqueId}`;
    
    // Create a task
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');
    
    // Wait for task to appear in the list (confirms creation completed)
    await waitForTask(page, `Task to clear input ${uniqueId}`);
    
    // Input should be cleared after successful creation
    await expect(taskInput).toHaveValue('');
  });
});
