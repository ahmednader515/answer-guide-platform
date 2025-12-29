import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, parentPhoneNumber, password, confirmPassword, grade, recaptchaToken } = await req.json();

    if (!fullName || !phoneNumber || !parentPhoneNumber || !password || !confirmPassword || !grade) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Verify reCAPTCHA token
    if (!recaptchaToken) {
      return new NextResponse("reCAPTCHA verification is required", { status: 400 });
    }

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not set");
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const recaptchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;
    const recaptchaResponse = await fetch(recaptchaVerificationUrl, {
      method: "POST",
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) {
      return new NextResponse("reCAPTCHA verification failed", { status: 400 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Check if phone number is the same as parent phone number
    if (phoneNumber === parentPhoneNumber) {
      return new NextResponse("Phone number cannot be the same as parent phone number", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { parentPhoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.parentPhoneNumber === parentPhoneNumber) {
        return new NextResponse("Parent phone number already exists", { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user directly without email verification
    try {
      await db.user.create({
        data: {
          fullName,
          phoneNumber,
          parentPhoneNumber,
          hashedPassword,
          role: "USER",
          grade,
        },
      });
    } catch (createError: any) {
      // Handle Prisma unique constraint violations
      if (createError?.code === "P2002") {
        const target = createError.meta?.target;
        if (Array.isArray(target)) {
          if (target.includes("phoneNumber")) {
            return new NextResponse("Phone number already exists", { status: 400 });
          }
          if (target.includes("parentPhoneNumber")) {
            return new NextResponse("Parent phone number already exists", { status: 400 });
          }
        }
        return new NextResponse("A user with this information already exists", { status: 400 });
      }
      // Re-throw to be caught by outer catch block
      throw createError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[REGISTER]", error);
    
    // Handle Prisma unique constraint violations (in case the inner try-catch didn't catch it)
    if (error?.code === "P2002") {
      const target = error.meta?.target;
      if (Array.isArray(target)) {
        if (target.includes("phoneNumber")) {
          return new NextResponse("Phone number already exists", { status: 400 });
        }
        if (target.includes("parentPhoneNumber")) {
          return new NextResponse("Parent phone number already exists", { status: 400 });
        }
      }
      return new NextResponse("A user with this information already exists", { status: 400 });
    }
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    // Log full error for debugging
    if (error instanceof Error) {
      console.error("[REGISTER] Full error:", {
        message: error.message,
        code: (error as any).code,
        meta: (error as any).meta,
        stack: error.stack
      });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 