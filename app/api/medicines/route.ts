import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tablets, time, email } = body;

    const medicine = await prisma.medicine.create({
      data: {
        name,
        tablets: parseInt(tablets),
        time: new Date(time),
        email,
      },
    });

    // Schedule email reminder
    const reminderTime = new Date(time);
    reminderTime.setMinutes(reminderTime.getMinutes() - 5);

    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    if (delay > 0) {
      console.log(`Scheduling email reminder for ${reminderTime.toISOString()}`);
      setTimeout(async () => {
        try {
          console.log('Attempting to send email...');
          const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Medicine Reminder',
            html: `
              <h2>Medicine Reminder</h2>
              <p>It's time to take your medicine:</p>
              <ul>
                <li>Name: ${name}</li>
                <li>Tablets: ${tablets}</li>
                <li>Time: ${new Date(time).toLocaleString()}</li>
              </ul>
            `,
          });
          console.log('Email sent successfully:', info);
        } catch (error) {
          console.error('Detailed error sending email:', error);
          // Log the full error object
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
        }
      }, delay);
    }

    return NextResponse.json(medicine);
  } catch (error) {
    console.error('Error creating medicine:', error);
    return NextResponse.json(
      { error: 'Error creating medicine' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: {
        time: 'asc',
      },
    });
    return NextResponse.json(medicines);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json(
      { error: 'Error fetching medicines' },
      { status: 500 }
    );
  }
} 