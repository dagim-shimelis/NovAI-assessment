import { Suspense } from "react";
import { SignInForm } from "@/auth/sign-in-form";

export default function SignInPage() {
  return <Suspense fallback={null}><SignInForm /></Suspense>;
}
