# Contributing to BuildRight

Thank you for your interest in contributing to BuildRight!

## Code of Conduct

Please be respectful and inclusive in all interactions.

## How to Contribute

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
3.  **Create a branch** for your feature or fix:
    ```bash
    git checkout -b feature/amazing-feature
    ```
4.  **Make your changes**.
5.  **Commit your changes** with descriptive messages.
6.  **Push to your branch**.
7.  **Open a Pull Request** to the `Master` branch of this repository.

## Team rules for shared branches

- Change `Master` only through pull requests, and merge only when CI is green.
- Never force-push, rebase or amend a branch someone else has pulled. Rewriting shared
  history is what caused the duplicated work reconciled in pull request 20. To bring a
  branch up to date, merge `Master` into it.
- Keep secrets, `.env` files and database dumps out of commits. `.gitignore` covers the
  usual names; check `git status` before committing anyway.

## Development Standards

- Match the style of the file you are editing: ES modules, clear names, comments that
  explain why rather than what.
- Run the tests before pushing (see [SETUP.md](SETUP.md#tests)); CI runs the same
  suites and a pull request with red CI is not merged.
- Any user-facing text goes into both `Frontend/src/i18n/en.js` and `fr.js`; a test
  fails if the two drift apart.
- Database changes need a numbered migration and a matching `Database/schema.sql` edit.

## Reporting Bugs

Open an issue on GitHub with details about the bug and reproduction steps.
