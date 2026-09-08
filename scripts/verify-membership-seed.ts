import postgres from "postgres";

async function main() {
  const sql = postgres("postgres://clinic:clinic@127.0.0.1:54329/clinic", { max: 1 });
  const types = await sql`
    select slug, invitation_only, applications_open
    from membership_types
    order by sort_order
  `;
  const tracks = await sql`select slug from tracks order by sort_order`;
  const mig = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
  console.log(
    JSON.stringify(
      {
        typeCount: types.length,
        types: types.map((t) => t.slug),
        founding: types.find((t) => t.slug === "founding_member"),
        trackCount: tracks.length,
        migrations: mig[0]?.n,
      },
      null,
      2,
    ),
  );
  await sql.end({ timeout: 5 });
}

main();
