# Submission checklist

Updated 8 October 2026. Personal author, course/section and instructor details remain blank for the owner to complete.

## Prepared

- [x] Website and source repository URLs included in the report.
- [x] Documentation updated for five templates, Cebu coverage and migrations 001–007.
- [x] Database relationships, privacy model and save/delete flows documented.
- [x] User guide, source study guide and demo walkthrough updated.
- [x] Feedback tracker created; no classmate results fabricated.
- [x] Screenshot capture list prepared for the owner.

## Still to complete

- [ ] Review actual Google Form responses and enter findings in feedback-tracker.md.
- [ ] Capture final desktop, all-five-template and phone screenshots using screenshot-checklist.md.
- [ ] Independently verify authenticated save/reload, template persistence and admin read-only access on the current live release.
- [ ] Retest prioritized fixes and record the deployed version.
- [ ] Perform the deferred security review before making broad security claims.
- [ ] Arrange instructor access to the private repository, or prepare the requested clean source archive.
- [ ] Add personal details and export the report to the instructor's required format.
- [ ] Rehearse presentation-notes.md twice with a fictional test account and a supported photo.

## Evidence boundaries

Latest local tests: 72 UI/service tests and 22 database subtests (23 including parent). TypeScript/build passed using temporary Windows filesystem-resolution overrides. The owner reported completing deployment steps. On 8 October the agent observed five template choices on the signed-out homepage. This is not a complete live acceptance test. Earlier owner reports cover successful phone uploads and core flows; device versions were not recorded. Final screenshots are deferred to the owner.

## Packaging

Submit source, build configuration, lockfile, migrations, tests and docs. Exclude .env.local, passwords, client secrets, service-role keys, node_modules and unnecessary build artifacts. Retain docs/screenshots beside the report for relative image links. Documentation edits remain local until uploaded; this preparation does not change the live application.
