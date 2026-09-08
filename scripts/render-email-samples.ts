import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderEmailTemplate } from "../src/modules/notifications/email-templates";

const OUT = path.resolve("e2e", "screenshots");

const samples = [
  { file: "email-membership-approved-ar.html", template: "membership.approved", locale: "ar" as const },
  { file: "email-membership-approved-en.html", template: "membership.approved", locale: "en" as const },
  { file: "email-volunteer-hours-approved-ar.html", template: "volunteer.hours_approved", locale: "ar" as const },
  { file: "email-badge-awarded-ar.html", template: "recognition.badge_awarded", locale: "ar" as const },
  { file: "email-certificate-issued-en.html", template: "recognition.certificate_issued", locale: "en" as const },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const origin = "http://localhost:3000";
  for (const sample of samples) {
    const html = renderEmailTemplate(
      sample.template,
      sample.locale,
      { name: "Member", badgeName: "Impact Leader" },
      origin,
    );
    await writeFile(path.join(OUT, sample.file), html.html, "utf8");
  }
  console.log(`Wrote ${samples.length} email samples to ${OUT}`);
}

main();
