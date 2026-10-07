# Cebu City contact update

Local implementation; not yet deployed.

Country and city are fixed to Philippines / Cebu City. The barangay selector can be filtered by name. Barangay, street/building/unit, phone, and four-digit postal code remain optional. Postal validation checks format, not postal delivery coverage. Phones accept Philippine mobile numbers and Cebu landlines with area code 032.

The 80 barangay names follow the PSA PSGC table (table dated 31 July 2025), retrieved 7 October 2026: https://psa.gov.ph/classification/psgc/barangays/0730600000 .

Existing addresses are kept as legacy text until the owner selects Use Cebu City address fields and saves. Unchanged legacy phone numbers remain accepted. New structured addresses show only Cebu City, Philippines in portfolio templates. Detailed address data remains protected by the existing owner/admin read policies.

## Release order

1. In Supabase SQL Editor, run supabase/migrations/005_cebu_contact.sql once, after migrations 001–004. It adds a nullable column and a new save function; the older deployed client remains compatible.
2. Upload the updated src folder and migration, retaining all subfolders. Include tests/cebu.test.tsx and the updated tests/database.test.mjs for source completeness. Keep any unrelated local photo-picker experiment out of this release.
3. Run the normal build and tests on an unrestricted machine before deploying. This workspace requires temporary symlink-resolution overrides because Windows denies realpath calls; those overrides are not committed to Vite configuration.
4. Verify an existing account retains its address after an unrelated edit; opt into the new fields, save, reload, and check the selected barangay and postal code. Check another owner cannot access it. Test the selector and phone field on mobile.

The first-time-setup.sql bundle currently includes migrations 001–003; new installations must also apply 004 and 005 in order. Do not rerun first-time setup on an existing database.
