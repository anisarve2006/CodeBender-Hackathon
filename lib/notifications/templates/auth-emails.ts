export function verificationEmailHtml(url: string, name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Welcome to Family Care Hub, ${name}!</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Please verify your email address to start coordinating care for your family.
      </p>
      <div style="margin: 32px 0;">
        <a href="${url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        This link expires in 24 hours. If you did not sign up for Family Care Hub, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Family Care Hub organises information only and does not provide medical advice.
      </p>
    </div>
  `;
}

export function resetPasswordEmailHtml(url: string, name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Reset your password</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Hello ${name}, we received a request to reset your password.
      </p>
      <div style="margin: 32px 0;">
        <a href="${url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
          Set New Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        This link expires in 30 minutes. If you did not make this request, your account is safe and you can ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        Family Care Hub organises information only and does not provide medical advice.
      </p>
    </div>
  `;
}

export function passwordChangedEmailHtml(name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Your password was changed</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Hello ${name}, your Family Care Hub account password was recently changed. All active sessions have been signed out for your security.
      </p>
      <p style="color: #ef4444; font-size: 14px; font-weight: 500;">
        If you did not perform this change, please reset your password immediately or contact your circle administrator.
      </p>
    </div>
  `;
}
