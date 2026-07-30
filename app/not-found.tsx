"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import RobotIcon from "@/components/icons/logo";
import { Button } from "@/components/ui/button";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
      <RobotIcon className="size-6 text-primary" />
      <span className="font-brand text-2xl font-bold tracking-tight text-foreground">
        Examin
        <span className="text-primary">ai</span>
      </span>
    </Link>
  );
}

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">

      {/* Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <BrandMark />
      </header>

      {/* Main content */}
      <main className="relative z-20 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 pb-20 md:px-10">
        <div className="flex h-64 w-64 items-center justify-center rounded-full bg-white sm:h-72 sm:w-72 md:h-80 md:w-80">
          <DotLottieReact
            src="/animations/404.lottie"
            loop
            autoplay
            className="h-full w-full"
          />
        </div>

        <div className="-mt-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Looks like you wandered off the exam path. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            className="font-heading px-7 py-3 text-base font-semibold"
            render={<Link href="/" />}
          >
            <Home className="mr-1 size-4" />
            Home
          </Button>
        </div>
      </main>
    </div>
  );
}
