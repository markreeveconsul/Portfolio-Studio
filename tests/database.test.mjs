import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// An actual local PostgreSQL engine, with minimal Supabase-owned schemas.
// This validates SQL/RLS semantics, not hosted Auth, API, or Storage delivery.
test('database migrations, access boundaries, and atomic personal saves', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$
        select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
      $$;
      grant usage on schema auth to anon, authenticated;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$
        select string_to_array(name, '/')
      $$;
      grant usage on schema storage to anon, authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    for (const migration of [
      '001_foundation.sql',
      '002_personal_information.sql',
      '003_portfolio_sections.sql',
      '004_portfolio_deletion.sql',
      '005_cebu_contact.sql',
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'),
      );
    }
    await t.test(
      'readiness inventory passes installed schema and detects a public photo bucket',
      async () => {
        const audit = await readFile(
          new URL('../supabase/tests/deployment-readiness.sql', import.meta.url),
          'utf8',
        );
        const baseline = await db.query(audit);
        assert.equal(baseline.rows.length, 13);
        assert.ok(baseline.rows.every((row) => row.result === 'PASS'));
        await db.exec('begin;');
        try {
          await db.exec("update storage.buckets set public=true where id='profile-photos';");
          const changed = await db.query(audit);
          assert.equal(
            changed.rows.find((row) => row.check_name.startsWith('Profile photo bucket')).result,
            'CHECK REQUIRED',
          );
        } finally {
          await db.exec('rollback;');
        }
      },
    );
    await t.test('the supplied owner/admin/anonymous RLS assertions pass', async () => {
      await db.exec(
        await readFile(new URL('../supabase/tests/access-control.sql', import.meta.url), 'utf8'),
      );
    });

    const a = '30000000-0000-4000-8000-000000000001';
    const b = '30000000-0000-4000-8000-000000000002';
    const admin = '30000000-0000-4000-8000-000000000003';
    await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4),($5,$6)', [
      a,
      'a@example.invalid',
      b,
      'b@example.invalid',
      admin,
      'admin@example.invalid',
    ]);
    await db.query('insert into private.admin_users(user_id) values ($1)', [admin]);
    async function asUser(id) {
      await db.exec('reset role; set role authenticated;');
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({ sub: id, role: 'authenticated' }),
      ]);
    }
    async function save(name, links, revision = null) {
      const result = await db.query(
        'select public.save_personal_information($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz) as portfolio',
        [
          name,
          'alex@example.com',
          '',
          'Singapore',
          'My introduction',
          JSON.stringify(links),
          revision,
        ],
      );
      return result.rows[0].portfolio;
    }
    await asUser(a);
    let original;
    let edited;
    await t.test('creates an owner-bound portfolio and ordered links in one call', async () => {
      original = await save('Alex', [
        { label: 'GitHub', url: 'https://github.com/example' },
        { label: 'Website', url: 'https://example.com' },
      ]);
      assert.equal(original.owner_id, a);
      assert.deepEqual(
        original.social_links.map((link) => link.label),
        ['GitHub', 'Website'],
      );
    });
    await t.test(
      'a link constraint failure rolls back the parent update and link deletion',
      async () => {
        await assert.rejects(
          save(
            'Must not persist',
            [{ label: '', url: 'https://example.com' }],
            original.updated_at,
          ),
          (error) => error.code === '23514',
        );
        const parent = await db.query(
          'select full_name,updated_at from public.portfolios where id=$1',
          [original.id],
        );
        assert.equal(parent.rows[0].full_name, 'Alex');
        const links = await db.query(
          'select label from public.social_links where portfolio_id=$1 order by position',
          [original.id],
        );
        assert.deepEqual(
          links.rows.map((link) => link.label),
          ['GitHub', 'Website'],
        );
      },
    );
    await t.test('rejects unsafe links at the database boundary', async () => {
      await assert.rejects(
        save('Alex', [{ label: 'Unsafe', url: 'javascript:alert(1)' }], original.updated_at),
        (error) => error.code === '22023',
      );
    });
    await t.test('updates an existing portfolio without duplicating it', async () => {
      edited = await save('Alex Updated', [], original.updated_at);
      assert.equal(edited.id, original.id);
      assert.notEqual(edited.updated_at, original.updated_at);
      assert.equal(edited.social_links.length, 0);
      const result = await db.query('select count(*)::integer as count from public.portfolios');
      assert.equal(result.rows[0].count, 1);
    });
    await t.test('rejects stale revisions instead of silently overwriting', async () => {
      await assert.rejects(
        save('Stale edit', [], original.updated_at),
        (error) => error.code === 'P0002',
      );
      const result = await db.query('select full_name from public.portfolios where id=$1', [
        original.id,
      ]);
      assert.equal(result.rows[0].full_name, 'Alex Updated');
    });
    await t.test(
      'a second user cannot read the first user data and only saves their own',
      async () => {
        await asUser(b);
        const result = await db.query('select id from public.portfolios where id=$1', [
          original.id,
        ]);
        assert.equal(result.rows.length, 0);
        const own = await save('Owner B', []);
        assert.equal(own.owner_id, b);
        assert.notEqual(own.id, original.id);
      },
    );
    await t.test('admin can read both portfolios but cannot edit another owner', async () => {
      await asUser(admin);
      const visible = await db.query('select id from public.portfolios where owner_id in ($1,$2)', [
        a,
        b,
      ]);
      assert.equal(visible.rows.length, 2);
      const changed = await db.query(
        'update public.portfolios set full_name=$1 where id=$2 returning id',
        ['Admin edit', original.id],
      );
      assert.equal(changed.rows.length, 0);
      // An existing other-owner revision cannot be used to redirect the RPC.
      await assert.rejects(
        save('Admin edit via RPC', [], edited.updated_at),
        (error) => error.code === 'P0002',
      );
    });
    await t.test(
      'private photo policies isolate owners and grant admin read-only access',
      async () => {
        await asUser(a);
        await db.query("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [
          `${a}/photo.png`,
        ]);
        await asUser(b);
        assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
        await assert.rejects(
          db.query("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [
            `${a}/other.png`,
          ]),
          (error) => error.code === '42501',
        );
        await asUser(admin);
        assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
        assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 0);
      },
    );
    await asUser(a);
    const sections = {
      education: [
        {
          institution: 'Example University',
          qualification: 'BS IT',
          start_date: '2023-08-01',
          end_date: '',
        },
      ],
      skills: [{ name: 'React' }, { name: 'SQL' }],
      projects: [
        {
          title: 'Campus Companion',
          description: 'A student project',
          project_url: 'https://example.com',
          repository_url: '',
        },
      ],
      experience: [
        {
          organization: 'Campus IT',
          role_title: 'Volunteer',
          description: 'Helped students',
          start_date: '2025-01-01',
          end_date: '2025-06-01',
        },
      ],
    };
    async function saveFull(data, revision, name = 'Alex Complete') {
      const result = await db.query(
        'select public.save_portfolio_information($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::timestamptz) as portfolio',
        [
          name,
          'alex@example.com',
          '',
          'Singapore',
          'My introduction',
          '[]',
          JSON.stringify(data.education),
          JSON.stringify(data.skills),
          JSON.stringify(data.projects),
          JSON.stringify(data.experience),
          revision,
        ],
      );
      return result.rows[0].portfolio;
    }
    let complete;
    await t.test('saves all sections in order and supports open-ended dates', async () => {
      complete = await saveFull(sections, edited.updated_at);
      assert.equal(complete.education[0].end_date, null);
      assert.deepEqual(
        complete.skills.map((entry) => entry.name),
        ['React', 'SQL'],
      );
      assert.equal(complete.projects[0].title, 'Campus Companion');
      assert.equal(complete.experience[0].role_title, 'Volunteer');
    });
    await t.test(
      'failure in the final section rolls back every earlier replacement and parent edit',
      async () => {
        await assert.rejects(
          saveFull(
            {
              ...sections,
              skills: [{ name: 'Must not persist' }],
              experience: [{ ...sections.experience[0], end_date: '2024-01-01' }],
            },
            complete.updated_at,
            'Must not persist',
          ),
          (error) => error.code === '23514',
        );
        const parent = await db.query('select full_name from public.portfolios where id=$1', [
          complete.id,
        ]);
        assert.equal(parent.rows[0].full_name, 'Alex Complete');
        const skills = await db.query(
          'select name from public.skills where portfolio_id=$1 order by position',
          [complete.id],
        );
        assert.deepEqual(
          skills.rows.map((row) => row.name),
          ['React', 'SQL'],
        );
      },
    );
    await t.test('rejects executable project links and invalid JSON shapes', async () => {
      await assert.rejects(
        saveFull(
          {
            ...sections,
            projects: [{ ...sections.projects[0], project_url: 'javascript:alert(1)' }],
          },
          complete.updated_at,
        ),
        (error) => error.code === '22023',
      );
      await assert.rejects(
        saveFull({ ...sections, skills: { name: 'not an array' } }, complete.updated_at),
        (error) => error.code === '22023',
      );
    });
    await t.test('enforces read-only admin access on every added section', async () => {
      await asUser(admin);
      for (const table of ['education', 'skills', 'projects', 'experience']) {
        assert.ok(
          (await db.query(`select id from public.${table} where portfolio_id=$1`, [complete.id]))
            .rows.length > 0,
        );
        assert.equal(
          (
            await db.query(`delete from public.${table} where portfolio_id=$1 returning id`, [
              complete.id,
            ])
          ).rows.length,
          0,
        );
      }
      await assert.rejects(
        saveFull(sections, complete.updated_at),
        (error) => error.code === 'P0002',
      );
      await asUser(b);
      for (const table of ['education', 'skills', 'projects', 'experience']) {
        assert.equal(
          (await db.query(`select id from public.${table} where portfolio_id=$1`, [complete.id]))
            .rows.length,
          0,
        );
      }
    });
    await t.test(
      'clearing optional sections removes their saved entries without duplicating the parent',
      async () => {
        await asUser(a);
        const cleared = await saveFull(
          { education: [], skills: [], projects: [], experience: [] },
          complete.updated_at,
        );
        assert.equal(cleared.id, complete.id);
        for (const table of ['education', 'skills', 'projects', 'experience'])
          assert.equal(cleared[table].length, 0);
      },
    );
    await t.test(
      'photo removal, anonymous denial, and bucket configuration stay private',
      async () => {
        await asUser(admin);
        assert.equal((await db.query('select name from storage.objects')).rows.length, 1);
        assert.equal((await db.query('delete from storage.objects returning name')).rows.length, 0);
        assert.equal(
          (
            await db.query('update storage.objects set name=$1 returning name', [
              a + '/changed.png',
            ])
          ).rows.length,
          0,
        );
        await asUser(a);
        assert.equal((await db.query('delete from storage.objects returning name')).rows.length, 1);
        await db.exec('reset role; set role anon;');
        await assert.rejects(
          db.query('select name from storage.objects'),
          (e) => e.code === '42501',
        );
        await db.exec('reset role;');
        const bucket = (
          await db.query(
            "select public,file_size_limit from storage.buckets where id='profile-photos'",
          )
        ).rows[0];
        assert.equal(bucket.public, false);
        assert.equal(Number(bucket.file_size_limit), 2097152);
      },
    );
    await t.test(
      'template changes preserve content, reject stale writes and remain owner-only',
      async () => {
        await asUser(a);
        const before = (await db.query('select * from public.portfolios where owner_id=$1', [a]))
          .rows[0];
        const changed = (
          await db.query(
            "update public.portfolios set template='modern' where id=$1 and updated_at=$2 returning *",
            [before.id, before.updated_at],
          )
        ).rows[0];
        assert.equal(changed.template, 'modern');
        assert.equal(changed.full_name, before.full_name);
        assert.equal(changed.photo_path, before.photo_path);
        assert.equal(
          (
            await db.query(
              "update public.portfolios set template='creative' where id=$1 and updated_at=$2 returning id",
              [before.id, before.updated_at],
            )
          ).rows.length,
          0,
        );
        await asUser(admin);
        assert.equal(
          (
            await db.query(
              "update public.portfolios set template='creative' where id=$1 returning id",
              [before.id],
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (await db.query('select template from public.portfolios where id=$1', [before.id]))
            .rows[0].template,
          'modern',
        );
      },
    );
    await t.test('deletion rejects outsiders, admin writes, and stale revisions', async () => {
      await asUser(a);
      const row = (await db.query('select * from public.portfolios where owner_id=$1', [a]))
        .rows[0];
      await assert.rejects(
        db.query('select public.delete_own_portfolio($1,$2)', [row.id, '2000-01-01']),
        (e) => e.code === 'P0002',
      );
      await asUser(b);
      await assert.rejects(
        db.query('select public.delete_own_portfolio($1,$2)', [row.id, row.updated_at]),
        (e) => e.code === 'P0002',
      );
      await asUser(admin);
      await assert.rejects(
        db.query('select public.delete_own_portfolio($1,$2)', [row.id, row.updated_at]),
        (e) => e.code === 'P0002',
      );
    });
    await t.test(
      'owner deletion cascades sections and queues its photo without deleting the account',
      async () => {
        await asUser(a);
        const row = (
          await db.query(
            'update public.portfolios set photo_path=$1 where owner_id=$2 returning *',
            [a + '/final.png', a],
          )
        ).rows[0];
        await db.query('insert into public.skills(portfolio_id,name) values($1,$2)', [
          row.id,
          'Delete fixture',
        ]);
        await db.query('select public.delete_own_portfolio($1,$2)', [row.id, row.updated_at]);
        assert.equal(
          (await db.query('select id from public.portfolios where id=$1', [row.id])).rows.length,
          0,
        );
        assert.equal(
          (await db.query('select id from public.skills where portfolio_id=$1', [row.id])).rows
            .length,
          0,
        );
        assert.equal(
          (await db.query('select photo_path from public.photo_cleanup_jobs')).rows[0].photo_path,
          a + '/final.png',
        );
        await asUser(b);
        assert.equal((await db.query('select id from public.photo_cleanup_jobs')).rows.length, 0);
        await assert.rejects(
          db.query('insert into public.photo_cleanup_jobs(owner_id,photo_path) values($1,$2)', [
            a,
            a + '/no.png',
          ]),
          (e) => e.code === '42501',
        );
        await db.exec('reset role;');
        assert.equal((await db.query('select id from auth.users where id=$1', [a])).rows.length, 1);
      },
    );
    await t.test('Cebu save preserves legacy data and rolls back invalid addresses', async () => {
      await asUser(b);
      const current = (await db.query('select * from public.portfolios where owner_id=$1', [b]))
        .rows[0];
      const call = (address, revision) =>
        db.query(
          'select public.save_cebu_portfolio($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::timestamptz,$12::jsonb) as portfolio',
          [
            'Cebu test',
            '',
            '+639171234567',
            'Legacy address',
            '',
            '[]',
            '[]',
            '[]',
            '[]',
            '[]',
            revision,
            address === null ? null : JSON.stringify(address),
          ],
        );
      const legacy = (await call(null, current?.updated_at ?? null)).rows[0].portfolio;
      assert.equal(legacy.address, 'Legacy address');
      await assert.rejects(
        call({ barangay: 'Not a barangay', street: '', postal_code: '6000' }, legacy.updated_at),
        (e) => e.code === '23514',
      );
      const unchanged = (await db.query('select * from public.portfolios where owner_id=$1', [b]))
        .rows[0];
      assert.equal(unchanged.address, 'Legacy address');
      const saved = (
        await call(
          { barangay: 'Lahug', street: 'Sample street', postal_code: '6000' },
          legacy.updated_at,
        )
      ).rows[0].portfolio;
      assert.equal(saved.address, 'Cebu City, Philippines');
      assert.equal(saved.cebu_address.postal_code, '6000');
      await assert.rejects(call(null, legacy.updated_at), (e) => e.code === 'P0002');
      await asUser(a);
      assert.equal(
        (await db.query('select cebu_address from public.portfolios where owner_id=$1', [b])).rows
          .length,
        0,
      );
    });
    await t.test(
      'Cebu coverage rejects mismatched barangays and supports all selected locations',
      async () => {
        await db.exec('reset role;');
        await db.exec(
          await readFile(
            new URL('../supabase/migrations/006_cebu_province.sql', import.meta.url),
            'utf8',
          ),
        );
        await asUser(b);
        const locations = JSON.parse(
          await readFile(
            new URL('../src/features/portfolio/cebu-locations.json', import.meta.url),
            'utf8',
          ),
        );
        assert.equal(locations.length, 53);
        assert.equal(
          locations.reduce((count, city) => count + city.barangays.length, 0),
          1203,
        );
        assert.equal(new Set(locations.map((city) => city.code)).size, 53);
        const addresses = locations.flatMap((city) =>
          city.barangays.map((barangay) => ({
            city_code: city.code,
            barangay,
            street: '',
            postal_code: '',
          })),
        );
        const checked = await db.query(
          'select bool_and(public.valid_cebu_location(value)) as valid from jsonb_array_elements($1::jsonb)',
          [JSON.stringify(addresses)],
        );
        assert.equal(checked.rows[0].valid, true);
        for (const address of [
          { city_code: '0731100000', barangay: 'Pajo', street: '', postal_code: '6015' },
          { city_code: '0731300000', barangay: 'Banilad', street: '', postal_code: '6014' },
          { city_code: '0702201000', barangay: 'Cabadiangan', street: '', postal_code: '' },
          { city_code: '', barangay: '', street: '', postal_code: '' },
          { barangay: 'Lahug', street: '', postal_code: '6000' },
        ]) {
          assert.equal(
            (
              await db.query('select public.valid_cebu_location($1::jsonb) as valid', [
                JSON.stringify(address),
              ])
            ).rows[0].valid,
            true,
          );
        }
        for (const address of [
          { city_code: '0731100000', barangay: 'Lahug', street: '', postal_code: '' },
          { city_code: '9999999999', barangay: '', street: '', postal_code: '' },
          { city_code: '', barangay: 'Lahug', street: '', postal_code: '' },
          { city_code: null, barangay: '', street: '', postal_code: '' },
        ])
          assert.equal(
            (
              await db.query('select public.valid_cebu_location($1::jsonb) as valid', [
                JSON.stringify(address),
              ])
            ).rows[0].valid,
            false,
          );
        const before = (await db.query('select * from public.portfolios where owner_id=$1', [b]))
          .rows[0];
        const params = [
          'Expanded Cebu',
          '',
          '',
          'Old address',
          '',
          '[]',
          '[]',
          '[]',
          '[]',
          '[]',
          before.updated_at,
          JSON.stringify({
            city_code: '0731100000',
            barangay: 'Pajo',
            street: '',
            postal_code: '6015',
          }),
        ];
        const query =
          'select public.save_cebu_portfolio($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::timestamptz,$12::jsonb) as portfolio';
        const saved = (await db.query(query, params)).rows[0].portfolio;
        assert.equal(saved.address, 'Lapu-Lapu City, Philippines');
        assert.equal(saved.cebu_address.barangay, 'Pajo');
        params[10] = saved.updated_at;
        params[11] = JSON.stringify({
          city_code: '0731100000',
          barangay: 'Lahug',
          street: '',
          postal_code: '',
        });
        await assert.rejects(db.query(query, params), (e) => e.code === '23514');
        assert.equal(
          (await db.query('select cebu_address from public.portfolios where owner_id=$1', [b]))
            .rows[0].cebu_address.barangay,
          'Pajo',
        );
      },
    );
    await t.test('new templates survive upgrade and remain owner-only', async () => {
      await db.exec('reset role;');
      await db.exec(
        await readFile(
          new URL('../supabase/migrations/007_professional_templates.sql', import.meta.url),
          'utf8',
        ),
      );
      await asUser(b);
      const before = (await db.query('select * from public.portfolios where owner_id=$1', [b]))
        .rows[0];
      for (const template of ['resume', 'showcase']) {
        const saved = (
          await db.query('update public.portfolios set template=$1 where id=$2 returning *', [
            template,
            before.id,
          ])
        ).rows[0];
        assert.equal(saved.template, template);
        assert.equal(saved.full_name, before.full_name);
        assert.deepEqual(saved.cebu_address, before.cebu_address);
        assert.equal(saved.photo_path, before.photo_path);
      }
      await assert.rejects(
        db.query("update public.portfolios set template='unknown' where id=$1", [before.id]),
        (e) => e.code === '23514',
      );
      await asUser(admin);
      assert.equal(
        (
          await db.query(
            "update public.portfolios set template='resume' where id=$1 returning id",
            [before.id],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query('select template from public.portfolios where id=$1', [before.id])).rows[0]
          .template,
        'showcase',
      );
    });
  } finally {
    await db.close();
  }
});
