# Branch Protection Setup

Configure branch protection for `main` in GitHub repository settings.

Recommended settings:

- Require a pull request before merging.
- Require at least one approving review when collaborators are available.
- Require conversation resolution before merge.
- Require status checks before merge:
  - `repo-governance`
  - `python-tests`
  - `platform-quality`
  - `platform-build`
  - `quality-gate`
- Block force pushes.
- Block branch deletion.

Vercel deployments should normally use Git integration: pull requests receive preview deployments,
and merges to `main` create production deployments. Do not store Vercel tokens or project secrets in
the repository.
