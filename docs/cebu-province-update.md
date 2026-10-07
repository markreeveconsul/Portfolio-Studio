# Cebu coverage and searchable dropdowns

Coverage: Cebu province plus Cebu City, Lapu-Lapu City and Mandaue City. The static dataset contains 53 cities/municipalities and 1,203 barangays. No external API is called while filling out the form.

## Data sources

Downloaded on 7 October 2026 from the community-maintained PSGC API:
- https://psgc.gitlab.io/api/cities-municipalities/
- https://psgc.gitlab.io/api/provinces/072200000/barangays/

Coverage totals checked against the PSA province/city summaries: https://psa.gov.ph/classification/psgc/citimuni/0702200000 and https://psa.gov.ph/classification/psgc/summary . This is a bundled snapshot, not a claim of live or latest official data. The official API requires a token. Cebu City's 80 names retain the PSA spellings already used by migration 005 (https://psa.gov.ph/classification/psgc/barangays/0730600000), so existing selections remain valid. City labels are displayed as Cebu City, Bogo City, etc. PSGC codes identify city/municipality records.

## Behavior

Select a city/municipality, then click the barangay control and type to filter within it. Arrow keys navigate, Enter chooses, Escape cancels a search, and Tab leaves the field. A selected value stays unchanged until another option is chosen. Changing city clears barangay and postal code; street text is retained for editing. Address details remain optional. No city selection displays Cebu, Philippines; a selected city displays its name and Philippines.

Old structured addresses without city_code are treated as Cebu City. Old free-text addresses stay unchanged unless explicitly converted. SQL validates the city/barangay pair, including requests outside the UI. The existing owner/admin read policies remain in force.

## Apply

1. Migration 005 is already installed according to the owner. Run supabase/migrations/006_cebu_province.sql ONCE in Supabase SQL Editor. Do not rerun 005. Migration 006 is transactional and validates existing records.
2. Upload the folders from outputs/cebu-province-release to the existing repository root, preserving paths and keeping other files. Commit. Wait for Vercel Ready.
3. Check Cebu City/Lahug, Lapu-Lapu City/Pajo and a municipality. Search, select, save, reload and preview. Test on a phone as well. Existing Cebu City records must remain valid.

Local validation: 64 UI tests; database tests cover upgrade with existing migration-005 records, every bundled city/barangay pair, rejection of mismatches, atomic saves, stale revisions, and access control. TypeScript and production build checks completed. Windows filesystem restrictions require temporary preserveSymlinks overrides for Vite/Vitest; production configuration stays unchanged. Browser visual review in this session could not connect to the local preview server, so a visual check on the deployed site is still needed.
