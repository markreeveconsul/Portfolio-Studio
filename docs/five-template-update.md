# Five-template update

Professional Résumé is a compact single-column layout with restrained headings, experience, education, skills, and projects. Project Showcase places numbered projects first, with experience, education, skills, and contact information below. Both use saved content and private photos; empty sections are omitted. Switching styles does not rewrite portfolio content.

The chooser now has schematic layout thumbnails for all five templates. Selecting a choice renders the full preview using the user's saved information. Save template is still required to persist a selection. The landing page lists all five choices.

## Release

Apply migration 007_professional_templates.sql once after migration 006, then upload this package. Do not rerun migrations that are already installed. The combined package includes the Cebu update, UI improvements and Philippine flag beside +63. No credentials are included.

On Vercel Ready, select Professional Résumé, save, reload, and verify the selection persists. Repeat for Project Showcase; check content, links and photo remain present. Review long names, empty sections, and narrow phone screens. The thumbnails show layout structure, not screenshots.

Database tests cover saving both new values, rejecting unknown values and preventing admin edits to another owner's template. UI tests cover all five renderers, unsafe links, empty sections, preview-before-save and selection persistence through saved records. Build/typechecking use the established local Windows resolution workaround. Visual browser and actual-phone review is still pending; the browser previously could not reach the sandbox preview server.
