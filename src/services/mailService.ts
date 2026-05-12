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
    ].join("\n")
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
    subject: "Lili Vet Hospital received your appointment request",
    text: [
      `Hi ${input.ownerName},`,
      "",
      `We received your appointment request for ${input.petName}.`,
      "Our clinic team will review your preferred dates and times and contact you to confirm availability.",
      "",
      "If this becomes life-threatening, please call an emergency veterinary service immediately."
    ].join("\n")
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
    ].join("\n")
  });
}
