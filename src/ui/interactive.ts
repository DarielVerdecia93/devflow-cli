import inquirer from 'inquirer';
import { UserAction } from '../types';

export async function promptMainAction(showBaseBranch = false): Promise<UserAction> {
  const choices = [
    { name: '  Accept all', value: 'accept' },
    { name: '  Edit branch name', value: 'edit_branch' },
    { name: '  Edit commit message', value: 'edit_commit' },
    { name: '  Edit PR title/description', value: 'edit_pr' },
  ];

  if (showBaseBranch) {
    choices.push({ name: '  Edit base branch (merge target)', value: 'edit_base' });
  }

  choices.push(
    { name: '  Regenerate (try again)', value: 'regenerate' },
    { name: '  Cancel', value: 'cancel' },
  );

  const { action } = await inquirer.prompt<{ action: UserAction }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices,
    },
  ]);
  return action;
}

export async function promptEditBranch(current: string): Promise<string> {
  const { branch } = await inquirer.prompt<{ branch: string }>([
    {
      type: 'input',
      name: 'branch',
      message: 'Branch name:',
      default: current,
      validate: (input: string) => {
        if (!input.trim()) return 'Branch name cannot be empty';
        if (!/^[a-z0-9/_-]+$/.test(input)) return 'Use lowercase, numbers, hyphens, underscores, slashes only';
        return true;
      },
    },
  ]);
  return branch.trim();
}

export async function promptEditCommit(current: string): Promise<string> {
  const { message } = await inquirer.prompt<{ message: string }>([
    {
      type: 'input',
      name: 'message',
      message: 'Commit message:',
      default: current,
      validate: (input: string) => input.trim().length > 0 || 'Commit message cannot be empty',
    },
  ]);
  return message.trim();
}

export async function promptEditPR(currentTitle: string, currentDesc: string): Promise<{ title: string; description: string }> {
  const { title, description } = await inquirer.prompt<{ title: string; description: string }>([
    {
      type: 'input',
      name: 'title',
      message: 'PR Title:',
      default: currentTitle,
      validate: (input: string) => input.trim().length > 0 || 'Title cannot be empty',
    },
    {
      type: 'editor',
      name: 'description',
      message: 'PR Description (opens editor):',
      default: currentDesc,
    },
  ]);
  return { title: title.trim(), description: description.trim() };
}

export async function promptConfirm(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

export async function promptEditBaseBranch(current: string): Promise<string> {
  const { branch } = await inquirer.prompt<{ branch: string }>([
    {
      type: 'input',
      name: 'branch',
      message: 'Base branch (merge target):',
      default: current,
      validate: (input: string) => input.trim().length > 0 || 'Base branch cannot be empty',
    },
  ]);
  return branch.trim();
}

export async function promptCreatePR(): Promise<boolean> {
  return promptConfirm('Create Pull Request in Azure DevOps?');
}

export async function promptContinueWithoutStaged(): Promise<boolean> {
  return promptConfirm(
    'No staged changes detected. Stage all changes (git add .) and continue?'
  );
}
