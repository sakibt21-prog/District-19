// Creates an administrator for the DISTRICT 19 dashboard, or promotes an existing user.
//
//   node --env-file=.env.local scripts/create-admin.mjs you@example.com
//
// You are asked for the password in the terminal; it is not stored anywhere by this script.
// There is no public sign-up page: this script (run by someone who holds the service-role key)
// is the only way an administrator is created.

import { createInterface } from "node:readline/promises";
import { stdin, stdout, exit, argv, env } from "node:process";
import { createClient } from "@supabase/supabase-js";

const email = (argv[2] ?? "").trim().toLowerCase();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`\n${message}\n`);
  exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Give the administrator's email:\n  node --env-file=.env.local scripts/create-admin.mjs you@example.com");
}
if (!url || !serviceKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local, and the script run with --env-file=.env.local.");
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(address) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === address);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

let userId = await findUserId(email);

if (userId) {
  console.log(`A user with ${email} already exists. Their password is left as it is.`);
} else {
  const prompt = createInterface({ input: stdin, output: stdout });
  const password = await prompt.question(`Choose a password for ${email} (at least 10 characters; it is shown as you type): `);
  prompt.close();
  if (password.length < 10) fail("The password must be at least 10 characters. Nothing was created.");

  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) fail(`Could not create the user: ${error.message}`);
  userId = data.user.id;
  console.log("User created.");
}

// The first administrator is the owner.
const { count, error: countError } = await db.from("admin_users").select("*", { count: "exact", head: true });
if (countError) fail(`Could not read admin_users. Has the migration been run? (${countError.message})`);

const { error: grantError } = await db
  .from("admin_users")
  .upsert({ user_id: userId, role: count === 0 ? "owner" : "admin" }, { onConflict: "user_id", ignoreDuplicates: true });
if (grantError) fail(`Could not grant admin access: ${grantError.message}`);

console.log(`\n${email} can now sign in at /admin/login.\n`);
