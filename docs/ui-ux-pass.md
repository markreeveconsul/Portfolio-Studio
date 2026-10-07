# Dashboard/editor usability pass

Adds a short setup guide, a sticky Save changes action that keeps users in the editor, and clearer preview guidance. Required name/email fields precede the photo panel. Photo guidance now points to Save changes so a first-time user can save and upload without navigating away. Save & continue still opens the saved preview.

Save failures are displayed near the top actions. Unsaved input remains intact. Mobile fields use 16px text, repeated entries stack in one column, navigation scrolls horizontally, and editor buttons have larger touch targets. Workspace navigation exposes its current page to assistive technology.

Validation: 66 UI tests passed including both successful and failed in-place saving; TypeScript and production builds passed. Vite/Vitest used the documented local filesystem workaround. Browser visual inspection could not connect to the sandbox preview server. Desktop and phone visual testing remains required before sending the link to classmates.

No new database migration is introduced by this UI pass. The cumulative upload package includes the earlier Cebu update and requires migrations 005 and 006 to have been applied in order. Do not rerun an installed migration. The photo chooser improvement is included in this pass; native file selection still needs an actual-phone check.
