import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

const EMAIL_PHONE = "(210) 257-8496";
const EMAIL_WEBSITE = "https://www.liliveterinaryhospital.com";
const EMAIL_INSTAGRAM = "https://www.instagram.com/lilivethospital";
const EMAIL_FACEBOOK = "https://www.facebook.com/LiliVeterinaryHospital";

const bannerPath = path.resolve(process.cwd(), "assets", "email", "banner.png");
const logoPath = path.resolve(process.cwd(), "assets", "email", "logo.jpg");

const bannerCid = "lili-banner@lilivet";
const logoCid = "lili-logo@lilivet";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getInlineBrandAttachments() {
  const attachments: Array<{
    filename: string;
    path: string;
    cid: string;
  }> = [];

  if (fs.existsSync(bannerPath)) {
    attachments.push({
      filename: "banner.png",
      path: bannerPath,
      cid: bannerCid
    });
  }

  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo.jpg",
      path: logoPath,
      cid: logoCid
    });
  }

  return attachments;
}

function renderEmailShell(input: {
  title: string;
  eyebrow: string;
  intro: string;
  bodyHtml: string;
  includeAction?: boolean;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const actionLabel = input.actionLabel ?? "Visit Our Website";
  const actionUrl = input.actionUrl ?? EMAIL_WEBSITE;
  const actionHtml = input.includeAction || input.actionUrl
    ? `
      <tr>
        <td style="padding: 0 32px 28px;">
          <a
            href="${actionUrl}"
            style="display: inline-block; border-radius: 999px; background: #1f8d43; color: #ffffff; font: 700 15px Arial, sans-serif; text-decoration: none; padding: 14px 22px;"
          >
            ${escapeHtml(actionLabel)}
          </a>
        </td>
      </tr>
    `
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin: 0; padding: 24px 12px; background: #f4f7f2;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #dce9d7;">
          <tr>
            <td style="padding: 0; background: #eef6e8;">
              <img
                src="cid:${bannerCid}"
                alt="Lili Veterinary Hospital banner"
                style="display: block; width: 100%; height: auto;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 12px;">
              <div style="margin-bottom: 18px;">
                <img
                  src="cid:${logoCid}"
                  alt="Lili Veterinary Hospital"
                  style="display: block; width: 240px; max-width: 100%; height: auto;"
                />
              </div>
              <div style="font: 700 12px Arial, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #3a7b48; margin-bottom: 10px;">
                ${escapeHtml(input.eyebrow)}
              </div>
              <h1 style="margin: 0 0 12px; color: #133a21; font: 700 28px/1.2 Arial, sans-serif;">
                ${escapeHtml(input.title)}
              </h1>
              <p style="margin: 0; color: #32453a; font: 400 16px/1.7 Arial, sans-serif;">
                ${escapeHtml(input.intro)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 8px;">
              <div style="border-radius: 20px; background: #f7faf5; border: 1px solid #dfeadb; padding: 24px;">
                ${input.bodyHtml}
              </div>
            </td>
          </tr>
          ${actionHtml}
          <tr>
            <td style="padding: 0 32px 28px;">
              <div style="border-top: 1px solid #e2ebe0; padding-top: 20px; color: #526154; font: 400 14px/1.7 Arial, sans-serif;">
                <div><strong style="color: #133a21;">Lili Veterinary Hospital</strong></div>
                <div><a href="${EMAIL_WEBSITE}" style="color: #1f8d43; text-decoration: none;">${EMAIL_WEBSITE}</a></div>
                <div><a href="tel:+12102578496" style="color: #1f8d43; text-decoration: none;">${EMAIL_PHONE}</a></div>
                <div style="margin-top: 10px;">
                  <a href="${EMAIL_INSTAGRAM}" style="color: #1f8d43; text-decoration: none; margin-right: 12px;">Instagram</a>
                  <a href="${EMAIL_FACEBOOK}" style="color: #1f8d43; text-decoration: none;">Facebook</a>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function renderKeyValueRows(items: Array<{ label: string; value: string }>) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${items
        .map(
          (item) => `
            <tr>
              <td style="padding: 8px 0; width: 170px; color: #5b6b5f; font: 700 14px Arial, sans-serif; vertical-align: top;">
                ${escapeHtml(item.label)}
              </td>
              <td style="padding: 8px 0; color: #203227; font: 400 14px/1.6 Arial, sans-serif;">
                ${escapeHtml(item.value)}
              </td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

export async function sendClinicAppointmentNotification(input: {
  requestId: string;
  ownerName: string;
  petName: string;
  phoneNumber: string;
  visitType: string;
}) {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: env.CLINIC_NOTIFICATION_EMAIL,
    subject: `New appointment request: ${input.petName}`,
    text: [
      "A new appointment request is pending review.",
      `Request ID: ${input.requestId}`,
      `Owner: ${input.ownerName}`,
      `Pet: ${input.petName}`,
      `Phone: ${input.phoneNumber}`,
      `Visit type: ${input.visitType}`
    ].join("\n"),
    html: renderEmailShell({
      eyebrow: "Clinic Notification",
      title: "New appointment request received",
      intro: "A new appointment request was submitted and is ready for staff review.",
      bodyHtml: renderKeyValueRows([
        { label: "Request ID", value: input.requestId },
        { label: "Owner", value: input.ownerName },
        { label: "Pet", value: input.petName },
        { label: "Phone", value: input.phoneNumber },
        { label: "Visit Type", value: input.visitType }
      ])
    }),
    attachments: getInlineBrandAttachments()
  });
}

export async function sendClientAppointmentConfirmation(input: {
  email?: string;
  ownerName: string;
  petName: string;
}) {
  if (!input.email) return;

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.email,
    subject: "Lili Veterinary Hospital received your appointment request",
    text: [
      `Hi ${input.ownerName},`,
      "",
      `We received your appointment request for ${input.petName}.`,
      "Our clinic team will review your preferred dates and times and contact you to confirm availability.",
      "",
      "You can also call us at (210) 257-8496 if you need immediate help.",
      "",
      "If this becomes life-threatening, please call an emergency veterinary service immediately."
    ].join("\n"),
    html: renderEmailShell({
      eyebrow: "Appointment Request Received",
      title: `We received ${input.petName}'s request`,
      intro: `Hi ${input.ownerName}, thank you for contacting Lili Veterinary Hospital. Our team has your appointment request and will review your preferred dates and times.`,
      bodyHtml: `
        <p style="margin: 0 0 16px; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          We will reach out to confirm availability and finalize the visit details.
        </p>
        <p style="margin: 0 0 16px; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          If your pet’s condition becomes urgent or life-threatening, please contact an emergency veterinary service immediately.
        </p>
        <p style="margin: 0; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          If you need us sooner, call <a href="tel:+12102578496" style="color: #1f8d43; text-decoration: none;">${EMAIL_PHONE}</a>.
        </p>
      `,
      includeAction: true
    }),
    attachments: getInlineBrandAttachments()
  });
}

export async function sendClinicNewPatientNotification(input: {
  requestId: string;
  ownerName: string;
  petName: string;
  phoneNumber: string;
}) {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: env.CLINIC_NOTIFICATION_EMAIL,
    subject: `New patient request: ${input.petName}`,
    text: [
      "A new patient registration request was submitted.",
      `Request ID: ${input.requestId}`,
      `Owner: ${input.ownerName}`,
      `Pet: ${input.petName}`,
      `Phone: ${input.phoneNumber}`
    ].join("\n"),
    html: renderEmailShell({
      eyebrow: "Clinic Notification",
      title: "New patient request received",
      intro: "A new patient registration request was submitted and is ready for staff review.",
      bodyHtml: renderKeyValueRows([
        { label: "Request ID", value: input.requestId },
        { label: "Owner", value: input.ownerName },
        { label: "Pet", value: input.petName },
        { label: "Phone", value: input.phoneNumber }
      ])
    }),
    attachments: getInlineBrandAttachments()
  });
}

export async function sendClientAppointmentRescheduleRequest(input: {
  email?: string;
  ownerName: string;
  petName: string;
  responseDeadline: Date;
  confirmedStartAt?: Date | null;
  rescheduleUrl: string;
}) {
  if (!input.email) return;

  const confirmedText = input.confirmedStartAt
    ? input.confirmedStartAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "your previous scheduled time";
  const deadlineText = input.responseDeadline.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.email,
    subject: `Please choose a new appointment date for ${input.petName}`,
    text: [
      `Hi ${input.ownerName},`,
      "",
      `${input.petName}'s appointment for ${confirmedText} is now overdue.`,
      `Please choose new preferred dates and times by ${deadlineText}.`,
      "",
      `Use this secure link to book a new date: ${input.rescheduleUrl}`,
      "",
      "If you need help, please call us at (210) 257-8496."
    ].join("\n"),
    html: renderEmailShell({
      eyebrow: "Appointment Reschedule Needed",
      title: `Please choose a new date for ${input.petName}`,
      intro: `Hi ${input.ownerName}, the previously scheduled appointment time has passed, so we need you to choose new preferred dates and times for our team to review.`,
      bodyHtml: `
        <p style="margin: 0 0 16px; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          Previous scheduled time: <strong>${escapeHtml(confirmedText)}</strong>
        </p>
        <p style="margin: 0 0 16px; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          Please submit new preferred dates by <strong>${escapeHtml(deadlineText)}</strong>.
        </p>
        <p style="margin: 0; color: #203227; font: 400 15px/1.7 Arial, sans-serif;">
          This secure link is intended for one use. If it expires, please contact our team for help.
        </p>
      `,
      actionLabel: "Choose a new date",
      actionUrl: input.rescheduleUrl
    }),
    attachments: getInlineBrandAttachments()
  });
}
