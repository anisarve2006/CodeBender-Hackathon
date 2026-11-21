## Pull Request Checklist

Please ensure all checks are complete before requesting a review:

- [ ] **File Ownership:** Changed only files owned by you or shared changes agreed by both team members (per `docs/COLLABORATION.md`).
- [ ] **Database Migrations:** If database schema was modified, generated migration was re-checked and regenerated after rebasing on `main`.
- [ ] **Synthetic Data Only:** Verified that NO real patient names, prescriptions, or sensitive medical records are introduced.
- [ ] **UI Screenshots:** Included mobile and desktop layout screenshots for any visual changes.
- [ ] **Quality Gates:** `npm run lint`, `npm run typecheck`, and `npm run test` pass locally.
