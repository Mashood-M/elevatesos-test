"use client";

import React, { useRef } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Printer, Download, ExternalLink, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";

export interface ElevatesCertificateProps {
  // Recipient & Core Info
  recipientName: string;
  recipientEmail?: string;
  certificateId: string;
  issuedAt?: string;
  achievement?: string;
  eventTitle?: string;
  chapterName?: string;
  institutionName?: string;

  // Customizable Template Texts
  mainTitle?: string;
  subTitle?: string;
  preamble?: string;
  description?: string;

  signatory1Name?: string;
  signatory1Role?: string;
  signatory1Org?: string;
  signatory1SignatureUrl?: string;

  signatory2Name?: string;
  signatory2Role?: string;
  signatory2Org?: string;
  signatory2SignatureUrl?: string;

  // Footer Accents
  bottomLeftText?: string;
  bottomRightText?: string;

  // Options
  showGridPattern?: boolean;
  verificationUrl?: string;
  showControls?: boolean;
  className?: string;
}

export function ElevatesCertificate({
  recipientName,
  recipientEmail,
  certificateId,
  issuedAt = new Date().toISOString().split("T")[0],
  achievement = "O F   R E C O G N I T I O N",
  eventTitle,
  chapterName,
  institutionName = "Elevates Student Community",
  mainTitle = "CERTIFICATE",
  subTitle,
  preamble = "T H I S   I S   T O   C E R T I F Y   T H A T",
  description,
  signatory1Name = "Dr. K. S. Radhakrishnan",
  signatory1Role = "P R I N C I P A L",
  signatory1Org,
  signatory1SignatureUrl,
  signatory2Name = "Prof. Ananya Sen",
  signatory2Role = "F A C U L T Y   A D V I S O R",
  signatory2Org,
  signatory2SignatureUrl,
  bottomLeftText = "I D E A S   I N T O   I M P A C T",
  bottomRightText = "A   H I G H E R   T O M O R R O W",
  showGridPattern = true,
  verificationUrl,
  showControls = true,
  className = "",
}: ElevatesCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);

  // Compute verify URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://os.elevates.live";
  const verifyLink = verificationUrl || `${origin}/verify/certificate/${certificateId}`;

  // Default computed subTitle
  const displaySubtitle = subTitle || (achievement.toUpperCase().includes("OF") ? achievement : `O F   ${achievement.toUpperCase()}`);

  // Default description
  const displayDescription =
    description ||
    (eventTitle
      ? `has actively participated and successfully completed the "${eventTitle}" hosted by ${chapterName || "Elevates"}, demonstrating dedication, curiosity, and a commitment to learning, building, and creating a higher tomorrow.`
      : `has been an active member of Elevates and has demonstrated dedication, curiosity, and a commitment to learning, building, and creating a better tomorrow.`);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Action Toolbar */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-[960px] px-2 no-print">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
            <ShieldCheck size={16} className="text-[#f26430]" />
            <span>ID: <strong className="text-neutral-900">{certificateId}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/verify/certificate/${certificateId}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition"
            >
              <ExternalLink size={13} /> Verify Public Page
            </Link>

            <Button
              variant="orange"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              <Printer size={14} /> Print / Save as PDF
            </Button>
          </div>
        </div>
      )}

      {/* CERTIFICATE CONTAINER (Landscape 3:2 ratio) */}
      <div className="w-full max-w-[960px] overflow-hidden rounded-xl border border-neutral-300 shadow-2xl bg-white certificate-print-wrapper">
        <div
          ref={certRef}
          id="elevates-printable-certificate"
          className="relative w-full aspect-[1.5] bg-white text-[#111111] overflow-hidden select-none p-6 sm:p-10 flex flex-col justify-between"
          style={{
            fontFamily: "'Montserrat', 'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* CHECK / GRID PATTERN BACKGROUND (Matches PPTX #EEEEEE lines grid) */}
          {showGridPattern && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="cert-check-pattern"
                  width="36"
                  height="36"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 36 0 L 0 0 0 36"
                    fill="none"
                    stroke="#EEEEEE"
                    strokeWidth="1.2"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cert-check-pattern)" />
            </svg>
          )}

          {/* Inner hairline border */}
          <div className="absolute inset-3 sm:inset-5 border border-neutral-200/80 rounded-lg pointer-events-none z-10" />

          {/* WATERMARK CENTER */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="relative w-[42%] h-[53%] opacity-[0.07]">
              <Image
                src="/certificates/assets/watermark-e.png"
                alt="Elevates Watermark"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* TOP LEFT: Prominent Header Logo & flourish graphic */}
          <div className="relative z-20 flex items-start gap-1 sm:gap-2 pt-0.5">
            <div className="relative w-[240px] sm:w-[350px] md:w-[410px] h-[55px] sm:h-[80px] md:h-[95px]">
              <Image
                src="/certificates/assets/logo-header.png"
                alt="Elevates Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="relative w-[36px] sm:w-[54px] h-[36px] sm:h-[54px] -ml-4 sm:-ml-5 -mt-1 opacity-75 pointer-events-none">
              <Image
                src="/certificates/assets/header-graphic.png"
                alt="Graphic Loop"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* TOP RIGHT: Build Learn Create Graphic */}
          <div className="absolute top-4 sm:top-7 right-4 sm:right-8 z-20 w-[110px] sm:w-[160px] h-[35px] sm:h-[50px]">
            <Image
              src="/certificates/assets/build-learn-create.png"
              alt="Build. Learn. Create. Together"
              fill
              className="object-contain object-right"
              priority
            />
          </div>

          {/* RIGHT ACCENT: Pixel Smiley */}
          <div className="absolute top-[28%] right-4 sm:right-7 z-20 w-[24px] sm:w-[38px] h-[24px] sm:h-[38px] opacity-90">
            <Image
              src="/certificates/assets/pixel-smiley.png"
              alt="Elevates Smiley"
              fill
              className="object-contain"
            />
          </div>

          {/* BOTTOM LEFT: Staircase Block with Red Flag */}
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-20 w-[85px] sm:w-[145px] h-[75px] sm:h-[130px] pointer-events-none">
            <Image
              src="/certificates/assets/staircase-flag.png"
              alt="Staircase Flag"
              fill
              className="object-contain object-bottom-left"
            />
          </div>

          {/* BOTTOM RIGHT: Fluid Orange Wave */}
          <div className="absolute -bottom-1 -right-1 z-10 w-[140px] sm:w-[260px] h-[90px] sm:h-[160px] pointer-events-none opacity-95">
            <Image
              src="/certificates/assets/corner-wave.png"
              alt="Orange Wave"
              fill
              className="object-contain object-bottom-right"
            />
          </div>

          {/* CENTER CORE CONTENT */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-14 my-2 sm:my-3">
            {/* Main Title */}
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.14em] text-[#111111] uppercase leading-none"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {mainTitle}
            </h1>

            {/* Subtitle */}
            <div className="mt-1.5 sm:mt-2.5">
              <p className="text-[9px] sm:text-xs md:text-sm font-semibold tracking-[0.3em] sm:tracking-[0.4em] text-[#f26430] uppercase">
                {displaySubtitle}
              </p>
            </div>

            {/* Preamble */}
            <div className="mt-2 sm:mt-3">
              <p className="text-[8px] sm:text-[10px] md:text-xs font-medium tracking-[0.25em] text-neutral-400 uppercase">
                {preamble}
              </p>
            </div>

            {/* Recipient Name */}
            <div className="mt-2.5 sm:mt-4 relative inline-block">
              <h2
                className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#111111] px-6 sm:px-10 pb-1"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {recipientName}
              </h2>
              <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#f26430] to-transparent mt-0.5" />
            </div>

            {/* Description Body */}
            <p className="mt-2.5 sm:mt-4 text-[9px] sm:text-xs md:text-sm text-neutral-600 max-w-xl sm:max-w-2xl leading-relaxed font-normal">
              {displayDescription}
            </p>
          </div>

          {/* SIGNATORIES & SEAL ROW */}
          <div className="relative z-20 grid grid-cols-3 items-end w-full px-6 sm:px-16 pt-2 pb-3">
            {/* Left Signatory (Principal / Lead) */}
            <div className="text-left flex flex-col items-start pl-6 sm:pl-10">
              {signatory1SignatureUrl ? (
                <div className="relative h-8 sm:h-12 w-24 sm:w-36 mb-1">
                  <img
                    src={signatory1SignatureUrl}
                    alt="Signature 1"
                    className="h-full w-full object-contain object-left-bottom"
                  />
                </div>
              ) : (
                <div className="h-5 sm:h-8" />
              )}
              <div className="w-24 sm:w-36 h-[1px] bg-neutral-300 mb-1.5" />
              <p className="text-[10px] sm:text-xs md:text-sm font-bold text-[#111111] leading-tight">
                {signatory1Name}
              </p>
              <p className="text-[7px] sm:text-[9px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mt-0.5">
                {signatory1Role}
              </p>
              <p className="text-[7px] sm:text-[9px] text-neutral-500 truncate max-w-[140px] sm:max-w-[200px]">
                {signatory1Org || institutionName}
              </p>
            </div>

            {/* Center: Elevates Round Official Seal + Scannable QR */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Official Stamp Seal */}
                <div className="relative w-[48px] sm:w-[72px] md:w-[82px] h-[48px] sm:h-[72px] md:h-[82px] drop-shadow-sm">
                  <Image
                    src="/certificates/assets/seal-elevates.png"
                    alt="Official Elevates Seal"
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Scannable Verification QR */}
                <div className="flex flex-col items-center p-1 sm:p-1.5 bg-white border border-neutral-200 rounded-md shadow-sm">
                  <div className="w-[36px] sm:w-[50px] md:w-[58px] h-[36px] sm:h-[50px] md:h-[58px]">
                    <QRCode
                      value={verifyLink}
                      size={256}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 256 256"
                    />
                  </div>
                  <span className="text-[6px] sm:text-[7px] font-mono text-neutral-400 mt-0.5">
                    SCAN TO VERIFY
                  </span>
                </div>
              </div>

              <div className="mt-1 font-mono text-[7px] sm:text-[8px] text-neutral-400">
                {certificateId}
              </div>
            </div>

            {/* Right Signatory (Faculty Advisor / Teacher) */}
            <div className="text-right flex flex-col items-end pr-6 sm:pr-10">
              {signatory2SignatureUrl ? (
                <div className="relative h-8 sm:h-12 w-24 sm:w-36 mb-1 ml-auto">
                  <img
                    src={signatory2SignatureUrl}
                    alt="Signature 2"
                    className="h-full w-full object-contain object-right-bottom"
                  />
                </div>
              ) : (
                <div className="h-5 sm:h-8" />
              )}
              <div className="w-24 sm:w-36 h-[1px] bg-neutral-300 mb-1.5 ml-auto" />
              <p className="text-[10px] sm:text-xs md:text-sm font-bold text-[#111111] leading-tight">
                {signatory2Name}
              </p>
              <p className="text-[7px] sm:text-[9px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mt-0.5">
                {signatory2Role}
              </p>
              <p className="text-[7px] sm:text-[9px] text-neutral-500 truncate max-w-[140px] sm:max-w-[200px]">
                {signatory2Org || institutionName}
              </p>
            </div>
          </div>

          {/* BOTTOM SLOGANS */}
          <div className="relative z-20 flex items-center justify-between w-full px-8 sm:px-14 pt-1 text-[7px] sm:text-[8px] font-mono tracking-[0.25em] text-neutral-400 uppercase">
            <span>{bottomLeftText}</span>
            <span className="text-neutral-500">{bottomRightText}</span>
          </div>
        </div>
      </div>

      {/* Global CSS for seamless landscape printing */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          nav,
          header,
          aside,
          button,
          .role-switcher,
          .offline-indicator {
            display: none !important;
          }
          .certificate-print-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            z-index: 999999 !important;
          }
          #elevates-printable-certificate {
            width: 100vw !important;
            height: 100vh !important;
            padding: 40px 60px !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
