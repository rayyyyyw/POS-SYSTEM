import "server-only";

export type EmailMessage = { subject: string; text: string; html: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function template(subject: string, title: string, paragraphs: string[], action?: { label: string; url: string }): EmailMessage {
  // Dynamic content is escaped, including link attributes. Only internal callers
  // supply URLs, built from validated server configuration.
  return {
    subject: subject.replace(/[\r\n]+/g, " "),
    text: ["POS-SYSTEM", title, ...paragraphs, ...(action ? [action.label, action.url] : [])].join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f8faf9;color:#18181b;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:560px;margin:auto;background:#fff;border:1px solid #e4e4e7;border-radius:10px"><tr><td style="padding:32px"><p style="color:#15803d;font-size:13px;font-weight:bold;letter-spacing:2px">POS-SYSTEM</p><h1 style="font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>${paragraphs.map(p => `<p style="font-size:16px;line-height:1.6">${escapeHtml(p)}</p>`).join("")}${action ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 20px;background:#15803d;color:#fff;border-radius:6px;font-weight:bold;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="font-size:13px;line-height:1.6;color:#52525b">If the button does not work, copy this URL into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#166534;overflow-wrap:anywhere;word-break:break-all">${escapeHtml(action.url)}</a></p>` : ""}<p style="border-top:1px solid #e4e4e7;padding-top:20px;color:#52525b;font-size:12px;line-height:1.6">POS System · Restaurant management</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function invitationEmail(input: { restaurantName: string; email: string; owner: boolean; expiresAt: Date; url: string }) {
  return template(
    input.owner ? `You're invited to manage ${input.restaurantName}` : `Invitation to join ${input.restaurantName}`,
    input.owner ? `Manage ${input.restaurantName}` : `Join ${input.restaurantName}`,
    [
      input.owner ? "A platform administrator has created a restaurant account and invited you to become its owner." : "You have been invited to join this restaurant team.",
      `Invited account email: ${input.email}`,
      "Choose a password to activate your personal account. If you already have an account, sign in with the invited email to accept; your password will not change.",
      `This single-use invitation expires at ${input.expiresAt.toUTCString()} (72 hours after issue).`,
      "Keep this link private and do not forward it. If you were not expecting this invitation, ignore this message; no access is granted until you accept.",
    ],
    { label: "Set Password & Activate Account", url: input.url },
  );
}

export function passwordResetEmail(url: string) {
  return template("Reset your POS System password", "Reset your password", [
    "We received a request to reset your POS System account password.",
    "This single-use link expires in 1 hour. Do not share it with anyone.",
    "If you did not request this, ignore this email. Your password will remain unchanged.",
  ], { label: "Reset password", url });
}

export function verificationEmail(url: string) {
  return template("Verify your POS System email", "Verify your email address", [
    "Confirm this email address to sign in to POS System. This link expires in 1 hour.",
    "Keep this link private. If you did not request verification, ignore this email.",
  ], { label: "Verify email", url });
}

export function passwordChangedEmail() {
  return template("Your POS System password was reset", "Password reset confirmed", [
    "Your account password has been reset and existing sessions have been revoked.",
    "If you did not make this change, request a new password reset immediately and contact your platform administrator.",
  ]);
}

export function ownershipChangedEmail(restaurantName: string, isNewOwner: boolean) {
  return template(`Ownership updated for ${restaurantName}`, "Restaurant ownership updated", [
    `A platform administrator changed ownership of ${restaurantName}.`,
    isNewOwner ? "Your existing restaurant membership is now the owner." : "Your existing owner membership is now a manager.",
    "Your login email and password have not changed. If this change was unexpected, contact your platform administrator immediately.",
  ]);
}
